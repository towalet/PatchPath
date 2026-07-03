"""
Diagnostics API views (docs/AGENT_PLAN.md §8).

Views are thin: tenancy is enforced by ``Model.objects.for_user(request.user)``
querysets (a foreign object is simply not found → 404, which also avoids leaking
existence), with ``IsOwner`` as an object-level backstop. Read aggregation lives
in ``selectors``; write-side analysis logic will live in ``services``.

    GET  /api/dashboard/
    GET  /api/projects/                       POST /api/projects/
    GET  /api/projects/{project_id}/
    GET  /api/projects/{project_id}/sessions/ POST /api/projects/{project_id}/sessions/
    GET  /api/sessions/{session_id}/
    GET  /api/reports/{report_id}/
"""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from . import selectors
from .models import DebugSession, DiagnosisReport, Project, ReadinessReport, SessionKind, SourceType
from .permissions import IsOwner
from .serializers import (
    DashboardSerializer,
    DebugSessionCreateSerializer,
    DebugSessionDetailSerializer,
    DebugSessionSummarySerializer,
    DiagnosisReportSerializer,
    ProjectDetailSerializer,
    ProjectImportRequestSerializer,
    ProjectImportSerializer,
    ProjectSerializer,
    ReadinessReportSerializer,
    UploadedFileSerializer,
)
from .services import file_intake, import_sources, project_normalizer, report_generator
from .services import readiness_report as readiness_report_svc
from .services.import_sources import ImportError as ProjectImportError


class DashboardView(APIView):
    """Aggregate counts and recent activity for the signed-in user."""

    def get(self, request: Request) -> Response:
        summary = selectors.dashboard_summary(request.user)
        return Response(DashboardSerializer(summary).data)


class ProjectListCreateView(generics.ListCreateAPIView):
    """List the user's projects or create a new one."""

    serializer_class = ProjectSerializer

    def get_queryset(self):
        return selectors.projects_for_user(self.request.user)

    def perform_create(self, serializer) -> None:
        serializer.save(user=self.request.user)


class ProjectDetailView(generics.RetrieveAPIView):
    """A single owned project with its recent sessions."""

    serializer_class = ProjectDetailSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    lookup_url_kwarg = "project_id"

    def get_queryset(self):
        return Project.objects.for_user(self.request.user).with_session_stats()


class ProjectSessionListCreateView(generics.ListCreateAPIView):
    """List sessions for an owned project, or start a new one."""

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DebugSessionCreateSerializer
        return DebugSessionSummarySerializer

    def get_project(self) -> Project:
        """Resolve the URL's project, scoped to the owner (404 otherwise)."""
        if not hasattr(self, "_project"):
            self._project = get_object_or_404(
                Project.objects.for_user(self.request.user),
                pk=self.kwargs["project_id"],
            )
        return self._project

    def get_queryset(self):
        return self.get_project().sessions.select_related("project", "report")

    def create(self, request: Request, *args, **kwargs) -> Response:
        write = self.get_serializer(data=request.data)
        write.is_valid(raise_exception=True)
        session = write.save(project=self.get_project())
        out = DebugSessionSummarySerializer(session)
        headers = self.get_success_headers(out.data)
        return Response(out.data, status=status.HTTP_201_CREATED, headers=headers)


class SessionUploadView(APIView):
    """Attach evidence to a session: multipart ``files`` and/or pasted text.

    Each item is validated, redacted, and stored independently, so the response
    carries both the stored files and per-item errors. Throttled under the
    ``upload`` scope.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    throttle_scope = "upload"
    # Default name for pasted error text when the client doesn't supply one.
    DEFAULT_PASTE_NAME = "pasted-error.log"

    def get_session(self) -> DebugSession:
        session = get_object_or_404(
            DebugSession.objects.for_user(self.request.user),
            pk=self.kwargs["session_id"],
        )
        # Object-level backstop on top of the scoped queryset.
        self.check_object_permissions(self.request, session)
        return session

    def _collect_items(self, request: Request) -> list[tuple[str, bytes]]:
        items: list[tuple[str, bytes]] = [
            (upload.name, upload.read()) for upload in request.FILES.getlist("files")
        ]
        pasted_text = (request.data.get("pasted_text") or "").strip()
        if pasted_text:
            name = request.data.get("pasted_filename") or self.DEFAULT_PASTE_NAME
            items.append((name, pasted_text.encode("utf-8")))
        return items

    def post(self, request: Request, **kwargs) -> Response:
        session = self.get_session()
        items = self._collect_items(request)
        if not items:
            return Response(
                {"detail": "Provide at least one file or pasted error text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = file_intake.ingest(session, items)
        payload = {
            "uploaded": UploadedFileSerializer(result.stored, many=True).data,
            "errors": result.errors,
        }
        # 201 when anything was stored; otherwise the batch wholly failed validation.
        code = status.HTTP_201_CREATED if result.stored else status.HTTP_400_BAD_REQUEST
        return Response(payload, status=code)


class SessionAnalyzeView(APIView):
    """Run the analyze pipeline for a session (detector + evidence + AI report).

    Synchronous for the MVP. Detected issues are persisted before the AI call, so
    a model failure still leaves the user something to inspect. Throttled under
    the ``analyze`` scope.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    throttle_scope = "analyze"

    def get_session(self) -> DebugSession:
        session = get_object_or_404(
            DebugSession.objects.for_user(self.request.user).select_related("project"),
            pk=self.kwargs["session_id"],
        )
        self.check_object_permissions(self.request, session)
        return session

    def post(self, request: Request, **kwargs) -> Response:
        session = self.get_session()
        if not session.files.exists():
            return Response(
                {"detail": "Upload evidence before running analysis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            report = report_generator.run_analysis(session)
        except report_generator.AnalysisError:
            session.refresh_from_db()
            return Response(
                {
                    "session_id": str(session.id),
                    "status": session.status,
                    "report_id": None,
                    "failure_reason": session.failure_reason,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(
            {
                "session_id": str(session.id),
                "status": session.status,
                "report_id": str(report.id),
            }
        )


class SessionDetailView(generics.RetrieveAPIView):
    """Full session view: files, detected issues, and report summary."""

    serializer_class = DebugSessionDetailSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    lookup_url_kwarg = "session_id"

    def get_queryset(self):
        return (
            DebugSession.objects.for_user(self.request.user)
            .select_related("project", "report")
            .prefetch_related("files", "detected_issues")
        )


class ReportDetailView(generics.RetrieveAPIView):
    """The full diagnosis report document with session/project context."""

    serializer_class = DiagnosisReportSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    lookup_url_kwarg = "report_id"

    def get_queryset(self):
        return DiagnosisReport.objects.for_user(self.request.user).select_related(
            "debug_session__project"
        )


class ProjectImportCreateView(APIView):
    """Create a readiness import session from a GitHub URL, ZIP, or folder upload.

    POST /api/projects/{project_id}/imports/

    For github:  JSON body { source_type: "github", repo_url: "..." }
    For zip:     multipart { source_type: "zip", archive: <file> }
    For folder:  multipart { source_type: "folder", files: <file[]> }

    Returns { session_id, import: {...} } on success; 400 on validation error.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    throttle_scope = "upload"

    def post(self, request: Request, **kwargs) -> Response:
        project = get_object_or_404(
            Project.objects.for_user(request.user),
            pk=kwargs["project_id"],
        )
        self.check_object_permissions(request, project)

        req_ser = ProjectImportRequestSerializer(data=request.data)
        req_ser.is_valid(raise_exception=True)
        source_type = req_ser.validated_data["source_type"]

        from django.conf import settings as dj_settings

        max_bytes = dj_settings.PATCHPATH_MAX_IMPORT_BYTES
        max_files = dj_settings.PATCHPATH_MAX_IMPORT_FILES
        max_member = dj_settings.PATCHPATH_IMPORT_FILE_BYTES
        timeout = dj_settings.PATCHPATH_GITHUB_TIMEOUT

        try:
            if source_type == SourceType.GITHUB:
                url = req_ser.validated_data["repo_url"]
                source_name, normalized_url, entries = import_sources.from_github(
                    url,
                    max_total_bytes=max_bytes,
                    max_entries=max_files,
                    max_member_bytes=max_member,
                    timeout=timeout,
                )
                original_url = normalized_url

            elif source_type == SourceType.ZIP:
                archive = request.FILES.get("archive")
                if not archive:
                    return Response(
                        {"detail": "Provide a ZIP file as 'archive'."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                source_name, entries = import_sources.from_zip(
                    archive.name,
                    archive.read(),
                    max_total_bytes=max_bytes,
                    max_entries=max_files,
                    max_member_bytes=max_member,
                )
                original_url = ""

            else:  # folder
                uploads = [
                    (f.name, f.read()) for f in request.FILES.getlist("files")
                ]
                if not uploads:
                    return Response(
                        {"detail": "No files received for folder import."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                source_name, entries = import_sources.from_folder(
                    uploads,
                    max_total_bytes=max_bytes,
                    max_entries=max_files,
                    max_member_bytes=max_member,
                )
                original_url = ""

        except ProjectImportError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Create the readiness DebugSession.
        session = DebugSession.objects.create(
            project=project,
            kind=SessionKind.READINESS,
        )

        # Normalize into ProjectSource and persist.
        ps = project_normalizer.normalize(
            source_type=source_type,
            source_name=source_name,
            original_url=original_url,
            entries=entries,
        )
        pi = project_normalizer.persist(session, ps)

        return Response(
            {
                "session_id": str(session.id),
                "import": ProjectImportSerializer(pi).data,
            },
            status=status.HTTP_201_CREATED,
        )


class SessionScanView(APIView):
    """Run the readiness analyzer for an import session.

    POST /api/sessions/{session_id}/scan/

    Returns { session_id, status, report_id } on success.
    AI failure is non-fatal — the report still renders with ai_used=False.
    """

    permission_classes = [IsAuthenticated, IsOwner]
    throttle_scope = "analyze"

    def get_session(self) -> DebugSession:
        session = get_object_or_404(
            DebugSession.objects.for_user(self.request.user).select_related("project"),
            pk=self.kwargs["session_id"],
        )
        self.check_object_permissions(self.request, session)
        return session

    def post(self, request: Request, **kwargs) -> Response:
        session = self.get_session()

        if not hasattr(session, "project_import"):
            return Response(
                {"detail": "No import found for this session. Run an import first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Refresh in case project_import was just created in the same request.
        try:
            _ = session.project_import
        except Exception:
            return Response(
                {"detail": "No import found for this session."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = readiness_report_svc.run_readiness(session)
        except Exception:
            session.refresh_from_db()
            return Response(
                {
                    "session_id": str(session.id),
                    "status": session.status,
                    "report_id": None,
                    "failure_reason": session.failure_reason,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "session_id": str(session.id),
                "status": session.status,
                "report_id": str(report.id),
            }
        )


class ReadinessReportDetailView(generics.RetrieveAPIView):
    """Full readiness report document."""

    serializer_class = ReadinessReportSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    lookup_url_kwarg = "report_id"

    def get_queryset(self):
        return ReadinessReport.objects.for_user(self.request.user).select_related(
            "debug_session__project"
        )

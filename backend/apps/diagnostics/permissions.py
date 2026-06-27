"""
Object-level ownership permissions.

Every project/session/file/issue/report must resolve to request.user through the
Project.user ownership chain. Querysets are scoped in the viewsets; these
permission classes are the object-level backstop.

Planned:
    - IsOwner: object.user == request.user (Project)
    - IsSessionOwner: object.project.user == request.user (DebugSession + children)

TODO: implement once models land.
"""
from __future__ import annotations

# from rest_framework import permissions  # noqa: ERA001

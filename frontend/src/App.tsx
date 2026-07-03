import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { ScrollToTop } from "./components/routing/ScrollToTop";
import LandingPage from "./routes/LandingPage";
import LoginPage from "./routes/LoginPage";
import RegisterPage from "./routes/RegisterPage";
import DashboardPage from "./routes/DashboardPage";
import ProjectsPage from "./routes/ProjectsPage";
import ProjectDetailPage from "./routes/ProjectDetailPage";
import NewAnalysisPage from "./routes/NewAnalysisPage";
import ScanPage from "./routes/ScanPage";
import ReadinessImportPage from "./routes/ReadinessImportPage";
import ReadinessReportPage from "./routes/ReadinessReportPage";
import SessionDetailPage from "./routes/SessionDetailPage";
import SessionHistoryPage from "./routes/SessionHistoryPage";
import ReportPage from "./routes/ReportPage";

/**
 * Route map for PatchPath. Public routes render bare; the authenticated product
 * is gated by <ProtectedRoute>, which also supplies the AppShell layout.
 */
export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated product */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/projects/:projectId/new" element={<NewAnalysisPage />} />
          <Route path="/projects/:projectId/readiness" element={<ReadinessImportPage />} />
          <Route path="/readiness-reports/:reportId" element={<ReadinessReportPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
          <Route path="/history" element={<SessionHistoryPage />} />
          <Route path="/reports/:reportId" element={<ReportPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

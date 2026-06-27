import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./routes/LandingPage";
import LoginPage from "./routes/LoginPage";
import RegisterPage from "./routes/RegisterPage";
import DashboardPage from "./routes/DashboardPage";
import ProjectsPage from "./routes/ProjectsPage";
import ProjectDetailPage from "./routes/ProjectDetailPage";
import NewAnalysisPage from "./routes/NewAnalysisPage";
import SessionHistoryPage from "./routes/SessionHistoryPage";
import ReportPage from "./routes/ReportPage";

/**
 * Route map for PatchPath. Auth-guarding (ProtectedRoute) and the AppShell
 * layout are wired up feature-by-feature; this is the structural skeleton.
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated product (TODO: wrap in ProtectedRoute + AppShell) */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/new" element={<NewAnalysisPage />} />
        <Route path="/history" element={<SessionHistoryPage />} />
        <Route path="/reports/:reportId" element={<ReportPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AppShell } from "../layout/AppShell";
import { LoadingState } from "../ui/LoadingState";
import { useAuth } from "../../hooks/useAuth";

/**
 * Gate for authenticated routes. While the session is being restored it shows a
 * full-screen loader; anonymous users are redirected to /login (preserving the
 * attempted location); authenticated users get the AppShell + routed content.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <LoadingState label="Restoring session..." fullscreen />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

import { Link, useNavigate } from "react-router-dom";

import patchPathLogo from "../../assets/patchpath-logo.png";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";

/** Top navigation bar: brand, current user, logout. */
export function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="PatchPath home">
        <img className="brand__logo" src={patchPathLogo} alt="" />
      </Link>
      <div className="topbar__spacer" />
      <div className="topbar__user">
        <span className="glyph glyph--on glyph--sm" aria-hidden="true" />
        <span data-hide-sm>{user?.email}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Sign out
      </Button>
    </header>
  );
}

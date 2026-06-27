import { NavLink } from "react-router-dom";

/** Primary navigation for the authenticated app. Scaffold stub. */
export function Sidebar() {
  return (
    <nav data-component="sidebar" aria-label="Primary">
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/projects">Projects</NavLink>
      <NavLink to="/history">History</NavLink>
    </nav>
  );
}

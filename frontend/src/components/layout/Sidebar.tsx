import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", glyph: "glyph glyph--on" },
  { to: "/projects", label: "Projects", glyph: "glyph glyph--muted" },
  { to: "/history", label: "History", glyph: "glyph glyph--outline" },
];

/** Primary navigation for the authenticated app. */
export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Primary">
      <span className="sidebar__section">// READINESS</span>
      <NavLink to="/projects" className="sidebar__link" end={false}>
        <span className="glyph glyph--on" aria-hidden="true" />
        Scan a project
      </NavLink>
      <span className="sidebar__section" style={{ marginTop: "var(--space-4)" }}>// CONSOLE</span>
      {LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} className="sidebar__link" end={link.to === "/dashboard"}>
          <span className={link.glyph} aria-hidden="true" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

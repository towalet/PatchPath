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
      <span className="sidebar__section">// CONSOLE</span>
      {LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} className="sidebar__link" end={link.to === "/dashboard"}>
          <span className={link.glyph} aria-hidden="true" />
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

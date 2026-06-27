import type { ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

/** Authenticated app frame: top nav + sidebar + routed content. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div data-component="app-shell">
      <TopNav />
      <div data-component="app-shell-body">
        <Sidebar />
        <main>{children}</main>
      </div>
    </div>
  );
}

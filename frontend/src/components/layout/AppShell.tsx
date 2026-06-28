import type { ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

/** Authenticated app frame: top nav + sidebar + routed content. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <TopNav />
      <Sidebar />
      <main className="main">
        <div className="main__inner">{children}</div>
      </main>
    </div>
  );
}

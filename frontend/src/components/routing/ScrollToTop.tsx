import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the window scroll position to the top on every route change. React
 * Router preserves scroll position across navigations by default, which leaves
 * a freshly-navigated page (e.g. the landing page) scrolled mid-way down.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Defer until the new route has laid out, then force an *instant* jump to
    // the top. We bypass the global `scroll-behavior: smooth` because a smooth
    // animation gets interrupted by heavy page-mount work (e.g. the landing
    // page's canvas + scroll measuring) and never reaches the top.
    const id = requestAnimationFrame(() => {
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      html.scrollTop = 0;
      document.body.scrollTop = 0;
      html.style.scrollBehavior = prev;
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}

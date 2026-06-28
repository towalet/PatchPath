import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll: returns a ref + `visible` that flips true the first time the
 * element scrolls into view. Reveals immediately (no animation) when the user
 * prefers reduced motion or IntersectionObserver is unavailable, so content is
 * never left hidden.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      options ?? { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, visible };
}

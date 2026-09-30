"use client";

/**
 * Live — a wrapper that knows whether it is in sight. It marks itself
 * `data-live="false"` while it is scrolled out of view, and the looping
 * decorations inside it (a flowing edge, a ticker, a lane's pulse, a breathing
 * light) rest until it comes back; `app/globals.css` does the pausing. A loop
 * nobody is looking at costs the reader's battery and says nothing.
 *
 * It renders its children unchanged and changes no state: the attribute is set
 * on the element directly, so nothing inside re-renders.
 *
 * Props
 *   className  classes for the wrapper
 *   children   whatever loops
 */

import { useEffect, useRef } from "react";

export function Live({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const watch = new IntersectionObserver(([entry]) => el.setAttribute("data-live", entry.isIntersecting ? "true" : "false"), { rootMargin: "120px" });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

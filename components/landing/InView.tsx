"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

type Tag = "div" | "ul" | "ol" | "section";

/**
 * Marks its element data-motion="pending" once mounted, then "in" the first time it scrolls
 * into view. The marketing sequences in globals.css (ticks, the step wave, the exam diagram)
 * key off that attribute. With reduced motion, or without JS, the attribute never appears and
 * everything shows at rest.
 */
export function InView({ as = "div", ...props }: { as?: Tag } & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.motion = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.motion = "in";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Component = as;
  return <Component ref={ref as never} {...props} />;
}

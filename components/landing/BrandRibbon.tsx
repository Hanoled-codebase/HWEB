"use client";

import { useEffect, useRef } from "react";

const WORDS = ["Hanoled.io", "Hanoled"];

/**
 * The blue name strip above the footer. It drifts slowly sideways; it stops while off screen,
 * while hovered, and for reduced motion (CSS: .mk-ribbon). Two identical halves make the loop
 * seamless; the second is hidden from screen readers.
 */
export function BrandRibbon() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.playing = entry.isIntersecting ? "true" : "false";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const half = (hidden: boolean) => (
    <div className="flex shrink-0 items-center gap-6 pr-6" aria-hidden={hidden || undefined}>
      {Array.from({ length: 8 }).flatMap((_, i) =>
        WORDS.map((word) => (
          <span key={`${i}-${word}`} className="flex items-center gap-6 whitespace-nowrap">
            {word}
            <span className="h-1 w-1 rounded-full bg-white/50" />
          </span>
        )),
      )}
    </div>
  );

  return (
    <div ref={ref} className="mk-ribbon w-full overflow-hidden bg-[#1447E6] py-3 shadow-md">
      <div className="mk-ribbon-track text-sm font-bold text-white/90">
        {half(false)}
        {half(true)}
      </div>
    </div>
  );
}

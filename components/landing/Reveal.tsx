"use client";

import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

/**
 * Scroll-triggered fade+rise, once per element. Transform/opacity only (cheap
 * on low-end mobile GPUs); the underlying observer disconnects after firing
 * so it costs nothing once revealed, and reduced-motion visitors get the
 * content already visible.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

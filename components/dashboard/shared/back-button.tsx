"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  label: string;
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
}

const CONTROL_CLASSES =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 pointer-coarse:min-h-11 active:scale-[0.98]";

/**
 * Navigation control for stepping back to a logical parent dashboard screen.
 * Uses Link when an href is given so standard browser link affordances work,
 * while still allowing onClick interception (such as an unsaved-changes guard).
 */
export function BackButton({ label, href, onClick, className }: BackButtonProps) {
  const icon = <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;

  return (
    <nav aria-label="Breadcrumb" className={cn("w-fit", className)}>
      {href ? (
        <Link href={href} onClick={onClick} className={CONTROL_CLASSES}>
          {icon}
          <span>{label}</span>
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={CONTROL_CLASSES}>
          {icon}
          <span>{label}</span>
        </button>
      )}
    </nav>
  );
}

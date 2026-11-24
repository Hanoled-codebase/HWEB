"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import type { ResultStage } from "@/lib/results-overview";

export interface ResultsBrandHeaderProps {
  title: string;
  subtitle?: string;
  editionLabel?: string | null;
  backLabel?: string;
  onBack?: () => void;
  stage?: ResultStage;
  onStageChange?: (nextStage: ResultStage) => void;
  actions?: React.ReactNode;
  className?: string;
}

function getOrgInitials(name?: string | null): string {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "SC";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function ResultsBrandHeader({
  title,
  subtitle,
  editionLabel,
  backLabel = "All Results",
  onBack,
  stage,
  onStageChange,
  actions,
  className,
}: ResultsBrandHeaderProps) {
  const { currentOrg } = useOrganization();
  const [logoFailed, setLogoFailed] = useState(false);

  const orgName = currentOrg?.name || "School Academic Portal";
  const orgLogo = currentOrg?.logo && !logoFailed ? currentOrg.logo : null;
  const initials = getOrgInitials(orgName);

  return (
    <header
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs",
        className
      )}
    >
      <div
        className="h-1 w-full bg-[var(--primary)]"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-3 p-3.5 sm:gap-3.5 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2 sm:px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--primary-border)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{backLabel}</span>
              </button>
            )}
            <div className="inline-flex h-8 items-center gap-1.5 sm:gap-2 rounded-full border border-[var(--primary-border)] bg-[var(--primary-light)] px-2 sm:px-2.5">
              {orgLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={orgLogo}
                  alt={`${orgName} crest`}
                  onError={() => setLogoFailed(true)}
                  className="h-4 w-4 rounded-full object-contain"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-[var(--primary-foreground)]"
                >
                  {initials}
                </span>
              )}
              <span className="max-w-[130px] sm:max-w-[240px] truncate text-xs font-semibold text-[var(--primary-text)]">
                {orgName}
              </span>
            </div>
            {editionLabel && (
              <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-100/90 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-slate-700 truncate">
                {editionLabel}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 sm:text-xl">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden sm:block mt-0.5 text-xs text-slate-600 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {(onStageChange || actions) && (
          <div className="flex flex-wrap items-center gap-2">
            {stage && onStageChange && (
              <div
                role="group"
                aria-label="Report type"
                className="inline-flex h-8 items-center rounded-lg border border-slate-200/80 bg-slate-100/90 p-0.5"
              >
                <button
                  type="button"
                  aria-pressed={stage === "END_OF_TERM"}
                  onClick={() => onStageChange("END_OF_TERM")}
                  className="h-7 rounded-md px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 aria-pressed:bg-white aria-pressed:font-bold aria-pressed:text-[var(--primary-text)] aria-pressed:shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  End-of-term
                </button>
                <button
                  type="button"
                  aria-pressed={stage === "MID_TERM"}
                  onClick={() => onStageChange("MID_TERM")}
                  className="h-7 rounded-md px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-slate-600 transition-all hover:text-slate-900 aria-pressed:bg-white aria-pressed:font-bold aria-pressed:text-[var(--primary-text)] aria-pressed:shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Mid-term
                </button>
              </div>
            )}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

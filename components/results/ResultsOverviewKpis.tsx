"use client";

import React from "react";
import { Award, FileCheck2, TrendingUp, Users } from "lucide-react";
import type { OverviewKpis } from "@/lib/results-overview";

export interface ResultsOverviewKpisProps {
  kpis: OverviewKpis;
  scopeLabel?: string;
}

export function ResultsOverviewKpis({
  kpis,
  scopeLabel = "All Classes",
}: ResultsOverviewKpisProps) {
  const deltaText =
    typeof kpis.midTermDelta === "number"
      ? `${kpis.midTermDelta >= 0 ? "+" : ""}${kpis.midTermDelta.toFixed(1)}% from Mid-term`
      : null;

  return (
    <section aria-label="Results overview metrics">
      {/* Mobile 2x2 KPI Strip (matches mobile mockup) */}
      <div className="grid grid-cols-2 gap-2.5 md:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Students</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {kpis.totalLearners}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Recorded</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {kpis.recordedCount}/{kpis.totalLearners}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Pending</p>
          <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {kpis.pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Class Average</p>
          <p className="mt-1 text-xl font-bold text-[var(--primary-text)] tabular-nums">
            {typeof kpis.classAverage === "number"
              ? `${kpis.classAverage.toFixed(1)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Desktop 4-card KPI Row (matches desktop mockup) */}
      <div className="hidden md:grid md:grid-cols-4 md:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary-text)]">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Total Learners</span>
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {kpis.totalLearners}{" "}
            <span className="text-lg font-semibold text-slate-700">
              {kpis.totalLearners === 1 ? "Student" : "Students"}
            </span>
          </p>
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {scopeLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary-text)]">
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Results Recorded</span>
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {kpis.recordedCount} / {kpis.totalLearners}{" "}
            <span className="text-lg font-semibold text-slate-600">
              ({kpis.recordedPercent}%)
            </span>
          </p>
          <p className="mt-1 text-xs font-semibold text-rose-600 tabular-nums">
            {kpis.pendingCount} pending
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary-text)]">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Class Average</span>
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {typeof kpis.classAverage === "number"
              ? `${kpis.classAverage.toFixed(1)}%`
              : "—"}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-600 tabular-nums">
            {deltaText ?? "Current reporting period"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary-text)]">
              <Award className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>Overall Performance</span>
          </div>
          <p className="mt-2.5 text-lg font-bold tracking-tight text-slate-900">
            Top performer:
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-600 tabular-nums">
            {kpis.topPerformer
              ? `${kpis.topPerformer.averageScore.toFixed(1)}% (${kpis.topPerformer.name})`
              : "No scored records yet"}
          </p>
        </div>
      </div>
    </section>
  );
}

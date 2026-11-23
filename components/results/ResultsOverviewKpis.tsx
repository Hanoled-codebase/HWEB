"use client";

import React from "react";
import { Award, FileCheck2, TrendingUp, Users } from "lucide-react";
import type { OverviewKpis } from "@/lib/results-overview";

export interface ResultsOverviewKpisProps {
  kpis: OverviewKpis;
}

export function ResultsOverviewKpis({ kpis }: ResultsOverviewKpisProps) {
  const deltaText =
    typeof kpis.midTermDelta === "number"
      ? `${kpis.midTermDelta >= 0 ? "+" : ""}${kpis.midTermDelta.toFixed(1)}% from Mid-term`
      : null;

  return (
    <section aria-label="Results overview metrics">
      {/* Mobile: one quiet coverage line. Four tiles repeated the same math. */}
      {kpis.totalLearners > 0 && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-600 md:hidden">
          <span className="tabular-nums">
            <strong className="font-bold text-slate-900">
              {kpis.recordedCount}
            </strong>
            <span className="text-slate-400">/</span>
            {kpis.totalLearners} recorded
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="tabular-nums">
            <strong className="font-bold text-slate-900">
              {kpis.pendingCount}
            </strong>{" "}
            pending
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="tabular-nums">
            Avg{" "}
            <strong className="font-bold text-[var(--primary-text)]">
              {typeof kpis.classAverage === "number"
                ? `${kpis.classAverage.toFixed(1)}%`
                : "—"}
            </strong>
          </span>
        </div>
      )}

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

"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight, X, ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  actionText: string;
  isComplete: boolean;
  icon?: LucideIcon;
}

interface RoleOnboardingCardProps {
  storageKey: string;
  badgeLabel?: string;
  title: string;
  subtitle: string;
  steps: OnboardingStep[];
  className?: string;
}

const emptySubscribe = () => () => {};

/**
 * Impeccable role onboarding card:
 * - Guides users directly to their primary "aha" moment with actionable steps.
 * - Live progress tracking (completed steps dynamically checked off).
 * - Collapsible and dismissible with localStorage persistence.
 * - Respects Hanoled brand palette (Hanoled Blue #1447E6, Growth Gold #F5A623, Deep Ink #0B1220).
 * - Strictly adheres to design system rules.
 */
export function RoleOnboardingCard({
  storageKey,
  badgeLabel = "Quick Start Guide",
  title,
  subtitle,
  steps,
  className,
}: RoleOnboardingCardProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isStoredDismissed = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => {
      try {
        return localStorage.getItem(`onboard_dismissed_${storageKey}`) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );

  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!isClient || isStoredDismissed || dismissed) return null;

  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.isComplete).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const allCompleted = totalSteps > 0 && completedSteps === totalSteps;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(`onboard_dismissed_${storageKey}`, "1");
    } catch {
      // Ignore localStorage write failures
    }
  };

  return (
    <section
      aria-label={title}
      className={cn(
        "relative rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 via-white to-white p-5 md:p-6 shadow-sm transition-all",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-full bg-blue-100/80 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {badgeLabel}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {completedSteps} of {totalSteps} complete ({progressPercent}%)
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-2xl">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand guide" : "Collapse guide"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss guide"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {!collapsed && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200",
                  step.isComplete
                    ? "border-emerald-200/80 bg-emerald-50/30"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-xs",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {idx + 1}
                    </span>
                    {step.isComplete ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                        <Circle className="h-3.5 w-3.5" />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-2.5">
                    {Icon && (
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          step.isComplete ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug">{step.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 leading-normal">{step.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <Link
                    href={step.href}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      step.isComplete
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs",
                    )}
                  >
                    <span>{step.actionText}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allCompleted && !collapsed && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
          <span className="font-medium">All starter steps complete! Your school is running smoothly.</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="font-semibold text-emerald-900 hover:underline"
          >
            Dismiss checklist
          </button>
        </div>
      )}
    </section>
  );
}

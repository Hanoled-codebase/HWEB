"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { BackButton } from "@/components/dashboard/shared";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import {
  DeleteSubAssessmentDialog,
  SubAssessmentDialog,
  type SubAssessmentModalMode,
} from "@/components/spreadsheets/SubAssessmentDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import {
  buildCategoryEntryParam,
  countEnteredScoresForColumn,
  getErrorMessage,
  groupAssessmentsByCategory,
  parseRouteParam,
  resolveSpreadsheetCategories,
  type SpreadsheetAssessment,
  type SpreadsheetDetail,
} from "@/lib/spreadsheets";
import { cn } from "@/lib/utils";

function SubAssessmentIcon({ name }: { name: string }) {
  const isAssignment = name.trim().toLowerCase().includes("assignment");
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF]">
      {isAssignment ? (
        <ScrollText className="h-5 w-5 text-[#1447E6]" aria-hidden="true" />
      ) : (
        <FileText className="h-5 w-5 text-[#1447E6]" aria-hidden="true" />
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-500"
      : status === "inactive"
        ? "bg-slate-400"
        : "bg-amber-400";
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold capitalize text-slate-700">
      <span className={cn("h-2 w-2 rounded-full", color)} aria-hidden="true" />
      {status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Pending"}
    </span>
  );
}

export default function CategorySubAssessmentsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const orgSlug = currentOrg?.slug;
  const sheetId = parseRouteParam(params.sheetId);
  const rawCategoryId = parseRouteParam(params.categoryId);
  const categoryId = (() => {
    try {
      return decodeURIComponent(rawCategoryId);
    } catch {
      return rawCategoryId;
    }
  })();

  const [sheet, setSheet] = useState<SpreadsheetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [subModal, setSubModal] = useState<SubAssessmentModalMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpreadsheetAssessment | null>(null);

  const triggerRefresh = () => {
    setReloadSeq((n) => n + 1);
  };

  useEffect(() => {
    if (!orgSlug || !sheetId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await apiFetch<SpreadsheetDetail>(
          `/spreadsheets/${orgSlug}/${sheetId}`,
        );
        if (cancelled) return;
        setSheet(data);
      } catch (error) {
        if (cancelled) return;
        const message = getErrorMessage(error, "Failed to load assessment category");
        setSheet(null);
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, reloadSeq, sheetId]);

  const rawAssessments = useMemo<SpreadsheetAssessment[]>(
    () => (Array.isArray(sheet?.assessments) ? sheet.assessments : []),
    [sheet],
  );
  const categories = useMemo(() => resolveSpreadsheetCategories(sheet), [sheet]);
  const groupedSubs = useMemo(
    () => groupAssessmentsByCategory(categories, rawAssessments),
    [categories, rawAssessments],
  );
  const subCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const [id, list] of groupedSubs.entries()) {
      map.set(id, list.length);
    }
    return map;
  }, [groupedSubs]);

  const category = useMemo(
    () => categories.find((cat) => cat.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const categorySubs = useMemo(
    () => (category ? (groupedSubs.get(category.id) ?? []) : []),
    [category, groupedSubs],
  );

  const subjectName = sheet?.subject?.name || "Subject";
  const className = sheet?.classLevel?.name || "Class";
  const totalLearners = Array.isArray(sheet?.data) ? sheet.data.length : 0;

  useMobilePageTitle(category ? category.name : null);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const canEdit =
    isPrivileged ||
    (currentMember?.role === "member" && sheet?.status !== "inactive");
  const isPublishedLocked = Boolean(sheet?.hcoreAssessmentId);
  const canManageSubAssessments =
    Boolean(category) && !category?.isSingleInstance && canEdit && !isPublishedLocked;

  const rawMaxTotal = useMemo(
    () =>
      categorySubs.reduce(
        (sum, item) => sum + (Number(item.assessment.maxObtainableScore ?? item.assessment.total) || 0),
        0,
      ),
    [categorySubs],
  );

  const assessmentsHref = orgSlug
    ? `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}`
    : "/dashboard";

  if (isLoading) {
    return (
      <div className="-mx-4 -mt-4 space-y-4 bg-slate-50 px-4 pb-10 pt-5 md:mx-0 md:mt-0 md:bg-transparent md:px-0 md:pt-0">
        <BackButton label="Back to Assessments" href={assessmentsHref} className="hidden md:inline-flex" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-2xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!sheet && loadError) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to Assessments" href={assessmentsHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-rose-300" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#0B1220]">Unable to Load</h2>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          <button
            type="button"
            onClick={triggerRefresh}
            className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!sheet || !category) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to Assessments" href={assessmentsHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-blue-300" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#0B1220]">Category Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">
            This assessment category is unavailable on this spreadsheet.
          </p>
          <button
            type="button"
            onClick={() => router.push(assessmentsHref)}
            className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8]"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const showScaleChip =
    categorySubs.length > 0 &&
    (categorySubs.length > 1 || rawMaxTotal !== category.maxMarks);

  return (
    <div className="-mx-4 -mt-4 flex flex-col bg-slate-50 md:mx-0 md:mt-0 md:bg-transparent">
      <div className="px-4 pb-10 pt-5 md:mx-auto md:w-full md:max-w-3xl md:px-0 md:pt-0">
        <BackButton
          label="Back to Assessments"
          href={assessmentsHref}
          className="mb-4 hidden md:inline-flex"
        />

        {/* Category header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="hidden truncate text-2xl font-bold tracking-tight text-[#0B1220] md:block">
              {category.name}
            </h1>
            <p className="truncate text-sm text-slate-600 md:mt-1">
              <span className="font-semibold text-[#0B1220]">{subjectName}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-semibold text-[#0B1220]">{className}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#EEF0FF] px-3 py-0.5 text-xs font-bold tabular-nums text-[#1447E6] ring-1 ring-[#1447E6]/15">
                Max {category.maxMarks}
              </span>
              {showScaleChip && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                  {rawMaxTotal} raw → {category.maxMarks}
                </span>
              )}
            </div>
          </div>
          <StatusDot status={sheet.status} />
        </div>

        {/* Sub-assessments list */}
        {categorySubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
            <FileText className="mx-auto mb-3 h-9 w-9 text-slate-300" aria-hidden="true" />
            <h2 className="text-base font-bold text-[#0B1220]">No sub-assessments yet</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
              Create sub-assessments (such as {category.name} 1 and {category.name} 2) or enter
              scores directly out of {category.maxMarks}.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              {canManageSubAssessments && (
                <button
                  type="button"
                  onClick={() => setSubModal({ mode: "add", categoryId: category.id })}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#1447E6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add sub-assessment
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/assessment/${encodeURIComponent(buildCategoryEntryParam(category.id))}`,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Enter scores directly (Out of {category.maxMarks})
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {categorySubs.map(({ assessment, originalIndex }) => {
                const subMax = Number(assessment.maxObtainableScore ?? assessment.total ?? 0);
                const entered = countEnteredScoresForColumn(sheet.data, originalIndex);
                const subHref = assessment.id
                  ? `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/assessment/${encodeURIComponent(assessment.id)}`
                  : `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/assessment/${originalIndex}`;
                const hasScores = entered > 0 || (assessment.recordedScoreCount ?? 0) > 0;

                return (
                  <div
                    key={assessment.id || `${originalIndex}-${assessment.name}`}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-colors hover:border-[#1447E6]/35 motion-reduce:transition-none md:flex-row md:items-center"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(subHref)}
                      className="group flex min-h-[72px] w-full min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1447E6] motion-reduce:transition-none"
                    >
                      <SubAssessmentIcon name={assessment.name} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-[#0B1220] group-hover:text-[#1447E6]">
                          {assessment.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 tabular-nums">
                          {totalLearners > 0
                            ? `${entered}/${totalLearners} entered`
                            : `${className} · ${subjectName}`}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-bold tabular-nums text-[#1447E6] ring-1 ring-[#1447E6]/15">
                        Max {subMax}
                      </span>

                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1447E6] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                    </button>

                    {canManageSubAssessments && !assessment.isSystemGenerated && assessment.id && (
                      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-slate-100 bg-slate-50/50 px-3 py-0.5 md:border-l md:border-t-0 md:bg-transparent md:py-0 md:pl-1 md:pr-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSubModal({
                              mode: "edit",
                              id: assessment.id as string,
                              categoryId: category.id,
                              initialName: assessment.name,
                              initialMaxMarks: subMax,
                            })
                          }
                          aria-label={`Edit ${assessment.name}`}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0B1220] md:h-9 md:min-h-0 md:w-9 md:px-0"
                        >
                          <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                          <span className="md:sr-only">Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={hasScores}
                          onClick={() => setDeleteTarget(assessment)}
                          aria-label={
                            hasScores
                              ? `Cannot remove ${assessment.name} while scores are recorded`
                              : `Remove ${assessment.name}`
                          }
                          title={
                            hasScores
                              ? "Clear recorded scores before removing"
                              : `Remove ${assessment.name}`
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35 md:h-9 md:min-h-0 md:w-9 md:px-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                          <span className="md:sr-only">Remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {canManageSubAssessments && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setSubModal({ mode: "add", categoryId: category.id })}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1447E6] px-4 text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-[#0F36B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] motion-reduce:transition-none"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add sub-assessment
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {orgSlug && (
        <>
          <SubAssessmentDialog
            open={Boolean(subModal)}
            modal={subModal}
            orgSlug={orgSlug}
            sheetId={sheetId}
            categories={categories}
            subCountByCategory={subCountByCategory}
            onOpenChange={(open) => {
              if (!open) setSubModal(null);
            }}
            onSaved={() => {
              triggerRefresh();
            }}
          />
          <DeleteSubAssessmentDialog
            target={deleteTarget}
            orgSlug={orgSlug}
            sheetId={sheetId}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            onDeleted={() => {
              triggerRefresh();
            }}
          />
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { DataStateCard } from "@/components/dashboard/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart3, Printer } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { downloadReportCardPdf } from "@/lib/report-card-download";
import ReportCardPrintModal, {
  computeNigerianGrade,
} from "@/components/results/ReportCardPrintModal";
import { ResultsBrandHeader } from "@/components/results/ResultsBrandHeader";
import { ResultEditionsCatalog } from "@/components/results/ResultEditionsCatalog";
import {
  formatEditionTitle,
  type ResultEdition,
  type ResultStage,
} from "@/lib/results-overview";

type SubjectResult = {
  spreadsheetId: string;
  subject: { id: string; name: string };
  classLevel: { id: string; name: string } | null;
  status: string;
  totalScore: number;
  assessments: Array<{
    name: string;
    total: number;
    score: number | string | null;
    percentage: number | null;
  }>;
};

type PublishedTermResult = {
  id: string;
  resultType: string;
  term: string;
  academicYear: string;
  totalScore: number;
  grade: string;
  position: number | null;
  publishedAt: string | null;
  template?: { name?: string; midTermTotal?: number | null } | null;
};

type ResultsData = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string;
    gender?: string;
    classLevel: { id: string; name: string } | null;
  };
  subjects: SubjectResult[];
  approvedTemplate?: { id: string; name: string; isApproved: boolean } | null;
  isTemplateApproved?: boolean;
  /** Published results only — the backend filters on publishedAt. */
  termResults?: PublishedTermResult[];
};

type StudentEditionsResponse = {
  roleScope: "student";
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string;
    className?: string | null;
  };
  editions: ResultEdition[];
};

export default function StudentResultsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { currentOrg } = useOrganization();
  const [data, setData] = useState<ResultsData | null>(null);
  const [editions, setEditions] = useState<ResultEdition[]>([]);
  const [editionsLoading, setEditionsLoading] = useState(true);
  const [hasSelectedEdition, setHasSelectedEdition] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSwitchingStage, setIsSwitchingStage] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [forbidden, setForbidden] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  // Active report stage: mid-term (raw stage %) or end-of-term.
  const [pdfResultType, setPdfResultType] = useState<ResultStage>("END_OF_TERM");
  const activeStageLabel = pdfResultType === "MID_TERM" ? "mid-term" : "end-of-term";
  // Term/year come from the school's HCORE academic periods — free-text terms
  // silently computed as 0, so typing is no longer offered.
  const [periodOptions, setPeriodOptions] = useState<{ academicYear: string; term: string }[]>([]);
  const [term, setTerm] = useState("First Term");
  const [year, setYear] = useState("2026/2027");

  // Load the school's academic periods and available student result editions.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function loadPeriodsAndEditions() {
      try {
        const [periodsResp, editionsResp] = await Promise.all([
          apiFetch<{ success: boolean; data: { academicYear: string; term: string }[] }>(
            `/result-templates/periods/${slug}`,
            { showErrorToast: false },
          ).catch(() => ({ success: false, data: [] })),
          apiFetch<StudentEditionsResponse>(`/student/${slug}/results/editions`, {
            showErrorToast: false,
          }).catch(() => ({ roleScope: "student" as const, editions: [] })),
        ]);
        if (cancelled) return;
        const periods = Array.isArray(periodsResp.data) ? periodsResp.data : [];
        if (periods.length > 0) {
          setPeriodOptions(periods);
          setYear(periods[0].academicYear);
          setTerm(periods[0].term);
        }
        const fetchedEditions = Array.isArray(editionsResp?.editions)
          ? editionsResp.editions
          : [];
        setEditions(fetchedEditions);
        if (fetchedEditions.length > 0) {
          setYear(fetchedEditions[0].academicYear);
          setTerm(fetchedEditions[0].academicTerm);
          setPdfResultType(fetchedEditions[0].resultType);
        }
      } finally {
        if (!cancelled) setEditionsLoading(false);
      }
    }
    void loadPeriodsAndEditions();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function loadResults() {
      try {
        setForbidden(false);
        if (hasLoadedOnceRef.current) {
          setIsSwitchingStage(true);
        } else {
          setLoading(true);
        }
        const res = await apiFetch<ResultsData>(
          `/student/${slug}/results?term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(
            year,
          )}&resultType=${pdfResultType}`,
        );
        if (cancelled) return;
        hasLoadedOnceRef.current = true;
        setData(res);
      } catch (error) {
        if (cancelled) return;
        if (isForbiddenError(error)) setForbidden(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsSwitchingStage(false);
        }
      }
    }
    void loadResults();
    return () => {
      cancelled = true;
    };
  }, [slug, term, year, pdfResultType]);

  // Fallback synthesis when /editions is empty on older mock fixtures but data has subjects
  const effectiveEditions = useMemo<ResultEdition[]>(() => {
    if (editions.length > 0) return editions;
    if (!data || (data.subjects.length === 0 && (data.termResults || []).length === 0)) {
      return [];
    }
    const synthesized: ResultEdition[] = [
      {
        key: `${year}|${term}|END_OF_TERM`,
        academicYear: year,
        academicTerm: term,
        resultType: "END_OF_TERM",
        title: formatEditionTitle(term, "END_OF_TERM"),
        subjectCount: data.subjects.length,
        isPublished: true,
      },
      {
        key: `${year}|${term}|MID_TERM`,
        academicYear: year,
        academicTerm: term,
        resultType: "MID_TERM",
        title: formatEditionTitle(term, "MID_TERM"),
        subjectCount: data.subjects.length,
        isPublished: true,
      },
    ];
    return synthesized;
  }, [editions, data, year, term]);

  const handleSelectEdition = useCallback((edition: ResultEdition) => {
    setYear(edition.academicYear);
    setTerm(edition.academicTerm);
    setPdfResultType(edition.resultType);
    setHasSelectedEdition(true);
  }, []);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-6 md:p-6">
        <DataStateCard
          variant="forbidden"
          title="Results unavailable"
          description="You do not have permission to view academic results for this school."
        />
      </div>
    );
  }

  // LEVEL 1: Available Result Editions Catalog (Student sees ONLY available result names first)
  if (!hasSelectedEdition) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 md:space-y-6 md:p-6">
        <ResultsBrandHeader
          title="Available Academic Results"
          subtitle="Select an available result below to view your subject breakdown and official report slip."
        />

        <ResultEditionsCatalog
          variant="family"
          editions={effectiveEditions}
          isLoading={editionsLoading && loading}
          onSelectEdition={handleSelectEdition}
          transcriptHref={`/dashboard/school/${slug}/student/results/transcript`}
          emptyTitle="No academic results available yet"
          emptyMessage="Your term and mid-term results will appear here once your school publishes them."
        />
      </div>
    );
  }

  // LEVEL 3: Selected Result Detail & Branded Report Card
  const currentEditionTitle = formatEditionTitle(term, pdfResultType);

  return (
    <div className="mx-auto max-w-5xl space-y-4 md:space-y-6 md:p-6">
      <ResultsBrandHeader
        title={currentEditionTitle}
        subtitle={
          data?.student
            ? `${data.student.firstName} ${data.student.lastName}${
                data.student.classLevel?.name ? ` · ${data.student.classLevel.name}` : ""
              }`
            : "Academic Performance Breakdown"
        }
        editionLabel={`${term} · ${year}`}
        backLabel="Available Results"
        onBack={() => setHasSelectedEdition(false)}
        stage={pdfResultType}
        onStageChange={setPdfResultType}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {periodOptions.length > 0 && (
              <select
                value={`${year}|${term}`}
                onChange={(e) => {
                  const [y, t] = e.target.value.split("|");
                  if (y && t) {
                    setYear(y);
                    setTerm(t);
                  }
                }}
                className="min-h-11 md:pointer-fine:min-h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label="Academic period"
              >
                {periodOptions.map((p) => (
                  <option
                    key={`${p.academicYear}|${p.term}`}
                    value={`${p.academicYear}|${p.term}`}
                  >
                    {p.term} — {p.academicYear}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              asChild
              className="min-h-11 whitespace-nowrap rounded-xl md:pointer-fine:min-h-9"
            >
              <Link href={`/dashboard/school/${slug}/student/results/transcript`}>
                <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Transcript
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!data || data.subjects.length === 0}
              onClick={() => setShowPrintModal(true)}
              className="min-h-11 whitespace-nowrap rounded-xl border-[var(--primary-border)] bg-[var(--primary-light)] font-semibold text-[var(--primary-text)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] gap-1.5 md:pointer-fine:min-h-9"
            >
              <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Print / Preview
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={
                !data ||
                (data.subjects.length === 0 && (data.termResults || []).length === 0)
              }
              className="min-h-11 whitespace-nowrap rounded-xl px-3 md:pointer-fine:min-h-9"
              onClick={() => {
                if (!data) return;
                void downloadReportCardPdf({
                  orgSlug: slug,
                  studentId: data.student.id,
                  studentName: `${data.student.firstName} ${data.student.lastName}`,
                  term,
                  academicYear: year,
                  resultType: pdfResultType,
                });
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              PDF
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !data ||
        (data.subjects.length === 0 && (data.termResults || []).length === 0) ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-300" aria-hidden="true" />
            <p className="font-semibold text-slate-700">
              No {activeStageLabel} results yet
            </p>
            <p className="mt-1 max-w-[384px] text-sm text-slate-600">
              Completed {activeStageLabel} assessments and exam scores will appear
              here once graded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          aria-busy={isSwitchingStage}
          className={
            isSwitchingStage
              ? "space-y-4 opacity-60 transition-opacity motion-reduce:transition-none"
              : "space-y-4 transition-opacity motion-reduce:transition-none"
          }
        >
          {data && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs">
              <span className="font-medium text-slate-600">
                Report Status:{" "}
                <strong className="font-semibold text-slate-900">
                  {currentEditionTitle}
                </strong>
              </span>
              {data.isTemplateApproved ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700"
                >
                  ✓ Official &amp; Approved
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-xs font-bold text-amber-700"
                >
                  Pending Official Approval
                </Badge>
              )}
            </div>
          )}

          {(data.termResults || []).length > 0 && (
            <div className="space-y-2">
              {(data.termResults ?? []).map((result) => (
                <Card
                  key={result.id}
                  className="overflow-hidden border-slate-200 shadow-2xs"
                >
                  <div
                    className="h-1 w-full bg-[var(--primary)]"
                    aria-hidden="true"
                  />
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {result.resultType === "MID_TERM"
                          ? "Mid-term result"
                          : "End-of-term result"}
                        {result.template?.name ? ` · ${result.template.name}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {result.term} · {result.academicYear}
                        {result.template?.midTermTotal != null &&
                        result.template.midTermTotal > 0 &&
                        result.resultType !== "MID_TERM"
                          ? ` · Mid-term counts as ${result.template.midTermTotal}%`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {result.position != null && (
                        <Badge
                          variant="outline"
                          className="border-slate-200 text-[11px] font-bold"
                        >
                          #{result.position}
                        </Badge>
                      )}
                      <span className="text-lg font-black tabular-nums text-slate-900">
                        {result.totalScore}
                      </span>
                      <Badge className="bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">
                        {result.grade}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {data.subjects.map((subject) => {
            const totals = subject.assessments.reduce(
              (acc, a) => {
                const max = Number(a.total);
                const numericScore =
                  a.score !== "" && a.score !== null && a.score !== undefined
                    ? Number(a.score)
                    : NaN;
                if (Number.isFinite(max) && max > 0) {
                  acc.possible += max;
                }
                if (Number.isFinite(numericScore)) {
                  acc.earned += numericScore;
                  acc.hasRecorded = true;
                }
                return acc;
              },
              { earned: 0, possible: 0, hasRecorded: false },
            );
            const avgPercentage =
              totals.hasRecorded && totals.possible > 0
                ? Number(((totals.earned / totals.possible) * 100).toFixed(1))
                : null;

            return (
              <Card
                key={subject.spreadsheetId}
                className="border-slate-200 shadow-2xs"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary-text)]">
                        <BarChart3 className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle className="text-sm capitalize">
                          {subject.subject.name.toLowerCase()}
                        </CardTitle>
                        {subject.classLevel && (
                          <p className="text-xs text-slate-500">
                            {subject.classLevel.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {avgPercentage !== null && (
                      <Badge
                        variant="outline"
                        className={
                          avgPercentage >= 50
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }
                      >
                        {avgPercentage}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subject.assessments.map((assessment, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {assessment.name}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            Marks:{" "}
                            {assessment.score !== "" &&
                            assessment.score !== null &&
                            assessment.score !== undefined
                              ? assessment.score
                              : "—"}{" "}
                            / {assessment.total}
                          </p>
                        </div>
                        {assessment.percentage !== null && (
                          <Badge
                            variant="outline"
                            className={
                              assessment.percentage >= 50
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-rose-200 bg-rose-50 text-rose-700"
                            }
                          >
                            {assessment.percentage}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showPrintModal && data && (
        <ReportCardPrintModal
          orgSlug={slug}
          orgName={currentOrg?.name}
          orgLogo={currentOrg?.logo || undefined}
          orgAddress={currentOrg?.address || undefined}
          orgEmail={currentOrg?.email ? `Email: ${currentOrg.email}` : undefined}
          orgPrimaryColor={currentOrg?.primaryColor}
          orgSecondaryColor={currentOrg?.secondaryColor}
          student={data.student}
          term={term}
          academicYear={year}
          resultType={pdfResultType}
          onResultTypeChange={setPdfResultType}
          isLoadingResults={isSwitchingStage}
          results={data.subjects.map((sub) => {
            const score = Math.round(sub.totalScore || 0);
            const gradeObj = computeNigerianGrade(score);

            let classExercises: number | string | null = null;
            let assignments: number | string | null = null;
            let periodicTests: number | string | null = null;
            let examScore: number | string | null = null;

            (sub.assessments || []).forEach((a, idx) => {
              const name = (a.name || "").toLowerCase();
              if (
                name.includes("exercise") ||
                name.includes("ca 1") ||
                name.includes("first ca") ||
                name.includes("cw")
              ) {
                classExercises = a.score;
              } else if (
                name.includes("assign") ||
                name.includes("homework") ||
                name.includes("ca 2") ||
                name.includes("hw")
              ) {
                assignments = a.score;
              } else if (
                name.includes("test") ||
                name.includes("ca 3") ||
                name.includes("periodic")
              ) {
                periodicTests = a.score;
              } else if (name.includes("exam")) {
                examScore = a.score;
              } else if (idx === 0 && classExercises === null) {
                classExercises = a.score;
              } else if (idx === 1 && assignments === null) {
                assignments = a.score;
              } else if (idx === 2 && periodicTests === null) {
                periodicTests = a.score;
              } else if (idx === 3 && examScore === null) {
                examScore = a.score;
              }
            });

            return {
              subject: sub.subject.name,
              score,
              maxScore: 100,
              grade: gradeObj.grade,
              classExercises,
              assignments,
              periodicTests,
              examScore,
            };
          })}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

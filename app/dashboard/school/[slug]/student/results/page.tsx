"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { DataStateCard } from "@/components/dashboard/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, BarChart3, Printer } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { downloadReportCardPdf } from "@/lib/report-card-download";
import ReportCardPrintModal, {
  computeNigerianGrade,
} from "@/components/results/ReportCardPrintModal";

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
  student: { id: string; firstName: string; lastName: string; admissionNumber?: string; gender?: string; classLevel: { id: string; name: string } | null };
  subjects: SubjectResult[];
  approvedTemplate?: { id: string; name: string; isApproved: boolean } | null;
  isTemplateApproved?: boolean;
  /** Published results only — the backend filters on publishedAt. */
  termResults?: PublishedTermResult[];
};

export default function StudentResultsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { currentOrg } = useOrganization();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  // Which stored result the PDFs render: mid-term (raw stage %) or end-of-term.
  const [pdfResultType, setPdfResultType] = useState<"MID_TERM" | "END_OF_TERM">("END_OF_TERM");
  // Term/year come from the school's HCORE academic periods — free-text terms
  // silently computed as 0, so typing is no longer offered.
  const [periodOptions, setPeriodOptions] = useState<{ academicYear: string; term: string }[]>([]);
  const [term, setTerm] = useState("First Term");
  const [year, setYear] = useState("2026/2027");

  // Load the school's academic periods and default to the most recent one.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    apiFetch<{ success: boolean; data: { academicYear: string; term: string }[] }>(`/result-templates/periods/${slug}`)
      .then(({ data: periods }) => {
        if (cancelled || !Array.isArray(periods) || periods.length === 0) return;
        setPeriodOptions(periods);
        setYear(periods[0].academicYear);
        setTerm(periods[0].term);
      })
      .catch(() => {
        // Keep the fallback term/year.
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    async function loadResults() {
      try {
        setForbidden(false);
        // Resolves the caller's own student record server-side from the JWT
        // (requireStudentAccess) — the org slug in the path is still required
        // to scope which organization's result data is being requested.
        const res = await apiFetch<ResultsData>(
          `/student/${slug}/results?term=${encodeURIComponent(term)}&academicYear=${encodeURIComponent(
            year,
          )}&resultType=${pdfResultType}`,
        );
        setData(res);
      } catch (error) {
        if (isForbiddenError(error)) setForbidden(true);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [slug, term, year, pdfResultType]);

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 md:p-6">
      
      {/* Header (phones: the top bar names the page and carries the back target) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="hidden md:block">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link
              href={`/dashboard/school/${slug}`}
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Academic Results</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Report</h1>
            {data && (
              data.isTemplateApproved ? (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold">
                  ✓ Official & Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold">
                  Pending Official Approval
                </Badge>
              )
            )}
          </div>
        </div>

        {data && data.subjects.length > 0 && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="min-h-11 whitespace-nowrap sm:min-h-9"
              >
                <Link href={`/dashboard/school/${slug}/student/results/transcript`}>
                  <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Transcript
                </Link>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintModal(true)}
                className="min-h-11 whitespace-nowrap border-blue-200 bg-blue-50 font-semibold text-[#1447E6] hover:bg-blue-100 gap-1.5 sm:min-h-9"
              >
                <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Print / Preview
              </Button>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:items-center">
              <select
                value={`${year}|${term}`}
                onChange={(e) => {
                  const [y, t] = e.target.value.split("|");
                  if (y && t) {
                    setYear(y);
                    setTerm(t);
                  }
                }}
                className="min-h-11 min-w-0 w-full rounded-md border border-input bg-white px-2.5 text-sm font-medium sm:min-h-9 sm:w-auto"
                aria-label="Academic period"
              >
                {periodOptions.length > 0 ? (
                  periodOptions.map((p) => (
                    <option key={`${p.academicYear}|${p.term}`} value={`${p.academicYear}|${p.term}`}>
                      {p.term} — {p.academicYear}
                    </option>
                  ))
                ) : (
                  <option value={`${year}|${term}`}>
                    {term} — {year}
                  </option>
                )}
              </select>

              <select
                value={pdfResultType}
                onChange={(e) =>
                  setPdfResultType(e.target.value === "MID_TERM" ? "MID_TERM" : "END_OF_TERM")
                }
                className="min-h-11 rounded-md border border-input bg-white px-2.5 text-sm font-medium sm:min-h-9"
                aria-label="Report type for PDF download"
              >
                <option value="END_OF_TERM">End-of-term</option>
                <option value="MID_TERM">Mid-term</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                className="min-h-11 whitespace-nowrap px-3 sm:min-h-9"
                onClick={() => {
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
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !data || (data.subjects.length === 0 && (data.termResults || []).length === 0) ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mb-4" />
            <p className="font-semibold text-slate-700">No results yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-[384px]">
              Completed assessments and exam scores will appear here once graded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Published computed results for the selected term and report type.
              Only types the school has published ever appear here. */}
          {(data.termResults || []).length > 0 && (
            <div className="space-y-2">
              {(data.termResults ?? []).map((result) => (
                <Card key={result.id} className="border-black shadow-sm">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {result.resultType === "MID_TERM" ? "Mid-term result" : "End-of-term result"}
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
                        <Badge variant="outline" className="border-slate-200 text-[11px] font-bold">
                          #{result.position}
                        </Badge>
                      )}
                      <span className="text-lg font-black tabular-nums text-slate-900">
                        {result.totalScore}
                      </span>
                      <Badge className="bg-black text-white text-xs font-bold">{result.grade}</Badge>
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
              <Card key={subject.spreadsheetId} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
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
                          <p className="text-sm font-medium text-slate-900 truncate">
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
          student={data.student}
          term={term}
          academicYear={year}
          resultType={pdfResultType}
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
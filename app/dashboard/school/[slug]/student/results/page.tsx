"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, HSMS_BASE, isForbiddenError } from "@/lib/api";
import { DataStateCard } from "@/components/dashboard/shared";
import { authFetchInit } from "@/lib/auth-tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, BarChart3, Printer } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
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
    score: number;
    percentage: number | null;
  }>;
};

type ResultsData = {
  student: { id: string; firstName: string; lastName: string; admissionNumber?: string; gender?: string; classLevel: { id: string; name: string } | null };
  subjects: SubjectResult[];
  approvedTemplate?: { id: string; name: string; isApproved: boolean } | null;
  isTemplateApproved?: boolean;
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

  useEffect(() => {
    async function loadResults() {
      try {
        setForbidden(false);
        // Resolves the caller's own student record server-side from the JWT
        // (requireStudentAccess) — the org slug in the path is still required
        // to scope which organization's result data is being requested.
        const res = await apiFetch<ResultsData>(`/student/${slug}/results`);
        setData(res);
      } catch (error) {
        if (isForbiddenError(error)) setForbidden(true);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [slug]);

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/dashboard/school/${slug}/student/results/transcript`}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Transcript
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintModal(true)}
              className="border-blue-200 bg-blue-50 text-[#1447E6] hover:bg-blue-100 font-semibold gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Preview
            </Button>

            <select
              value={pdfResultType}
              onChange={(e) =>
                setPdfResultType(e.target.value === "MID_TERM" ? "MID_TERM" : "END_OF_TERM")
              }
              className="h-9 rounded-md border border-input bg-white px-2 text-sm font-medium"
              aria-label="Report type for PDF download"
            >
              <option value="END_OF_TERM">End-of-term</option>
              <option value="MID_TERM">Mid-term</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const url = `${HSMS_BASE}/export/${slug}/report-card/${data.student.id}?term=Term%201&academicYear=2026%2F2027&resultType=${pdfResultType}`;
                  const res = await fetch(url, authFetchInit("hcore"));
                  if (!res.ok) throw new Error("Failed to download");
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = `report-card-${data.student.firstName}-${data.student.lastName}${pdfResultType === "MID_TERM" ? "-mid-term" : ""}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(blobUrl);
                } catch {
                  // silent
                }
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : !data || data.subjects.length === 0 ? (
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
          {data.subjects.map((subject) => {
            const avgPercentage =
              subject.assessments.length > 0
                ? Number(
                    (
                      subject.assessments.reduce(
                        (s, a) => s + (a.percentage || 0),
                        0
                      ) / subject.assessments.length
                    ).toFixed(1)
                  )
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
                          <p className="text-xs text-slate-500">
                            Score: {assessment.score} / {assessment.total}
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
          term="First Term"
          academicYear="2026/2027"
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
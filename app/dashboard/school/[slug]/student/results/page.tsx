"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, HSMS_BASE } from "@/lib/api";
import { getHcoreToken } from "@/lib/auth-tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, BarChart3, Printer } from "lucide-react";
import ReportCardPrintModal from "@/components/results/ReportCardPrintModal";

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
};

export default function StudentResultsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    async function loadResults() {
      try {
        const res = await apiFetch<ResultsData>(`/spreadsheets/student/my-results`);
        setData(res);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [slug]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Report</h1>
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

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const url = `${HSMS_BASE}/export/${slug}/report-card/${data.student.id}?term=Term%201&academicYear=2026%2F2027`;
                  const token = getHcoreToken();
                  const res = await fetch(url, {
                    credentials: "include",
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  });
                  if (!res.ok) throw new Error("Failed to download");
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = `report-card-${data.student.firstName}-${data.student.lastName}.pdf`;
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
          student={data.student}
          term="Term 1"
          academicYear="2026/2027"
          results={data.subjects.map((sub) => ({
            subject: sub.subject.name,
            score: Math.round(sub.totalScore || 0),
            maxScore: 100,
            grade: sub.totalScore >= 70 ? "A" : sub.totalScore >= 60 ? "B" : sub.totalScore >= 50 ? "C" : sub.totalScore >= 40 ? "D" : "F",
            remark: sub.totalScore >= 70 ? "Excellent" : sub.totalScore >= 60 ? "Very Good" : sub.totalScore >= 50 ? "Good" : sub.totalScore >= 40 ? "Fair" : "Needs Improvement",
          }))}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
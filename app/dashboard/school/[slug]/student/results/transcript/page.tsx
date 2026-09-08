"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer, ArrowLeft, GraduationCap, Award } from "lucide-react";
import { toast } from "sonner";

type GradeRecord = {
  id: string;
  subjectName: string;
  subjectCode: string;
  className: string;
  term: string;
  academicYear: string;
  score: number;
  maxPossible: number;
  percentage: number;
  grade: string;
};

type TranscriptResponse = {
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string | null;
    classLevel: string;
  };
  grades: GradeRecord[];
  cgpa: number;
};

export default function TranscriptPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { currentOrg } = useOrganization();

  const [data, setData] = useState<TranscriptResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchTranscript();
    }
  }, [slug]);

  async function fetchTranscript() {
    try {
      const res = await apiFetch<TranscriptResponse>(`/student/${slug}/transcript`);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate academic transcript");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1447E6]" />
        <p className="text-sm text-slate-500 mt-3">Compiling academic records...</p>
      </div>
    );
  }

  if (!data || data.grades.length === 0) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">No Academic Records</h2>
        <p className="text-sm text-slate-500 mt-1">
          There are no graded assessments available to compile a transcript.
        </p>
        <Button onClick={() => router.back()} className="mt-4" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Action buttons (hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
        </Button>
        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Printer className="mr-2 h-4 w-4" /> Print Transcript
        </Button>
      </div>

      {/* High-Fidelity Printable Transcript Document */}
      <Card className="border border-slate-200 shadow-lg rounded-none bg-white p-8 sm:p-12 print:border-0 print:shadow-none print:p-0">
        <CardContent className="space-y-8 p-0">
          {/* Branded Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4 text-center sm:text-left">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
                {currentOrg?.name || "Hanoled Academy"}
              </h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                Official Academic Transcript
              </p>
              {currentOrg?.address && (
                <p className="text-xs text-slate-400 mt-0.5">{currentOrg.address}</p>
              )}
            </div>
            {currentOrg?.logo && (
              <img
                src={currentOrg.logo}
                alt="School Logo"
                className="h-16 w-16 object-contain rounded-lg shrink-0"
              />
            )}
          </div>

          {/* Student Profile Metadata block */}
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 bg-slate-50 p-4 rounded-lg border border-slate-100 print:bg-transparent print:border-0 print:p-0">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Student Name</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {data.student.lastName}, {data.student.firstName}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Admission No.</span>
              <p className="font-semibold text-slate-900 mt-0.5">
                {data.student.admissionNumber || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Current Class</span>
              <p className="font-semibold text-slate-900 mt-0.5">{data.student.classLevel}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Cumulative GPA</span>
              <p className="font-extrabold text-blue-600 mt-0.5 flex items-center gap-1">
                <Award className="h-4 w-4 text-blue-500" />
                {data.cgpa.toFixed(2)} / 5.00
              </p>
            </div>
          </div>

          {/* Academic Records Table */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              Academic Record Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 font-semibold">
                    <th className="py-2.5">Subject</th>
                    <th className="py-2.5">Class</th>
                    <th className="py-2.5 text-center">Term</th>
                    <th className="py-2.5 text-center">Score</th>
                    <th className="py-2.5 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.grades.map((grade) => (
                    <tr key={grade.id} className="text-slate-800">
                      <td className="py-3 font-medium">
                        {grade.subjectName}{" "}
                        <span className="text-xs text-slate-400">({grade.subjectCode})</span>
                      </td>
                      <td className="py-3">{grade.className}</td>
                      <td className="py-3 text-center">{grade.term}</td>
                      <td className="py-3 text-center">
                        {grade.score} / {grade.maxPossible}{" "}
                        <span className="text-xs text-slate-400">({grade.percentage}%)</span>
                      </td>
                      <td className="py-3 text-center font-bold">{grade.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transcript Footer Signatures */}
          <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs border-t border-slate-200">
            <div className="space-y-1">
              <div className="h-0.5 bg-slate-300 w-3/4 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">School Registrar</p>
              <p className="text-slate-400">Signature & Date</p>
            </div>
            <div className="space-y-1">
              <div className="h-0.5 bg-slate-300 w-3/4 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">Principal / Head of Institution</p>
              <p className="text-slate-400">Stamp & Seal</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

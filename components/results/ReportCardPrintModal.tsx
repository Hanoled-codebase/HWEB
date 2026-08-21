"use client";

import React, { useRef } from "react";
import { Printer, Download, X, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";

export interface ReportCardStudent {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber?: string;
  gender?: string;
  classLevel?: {
    id?: string;
    name?: string | null;
    level?: string | null;
  } | null;
}

export interface ReportCardResultItem {
  subject: string;
  score: number;
  maxScore?: number;
  term1Score?: number;
  term2Score?: number;
  term3Score?: number;
  grade?: string;
  remark?: string;
}

export interface ReportCardTermResult {
  totalScore?: number;
  average?: number;
  grade?: string;
  position?: number;
  classAverage?: number;
  teacherRemark?: string;
  principalRemark?: string;
}

interface ReportCardPrintModalProps {
  orgSlug: string;
  orgName?: string;
  orgLogo?: string;
  orgAddress?: string;
  student: ReportCardStudent;
  term: string;
  academicYear: string;
  results: ReportCardResultItem[];
  termResult?: ReportCardTermResult;
  onClose: () => void;
}

export default function ReportCardPrintModal({
  orgSlug,
  orgName = "Hanoled Partner Academy",
  orgLogo,
  orgAddress = "Main Campus • Excellence in Education",
  student,
  term,
  academicYear,
  results = [],
  termResult,
  onClose,
}: ReportCardPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const token =
        typeof document !== "undefined"
          ? document.cookie
              .split("; ")
              .find((row) => row.startsWith("accessToken="))
              ?.split("=")[1]
          : null;

      const url = `${API_URL}/export/${orgSlug}/report-card/${student.id}?term=${encodeURIComponent(
        term
      )}&academicYear=${encodeURIComponent(academicYear)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        window.open(url, "_blank");
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Report_Card_${student.firstName}_${student.lastName}_${term.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      const fallbackUrl = `${API_URL}/export/${orgSlug}/report-card/${student.id}?term=${encodeURIComponent(
        term
      )}&academicYear=${encodeURIComponent(academicYear)}`;
      window.open(fallbackUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const overallTotal = results.reduce((acc, r) => acc + (r.score || 0), 0);
  const overallMax = results.reduce((acc, r) => acc + (r.maxScore || 100), 0);
  const calculatedAvg =
    overallMax > 0 ? ((overallTotal / overallMax) * 100).toFixed(1) : "0.0";

  return (
    <div className="report-card-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/80 p-4 backdrop-blur-md overflow-y-auto">
      {/* High-fidelity CSS for Native Browser Print */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0B1220 !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            font-family: 'Poppins', sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .report-card-modal-backdrop,
          .report-card-modal-backdrop *,
          .report-card-modal-wrapper,
          .report-card-modal-wrapper *,
          .report-card-scroll-area,
          .report-card-scroll-area *,
          #report-card-print-area,
          #report-card-print-area * {
            visibility: visible !important;
          }

          .report-card-modal-backdrop {
            position: fixed !important;
            inset: 0 !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            z-index: 999999 !important;
            display: block !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }

          .report-card-modal-wrapper {
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }

          .report-card-scroll-area {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            height: auto !important;
            max-height: none !important;
            display: block !important;
          }

          #report-card-print-area {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 10px 14px !important;
            background: #ffffff !important;
            color: #0B1220 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="report-card-modal-wrapper relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden my-6 border border-slate-200 flex flex-col max-h-[92vh] font-['Poppins',sans-serif]">
        {/* Top Control Bar */}
        <div className="no-print flex items-center justify-between border-b border-slate-800 bg-[#0B1220] px-6 py-3.5 text-white shrink-0">
          <div className="flex items-center gap-3">
            {/* Hanoled Monogram Logo Tile */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1447E6] text-white shadow-md">
              <svg viewBox="0 0 100 100" className="h-6 w-6 fill-current">
                <rect x="20" y="20" width="16" height="60" rx="8" />
                <rect x="64" y="20" width="16" height="60" rx="8" />
                <path d="M 28 64 L 72 36" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Hanoled Report Card Preview
                <span className="rounded-md bg-[#F5A623] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0B1220]">
                  Official
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {student.firstName} {student.lastName} &bull; {student.classLevel?.name || "Class"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-[#1447E6] hover:bg-[#1447E6]/90 text-white font-semibold gap-2 shadow-sm text-xs h-9 px-4 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <Button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              variant="outline"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold gap-2 text-xs h-9 px-4 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-800 h-9 w-9 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Report Card Canvas */}
        <div className="report-card-scroll-area p-6 overflow-y-auto bg-slate-100/70 flex-1">
          <div
            id="report-card-print-area"
            ref={printRef}
            className="relative mx-auto bg-white p-8 rounded-xl border border-slate-300 shadow-md space-y-5 text-[#0B1220] overflow-hidden"
          >
            {/* Top-Right Decorative Brand Wave Curve */}
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none overflow-hidden opacity-95">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <path d="M 50 0 C 120 40, 160 120, 200 200 L 200 0 Z" fill="#1447E6" />
                <path d="M 100 0 C 150 40, 175 100, 200 160 L 200 0 Z" fill="#0B1220" opacity="0.85" />
              </svg>
            </div>

            {/* Bottom-Left Decorative Brand Wave Curve */}
            <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none overflow-hidden opacity-95">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <path d="M 0 0 C 40 80, 120 150, 200 200 L 0 200 Z" fill="#1447E6" />
                <path d="M 0 50 C 40 110, 100 160, 160 200 L 0 200 Z" fill="#F5A623" opacity="0.9" />
              </svg>
            </div>

            {/* Header Lockup */}
            <div className="relative z-10 flex items-center justify-between border-b-2 border-[#1447E6] pb-4">
              <div className="flex items-center gap-4">
                {/* Hanoled Ascending Pillar Icon */}
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt={orgName}
                    className="h-16 w-16 object-contain rounded-xl border border-slate-200 bg-white p-1"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-[#1447E6] text-white flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 100 100" className="h-9 w-9 fill-current">
                      <rect x="20" y="20" width="16" height="60" rx="8" />
                      <rect x="64" y="20" width="16" height="60" rx="8" />
                      <path d="M 28 64 L 72 36" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1220] uppercase font-['Poppins']">
                    REPORT CARD
                  </h1>
                  <h2 className="text-sm font-bold text-[#1447E6] mt-0.5">{orgName}</h2>
                  <p className="text-[11px] text-slate-500 font-medium">{orgAddress}</p>
                </div>
              </div>

              <div className="text-right pr-12">
                <span className="inline-block rounded-lg bg-[#1447E6]/10 px-3 py-1 text-xs font-extrabold text-[#1447E6] border border-[#1447E6]/20">
                  {term}
                </span>
                <p className="text-xs font-bold text-[#0B1220] mt-1">{academicYear} Session</p>
              </div>
            </div>

            {/* Student & Class Info Grid (Example Layout matching design) */}
            <div className="relative z-10 rounded-xl bg-slate-50/90 p-4 border border-slate-200 text-xs">
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-6">
                <div className="flex items-center">
                  <span className="w-28 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Student Name:</span>
                  <span className="font-bold text-[#0B1220] text-sm">{student.firstName} {student.lastName}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Class / Section:</span>
                  <span className="font-bold text-[#0B1220] text-sm">{student.classLevel?.name || "Unassigned"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 font-bold text-slate-500 uppercase tracking-wider text-[10px]">School Year:</span>
                  <span className="font-semibold text-slate-800">{academicYear}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Admission No:</span>
                  <span className="font-semibold text-slate-800">{student.admissionNumber || "—"}</span>
                </div>
              </div>
            </div>

            {/* Academic Subject Performance Table */}
            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1447E6]">
                  Subject Assessment & Performance Breakdown
                </h3>
                <span className="text-[11px] font-medium text-slate-500">{results.length} Subjects</span>
              </div>

              <div className="overflow-hidden rounded-lg border border-[#0B1220]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0B1220] text-white font-bold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-slate-800">Subject</th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-800">1st Term</th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-800">2nd Term</th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-800">3rd Term</th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-800">Total Max</th>
                      <th className="px-2 py-2.5 text-center border-r border-slate-800">Obtained</th>
                      <th className="px-2 py-2.5 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 bg-white">
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-400 italic">
                          No assessment scores recorded for this term.
                        </td>
                      </tr>
                    ) : (
                      results.map((r, i) => {
                        const calculatedGrade =
                          r.grade ||
                          (r.score >= 70 ? "A" : r.score >= 60 ? "B" : r.score >= 50 ? "C" : r.score >= 40 ? "D" : "F");
                        return (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                            <td className="px-3 py-2 font-bold text-[#0B1220] border-r border-slate-200">
                              {r.subject}
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-200">
                              {r.term1Score ?? (term === "Term 1" ? r.score : "—")}
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-200">
                              {r.term2Score ?? (term === "Term 2" ? r.score : "—")}
                            </td>
                            <td className="px-2 py-2 text-center text-slate-600 border-r border-slate-200">
                              {r.term3Score ?? (term === "Term 3" ? r.score : "—")}
                            </td>
                            <td className="px-2 py-2 text-center font-medium text-slate-500 border-r border-slate-200">
                              {r.maxScore || 100}
                            </td>
                            <td className="px-2 py-2 text-center font-extrabold text-[#0B1220] border-r border-slate-200">
                              {r.score}
                            </td>
                            <td className="px-2 py-2 text-center font-bold">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                                  calculatedGrade === "A"
                                    ? "bg-[#12B76A]/15 text-[#12B76A]"
                                    : calculatedGrade === "B"
                                    ? "bg-[#1447E6]/15 text-[#1447E6]"
                                    : calculatedGrade === "C"
                                    ? "bg-[#F5A623]/20 text-[#D97706]"
                                    : calculatedGrade === "D"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-[#F04438]/15 text-[#F04438]"
                                }`}
                              >
                                {calculatedGrade}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms-Based Summary Table & Performance Badges */}
            <div className="relative z-10 grid grid-cols-12 gap-4">
              <div className="col-span-8 overflow-hidden rounded-lg border border-[#0B1220]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0B1220] text-white font-bold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 border-r border-slate-800">Terms Based Summary</th>
                      <th className="px-2 py-2 text-center border-r border-slate-800">1st Term</th>
                      <th className="px-2 py-2 text-center border-r border-slate-800">2nd Term</th>
                      <th className="px-2 py-2 text-center border-r border-slate-800">3rd Term</th>
                      <th className="px-2 py-2 text-center">Overall Cumulative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 bg-white font-semibold text-slate-800">
                    <tr>
                      <td className="px-3 py-2 bg-slate-50 font-bold border-r border-slate-200">Term Average</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200">{term === "Term 1" ? `${calculatedAvg}%` : "—"}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200">{term === "Term 2" ? `${calculatedAvg}%` : "—"}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200">{term === "Term 3" ? `${calculatedAvg}%` : "—"}</td>
                      <td className="px-2 py-2 text-center font-extrabold text-[#1447E6]">{calculatedAvg}%</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-slate-50 font-bold border-r border-slate-200">Class Position</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200">{term === "Term 1" && termResult?.position ? `${termResult.position}` : "—"}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200">{term === "Term 2" && termResult?.position ? `${termResult.position}` : "—"}</td>
                      <td className="px-2 py-2 text-center border-r border-slate-200">{term === "Term 3" && termResult?.position ? `${termResult.position}` : "—"}</td>
                      <td className="px-2 py-2 text-center font-extrabold text-[#F5A623]">
                        {termResult?.position ? `${termResult.position}${termResult.position === 1 ? 'st' : termResult.position === 2 ? 'nd' : termResult.position === 3 ? 'rd' : 'th'}` : "1st"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total & Position Gold Card */}
              <div className="col-span-4 rounded-lg bg-[#0B1220] p-3 text-white flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5A623]">Overall Grade</p>
                  <p className="text-xl font-black text-white">{termResult?.grade || (Number(calculatedAvg) >= 70 ? "A" : "B")}</p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Class Average:</span>
                  <span className="text-xs font-bold text-slate-200">{termResult?.classAverage ? `${termResult.classAverage.toFixed(1)}%` : `${calculatedAvg}%`}</span>
                </div>
              </div>
            </div>

            {/* Attendance Summary Line (Matching Example Layout) */}
            <div className="relative z-10 rounded-lg bg-slate-100 p-3 text-xs border border-slate-200 flex items-center justify-between font-medium">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Total School Days:</span>{" "}
                <span className="font-bold text-[#0B1220]">110 Days</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Attended:</span>{" "}
                <span className="font-bold text-[#12B76A]">104 Days</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Absent:</span>{" "}
                <span className="font-bold text-[#F04438]">6 Days</span>
              </div>
            </div>

            {/* Teacher's Feedback & Principal Signature Section */}
            <div className="relative z-10 space-y-3 pt-1">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0B1220] mb-1">
                  TEACHER'S FEEDBACK & REMARKS
                </h4>
                <div className="rounded-lg border border-slate-300 p-3 text-xs italic text-slate-700 bg-slate-50/50 min-h-[44px]">
                  "{termResult?.teacherRemark || "Demonstrates strong academic understanding and exemplary behavior throughout the session."}"
                </div>
              </div>

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-12 pt-4">
                <div>
                  <div className="border-b border-[#0B1220] border-dashed h-8"></div>
                  <p className="text-[11px] font-bold text-[#0B1220] mt-1">Class Teacher Signature & Date</p>
                </div>
                <div className="text-right">
                  <div className="border-b border-[#0B1220] border-dashed h-8"></div>
                  <p className="text-[11px] font-bold text-[#0B1220] mt-1">Principal Signature & Stamp</p>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="relative z-10 text-center text-[10px] text-slate-400 pt-3 border-t border-slate-200 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-[#12B76A]" />
              <span>Official computer-generated academic transcript powered by Hanoled.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

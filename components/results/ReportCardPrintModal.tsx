"use client";

import React, { useRef, useState, useMemo } from "react";
import { Printer, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadReportCardPdf } from "@/lib/report-card-download";
import {
  getCurriculumSubjectsForClass,
  matchSubjectAlias,
} from "@/lib/student-performance";

export interface ReportCardStudent {
  id: string;
  firstName: string;
  middleName?: string;
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
  grade?: string;
  remark?: string;
  classExercises?: number | string | null;
  assignments?: number | string | null;
  periodicTests?: number | string | null;
  examScore?: number | string | null;
  highestScore?: number | string | null;
  lowestScore?: number | string | null;
}

export interface ReportCardPrintModalProps {
  orgSlug: string;
  orgName?: string;
  orgLogo?: string;
  orgAddress?: string;
  orgEmail?: string;
  student: ReportCardStudent;
  term?: string;
  academicYear?: string;
  classStudentCount?: number;
  results?: ReportCardResultItem[];
  ceoComment?: string;
  attendance?: {
    schoolOpen?: number | string;
    present?: number | string;
    absent?: number | string;
  };
  resumptionDate?: string;
  onClose: () => void;
}

// 9-point WAEC Nigerian Grading scale
export function computeNigerianGrade(score: number): {
  grade: string;
  letter: "A" | "B" | "C" | "D" | "E" | "P";
} {
  const rounded = Math.round(score);
  if (rounded >= 90) return { grade: "A1**", letter: "A" };
  if (rounded >= 85) return { grade: "A1*", letter: "A" };
  if (rounded >= 80) return { grade: "A1", letter: "A" };
  if (rounded >= 75) return { grade: "B2", letter: "B" };
  if (rounded >= 70) return { grade: "B3", letter: "B" };
  if (rounded >= 65) return { grade: "C4", letter: "C" };
  if (rounded >= 60) return { grade: "C5", letter: "C" };
  if (rounded >= 55) return { grade: "C6", letter: "C" };
  if (rounded >= 50) return { grade: "D7", letter: "D" };
  if (rounded >= 40) return { grade: "E8", letter: "E" };
  return { grade: "F9", letter: "P" }; // F9 / P9 category
}

const DEFAULT_SAMPLE_SUBJECTS: string[] = [
  "Agricultural Science",
  "Basic Science",
  "Basic Technology",
  "Business Studies",
  "Christian Religious Studies",
  "Civic/Security Education",
  "Computer Studies",
  "English Language",
  "Fine Art",
  "French Language",
  "Home Economics",
  "Mathematics",
  "Music",
  "Physical Health Education",
  "Social Studies",
  "Yoruba Language",
];

const DEFAULT_LEADERSHIP_SKILLS = [
  "Confidence",
  "Team Spirit",
  "Listening/Concentrating Ability",
  "Social Ability/Friendliness",
  "Creative /Organizational Ability",
  "Communication / Public Speaking Skills",
  "Inquisitiveness",
  "Sense of Responsibility",
  "Ethical/Moral Skills(Politeness, Honesty, perseverance etc)",
  "Sports/Games",
  "Handwriting",
  "Musical skills",
];

export default function ReportCardPrintModal({
  orgSlug,
  orgName = "School",
  orgLogo,
  orgAddress = "",
  orgEmail = "",
  student,
  term = "1st Mid-Term",
  academicYear = "2026/2027",
  classStudentCount = 17,
  results = [],
  ceoComment: initialCeoComment = "",
  attendance: initialAttendance = { schoolOpen: "", present: "", absent: "" },
  resumptionDate: initialResumptionDate = "",
  onClose,
}: ReportCardPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Editable fields in preview
  const [ceoComment, setCeoComment] = useState(initialCeoComment);
  const [schoolOpen, setSchoolOpen] = useState(initialAttendance.schoolOpen ?? "");
  const [schoolPresent, setSchoolPresent] = useState(initialAttendance.present ?? "");
  const [schoolAbsent, setSchoolAbsent] = useState(initialAttendance.absent ?? "");
  const [resumption, setResumption] = useState(initialResumptionDate ?? "");

  // Skills rating state (1 to 5)
  const [skillRatings, setSkillRatings] = useState<Record<string, string | number>>({});

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const studentFullName = [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ");
      const ok = await downloadReportCardPdf({
        orgSlug,
        studentId: student.id,
        studentName: studentFullName,
        term,
        academicYear,
      });
      if (!ok) {
        // Fallback to native print to PDF if backend PDF endpoint isn't available
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine subject rows: Show ONLY the subjects the student is offering (where spreadsheets exist for them)
  const displayResults = useMemo(() => {
    if (Array.isArray(results) && results.length > 0) {
      return results.map((match) => {
        const hasScore =
          match.score !== undefined && match.score !== null && !isNaN(Number(match.score));
        const numericScore = typeof match.score === "number" ? match.score : Number(match.score);
        const gradeObj = computeNigerianGrade(
          Number.isFinite(numericScore) ? numericScore : 0,
        );

        return {
          subject: match.subject,
          classExercises:
            match.classExercises !== undefined &&
            match.classExercises !== null &&
            match.classExercises !== ""
              ? match.classExercises
              : "—",
          assignments:
            match.assignments !== undefined &&
            match.assignments !== null &&
            match.assignments !== ""
              ? match.assignments
              : "—",
          periodicTests:
            match.periodicTests !== undefined &&
            match.periodicTests !== null &&
            match.periodicTests !== ""
              ? match.periodicTests
              : "—",
          examScore:
            match.examScore !== undefined &&
            match.examScore !== null &&
            match.examScore !== ""
              ? match.examScore
              : "—",
          score: hasScore && Number.isFinite(numericScore) ? numericScore : "—",
          grade:
            hasScore && Number.isFinite(numericScore)
              ? match.grade || gradeObj.grade
              : "—",
          remark:
            match.remark ||
            (hasScore && Number.isFinite(numericScore) ? gradeObj.grade : "—"),
          maxScore: match.maxScore || 100,
        };
      });
    }

    return [];
  }, [results]);

  // Dynamic Grade Breakdown counts for "SUMMARY OF ACADEMIC REPORT"
  const summaryCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, P: 0 };
    displayResults.forEach((item) => {
      const g = String(item.grade || "").toUpperCase();
      if (!g || g === "—") return;
      if (g.startsWith("A")) counts.A += 1;
      else if (g.startsWith("B")) counts.B += 1;
      else if (g.startsWith("C")) counts.C += 1;
      else if (g.startsWith("D")) counts.D += 1;
      else if (g.startsWith("E")) counts.E += 1;
      else if (g.startsWith("F") || g.startsWith("P")) counts.P += 1;
    });
    return counts;
  }, [displayResults]);

  // Format student full name
  const studentFullName = [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  const studentClass =
    student.classLevel?.name ||
    student.classLevel?.level ||
    "JSS 1A";

  const studentAdmissionNo = student.admissionNumber || "—";
  const studentSex = student.gender ? student.gender.toUpperCase() : "FEMALE";

  // Title formatting: "Report Sheet For 1st Mid-Term Result, 2025/2026 Session"
  const formattedTerm = useMemo(() => {
    if (term.toLowerCase().includes("result")) return term;
    if (term === "Term 1") return "1st Mid-Term Result";
    if (term === "Term 2") return "2nd Mid-Term Result";
    if (term === "Term 3") return "3rd Mid-Term Result";
    return `${term} Result`;
  }, [term]);

  return (
    <div className="report-card-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto font-sans">
      {/* High-fidelity CSS for Native Browser Print & Pixel-Perfect Screen Render */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 4mm 6mm !important;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .report-card-modal-backdrop,
          .report-card-modal-wrapper,
          .report-card-scroll-area,
          #report-sheet-print-container,
          #report-sheet-print-container * {
            visibility: visible !important;
          }

          .report-card-modal-backdrop {
            position: absolute !important;
            inset: 0 !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            z-index: 999999 !important;
          }

          .report-card-modal-wrapper {
            position: static !important;
            display: block !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .report-card-scroll-area {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            height: auto !important;
          }

          #report-sheet-print-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }

          .no-print {
            display: none !important;
          }

          input, textarea {
            border: none !important;
            outline: none !important;
            background: transparent !important;
            resize: none !important;
          }
        }

        /* Vertical Column Header Styling matching Excel template */
        .header-vertical-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          text-align: center;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: -0.2px;
        }

        .grades-vertical-text {
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 1px;
        }
      `}</style>

      <div className="report-card-modal-wrapper relative w-full max-w-4xl rounded-2xl bg-neutral-950 shadow-2xl overflow-hidden my-4 border border-neutral-800 flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Hidden during Print) */}
        <div className="no-print flex items-center justify-between border-b border-neutral-800 bg-black px-4 sm:px-6 py-3.5 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-700 text-white font-black text-xs shadow-xs">
              RC
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Official Report Sheet Preview
                <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-300 border border-neutral-700">
                  {term}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {studentFullName} &bull; {studentClass} &bull; {studentAdmissionNo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-white hover:bg-neutral-200 text-black font-bold gap-1.5 shadow-sm text-xs h-8 px-3.5 cursor-pointer border border-white"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Template
            </Button>
            <Button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              variant="outline"
              className="border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white font-semibold gap-1.5 text-xs h-8 px-3.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-neutral-400 hover:text-white hover:bg-neutral-900 h-8 w-8 cursor-pointer ml-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="report-card-scroll-area p-3 sm:p-6 overflow-y-auto bg-neutral-200/90 flex-1">
          <div
            id="report-sheet-print-container"
            ref={printRef}
            className="mx-auto bg-white p-4 sm:p-6 rounded-none shadow-xl border-2 border-black text-black max-w-[820px] font-sans text-xs leading-tight"
          >
            {/* ── ROW 1 & 2: School Logo & Branding ── */}
            <div className="text-center pt-1 pb-1">
              {orgLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={orgLogo}
                  alt={orgName}
                  className="h-16 w-auto max-w-[240px] object-contain mx-auto"
                />
              ) : (
                <div className="inline-flex flex-col items-center">
                  <span className="text-xl sm:text-2xl font-black tracking-widest text-black font-serif uppercase px-4 text-center">
                    {orgName || "School"}
                  </span>
                  <div className="w-48 h-0.5 bg-black mt-1" />
                  <div className="w-32 h-px bg-black mt-0.5" />
                </div>
              )}
            </div>

            {/* ── ROW 3: School Address and Email ── */}
            {(orgAddress || orgEmail) && (
              <div className="text-center text-[10.5px] font-bold text-black border-t border-black pt-1.5 pb-1 mt-1">
                {[orgAddress, orgEmail].filter(Boolean).join(" • ")}
              </div>
            )}

            {/* ── ROW 4: Title Banner (Solid Black fill with White text) ── */}
            <div className="text-center text-sm sm:text-base font-black text-white bg-black border border-black py-1.5 tracking-wider uppercase">
              Report Sheet For {formattedTerm}, {academicYear} Session
            </div>

            {/* ── ROW 5-7: Student Metadata Grid (Bordered table) ── */}
            <div className="border-x border-b border-black text-[11px] font-semibold divide-y divide-black">
              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-black">Name:</span>
                  <span className="font-extrabold uppercase text-black">
                    {studentFullName}
                  </span>
                </div>
                <div className="col-span-3 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-black">Class:</span>
                  <span className="font-extrabold text-black">{studentClass}</span>
                </div>
                <div className="col-span-3 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-black">Sex:</span>
                  <span className="font-extrabold text-black">{studentSex}</span>
                </div>
              </div>

              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-black">Admission No:</span>
                  <span className="font-extrabold text-black">
                    {studentAdmissionNo}
                  </span>
                </div>
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-black">No. in Class:</span>
                  <span className="font-extrabold text-black">{classStudentCount}</span>
                </div>
              </div>
            </div>

            {/* ── MAIN ACADEMIC ASSESSMENT TABLE ── */}
            <div className="mt-1 border border-black overflow-hidden">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                  {/* Rows 8-13 Header Lockup */}
                  <tr className="border-b border-black">
                    {/* Left Column (Cols A-C): Solid Black Bar + 2-col Nigerian Grade Scale Key */}
                    <th
                      rowSpan={2}
                      className="p-0 border-r border-black align-top w-[38%] bg-[#F1F3F5]"
                    >
                      <div className="flex h-full min-h-[145px]">
                        {/* Solid Black Vertical Bar on Left */}
                        <div className="w-12 bg-black text-white font-extrabold flex flex-col items-center justify-end p-1.5 border-r border-black">
                          <span className="grades-vertical-text tracking-widest text-[11px] pb-1">
                            GRADES
                          </span>
                        </div>

                        {/* Two-column Grade Scale reference box */}
                        <div className="flex-1 p-2 bg-[#F8F9FA] text-[9.5px] font-bold text-black flex flex-col justify-center">
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <div>A1** : 90 - 100</div>
                            <div>C5 : 60 - 64</div>

                            <div>A1* : 85 - 89</div>
                            <div>C6 : 55 - 59</div>

                            <div>A1 : 80 - 84</div>
                            <div>D7 : 50 - 54</div>

                            <div>B2 : 75 - 79</div>
                            <div>E8 : 40 - 49</div>

                            <div>B3 : 70 - 74</div>
                            <div>F9 : 0 - 39</div>

                            <div>C4 : 65 - 69</div>
                            <div></div>
                          </div>
                        </div>
                      </div>
                    </th>

                    {/* Grouped Header: Continuous Assessment (spanning 3 CA columns) */}
                    <th
                      colSpan={3}
                      className="text-center font-black text-black bg-[#F1F3F5] border-r border-b border-black py-1 text-[10.5px]"
                    >
                      Continuous
                      <br />
                      Assessment
                    </th>

                    {/* Remaining Vertical Column Headers */}
                    <th
                      rowSpan={2}
                      className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 h-28 flex items-center justify-center font-bold text-black">
                        Mid-Term Exam Scores
                      </div>
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 h-28 flex items-center justify-center font-bold text-black">
                        Total Scores
                      </div>
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-black bg-[#F1F3F5] p-1 w-[8%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 h-28 flex items-center justify-center font-bold text-black">
                        Grades
                      </div>
                    </th>

                    <th
                      rowSpan={2}
                      className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 h-28 flex items-center justify-center font-bold text-black">
                        Highest Score
                      </div>
                    </th>

                    <th
                      rowSpan={2}
                      className="bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 h-28 flex items-center justify-center font-bold text-black">
                        Lowest Score
                      </div>
                    </th>
                  </tr>

                  {/* CA Subheaders (vertical text) */}
                  <tr className="border-b border-black">
                    <th className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center">
                      <div className="header-vertical-text mx-auto pb-1 h-20 flex items-center justify-center font-bold text-black">
                        Class Exercises
                      </div>
                    </th>
                    <th className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center">
                      <div className="header-vertical-text mx-auto pb-1 h-20 flex items-center justify-center font-bold text-black">
                        Assignments
                      </div>
                    </th>
                    <th className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center">
                      <div className="header-vertical-text mx-auto pb-1 h-20 flex items-center justify-center font-bold text-black">
                        Periodic Tests
                      </div>
                    </th>
                  </tr>

                  {/* ── ROW 14: Mark Obtainable Row (Solid Black) ── */}
                  <tr className="bg-black font-black text-white border-b border-black text-center text-[10.5px]">
                    <td className="text-left px-3 py-1 font-extrabold border-r border-neutral-700">
                      Mark obtainable
                    </td>
                    <td className="border-r border-neutral-700 py-1">10</td>
                    <td className="border-r border-neutral-700 py-1">10</td>
                    <td className="border-r border-neutral-700 py-1">20</td>
                    <td className="border-r border-neutral-700 py-1">60</td>
                    <td className="border-r border-neutral-700 py-1 font-black">100</td>
                    <td className="border-r border-neutral-700 py-1"></td>
                    <td className="border-r border-neutral-700 py-1">100</td>
                    <td className="py-1">100</td>
                  </tr>
                </thead>

                {/* ── ROWS 15+: Subject Rows (Strictly Offered Subjects) ── */}
                <tbody className="divide-y divide-black font-medium">
                  {displayResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-xs text-slate-500 italic">
                        No recorded subject spreadsheets found for this student.
                      </td>
                    </tr>
                  ) : (
                    displayResults.map((item, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"}
                      >
                        {/* Subject Name */}
                        <td className="px-2.5 py-1 font-bold text-black border-r border-black">
                          {item.subject}
                        </td>

                        {/* Class Exercises (10) */}
                        <td className="text-center border-r border-black py-1 text-black tabular-nums">
                          {item.classExercises}
                        </td>

                        {/* Assignments (10) */}
                        <td className="text-center border-r border-black py-1 text-black tabular-nums">
                          {item.assignments}
                        </td>

                        {/* Periodic Tests (20) */}
                        <td className="text-center border-r border-black py-1 text-black tabular-nums">
                          {item.periodicTests}
                        </td>

                        {/* Mid-Term Exam (60) */}
                        <td className="text-center border-r border-black py-1 text-black tabular-nums">
                          {item.examScore}
                        </td>

                        {/* Total Scores (100) */}
                        <td className="text-center border-r border-black py-1 font-black text-black tabular-nums">
                          {item.score}
                        </td>

                        {/* Grades (Subtle light gray fill: #E9ECEF) */}
                        <td className="text-center border-r border-black py-1 font-black text-black bg-[#E9ECEF] tabular-nums">
                          {item.grade}
                        </td>

                        {/* Highest Score */}
                        <td className="text-center border-r border-black py-1 text-black tabular-nums">
                          {(item as any).highestScore ?? "—"}
                        </td>

                        {/* Lowest Score */}
                        <td className="text-center py-1 text-black tabular-nums">
                          {(item as any).lowestScore ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── LOWER SECTION: Leadership Skills (Left) & Academic Summary (Right) ── */}
            <div className="grid grid-cols-12 border-x border-b border-black text-[10.5px]">
              {/* ── LEFT COLUMN (Cols 1-7): Leadership / Psychomotor Skills ── */}
              <div className="col-span-7 border-r border-black flex flex-col">
                {/* Header */}
                <div className="grid grid-cols-12 bg-[#F1F3F5] font-black text-black border-b border-black py-1">
                  <div className="col-span-9 px-2">
                    Leadership Skills / Affective / Psychomotor Skills
                  </div>
                  <div className="col-span-3 text-center border-l border-black font-black">
                    GRADES
                  </div>
                </div>

                {/* 12 Skills Rows */}
                <div className="divide-y divide-black font-medium">
                  {DEFAULT_LEADERSHIP_SKILLS.map((skillName, sIdx) => (
                    <div
                      key={sIdx}
                      className="grid grid-cols-12 py-0.5 hover:bg-neutral-50"
                    >
                      <div className="col-span-9 px-2 text-black font-semibold truncate">
                        {skillName}
                      </div>
                      <div className="col-span-3 text-center border-l border-black font-bold text-black">
                        <input
                          type="text"
                          maxLength={3}
                          value={skillRatings[skillName] ?? ""}
                          onChange={(e) =>
                            setSkillRatings({
                              ...skillRatings,
                              [skillName]: e.target.value,
                            })
                          }
                          placeholder=""
                          className="w-full text-center bg-transparent border-0 p-0 text-[10.5px] font-bold text-black focus:outline-none focus:bg-neutral-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RIGHT COLUMN (Cols 8-12): Academic Summary, Grade Keys, Attendance, Resumption ── */}
              <div className="col-span-5 flex flex-col justify-between">
                <div>
                  {/* Summary Header (Solid Black) */}
                  <div className="bg-black font-black text-white text-center py-1 border-b border-black text-[11px] uppercase tracking-wider">
                    SUMMARY OF ACADEMIC REPORT
                  </div>

                  {/* Summary of As, Bs, Cs, Ds, Es, Ps Grid */}
                  <div className="divide-y divide-black font-bold text-black border-b border-black">
                    <div className="grid grid-cols-2 divide-x divide-black py-1 px-2">
                      <div className="flex justify-between pr-2">
                        <span>NOS OF As:</span>
                        <span className="font-black tabular-nums">{summaryCounts.A}</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>NOS OF Bs:</span>
                        <span className="font-black tabular-nums">{summaryCounts.B}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-black py-1 px-2">
                      <div className="flex justify-between pr-2">
                        <span>NOS OF Cs:</span>
                        <span className="font-black tabular-nums">{summaryCounts.C}</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>NOS OF Ds:</span>
                        <span className="font-black tabular-nums">{summaryCounts.D}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-black py-1 px-2">
                      <div className="flex justify-between pr-2">
                        <span>NOS OF Es:</span>
                        <span className="font-black tabular-nums">{summaryCounts.E}</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span>NOS OF Ps:</span>
                        <span className="font-black tabular-nums">{summaryCounts.P}</span>
                      </div>
                    </div>
                  </div>

                  {/* Grade Keys Header (Solid Black) */}
                  <div className="bg-black font-black text-white px-2 py-0.5 border-b border-black text-[11px] uppercase tracking-wider">
                    Grade Keys
                  </div>

                  {/* Skills Rating Scale (5-1) and Attendance Table */}
                  <div className="grid grid-cols-12 divide-x divide-black border-b border-black text-[10px]">
                    {/* Left side: 5 - Excellent scale */}
                    <div className="col-span-5 p-1.5 font-bold space-y-0.5 text-black">
                      <div>5 - Excellent</div>
                      <div>4 - Very Good</div>
                      <div>3 - Average</div>
                      <div>2 - Fair</div>
                      <div>1 - poor</div>
                    </div>

                    {/* Right side: Attendance Table */}
                    <div className="col-span-7 flex flex-col">
                      <div className="grid grid-cols-3 divide-x divide-neutral-700 bg-black text-white font-black text-center text-[8.5px] leading-tight border-b border-black">
                        <div className="p-1">No of Times School Open</div>
                        <div className="p-1">No of Times Present</div>
                        <div className="p-1">No of Times Absent</div>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-black text-center font-bold text-black flex-1 min-h-[50px] items-center">
                        <div className="p-1">
                          <input
                            type="text"
                            value={schoolOpen}
                            onChange={(e) => setSchoolOpen(e.target.value)}
                            placeholder=""
                            className="w-full text-center bg-transparent border-0 p-0 text-[11px] font-black text-black focus:outline-none"
                          />
                        </div>
                        <div className="p-1">
                          <input
                            type="text"
                            value={schoolPresent}
                            onChange={(e) => setSchoolPresent(e.target.value)}
                            placeholder=""
                            className="w-full text-center bg-transparent border-0 p-0 text-[11px] font-black text-black focus:outline-none"
                          />
                        </div>
                        <div className="p-1">
                          <input
                            type="text"
                            value={schoolAbsent}
                            onChange={(e) => setSchoolAbsent(e.target.value)}
                            placeholder=""
                            className="w-full text-center bg-transparent border-0 p-0 text-[11px] font-black text-black focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumption Bar */}
                <div>
                  <div className="bg-black font-black text-white text-center py-1 border-t border-black text-[11px] uppercase tracking-wider">
                    Resumption
                  </div>
                  <div className="p-1 text-center font-bold text-black min-h-[22px] bg-white">
                    <input
                      type="text"
                      value={resumption}
                      onChange={(e) => setResumption(e.target.value)}
                      placeholder="Next term resumption date..."
                      className="w-full text-center bg-transparent border-0 p-0 text-[10.5px] font-bold text-black focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── FOOTER: C.E.O's Comment & C.E.O's Signature ── */}
            <div className="border-x border-b border-black p-2 text-[11px] font-bold text-black">
              <div className="grid grid-cols-12 gap-3 items-end">
                {/* Left: C.E.O's Comment */}
                <div className="col-span-8 flex flex-col justify-between min-h-[75px]">
                  <div>
                    <span className="font-extrabold text-black">
                      C.E.O's Comment:
                    </span>
                    <textarea
                      rows={2}
                      value={ceoComment}
                      onChange={(e) => setCeoComment(e.target.value)}
                      placeholder="Commendable performance, keep soaring higher."
                      className="w-full mt-1 bg-transparent border-0 border-b border-dotted border-black p-1 text-[11px] font-semibold text-black focus:outline-none focus:border-black resize-none"
                    />
                  </div>
                </div>

                {/* Right: C.E.O's Signature */}
                <div className="col-span-4 text-center flex flex-col items-center justify-end pb-1">
                  <div className="h-10 flex items-center justify-center">
                    {/* Elegant Cursive CEO Signature Scribble */}
                    <svg
                      viewBox="0 0 160 45"
                      className="h-9 w-36 stroke-black fill-none"
                    >
                      <path
                        d="M 12 32 C 16 14, 22 10, 26 28 C 30 14, 36 20, 42 27 C 48 34, 54 12, 60 24 C 66 34, 76 18, 86 24 C 96 30, 110 22, 120 28 C 130 33, 140 26, 150 29"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 28 35 L 145 32"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="text-[11px] font-extrabold text-black tracking-wide border-t border-black pt-0.5 w-3/4 mx-auto">
                    C.E.O's Signature
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

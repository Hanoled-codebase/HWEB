"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Printer, Download, Eye, Loader2, X, ZoomIn, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  LEADERSHIP_SKILLS,
  scoreToAffectiveLetter,
} from "@/lib/leadership-skills";
import { downloadReportCardPdf, openReportCardPdf } from "@/lib/report-card-download";

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

export interface ReportCardAssessmentScore {
  name: string;
  score: number | string | null;
  maxMarks?: number | null;
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
  assessments?: ReportCardAssessmentScore[];
  highestScore?: number | string | null;
  lowestScore?: number | string | null;
}

export interface ReportCardPrintModalProps {
  orgSlug: string;
  orgName?: string;
  orgLogo?: string;
  orgAddress?: string;
  orgEmail?: string;
  orgPrimaryColor?: string | null;
  orgSecondaryColor?: string | null;
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
  /** Active report stage ("MID_TERM" or "END_OF_TERM"). */
  resultType?: "MID_TERM" | "END_OF_TERM";
  /** Syncs stage switches in the modal with the parent page so on-screen rows update live. */
  onResultTypeChange?: (nextType: "MID_TERM" | "END_OF_TERM") => void;
  /** True while the parent page is fetching rows for a newly selected stage. */
  isLoadingResults?: boolean;
  onClose: () => void;
}

type GradeBand = { grade: string; min: number; max: number };
type AffectiveCategory = { id: string; label: string; active: boolean };
type CommentRule = { min: number; max: number; comment: string };
type ResultSettings = {
  ceoSignatureUrl?: string | null;
  ceoCommentRules?: CommentRule[];
  affectiveCategories?: AffectiveCategory[];
};
type TemplateMetric = {
  id?: string;
  name: string;
  label?: string | null;
  weight: number;
  stage?: "MID_TERM" | "END_OF_TERM";
};
type TemplateAssessmentCategory = {
  id: string;
  name: string;
  label?: string | null;
  maxMarks: number;
  position?: number;
};
type ResultTemplate = {
  id: string;
  classLevelId?: string | null;
  isApproved?: boolean;
  isDefault?: boolean;
  resultType?: "BOTH" | "MID_TERM" | "END_OF_TERM";
  termType?: "MID_TERM" | "END_TERM" | "CUSTOM";
  gradeScale?: GradeBand[];
  metrics?: TemplateMetric[];
  assessmentCategories?: TemplateAssessmentCategory[];
};
type ScoreColumnDef = {
  key: string;
  label: string;
  maxMarks: number;
  isExam: boolean;
};

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

const DEFAULT_AFFECTIVE_CATEGORIES: AffectiveCategory[] =
  LEADERSHIP_SKILLS.map((label) => ({ id: label, label, active: true }));

export default function ReportCardPrintModal({
  orgSlug,
  orgName = "School",
  orgLogo,
  orgAddress = "",
  orgEmail = "",
  student,
  term = "",
  academicYear = "2026/2027",
  classStudentCount,
  results = [],
  ceoComment: initialCeoComment = "",
  attendance: initialAttendance = { schoolOpen: "", present: "", absent: "" },
  resumptionDate: initialResumptionDate = "",
  resultType = "END_OF_TERM",
  onResultTypeChange,
  isLoadingResults = false,
  onClose,
}: ReportCardPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const previewTrigger = useRef<HTMLElement | null>(null);
  const [pdfAction, setPdfAction] = useState<"view" | "download" | null>(null);
  const [localResultType, setLocalResultType] = useState<"MID_TERM" | "END_OF_TERM">(resultType);
  const pdfResultType = onResultTypeChange ? resultType : localResultType;
  const stageLabel = pdfResultType === "MID_TERM" ? "Mid-Term" : "End-of-Term";

  const handleStageChange = (nextType: "MID_TERM" | "END_OF_TERM") => {
    if (nextType === pdfResultType) return;
    if (onResultTypeChange) {
      onResultTypeChange(nextType);
    } else {
      setLocalResultType(nextType);
    }
  };
  const [gradeScale, setGradeScale] = useState<GradeBand[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ResultTemplate | null>(null);
  const [affectiveCategories, setAffectiveCategories] =
    useState<AffectiveCategory[]>(DEFAULT_AFFECTIVE_CATEGORIES);
  const [ceoSignatureUrl, setCeoSignatureUrl] = useState<string | null>(null);
  const [commentRules, setCommentRules] = useState<CommentRule[]>([]);
  const [logoFailed, setLogoFailed] = useState(false);

  const [customCeoComment, setCustomCeoComment] = useState<string | null>(null);
  const schoolOpen = initialAttendance.schoolOpen ?? "";
  const schoolPresent = initialAttendance.present ?? "";
  const schoolAbsent = initialAttendance.absent ?? "";
  const resumption = initialResumptionDate ?? "";

  // Skills rating state (1 to 5)
  const [skillRatings, setSkillRatings] = useState<Record<string, string | number>>({});

  // Mobile viewport scaling state
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scaleFit, setScaleFit] = useState(true);
  const [measuredScale, setMeasuredScale] = useState(1);
  const [sheetWidth, setSheetWidth] = useState(760);
  const [sheetHeight, setSheetHeight] = useState(1000);
  const scale = scaleFit ? measuredScale : 1;

  useEffect(() => {
    if (!scaleFit) return;
    const updateScale = () => {
      const scrollEl = scrollAreaRef.current;
      const sheetEl = printRef.current;
      if (scrollEl && sheetEl) {
        const areaWidth = scrollEl.clientWidth - 16;
        const sWidth = sheetEl.offsetWidth || 760;
        const sHeight = sheetEl.offsetHeight || 1000;
        setSheetWidth(sWidth);
        setSheetHeight(sHeight);
        if (areaWidth > 0 && sWidth > 0 && areaWidth < sWidth) {
          const nextScale = Number((areaWidth / sWidth).toFixed(3));
          setMeasuredScale(Math.max(0.3, Math.min(1, nextScale)));
        } else {
          setMeasuredScale(1);
        }
      }
    };
    const t = setTimeout(updateScale, 50);
    const ro = new ResizeObserver(updateScale);
    if (scrollAreaRef.current) ro.observe(scrollAreaRef.current);
    if (printRef.current) ro.observe(printRef.current);
    window.addEventListener("resize", updateScale);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [scaleFit]);

  useEffect(() => {
    if (!orgSlug) return;
    let cancelled = false;
    const classLevelId = student.classLevel?.id;
    Promise.all([
      apiFetch<{ data: ResultSettings }>(`/result-settings/${orgSlug}`, {
        showErrorToast: false,
      }),
      apiFetch<{ data?: ResultTemplate[] } | ResultTemplate[]>(
        `/result-templates/templates/${orgSlug}`,
        {
          params: {
            ...(classLevelId ? { classLevelId } : {}),
            resultType: pdfResultType,
          },
          showErrorToast: false,
        },
      ),
    ])
      .then(([settingsResponse, templateResponse]) => {
        if (cancelled) return;
        const settings = settingsResponse.data;
        setCeoSignatureUrl(settings.ceoSignatureUrl || null);
        setCommentRules(settings.ceoCommentRules || []);
        if (Array.isArray(settings.affectiveCategories)) {
          setAffectiveCategories(
            settings.affectiveCategories.filter((category) => category.active),
          );
        }
        const templates = Array.isArray(templateResponse)
          ? templateResponse
          : templateResponse.data || [];
        const stageMatches = (template: ResultTemplate) => {
          const rt = template.resultType;
          const tt = template.termType;
          if (pdfResultType === "MID_TERM") {
            return rt === "MID_TERM" || tt === "MID_TERM" || rt === "BOTH";
          }
          return rt === "END_OF_TERM" || tt === "END_TERM" || rt === "BOTH" || (!rt && !tt);
        };
        const exactStage = (template: ResultTemplate) =>
          pdfResultType === "MID_TERM"
            ? template.resultType === "MID_TERM" || template.termType === "MID_TERM"
            : template.resultType === "END_OF_TERM" || template.termType === "END_TERM";
        const eligible = templates.filter((t) => t.isApproved && stageMatches(t));
        const selected =
          eligible.find((t) => t.classLevelId === classLevelId && exactStage(t)) ||
          eligible.find((t) => t.classLevelId === classLevelId) ||
          eligible.find((t) => t.isDefault && exactStage(t)) ||
          eligible.find((t) => t.isDefault) ||
          eligible[0] ||
          templates.find((t) => t.isApproved) ||
          null;
        setActiveTemplate(selected);
        setGradeScale(selected?.gradeScale || []);
      })
      .catch(() => {
        // The generated PDF remains available if preview settings cannot load.
      });
    return () => {
      cancelled = true;
    };
  }, [orgSlug, pdfResultType, student.classLevel?.id]);

  useEffect(() => {
    if (!orgSlug || !student.id || !term || !academicYear) return;
    let cancelled = false;
    apiFetch<{ data: { comment?: string } | null }>(
      `/result-settings/${orgSlug}/comment-override`,
      {
        params: {
          studentId: student.id,
          term,
          academicYear,
          resultType: pdfResultType,
        },
        showErrorToast: false,
      },
    )
      .then(({ data }) => {
        if (!cancelled) setCustomCeoComment(data?.comment || null);
      })
      .catch(() => {
        if (!cancelled) setCustomCeoComment(null);
      });
    return () => {
      cancelled = true;
    };
  }, [academicYear, orgSlug, pdfResultType, student.id, term]);

  // Prefill the leadership/affective GRADES cells from the stored scores for
  // this student, term, and active stage (letters A–E).
  useEffect(() => {
    if (!orgSlug || !student?.id || !term) return;
    let cancelled = false;
    apiFetch<{ studentId: string; metric: string; score: number }[]>(
      `/affective/${orgSlug}/affective`,
      {
        params: {
          studentId: student.id,
          term,
          academicYear,
          resultType: pdfResultType,
        },
        showErrorToast: false,
      },
    )
      .then((scores) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        if (Array.isArray(scores)) {
          for (const entry of scores) {
            const letter = scoreToAffectiveLetter(entry.score);
            if (letter) map[entry.metric] = letter;
          }
        }
        setSkillRatings(map);
      })
      .catch(() => {
        if (!cancelled) setSkillRatings({});
      });
    return () => {
      cancelled = true;
    };
  }, [academicYear, orgSlug, pdfResultType, student?.id, term]);

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = async (action: "view" | "download") => {
    setPdfAction(action);
    const options = {
      orgSlug,
      studentId: student.id,
      studentName: studentFullName,
      term,
      academicYear,
      resultType: pdfResultType,
    };
    try {
      if (action === "view") {
        await openReportCardPdf(options);
      } else if (!(await downloadReportCardPdf(options))) {
        window.print();
      }
    } finally {
      setPdfAction(null);
    }
  };

  // Determine subject rows: Show ONLY the subjects the student is offering (where spreadsheets exist for them)
  const scoreColumns = useMemo<ScoreColumnDef[]>(() => {
    const isExamName = (name: string) => /\bexam\b|examination/i.test(name);
    const categories = activeTemplate?.assessmentCategories;
    if (Array.isArray(categories) && categories.length > 0) {
      return [...categories]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((cat) => {
          const label = (cat.label || cat.name || "Assessment").trim();
          return {
            key: (cat.name || label).toLowerCase().trim(),
            label,
            maxMarks: Number(cat.maxMarks) || 0,
            isExam: isExamName(label) || isExamName(cat.name || ""),
          };
        });
    }

    const metrics = activeTemplate?.metrics;
    if (Array.isArray(metrics) && metrics.length > 0) {
      const stageFiltered = metrics.filter((m) => !m.stage || m.stage === pdfResultType);
      const source = stageFiltered.length > 0 ? stageFiltered : metrics;
      return source.map((m) => {
        const label = (m.label || m.name || "Assessment").trim();
        return {
          key: (m.name || label).toLowerCase().trim(),
          label,
          maxMarks: Number(m.weight) || 0,
          isExam: isExamName(label) || isExamName(m.name || ""),
        };
      });
    }

    const sampleAssessments = results.find((r) => Array.isArray(r.assessments) && r.assessments.length > 0)?.assessments;
    if (sampleAssessments && sampleAssessments.length > 0) {
      return sampleAssessments.map((a) => {
        const label = (a.name || "Assessment").trim();
        return {
          key: label.toLowerCase(),
          label,
          maxMarks: Number(a.maxMarks) || 0,
          isExam: isExamName(label),
        };
      });
    }

    return [
      { key: "class exercises", label: "Class Exercises", maxMarks: 10, isExam: false },
      { key: "assignments", label: "Assignments", maxMarks: 10, isExam: false },
      { key: "periodic tests", label: "Periodic Tests", maxMarks: 20, isExam: false },
      {
        key: "exam",
        label: pdfResultType === "MID_TERM" ? "Mid-Term Exam" : "Exam Scores",
        maxMarks: 60,
        isExam: true,
      },
    ];
  }, [activeTemplate, pdfResultType, results]);

  const caColumns = useMemo(() => scoreColumns.filter((c) => !c.isExam), [scoreColumns]);
  const examColumns = useMemo(() => scoreColumns.filter((c) => c.isExam), [scoreColumns]);
  const orderedColumns = useMemo(() => [...caColumns, ...examColumns], [caColumns, examColumns]);
  const totalObtainable = useMemo(() => {
    const sum = orderedColumns.reduce((acc, c) => acc + (Number.isFinite(c.maxMarks) ? c.maxMarks : 0), 0);
    return sum > 0 ? sum : 100;
  }, [orderedColumns]);

  const displayResults = useMemo(() => {
    if (Array.isArray(results) && results.length > 0) {
      return results.map((match) => {
        const hasScore =
          match.score !== undefined && match.score !== null && !isNaN(Number(match.score));
        const numericScore = typeof match.score === "number" ? match.score : Number(match.score);
        const gradeObj = gradeScale.length > 0
          ? {
              grade:
                [...gradeScale]
                  .sort((left, right) => right.min - left.min)
                  .find((band) => numericScore >= band.min)?.grade || "—",
            }
          : { grade: "—" };

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
          assessments: match.assessments || [],
          score: hasScore && Number.isFinite(numericScore) ? numericScore : "—",
          grade:
            hasScore && Number.isFinite(numericScore)
              ? match.grade || gradeObj.grade
              : "—",
          remark:
            match.remark ||
            (hasScore && Number.isFinite(numericScore) ? gradeObj.grade : "—"),
          maxScore: match.maxScore || totalObtainable,
          highestScore: match.highestScore ?? "—",
          lowestScore: match.lowestScore ?? "—",
        };
      });
    }

    return [];
  }, [gradeScale, results, totalObtainable]);

  const resolveColumnCell = (
    item: (typeof displayResults)[number],
    col: ScoreColumnDef,
    colIndex: number,
  ): string | number => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const targetKey = normalize(col.key);
    const targetLabel = normalize(col.label);
    const assessments = item.assessments || [];

    const matched = assessments.find((a) => {
      const n = normalize(a.name || "");
      return n === targetKey || n === targetLabel || n.includes(targetLabel) || targetLabel.includes(n);
    });
    if (matched && matched.score !== undefined && matched.score !== null && matched.score !== "") {
      return matched.score;
    }

    if (col.isExam) {
      return item.examScore;
    }
    if (/exercise|ca 1|first ca|cw/i.test(targetLabel)) return item.classExercises;
    if (/assign|homework|ca 2|hw/i.test(targetLabel)) return item.assignments;
    if (/test|periodic|ca 3/i.test(targetLabel)) return item.periodicTests;

    const positional = assessments[colIndex];
    if (positional && positional.score !== undefined && positional.score !== null && positional.score !== "") {
      return positional.score;
    }
    const legacy = [item.classExercises, item.assignments, item.periodicTests, item.examScore];
    return legacy[colIndex] ?? "—";
  };

  const ceoComment = useMemo(() => {
    if (customCeoComment) return customCeoComment;
    if (initialCeoComment.trim()) return initialCeoComment;
    const recorded = displayResults
      .map((item) => Number(item.score))
      .filter(Number.isFinite);
    if (recorded.length === 0) return "";
    const average = recorded.reduce((sum, score) => sum + score, 0) / recorded.length;
    const rule = commentRules.find(
      (candidate) => average >= candidate.min && average <= candidate.max,
    );
    return rule?.comment || "";
  }, [commentRules, customCeoComment, displayResults, initialCeoComment]);

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
    "—";

  const studentAdmissionNo = student.admissionNumber || "—";
  const studentSex = student.gender?.toUpperCase() || "—";

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="report-card-modal-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-[#0B1220]/55 p-0 backdrop-blur-[2px] font-sans md:items-center md:p-4">
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
            color: var(--color-neutral-950) !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body > :not(.report-card-modal-backdrop):not(:has(.report-card-modal-backdrop)) {
            display: none !important;
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
            position: static !important;
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
            max-height: none !important;
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
            min-width: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
          }

          .report-card-score-table {
            overflow: visible !important;
          }

          #report-sheet-print-container tr {
            break-inside: avoid;
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
          font-size: 12px;
          letter-spacing: -0.2px;
        }

        .grades-vertical-text {
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 1px;
        }
      `}</style>

      <Dialog.Content
        aria-describedby={undefined}
        onOpenAutoFocus={() => {
          previewTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          previewTrigger.current?.focus();
        }}
        className="report-card-modal-wrapper relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-xl overscroll-contain pb-safe md:my-4 md:max-h-[92dvh] md:rounded-2xl md:pb-0"
      >
        <div
          aria-hidden="true"
          className="no-print mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 md:hidden"
        />
        {/* Top Control Bar (Hidden during Print) */}
        <div className="no-print flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 text-[#0B1220] sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="flex flex-wrap items-center gap-2 text-sm font-bold tracking-tight text-[#0B1220] sm:text-base">
                <span>Official Report Sheet Preview</span>
                <span className="rounded-md border border-[var(--primary-border)] bg-[var(--primary-light)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-text)]">
                  {stageLabel} · {term}
                </span>
              </Dialog.Title>
              <p className="mt-0.5 truncate text-xs text-slate-600">
                {studentFullName} &bull; {studentClass} &bull; {studentAdmissionNo}
              </p>
            </div>

            <Button
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Report type"
              className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:inline-grid sm:w-auto"
            >
              <button
                type="button"
                aria-pressed={pdfResultType === "END_OF_TERM"}
                onClick={() => handleStageChange("END_OF_TERM")}
                className="min-h-11 rounded-lg px-3 text-xs font-semibold text-slate-700 transition-colors hover:text-[#0B1220] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-pressed:bg-[var(--primary)] aria-pressed:text-[var(--primary-foreground)] aria-pressed:shadow-xs motion-reduce:transition-none md:pointer-fine:min-h-8 pointer-coarse:min-h-11"
              >
                End-of-term
              </button>
              <button
                type="button"
                aria-pressed={pdfResultType === "MID_TERM"}
                onClick={() => handleStageChange("MID_TERM")}
                className="min-h-11 rounded-lg px-3 text-xs font-semibold text-slate-700 transition-colors hover:text-[#0B1220] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-pressed:bg-[var(--primary)] aria-pressed:text-[var(--primary-foreground)] aria-pressed:shadow-xs motion-reduce:transition-none md:pointer-fine:min-h-8 pointer-coarse:min-h-11"
              >
                Mid-term
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                type="button"
                onClick={handlePrint}
                disabled={isLoadingResults}
                variant="outline"
                size="sm"
                className="hidden gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 motion-reduce:transition-none motion-reduce:active:scale-100 sm:inline-flex"
              >
                <Printer className="size-4" aria-hidden="true" />
                Print Template
              </Button>

              <Button
                type="button"
                onClick={() => void handlePdf("view")}
                disabled={pdfAction !== null || isLoadingResults}
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <Eye className="size-4" aria-hidden="true" />
                {pdfAction === "view" ? "Opening..." : "View PDF"}
              </Button>

              <Button
                type="button"
                onClick={() => void handlePdf("download")}
                disabled={pdfAction !== null || isLoadingResults}
                size="sm"
                className="gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <Download className="size-4" aria-hidden="true" />
                {pdfAction === "download" ? "Downloading..." : "Download PDF"}
              </Button>
            </div>

            <div
              role="group"
              aria-label="Preview zoom"
              className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 sm:hidden"
            >
              <button
                type="button"
                aria-pressed={scaleFit}
                onClick={() => setScaleFit(true)}
                className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 transition-colors hover:text-[#0B1220] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-pressed:bg-white aria-pressed:font-bold aria-pressed:text-[var(--primary-text)] aria-pressed:shadow-xs motion-reduce:transition-none"
              >
                <Smartphone className="size-3.5" aria-hidden="true" />
                Fit
              </button>
              <button
                type="button"
                aria-pressed={!scaleFit}
                onClick={() => setScaleFit(false)}
                className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 transition-colors hover:text-[#0B1220] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-pressed:bg-white aria-pressed:font-bold aria-pressed:text-[var(--primary-text)] aria-pressed:shadow-xs motion-reduce:transition-none"
              >
                <ZoomIn className="size-3.5" aria-hidden="true" />
                100%
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Canvas with Responsive Mobile Fit */}
        <div
          ref={scrollAreaRef}
          role="region"
          aria-label="Scrollable report sheet"
          aria-busy={isLoadingResults}
          tabIndex={0}
          className="report-card-scroll-area p-2 sm:p-6 overflow-auto bg-slate-100/95 flex-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <div
            style={
              scale < 1
                ? {
                    width: `${Math.round(sheetWidth * scale)}px`,
                    height: `${Math.round(sheetHeight * scale)}px`,
                    overflow: "hidden",
                    margin: "0 auto",
                  }
                : {
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }
            }
          >
            <div
              style={
                scale < 1
                  ? {
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      width: `${sheetWidth}px`,
                      minWidth: `${sheetWidth}px`,
                    }
                  : undefined
              }
            >
          <div
            id="report-sheet-print-container"
            ref={printRef}
            className="mx-auto min-w-[760px] max-w-[820px] bg-white p-4 sm:p-6 rounded-none shadow-xl border-2 border-black text-black font-sans text-xs leading-tight"
          >
            {/* ── ROW 1 & 2: School Logo & Branding ── */}
            <div className="text-center pt-1 pb-1">
              {orgLogo && !logoFailed && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={orgLogo}
                  alt={`${orgName} crest`}
                  crossOrigin="anonymous"
                  onError={() => setLogoFailed(true)}
                  className="h-14 sm:h-16 w-auto max-w-[160px] object-contain mx-auto mb-1"
                />
              )}
              <div className="inline-flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-black tracking-widest text-black font-serif uppercase px-4 text-center">
                  {orgName || "School"}
                </span>
                <div className="w-48 h-0.5 bg-black mt-1" />
                <div className="w-32 h-px bg-black mt-0.5" />
              </div>
            </div>

            {/* ── ROW 3: School Address and Email ── */}
            {(orgAddress || orgEmail) && (
              <div className="text-center text-xs font-bold text-black border-t border-black pt-1.5 pb-1 mt-1">
                {[orgAddress, orgEmail].filter(Boolean).join(" • ")}
              </div>
            )}

            {/* ── ROW 4: Title Banner (Solid Black fill with White text) ── */}
            <div className="text-center text-sm sm:text-base font-black text-white bg-black border border-black px-3 py-2 tracking-wider uppercase">
              {stageLabel} Report Sheet{term ? ` for ${term},` : " •"} {academicYear} Session
            </div>

            {/* ── ROW 5-7: Student Metadata Grid (Bordered table) ── */}
            <div className="border-x border-b border-black text-xs font-semibold divide-y divide-black">
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
                  <span className="font-extrabold text-black">{classStudentCount ?? "—"}</span>
                </div>
              </div>
            </div>

            {/* ── MAIN ACADEMIC ASSESSMENT TABLE ── */}
            <div className="report-card-score-table mt-2 border border-black">
              <table className="w-full border-collapse text-left text-xs">
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
                        <div className="flex w-12 shrink-0 flex-col items-center justify-end overflow-hidden border-r border-black bg-black p-1.5 font-extrabold text-white">
                          <span className="grades-vertical-text pb-1 text-xs leading-none tracking-widest">
                            GRADES
                          </span>
                        </div>

                        {/* Tenant-approved Grade Scale reference box */}
                        <div className="flex flex-1 flex-col justify-center bg-[#F8F9FA] p-2 text-xs font-bold text-black">
                          {gradeScale.length > 0 ? (
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              {[...gradeScale]
                                .sort((left, right) => right.min - left.min)
                                .map((band) => (
                                  <div key={`${band.grade}-${band.min}-${band.max}`}>
                                    {band.grade} : {band.min} - {band.max}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="text-center text-neutral-500">
                              Grade bands come from the approved result template.
                            </div>
                          )}
                        </div>
                      </div>
                    </th>

                    {/* Grouped Header: Continuous Assessment (dynamic CA columns from active template) */}
                    {caColumns.length > 0 && (
                      <th
                        colSpan={caColumns.length}
                        className="text-center font-black text-black bg-[#F1F3F5] border-r border-b border-black py-1 text-xs"
                      >
                        Continuous
                        <br />
                        Assessment
                      </th>
                    )}

                    {/* Exam Columns (dynamic from active template) */}
                    {examColumns.map((col) => (
                      <th
                        key={col.key}
                        rowSpan={caColumns.length > 0 ? 2 : 1}
                        className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                      >
                        <div className="header-vertical-text mx-auto pb-1.5 font-bold text-black">
                          {col.label}
                        </div>
                      </th>
                    ))}

                    <th
                      rowSpan={caColumns.length > 0 ? 2 : 1}
                      className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 font-bold text-black">
                        Total Scores
                      </div>
                    </th>

                    <th
                      rowSpan={caColumns.length > 0 ? 2 : 1}
                      className="border-r border-black bg-[#F1F3F5] p-1 w-[8%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 font-bold text-black">
                        Grades
                      </div>
                    </th>

                    <th
                      rowSpan={caColumns.length > 0 ? 2 : 1}
                      className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 font-bold text-black">
                        Highest Score
                      </div>
                    </th>

                    <th
                      rowSpan={caColumns.length > 0 ? 2 : 1}
                      className="bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                    >
                      <div className="header-vertical-text mx-auto pb-1.5 font-bold text-black">
                        Lowest Score
                      </div>
                    </th>
                  </tr>

                  {/* CA Subheaders (dynamic vertical text from active template) */}
                  {caColumns.length > 0 && (
                    <tr className="border-b border-black">
                      {caColumns.map((col) => (
                        <th
                          key={col.key}
                          className="border-r border-black bg-[#F1F3F5] p-1 w-[7.5%] align-bottom text-center"
                        >
                          <div className="header-vertical-text mx-auto pb-1 font-bold text-black">
                            {col.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  )}

                  {/* ── ROW 14: Mark Obtainable Row (Solid Black, dynamic from active template) ── */}
                  <tr className="bg-black font-black text-white border-b border-black text-center text-xs">
                    <td className="text-left px-3 py-1 font-extrabold border-r border-neutral-700">
                      Mark obtainable
                    </td>
                    {orderedColumns.map((col) => (
                      <td key={col.key} className="border-r border-neutral-700 py-1 tabular-nums">
                        {col.maxMarks > 0 ? col.maxMarks : "—"}
                      </td>
                    ))}
                    <td className="border-r border-neutral-700 py-1 font-black tabular-nums">
                      {totalObtainable}
                    </td>
                    <td className="border-r border-neutral-700 py-1"></td>
                    <td className="border-r border-neutral-700 py-1 tabular-nums">{totalObtainable}</td>
                    <td className="py-1 tabular-nums">{totalObtainable}</td>
                  </tr>
                </thead>

                {/* ── ROWS 15+: Subject Rows (Strictly Offered Subjects) ── */}
                <tbody className="divide-y divide-black font-medium">
                  {isLoadingResults ? (
                    <tr>
                      <td colSpan={orderedColumns.length + 5} className="py-8 text-center text-xs text-slate-600">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <Loader2 className="h-4 w-4 animate-spin text-[var(--primary-text)] motion-reduce:animate-none" aria-hidden="true" />
                          Loading {stageLabel.toLowerCase()} results…
                        </span>
                      </td>
                    </tr>
                  ) : displayResults.length === 0 ? (
                    <tr>
                      <td colSpan={orderedColumns.length + 5} className="py-6 text-center text-xs text-slate-600 italic">
                        No recorded {stageLabel.toLowerCase()} subject scores found for this student.
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

                        {/* Dynamic Assessment Columns */}
                        {orderedColumns.map((col, colIdx) => (
                          <td
                            key={col.key}
                            className="text-center border-r border-black py-1 text-black tabular-nums"
                          >
                            {resolveColumnCell(item, col, colIdx)}
                          </td>
                        ))}

                        {/* Total Scores */}
                        <td className="text-center border-r border-black py-1 font-black text-black tabular-nums">
                          {item.score}
                        </td>

                        {/* Grades */}
                        <td className="text-center border-r border-black py-1 font-black text-black bg-neutral-200 tabular-nums">
                          {item.grade}
                        </td>

                        {/* Highest Score */}
                        <td className="text-center border-r border-black py-1 text-black tabular-nums">
                          {item.highestScore ?? "—"}
                        </td>

                        {/* Lowest Score */}
                        <td className="text-center py-1 text-black tabular-nums">
                          {item.lowestScore ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── LOWER SECTION: Leadership Skills (Left) & Academic Summary (Right) ── */}
            <div className="grid grid-cols-12 border-x border-b border-black text-xs">
              {/* ── LEFT COLUMN (Cols 1-7): Leadership / Psychomotor Skills ── */}
              <div className="col-span-7 border-r border-black flex flex-col">
                {/* Header */}
                <div className="grid grid-cols-12 font-black text-black border-b border-black py-1.5">
                  <div className="col-span-9 px-2">
                    Leadership Skills / Affective / Psychomotor Skills
                  </div>
                  <div className="col-span-3 text-center border-l border-black font-black">
                    GRADES
                  </div>
                </div>

                {/* School-selected skills */}
                <div className="divide-y divide-black font-medium">
                  {affectiveCategories.map((category) => (
                    <div
                      key={category.id}
                      className="grid grid-cols-12 py-1 hover:bg-neutral-50"
                    >
                      <div className="col-span-9 break-words px-2 text-black font-semibold">
                        {category.label}
                      </div>
                      <div className="col-span-3 text-center border-l border-black font-bold text-black">
                        {skillRatings[category.id] ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RIGHT COLUMN (Cols 8-12): Academic Summary, Grade Keys, Attendance, Resumption ── */}
              <div className="col-span-5 flex flex-col justify-between">
                <div>
                  {/* Summary Header (Solid Black) */}
                  <div className="bg-black font-black text-white text-center px-2 py-1.5 border-b border-black text-xs uppercase tracking-wider">
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
                  <div className="bg-black font-black text-white px-2 py-1.5 border-b border-black text-xs uppercase tracking-wider">
                    Grade Keys
                  </div>

                  {/* Skills Rating Scale (5-1) and Attendance Table */}
                  <div className="grid grid-cols-12 divide-x divide-black border-b border-black text-xs">
                    {/* Left side: 5 - Excellent scale */}
                    <div className="col-span-5 p-1.5 font-bold space-y-0.5 text-black">
                      <div>5 - Excellent</div>
                      <div>4 - Very Good</div>
                      <div>3 - Average</div>
                      <div>2 - Fair</div>
                      <div>1 - Poor</div>
                    </div>

                    {/* Right side: Attendance Table */}
                    <div className="col-span-7 flex flex-col">
                      <div className="grid grid-cols-3 divide-x divide-neutral-700 bg-black text-white font-black text-center text-[10px] leading-tight border-b border-black">
                        <div className="px-1 py-1.5">School days</div>
                        <div className="px-1 py-1.5">Present</div>
                        <div className="px-1 py-1.5">Absent</div>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-black text-center font-bold text-black flex-1 min-h-[50px] items-center">
                        <div className="p-1">{schoolOpen || "—"}</div>
                        <div className="p-1">{schoolPresent || "—"}</div>
                        <div className="p-1">{schoolAbsent || "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumption Bar */}
                <div>
                  <div className="bg-black font-black text-white text-center py-1 border-t border-black text-xs uppercase tracking-wider">
                    Resumption
                  </div>
                  <div className="p-1 text-center font-bold text-black min-h-[22px] bg-white">
                    {resumption || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* ── FOOTER: C.E.O's Comment & C.E.O's Signature ── */}
            <div className="border-x border-b border-black p-2 text-xs font-bold text-black">
              <div className="grid grid-cols-12 gap-3 items-end">
                {/* Left: C.E.O's Comment */}
                <div className="col-span-8 flex flex-col justify-between min-h-[75px]">
                  <div>
                    <span className="font-extrabold text-black">
                      C.E.O's Comment:
                    </span>
                    <div className="mt-1 min-h-9 w-full border-b border-dotted border-black p-1 text-xs font-semibold text-black">
                      {ceoComment || "—"}
                    </div>
                  </div>
                </div>

                {/* Right: C.E.O's Signature */}
                <div className="col-span-4 text-center flex flex-col items-center justify-end pb-1">
                  <div className="h-10 flex items-center justify-center">
                    {ceoSignatureUrl ? (
                      // Signature URL is validated and uploaded through the school admin settings.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ceoSignatureUrl}
                        alt="C.E.O signature"
                        className="h-9 w-36 object-contain"
                      />
                    ) : (
                      <span className="text-xs font-medium text-neutral-600">Not configured</span>
                    )}
                  </div>
                  <div className="text-xs font-extrabold text-black tracking-wide border-t border-black pt-0.5 w-3/4 mx-auto">
                    C.E.O's Signature
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExamId } from "@/lib/route-params";
import { cbtApi } from "@/lib/api-cbt";
import { useExamStore } from "@/store/exam";
import { useExamDeviceStatus } from "@/hooks/useExamDevice";
import { ExamDeviceNotice } from "@/components/cbt/ExamDeviceNotice";
import {
  autoSaveAnswers,
  recoverAnswers,
  clearAutoSave,
  enqueueAttempt,
  isOnline,
} from "@/lib/cbt-offline";
import { startSyncWorker } from "@/lib/cbt-sync";
import { ExamTimer } from "@/components/cbt/ExamTimer";
import { QuestionCard } from "@/components/cbt/QuestionCard";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Loader2,
  AlertTriangle,
  BookOpen,
  AlertCircle,
  ShieldAlert,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

const MAX_TAB_SWITCHES = 3;
const PROCTOR_WARNING_DURATION = 5;

/** Strip null values from the answers record for offline storage */
function compactAnswers(raw: Record<string, number | null>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && v !== undefined) result[k] = v;
  }
  return result;
}

/**
 * The exam room only opens on a computer or tablet. This gate runs before any
 * exam logic mounts, so a phone hitting a direct link or bookmark never starts
 * the attempt, never arms proctoring, and never touches the timer.
 */
export default function ActiveExamPage() {
  const device = useExamDeviceStatus();
  if (device === "unknown") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }
  if (device === "blocked") return <ExamDeviceNotice />;
  return <ActiveExam />;
}

function ActiveExam() {
  const router = useRouter();
  const examId = useExamId();

  const session = useExamStore((state) => state.session);
  const answers = useExamStore((state) => state.answers);
  const setSession = useExamStore((state) => state.setSession);
  const setAnswer = useExamStore((state) => state.setAnswer);
  const clearSession = useExamStore((state) => state.clearSession);
  const getFormattedAnswers = useExamStore((state) => state.getFormattedAnswers);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(!session || session.exam.id !== examId);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Proctoring state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [proctorWarning, setProctorWarning] = useState(false);
  const [proctorMessage, setProctorMessage] = useState("");
  const [proctorViolation, setProctorViolation] = useState(false);
  const [proctorTimer, setProctorTimer] = useState(PROCTOR_WARNING_DURATION);

  const initializedRef = useRef(false);
  const isReportingRef = useRef(false);
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const proctorLockRef = useRef(false);

  const handleTabSwitch = useCallback(async () => {
    if (examId === "practice" || proctorLockRef.current || submitting) return;
    proctorLockRef.current = true;

    try {
      const res: any = await cbtApi.reportTabSwitch(examId);
      const newCount = res.tabSwitchCount;

      setTabSwitchCount(newCount);

      if (res.maxReached || res.cheating) {
        clearSession();
        router.push(`/cbt/student/exam/${examId}/result`);
        return;
      }

      const remaining = 3 - newCount;
      const msg = remaining === 2
        ? `Warning! You left the exam screen. You have ${remaining} more warnings before automatic failure.`
        : `Final warning! You left the exam screen again. One more violation will auto-fail your exam.`;

      setProctorMessage(msg);
      setProctorWarning(true);
      setProctorTimer(PROCTOR_WARNING_DURATION);

      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
      warningTimerRef.current = setInterval(() => {
        setProctorTimer((prev) => {
          if (prev <= 1) {
            if (warningTimerRef.current) clearInterval(warningTimerRef.current);
            warningTimerRef.current = null;
            setProctorWarning(false);
            proctorLockRef.current = false;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      proctorLockRef.current = false;
    }
  }, [examId, submitting, clearSession, router]);

  useEffect(() => {
    if (initializedRef.current) return;

    async function initExam() {
      if (examId === "practice") {
        if (session && session.exam.id === "practice") {
          setLoading(false);
          initializedRef.current = true;
        } else {
          toast.error("Practice session expired. Please set up a new practice simulator.");
          router.push("/cbt/student");
        }
        return;
      }

      // Trust a session the dashboard already established for this exam
      // (e.g. it just passed a passkey to start it) instead of re-calling
      // start — a passkey-gated exam has no code to resubmit here, and a
      // second start call is redundant even when one isn't required.
      if (session && session.exam.id === examId) {
        setLoading(false);
        initializedRef.current = true;
        return;
      }

      setLoading(true);
      try {
        const res = await cbtApi.startExam(examId);
        setSession(res);
        initializedRef.current = true;
      } catch (err: any) {
        console.error("Failed to initialize/resume exam:", err);
        toast.error(err.message || "Failed to load exam session. Redirecting to student portal...");
        setTimeout(() => router.push("/cbt/student"), 2000);
      } finally {
        setLoading(false);
      }
    }

    initExam();
  }, [examId, setSession, router, session]);

  // Proctoring: detect tab switches and window blur
  useEffect(() => {
    if (examId === "practice" || !session) return;

    const handleVisibility = () => {
      if (document.hidden) handleTabSwitch();
    };

    const handleBlur = () => {
      handleTabSwitch();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, [examId, session, handleTabSwitch]);

  // Start the background sync worker and auto-recover saved answers
  useEffect(() => {
    const cleanup = startSyncWorker();
    // Try to recover auto-saved answers on mount
    if (examId && examId !== 'practice') {
      const saved = recoverAnswers(examId);
      if (saved && Object.keys(saved).length > 0) {
        Object.entries(saved).forEach(([qId, optIdx]) => setAnswer(qId, optIdx));
        toast.info('Recovered your previously saved answers.');
      }
    }
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const handleSelectOption = (optionIndex: number) => {
    if (!session) return;
    const currentQuestion = session.questions[currentIdx];
    if (!currentQuestion) return;
    setAnswer(currentQuestion.id, optionIndex);
    // Auto-save every answer change to localStorage
    if (examId !== 'practice') {
      const updatedAnswers = { ...compactAnswers(answers), [currentQuestion.id]: optionIndex };
      autoSaveAnswers(examId, updatedAnswers);
    }
  };

  const toggleFlagQuestion = () => {
    if (!session) return;
    const currentQuestion = session.questions[currentIdx];
    if (!currentQuestion) return;
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handleTimerExpire = async () => {
    toast.warning("Time has expired! Automatically submitting your exam...", { duration: 6000 });
    await executeSubmission(true);
  };

  const executeSubmission = async (isAuto = false) => {
    setSubmitting(true);
    setIsSubmitModalOpen(false);

    try {
      if (examId === "practice") {
        const gradedAnswers = session!.questions.map((q) => {
          const selectedOption = answers[q.id] ?? null;
          const isCorrect = selectedOption === q.correctAnswer;
          return {
            question: q,
            selectedOption,
            isCorrect,
            marksObtained: isCorrect ? q.marks : 0,
          };
        });

        const score = gradedAnswers.reduce((s, a) => s + a.marksObtained, 0);
        const totalMarks = session!.questions.reduce((s, q) => s + q.marks, 0);
        const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100 * 10) / 10 : 0;
        const timeTaken = Math.round((Date.now() - new Date(session!.startedAt).getTime()) / 1000);

        useExamStore.getState().setPracticeResult({
          score,
          totalMarks,
          percentage,
          status: "submitted",
          timeTaken,
          submittedAt: new Date().toISOString(),
          exam: { title: session!.exam.title, passMark: session!.exam.passMark, duration: session!.exam.duration },
          answers: gradedAnswers,
        });

        clearSession();
        toast.success("Practice assessment graded successfully!");
        router.push("/cbt/student/exam/practice/result");
        return;
      }

      const formatted = getFormattedAnswers();
      const payload: any = { answers: formatted };
      if (tabSwitchCount >= MAX_TAB_SWITCHES) payload.cheating = true;

      if (isOnline()) {
        // Online path — submit directly
        const res: any = await cbtApi.submitExam(examId, payload);
        clearSession();
        clearAutoSave(examId);

        if (res.cheating) {
          toast.error("Exam auto-failed due to proctoring violations.");
        } else if (res.resultsReleased === false) {
          toast.success("Exam submitted! Your teacher will release your score once results are published.", { duration: 6000 });
        } else if (isAuto) {
          toast.success("Exam submitted automatically!");
        } else {
          toast.success("Exam submitted successfully!");
        }

        router.push(`/cbt/student/exam/${examId}/result`);
      } else {
        // Offline path — enqueue for background sync
        await enqueueAttempt({
          examId,
          attemptId: (session as any).attemptId || examId,
          leaseToken: (session as any).leaseToken || '',
          answers: compactAnswers(answers),
          cheating: tabSwitchCount >= MAX_TAB_SWITCHES,
          submittedAt: new Date().toISOString(),
        });

        clearSession();
        clearAutoSave(examId);
        toast.success("You are offline. Your exam has been saved and will sync automatically when you reconnect.", { duration: 8000 });
        router.push(`/cbt/student`);
      }
    } catch (err: any) {
      console.error("Submission failed:", err);

      // Last-resort offline fallback if the network call itself threw
      if (!isOnline()) {
        try {
          await enqueueAttempt({
            examId,
            attemptId: (session as any).attemptId || examId,
            leaseToken: (session as any).leaseToken || '',
            answers: compactAnswers(answers),
            cheating: tabSwitchCount >= MAX_TAB_SWITCHES,
            submittedAt: new Date().toISOString(),
          });
          clearSession();
          clearAutoSave(examId);
          toast.success("Saved offline. Will sync when back online.", { duration: 8000 });
          router.push(`/cbt/student`);
          return;
        } catch {
          // IndexedDB itself failed — nothing more we can do
        }
      }

      toast.error(err.message || "Failed to submit exam. Please try again or contact your administrator.");
      setSubmitting(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="font-semibold text-slate-300">Loading your exam paper…</p>
        <p className="text-xs text-slate-500 mt-1">Please do not refresh or close this window.</p>
      </div>
    );
  }

  const currentQuestion = session.questions[currentIdx];
  const totalQuestions = session.questions.length;

  if (!currentQuestion && totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
        <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
        <p className="font-semibold text-slate-300">No questions available</p>
        <p className="text-xs text-slate-500 mt-1">This exam has no questions yet. Please contact your teacher.</p>
        <button
          onClick={() => router.push("/cbt/student")}
          className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-6 py-3 rounded-sm transition-colors border border-slate-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const remainingCount = totalQuestions - answeredCount;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col select-none">

      <header className="bg-slate-950/80 backdrop-blur border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-sm text-white shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight truncate">
                {session.exam.title}
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate">
                Secure Testing Room
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {tabSwitchCount > 0 && !proctorViolation && (
              <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                tabSwitchCount >= 2 ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}>
                <ShieldAlert className="w-3 h-3" />
                <span>{tabSwitchCount}/{MAX_TAB_SWITCHES}</span>
              </div>
            )}
            <ExamTimer
              startedAt={session.startedAt}
              durationMinutes={session.exam.duration}
              onExpire={handleTimerExpire}
              className="!bg-slate-900 !text-slate-100 !border-slate-800 !rounded-sm !py-1.5 !px-3 !text-xs"
            />
            <button
              disabled={submitting}
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-sm transition-all flex items-center space-x-1.5 shadow-lg shadow-blue-500/10 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col space-y-6">
          <QuestionCard
            question={currentQuestion}
            index={currentIdx}
            selectedOptionIndex={currentQuestion ? (answers[currentQuestion.id] ?? null) : null}
            onSelectOption={handleSelectOption}
            totalQuestions={totalQuestions}
          />

          <div className="flex items-center justify-between bg-slate-800/40 p-3 sm:p-4 rounded-sm border border-slate-700/50 gap-2">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => prev - 1)}
              className={`flex items-center justify-center space-x-1.5 px-3 sm:px-4 h-10 rounded-sm text-xs font-bold transition-colors whitespace-nowrap ${
                currentIdx === 0
                  ? "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white"
              }`}
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <button
              onClick={toggleFlagQuestion}
              className={`flex items-center justify-center space-x-1.5 px-3 sm:px-4 h-10 rounded-sm text-xs font-bold border transition-colors whitespace-nowrap ${
                flaggedQuestions[currentQuestion?.id ?? ""]
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
                  : "bg-slate-700/50 border-slate-600/30 text-slate-300 hover:bg-slate-600/50 hover:text-white"
              }`}
            >
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{flaggedQuestions[currentQuestion?.id ?? ""] ? "Flagged for Review" : "Flag for Review"}</span>
              <span className="sm:hidden">{flaggedQuestions[currentQuestion?.id ?? ""] ? "Flagged" : "Flag"}</span>
            </button>

            {currentIdx === totalQuestions - 1 ? (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center justify-center space-x-1.5 px-4 sm:px-5 h-10 rounded-sm text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10 active:scale-95 whitespace-nowrap"
              >
                <span className="hidden sm:inline">Submit</span>
                <span className="sm:hidden">Submit</span>
                <Send className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((prev) => prev + 1)}
                className="flex items-center justify-center space-x-1.5 px-4 sm:px-5 h-10 rounded-sm text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          </div>
        </div>

        <aside className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-slate-800/40 p-5 rounded-sm border border-slate-700/50 shadow-md">
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Exam Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/60 p-2.5 rounded-sm">
                <p className="text-base font-bold text-blue-400">{answeredCount}</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase mt-0.5">Answered</p>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-sm">
                <p className="text-base font-bold text-amber-400">{flaggedCount}</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase mt-0.5">Flagged</p>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-sm">
                <p className="text-base font-bold text-slate-300">{remainingCount}</p>
                <p className="text-[9px] font-semibold text-slate-500 uppercase mt-0.5">Unanswered</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-sm border border-slate-800/80 shadow-md flex flex-col">
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-5">Question Navigator</h3>
            <div className="grid grid-cols-5 gap-2.5 max-h-[260px] overflow-y-auto p-1">
              {session.questions.map((q, idx) => {
                const isSelected = currentIdx === idx;
                const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined;
                const isFlagged = flaggedQuestions[q.id];
                let blockClass = "bg-slate-800/60 border-transparent text-slate-500 hover:bg-slate-700/60 hover:text-slate-300";
                if (isAnswered) blockClass = "bg-blue-500/15 border-blue-500/25 text-blue-400 hover:bg-blue-500/25";
                if (isFlagged) blockClass = "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30";
                if (isSelected) blockClass = "bg-blue-500 text-white border-blue-500 outline-2 outline-blue-500 outline-offset-1";
                return (
                  <button key={q.id} onClick={() => setCurrentIdx(idx)}
                    className={`h-10 text-xs font-bold rounded-sm border flex items-center justify-center transition-all ${blockClass}`}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-700/50 flex flex-col space-y-2 text-[10px] font-semibold text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-sm bg-blue-500/25 inline-block"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-sm bg-amber-500/25 inline-block"></span>
                <span>Flagged for Review</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-sm bg-slate-800/60 inline-block"></span>
                <span>Unanswered / Pending</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {submitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="font-bold text-slate-200 text-base">Grading examination paper...</p>
          <p className="text-xs text-slate-500 mt-1">Applying scoring coefficients and calculating results.</p>
        </div>
      )}

      {/* Proctoring Warning Overlay */}
      {proctorWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl">
          <div className="bg-slate-900 rounded-sm max-w-md w-full border border-amber-500/30 shadow-2xl shadow-amber-500/5 p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-5">
              <EyeOff className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Tab Switch Detected</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">{proctorMessage}</p>
            <div className="bg-slate-950 rounded-sm p-5 border border-slate-800 mb-4">
              <p className="text-3xl font-extrabold text-amber-400">{proctorTimer}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Seconds to return</p>
            </div>
            <div className="flex items-center justify-center space-x-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= tabSwitchCount ? "bg-amber-500" : "bg-slate-700"}`} />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-3 font-medium">
              Violation {tabSwitchCount} of {MAX_TAB_SWITCHES} — {MAX_TAB_SWITCHES - tabSwitchCount} remaining before auto-fail
            </p>
          </div>
        </div>
      )}

      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-sm max-w-md w-full border border-slate-800 shadow-2xl p-6 sm:p-8 text-center relative">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Submit Your Exam?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Are you ready to submit your exam paper? You will not be able to change your answers after submission.
            </p>
            <div className="bg-slate-950 rounded-sm p-4 border border-slate-800 flex justify-around text-center mb-8">
              <div>
                <p className="text-xs font-bold text-slate-400">Answered</p>
                <p className="text-base font-extrabold text-blue-400 mt-0.5">{answeredCount}</p>
              </div>
              <div className="h-8 w-px bg-slate-800 self-center"></div>
              <div>
                <p className="text-xs font-bold text-slate-400">Remaining</p>
                <p className="text-base font-extrabold text-slate-300 mt-0.5">{remainingCount}</p>
              </div>
            </div>
            {tabSwitchCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-sm p-3 text-left mb-4 flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] font-medium text-amber-400 leading-normal">
                  Proctoring: {tabSwitchCount} tab switch violation{tabSwitchCount > 1 ? "s" : ""} recorded.
                </p>
              </div>
            )}
            {remainingCount > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-sm p-3.5 text-left mb-6 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-[10px] font-medium text-rose-400 leading-normal">
                  Warning: You have {remainingCount} unanswered question{remainingCount > 1 ? "s" : ""}. These will be marked as zero.
                </p>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3 px-4 rounded-sm border border-slate-700 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => executeSubmission(false)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold py-3 px-4 rounded-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

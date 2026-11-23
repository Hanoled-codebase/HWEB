"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExamId } from "@/lib/route-params";
import { cbtApi } from "@/lib/api-cbt";
import { ResultView } from "@/components/cbt/ResultView";
import { Loader2, ArrowLeft, RefreshCw, AlertCircle, Hourglass, CheckCircle2 } from "lucide-react";
import { useExamStore } from "@/store/exam";
import { Logo } from "@/components/ui/Logo";

export default function ExamResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = useExamId();
  const orgSlug = searchParams.get("orgSlug") || "hanoled-default";

  const [resultData, setResultData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const practiceResult = useExamStore((state) => state.practiceResult);

  useEffect(() => {
    async function loadResult() {
      if (examId === "practice") {
        if (practiceResult) {
          setResultData(practiceResult);
          setLoading(false);
        } else {
          setError("No active practice session result was found. Please start a new simulation.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      setPending(false);
      try {
        const data = await cbtApi.getExamResult(examId, { showErrorToast: false });
        setResultData(data);
      } catch (err: any) {
        if (err.code === "RESULTS_NOT_RELEASED") {
          setPending(true);
        } else {
          console.error("Failed to load result:", err);
          setError(
            err.message ||
            "Failed to fetch your corrections. Please make sure you have submitted the exam."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [examId, practiceResult]);

  const handleGoBack = () => {
    router.push(`/cbt/student?orgSlug=${orgSlug}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-sans">
      {/* Distilled Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" badgeText="HCBT" textColor="text-[#0B1220]" />
            <span className="hidden sm:inline text-xs font-semibold text-slate-400">·</span>
            <span className="hidden sm:inline text-xs font-semibold text-slate-600">Exam Results & Review</span>
          </div>

          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Portal Home</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <Loader2 className="h-9 w-9 text-blue-600 animate-spin mb-4" />
            <h2 className="text-base font-bold text-slate-900">Loading Result Sheet</h2>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">
              Calculating scores, objective correctness, and solutions.
            </p>
          </div>
        ) : pending ? (
          <div className="mx-auto my-12 max-w-md rounded-2xl border border-amber-200/80 bg-white p-6 sm:p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <Hourglass className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Results Pending Publication</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your submission was recorded safely. Scores will be viewable once your teacher publishes results for this assessment.
            </p>
            <button
              type="button"
              onClick={handleGoBack}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 pointer-coarse:min-h-11"
            >
              Return to Student Portal
            </button>
          </div>
        ) : error ? (
          <div className="mx-auto my-12 max-w-md rounded-2xl border border-rose-200 bg-white p-6 sm:p-8 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Unable to Load Results</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {error}
            </p>
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={handleGoBack}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 pointer-coarse:min-h-11"
              >
                Return to Student Portal
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 pointer-coarse:min-h-11"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-12">
            <ResultView result={resultData} />
          </div>
        )}
      </main>
    </div>
  );
}

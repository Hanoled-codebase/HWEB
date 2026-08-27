"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { cbtApi } from "@/lib/api-cbt";
import { ResultView } from "@/components/cbt/ResultView";
import { Loader2, ArrowLeft, RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { useExamStore } from "@/store/exam";
import { Toaster } from "sonner";

export default function ExamResultPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const orgSlug = searchParams.get("orgSlug") || "hanoled-default";


  const [resultData, setResultData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


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
      try {
        const data = await cbtApi.getExamResult(examId);
        setResultData(data);
      } catch (err: any) {
        console.error("Failed to load result:", err);
        setError(
          err.message ||
          "Failed to fetch your corrections. Please make sure you have submitted the exam."
        );
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Toaster position="top-right" richColors />

     
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-sm transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Portal Home</span>
          </button>

          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-600 animate-pulse" />
            <span className="text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent uppercase tracking-wider">
              Performance Center
            </span>
          </div>
        </div>
      </header>

  
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 text-sm font-semibold">Generating your correction sheets...</p>
            <p className="text-[11px] text-slate-400">We are processing your answers and calculating explanations.</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-sm border border-rose-100 shadow-xl text-center">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Performance Audit Issue</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleGoBack}
                className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-4 rounded-sm shadow-lg shadow-blue-500/20 transition-all"
              >
                Return to Student Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700 py-2 inline-flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Fetching Results</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in pb-12">
            <ResultView result={resultData} />
          </div>
        )}
      </main>
    </div>
  );
}



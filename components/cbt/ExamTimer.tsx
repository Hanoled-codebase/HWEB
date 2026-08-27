import React from "react";
import { useExamTimer } from "@/hooks/useExamTimer";

interface ExamTimerProps {
  startedAt: string | Date;
  durationMinutes: number;
  onExpire: () => void;
  className?: string;
}

export function ExamTimer({ startedAt, durationMinutes, onExpire, className = "" }: ExamTimerProps) {
  const { formattedTime, timeLeft } = useExamTimer(startedAt, durationMinutes, onExpire);

  const isLowTime = timeLeft !== null && timeLeft < 300; // Less than 5 minutes

  return (
    <div
      className={`font-mono text-xl font-semibold px-4 py-2 rounded-sm border ${
        isLowTime
          ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
          : "bg-slate-100 text-slate-800 border-slate-200"
      } ${className}`}
    >
      Time Left: {formattedTime}
    </div>
  );
}

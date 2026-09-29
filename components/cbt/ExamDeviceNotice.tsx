"use client";

import Link from "next/link";
import { Laptop } from "lucide-react";

const TITLE = "Use a computer or tablet to take this exam";
const BODY =
  "Exams can't be started on a phone. Open Hanoled on a computer, laptop or tablet and sign in with the same details to begin. You can still see your exams and results here on your phone.";

/**
 * Shown when a student on a phone tries to start or resume an exam.
 * With `onClose` it is a dialog over the exam list; without it, it replaces the
 * exam room itself (direct links / bookmarks) and offers a way back to the list.
 */
export function ExamDeviceNotice({ onClose }: { onClose?: () => void }) {
  const card = (
    <div
      role={onClose ? "alertdialog" : undefined}
      aria-labelledby="exam-device-title"
      aria-describedby="exam-device-body"
      className={
        onClose
          ? "m-sheet w-full rounded-t-3xl border border-slate-200 bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-center shadow-xl sm:max-w-sm sm:rounded-sm sm:pb-6"
          : "w-full max-w-sm rounded-sm border border-slate-200 bg-white p-6 text-center shadow-xl"
      }
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Laptop className="h-7 w-7" />
      </div>
      <h2 id="exam-device-title" className="text-lg font-bold text-[#0B1220]">
        {TITLE}
      </h2>
      <p id="exam-device-body" className="mt-2 text-sm leading-relaxed text-slate-600">
        {BODY}
      </p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-[48px] w-full rounded-sm bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-700"
        >
          Got it
        </button>
      ) : (
        <Link
          href="/cbt/student"
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-sm bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-700"
        >
          Back to my exams
        </Link>
      )}
    </div>
  );

  if (onClose) {
    return (
      // Phones: a bottom sheet; tap outside or "Got it" to dismiss.
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {card}
      </div>
    );
  }
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">{card}</div>;
}

/** Inline heads-up on the exam list so a phone user knows before they tap Start. */
export function ExamDeviceBanner() {
  return (
    <div className="flex items-start gap-3 rounded-sm border border-blue-200 bg-blue-50/70 p-3.5">
      <Laptop className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      <p className="text-[13px] leading-snug text-slate-700">
        <span className="font-semibold text-[#0B1220]">You can view your exams here on your phone.</span> To start one,
        use a computer or tablet.
      </p>
    </div>
  );
}

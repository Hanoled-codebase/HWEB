"use client";

import { useSyncExternalStore } from "react";

/**
 * Exams are taken on a computer, laptop or tablet. Phones can browse the exam
 * list and results but must not start or resume a paper.
 *
 * The check uses the physical screen's shortest side rather than the viewport:
 * rotating a phone to landscape, or asking the mobile browser for the "desktop
 * site", widens the viewport but never changes `screen`. 700 CSS px sits above
 * every phone (even large ones stay under ~480) and below a tablet (an iPad
 * mini is 744), so tablets and up pass.
 *
 * This is a client-side guard: it stops honest students on the wrong device,
 * it is not tamper-proof.
 */
export const MIN_EXAM_SCREEN_PX = 700;

export type ExamDeviceStatus = "unknown" | "ok" | "blocked";

/** Synchronous check for event handlers and async callbacks. Fails open if the screen size is unreadable. */
export function isExamCapableScreen(): boolean {
  if (typeof window === "undefined") return true;
  const shortest = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
  if (!Number.isFinite(shortest) || shortest <= 0) return true;
  return shortest >= MIN_EXAM_SCREEN_PX;
}

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}

export function useExamDeviceStatus(): ExamDeviceStatus {
  return useSyncExternalStore<ExamDeviceStatus>(
    subscribe,
    () => (isExamCapableScreen() ? "ok" : "blocked"),
    () => "unknown",
  );
}

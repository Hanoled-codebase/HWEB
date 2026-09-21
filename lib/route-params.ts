"use client";

import { useParams } from "next/navigation";

/**
 * The exam id for /cbt/student/exam/[examId]/... pages.
 *
 * The HCBT Edge Appliance serves a static export, where a dynamic segment is
 * prerendered once with a placeholder ("_") and the real id only exists in
 * the browser URL — so in edge mode it is read from the location instead of
 * from the router's params.
 */
export function useExamId(): string {
  const params = useParams();
  if (process.env.NEXT_PUBLIC_EDGE_MODE === "1" && typeof window !== "undefined") {
    const match = window.location.pathname.match(/\/cbt\/student\/exam\/([^/]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return params.examId as string;
}

import { Suspense } from "react";
import ExamPage from "@/app/cbt/student/exam/[examId]/page";

// Exam ids are unknown at build time. One placeholder page is exported and
// the appliance serves it for every id; the real id is read from the URL.
export const dynamicParams = false;
export async function generateStaticParams() {
  return [{ examId: "_" }];
}

export default function EdgeExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamPage />
    </Suspense>
  );
}

import { Suspense } from "react";
import ResultPage from "@/app/cbt/student/exam/[examId]/result/page";

// Exam ids are unknown at build time. One placeholder page is exported and
// the appliance serves it for every id; the real id is read from the URL.
export const dynamicParams = false;
export async function generateStaticParams() {
  return [{ examId: "_" }];
}

export default function EdgeResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultPage />
    </Suspense>
  );
}

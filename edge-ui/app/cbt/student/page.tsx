import { Suspense } from "react";
import StudentPage from "@/app/cbt/student/page";

export default function EdgeStudentPage() {
  return (
    <Suspense fallback={null}>
      <StudentPage />
    </Suspense>
  );
}

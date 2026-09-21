import { Suspense } from "react";
import AdminPage from "@/app/cbt/admin/page";

export default function EdgeAdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage />
    </Suspense>
  );
}

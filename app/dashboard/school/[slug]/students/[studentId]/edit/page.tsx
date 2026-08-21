"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StudentForm } from "@/components/forms/StudentForm";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EditStudentPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const { currentOrg } = useOrganization();
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStudent() {
      if (!currentOrg || !studentId) return;
      try {
        const [student, guardians] = await Promise.all([
          apiFetch<any>(`/students/${currentOrg.slug}/${studentId}`),
          apiFetch<any[]>(`/students/${currentOrg.slug}/${studentId}/guardians`).catch(() => []),
        ]);
        setInitialData({ ...student, guardians });
      } catch (err: any) {
        toast.error("Failed to load student details");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStudent();
  }, [currentOrg, studentId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Student Not Found</h2>
        <p className="text-slate-500">The student you are trying to edit does not exist or you don't have permission.</p>
      </div>
    );
  }

  return <StudentForm initialData={initialData} studentId={studentId} />;
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { extractSchoolSubpath, isAllowedStudentSubpath } from "@/lib/student-access";
import { Loader2 } from "lucide-react";

type StudentRouteGuardProps = {
  slug: string;
  children: React.ReactNode;
};

/**
 * Redirects student users away from routes they cannot access.
 * Locks the learner to their allowed HSMS student features (Dashboard, Homework,
 * Scheme of Work, Results, Pending Exams, Timetable, Library, Invoices).
 */
export function StudentRouteGuard({ slug, children }: StudentRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  const base = `/dashboard/school/${slug}`;
  const subpath = extractSchoolSubpath(pathname, slug);
  const allowed = subpath !== null && isAllowedStudentSubpath(subpath);

  useEffect(() => {
    if (!allowed) {
      router.replace(base);
    }
  }, [allowed, base, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#1447E6]" />
      </div>
    );
  }

  return <>{children}</>;
}


"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { canAccessPath, useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { Loader2 } from "lucide-react";

type StaffRouteGuardProps = {
  slug: string;
  children: React.ReactNode;
};

/**
 * Redirects staff users away from routes they cannot access.
 * Prevents "Admin role required" API errors by never rendering unauthorized pages.
 */
export function StaffRouteGuard({ slug, children }: StaffRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentMember } = useOrganization();
  const { visibleNavItems, role } = useSchoolNavItems();

  const base = `/dashboard/school/${slug}`;
  const isDashboardHome = pathname === base;
  const allowed =
    isDashboardHome ||
    canAccessPath(pathname, slug, visibleNavItems, role);

  useEffect(() => {
    if (currentMember && !allowed) {
      router.replace(base);
    }
  }, [allowed, base, currentMember, router]);

  if (!currentMember) return null;

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#1447E6]" />
      </div>
    );
  }

  return <>{children}</>;
}

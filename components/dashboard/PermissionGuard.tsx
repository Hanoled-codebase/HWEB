"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions, type Capability } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

type PermissionGuardProps = {
  children: React.ReactNode;
  /** Require owner or admin org role */
  requirePrivileged?: boolean;
  /** Require at least one of these capabilities */
  requireAny?: Capability[];
  /** Redirect target — defaults to school dashboard home */
  redirectTo?: string;
};

export function PermissionGuard({
  children,
  requirePrivileged = false,
  requireAny,
  redirectTo,
}: PermissionGuardProps) {
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const { can, isPrivileged } = usePermissions();

  const hasAccess = (() => {
    if (!currentMember) return false;
    if (requirePrivileged && !isPrivileged) return false;
    if (requireAny && requireAny.length > 0) {
      return requireAny.some((cap) => can(cap));
    }
    return true;
  })();

  const fallback =
    redirectTo ||
    (currentOrg ? `/dashboard/school/${currentOrg.slug}` : "/dashboard");

  useEffect(() => {
    if (currentMember && !hasAccess) {
      router.replace(fallback);
    }
  }, [currentMember, hasAccess, fallback, router]);

  if (!currentMember) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#1447E6]" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#1447E6]" />
      </div>
    );
  }

  return <>{children}</>;
}

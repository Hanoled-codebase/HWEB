"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { HanoledLoader } from "@/components/ui/hanoled-loader";

export default function DashboardPage() {
  const router = useRouter();
  const { organizations, fetchOrgs, isLoading, error, hasFetchedOrganizations } =
    useOrganization();
  const { user, checkAuth, isInitialized, isLoading: authLoading, logout } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!isInitialized && !authLoading) {
      checkAuth();
    }
  }, [isInitialized, authLoading, checkAuth]);

  useEffect(() => {
    if (isInitialized && user && !hasFetchedOrganizations && !isLoading) {
      fetchOrgs();
    }
  }, [isInitialized, user, hasFetchedOrganizations, isLoading, fetchOrgs]);

  // Separate effect for redirect — depends on live store values after init
  useEffect(() => {
    if (!user || authLoading || isLoading || !hasFetchedOrganizations) return;

    if (organizations.length > 0) {
      router.replace(`/dashboard/school/${organizations[0].slug}`);
    } else if (!error) {
      router.replace("/onboarding");
    }
  }, [authLoading, error, hasFetchedOrganizations, isLoading, organizations, user]);

  if (error && hasFetchedOrganizations && !isLoading && user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Unable to load your workspace
          </h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => void fetchOrgs()}>
              Retry
            </Button>
            <Button onClick={() => void logout()}>Sign in again</Button>
          </div>
        </div>
      </div>
    );
  }

  return <HanoledLoader />;
}

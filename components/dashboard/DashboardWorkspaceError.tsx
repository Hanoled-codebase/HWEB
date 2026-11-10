"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function DashboardWorkspaceError({ error }: { error: string }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    router.refresh();
    window.setTimeout(() => setRetrying(false), 1500);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-lg font-semibold text-[#0B1220]">
          Unable to load your workspace
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{error}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            disabled={retrying || signingOut}
            className="min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1447E6]"
          >
            {retrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Retrying…
              </>
            ) : (
              "Retry"
            )}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={retrying || signingOut}
            className="min-h-11 cursor-pointer bg-[#1447E6] text-white hover:bg-[#103BBD] focus-visible:ring-2 focus-visible:ring-[#1447E6]"
          >
            {signingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Signing out…
              </>
            ) : (
              "Sign in again"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

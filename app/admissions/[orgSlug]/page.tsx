import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SignInShell } from "@/components/auth/SignInForm";
import { getTenantBranding } from "@/lib/tenant-branding";
import { AdmissionsPortalClient } from "./AdmissionsPortalClient";

export default async function PublicAdmissionPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const branding = await getTenantBranding(orgSlug);

  return (
    <SignInShell branding={branding}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" aria-label="Loading admissions portal" />
          </div>
        }
      >
        <AdmissionsPortalClient orgSlug={orgSlug} initialBranding={branding} />
      </Suspense>
    </SignInShell>
  );
}

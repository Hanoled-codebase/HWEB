import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SignInForm, { SignInShell } from '@/components/auth/SignInForm';
import { getTenantBranding } from '@/lib/tenant-branding';

interface PageProps {
  searchParams?: Promise<{ orgSlug?: string; school?: string }>;
}

// Staff & admin entrance (email sign-in; tabs hidden).
export default async function StaffSignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slug = params?.orgSlug || params?.school;
  const branding = await getTenantBranding(slug);

  return (
    <SignInShell branding={branding}>
      <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <SignInForm audience="staff" initialBranding={branding} />
      </Suspense>
    </SignInShell>
  );
}

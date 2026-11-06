import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SignInForm, { SignInShell } from '@/components/auth/SignInForm';
import { getTenantBranding } from '@/lib/tenant-branding';

interface PageProps {
  searchParams?: Promise<{ orgSlug?: string; school?: string }>;
}

// Universal sign-in: keeps both role tabs (bookmarks and e2e flows land here).
// When orgSlug or school is passed, presents the dedicated school-branded portal.
export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slug = params?.orgSlug || params?.school;
  const branding = await getTenantBranding(slug);

  return (
    <SignInShell branding={branding}>
      <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <SignInForm audience="all" initialBranding={branding} />
      </Suspense>
    </SignInShell>
  );
}

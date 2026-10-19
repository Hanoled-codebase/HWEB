import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SignInForm, { SignInShell } from '@/components/auth/SignInForm';

// Universal sign-in: keeps both role tabs (bookmarks and e2e flows land here).
// Audience-specific pages: /signin/staff, /signin/parent, /signin/student.
export default function LoginPage() {
  return (
    <SignInShell>
      <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <SignInForm audience="all" />
      </Suspense>
    </SignInShell>
  );
}

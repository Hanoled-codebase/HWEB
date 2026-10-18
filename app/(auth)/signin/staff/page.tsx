import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SignInForm, { SignInShell } from '@/components/auth/SignInForm';

// Staff & admin entrance (email sign-in; tabs hidden).
export default function StaffSignInPage() {
  return (
    <SignInShell>
      <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <SignInForm audience="staff" />
      </Suspense>
    </SignInShell>
  );
}

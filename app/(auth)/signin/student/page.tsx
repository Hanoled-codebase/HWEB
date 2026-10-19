import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SignInForm, { SignInShell } from '@/components/auth/SignInForm';

// Candidate & pupil entrance (admission number + school code; tabs hidden).
export default function StudentSignInPage() {
  return (
    <SignInShell>
      <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <SignInForm audience="student" />
      </Suspense>
    </SignInShell>
  );
}

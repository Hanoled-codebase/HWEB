"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/services/api";

type ResetTarget = { learnerId: string } | { affiliationId: string };

/**
 * Lets a school admin give someone a temporary password (HCORE shows it once)
 * and unlock their account. The person must choose their own password at
 * their next sign-in.
 */
export function ResetPasswordButton({
  orgId,
  target,
  personName,
  signInHint,
  className,
}: {
  orgId: string;
  target: ResetTarget;
  personName: string;
  /** How this person signs in, e.g. "their admission number". */
  signInHint?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Never keep the password around once the dialog is gone.
      setTemporaryPassword(null);
      setError(null);
      setCopied(false);
    }
  };

  const reset = async () => {
    setPending(true);
    setError(null);
    try {
      const { temporaryPassword } = await api.resetPassword(orgId, target);
      setTemporaryPassword(temporaryPassword);
    } catch (err) {
      // HCORE's refusals carry a status and a message worth showing as-is;
      // anything else is the network.
      const refused = typeof (err as { status?: unknown }).status === "number";
      setError(
        refused && err instanceof Error && err.message
          ? err.message
          : "Could not reach Hanoled. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the password is still on screen to read out.
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className={className ?? "h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-[#0B1220] shadow-sm hover:bg-white"}
        onClick={() => setOpen(true)}
      >
        <KeyRound className="mr-2 h-4 w-4" />
        Reset password
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-[440px]">
          {temporaryPassword ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#0B1220]">Temporary password</DialogTitle>
                <DialogDescription>
                  Give this to {personName}. It is shown only once.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1447E6]/20 bg-[#1447E6]/5 p-4">
                <span className="font-mono text-xl font-semibold tracking-[0.2em] text-[#0B1220]" aria-label="Temporary password">
                  {temporaryPassword}
                </span>
                <Button variant="ghost" className="h-9 px-3 text-[#1447E6] hover:bg-[#1447E6]/10" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                {signInHint ? `They sign in with ${signInHint} and this password, ` : "At sign-in they will be "}
                {signInHint ? "then choose their own." : "asked to choose their own."}
              </p>
              <DialogFooter>
                <Button className="bg-[#1447E6] text-white hover:bg-[#1447E6]/90" onClick={() => close(false)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#0B1220]">Reset {personName}&apos;s password?</DialogTitle>
                <DialogDescription>
                  They will be signed out everywhere and get a temporary password, which they must replace the next
                  time they sign in. This also unlocks the account if too many wrong passwords locked it.
                </DialogDescription>
              </DialogHeader>
              {error && (
                <p role="alert" className="rounded-lg border border-[#F04438]/30 bg-[#F04438]/10 p-3 text-sm text-[#F04438]">
                  {error}
                </p>
              )}
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => close(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button className="bg-[#1447E6] text-white hover:bg-[#1447E6]/90" onClick={reset} disabled={pending}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset password
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

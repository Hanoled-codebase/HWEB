"use client";

import { useState } from "react";
import { Download, Loader2, ShieldAlert, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { cbtApi } from "@/lib/api-cbt";
import { api, type PersonTarget } from "@/services/api";

type HsmsRecord = { studentId: string } | { memberId: string };
type HcbtRecord = { learnerId: string } | { personId: string } | { affiliationId: string };

function message(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** One product's part of the file; a product the school doesn't use just says so. */
async function part<T>(load: () => Promise<T>): Promise<T | { notIncluded: string }> {
  try {
    return await load();
  } catch (err) {
    const status = (err as { status?: number }).status;
    return { notIncluded: status === 404 || status === 403 ? "No records here for this person." : message(err, "Couldn't be reached.") };
  }
}

function saveJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * A school's answer to data-protection requests (Nigeria Data Protection
 * Act) for one person: download everything Hanoled holds about them in one
 * file (identity from HCORE, school records from HSMS, exams from HCBT), or
 * erase them. Erasure anonymizes: results and fee records stay under an
 * anonymous ID, because schools must keep them.
 */
export function PersonalDataButton({
  orgId,
  orgSlug,
  personName,
  target,
  hsms,
  hcbt,
  canErase,
  onErased,
  className,
}: {
  orgId: string;
  orgSlug: string;
  personName: string;
  /** How HCORE knows the person. */
  target: PersonTarget;
  /** Their HSMS record, when the school uses HSMS. */
  hsms?: HsmsRecord;
  /** How HCBT knows them, when the school uses HCBT. */
  hcbt?: HcbtRecord;
  /** Owners and directory admins; HCORE refuses anyone else anyway. */
  canErase: boolean;
  onErased?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [erasing, setErasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setConfirmText("");
      setReason("");
      setError(null);
    }
  };

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const identity = await api.exportPersonalData(orgId, target);
      const [schoolRecords, exams] = await Promise.all([
        hsms
          ? part(() =>
              apiFetch<Record<string, unknown>>(
                "studentId" in hsms ? `/privacy/${orgSlug}/students/${hsms.studentId}/export` : `/privacy/${orgSlug}/members/${hsms.memberId}/export`,
                { showErrorToast: false },
              ),
            )
          : null,
        hcbt ? part(() => cbtApi.exportPersonalData(orgSlug, hcbt)) : null,
      ]);
      const date = new Date().toISOString().slice(0, 10);
      saveJson(`hanoled-personal-data-${personName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${date}.json`, {
        exportedAt: new Date().toISOString(),
        school: orgSlug,
        about: personName,
        note: "Everything Hanoled holds about this person for this school, under the Nigeria Data Protection Act.",
        identity,
        ...(schoolRecords ? { schoolRecords } : {}),
        ...(exams ? { exams } : {}),
      });
      toast.success(`Downloaded ${personName}'s data.`);
    } catch (err) {
      setError(message(err, "Couldn't reach Hanoled. Check your connection and try again."));
    } finally {
      setDownloading(false);
    }
  };

  const erase = async () => {
    setErasing(true);
    setError(null);
    try {
      const { scope } = await api.erasePersonalData(orgId, target, reason.trim() || undefined);
      toast.success(
        scope === "full"
          ? `${personName}'s personal data has been erased.`
          : `${personName}'s data for this school has been erased. Another school still holds their account.`,
      );
      close(false);
      onErased?.();
    } catch (err) {
      // A bare "Forbidden" is the permission check; HCORE's own refusals explain themselves.
      const text = message(err, "Couldn't erase this person's data. Try again.");
      setError(text === "Forbidden" ? "Only the school owner or a directory admin can erase personal data." : text);
    } finally {
      setErasing(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className={className ?? "h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-[#0B1220] shadow-sm hover:bg-white"}
        onClick={() => setOpen(true)}
      >
        <ShieldAlert className="mr-2 h-4 w-4" />
        Personal data
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[#0B1220]">{personName}&apos;s personal data</DialogTitle>
            <DialogDescription>
              For requests under the Nigeria Data Protection Act. Hanoled logs every download and erasure.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="rounded-lg border border-[#F04438]/30 bg-[#F04438]/10 p-3 text-sm text-[#F04438]">
              {error}
            </p>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#0B1220]">Download</h3>
            <p className="text-sm text-slate-500">
              One file with everything held about them here: profile and sign-in details, school records and exam answers.
            </p>
            <Button variant="outline" onClick={download} disabled={downloading} className="border-slate-200">
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Download their data
            </Button>
          </section>

          {canErase && (
            <section className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-[#0B1220]">Erase</h3>
              <p className="text-sm text-slate-500">
                Removes their name, contact details, date of birth, photo, clinic notes, messages and sign-in.
                Results, attendance and fee records stay without their name, as schools must keep them.
                This can&apos;t be undone.
              </p>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                placeholder="Reason (optional), e.g. request from parent on 30 Sept"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0B1220]"
              />
              <label className="block text-sm text-slate-600">
                Type <strong>ERASE</strong> to confirm
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  aria-label="Type ERASE to confirm"
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0B1220]"
                />
              </label>
            </section>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Close
            </Button>
            {canErase && (
              <Button
                onClick={erase}
                disabled={confirmText !== "ERASE" || erasing}
                className="bg-[#F04438] text-white hover:bg-[#F04438]/90"
              >
                {erasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                Erase their data
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

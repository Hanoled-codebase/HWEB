"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";

const CHOICES: Array<{ value: string; label: string }> = [
  { value: "off", label: "Never (keep until someone asks)" },
  { value: "3", label: "3 years after they leave" },
  { value: "5", label: "5 years after they leave" },
  { value: "7", label: "7 years after they leave" },
  { value: "10", label: "10 years after they leave" },
];

/**
 * How long the school keeps the personal data of people who have left
 * (Nigeria Data Protection Act: no longer than needed). Off until the school
 * chooses; after the period, HCORE anonymizes the person nightly, keeping
 * results and fee records without their name.
 */
export function DataRetentionCard({ orgId }: { orgId: string }) {
  const [saved, setSaved] = useState<string | null>(null);
  const [choice, setChoice] = useState("off");
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getPrivacySettings(orgId)
      .then(({ leaverRetentionYears }) => {
        if (cancelled) return;
        const value = leaverRetentionYears === null ? "off" : String(leaverRetentionYears);
        setSaved(value);
        setChoice(value);
      })
      .catch(() => !cancelled && setUnavailable(true));
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const save = async () => {
    setSaving(true);
    try {
      const { leaverRetentionYears } = await api.updatePrivacySettings(orgId, choice === "off" ? null : Number(choice));
      const value = leaverRetentionYears === null ? "off" : String(leaverRetentionYears);
      setSaved(value);
      toast.success(value === "off" ? "Leavers' data will be kept until someone asks." : `Leavers' data will be erased ${value} years after they leave.`);
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      toast.error(text === "Forbidden" ? "Only the school owner or an organization admin can change this." : text || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (unavailable) return null;

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-base sm:text-xl flex items-center text-[#0B1220]">
          <ShieldCheck className="h-5 w-5 text-[#1447E6] mr-2" />
          Data protection
        </CardTitle>
        <CardDescription>
          How long to keep the personal data of students, staff and parents who have left. After this, their names,
          contact details and sign-in are erased; results and fee records stay without their name.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          aria-label="Keep leavers' personal data"
          value={choice}
          disabled={saved === null}
          onChange={(event) => setChoice(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0B1220]"
        >
          {CHOICES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          onClick={save}
          disabled={saving || saved === null || choice === saved}
          className="bg-[#1447E6] text-white hover:bg-[#1447E6]/90"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
        <p className="text-xs text-slate-500 sm:ml-2">
          To answer a single request, open the person&apos;s page and use <strong>Personal data</strong>.
        </p>
      </CardContent>
    </Card>
  );
}

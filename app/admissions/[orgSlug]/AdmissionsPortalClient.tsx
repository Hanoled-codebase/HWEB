"use client";

import { useState, useEffect, useId, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Loader2,
  School,
  Search,
} from "lucide-react";
import { HSMS_BASE } from "@/lib/api";
import type { TenantBranding } from "@/lib/tenant-branding";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassLevelOption = { id: string; name: string; level: string | null };

type OrgAdmissionsInfo = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    currentTerm: string | null;
    currentAcademicYear: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  classLevels: ClassLevelOption[];
  applicationFeeNaira: number;
};

type ApplicationSummary = {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  status: string;
  feePaid?: boolean;
  classLevelName?: string | null;
  examDate?: string | null;
  examScore?: number | null;
  examPassMark?: number | null;
  canonicalAdmissionNumber?: string | null;
};

type FormValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  classLevelId: string;
  previousSchool: string;
  address: string;
};

const EMPTY_FORM: FormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  classLevelId: "",
  previousSchool: "",
  address: "",
};

const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pending Review", classes: "border-amber-200 bg-amber-50 text-amber-800" },
  reviewed: { label: "Under Review", classes: "border-blue-200 bg-blue-50 text-blue-800" },
  accepted: { label: "Accepted", classes: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  scheduled_for_exam: { label: "Exam Scheduled", classes: "border-blue-300 bg-blue-100 text-blue-900" },
  taken_exam: { label: "Exam Taken", classes: "border-blue-300 bg-blue-50 text-blue-800" },
  passed_exam: { label: "Passed Exam", classes: "border-emerald-300 bg-emerald-100 text-emerald-900" },
  rejected: { label: "Not Admitted", classes: "border-rose-200 bg-rose-50 text-rose-800" },
  enrolled: { label: "Enrolled", classes: "border-emerald-600 bg-emerald-600 text-white" },
};

function makeAdmissionRef(id: string): string {
  return `ADM-${new Date().getFullYear()}-${id.slice(0, 6).toUpperCase()}`;
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string | { message?: string }; message?: string };
    if (typeof body.error === "string") return body.error;
    if (body.error?.message) return body.error.message;
    if (body.message) return body.message;
  } catch {
    // ignore invalid json
  }
  return fallback;
}

export function AdmissionsPortalClient({
  orgSlug,
  initialBranding,
}: {
  orgSlug: string;
  initialBranding: TenantBranding | null;
}) {
  const searchParams = useSearchParams();
  const returnReference = searchParams.get("reference") || searchParams.get("trxref") || "";

  const [mode, setMode] = useState<"apply" | "status">("apply");
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [info, setInfo] = useState<OrgAdmissionsInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const loadingInfo = info === null && infoError === null;

  /* Application Form State */
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<ApplicationSummary | null>(null);

  /* Payment State */
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [verifiedPaid, setVerifiedPaid] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const verifyingFee = Boolean(returnReference) && step !== "done";

  /* Status Lookup State */
  const [lookupRef, setLookupRef] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<ApplicationSummary | null>(null);

  const formId = useId();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    fetch(`${HSMS_BASE}/admissions/info/${encodeURIComponent(orgSlug)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await readApiError(res, "School admissions page could not be found."));
        }
        const json = (await res.json()) as { data?: OrgAdmissionsInfo };
        if (!json.data) throw new Error("Unable to load school admissions configuration.");
        setInfo(json.data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setInfoError(err instanceof Error ? err.message : "Failed to load admissions information.");
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [orgSlug]);

  useEffect(() => {
    if (!returnReference) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    fetch(
      `${HSMS_BASE}/admissions/verify-fee/${encodeURIComponent(orgSlug)}?reference=${encodeURIComponent(returnReference)}`,
      { signal: controller.signal },
    )
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await readApiError(res, "Could not verify payment reference."));
        }
        const json = (await res.json()) as { data?: { paid: boolean; status: string } };
        setVerifiedPaid(Boolean(json.data?.paid));
        setStep("done");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setPayError(err instanceof Error ? err.message : "Payment verification failed.");
        setStep("done");
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [orgSlug, returnReference]);

  const schoolName = info?.organization.name || initialBranding?.name || "School Admissions";
  const schoolLogo = info?.organization.logo ?? initialBranding?.logo ?? null;
  const academicYear = info?.organization.currentAcademicYear;
  const feeAmount = info?.applicationFeeNaira ?? 5000;
  const primaryColor = initialBranding?.theme.primary ?? "#1447E6";
  const primaryFg = initialBranding?.theme.foreground ?? "#FFFFFF";

  const updateField = (field: keyof FormValues, val: string) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
      setDuplicateConflict(false);
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.firstName.trim()) errors.firstName = "First name is required";
    if (!values.lastName.trim()) errors.lastName = "Last name is required";
    if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = "Enter a valid email address";
    }
    if (!values.phone.trim() || values.phone.trim().length < 7) {
      errors.phone = "Enter a valid phone number";
    }
    if (info && info.classLevels.length > 0 && !values.classLevelId) {
      errors.classLevelId = "Select the class you are applying for";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setDuplicateConflict(false);

    try {
      const res = await fetch(`${HSMS_BASE}/admissions/apply/${encodeURIComponent(orgSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          middleName: values.middleName.trim() || undefined,
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          gender: values.gender || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
          classLevelId: values.classLevelId || undefined,
          previousSchool: values.previousSchool.trim() || undefined,
          address: values.address.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await readApiError(res, "Could not submit your application. Please try again.");
        if (res.status === 409) setDuplicateConflict(true);
        throw new Error(msg);
      }

      const json = (await res.json()) as {
        data: { id: string; firstName: string; lastName: string; status: string };
      };
      const selectedClass = info?.classLevels.find((c) => c.id === values.classLevelId)?.name ?? null;
      setSubmittedApp({
        id: json.data.id,
        reference: makeAdmissionRef(json.data.id),
        firstName: json.data.firstName,
        lastName: json.data.lastName,
        status: json.data.status,
        feePaid: false,
        classLevelName: selectedClass,
      });
      setStep("pay");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayFee(admissionId: string) {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch(`${HSMS_BASE}/admissions/pay-fee/${encodeURIComponent(orgSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ admissionId }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Payment initialization failed. Contact the school office."));
      }
      const json = (await res.json()) as { data?: { authorizationUrl?: string } };
      if (!json.data?.authorizationUrl) {
        throw new Error("Payment checkout link was not returned.");
      }
      window.location.href = json.data.authorizationUrl;
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Unable to start payment.");
      setPaying(false);
    }
  }

  async function handleStatusCheck(e: FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    if (!lookupRef.trim() || !lookupEmail.trim()) {
      setLookupError("Enter both your application reference and email address.");
      return;
    }

    setLookupLoading(true);
    try {
      const qs = new URLSearchParams({
        reference: lookupRef.trim(),
        email: lookupEmail.trim(),
      });
      const res = await fetch(
        `${HSMS_BASE}/admissions/status/${encodeURIComponent(orgSlug)}?${qs.toString()}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) {
        throw new Error(await readApiError(res, "No application matched that reference and email."));
      }
      const json = (await res.json()) as { data: ApplicationSummary };
      setLookupResult(json.data);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Unable to check admission status.");
    } finally {
      setLookupLoading(false);
    }
  }

  async function copyReference(refText: string) {
    try {
      await navigator.clipboard.writeText(refText);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  if (infoError && !info) {
    return (
      <div className="w-full max-w-lg rounded-[1.75rem] border border-slate-200/80 bg-white p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:rounded-[2rem] sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 font-heading text-xl font-bold text-slate-900">Admissions Page Unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{infoError}</p>
        <div className="mt-6">
          <Button asChild className="min-h-11 rounded-xl px-6">
            <Link href="/">Return to Hanoled</Link>
          </Button>
        </div>
      </div>
    );
  }

  const cardClass =
    "relative z-10 w-full max-w-2xl rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:rounded-[2rem] sm:p-10";

  return (
    <div className={cardClass}>
      {/* Branded School Header */}
      <div className="flex flex-col items-center text-center">
        {schoolLogo ? (
          <div className="mb-3 flex max-h-16 max-w-[200px] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={schoolLogo}
              alt={schoolName}
              className="max-h-16 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs"
            style={{ backgroundColor: primaryColor, color: primaryFg }}
          >
            <School className="h-6 w-6" aria-hidden="true" />
          </div>
        )}

        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[28px]">{schoolName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Online Admissions Portal{academicYear ? ` · ${academicYear} Session` : ""}
        </p>
      </div>

      {/* Mode Switcher */}
      {step === "form" && !verifyingFee && (
        <div role="tablist" aria-label="Admissions options" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            role="tab"
            type="button"
            aria-selected={mode === "apply"}
            onClick={() => setMode("apply")}
            className={`min-h-11 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${
              mode === "apply" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Apply for Admission
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === "status"}
            onClick={() => setMode("status")}
            className={`min-h-11 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${
              mode === "status" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Check Admission Status
          </button>
        </div>
      )}

      {/* Paystack Return Loading */}
      {verifyingFee && (
        <div className="my-10 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-800">Verifying your application fee payment…</p>
        </div>
      )}

      {/* Fee Verification Receipt */}
      {!verifyingFee && step === "done" && (
        <div className="mt-6 border-t border-slate-100 pt-6 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              verifiedPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {verifiedPaid ? (
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            ) : (
              <Clock className="h-7 w-7" aria-hidden="true" />
            )}
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            {verifiedPaid ? "Application Fee Confirmed" : "Payment Status Pending"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {verifiedPaid
              ? `Thank you! Your payment reference ${returnReference} has been verified and your application is now under review.`
              : payError || `Reference ${returnReference} is being processed. You can check status anytime using your application reference and email.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              onClick={() => {
                setStep("form");
                setMode("status");
                if (returnReference) setLookupRef(returnReference);
              }}
              className="min-h-11 rounded-xl px-6 font-bold"
              style={{ backgroundColor: primaryColor, color: primaryFg }}
            >
              Check Admission Status
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("form");
                setMode("apply");
              }}
              className="min-h-11 rounded-xl border-slate-300 px-5 font-semibold"
            >
              Submit Another Application
            </Button>
          </div>
        </div>
      )}

      {/* Mode: Apply */}
      {!verifyingFee && step === "form" && mode === "apply" && (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {submitError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium">{submitError}</p>
                  {duplicateConflict && (
                    <button
                      type="button"
                      onClick={() => {
                        setLookupEmail(values.email);
                        setMode("status");
                        setSubmitError(null);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2"
                    >
                      Already applied? Check status or pay fee <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-first`} className="text-xs font-bold text-slate-700">
                Student First Name *
              </Label>
              <Input
                id={`${formId}-first`}
                value={values.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                placeholder="e.g. Samuel"
                aria-invalid={Boolean(fieldErrors.firstName)}
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              />
              {fieldErrors.firstName && <p className="text-xs font-medium text-rose-600">{fieldErrors.firstName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-last`} className="text-xs font-bold text-slate-700">
                Student Last Name *
              </Label>
              <Input
                id={`${formId}-last`}
                value={values.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                placeholder="e.g. Adebayo"
                aria-invalid={Boolean(fieldErrors.lastName)}
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              />
              {fieldErrors.lastName && <p className="text-xs font-medium text-rose-600">{fieldErrors.lastName}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-middle`} className="text-xs font-bold text-slate-700">
                Middle Name
              </Label>
              <Input
                id={`${formId}-middle`}
                value={values.middleName}
                onChange={(e) => updateField("middleName", e.target.value)}
                placeholder="Optional"
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-class`} className="text-xs font-bold text-slate-700">
                Applying For Class {info?.classLevels.length ? "*" : ""}
              </Label>
              {loadingInfo ? (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
                  Loading classes…
                </div>
              ) : info?.classLevels && info.classLevels.length > 0 ? (
                <Select value={values.classLevelId} onValueChange={(v) => updateField("classLevelId", String(v ?? ""))}>
                  <SelectTrigger
                    id={`${formId}-class`}
                    aria-invalid={Boolean(fieldErrors.classLevelId)}
                    className="h-11 rounded-xl border-slate-300 bg-white text-slate-900"
                  >
                    <SelectValue placeholder="Choose class (e.g. JSS 1A)" />
                  </SelectTrigger>
                  <SelectContent>
                    {info.classLevels.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600">
                  Class assigned upon review
                </div>
              )}
              {fieldErrors.classLevelId && (
                <p className="text-xs font-medium text-rose-600">{fieldErrors.classLevelId}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-email`} className="text-xs font-bold text-slate-700">
                Parent / Guardian Email *
              </Label>
              <Input
                id={`${formId}-email`}
                type="email"
                value={values.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="parent@example.com"
                aria-invalid={Boolean(fieldErrors.email)}
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              />
              {fieldErrors.email && <p className="text-xs font-medium text-rose-600">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-phone`} className="text-xs font-bold text-slate-700">
                Parent / Guardian Phone *
              </Label>
              <Input
                id={`${formId}-phone`}
                type="tel"
                value={values.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+234 803 000 0000"
                aria-invalid={Boolean(fieldErrors.phone)}
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              />
              {fieldErrors.phone && <p className="text-xs font-medium text-rose-600">{fieldErrors.phone}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-gender`} className="text-xs font-bold text-slate-700">
                Gender
              </Label>
              <Select value={values.gender} onValueChange={(v) => updateField("gender", String(v ?? ""))}>
                <SelectTrigger id={`${formId}-gender`} className="h-11 rounded-xl border-slate-300 bg-white text-slate-900">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-dob`} className="text-xs font-bold text-slate-700">
                Date of Birth
              </Label>
              <Input
                id={`${formId}-dob`}
                type="date"
                value={values.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-prev`} className="text-xs font-bold text-slate-700">
                Previous School
              </Label>
              <Input
                id={`${formId}-prev`}
                value={values.previousSchool}
                onChange={(e) => updateField("previousSchool", e.target.value)}
                placeholder="Optional"
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-address`} className="text-xs font-bold text-slate-700">
                Residential Address
              </Label>
              <Input
                id={`${formId}-address`}
                value={values.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Optional"
                className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || loadingInfo}
            className="mt-2 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: primaryColor, color: primaryFg }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Submitting Application…
              </>
            ) : (
              <>
                Submit Application
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Application Submitted + Fee Payment */}
      {!verifyingFee && step === "pay" && submittedApp && (
        <div className="mt-6 space-y-5 border-t border-slate-100 pt-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Application Received</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Application for{" "}
              <strong className="text-slate-900">
                {submittedApp.firstName} {submittedApp.lastName}
              </strong>
              {submittedApp.classLevelName ? ` (${submittedApp.classLevelName})` : ""} is recorded.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Application Reference Number</p>
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900 select-all">{submittedApp.reference}</span>
              <button
                type="button"
                onClick={() => copyReference(submittedApp.reference)}
                aria-label="Copy application reference"
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                {copiedRef ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">Save this reference to check your admission status anytime.</p>
          </div>

          {payError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs font-medium text-rose-800">
              {payError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={paying}
              onClick={() => handlePayFee(submittedApp.id)}
              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: primaryColor, color: primaryFg }}
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Opening Paystack Checkout…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Pay Application Fee (₦{feeAmount.toLocaleString("en-NG")})
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setLookupRef(submittedApp.reference);
                setLookupEmail(values.email);
                setStep("form");
                setMode("status");
              }}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              I&apos;ll pay later — View my status tracker
            </button>
          </div>
        </div>
      )}

      {/* Mode: Check Admission Status */}
      {!verifyingFee && step === "form" && mode === "status" && (
        <div className="mt-6 space-y-5">
          <form onSubmit={handleStatusCheck} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-ref`} className="text-xs font-bold text-slate-700">
                  Application Reference *
                </Label>
                <Input
                  id={`${formId}-ref`}
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  placeholder="e.g. ADM-2026-A1B2C3"
                  className="h-11 rounded-xl border-slate-300 bg-white font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-status-email`} className="text-xs font-bold text-slate-700">
                  Email Used to Apply *
                </Label>
                <Input
                  id={`${formId}-status-email`}
                  type="email"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="h-11 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
                />
              </div>
            </div>

            {lookupError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>{lookupError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={lookupLoading}
              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
              style={{ backgroundColor: primaryColor, color: primaryFg }}
            >
              {lookupLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Checking Status…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Check Admission Status
                </>
              )}
            </button>
          </form>

          {lookupResult && (
            <div className="space-y-4 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-600">{lookupResult.reference}</p>
                  <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                    {lookupResult.firstName} {lookupResult.lastName}
                  </h3>
                  {lookupResult.classLevelName && (
                    <p className="mt-0.5 text-xs font-medium text-slate-600">
                      Applied class: {lookupResult.classLevelName}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                    STATUS_BADGES[lookupResult.status]?.classes ?? "border-slate-200 bg-slate-100 text-slate-800"
                  }`}
                >
                  {STATUS_BADGES[lookupResult.status]?.label ?? lookupResult.status}
                </span>
              </div>

              <dl className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-slate-600">Application Fee</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {lookupResult.feePaid ? "Paid" : "Unpaid"}
                  </dd>
                </div>
                {lookupResult.examDate && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Entrance Exam Date
                    </dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">
                      {new Date(lookupResult.examDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                )}
                {lookupResult.examScore !== null && lookupResult.examScore !== undefined && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-600">Exam Score</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">
                      {lookupResult.examScore}
                      {lookupResult.examPassMark ? ` / pass mark ${lookupResult.examPassMark}` : ""}
                    </dd>
                  </div>
                )}
                {lookupResult.canonicalAdmissionNumber && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                      <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> Student Admission Number
                    </dt>
                    <dd className="mt-0.5 font-mono font-bold text-slate-900">
                      {lookupResult.canonicalAdmissionNumber}
                    </dd>
                  </div>
                )}
              </dl>

              {!lookupResult.feePaid && lookupResult.status !== "rejected" && (
                <div className="space-y-2 pt-1">
                  {payError && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                      {payError}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={paying}
                    onClick={() => handlePayFee(lookupResult.id)}
                    className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold shadow-xs transition-opacity hover:opacity-95 disabled:opacity-60 sm:text-sm"
                    style={{ backgroundColor: primaryColor, color: primaryFg }}
                  >
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    {paying ? "Opening Checkout…" : `Pay Application Fee (₦${feeAmount.toLocaleString("en-NG")})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer / School Portal Links */}
      <div className="mt-7 border-t border-slate-100 pt-5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-600">
          <Link
            href={`/signin/student?school=${encodeURIComponent(orgSlug)}`}
            className="inline-flex min-h-9 items-center gap-1 hover:text-slate-900 hover:underline"
          >
            Student Sign In <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <Link
            href={`/signin/parent?school=${encodeURIComponent(orgSlug)}`}
            className="inline-flex min-h-9 items-center gap-1 hover:text-slate-900 hover:underline"
          >
            Parent Sign In <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <Link
            href={`/signin/staff?school=${encodeURIComponent(orgSlug)}`}
            className="inline-flex min-h-9 items-center gap-1 hover:text-slate-900 hover:underline"
          >
            Staff Sign In <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <span>Powered by</span>
          <Link href="/" className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-slate-900">
            <HanoledLogo size="sm" variant="blue" iconOnly />
            <span>Hanoled</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

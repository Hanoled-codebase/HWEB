"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type Outcome = "checking" | "paid" | "incomplete" | "failed" | "unknown";

// Statuses Paystack and Monnify report for a payment that may still complete.
const STILL_OPEN = new Set(["abandoned", "pending", "ongoing", "processing", "queued", "PENDING", "PARTIALLY_PAID"]);

/** What the payer is told for a provider status from GET /payments/verify. */
export function paymentOutcome(status: string | undefined): "paid" | "incomplete" | "failed" {
  if (status === "success") return "paid";
  if (status && STILL_OPEN.has(status)) return "incomplete";
  return "failed";
}

const COPY: Record<Exclude<Outcome, "checking">, { title: string; body: string }> = {
  paid: {
    title: "Payment received",
    body: "The provider has confirmed your payment. The invoice will show as paid within a minute.",
  },
  incomplete: {
    title: "Payment not completed",
    body: "The provider hasn't received this payment. If money left your account, it can take a few minutes to confirm; check the invoice again shortly.",
  },
  failed: {
    title: "Payment failed",
    body: "The provider reports this payment didn't go through. No invoice was marked paid. You can try again from the invoice.",
  },
  unknown: {
    title: "We couldn't confirm this payment here",
    body: "Check the invoice in your dashboard; it updates once the school's payment provider confirms the payment.",
  },
};

function PaymentVerifyContent({ orgSlug }: { orgSlug?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Paystack returns `reference` (and `trxref`); Monnify returns `paymentReference`.
  const reference =
    searchParams.get("reference") || searchParams.get("trxref") || searchParams.get("paymentReference");
  const [outcome, setOutcome] = useState<Outcome>(reference && orgSlug ? "checking" : "unknown");

  useEffect(() => {
    if (!reference || !orgSlug) return;
    let cancelled = false;
    apiFetch<{ status?: string }>(
      `/payments/verify/${encodeURIComponent(orgSlug)}/${encodeURIComponent(reference)}`,
      { showErrorToast: false },
    )
      .then(({ status }) => {
        if (!cancelled) setOutcome(paymentOutcome(status));
      })
      .catch(() => {
        if (!cancelled) setOutcome("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [reference, orgSlug]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 p-10 text-center" aria-live="polite">
          {outcome === "checking" ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-[#1447E6]" />
              <div>
                <h1 className="text-xl font-bold text-[#0B1220]">Checking your payment</h1>
                <p className="mt-2 text-sm text-slate-500">Asking the payment provider for the result…</p>
              </div>
            </>
          ) : (
            <>
              {outcome === "paid" && <CheckCircle2 className="h-12 w-12 text-[#12B76A]" />}
              {outcome === "incomplete" && <Clock className="h-12 w-12 text-[#F5A623]" />}
              {outcome === "failed" && <XCircle className="h-12 w-12 text-[#F04438]" />}
              {outcome === "unknown" && <Clock className="h-12 w-12 text-slate-400" />}
              <div>
                <h1 className="text-xl font-bold text-[#0B1220]">{COPY[outcome].title}</h1>
                <p className="mt-2 text-sm text-slate-500">{COPY[outcome].body}</p>
                {reference && <p className="mt-3 font-mono text-xs text-slate-400">Reference: {reference}</p>}
              </div>
              <Button className="bg-[#1447E6] text-white hover:bg-[#1447E6]/90" onClick={() => router.push("/dashboard")}>
                Go to dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

/** Where Paystack and Monnify send the payer back after checkout. */
export function PaymentVerify({ orgSlug }: { orgSlug?: string }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#1447E6]" />
        </main>
      }
    >
      <PaymentVerifyContent orgSlug={orgSlug} />
    </Suspense>
  );
}

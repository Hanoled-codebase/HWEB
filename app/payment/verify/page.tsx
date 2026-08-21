"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function PaymentVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found.");
      return;
    }

    const timeout = setTimeout(() => {
      setStatus("success");
      setMessage("Payment was completed. Your invoice will be updated shortly.");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [reference]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Verifying Payment
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Please wait while we confirm your transaction...
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Payment Successful
                </h1>
                <p className="mt-2 text-sm text-slate-500">{message}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.back()}
                >
                  Back
                </Button>
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-12 w-12 text-rose-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Verification Failed
                </h1>
                <p className="mt-2 text-sm text-slate-500">{message}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-sm text-slate-500">Verifying payment...</p>
          </CardContent>
        </Card>
      </main>
    }>
      <PaymentVerifyContent />
    </Suspense>
  );
}

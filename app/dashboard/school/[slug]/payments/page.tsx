"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Save,
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const gatewaySchema = z.object({
  publicKey: z.string().min(1, "Public key is required"),
  secretKey: z.string().min(1, "Secret key is required"),
});

type GatewayData = {
  id?: string;
  provider: string;
  publicKey: string;
  isLive: boolean;
  isActive: boolean;
};

type Transaction = {
  id: string;
  reference: string;
  amount: number;
  channel: string;
  status: string;
  createdAt: string;
  invoice: {
    student: { firstName: string; lastName: string };
  };
};

export default function PaymentsPage() {
  const { currentOrg } = useOrganization();
  const [gateway, setGateway] = useState<GatewayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const form = useForm<z.infer<typeof gatewaySchema>>({
    resolver: zodResolver(gatewaySchema),
    defaultValues: { publicKey: "", secretKey: "" },
  });

  useEffect(() => {
    if (!currentOrg) return;
    fetchGateway();
    fetchHistory();
  }, [currentOrg]);

  async function fetchGateway() {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const data = await apiFetch<GatewayData>(
        `/payments/gateway/${currentOrg.slug}`,
      );
      setGateway(data);
      if (data.isActive) {
        form.reset({ publicKey: data.publicKey, secretKey: "" });
      }
    } catch { /* apiFetch handles toast */ } finally {
      setLoading(false);
    }
  }

  async function fetchHistory() {
    if (!currentOrg) return;
    try {
      const data = await apiFetch<Transaction[]>(
        `/payments/history/${currentOrg.slug}`,
      );
      setTransactions(data);
    } catch { /* ignore */ } finally {
      setTxLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof gatewaySchema>) {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const data = await apiFetch<GatewayData>(
        `/payments/gateway/${currentOrg.slug}`,
        {
          method: "POST",
          body: JSON.stringify({
            publicKey: values.publicKey,
            secretKey: values.secretKey,
            isLive: false,
          }),
        },
      );
      setGateway(data);
      toast.success("Payment gateway saved");
    } catch { /* apiFetch handles toast */ } finally {
      setSaving(false);
    }
  }

  if (!currentOrg) return null;

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payment Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure your Paystack gateway for fee collection.
          </p>
        </div>

        {loading ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Paystack Gateway
                  </CardTitle>
                  <CardDescription>
                    Enter your Paystack API keys from the{" "}
                    <a
                      href="https://dashboard.paystack.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline underline-offset-2"
                    >
                      Paystack Dashboard
                    </a>
                  </CardDescription>
                </div>
                {gateway?.isActive && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      gateway.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500",
                    )}
                  >
                    {gateway.isActive ? (
                      <><CheckCircle2 className="mr-1 h-3 w-3" /> Configured</>
                    ) : (
                      <><XCircle className="mr-1 h-3 w-3" /> Not configured</>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="publicKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Key</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="pk_live_xxxxxxxxxxxx"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Found in Paystack Dashboard → Settings → API Keys &amp; Webhooks
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showSecret ? "text" : "password"}
                              placeholder="sk_live_xxxxxxxxxxxx"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showSecret ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Secret key is never shown after saving.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <strong>Test mode:</strong> Use test keys from Paystack
                    dashboard. Set to live keys only after verifying payments
                    work correctly.
                  </div>

                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Gateway
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Webhook URL */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Webhook URL</CardTitle>
            <CardDescription>
              Add this URL to your Paystack dashboard for automatic payment
              verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <code className="flex-1 break-all text-sm text-slate-700">
                {typeof window !== "undefined" &&
                  `${window.location.origin}/api/payments/webhook/${currentOrg.slug}`}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/api/payments/webhook/${currentOrg.slug}`,
                  );
                  toast.success("Copied");
                }}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription>
              Last 50 payment transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No transactions yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {tx.invoice?.student?.firstName}{" "}
                        {tx.invoice?.student?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{tx.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        ₦{Number(tx.amount).toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-0.5 rounded-full px-2 py-0 text-[11px] font-medium",
                          tx.status === "SUCCESS"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : tx.status === "PENDING"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-rose-200 bg-rose-50 text-rose-700",
                        )}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

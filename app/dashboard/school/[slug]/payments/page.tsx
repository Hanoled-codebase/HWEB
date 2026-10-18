"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { ComingSoonCard } from "@/components/dashboard/ComingSoon";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PaymentsLedger } from "@/components/dashboard/finance/PaymentsLedger";

const paystackSchema = z.object({
  publicKey: z.string().min(1, "Public key is required"),
  secretKey: z.string().min(1, "Secret key is required"),
});

const monnifySchema = z.object({
  bankCode: z.string().min(1, "Select a bank"),
  accountNumber: z.string().min(10, "Enter a valid account number").max(10, "Enter a valid account number"),
  email: z.string().email("Enter a valid email"),
});

type GatewayData = {
  id?: string;
  provider: string;
  publicKey?: string | null;
  isLive: boolean;
  isActive: boolean;
  subAccountCode?: string | null;
  settlementBankName?: string | null;
  settlementAccountNumber?: string | null;
  settlementAccountName?: string | null;
};

type Bank = { name: string; code: string };

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


// MVP LAUNCH (PARKED — read me, agent!)
// The full implementation below is deliberately gated behind PARKED_FOR_MVP
// while Hanoled goes live with version one. It is NOT dead code: flip the
// flag to false to restore this surface. Search "MVP_LAUNCH" repo-wide to
// find every parked feature.
// ─────────────────────────────────────────────────────────────────────────────
const PARKED_FOR_MVP = true;
export default function PaymentsPage() {
  if (PARKED_FOR_MVP) {
    return (
      <ComingSoonCard
        title="School fees payments are coming soon"
        blurb="Recording fee payments, receipts and the payments ledger arrives in the next release. Use the bursary's existing process for now."
        backHref="/welcome"
      />
    );
  }
  return <PaymentsPageLive />;
}

function PaymentsPageLive() {
// ─────────────────────────────────────────────────────────────────────────────
  const { currentOrg, currentMember } = useOrganization();
  const isPrivileged = currentMember?.role === "owner" || currentMember?.role === "admin";
  const [gateway, setGateway] = useState<GatewayData | null>(null);
  const [providerTab, setProviderTab] = useState<"paystack" | "monnify">("paystack");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const paystackForm = useForm<z.infer<typeof paystackSchema>>({
    resolver: zodResolver(paystackSchema),
    defaultValues: { publicKey: "", secretKey: "" },
  });

  const monnifyForm = useForm<z.infer<typeof monnifySchema>>({
    resolver: zodResolver(monnifySchema),
    defaultValues: { bankCode: "", accountNumber: "", email: "" },
  });

  useEffect(() => {
    // Gateway settings are admin-only; everyone else gets the ledger view.
    if (!currentOrg || !isPrivileged) return;
    fetchGateway();
    fetchHistory();
  }, [currentOrg, isPrivileged]);

  useEffect(() => {
    if (providerTab !== "monnify" || banks.length > 0) return;
    fetchBanks();
  }, [providerTab]);

  async function fetchGateway() {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const data = await apiFetch<GatewayData>(
        `/payments/gateway/${currentOrg.slug}`,
      );
      setGateway(data);
      if (data.isActive && (data.provider === "paystack" || data.provider === "monnify")) {
        setProviderTab(data.provider);
      }
      if (data.isActive && data.provider === "paystack") {
        paystackForm.reset({ publicKey: data.publicKey || "", secretKey: "" });
      }
    } catch { /* apiFetch handles toast */ } finally {
      setLoading(false);
    }
  }

  async function fetchBanks() {
    if (!currentOrg) return;
    try {
      setBanksLoading(true);
      const data = await apiFetch<Bank[]>(`/payments/monnify/banks/${currentOrg.slug}`);
      setBanks(data);
    } catch { /* apiFetch handles toast */ } finally {
      setBanksLoading(false);
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

  async function onSubmitPaystack(values: z.infer<typeof paystackSchema>) {
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

  async function onSubmitMonnify(values: z.infer<typeof monnifySchema>) {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const data = await apiFetch<GatewayData>(
        `/payments/gateway/${currentOrg.slug}/monnify-subaccount`,
        {
          method: "POST",
          body: JSON.stringify(values),
        },
      );
      setGateway(data);
      toast.success(`Settlement account saved: ${data.settlementAccountName}`);
    } catch { /* apiFetch handles toast */ } finally {
      setSaving(false);
    }
  }

  if (!currentOrg) return null;

  if (!isPrivileged) {
    return <PaymentsLedger slug={currentOrg.slug} />;
  }

  const isConfigured = gateway?.isActive && gateway.provider === providerTab;

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      {/* Phones lead with money in (transactions); gateway keys and webhook sit below. */}
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Payment Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure a payment gateway for fee collection.
            </p>
          </div>
          <Button asChild variant="outline" className="h-12 w-full rounded-xl border-slate-200 bg-white font-semibold md:h-11 md:w-auto">
            <Link href={`/dashboard/school/${currentOrg.slug}/payments/record`}>
              <Banknote className="mr-2 h-4 w-4" /> Record a cash or transfer payment
            </Link>
          </Button>
        </div>

        {loading ? (
          <Card className="border-slate-200 shadow-sm max-md:order-2">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm max-md:order-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Payment Gateway
                  </CardTitle>
                  <CardDescription>
                    Choose a provider to collect fees for this school.
                  </CardDescription>
                </div>
                {isConfigured && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Select value={providerTab} onValueChange={(v) => setProviderTab(v as "paystack" | "monnify")}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paystack">Paystack</SelectItem>
                  <SelectItem value="monnify">Monnify</SelectItem>
                </SelectContent>
              </Select>

              {providerTab === "paystack" ? (
                <Form {...paystackForm}>
                  <form onSubmit={paystackForm.handleSubmit(onSubmitPaystack)} className="space-y-5">
                    <p className="text-sm text-slate-500">
                      Enter your own Paystack API keys from the{" "}
                      <a
                        href="https://dashboard.paystack.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline underline-offset-2"
                      >
                        Paystack Dashboard
                      </a>
                      . Payments go straight to your Paystack account.
                    </p>

                    <FormField
                      control={paystackForm.control}
                      name="publicKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Public Key</FormLabel>
                          <FormControl>
                            <Input placeholder="pk_live_xxxxxxxxxxxx" {...field} />
                          </FormControl>
                          <FormDescription>
                            Found in Paystack Dashboard → Settings → API Keys &amp; Webhooks
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={paystackForm.control}
                      name="secretKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secret Key</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showSecret ? "text" : "password"}
                                placeholder="sk_live_xxxxxxxxxxxx"
                                autoComplete="off"
                                className="pr-12"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                                className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700"
                              >
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormDescription>Secret key is never shown after saving.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <strong>Test mode:</strong> Use test keys from Paystack dashboard. Set to
                      live keys only after verifying payments work correctly.
                    </div>

                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Gateway
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...monnifyForm}>
                  <form onSubmit={monnifyForm.handleSubmit(onSubmitMonnify)} className="space-y-5">
                    <p className="text-sm text-slate-500">
                      Payments are processed through Hanoled&apos;s Monnify contract. Add your
                      school&apos;s bank account below and your share of every payment settles
                      there directly — Hanoled only keeps a small platform commission.
                    </p>

                    {gateway?.provider === "monnify" && gateway.settlementAccountName && (
                      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          Currently settling to <strong>{gateway.settlementAccountName}</strong>{" "}
                          — {gateway.settlementBankName} ({gateway.settlementAccountNumber})
                        </div>
                      </div>
                    )}

                    <FormField
                      control={monnifyForm.control}
                      name="bankCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder={banksLoading ? "Loading banks…" : "Select your bank"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {banks.map((bank) => (
                                <SelectItem key={bank.code} value={bank.code}>
                                  {bank.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={monnifyForm.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="0123456789" maxLength={10} {...field} />
                          </FormControl>
                          <FormDescription>The school&apos;s NUBAN account, 10 digits.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={monnifyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Settlement Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="finance@school.edu" {...field} />
                          </FormControl>
                          <FormDescription>Used by Monnify for settlement notifications.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Verify &amp; Save Settlement Account
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Webhook URL */}
        <Card className="border-slate-200 shadow-sm max-md:order-2">
          <CardHeader>
            <CardTitle className="text-base">Webhook URL</CardTitle>
            <CardDescription>
              {providerTab === "monnify" ? (
                <>This is already registered on Hanoled&apos;s Monnify contract — nothing to add here.</>
              ) : (
                <>Add this URL to your Paystack dashboard for automatic payment verification.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <code className="flex-1 break-all text-sm text-slate-700">
                {typeof window !== "undefined" &&
                  (providerTab === "monnify"
                    ? `${window.location.origin}/api/billing/webhooks/monnify`
                    : `${window.location.origin}/api/payments/webhook/${currentOrg.slug}`)}
              </code>
              {providerTab === "paystack" && (
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="border-slate-200 shadow-sm max-md:order-1">
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
              <p className="py-6 text-center text-sm text-slate-500">
                No online payments yet. Cash and transfer payments you record show on each student's invoice.
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
                      <p className="truncate text-xs text-slate-500">{tx.reference}</p>
                    </div>
                    <div className="shrink-0 pl-3 text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900">
                        ₦{Number(tx.amount).toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-0.5 rounded-full px-2 py-0 text-xs font-medium capitalize",
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

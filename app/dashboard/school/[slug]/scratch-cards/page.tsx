"use client";

import { useState, useEffect, Fragment } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityHeader } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Printer,
  AlertTriangle,
  Loader2,
  Package,
} from "lucide-react";

type PrintableCard = {
  serial: string;
  pin: string;
};

type BatchCard = {
  id: string;
  serialNumber: string;
  isUsed: boolean;
  usedAt: string | null;
};

type Batch = {
  id: string;
  batchCode: string;
  term: string;
  cardsCreated: number;
  costPerCard: number;
  createdAt: string;
  cards: BatchCard[];
};

type ValidationResult = {
  valid: boolean;
  cardId?: string;
  serialNumber?: string;
  error?: string;
};

export default function ScratchCardsPage() {
  const { currentOrg, currentMember } = useOrganization();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [term, setTerm] = useState("");
  const [cardCount, setCardCount] = useState(1);
  const [costPerCard, setCostPerCard] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [printableCards, setPrintableCards] = useState<PrintableCard[]>([]);
  const [lastBatchCode, setLastBatchCode] = useState("");

  const [validatePin, setValidatePin] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const { can } = usePermissions();
  // Follows what this school lets the viewer's role do (Settings → Staff access).
  const canSellCards = can("scratch_cards.manage");

  useEffect(() => {
    if (!currentOrg) return;
    fetchBatches();
  }, [currentOrg]);

  async function fetchBatches() {
    if (!currentOrg) return;
    try {
      setIsLoading(true);
      const data = await apiFetch<Batch[]>(
        `/scratch-cards/${currentOrg.slug}/batches`,
      );
      setBatches(data);
    } catch {
      // apiFetch already toasts errors
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateBatch() {
    if (!currentOrg || !canSellCards) return;
    if (!term.trim()) {
      toast.error("Term is required");
      return;
    }
    if (cardCount < 1) {
      toast.error("Card count must be at least 1");
      return;
    }

    setIsCreating(true);
    try {
      const result = await apiFetch<{ batch: Batch; printableCards: PrintableCard[] }>(
        `/scratch-cards/${currentOrg.slug}/batches`,
        {
          method: "POST",
          body: JSON.stringify({
            term: term.trim(),
            cardCount,
            costPerCard,
          }),
        },
      );
      setBatches([result.batch, ...batches]);
      setPrintableCards(result.printableCards);
      setLastBatchCode(result.batch.batchCode);
      setPinDialogOpen(true);
      setTerm("");
      setCardCount(1);
      setCostPerCard(0);
      toast.success("Batch created successfully");
    } catch {
      // apiFetch already toasts errors
    } finally {
      setIsCreating(false);
    }
  }

  async function handleValidatePin() {
    if (!currentOrg) return;
    if (!validatePin.trim()) {
      toast.error("Enter a PIN to validate");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    try {
      const result = await apiFetch<ValidationResult>(
        `/scratch-cards/${currentOrg.slug}/validate`,
        {
          method: "POST",
          body: JSON.stringify({ pin: validatePin.trim() }),
        },
      );
      setValidationResult(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid or already used PIN";
      setValidationResult({ valid: false, error: message });
    } finally {
      setIsValidating(false);
    }
  }

  if (!currentOrg || !currentMember) return null;

  if (!canSellCards) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="bg-slate-100 p-4 rounded-full">
          <ShieldAlert className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h2 className="text-base sm:text-xl font-semibold text-slate-900">
            Access Denied
          </h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            You do not have permission to manage scratch cards. Only administrators
            and owners have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    // Phones: the batches you already have come first, then checking a PIN, then making a new batch.
    <div className="flex flex-col gap-4 md:block md:space-y-6">
      <EntityHeader
        title="Scratch Cards"
        subtitle="Generate, view, and validate scratch card PINs for student access."
      />

      {/* Section 1 — Create Batch */}
      <Card className="border-slate-200 shadow-sm max-md:order-3">
        <CardHeader className="bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Create New Batch</CardTitle>
          </div>
          <CardDescription>
            Generate a new set of scratch card PINs for an academic term.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Academic Term
              </label>
              <Input
                placeholder="e.g. 2025/2026-TERM1"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Card Count
              </label>
              <Input
                type="number"
                min={1}
                value={cardCount}
                onChange={(e) => setCardCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Cost Per Card (NGN)
              </label>
              <Input
                type="number"
                min={0}
                value={costPerCard}
                onChange={(e) => setCostPerCard(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isCreating}
                onClick={handleCreateBatch}
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                Generate Batch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Batch List */}
      <Card className="border-slate-200 shadow-sm max-md:order-1">
        <CardHeader className="bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Batch List</CardTitle>
          </div>
          <CardDescription>
            All generated scratch card batches for this school.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!isLoading && batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-500 py-12 px-4 text-center">
              <CreditCard className="h-10 w-10 mb-4 text-slate-300" />
              <p>No batches created yet.</p>
              <p className="text-sm">
                Use the form above to generate your first batch of scratch
                cards.
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Batch Code</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Cards</TableHead>
                  <TableHead>Cost / Card</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[140px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  batches.map((batch) => (
                    <Fragment key={batch.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-slate-50/50"
                        onClick={() =>
                          setExpandedBatchId(
                            expandedBatchId === batch.id ? null : batch.id,
                          )
                        }
                      >
                        <TableCell>
                          {expandedBatchId === batch.id ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-slate-900">
                          {batch.batchCode}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {batch.term}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {batch.cardsCreated}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          ₦{batch.costPerCard.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {format(new Date(batch.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                      {expandedBatchId === batch.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-slate-50/50 p-0">
                            <div className="px-10 py-4">
                              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                Cards in this batch
                              </h4>
                              {batch.cards.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                  No card data available.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-md border border-slate-200">
                                  <table className="min-w-[400px] w-full text-left text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-white">
                                        <th className="px-4 py-2.5 font-semibold text-slate-600">
                                          Serial
                                        </th>
                                        <th className="px-4 py-2.5 font-semibold text-slate-600">
                                          Status
                                        </th>
                                        <th className="px-4 py-2.5 font-semibold text-slate-600">
                                          Used At
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {batch.cards.map((card) => (
                                        <tr key={card.id}>
                                          <td className="px-4 py-2.5 font-mono text-xs text-slate-800">
                                            {card.serialNumber}
                                          </td>
                                          <td className="px-4 py-2.5">
                                            {card.isUsed ? (
                                              <Badge
                                                variant="outline"
                                                className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                              >
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Used
                                              </Badge>
                                            ) : (
                                              <Badge
                                                variant="outline"
                                                className="bg-slate-50 text-slate-600 border-slate-200"
                                              >
                                                Unused
                                              </Badge>
                                            )}
                                          </td>
                                          <td className="px-4 py-2.5 text-slate-500 text-xs">
                                            {card.usedAt
                                              ? format(new Date(card.usedAt), "MMM d, yyyy")
                                              : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Validate PIN */}
      <Card className="border-slate-200 shadow-sm max-md:order-2">
        <CardHeader className="bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Validate PIN</CardTitle>
          </div>
          <CardDescription>
            Check whether a scratch card PIN is valid and unused.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-3 items-end">
            <div className="space-y-2 flex-1 max-w-xs">
              <label className="text-sm font-medium text-slate-700">
                Scratch Card PIN
              </label>
              <Input
                placeholder="Enter 10-digit PIN"
                value={validatePin}
                onChange={(e) => {
                  setValidatePin(e.target.value);
                  setValidationResult(null);
                }}
              />
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isValidating}
              onClick={handleValidatePin}
            >
              {isValidating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Validate
            </Button>
          </div>

          {validationResult && (
            <div
              className={cn(
                "mt-4 flex items-start gap-3 rounded-lg border p-4",
                validationResult.valid
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-red-200 bg-red-50/50",
              )}
            >
              {validationResult.valid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              )}
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    validationResult.valid
                      ? "text-emerald-800"
                      : "text-red-800",
                  )}
                >
                  {validationResult.valid
                    ? "Valid PIN"
                    : "Invalid PIN"}
                </p>
                <p
                  className={cn(
                    "text-sm mt-1",
                    validationResult.valid
                      ? "text-emerald-700"
                      : "text-red-700",
                  )}
                >
                  {validationResult.valid
                    ? `Serial: ${validationResult.serialNumber}`
                    : validationResult.error}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PIN Display Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              Batch Created: {lastBatchCode}
            </DialogTitle>
            <DialogDescription>
              Scratch cards have been generated. Copy these PINs now — they will
              <strong> never be shown again</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Warning: One-time display only</p>
              <p className="mt-1 text-amber-700">
                These PINs are shown only once and are not stored in plain text.
                Save them securely before closing this dialog.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-[480px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Serial Number</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">PIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {printableCards.map((card, idx) => (
                  <tr key={card.serial} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-800">
                      {card.serial}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm font-bold tracking-wider text-slate-900">
                      {card.pin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

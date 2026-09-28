"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { DataStateCard } from "@/components/dashboard/shared";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Plus, Pencil, Trash2, Receipt, Users, DollarSign, FileText, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const feeItemSchema = z.object({
  name: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  amount: z.coerce.number().min(1, "Required"),
  frequency: z.enum(["termly", "annually", "one_time"]),
  classLevelId: z.string().optional(),
  isOptional: z.boolean().optional(),
});

type ClassLevel = { id: string; name: string };
type FeeItem = {
  id: string; name: string; category: string; amount: number;
  frequency: string; classLevel: { id: string; name: string } | null;
  isOptional: boolean; isActive: boolean;
};

export default function FeeStructurePage() {
  const { currentOrg } = useOrganization();
  const { can } = usePermissions();
  // Follows what this school lets the viewer's role do (Settings → Staff access).
  const canEditFees = can("fee_structure.edit");
  const [items, setItems] = useState<FeeItem[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<FeeItem | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [tab, setTab] = useState("items");
  const [actionClass, setActionClass] = useState("");
  const [actionTerm, setActionTerm] = useState("Term 1");
  const [actionYear, setActionYear] = useState("2026/2027");
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [actionBusy, setActionBusy] = useState(false);

  const form = useForm({
    resolver: zodResolver(feeItemSchema) as any,
    defaultValues: { name: "", category: "tuition", amount: 0, frequency: "termly", classLevelId: "", isOptional: false },
  });

  useEffect(() => { if (!currentOrg) return; fetchClassLevels(); fetchItems(); }, [currentOrg, filterCategory]);

  async function fetchClassLevels() {
    if (!currentOrg) return;
    try { const d = await apiFetch<ClassLevel[]>(`/classes/${currentOrg.slug}`); setClassLevels(Array.isArray(d) ? d : []); } catch { /* */ }
  }

  async function fetchItems() {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      const res = await apiFetch<FeeItem[]>(`/fee-structure/items/${currentOrg.slug}?${params}`);
      setItems(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { /* */ } finally { setLoading(false); }
  }

  async function onSubmit(values: any) {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const body = { ...values, classLevelId: values.classLevelId || null };
      if (editItem) {
        await apiFetch(`/fee-structure/items/${currentOrg.slug}/${editItem.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Updated");
      } else {
        await apiFetch(`/fee-structure/items/${currentOrg.slug}`, { method: "POST", body: JSON.stringify(body) });
        toast.success("Created");
      }
      setDialogOpen(false); setEditItem(null); form.reset(); fetchItems();
    } catch { /* */ } finally { setSaving(false); }
  }

  async function deleteItem(id: string) {
    if (!currentOrg) return;
    try { await apiFetch(`/fee-structure/items/${currentOrg.slug}/${id}`, { method: "DELETE" }); toast.success("Deleted"); fetchItems(); } catch { /* */ }
  }

  function openEdit(item: FeeItem) {
    setEditItem(item);
    form.reset({
      name: item.name, category: item.category, amount: item.amount,
      frequency: item.frequency, classLevelId: item.classLevel?.id || "",
      isOptional: item.isOptional,
    });
    setDialogOpen(true);
  }

  const categoryColors: Record<string, string> = {
    tuition: "border-blue-200 bg-blue-50 text-blue-700",
    boarding: "border-purple-200 bg-purple-50 text-purple-700",
    transport: "border-amber-200 bg-amber-50 text-amber-700",
    library: "border-green-200 bg-green-50 text-green-700",
    uniform: "border-pink-200 bg-pink-50 text-pink-700",
    other: "border-slate-200 bg-slate-50 text-slate-600",
  };

  if (!currentOrg) return null;

  if (!canEditFees) {
    return (
      <div className="min-h-full bg-slate-50/60 pb-10">
        <div className="mx-auto max-w-5xl p-6">
          <DataStateCard
            variant="forbidden"
            title="Fee structure isn&apos;t available to your role"
            description="This is managed by the school&apos;s admin team."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="hidden min-w-0 md:block">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Fee Structure</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Manage fee items and generate invoices.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditItem(null); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="h-11 w-full shrink-0 bg-blue-600 font-semibold hover:bg-blue-700 md:h-9 md:w-auto md:px-4"><Plus className="mr-2 h-4 w-4" />New fee item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit" : "New"} Fee Item</DialogTitle>
                <DialogDescription className="sr-only">Form to manage school fee structures and items.</DialogDescription>
              </DialogHeader>
              <Form {...form as any}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g. Tuition Fee" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category</FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="tuition">Tuition</SelectItem>
                          <SelectItem value="boarding">Boarding</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="library">Library</SelectItem>
                          <SelectItem value="uniform">Uniform</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="frequency" render={({ field }) => (
                      <FormItem><FormLabel>Frequency</FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="termly">Termly</SelectItem><SelectItem value="annually">Annually</SelectItem><SelectItem value="one_time">One Time</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount (₦)</FormLabel><FormControl><Input type="number" min={1} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="classLevelId" render={({ field }) => (
                      <FormItem><FormLabel>Class <span className="text-slate-400">(optional)</span></FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="">All classes</SelectItem>{classLevels.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editItem ? "Update" : "Create"} Fee Item</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v)}>
          <TabsList>
            <TabsTrigger value="items"><Receipt className="mr-2 h-4 w-4" />Fee Items</TabsTrigger>
            <TabsTrigger value="actions"><Users className="mr-2 h-4 w-4" />Bulk Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:gap-3 sm:mb-4">
              <Select value={filterCategory} onValueChange={(v: unknown) => setFilterCategory(v as string)}>
                <SelectTrigger className="w-[140px] h-8 text-xs sm:w-[180px] sm:h-9 sm:text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="tuition">Tuition</SelectItem>
                  <SelectItem value="boarding">Boarding</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="library">Library</SelectItem>
                  <SelectItem value="uniform">Uniform</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : items.length === 0 ? (
              <Card className="border-dashed border-slate-300"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><Receipt className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">No fee items yet.</p></CardContent></Card>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
                    <Badge variant="outline" className={cn("rounded-full text-xs px-1.5 py-0 font-medium shrink-0 sm:px-2", categoryColors[item.category] || categoryColors.other)}>{item.category}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 sm:text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500 sm:text-xs">{item.frequency} · {item.classLevel?.name || "All classes"}{item.isOptional ? " · Optional" : ""}</p>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 shrink-0 sm:text-sm">₦{Number(item.amount).toLocaleString()}</div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => openEdit(item)} className="text-slate-300 hover:text-blue-600"><Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></button>
                      <button type="button" onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="mt-4 space-y-5">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Bulk Assign Fee Items</CardTitle>
                <CardDescription>Assign selected fee items to all students in a class.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Select value={actionClass} onValueChange={(v: unknown) => setActionClass(v as string)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs sm:w-[200px] sm:h-9 sm:text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classLevels.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {actionClass && (
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2">
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-slate-50",
                          selectedFeeIds.includes(item.id) && "bg-blue-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFeeIds.includes(item.id)}
                          onChange={() => {
                            setSelectedFeeIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id],
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <Badge variant="outline" className={cn("rounded-full text-xs px-2 py-0 font-medium", categoryColors[item.category] || categoryColors.other)}>
                          {item.category}
                        </Badge>
                        <span className="flex-1">{item.name}</span>
                        <span className="font-medium text-slate-700">₦{Number(item.amount).toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    size="sm"
                    disabled={!actionClass || selectedFeeIds.length === 0 || actionBusy}
                    onClick={async () => {
                      if (!currentOrg) return;
                      setActionBusy(true);
                      try {
                        await apiFetch(`/fee-structure/bulk-assign/${currentOrg.slug}`, {
                          method: "POST",
                          body: JSON.stringify({
                            classLevelId: actionClass,
                            feeItemIds: selectedFeeIds,
                          }),
                        });
                        toast.success("Fee items assigned to class");
                      } catch {
                        toast.error("Failed to assign fees");
                      } finally {
                        setActionBusy(false);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {actionBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="mr-1.5 h-3.5 w-3.5" />}
                    Assign to Class
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Generate Invoices</CardTitle>
                <CardDescription>Create invoices for all students in a class from their assigned fees.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Select value={actionClass} onValueChange={(v: unknown) => setActionClass(v as string)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs sm:w-[200px] sm:h-9 sm:text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classLevels.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={actionTerm} onValueChange={(v: unknown) => setActionTerm(v as string)}>
                    <SelectTrigger className="w-[100px] h-8 text-xs sm:w-[130px] sm:h-9 sm:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={actionYear}
                    onChange={(e) => setActionYear(e.target.value)}
                    className="w-[90px] h-8 text-xs sm:w-[120px] sm:h-9"
                    placeholder="Year"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!actionClass || actionBusy}
                  onClick={async () => {
                    if (!currentOrg) return;
                    setActionBusy(true);
                    try {
                      const res = await apiFetch<{ success: boolean; data: { generated: number } }>(
                        `/fee-structure/bulk-invoice/${currentOrg.slug}`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            classLevelId: actionClass,
                            academicTerm: `${actionYear}-${actionTerm}`,
                          }),
                        },
                      );
                      const count = (res as any)?.data?.generated ?? 0;
                      toast.success(`${count} invoices generated`);
                    } catch {
                      toast.error("Failed to generate invoices");
                    } finally {
                      setActionBusy(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {actionBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                  Generate Invoices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

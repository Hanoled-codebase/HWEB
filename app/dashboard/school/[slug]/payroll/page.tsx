"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Banknote, Plus, RefreshCcw, Loader2, CheckCircle2, Clock4,
  Search, ChevronLeft, ChevronRight, TrendingUp, Users, Wallet,
} from "lucide-react";

type PayrollRecord = {
  id: string;
  memberId: string;
  month: string;
  baseSalary: string;
  allowances: string;
  deductions: string;
  netSalary: string;
  status: string;
  paidAt: string | null;
  notes: string | null;
  member: {
    id: string;
    role: string;
    user: { name: string; email: string };
  };
  generatedBy: { id: string; user: { name: string } };
};

type MonthlySummary = {
  total: number;
  paid: number;
  pending: number;
  count: number;
  paidCount: number;
  pendingCount: number;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  summary?: MonthlySummary;
  count?: number;
  error?: { message: string };
};

type StaffMember = {
  id: string;
  role: string;
  user: { name: string; email: string };
  teacherProfile?: { salaryBase?: number | string | null } | null;
};

type SessionSummary = {
  totalMonthly: number;
  totalTermly: number;
  totalSession: number;
  staffCount: number;
  staffWithSalaryCount: number;
  staffWithoutSalaryCount: number;
};

function currentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatNaira(amount: string | number) {
  return `₦${parseFloat(String(amount || 0)).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function PayrollPage() {
  const { currentOrg } = useOrganization();
  const [month, setMonth] = useState(currentMonthString());
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [selectedStaffForBonus, setSelectedStaffForBonus] = useState<{ id: string; name: string } | null>(null);
  const [bonusForm, setBonusForm] = useState({ amount: "", reason: "" });
  const [bonusSaving, setBonusSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [addForm, setAddForm] = useState({
    memberId: "", baseSalary: "", allowances: "", deductions: "", notes: "",
  });
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [bulkDefaults, setBulkDefaults] = useState({ defaultBaseSalary: "", allowances: "", deductions: "" });

  const { can } = usePermissions();
  // Follows what this school lets the viewer's role do (Settings → Staff access).
  const canRunPayroll = can("payroll.manage");

  const fetchRecords = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [recData, sumData, sessionData] = await Promise.all([
        apiFetch<ApiResponse<PayrollRecord[]>>(`/payroll/${currentOrg.slug}?month=${month}`),
        apiFetch<ApiResponse<PayrollRecord[]>>(`/payroll/${currentOrg.slug}/summary/${month}`),
        apiFetch<{ success: boolean; data: SessionSummary }>(`/payroll/${currentOrg.slug}/session-summary`),
      ]);
      if (recData.success) setRecords(recData.data);
      if (sumData.summary) setSummary(sumData.summary);
      if (sessionData?.data) setSessionSummary(sessionData.data);
    } catch {
      toast.error("Failed to load payroll");
    } finally {
      setLoading(false);
    }
  }, [currentOrg, month]);

  const fetchStaff = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const data = await apiFetch<StaffMember[] | { data: StaffMember[] }>(
        `/organizations/${currentOrg.slug}/members`
      );
      if (Array.isArray(data)) setStaffList(data.filter((m) => m.role !== "parent"));
      else if ((data as { data: StaffMember[] }).data) {
        setStaffList((data as { data: StaffMember[] }).data.filter((m) => m.role !== "parent"));
      }
    } catch {
      // Extract from existing records as fallback
      const unique = new Map<string, StaffMember>();
      records.forEach((r) => unique.set(r.member.id, r.member));
      setStaffList(Array.from(unique.values()));
    }
  }, [currentOrg, records]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAwardBonus = async () => {
    if (!currentOrg || !selectedStaffForBonus || !bonusForm.amount) {
      toast.error("Bonus amount is required");
      return;
    }
    setBonusSaving(true);
    try {
      const data = await apiFetch<ApiResponse<PayrollRecord>>(`/payroll/${currentOrg.slug}/bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedStaffForBonus.id,
          month,
          amount: parseFloat(bonusForm.amount),
          reason: bonusForm.reason,
        }),
      });
      if (data.success) {
        toast.success(`Bonus awarded to ${selectedStaffForBonus.name}`);
        setBonusOpen(false);
        setBonusForm({ amount: "", reason: "" });
        setSelectedStaffForBonus(null);
        fetchRecords();
      } else {
        toast.error(data.error?.message || "Failed to award bonus");
      }
    } catch {
      toast.error("Failed to award bonus");
    } finally {
      setBonusSaving(false);
    }
  };

  const shiftMonth = (dir: number) => {
    const [year, m] = month.split("-").map(Number);
    const d = new Date(year, m - 1 + dir, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleAddPayroll = async () => {
    if (!currentOrg) return;
    if (!addForm.memberId || !addForm.baseSalary) {
      toast.error("Staff member and base salary are required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<ApiResponse<PayrollRecord>>(`/payroll/${currentOrg.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, month }),
      });
      if (data.success) {
        toast.success("Payroll record created");
        setAddOpen(false);
        setAddForm({ memberId: "", baseSalary: "", allowances: "", deductions: "", notes: "" });
        fetchRecords();
      } else {
        toast.error(data.error?.message || "Failed to create");
      }
    } catch {
      toast.error("Failed to create payroll");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const data = await apiFetch<ApiResponse<PayrollRecord[]>>(`/payroll/${currentOrg.slug}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, ...bulkDefaults }),
      });
      if (data.success) {
        toast.success(`Generated payroll for ${data.count ?? 0} staff`);
        setBulkOpen(false);
        fetchRecords();
      } else {
        toast.error(data.error?.message || "Failed");
      }
    } catch {
      toast.error("Failed to generate payroll");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!currentOrg) return;
    if (!confirm("Mark this salary as paid?")) return;
    setPaying(id);
    try {
      const data = await apiFetch<{ success: boolean; error?: { message: string } }>(
        `/payroll/${currentOrg.slug}/${id}/pay`,
        { method: "PATCH" }
      );
      if (data.success) {
        toast.success("Marked as paid");
        fetchRecords();
      } else {
        toast.error(data.error?.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setPaying(null);
    }
  };

  const filtered = records.filter((r) =>
    r.member.user.name.toLowerCase().includes(search.toLowerCase()) ||
    r.member.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStaff = staffList.filter((s) => {
    const t = staffSearch.toLowerCase();
    return s.user.name.toLowerCase().includes(t) || s.user.email.toLowerCase().includes(t);
  });

  const displayMonth = (() => {
    const [y, m] = month.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleString("en-NG", { month: "long", year: "numeric" });
  })();

  const netPreview = formatNaira(
    (
      parseFloat(addForm.baseSalary || "0") +
      parseFloat(addForm.allowances || "0") -
      parseFloat(addForm.deductions || "0")
    ).toFixed(2)
  );

  return (
    <div className="space-y-4 md:space-y-6 md:p-6">
      {/* Header (phones: the top bar names the page; actions stay) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="h-6 w-6 text-violet-600" />
            Payroll &amp; Compensation
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage staff salary records, dynamic bonuses, and session calculations</p>
        </div>
        {canRunPayroll && (
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Users className="h-4 w-4 mr-1" />
              Bulk Generate
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          </div>
        )}
      </div>

      {/* Session Projection Summary Banner */}
      {sessionSummary && (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-slate-700">
                  This session (3 terms, 12 months)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {formatNaira(sessionSummary.totalSession)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">total staff expenditure</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-slate-500 font-medium">Monthly Outlay</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{formatNaira(sessionSummary.totalMonthly)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-slate-500 font-medium">Termly Outlay (4 Mo)</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{formatNaira(sessionSummary.totalTermly)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 col-span-2 sm:col-span-1">
                  <p className="text-slate-500 font-medium">Active Staff</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{sessionSummary.staffCount} Members</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month Navigator */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-44"
        />
        <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-violet-50 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-violet-200 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-violet-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Payroll ({displayMonth})</p>
                  <p className="text-lg font-bold text-violet-700">{formatNaira(summary.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paid ({summary.paidCount})</p>
                  <p className="text-lg font-bold text-emerald-700">{formatNaira(summary.paid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-200 flex items-center justify-center">
                  <Clock4 className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pending ({summary.pendingCount})</p>
                  <p className="text-lg font-bold text-amber-700">{formatNaira(summary.pending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No payroll records for {displayMonth}</p>
          {canRunPayroll && (
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setBulkOpen(true)}>
              Generate Payroll
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Basic</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Allowances / Bonus</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Deductions</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Net Pay</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                {canRunPayroll && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.member.user.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{r.member.role}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{formatNaira(r.baseSalary)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 hidden md:table-cell">
                    +{formatNaira(r.allowances)}
                    {r.notes && r.notes.includes("Bonus") && (
                      <span className="block text-xs text-emerald-700 font-sans font-medium">
                        ✨ {r.notes.split("\n").filter((n) => n.includes("Bonus")).pop()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-500 hidden md:table-cell">
                    -{formatNaira(r.deductions)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-violet-700">{formatNaira(r.netSalary)}</td>
                  <td className="px-4 py-3 text-center">
                    {r.status === "paid" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        <Clock4 className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </td>
                  {canRunPayroll && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
                          onClick={() => {
                            setSelectedStaffForBonus({ id: r.member.id, name: r.member.user.name });
                            setBonusOpen(true);
                          }}
                        >
                          + Bonus
                        </Button>
                        {r.status === "pending" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleMarkPaid(r.id)}
                            disabled={paying === r.id}
                          >
                            {paying === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Record Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payroll Record</DialogTitle>
            <DialogDescription>Add salary record for {displayMonth}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Staff Member *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </div>
              {staffSearch && (
                <div className="border rounded-lg max-h-36 overflow-y-auto divide-y">
                  {filteredStaff.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between"
                      onClick={() => {
                        const profileSalary = s.teacherProfile?.salaryBase ? String(s.teacherProfile.salaryBase) : "";
                        setAddForm((f) => ({
                          ...f,
                          memberId: s.id,
                          baseSalary: profileSalary || f.baseSalary,
                        }));
                        setStaffSearch(s.user.name);
                      }}
                    >
                      <div>
                        <span className="font-medium text-slate-900">{s.user.name}</span>
                        <span className="text-slate-500 ml-1.5 text-xs capitalize">· {s.role}</span>
                      </div>
                      {s.teacherProfile?.salaryBase && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          ₦{Number(s.teacherProfile.salaryBase).toLocaleString()}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredStaff.length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-500">No staff found</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Basic Salary (₦) *</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={addForm.baseSalary}
                  onChange={(e) => setAddForm((f) => ({ ...f, baseSalary: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Allowances (₦)</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={addForm.allowances}
                  onChange={(e) => setAddForm((f) => ({ ...f, allowances: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Deductions (₦)</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={addForm.deductions}
                  onChange={(e) => setAddForm((f) => ({ ...f, deductions: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Net Pay</label>
                <Input
                  disabled
                  className="bg-violet-50 font-mono font-semibold text-violet-700"
                  value={netPreview}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleAddPayroll}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dynamic Bonus Dialog */}
      <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Award Bonus</DialogTitle>
            <DialogDescription>
              Add a performance or holiday bonus to {selectedStaffForBonus?.name} for {displayMonth}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Bonus Amount (₦) *</label>
              <Input
                placeholder="e.g. 25000"
                type="number"
                value={bonusForm.amount}
                onChange={(e) => setBonusForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Reason / Description (Optional)</label>
              <Input
                placeholder="e.g. Term end performance bonus, holiday grant"
                value={bonusForm.reason}
                onChange={(e) => setBonusForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setBonusOpen(false)} className="flex-1">Cancel</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleAwardBonus}
                disabled={bonusSaving}
              >
                {bonusSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Apply Bonus"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Bulk Generate Payroll</DialogTitle>
            <DialogDescription>
              Auto-generate payroll for all staff for {displayMonth} using each member's configured base salary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Fallback Basic (₦)</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={bulkDefaults.defaultBaseSalary}
                  onChange={(e) => setBulkDefaults((f) => ({ ...f, defaultBaseSalary: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Allowances (₦)</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={bulkDefaults.allowances}
                  onChange={(e) => setBulkDefaults((f) => ({ ...f, allowances: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Deductions (₦)</label>
                <Input
                  placeholder="0.00"
                  type="number"
                  value={bulkDefaults.deductions}
                  onChange={(e) => setBulkDefaults((f) => ({ ...f, deductions: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-violet-50/80 p-3 rounded-xl border border-violet-200 leading-relaxed">
              ✨ <span className="font-semibold text-violet-900">Auto-sourced Salaries:</span> Each staff's basic salary is automatically populated from their profile on record. The fallback basic above is only applied for staff without a profile salary.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setBulkOpen(false)} className="flex-1">Cancel</Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleBulkGenerate}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                Generate All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

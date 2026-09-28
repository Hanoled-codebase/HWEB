"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useOrganization } from "@/hooks/useOrganization";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeftRight, Check, Loader2, Plus, RefreshCw, Send } from "lucide-react";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
};

type TransferRequest = {
  id: string;
  studentId: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  student: Student;
  fromOrganization?: { name: string };
  toOrganization?: { name: string };
};

export default function TransfersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { currentOrg, currentMember } = useOrganization();
  const isPrivileged = currentMember?.role === "owner" || currentMember?.role === "admin";

  const [students, setStudents] = useState<Student[]>([]);
  const [incoming, setIncoming] = useState<TransferRequest[]>([]);
  const [outgoing, setOutgoing] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [targetSlug, setTargetSlug] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  }, [slug]);

  async function fetchData() {
    setLoading(true);
    try {
      const [stuRes, incRes, outRes] = await Promise.all([
        apiFetch<Student[]>(`/students/${slug}`),
        apiFetch<{ success: boolean; data: TransferRequest[] }>(`/transfers/incoming?orgSlug=${slug}`),
        apiFetch<{ success: boolean; data: TransferRequest[] }>(`/transfers/outgoing?orgSlug=${slug}`),
      ]);
      setStudents(stuRes);
      if (incRes.success) setIncoming(incRes.data);
      if (outRes.success) setOutgoing(outRes.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load transfer records");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId || !targetSlug) {
      toast.error("Please select a student and enter a target school slug");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ success: boolean; data: TransferRequest }>(
        `/transfers/request?orgSlug=${slug}`,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: selectedStudentId,
            toOrganizationSlug: targetSlug.trim(),
            notes: notes.trim(),
          }),
        }
      );

      if (res.success) {
        toast.success("Transfer request sent successfully");
        setOutgoing((prev) => [res.data, ...prev]);
        setSelectedStudentId("");
        setTargetSlug("");
        setNotes("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send transfer request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(requestId: string) {
    setProcessingId(requestId);
    try {
      const res = await apiFetch<{ success: boolean }>(
        `/transfers/${requestId}/approve?orgSlug=${slug}`,
        {
          method: "POST",
        }
      );
      if (res.success) {
        toast.success("Transfer request approved successfully");
        setIncoming((prev) => prev.filter((r) => r.id !== requestId));
        fetchData(); // refresh student list
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to approve transfer");
    } finally {
      setProcessingId(null);
    }
  }

  if (!isPrivileged) {
    return (
      <div className="min-h-full bg-slate-50/60 pb-10">
        <div className="mx-auto max-w-5xl p-6">
          <DataStateCard
            variant="forbidden"
            title="Student transfers aren&apos;t available to your role"
            description="Moving a student to another school is an admin-only action."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Inter-School Student Transfers
          </h1>
          <p className="text-sm text-slate-500">
            Manage incoming student transfers and initiate outgoing student relocation.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} className="shrink-0 max-md:w-full">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Form to request transfer */}
        <Card className="shadow-sm md:col-span-1 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold">Initiate Outgoing Transfer</CardTitle>
            <CardDescription>
              Relocate a student to another school branch on Hanoled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Select Student</label>
                <Select
                  value={selectedStudentId}
                  onValueChange={(val: any) => setSelectedStudentId(String(val || ""))}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="-- Choose Student --" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} ({student.admissionNumber || "No ID"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Target School Slug</label>
                <Input
                  placeholder="e.g. greenwood-academy"
                  value={targetSlug}
                  onChange={(e) => setTargetSlug(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Transfer Reason / Notes</label>
                <Textarea
                  placeholder="Provide details about the relocation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-20"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !selectedStudentId || !targetSlug}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Request Transfer
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Incoming & Outgoing Transfer Lists */}
        <div className="space-y-6 md:col-span-2">
          {/* Incoming requests (Admins of target school approve) */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold">Incoming Transfer Requests</CardTitle>
              <CardDescription>
                Students transferring to your school. Action required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : incoming.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium">No incoming transfer requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incoming.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between border border-slate-100 bg-slate-50/50 rounded-xl p-4 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {req.student.firstName} {req.student.lastName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          From: <span className="font-medium text-slate-700">{req.fromOrganization?.name}</span>
                        </p>
                        {req.notes && (
                          <p className="text-xs italic text-slate-500 mt-1 line-clamp-1">
                            &ldquo;{req.notes}&rdquo;
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        disabled={processingId === req.id}
                        onClick={() => handleApprove(req.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {processingId === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outgoing Requests History */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold">Outgoing Relocations History</CardTitle>
              <CardDescription>
                Historical log of student transfers initiated from your branch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : outgoing.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-sm">No outgoing relocations history yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {outgoing.map((req) => (
                    <div key={req.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {req.student.firstName} {req.student.lastName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Target: {req.toOrganization?.name} · Requested {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={req.status === "approved" ? "secondary" : "outline"}
                        className={req.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "text-amber-700 border-amber-100 bg-amber-50"}
                      >
                        {req.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Settings2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const FEATURE_LABELS: Record<string, string> = {
  admissions: "Online Admissions",
  whatsapp: "WhatsApp Messaging",
  sms: "SMS Messaging",
  result_templates: "Result Templates",
  scheme_of_work: "Scheme of Work",
  lesson_notes: "Lesson Notes",
  question_bank: "Question Bank",
  fee_structure: "Fee Structure",
  debt_profile: "Debt Profile",
  library: "Library",
  hostel: "Hostel Management",
  bus_tracking: "Bus Tracking",
};

type OrgMember = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

const grantSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
});

export default function FeaturesPage() {
  const { currentOrg } = useOrganization();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Admin grant
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isGranting, setIsGranting] = useState(false);

  const grantForm = useForm<z.infer<typeof grantSchema>>({
    resolver: zodResolver(grantSchema),
    defaultValues: { memberId: "" },
  });

  useEffect(() => {
    if (!currentOrg) return;
    fetchFeatures();
    fetchMembers();
  }, [currentOrg]);

  async function fetchFeatures() {
    if (!currentOrg) return;
    try {
      const res = await apiFetch(`/feature-flags/${currentOrg.slug}`);
      setFeatures((res as any).data ?? res);
    } catch { /* */ } finally { setLoading(false); }
  }

  async function fetchMembers() {
    if (!currentOrg) return;
    try {
      const data = await apiFetch<OrgMember[]>(`/organizations/${currentOrg.slug}/members`);
      setMembers(data);
    } catch { /* */ }
  }

  async function toggleFeature(feature: string, enabled: boolean) {
    if (!currentOrg) return;
    setToggling(feature);
    try {
      await apiFetch(`/feature-flags/${currentOrg.slug}`, {
        method: "PUT",
        body: JSON.stringify({ feature, enabled }),
      });
      setFeatures((prev) => ({ ...prev, [feature]: enabled }));
      toast.success(`${FEATURE_LABELS[feature] || feature} ${enabled ? "enabled" : "disabled"}`);
    } catch { /* */ } finally { setToggling(null); }
  }

  async function onGrantAdmin(values: z.infer<typeof grantSchema>) {
    if (!currentOrg) return;
    setIsGranting(true);
    try {
      await apiFetch(`/organizations/${currentOrg.slug}/members/${values.memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      });
      toast.success("Admin role granted");
      grantForm.reset();
      await fetchMembers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to grant admin role");
    } finally {
      setIsGranting(false);
    }
  }

  async function onRevokeAdmin(memberId: string) {
    if (!currentOrg) return;
    try {
      await apiFetch(`/organizations/${currentOrg.slug}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: "member" }),
      });
      toast.success("Admin role revoked");
      await fetchMembers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke admin role");
    }
  }

  if (!currentOrg) return null;

  const adminMembers = members.filter((m) => m.role === "admin");

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feature Flags & Admin Roles</h1>
          <p className="mt-1 text-sm text-slate-500">Manage features and administrative permissions for your organization.</p>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0 divide-y divide-slate-100">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Settings2 className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      <p className="text-xs text-slate-400">{key}</p>
                    </div>
                  </div>
                  <Button
                    variant={features[key] ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFeature(key, !features[key])}
                    disabled={toggling === key}
                    className={cn(
                      "min-w-[80px]",
                      features[key] ? "bg-emerald-600 hover:bg-emerald-700" : "",
                    )}
                  >
                    {toggling === key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : features[key] ? (
                      "Enabled"
                    ) : (
                      "Disabled"
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Admin Role Grant & Revoke */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Manage Admin Access
            </CardTitle>
            <CardDescription>
              Grant or revoke admin access. Admins can manage members, students, classes, and administrative settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...grantForm}>
              <form
                onSubmit={grantForm.handleSubmit(onGrantAdmin)}
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full"
              >
                <FormField
                  control={grantForm.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-0">
                      <FormLabel className="text-sm font-semibold text-slate-800">Grant Admin Role to Member</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-10 bg-white border-slate-200 shadow-sm text-sm text-slate-800">
                            <SelectValue placeholder="Choose a member..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-50 bg-white border-slate-200">
                          {members
                            .filter((m) => m.role === "member")
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id} className="cursor-pointer text-sm py-2">
                                <span className="font-medium text-slate-900">{m.user.name}</span>{" "}
                                <span className="text-xs text-slate-500">({m.user.email})</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold h-10 px-5 shrink-0 shadow-sm"
                  disabled={isGranting}
                >
                  {isGranting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Grant Admin
                </Button>
              </form>
            </Form>

            {adminMembers.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Current Admins</p>
                <div className="space-y-2">
                  {adminMembers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{admin.user.name}</p>
                        <p className="text-xs text-slate-500">{admin.user.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => onRevokeAdmin(admin.id)}
                      >
                        Remove Admin
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

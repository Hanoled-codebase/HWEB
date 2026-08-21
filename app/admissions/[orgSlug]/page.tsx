"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
import { Loader2, CheckCircle2, School } from "lucide-react";
import { cn } from "@/lib/utils";

const applySchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(5, "Required"),
});

type ClassLevel = { id: string; name: string };

export default function PublicAdmissionPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [step, setStep] = useState<"form" | "pay" | "done">("form");
  const [admissionId, setAdmissionId] = useState("");
  const [payUrl, setPayUrl] = useState("");
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [orgName, setOrgName] = useState("");

  const form = useForm({
    resolver: zodResolver(applySchema) as any,
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", gender: "", dateOfBirth: "", address: "", previousSchool: "" },
  });

  async function onSubmit(values: any) {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/admissions/apply/${orgSlug}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = (res as any).data ?? res;
      setAdmissionId(data.id);
      toast.success("Application submitted");
      setStep("pay");
    } catch { /* */ } finally { setSubmitting(false); }
  }

  async function handlePayFee() {
    try {
      const res = await apiFetch(`/admissions/pay-fee/${orgSlug}`, {
        method: "POST",
        body: JSON.stringify({ admissionId }),
      });
      const data = (res as any).data ?? res;
      window.open(data.authorizationUrl, "_blank");
      toast.success("Payment page opened");
    } catch { /* */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <School className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Apply for Admission</CardTitle>
          <CardDescription>Submit your application to join our school.</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "form" && (
            <Form {...form as any}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem><FormLabel>Gender</FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="previousSchool" render={({ field }) => (
                  <FormItem><FormLabel>Previous School <span className="text-slate-400">(optional)</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Application
                </Button>
              </form>
            </Form>
          )}

          {step === "pay" && (
            <div className="space-y-6 text-center">
              <div className="rounded-full bg-emerald-100 w-16 h-16 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Application Submitted</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Pay the application fee of ₦5,000 to proceed.
                </p>
              </div>
              <Button onClick={handlePayFee} className="w-full bg-blue-600 hover:bg-blue-700">
                Pay Application Fee
              </Button>
              <p className="text-xs text-slate-400">
                You can close this page. We'll notify you via email.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

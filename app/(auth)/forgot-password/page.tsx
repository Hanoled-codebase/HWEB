"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { getTenantBranding, TenantBranding } from "@/lib/tenant-branding";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { SignInShell } from "@/components/auth/SignInForm";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolParam = searchParams.get("school") || searchParams.get("orgSlug") || "";
  const audienceParam = searchParams.get("audience") || "";

  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailStr, setEmailStr] = useState("");

  useEffect(() => {
    if (schoolParam) {
      void getTenantBranding(schoolParam).then((res) => {
        if (res) setBranding(res);
      });
    }
  }, [schoolParam]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          orgSlug: schoolParam || undefined,
          audience: audienceParam || undefined,
        }),
      });

      setEmailStr(values.email);
      setIsSubmitted(true);
      toast.success("Password reset instructions sent.");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const returnSignInUrl = audienceParam === "student"
    ? `/signin/student${schoolParam ? `?school=${encodeURIComponent(schoolParam)}` : ""}`
    : audienceParam === "parent"
    ? `/signin/parent${schoolParam ? `?school=${encodeURIComponent(schoolParam)}` : ""}`
    : audienceParam === "staff" || audienceParam === "teacher"
    ? `/signin/staff${schoolParam ? `?school=${encodeURIComponent(schoolParam)}` : ""}`
    : `/signin${schoolParam ? `?school=${encodeURIComponent(schoolParam)}` : ""}`;

  const primaryBtnStyle = branding
    ? { backgroundColor: branding.theme.primary }
    : undefined;

  if (isSubmitted) {
    const enterCodeUrl = `/reset-password?email=${encodeURIComponent(emailStr)}${
      schoolParam ? `&school=${encodeURIComponent(schoolParam)}` : ""
    }${audienceParam ? `&audience=${encodeURIComponent(audienceParam)}` : ""}`;

    return (
      <Card className="m-rise w-full max-w-md border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <CardHeader className="space-y-2 pt-8">
          <div className="mb-2 flex justify-center">
            {branding?.logo ? (
              <Image
                src={branding.logo}
                alt={branding.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-xl object-contain shadow-sm border border-slate-100"
              />
            ) : (
              <HanoledLogo size="lg" variant="blue" iconOnly />
            )}
          </div>
          <h1 data-slot="card-title" className="font-heading text-2xl leading-snug font-semibold text-center text-slate-900">
            Check your email
          </h1>
          <CardDescription className="text-center text-slate-500">
            We sent a password reset link and code to{" "}
            <span className="font-medium text-slate-900">{emailStr}</span>
            {branding ? ` for ${branding.name}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium"
            style={primaryBtnStyle}
            onClick={() => router.push(enterCodeUrl)}
          >
            Enter Reset Code
          </Button>
          <div className="text-center text-sm text-slate-500 mt-4">
            <Link href={returnSignInUrl} className="inline-flex min-h-11 items-center font-semibold text-blue-700 hover:text-blue-600">
              Return to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-rise w-full max-w-md border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <CardHeader className="space-y-2 pt-8">
        <div className="mb-2 flex justify-center">
          {branding?.logo ? (
            <Image
              src={branding.logo}
              alt={branding.name}
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-contain shadow-sm border border-slate-100"
            />
          ) : (
            <HanoledLogo size="lg" variant="blue" iconOnly />
          )}
        </div>
        <h1 data-slot="card-title" className="font-heading text-2xl leading-snug font-semibold text-center text-slate-900">
          Forgot password?
        </h1>
        <CardDescription className="text-center text-slate-500">
          {branding
            ? `Enter your email to receive a password reset link for ${branding.name}`
            : "Enter your email address to receive a password reset link and code"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900">Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium"
              style={primaryBtnStyle}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{" "}
          <Link href={returnSignInUrl} className="font-semibold text-blue-700 hover:text-blue-600">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <SignInShell>
      <Suspense
        fallback={
          <Card className="flex w-full max-w-md justify-center border-slate-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
          </Card>
        }
      >
        <ForgotPasswordContent />
      </Suspense>
    </SignInShell>
  );
}

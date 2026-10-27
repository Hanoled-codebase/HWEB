"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  AuthSessionResponse,
  clearPendingVerifyEmail,
  getPostAuthPath,
  readPendingVerifyEmail,
  rememberPendingVerifyEmail,
} from "@/lib/auth-session";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { SignInShell } from "@/components/auth/SignInForm";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  pin: z.string().min(6, { message: "Your one-time password must be 6 characters." }),
});

type OtpResponse = {
  ok: true;
  message: string;
};

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const emailFromQuery = searchParams.get("email") || "";
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState(emailFromQuery);

  useEffect(() => {
    const resolvedEmail = emailFromQuery || readPendingVerifyEmail();
    if (!resolvedEmail) return;

    setEmail(resolvedEmail);
    rememberPendingVerifyEmail(resolvedEmail);
  }, [emailFromQuery]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!email) {
      toast.error("Missing email context. Please sign up or sign in again.");
      router.push("/signin");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiFetch<AuthSessionResponse>("/auth/verify", {
        method: "POST",
        showErrorToast: false,
        body: JSON.stringify({ email, code: values.pin }),
      });

      clearPendingVerifyEmail();
      setUser(response.user);
      toast.success("Email verified and logged in successfully!");
      router.replace(getPostAuthPath(response));

    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Invalid or expired verification code.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setIsResending(true);
    try {
      await apiFetch<OtpResponse>("/auth/new-otp", {
        method: "POST",
        showErrorToast: false,
        body: JSON.stringify({ email }),
      });
      toast.success("A new code has been sent to your email.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resend code.",
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <Card className="m-rise w-full max-w-md border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <CardHeader className="space-y-2 pt-8">
        <div className="mb-1 flex justify-center">
          <HanoledLogo size="lg" variant="blue" iconOnly />
        </div>
        <h1 className="text-2xl font-semibold text-center text-slate-900">Verify your email</h1>
        <CardDescription className="text-center text-slate-500">
          {email ? (
            <>
              We sent a 6-digit code to <span className="font-medium text-slate-900">{email}</span>.
              Please enter it below.
            </>
          ) : (
            'Enter the code we emailed you after registering.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <FormControl>
                    <InputOTP maxLength={6} {...field} aria-label="6-digit verification code">
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot key={index} index={index} className="size-11 text-base sm:size-9 sm:text-sm" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Email
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Didn&apos;t receive the code?{" "}
          <button 
            type="button" 
            onClick={handleResend}
            disabled={isResending || !email}
            className="inline-flex min-h-11 items-center px-1 font-semibold text-blue-700 hover:text-blue-600 disabled:opacity-50"
          >
            {isResending ? "Resending..." : "Click to resend"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// Wrap in Suspense because we use useSearchParams
export default function VerifyPage() {
  return (
    <SignInShell>
      <Suspense fallback={
        <Card className="flex w-full max-w-md justify-center border-slate-200/80 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
        </Card>
      }>
        <VerifyForm />
      </Suspense>
    </SignInShell>
  );
}

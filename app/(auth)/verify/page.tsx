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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-center text-slate-900">Verify your email</CardTitle>
        <CardDescription className="text-center text-slate-500">
          We sent a 6-digit code to <span className="font-medium text-slate-900">{email}</span>.
          Please enter it below.
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
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
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
            className="font-semibold text-blue-600 hover:text-blue-500 disabled:opacity-50"
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
    <Suspense fallback={
      <Card className="shadow-lg border-slate-200 p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </Card>
    }>
      <VerifyForm />
    </Suspense>
  );
}

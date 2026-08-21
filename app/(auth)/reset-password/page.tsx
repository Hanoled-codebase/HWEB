"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(6, { message: "Reset code must be 6 characters." }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailQuery = searchParams.get("email") || "";
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Need to capture email manually if not in URL, but standard flow puts it in URL
  const [email, setEmail] = useState(emailQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      newPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!email) {
      toast.error("Please provide the email address for this reset request.");
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: values.code,
          newPassword: values.newPassword,
        }),
      });

      toast.success("Password reset successful! You can now sign in.");
      router.push("/signin");

    } catch (error: any) {
      toast.error(error.message || "Invalid or expired reset code.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-lg border-slate-200">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-center text-slate-900">Reset your password</CardTitle>
        <CardDescription className="text-center text-slate-500">
          Enter the 6-digit code sent to your email and your new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {!emailQuery && (
              <div className="space-y-2">
                <FormLabel className="text-slate-900">Email Address</FormLabel>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
            )}
            
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center pt-2">
                  <FormLabel className="text-slate-900 self-start">Reset Code</FormLabel>
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
                  <FormMessage className="self-start" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-900">New Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading || !email}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Return to{" "}
          <Link href="/signin" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="shadow-lg border-slate-200 p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </Card>
    }>
      <ResetForm />
    </Suspense>
  );
}

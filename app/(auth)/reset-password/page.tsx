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
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { SignInShell } from "@/components/auth/SignInForm";
import { Loader2, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  code: z.string().min(6, { message: "Reset code must be 6 characters." }),
  // Mirrors HCORE's passwordSchema, which makes the final call on the new password.
  newPassword: z
    .string()
    .min(12, { message: "Password must be at least 12 characters." })
    .max(128, { message: "Password must be no more than 128 characters." })
    .refine(
      (value) => [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length >= 3,
      { message: "Use at least three of: lowercase letters, uppercase letters, numbers, and symbols." },
    ),
});

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailQuery = searchParams.get("email") || "";
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
    <Card className="m-rise w-full max-w-md border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <CardHeader className="space-y-2 pt-8">
        <div className="mb-1 flex justify-center">
          <HanoledLogo size="lg" variant="blue" iconOnly />
        </div>
        <h1 className="text-2xl font-semibold text-center text-slate-900">Reset your password</h1>
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
                  autoComplete="email"
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
                    <InputOTP maxLength={6} {...field} aria-label="6-digit reset code">
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot key={index} index={index} className="size-11 text-base sm:size-9 sm:text-sm" />
                        ))}
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
                    <div className="relative">
                      <Input
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="pr-12"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={isLoading || !email}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Return to{" "}
          <Link href="/signin" className="font-semibold text-blue-700 hover:text-blue-600">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <SignInShell>
      <Suspense fallback={
        <Card className="flex w-full max-w-md justify-center border-slate-200/80 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
        </Card>
      }>
        <ResetForm />
      </Suspense>
    </SignInShell>
  );
}

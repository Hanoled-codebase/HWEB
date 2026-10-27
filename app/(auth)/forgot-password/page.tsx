"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { SignInShell } from "@/components/auth/SignInForm";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailStr, setEmailStr] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setEmailStr(values.email);
      setIsSubmitted(true);
      toast.success("Password reset code sent.");

    } catch (error: any) {
      toast.error(error.message || "Failed to send reset code. Email might not exist.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <SignInShell>
        <Card className="m-rise w-full max-w-md border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <CardHeader className="space-y-2 pt-8">
            <div className="mb-1 flex justify-center">
              <HanoledLogo size="lg" variant="blue" iconOnly />
            </div>
            <h1 data-slot="card-title" className="font-heading text-2xl leading-snug font-semibold text-center text-slate-900">Check your email</h1>
            <CardDescription className="text-center text-slate-500">
              We sent a password reset code to <span className="font-medium text-slate-900">{emailStr}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full bg-blue-700 hover:bg-blue-800" 
              onClick={() => router.push(`/reset-password?email=${encodeURIComponent(emailStr)}`)}
            >
              Enter Reset Code
            </Button>
            <div className="text-center text-sm text-slate-500 mt-4">
              <Link href="/signin" className="inline-flex min-h-11 items-center font-semibold text-blue-700 hover:text-blue-600">
                Return to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </SignInShell>
    );
  }

  return (
    <SignInShell>
      <Card className="m-rise w-full max-w-md border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <CardHeader className="space-y-2 pt-8">
          <div className="mb-1 flex justify-center">
            <HanoledLogo size="lg" variant="blue" iconOnly />
          </div>
          <h1 data-slot="card-title" className="font-heading text-2xl leading-snug font-semibold text-center text-slate-900">Forgot password?</h1>
          <CardDescription className="text-center text-slate-500">
            Enter your email address to receive a password reset code
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
                    <FormLabel className="text-slate-900">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset code
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Remember your password?{" "}
            <Link href="/signin" className="font-semibold text-blue-700 hover:text-blue-600">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </SignInShell>
  );
}

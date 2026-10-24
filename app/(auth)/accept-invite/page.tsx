"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AuthSessionResponse, getPostAuthPath } from "@/lib/auth-session";
import { isPasswordValid, STAFF_PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";

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
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  name: z.string().optional(),
  password: z.string().optional(),
});

type InviteData = {
  email: string;
  role: string;
  orgName?: string | null;
  hasAccount?: boolean;
  requiresPassword?: boolean;
  existingName?: string | null;
};

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!token) {
      setInviteError("No invitation token found in the URL.");
      setIsVerifying(false);
      return;
    }

    // Verify token validity before showing the form
    async function verifyToken() {
      try {
        const data = await apiFetch<InviteData>(`/admin/invite/verify/${token}`);
        setInviteData(data);
        form.reset({
          name: data.existingName || "",
          password: "",
        });
      } catch (err: unknown) {
        setInviteError(
          err instanceof Error
            ? err.message
            : "Invalid or expired invitation token.",
        );
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [form, token]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!token) return;

    const trimmedName = values.name?.trim() || "";
    const password = values.password || "";

    if (!inviteData?.hasAccount && !trimmedName) {
      form.setError("name", {
        type: "manual",
        message: "Name must be at least 2 characters",
      });
      return;
    }

    if (inviteData?.requiresPassword && !isPasswordValid(password, "staff")) {
      form.setError("password", {
        type: "manual",
        message: STAFF_PASSWORD_POLICY_MESSAGE,
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiFetch<AuthSessionResponse>("/admin/invite/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(password ? { password } : {}),
        }),
      });

      setUser(response.user);
      toast.success("Invitation accepted successfully.");
      router.replace(getPostAuthPath(response));

    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to accept invitation.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isVerifying) {
    return (
      <Card className="shadow-lg border-slate-200 p-8 flex flex-col justify-center items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-slate-500">Verifying invitation...</p>
      </Card>
    );
  }

  if (inviteError) {
    return (
      <Card className="shadow-lg border-slate-200 m-rise">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-center text-slate-900">Invalid Invitation</h1>
          <CardDescription className="text-center text-slate-500">
           {inviteError}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push("/")}
          >
            Return Home
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-slate-200 m-rise">
        <CardHeader className="space-y-1">
          <h1 className="text-2xl font-semibold text-center text-slate-900">Join {inviteData?.orgName || "the School"}</h1>
          <CardDescription className="text-center text-slate-500">
            You have been invited to join as a <span className="font-semibold capitalize">{inviteData?.role || "member"}</span>. 
          {inviteData?.hasAccount
            ? " Accept the invitation to continue into your dashboard."
            : " Set up your profile to accept the invitation."}
          </CardDescription>
        </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1 mb-4">
              <FormLabel className="text-slate-900">Email Address</FormLabel>
              <div className="p-2 bg-slate-100 rounded-md text-slate-600 font-medium text-sm">
                {inviteData?.email || "your email"}
              </div>
              <p className="text-xs text-slate-500">Your email is tied to the invitation.</p>
            </div>

            {!inviteData?.hasAccount ? (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : inviteData.existingName ? (
              <div className="space-y-1">
                <FormLabel className="text-slate-900">Account Name</FormLabel>
                <div className="rounded-md bg-slate-100 p-2 text-sm font-medium text-slate-700">
                  {inviteData.existingName}
                </div>
              </div>
            ) : null}

            {inviteData?.requiresPassword ? (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900">
                      {inviteData.hasAccount ? "Set Password" : "Create Password"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="••••••••"
                          type={showPassword ? "text" : "password"}
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Your account already exists. Accept the invitation to continue.
              </div>
            )}
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {inviteData?.hasAccount ? "Join School" : "Accept Invitation"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <Card className="shadow-lg border-slate-200 p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </Card>
    }>
      <AcceptInviteForm />
    </Suspense>
  );
}

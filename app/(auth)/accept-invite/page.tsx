"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AuthSessionResponse, getPostAuthPath } from "@/lib/auth-session";
import { isPasswordValid, passwordRules, STAFF_PASSWORD_POLICY_MESSAGE } from "@/lib/password-policy";
import { loginWithCredentials } from "@/app/actions/auth";
import { setAuthTokens } from "@/lib/auth-tokens";

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
import { Loader2, AlertCircle, Eye, EyeOff, Lock, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { SignInShell } from "@/components/auth/SignInForm";
import { HanoledLogo } from "@/components/ui/HanoledLogo";

const formSchema = z.object({
  name: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type InviteData = {
  email: string;
  role: string;
  displayRole?: string | null;
  orgName?: string | null;
  hasAccount?: boolean;
  requiresPassword?: boolean;
  existingName?: string | null;
};

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const enteredPassword = form.watch("password") || "";
  const enteredConfirmPassword = form.watch("confirmPassword") || "";
  const passwordChecklist = passwordRules(enteredPassword, "staff");
  const passwordsMatch = Boolean(
    enteredPassword && enteredConfirmPassword && enteredPassword === enteredConfirmPassword
  );

  useEffect(() => {
    if (!token) {
      setInviteError("No invitation token was found in this link.");
      setIsVerifying(false);
      return;
    }

    // Verify token validity before displaying the form
    async function verifyToken() {
      try {
        const data = await apiFetch<InviteData>(`/admin/invite/verify/${token}`);
        setInviteData(data);
        form.reset({
          name: data.existingName || "",
          password: "",
          confirmPassword: "",
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
    const confirmPassword = values.confirmPassword || "";

    if (!inviteData?.hasAccount && !trimmedName) {
      form.setError("name", {
        type: "manual",
        message: "Name must be at least 2 characters",
      });
      return;
    }

    const mustProvidePassword = !inviteData?.hasAccount || Boolean(inviteData?.requiresPassword);

    if (mustProvidePassword && !password) {
      form.setError("password", {
        type: "manual",
        message: "Password is required to set up your account",
      });
      return;
    }

    if (password) {
      if (!isPasswordValid(password, "staff")) {
        form.setError("password", {
          type: "manual",
          message: STAFF_PASSWORD_POLICY_MESSAGE,
        });
        return;
      }

      if (password !== confirmPassword) {
        form.setError("confirmPassword", {
          type: "manual",
          message: "Passwords do not match",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await apiFetch<AuthSessionResponse>("/admin/invite/accept", {
        method: "POST",
        showErrorToast: false,
        body: JSON.stringify({
          token,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(password ? { password } : {}),
        }),
      });

      // HSMS gives us the school dashboard path directly (e.g. /dashboard/school/slug).
      // HCORE's loginResult.redirectUrl is always "/welcome" for staff, which would
      // lose the specific destination. Keep the HSMS path unless it's a generic fallback.
      const hsmsTargetUrl = getPostAuthPath(response);
      let targetUrl = hsmsTargetUrl;

      if (password && inviteData?.email) {
        try {
          const loginResult = await loginWithCredentials(inviteData.email, password, hsmsTargetUrl);
          if (loginResult && "success" in loginResult && loginResult.success) {
            setAuthTokens({ hcoreToken: loginResult.hcoreToken, hcbtToken: loginResult.hcbtToken });
            // Only use HCORE's redirectUrl if HSMS didn't give a specific school path
            const isGenericPath = hsmsTargetUrl === "/dashboard" || hsmsTargetUrl === "/welcome" || hsmsTargetUrl === "/";
            if (isGenericPath && loginResult.redirectUrl) {
              targetUrl = loginResult.redirectUrl;
            }
          }
        } catch (authErr) {
          console.warn("Direct session creation after invite acceptance:", authErr);
        }
      }

      setUser(response.user);
      toast.success("Invitation accepted successfully.");
      router.replace(targetUrl);
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

  const schoolName = inviteData?.orgName || "your school";
  const schoolInitials = (schoolName || "H")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "SC";

  // displayRole comes from the invite itself (e.g. "Teacher" for staff invites)
  // and is the most accurate label; fall back to the permission-role mapping.
  const rawRole = (inviteData?.displayRole || inviteData?.role || "Member").toLowerCase();
  const roleDisplay = inviteData?.displayRole?.trim()
    ? inviteData.displayRole.trim()
    : rawRole.includes("admin")
    ? "Administrator"
    : rawRole.includes("teacher")
    ? "Teacher"
    : rawRole.includes("parent")
    ? "Parent"
    : "Staff Member";

  const isExistingAccount = Boolean(inviteData?.hasAccount);
  const requiresPassword = !isExistingAccount || Boolean(inviteData?.requiresPassword);

  if (isVerifying) {
    return (
      <div className="w-full max-w-md p-8 sm:p-10 bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/80 relative z-10 m-rise flex flex-col items-center justify-center space-y-4 text-center">
        <div className="mb-2">
          <HanoledLogo size="md" variant="blue" iconOnly />
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-[#1447E6]" />
        <div>
          <h2 className="text-base font-bold text-slate-900">Verifying Invitation</h2>
          <p className="text-xs text-slate-500 mt-1">Checking secure school link credentials...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="w-full max-w-md p-8 sm:p-10 bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/80 relative z-10 m-rise">
        <div className="flex justify-center mb-4">
          <HanoledLogo size="md" variant="blue" iconOnly />
        </div>
        <div className="flex justify-center mb-4">
          <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-xl font-extrabold text-center text-slate-900 mb-2">
          Invitation Expired or Invalid
        </h1>
        <p className="text-center text-sm text-slate-600 mb-6 leading-relaxed">
          {inviteError}
        </p>
        <div className="space-y-3">
          <Button
            className="w-full h-11 bg-[#1447E6] hover:bg-[#0F36B8] text-white font-bold rounded-xl cursor-pointer"
            onClick={() => router.push("/signin")}
          >
            Go to Sign In
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
            onClick={() => router.push("/contact")}
          >
            Contact School Support
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg p-8 sm:p-10 bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-[0_12px_40px_rgb(11,18,32,0.08)] border border-slate-200/80 relative z-10 m-rise">
      {/* Brand Header */}
      <div className="flex justify-center mb-5">
        <HanoledLogo size="lg" variant="blue" href="/" />
      </div>

      {/* School Plaque Card */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-[#EEF0FF] to-blue-50/90 border border-blue-100 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-[#1447E6] text-white flex items-center justify-center font-extrabold text-base shadow-sm shrink-0">
          {schoolInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1447E6]">
              School Invitation
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-[#1447E6] border border-blue-200/80 shadow-2xs">
              {roleDisplay}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 truncate">
            {schoolName}
          </h2>
        </div>
      </div>

      {/* Title & Description */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-extrabold text-slate-900">
          {isExistingAccount ? "Join School Dashboard" : "Set Up Your Profile"}
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {isExistingAccount
            ? "Your account is recognized. Set your password and join this school's staff portal."
            : "Complete your details and choose a secure password to activate your school account."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Read-only verified email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Email Address
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate flex-1 font-mono text-xs sm:text-sm text-slate-800">
                {inviteData?.email || "your.email@school.com"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3" />
                Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              This invitation is securely tied to this specific email address.
            </p>
          </div>

          {/* Full Name */}
          {!isExistingAccount ? (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Adebayo Ogunlesi"
                      className="h-11 rounded-xl border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1447E6] focus-visible:border-[#1447E6]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          ) : inviteData?.existingName ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Account Name
              </label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800">
                {inviteData.existingName}
              </div>
            </div>
          ) : null}

          {/* Existing Account Notice if password not strictly required */}
          {isExistingAccount && !inviteData?.requiresPassword && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
              <ShieldCheck className="w-4 h-4 text-[#1447E6] shrink-0 mt-0.5" />
              <span>
                Your profile is active in Hanoled. You can enter a new password below to update it, or leave blank to keep your current credentials.
              </span>
            </div>
          )}

          {/* Password Section */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {requiresPassword ? "Password" : "Set New Password (Optional)"}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder={requiresPassword ? "Create a strong password" : "Enter new password (optional)"}
                      type={showPassword ? "text" : "password"}
                      className="h-11 pr-11 rounded-xl border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1447E6] focus-visible:border-[#1447E6]"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />

                {/* Real-time Password Policy Checklist (only shown when typing password) */}
                {enteredPassword.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      Password Requirements:
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {passwordChecklist.map((rule, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            rule.met ? "text-emerald-700 font-medium" : "text-slate-500"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                              rule.met
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {rule.met ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : "•"}
                          </div>
                          <span>{rule.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Confirm Password Section */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {requiresPassword ? "Confirm Password" : "Confirm New Password"}
                  </FormLabel>
                  {enteredConfirmPassword.length > 0 && (
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        passwordsMatch ? "text-emerald-700" : "text-amber-600"
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          Passwords match
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          Passwords must match
                        </>
                      )}
                    </span>
                  )}
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Re-enter password"
                      type={showConfirmPassword ? "text" : "password"}
                      className="h-11 pr-11 rounded-xl border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#1447E6] focus-visible:border-[#1447E6]"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-[#1447E6] hover:bg-[#0F36B8] text-white font-bold rounded-xl shadow-sm hover:shadow transition-all text-sm gap-2 mt-4 cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activating Account...</span>
              </>
            ) : (
              <>
                <span>{isExistingAccount ? "Join School & Continue" : "Accept Invitation & Continue"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Card Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          Already using Hanoled with another account?{" "}
          <Link
            href="/signin"
            className="text-[#1447E6] font-bold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <SignInShell>
      <Suspense
        fallback={
          <div className="w-full max-w-md p-10 bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/80 relative z-10 flex flex-col items-center justify-center space-y-4">
            <HanoledLogo size="md" variant="blue" iconOnly />
            <Loader2 className="h-8 w-8 animate-spin text-[#1447E6]" />
            <p className="text-xs text-slate-500 font-medium">Loading invitation details...</p>
          </div>
        }
      >
        <AcceptInviteContent />
      </Suspense>
    </SignInShell>
  );
}



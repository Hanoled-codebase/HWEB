import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getHcoreBaseUrl, fetchWithFallback } from "@/lib/api-endpoints";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Change password",
};

const HCORE_BASE = getHcoreBaseUrl();

/**
 * Standalone account page: any signed-in role — student, teacher, admin or
 * parent — can change their own password here, outside the school dashboard.
 * The audience (student or staff rule) comes from whether this account signs
 * in with an admission number.
 */
export default async function AccountPasswordPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hcore_session")?.value || cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/signin?callbackUrl=/account/password");
  }

  let isStudent = false;
  try {
    const meRes = await fetchWithFallback(`${HCORE_BASE}/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (meRes.ok) {
      const me = await meRes.json();
      isStudent = (me.loginIdentifiers ?? []).some((id: { type: string }) => id.type === "ADMISSION_NUMBER");
    }
  } catch (e) {
    console.error("Change-password page /v1/me error:", e);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
      <ChangePasswordForm isStudent={isStudent} />
    </main>
  );
}

import { Organization } from "@/hooks/useOrganization";
import { User } from "@/hooks/useAuth";

export type AuthSessionResponse = {
  ok: true;
  user: User;
  organizations?: Organization[];
  nextPath?: string;
};

const PENDING_VERIFY_EMAIL_KEY = "hanoled.pendingVerifyEmail";

export function getPostAuthPath(session: Partial<AuthSessionResponse>) {
  if (typeof session.nextPath === "string" && session.nextPath.trim()) {
    return session.nextPath;
  }

  if (Array.isArray(session.organizations) && session.organizations.length > 0) {
    return `/dashboard/school/${session.organizations[0].slug}`;
  }

  return "/dashboard";
}

export function rememberPendingVerifyEmail(email: string) {
  if (typeof window === "undefined") return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;
  window.localStorage.setItem(PENDING_VERIFY_EMAIL_KEY, normalizedEmail);
}

export function readPendingVerifyEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PENDING_VERIFY_EMAIL_KEY) || "";
}

export function clearPendingVerifyEmail() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_VERIFY_EMAIL_KEY);
}

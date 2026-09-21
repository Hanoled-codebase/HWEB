// Edge build replacement for Hweb's "@/app/actions/auth" server actions,
// which need a Next server. The appliance signs out client-side: drop the
// bearer token and return to the local sign-in page.
import { clearAuthTokens } from "@/lib/auth-tokens";

export async function logoutAction() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* offline server unreachable — still clear local state */
  }
  clearAuthTokens();
  window.location.href = "/signin/";
}

// Edge build replacement for Hweb's "@/app/actions/auth" server actions,
// which need the Next server and HCORE. The appliance answers the same
// sign-in contract with its local auth service (roster bcrypt hashes), and
// the real SignInForm / RequiredPasswordChange components render unchanged.
//
// Differences from the online action, deliberately kept small:
// - The token set is the appliance session only (no HCORE identity offline).
// - Students always land on /cbt/student (as online); with no suite beyond
//   HCBT on the device, the welcome hub carries the device's one destination.
import { signInFailure } from "@/lib/sign-in-errors";
import { clearAuthTokens } from "@/lib/auth-tokens";
import { isSafeRedirectUrl } from "@/lib/safe-redirect";

export type SignInContext = {
  identifierType: string;
  identifier: string;
  organizationSlugOrId: string;
  callbackUrl: string | null;
};

export type SignInResult =
  | { success: true; redirectUrl: string; hcoreToken?: string; hcbtToken?: string | null }
  | { passwordChangeRequired: true; changeToken: string; context: SignInContext }
  | { error: string; reference?: string; expired?: boolean };

const GENERIC_ERROR = "Could not sign in. Please try again.";
const GENERIC_PASSWORD_ERROR = "Something went wrong setting your new password. Please try again.";

function toFetchFailure(res: Response, data: unknown, generic: string): SignInResult {
  return signInFailure({ status: res.status, headers: res.headers }, data, generic) as SignInResult;
}

/** What a successful edge sign-in / password change answer looks like. */
type EdgeSignInResponse = {
  ok?: boolean;
  token?: string;
  user?: { role?: string; roles?: string[] };
  passwordChangeRequired?: boolean;
  changeToken?: string;
};

function isCandidate(user?: { role?: string; roles?: string[] }): boolean {
  const roles = [user?.role, ...(user?.roles || [])].map((r) => String(r || "").toLowerCase());
  return roles.includes("candidate") || roles.includes("student");
}

/** Route the person to the one console their account has on this device.
 *  Students go straight into the examination room (as online); everyone else
 *  passes through the welcome hub, which holds the device's destinations. */
function redirectUrl(user: EdgeSignInResponse["user"], context: SignInContext): string {
  if (isCandidate(user)) return "/cbt/student";
  const callback = context.callbackUrl;
  if (callback && isSafeRedirectUrl(callback)) return callback;
  return "/welcome";
}

function signedIn(data: EdgeSignInResponse, context: SignInContext): SignInResult {
  if (!data?.token) return { error: GENERIC_ERROR };
  return { success: true, redirectUrl: redirectUrl(data.user, context), hcbtToken: data.token };
}

async function askEdge(pathname: string, body: { [key: string]: string }): Promise<{ res: Response; data: EdgeSignInResponse & { error?: string; code?: string } }> {
  const res = await fetch(pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: EdgeSignInResponse & { error?: string; code?: string } = {};
  try {
    data = (await res.json()) as EdgeSignInResponse & { error?: string; code?: string };
  } catch {
    /* server fault without JSON — signInFailure handles the null */
  }
  return { res, data };
}

export async function loginAction(_prevState: unknown, formData: FormData): Promise<SignInResult> {
  const context: SignInContext = {
    identifierType: String(formData.get("identifierType") || ""),
    identifier: String(formData.get("identifier") || ""),
    organizationSlugOrId: String(formData.get("organizationSlugOrId") || ""),
    callbackUrl: (formData.get("callbackUrl") as string | null) || null,
  };
  try {
    const { res, data } = await askEdge("/api/auth/login", {
      identifier: context.identifier.trim(),
      password: String(formData.get("password") || ""),
    });

    // Right password, but one the school set: THE SAME double step as online —
    // the appliance issued no session, only a "choose a new password" token.
    if (data.passwordChangeRequired && data.changeToken) {
      return { passwordChangeRequired: true, changeToken: data.changeToken, context };
    }
    if (!res.ok) return toFetchFailure(res, data, GENERIC_ERROR);
    return signedIn(data, context);
  } catch {
    return { error: "Network error. Please ensure this exam appliance is reachable." };
  }
}

/** Second step of a sign-in that answered a school-set password. */
export async function completePasswordChangeAction(_prev: SignInResult | null, formData: FormData): Promise<SignInResult> {
  const changeToken = String(formData.get("changeToken") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const context: SignInContext = {
    identifierType: String(formData.get("identifierType") || ""),
    identifier: String(formData.get("identifier") || ""),
    organizationSlugOrId: String(formData.get("organizationSlugOrId") || ""),
    callbackUrl: (formData.get("callbackUrl") as string | null) || null,
  };

  if (newPassword !== confirmPassword) {
    return { error: "The two passwords do not match." };
  }

  try {
    const { res, data } = await askEdge("/api/auth/change-password", { changeToken, newPassword });
    if (data.code === "INVALID_CHANGE_TOKEN") return { ...toFetchFailure(res, data, GENERIC_PASSWORD_ERROR), expired: true };
    if (!res.ok) return toFetchFailure(res, data, GENERIC_PASSWORD_ERROR);
    return signedIn(data, context);
  } catch {
    return { error: "Network error. Please ensure this exam appliance is reachable." };
  }
}

// Offline sign-out: tell the appliance, drop the local bearer token, return to
// the same /signin page the suite uses.
export async function logoutAction() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* offline device unreachable — still clear local state */
  }
  clearAuthTokens();
  window.location.href = "/signin/";
}

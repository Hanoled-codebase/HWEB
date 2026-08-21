export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

export const isGoogleAuthConfigured = Boolean(GOOGLE_CLIENT_ID);

type GoogleAuthErrorLike = Error & {
  status?: number;
  details?: {
    code?: string;
  };
};

export function getGoogleAuthErrorMessage(error: unknown) {
  const authError = error as GoogleAuthErrorLike;

  if (authError?.details?.code === "GOOGLE_AUTH_NOT_CONFIGURED") {
    return "Google sign-in is not available right now. Please use email and password.";
  }

  if (authError?.status === 401 || authError?.details?.code === "INVALID_GOOGLE_TOKEN") {
    return "Google could not verify this sign-in. Please try again.";
  }

  return "Google sign-in failed. Please try again or use email and password.";
}

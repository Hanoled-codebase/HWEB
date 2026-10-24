// The checklist shown while someone chooses a new password. Mirrors HCORE's
// rule (HCORE/backend/src/modules/auth/password-policy.ts), which makes the
// final call: students need 8+ characters that aren't guessable; staff need
// 12+ using three kinds of character.

export type PasswordAudience = "learner" | "staff";

export interface PasswordRule {
  label: string;
  met: boolean;
}

/** One character repeated, or a straight run up or down ("12345678", "hgfedcba"). */
function isTrivialPattern(value: string): boolean {
  if (!value) return true;
  if (new Set(value).size === 1) return true;
  const codes = [...value.toLowerCase()].map((character) => character.charCodeAt(0));
  const step = codes[1] - codes[0];
  return Math.abs(step) === 1 && codes.every((code, index) => index === 0 || code - codes[index - 1] === step);
}

export function passwordRules(value: string, audience: PasswordAudience): PasswordRule[] {
  if (audience === "learner") {
    return [
      { label: "At least 8 characters", met: value.length >= 8 },
      { label: "Not a run like 12345678 or aaaaaaaa", met: !isTrivialPattern(value) },
    ];
  }
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
  return [
    { label: "At least 12 characters", met: value.length >= 12 },
    { label: "Three of: lowercase, capitals, numbers, symbols", met: kinds >= 3 },
  ];
}

export function isPasswordValid(value: string, audience: PasswordAudience = "staff"): boolean {
  return passwordRules(value, audience).every((rule) => rule.met);
}

export const STAFF_PASSWORD_POLICY_MESSAGE =
  "Password must be at least 12 characters and include at least three of: lowercase letters, uppercase letters, numbers, and symbols.";


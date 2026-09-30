// A question has 2 to 6 choices, lettered A to F. HCBT validates the same
// limits (Hcbt/backend/src/validators/cbt.js); WAEC, NECO and JAMB use four.
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/** "A" for the first choice, "F" for the sixth. */
export function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

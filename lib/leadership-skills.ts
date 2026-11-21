/**
 * The leadership / affective / psychomotor skills printed on the report card.
 * Mirrors DEFAULT_LEADERSHIP_SKILLS in
 * Hanoled/backend/src/services/result-export.js — the class grid awards
 * exactly the rows the PDF prints, so keep the two lists in sync.
 */
export const LEADERSHIP_SKILLS = [
  "Confidence",
  "Team Spirit",
  "Listening/Concentrating Ability",
  "Social Ability/Friendliness",
  "Creative /Organizational Ability",
  "Communication / Public Speaking Skills",
  "Inquisitiveness",
  "Sense of Responsibility",
  "Ethical/Moral Skills(Politeness, Honesty, perseverance etc)",
  "Sports/Games",
  "Handwriting",
  "Musical skills",
] as const;

/** Ratings are stored 1–5 ("Poor"…"Excellent"); report cards show A–E. */
export const AFFECTIVE_SCORE_TO_LETTER: Record<number, string> = {
  5: "A",
  4: "B",
  3: "C",
  2: "D",
  1: "E",
};

export function scoreToAffectiveLetter(score: number): string {
  return AFFECTIVE_SCORE_TO_LETTER[Math.round(Number(score))] || "";
}

export const AFFECTIVE_SCORE_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

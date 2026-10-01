// Titles people put in front of their name on Nigerian school accounts.
const TITLES = new Set([
  "mr", "mrs", "ms", "miss", "mx", "dr", "prof", "engr", "arc", "pharm", "barr", "hon",
  "chief", "alhaji", "alhaja", "mallam", "mal", "rev", "pastor", "evang", "deacon", "deaconess",
  "bishop", "sir", "madam", "sister", "brother",
]);

const isTitle = (word: string) => TITLES.has(word.replace(/\.$/, "").toLowerCase());

/**
 * The name to greet someone by. A plain name gives the first name ("Ngozi Obi"
 * -> "Ngozi"); a titled one keeps the title with the surname ("Dr Amaka Eze"
 * -> "Dr Eze", "Mrs Ngozi Obi" -> "Mrs Obi"), never a bare "Dr".
 */
export function greetingName(fullName: string | null | undefined): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const titles: string[] = [];
  while (words.length > 1 && isTitle(words[0])) titles.push(words.shift()!);
  if (!titles.length) return words[0] ?? "";
  return [...titles, words[words.length - 1]].join(" ");
}

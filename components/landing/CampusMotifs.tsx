import { HanoledIcon } from "@/components/ui/HanoledLogo";

/**
 * Visual language for the "School Gate & Crest" marketing-site direction:
 * the Hanoled H-mark presented as a seal/medallion (never a small corner
 * logo), and a gate-threshold divider that separates each "campus wing"
 * section. Both stay strictly within the brand palette — the gold ring is
 * the direction's one sparing accent per medallion, never repeated inside it.
 */

export function CrestMedallion({
  stat,
  size = "lg",
}: {
  /** A short, real proof line shown inside the seal, e.g. "100+ Schools". */
  stat?: string;
  size?: "lg" | "md";
}) {
  const dimension = size === "lg" ? "h-32 w-32 sm:h-36 sm:w-36" : "h-20 w-20";
  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-full bg-[#0B1220] ${dimension}`}>
      {/* Thin gold ring — the medallion's one accent */}
      <div className="absolute inset-0 rounded-full ring-2 ring-[#F5A623]/70 ring-offset-2 ring-offset-[#1447E6]" />
      <HanoledIcon className={size === "lg" ? "h-14 w-14 sm:h-16 sm:w-16" : "h-9 w-9"} color="#FFFFFF" />
      {stat && (
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#F5A623] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0B1220] shadow-sm">
          {stat}
        </span>
      )}
    </div>
  );
}

/**
 * A full-bleed threshold band that separates one campus wing from the next.
 * The number carries real sequence information (which wing comes next on
 * the tour), so it stays — just restyled as a gate-post plaque rather than
 * a generic "01 / 02 / 03" section kicker.
 */
export function WingThreshold({
  index,
  name,
}: {
  index: number;
  name: string;
}) {
  return (
    <div className="w-full bg-[#0B1220]">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <span className="text-xs font-bold tabular-nums text-[#F5A623]">
          {String(index).padStart(2, "0")}
        </span>
        <span className="h-px flex-1 bg-white/15" />
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-white">
          {name}
        </span>
      </div>
    </div>
  );
}

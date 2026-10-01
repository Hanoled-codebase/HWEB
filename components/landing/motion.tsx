import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";

/*
 * Marketing motion primitives ("ticked off, on the rise"). Server-safe: no hooks, no client JS.
 * Hanoled's mark is one ascending stroke that reads as a tick and a growth curve; these pieces
 * draw that stroke. The animations live in globals.css (.mk-*) and every one rests on the
 * finished state, so reduced motion or a failed script shows the page complete.
 */

const wordStyle = (index: number) => ({ "--w": index }) as CSSProperties;

function hasText(node: ReactNode): boolean {
  if (typeof node === "string") return node.trim() !== "";
  if (Array.isArray(node)) return node.some(hasText);
  if (isValidElement<{ children?: ReactNode }>(node)) return hasText(node.props.children);
  return false;
}

/**
 * A headline whose words rise out of their own baseline, one after another. Keeps the
 * heading's markup (coloured spans, line breaks, inline badges); only the text is wrapped.
 */
export function RiseWords({ children }: { children: ReactNode }) {
  let index = 0;
  const split = (node: ReactNode): ReactNode => {
    if (typeof node === "string") {
      return node.split(/(\s+)/).map((part, k) =>
        part.trim() === "" ? (
          part
        ) : (
          <span key={k} className="mk-word">
            <span style={wordStyle(index++)}>{part}</span>
          </span>
        ),
      );
    }
    if (isValidElement<{ children?: ReactNode }>(node)) {
      if (node.type === "br") return node;
      if (typeof node.type === "string" && hasText(node.props.children)) {
        return cloneElement(node, undefined, Children.map(node.props.children, split));
      }
      // An icon or badge inside the headline rises as one piece.
      return (
        <span className="mk-word">
          <span style={wordStyle(index++)}>{node}</span>
        </span>
      );
    }
    return node;
  };
  return <>{Children.map(children, split)}</>;
}

/** The gold wave under a hero headline. It writes itself once the headline has risen. */
export function HeroUnderline({ className = "mx-auto mt-2" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="20"
      viewBox="0 0 120 20"
      aria-hidden="true"
      className={`mk-underline fill-none stroke-current stroke-[4px] text-[#F5A623] ${className}`}
    >
      <path pathLength={1} d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10 T 120 10" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A circled tick whose stroke draws in when its list comes into view (inside <InView>), the
 * index-th tick after the ones before it. Same geometry as lucide's CircleCheck.
 */
export function DrawnCheck({ className, index = 0 }: { className?: string; index?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ "--i": index } as CSSProperties}
    >
      <circle cx="12" cy="12" r="10" />
      <path className="mk-tick" pathLength={1} d="m9 12 2 2 4-4" />
    </svg>
  );
}

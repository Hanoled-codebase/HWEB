/**
 * Marketing shell. `marketing-motion` switches on the hero entrance and the scroll-driven
 * section reveals defined in globals.css (pure CSS, no client JS; skipped for reduced motion).
 * `contents` keeps this wrapper out of the layout so pages render exactly as before.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="marketing-motion contents">{children}</div>;
}

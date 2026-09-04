---
name: hanoled-brand
description: Hanoled's official brand guidelines (colors, typography, logo usage) for Hweb. Load this before writing or editing ANY UI code in this app — components, pages, Tailwind classes, inline styles, chart/badge/status colors, buttons, or anything involving the logo. Use it whenever a task mentions styling, theming, colors, branding, redesigning a page, building a new component, a chart, a status badge, or the Hanoled logo/icon — even if the user doesn't say "brand guidelines" explicitly. The hard rule this skill enforces: no color outside the approved palette below may appear anywhere in the product UI.
---

# Hanoled Brand Guidelines

Source: `Hanoled Brand Guidelines.pdf` (2026), the official design system. Every value below is taken directly from it — don't approximate or invent adjacent colors.

## The one rule that matters most

**No color outside this palette, anywhere in the UI.** The guideline states this as its #1 rule under "Incorrect Usage." That means: don't reach for Tailwind's default `blue-500`, `emerald-500`, `purple-500`, `rose-500`, `amber-400`, etc. — those are not brand colors, even though some resemble the approved ones. Every color decision should trace back to one of the five roles below.

## Colors

| Role | Hex | OKLCH (this app's color space) | Use |
|---|---|---|---|
| **Hanoled Blue** | `#1447E6` | `oklch(0.488 0.243 264.376)` | Primary/default interactive color — buttons, links, active states, the dominant brand color |
| **Growth Gold** | `#F5A623` | `oklch(0.784 0.159 73.0)` | Sparing accent only — a single highlight, a key CTA, a "results/achievement" moment. Never a repeated or primary color. If gold shows up more than once or twice on a screen, that's a sign it's being overused. |
| **Deep Ink** | `#0B1220` | `oklch(0.183 0.031 263.4)` | Dark neutral — headings, high-contrast text, dark surfaces |
| **White** | `#FFFFFF` | `oklch(1 0 0)` | Light surfaces, text on dark/blue backgrounds |

**Functional colors — reserved strictly for system status, never decoration:**

| Status meaning | Hex | OKLCH |
|---|---|---|
| Success (Paid, Passed) | `#12B76A` | `oklch(0.686 0.167 154.9)` |
| Warning (Pending, Due) | `#F5A623` | `oklch(0.784 0.159 73.0)` (same value as Growth Gold, different *role* — this is a status signal, not a decorative accent) |
| Alert (Overdue, Failed) | `#F04438` | `oklch(0.637 0.210 28.5)` |

These three exist so a user can read meaning from color alone — a red badge always means the same kind of thing everywhere in the app. Using them decoratively (e.g. a random red icon with no error/overdue meaning) undermines that and is exactly what the guideline prohibits.

**Extended palette (tints):** for charts, chart series, and subtle backgrounds, derive tints/shades *of Hanoled Blue* rather than reaching for an unrelated hue. The guide shows a 7-step ramp from Deep Ink-ish dark blue through Hanoled Blue to a very pale blue-white; in practice, vary lightness (`oklch(L 0.243 264.376)` with L from ~0.2 to ~0.95) rather than introducing new hues into charts.

## This app's current state — fix, don't work around

Hweb already has a shadcn/ui token system in `app/globals.css` (`--primary`, `--secondary`, `--accent`, `--destructive`, `--chart-1..5`, etc., in OKLCH, mapped through `@theme inline`). **This is the right system to use — the problem is the tokens were never set to the brand colors.** The `:root` block still has the generic shadcn boilerplate (`--primary: oklch(0.205 0 0)`, i.e. near-black), which is why components fell back to hardcoding things like `bg-[#1447E6]` inline instead of using `bg-primary`.

One theme block already got this right: `.cbt-theme` in the same file has `--primary: 226 84% 49%` (HSL) — that's Hanoled Blue — and `--secondary: 36 91% 55%` — that's Growth Gold. Even the *dark* root theme has one exact match: `--sidebar-primary: oklch(0.488 0.243 264.376)` is Hanoled Blue to three decimal places. So the correct values have already been derived once in this codebase; they just weren't propagated to the main `:root`/`.dark` blocks that the primary HSMS dashboard actually uses.

**When touching `globals.css` or the theme:** prefer fixing the token values at the `:root`/`.dark` level (so `bg-primary`, `text-primary`, `border-primary`, `bg-destructive`, etc. resolve to brand colors everywhere automatically) over patching individual components with inline hex. A hardcoded `bg-[#1447E6]` on one button is a symptom; the fix belongs in the token, not the component, whenever you're already in the area making related changes. Suggested mapping using the table above:
- `--primary` → Hanoled Blue
- `--destructive` → Alert red
- `--secondary` / a new `--success` / `--warning` token → Growth Gold / Success green / Warning gold as appropriate for the component
- `--chart-1` through `--chart-5` → a lightness ramp of Hanoled Blue (see Extended palette above)

If a task only touches one component and a full token migration is out of scope, using `bg-primary`/`text-destructive` etc. (which will inherit whatever the current — possibly still-wrong — token resolves to) is *not* a safe shortcut for brand compliance today, since those tokens aren't yet fixed. Until the root tokens are corrected, use the exact hex/oklch values from the table above directly, and consider flagging to the user that the underlying token is off-brand rather than silently patching around it repeatedly.

## Typography

**Poppins only** — already loaded correctly via `next/font/google` in `app/layout.tsx`; no setup needed, just don't introduce a second typeface.

- **Bold / SemiBold** — headings
- **Medium** — UI labels, emphasis, buttons
- **Regular** — body copy
- Light exists but is rarely used in-product

## Logo

The mark is an "H" built from two solid pillars (school + student) joined by an ascending diagonal (reads as both a checkmark and a growth curve) — this is the existing "n"-shaped icon already in use across the app.

- **Flat color only.** Never a gradient, outline, or multi-color treatment on the icon itself.
- **Approved icon-on-background pairings** (must keep full contrast):
  - White icon on Deep Ink or Hanoled Blue
  - Hanoled Blue or Deep Ink icon on White or Growth Gold
- **Wordmark** "Hanoled" is Poppins Bold, tight letterspacing, in Deep Ink, White, Hanoled Blue, or Growth Gold only.
- **Lockup:** icon left, wordmark right, shared baseline (primary/horizontal); wordmark centered below icon (stacked, for square/vertical spaces); icon-only monogram for favicons and small app-icon contexts. Don't reorder icon and wordmark.
- **Clear space:** keep a margin equal to one pillar's width free of any other element on every side.
- **Never:** recolor outside the palette above, stretch/skew/rotate, add shadows/gradients/outlines to the mark, or place it on a low-contrast or busy background.

## Voice and feel (secondary to the hard rules above)

"Precise but human" — structured like good software, warm like a well-run classroom. Clean geometry, confident color used deliberately (not everywhere at once), generous white space. Two recurring motifs beyond the logo itself: a subtle repeated-icon pattern (section dividers, certificates — not dense UI) and an "ascending line" motif for charts/progress indicators/section breaks, echoing the logo's growth-curve shape.

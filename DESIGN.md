---
name: Hanoled — School Gate & Crest
description: The marketing site's visual world — a Nigerian school compound, walked wing by wing, in Hanoled's brand palette.
colors:
  brand-blue: "#1447E6"
  brand-gold: "#F5A623"
  brand-ink: "#0B1220"
  brand-white: "#FFFFFF"
  success: "#12B76A"
  warning: "#F5A623"
  alert: "#F04438"
  wing-tint: "#EEF0FF"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontWeight: 700
    letterSpacing: "0.02em"
    textTransform: "uppercase"
  heading:
    fontFamily: "Poppins, sans-serif"
    fontWeight: 800
  body:
    fontFamily: "Poppins, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "Poppins, sans-serif"
    fontWeight: 700
    letterSpacing: "0.25em"
    textTransform: "uppercase"
rounded:
  sm: "0.75rem"
  md: "1.5rem"
  lg: "2rem"
  pill: "9999px"
components:
  cta-primary:
    backgroundColor: "{colors.brand-gold}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "0 2rem"
    height: "3.5rem"
  cta-primary-hover:
    backgroundColor: "#DB9114"
  cta-secondary:
    backgroundColor: "{colors.brand-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1.5rem"
  cta-secondary-hover:
    backgroundColor: "#0F36B8"
  wing-plaque:
    backgroundColor: "#FFFFFF"
    rounded: "{rounded.lg}"
---

## Overview

Hanoled's marketing homepage reads as a walk through a real, proud Nigerian school compound rather than a generic SaaS features grid. Every product pillar is a physical "wing" the visitor tours (the Administration Block, the Staffroom, the Bursary, the Noticeboard, Around the Compound, the Gatehouse, the Exam Hall), separated by gate-threshold divider bands. The Hanoled H-mark appears once, at the top, as a crest medallion — not a small corner logo. This system currently covers `app/(marketing)/page.tsx` (the homepage) only; the rest of the marketing site (about, features, hcbt, pricing, admissions-portal, contact, faqs, support, help, article, security, legal pages) has not yet been brought into this world and still uses the prior visual system — bringing them in is an extension of this world, not a new direction round.

Direction: "School Gate & Crest" — grounded direction 5 of a 7-candidate resonance-ordered list, assigned by `impeccable concept-seed` (seed key `6abfaecc`), confirmed by the user over three alternates. Full direction contract lives in `.impeccable/surfaces/app-marketing.md`.

Coverage as an extension of this world (colors, hero band, `WingThreshold`/`CrestMedallion`, accent-tab plaques instead of borders, no eyebrow pills): features, about, hcbt, admissions-portal, contact, faqs, help, support, security, privacy, terms, data-protection.

**Homepage exception:** the user asked to revert `app/(marketing)/page.tsx` back to its pre-redesign layout (the original white-hero-with-student-photo design), so the homepage is **not** on this system — it's the incumbent design, just with the motion system (see below) layered on top. The Gate & Crest redesign of the homepage still exists, saved in a git stash, in case it's wanted again later. Treat the homepage as its own incumbent world when extending anything else there; don't assume it matches this file's Colors/Shapes/Components sections.

Not yet brought into this world: the `article/[slug]` blog template (already brand-color-compliant from an earlier pass, but not restructured — it's a long-form "Read" surface and a lower priority than the Persuade pages).

## Motion

Added across the homepage (and reusable anywhere else): `components/landing/Reveal.tsx` + `hooks/useInView.ts` (IntersectionObserver, transform/opacity only, fires once, `prefers-reduced-motion`-aware) for scroll-triggered fade+rise on each major section; a one-time staged sequence on the HCBT exam diagram (answer selected -> graded -> growth-curve draws in) using the `seq-*` keyframes in `app/globals.css`; and form feedback states (shake + red field rings on validation error, animated success panel, button press/hover feedback) on the homepage quote form. No new dependency — CSS keyframes plus native browser APIs only.

## Colors

Only the palette the `hanoled-brand` skill defines — no color outside it anywhere on the page:

- **Hanoled Blue** `#1447E6` — the "signboard paint": hero and closing-CTA band fills, nav/link/button color, the Exam Hall's accent.
- **Growth Gold** `#F5A623` — sparing accent only: the crest medallion's ring and stat badge, the primary "Book a Custom Demo" / "Get Started" buttons, small hanging accent-tabs on plaque cards. Never a section fill, never repeated more than once or twice in a single viewport.
- **Deep Ink** `#0B1220` — the "gate pillar": wing-threshold divider bands, the Exam Hall section fill, the footer.
- **White** — the dominant ground for every content-heavy wing section (per standing house style: big text-bearing sections stay white; blue/gold are accents and thresholds, never the fill behind paragraphs of copy).
- **Wing tint** `#EEF0FF` (a pale Hanoled Blue tint, not a neutral gray) — alternates with white across wing sections so the "tour" has rhythm without leaving the palette.
- Functional Success `#12B76A` is used exactly once, for the quote-form's submitted confirmation state — a real status, not decoration.
- Third-party marks (Paystack green, Monnify navy) are exempt — they're real partner brand colors, not part of Hanoled's own palette.

## Typography

Poppins only, per brand pin — no second typeface introduced. Bold/ExtraBold for headings, carried into an uppercase, wide-tracked treatment for wing names and the hero wordmark to read like carved signage lettering. Regular/Medium for body copy and descriptions, unchanged from the prior system.

## Layout

Full-bleed color sections (hero, wing thresholds, Exam Hall, closing CTA) break out of the content column; wing content itself sits in a `max-w-6xl` reading column. Wings alternate white/wing-tint backgrounds and alternate image-left/image-right composition so no two consecutive wings look identical. A thin `WingThreshold` band (Deep Ink, a tabular-numeral index, the wing's name in tracked caps) opens every wing — the numbering is real tour sequence, not a decorative kicker. Mobile collapses each wing to a single stacked column; the threshold bands and hero remain full-bleed at every width.

## Shapes

Large, soft radii throughout (`rounded-[2rem]` / `rounded-[3rem]` on cards and hero panels, full pill buttons) — continues the pre-existing system's roundness, echoing the H-mark's own rounded pillar ends. Accent trims are small standalone rounded tabs (a `h-1.5 w-14 rounded-full` bar) overlapping a card's top edge, never a `border-t/l/r/b` utility directly on a rounded container — that combination reads as a clashing "side-tab" tell and is refused site-wide.

## Components

- **CrestMedallion** (`components/landing/CampusMotifs.tsx`) — the H-mark on a Deep Ink circle with a thin gold ring and an optional gold stat-badge hanging off the bottom edge. One per page (the hero); never used as a repeating decorative motif.
- **WingThreshold** (`components/landing/CampusMotifs.tsx`) — the Deep Ink divider band between wings: index number in gold, a hairline rule, the wing name in tracked white caps.
- **Wing plaque** — the illustration card inside each wing: white rounded panel, a small gold or blue accent tab at the top edge (never a border), one of the existing two-tone `ModuleIllustrations` SVGs inside.
- Buttons, form inputs, and the FAQ accordion keep their prior behavior; only their color/shape treatment moved onto this system (gold for the primary CTA, blue for secondary actions, no borders-on-rounded-corners anywhere).

## Do's and Don'ts

- **Do** keep gold to the crest, the primary CTA, and small accent tabs — if a third gold element would be visible in the same viewport, cut one.
- **Do** keep wing sections on white or the pale blue tint; reserve solid Hanoled Blue / Deep Ink fills for thresholds, hero, and the closing CTA band.
- **Do** give every new wing/section its own `WingThreshold` if it extends the campus-tour metaphor; don't invent a second divider style.
- **Don't** add an eyebrow/kicker pill above any heading — refused site-wide, no exceptions.
- **Don't** put a `border-t-4` / `border-l-4` / etc. directly on a `rounded-*` element; use a small standalone accent tab instead.
- **Don't** introduce a second typeface, a gradient-text heading, or a stock icon-in-a-circle grid — the wing tour's alternating full-width rows are the replacement for that pattern.
- **Don't** route any CTA to `/signup` — every "Get Started" / demo action goes to `/contact` or the on-page quote form, per standing business rule.

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

Thesis: **"ticked off, on the rise."** The Hanoled mark's ascending diagonal reads as both a tick and a growth curve, so the marketing site's motion draws that one stroke instead of fading generic blocks in. One authored moment per page (the hero), small purposeful echoes below it, and stillness everywhere else. CSS keyframes plus native browser APIs only, no animation library; everything animates `translate`/`scale`/`opacity`/`clip-path`/`stroke-dashoffset`/`color`.

- **Hero headline** (`RiseWords` in `components/landing/motion.tsx`): every word rises out of its own baseline mask, in reading order (42ms apart). Keeps the heading's markup; coloured spans and line breaks survive, inline badges rise as one piece. Used on every marketing H1 except the legal pages.
- **Gold underline** (`HeroUnderline`): the wave under the headline writes itself left to right once the words have risen. Growth Gold's single appearance in the hero.
- **Hero follow-through**: the rest of the hero (copy, buttons, chips) rises 10px after the headline, never with it. Pieces that share a column with the H1 opt in with `.mk-follow` and `--d` (their beat in ms).
- **Home photo unveil** (`.mk-unveil`): the student photo is uncovered from the bottom edge upward, the logo's rising stroke at photo scale.
- **Ticks** (`DrawnCheck` inside `InView`): checklists draw their ticks one after another (140ms apart) the first time the list scrolls in. Home HCBT list, admissions benefits, security practices, and the success panels on the quote and support forms.
- **Step wave** (`.mk-wave` + `--i` inside `InView`): a blue highlight travels once through numbered steps (01 -> 02 -> 03), then each number settles back to its resting colour. Each container sets `--mk-rest` (the number's own colour) and optionally `--mk-wave`; both keyframe ends are explicit so the colour never swings through another hue.
- **Exam diagram** (`.mk-seq-pop` / `.mk-seq-draw` with `--d`, inside `InView`): the answer is selected and ticked, the paper is stamped verified, then the gold growth curve draws. A small story, told once.
- **CTA arrows** (`.mk-arrow` for the up-right arrow, `.mk-arrow-x` for the plain arrow): step 2-3px along their direction on hover and keyboard focus.
- **Card grids** below the hero rise as they scroll in, scroll-driven (`animation-timeline: view()`, off the main thread, skipped where unsupported). Whole sections never animate.
- **Name strip** (`BrandRibbon`): drifts sideways at 48s per loop; pauses off screen and under the pointer.

Rules: every effect rests on the finished state (`backwards` fill, or a `data-motion="pending"` state that only JS sets), so no-JS, a failed script and `prefers-reduced-motion: reduce` all show the page complete. Under reduced motion nothing moves except the shared `m-*` pop/rise utilities, which become short fades. `InView` sets `data-motion` straight on the element (no React state, no re-render) and fires once. Add new motion here only when it explains a state or a relationship; no fade-up on every section.

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

## Mobile app shell (signed-in product, phones only)

Everything below `md` (768px) in `/dashboard/school/[slug]`, `/admin` and the CBT console uses one navigation language; desktop is untouched (every piece is `md:hidden`).

- **Config, not hardcoded lists:** `components/dashboard/mobile/mobile-config.ts` derives each role's tabs, menu sections and identity from the same permission-filtered nav as the desktop sidebar (`useSchoolNavItems`). A role can never see a destination on mobile that desktop hides from it.
- **Top bar** (`MobileTopBar`): home shows school + role; sub-pages show a 44px back target and the page title. Bell is 44px.
- **Tab bar** (`MobileTabBar`): Home + three role-tuned destinations + Menu (five slots, the most that keeps labels readable at 360px). Role tuning lives in `TAB_PREFERENCES` (e.g. class teacher: Register / Students / Sheets; accountant: Payments / Fee plan / Debts; parent: Children / Results / Fees). Steps aside on focused data-entry routes (`FOCUSED_ROUTES`) so a sticky save bar owns the bottom edge.
- **Menu sheet** (`MobileMenuProvider`): bottom sheet, thumb-reachable. Account header, search (only when > 9 destinations), grouped 3-column tile grid, CBT console link, school switcher, log out above the home indicator.
- **Homes** (`HomeKit`, `RoleHome`, `ParentHome`, teacher/admin wrappers): one greeting, one obvious next step per role, then that role's tools. Only real data is shown (no invented counts).
- **Rules:** touch targets >= 44px; Poppins only; Hanoled Blue for active/primary, white surfaces on the Deep Ink-derived slate; safe-area padding via `pt-safe` / `pb-safe` / `pb-safe-nav` / `bottom-above-nav` (needs `viewport-fit=cover`, set in `app/dashboard/layout.tsx`). Fixed bottom bars in pages must use `bottom-above-nav`, never `bottom-16`.
- **One title per phone screen:** the top bar is the only phone H1. Pages hide their own H1/subtitle below `md` (`hidden md:block`, or `EntityHeader`, which does it for you) and keep only their action row. When the real title is data (a class, a learner, a subject, "Biology · JSS1A"), the page calls `useMobilePageTitle(name)` from `MobileMenuProvider` and the top bar shows it. No eyebrow labels, no greeting heroes on list pages; greetings live on homes only (`HomeGreeting`, which skips role-account names like "School Admin").
- **Primitives carry the phone floor:** `Button` is never under 44x44 below `md` (`max-md:min-h-11 max-md:min-w-11`), so a page's `h-8` only shrinks desktop. Small form fields (`text-xs`/`text-sm`/`text-[10–15px]`) render at 16px on phones (unlayered rule in `globals.css`), so iOS never zooms. `Tabs` scroll sideways with 44px triggers; a four-tab row uses a 2x2 grid on phones instead so no tab hides off-screen.
- **Dialogs are bottom sheets on phones:** the shared `DialogContent` pins to the bottom edge below `md` (rounded top, 92dvh max, safe-area padding, rises in) with a 44px close. Don't re-add per-dialog sheet classes.
- **Lists, not cards, on phones:** one rounded container with hairline dividers; the whole row is a `Link` (not a `div` with `onClick`); row actions and destructive items go in a 44px "…" menu, never a bare trash icon beside the row. Stat tiles collapse to one quiet line (hidden when everything is zero). Save/primary actions for long forms stick above the tab bar (`bottom-above-nav`, or `sticky` inside cards that set `max-md:overflow-visible`). The layout uses `overflow-x-clip` (not `hidden`) so `position: sticky` works inside pages.
- **Menu groups by job**, not by the sidebar's sections: Classroom, People, Money, School life, Academic setup, Settings & help (`MENU_GROUPS` in `mobile-config.ts`). Log out asks once before signing out.
- **Toasts** come from the single `ToastProvider` (top-center, below the top bar on phones, brand status colours); pages don't mount their own `<Toaster>`.

## Tablets and touch (signed-in product, md and up)

Three widths, one navigation language each: phones (< 768) use the mobile shell above; tablets held upright (768-1023) get the desktop pages at full width with the nav in a drawer; from 1024 the sidebar is always open.

- **Staff shell:** `AppSidebar` renders one panel twice: a sticky `lg:flex` aside, and a left `Sheet` (288px) opened by the 44px menu button in the top bar (`lg:hidden`). On tablets the top bar shows the school name where the sidebar would; from lg it reads "School Operations Dashboard". The drawer closes on navigation by remembering the page it was opened on (no effect), and closes when the viewport crosses 1024px (rotation).
- **Student shell:** the shadcn `Sidebar` switches to its sheet below 1024px (`SIDEBAR_DRAWER_BREAKPOINT`; desktop container is `lg:block`/`lg:flex`). Its header `SidebarTrigger` opens it; links close it.
- **Platform admin:** six destinations fit a labelled icon rail (`w-20`, icon over an 11px label) from md to lg, the full 240px sidebar from lg. Its KPI strip runs 2 → 3 → 5 across (`xl`) so naira totals never clip.
- **Touch floors follow the pointer, not the width:** `pointer-coarse:min-h-11` (and `min-w-11` on `Button`) on `Button`, `Input`, `SelectTrigger`, sidebar links and search, header actions, the bell and marketing nav/footer links. Mouse users keep the dense desktop sizes; a touch tablet never gets a 36px target.
- **Grids reflow on the content width, not the device:** stat rows run 2 → 3 → all-on-one-row (`xl`, `--stat-count`); tool launchers use `repeat(auto-fill,minmax(8.5rem,1fr))`; a stat tile drops its icon below a 10rem container (`@container`). Layouts that sit beside the 256px sidebar at lg (704px of content) are checked at that width too.
- **Desktop lists are tables:** Students is one bordered list at every width; from lg each row is a subgrid of columns (name, admission no., class, gender, day/boarding, actions) under a quiet header row, ~56px a row. The whole row stays one link; actions stay in the 44px "…" menu.
- **Greetings use `greetingName()`** (`lib/greeting-name.ts`): a titled name keeps its title with the surname ("Dr Eze", "Mrs Obi"), never a bare "Dr".
- **A phone drop of a touch floor is for mouse users only:** pages that shrink a 44px control at sm/md write `md:pointer-fine:min-h-0` (or `pointer-fine:h-8`), never a bare `md:min-h-0`, so a touch tablet keeps the 44px target. Icon-only buttons (edit, delete, ±) carry an `aria-label` naming the thing they act on.
- **Wide tables on tablets drop secondary columns, not actions:** below xl, location/term/hosting fold under the row's name (`xl:hidden` line) and their columns hide (`hidden xl:table-cell`); the actions column always stays on screen.
- **Stored keys never reach the screen:** invoice statuses go through `invoiceStatusLabel()` ("Part paid") and terms through `termLabel()` ("1st Term 2026/2027") in `lib/finance.ts`. A settled balance is a dash, not "₦0" in Alert red.

## Marketing at tablet widths

The full nav shows from lg (1024), the hamburger (44px) below it. The footer is brand-row + four columns from md and five from lg; contact details are `mailto:`/`tel:` links; footer links hover to white (Hanoled Blue on Deep Ink is under 3:1). Four-step rows go 2x2 below lg.

## HCBT phone view (student, teacher, admin)

- **Account holder's name is always on screen.** Phones: `CbtGreeting` (Deep Ink card, gold role chip, school) at the top of every dashboard plus the avatar -> `CbtAccountSheet` (name, email, role, school, Back to Suite, Sign out). Tablet/desktop: the name sits in the header beside the role badge. Shared chrome lives in `components/cbt/CbtMobileChrome.tsx`.
- **Navigation:** the pill tab row is `sm`-and-up only; phones get `MobileSegmentBar` at the bottom (student: Exams / Practice / History; teacher: Overview / Exams; admin: Overview / Exams / Grades / Devices). Dialogs become bottom sheets on phones.
- **Students on phones are view-only for exams.** Phones see the list and results; every Start/Resume/Practice path shows `ExamDeviceNotice`, and the exam room itself refuses to mount. The Practice tab is not offered on phones. Server-side the same rule is enforced by `Hcbt/shared/exam-device` (cloud backend middleware + edge appliance), which returns `403 DEVICE_NOT_ALLOWED`.

## Platform admin phone view (hanoled.com/admin)

Phones only (`md:hidden` / `hidden md:block` pairs); the desktop tables and 7-column board are untouched.

- **Shell:** the shared mobile shell (top bar, tab bar: Home / Schools / Payments / Pipeline + Menu for Hosted, Support, sign out). `hideBack` is set because every admin destination is top level.
- **Lists, not tables:** `components/admin/mobile-kit.tsx` holds `MList` (one rounded container, hairline dividers), `SchoolRow` (whole row is the 72px tap target, term revenue right-aligned in tabular figures), `ChipTabs` (44px filter chips), `PaymentChip`, `SectionHead`, `EmptyPanel`.
- **Colour is brand-only:** Hanoled Blue for interaction and the current filter; Success / Warning / Alert appear only as payment or ticket status (`paid` / `partial` / `overdue`, owed amounts, overdue banner); Growth Gold is used once per screen (the revenue icon on the dashboard statement, the HSMS+HCBT subscription chip).
- **Dashboard order for a thumb:** term statement (expected revenue, outstanding, reach) -> onboarded schools (first 5 + "See all") -> pitching -> prospects -> recent activity.
- **Pipeline:** stage chips with counts plus the selected stage's list and a 44px "Move to next stage" button, instead of horizontal kanban columns.
- **Support:** ticket list scrolls with the page; an open conversation fills the space between the top bar and the tab bar, actions get their own row, and the composer uses a 16px input (no iOS zoom).
- **Dialogs** (Record Payment, Add School, Add Hosted School) are bottom sheets on phones.

## Product surfaces: modes and the Operate floor

The world above is the marketing world. Everything below is the signed-in product, and it is where most of Hanoled's screen time happens. These sections record what the shipped code already does, plus the floor every Operate surface is held to. They do not introduce a second visual world.

| Area | Route root | Mode |
| --- | --- | --- |
| Public site (home, features, hcbt, admissions, contact, faqs) | `app/(marketing)` | **Persuade** |
| Help, support, security, privacy, terms, data-protection, article | `app/(marketing)/{help,support,…}` | **Read** |
| Sign-in, invite, verify, forgot/reset | `app/(auth)` | **Persuade**, under Operate constraints (one job, no decoration) |
| School onboarding, payment, account | `app/onboarding`, `app/payment`, `app/account` | **Operate** |
| School workspace, 62 routes | `app/dashboard/school/[slug]` | **Operate** |
| Role homes (10 roles) | same route, composed per role | **Operate** (each home earns one aimed moment) |
| CBT console | `app/cbt` | **Operate**; the exam room is Operate at maximum focus |
| Platform admin | `app/admin` | **Operate** |
| Post-login router | `app/welcome` | **Operate** |

Persuade work belongs on the public site and the auth screens. It does not belong on a ledger, a register, a gradebook, or an exam room.

### Tokens that already exist (recorded, not chosen here)

- **Tenant theming is the primary colour system.** `SchoolThemeProvider` reads `currentOrg.primaryColor` / `secondaryColor`, runs `deriveTheme` (`lib/theme-colors.ts`, WCAG math included) and injects `--primary`, `--primary-foreground`, `--primary-text`, `--primary-hover`, `--primary-active`, `--primary-light`, `--primary-border`, `--ring`, plus the `secondary` family, into `:root` and portals. Elyon College resolves red, Greenfield Academy resolves teal. Anything interactive must read those variables, never a fixed hex.
- **Base palette:** Hanoled Blue `#1447E6` is the default `--primary`, Deep Ink `#0B1220` the ink, Growth Gold `#F5A623` the secondary accent, Success `#12B76A` / Warning `#F5A623` / Alert `#F04438` reserved for status. Wing tint `#EEF0FF`.
- **Two token generations coexist:** the shadcn `:root` set in `oklch`, and the legacy HSL `.cbt-theme` block (light + `.dark`). Both must resolve to the same hues when either changes.
- **Type:** Poppins only. Page title `text-lg font-bold` (phone) / `text-xl` (desktop); section head `text-sm font-bold`; labels `text-xs font-semibold`; body `text-xs`–`text-sm`; every figure in `tabular-nums`.

### Density, as shipped

- Desktop: 256px sidebar from `lg`, table-first lists, ~56px rows, 44px "…" action menus, filters in a single toolbar row above the table.
- Phone: one title per screen (the top bar's), lists instead of cards, hairline dividers, whole row is the tap target, destructive and secondary row actions live in a 44px menu, dialogs rise as bottom sheets, primary actions stick above the tab bar.
- Tablet: desktop pages at full width, nav in a drawer, touch floors follow the pointer not the width.

### Data-state contract

Every data surface handles all six states, not just the happy one: **loading** (skeleton matching final layout), **empty** (what this space means + the next action), **error** (problem named + retry), **forbidden** (role-scoped explanation, no dead end), **partial** (some records missing, stated as such), **success** (changed state visible without a toast being the only evidence).

Shared primitives already carry this: `components/dashboard/shared/` — `TableContainer`, `TableEmpty`, `TableSkeleton`, `DataStateCard`, `EntityHeader`, `SearchInput`, `BackButton`, `RoleOnboardingCard`.

### The Operate floor

1. **One primary action per screen.** Secondary actions are quiet buttons; anything else is a row action or in a menu.
2. **Status colour is information.** Success / Warning / Alert only for real state. A school's `--primary` never means "good", "paid" or "passed".
3. **Numbers are exact and labelled.** `tabular-nums` everywhere; units named (₦, %, subjects); a settled balance is a dash, not "₦0" in Alert red; absent data is "—" or an explicit "Pending", never a bare zero.
4. **No card inside a card; no card where a table or list does the job.** Desktop lists are tables, phone lists are one container with dividers.
5. **Titles carry context.** No eyebrow labels, no greeting on a list page; greetings live on role homes only.
6. **Density over decoration.** Borders and shadows exist to separate or to elevate one thing, never as texture.
7. **Errors name the problem and the recovery.** Every destructive action confirms first.
8. **Motion explains a state change** (a stage switch, a row appearing, a save landing) and is otherwise still. `prefers-reduced-motion` shows the finished state.
9. **Touch floor 44px** on phones and coarse pointers; a visible focus ring from `--ring` on every interactive element.
10. **Optional surfaces stay optional.** A missing enhancement endpoint (catalog, periods, live counts) falls back silently and never raises a toast; only a failed primary fetch interrupts.

### Known fidelity gaps (recorded 2026-11-24, not yet fixed)

1. **Hardcoded brand colour inside tenant-themed screens.** 417 fixed hexes across `app/dashboard`, `app/admin`, `app/cbt` and their components — 261 × `#1447E6`, 173 × `#0B1220`, 42 × `#EEF0FF`, 34 × `#0F36B8`, 24 × `#F04438`, 21 × `#F5A623`. A school whose `--primary` is red still sees Hanoled blue wherever these land. Target: `var(--primary*)` for interaction, ink tokens for text, status tokens for state.
2. **Parallel token generations** (`oklch :root` and HSL `.cbt-theme`) can drift apart because nothing enforces equality.
3. **Marketing coverage is uneven**: `article/[slug]` is brand-compliant but not on the Gate & Crest system (a Read surface, lower priority than the Persuade pages).

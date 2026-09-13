---
version: 1
slug: "app-marketing"
primary_target: "app/(marketing)"
related_targets: []
---

# Surface: Hanoled marketing site (app/(marketing))

Scope: full public marketing site (home, about, features, hcbt, pricing, admissions-portal, contact, faqs, support, help, article, security, privacy/terms/data-protection). Visitor mode: **Persuade**.

Audience: School Proprietor/Admin (primary buyer, per PRODUCT.md), evaluating whether to move their school onto Hanoled. Job: decide this system can replace their paperwork/spreadsheets/manual processes with confidence.

Proof/content available: real module list and feature detail (from PRODUCT.md capabilities), the HCBT exam-engine detail (WAEC/NECO/JAMB banks, anti-cheating), Paystack/Monnify integration, informal (unattributed) teacher/admin feedback recorded in PRODUCT.md. No case studies or named customers yet — do not invent any.

Constraints: Hanoled Blue #1447E6 / Growth Gold #F5A623 (sparing, never repeated) / Deep Ink #0B1220 / White only, functional Success/Warning/Alert reserved strictly for real status — all pinned by the `hanoled-brand` skill (brief-pinned, non-negotiable). Poppins is the only typeface (also pinned). No public self-serve signup surfaced anywhere — every primary CTA routes to `/contact`, never `/signup` (standing business rule).

## Direction contract

**THESIS:** Hanoled feels like walking through a real, proud Nigerian school compound — every product area is a physical wing you visit (Gatehouse, Bursary, Exam Hall, Staffroom, Noticeboard), not a features grid. Refuses the generic global-SaaS "hero + icon-grid + testimonial carousel" arrangement the current site (and most competitors) ship.

**OWN-WORLD:** Deep Ink is the "gate pillar" structural color — section dividers, dark chrome, footer. Hanoled Blue is the dominant "signboard paint" fill for primary surfaces, nav, and buttons. Growth Gold appears exactly once per viewport as a foil/ribbon accent (crest braid, one stat highlight) — never repeated within a section. The Hanoled H-mark is presented as a crest/seal (circular medallion with a thin gold ring), not a small corner logo. Cards become "plaques": rectangular panels with a thick top rule instead of soft drop shadows. Section boundaries are literal "gate" thresholds — a full-width horizontal band in Deep Ink or Hanoled Blue between each campus wing, not quiet whitespace. Poppins Bold sets every wing/section label like carved signage lettering: wide tracking, uppercase, small.

**STORY:** Visitor understands this is one system standing in for every office in the school. Believes their messy paperwork (results, fees, timetables, admissions, parent comms) becomes as clean and official as the school's proudest crest. Acts by scrolling the "campus tour" (one wing per product pillar) and lands on a CTA that always routes to `/contact` (sales-assisted onboarding — never `/signup`, per standing constraint).

**FIRST VIEWPORT:** Full-width top band in Hanoled Blue styled as a school gate signboard. Centered: the Hanoled crest medallion (H-mark inside a circular seal, thin gold ring, a small live-feeling stat inside or beside it, e.g. schools/students figure). Headline set like carved signage lettering beneath the crest (existing brand copy, unchanged in meaning). One motto-style subhead line. Primary CTA styled as a nameplate button, routes to `/contact`. Below the fold: a thin "noticeboard" strip previewing the campus wings as pinned tabs (Bursary · Exam Hall · Staffroom · Gatehouse · Noticeboard) the visitor can jump to.

**FORM:** Grounded direction #5 of a 7-candidate resonance-ordered list (School Gate & Crest), assigned by `impeccable concept-seed` roll, seed key `6abfaecc`. Raised by three declined catalog challengers' disciplines: a live-feeling stat inside the crest medallion (from the particle-detector challenger's confidence in one dramatized data moment); a subtle ascending-line motion in progress/stat moments (from the bioluminescent-wake challenger, consistent with Hanoled's own brand "growth curve" motif); full-bleed, unboxed wing sections rather than shy card grids (from the skate-deck-wall challenger's wall-to-wall confidence). User confirmed this direction over three alternates (WAEC Result Slip world, Warm Consumer App world, polished-convention-no-reinvention) via structured question.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Status

Built as an extension across: homepage, features, about, hcbt, admissions-portal, contact, faqs, help, support, security, privacy, terms, data-protection. Each pass: gate-band hero (crest medallion, no eyebrow pill), `WingThreshold` dividers where a page has a real multi-part tour, accent-tab plaques instead of border-on-rounded cards, gold reserved to crest + primary CTA + small tabs. `impeccable detect` clean on every file touched; dev server compiles with no errors on every route.

Not yet extended: the `article/[slug]` blog template — already brand-color-compliant from an earlier pass but not restructured into this system. It's a long-form "Read" surface (comprehension over spectacle), lower priority than the Persuade pages, and a reasonable stopping point for this round.

No image generation available in this environment: build is **code-led** throughout. No comp, no comp-diff gates. Ambition is carried by this contract's FIRST VIEWPORT block and audited in behavior at the finish review (see the session's self-review notes — no literal screenshot files could be saved to `.impeccable/review/` in this environment, so verification relied on live-browser inspection at each route instead).

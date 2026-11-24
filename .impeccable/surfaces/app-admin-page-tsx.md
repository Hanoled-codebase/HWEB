---
version: 1
slug: "app-admin-page-tsx"
primary_target: "app/admin/page.tsx"
related_targets: ["app/admin","components/admin"]
---

# Surface: Platform admin (app/admin)

Scope: seven routes for Hanoled's own staff — dashboard, schools, payments, pipeline, hosted schools, support, login. Related: `components/admin`, `components/admin/mobile-kit.tsx`.

Visitor mode: **Operate**.

Audience: Hanoled staff onboarding schools and collecting subscription revenue. Small team, high context switching, every number is money or a promise.

Constraints:
- Colour is brand-only: Hanoled Blue for interaction and the current filter; Success/Warning/Alert only as payment or ticket status; Growth Gold used once per screen (the revenue statement icon, the HSMS+HCBT subscription chip).
- Phone: shared mobile shell, `MList`/`SchoolRow`/`ChipTabs`/`PaymentChip`/`SectionHead`/`EmptyPanel`, 72px tap rows, dialogs as bottom sheets.
- Tablet: labelled icon rail `w-20` from `md`, full 240px sidebar from `lg`; KPI strip 2 → 3 → 5 across so naira totals never clip.
- Order for a thumb: term statement → onboarded schools → pitching → prospects → recent activity.

## Direction contract

**THESIS:** a revenue desk, not a CRM demo. The screen answers "what came in, what is late, and which school needs a call" and nothing else competes with those three.

**OWN-WORLD:** Deep Ink chrome, white statement panels, one gold revenue moment per screen, status chips that read like a ledger stamp. No gradients, no hero metrics, no decorative charts.

**STORY:** I open it, I see the term's money, I see who is late, I open that school, I record the payment, I move on.

**FIRST VIEWPORT:** the term statement (expected, outstanding, reach) as the only large type on the screen, then the schools list with amounts right-aligned in tabular figures.

**FINISH:** no invented pipeline value, no school row without its owner, no payment state rendered as decoration.

## Status

Documented as shipped. Not yet audited. Batch G owns it.

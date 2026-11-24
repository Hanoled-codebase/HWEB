---
version: 1
slug: "app-dashboard-school-slug-students-page-tsx"
primary_target: "app/dashboard/school/[slug]/students/page.tsx"
related_targets: ["app/dashboard/school/[slug]","components/dashboard","components/results","components/spreadsheets"]
---

# Surface: School workspace (app/dashboard/school/[slug])

Scope: the 62 staff/student/parent routes under the school workspace — students, classes, subjects, teachers, parents, timetable, attendance, spreadsheets and the gradebook, results, result templates, scheme of work, lesson notes, homework, billing/invoices/payments/fee structure/debt/payroll, library, hostel, clinic, bus tracking, messaging, scratch cards, invites, access and settings. Related component roots: `components/dashboard`, `components/results`, `components/spreadsheets`, `components/students`, `components/forms`.

Visitor mode: **Operate**.

Audience: school staff doing a term's worth of administrative work, often on a phone, often with a queue of people waiting. The admin/proprietor is the anchor (PRODUCT.md), teachers and bursars are the daily hands.

Constraints:
- Tenant theming: every interactive colour is `var(--primary*)` from `SchoolThemeProvider`; 417 fixed hexes remain inside this surface and are the first fidelity gap to close.
- Desktop lists are tables (subgrid columns, ~56px rows, 44px "…" menu, whole row is a link). Phone lists are one container with hairline dividers and no column header that does not align with the row.
- Data-state contract: loading skeleton, empty with next action, error with retry, forbidden explained, partial stated, success visible.
- Optional enhancements (catalog, periods, live counts, computed results) fall back silently; only a failed primary fetch may raise a toast.
- Money is formatted with `termLabel()`, `invoiceStatusLabel()` and table figures; a settled balance is a dash, not "₦0".
- 44px touch floor below `md` and on coarse pointers; `pointer-fine` shrinks, never `md:min-h-0` alone.

## Direction contract

**THESIS:** the workspace should feel like a well-kept school office — every document is where you expect it, every list tells you what still needs doing, and nothing is decorated that is not being read. It refuses the admin-template look (a wall of bordered cards, a KPI strip on every page, a primary-coloured button in five places).

**OWN-WORLD:** white surfaces, one hairline container per list, tenant colour reserved for the live action and the current filter, status colours only for real state. Headings are quiet, figures are tabular, totals are right-aligned. The page title is the only H1, and the browser tab tells you the same thing.

**STORY:** I open a list, I scan it, I filter it, I open one record, I change it, I see that it saved, I go back to the same scroll position. When I am on a phone between classes, the same three steps work with my thumb.

**FIRST VIEWPORT:** page title, then the actions that belong to this page (search + filter, one primary action at most), then the list or table. No stat cards above a list unless the number changes what I do next.

**FINISH:** no route ships with a fake number, an untranslated raw enum, a table that scrolls sideways below `xl` instead of folding secondary columns, or an empty state with no way forward.

## Status

The workspace is on the mobile/tablet shell rules recorded in DESIGN.md, but it is not yet systematically distilled, hardened or adapted page by page. Batches D, E and F own that work.

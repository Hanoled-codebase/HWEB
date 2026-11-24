---
version: 1
slug: "app-dashboard-school-slug-page-tsx"
primary_target: "app/dashboard/school/[slug]/page.tsx"
related_targets: []
---

# Surface: Role homes (one home per role)

Scope: the home screen each signed-in role lands on after `app/welcome` routes them. Primary target `app/dashboard/school/[slug]/page.tsx`; related: `components/dashboard/AdminDesktopOverview.tsx`, `AdminMobileDashboard.tsx`, `teaching/TeachingHome.tsx`, `finance/FinanceHome.tsx`, `department/DepartmentHome.tsx`, `library/LibraryHome.tsx`, `mobile/ParentHome.tsx`, `StudentDashboardView.tsx`, `mobile/HomeKit.tsx`, `mobile/RoleHome.tsx`, `shared/RoleOnboardingCard.tsx`, plus `app/cbt/student`, `app/cbt/admin` and `app/admin` for the CBT and platform-admin homes.

Visitor mode: **Operate**. The visitor's success is "I know what needs me and I started it" — not "I admired the dashboard". Each home gets exactly one aimed moment, and restraint everywhere else.

Audience and job, per role:

| Role | Job the home exists for | The one obvious next step |
| --- | --- | --- |
| Proprietor/Admin | Know the school's state, then act | The next admin task that is actually pending |
| Class/Subject Teacher | Get into today's teaching work | Today's register, or the sheet that needs scores |
| Finance/Bursar | Collect and reconcile | Who owes, and record a payment |
| Head of Department | Oversee the department | Review teachers' sheets and results |
| Librarian | Move books | Issue, return, overdue |
| Parent | Pay and watch | Fees due, then wards' results |
| Student | Reach my work | The next exam, result, or timetable slot |
| CBT student | Sit the next exam | Start or resume the armed exam |
| CBT teacher/admin | Run the session | The live or next session |
| Platform admin | Onboard and collect | The school or payment that is blocked |

Constraints:
- Config-driven, never hardcoded per-role lists: `components/dashboard/mobile/mobile-config.ts` derives tabs, menu groups and identity from the same permission-filtered nav as the desktop sidebar. A role can never see a destination on mobile that desktop hides.
- Real data only. No invented counts, no placeholder statistics, no greeting when the name is a role label (`greetingName()`).
- One H1 per phone screen: the top bar. A home may show one greeting line, then the next action, then that role's tools.
- Onboarding is `RoleOnboardingCard`: dismissible, collapsible, `localStorage`-persisted, live completion state derived from real records. It is guidance, not a tour; it never blocks the page.
- Stat tiles collapse to one quiet line on phones and hide when everything is zero.
- Tenant `--primary` drives every interactive colour.

## Direction contract

**THESIS:** a role home is the school's front desk for that one person — it answers "what needs me now?" in one glance and one tap, and then gets out of the way. It refuses the generic SaaS dashboard (four KPI cards, a chart nobody asked for, an icon grid of every possible destination).

**OWN-WORLD:** the same world as the product: white surfaces on the Deep Ink-derived slate, hairline separators, tenant colour only on the live action and the current state. Onboarding reads as a printed checklist pinned by the staffroom door — numbered, tickable, dismissible — not a modal tour.

**STORY:** I arrive, I see my own school and role, I see the one thing waiting for me, I start it in one tap. If I have never used Hanoled, the checklist tells me the order to do things in, and ticks itself off as I actually do them.

**FIRST VIEWPORT (phone):** top bar with school + role, one greeting line, the single next-action card in tenant colour, then the role's tools as a plain list. No stats above the action unless the stat is the reason for the action ("55 results pending" earns its place; "Total Students 62" does not).

**FINISH:** no home ships with a placeholder number, a dead link, an empty state that only says "no data", or a checklist step that cannot complete.

## Status

Homes exist for admin (desktop + mobile), teacher, finance, department, library, parent and student; `RoleOnboardingCard` is wired into admin desktop, teaching and student. CBT and platform-admin homes use their own chrome (see the CBT and admin briefs). This brief governs the current pass; per-role detail is audited in Batch A.

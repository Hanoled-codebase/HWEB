---
target: phone, tablet and desktop views across marketing, auth, school dashboard (all roles), CBT
total_score: 14
max_score: 20
p0_count: 1
p1_count: 5
timestamp: 2026-10-01T12-00-00Z
slug: responsive-audit
---
Method: Playwright against the e2e fake backends (plus list fixtures for a realistic school) at 390x844 (phone, touch), 820x1180 (tablet portrait, touch), 1180x820 (tablet landscape, touch) and 1440x900 (desktop). 11 marketing routes, 3 auth routes, 21 admin routes, 5 teacher, 3 parent, 3 accountant, 5 pupil routes; each measured for sideways overflow, interactive elements under 40px and visible H1s. Detector: `impeccable detect app components`.

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | Auth pages have no H1; footer links turn Hanoled Blue on Deep Ink on hover (about 2.4:1) |
| 2 | Performance | 3 | No issues measured; student pages already mount once |
| 3 | Responsive Design | 2 | Phones solid; tablets inherit a fixed 256px sidebar and 36px desktop targets on touch |
| 4 | Theming | 3 | Palette lock works; a decorative status-green dot in the staff header |
| 5 | Implementation Integrity | 3 | Greetings use honorifics as first names; eyebrow labels on Results and Spreadsheets |
| **Total** | | **14/20** | **Good** |

## Implementation Integrity Verdict
Pass. The phone shell, palette lock and token system are product-specific and coherent. Detector: 26 hits; 20 gray-on-color are hover/focus/disabled pairs (false positives), 2 bounce-easing hits are the documented sheet spring (intentional), 4 side-tab `border-l-4` are real (about quote, article callouts).

## Findings

- **[P0] Tablet portrait squeezes every staff and student page.** `components/dashboard/AppSidebar.tsx` is a fixed `w-64` from 768px with no collapse; at 820px pages get ~516px: the Students title clips to "Studer", its description wraps one word per line, overview stat tiles collide with their icons, "More for your school" tiles overflow. Student shell (`StudentSidebar`) is the same. Fix: below 1024px the sidebar becomes a drawer behind a menu button. (adapt)
- **[P1] Touch tablets get desktop-sized targets.** 12-23 targets under 40px per page on tablets (sidebar links 36px, sidebar search 38px, sign-in tabs 36px, marketing hamburger 36px, footer links 17px, social icons 20px). Phones are clean (0). Fix: coarse-pointer floors on shared primitives and nav. (adapt)
- **[P1] Staff desktop header wraps on tablets.** "School Operations Dashboard", "CBT Console" and "Suite Hub" each break onto two lines at 820px. (adapt)
- **[P1] Greeting names are honorifics.** `user.name.split(" ")[0]` turns "Dr Amaka Eze" into "Welcome back, Dr", "Mrs Ngozi Obi" into "Welcome Back, Mrs", "Mr Adebayo Okafor" into "Good morning, Mr" (overview, spreadsheets, teacher, parent homes). (clarify)
- **[P1] Desktop Students list is one 100px card per learner.** 14 learners fill ~1,600px at 1440. Fix: dense table rows from 1024px. (layout)
- **[P1] Marketing nav collapses to a hamburger below 1280px.** Tablet landscape and 1024-1279 laptops lose the four-link nav that fits easily. Footer is five squeezed columns at 768-1023. Home "Switching is simple" is four 175px columns at 820. (adapt)
- **[P2] Auth pages have no H1** (sign-in, forgot password, admissions form). (harden)
- **[P2] Eyebrow labels** ("RESULTS PORTAL", "ACADEMIC RECORD", "SCORES WORKSPACE") above headings. (distill)
- **[P2] Footer contact details aren't links** (no tap-to-call / mailto); X and LinkedIn icons link to `#`. (harden)
- **[P3] Side-tab borders** on the About quote and article callouts. (polish)
- **[P3] Decorative green status dot** beside "School Operations Dashboard" (status colour used as decoration). (polish)

## Positive Findings
- 0 sideways overflow on every route at every width.
- 0 undersized targets on phones across all roles; one H1 per phone screen; bottom sheets, tab bar and safe areas hold.
- The palette lock in `globals.css` maps Tailwind defaults onto the brand ramp, so stray `emerald-*`/`indigo-*` still render on-brand.

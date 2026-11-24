# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the **School Proprietor/Admin** — the buyer and day-to-day operator who purchases Hanoled, manages student/staff records, fee structures, admissions, and holds ultimate oversight of the school's operations. Product decisions anchor on this user's job-to-be-done first.

Secondary, role-scoped users on the same platform: Owners, Teachers (gradebooks, lesson notes, homework, subject-scoped CBT exam creation), Parents (fee payment, monitoring wards' academic performance and attendance in real time), and Students (CBT exams, results, timetable, library).

Role home surfaces (one home per role, each showing only that role's real work):

| Role | Home surface | Job the home exists for |
| --- | --- | --- |
| School Proprietor/Admin | `app/dashboard/school/[slug]` → `AdminDesktopOverview` / `AdminMobileDashboard` | Know the school's state and start the next admin task |
| Class/Subject Teacher | same route → `TeachingHome` | Get into today's register, gradebook or result entry |
| Finance / Bursar | same route → `FinanceHome` | Collect fees, see who owes, reconcile payments |
| Head of Department | same route → `DepartmentHome` | Oversee department teachers, subjects and sheets |
| Librarian | same route → `LibraryHome` | Issue, return and track loans |
| Parent | same route → `ParentHome` | Pay fees, watch wards' results and attendance |
| Student | same route → `StudentDashboardView` | Reach CBT exams, results, timetable, library |
| CBT student | `app/cbt/student` | Sit an exam, practise, review history |
| CBT teacher/admin | `app/cbt/admin` | Author exams, watch a session, release grades |
| Platform admin (Hanoled staff) | `app/admin` | Onboard schools, track payments and pipeline |

`app/welcome` is the post-login destination that routes each of these roles to its home. Home composition is config-driven (`components/dashboard/mobile/mobile-config.ts` derives tabs, menu and identity from the same permission-filtered nav as the desktop sidebar), so a role cannot see a destination on mobile that desktop hides.

## Product Purpose

Hanoled is a unified school management system built specifically for Nigerian (West African) primary & secondary schools. It consolidates school administration, academics/grading, financial management, communication, student welfare/operations, admissions, and computer-based testing (HCBT) into one product, replacing the scattered spreadsheets, disconnected legacy tools, and manual processes schools currently rely on.

## Positioning

All-in-one for West Africa: School Management System + HCBT computer-based testing (with WAEC/NECO/JAMB-aligned question banks) + an Admissions portal, unified in one product purpose-built for Nigerian/West African school workflows — not a generic global SMS with exams bolted on afterward. A competing product would have to be built around the same curriculum/exam-board reality and local payment rails to truthfully make the same claim.

## Operating Context

- Schools run termly billing/fee collection, entrance exams, and result publishing cycles.
- Online fee collection runs through Nigerian payment rails: Paystack and Monnify.
- HCBT exams are timed (1–360 min), pull from WAEC/NECO/JAMB practice-question banks across 13+ subjects, support bulk question upload (PDF/DOCX/TXT) and LaTeX/KaTeX for math & science notation, and enforce proctoring (tab-switch lockout, 3-strike policy, auto-submit).
- Parent communication runs over WhatsApp, Email, and SMS, including automatic low-score alerts.
- Multi-site support: schools with more than one branch/organization context.
- Auth/identity is centralized through the HCORE backend; HWEB is the unified frontend consolidating Hanoled (HSMS), HCBT, and HCORE into one Next.js app.

## Capabilities and Constraints

Confirmed functional surface (role-based dashboards, subscription/product-gated by organization):
- School Administration: student/staff profiles (with TRCN tracking for teachers), class & subject setup, role-based access, multi-site support.
- Academic Management: digital gradebook with configurable CA/exam weightings, scheme of work & lesson notes, homework assignment/digital submission, result templates, one-click result publishing/transcripts.
- Financial Management: configurable fee structures, invoicing, Paystack/Monnify collection, debt dashboard, payroll, scratch-card result checking.
- Communication: WhatsApp/Email/SMS messaging with templates and automatic threshold alerts; a discussion board.
- Student Welfare & Operations: attendance (student + staff), timetabling, library loans, hostel allocation, bus tracking with GPS stops, clinic records.
- Admissions Portal: public application forms with online fee payment, entrance-exam scheduling tied into HCBT, pending→enrolled workflow with automatic admission numbers.
- HCBT (Computer-Based Testing): student exam-taking interface and an admin exam-authoring/question-bank interface, integrated rather than a separate product.

Technical constraints: Next.js 16 (App Router) frontend, HCORE as the identity/auth backend, separate HSMS/HCBT backend APIs behind a shared `apiFetch` client with automatic token refresh. No public self-serve signup surfaced in the marketing site or auth flow — accounts are provisioned/invited, not self-registered.

Terminology: HSMS = the core school-management product; HCBT = the computer-based testing engine; HCORE = shared identity backend; org/school context is selected via an org slug.

## Brand Commitments

Hanoled has a formal, already-documented brand system (see the `hanoled-brand` skill): Hanoled Blue `#1447E6` (primary/interactive), Growth Gold `#F5A623` (sparing accent only, never repeated/primary), Deep Ink `#0B1220` (dark neutral/headings), White; functional Success/Warning/Alert colors reserved strictly for status, never decoration. Typeface is Poppins (Bold/SemiBold headings, Medium UI labels, Regular body) across the in-product UI. The mark is a two-pillar "H" joined by an ascending diagonal (reads as both a checkmark and a growth curve) in flat color only. These are hard constraints, not suggestions — no color outside the approved palette anywhere in the product UI.

## Evidence on Hand

No formal published case studies, named customer logos, or attributed testimonials exist yet — the current marketing site's testimonial-style content is illustrative/representative, not real quotes, and must not be treated as fact to expand on.

Real (informal, unattributed) user feedback collected so far: teachers report that the ease of filling in spreadsheets and having that data sync automatically to the Head of Department is a standout benefit; admins report valuing the tighter operational control the platform gives them over their school. Treat this as directional qualitative signal, not a quotable testimonial — do not attribute it to a named person, school, or turn it into a fabricated quote/case study without the user supplying real attribution.

## Product Principles

1. Unify, don't bolt on — school management, CBT, and admissions should feel like one product with one identity, not a suite of stitched-together tools.
2. Built for the actual West African school year — Nigerian exam boards (WAEC/NECO/JAMB), local payment rails (Paystack/Monnify), and termly billing cycles are first-class, not afterthoughts.
3. The admin's control is the product's spine — teachers, parents, and students get focused, role-scoped views, but the proprietor/admin's oversight and control is the anchor use case.
4. Reduce manual/paper work at the point of daily use — the teacher's spreadsheet-to-HOD sync and the admin's real-time debt/attendance dashboards are the kind of "invisible admin burden removed" moments to keep designing toward.
5. No invented proof — positioning can claim differentiation, but evidence (testimonials, metrics, case studies) must stay real and attributed, or explicitly marked as absent.

## Accessibility & Inclusion

No formal accessibility standard has been established for this product yet; no known product-specific accessibility requirement is on record beyond general web best practice.

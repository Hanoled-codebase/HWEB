---
version: 1
slug: "app-cbt-student-page-tsx"
primary_target: "app/cbt/student/page.tsx"
related_targets: ["app/cbt","components/cbt"]
---

# Surface: CBT console (app/cbt)

Scope: eight routes — student dashboard, exam room, exam result, plus the admin console (overview, exams, grades, devices). Related: `components/cbt`, `CbtMobileChrome`, `MobileSegmentBar`.

Visitor mode: **Operate**, and the exam room is Operate at maximum focus: nothing on that screen may compete with the question, the timer, or the submit control.

Audience: students sitting timed exams on a desktop/tablet (phones are view-only by design), teachers authoring exams and watching a session, CBT admins managing the session and devices.

Constraints:
- Proctoring is a product invariant, not a UI preference: tab-switch lockout with a 3-strike policy and auto-submit; the timer is server-authoritative. The interface must never imply the timer is advisory.
- Phones are read-only for exams: every Start/Resume/Practice path shows `ExamDeviceNotice`; the exam room refuses to mount. The server enforces the same rule (`403 DEVICE_NOT_ALLOWED`).
- Account holder's name is always on screen (phone: `CbtGreeting` + `CbtAccountSheet`; desktop: header beside the role badge).
- Navigation: pill tab row from `sm`; phones get the bottom `MobileSegmentBar` (student: Exams / Practice / History; teacher: Overview / Exams; admin: Overview / Exams / Grades / Devices).
- `.cbt-theme` supplies its own token set in HSL (light + dark) and must stay resolved to the brand hues.
- Mathematics is rendered with KaTeX; question text must never reflow on load in a way that moves the selected option.

## Direction contract

**THESIS:** this is an exam hall, so the interface behaves like one: one seat, one paper, one clock, and a proctor who is visibly in charge. It refuses the gamified quiz skin (streaks, confetti, achievement badges) — a WAEC-aligned exam that plays like a game loses its authority.

**OWN-WORLD:** white paper surfaces, Deep Ink chrome, tenant colour only on the selected answer and the primary action, status colour only for real state (answered, flagged, submitted, disqualified). Question numbering is the only ornament.

**STORY:** I know which exam I am in, how long is left, how many questions are answered, and how to submit. If my connection or device drops, I am told plainly what happened and what still counted.

**FIRST VIEWPORT (exam room):** exam title, remaining time, progress (answered / total), the question, the options, then Back / Next / Flag and Submit. Nothing else.

**FINISH:** no exam route ships with a client-trusted clock, an unlabeled icon control, a phone path that pretends to work, or a result screen that shows a grade before the session releases it.

## Status

Documented as shipped. Batch G owns the pass.

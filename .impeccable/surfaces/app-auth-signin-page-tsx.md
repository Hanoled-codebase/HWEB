---
version: 1
slug: "app-auth-signin-page-tsx"
primary_target: "app/(auth)/signin/page.tsx"
related_targets: ["app/(auth)","app/onboarding","app/payment","app/account"]
---

# Surface: Auth, onboarding and payment (app/(auth), app/onboarding, app/payment, app/account)

Scope: sign-in per role (staff, parent, student), sign-up/invite acceptance, verify, forgot/reset password, school onboarding, payment verification, account (password). Related: `components/auth`, `components/forms`, `app/(auth)/layout.tsx`.

Visitor mode: **Persuade** under Operate constraints. The visitor must decide to trust Hanoled with a school's data in the first thirty seconds, but the screen itself has exactly one job and no room for decoration.

Audience: first-time staff and parents arriving from an invite link on a phone, often on mobile data, often interrupted.

Constraints:
- Login credentials are immutable without an explicit user request (workspace Rule 7). Copy changes never touch credential handling, reset semantics, or password policy.
- Access tokens are short-lived; refresh lives in `HttpOnly` cookies. `localStorage` token storage is banned. Nothing on these screens may expose a token in the URL or in a toast.
- Auth endpoints are rate-limited; a 401/403 is never retried in a loop (workspace Rule 8). Error copy names the real cause ("Wrong email or password", "This invite has expired") and the recovery.
- Tenant branding may appear (school crest, colour) when an org is known from the invite; otherwise the Hanoled mark.
- Phone: 16px inputs so iOS does not zoom; 44px targets; one column; the primary action is full width and reachable with a thumb.

## Direction contract

**THESIS:** the front gate of the school compound — a staffed gatehouse, not a glass lobby. The screen looks like somewhere a person will answer you, and it makes one promise: your school's records are safe here.

**OWN-WORLD:** Deep Ink chrome with a white form panel, Hanoled Blue for the single action, the crest as a seal rather than a logo, Growth Gold appearing once at most. No stock photography of generic students, no gradient mesh, no "Trusted by 500 schools" claim (no evidence exists, per PRODUCT.md).

**STORY:** I was invited, I recognise my school, I sign in without guessing which portal I am in, and if something is wrong I am told exactly what and what to do next.

**FIRST VIEWPORT:** crest, "Sign in to <School>" or the role-specific title, the form, one primary button, then the secondary paths (forgot password, switch role). Nothing else above the fold.

**FINISH:** no auth screen ships with a disabled button and no explanation, an error that blames the user for a server fault, a role ambiguity ("which sign-in is mine?"), or a success state that leaves the visitor with no next step.

## Status

Documented as shipped. Batch C owns the pass.

/**
 * Resolves the appropriate login page destination after a successful password reset.
 * Directs students, parents, and teachers/staff to their respective school-branded login portal.
 */

export interface PostResetRedirectParams {
  school?: string | null;
  audience?: string | null;
}

export function resolvePostResetRedirect(params?: PostResetRedirectParams): string {
  const school = params?.school?.trim();
  const rawAudience = params?.audience?.trim().toLowerCase();

  const query = school ? `?school=${encodeURIComponent(school)}` : "";

  if (rawAudience === "student" || rawAudience === "learner" || rawAudience === "pupil") {
    return `/signin/student${query}`;
  }

  if (rawAudience === "parent" || rawAudience === "guardian") {
    return `/signin/parent${query}`;
  }

  if (rawAudience === "staff" || rawAudience === "teacher" || rawAudience === "admin") {
    return `/signin/staff${query}`;
  }

  // Fallback for general accounts
  return `/signin${query}`;
}


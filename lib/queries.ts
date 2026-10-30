import { apiFetch } from "@/lib/api";

/**
 * Single source of truth for the query keys + fetchers of the dashboard's
 * hot list endpoints. Pages and the sidebar's hover-prefetch both read from
 * here, so a list fetched (or prefetched) for one screen is a cache hit on
 * every other screen that shows it (e.g. Parents reuses the Students list).
 */
export const orgQueries = {
  students: <T = unknown[]>(slug: string) => ({
    queryKey: ["students", slug] as const,
    queryFn: () => apiFetch<T>(`/students/${slug}`),
  }),
  classes: <T = unknown[]>(slug: string) => ({
    queryKey: ["classes", slug] as const,
    queryFn: () => apiFetch<T>(`/classes/${slug}`),
  }),
  teachers: <T = unknown[]>(slug: string) => ({
    queryKey: ["members", "teachers", slug] as const,
    queryFn: () => apiFetch<T>(`/organizations/${slug}/members`),
  }),
  parents: <T = unknown[]>(slug: string) => ({
    queryKey: ["members", "parent", slug] as const,
    queryFn: () => apiFetch<T>(`/organizations/${slug}/members?role=parent`),
  }),
  subjects: <T = unknown[]>(slug: string) => ({
    queryKey: ["subjects", slug] as const,
    queryFn: () => apiFetch<T>(`/subjects/${slug}`),
  }),
};

export type PrefetchQuery = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
};

/** Which queries a sidebar destination needs, keyed by the route's last segment. */
export function queriesForRoute(segment: string, slug: string, isPrivileged: boolean): PrefetchQuery[] {
  switch (segment) {
    case "students":
      return [orgQueries.students(slug), ...(isPrivileged ? [orgQueries.classes(slug)] : [])];
    case "classes":
      return [orgQueries.classes(slug), ...(isPrivileged ? [orgQueries.teachers(slug)] : [])];
    case "teachers":
      return isPrivileged ? [orgQueries.teachers(slug)] : [];
    case "parents":
      return [orgQueries.students(slug), ...(isPrivileged ? [orgQueries.parents(slug)] : [])];
    case "subjects":
      return [orgQueries.subjects(slug)];
    default:
      return [];
  }
}

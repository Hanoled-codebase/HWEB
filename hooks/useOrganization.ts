"use client";

import { create } from "zustand";
import { apiFetch, request, HCORE_BASE, HSMS_BASE } from "@/lib/api";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  category?: string;
  type?: string;
  schoolType?: string;
  paymentStatus?: string;
  subscription?: {
    plan: string;
    status: string;
  };
  counts: {
    students: number;
    teachers: number;
    parents: number;
  };
}

interface MemberUser {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  image?: string;
}

export interface MemberAssignment {
  id: string;
  type: "SUBJECT_TEACHER" | "CLASS_TEACHER" | "HOD" | "ACCOUNTANT" | "LIBRARIAN";
  classLevelId?: string | null;
  subjectId?: string | null;
  departmentId?: string | null;
  classLevel?: { id?: string; name?: string; level?: string } | null;
  subject?: { id?: string; name?: string; code?: string } | null;
  department?: { id?: string; name?: string } | null;
  startDate?: string;
  endDate?: string | null;
}

export interface Member {
  id: string;
  user: MemberUser | null;
  organization: { id?: string; slug?: string; name?: string } | null;
  role: "owner" | "admin" | "member" | "parent";
  assignedClasses: Array<{ id?: string; name?: string; level?: string }>;
  memberAssignments?: MemberAssignment[];
  teachingAssignments?: Array<{
    classLevel: { id?: string; name?: string; level?: string } | null;
    subject: { id?: string; name?: string; code?: string } | null;
  }>;
  assignedStudents: Array<{ id?: string; firstName?: string; lastName?: string }>;
  /** This school's role permissions, from the HSMS member profile. */
  access?: { roleCapabilities?: Record<string, string[]> };
}

interface StudentProfile {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string | null;
    classLevel?: { id: string; name: string; level?: string | null } | null;
  };
  org: Organization;
}

interface OrgState {
  organizations: Organization[];
  currentOrg: Organization | null;
  currentMember: Member | null;
  currentStudent: StudentProfile["student"] | null;
  isStudent: boolean;
  isLoading: boolean;
  hasFetchedOrganizations: boolean;
  error: string | null;
  fetchOrgs: () => Promise<void>;
  setCurrentOrg: (slug: string) => Promise<void>;
  /** Merge fields (e.g. a freshly uploaded logo) into the active school. */
  updateCurrentOrg: (patch: Partial<Organization>) => void;
  clear: () => void;
}

type OrganizationApiResponse = Partial<Organization> & {
  id: string;
  name: string;
  slug: string;
  counts?: Organization["counts"];
};

function normalizeOrganization(
  organization: OrganizationApiResponse,
): Organization {
  return {
    ...organization,
    type: organization?.type || organization?.schoolType || undefined,
    schoolType: organization?.schoolType || organization?.type || undefined,
    counts: organization?.counts || {
      students: 0,
      teachers: 0,
      parents: 0,
    },
  };
}

type AccessPolicy = NonNullable<Member["access"]>;
const ACCESS_CACHE_PREFIX = "hanoled.access.";

/**
 * A school's profile image and contact details live on HSMS (the public pages
 * and the PDF reports read them there). HCORE's context list only carries
 * id/name/slug/subscription, so a logo uploaded in Settings never reached the
 * sidebar, the school switcher or the report headers without this extra read.
 * Best-effort: a failure just leaves the HCORE fields untouched.
 */
type OrgBranding = Pick<Organization, "logo" | "email" | "phone" | "address">;

async function fetchOrgBranding(slug: string): Promise<OrgBranding | null> {
  try {
    const org = await request<Partial<Organization>>(HSMS_BASE, `/organizations/${slug}`, {
      showErrorToast: false,
    });
    return { logo: org.logo, email: org.email, phone: org.phone, address: org.address };
  } catch {
    return null;
  }
}

/** Drop undefined/null so a missing HSMS field can't overwrite a known value. */
function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null),
  ) as Partial<T>;
}

/**
 * The school's role permissions as last seen on this device. When HSMS can't
 * be reached, the menu keeps following the school's settings instead of
 * falling back to the defaults (which could show a tool the school took away;
 * the server still refuses it, but the menu shouldn't offer it).
 */
function rememberAccess(slug: string, access: AccessPolicy | undefined): AccessPolicy | undefined {
  if (typeof window === "undefined") return access;
  try {
    if (access) {
      window.localStorage.setItem(ACCESS_CACHE_PREFIX + slug, JSON.stringify(access));
      return access;
    }
    const cached = window.localStorage.getItem(ACCESS_CACHE_PREFIX + slug);
    return cached ? (JSON.parse(cached) as AccessPolicy) : undefined;
  } catch {
    return access;
  }
}

export const useOrganization = create<OrgState>((set, get) => ({
  organizations: [],
  currentOrg: null,
  currentMember: null,
  currentStudent: null,
  isStudent: false,
  isLoading: false,
  hasFetchedOrganizations: false,
  error: null,

  fetchOrgs: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await request<any>(HCORE_BASE, "/v1/me/contexts");
      const orgs = res.organizations || [];
      const normalized = orgs.map(normalizeOrganization);
      // HCORE owns identity, HSMS owns the school's logo/contact details, so
      // pull the branding for each school once, in parallel, and merge it in.
      const withBranding = await Promise.all(
        normalized.map(async (org: Organization) => {
          const branding = await fetchOrgBranding(org.slug);
          return branding ? { ...org, ...definedOnly(branding) } : org;
        }),
      );
      set({
        organizations: withBranding,
        isLoading: false,
        hasFetchedOrganizations: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load organizations",
        isLoading: false,
        organizations: [],
        hasFetchedOrganizations: true,
      });
    }
  },

  setCurrentOrg: async (slug: string) => {
    try {
      set({ isLoading: true, error: null, isStudent: false, currentMember: null, currentStudent: null });
      // Determine the org
      let org = get().organizations.find((o) => o.slug === slug);
      const needsContextFetch = !org;

      // The context fetch (only needed when org isn't already known locally)
      // and the member-profile fetch don't depend on each other's result —
      // both only need `slug`, which is already known — so run them
      // concurrently instead of paying two round trips back-to-back on every
      // cold dashboard load. See fast-rendering skill, Rule 2.
      //
      // Also fetch Hanoled (HSMS)'s own member-profile in the same batch. It
      // carries this school's role permissions (what an Accountant, HOD...
      // may do here) and any HOD/Accountant/Librarian grant made locally
      // before those roles moved to HCORE (Settings → Staff access). This
      // fetch is best-effort (a user with no Hanoled Member row yet, e.g.
      // brand new to the org, is expected to reject here) and merged in
      // below rather than trusted as a replacement for HCORE's role/identity
      // data.
      const [contextResult, memberResult, hsmsMemberResult, brandingResult] = await Promise.allSettled([
        needsContextFetch
          ? request<any>(HCORE_BASE, "/v1/me/contexts")
          : Promise.resolve(null),
        request<Member>(HCORE_BASE, `/v1/directory/organizations/${slug}/member-profile`, { showErrorToast: false }),
        request<Member>(HSMS_BASE, `/organizations/${slug}/member-profile`, { showErrorToast: false }),
        fetchOrgBranding(slug),
      ]);

      if (needsContextFetch) {
        if (contextResult.status === "fulfilled" && contextResult.value) {
          const contextOrgs = contextResult.value.organizations || [];
          const normalizedOrgs = contextOrgs.map(normalizeOrganization);
          set({ organizations: normalizedOrgs, hasFetchedOrganizations: true });
          org = normalizedOrgs.find((o: Organization) => o.slug === slug);
        } else if (contextResult.status === "rejected") {
          console.warn("Context fetch in setCurrentOrg failed:", contextResult.reason);
        }
      }

      if (!org) {
        // Build fallback org structure so UI doesn't get stuck in an infinite redirect loop
        const formattedName = slug
          .split("-")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");
        org = {
          id: slug,
          name: formattedName,
          slug: slug,
          counts: { students: 0, teachers: 0, parents: 0 },
        };
      }

      // Merge the school's HSMS branding (logo, contact details) regardless of
      // which branch resolves the org below, so the sidebar, switcher and report
      // headers all show the logo a school uploaded in Settings.
      const branding = brandingResult.status === "fulfilled" ? brandingResult.value : null;
      if (branding) org = { ...org, ...definedOnly(branding) };

      // First try member profile (for admin/teacher/parent users)
      if (memberResult.status === "fulfilled") {
        const member = memberResult.value;
        const hsmsMember = hsmsMemberResult.status === "fulfilled" ? hsmsMemberResult.value : null;

        // Union HCORE's assignments with Hanoled's — same assignment synced
        // from HCORE can appear in both, so de-dupe by id.
        const mergedAssignments: any[] = [];
        const seenAssignmentIds = new Set<string>();
        for (const a of [...(member.memberAssignments || []), ...(hsmsMember?.memberAssignments || [])]) {
          if (a?.id && seenAssignmentIds.has(a.id)) continue;
          if (a?.id) seenAssignmentIds.add(a.id);
          mergedAssignments.push(a);
        }

        // Merge assignedStudents so parent views work with either Hanoled ID or HCORE learner ID
        const mergedStudents: any[] = [];
        const seenStudentIds = new Set<string>();
        for (const s of [...(hsmsMember?.assignedStudents || []), ...(member.assignedStudents || [])]) {
          if (s?.id && seenStudentIds.has(s.id)) continue;
          if (s?.id) seenStudentIds.add(s.id);
          mergedStudents.push(s);
        }

        const rawAssignments = member.teachingAssignments || mergedAssignments;
        const normalizedAssignments = rawAssignments.map((a: any) => ({
          classLevel: a.classLevel || (a.classLevelId ? { id: a.classLevelId, name: a.classLevelName } : null),
          subject: a.subject || (a.subjectId ? { id: a.subjectId, name: a.subjectName, code: a.subjectCode } : null),
        }));

        set({
          currentOrg: org,
          currentMember: {
            ...member,
            memberAssignments: mergedAssignments,
            teachingAssignments: normalizedAssignments,
            assignedStudents: mergedStudents.length > 0 ? mergedStudents : (member.assignedStudents || []),
            assignedClasses: hsmsMember?.assignedClasses?.length ? hsmsMember.assignedClasses : (member.assignedClasses || []),
            // HCORE says who holds which role; HSMS says what each role may
            // do at this school (usePermissions combines the two).
            access: rememberAccess(slug, hsmsMember?.access),
          },
          isStudent: false,
          isLoading: false,
        });
        return;
      }
      // Member profile failed — try student profile

      // Try student profile (for students) — this lives on the Hanoled
      // (HSMS) backend as /organizations/:slug/student-profile, not on
      // HCORE, which has no such route (that fallback fetch 404'd here
      // unconditionally, so a real student never actually reached this
      // branch — see [slug]/page.tsx's `isStudent` check that depends on it).
      try {
        const profile = await request<StudentProfile>(HSMS_BASE, `/organizations/${slug}/student-profile`, { showErrorToast: false });
        set({
          currentOrg: profile.org ? normalizeOrganization(profile.org as any) : org,
          currentStudent: profile.student,
          isStudent: true,
          isLoading: false,
        });
        return;
      } catch (err) {
        // Fallback for HCORE transition if member endpoints don't exist
        console.warn("Member endpoints missing, using generic fallback for HCORE", err);
        set({
           currentOrg: org,
           currentMember: { id: "temp", user: null, organization: org, role: "owner", assignedClasses: [], assignedStudents: [] },
           isStudent: false,
           isLoading: false,
        });
        return;
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load organization",
        isLoading: false,
      });
    }
  },

  updateCurrentOrg: (patch: Partial<Organization>) =>
    set((state) => {
      if (!state.currentOrg) return state;
      const slug = state.currentOrg.slug;
      return {
        currentOrg: { ...state.currentOrg, ...patch },
        organizations: state.organizations.map((org) =>
          org.slug === slug ? { ...org, ...patch } : org,
        ),
      };
    }),

  clear: () => set({
    organizations: [],
    currentOrg: null,
    currentMember: null,
    currentStudent: null,
    isStudent: false,
    error: null,
    hasFetchedOrganizations: false,
  }),
}));

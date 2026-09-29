import { apiFetch, request, HCORE_BASE } from "@/lib/api";

/**
 * Staff access has two halves, owned by two services:
 *  - who holds a duty role (Accountant, Librarian, HOD) — HCORE, the school's
 *    identity record, so the grant follows the person into every product;
 *  - what each role may do at this school — HSMS (Hanoled), a product setting.
 */

export type DutyRole = "ACCOUNTANT" | "LIBRARIAN" | "HOD";

export const DUTY_ROLES: Array<{ code: DutyRole; label: string; description: string }> = [
  { code: "ACCOUNTANT", label: "Accountant", description: "Keeps the bursary: fees, payments, debts and payroll." },
  { code: "LIBRARIAN", label: "Librarian", description: "Runs the library shelves, loans and returns." },
  { code: "HOD", label: "Head of Department", description: "Oversees a department's teachers, sheets and results." },
];

export type StaffMember = {
  affiliationId: string;
  personId: string;
  name: string;
  email: string | null;
  status: string;
  /** CORE and HSMS role codes, e.g. ORG_OWNER, SCHOOL_ADMIN, TEACHER, ACCOUNTANT. */
  roles: string[];
  teaching: Array<{ type: string; className: string; subjectName: string | null }>;
};

export type CapabilityInfo = { key: string; label: string; description: string };
export type CapabilityGroup = { key: string; label: string; capabilities: CapabilityInfo[] };
export type RolePolicy = {
  code: string;
  label: string;
  description: string;
  defaults: string[];
  capabilities: string[];
  customized: boolean;
  updatedAt: string | null;
};

export type Department = {
  id: string;
  name: string;
  subjects: Array<{ id: string; name: string; code: string | null }>;
  heads: Array<{ memberId: string; affiliationId: string | null; name: string }>;
};
export type SchoolSubject = { id: string; name: string; code: string | null; departmentId: string | null };
export type DepartmentsView = { departments: Department[]; subjects: SchoolSubject[] };

export const ADMIN_ROLE_CODES = new Set(["ORG_OWNER", "ORG_ADMIN", "SCHOOL_ADMIN"]);

export const staffAccessApi = {
  listStaff: (orgId: string) =>
    request<{ staff: StaffMember[] }>(HCORE_BASE, `/v1/organizations/${orgId}/staff-roles`, { showErrorToast: false }),

  setRole: (orgId: string, affiliationId: string, role: DutyRole, grant: boolean) =>
    request<{ affiliationId: string; roles: Array<{ productCode: string; roleCode: string }> }>(
      HCORE_BASE,
      `/v1/organizations/${orgId}/affiliations/${affiliationId}/roles/${role}`,
      { method: grant ? "PUT" : "DELETE", showErrorToast: false },
    ),

  /**
   * Ask HSMS to pick up this person's new roles and teaching assignments now
   * rather than when HCORE's event lands. Pass `teachingChanged` after
   * replacing their teaching set, so rows HCORE doesn't hold end too.
   * `roles` is null when their roles couldn't be refreshed.
   */
  refreshProjection: (slug: string, affiliationId: string, options: { teachingChanged?: boolean } = {}) =>
    apiFetch<{ refreshed: boolean; roles?: unknown }>(`/access/${slug}/affiliations/${affiliationId}/refresh`, {
      method: "POST",
      body: JSON.stringify({ teachingChanged: options.teachingChanged === true }),
      showErrorToast: false,
    }).catch(() => ({ refreshed: false, roles: null })),

  departments: (slug: string) =>
    apiFetch<DepartmentsView>(`/access/${slug}/departments`, { showErrorToast: false }),

  createDepartment: (slug: string, name: string) =>
    apiFetch<Department>(`/access/${slug}/departments`, {
      method: "POST",
      body: JSON.stringify({ name }),
      showErrorToast: false,
    }),

  deleteDepartment: (slug: string, id: string) =>
    apiFetch<{ ok: boolean }>(`/access/${slug}/departments/${id}`, { method: "DELETE", showErrorToast: false }),

  setDepartmentSubjects: (slug: string, id: string, subjectIds: string[]) =>
    apiFetch<DepartmentsView>(`/access/${slug}/departments/${id}/subjects`, {
      method: "PUT",
      body: JSON.stringify({ subjectIds }),
      showErrorToast: false,
    }),

  /** Which departments an HOD leads. */
  setHodDepartments: (slug: string, affiliationId: string, departmentIds: string[]) =>
    apiFetch<{ departmentIds: string[] }>(`/access/${slug}/affiliations/${affiliationId}/departments`, {
      method: "PUT",
      body: JSON.stringify({ departmentIds }),
      showErrorToast: false,
    }),

  policies: (slug: string) =>
    apiFetch<{ groups: CapabilityGroup[]; roles: RolePolicy[] }>(`/access/${slug}/policies`, { showErrorToast: false }),

  savePolicy: (slug: string, role: string, capabilities: string[]) =>
    apiFetch<RolePolicy>(`/access/${slug}/policies/${role}`, {
      method: "PUT",
      body: JSON.stringify({ capabilities }),
      showErrorToast: false,
    }),
};

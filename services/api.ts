import { request, HCORE_BASE, HSMS_BASE, HCBT_BASE } from '../lib/api';

/** One class/subject teaching duty as HCORE stores it; ids are HCORE ids. */
/** One person, by whichever HCORE id the caller holds: learnerId, affiliationId or personId. */
export type PersonTarget = { learnerId: string } | { affiliationId: string } | { personId: string };

export type TeachingAssignmentInput = {
  classGroupId: string;
  subjectId: string | null;
  assignmentType: 'SUBJECT_TEACHER' | 'CLASS_TEACHER';
};

export const api = {
  // ─────────────────────────────────────────────────────────────────────────────
  // HCORE — Auth & Identity (Section 2.1)
  // ─────────────────────────────────────────────────────────────────────────────
  login: (data: {
    identifierType?: 'EMAIL' | 'ADMISSION_NUMBER';
    identifier: string;
    password: string;
    organizationSlugOrId?: string;
    audience?: string;
  }) =>
    request<any>(HCORE_BASE, '/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: {
    email: string;
    password: string;
    displayName: string;
    organizationName: string;
    organizationSlug: string;
  }) =>
    request<any>(HCORE_BASE, '/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: () =>
    request<any>(HCORE_BASE, '/v1/auth/refresh', { method: 'POST' }),

  logout: () =>
    request<any>(HCORE_BASE, '/v1/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<any>(HCORE_BASE, '/v1/me'),

  getMyContexts: () =>
    request<any>(HCORE_BASE, '/v1/me/contexts'),

  getSessions: () =>
    request<any[]>(HCORE_BASE, '/v1/auth/sessions').catch(() => []),

  revokeSession: (id: string) =>
    request<any>(HCORE_BASE, `/v1/auth/sessions/${id}`, { method: 'DELETE' }),

  // ─────────────────────────────────────────────────────────────────────────────
  // HCORE — Directory & Subscriptions (Section 2.2)
  // ─────────────────────────────────────────────────────────────────────────────
  getMemberProfile: (slug: string) =>
    request<any>(HCORE_BASE, `/v1/directory/organizations/${slug}/member-profile`),

  getStudentProfile: (slug: string) =>
    request<any>(HCORE_BASE, `/v1/directory/organizations/${slug}/student-profile`),

  getProducts: () =>
    request<any[]>(HCORE_BASE, '/v1/products').catch(() => []),

  getPublicOrganizations: () =>
    request<Array<{ id: string; name: string; slug: string }>>(HCORE_BASE, '/v1/public/organizations').catch(() => []),

  getProductPlans: (productCode: string) =>
    request<any[]>(HCORE_BASE, `/v1/products/${productCode}/plans`).catch(() => []),

  getOrgSubscriptions: (orgId: string) =>
    request<any[]>(HCORE_BASE, `/v1/organizations/${orgId}/subscriptions`).catch(() => []),

  activateSubscription: (orgId: string, data: any) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/subscriptions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelSubscription: (orgId: string, productCode: string) =>
    request<any>(
      HCORE_BASE,
      `/v1/organizations/${orgId}/subscriptions/${productCode}/cancel`,
      { method: 'POST' },
    ),

  // ─────────────────────────────────────────────────────────────────────────────
  // HCORE — Canonical Directory & Roster (Section 2.2)
  // ─────────────────────────────────────────────────────────────────────────────
  getLearners: (orgId: string) =>
    request<any[]>(HCORE_BASE, `/v1/organizations/${orgId}/learners`).catch(() => []),

  getClasses: (orgId: string) =>
    request<any[]>(HCORE_BASE, `/v1/organizations/${orgId}/classes`).catch(() => []),

  getSubjects: (orgId: string) =>
    request<any[]>(HCORE_BASE, `/v1/organizations/${orgId}/subjects`).catch(() => []),

  createLearner: (orgId: string, data: any) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/learners`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createClass: (orgId: string, data: any) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/classes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createSubject: (orgId: string, data: any) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/subjects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  importRoster: (orgId: string, data: any) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/roster-imports`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Admin reset: a one-time temporary password the person must replace at sign-in.
  resetPassword: (orgId: string, target: PersonTarget) =>
    request<{ temporaryPassword: string }>(HCORE_BASE, `/v1/organizations/${orgId}/password-resets`, {
      method: 'POST',
      body: JSON.stringify(target),
      showErrorToast: false,
    }),

  // Data-protection requests (HCORE modules/privacy). The person is named by
  // learnerId (students), affiliationId (staff, parents) or personId.
  exportPersonalData: (orgId: string, target: PersonTarget) =>
    request<Record<string, unknown>>(HCORE_BASE, `/v1/organizations/${orgId}/data-requests/export`, {
      method: 'POST',
      body: JSON.stringify(target),
      showErrorToast: false,
    }),

  erasePersonalData: (orgId: string, target: PersonTarget, reason?: string) =>
    request<{ erased: true; scope: 'organization' | 'full' }>(HCORE_BASE, `/v1/organizations/${orgId}/data-requests/erase`, {
      method: 'POST',
      body: JSON.stringify({ ...target, confirm: 'ERASE', ...(reason ? { reason } : {}) }),
      showErrorToast: false,
    }),

  getPrivacySettings: (orgId: string) =>
    request<{ leaverRetentionYears: number | null }>(HCORE_BASE, `/v1/organizations/${orgId}/privacy-settings`, { showErrorToast: false }),

  updatePrivacySettings: (orgId: string, leaverRetentionYears: number | null) =>
    request<{ leaverRetentionYears: number | null }>(HCORE_BASE, `/v1/organizations/${orgId}/privacy-settings`, {
      method: 'PUT',
      body: JSON.stringify({ leaverRetentionYears }),
      showErrorToast: false,
    }),

  getTeachers: (orgId: string) =>
    request<any[]>(HCORE_BASE, `/v1/organizations/${orgId}/teachers`).catch(() => []),

  createTeacher: (orgId: string, data: any) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/teachers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Errors are not swallowed here: an empty list read by mistake would make the
  // replace-all update below wipe this teacher's assignments.
  getTeacherAssignments: (orgId: string, affiliationId: string) =>
    request<{ assignments: Array<TeachingAssignmentInput & { id: string }> }>(
      HCORE_BASE,
      `/v1/organizations/${orgId}/teachers/${affiliationId}/assignments`,
      { showErrorToast: false },
    ),

  /** Replaces the teacher's whole set: send every assignment they should keep. */
  updateTeacherAssignments: (orgId: string, affiliationId: string, assignments: TeachingAssignmentInput[]) =>
    request<{ ok: boolean; count: number }>(HCORE_BASE, `/v1/organizations/${orgId}/teachers/${affiliationId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
      showErrorToast: false,
    }),

  importTeachers: (orgId: string, data: any) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/teacher-imports`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTeacher: (orgId: string, affiliationId: string) =>
    request<any>(HCORE_BASE, `/v1/organizations/${orgId}/teachers/${affiliationId}`, {
      method: 'DELETE',
    }),

  admissions: {
    list: (params?: Record<string, string | number>) =>
      request<any>(HSMS_BASE, '/api/admissions', { params }),
    apply: (data: {
      givenName: string;
      familyName: string;
      proposedClassId: string;
      parentEmail?: string;
      [key: string]: any;
    }) =>
      request<any>(HSMS_BASE, '/api/admissions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  payments: {
    list: (params?: { page?: number; limit?: number; status?: string; [key: string]: any }) =>
      request<any>(HSMS_BASE, '/api/payments', { params }),
    record: (data: {
      studentId: string;
      amount: number;
      currency?: string;
      type: string;
      [key: string]: any;
    }) =>
      request<any>(HSMS_BASE, '/api/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  attendance: {
    get: (params?: { classGroupId?: string; date?: string; [key: string]: any }) =>
      request<any>(HSMS_BASE, '/api/attendance', { params }),
    log: (data: {
      classGroupId: string;
      date: string;
      records: Array<{ learnerId: string; status: string }>;
    }) =>
      request<any>(HSMS_BASE, '/api/attendance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  homework: {
    list: (params?: { classGroupId?: string; [key: string]: any }) =>
      request<any>(HSMS_BASE, '/api/homework', { params }),
    create: (data: any) =>
      request<any>(HSMS_BASE, '/api/homework', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  debt: {
    list: (params?: Record<string, any>) =>
      request<any>(HSMS_BASE, '/api/debt', { params }),
  },

  scratchCards: {
    list: (params?: Record<string, any>) =>
      request<any>(HSMS_BASE, '/api/scratch-cards', { params }),
  },

  comments: {
    list: (params?: { termId?: string; studentId?: string; [key: string]: any }) =>
      request<any>(HSMS_BASE, '/api/comments', { params }),
    create: (data: any) =>
      request<any>(HSMS_BASE, '/api/comments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  supportTickets: {
    list: (params?: Record<string, any>) =>
      request<any>(HSMS_BASE, '/api/support-tickets', { params }),
    create: (data: any) =>
      request<any>(HSMS_BASE, '/api/support-tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HCBT — Computer-Based Testing APIs (Section 4)
  // ─────────────────────────────────────────────────────────────────────────────
  pastQuestions: {
    subjects: () =>
      request<string[]>(HCBT_BASE, '/api/past-questions/subjects'),
    years: (subject: string) =>
      request<number[]>(HCBT_BASE, `/api/past-questions/years?subject=${encodeURIComponent(subject)}`),
    fetch: (subject: string, ssceBoard: string, year?: number) =>
      request<any>(
        HCBT_BASE,
        `/api/past-questions/fetch?subject=${encodeURIComponent(subject)}&ssceBoard=${ssceBoard}${year ? `&year=${year}` : ''}`,
      ),
  },

  cbt: {
    getExams: (params?: Record<string, string | number>) =>
      request<any[]>(HCBT_BASE, '/api/exams', { params }),
    getExam: (id: string) =>
      request<any>(HCBT_BASE, `/api/exams/${id}`),
    startAttempt: (examId: string) =>
      request<{ attemptId: string; questions: any[]; duration: number; startedAt: string }>(
        HCBT_BASE,
        '/api/attempts/start',
        { method: 'POST', body: JSON.stringify({ examId }) },
      ),
    submitAttempt: (attemptId: string, answers: Record<string, number>) =>
      request<any>(HCBT_BASE, `/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }),
    acquireLease: (examId: string) =>
      request<any>(HCBT_BASE, '/api/offline/lease', {
        method: 'POST',
        body: JSON.stringify({ examId }),
      }),
    syncOfflineAttempt: (data: any) =>
      request<any>(HCBT_BASE, '/api/offline/sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

// Hanoled CBT Frontend API Client

import { request, HCBT_BASE, type RequestOptions } from './api';
import { authFetchInit } from './auth-tokens';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
interface ApiOptions extends RequestOptions {
  params?: Record<string, string>;
}

async function fetchCbt<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = clean.startsWith('/api/') ? clean : `/api${clean}`;
  return request<T>(HCBT_BASE, path, options);
}

// ── Types ──────────────────────────────────────────────────────────────

interface ExamData { title: string; duration: number; [key: string]: JsonValue; }
// A multiple-choice question has options and a correct answer; a theory one
// (type "theory") has neither and may carry a markingGuide.
interface QuestionData { text: string; type?: "objective" | "theory"; options?: string[]; correctAnswer?: number; [key: string]: JsonValue | undefined; }
interface SubmitData { answers: Array<{ questionId: string; selectedOption: number }>; currentVersion?: number; }
interface AssignData { classLevelId?: string; studentId?: string; }

export interface LateSubmission {
  id: string;
  attemptId: string;
  exam: { id: string; title: string; questionCount: number };
  student: { id: string; name: string | null; admissionNumber: string | null };
  answered: number;
  deadlineAt: string | null;
  deviceSubmittedAt: string | null;
  receivedAt: string;
}

export interface MarkingSheet {
  awaitingMarking: number;
  questions: Array<{
    questionId: string;
    text: string;
    marks: number;
    markingGuide: string | null;
    awaitingMarking: number;
    scripts: Array<{
      resultId: string;
      studentName: string;
      admissionNumber: string | null;
      textAnswer: string | null;
      marks: number;
      marked: boolean;
      comment: string | null;
    }>;
  }>;
}

export type ItemFlag = "TOO_HARD" | "TOO_EASY" | "CHECK_ANSWER_KEY" | "WEAK_DISCRIMINATION";

export interface ItemAnalysis {
  candidates: number;
  excludedForCheating: number;
  groupSize: number;
  items: Array<{
    questionId: string;
    number: number;
    type?: "objective" | "theory";
    awaitingMarking?: number;
    text: string;
    options: string[];
    correctAnswer: number;
    correct: number | null;
    blank: number;
    choiceCounts: number[];
    difficulty: number | null;
    discrimination: number | null;
    flags: ItemFlag[];
  }>;
}

export type EdgePlatform = "mac" | "win" | "linux";

// ── API Methods ─────────────────────────────────────────────────────────

export const cbtApi = {
  // ── Edge Appliances (Admin) ─────────────────────────────────────────
  getEdgeNodes: () => fetchCbt<any[]>(`/edge-nodes`),
  revokeEdgeNode: (id: string) => fetchCbt(`/edge-nodes/${id}/revoke`, { method: "POST" }),
  exportExamPackage: (examId: string, data: any) => fetchCbt(`/api/edge/packages/${examId}/export`, { method: "POST", body: JSON.stringify(data) }),
  // Practice packs: built only from already-cached past-question sets, never a live vendor call.
  getAvailablePracticeSets: () => fetchCbt<{ sets: Array<{ subject: string; ssceBoard: string; year: number; questionCount: number; lastFetched: string }> }>(`/edge-nodes/practice-packs/available`),
  exportPracticePack: (selections: Array<{ subject: string; ssceBoard: string; year: number }>) =>
    fetchCbt(`/edge-nodes/practice-packs/export`, { method: "POST", body: JSON.stringify({ selections }) }),
  // Which platform builds actually exist on the server (e.g. { mac: true, win: true }).
  getEdgeAppliancePlatforms: () => fetchCbt<Record<string, boolean>>(`/edge-nodes/download/platforms`),
  // The published installer or build for a platform, if a release is out.
  getEdgeApplianceLink: (platform: EdgePlatform) =>
    fetchCbt<{ url: string | null; file?: string; sha256?: string; version?: string }>(`/edge-nodes/download/link?platform=${platform}`),
  // Binary download from this server — bypasses fetchCbt's JSON parsing, returns a Blob.
  downloadEdgeAppliance: async (platform: EdgePlatform = "mac"): Promise<Blob> => {
    const res = await fetch(`${HCBT_BASE}/api/edge-nodes/download?platform=${platform}`, authFetchInit("hcbt"));
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || "Failed to download the Edge Appliance executable");
    }
    return res.blob();
  },

  // ── Exams (Admin CRUD) ──────────────────────────────────────────────
  createExam: (data: ExamData) => fetchCbt("/exams", { method: "POST", body: JSON.stringify(data) }),
  getExams: (params = "") => fetchCbt<unknown[]>(`/exams${params}`),
  getExam: (id: string) => fetchCbt(`/exams/${id}`),
  updateExam: (id: string, data: Partial<ExamData>) => fetchCbt(`/exams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteExam: (id: string) => fetchCbt(`/exams/${id}`, { method: "DELETE" }),

  // ── Questions ───────────────────────────────────────────────────────
  addQuestion: (examId: string, data: QuestionData) => fetchCbt(`/exams/${examId}/questions`, { method: "POST", body: JSON.stringify(data) }),
  addQuestionsBulk: (examId: string, data: { questions: QuestionData[] }) => fetchCbt(`/exams/${examId}/questions/bulk`, { method: "POST", body: JSON.stringify(data) }),
  importQuestionsApi: (examId: string, data: { subject: string; ssceBoard: string; year?: number; count?: number }) => fetchCbt(`/exams/${examId}/questions/import-api`, { method: "POST", body: JSON.stringify(data) }),
  deleteQuestion: (examId: string, qId: string) => fetchCbt(`/exams/${examId}/questions/${qId}`, { method: "DELETE" }),

  // ── Attempts (New API spec) ─────────────────────────────────────────
  startAttempt: (examId: string) =>
    fetchCbt<{ attemptId: string; questions: any[]; duration: number; startedAt: string }>(
      `/attempts/start`, { method: "POST", body: JSON.stringify({ examId }) }
    ),
  submitAttempt: (attemptId: string, answers: Record<string, number>) =>
    fetchCbt(`/attempts/${attemptId}/submit`, { method: "POST", body: JSON.stringify({ answers }) }),

  // ── Student (Legacy compat) ─────────────────────────────────────────
  getAssignedExams: (orgSlug: string) => fetchCbt(`/student/assigned?orgSlug=${orgSlug}`),
  // The server refuses to start an exam on a phone (403 DEVICE_NOT_ALLOWED). A phone in
  // "desktop site" mode rewrites its User-Agent but not its hardware, so we declare the
  // physical screen size too.
  startExam: (examId: string, passkey?: string) =>
    fetchCbt(`/student/${examId}/start`, {
      method: "POST",
      headers: typeof window !== "undefined" ? { "X-Client-Screen": `${window.screen.width}x${window.screen.height}` } : undefined,
      body: JSON.stringify(passkey ? { passkey } : {}),
    }),
  reportTabSwitch: (examId: string) => fetchCbt(`/student/${examId}/report-tab-switch`, { method: "POST" }),
  submitExam: (examId: string, data: SubmitData & { cheating?: boolean }) => fetchCbt(`/student/${examId}/submit`, { method: "POST", body: JSON.stringify(data) }),
  getExamResult: (examId: string, options?: ApiOptions) => fetchCbt(`/student/${examId}/result`, options),
  getStudentHistory: (orgSlug: string) => fetchCbt(`/student/history?orgSlug=${orgSlug}`),

  // ── Past Questions Proxy ────────────────────────────────────────────
  getPastQuestionSubjects: () => fetchCbt<string[]>("/api/past-questions/subjects"),
  getPastQuestionYears: (subject: string) => fetchCbt<number[]>(`/api/past-questions/years?subject=${encodeURIComponent(subject)}`),
  fetchPastQuestions: (subject: string, board: string, year?: number) =>
    fetchCbt(`/api/past-questions/fetch?subject=${encodeURIComponent(subject)}&ssceBoard=${board}${year ? `&year=${year}` : ""}`),

  // Legacy aliases
  getSubjects: () => fetchCbt("/past-questions/subjects"),
  getYears: (subject: string) => fetchCbt(`/past-questions/years?subject=${encodeURIComponent(subject)}`),

  // Offline submission sync lives in lib/cbt-sync.ts: it authenticates with the
  // attempt lease and must bypass request()'s session refresh / sign-out.

  // ── Admin / Teacher Operations ──────────────────────────────────────
  getAdminStats: (orgSlug: string) => fetchCbt(`/admin/stats?orgSlug=${orgSlug}`),
  getAdminExams: (orgSlug: string) => fetchCbt(`/admin/exams?orgSlug=${orgSlug}`),
  getAdminStudents: (orgSlug: string) => fetchCbt(`/admin/students?orgSlug=${orgSlug}`),
  // Offline attempts that arrived after their upload window, awaiting an admin's decision.
  getLateSubmissions: (orgSlug: string) => fetchCbt<LateSubmission[]>(`/admin/late-submissions?orgSlug=${orgSlug}`),
  decideLateSubmission: (orgSlug: string, id: string, decision: "accept" | "dismiss") =>
    fetchCbt<{ status: string; score?: number; totalMarks?: number; percentage?: number }>(
      `/admin/late-submissions/${id}/${decision}?orgSlug=${orgSlug}`,
      { method: "POST", showErrorToast: false },
    ),
  // What HCBT holds about a candidate (learnerId) or staff member (personId), for a data request.
  exportPersonalData: (orgSlug: string, who: { learnerId: string } | { personId: string } | { affiliationId: string }) =>
    fetchCbt<Record<string, unknown>>(
      `/admin/people/export?${new URLSearchParams({ orgSlug, ...who }).toString()}`,
      { showErrorToast: false },
    ),
  // HCBT staff, for the password-reset screen; organizationId names the school in HCORE.
  getAccounts: (orgSlug: string) =>
    fetchCbt<{ organizationId: string; staff: Array<{ personId: string; name: string; email: string | null; roles: string[] }> }>(
      `/admin/accounts?orgSlug=${orgSlug}`,
    ),
  getAdminExamResultsOverview: (examId: string, orgSlug: string) => fetchCbt(`/admin/exam/${examId}/results?orgSlug=${orgSlug}`),
  // Theory answers to mark, grouped by question.
  getMarkingSheet: (examId: string) => fetchCbt<MarkingSheet>(`/exams/${examId}/marking`, { showErrorToast: false }),
  markAnswer: (examId: string, resultId: string, questionId: string, body: { marks: number; comment?: string | null }) =>
    fetchCbt<{ resultId: string; score: number; totalMarks: number; percentage: number; awaitingMarking: number }>(
      `/exams/${examId}/results/${resultId}/answers/${questionId}/mark`,
      { method: "PUT", body: JSON.stringify(body), showErrorToast: false },
    ),
  // How each question performed (Hcbt shared/item-analysis).
  getItemAnalysis: (examId: string) => fetchCbt<ItemAnalysis>(`/exams/${examId}/item-analysis`, { showErrorToast: false }),
  getClasses: (orgSlug: string) => fetchCbt(`/admin/classes?orgSlug=${orgSlug}`),
  getOrgSubjects: (orgSlug: string) => fetchCbt(`/admin/subjects?orgSlug=${orgSlug}`),
  getTeacherClasses: (orgSlug: string) => fetchCbt(`/admin/teacher-classes?orgSlug=${orgSlug}`),
  getTeacherStudents: (orgSlug: string, classLevelId: string) => fetchCbt(`/admin/teacher-students?orgSlug=${orgSlug}&classLevelId=${classLevelId}`),
  assignExam: (examId: string, data: AssignData) => fetchCbt(`/exams/${examId}/assign`, { method: "POST", body: JSON.stringify(data) }),
  getStudentHistoryDetail: (studentId: string, orgSlug: string) => fetchCbt(`/admin/students/${studentId}/history?orgSlug=${orgSlug}`),
  releaseExamResults: (examId: string) => fetchCbt(`/exams/${examId}/release-results`, { method: "POST" }),
  withdrawExamResults: (examId: string) => fetchCbt(`/exams/${examId}/release-results`, { method: "DELETE" }),
  getExamPasskey: (examId: string) => fetchCbt(`/exams/${examId}/passkey`),
  generateExamPasskey: (examId: string, mode: "shared" | "unique") =>
    fetchCbt(`/exams/${examId}/passkey`, { method: "POST", body: JSON.stringify({ mode }) }),
  disableExamPasskey: (examId: string) => fetchCbt(`/exams/${examId}/passkey`, { method: "DELETE" }),

  // ── File Upload ─────────────────────────────────────────────────────
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchCbt("/admin/upload", { method: "POST", body: formData });
  },

  // ── Export Results ───────────────────────────────────────────────────
  exportExamResults: (
    examId?: string,
    orgSlug?: string,
    params?: {
      classLevelId?: string;
      classLevel?: string;
      level?: string;
      minScore?: number | string;
      maxScore?: number | string;
      subject?: string;
      subjectId?: string;
      cheated?: string;
      studentIds?: string;
      format?: string;
    }
  ) => {
    const query = new URLSearchParams();
    if (orgSlug) query.set("orgSlug", orgSlug);
    if (examId && examId !== "all") query.set("examId", examId);
    if (params?.classLevelId && params.classLevelId !== "all") query.set("classLevelId", params.classLevelId);
    if (params?.classLevel && params.classLevel !== "all") query.set("classLevel", params.classLevel);
    if (params?.level && params.level !== "all") query.set("level", params.level);
    if (params?.minScore !== undefined && params.minScore !== "") query.set("minScore", String(params.minScore));
    if (params?.maxScore !== undefined && params.maxScore !== "") query.set("maxScore", String(params.maxScore));
    if (params?.subject && params.subject !== "all") query.set("subject", params.subject);
    if (params?.subjectId && params.subjectId !== "all") query.set("subjectId", params.subjectId);
    if (params?.cheated && params.cheated !== "all") query.set("cheated", params.cheated);
    if (params?.studentIds) query.set("studentIds", params.studentIds);
    if (params?.format) query.set("format", params.format);
    return `${HCBT_BASE}/api/admin/export-results?${query.toString()}`;
  },

  getExportResultsData: (
    examId?: string,
    orgSlug?: string,
    params?: {
      classLevelId?: string;
      classLevel?: string;
      level?: string;
      minScore?: number | string;
      maxScore?: number | string;
      subject?: string;
      subjectId?: string;
      cheated?: string;
      studentIds?: string;
    }
  ) => {
    const query = new URLSearchParams({ format: "json" });
    if (orgSlug) query.set("orgSlug", orgSlug);
    if (examId && examId !== "all") query.set("examId", examId);
    if (params?.classLevelId && params.classLevelId !== "all") query.set("classLevelId", params.classLevelId);
    if (params?.classLevel && params.classLevel !== "all") query.set("classLevel", params.classLevel);
    if (params?.level && params.level !== "all") query.set("level", params.level);
    if (params?.minScore !== undefined && params.minScore !== "") query.set("minScore", String(params.minScore));
    if (params?.maxScore !== undefined && params.maxScore !== "") query.set("maxScore", String(params.maxScore));
    if (params?.subject && params.subject !== "all") query.set("subject", params.subject);
    if (params?.subjectId && params.subjectId !== "all") query.set("subjectId", params.subjectId);
    if (params?.cheated && params.cheated !== "all") query.set("cheated", params.cheated);
    if (params?.studentIds) query.set("studentIds", params.studentIds);
    return fetchCbt<{ totalResults: number; results: any[] }>(`/admin/export-results?${query.toString()}`);
  },

  // ── Document Import ─────────────────────────────────────────────────
  importDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchCbt("/admin/import-document", { method: "POST", body: formData });
  },

  importDocumentToExam: (examId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchCbt(`/admin/import-document/${examId}`, { method: "POST", body: formData });
  },

  // ── Auth ─────────────────────────────────────────────────────────────
  login: (identifier: string, password: string) => fetchCbt("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }),
  // Appliance only: the second half of a sign-in with a school-set password.
  changePassword: (changeToken: string, newPassword: string) =>
    fetchCbt("/auth/change-password", { method: "POST", body: JSON.stringify({ changeToken, newPassword }), showErrorToast: false }),
  logout: (options: ApiOptions = {}) => fetchCbt("/auth/logout", { ...options, method: "POST" }),
  getProfile: () => fetchCbt("/auth/profile"),
  checkAuth: async () => {
    try {
      return await fetchCbt("/auth/me", { showErrorToast: false });
    } catch {
      return { authenticated: false };
    }
  },
};

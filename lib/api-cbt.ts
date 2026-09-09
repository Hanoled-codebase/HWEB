// Hanoled CBT Frontend API Client

import { request, HCBT_BASE, type RequestOptions } from './api';
import { getHcbtToken } from './auth-tokens';

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
interface QuestionData { text: string; options: string[]; correctAnswer: number; [key: string]: JsonValue; }
interface SubmitData { answers: Array<{ questionId: string; selectedOption: number }>; currentVersion?: number; }
interface AssignData { classLevelId?: string; studentId?: string; }

// ── API Methods ─────────────────────────────────────────────────────────

export const cbtApi = {
  // ── Edge Appliances (Admin) ─────────────────────────────────────────
  getEdgeNodes: () => fetchCbt<any[]>(`/edge-nodes`),
  revokeEdgeNode: (id: string) => fetchCbt(`/edge-nodes/${id}/revoke`, { method: "POST" }),
  exportExamPackage: (examId: string, data: any) => fetchCbt(`/api/edge/packages/${examId}/export`, { method: "POST", body: JSON.stringify(data) }),
  // Which platform builds actually exist on the server (e.g. { mac: true, win: true }).
  getEdgeAppliancePlatforms: () => fetchCbt<Record<string, boolean>>(`/edge-nodes/download/platforms`),
  // Binary download — bypasses fetchCbt's JSON parsing, returns a Blob.
  downloadEdgeAppliance: async (platform: "mac" | "win" = "mac"): Promise<Blob> => {
    const token = getHcbtToken();
    const res = await fetch(`${HCBT_BASE}/api/edge-nodes/download?platform=${platform}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
  startExam: (examId: string) => fetchCbt(`/student/${examId}/start`, { method: "POST" }),
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

  // ── Offline Lease & Sync ────────────────────────────────────────────
  acquireLease: (examId: string) =>
    fetchCbt<{ leaseToken: string; exam: any; expiresAt: string }>(
      `/offline/lease`, { method: "POST", body: JSON.stringify({ examId }) }
    ),
  syncOfflineAttempt: (data: { leaseToken: string; attemptId: string; answers: Record<string, number>; submittedAt: string }) =>
    fetchCbt(`/offline/sync`, { method: "POST", body: JSON.stringify(data) }),

  // ── Admin / Teacher Operations ──────────────────────────────────────
  getAdminStats: (orgSlug: string) => fetchCbt(`/admin/stats?orgSlug=${orgSlug}`),
  getAdminExams: (orgSlug: string) => fetchCbt(`/admin/exams?orgSlug=${orgSlug}`),
  getAdminStudents: (orgSlug: string) => fetchCbt(`/admin/students?orgSlug=${orgSlug}`),
  getAdminExamResultsOverview: (examId: string, orgSlug: string) => fetchCbt(`/admin/exam/${examId}/results?orgSlug=${orgSlug}`),
  getClasses: (orgSlug: string) => fetchCbt(`/admin/classes?orgSlug=${orgSlug}`),
  getOrgSubjects: (orgSlug: string) => fetchCbt(`/admin/subjects?orgSlug=${orgSlug}`),
  getTeacherClasses: (orgSlug: string) => fetchCbt(`/admin/teacher-classes?orgSlug=${orgSlug}`),
  getTeacherStudents: (orgSlug: string, classLevelId: string) => fetchCbt(`/admin/teacher-students?orgSlug=${orgSlug}&classLevelId=${classLevelId}`),
  assignExam: (examId: string, data: AssignData) => fetchCbt(`/exams/${examId}/assign`, { method: "POST", body: JSON.stringify(data) }),
  getStudentHistoryDetail: (studentId: string, orgSlug: string) => fetchCbt(`/admin/students/${studentId}/history?orgSlug=${orgSlug}`),
  releaseExamResults: (examId: string) => fetchCbt(`/exams/${examId}/release-results`, { method: "POST" }),
  withdrawExamResults: (examId: string) => fetchCbt(`/exams/${examId}/release-results`, { method: "DELETE" }),

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
  logout: () => fetchCbt("/auth/logout", { method: "POST" }),
  getProfile: () => fetchCbt("/auth/profile"),
  checkAuth: async () => {
    try {
      return await fetchCbt("/auth/me", { showErrorToast: false });
    } catch {
      return { authenticated: false };
    }
  },
};

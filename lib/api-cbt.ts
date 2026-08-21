// Hanoled CBT Frontend API Client

const CBT_API_URL = process.env.NEXT_PUBLIC_CBT_API_URL || "http://localhost:4002/api";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

async function fetchCbt<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const url = `${CBT_API_URL}${endpoint}`;

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (err: any) {
    console.error(`[CBT API] Network fetch error for ${url}:`, err);
    throw new Error(`Unable to connect to CBT backend at ${CBT_API_URL}. Please verify your network and server status.`);
  }

  const isAuthEndpoint = endpoint.startsWith("/auth/login") || endpoint.startsWith("/auth/me");
  if (res.status === 401 && !isAuthEndpoint && typeof window !== "undefined") {
    try {
      await fetch(`${CBT_API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // Best-effort logout cleanup
    }
    window.location.assign("/");
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Error ${res.status}`);
  }

  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────

interface ExamData { title: string; duration: number; [key: string]: JsonValue; }
interface QuestionData { text: string; options: string[]; correctAnswer: number; [key: string]: JsonValue; }
interface SubmitData { answers: Array<{ questionId: string; selectedOption: number }>; currentVersion?: number; }
interface AssignData { classLevelId?: string; studentId?: string; }

// ── API Methods ─────────────────────────────────────────────────────────

export const cbtApi = {
  // Exams
  createExam: (data: ExamData) => fetchCbt("/exams", { method: "POST", body: JSON.stringify(data) }),
  getExams: (params = "") => fetchCbt<unknown[]>(`/exams${params}`),
  getExam: (id: string) => fetchCbt(`/exams/${id}`),
  updateExam: (id: string, data: Partial<ExamData>) => fetchCbt(`/exams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteExam: (id: string) => fetchCbt(`/exams/${id}`, { method: "DELETE" }),
  
  // Questions
  addQuestion: (examId: string, data: QuestionData) => fetchCbt(`/exams/${examId}/questions`, { method: "POST", body: JSON.stringify(data) }),
  addQuestionsBulk: (examId: string, data: { questions: QuestionData[] }) => fetchCbt(`/exams/${examId}/questions/bulk`, { method: "POST", body: JSON.stringify(data) }),
  importQuestionsApi: (examId: string, data: { subject: string; ssceBoard: string; year?: number; count?: number }) => fetchCbt(`/exams/${examId}/questions/import-api`, { method: "POST", body: JSON.stringify(data) }),
  deleteQuestion: (examId: string, qId: string) => fetchCbt(`/exams/${examId}/questions/${qId}`, { method: "DELETE" }),
  
  // Student
  getAssignedExams: (orgSlug: string) => fetchCbt(`/student/assigned?orgSlug=${orgSlug}`),
  startExam: (examId: string) => fetchCbt(`/student/${examId}/start`, { method: "POST" }),
  reportTabSwitch: (examId: string) => fetchCbt(`/student/${examId}/report-tab-switch`, { method: "POST" }),
  submitExam: (examId: string, data: SubmitData & { cheating?: boolean }) => fetchCbt(`/student/${examId}/submit`, { method: "POST", body: JSON.stringify(data) }),
  getExamResult: (examId: string) => fetchCbt(`/student/${examId}/result`),
  getStudentHistory: (orgSlug: string) => fetchCbt(`/student/history?orgSlug=${orgSlug}`),

  // Past Questions Proxy
  getSubjects: () => fetchCbt("/past-questions/subjects"),
  getYears: (subject: string) => fetchCbt(`/past-questions/years?subject=${encodeURIComponent(subject)}`),
  fetchPastQuestions: (subject: string, board: string, year?: number) => 
    fetchCbt(`/past-questions/fetch?subject=${encodeURIComponent(subject)}&ssceBoard=${board}${year ? `&year=${year}` : ""}`),

  // Admin / Teacher Operations
  getAdminStats: (orgSlug: string) => fetchCbt(`/admin/stats?orgSlug=${orgSlug}`),
  getAdminExams: (orgSlug: string) => fetchCbt(`/admin/exams?orgSlug=${orgSlug}`),
  getAdminStudents: (orgSlug: string) => fetchCbt(`/admin/students?orgSlug=${orgSlug}`),
  getAdminExamResultsOverview: (examId: string, orgSlug: string) => fetchCbt(`/admin/exam/${examId}/results?orgSlug=${orgSlug}`),
  getClasses: (orgSlug: string) => fetchCbt(`/admin/classes?orgSlug=${orgSlug}`),
  getTeacherClasses: (orgSlug: string) => fetchCbt(`/admin/teacher-classes?orgSlug=${orgSlug}`),
  getTeacherStudents: (orgSlug: string, classLevelId: string) => fetchCbt(`/admin/teacher-students?orgSlug=${orgSlug}&classLevelId=${classLevelId}`),
  assignExam: (examId: string, data: AssignData) => fetchCbt(`/exams/${examId}/assign`, { method: "POST", body: JSON.stringify(data) }),
  getStudentHistoryDetail: (studentId: string, orgSlug: string) => fetchCbt(`/admin/students/${studentId}/history?orgSlug=${orgSlug}`),
  
  // File Upload
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchCbt("/admin/upload", {
      method: "POST",
      body: formData,
    });
  },

  // Document Import
  importDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchCbt("/admin/import-document", {
      method: "POST",
      body: formData,
    });
  },

  importDocumentToExam: (examId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchCbt(`/admin/import-document/${examId}`, {
      method: "POST",
      body: formData,
    });
  },

  // Auth
  login: (identifier: string, password: string) => fetchCbt("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }),
  logout: () => fetchCbt("/auth/logout", { method: "POST" }),
  getProfile: () => fetchCbt("/auth/profile"),
  checkAuth: () => fetchCbt("/auth/me"),
};

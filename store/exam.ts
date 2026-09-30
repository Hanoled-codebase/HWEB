import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Question {
  id: string;
  // objective: pick one of `options`. theory: a typed answer a teacher marks.
  type?: "objective" | "theory";
  text: string;
  options: string[];
  marks: number;
  correctAnswer?: number;
  explanation?: string | null;
  imageUrl?: string | null;
  passage?: string | null;
}

export interface ExamSession {
  examResultId: string;
  exam: {
    id: string;
    title: string;
    duration: number; // minutes
    totalQuestions: number;
    passMark: number;
  };
  questions: Question[];
  startedAt: string;
  // Attempt-scoped credential from /start. It lets a submission queued while
  // offline sync later even if the browser session has expired by then.
  offline?: {
    leaseToken: string;
    lastSyncedSequence: number;
  };
}

/** The chosen option index (objective) or typed text (theory); null if not answered. */
export type AnswerValue = number | string | null;

export interface ExamState {
  session: ExamSession | null;
  answers: Record<string, AnswerValue>; // questionId -> answer
  practiceResult: any | null;
  setSession: (session: ExamSession) => void;
  setAnswer: (questionId: string, value: number | string) => void;
  setPracticeResult: (result: any) => void;
  clearSession: () => void;
  getFormattedAnswers: () => { questionId: string; selectedOption: number | null; textAnswer?: string | null }[];
}

/** Whether a question has an answer worth counting (typed text must not be blank). */
export function isAnswered(value: AnswerValue | undefined): boolean {
  return typeof value === "number" || (typeof value === "string" && value.trim() !== "");
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      session: null,
      answers: {},
      practiceResult: null,
      setSession: (session) => {
        const initialAnswers: Record<string, null> = {};
        session.questions.forEach((q) => {
          initialAnswers[q.id] = null;
        });
        set({ session, answers: initialAnswers });
      },
      setAnswer: (questionId, value) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: value },
        })),
      setPracticeResult: (practiceResult) => set({ practiceResult }),
      clearSession: () => set({ session: null, answers: {} }),
      getFormattedAnswers: () => {
        const { answers } = get();
        return Object.entries(answers).map(([questionId, value]) =>
          typeof value === "string"
            ? { questionId, selectedOption: null, textAnswer: value }
            : { questionId, selectedOption: value },
        );
      },
    }),
    {
      name: "cbt-exam-storage", // stores answers in localStorage in case of refresh
    }
  )
);

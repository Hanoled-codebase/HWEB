import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Question {
  id: string;
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
}

export interface ExamState {
  session: ExamSession | null;
  answers: Record<string, number | null>; // questionId -> selectedOptionIndex
  practiceResult: any | null;
  setSession: (session: ExamSession) => void;
  setAnswer: (questionId: string, optionIndex: number) => void;
  setPracticeResult: (result: any) => void;
  clearSession: () => void;
  getFormattedAnswers: () => { questionId: string; selectedOption: number | null }[];
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
      setAnswer: (questionId, optionIndex) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: optionIndex },
        })),
      setPracticeResult: (practiceResult) => set({ practiceResult }),
      clearSession: () => set({ session: null, answers: {} }),
      getFormattedAnswers: () => {
        const { answers } = get();
        return Object.entries(answers).map(([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        }));
      },
    }),
    {
      name: "cbt-exam-storage", // stores answers in localStorage in case of refresh
    }
  )
);

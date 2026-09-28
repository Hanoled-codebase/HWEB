import { apiFetch } from "@/lib/api";

/** Shapes returned by the library desk endpoints (Hanoled backend, routes/library.js). */

export type DeskLoan = {
  id: string;
  status: "pending" | "approved" | "borrowed";
  requestDate: string;
  dueDate: string | null;
  book: { id: string; title: string; author: string | null };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string | null;
    classLevel: { name: string } | null;
  };
};

export type LibraryDesk = {
  shelf: { titles: number; copies: number; available: number };
  counts: { borrowed: number; overdue: number; dueToday: number; requests: number };
  requests: DeskLoan[];
  overdue: DeskLoan[];
  dueSoon: DeskLoan[];
};

export type DeskStudent = {
  id: string;
  name: string;
  admissionNumber: string | null;
  className: string | null;
  loans: Array<{
    id: string;
    status: "pending" | "approved" | "borrowed";
    dueDate: string | null;
    requestDate: string;
    book: { id: string; title: string; author: string | null };
  }>;
};

export type ShelfBook = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  availableCopies: number;
  totalCopies: number;
  shelfLocation: string | null;
};

export const libraryQueries = {
  desk: (slug: string) => ({
    queryKey: ["library", "desk", slug] as const,
    queryFn: () => apiFetch<LibraryDesk>(`/${slug}/library-desk`, { showErrorToast: false }),
  }),
};

export function searchDeskStudents(slug: string, q: string) {
  return apiFetch<{ students: DeskStudent[] }>(`/${slug}/library-desk/students`, { params: { q }, showErrorToast: false });
}

export function searchShelf(slug: string, search: string) {
  return apiFetch<ShelfBook[]>(`/${slug}/library`, { params: { search }, showErrorToast: false });
}

export function lendBook(slug: string, body: { bookId: string; studentId: string; days: number }) {
  return apiFetch<{ loan: { id: string; dueDate: string }; book: { id: string; title: string }; student: { id: string; name: string } }>(
    `/${slug}/library-loans`,
    { method: "POST", body: JSON.stringify(body), showErrorToast: false },
  );
}

/** Move a loan on: hand over a request, take a book back, or decline a request. */
export function setLoanStatus(slug: string, loanId: string, status: "borrowed" | "returned" | "cancelled") {
  return apiFetch<{ id: string; status: string }>(`/${slug}/library-loans/${loanId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    showErrorToast: false,
  });
}

export function studentName(student: { firstName: string; lastName: string }) {
  return [student.firstName, student.lastName].filter(Boolean).join(" ") || "Unknown student";
}

/** Whole days between now and a due date: negative when overdue. */
export function daysUntil(dueDate: string | null) {
  if (!dueDate) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
}

/** "Due today", "Due tomorrow", "Due in 3 days", "2 days late". */
export function dueLabel(dueDate: string | null) {
  const days = daysUntil(dueDate);
  if (days === null) return "No due date";
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} late`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  BookOpen,
  Search,
  BookMarked,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Library,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DiscussionBoard } from "@/components/dashboard/DiscussionBoard";

type LibraryBook = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  totalCopies: number;
  availableCopies: number;
};

type StudyMaterial = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string | null;
  tags: string[];
  subject: { id: string; name: string } | null;
  uploadedBy: { user: { name: string } } | null;
  createdAt: string;
};

type LoanReservation = {
  id: string;
  bookId: string;
  status: string;
  requestDate: string;
  approvedDate: string | null;
  dueDate: string | null;
  returnedDate: string | null;
  book: { id: string; title: string; author: string | null };
};

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    approved: { label: "Approved", variant: "secondary" },
    borrowed: { label: "Borrowed", variant: "default" },
    returned: { label: "Returned", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };
  const m = map[status] || { label: status, variant: "outline" };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

export default function StudentLibraryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const { currentStudent } = useOrganization();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loans, setLoans] = useState<LoanReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<{ id: string; title: string } | null>(null);

  const studentId = currentStudent?.id;
  const studentName = currentStudent
    ? `${currentStudent.firstName} ${currentStudent.lastName}`
    : user?.name;

  const fetchBooks = useCallback(async () => {
    try {
      const data = await apiFetch<LibraryBook[]>(`/${slug}/library`, {
        params: search ? { search } : undefined,
      });
      setBooks(data);
    } catch {
      // toast handled by apiFetch
    }
  }, [slug, search]);

  const fetchLoans = useCallback(async () => {
    if (!studentId) return;
    try {
      const data = await apiFetch<LoanReservation[]>(`/${slug}/my-loans/${studentId}`);
      setLoans(data);
    } catch {
      // toast handled by apiFetch
    }
  }, [slug, studentId]);

  const fetchMaterials = useCallback(async () => {
    const [classMaterials, generalMaterials] = await Promise.all([
      currentStudent?.classLevel?.id
        ? apiFetch<StudyMaterial[]>(`/${slug}/study-materials`, {
            params: { classLevelId: currentStudent.classLevel.id },
          }).catch(() => [])
        : Promise.resolve([]),
      apiFetch<StudyMaterial[]>(`/${slug}/study-materials`, {
        params: { general: true },
      }).catch(() => []),
    ]);
    setMaterials([...classMaterials, ...generalMaterials]);
  }, [slug, currentStudent?.classLevel?.id]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchBooks(), fetchLoans(), fetchMaterials()]);
      setLoading(false);
    }
    init();
  }, [fetchBooks, fetchLoans, fetchMaterials]);

  const handleRequest = async (bookId: string) => {
    if (!studentId) {
      toast.error("Student profile not loaded");
      return;
    }
    setRequestingId(bookId);
    try {
      await apiFetch(`/${slug}/library/${bookId}/request`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
      toast.success("Book requested successfully");
      await Promise.all([fetchBooks(), fetchLoans()]);
    } catch {
      // toast handled by apiFetch
    } finally {
      setRequestingId(null);
    }
  };

  const searched = search.trim()
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          (b.author && b.author.toLowerCase().includes(search.toLowerCase()))
      )
    : books;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header (phones: the top bar names the page and carries the back target) */}
      <div className="hidden items-center gap-3 md:flex">
        <Link
          href={`/dashboard/school/${slug}`}
          aria-label="Back to dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Library
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Browse books and request loans
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Books Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {searched.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No books found</p>
            <p className="text-xs text-slate-500 mt-1">
              {search ? "Try a different search term" : "No books in the library yet"}
            </p>
          </div>
        )}
        {searched.map((book) => (
          <Card key={book.id} className="shadow-sm flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                    {book.title}
                  </CardTitle>
                  {book.author && (
                    <CardDescription className="text-xs mt-0.5 truncate">
                      by {book.author}
                    </CardDescription>
                  )}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <BookMarked className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {book.category && (
                  <Badge variant="outline" className="text-xs">
                    {book.category}
                  </Badge>
                )}
                <Badge
                  variant={book.availableCopies > 0 ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {book.availableCopies} / {book.totalCopies} available
                </Badge>
              </div>
              <Button
                size="sm"
                disabled={book.availableCopies < 1 || requestingId === book.id}
                onClick={() => handleRequest(book.id)}
                className="w-full"
              >
                {requestingId === book.id ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Requesting...
                  </>
                ) : book.availableCopies < 1 ? (
                  "Unavailable"
                ) : (
                  "Request Loan"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Study Materials */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Study Materials</CardTitle>
          <CardDescription>
            Resources uploaded by your teachers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Library className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No study materials yet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-100 transition-colors"
                >
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Library className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {material.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {material.subject?.name}
                        {material.uploadedBy?.user?.name && ` · by ${material.uploadedBy.user.name}`}
                      </p>
                    </div>
                  </a>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveMaterial({ id: material.id, title: material.title });
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Loans */}
      {loans.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">My Loans</CardTitle>
            <CardDescription>
              {loans.filter((l) => l.status === "borrowed" || l.status === "approved" || l.status === "pending").length} active request(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {loan.book.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requested {new Date(loan.requestDate).toLocaleDateString()}
                      {loan.dueDate && ` · Due ${new Date(loan.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  {statusBadge(loan.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {activeMaterial && (
        <DiscussionBoard
          studyMaterialId={activeMaterial.id}
          studyMaterialTitle={activeMaterial.title}
          isOpen={activeMaterial !== null}
          onClose={() => setActiveMaterial(null)}
        />
      )}
    </div>
  );
}

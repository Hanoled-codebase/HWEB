"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  Library,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  BookMarked,
} from "lucide-react";

type LibraryBook = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  publishedYear: number | null;
  category: string | null;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string | null;
};

type LoanReservation = {
  id: string;
  bookId: string;
  studentId: string;
  status: string;
  requestDate: string;
  approvedDate: string | null;
  dueDate: string | null;
  returnedDate: string | null;
  book: { id: string; title: string; author: string | null };
  student: { id: string; firstName: string; lastName: string };
};

export default function LibraryPage() {
  const { currentOrg, currentMember } = useOrganization();
  const isStaff = currentMember && ["owner", "admin", "member"].includes(currentMember.role);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loans, setLoans] = useState<LoanReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showRequestLoan, setShowRequestLoan] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [loanStudentId, setLoanStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add book form
  const [newBook, setNewBook] = useState({
    title: "", author: "", isbn: "", publisher: "",
    publishedYear: "", category: "", totalCopies: "1", shelfLocation: "",
  });

  const categories = [...new Set(books.map(b => b.category).filter(Boolean))];

  useEffect(() => {
    if (!currentOrg) return;
    loadBooks();
    if (isStaff) loadLoans();
  }, [currentOrg, isStaff]);

  async function loadBooks() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const qs = params.toString();
      const data = await apiFetch<LibraryBook[]>(
        `/${currentOrg!.slug}/library${qs ? `?${qs}` : ""}`,
      );
      setBooks(data);
    } catch {
      toast.error("Failed to load books");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLoans() {
    try {
      const data = await apiFetch<LoanReservation[]>(
        `/${currentOrg!.slug}/library-loans`,
      );
      setLoans(data);
    } catch {}
  }

  async function addBook() {
    if (!newBook.title) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/${currentOrg!.slug}/library`, {
        method: "POST",
        body: JSON.stringify(newBook),
      });
      toast.success("Book added");
      setShowAddBook(false);
      setNewBook({ title: "", author: "", isbn: "", publisher: "", publishedYear: "", category: "", totalCopies: "1", shelfLocation: "" });
      loadBooks();
    } catch {
      toast.error("Failed to add book");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestLoan(bookId: string) {
    if (!loanStudentId) { toast.error("Student ID is required"); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/${currentOrg!.slug}/library/${bookId}/request`, {
        method: "POST",
        body: JSON.stringify({ studentId: loanStudentId }),
      });
      toast.success("Loan requested");
      setShowRequestLoan(null);
      setLoanStudentId("");
      loadBooks();
      loadLoans();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function updateLoanStatus(loanId: string, status: string) {
    try {
      await apiFetch(`/${currentOrg!.slug}/library-loans/${loanId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Loan ${status}`);
      loadLoans();
      loadBooks();
    } catch {}
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      borrowed: "bg-purple-100 text-purple-800",
      returned: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-6 w-6 text-blue-600" />
            Library
          </h1>
          <p className="text-sm text-muted-foreground">Browse catalog and manage loan requests</p>
        </div>
        {isStaff && (
          <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
            <DialogTrigger asChild>
              <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
                <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Add Book
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Book</DialogTitle>
                <DialogDescription>Enter book details for the library catalog</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Input placeholder="Title *" value={newBook.title} onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))} />
                <Input placeholder="Author" value={newBook.author} onChange={e => setNewBook(p => ({ ...p, author: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="ISBN" value={newBook.isbn} onChange={e => setNewBook(p => ({ ...p, isbn: e.target.value }))} />
                  <Input placeholder="Publisher" value={newBook.publisher} onChange={e => setNewBook(p => ({ ...p, publisher: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Year" type="number" value={newBook.publishedYear} onChange={e => setNewBook(p => ({ ...p, publishedYear: e.target.value }))} />
                  <Input placeholder="Copies" type="number" value={newBook.totalCopies} onChange={e => setNewBook(p => ({ ...p, totalCopies: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Category" value={newBook.category} onChange={e => setNewBook(p => ({ ...p, category: e.target.value }))} />
                  <Input placeholder="Shelf location" value={newBook.shelfLocation} onChange={e => setNewBook(p => ({ ...p, shelfLocation: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddBook(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={addBook} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Add Book
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog"><BookOpen className="h-4 w-4 mr-1" /> Catalog</TabsTrigger>
          {isStaff && <TabsTrigger value="loans"><BookMarked className="h-4 w-4 mr-1" /> Loan Requests</TabsTrigger>}
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadBooks()}
              />
            </div>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v as string); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadBooks}><Search className="h-4 w-4" /></Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2 mb-2" /><Skeleton className="h-3 w-1/3" /></CardContent></Card>
              ))}
            </div>
          ) : books.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No books found. Add your first book to the catalog.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {books.map(book => (
                <Card key={book.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{book.title}</CardTitle>
                        {book.author && <CardDescription>{book.author}</CardDescription>}
                      </div>
                      <Badge className={book.availableCopies > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {book.availableCopies}/{book.totalCopies}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    {book.isbn && <p>ISBN: {book.isbn}</p>}
                    {book.publisher && <p>Publisher: {book.publisher}</p>}
                    {book.shelfLocation && <p>Shelf: {book.shelfLocation}</p>}
                    {book.category && <Badge variant="outline" className="mt-1">{book.category}</Badge>}
                    <div className="pt-2">
                      <Dialog open={showRequestLoan === book.id} onOpenChange={o => { setShowRequestLoan(o ? book.id : null); setLoanStudentId(""); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={book.availableCopies < 1} className="w-full">
                            {book.availableCopies < 1 ? "Unavailable" : "Request Loan"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Loan</DialogTitle>
                            <DialogDescription>{book.title}{book.author ? ` by ${book.author}` : ""}</DialogDescription>
                          </DialogHeader>
                          <Input placeholder="Student ID" value={loanStudentId} onChange={e => setLoanStudentId(e.target.value)} />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowRequestLoan(null)}>Cancel</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => requestLoan(book.id)} disabled={submitting}>
                              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                              Submit Request
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="loans" className="space-y-4 mt-4">
          {loans.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No loan requests yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {loans.map(loan => (
                <Card key={loan.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{loan.book.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {loan.student.firstName} {loan.student.lastName}
                        {" — "}
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(loan.requestDate).toLocaleDateString()}</span>
                      </p>
                      {loan.dueDate && <p className="text-xs text-muted-foreground">Due: {new Date(loan.dueDate).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusBadge(loan.status)}>{loan.status}</Badge>
                      {loan.status === "pending" && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateLoanStatus(loan.id, "approved")}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateLoanStatus(loan.id, "cancelled")}>
                            <XCircle className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        </>
                      )}
                      {loan.status === "approved" && (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => updateLoanStatus(loan.id, "borrowed")}>
                          <BookOpen className="h-4 w-4 mr-1" /> Mark Borrowed
                        </Button>
                      )}
                      {loan.status === "borrowed" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateLoanStatus(loan.id, "returned")}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Returned
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

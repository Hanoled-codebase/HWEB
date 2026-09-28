"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Loader2, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { type ApiFetchError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  daysUntil,
  dueLabel,
  lendBook,
  searchDeskStudents,
  searchShelf,
  setLoanStatus,
  type DeskStudent,
  type ShelfBook,
} from "@/lib/library-desk";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";

/**
 * The library counter. Find the student first: what they already have out is
 * right there to take back, and the book to lend is one search away. Built
 * for a phone at a busy desk — one screen, big targets, the action at the thumb.
 */

const LOAN_LENGTHS = [7, 14, 21];

/** Debounced search that keeps the last answer on screen while typing. */
function useSearch<T>(query: string, run: (q: string) => Promise<T[]>) {
  const [found, setFound] = useState<{ q: string; items: T[] } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const runRef = useRef(run);
  // Latest search function without restarting the debounce on every render.
  useEffect(() => {
    runRef.current = run;
  });
  const trimmed = query.trim();
  const active = trimmed.length >= 2;

  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const items = await runRef.current(trimmed);
        if (cancelled) return;
        setFailedFor(null);
        setFound({ q: trimmed, items });
      } catch {
        if (!cancelled) setFailedFor(trimmed);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return {
    trimmed,
    active,
    failed: active && failedFor === trimmed,
    searching: active && failedFor !== trimmed && found?.q !== trimmed,
    items: active ? found?.items ?? null : null,
    refresh: async () => {
      if (!active) return;
      const items = await runRef.current(trimmed);
      setFound({ q: trimmed, items });
    },
  };
}

function SearchField({
  value,
  onChange,
  placeholder,
  label,
  searching,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  searching: boolean;
}) {
  return (
    <label className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
      <Search className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {searching ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-label="Searching" />
      ) : value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </label>
  );
}

export default function LibraryDeskPage() {
  const { currentOrg } = useOrganization();
  const { can } = usePermissions();
  const [student, setStudent] = useState<DeskStudent | null>(null);

  if (!currentOrg) return null;
  const slug = currentOrg.slug;

  if (!can("library.manage")) {
    return (
      <div className="mx-auto max-w-xl">
        <DataStateCard
          variant="forbidden"
          title="The library desk isn't part of your role"
          description="A school admin decides which roles can lend books. Ask them if you need it."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-5 hidden md:block">
        <Link
          href={`/dashboard/school/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Lend or take back</h1>
        <p className="mt-1 text-sm text-slate-500">Find the student first; their books out are listed with them.</p>
      </header>

      {student ? (
        <StudentDesk key={student.id} slug={slug} initial={student} onDone={() => setStudent(null)} />
      ) : (
        <FindStudent slug={slug} onPick={setStudent} />
      )}
    </div>
  );
}

// ── Step 1: who is at the desk ──────────────────────────────────────────

function FindStudent({ slug, onPick }: { slug: string; onPick: (student: DeskStudent) => void }) {
  const [query, setQuery] = useState("");
  const search = useSearch(query, async (q) => (await searchDeskStudents(slug, q)).students);

  return (
    <div className="space-y-4">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Student name or admission number"
        label="Search students"
        searching={search.searching}
      />
      {search.failed ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Couldn&apos;t search right now. Try again.</p>
      ) : search.items === null ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <UserRound className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Who is at the desk?</p>
          <p className="mt-1 text-xs text-slate-500">Type at least two letters of a name or admission number.</p>
        </div>
      ) : search.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No student matches &ldquo;{search.trimmed}&rdquo;</p>
          <p className="mt-1 text-xs text-slate-500">Check the spelling or try the admission number.</p>
        </div>
      ) : (
        <ul
          aria-busy={search.searching}
          className={cn(
            "divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white transition-opacity",
            search.searching && "opacity-60",
          )}
        >
          {search.items.map((student) => {
            const out = student.loans.filter((loan) => loan.status === "borrowed");
            const late = out.some((loan) => (daysUntil(loan.dueDate) ?? 0) < 0);
            return (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => onPick(student)}
                  className="flex min-h-[68px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold capitalize text-slate-900">{student.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[student.className, student.admissionNumber].filter(Boolean).join(" · ") || "No class on record"}
                    </span>
                  </span>
                  {out.length > 0 && (
                    <span className={cn("text-xs font-semibold", late ? "text-red-600" : "text-slate-500")}>
                      {out.length} {out.length === 1 ? "book" : "books"} out{late ? ", late" : ""}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Step 2: their books, and lending a new one ──────────────────────────

function StudentDesk({ slug, initial, onDone }: { slug: string; initial: DeskStudent; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [student, setStudent] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [book, setBook] = useState<ShelfBook | null>(null);
  const [days, setDays] = useState(14);
  const books = useSearch(bookQuery, (q) => searchShelf(slug, q));

  async function reloadStudent() {
    const { students } = await searchDeskStudents(slug, student.admissionNumber || student.name);
    const fresh = students.find((item) => item.id === student.id);
    if (fresh) setStudent(fresh);
    void queryClient.invalidateQueries({ queryKey: ["library"] });
  }

  async function move(loanId: string, title: string, status: "borrowed" | "returned" | "cancelled") {
    setBusy(loanId);
    try {
      await setLoanStatus(slug, loanId, status);
      toast.success(status === "returned" ? `${title} is back on the shelf` : status === "borrowed" ? `${title} handed over` : `Request for ${title} cancelled`);
      await reloadStudent();
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't update the loan. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  }

  async function lend() {
    if (!book) return;
    setBusy("lend");
    try {
      const result = await lendBook(slug, { bookId: book.id, studentId: student.id, days });
      toast.success(`${result.book.title} lent to ${student.name.split(" ")[0]}`, {
        description: `Due back ${new Date(result.loan.dueDate).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}`,
      });
      setBook(null);
      setBookQuery("");
      await Promise.all([reloadStudent(), books.refresh()]);
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't lend the book. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  }

  const heldBookIds = new Set(student.loans.map((loan) => loan.book.id));

  return (
    <div className={cn("space-y-6", book ? "pb-28 md:pb-0" : undefined)}>
      <section className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
          {student.name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold capitalize text-slate-900">{student.name}</span>
          <span className="block truncate text-xs text-slate-500">
            {[student.className, student.admissionNumber].filter(Boolean).join(" · ")}
          </span>
        </span>
        <button type="button" onClick={onDone} className="min-h-[44px] shrink-0 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
          Change
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Has out or asked for</h2>
        {student.loans.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">Nothing out right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            {student.loans.map((loan) => {
              const late = loan.status === "borrowed" && (daysUntil(loan.dueDate) ?? 0) < 0;
              return (
                <li key={loan.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{loan.book.title}</span>
                    <span className={cn("block text-xs font-medium", late ? "text-red-600" : "text-slate-500")}>
                      {loan.status === "borrowed" ? dueLabel(loan.dueDate) : "Requested, not handed over yet"}
                    </span>
                  </span>
                  {loan.status === "borrowed" ? (
                    <Button
                      type="button"
                      onClick={() => void move(loan.id, loan.book.title, "returned")}
                      disabled={busy !== null}
                      className="h-10 rounded-lg px-3.5 font-semibold"
                    >
                      {busy === loan.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      Returned
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void move(loan.id, loan.book.title, "borrowed")}
                      disabled={busy !== null}
                      className="h-10 rounded-lg px-3.5 font-semibold"
                    >
                      {busy === loan.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      Hand over
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Lend a book</h2>
        <SearchField
          value={bookQuery}
          onChange={(value) => {
            setBookQuery(value);
            setBook(null);
          }}
          placeholder="Title, author or ISBN"
          label="Search books"
          searching={books.searching}
        />
        {books.failed ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Couldn&apos;t search the shelf. Try again.</p>
        ) : books.items && books.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            No book matches &ldquo;{books.trimmed}&rdquo;.
          </p>
        ) : books.items ? (
          <fieldset>
            <legend className="sr-only">Choose the book</legend>
            <div className="space-y-2">
              {books.items.slice(0, 8).map((item) => {
                const held = heldBookIds.has(item.id);
                const none = item.availableCopies < 1;
                const disabled = held || none;
                const selected = book?.id === item.id;
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border bg-white p-4 transition-colors",
                      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                      selected ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="book"
                      value={item.id}
                      checked={selected}
                      disabled={disabled}
                      onChange={() => setBook(item)}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {[item.author, item.shelfLocation && `Shelf ${item.shelfLocation}`].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-xs font-semibold", none ? "text-red-600" : "text-slate-600")}>
                      {held ? "Already has it" : none ? "None on shelf" : `${item.availableCopies} on shelf`}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            <BookOpen className="h-5 w-5 shrink-0 text-slate-300" />
            Search the shelf for the book they want.
          </div>
        )}

        {book && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-900">For how long?</legend>
            <div className="grid grid-cols-3 gap-2">
              {LOAN_LENGTHS.map((length) => (
                <label
                  key={length}
                  className={cn(
                    "flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border bg-white text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/30",
                    days === length ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-slate-300",
                  )}
                >
                  <input type="radio" name="days" value={length} checked={days === length} onChange={() => setDays(length)} className="sr-only" />
                  {length} days
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>

      {book && (
        <div className="bottom-above-nav fixed inset-x-0 z-30 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="mx-auto max-w-xl">
            <Button type="button" onClick={() => void lend()} disabled={busy !== null} className="h-12 w-full rounded-xl text-base font-semibold">
              {busy === "lend" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <span className="truncate">
                Lend {book.title} for {days} days
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

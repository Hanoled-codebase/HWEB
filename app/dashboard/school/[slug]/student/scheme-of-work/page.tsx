"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BookText,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";

type SowWeek = {
  week: number;
  topic: string;
  objectives?: string;
  activities?: string;
  resources?: string;
  evaluation?: string;
};

type SchemeOfWorkItem = {
  id: string;
  title: string;
  term: string;
  academicYear: string;
  classLevel: { id: string; name: string };
  subject: { id: string; name: string; code?: string | null };
  createdBy?: { user?: { name: string } };
  weeks: SowWeek[];
  createdAt: string;
};

export default function StudentSchemeOfWorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [schemes, setSchemes] = useState<SchemeOfWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedTerm, setSelectedTerm] = useState<string>("ALL");
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiFetch<SchemeOfWorkItem[] | { data?: SchemeOfWorkItem[] }>(
          `/student/${slug}/scheme-of-work`,
        );
        const items = Array.isArray(res) ? res : res?.data ?? [];
        if (!active) return;
        setSchemes(items);
        if (items.length === 1) {
          setExpandedSchemes(new Set([items[0].id]));
        }
      } catch {
        // apiFetch toasts errors
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  // Derived unique subjects and terms
  const subjects = Array.from(
    new Map(
      schemes
        .map((s) => s.subject)
        .filter(Boolean)
        .map((sub) => [sub.id, sub.name]),
    ).entries(),
  );

  const terms = Array.from(new Set(schemes.map((s) => s.term).filter(Boolean)));

  const toggleExpand = (id: string) => {
    setExpandedSchemes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSchemes = schemes.filter((s) => {
    if (selectedSubject !== "ALL" && s.subject?.id !== selectedSubject) return false;
    if (selectedTerm !== "ALL" && s.term !== selectedTerm) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const topicMatch = Array.isArray(s.weeks) && s.weeks.some((w) => w?.topic?.toLowerCase().includes(q));
    return (
      s.title.toLowerCase().includes(q) ||
      s.subject?.name?.toLowerCase().includes(q) ||
      topicMatch
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/school/${slug}`}
          aria-label="Back to dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-700" />
        </Link>
        <div className="hidden md:block">
          <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Scheme of Work
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Weekly learning curriculum and objectives for the subjects you offer.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by topic, keyword, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                Subject:
              </span>
              <Button
                size="sm"
                variant={selectedSubject === "ALL" ? "default" : "outline"}
                onClick={() => setSelectedSubject("ALL")}
                className={selectedSubject === "ALL" ? "bg-blue-600 hover:bg-blue-700" : "bg-white"}
              >
                All
              </Button>
              {subjects.map(([id, name]) => (
                <Button
                  key={id}
                  size="sm"
                  variant={selectedSubject === id ? "default" : "outline"}
                  onClick={() => setSelectedSubject(id)}
                  className={selectedSubject === id ? "bg-blue-600 hover:bg-blue-700" : "bg-white"}
                >
                  {name}
                </Button>
              ))}
            </div>
          )}

          {terms.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                Term:
              </span>
              <Button
                size="sm"
                variant={selectedTerm === "ALL" ? "default" : "outline"}
                onClick={() => setSelectedTerm("ALL")}
                className={selectedTerm === "ALL" ? "bg-blue-600 hover:bg-blue-700" : "bg-white"}
              >
                All
              </Button>
              {terms.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={selectedTerm === t ? "default" : "outline"}
                  onClick={() => setSelectedTerm(t)}
                  className={selectedTerm === t ? "bg-blue-600 hover:bg-blue-700" : "bg-white"}
                >
                  {t}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filteredSchemes.length === 0 ? (
        <Card className="rounded-2xl border border-slate-100 p-8 text-center bg-white">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
            <BookText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No scheme of work found</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {search || selectedSubject !== "ALL" || selectedTerm !== "ALL"
              ? "No syllabus items match your filters."
              : "Your school has not yet published schemes of work for the subjects in your class."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSchemes.map((scheme) => {
            const isExpanded = expandedSchemes.has(scheme.id);
            const weeks = Array.isArray(scheme.weeks) ? scheme.weeks : [];

            return (
              <Card key={scheme.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors p-4 sm:p-6" onClick={() => toggleExpand(scheme.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {scheme.subject?.name || "Subject"}
                        </span>
                        <Badge variant="outline" className="text-slate-600 font-medium">
                          {scheme.term}
                        </Badge>
                        <Badge variant="outline" className="text-slate-500 font-normal">
                          {scheme.academicYear}
                        </Badge>
                      </div>
                      <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                        {scheme.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 font-medium">
                        {weeks.length} week{weeks.length !== 1 ? "s" : ""} scheduled
                        {scheme.createdBy?.user?.name && ` · Compiled by ${scheme.createdBy.user.name}`}
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={isExpanded ? "Collapse weeks" : "Expand weeks"}
                      className="h-9 w-9 p-0 text-slate-400 hover:text-slate-700"
                    >
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t border-slate-100 p-4 sm:p-6 bg-slate-50/30 space-y-3">
                    {weeks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No weeks entered for this scheme.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {weeks
                          .sort((a, b) => Number(a.week) - Number(b.week))
                          .map((week, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-slate-200/70 bg-white p-3.5 space-y-2 shadow-xs"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                                  W{week.week}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                    {week.topic || "Topic"}
                                  </h4>
                                </div>
                              </div>

                              {(week.objectives || week.activities || week.resources || week.evaluation) && (
                                <div className="grid gap-2 pt-2 border-t border-slate-100 text-xs sm:grid-cols-2">
                                  {week.objectives && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Objectives: </span>
                                      <span className="text-slate-600">{week.objectives}</span>
                                    </div>
                                  )}
                                  {week.activities && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Class Activities: </span>
                                      <span className="text-slate-600">{week.activities}</span>
                                    </div>
                                  )}
                                  {week.resources && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Resources / Books: </span>
                                      <span className="text-slate-600">{week.resources}</span>
                                    </div>
                                  )}
                                  {week.evaluation && (
                                    <div>
                                      <span className="font-semibold text-slate-700">Evaluation: </span>
                                      <span className="text-slate-600">{week.evaluation}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


"use client";

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { EmptyNote, HomeGreeting, SectionTitle, ToolGrid, type HomeTool } from "./HomeKit";

export type ParentResultGroup = {
  student: { id: string; firstName: string; lastName: string };
  results: Array<{
    id: string;
    title: string;
    subject: { name: string };
    values: number[];
    updatedAt: string;
  }>;
};

type LinkedStudent = { id?: string; firstName?: string; lastName?: string };

const PARENT_TOOLS = ["results", "invoices", "homework", "timetable", "library", "bus-tracking", "messaging", "support"];

/**
 * Parent phone home: the children come first (that is why a parent opens the
 * app), then the school services they can act on.
 */
export function ParentHome({
  slug,
  students,
  results,
}: {
  slug: string;
  students: LinkedStudent[];
  results: ParentResultGroup[];
}) {
  const { user } = useAuth();
  const { visibleNavItems } = useSchoolNavItems();
  const byKey = new Map(visibleNavItems.map((item) => [item.key, item]));

  const tools: HomeTool[] = PARENT_TOOLS.filter((key) => byKey.has(key)).map((key) => {
    const item = byKey.get(key)!;
    return { key, label: key === "invoices" ? "Fees & invoices" : item.title, href: item.url, icon: item.icon };
  });

  return (
    <div className="space-y-7">
      <HomeGreeting
        name={user?.name?.split(" ")[0] || "there"}
        detail={students.length === 1 ? "1 child linked" : `${students.length} children linked`}
      />

      <section>
        <SectionTitle>My children</SectionTitle>
        {students.length === 0 ? (
          <EmptyNote
            icon={Users}
            title="No children linked yet"
            hint="Ask the school office to link your child to your account."
          />
        ) : (
          <div className="space-y-2.5">
            {students.map((student) => {
              const group = results.find((g) => g.student.id === student.id);
              const latest = group?.results.filter((r) => r.values.length > 0).slice(0, 3);
              const initials = `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase() || "ST";
              return (
                <Link
                  key={student.id || `${student.firstName}-${student.lastName}`}
                  href={`/dashboard/school/${slug}/results`}
                  className="block rounded-2xl border border-slate-100 bg-white p-3.5 transition-colors active:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold capitalize text-slate-900">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {latest && latest.length > 0 ? "Latest scores" : "Tap to see results"}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                  </div>
                  {latest && latest.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {latest.map((r) => (
                        <span
                          key={r.id}
                          className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-100"
                        >
                          {r.subject.name}: <span className="font-bold tabular-nums text-slate-900">{r.values[0] ?? "—"}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>School services</SectionTitle>
        <ToolGrid tools={tools} showAll={false} />
      </section>
    </div>
  );
}

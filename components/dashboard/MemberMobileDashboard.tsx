"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardCheck, Layers } from "lucide-react";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { EmptyNote, HomeGreeting, PrimaryAction, SectionTitle, StatStrip } from "@/components/dashboard/mobile/HomeKit";
import { useMobileMenu } from "@/components/dashboard/mobile/MobileMenuProvider";

type AssignmentOption = {
  id: string;
  name?: string | null;
};

type SubjectGroup = {
  subject: AssignmentOption;
  classes: AssignmentOption[];
};

/**
 * Teacher phone home. Class teachers get the register first; subject teachers
 * get their grade sheets first. The shell (top bar, tab bar, menu) is shared,
 * so this only renders the content.
 */
export function MemberMobileDashboard({
  slug,
  userName,
  subjectGroups,
  assignedClasses,
  readySheetsCount,
  sheetsByAssignment,
  isMemberSheetsLoading,
}: {
  slug: string;
  userName: string;
  subjectGroups: SubjectGroup[];
  assignedClasses: AssignmentOption[];
  readySheetsCount: number;
  sheetsByAssignment: Map<string, { id: string; status?: string } | undefined>;
  isMemberSheetsLoading: boolean;
  orgName?: string;
}) {
  const { config } = useMobileMenu();
  const { visibleNavItems } = useSchoolNavItems();
  const base = `/dashboard/school/${slug}`;
  const can = (key: string) => visibleNavItems.some((item) => item.key === key);
  const primaryClassName = assignedClasses[0]?.name || null;

  return (
    <div className="space-y-5">
      <HomeGreeting
        name={userName}
        roleLabel={config.roleLabel}
        detail={primaryClassName ? `Class: ${primaryClassName}` : undefined}
      />

      {config.profile === "class-teacher" && can("attendance") ? (
        <PrimaryAction href={`${base}/attendance`} icon={ClipboardCheck} label="Take attendance" hint="Mark today's register" />
      ) : (
        can("spreadsheets") && (
          <PrimaryAction href={`${base}/spreadsheets`} icon={Layers} label="Enter scores" hint="Open your grade sheets" />
        )
      )}

      <StatStrip
        stats={[
          { key: "subjects", label: "Subjects", value: subjectGroups.length },
          { key: "classes", label: "Classes", value: assignedClasses.length },
          { key: "sheets", label: "Sheets ready", value: readySheetsCount },
        ]}
      />

      <section>
        <SectionTitle aside={primaryClassName ?? undefined}>Your subjects</SectionTitle>

        {subjectGroups.length === 0 ? (
          <EmptyNote icon={BookOpen} title="No subjects assigned" hint="An admin needs to assign subjects to you." />
        ) : (
          <div className="space-y-3">
            {subjectGroups.map((group) => (
              <div key={group.subject.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <Link
                  href={`${base}/spreadsheets?subjectId=${group.subject.id}`}
                  className="flex min-h-[64px] items-center gap-3 p-3.5 active:bg-slate-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-slate-900">{group.subject.name}</span>
                    <span className="block text-xs text-slate-500">
                      {group.classes.length} {group.classes.length === 1 ? "class" : "classes"}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                </Link>

                <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/70">
                  {isMemberSheetsLoading ? (
                    <li className="px-4 py-3 text-center text-xs text-slate-500">Loading classes…</li>
                  ) : (
                    group.classes.map((classOption) => {
                      const spreadsheet = sheetsByAssignment.get(`${group.subject.id}:${classOption.id}`);
                      return (
                        <li key={classOption.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">{classOption.name}</span>
                            <span className="block text-xs text-slate-500">
                              {spreadsheet ? "Ready for scores" : "No sheet yet"}
                            </span>
                          </span>
                          <Link
                            href={
                              spreadsheet
                                ? `${base}/spreadsheets/${spreadsheet.id}`
                                : `${base}/spreadsheets?subjectId=${group.subject.id}&classLevelId=${classOption.id}`
                            }
                            className={`flex min-h-[44px] shrink-0 items-center rounded-xl px-4 text-xs font-semibold ${
                              spreadsheet ? "bg-blue-600 text-white active:bg-blue-700" : "border border-slate-200 bg-white text-slate-700 active:bg-slate-100"
                            }`}
                          >
                            {spreadsheet ? "Open" : "Create"}
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { useCachedList } from "@/hooks/useCachedList";
import { orgQueries } from "@/lib/queries";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import BulkStudentImportModal from "@/components/students/BulkStudentImportModal";
import {
  ArrowRight,
  ArrowUpCircle,
  ChevronRight,
  FileSpreadsheet,
  GraduationCap,
  Hotel,
  Bus,
  Loader2,
  MoreHorizontal,
  Pencil,
  School,
  Search,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";

type HostelAllocation = {
  room: { id: string; name: string; roomNumber: string } | null;
};
type BusAssignment = {
  route: { id: string; name: string } | null;
};

// Desktop table columns: name, admission no., class, gender, day/boarding, actions.
const STUDENT_ROW_COLUMNS =
  "lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_2.75rem]";

type StudentRecord = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  admissionNumber?: string;
  gender?: string;
  admissionDate?: string;
  profileImage?: string;
  profilePic?: string;
  studentType?: string;
  usesBus?: boolean;
  hostelAllocation?: HostelAllocation | null;
  busAssignment?: BusAssignment | null;
  classLevel?: { id?: string; name?: string | null } | null;
};

type ClassOption = {
  id: string;
  name: string;
  level?: string;
};

type PromoteStudentResponse = {
  student: StudentRecord;
  previousClass?: {
    id?: string;
    name?: string;
    level?: string;
  } | null;
  promotedTo?: {
    id?: string;
    name?: string;
    level?: string;
  } | null;
};

function getClassLabel(cls: Pick<ClassOption, "name" | "level">) {
  return cls.level ? `${cls.name} (${cls.level})` : cls.name;
}

function getStageRank(value: string) {
  const normalized = value.toLowerCase();

  if (
    /creche|cr[eè]che|nursery|pre[-\s]?school|pre[-\s]?k|pre[-\s]?kg/.test(
      normalized,
    )
  ) {
    return 0;
  }

  if (/kindergarten|\bkg\b/.test(normalized)) {
    return 1;
  }

  if (/primary|grade/.test(normalized)) {
    return 2;
  }

  if (/junior secondary|\bjss\b|\bjs\b/.test(normalized)) {
    return 3;
  }

  if (/senior secondary|\bsss\b|\bss\b/.test(normalized)) {
    return 4;
  }

  if (/college|year/.test(normalized)) {
    return 5;
  }

  return 99;
}

function getClassSortKey(cls: ClassOption) {
  const combined = `${cls.level || ""} ${cls.name}`.trim();
  const numberMatch = combined.match(/\d+/);

  return {
    stage: getStageRank(combined),
    number: numberMatch ? Number(numberMatch[0]) : Number.POSITIVE_INFINITY,
    text: combined.toLowerCase(),
  };
}

function compareClasses(a: ClassOption, b: ClassOption) {
  const aKey = getClassSortKey(a);
  const bKey = getClassSortKey(b);

  if (aKey.stage !== bKey.stage) {
    return aKey.stage - bKey.stage;
  }

  if (aKey.number !== bKey.number) {
    return aKey.number - bKey.number;
  }

  return aKey.text.localeCompare(bKey.text);
}

export default function StudentsPage() {
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "class" | "recent">("az");
  const [studentToPromote, setStudentToPromote] =
    useState<StudentRecord | null>(null);
  const [promotionClassId, setPromotionClassId] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const isParent = currentMember?.role === "parent";

  const orgSlug = currentOrg?.slug ?? "";
  const studentsQuery = orgQueries.students<StudentRecord[]>(orgSlug);
  const [students, setStudents, studentsLoading] = useCachedList<StudentRecord[]>(
    studentsQuery.queryKey,
    studentsQuery.queryFn,
    { enabled: !!orgSlug, initial: [], onError: () => toast.error("Failed to load students") },
  );
  const classesQuery = orgQueries.classes<ClassOption[]>(orgSlug);
  const [rawClasses, , classesLoading] = useCachedList<ClassOption[]>(
    classesQuery.queryKey,
    classesQuery.queryFn,
    { enabled: !!orgSlug && isPrivileged, initial: [] },
  );
  const classes = useMemo(() => [...rawClasses].sort(compareClasses), [rawClasses]);
  const isLoading = studentsLoading || classesLoading;

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const list = students.filter((student) => {
      const matchesSearch =
        !q ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(q) ||
        student.admissionNumber?.toLowerCase().includes(q);

      const matchesClass =
        selectedClassId === "all" ||
        student.classLevel?.id === selectedClassId;

      return matchesSearch && matchesClass;
    });

    return list.sort((a, b) => {
      if (sortOrder === "az") {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortOrder === "za") {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameB.localeCompare(nameA);
      }
      if (sortOrder === "class") {
        const classA = a.classLevel?.name || "";
        const classB = b.classLevel?.name || "";
        return (
          classA.localeCompare(classB) ||
          `${a.firstName}`.localeCompare(b.firstName)
        );
      }
      if (sortOrder === "recent") {
        const dateA = a.admissionDate ? new Date(a.admissionDate).getTime() : 0;
        const dateB = b.admissionDate ? new Date(b.admissionDate).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });
  }, [students, searchQuery, selectedClassId, sortOrder]);

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const promotionOptions = studentToPromote
    ? classes.filter((cls) => cls.id !== studentToPromote.classLevel?.id)
    : classes;

  const handleDelete = async (studentId: string) => {
    if (!currentOrg) return;
    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      await apiFetch(`/students/${currentOrg.slug}/${studentId}`, {
        method: "DELETE",
      });
      setStudents(students.filter((s) => s.id !== studentId));
      toast.success("Student deleted successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete student";
      toast.error(message);
    }
  };

  const openPromoteDialog = (student: StudentRecord) => {
    setStudentToPromote(student);
    setPromotionClassId("");
  };

  const closePromoteDialog = () => {
    if (isPromoting) return;
    setStudentToPromote(null);
    setPromotionClassId("");
  };

  const handlePromote = async () => {
    if (!currentOrg || !studentToPromote || !promotionClassId) return;

    setIsPromoting(true);
    try {
      const response = await apiFetch<PromoteStudentResponse>(
        `/students/${currentOrg.slug}/${studentToPromote.id}/promote`,
        {
          method: "PATCH",
          body: JSON.stringify({ classLevel: promotionClassId }),
        },
      );

      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === response.student.id ? response.student : student,
        ),
      );

      const promotedToLabel = response.promotedTo
        ? getClassLabel({
          name: response.promotedTo.name || "New class",
          level: response.promotedTo.level,
        })
        : "the selected class";

      toast.success(
        `${response.student.firstName} ${response.student.lastName} promoted to ${promotedToLabel}`,
      );
      setStudentToPromote(null);
      setPromotionClassId("");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to promote student";
      toast.error(message);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="min-h-full pb-16 md:bg-slate-50/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-6 md:px-6 md:py-8 lg:px-8">
        {/* ── Header: on phones the top bar carries the title, so only actions, a count line and filters show ── */}
        <section className="md:rounded-3xl md:border md:border-slate-200 md:bg-white md:p-6 md:shadow-sm lg:p-8">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:gap-4">
              <div className="hidden min-w-0 md:block">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                  {isParent ? "Children" : "Students"}
                </h1>
                <p className="mt-3 w-full text-base leading-7 text-slate-600">
                  {isParent
                    ? "View the children linked to your parent account."
                    : "Manage and view all students registered in this school."}
                </p>
              </div>
              {isPrivileged && (
                <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
                  <Button
                    className="h-11 bg-blue-600 font-semibold hover:bg-blue-700 md:order-2 md:h-9 md:px-4"
                    onClick={() =>
                      router.push(
                        `/dashboard/school/${currentOrg?.slug}/students/new`,
                      )
                    }
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add student
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50 md:order-1 md:h-9 md:border-blue-200 md:bg-blue-50 md:px-4 md:text-[#1447E6] md:hover:bg-blue-100"
                    onClick={() => setShowBulkImportModal(true)}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span className="md:hidden">Import</span>
                    <span className="hidden md:inline">Import Excel / CSV</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Stats — privileged only, after data loads. One quiet line on phones, tiles on desktop. */}
            {isPrivileged && !isLoading && (
              <>
                <p className="text-sm text-slate-600 md:hidden">
                  <span className="font-semibold tabular-nums text-slate-900">{students.length}</span> {students.length === 1 ? "student" : "students"}
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-semibold tabular-nums text-slate-900">{classes.length}</span> {classes.length === 1 ? "class" : "classes"}
                  {students.filter((s) => !s.classLevel).length > 0 && (
                    <>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="font-semibold tabular-nums text-amber-700">{students.filter((s) => !s.classLevel).length}</span> not in a class
                    </>
                  )}
                </p>
                <div className="hidden grid-cols-3 gap-3 md:grid">
                  {[
                    { label: "Students", value: students.length, Icon: GraduationCap },
                    { label: "Classes", value: classes.length, Icon: School },
                    { label: "Unassigned", value: students.filter((s) => !s.classLevel).length, Icon: UserRound },
                  ].map(({ label, value, Icon }) => (
                    <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Search, filter & sort */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4" />
                <Input
                  type="search"
                  placeholder="Search by name or admission no."
                  aria-label="Search students"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 md:h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 md:flex">
                {classes.length > 0 && (
                  <Select
                    value={selectedClassId}
                    onValueChange={(val) => setSelectedClassId(String(val ?? "all"))}
                  >
                    <SelectTrigger aria-label="Filter by class" className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-medium md:h-10 md:w-44 md:text-xs">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {getClassLabel(cls)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={sortOrder}
                  onValueChange={(val) => setSortOrder(val as any)}
                >
                  <SelectTrigger aria-label="Sort students" className={`h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-medium md:h-10 md:w-44 md:text-xs ${classes.length > 0 ? "" : "col-span-2"}`}>
                    <SelectValue placeholder="Sort Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="az">Name A–Z</SelectItem>
                    <SelectItem value="za">Name Z–A</SelectItem>
                    <SelectItem value="class">By class</SelectItem>
                    <SelectItem value="recent">Recently added</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* ── Student list: one grouped list at every width. Phones: name + one meta line.
             Tablets: badges under the name. Desktop (lg): table columns, ~56px a row. ── */}
        <section
          aria-label={isParent ? "Children" : "Students"}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 md:rounded-3xl md:shadow-sm"
        >
          {!isLoading && filteredStudents.length > 0 && (
            <div aria-hidden="true" className={`hidden items-center gap-4 bg-slate-50/80 px-5 py-2.5 text-xs font-medium text-slate-500 lg:grid ${STUDENT_ROW_COLUMNS}`}>
              <span className="pl-14">Name</span>
              <span>Admission no.</span>
              <span>Class</span>
              <span>Gender</span>
              <span>Day / boarding</span>
              <span />
            </div>
          )}
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 md:px-5 md:py-4 lg:py-3">
                <div className="flex items-center gap-3 md:gap-4">
                  <Skeleton className="h-10 w-10 rounded-full md:h-12 md:w-12 lg:h-10 lg:w-10" />
                  <div className="flex-1 space-y-1.5 md:space-y-2">
                    <Skeleton className="h-4 w-32 md:w-40" />
                    <Skeleton className="h-3 w-24 md:w-28 lg:hidden" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center md:p-14">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 md:h-16 md:w-16 md:rounded-2xl">
                <GraduationCap className="h-5 w-5 md:h-7 md:w-7" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900 md:mt-5 md:text-xl">
                {searchQuery
                  ? "No students match your search"
                  : "No students yet"}
              </h2>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-600 md:mt-2">
                {searchQuery
                  ? "Try a different name or admission number."
                  : isPrivileged
                    ? "Add students one by one, or import your class lists from Excel."
                    : "Students will appear here once the school adds them."}
              </p>
            </div>
          ) : (
            filteredStudents.map((student: StudentRecord) => {
              const href = `/dashboard/school/${currentOrg?.slug}/students/${student.id}`;
              const fullName = `${student.firstName} ${student.middleName ? `${student.middleName} ` : ""}${student.lastName}`;
              const dayOrBoarding = student.studentType ? (student.studentType === "boarding" ? "Boarding" : "Day") : null;
              return (
                <div
                  key={student.id}
                  className={`group relative flex w-full items-center gap-2 pr-2 transition-colors md:gap-3 md:pr-4 lg:grid lg:gap-4 lg:px-5 lg:hover:bg-slate-50/70 ${STUDENT_ROW_COLUMNS}`}
                >
                  <Link
                    href={href}
                    className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 active:bg-slate-50 md:gap-4 md:py-4 md:pl-5 lg:col-span-5 lg:grid lg:min-h-14 lg:grid-cols-subgrid lg:items-center lg:py-2.5 lg:pl-0 lg:active:bg-transparent"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                      <Avatar className="h-10 w-10 shrink-0 border border-blue-100 md:h-12 md:w-12 lg:h-10 lg:w-10">
                        <AvatarImage
                          src={student.profileImage || student.profilePic}
                          alt=""
                        />
                        <AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700 md:text-sm lg:text-xs">
                          {getInitials(student.firstName, student.lastName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[15px] font-semibold capitalize text-slate-900 group-hover:text-blue-700 md:text-base lg:text-sm">
                          {fullName}
                        </h2>
                        {/* Phones: plain meta line. Tablets: badges. Desktop: the columns beside. */}
                        <p className="mt-0.5 truncate text-sm text-slate-500 md:hidden">
                          {student.admissionNumber || "No admission no."}
                          <span className="mx-1 text-slate-300">·</span>
                          {student.classLevel ? (
                            student.classLevel.name
                          ) : (
                            <span className="font-medium text-amber-700">Not in a class</span>
                          )}
                        </p>
                        <div className="mt-1.5 hidden flex-wrap items-center gap-2 md:flex lg:hidden">
                          <Badge variant="outline" className="border-blue-100 bg-blue-50 text-xs text-blue-700">
                            {student.admissionNumber || "No ID"}
                          </Badge>
                          {student.classLevel ? (
                            <Badge variant="outline" className="text-xs">
                              {student.classLevel.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-xs text-amber-700">
                              Unassigned
                            </Badge>
                          )}
                          {student.gender && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {student.gender}
                            </Badge>
                          )}
                          {dayOrBoarding && (
                            <Badge variant="outline" className="border-blue-100 bg-blue-50 text-xs text-blue-700">
                              <Hotel className="mr-1 h-3 w-3" />
                              {dayOrBoarding}
                            </Badge>
                          )}
                          {student.usesBus && student.busAssignment?.route && (
                            <Badge variant="outline" className="text-xs">
                              <Bus className="mr-1 h-3 w-3" />
                              {student.busAssignment.route.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="hidden truncate text-sm tabular-nums text-slate-600 lg:block">
                      {student.admissionNumber || <span className="text-slate-400">No admission no.</span>}
                    </span>
                    <span className="hidden truncate text-sm text-slate-700 lg:block">
                      {student.classLevel?.name || <span className="font-medium text-amber-700">Not in a class</span>}
                    </span>
                    <span className="hidden truncate text-sm capitalize text-slate-600 lg:block">
                      {student.gender || <span className="text-slate-400">—</span>}
                    </span>
                    <span className="hidden min-w-0 items-center gap-1.5 text-sm text-slate-600 lg:flex">
                      <span className="truncate">{dayOrBoarding || <span className="text-slate-400">—</span>}</span>
                      {student.usesBus && student.busAssignment?.route && (
                        <span className="flex min-w-0 items-center gap-1 text-slate-500" title={`Bus: ${student.busAssignment.route.name}`}>
                          <Bus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="sr-only">Bus:</span>
                          <span className="truncate">{student.busAssignment.route.name}</span>
                        </span>
                      )}
                    </span>
                    {!isPrivileged && <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 md:hidden" aria-hidden="true" />}
                  </Link>

                  {/* Actions: a menu for privileged roles, an arrow for others (tablet and desktop) */}
                  {isPrivileged ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            aria-label={`Actions for ${fullName}`}
                            className="h-11 w-11 shrink-0 rounded-xl p-0 text-slate-500 hover:bg-blue-50 md:border md:border-slate-200 md:hover:border-blue-200 lg:h-9 lg:w-9"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(href)}>
                          <GraduationCap className="mr-2 h-4 w-4" />
                          View Record
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openPromoteDialog(student)}
                        >
                          <ArrowUpCircle className="mr-2 h-4 w-4" />
                          {student.classLevel ? "Promote Student" : "Assign to Class"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push(`${href}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(student.id)}
                          className="text-slate-600 focus:bg-red-50 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div aria-hidden="true" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition group-hover:border-blue-200 group-hover:text-blue-600 md:flex lg:h-9 lg:w-9">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* ── Promote / Assign dialog ──────────────────────────────────── */}
      <Dialog
        open={!!studentToPromote}
        onOpenChange={(open) => {
          if (!open) closePromoteDialog();
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {studentToPromote?.classLevel ? "Promote Student" : "Assign to Class"}
            </DialogTitle>
            <DialogDescription>
              {studentToPromote ? (
                studentToPromote.classLevel ? (
                  <>
                    Move {studentToPromote.firstName} {studentToPromote.lastName}{" "}
                    from{" "}
                    {getClassLabel({
                      name: studentToPromote.classLevel.name || "Current class",
                      level: undefined,
                    })}{" "}
                    into a higher class.
                  </>
                ) : (
                  <>
                    {studentToPromote.firstName} {studentToPromote.lastName} has no
                    class assigned. Select a class to assign them to.
                  </>
                )
              ) : (
                "Select the new class for this student."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Target Class
              </label>
              <Select
                value={promotionClassId || undefined}
                onValueChange={(value) =>
                  setPromotionClassId(String(value || ""))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select target class" />
                </SelectTrigger>
                <SelectContent>
                  {promotionOptions.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {getClassLabel(cls)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {promotionOptions.length === 0 && (
              <p className="text-sm text-slate-500">
                {studentToPromote?.classLevel
                  ? "No other classes are available for promotion yet."
                  : "No classes available. Create a class first."}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closePromoteDialog}
              disabled={isPromoting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handlePromote}
              disabled={!promotionClassId || isPromoting}
            >
              {isPromoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {studentToPromote?.classLevel ? "Promote" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showBulkImportModal && currentOrg?.slug && (
        <BulkStudentImportModal
          orgSlug={currentOrg.slug}
          classOptions={classes}
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={() => {
            if (currentOrg) {
              apiFetch<StudentRecord[]>(`/students/${currentOrg.slug}`)
                .then(setStudents)
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}

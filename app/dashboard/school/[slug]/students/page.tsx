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

        {/* ── Student list: one grouped list on phones, cards on desktop ── */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white max-md:divide-y max-md:divide-slate-100 md:space-y-3 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-5"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <Skeleton className="h-10 w-10 rounded-full md:h-14 md:w-14" />
                  <div className="flex-1 space-y-1.5 md:space-y-2">
                    <Skeleton className="h-4 w-32 md:h-5 md:w-40" />
                    <Skeleton className="h-3 w-24 md:h-4 md:w-28" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center md:rounded-3xl md:border md:border-dashed md:border-slate-200 md:bg-white md:p-14 md:shadow-sm">
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
              return (
                <div
                  key={student.id}
                  className="group relative flex w-full items-center gap-2 bg-white pr-2 transition-shadow md:gap-4 md:rounded-2xl md:border md:border-slate-200 md:p-5 md:shadow-sm md:hover:shadow-md"
                >
                  <Link
                    href={href}
                    className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 active:bg-slate-50 md:min-h-0 md:gap-4 md:p-0 md:active:bg-transparent"
                  >
                    <Avatar className="h-10 w-10 shrink-0 border border-blue-100 md:h-14 md:w-14">
                      <AvatarImage
                        src={student.profileImage || student.profilePic}
                        alt=""
                      />
                      <AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700 md:text-sm">
                        {getInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[15px] font-semibold capitalize text-slate-900 group-hover:text-blue-700 md:text-base md:font-bold">
                        {fullName}
                      </h2>
                      {/* Phones: plain meta line. Desktop: badges. */}
                      <p className="mt-0.5 truncate text-sm text-slate-500 md:hidden">
                        {student.admissionNumber || "No admission no."}
                        <span className="mx-1 text-slate-300">·</span>
                        {student.classLevel ? (
                          student.classLevel.name
                        ) : (
                          <span className="font-medium text-amber-700">Not in a class</span>
                        )}
                      </p>
                      <div className="mt-1.5 hidden flex-wrap items-center gap-2 md:flex">
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
                        {student.studentType && (
                          <Badge variant="outline" className="border-blue-100 bg-blue-50 text-xs text-blue-700">
                            <Hotel className="mr-1 h-3 w-3" />
                            {student.studentType === "boarding" ? "Boarding" : "Day"}
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
                    {!isPrivileged && <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 md:hidden" aria-hidden="true" />}
                  </Link>

                  {/* Actions: a menu for privileged roles, an arrow for others (desktop) */}
                  {isPrivileged ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            aria-label={`Actions for ${fullName}`}
                            className="h-11 w-11 shrink-0 rounded-xl p-0 text-slate-500 hover:bg-blue-50 md:border md:border-slate-200 md:hover:border-blue-200"
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
                    <div aria-hidden="true" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition group-hover:border-blue-200 group-hover:text-blue-600 md:flex">
                      <ArrowRight className="h-5 w-5" />
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

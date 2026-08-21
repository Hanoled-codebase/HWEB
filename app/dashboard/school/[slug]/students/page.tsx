"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
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
import { ParentMobileNav } from "@/components/dashboard/ParentMobileNav";
import BulkStudentImportModal from "@/components/students/BulkStudentImportModal";
import {
  ArrowRight,
  ArrowUpCircle,
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
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    async function fetchStudents() {
      if (!currentOrg) return;
      try {
        setIsLoading(true);
        const requests: Promise<[StudentRecord[], ClassOption[]]> = Promise.all(
          [
            apiFetch<StudentRecord[]>(`/students/${currentOrg.slug}`),
            isPrivileged
              ? apiFetch<ClassOption[]>(`/classes/${currentOrg.slug}`)
              : Promise.resolve([]),
          ],
        );
        const [studentData, classData] = await requests;
        setStudents(studentData);
        setClasses(classData.sort(compareClasses));
      } catch {
        toast.error("Failed to load students");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStudents();
  }, [currentOrg, isPrivileged]);

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
    <div className="min-h-full bg-slate-50/60 pb-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
        {/* ── Header card ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Title row */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.26em]">
                  {currentOrg?.name}
                </p>
                <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:mt-2 sm:text-2xl lg:text-3xl">
                  {isParent ? "Children" : "Students"}
                </h1>
                <p className="mt-2 w-full text-sm leading-6 text-slate-600 sm:mt-3 sm:text-base sm:leading-7">
                  {isParent
                    ? "View the children linked to your parent account."
                    : "Manage and view all students registered in this school."}
                </p>
              </div>
              {isPrivileged && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-blue-200 bg-blue-50 text-[#1447E6] hover:bg-blue-100 font-semibold text-xs h-8 px-3 sm:h-9 sm:px-4 sm:text-sm"
                    onClick={() => setShowBulkImportModal(true)}
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    Import Excel / CSV
                  </Button>
                  <Button
                    className="shrink-0 bg-blue-600 text-xs hover:bg-blue-700 h-8 px-3 sm:h-9 sm:px-4 sm:text-sm"
                    onClick={() =>
                      router.push(
                        `/dashboard/school/${currentOrg?.slug}/students/new`,
                      )
                    }
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    Add Student
                  </Button>
                </div>
              )}
            </div>

            {/* Stats row — privileged only, after data loads */}
            {isPrivileged && !isLoading && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:rounded-2xl sm:p-4">
                  <div className="flex items-center gap-1.5 text-blue-500 sm:gap-2">
                    <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em]">
                      Students
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">
                    {students.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:rounded-2xl sm:p-4">
                  <div className="flex items-center gap-1.5 text-blue-500 sm:gap-2">
                    <School className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em]">
                      Classes
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">
                    {classes.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:rounded-2xl sm:p-4">
                  <div className="flex items-center gap-1.5 text-blue-500 sm:gap-2">
                    <UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em]">
                      Unassigned
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">
                    {students.filter((s) => !s.classLevel).length}
                  </p>
                </div>
              </div>
            )}

            {/* Search, Filter & Sort bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400 sm:left-4 sm:h-4 sm:w-4" />
                <Input
                  type="search"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                {classes.length > 0 && (
                  <Select
                    value={selectedClassId}
                    onValueChange={(val) => setSelectedClassId(String(val ?? "all"))}
                  >
                    <SelectTrigger className="h-10 w-44 rounded-xl border border-slate-200 bg-white text-xs font-medium">
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
                  <SelectTrigger className="h-10 w-44 rounded-xl border border-slate-200 bg-white text-xs font-medium">
                    <SelectValue placeholder="Sort Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="az">A-Z (Alphabetical)</SelectItem>
                    <SelectItem value="za">Z-A (Alphabetical)</SelectItem>
                    <SelectItem value="class">By Class</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* ── Student list ─────────────────────────────────────────────── */}
        <section className="space-y-2 sm:space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-5"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <Skeleton className="h-10 w-10 rounded-full sm:h-14 sm:w-14" />
                  <div className="flex-1 space-y-1.5 sm:space-y-2">
                    <Skeleton className="h-4 w-32 sm:h-5 sm:w-40" />
                    <Skeleton className="h-3 w-24 sm:h-4 sm:w-28" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg sm:h-11 sm:w-11 sm:rounded-xl" />
                </div>
              </div>
            ))
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm sm:rounded-3xl sm:p-14">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 sm:h-16 sm:w-16 sm:rounded-2xl">
                <GraduationCap className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-800 sm:mt-5 sm:text-xl">
                {searchQuery
                  ? "No students match your search"
                  : "No students yet"}
              </h2>
              <p className="mx-auto mt-1.5 max-w-xs text-xs text-slate-500 sm:mt-2 sm:text-sm">
                {searchQuery
                  ? "Try a different name or admission number."
                  : "Add students to get started."}
              </p>
            </div>
          ) : (
            filteredStudents.map((student: StudentRecord) => (
              <div
                key={student.id}
                role="button"
                tabIndex={0}
                className="group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:gap-4 sm:rounded-2xl sm:p-5"
                onClick={() =>
                  router.push(
                    `/dashboard/school/${currentOrg?.slug}/students/${student.id}`,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(
                      `/dashboard/school/${currentOrg?.slug}/students/${student.id}`,
                    );
                  }
                }}
              >
                <Avatar className="relative z-10 h-10 w-10 shrink-0 border border-blue-100 sm:h-14 sm:w-14">
                  <AvatarImage
                    src={student.profileImage || student.profilePic}
                    alt={student.firstName}
                  />
                  <AvatarFallback className="bg-blue-50 text-xs font-semibold text-blue-700 sm:text-sm">
                    {getInitials(student.firstName, student.lastName)}
                  </AvatarFallback>
                </Avatar>

                <div className="relative z-10 min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-700 capitalize sm:text-base">
                    {student.firstName}{" "}
                    {student.middleName ? `${student.middleName} ` : ""}
                    {student.lastName}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1 sm:mt-1.5 sm:gap-2">
                    <Badge
                      variant="outline"
                      className="border-blue-100 bg-blue-50 text-[10px] text-blue-700 px-1.5 py-0 sm:text-xs sm:px-2.5 sm:py-0.5"
                    >
                      {student.admissionNumber || "No ID"}
                    </Badge>
                    {student.classLevel ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 sm:text-xs sm:px-2.5 sm:py-0.5">
                        {student.classLevel.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0 sm:text-xs sm:px-2.5 sm:py-0.5">
                        Unassigned
                      </Badge>
                    )}
                    {student.gender && (
                      <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 hidden sm:inline-flex sm:text-xs sm:px-2.5 sm:py-0.5">
                        {student.gender}
                      </Badge>
                    )}
                    {student.studentType && (
                      <Badge variant="outline" className={`${student.studentType === "boarding" ? "border-purple-200 bg-purple-50 text-purple-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"} text-[10px] px-1.5 py-0 hidden sm:inline-flex sm:text-xs sm:px-2.5 sm:py-0.5`}>
                        <Hotel className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />
                        {student.studentType === "boarding" ? "Boarding" : "Day"}
                      </Badge>
                    )}
                    {student.usesBus && student.busAssignment?.route && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0 hidden sm:inline-flex sm:text-xs sm:px-2.5 sm:py-0.5">
                        <Bus className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />
                        {student.busAssignment.route.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions: dropdown for privileged, arrow icon for others */}
                {isPrivileged ? (
                  <div
                    className="relative z-10 shrink-0"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            className="h-8 w-8 rounded-lg border border-slate-200 p-0 hover:border-blue-200 hover:bg-blue-50 sm:h-11 sm:w-11 sm:rounded-xl"
                          >
                            <MoreHorizontal className="h-4 w-4 text-slate-500 sm:h-5 sm:w-5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/school/${currentOrg?.slug}/students/${student.id}`,
                            )
                          }
                        >
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
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/school/${currentOrg?.slug}/students/${student.id}/edit`,
                            )
                          }
                        >
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
                  </div>
                ) : (
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition group-hover:border-blue-200 group-hover:text-blue-600 sm:h-11 sm:w-11 sm:rounded-xl">
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>

      {isParent && currentOrg?.slug && (
        <ParentMobileNav slug={currentOrg.slug} active="children" />
      )}

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

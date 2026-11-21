"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { useCachedList } from "@/hooks/useCachedList";
import { orgQueries } from "@/lib/queries";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronRight,
  Mail,
  MoreHorizontal,
  Trash2,
  Loader2,
  UserPlus,
  BookOpen,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EntityHeader,
  SearchInput,
  TableContainer,
  TableEmpty,
} from "@/components/dashboard/shared";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type TeacherSubject = {
  id: string;
  name: string;
};

type TeacherClass = {
  id?: string;
  name?: string;
  level?: string;
};

type TeacherAssignment = {
  classLevel?: TeacherClass | null;
  subject?: TeacherSubject | null;
};

type TeacherMember = {
  id: string;
  role: "member" | "admin" | "owner" | "parent";
  user?: {
    name?: string;
    email?: string;
  } | null;
  assignedClasses?: TeacherClass[];
  teachingAssignments?: TeacherAssignment[];
};

/** What this person does at the school, instead of the raw membership role ("member"). */
function staffRoleLabel(teacher: TeacherMember) {
  if (teacher.role === "owner") return "School owner";
  const hasClasses = (teacher.assignedClasses?.length ?? 0) > 0;
  const hasTeaching = (teacher.teachingAssignments?.length ?? 0) > 0;
  if (teacher.role === "admin") {
    if (hasClasses && hasTeaching) return "School admin • Class teacher • Subject teacher";
    if (hasClasses) return "School admin • Class teacher";
    if (hasTeaching) return "School admin • Subject teacher";
    return "School admin";
  }
  if (hasClasses && hasTeaching) return "Class teacher • Subject teacher";
  if (hasClasses) return "Class teacher";
  if (hasTeaching) return "Subject teacher";
  return "Staff";
}

export default function TeachersPage() {
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const { can, isHOD } = usePermissions();
  const isPrivileged = can("members.manage") || isHOD;

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "" },
  });

  const orgSlug = currentOrg?.slug ?? "";
  const teachersQuery = orgQueries.teachers<TeacherMember[]>(orgSlug);
  const [teachers, setTeachers, isLoading] = useCachedList<TeacherMember[]>(
    teachersQuery.queryKey,
    teachersQuery.queryFn,
    { enabled: !!orgSlug && isPrivileged, initial: [], onError: () => toast.error("Failed to load teachers") },
  );

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");

  const allSubjectOptions = useMemo(() => {
    const set = new Set<string>();
    (teachers || []).forEach((t: TeacherMember) => {
      t.teachingAssignments?.forEach((a: TeacherAssignment) => {
        if (a.subject?.name) set.add(a.subject.name);
      });
    });
    return Array.from(set).sort();
  }, [teachers]);

  const allClassOptions = useMemo(() => {
    const set = new Set<string>();
    (teachers || []).forEach((t: TeacherMember) => {
      t.assignedClasses?.forEach((c: TeacherClass) => {
        if (c.name) set.add(c.name);
      });
      t.teachingAssignments?.forEach((a: TeacherAssignment) => {
        if (a.classLevel?.name) set.add(a.classLevel.name);
      });
    });
    return Array.from(set).sort();
  }, [teachers]);

  const activeTeachersCount = useMemo(
    () =>
      (teachers || []).filter(
        (t: TeacherMember) =>
          t.role !== "parent" &&
          ((t.assignedClasses?.length || 0) > 0 || (t.teachingAssignments?.length || 0) > 0),
      ).length,
    [teachers],
  );

  const pendingTeachersCount = Math.max(0, (teachers || []).filter((t: TeacherMember) => t.role !== "parent").length - activeTeachersCount);

  const filteredTeachers = useMemo<TeacherMember[]>(() => {
    return (teachers || []).filter((t: TeacherMember) => {
      if (t.role === "parent") return false;

      const matchesSearch =
        Boolean(t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        Boolean(t.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.teachingAssignments || []).some((assignment: TeacherAssignment) =>
          Boolean(assignment.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase())),
        );
      if (!matchesSearch) return false;

      if (selectedSubjectFilter !== "ALL") {
        const hasSubj = (t.teachingAssignments || []).some(
          (a: TeacherAssignment) => a.subject?.name === selectedSubjectFilter,
        );
        if (!hasSubj) return false;
      }

      if (selectedClassFilter !== "ALL") {
        const hasClass =
          (t.assignedClasses || []).some((c: TeacherClass) => c.name === selectedClassFilter) ||
          (t.teachingAssignments || []).some((a: TeacherAssignment) => a.classLevel?.name === selectedClassFilter);
        if (!hasClass) return false;
      }

      if (selectedStatusFilter === "ACTIVE") {
        const isActive = (t.assignedClasses?.length || 0) > 0 || (t.teachingAssignments?.length || 0) > 0;
        if (!isActive) return false;
      } else if (selectedStatusFilter === "PENDING") {
        const isActive = (t.assignedClasses?.length || 0) > 0 || (t.teachingAssignments?.length || 0) > 0;
        if (isActive) return false;
      }

      return true;
    });
  }, [teachers, searchQuery, selectedSubjectFilter, selectedClassFilter, selectedStatusFilter]);

  async function onInvite(values: z.infer<typeof inviteFormSchema>) {
    if (!currentOrg) return;
    setIsInviting(true);

    try {
      const result = await apiFetch<{
        ok?: boolean;
        inviteId?: string;
        emailDispatched?: boolean;
        emailError?: string;
      }>(`/admin/invite`, {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          role: "member", // Teachers are 'member' role in this system
          displayRole: "Teacher", // Human-facing label for the invite email/accept page
          organizationId: currentOrg.id,
        }),
      });

      if (result?.emailDispatched === false) {
        toast.warning(
          `Invitation created, but the email could not be sent: ${
            result.emailError || "unknown email error"
          }. Share the accept link manually or retry.`,
        );
      } else {
        toast.success("Invitation sent successfully");
      }
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation",
      );
    } finally {
      setIsInviting(false);
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!currentOrg) return;
    if (
      !confirm(
        "Are you sure you want to remove this teacher from the organization?",
      )
    )
      return;

    try {
      await apiFetch(`/organizations/${currentOrg.slug}/members/${memberId}`, {
        method: "DELETE",
      });
      setTeachers(teachers.filter((t) => t.id !== memberId));
      toast.success("Teacher removed successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove teacher",
      );
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Phones: Hairline Directory List */}
      <div className="flex flex-col gap-3 md:hidden">
        {isPrivileged && (
          <Button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs active:scale-[0.98] transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Teacher</span>
          </Button>
        )}

        {/* Mobile Search */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search teachers by name, subject, or email..."
        />

        {/* Mobile Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          <Select value={selectedSubjectFilter} onValueChange={(v) => setSelectedSubjectFilter(v ? String(v) : "ALL")}>
            <SelectTrigger aria-label="Filter by subject" className="w-auto shrink-0 bg-white border-slate-200 text-sm text-slate-700 rounded-xl px-3 gap-1.5">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Subjects</SelectItem>
              {allSubjectOptions.map((s: string) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClassFilter} onValueChange={(v) => setSelectedClassFilter(v ? String(v) : "ALL")}>
            <SelectTrigger aria-label="Filter by class" className="w-auto shrink-0 bg-white border-slate-200 text-sm text-slate-700 rounded-xl px-3 gap-1.5">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {allClassOptions.map((c: string) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatusFilter} onValueChange={(v) => setSelectedStatusFilter(v ? String(v) : "ALL")}>
            <SelectTrigger aria-label="Filter by status" className="w-auto shrink-0 bg-white border-slate-200 text-sm text-slate-700 rounded-xl px-3 gap-1.5">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quiet 1-line summary */}
        <p className="px-1 text-xs font-medium text-slate-600 tabular-nums">
          {filteredTeachers.length} {filteredTeachers.length === 1 ? "teacher" : "teachers"}
          <span className="mx-1.5 text-slate-300">·</span>
          {activeTeachersCount} assigned
          {pendingTeachersCount > 0 && (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              {pendingTeachersCount} unassigned
            </>
          )}
        </p>

        {/* Mobile Single-Container Hairline List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : filteredTeachers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                {searchQuery ? "No teachers match your search." : "No teachers yet."}
              </p>
            </div>
          ) : (
            filteredTeachers.map((teacher: TeacherMember) => {
              const assignedClasses = teacher.assignedClasses || [];
              const teachingAssignments = teacher.teachingAssignments || [];
              const primaryClass =
                assignedClasses[0]?.name ||
                assignedClasses[0]?.level ||
                teachingAssignments[0]?.classLevel?.name;
              const subjectNames = Array.from(
                new Set(teachingAssignments.map((a: TeacherAssignment) => a.subject?.name).filter(Boolean)),
              ) as string[];
              const primarySubject = subjectNames[0] || null;
              const name = teacher.user?.name || "Unnamed teacher";
              const email = teacher.user?.email || null;
              const href = `/dashboard/school/${orgSlug}/teachers/${teacher.id}`;
              const hasAssignments = assignedClasses.length > 0 || teachingAssignments.length > 0;
              const metaParts = [
                primarySubject,
                primaryClass,
                !primarySubject && !primaryClass ? staffRoleLabel(teacher) : null,
              ].filter(Boolean);

              return (
                <div
                  key={teacher.id}
                  className="group flex items-center gap-2 pr-2 transition-colors"
                >
                  <Link
                    href={href}
                    className="flex min-h-[72px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 active:bg-slate-50"
                  >
                    <Avatar className="size-10 shrink-0 border border-blue-200/70">
                      <AvatarFallback className="bg-blue-50 text-xs font-bold text-blue-600">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold text-[#0B1220] group-hover:text-blue-600">
                          {name}
                        </h2>
                        {!hasAssignments && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200/70">
                            Unassigned
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {metaParts.join(" · ")}
                      </p>
                      {email && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {email}
                        </p>
                      )}
                    </div>
                    {(!isPrivileged || currentMember?.id === teacher.id) && (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                    )}
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          aria-label={`Options for ${name}`}
                        >
                          <MoreHorizontal className="size-5" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(href)}>
                        View Profile
                      </DropdownMenuItem>
                      {isPrivileged && currentMember?.id !== teacher.id && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemove(teacher.id)}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Remove from school
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Invite Teacher Dialog (root-mounted for mobile and desktop) */}
      {isPrivileged && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite a Teacher</DialogTitle>
              <DialogDescription>
                Send an email invitation to join {currentOrg?.name} as a
                teacher.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onInvite)}
                className="space-y-4 py-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="teacher@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#1447E6] hover:bg-[#0F36B8] text-white"
                    disabled={isInviting}
                  >
                    {isInviting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Desktop View Header */}
      <div className="hidden md:block">
        <EntityHeader
          title="Teachers"
          subtitle="View active teachers and invite new staff members."
          action={
            isPrivileged && (
              <Button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="bg-[#1447E6] hover:bg-[#0F36B8] text-white"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Teacher
              </Button>
            )
          }
        />
      </div>

      <div className="hidden md:flex flex-col gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search teachers..."
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <TableContainer>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Assigned Classes</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[150px]" />
                          <Skeleton className="h-3 w-[100px]" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredTeachers.length === 0 ? (
                <TableEmpty
                  colSpan={5}
                  searchQuery={searchQuery}
                  emptyMessage="No teachers found in this organization."
                  searchMessage="No teachers match your search."
                />
              ) : (
                filteredTeachers.map((teacher: TeacherMember) => (
                  <TableRow
                    key={teacher.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() =>
                      router.push(
                        `/dashboard/school/${currentOrg?.slug}/teachers/${teacher.id}`,
                      )
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          <AvatarFallback className="bg-blue-50 text-blue-700 font-medium">
                            {getInitials(teacher.user?.name || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col">
                          <Link
                            href={`/dashboard/school/${currentOrg?.slug}/teachers/${teacher.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="truncate font-medium capitalize text-slate-900 hover:text-blue-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                          >
                            {teacher.user?.name || "Unnamed teacher"}
                          </Link>
                          <span className="text-xs text-slate-500">
                            {staffRoleLabel(teacher)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-slate-600">
                        <Mail className="h-3 w-3 mr-2 text-slate-400" />
                        {teacher.user?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {teacher.teachingAssignments &&
                      teacher.teachingAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const uniqueSubjects: TeacherSubject[] = Array.from(
                              new Map(
                                teacher.teachingAssignments
                                  .filter((assignment: TeacherAssignment) => Boolean(assignment.subject && assignment.subject.id))
                                  .map((assignment: TeacherAssignment) => [
                                    assignment.subject!.id,
                                    assignment.subject!,
                                  ]),
                              ).values(),
                            );

                            return (
                              <>
                                {uniqueSubjects.slice(0, 3).map((subject: TeacherSubject) => (
                                  <span
                                    key={subject.id}
                                    className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-100"
                                  >
                                    <BookOpen className="mr-1 h-3 w-3" />
                                    {subject.name}
                                  </span>
                                ))}
                                {uniqueSubjects.length > 3 && (
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                    + more
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.assignedClasses &&
                      teacher.assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedClasses.map((cls: TeacherClass, index: number) => (
                            <span
                              key={String(cls?.id || cls?.name || cls || index)}
                              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
                            >
                              {cls?.name || cls?.level || "Assigned"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {isPrivileged && currentMember?.id !== teacher.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemove(teacher.id);
                          }}
                          title="Remove teacher"
                          aria-label={`Remove ${teacher.user?.name || "teacher"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

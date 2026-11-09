"use client";

import { useState } from "react";
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
  DialogTrigger,
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

  const filteredTeachers = teachers.filter(
    (t) =>
      t.role !== "parent" &&
      (t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.teachingAssignments || []).some((assignment) =>
          assignment.subject?.name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
        )),
  );

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
    <div className="space-y-6">
      <EntityHeader
        title="Teachers"
        subtitle="View active teachers and invite new staff members."
        action={
          isPrivileged && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                {/* Phones use the bottom Invite bar instead */}
                <Button className="hidden bg-blue-600 hover:bg-blue-700 md:inline-flex">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Teacher
                </Button>
              </DialogTrigger>
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
                        className="bg-blue-600"
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
          )
        }
      />

      <div className="flex flex-col gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search teachers..."
        />

        <p className="text-xs font-semibold text-slate-500 mt-1 md:hidden">
          {filteredTeachers.length} {filteredTeachers.length === 1 ? "teacher" : "teachers"}
        </p>
      </div>

      {/* Phones: one grouped list; a whole row opens the teacher */}
      <div className="mb-24 block md:hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              {searchQuery ? "No teacher matches that search." : "No teachers yet. Invite your first teacher by email."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {filteredTeachers.map((teacher) => {
              const assignedClasses = teacher.assignedClasses || [];
              const teachingAssignments = teacher.teachingAssignments || [];
              const primaryClass = assignedClasses[0]?.name || assignedClasses[0]?.level || (teachingAssignments[0]?.classLevel?.name);
              const subjectNames = Array.from(
                new Set(teachingAssignments.map((a) => a.subject?.name).filter(Boolean)),
              ) as string[];
              const meta = [
                assignedClasses.length > 0 ? `Form teacher · ${primaryClass}` : primaryClass,
                subjectNames.slice(0, 2).join(", ") + (subjectNames.length > 2 ? ` +${subjectNames.length - 2}` : ""),
              ].filter(Boolean).join(" · ");
              const name = teacher.user?.name || "Unnamed teacher";

              return (
                <li key={teacher.id} className="flex items-center gap-1 pr-2">
                  <Link
                    href={`/dashboard/school/${currentOrg?.slug}/teachers/${teacher.id}`}
                    className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 active:bg-slate-50"
                  >
                    <Avatar className="h-10 w-10 shrink-0 border border-slate-100">
                      <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                        {getInitials(teacher.user?.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold capitalize text-slate-900">{name}</span>
                      <span className="block truncate text-sm text-slate-500">
                        {meta || teacher.user?.email || "No class or subject yet"}
                      </span>
                    </span>
                  </Link>

                  {isPrivileged && currentMember?.id !== teacher.id ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" aria-label={`Actions for ${name}`} className="h-11 w-11 shrink-0 rounded-xl p-0 text-slate-500">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/school/${currentOrg?.slug}/teachers/${teacher.id}`)}
                        >
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemove(teacher.id)}
                          className="text-red-600 focus:bg-red-50 focus:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove from school
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <ChevronRight className="mr-2 h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Mobile Floating Sticky Invite Button */}
      {isPrivileged && (
        <div className="fixed bottom-above-nav inset-x-0 p-4 bg-gradient-to-t from-white via-white/90 to-transparent z-30 md:hidden">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite Teacher
          </Button>
        </div>
      )}

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
                filteredTeachers.map((teacher) => (
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
                            const uniqueSubjects = Array.from(
                              new Map(
                                teacher.teachingAssignments
                                  .filter((assignment) => assignment.subject && assignment.subject.id)
                                  .map((assignment) => [
                                    assignment.subject!.id,
                                    assignment.subject!,
                                  ]),
                              ).values(),
                            );

                            return (
                              <>
                                {uniqueSubjects.slice(0, 3).map((subject) => (
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
                          {teacher.assignedClasses.map((cls, index) => (
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

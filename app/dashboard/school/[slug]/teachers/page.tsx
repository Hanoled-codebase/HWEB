"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
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
  Mail,
  Trash2,
  Loader2,
  UserPlus,
  BookOpen,
} from "lucide-react";
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

export default function TeachersPage() {
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const [teachers, setTeachers] = useState<TeacherMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const { can, isHOD } = usePermissions();
  const isPrivileged = can("members.manage") || isHOD;

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    async function fetchTeachers() {
      if (!currentOrg) return;
      try {
        setIsLoading(true);
        const data = isPrivileged
          ? await apiFetch<TeacherMember[]>(
              `/organizations/${currentOrg.slug}/members?role=member`,
            )
          : [];
        setTeachers(data);
      } catch {
        toast.error("Failed to load teachers");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTeachers();
  }, [currentOrg, isPrivileged]);

  const filteredTeachers = teachers.filter(
    (t) =>
      t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.teachingAssignments || []).some((assignment) =>
        assignment.subject?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
      ),
  );

  async function onInvite(values: z.infer<typeof inviteFormSchema>) {
    if (!currentOrg) return;
    setIsInviting(true);

    try {
      await apiFetch(`/admin/invite`, {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          role: "member", // Teachers are 'member' role in this system
          organizationId: currentOrg.id,
        }),
      });

      toast.success("Invitation sent successfully");
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
                <Button className="bg-blue-600 hover:bg-blue-700">
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

      {/* Mobile Card View */}
      <div className="space-y-3 block md:hidden mb-24">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))
        ) : filteredTeachers.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-500">
              {searchQuery ? "No teachers match your search." : "No teachers found in this organization."}
            </p>
          </div>
        ) : (
          filteredTeachers.map((teacher) => {
            const assignedClasses = teacher.assignedClasses || [];
            const teachingAssignments = teacher.teachingAssignments || [];
            const primaryClass = assignedClasses[0]?.name || assignedClasses[0]?.level || (teachingAssignments[0]?.classLevel?.name);

            return (
              <div
                key={teacher.id}
                onClick={() =>
                  router.push(
                    `/dashboard/school/${currentOrg?.slug}/teachers/${teacher.id}`,
                  )
                }
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative space-y-3 cursor-pointer active:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 border border-slate-100 shrink-0">
                      <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">
                        {getInitials(teacher.user?.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-sm capitalize">
                        {teacher.user?.name}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">
                        {teacher.role}
                      </span>
                    </div>
                  </div>

                  {isPrivileged && currentMember?.id !== teacher.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemove(teacher.id);
                      }}
                      title="Remove teacher"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {teacher.user?.email && (
                  <div className="flex items-center text-xs text-slate-500 pl-1">
                    <Mail className="h-3.5 w-3.5 mr-2 text-slate-400 shrink-0" />
                    {teacher.user.email}
                  </div>
                )}

                {primaryClass && (
                  <div className="pt-1">
                    <span className="inline-flex items-center rounded-full bg-[#EEF0FF] px-3 py-0.5 text-[11px] font-semibold text-[#5B5EF4]">
                      {primaryClass}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Floating Sticky Invite Button */}
      {isPrivileged && (
        <div className="fixed bottom-16 inset-x-0 p-4 bg-gradient-to-t from-white via-white/90 to-transparent z-30 md:hidden">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full h-12 bg-[#5B5EF4] hover:bg-[#4b4ee4] text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
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
                          <AvatarFallback className="bg-emerald-50 text-emerald-700 font-medium">
                            {getInitials(teacher.user?.name || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 capitalize">
                            {teacher.user?.name}
                          </span>
                          <span className="text-xs text-slate-500 capitalize">
                            {teacher.role}
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
                                    className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-100"
                                  >
                                    <BookOpen className="mr-1 h-3 w-3" />
                                    {subject.name}
                                  </span>
                                ))}
                                {uniqueSubjects.length > 3 && (
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                    + more
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.assignedClasses &&
                      teacher.assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedClasses.map((cls, index) => (
                            <span
                              key={String(cls?.id || cls?.name || cls || index)}
                              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
                            >
                              {cls?.name || cls?.level || "Assigned"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">None</span>
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

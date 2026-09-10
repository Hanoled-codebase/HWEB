"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Mail, Trash2, Loader2, UserPlus, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EntityHeader,
  SearchInput,
  TableContainer,
  TableEmpty,
} from "@/components/dashboard/shared";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
});

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber?: string;
  classLevel?: { name?: string } | null;
};

type ParentMember = {
  id: string;
  role: string;
  user?: { name?: string; email?: string } | null;
  assignedStudents?: StudentOption[];
};

export default function ParentsPage() {
  const { currentOrg, currentMember } = useOrganization();
  const [parents, setParents] = useState<ParentMember[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const { can, isHOD } = usePermissions();
  const isPrivileged = can("parents.manage") || isHOD;

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", studentIds: [] },
  });

  useEffect(() => {
    async function fetchPageData() {
      if (!currentOrg) return;
      try {
        setIsLoading(true);
        const [parentData, studentData] = await Promise.all([
          isPrivileged
            ? apiFetch<ParentMember[]>(`/organizations/${currentOrg.slug}/members?role=parent`)
            : Promise.resolve<ParentMember[]>([]),
          apiFetch<StudentOption[]>(`/students/${currentOrg.slug}`),
        ]);
        setParents(parentData);
        setStudents(studentData);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to load parents");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPageData();
  }, [currentOrg, isPrivileged]);

  const filteredParents = parents.filter(
    (p) =>
      p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  async function onInvite(values: z.infer<typeof inviteFormSchema>) {
    if (!currentOrg) return;
    setIsInviting(true);
    try {
      await apiFetch(`/admin/invite`, {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          role: "parent",
          organizationId: currentOrg.id,
          studentIds: values.studentIds,
        }),
      });
      toast.success("Invitation sent");
      setIsDialogOpen(false);
      form.reset();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!currentOrg) return;
    if (!confirm("Remove this parent from the organization?")) return;
    try {
      await apiFetch(`/organizations/${currentOrg.slug}/members/${memberId}`, {
        method: "DELETE",
      });
      setParents(parents.filter((p) => p.id !== memberId));
      toast.success("Parent removed");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove parent");
    }
  };

  const getInitials = (name?: string) => {
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
        title="Parents & Guardians"
        subtitle="View active parents and invite new ones to the platform."
        action={
          isPrivileged && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Parent
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Invite a Parent</DialogTitle>
                  <DialogDescription>
                    Send an email invitation to join {currentOrg?.name} as a
                    parent/guardian.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="parent@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studentIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link Students *</FormLabel>
                          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                            {students.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No students available to link.
                              </p>
                            ) : (
                              students.map((student) => {
                                const checked = field.value.includes(student.id);
                                return (
                                  <label
                                    key={student.id}
                                    className="flex cursor-pointer items-center justify-between rounded-md border border-slate-100 px-3 py-2 hover:bg-slate-50"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-900 capitalize">
                                        {student.firstName} {student.lastName}
                                      </p>
                                      <p className="truncate text-xs text-slate-500">
                                        {student.classLevel?.name || "Unassigned"}
                                        {" • "}
                                        {student.admissionNumber || "No admission number"}
                                      </p>
                                    </div>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(nextChecked) => {
                                        if (nextChecked) {
                                          field.onChange([...field.value, student.id]);
                                        } else {
                                          field.onChange(field.value.filter((v) => v !== student.id));
                                        }
                                      }}
                                    />
                                  </label>
                                );
                              })
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600" disabled={isInviting}>
                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search parents..."
      />

      {/* Mobile Card View */}
      <div className="space-y-3 block md:hidden">
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
        ) : filteredParents.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-500">
              {searchQuery ? "No parents match your search." : "No parents found in this organization."}
            </p>
          </div>
        ) : (
          filteredParents.map((parent) => (
            <div
              key={parent.id}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar className="h-11 w-11 border border-slate-100 shrink-0">
                    <AvatarFallback className="bg-amber-50 text-amber-700 font-medium text-xs">
                      {getInitials(parent.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="font-bold text-slate-900 text-sm capitalize truncate">
                      {parent.user?.name}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      {parent.role}
                    </span>
                  </div>
                </div>

                {isPrivileged && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full shrink-0"
                    onClick={() => handleRemove(parent.id)}
                    title="Remove parent"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {parent.user?.email && (
                <div className="flex items-center text-xs text-slate-500 pl-1 min-w-0">
                  <Mail className="h-3.5 w-3.5 mr-2 text-slate-400 shrink-0" />
                  <span className="truncate">{parent.user.email}</span>
                </div>
              )}

              {parent.assignedStudents && parent.assignedStudents.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {parent.assignedStudents.map((stu) => (
                    <span
                      key={stu.id}
                      className="inline-flex items-center gap-1 rounded-full bg-[#EEF0FF] px-3 py-0.5 text-[11px] font-semibold text-[#1447E6] capitalize"
                    >
                      <GraduationCap className="h-3 w-3" />
                      {stu.firstName} {stu.lastName}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="block pl-1 text-xs text-slate-400">No linked students</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
      <TableContainer>
        <Table className="min-w-[760px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Parent Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Linked Students</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell align="right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredParents.length === 0 ? (
              <TableEmpty
                colSpan={4}
                searchQuery={searchQuery}
                emptyMessage="No parents found in this organization."
                searchMessage="No parents match your search."
              />
            ) : (
              filteredParents.map((parent) => (
                <TableRow key={parent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarFallback className="bg-amber-50 text-amber-700 font-medium">
                          {getInitials(parent.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-slate-900 capitalize">
                          {parent.user?.name}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">
                          {parent.role}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[260px]">
                    <div className="flex min-w-0 items-center text-slate-600">
                      <Mail className="h-3 w-3 mr-2 shrink-0 text-slate-400" />
                      <span className="truncate">{parent.user?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    {parent.assignedStudents && parent.assignedStudents.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {parent.assignedStudents.map((stu) => (
                          <span
                            key={stu.id}
                            className="inline-flex cursor-default items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 capitalize transition-colors hover:bg-slate-200"
                          >
                            <GraduationCap className="h-3 w-3" />
                            {stu.firstName} {stu.lastName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">No linked students</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isPrivileged && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemove(parent.id)}
                        title="Remove parent"
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

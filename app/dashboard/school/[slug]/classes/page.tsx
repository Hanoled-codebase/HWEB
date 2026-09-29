"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Search,
  ArrowRight,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const classFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  level: z.string().min(1, "Level is required"),
  capacity: z.number().min(1),
  assignedTeacher: z.string().optional().or(z.literal("none")),
});

type TeacherOption = {
  id: string;
  user?: {
    name?: string;
    email?: string;
  } | null;
};

type ClassRecord = {
  id: string;
  name: string;
  level: string;
  limit?: number;
  totalStudents?: number;
  assignedTeacher?: TeacherOption | null;
};

type ClassPayload = {
  name: string;
  level: string;
  limit: number;
  organizationId: string;
  assignedTeacher?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export default function ClassesPage() {
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isPrivileged, isTeacher } = usePermissions();

  // Build a set of class IDs the teacher is assigned to (only relevant for members)
  const assignedClassIds = useMemo(() => {
    if (!isTeacher) return null;
    const ids = new Set<string>();
    const assignments = (currentMember?.teachingAssignments ?? (currentMember as any)?.memberAssignments ?? []);
    assignments.forEach((assignment: any) => {
      const id = assignment?.classLevel?.id || assignment?.classLevelId;
      if (id) ids.add(String(id));
    });
    return ids;
  }, [isTeacher, currentMember?.teachingAssignments, (currentMember as any)?.memberAssignments]);

  const form = useForm<z.infer<typeof classFormSchema>>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      level: "",
      capacity: 30,
      assignedTeacher: "none",
    },
  });

  useEffect(() => {
    if (!isDialogOpen) {
      if (editingClass) {
        setEditingClass(null);
      }
      form.reset({
        name: "",
        level: "",
        capacity: 30,
        assignedTeacher: "none",
      });
    }
  }, [isDialogOpen, editingClass, form]);

  const orgSlug = currentOrg?.slug ?? "";
  const classesQuery = orgQueries.classes<ClassRecord[]>(orgSlug);
  const [classes, setClasses, classesLoading] = useCachedList<ClassRecord[]>(
    classesQuery.queryKey,
    classesQuery.queryFn,
    { enabled: !!orgSlug, initial: [], onError: () => toast.error("Failed to load classes") },
  );
  // Only privileged (HCORE: members.manage or owner/admin) can call the members endpoint.
  const teachersQuery = orgQueries.teachers<TeacherOption[]>(orgSlug);
  const [teachers, , teachersLoading] = useCachedList<TeacherOption[]>(
    teachersQuery.queryKey,
    teachersQuery.queryFn,
    { enabled: !!orgSlug && isPrivileged, initial: [] },
  );
  const isLoading = classesLoading || teachersLoading;

  const filteredClasses = classes.filter((cls) => {
    // Teachers only see classes they have at least one subject assigned to
    if (assignedClassIds !== null && !assignedClassIds.has(cls.id)) {
      return false;
    }
    // Apply search query
    return (
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.level || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleDelete = async (classId: string) => {
    if (!currentOrg) return;
    if (
      !confirm(
        "Are you sure you want to delete this class? Students will become unassigned.",
      )
    )
      return;

    try {
      await apiFetch(`/classes/${currentOrg.slug}/${classId}`, {
        method: "DELETE",
      });
      setClasses(classes.filter((c) => c.id !== classId));
      toast.success("Class deleted successfully");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete class"));
    }
  };

  const openEditDialog = (cls: ClassRecord) => {
    setEditingClass(cls);
    form.reset({
      name: cls.name || "",
      level: cls.level || "",
      capacity: cls.limit || 0,
      assignedTeacher: cls.assignedTeacher?.id || "none",
    });
    setIsDialogOpen(true);
  };

  async function onSubmit(values: z.infer<typeof classFormSchema>) {
    if (!currentOrg) return;
    setIsSubmitting(true);

    try {
      const payload: ClassPayload = {
        name: values.name,
        level: values.level,
        limit: values.capacity,
        organizationId: currentOrg.id,
      };
      if (values.assignedTeacher !== "none") {
        payload.assignedTeacher = values.assignedTeacher;
      }

      if (editingClass) {
        const updated = await apiFetch<ClassRecord>(
          `/classes/${currentOrg.slug}/${editingClass.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
        setClasses(classes.map((c) => (c.id === updated.id ? updated : c)));
        toast.success("Class updated successfully");
      } else {
        const created = await apiFetch<ClassRecord>(
          `/classes/${currentOrg.slug}`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
        setClasses([...classes, created]);
        toast.success("Class created successfully");
      }
      setIsDialogOpen(false);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          `Failed to ${editingClass ? "update" : "create"} class`,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Classes
          </h1>
          <p className="text-slate-500">
            Manage your school&apos;s classes and assigned teachers.
          </p>
        </div>

        {isPrivileged && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingClass ? "Edit Class" : "Create New Class"}
                </DialogTitle>
                <DialogDescription>
                  {editingClass
                    ? "Update the class details below."
                    : "Enter the details for the new class."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 py-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Primary 1A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Grade 1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="assignedTeacher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form Teacher</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v ?? "none")}
                          value={field.value ?? "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a teacher" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {teachers.map((t) => (
                              <SelectItem key={t.id} value={t.id} className="capitalize">
                                {t.user?.name || "Unknown User"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingClass ? "Save Changes" : "Create Class"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 md:max-w-[384px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="search"
            placeholder="Search classes..."
            aria-label="Search classes"
            className="bg-white pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Phones: one grouped list, a whole row opens the class */}
      {!isLoading && filteredClasses.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white md:hidden">
          {filteredClasses.map((cls) => (
            <li key={cls.id} className="flex items-center gap-1 pr-2">
              <Link
                href={`/dashboard/school/${currentOrg?.slug}/classes/${cls.id}`}
                className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 active:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-slate-900">{cls.name}</span>
                  <span className="block truncate text-sm text-slate-500">
                    {cls.assignedTeacher?.user?.name ? `Form teacher: ${cls.assignedTeacher.user.name}` : "No form teacher yet"}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm tabular-nums text-slate-500">
                  <span className="font-semibold text-slate-900">{cls.totalStudents || 0}</span>
                  {cls.limit ? ` / ${cls.limit}` : ""}
                  <span className="block text-xs">learners</span>
                </span>
              </Link>
              {isPrivileged ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" aria-label={`Actions for ${cls.name}`} className="h-11 w-11 shrink-0 rounded-xl p-0 text-slate-500">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Class
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(cls.id)}
                      className="text-red-600 focus:bg-red-50 focus:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <ChevronRight className="mr-2 h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${!isLoading && filteredClasses.length > 0 ? "max-md:hidden" : ""}`}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-1/2 mb-1" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredClasses.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
            <span className="text-base font-semibold text-slate-700">
              {searchQuery
                ? "No classes match your search."
                : isTeacher
                  ? "No classes assigned to you yet."
                  : "No classes found. Get started by creating one."}
            </span>
            {!searchQuery && isTeacher && (
              <span className="text-sm text-slate-500">
                Ask an admin to assign a subject and class to your profile.
              </span>
            )}
          </div>
        ) : (
          filteredClasses.map((cls) => (
            <Card
              key={cls.id}
              className="relative cursor-pointer border-slate-200 shadow-sm transition-shadow hover:shadow-md group"
              onClick={() =>
                router.push(
                  `/dashboard/school/${currentOrg?.slug}/classes/${cls.id}`,
                )
              }
            >
              {isPrivileged && (
                <div
                  className="absolute right-2 top-2 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className="h-8 w-8 border border-slate-200 bg-white/80 p-0 shadow-sm hover:bg-white data-[state=open]:bg-white data-[state=open]:opacity-100"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Class
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(cls.id)}
                        className="text-slate-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-base text-blue-900 sm:text-xl">
                  {cls.name}
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">
                  {cls.level}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-slate-700">
                      Students
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    <span className="text-blue-600">
                      {cls.totalStudents || 0}
                    </span>
                    <span className="text-slate-400 font-normal">
                      {" "}
                      / {cls.limit || 0}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold mb-1">
                    Form Teacher
                  </span>
                  <div className="text-sm font-medium text-slate-800">
                    {cls.assignedTeacher?.user ? (
                      cls.assignedTeacher.user.name
                    ) : (
                      <span className="text-slate-400 italic font-normal">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm font-semibold text-blue-700">
                  <span>Open class details</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

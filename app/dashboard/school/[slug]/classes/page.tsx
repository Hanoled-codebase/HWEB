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
  GraduationCap,
  User,
  Layers,
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
  assignedTeacher?: string | null;
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
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("ALL");

  const allLevels = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.level) set.add(c.level);
    });
    return Array.from(set).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      // Teachers only see classes they have at least one subject assigned to
      if (assignedClassIds !== null && !assignedClassIds.has(cls.id)) {
        return false;
      }
      // Apply search query
      const matchesSearch =
        cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(cls.level ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Apply level filter
      if (selectedLevelFilter !== "ALL" && cls.level !== selectedLevelFilter) {
        return false;
      }

      // Apply teacher filter
      if (selectedTeacherFilter !== "ALL" && cls.assignedTeacher?.id !== selectedTeacherFilter) {
        return false;
      }

      return true;
    });
  }, [classes, assignedClassIds, searchQuery, selectedLevelFilter, selectedTeacherFilter]);

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
      payload.assignedTeacher =
        values.assignedTeacher === "none" ? null : values.assignedTeacher;

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
    <div className="space-y-4 sm:space-y-6">
      {/* Desktop Header */}
      <div className="hidden md:flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Classes
          </h1>
          <p className="text-slate-500">
            Manage your school&apos;s classes and assigned teachers.
          </p>
        </div>

        {isPrivileged && (
          <Button
            type="button"
            onClick={() => {
              setEditingClass(null);
              form.reset({ name: "", level: "", capacity: 30, assignedTeacher: "none" });
              setIsDialogOpen(true);
            }}
            className="bg-[#1447E6] hover:bg-[#0F36B8] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        )}
      </div>

      {/* Create / Edit Class Dialog (root-mounted for mobile and desktop) */}
      {isPrivileged && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                        <FormLabel>Class Teacher (Form Teacher)</FormLabel>
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

      {/* Phones: Hairline Directory List */}
      <div className="flex flex-col gap-3 md:hidden">
        {isPrivileged && (
          <Button
            type="button"
            onClick={() => {
              setEditingClass(null);
              form.reset({ name: "", level: "", capacity: 30, assignedTeacher: "none" });
              setIsDialogOpen(true);
            }}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs active:scale-[0.98] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Class</span>
          </Button>
        )}

        {/* Mobile Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search classes by name or level..."
            aria-label="Search classes"
            className="rounded-xl bg-white pl-9 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Mobile 2-Column Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedLevelFilter} onValueChange={(v) => setSelectedLevelFilter(v ? String(v) : "ALL")}>
            <SelectTrigger aria-label="Filter by level" className="bg-white border-slate-200 text-sm text-slate-700 rounded-xl">
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="size-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <SelectValue placeholder="All Levels" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              {allLevels.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTeacherFilter} onValueChange={(v) => setSelectedTeacherFilter(v ? String(v) : "ALL")}>
            <SelectTrigger aria-label="Filter by teacher" className="bg-white border-slate-200 text-sm text-slate-700 rounded-xl">
              <div className="flex items-center gap-1.5 truncate">
                <User className="size-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <SelectValue placeholder="All Teachers" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Teachers</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.user?.name || "Teacher"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quiet 1-line summary */}
        <p className="px-1 text-xs font-medium text-slate-600 tabular-nums">
          {filteredClasses.length} {filteredClasses.length === 1 ? "class" : "classes"}
          <span className="mx-1.5 text-slate-300">·</span>
          {classes.reduce((sum, c) => sum + (c.totalStudents || 0), 0)} students total
        </p>

        {/* Mobile Single-Container Hairline List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            ))
          ) : filteredClasses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                {searchQuery
                  ? "No classes match your search"
                  : isTeacher
                    ? "No classes assigned to you yet"
                    : "No classes yet"}
              </p>
              {!searchQuery && isTeacher && (
                <p className="mt-1 text-xs text-slate-500">
                  Ask an admin to assign a subject and class to your profile.
                </p>
              )}
            </div>
          ) : (
            filteredClasses.map((cls) => {
              const teacherName = cls.assignedTeacher?.user?.name;
              const href = `/dashboard/school/${currentOrg?.slug}/classes/${cls.id}`;
              const studentCount = cls.totalStudents || 0;

              return (
                <div
                  key={cls.id}
                  className="group flex items-center gap-2 pr-2 transition-colors"
                >
                  <Link
                    href={href}
                    className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 active:bg-slate-50"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-200/70 bg-blue-50 text-blue-600">
                      <GraduationCap className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[15px] font-semibold text-[#0B1220] group-hover:text-blue-600">
                        {cls.name}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-slate-600 tabular-nums">
                        {cls.level || "General"}
                        <span className="mx-1 text-slate-300">·</span>
                        {studentCount} {studentCount === 1 ? "student" : "students"}
                        {teacherName ? (
                          <>
                            <span className="mx-1 text-slate-300">·</span>
                            {teacherName}
                          </>
                        ) : (
                          <>
                            <span className="mx-1 text-slate-300">·</span>
                            <span className="text-slate-500">No form teacher</span>
                          </>
                        )}
                      </p>
                    </div>
                    {!isPrivileged && (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                    )}
                  </Link>

                  {isPrivileged && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label={`Options for ${cls.name}`}
                          >
                            <MoreHorizontal className="size-5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(href)}>
                          View Class
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(cls)}>
                          <Pencil className="mr-2 size-4" />
                          Edit Class
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(cls.id)}
                          className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      <div className="hidden md:flex items-center space-x-2">
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

      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    Class Teacher
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

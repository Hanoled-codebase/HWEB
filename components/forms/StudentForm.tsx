"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useOrganization } from "@/hooks/useOrganization";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft, Upload, UserRound, Bus, Hotel } from "lucide-react";

function getGuardianDefaults(guardian?: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}) {
  const fullName = guardian?.name?.trim() || "";
  const nameParts = fullName ? fullName.split(/\s+/) : [];

  return {
    firstName: guardian?.firstName || nameParts[0] || "",
    lastName:
      guardian?.lastName ||
      (nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""),
    email: guardian?.email || "",
    phone: guardian?.phone || "",
  };
}

function getGuardiansFromInitialData(data?: StudentApiPayload) {
  const guardians = data?.guardians || [];
  const primary = guardians.find((g) => g.isPrimary) || data?.guardian || guardians[0];
  const others = guardians.filter((g) => g !== primary && !g.isPrimary);
  return {
    guardian: getGuardianDefaults(primary),
    guardian2: others[0] ? getGuardianDefaults(others[0]) : undefined,
    guardian3: others[1] ? getGuardianDefaults(others[1]) : undefined,
  };
}

function getParentInviteMessage(action?: string, isEditing?: boolean) {
  if (!action || action === "skipped") {
    return isEditing
      ? "Student updated successfully"
      : "Student added successfully";
  }

  if (action === "created-parent-invite") {
    return isEditing
      ? "Student updated and parent invitation sent"
      : "Student added and parent invitation sent";
  }

  if (action === "resent-pending-parent-invite") {
    return isEditing
      ? "Student updated and parent invitation resent"
      : "Student added and parent invitation resent";
  }

  if (action === "linked-existing-parent") {
    return isEditing
      ? "Student updated and linked to existing parent account"
      : "Student added and linked to existing parent account";
  }

  if (action === "existing-member-not-parent") {
    return isEditing
      ? "Student updated, but the guardian email already belongs to a non-parent account"
      : "Student added, but the guardian email already belongs to a non-parent account";
  }

  if (action === "invite-error") {
    return isEditing
      ? "Student updated, but the parent invitation could not be sent"
      : "Student added, but the parent invitation could not be sent";
  }

  return isEditing
    ? "Student updated successfully"
    : "Student added successfully";
}

const primaryGuardianSchema = z.object({
  firstName: z.string().min(2, "Guardian first name required"),
  lastName: z.string().min(2, "Guardian last name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

const optionalGuardianSchema = z
  .object({
    firstName: z.string().optional().or(z.literal("")),
    lastName: z.string().optional().or(z.literal("")),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const hasAny = Boolean(
      data.firstName?.trim() ||
        data.lastName?.trim() ||
        data.email?.trim() ||
        data.phone?.trim(),
    );

    if (hasAny) {
      if (!data.firstName || data.firstName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "First name required",
          path: ["firstName"],
        });
      }
      if (!data.lastName || data.lastName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Last name required",
          path: ["lastName"],
        });
      }
    }
  });

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name is required"),
  admissionNumber: z.string().trim().optional(),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().optional(),
  admissionDate: z.string().optional(),
  address: z.string().optional(),
  classLevel: z.string().optional().or(z.literal("none")),
  studentType: z.enum(["day", "boarding"]),
  usesBus: z.boolean().optional(),
  guardian: primaryGuardianSchema,
  guardian2: optionalGuardianSchema,
  guardian3: optionalGuardianSchema,
});

type StudentFormValues = z.infer<typeof formSchema>;

type ClassOption = {
  id: string;
  name: string;
};

type GuardianData = {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
};

type StudentApiPayload = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  admissionNumber?: string;
  gender?: StudentFormValues["gender"];
  dateOfBirth?: string;
  admissionDate?: string;
  address?: string;
  studentType?: string;
  usesBus?: boolean;
  classLevel?: string | { id?: string } | null;
  guardian?: GuardianData;
  guardians?: GuardianData[];
  profileImage?: string;
  profilePic?: string;
};

type StudentMutationResponse = {
  parentInvite?: {
    action?: string;
  };
};

type StudentFormProps = {
  initialData?: StudentApiPayload;
  studentId?: string;
};

export function StudentForm({ initialData, studentId }: StudentFormProps) {
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [picFile, setPicFile] = useState<File | null>(null);

  const isEditing = !!studentId;

  const guardianDefaults = getGuardiansFromInitialData(initialData);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      middleName: initialData?.middleName || "",
      lastName: initialData?.lastName || "",
      admissionNumber: initialData?.admissionNumber || "",
      gender: initialData?.gender || "male",
      dateOfBirth: initialData?.dateOfBirth
        ? new Date(initialData.dateOfBirth).toISOString().split("T")[0]
        : "",
      admissionDate: initialData?.admissionDate
        ? new Date(initialData.admissionDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      address: initialData?.address || "",
      studentType: (initialData?.studentType as "day" | "boarding") || "day",
      usesBus: initialData?.usesBus ?? false,
      classLevel:
        (typeof initialData?.classLevel === 'object' && initialData?.classLevel !== null ? initialData.classLevel.id : initialData?.classLevel) || "none",
      guardian: guardianDefaults.guardian,
      guardian2: guardianDefaults.guardian2,
      guardian3: guardianDefaults.guardian3,
    },
  });

  useEffect(() => {
    async function fetchClasses() {
      if (!currentOrg) return;
      try {
        const res = await apiFetch<ClassOption[]>(
          `/classes/${currentOrg.slug}`,
        );
        setClasses(res);
      } catch {
        toast.error("Failed to load classes");
      }
    }
    fetchClasses();
  }, [currentOrg]);

  async function onSubmit(values: StudentFormValues) {
    if (!currentOrg) return;
    setIsLoading(true);

    let picUrl = initialData?.profileImage || initialData?.profilePic || "";

    try {
      // 1. Upload Pic if present
      if (picFile) {
        const formData = new FormData();
        formData.append("file", picFile);
        const uploadRes = await apiFetch<{ url: string }>("/upload/image", {
          method: "POST",
          body: formData,
        });
        picUrl = uploadRes.url;
      }

      // 2. Prepare payload
      const payload: Record<string, unknown> = {
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName,
        admissionNumber: values.admissionNumber?.trim() || undefined,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
        admissionDate: values.admissionDate ? new Date(values.admissionDate).toISOString() : undefined,
        address: values.address || undefined,
        studentType: values.studentType,
        usesBus: values.usesBus,
        classLevel: values.classLevel === "none" ? undefined : values.classLevel,
        profileImage: picUrl || undefined,
        organizationId: currentOrg.id,
        guardian: values.guardian,
      };

      let response: StudentMutationResponse;
      if (isEditing) {
        response = await apiFetch<StudentMutationResponse>(
          `/students/${currentOrg.slug}/${studentId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
      } else {
        response = await apiFetch<StudentMutationResponse>(
          `/students/${currentOrg.slug}`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
      }

      // Extract student ID from response or from state
      const createdStudentId = studentId || (response as any)?.student?.id || (response as any)?.id;

      // 3. Create additional guardians (guardian2, guardian3)
      const additionalGuardians = [
        { data: values.guardian2, isPrimary: false },
        { data: values.guardian3, isPrimary: false },
      ];

      const targetId = createdStudentId || studentId;
      if (targetId) {
        for (const g of additionalGuardians) {
          if (g.data?.firstName && g.data?.lastName) {
            await apiFetch(
              `/students/${currentOrg.slug}/${targetId}/guardians`,
              {
                method: "POST",
                body: JSON.stringify({ ...g.data, isPrimary: g.isPrimary }),
              },
            ).catch(() => {
              // silent - secondary guardians are optional
            });
          }
        }
      }

      toast.success(
        getParentInviteMessage(response?.parentInvite?.action, isEditing),
      );

      router.push(`/dashboard/school/${currentOrg.slug}/students`);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "add"} student`;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            router.push(`/dashboard/school/${currentOrg?.slug}/students`)
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEditing ? `Edit ${initialData?.firstName}` : "Add New Student"}
          </h1>
          <p className="text-slate-500">
            {isEditing
              ? "Update student information"
              : "Register a new student in the system"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 flex flex-col items-center w-full"
        >
          <div className="w-full flex flex-col md:flex-row gap-6">
            {/* Left Column: Picture */}
            <div className="w-full md:w-1/3">
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Profile Picture</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                  <div className="h-32 w-32 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {picFile ? (
                      <img
                        src={URL.createObjectURL(picFile)}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : initialData?.profileImage || initialData?.profilePic ? (
                      <img
                        src={
                          initialData?.profileImage || initialData?.profilePic
                        }
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-12 w-12 text-slate-400" />
                    )}
                  </div>
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-md inline-flex items-center transition-colors text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPicFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Details */}
            <div className="w-full md:w-2/3 space-y-6">
              <Card className="shadow-sm border-slate-200 w-full">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="middleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Address</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 w-full">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Academic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <FormField
                      control={form.control}
                      name="admissionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admission Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="classLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Class</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {classes.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="studentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="day">
                                <span className="flex items-center gap-2">Day Student</span>
                              </SelectItem>
                              <SelectItem value="boarding">
                                <span className="flex items-center gap-2">Boarding Student</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="usesBus"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3 rounded-lg border border-slate-200 p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={field.value ?? false}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium cursor-pointer">
                            Uses School Bus
                          </FormLabel>
                          <p className="text-xs text-slate-500">
                            Student will be assigned a bus route
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 w-full">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Primary Guardian / Parent
                  </CardTitle>
                  <CardDescription>
                    Main contact person for this student
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guardian.firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian.lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Secondary Guardian */}
              <Card className="shadow-sm border-slate-200 w-full">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Secondary Guardian (Optional)
                  </CardTitle>
                  <CardDescription>
                    Additional contact person
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guardian2.firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian2.lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian2.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian2.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tertiary Guardian */}
              <Card className="shadow-sm border-slate-200 w-full">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Tertiary Guardian (Optional)
                  </CardTitle>
                  <CardDescription>
                    Additional contact person
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guardian3.firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian3.lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian3.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guardian3.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="w-full flex justify-end gap-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/school/${currentOrg?.slug}/students`)
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Student"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

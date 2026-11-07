"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { apiFetch, ApiFetchError, ApiErrorResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Loader2, School, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { validatePhone } from '@/lib/validation';


const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must only contain lowercase letters, numbers, and hyphens",
    ),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().refine((val) => !val || validatePhone(val), {
    message: "Invalid phone number format",
  }),
  address: z.string().optional(),
  country: z.string().min(2, "Country is required"),
  category: z.enum(["primary", "secondary", "tertiary"]),
  type: z.enum(["private", "public", "federal", "state"]),
  logoUpload: z.any().optional(), // For the file input
});

type UploadResponse = {
  url: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const {
    user,
    checkAuth,
    isInitialized,
    isLoading: authLoading,
    logout,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      address: "",
      country: "Nigeria", // default
      category: "secondary",
      type: "private",
    },
  });

  // Auto-generate slug from name
  const updateSlug = (name: string) => {
    if (!form.formState.dirtyFields.slug) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      form.setValue("slug", generated, { shouldValidate: true });
    }
  };

  useEffect(() => {
    if (!isInitialized && !authLoading) {
      void checkAuth();
    }
  }, [authLoading, checkAuth, isInitialized]);

  useEffect(() => {
    if (!isInitialized || authLoading) {
      return;
    }

    if (!user) {
      router.replace("/signin?callbackUrl=/onboarding");
    }
  }, [authLoading, isInitialized, router, user]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    let logoUrl = "";

    try {
      // 1. Upload Logo if present
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        const uploadRes = await apiFetch<UploadResponse>("/upload/image", {
          method: "POST",
          showErrorToast: false,
          body: formData,
        });
        logoUrl = uploadRes.url;
      }

      // 2. Create Organization
      const orgPayload = {
        name: values.name,
        slug: values.slug,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        country: values.country,
        category: values.category,
        schoolType: values.type,
        logo: logoUrl || undefined,
      };

      // Ensure Content-Type is stringified JSON
      await apiFetch("/organizations", {
        method: "POST",
        showErrorToast: false,
        body: JSON.stringify(orgPayload),
        headers: { "Content-Type": "application/json" },
      });

      toast.success("School created successfully!");
      router.push(`/dashboard/school/${values.slug}`);
    } catch (err: unknown) {
      const error = err as ApiFetchError;
      const details = error.details as ApiErrorResponse | undefined;

      if (error.status === 409 || error.message === "CONFLICT_NAME" || details?.error === "CONFLICT_NAME") {
        setNameError("This school name is already taken");
        form.setError("name", { type: "manual", message: "This name is already taken" });
      } else if (error.message === "CONFLICT_SLUG" || details?.error === "CONFLICT_SLUG") {
        form.setError("slug", { type: "manual", message: "This URL slug is already taken" });
      } else {
        toast.error(
          error.message ||
            "Failed to create school. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">
            Loading onboarding...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-blue-600 mb-4">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome to Hanoled
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Let&apos;s set up your school profile to get started.
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>School Details</CardTitle>
            <CardDescription>
              Basic information about your educational institution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Greenwood High School"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              updateSlug(e.target.value);
                              if (nameError) setNameError(null);
                            }}
                            className={nameError ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                        </FormControl>
                        {nameError && (
                          <p className="text-[0.8rem] font-medium text-red-500">
                            {nameError}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug *</FormLabel>
                        <FormControl>
                          <Input placeholder="greenwood-high" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier used in your dashboard URL.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(String(v ?? ""))}
                          value={field.value ?? ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select educational category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="primary">
                              Primary School
                            </SelectItem>
                            <SelectItem value="secondary">
                              Secondary School
                            </SelectItem>
                            <SelectItem value="tertiary">
                              Tertiary Institution
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Type *</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(String(v ?? ""))}
                          value={field.value ?? ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select institution type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="federal">Federal</SelectItem>
                            <SelectItem value="state">State</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Contact & Location */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900">
                    Contact & Location
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Official Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="contact@greenwood.edu"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-start">
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl className="w-full">
                            <PhoneInput
                              defaultCountry="ng"
                              value={field.value}
                              onChange={field.onChange}
                              inputClassName="!w-full !h-10 !rounded-md !border !border-slate-200 !bg-white !px-3 !py-2 !text-sm !ring-offset-white !file:border-0 !file:bg-transparent !file:text-sm !file:font-medium !placeholder:text-slate-500 !focus-visible:outline-none !focus-visible:ring-2 !focus-visible:ring-slate-950 !focus-visible:ring-offset-2 !disabled:cursor-not-allowed !disabled:opacity-50"
                              countrySelectorStyleProps={{
                                buttonClassName: "!h-10 !border !border-slate-200 !rounded-l-md !bg-slate-50",
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nigeria" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="123 Education Lane..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Logo Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-slate-900">
                    School Logo
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="h-24 w-24 flex-shrink-0 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {logoFile ? (
                        <Image
                          src={URL.createObjectURL(logoFile)}
                          alt="Logo preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <School className="h-10 w-10 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-4 text-slate-500" />
                            <p className="mb-2 text-sm text-slate-500">
                              <span className="font-semibold">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-slate-500">
                              SVG, PNG, JPG (MAX. 2MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setLogoFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Complete Setup
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

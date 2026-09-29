"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, School, Upload, Shield, ArrowLeftRight } from "lucide-react";

const profileFormSchema = z.object({
  name: z.string().min(3),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  category: z.string(),
  type: z.string(),
  idPrefix: z.string().max(10).optional().or(z.literal("")),
  nextIdSequence: z.coerce.number().min(1).optional(),
});

type UploadResponse = {
  url: string;
};

export default function SettingsPage() {
  const { currentOrg, currentMember, fetchOrgs } = useOrganization();
  const { user } = useAuth();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const isOwner = currentMember?.role === "owner";
  const isAdmin =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      country: "",
      category: "",
      type: "",
      idPrefix: "HNL",
      nextIdSequence: 1,
    },
  });

  useEffect(() => {
    if (currentOrg) {
      form.reset({
        name: currentOrg.name,
        email: currentOrg.email || "",
        phone: currentOrg.phone || "",
        address: currentOrg.address || "",
        country: currentOrg.country || "Nigeria",
        category: currentOrg.category,
        type: currentOrg.type,
        idPrefix: (currentOrg as any).idPrefix || "HNL",
        nextIdSequence: (currentOrg as any).nextIdSequence || 1,
      });
    }
  }, [currentOrg, form]);

  if (!currentOrg || !currentMember) return null;

  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!isAdmin) {
      toast.error("You don't have permission to update settings");
      return;
    }

    setIsUpdating(true);
    let logoUrl = currentOrg?.logo;

    try {
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        const uploadRes = await apiFetch<UploadResponse>("/upload/image", {
          method: "POST",
          body: formData,
        });
        logoUrl = uploadRes.url;
      }

      const payload = {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        country: values.country || undefined,
        category: values.category,
        schoolType: values.type,
        logo: logoUrl || undefined,
      };

      await apiFetch(`/organizations/${currentOrg?.slug}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("School profile updated successfully");
      await fetchOrgs(); // Refresh orgs list to show new logo/name in sidebar
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="hidden md:block">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-slate-500">
          Manage your school&apos;s profile, contact details, and platform
          preferences.
        </p>
      </div>

      <div className="grid gap-6">
        {/* overflow-visible on phones so the Save bar below can stick to the thumb zone */}
        <Card className="shadow-sm border-slate-200 max-md:overflow-visible">
          <CardHeader>
            <CardTitle className="text-base sm:text-xl">
              School Profile
            </CardTitle>
            <CardDescription>
              Update your institution&apos;s core details and identity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit as any)}
                className="space-y-6"
              >
                {/* Logo Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                  <div className="h-24 w-24 rounded-lg border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoFile ? (
                      <img
                        src={URL.createObjectURL(logoFile)}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : currentOrg.logo ? (
                      <img
                        src={currentOrg.logo}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <School className="h-10 w-10 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-medium text-slate-900">
                      School Logo
                    </h3>
                    <p className="text-xs text-slate-500 max-w-[384px]">
                      This logo appears in your sidebar, reports, and public
                      pages. Recommended size is 256x256px.
                    </p>
                    {isAdmin && (
                      <div className="relative mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="relative z-0"
                        >
                          <Upload className="mr-2 h-4 w-4" /> Change Logo
                        </Button>
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 z-10 cursor-pointer w-[130px]"
                          accept="image/*"
                          disabled={!isAdmin}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setLogoFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <FormField
                    control={form.control as any}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>URL Slug</FormLabel>
                    <Input
                      value={currentOrg.slug}
                      disabled
                      className="bg-slate-50 text-slate-500"
                    />
                    <FormDescription>
                      Slug cannot be changed after creation.
                    </FormDescription>
                  </div>

                   <FormField
                    control={form.control as any}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!isAdmin}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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
                    control={form.control as any}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!isAdmin}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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

                <h3 className="text-lg font-medium text-slate-900 pt-2">
                  Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control as any}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Official Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled={!isAdmin} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Full Address</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isAdmin} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border-t border-slate-100 pt-4 md:col-span-2">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Learner ID Settings</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Configure the automatic Student/Learner ID sequence prefix and next number.
                    </p>
                  </div>

                  <FormField
                    control={form.control as any}
                    name="idPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student ID Prefix</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="HNL" disabled={!isAdmin} />
                        </FormControl>
                        <FormDescription>Example: HNL will generate HNL-2026-00001</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="nextIdSequence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next ID Sequence Number</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled={!isAdmin} />
                        </FormControl>
                        <FormDescription>The next serial number to assign to a student.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isAdmin && (
                  <div className="bottom-above-nav z-10 flex justify-end pt-4 max-md:sticky max-md:-mx-6 max-md:rounded-b-xl max-md:border-t max-md:border-slate-100 max-md:bg-white/95 max-md:px-6 max-md:py-3 max-md:backdrop-blur-md">
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 max-md:h-12 max-md:w-full"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base sm:text-xl flex items-center">
                <ArrowLeftRight className="h-5 w-5 text-blue-600 mr-2" />
                Inter-School Student Transfers
              </CardTitle>
              <CardDescription>
                Transfer students between different school branches or import incoming students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-slate-200 font-semibold md:w-auto">
                <Link href={`/dashboard/school/${currentOrg.slug}/settings/transfers`}>
                  Manage Transfers
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Access Control Information */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-xl flex items-center">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              Your Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-4">
              <div className="bg-white p-2 border border-slate-200 rounded-md shadow-sm shrink-0 mt-1">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 capitalize text-lg">
                  {currentMember.role} Access
                </h4>
                <p className="text-slate-600 mt-1 text-sm leading-relaxed">
                  {currentMember.role === "owner" &&
                    "You have full administrative and billing control over this school."}
                  {currentMember.role === "admin" &&
                    "You can manage all school data, members, classes, and students."}
                  {currentMember.role === "member" &&
                    "You can view and manage data for the specific classes and students assigned to you."}
                  {currentMember.role === "parent" &&
                    "You can only view information relevant to your linked children."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

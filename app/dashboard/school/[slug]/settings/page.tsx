"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { DataRetentionCard } from "@/components/dashboard/DataRetentionCard";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { clearTenantBrandingCache } from "@/lib/tenant-branding";
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
import {
  Loader2,
  Save,
  School,
  Upload,
  Shield,
  ArrowLeftRight,
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  deriveTheme,
  isValidHexColor,
  normalizeHex,
  DEFAULT_HANOLED_PRIMARY,
} from "@/lib/theme-colors";

const PRESET_COLORS = [
  { name: "Hanoled Blue", hex: "#1447E6" },
  { name: "Royal Blue", hex: "#1E40AF" },
  { name: "Deep Navy", hex: "#0F172A" },
  { name: "Forest Green", hex: "#047857" },
  { name: "Emerald", hex: "#059669" },
  { name: "Ocean Teal", hex: "#0F766E" },
  { name: "Burgundy", hex: "#831843" },
  { name: "Crimson", hex: "#B91C1C" },
  { name: "Royal Purple", hex: "#581C87" },
  { name: "Warm Amber", hex: "#B45309" },
];

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
  const { currentOrg, currentMember, fetchOrgs, updateCurrentOrg } = useOrganization();
  const { user } = useAuth();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedColor, setSelectedColor] = useState<string>(
    currentOrg?.primaryColor || DEFAULT_HANOLED_PRIMARY
  );
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);

  useEffect(() => {
    if (currentOrg?.primaryColor) {
      setSelectedColor(currentOrg.primaryColor);
    } else {
      setSelectedColor(DEFAULT_HANOLED_PRIMARY);
    }
  }, [currentOrg?.primaryColor]);

  const previewTheme = useMemo(() => {
    const valid = isValidHexColor(selectedColor) ? normalizeHex(selectedColor) : DEFAULT_HANOLED_PRIMARY;
    return deriveTheme(valid);
  }, [selectedColor]);

  async function onSaveColor() {
    if (!isAdmin) {
      toast.error("You don't have permission to update school branding");
      return;
    }
    if (!isValidHexColor(selectedColor)) {
      toast.error("Please enter a valid hex color code (e.g. #1E40AF)");
      return;
    }

    setIsUpdatingColor(true);
    try {
      const normalized = normalizeHex(selectedColor);
      await apiFetch(`/organizations/${currentOrg?.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ primaryColor: normalized }),
      });

      updateCurrentOrg({
        primaryColor: normalized,
      });

      if (currentOrg?.slug) {
        clearTenantBrandingCache(currentOrg.slug);
      }

      toast.success("School branding color updated successfully!");
      await fetchOrgs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update branding color");
    } finally {
      setIsUpdatingColor(false);
    }
  }

  async function onResetColor() {
    if (!isAdmin) return;
    setIsUpdatingColor(true);
    try {
      await apiFetch(`/organizations/${currentOrg?.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ primaryColor: null }),
      });

      setSelectedColor(DEFAULT_HANOLED_PRIMARY);
      updateCurrentOrg({
        primaryColor: null,
      });

      if (currentOrg?.slug) {
        clearTenantBrandingCache(currentOrg.slug);
      }

      toast.success("Reset to default Hanoled Blue");
      await fetchOrgs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset branding color");
    } finally {
      setIsUpdatingColor(false);
    }
  }

  const { isPrivileged } = usePermissions();
  const isOwner = currentMember?.role === "owner";
  const isAdmin =
    isPrivileged ||
    currentMember?.role === "owner" ||
    currentMember?.role === "admin";

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

      // Reflect the new logo/name in the active school immediately — the
      // sidebar, school switcher and report headers all read it from the
      // store, and they'd otherwise keep the pre-edit values until a reload.
      updateCurrentOrg({
        logo: logoUrl,
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        address: values.address || undefined,
        country: values.country || undefined,
        category: values.category,
        type: values.type,
        schoolType: values.type,
      });
      setLogoFile(null);

      toast.success("School profile updated successfully");
      await fetchOrgs(); // Refresh orgs list so the switcher picks up the new logo/name
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

      {/* Quick Access to School Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/60 shadow-2xs">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{ backgroundColor: previewTheme.primary }}
          >
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block">
              School Branding &amp; Signature Theme Color
            </span>
            <span className="text-xs text-slate-600">
              Customize your school&apos;s theme color for sign-in portals, result sheets, and parent invite emails.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#branding"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            Scroll Down ↓
          </a>
          <Link
            href={`/dashboard/school/${currentOrg.slug}/settings/branding`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition-all"
            style={{ backgroundColor: previewTheme.primary }}
          >
            Open Branding Studio <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
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

        {/* School Branding & Theme Color Card */}
        {isAdmin && (
          <Card id="branding" className="shadow-sm border-slate-200 scroll-mt-6">
            <CardHeader>
              <CardTitle className="text-base sm:text-xl flex items-center">
                <Palette className="h-5 w-5 text-blue-600 mr-2" />
                School Branding &amp; Theme Color
              </CardTitle>
              <CardDescription>
                Customize your school&apos;s signature brand color. This custom theme is applied across your student &amp; staff sign-in portal, result printouts, report cards, and parent invitation emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Presets Grid */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {PRESET_COLORS.map((preset) => {
                    const isSelected = selectedColor.toUpperCase() === preset.hex.toUpperCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setSelectedColor(preset.hex)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center shadow-2xs"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Picker & Hex Input */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Custom Hex Color
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex items-center">
                    <input
                      type="color"
                      value={isValidHexColor(selectedColor) ? normalizeHex(selectedColor) : "#1447E6"}
                      onChange={(e) => setSelectedColor(e.target.value.toUpperCase())}
                      className="h-10 w-14 rounded-xl cursor-pointer border border-slate-300 p-1 bg-white shadow-2xs"
                      title="Open color palette"
                    />
                  </div>

                  <Input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    placeholder="#1E40AF"
                    maxLength={7}
                    className="font-mono uppercase w-32 tracking-wider"
                  />

                  {/* Contrast Status Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium">
                    {previewTheme.contrast.isAccessibleOnWhite ? (
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        WCAG AA Passed ({previewTheme.contrast.ratio.toFixed(1)}:1)
                      </span>
                    ) : previewTheme.contrast.isAccessibleLargeOnWhite ? (
                      <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        WCAG AA Large ({previewTheme.contrast.ratio.toFixed(1)}:1)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Low Contrast ({previewTheme.contrast.ratio.toFixed(1)}:1)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Interactive Preview Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                    Live Component Preview
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Text foreground: {previewTheme.foreground}
                  </span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                  {/* Primary Button Preview */}
                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-opacity hover:opacity-90 cursor-default"
                    style={{
                      backgroundColor: previewTheme.primary,
                      color: previewTheme.foreground,
                    }}
                  >
                    <span>Sign In to {currentOrg.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Status Badge Preview */}
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border flex items-center gap-1.5"
                    style={{
                      backgroundColor: previewTheme.light,
                      borderColor: previewTheme.border,
                      color: previewTheme.primary,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: previewTheme.primary }}
                    />
                    <span>{currentOrg.name} Portal</span>
                  </div>

                  {/* Monogram Crest Preview */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-2xs"
                    style={{
                      backgroundColor: previewTheme.primary,
                      color: previewTheme.foreground,
                    }}
                  >
                    {currentOrg.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Footer Save / Reset Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetColor}
                  disabled={isUpdatingColor}
                  className="text-slate-600 hover:text-slate-900 border-slate-200"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5 text-slate-400" />
                  Reset to Default Blue
                </Button>

                <Button
                  type="button"
                  onClick={onSaveColor}
                  disabled={isUpdatingColor}
                  className="bg-blue-600 hover:bg-blue-700 min-h-10 px-5 font-bold"
                >
                  {isUpdatingColor ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Theme...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Theme Color
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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

        {isAdmin && <DataRetentionCard orgId={currentOrg.id} />}

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

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { clearTenantBrandingCache } from "@/lib/tenant-branding";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Save,
  Loader2,
  ExternalLink,
  ChevronLeft,
  School,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  deriveTheme,
  isValidHexColor,
  normalizeHex,
  DEFAULT_HANOLED_PRIMARY,
} from "@/lib/theme-colors";

interface DualPreset {
  name: string;
  primary: string;
  secondary: string;
}

const DUAL_PRESETS: DualPreset[] = [
  { name: "Royal Blue & Gold", primary: "#1E40AF", secondary: "#F59E0B" },
  { name: "Deep Navy & Crimson", primary: "#0F172A", secondary: "#B91C1C" },
  { name: "Emerald & Amber", primary: "#047857", secondary: "#D97706" },
  { name: "Burgundy & Gold", primary: "#831843", secondary: "#EAB308" },
  { name: "Ocean Teal & Coral", primary: "#0F766E", secondary: "#EA580C" },
  { name: "Royal Purple & Canary", primary: "#581C87", secondary: "#EAB308" },
  { name: "Crimson & Slate", primary: "#B91C1C", secondary: "#475569" },
  { name: "Forest Green & Gold", primary: "#065F46", secondary: "#F59E0B" },
  { name: "Hanoled Classic", primary: "#1447E6", secondary: "#3B82F6" },
  { name: "Slate Minimal", primary: "#1E293B", secondary: "#64748B" },
];

export default function SchoolBrandingPage() {
  const { currentOrg, fetchOrgs, updateCurrentOrg } = useOrganization();
  const { isPrivileged } = usePermissions();

  const [primaryColor, setPrimaryColor] = useState<string>(
    currentOrg?.primaryColor || DEFAULT_HANOLED_PRIMARY
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    currentOrg?.secondaryColor || "#F59E0B"
  );
  const [useCustomSecondary, setUseCustomSecondary] = useState<boolean>(
    Boolean(currentOrg?.secondaryColor)
  );

  const [isUpdatingColor, setIsUpdatingColor] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (currentOrg?.primaryColor) {
        setPrimaryColor(currentOrg.primaryColor);
      } else {
        setPrimaryColor(DEFAULT_HANOLED_PRIMARY);
      }

      if (currentOrg?.secondaryColor) {
        setSecondaryColor(currentOrg.secondaryColor);
        setUseCustomSecondary(true);
      } else {
        setUseCustomSecondary(false);
      }
    });
  }, [currentOrg?.primaryColor, currentOrg?.secondaryColor]);

  const effectiveSecondary = useCustomSecondary ? secondaryColor : null;

  const previewTheme = useMemo(() => {
    const validPrimary = isValidHexColor(primaryColor)
      ? normalizeHex(primaryColor)
      : DEFAULT_HANOLED_PRIMARY;
    const validSecondary =
      useCustomSecondary && isValidHexColor(secondaryColor)
        ? normalizeHex(secondaryColor)
        : null;

    return deriveTheme(validPrimary, validSecondary);
  }, [primaryColor, secondaryColor, useCustomSecondary]);

  async function onSaveColor() {
    if (!isPrivileged) {
      toast.error("You don't have permission to update school branding");
      return;
    }
    if (!isValidHexColor(primaryColor)) {
      toast.error("Please enter a valid primary hex color code (e.g. #1E40AF)");
      return;
    }
    if (useCustomSecondary && !isValidHexColor(secondaryColor)) {
      toast.error("Please enter a valid secondary hex color code (e.g. #F59E0B)");
      return;
    }

    const normalizedPrimary = normalizeHex(primaryColor);
    const normalizedSecondary = useCustomSecondary && isValidHexColor(secondaryColor)
      ? normalizeHex(secondaryColor)
      : null;

    setIsUpdatingColor(true);
    try {
      await apiFetch(`/organizations/${currentOrg?.slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          primaryColor: normalizedPrimary,
          secondaryColor: normalizedSecondary,
        }),
      });

      // Update local store so SchoolThemeProvider immediately changes all button colors
      updateCurrentOrg({
        primaryColor: normalizedPrimary,
        secondaryColor: normalizedSecondary,
      });

      // Invalidate sign-in branding cache
      if (currentOrg?.slug) {
        clearTenantBrandingCache(currentOrg.slug);
      }

      toast.success("School branding colors saved and applied across the entire portal!");
      await fetchOrgs();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update theme colors"
      );
    } finally {
      setIsUpdatingColor(false);
    }
  }

  async function onResetDefault() {
    setPrimaryColor(DEFAULT_HANOLED_PRIMARY);
    setSecondaryColor("#F59E0B");
    setUseCustomSecondary(false);

    if (!isPrivileged) return;
    setIsUpdatingColor(true);
    try {
      await apiFetch(`/organizations/${currentOrg?.slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          primaryColor: DEFAULT_HANOLED_PRIMARY,
          secondaryColor: null,
        }),
      });

      updateCurrentOrg({
        primaryColor: DEFAULT_HANOLED_PRIMARY,
        secondaryColor: null,
      });

      if (currentOrg?.slug) {
        clearTenantBrandingCache(currentOrg.slug);
      }

      toast.success("Theme reset to default Hanoled Blue");
      await fetchOrgs();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reset theme colors"
      );
    } finally {
      setIsUpdatingColor(false);
    }
  }

  if (!currentOrg) return null;

  const publicPortalUrl = `/signin?orgSlug=${currentOrg.slug}`;

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Navigation header */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/dashboard/school/${currentOrg.slug}/settings`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full shadow-2xs inline-block"
                style={{ backgroundColor: previewTheme.primary }}
              />
              School Branding &amp; Button Colors
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Customize your institution&apos;s signature primary and secondary button colors. Changes apply instantly across the sign-in portal, school dashboard, and report cards.
            </p>
          </div>
          <Link
            href={publicPortalUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors w-fit"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            View Live Sign-In Portal
          </Link>
        </div>
      </div>

      {/* Main Settings Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-600" />
            Choose Your School Colors
          </CardTitle>
          <CardDescription>
            Select from paired school presets or define your school&apos;s exact official primary and secondary hex colors.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-7">
          {/* Paired School Presets */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Popular Paired Presets (Primary + Secondary)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DUAL_PRESETS.map((preset) => {
                const isSelected =
                  primaryColor.toUpperCase() === preset.primary.toUpperCase() &&
                  useCustomSecondary &&
                  secondaryColor.toUpperCase() === preset.secondary.toUpperCase();

                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                      setUseCustomSecondary(true);
                    }}
                    className={`flex flex-col gap-1.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/50 shadow-2xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-2xs border border-white"
                        style={{ backgroundColor: preset.primary }}
                        title="Primary Color"
                      />
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-white -ml-2"
                        style={{ backgroundColor: preset.secondary }}
                        title="Secondary Color"
                      />
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Color Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Primary Button &amp; Brand Color
                </label>
                <p className="text-xs text-slate-500">
                  Applied to main CTA buttons, header crests, sign-in submit button, and active tabs.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium bg-white">
                {previewTheme.contrast.isAccessibleOnWhite ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    WCAG AA ({previewTheme.contrast.ratio.toFixed(1)}:1)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    AA Large ({previewTheme.contrast.ratio.toFixed(1)}:1)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={
                  isValidHexColor(primaryColor)
                    ? normalizeHex(primaryColor)
                    : "#1447E6"
                }
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                className="h-10 w-14 rounded-xl cursor-pointer border border-slate-300 p-1 bg-white shadow-2xs"
                title="Open primary color picker"
              />

              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1E40AF"
                maxLength={7}
                className="font-mono uppercase w-32 tracking-wider"
              />

              <div
                className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all"
                style={{
                  backgroundColor: previewTheme.primary,
                  color: previewTheme.foreground,
                }}
              >
                Primary Preview
              </div>
            </div>
          </div>

          {/* Secondary Color Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Secondary Button &amp; Accent Color
                </label>
                <p className="text-xs text-slate-500">
                  Applied to secondary buttons, report tags, and highlighted badges.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseCustomSecondary(!useCustomSecondary)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
                    useCustomSecondary
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {useCustomSecondary ? "Custom Secondary Active" : "Auto-derive from Primary"}
                </button>
              </div>
            </div>

            {useCustomSecondary ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={
                    isValidHexColor(secondaryColor)
                      ? normalizeHex(secondaryColor)
                      : "#F59E0B"
                  }
                  onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                  className="h-10 w-14 rounded-xl cursor-pointer border border-slate-300 p-1 bg-white shadow-2xs"
                  title="Open secondary color picker"
                />

                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#F59E0B"
                  maxLength={7}
                  className="font-mono uppercase w-32 tracking-wider"
                />

                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all"
                  style={{
                    backgroundColor: previewTheme.secondary,
                    color: previewTheme.secondaryForeground,
                  }}
                >
                  Secondary Preview
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 flex items-center justify-between">
                <span>
                  Secondary buttons will automatically use an elegant 8% tint of your primary color:
                </span>
                <span
                  className="px-3 py-1 rounded-lg font-bold text-xs shadow-2xs"
                  style={{
                    backgroundColor: previewTheme.secondary,
                    color: previewTheme.secondaryForeground,
                    border: `1px solid ${previewTheme.border}`,
                  }}
                >
                  Auto Secondary
                </span>
              </div>
            )}
          </div>

          {/* Interactive Live Previews */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                Live Component &amp; Button Previews
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Primary: {previewTheme.primary} | Secondary: {previewTheme.secondary}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Button Showcase */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Buttons Across Dashboard &amp; Pages
                </span>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
                  {/* Primary Button */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block font-mono">
                      &lt;Button variant=&quot;default&quot;&gt;
                    </span>
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        backgroundColor: previewTheme.primary,
                        color: previewTheme.foreground,
                      }}
                    >
                      <Save className="w-3.5 h-3.5" /> Primary Action Button
                    </button>
                  </div>

                  {/* Secondary Button */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block font-mono">
                      &lt;Button variant=&quot;secondary&quot;&gt;
                    </span>
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer border"
                      style={{
                        backgroundColor: previewTheme.secondary,
                        color: previewTheme.secondaryForeground,
                        borderColor: previewTheme.border,
                      }}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Secondary Action Button
                    </button>
                  </div>

                  {/* Outline Button */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block font-mono">
                      &lt;Button variant=&quot;outline&quot;&gt;
                    </span>
                    <button
                      type="button"
                      className="w-full py-2 px-4 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Cancel / Back
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign-in Portal Card Preview */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Sign-In Portal Card Preview
                </span>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-center">
                  <div className="flex justify-center">
                    {currentOrg.logo ? (
                      <img
                        src={currentOrg.logo}
                        alt="Logo"
                        className="w-12 h-12 rounded-xl object-contain border border-slate-100 p-1 shadow-2xs"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-2xs"
                        style={{
                          backgroundColor: previewTheme.light,
                          color: previewTheme.primary,
                          border: `1.5px solid ${previewTheme.border}`,
                        }}
                      >
                        {currentOrg.name?.substring(0, 2).toUpperCase() || "SC"}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {currentOrg.name || "School Portal"}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Sign in to your account
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      className="w-full py-2.5 px-3 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: previewTheme.primary,
                        color: previewTheme.foreground,
                      }}
                    >
                      Sign In to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="pt-1 text-[10px] text-slate-400">
                    Protected school tenant
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 border-t border-slate-100 py-4 px-6 rounded-b-xl">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetDefault}
            disabled={isUpdatingColor || !isPrivileged}
            className="text-slate-600 hover:text-slate-900 w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset to Default Blue
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSaveColor}
            disabled={isUpdatingColor || !isPrivileged}
            className="w-full sm:w-auto font-bold shadow-2xs cursor-pointer"
            style={{
              backgroundColor: previewTheme.primary,
              color: previewTheme.foreground,
            }}
          >
            {isUpdatingColor ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Theme Colors
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

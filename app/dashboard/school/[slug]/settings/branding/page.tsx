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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Save,
  Loader2,
  ExternalLink,
  ChevronLeft,
  School,
  ArrowRight,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  FileText,
  LayoutDashboard,
  LogIn,
  Undo2,
} from "lucide-react";
import {
  deriveTheme,
  isValidHexColor,
  normalizeHex,
  DEFAULT_HANOLED_PRIMARY,
} from "@/lib/theme-colors";

interface DualPreset {
  name: string;
  category: string;
  primary: string;
  secondary: string;
}

const DUAL_PRESETS: DualPreset[] = [
  { name: "Royal Blue & Gold", category: "Collegiate", primary: "#1E40AF", secondary: "#F59E0B" },
  { name: "Deep Navy & Crimson", category: "Classic", primary: "#0F172A", secondary: "#B91C1C" },
  { name: "Emerald & Amber", category: "Academy", primary: "#047857", secondary: "#D97706" },
  { name: "Burgundy & Canary", category: "Heritage", primary: "#831843", secondary: "#EAB308" },
  { name: "Ocean Teal & Tangerine", category: "Modern", primary: "#0F766E", secondary: "#EA580C" },
  { name: "Royal Purple & Gold", category: "Excellence", primary: "#581C87", secondary: "#EAB308" },
  { name: "Cardinal & Slate", category: "Traditional", primary: "#B91C1C", secondary: "#475569" },
  { name: "Forest Green & Gold", category: "Grammar", primary: "#065F46", secondary: "#F59E0B" },
  { name: "Hanoled Classic", category: "Platform", primary: "#1447E6", secondary: "#3B82F6" },
  { name: "Minimal Slate", category: "Neutral", primary: "#1E293B", secondary: "#64748B" },
];

export default function SchoolBrandingPage() {
  const { currentOrg, fetchOrgs, updateCurrentOrg } = useOrganization();
  const { isPrivileged } = usePermissions();

  const savedPrimary = currentOrg?.primaryColor || DEFAULT_HANOLED_PRIMARY;
  const savedSecondary = currentOrg?.secondaryColor || null;

  const [primaryColor, setPrimaryColor] = useState<string>(savedPrimary);
  const [secondaryColor, setSecondaryColor] = useState<string>(savedSecondary || "#F59E0B");
  const [useCustomSecondary, setUseCustomSecondary] = useState<boolean>(Boolean(savedSecondary));
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"buttons" | "portal" | "report" | "dashboard">("buttons");

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

  // Evaluate whether current state differs from saved server values
  const isDirty = useMemo(() => {
    const normCurrPrimary = isValidHexColor(primaryColor) ? normalizeHex(primaryColor) : primaryColor;
    const normSavedPrimary = normalizeHex(savedPrimary);
    if (normCurrPrimary !== normSavedPrimary) return true;

    if (useCustomSecondary) {
      const normCurrSec = isValidHexColor(secondaryColor) ? normalizeHex(secondaryColor) : secondaryColor;
      const normSavedSec = savedSecondary ? normalizeHex(savedSecondary) : null;
      return normCurrSec !== normSavedSec;
    }
    return savedSecondary !== null;
  }, [primaryColor, secondaryColor, useCustomSecondary, savedPrimary, savedSecondary]);

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

  function handleRevertToSaved() {
    setPrimaryColor(savedPrimary);
    if (savedSecondary) {
      setSecondaryColor(savedSecondary);
      setUseCustomSecondary(true);
    } else {
      setSecondaryColor("#F59E0B");
      setUseCustomSecondary(false);
    }
    toast.info("Reverted to currently active school branding");
  }

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

      // Update local store so SchoolThemeProvider immediately reflects new colors
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

  const publicPortalUrl = `/signin?school=${currentOrg.slug}`;

  return (
    <div className="space-y-6 max-w-4xl pb-24 sm:pb-16">
      {/* Navigation header & context */}
      <header className="flex flex-col gap-2.5">
        <nav aria-label="Breadcrumb">
          <Link
            href={`/dashboard/school/${currentOrg.slug}/settings`}
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" aria-hidden="true" /> Back to Settings
          </Link>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-full shadow-xs inline-block shrink-0 ring-1 ring-black/10"
                  style={{ backgroundColor: previewTheme.primary }}
                  aria-hidden="true"
                />
                School Branding Studio
              </h2>

              {isDirty && (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Configure {currentOrg.name}&apos;s official button and accent identity. Changes reflect across sign-in portals, navigation tabs, student report cards, and parent emails.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={publicPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors w-fit shadow-xs focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              Live Sign-In Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Settings Card */}
      <Card className="shadow-xs border-border bg-card">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Palette className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-card-foreground">
                Institutional Color Palette
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Select an institutional color preset or input custom hex values verified against WCAG AA standards.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
          {/* Section 1: Curated School Presets */}
          <section aria-labelledby="presets-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 id="presets-heading" className="text-xs font-bold text-foreground uppercase tracking-wider">
                Institutional Color Pairings
              </h3>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Click any preset to apply primary and secondary pairs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {DUAL_PRESETS.map((preset) => {
                const isSelected =
                  primaryColor.toUpperCase() === preset.primary.toUpperCase() &&
                  useCustomSecondary &&
                  secondaryColor.toUpperCase() === preset.secondary.toUpperCase();

                return (
                  <button
                    key={preset.name}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                      setUseCustomSecondary(true);
                    }}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span
                          className="w-5 h-5 rounded-full shrink-0 shadow-xs ring-1 ring-white"
                          style={{ backgroundColor: preset.primary }}
                          aria-hidden="true"
                        />
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs ring-1 ring-white -ml-2"
                          style={{ backgroundColor: preset.secondary }}
                          aria-hidden="true"
                        />
                      </div>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {preset.category}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-foreground truncate mt-0.5">
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 2: Primary & Secondary Custom Pickers */}
          <section aria-labelledby="custom-colors-heading" className="space-y-6 pt-6 border-t border-border/60">
            <h3 id="custom-colors-heading" className="text-xs font-bold text-foreground uppercase tracking-wider">
              Exact Hex Codes &amp; Contrast Validation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Color Card */}
              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="primary-color-input" className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Primary Button &amp; Brand Color
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Applied to primary action buttons, active navigation states, and crests.
                    </p>
                  </div>

                  {/* WCAG Compliance Badge */}
                  <div className="shrink-0">
                    {previewTheme.contrast.isAccessibleOnWhite ? (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        AA ({previewTheme.contrast.ratio.toFixed(1)}:1)
                      </Badge>
                    ) : previewTheme.contrast.isAccessibleLargeOnWhite ? (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 text-[11px] font-semibold">
                        <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        AA Large ({previewTheme.contrast.ratio.toFixed(1)}:1)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 gap-1 text-[11px] font-semibold">
                        <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                        Low ({previewTheme.contrast.ratio.toFixed(1)}:1)
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      id="primary-color-picker"
                      type="color"
                      aria-label="Pick primary color via color wheel"
                      value={isValidHexColor(primaryColor) ? normalizeHex(primaryColor) : "#1447E6"}
                      onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                      className="h-10 w-12 rounded-lg cursor-pointer border border-border p-0.5 bg-background shadow-xs"
                    />
                  </div>

                  <div className="flex-1 max-w-[160px]">
                    <Input
                      id="primary-color-input"
                      type="text"
                      aria-label="Primary color hex value"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1E40AF"
                      maxLength={7}
                      className="font-mono uppercase tracking-wider text-xs font-semibold h-10"
                    />
                  </div>

                  <div
                    className="px-3 py-2 rounded-lg text-xs font-bold shadow-xs shrink-0 flex items-center gap-1.5 transition-colors"
                    style={{
                      backgroundColor: previewTheme.primary,
                      color: previewTheme.foreground,
                    }}
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Preview
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Foreground text automatically switches to <strong>{previewTheme.contrast.recommendedForeground === "#FFFFFF" ? "White" : "Dark Ink"}</strong> for optimal legibility ({previewTheme.contrast.foregroundRatio.toFixed(1)}:1).
                </p>
              </div>

              {/* Secondary Color Card */}
              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="secondary-color-input" className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Secondary Accent Color
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Applied to secondary action buttons, status pills, and report ribbons.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={useCustomSecondary}
                    onClick={() => setUseCustomSecondary(!useCustomSecondary)}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-ring ${
                      useCustomSecondary
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {useCustomSecondary ? "Custom Active" : "Auto-derive (8% tint)"}
                  </button>
                </div>

                {useCustomSecondary ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          id="secondary-color-picker"
                          type="color"
                          aria-label="Pick secondary color via color wheel"
                          value={isValidHexColor(secondaryColor) ? normalizeHex(secondaryColor) : "#F59E0B"}
                          onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                          className="h-10 w-12 rounded-lg cursor-pointer border border-border p-0.5 bg-background shadow-xs"
                        />
                      </div>

                      <div className="flex-1 max-w-[160px]">
                        <Input
                          id="secondary-color-input"
                          type="text"
                          aria-label="Secondary color hex value"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          placeholder="#F59E0B"
                          maxLength={7}
                          className="font-mono uppercase tracking-wider text-xs font-semibold h-10"
                        />
                      </div>

                      <div
                        className="px-3 py-2 rounded-lg text-xs font-bold shadow-xs shrink-0 flex items-center gap-1.5 transition-colors border"
                        style={{
                          backgroundColor: previewTheme.secondary,
                          color: previewTheme.secondaryForeground,
                          borderColor: previewTheme.border,
                        }}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        Preview
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Custom accent active</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        Ratio: {previewTheme.secondaryContrast.ratio.toFixed(1)}:1
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/80 bg-background/80 p-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Automatically derived from primary:</span>
                    <span
                      className="px-2.5 py-1 rounded-md font-bold text-xs shadow-xs border"
                      style={{
                        backgroundColor: previewTheme.secondary,
                        color: previewTheme.secondaryForeground,
                        borderColor: previewTheme.border,
                      }}
                    >
                      Adaptive Tint
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  Secondary buttons use high-contrast foreground text ({previewTheme.secondaryContrast.foregroundRatio.toFixed(1)}:1).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Live Component & Surface Previews */}
          <section aria-labelledby="preview-heading" className="space-y-4 pt-6 border-t border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 id="preview-heading" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  Live Multichannel Preview Studio
                </h3>
                <p className="text-xs text-muted-foreground">
                  Preview how your selected palette renders across dashboard buttons, login portals, and student report cards.
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div role="tablist" aria-label="Preview surface selector" className="inline-flex p-1 rounded-lg border border-border bg-muted/40 gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activePreviewTab === "buttons"}
                  onClick={() => setActivePreviewTab("buttons")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activePreviewTab === "buttons"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" aria-hidden="true" /> Buttons
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activePreviewTab === "portal"}
                  onClick={() => setActivePreviewTab("portal")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activePreviewTab === "portal"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LogIn className="w-3 h-3" aria-hidden="true" /> Sign-In Portal
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activePreviewTab === "report"}
                  onClick={() => setActivePreviewTab("report")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activePreviewTab === "report"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3 h-3" aria-hidden="true" /> Report Cards
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activePreviewTab === "dashboard"}
                  onClick={() => setActivePreviewTab("dashboard")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activePreviewTab === "dashboard"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutDashboard className="w-3 h-3" aria-hidden="true" /> Navigation
                </button>
              </div>
            </div>

            {/* Surface Preview Views */}
            <div className="rounded-xl border border-border bg-muted/15 p-5">
              {/* Tab 1: Buttons Showcase */}
              {activePreviewTab === "buttons" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-hidden="true">
                  <div className="rounded-lg border border-border bg-card p-4 space-y-2 shadow-xs pointer-events-none">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Primary Action Button
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="w-full py-2.5 px-3 rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: previewTheme.primary,
                        color: previewTheme.foreground,
                      }}
                    >
                      <Save className="w-3.5 h-3.5" /> Save Record
                    </button>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Used for key workflows, approval triggers, and publishing results.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 space-y-2 shadow-xs pointer-events-none">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Secondary Accent Button
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="w-full py-2.5 px-3 rounded-lg text-xs font-bold shadow-xs border flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: previewTheme.secondary,
                        color: previewTheme.secondaryForeground,
                        borderColor: previewTheme.border,
                      }}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Configure Filter
                    </button>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Used for secondary controls, export options, and batch actions.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 space-y-2 shadow-xs pointer-events-none">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Badges &amp; Status Tags
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span
                        className="px-2.5 py-1 rounded-md text-xs font-bold shadow-xs"
                        style={{
                          backgroundColor: previewTheme.primary,
                          color: previewTheme.foreground,
                        }}
                      >
                        Enrolled
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-md text-xs font-bold shadow-xs border"
                        style={{
                          backgroundColor: previewTheme.secondary,
                          color: previewTheme.secondaryForeground,
                          borderColor: previewTheme.border,
                        }}
                      >
                        Term 1 Final
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Applied to active student tags, attendance counters, and exam indicators.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Sign-In Portal Card Preview */}
              {activePreviewTab === "portal" && (
                <div className="flex justify-center py-2" aria-hidden="true">
                  <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm text-center space-y-4 pointer-events-none">
                    <div className="flex justify-center">
                      {currentOrg.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={currentOrg.logo}
                          alt="School Logo"
                          className="w-14 h-14 rounded-xl object-contain border border-border p-1 bg-white shadow-xs"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shadow-xs"
                          style={{
                            backgroundColor: previewTheme.light,
                            color: previewTheme.primary,
                            border: `1.5px solid ${previewTheme.border}`,
                          }}
                        >
                          <School className="w-7 h-7" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-foreground">
                        {currentOrg.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Staff &amp; Student Portal Sign In
                      </p>
                    </div>

                    <div className="space-y-2 text-left pt-1">
                      <div className="h-8 rounded-md bg-muted/60 border border-border/60 px-3 flex items-center text-xs text-muted-foreground">
                        staff@school.edu.ng
                      </div>
                      <div className="h-8 rounded-md bg-muted/60 border border-border/60 px-3 flex items-center text-xs text-muted-foreground">
                        ••••••••••••
                      </div>
                    </div>

                    <button
                      type="button"
                      tabIndex={-1}
                      className="w-full py-2.5 px-3 rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: previewTheme.primary,
                        color: previewTheme.foreground,
                      }}
                    >
                      Sign In to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <p className="text-[10px] text-muted-foreground">
                      Powered by Hanoled Suite • Dedicated Tenant
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Report Card Preview */}
              {activePreviewTab === "report" && (
                <div className="rounded-xl border border-border bg-card p-5 space-y-4 pointer-events-none" aria-hidden="true">
                  <div
                    className="p-4 rounded-lg flex items-center justify-between text-white shadow-xs"
                    style={{ backgroundColor: previewTheme.primary }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                        <School className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm tracking-wide text-white">
                          {currentOrg.name.toUpperCase()}
                        </h4>
                        <p className="text-xs text-white/80">
                          Official Terminal Academic Report Card • First Term
                        </p>
                      </div>
                    </div>

                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold border"
                      style={{
                        backgroundColor: previewTheme.secondary,
                        color: previewTheme.secondaryForeground,
                        borderColor: previewTheme.border,
                      }}
                    >
                      GRADE: EXCELLENT
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="border border-border rounded-lg p-2.5 space-y-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Subject Total</span>
                      <span className="text-sm font-bold text-foreground">12 Subjects</span>
                    </div>
                    <div className="border border-border rounded-lg p-2.5 space-y-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Class Position</span>
                      <span className="text-sm font-bold text-foreground">1st of 38</span>
                    </div>
                    <div className="border border-border rounded-lg p-2.5 space-y-0.5">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold block">Status</span>
                      <span className="text-sm font-bold text-emerald-600">Promoted</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Dashboard Navigation Preview */}
              {activePreviewTab === "dashboard" && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 pointer-events-none" aria-hidden="true">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Sidebar Navigation Active State
                  </span>
                  <div className="w-64 space-y-1.5">
                    <div
                      className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                      style={{
                        backgroundColor: previewTheme.primary,
                        color: previewTheme.foreground,
                      }}
                    >
                      <LayoutDashboard className="w-4 h-4" /> Academic Overview
                    </div>
                    <div className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground flex items-center gap-2 bg-muted/40">
                      <FileText className="w-4 h-4" /> Student Result Records
                    </div>
                    <div className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground flex items-center gap-2 bg-muted/40">
                      <School className="w-4 h-4" /> Classroom Attendance
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </CardContent>

        {/* Desktop Card Footer Actions */}
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 bg-muted/30 py-4 px-6 rounded-b-xl">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetDefault}
              disabled={isUpdatingColor || !isPrivileged}
              className="text-muted-foreground hover:text-foreground w-full sm:w-auto text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Reset Factory Blue
            </Button>

            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRevertToSaved}
                disabled={isUpdatingColor}
                className="text-muted-foreground hover:text-foreground w-full sm:w-auto text-xs"
              >
                <Undo2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Revert Changes
              </Button>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onSaveColor}
            disabled={isUpdatingColor || !isPrivileged || !isDirty}
            className="w-full sm:w-auto font-bold shadow-xs cursor-pointer text-xs"
            style={{
              backgroundColor: previewTheme.primary,
              color: previewTheme.foreground,
            }}
          >
            {isUpdatingColor ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            Save School Branding
          </Button>
        </CardFooter>
      </Card>

      {/* Mobile Sticky Thumb Action Bar */}
      {isDirty && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border p-3 z-30 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRevertToSaved}
            disabled={isUpdatingColor}
            className="text-xs text-muted-foreground"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Revert
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSaveColor}
            disabled={isUpdatingColor || !isPrivileged}
            className="flex-1 font-bold shadow-xs text-xs"
            style={{
              backgroundColor: previewTheme.primary,
              color: previewTheme.foreground,
            }}
          >
            {isUpdatingColor ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            )}
            Save Theme Colors
          </Button>
        </div>
      )}
    </div>
  );
}

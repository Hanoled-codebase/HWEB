"use client";

import React, { useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  deriveTheme,
  generateTenantCssVariables,
  generateTenantStyleBlock,
} from "@/lib/theme-colors";

interface SchoolThemeProviderProps {
  children: React.ReactNode;
  fallbackPrimary?: string | null;
  fallbackSecondary?: string | null;
}

export function SchoolThemeProvider({
  children,
  fallbackPrimary,
  fallbackSecondary,
}: SchoolThemeProviderProps) {
  const { currentOrg } = useOrganization();

  const primary = currentOrg?.primaryColor ?? fallbackPrimary ?? null;
  const secondary = currentOrg?.secondaryColor ?? fallbackSecondary ?? null;

  const theme = useMemo(() => {
    return deriveTheme(primary, secondary);
  }, [primary, secondary]);

  const cssVars = useMemo(() => {
    return generateTenantCssVariables(theme);
  }, [theme]);

  // Dynamically inject into document.head so that portals (modals, dropdowns,
  // dialogs, tooltips rendered to document.body) also inherit the school's colors.
  useEffect(() => {
    const styleId = "school-tenant-theme-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = generateTenantStyleBlock(":root, [data-school-theme]", theme);

    return () => {
      const el = document.getElementById(styleId);
      if (el) {
        el.remove();
      }
    };
  }, [theme]);

  return (
    <div
      data-school-theme
      className="contents"
      style={cssVars as unknown as React.CSSProperties}
    >
      {children}
    </div>
  );
}

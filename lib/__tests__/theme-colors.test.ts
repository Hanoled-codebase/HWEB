import { describe, it, expect } from "vitest";
import {
  isValidHexColor,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  getRelativeLuminance,
  getContrastRatio,
  evaluateContrast,
  deriveTheme,
  generateTenantCssVariables,
  generateTenantStyleBlock,
  DEFAULT_HANOLED_PRIMARY,
  PURE_WHITE,
  DEFAULT_INK,
} from "../theme-colors";

describe("theme-colors", () => {
  describe("isValidHexColor", () => {
    it("accepts valid 6-character hex colors", () => {
      expect(isValidHexColor("#1447E6")).toBe(true);
      expect(isValidHexColor("#ffffff")).toBe(true);
      expect(isValidHexColor("#000000")).toBe(true);
      expect(isValidHexColor("  #1447e6  ")).toBe(true);
    });

    it("accepts valid 3-character hex colors", () => {
      expect(isValidHexColor("#FFF")).toBe(true);
      expect(isValidHexColor("#14e")).toBe(true);
      expect(isValidHexColor("#000")).toBe(true);
    });

    it("rejects invalid inputs", () => {
      expect(isValidHexColor("")).toBe(false);
      expect(isValidHexColor(null)).toBe(false);
      expect(isValidHexColor(undefined)).toBe(false);
      expect(isValidHexColor("blue")).toBe(false);
      expect(isValidHexColor("#12345")).toBe(false);
      expect(isValidHexColor("#1234567")).toBe(false);
      expect(isValidHexColor("#GGG")).toBe(false);
    });
  });

  describe("normalizeHex", () => {
    it("expands 3-digit hex to 6-digit uppercase", () => {
      expect(normalizeHex("#fff")).toBe("#FFFFFF");
      expect(normalizeHex("#123")).toBe("#112233");
      expect(normalizeHex("abc")).toBe("#AABBCC");
    });

    it("normalizes 6-digit hex to uppercase with #", () => {
      expect(normalizeHex("1447e6")).toBe("#1447E6");
      expect(normalizeHex("#1447e6")).toBe("#1447E6");
    });
  });

  describe("hexToRgb & rgbToHex", () => {
    it("converts hex to RGB correctly", () => {
      expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb("#1447E6")).toEqual({ r: 20, g: 71, b: 230 });
    });

    it("converts RGB back to hex accurately", () => {
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#FFFFFF");
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
      expect(rgbToHex({ r: 20, g: 71, b: 230 })).toBe("#1447E6");
    });
  });

  describe("WCAG 2.1 Contrast and Luminance", () => {
    it("calculates relative luminance according to CIE standards", () => {
      expect(getRelativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1.0, 4);
      expect(getRelativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0.0, 4);
    });

    it("computes 21:1 contrast between pure black and pure white", () => {
      const ratio = getContrastRatio("#000000", "#FFFFFF");
      expect(ratio).toBe(21);
    });

    it("computes 1:1 contrast for identical colors", () => {
      const ratio = getContrastRatio("#1447E6", "#1447E6");
      expect(ratio).toBe(1);
    });

    it("chooses white text on dark primary colors and dark text on yellow/bright colors", () => {
      // Dark primary like deep blue / green
      const darkBlue = evaluateContrast("#1447E6");
      expect(darkBlue.recommendedForeground).toBe(PURE_WHITE);
      expect(darkBlue.foregroundRatio).toBeGreaterThanOrEqual(4.5);

      // Bright yellow primary
      const yellow = evaluateContrast("#F5A623");
      expect(yellow.recommendedForeground).toBe(DEFAULT_INK);
      expect(yellow.foregroundRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("deriveTheme", () => {
    it("falls back to default Hanoled blue when primaryColor is null or invalid", () => {
      const themeNull = deriveTheme(null);
      expect(themeNull.isCustom).toBe(false);
      expect(themeNull.primary).toBe(DEFAULT_HANOLED_PRIMARY);

      const themeInvalid = deriveTheme("not-a-color");
      expect(themeInvalid.isCustom).toBe(false);
      expect(themeInvalid.primary).toBe(DEFAULT_HANOLED_PRIMARY);
    });

    it("derives all necessary UI states for custom school colors including secondary", () => {
      const customTheme = deriveTheme("#065F46", "#F59E0B"); // Emerald 800 + Amber
      expect(customTheme.isCustom).toBe(true);
      expect(customTheme.primary).toBe("#065F46");
      expect(customTheme.secondary).toBe("#F59E0B");
      expect(customTheme.hover).toBeDefined();
      expect(customTheme.active).toBeDefined();
      expect(customTheme.light).toBeDefined();
      expect(customTheme.border).toBeDefined();
      expect(customTheme.foreground).toBe(PURE_WHITE);
      expect(customTheme.secondaryForeground).toBeDefined();

      const mediumTheme = deriveTheme("#059669"); // Emerald 600 (auto secondary)
      expect(mediumTheme.foreground).toBe(DEFAULT_INK);
      expect(mediumTheme.secondary).toBeDefined();
      expect(mediumTheme.secondaryForeground).toBe("#059669");
      expect(getContrastRatio(mediumTheme.primaryText, PURE_WHITE)).toBeGreaterThanOrEqual(4.5);

      // Light yellow primary still gets a WCAG AA legible primaryText on white surfaces
      const lightYellowTheme = deriveTheme("#EAB308");
      expect(getContrastRatio(lightYellowTheme.primaryText, PURE_WHITE)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("CSS generation", () => {
    it("generates valid CSS variables mapping", () => {
      const theme = deriveTheme("#1447E6", "#F59E0B");
      const vars = generateTenantCssVariables(theme);
      expect(vars["--primary"]).toBe("#1447E6");
      expect(vars["--primary-foreground"]).toBe(PURE_WHITE);
      expect(vars["--primary-text"]).toBe("#1447E6");
      expect(vars["--secondary"]).toBe("#F59E0B");
      expect(vars["--ring"]).toBe("#1447E6");
      expect(vars["--color-blue-600"]).toBe("#1447E6");
      expect(vars["--color-primary"]).toBe("#1447E6");
      expect(vars["--color-secondary"]).toBe("#F59E0B");
    });

    it("generates valid CSS style block", () => {
      const theme = deriveTheme("#1447E6");
      const block = generateTenantStyleBlock(":root", theme);
      expect(block).toContain(":root {");
      expect(block).toContain("--primary: #1447E6 !important;");
      expect(block).toContain("--primary-foreground: #FFFFFF !important;");
    });
  });
});

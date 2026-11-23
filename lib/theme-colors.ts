/**
 * Theme color derivation and WCAG 2.1 accessibility math.
 * 
 * Programmatically derives hover, active, light background tint, border,
 * and high-contrast foreground text from a single school primary hex color.
 */

export const DEFAULT_HANOLED_PRIMARY = "#1447E6";
export const DEFAULT_INK = "#0B1220";
export const PURE_WHITE = "#FFFFFF";

export interface ContrastDetails {
  ratio: number;
  isAccessibleOnWhite: boolean; // >= 4.5:1 (normal text)
  isAccessibleLargeOnWhite: boolean; // >= 3:1 (large text / buttons)
  recommendedForeground: typeof PURE_WHITE | typeof DEFAULT_INK;
  foregroundRatio: number; // Contrast of primary against its recommended foreground
}

export interface DerivedTheme {
  isCustom: boolean;
  primary: string;
  foreground: string;
  primaryText: string;
  hover: string;
  active: string;
  light: string;
  border: string;
  ring: string;
  contrast: ContrastDetails;
  secondary: string;
  secondaryForeground: string;
  secondaryHover: string;
  secondaryLight: string;
  secondaryContrast: ContrastDetails;
}

/**
 * Validates whether a string is a 3-digit or 6-digit hex color.
 */
export function isValidHexColor(hex: unknown): hex is string {
  if (typeof hex !== "string") return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

/**
 * Expands 3-digit hex (#FFF) to 6-digit (#FFFFFF) and capitalizes.
 */
export function normalizeHex(hex: string): string {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    const [r, g, b] = clean;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return `#${clean.toUpperCase()}`;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses a hex string to RGB components (0-255).
 */
export function hexToRgb(hex: string): RGB {
  const norm = normalizeHex(hex).slice(1);
  const num = parseInt(norm, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts RGB components back to 6-character hex.
 */
export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Linearizes an 8-bit sRGB channel to CIE XYZ luminance space.
 */
function linearize(channel8Bit: number): number {
  const v = channel8Bit / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Calculates WCAG 2.1 relative luminance (0 to 1).
 */
export function getRelativeLuminance(rgb: RGB): number {
  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes the contrast ratio between two hex colors (1:1 to 21:1).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hexToRgb(hex1));
  const l2 = getRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Blends a source color with a background color by a given alpha (0 to 1).
 */
export function blendRgb(source: RGB, background: RGB, alpha: number): RGB {
  const a = Math.min(1, Math.max(0, alpha));
  return {
    r: Math.round(source.r * a + background.r * (1 - a)),
    g: Math.round(source.g * a + background.g * (1 - a)),
    b: Math.round(source.b * a + background.b * (1 - a)),
  };
}

/**
 * Checks contrast against white/dark and evaluates WCAG AA compliance.
 */
export function evaluateContrast(hex: string): ContrastDetails {
  const ratioOnWhite = getContrastRatio(hex, PURE_WHITE);
  const ratioWithWhite = getContrastRatio(hex, PURE_WHITE);
  const ratioWithInk = getContrastRatio(hex, DEFAULT_INK);

  // Pick foreground text color that gives maximum readability
  const recommendedForeground = ratioWithWhite >= ratioWithInk ? PURE_WHITE : DEFAULT_INK;
  const foregroundRatio = Math.max(ratioWithWhite, ratioWithInk);

  return {
    ratio: ratioOnWhite,
    isAccessibleOnWhite: ratioOnWhite >= 4.5,
    isAccessibleLargeOnWhite: ratioOnWhite >= 3.0,
    recommendedForeground,
    foregroundRatio,
  };
}

/**
 * Derives programmatic theme colors from a primary school color and optional secondary color.
 */
export function deriveTheme(
  primaryColor?: string | null,
  secondaryColor?: string | null
): DerivedTheme {
  const isCustomPrimary = isValidHexColor(primaryColor);
  const primary = isCustomPrimary ? normalizeHex(primaryColor) : DEFAULT_HANOLED_PRIMARY;
  const rgb = hexToRgb(primary);
  const contrast = evaluateContrast(primary);
  const inkRgb = hexToRgb(DEFAULT_INK);
  let primaryText = primary;
  for (let keep = 0.9; keep >= 0.15 && getContrastRatio(primaryText, PURE_WHITE) < 4.5; keep -= 0.1) {
    primaryText = rgbToHex(blendRgb(rgb, inkRgb, keep));
  }
  if (getContrastRatio(primaryText, PURE_WHITE) < 4.5) {
    primaryText = DEFAULT_INK;
  }

  // Hover: 14% darker for bright/medium colors, slightly lighter if extremely dark
  const isVeryDark = getRelativeLuminance(rgb) < 0.04;
  const hoverRgb = isVeryDark
    ? blendRgb(rgb, { r: 255, g: 255, b: 255 }, 0.85)
    : blendRgb(rgb, { r: 0, g: 0, b: 0 }, 0.86);

  // Active: 22% darker (or lighter if very dark)
  const activeRgb = isVeryDark
    ? blendRgb(rgb, { r: 255, g: 255, b: 255 }, 0.75)
    : blendRgb(rgb, { r: 0, g: 0, b: 0 }, 0.78);

  // Subtle background tint: 8% primary on pure white background
  const lightRgb = blendRgb(rgb, { r: 255, g: 255, b: 255 }, 0.08);

  // Border: 22% primary on white background
  const borderRgb = blendRgb(rgb, { r: 255, g: 255, b: 255 }, 0.22);

  const isCustomSecondary = isValidHexColor(secondaryColor);
  let secondary: string;
  let secondaryForeground: string;
  let secondaryHover: string;
  let secondaryLight: string;
  let secondaryContrast: ContrastDetails;

  if (isCustomSecondary) {
    secondary = normalizeHex(secondaryColor!);
    secondaryContrast = evaluateContrast(secondary);
    secondaryForeground = secondaryContrast.recommendedForeground;
    const secRgb = hexToRgb(secondary);
    const secVeryDark = getRelativeLuminance(secRgb) < 0.04;
    const secHoverRgb = secVeryDark
      ? blendRgb(secRgb, { r: 255, g: 255, b: 255 }, 0.85)
      : blendRgb(secRgb, { r: 0, g: 0, b: 0 }, 0.86);
    secondaryHover = rgbToHex(secHoverRgb);
    secondaryLight = rgbToHex(blendRgb(secRgb, { r: 255, g: 255, b: 255 }, 0.12));
  } else {
    // Elegant default secondary: subtle tint background with primary foreground
    secondary = rgbToHex(lightRgb);
    secondaryForeground = primary;
    secondaryHover = rgbToHex(borderRgb);
    secondaryLight = rgbToHex(lightRgb);
    secondaryContrast = evaluateContrast(secondary);
  }

  return {
    isCustom: isCustomPrimary || isCustomSecondary,
    primary,
    foreground: contrast.recommendedForeground,
    primaryText,
    hover: rgbToHex(hoverRgb),
    active: rgbToHex(activeRgb),
    light: rgbToHex(lightRgb),
    border: rgbToHex(borderRgb),
    ring: primary,
    contrast,
    secondary,
    secondaryForeground,
    secondaryHover,
    secondaryLight,
    secondaryContrast,
  };
}

/**
 * Generates an inline CSS custom-property style block for the tenant container.
 * This overrides Tailwind tokens server-side with zero flash of unstyled theme.
 */
export function generateTenantCssVariables(theme: DerivedTheme): Record<string, string> {
  return {
    "--primary": theme.primary,
    "--primary-foreground": theme.foreground,
    "--primary-text": theme.primaryText,
    "--primary-hover": theme.hover,
    "--primary-active": theme.active,
    "--primary-light": theme.light,
    "--primary-border": theme.border,
    "--secondary": theme.secondary,
    "--secondary-foreground": theme.secondaryForeground,
    "--secondary-hover": theme.secondaryHover,
    "--accent": theme.secondaryLight,
    "--accent-foreground": theme.primary,
    "--ring": theme.ring,
    "--sidebar-primary": theme.primary,
    "--sidebar-primary-foreground": theme.foreground,
    "--sidebar-ring": theme.ring,
    "--color-primary": theme.primary,
    "--color-primary-foreground": theme.foreground,
    "--color-secondary": theme.secondary,
    "--color-secondary-foreground": theme.secondaryForeground,
    "--color-accent": theme.secondaryLight,
    "--color-accent-foreground": theme.primary,
    "--color-ring": theme.ring,
    "--color-blue-50": theme.light,
    "--color-blue-100": theme.border,
    "--color-blue-200": theme.border,
    "--color-blue-500": theme.primary,
    "--color-blue-600": theme.primary,
    "--color-blue-700": theme.hover,
    "--color-blue-800": theme.active,
    "--color-blue-900": theme.active,
  };
}

/**
 * Returns raw CSS rules to inject inside a <style> tag for SSR or runtime injection.
 */
export function generateTenantStyleBlock(selector: string, theme: DerivedTheme): string {
  const vars = generateTenantCssVariables(theme);
  const rules = Object.entries(vars)
    .map(([key, val]) => `${key}: ${val} !important;`)
    .join(" ");
  return `${selector} { ${rules} }`;
}

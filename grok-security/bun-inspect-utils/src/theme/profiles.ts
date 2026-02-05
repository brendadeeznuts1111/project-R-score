/**
 * [THEME][PROFILES][META:{VERSION:1.0.0}][#REF:theme-system,presets]{BUN-NATIVE}
 * Predefined theme profiles for the Lightning Network dashboard
 * Based on infrastructure/theme-aware-guide.md specifications
 */

import type { ThemeProfile } from "./types";

/**
 * Dark Professional theme - Default theme
 */
export const DARK_PRO_THEME: ThemeProfile = {
  id: "dark-pro",
  name: "Dark Professional",
  description: "Professional dark theme optimized for extended use",
  category: "professional",
  tags: ["dark", "professional", "default"],
  colors: {
    primary: "#8B5CF6",
    secondary: "#0EA5E9",
    accent: "#F59E0B",
    background: "#0F172A",
    surface: "#1E293B",
    text: "#F1F5F9",
    error: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#3B82F6",
  },
  typography: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
  },
  borderRadius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
};

/**
 * Light Compliance theme - For regulatory/compliance work
 */
export const LIGHT_COMPLIANCE_THEME: ThemeProfile = {
  id: "light-compliance",
  name: "Light Compliance",
  description: "Light theme optimized for compliance and regulatory work",
  category: "compliance",
  tags: ["light", "compliance", "regulatory"],
  colors: {
    primary: "#2563EB",
    secondary: "#059669",
    accent: "#DC2626",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#1E293B",
    error: "#DC2626",
    warning: "#D97706",
    success: "#059669",
    info: "#2563EB",
  },
  typography: {
    fontFamily: "'Roboto', 'Segoe UI', sans-serif",
    fontSize: 13,
  },
  borderRadius: {
    sm: "2px",
    md: "4px",
    lg: "6px",
    xl: "8px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.05)",
  },
};

/**
 * Terminal Retro theme - Classic terminal aesthetic
 */
export const TERMINAL_RETRO_THEME: ThemeProfile = {
  id: "terminal-retro",
  name: "Terminal Retro",
  description: "Classic terminal aesthetic with green phosphor colors",
  category: "terminal",
  tags: ["terminal", "retro", "monospace", "hacker"],
  colors: {
    primary: "#00FF00",
    secondary: "#00CCCC",
    accent: "#FF6600",
    background: "#000000",
    surface: "#111111",
    text: "#00FF00",
    error: "#FF3333",
    warning: "#FF9900",
    success: "#00CC00",
    info: "#0099FF",
  },
  typography: {
    fontFamily: "'Courier New', 'Cascadia Code', monospace",
    fontSize: 13,
  },
  borderRadius: {
    sm: "0px",
    md: "0px",
    lg: "0px",
    xl: "0px",
  },
  shadows: {
    sm: "0 0 2px rgba(0, 255, 0, 0.3)",
    md: "0 0 4px rgba(0, 255, 0, 0.3)",
    lg: "0 0 8px rgba(0, 255, 0, 0.3)",
    xl: "0 0 16px rgba(0, 255, 0, 0.3)",
  },
};

/**
 * Midnight Developer theme - Optimized for coding
 */
export const MIDNIGHT_DEV_THEME: ThemeProfile = {
  id: "midnight-dev",
  name: "Midnight Developer",
  description: "Dark theme optimized for developers with high contrast syntax",
  category: "developer",
  tags: ["dark", "developer", "high-contrast", "syntax"],
  colors: {
    primary: "#60A5FA",
    secondary: "#A78BFA",
    accent: "#FBBF24",
    background: "#030712",
    surface: "#111827",
    text: "#E5E7EB",
    error: "#F87171",
    warning: "#FBBF24",
    success: "#34D399",
    info: "#60A5FA",
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13,
  },
  borderRadius: {
    sm: "2px",
    md: "4px",
    lg: "8px",
    xl: "12px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
};

/**
 * High Contrast theme - Accessibility-focused
 */
export const HIGH_CONTRAST_THEME: ThemeProfile = {
  id: "high-contrast",
  name: "High Contrast",
  description: "High contrast theme for accessibility (WCAG AAA compliant)",
  category: "accessibility",
  tags: ["accessibility", "high-contrast", "wcag", "a11y"],
  colors: {
    primary: "#000000",
    secondary: "#333333",
    accent: "#0000FF",
    background: "#FFFFFF",
    surface: "#F0F0F0",
    text: "#000000",
    error: "#FF0000",
    warning: "#FF9900",
    success: "#008000",
    info: "#0000FF",
  },
  typography: {
    fontFamily: "Arial, sans-serif",
    fontSize: 16,
  },
  borderRadius: {
    sm: "0px",
    md: "2px",
    lg: "4px",
    xl: "6px",
  },
  shadows: {
    sm: "0 0 0 1px #000000",
    md: "0 0 0 2px #000000",
    lg: "0 0 0 3px #000000",
    xl: "0 0 0 4px #000000",
  },
  accessibility: {
    wcagLevel: "AAA",
    colorblindSafe: true,
    reducedMotion: true,
    contrastRatios: {
      "text-on-background": 21,
      "primary-on-surface": 10,
    },
  },
};

/**
 * All predefined themes collection
 */
export const PREDEFINED_THEMES: Record<string, ThemeProfile> = {
  "dark-pro": DARK_PRO_THEME,
  "light-compliance": LIGHT_COMPLIANCE_THEME,
  "terminal-retro": TERMINAL_RETRO_THEME,
  "midnight-dev": MIDNIGHT_DEV_THEME,
  "high-contrast": HIGH_CONTRAST_THEME,
} as const;

/**
 * Default theme ID
 */
export const DEFAULT_THEME_ID = "dark-pro";

/**
 * Get a predefined theme by ID
 */
export function getThemeById(themeId: string): ThemeProfile | undefined {
  return PREDEFINED_THEMES[themeId];
}

/**
 * Get the default theme
 */
export function getDefaultTheme(): ThemeProfile {
  return DARK_PRO_THEME;
}

/**
 * Get all available theme IDs
 */
export function getAvailableThemeIds(): string[] {
  return Object.keys(PREDEFINED_THEMES);
}

/**
 * Get themes by category
 */
export function getThemesByCategory(
  category: ThemeProfile["category"]
): ThemeProfile[] {
  return Object.values(PREDEFINED_THEMES).filter(
    (theme) => theme.category === category
  );
}

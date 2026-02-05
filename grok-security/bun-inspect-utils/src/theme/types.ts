/**
 * [THEME][TYPES][META:{VERSION:1.0.0}][#REF:theme-system,ui]{BUN-NATIVE}
 * Theme system type definitions for the Lightning Network dashboard
 * Based on infrastructure/theme-aware-guide.md specifications
 */

/**
 * Theme category classification
 */
export type ThemeCategory =
  | "professional"
  | "developer"
  | "compliance"
  | "terminal"
  | "accessibility"
  | "custom";

/**
 * Theme color palette
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

/**
 * Typography configuration
 */
export interface ThemeTypography {
  fontFamily: string | ThemeFontFamilies;
  fontSize: number | ThemeFontSizes;
  lineHeight?: number;
  fontWeight?: Record<string, number>;
}

/**
 * Extended font family configuration
 */
export interface ThemeFontFamilies {
  sans: string;
  mono: string;
  ui: string;
}

/**
 * Extended font size configuration
 */
export interface ThemeFontSizes {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
}

/**
 * Spacing configuration
 */
export interface ThemeSpacing {
  unit: number;
  scale: number[];
}

/**
 * Border radius configuration
 */
export interface ThemeBorderRadius {
  none?: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full?: string;
}

/**
 * Shadow configuration
 */
export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

/**
 * Animation configuration
 */
export interface ThemeAnimations {
  duration: Record<string, string>;
  easing: Record<string, string>;
}

/**
 * Component-specific theme overrides
 */
export interface ThemeComponentOverrides {
  Button?: Record<string, Record<string, string>>;
  Card?: Record<string, Record<string, string>>;
  Table?: Record<string, Record<string, string>>;
  Input?: Record<string, Record<string, string>>;
  [key: string]: Record<string, Record<string, string>> | undefined;
}

/**
 * Accessibility configuration
 */
export interface ThemeAccessibility {
  contrastRatios?: Record<string, number>;
  wcagLevel?: "A" | "AA" | "AAA";
  colorblindSafe?: boolean;
  reducedMotion?: boolean;
}

/**
 * Theme author information
 */
export interface ThemeAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * Theme preview information
 */
export interface ThemePreview {
  type: "screenshot" | "video" | "interactive";
  url: string;
  description?: string;
}

/**
 * Font dependency
 */
export interface ThemeFontDependency {
  name: string;
  url: string;
  license?: string;
}

/**
 * Complete theme profile interface
 */
export interface ThemeProfile {
  id: string;
  name: string;
  description?: string;
  author?: string | ThemeAuthor;
  version?: string;
  category: ThemeCategory;
  tags?: string[];
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing?: ThemeSpacing;
  borderRadius?: ThemeBorderRadius;
  shadows?: ThemeShadows;
  animations?: ThemeAnimations;
  components?: ThemeComponentOverrides;
  customCSS?: string;
  accessibility?: ThemeAccessibility;
  previews?: ThemePreview[];
  dependencies?: {
    fonts?: ThemeFontDependency[];
  };
}


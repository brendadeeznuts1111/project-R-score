/**
 * [THEME][INDEX][META:{VERSION:1.0.0}][#REF:theme-system]{BUN-NATIVE}
 * Theme system module exports
 * Based on infrastructure/theme-aware-guide.md specifications
 */

// Type exports
export type {
  ThemeProfile,
  ThemeColors,
  ThemeTypography,
  ThemeFontFamilies,
  ThemeFontSizes,
  ThemeSpacing,
  ThemeBorderRadius,
  ThemeShadows,
  ThemeAnimations,
  ThemeComponentOverrides,
  ThemeAccessibility,
  ThemeAuthor,
  ThemePreview,
  ThemeFontDependency,
  ThemeCategory,
} from "./types";

// Profile exports
export {
  DARK_PRO_THEME,
  LIGHT_COMPLIANCE_THEME,
  TERMINAL_RETRO_THEME,
  MIDNIGHT_DEV_THEME,
  HIGH_CONTRAST_THEME,
  PREDEFINED_THEMES,
  DEFAULT_THEME_ID,
  getThemeById,
  getDefaultTheme,
  getAvailableThemeIds,
  getThemesByCategory,
} from "./profiles";

// Engine exports
export type {
  ThemeEngineState,
  ThemeChangeEvent,
  ThemeEngineConfig,
} from "./engine";

export {
  ThemeEngine,
  createThemeEngine,
  generateCSSVariables,
  generateStyleObject,
} from "./engine";

// Utility exports
export {
  hexToRgb,
  rgbToHex,
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGContrast,
  validateThemeAccessibility,
  mergeThemes,
  cloneTheme,
  exportThemeToJSON,
  importThemeFromJSON,
} from "./utils";


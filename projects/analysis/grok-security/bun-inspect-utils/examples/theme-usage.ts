/**
 * [EXAMPLE][THEME][USAGE]{BUN-NATIVE}
 * Theme system usage examples
 */

import {
  // Theme Engine
  createThemeEngine,
  ThemeEngine,
  // Predefined themes
  DARK_PRO_THEME,
  LIGHT_COMPLIANCE_THEME,
  TERMINAL_RETRO_THEME,
  MIDNIGHT_DEV_THEME,
  HIGH_CONTRAST_THEME,
  // Theme functions
  getThemeById,
  getDefaultTheme,
  getAvailableThemeIds,
  getThemesByCategory,
  // CSS generation
  generateCSSVariables,
  generateStyleObject,
  // Utilities
  hexToRgb,
  rgbToHex,
  getContrastRatio,
  meetsWCAGContrast,
  validateThemeAccessibility,
  mergeThemes,
  cloneTheme,
  exportThemeToJSON,
  importThemeFromJSON,
  // Types
  type ThemeProfile,
} from "../src/index";

console.info("=== THEME SYSTEM EXAMPLES ===\n");

// ============================================================================
// 1. BASIC THEME ENGINE USAGE
// ============================================================================

console.info("--- 1. Basic Theme Engine ---\n");

const engine = createThemeEngine();
console.info("Current theme:", engine.getCurrentTheme().name);
console.info("Available themes:", getAvailableThemeIds().join(", "));

// Change theme
engine.setTheme("midnight-dev");
console.info("Changed to:", engine.getCurrentTheme().name);
console.info("Previous theme:", engine.getPreviousTheme()?.name);

// ============================================================================
// 2. THEME SUBSCRIPTIONS
// ============================================================================

console.info("\n--- 2. Theme Subscriptions ---\n");

const unsubscribe = engine.subscribe((event) => {
  console.info(`Theme changed: ${event.previousTheme?.name} → ${event.newTheme.name}`);
});

engine.setTheme("terminal-retro");
engine.setTheme("light-compliance");

unsubscribe(); // Stop listening

// ============================================================================
// 3. CSS GENERATION
// ============================================================================

console.info("\n--- 3. CSS Generation ---\n");

const css = generateCSSVariables(DARK_PRO_THEME);
console.info("CSS Variables (first 300 chars):");
console.info(css.slice(0, 300) + "...\n");

const styles = generateStyleObject(DARK_PRO_THEME);
console.info("Style object keys:", Object.keys(styles).slice(0, 5).join(", "), "...");

// ============================================================================
// 4. ACCESSIBILITY VALIDATION
// ============================================================================

console.info("\n--- 4. Accessibility Validation ---\n");

const validation = validateThemeAccessibility(DARK_PRO_THEME);
console.info("Dark Pro accessibility:");
console.info("  Valid:", validation.isValid);
console.info("  Text on background contrast:", validation.contrastRatios["text-on-background"].toFixed(2));

const highContrastValidation = validateThemeAccessibility(HIGH_CONTRAST_THEME);
console.info("\nHigh Contrast accessibility:");
console.info("  Valid:", highContrastValidation.isValid);
console.info("  Text on background contrast:", highContrastValidation.contrastRatios["text-on-background"].toFixed(2));

// ============================================================================
// 5. CUSTOM THEMES
// ============================================================================

console.info("\n--- 5. Custom Themes ---\n");

// Clone and customize a theme
const myTheme = cloneTheme(DARK_PRO_THEME, "my-custom-theme", "My Custom Theme");
console.info("Cloned theme:", myTheme.name, "(category:", myTheme.category + ")");

// Merge themes
const merged = mergeThemes(DARK_PRO_THEME, {
  colors: { ...DARK_PRO_THEME.colors, primary: "#FF6B6B" },
});
console.info("Merged theme primary color:", merged.colors.primary);

// Register custom theme
engine.registerCustomTheme(myTheme);
engine.setTheme("my-custom-theme");
console.info("Using custom theme:", engine.getCurrentTheme().name);

// ============================================================================
// 6. EXPORT/IMPORT
// ============================================================================

console.info("\n--- 6. Export/Import ---\n");

const json = exportThemeToJSON(TERMINAL_RETRO_THEME);
console.info("Exported JSON length:", json.length, "chars");

const imported = importThemeFromJSON(json);
console.info("Imported theme:", imported.name);

// ============================================================================
// 7. COLOR UTILITIES
// ============================================================================

console.info("\n--- 7. Color Utilities ---\n");

const rgb = hexToRgb("#8B5CF6");
console.info("#8B5CF6 → RGB:", rgb);

const hex = rgbToHex(139, 92, 246);
console.info("RGB(139, 92, 246) → Hex:", hex);

const contrast = getContrastRatio("#FFFFFF", "#000000");
console.info("White on black contrast ratio:", contrast.toFixed(2) + ":1");

const meetsAA = meetsWCAGContrast("#F1F5F9", "#0F172A", "AA");
console.info("Dark Pro text meets WCAG AA:", meetsAA);

// ============================================================================
// 8. THEME CATEGORIES
// ============================================================================

console.info("\n--- 8. Theme Categories ---\n");

const categories = ["professional", "developer", "compliance", "terminal", "accessibility"] as const;
for (const category of categories) {
  const themes = getThemesByCategory(category);
  console.info(`${category}:`, themes.map((t) => t.name).join(", ") || "(none)");
}

// Cleanup
engine.dispose();
console.info("\n=== EXAMPLES COMPLETE ===");


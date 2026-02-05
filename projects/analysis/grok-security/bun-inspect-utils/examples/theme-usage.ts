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

console.log("=== THEME SYSTEM EXAMPLES ===\n");

// ============================================================================
// 1. BASIC THEME ENGINE USAGE
// ============================================================================

console.log("--- 1. Basic Theme Engine ---\n");

const engine = createThemeEngine();
console.log("Current theme:", engine.getCurrentTheme().name);
console.log("Available themes:", getAvailableThemeIds().join(", "));

// Change theme
engine.setTheme("midnight-dev");
console.log("Changed to:", engine.getCurrentTheme().name);
console.log("Previous theme:", engine.getPreviousTheme()?.name);

// ============================================================================
// 2. THEME SUBSCRIPTIONS
// ============================================================================

console.log("\n--- 2. Theme Subscriptions ---\n");

const unsubscribe = engine.subscribe((event) => {
  console.log(`Theme changed: ${event.previousTheme?.name} → ${event.newTheme.name}`);
});

engine.setTheme("terminal-retro");
engine.setTheme("light-compliance");

unsubscribe(); // Stop listening

// ============================================================================
// 3. CSS GENERATION
// ============================================================================

console.log("\n--- 3. CSS Generation ---\n");

const css = generateCSSVariables(DARK_PRO_THEME);
console.log("CSS Variables (first 300 chars):");
console.log(css.slice(0, 300) + "...\n");

const styles = generateStyleObject(DARK_PRO_THEME);
console.log("Style object keys:", Object.keys(styles).slice(0, 5).join(", "), "...");

// ============================================================================
// 4. ACCESSIBILITY VALIDATION
// ============================================================================

console.log("\n--- 4. Accessibility Validation ---\n");

const validation = validateThemeAccessibility(DARK_PRO_THEME);
console.log("Dark Pro accessibility:");
console.log("  Valid:", validation.isValid);
console.log("  Text on background contrast:", validation.contrastRatios["text-on-background"].toFixed(2));

const highContrastValidation = validateThemeAccessibility(HIGH_CONTRAST_THEME);
console.log("\nHigh Contrast accessibility:");
console.log("  Valid:", highContrastValidation.isValid);
console.log("  Text on background contrast:", highContrastValidation.contrastRatios["text-on-background"].toFixed(2));

// ============================================================================
// 5. CUSTOM THEMES
// ============================================================================

console.log("\n--- 5. Custom Themes ---\n");

// Clone and customize a theme
const myTheme = cloneTheme(DARK_PRO_THEME, "my-custom-theme", "My Custom Theme");
console.log("Cloned theme:", myTheme.name, "(category:", myTheme.category + ")");

// Merge themes
const merged = mergeThemes(DARK_PRO_THEME, {
  colors: { ...DARK_PRO_THEME.colors, primary: "#FF6B6B" },
});
console.log("Merged theme primary color:", merged.colors.primary);

// Register custom theme
engine.registerCustomTheme(myTheme);
engine.setTheme("my-custom-theme");
console.log("Using custom theme:", engine.getCurrentTheme().name);

// ============================================================================
// 6. EXPORT/IMPORT
// ============================================================================

console.log("\n--- 6. Export/Import ---\n");

const json = exportThemeToJSON(TERMINAL_RETRO_THEME);
console.log("Exported JSON length:", json.length, "chars");

const imported = importThemeFromJSON(json);
console.log("Imported theme:", imported.name);

// ============================================================================
// 7. COLOR UTILITIES
// ============================================================================

console.log("\n--- 7. Color Utilities ---\n");

const rgb = hexToRgb("#8B5CF6");
console.log("#8B5CF6 → RGB:", rgb);

const hex = rgbToHex(139, 92, 246);
console.log("RGB(139, 92, 246) → Hex:", hex);

const contrast = getContrastRatio("#FFFFFF", "#000000");
console.log("White on black contrast ratio:", contrast.toFixed(2) + ":1");

const meetsAA = meetsWCAGContrast("#F1F5F9", "#0F172A", "AA");
console.log("Dark Pro text meets WCAG AA:", meetsAA);

// ============================================================================
// 8. THEME CATEGORIES
// ============================================================================

console.log("\n--- 8. Theme Categories ---\n");

const categories = ["professional", "developer", "compliance", "terminal", "accessibility"] as const;
for (const category of categories) {
  const themes = getThemesByCategory(category);
  console.log(`${category}:`, themes.map((t) => t.name).join(", ") || "(none)");
}

// Cleanup
engine.dispose();
console.log("\n=== EXAMPLES COMPLETE ===");


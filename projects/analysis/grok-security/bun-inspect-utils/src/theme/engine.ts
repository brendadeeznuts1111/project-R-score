/**
 * [THEME][ENGINE][META:{VERSION:1.0.0}][#REF:theme-system,core]{BUN-NATIVE}
 * Theme engine for applying and managing themes
 * Based on infrastructure/theme-aware-guide.md specifications
 */

import type { ThemeProfile, ThemeColors } from "./types";
import {
  PREDEFINED_THEMES,
  DEFAULT_THEME_ID,
  getDefaultTheme,
} from "./profiles";

/**
 * Theme engine state
 */
export interface ThemeEngineState {
  currentTheme: ThemeProfile;
  previousTheme: ThemeProfile | null;
  customThemes: Map<string, ThemeProfile>;
  isInitialized: boolean;
}

/**
 * Theme change event
 */
export interface ThemeChangeEvent {
  previousTheme: ThemeProfile | null;
  newTheme: ThemeProfile;
  timestamp: number;
}

/**
 * Theme engine configuration
 */
export interface ThemeEngineConfig {
  defaultThemeId?: string;
  persistToStorage?: boolean;
  storageKey?: string;
  onThemeChange?: (event: ThemeChangeEvent) => void;
}

/**
 * Generate CSS custom properties from theme colors
 */
export function generateCSSVariables(theme: ThemeProfile): string {
  const lines: string[] = [":root {"];

  // Color variables
  for (const [key, value] of Object.entries(theme.colors)) {
    lines.push(`  --color-${key}: ${value};`);
  }

  // Typography variables
  if (typeof theme.typography.fontFamily === "string") {
    lines.push(`  --font-family: ${theme.typography.fontFamily};`);
  }
  if (typeof theme.typography.fontSize === "number") {
    lines.push(`  --font-size-base: ${theme.typography.fontSize}px;`);
  }

  // Border radius variables
  if (theme.borderRadius) {
    for (const [key, value] of Object.entries(theme.borderRadius)) {
      lines.push(`  --border-radius-${key}: ${value};`);
    }
  }

  // Shadow variables
  if (theme.shadows) {
    for (const [key, value] of Object.entries(theme.shadows)) {
      lines.push(`  --shadow-${key}: ${value};`);
    }
  }

  // Spacing variables
  if (theme.spacing) {
    lines.push(`  --spacing-unit: ${theme.spacing.unit}px;`);
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Generate inline style object from theme
 */
export function generateStyleObject(
  theme: ThemeProfile
): Record<string, string> {
  const styles: Record<string, string> = {};

  for (const [key, value] of Object.entries(theme.colors)) {
    styles[`--color-${key}`] = value;
  }

  if (typeof theme.typography.fontFamily === "string") {
    styles["--font-family"] = theme.typography.fontFamily;
  }
  if (typeof theme.typography.fontSize === "number") {
    styles["--font-size-base"] = `${theme.typography.fontSize}px`;
  }

  return styles;
}

/**
 * ThemeEngine class for managing theme state
 */
export class ThemeEngine {
  private state: ThemeEngineState;
  private config: ThemeEngineConfig;
  private listeners: Set<(event: ThemeChangeEvent) => void> = new Set();

  constructor(config: ThemeEngineConfig = {}) {
    this.config = {
      defaultThemeId: DEFAULT_THEME_ID,
      persistToStorage: false,
      storageKey: "theme-engine-state",
      ...config,
    };

    const defaultTheme =
      PREDEFINED_THEMES[this.config.defaultThemeId!] ?? getDefaultTheme();

    this.state = {
      currentTheme: defaultTheme,
      previousTheme: null,
      customThemes: new Map(),
      isInitialized: false,
    };
  }

  /**
   * Initialize the theme engine
   */
  initialize(): void {
    this.state.isInitialized = true;
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeProfile {
    return this.state.currentTheme;
  }

  /**
   * Get previous theme
   */
  getPreviousTheme(): ThemeProfile | null {
    return this.state.previousTheme;
  }

  /**
   * Set the current theme
   */
  setTheme(themeOrId: ThemeProfile | string): void {
    const newTheme =
      typeof themeOrId === "string" ? this.getTheme(themeOrId) : themeOrId;

    if (!newTheme) {
      throw new Error(`Theme not found: ${themeOrId}`);
    }

    const event: ThemeChangeEvent = {
      previousTheme: this.state.currentTheme,
      newTheme,
      timestamp: Date.now(),
    };

    this.state.previousTheme = this.state.currentTheme;
    this.state.currentTheme = newTheme;

    this.notifyListeners(event);
  }

  /**
   * Get a theme by ID (predefined or custom)
   */
  getTheme(themeId: string): ThemeProfile | undefined {
    return PREDEFINED_THEMES[themeId] ?? this.state.customThemes.get(themeId);
  }

  /**
   * Register a custom theme
   */
  registerCustomTheme(theme: ThemeProfile): void {
    if (PREDEFINED_THEMES[theme.id]) {
      throw new Error(`Cannot override predefined theme: ${theme.id}`);
    }
    this.state.customThemes.set(theme.id, theme);
  }

  /**
   * Unregister a custom theme
   */
  unregisterCustomTheme(themeId: string): boolean {
    return this.state.customThemes.delete(themeId);
  }

  /**
   * Get all available themes (predefined + custom)
   */
  getAllThemes(): ThemeProfile[] {
    return [
      ...Object.values(PREDEFINED_THEMES),
      ...this.state.customThemes.values(),
    ];
  }

  /**
   * Get CSS variables for current theme
   */
  getCSSVariables(): string {
    return generateCSSVariables(this.state.currentTheme);
  }

  /**
   * Get style object for current theme
   */
  getStyleObject(): Record<string, string> {
    return generateStyleObject(this.state.currentTheme);
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (event: ThemeChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(event: ThemeChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
    if (this.config.onThemeChange) {
      this.config.onThemeChange(event);
    }
  }

  /**
   * Reset to default theme
   */
  reset(): void {
    const defaultTheme =
      PREDEFINED_THEMES[this.config.defaultThemeId!] ?? getDefaultTheme();
    this.setTheme(defaultTheme);
  }

  /**
   * Check if engine is initialized
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * Dispose the engine
   */
  dispose(): void {
    this.listeners.clear();
    this.state.customThemes.clear();
    this.state.isInitialized = false;
  }
}

/**
 * Create a new theme engine instance
 */
export function createThemeEngine(config?: ThemeEngineConfig): ThemeEngine {
  const engine = new ThemeEngine(config);
  engine.initialize();
  return engine;
}

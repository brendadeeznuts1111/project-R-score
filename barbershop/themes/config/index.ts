/**
 * Theme Registry
 *
 * Hybrid approach: Individual TOML files + TypeScript registry
 * Benefits:
 * - Tree-shaking (only bundle themes you import)
 * - Type-safe theme access
 * - Dynamic loading support
 * - Clean organization
 */

// Import all theme configs (Bun inlines TOML at build time)
import light from './light.toml';
import dark from './dark.toml';
import professional from './professional.toml';
import factorywager from './factorywager.toml';
import domain from './domain.toml';

// Theme type definition derived from TOML structure
export interface ThemeConfig {
  meta: {
    name: string;
    description: string;
    icon: string;
    version: string;
  };
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    success: Record<string, string>;
    warning: Record<string, string>;
    error: Record<string, string>;
    gray: Record<string, string>;
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
      overlay: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      muted: string;
      inverse: string;
    };
    border: {
      light: string;
      default: string;
      strong: string;
    };
    status: {
      online: string;
      away: string;
      busy: string;
      offline: string;
    };
  };
  typography: {
    fontSans: string;
    fontMono: string;
    fontSizeXs: string;
    fontSizeSm: string;
    fontSizeBase: string;
    fontSizeLg: string;
    fontSizeXl: string;
    fontSize2xl: string;
  };
  shadows: {
    sm: string;
    default: string;
    md: string;
    lg: string;
    xl: string;
    inner: string;
    glow: string;
  };
  radii: {
    sm: string;
    default: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  transitions: {
    fast: string;
    default: string;
    slow: string;
  };
}

// Domain config type
export interface DomainConfigFile {
  meta: {
    name: string;
    description: string;
    version: string;
    author: string;
  };
  defaults: {
    primary_domain: string;
    environment: string;
    auto_proxy: boolean;
    default_ttl: number;
    ssl_mode: string;
  };
  subdomains: Record<
    string,
    {
      name: string;
      proxied: boolean;
      description: string;
    }
  >;
  environments: Record<
    string,
    {
      primary_domain: string;
      ssl_mode: string;
    }
  >;
  cli: {
    theme: {
      default: string;
      use_icons: boolean;
      use_colors: boolean;
      border_style: string;
    };
    colors: {
      status: Record<string, string>;
      dns: Record<string, string>;
      ssl: Record<string, string>;
    };
  };
  api: {
    base_url: string;
    timeout: number;
    retries: number;
    rate_limit: number;
  };
  cache: {
    default_purge_paths: string[];
  };
  analytics: {
    default_days: number;
    metrics: string[];
  };
}

// Theme registry
export const themes = {
  light: light as ThemeConfig,
  dark: dark as ThemeConfig,
  professional: professional as ThemeConfig,
  factorywager: factorywager as ThemeConfig,
};

// Domain configuration
export const domainConfig = domain as DomainConfigFile;

// Theme name type for type-safe access
export type ThemeName = keyof typeof themes;

// Theme list for UI display
export const themeList = Object.entries(themes).map(([key, theme]) => ({
  id: key as ThemeName,
  name: theme.meta.name,
  description: theme.meta.description,
  icon: theme.meta.icon,
  version: theme.meta.version,
}));

/**
 * Get theme by name (type-safe)
 */
export function getTheme(name: ThemeName): ThemeConfig {
  const theme = themes[name];
  if (!theme) {
    throw new Error(`Theme "${name}" not found. Available: ${Object.keys(themes).join(', ')}`);
  }
  return theme;
}

/**
 * Check if theme exists
 */
export function hasTheme(name: string): name is ThemeName {
  return name in themes;
}

/**
 * Generate CSS custom properties from theme
 */
export function generateCSSVariables(theme: ThemeConfig): string {
  const vars: string[] = [];

  // Color scales
  for (const [colorName, scale] of Object.entries(theme.colors)) {
    if (typeof scale === 'object' && !('primary' in scale)) {
      // It's a color scale (primary, secondary, etc.)
      for (const [shade, value] of Object.entries(scale)) {
        vars.push(`  --color-${colorName}-${shade}: ${value};`);
      }
    } else if (typeof scale === 'object') {
      // It's a nested object (background, text, border, status)
      for (const [key, value] of Object.entries(scale)) {
        vars.push(`  --color-${colorName}-${key}: ${value};`);
      }
    }
  }

  // Typography
  vars.push(`  --font-sans: ${theme.typography.fontSans};`);
  vars.push(`  --font-mono: ${theme.typography.fontMono};`);

  // Shadows
  for (const [key, value] of Object.entries(theme.shadows)) {
    vars.push(`  --shadow-${key}: ${value};`);
  }

  // Border radius
  for (const [key, value] of Object.entries(theme.radii)) {
    vars.push(`  --radius-${key}: ${value};`);
  }

  // Transitions
  for (const [key, value] of Object.entries(theme.transitions)) {
    vars.push(`  --transition-${key}: ${value};`);
  }

  return `:root {\n${vars.join('\n')}\n}`;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: ThemeConfig, themeName?: string): void {
  if (typeof document === 'undefined') return;

  const styleId = 'fw-theme-variables';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = generateCSSVariables(theme);

  if (themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
  }

  // Dispatch custom event
  window.dispatchEvent(
    new CustomEvent('themechange', {
      detail: { theme, name: themeName },
    })
  );
}

/**
 * Load theme dynamically (runtime)
 * Note: This requires the theme to be available at runtime
 */
export async function loadTheme(name: string): Promise<ThemeConfig> {
  // For dynamic loading, we need to use import() with a variable
  // This will be handled by Bun's bundler
  const module = await import(`./${name}.toml`);
  return module.default as ThemeConfig;
}

/**
 * Create theme-aware CSS class
 */
export function createThemeClass(theme: ThemeConfig, className: string): string {
  const css = generateCSSVariables(theme);
  return css.replace(':root', `.${className}`);
}

// Re-export for convenience
export { light, dark, professional, factorywager, domain };

// Default export
export default themes;

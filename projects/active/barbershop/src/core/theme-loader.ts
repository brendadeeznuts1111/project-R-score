/**
 * FactoryWager Theme Loader
 * Loads themes from TOML files and generates CSS variables
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    background: Record<string, string>;
    text: Record<string, string>;
    border: Record<string, string>;
    status: Record<string, string>;
  };
  typography: {
    fontSans: string;
    fontMono: string;
  };
  shadows: Record<string, string>;
  radii: Record<string, string>;
  transitions: Record<string, string>;
}

// Simple TOML parser for theme files
function parseTOML(content: string): Partial<ThemeConfig> {
  const result: Partial<ThemeConfig> = {
    meta: { name: '', description: '', icon: '', version: '' },
    colors: {
      primary: {},
      secondary: {},
      success: {},
      warning: {},
      error: {},
      gray: {},
      background: {},
      text: {},
      border: {},
      status: {},
    },
    typography: { fontSans: '', fontMono: '' },
    shadows: {},
    radii: {},
    transitions: {},
  };

  let currentSection = '';
  let currentSubsection = '';

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section headers [section] or [section.subsection]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const section = trimmed.slice(1, -1);
      if (section.includes('.')) {
        const [parent, child] = section.split('.');
        currentSection = parent;
        currentSubsection = child;
      } else {
        currentSection = section;
        currentSubsection = '';
      }
      continue;
    }

    // Key-value pairs
    if (trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts
        .join('=')
        .trim()
        .replace(/^["']|["']$/g, '');
      const cleanKey = key.trim();

      // Handle nested sections
      if (currentSection === 'meta') {
        (result.meta as Record<string, string>)[cleanKey] = value;
      } else if (currentSection === 'colors' && currentSubsection) {
        (result.colors as Record<string, Record<string, string>>)[currentSubsection][cleanKey] =
          value;
      } else if (currentSection === 'typography') {
        (result.typography as Record<string, string>)[cleanKey] = value;
      } else if (currentSection === 'shadows') {
        result.shadows![cleanKey] = value;
      } else if (currentSection === 'radii') {
        result.radii![cleanKey] = value;
      } else if (currentSection === 'transitions') {
        result.transitions![cleanKey] = value;
      }
    }
  }

  return result;
}

// Load theme from TOML file
export function loadThemeFromTOML(themeName: string): ThemeConfig {
  const themePath = join(process.cwd(), 'themes/config', `${themeName}.toml`);

  try {
    const content = readFileSync(themePath, 'utf-8');
    const parsed = parseTOML(content);

    // Merge with defaults
    return {
      meta: {
        name: parsed.meta?.name || themeName,
        description: parsed.meta?.description || '',
        icon: parsed.meta?.icon || '🎨',
        version: parsed.meta?.version || '1.0.0',
      },
      colors: {
        primary: parsed.colors?.primary || {},
        secondary: parsed.colors?.secondary || {},
        success: parsed.colors?.success || {},
        warning: parsed.colors?.warning || {},
        error: parsed.colors?.error || {},
        gray: parsed.colors?.gray || {},
        background: parsed.colors?.background || {},
        text: parsed.colors?.text || {},
        border: parsed.colors?.border || {},
        status: parsed.colors?.status || {},
      },
      typography: {
        fontSans: parsed.typography?.fontSans || 'system-ui, sans-serif',
        fontMono: parsed.typography?.fontMono || 'monospace',
      },
      shadows: parsed.shadows || {},
      radii: parsed.radii || {},
      transitions: parsed.transitions || {},
    };
  } catch (error) {
    console.warn(`Failed to load theme ${themeName}:`, error);
    return getDefaultTheme();
  }
}

// Default fallback theme
export function getDefaultTheme(): ThemeConfig {
  return {
    meta: {
      name: 'FactoryWager',
      description: 'Default FactoryWager theme',
      icon: '🏰',
      version: '1.0.0',
    },
    colors: {
      primary: {
        '50': 'hsl(217 90% 97%)',
        '100': 'hsl(217 90% 94%)',
        '200': 'hsl(217 90% 86%)',
        '300': 'hsl(217 90% 76%)',
        '400': 'hsl(217 90% 60%)',
        '500': 'hsl(217 90% 50%)',
        '600': 'hsl(217 90% 42%)',
        '700': 'hsl(217 90% 36%)',
        '800': 'hsl(217 90% 30%)',
        '900': 'hsl(217 90% 24%)',
        '950': 'hsl(217 90% 16%)',
      },
      secondary: {
        '50': 'hsl(190 80% 97%)',
        '100': 'hsl(190 80% 94%)',
        '500': 'hsl(190 80% 50%)',
        '600': 'hsl(190 80% 42%)',
        '700': 'hsl(190 80% 36%)',
      },
      success: {
        '50': 'hsl(160 84% 97%)',
        '100': 'hsl(160 84% 94%)',
        '500': 'hsl(160 84% 39%)',
        '700': 'hsl(160 84% 30%)',
      },
      warning: {
        '50': 'hsl(38 92% 97%)',
        '100': 'hsl(38 92% 94%)',
        '500': 'hsl(38 92% 50%)',
        '700': 'hsl(38 92% 35%)',
      },
      error: {
        '50': 'hsl(0 84% 97%)',
        '100': 'hsl(0 84% 94%)',
        '500': 'hsl(0 84% 60%)',
        '700': 'hsl(0 84% 45%)',
      },
      gray: {
        '50': 'hsl(220 14% 97%)',
        '100': 'hsl(220 14% 94%)',
        '200': 'hsl(220 14% 90%)',
        '300': 'hsl(220 14% 80%)',
        '400': 'hsl(220 14% 65%)',
        '500': 'hsl(220 14% 50%)',
        '600': 'hsl(220 14% 40%)',
        '700': 'hsl(220 14% 30%)',
        '800': 'hsl(220 14% 20%)',
        '900': 'hsl(220 14% 10%)',
        '950': 'hsl(220 14% 5%)',
      },
      background: {
        primary: 'hsl(0 0% 100%)',
        secondary: 'hsl(220 14% 96%)',
        tertiary: 'hsl(220 14% 92%)',
        elevated: 'hsl(0 0% 100%)',
        overlay: 'hsl(0 0% 0% / 0.4)',
      },
      text: {
        primary: 'hsl(220 43% 11%)',
        secondary: 'hsl(220 14% 35%)',
        tertiary: 'hsl(220 9% 46%)',
        muted: 'hsl(220 9% 60%)',
        inverse: 'hsl(0 0% 100%)',
      },
      border: {
        light: 'hsl(220 14% 90%)',
        default: 'hsl(220 14% 84%)',
        strong: 'hsl(220 14% 70%)',
      },
      status: {
        online: 'hsl(160 84% 39%)',
        away: 'hsl(38 92% 50%)',
        busy: 'hsl(0 84% 60%)',
        offline: 'hsl(220 14% 60%)',
      },
    },
    typography: {
      fontSans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontMono: "'Fira Code', 'Monaco', 'Menlo', 'Consolas', monospace",
    },
    shadows: {
      sm: '0 1px 2px 0 hsl(220 43% 11% / 0.05)',
      md: '0 4px 6px -1px hsl(220 43% 11% / 0.1)',
      lg: '0 10px 15px -3px hsl(220 43% 11% / 0.1)',
      xl: '0 20px 25px -5px hsl(220 43% 11% / 0.1)',
    },
    radii: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    transitions: {
      fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
  };
}

// Generate CSS variables from theme
export function generateThemeCSS(theme: ThemeConfig): string {
  const vars: string[] = [];

  // Color scales
  Object.entries(theme.colors).forEach(([category, values]) => {
    Object.entries(values).forEach(([key, value]) => {
      vars.push(`  --color-${category}-${key}: ${value};`);
    });
  });

  // Typography
  vars.push(`  --font-sans: ${theme.typography.fontSans};`);
  vars.push(`  --font-mono: ${theme.typography.fontMono};`);

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    vars.push(`  --shadow-${key}: ${value};`);
  });

  // Border radius
  Object.entries(theme.radii).forEach(([key, value]) => {
    vars.push(`  --radius-${key}: ${value};`);
  });

  // Transitions
  Object.entries(theme.transitions).forEach(([key, value]) => {
    vars.push(`  --transition-${key}: ${value};`);
  });

  return `:root {\n${vars.join('\n')}\n}`;
}

// Get available themes
export function getAvailableThemes(): string[] {
  return ['factorywager', 'light', 'dark', 'professional'];
}

// Load all themes
export function loadAllThemes(): Record<string, ThemeConfig> {
  const themes: Record<string, ThemeConfig> = {};

  for (const name of getAvailableThemes()) {
    themes[name] = loadThemeFromTOML(name);
  }

  return themes;
}

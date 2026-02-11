export type ThemeName = 'light' | 'dark' | 'professional' | 'factorywager';

export interface ThemeMeta {
  name: string;
  description: string;
  icon: string;
  version: string;
}

export interface ThemeConfig {
  meta: ThemeMeta;
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

function createScale(hue: number, sat: number): Record<string, string> {
  return {
    '50': `hsl(${hue} ${sat}% 97%)`,
    '100': `hsl(${hue} ${sat}% 94%)`,
    '200': `hsl(${hue} ${sat}% 86%)`,
    '300': `hsl(${hue} ${sat}% 76%)`,
    '400': `hsl(${hue} ${sat}% 60%)`,
    '500': `hsl(${hue} ${sat}% 50%)`,
    '600': `hsl(${hue} ${sat}% 42%)`,
    '700': `hsl(${hue} ${sat}% 36%)`,
    '800': `hsl(${hue} ${sat}% 30%)`,
    '900': `hsl(${hue} ${sat}% 24%)`,
    '950': `hsl(${hue} ${sat}% 16%)`,
  };
}

function createTheme(meta: ThemeMeta, tones: { primaryHue: number; secondaryHue: number }): ThemeConfig {
  const primary = createScale(tones.primaryHue, 100);
  const secondary = createScale(tones.secondaryHue, 80);
  const success = createScale(145, 80);
  const warning = createScale(30, 100);
  const error = createScale(0, 85);

  return {
    meta,
    colors: {
      primary,
      secondary,
      success,
      warning,
      error,
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
        online: success['500'],
        away: warning['500'],
        busy: error['500'],
        offline: 'hsl(220 14% 60%)',
      },
    },
    typography: {
      fontSans: "'Inter', system-ui, -apple-system, sans-serif",
      fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    shadows: {
      sm: '0 1px 2px 0 hsl(220 43% 11% / 0.05)',
      md: '0 4px 6px -1px hsl(220 43% 11% / 0.1)',
      lg: '0 10px 15px -3px hsl(220 43% 11% / 0.1)',
      xl: '0 20px 25px -5px hsl(220 43% 11% / 0.1)',
    },
    radii: {
      sm: '4px',
      default: '6px',
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

export const themes: Record<ThemeName, ThemeConfig> = {
  light: createTheme(
    {
      name: 'Light',
      description: 'Clean light theme',
      icon: '☀️',
      version: '2.0.0',
    },
    { primaryHue: 210, secondaryHue: 175 }
  ),
  dark: createTheme(
    {
      name: 'Dark',
      description: 'Professional dark theme',
      icon: '🌙',
      version: '2.0.0',
    },
    { primaryHue: 210, secondaryHue: 175 }
  ),
  professional: createTheme(
    {
      name: 'Professional',
      description: 'Corporate blue-gray theme',
      icon: '💼',
      version: '2.0.0',
    },
    { primaryHue: 210, secondaryHue: 175 }
  ),
  factorywager: createTheme(
    {
      name: 'FactoryWager',
      description: 'Official FactoryWager brand theme',
      icon: '🏰',
      version: '2.0.0',
    },
    { primaryHue: 210, secondaryHue: 175 }
  ),
};

export const themeList = [
  { id: 'light' as const, name: 'Light', icon: '☀️', description: 'Clean light theme' },
  { id: 'dark' as const, name: 'Dark', icon: '🌙', description: 'Professional dark theme' },
  {
    id: 'professional' as const,
    name: 'Professional',
    icon: '💼',
    description: 'Corporate blue-gray theme',
  },
  {
    id: 'factorywager' as const,
    name: 'FactoryWager',
    icon: '🏰',
    description: 'Official FactoryWager brand theme',
  },
];

export function getTheme(name: ThemeName): ThemeConfig {
  return themes[name];
}

export function generateCSSVariables(theme: ThemeConfig): string {
  const lines: string[] = [];

  for (const [family, entries] of Object.entries(theme.colors)) {
    for (const [shade, value] of Object.entries(entries)) {
      lines.push(`  --color-${family}-${shade}: ${value};`);
    }
  }

  for (const [k, v] of Object.entries(theme.shadows)) {
    lines.push(`  --shadow-${k}: ${v};`);
  }

  for (const [k, v] of Object.entries(theme.radii)) {
    lines.push(`  --radius-${k}: ${v};`);
  }

  for (const [k, v] of Object.entries(theme.transitions)) {
    lines.push(`  --transition-${k}: ${v};`);
  }

  lines.push(`  --font-sans: ${theme.typography.fontSans};`);
  lines.push(`  --font-mono: ${theme.typography.fontMono};`);

  return `:root {\n${lines.join('\n')}\n}`;
}

export function applyTheme(theme: ThemeConfig, name: ThemeName): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme', name);
  const css = generateCSSVariables(theme);
  let style = document.getElementById('fw-theme-vars') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'fw-theme-vars';
    document.head.appendChild(style);
  }
  style.textContent = css;

  window.dispatchEvent(new CustomEvent('themechange', { detail: { name, theme } }));
}

export function toggleTheme(current: ThemeName): ThemeName {
  const order: ThemeName[] = ['light', 'dark', 'professional', 'factorywager'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export interface DomainConfig {
  meta: { description: string };
  api: { base_url: string; rate_limit: number };
  defaults: { primary_domain: string; ssl_mode: string; environment: string };
  environments: Record<string, { primary_domain: string }>;
  subdomains: Record<string, { name: string; description: string; proxied: boolean }>;
}

export const domainConfig: DomainConfig = {
  meta: { description: 'FactoryWager domain operations profile' },
  api: { base_url: 'https://api.cloudflare.com/client/v4', rate_limit: 20 },
  defaults: {
    primary_domain: 'factory-wager.com',
    ssl_mode: 'strict',
    environment: 'production',
  },
  environments: {
    production: { primary_domain: 'factory-wager.com' },
    staging: { primary_domain: 'staging.factory-wager.com' },
    development: { primary_domain: 'dev.factory-wager.com' },
  },
  subdomains: {
    docs: { name: 'docs', description: 'Documentation', proxied: true },
    api: { name: 'api', description: 'Public API', proxied: true },
    dashboard: { name: 'dashboard', description: 'Dashboard UI', proxied: true },
  },
};

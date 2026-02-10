import { themes, type ThemeName } from './index';

const ANSI = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  teal: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

export interface DomainTheme {
  icon: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
  };
  icons: {
    zone: string;
    dns: string;
    ssl: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

const DOMAIN_THEMES: Record<ThemeName, DomainTheme> = {
  light: {
    icon: '☀️',
    name: themes.light.meta.name,
    colors: {
      primary: ANSI.blue,
      secondary: ANSI.teal,
      success: ANSI.green,
      warning: ANSI.yellow,
      error: ANSI.red,
      muted: ANSI.gray,
    },
    icons: { zone: '🌐', dns: '🧭', ssl: '🔒', success: '✓', warning: '⚠', error: '✗', info: 'ℹ' },
  },
  dark: {
    icon: '🌙',
    name: themes.dark.meta.name,
    colors: {
      primary: ANSI.blue,
      secondary: ANSI.teal,
      success: ANSI.green,
      warning: ANSI.yellow,
      error: ANSI.red,
      muted: ANSI.gray,
    },
    icons: { zone: '🌐', dns: '🧭', ssl: '🔒', success: '✓', warning: '⚠', error: '✗', info: 'ℹ' },
  },
  professional: {
    icon: '💼',
    name: themes.professional.meta.name,
    colors: {
      primary: ANSI.blue,
      secondary: ANSI.teal,
      success: ANSI.green,
      warning: ANSI.yellow,
      error: ANSI.red,
      muted: ANSI.gray,
    },
    icons: { zone: '🌐', dns: '🧭', ssl: '🔒', success: '✓', warning: '⚠', error: '✗', info: 'ℹ' },
  },
  factorywager: {
    icon: '🏰',
    name: themes.factorywager.meta.name,
    colors: {
      primary: ANSI.blue,
      secondary: ANSI.teal,
      success: ANSI.green,
      warning: ANSI.yellow,
      error: ANSI.red,
      muted: ANSI.gray,
    },
    icons: { zone: '🌐', dns: '🧭', ssl: '🔒', success: '✓', warning: '⚠', error: '✗', info: 'ℹ' },
  },
};

export function getDomainTheme(theme: ThemeName = 'factorywager'): DomainTheme {
  return DOMAIN_THEMES[theme] ?? DOMAIN_THEMES.factorywager;
}

export function themedSeparator(theme: ThemeName = 'factorywager', width = 60): string {
  const t = getDomainTheme(theme);
  return `${t.colors.secondary}${'═'.repeat(width)}${ANSI.reset}`;
}

export class ThemedConsole {
  private readonly theme: DomainTheme;

  constructor(theme: ThemeName = 'factorywager') {
    this.theme = getDomainTheme(theme);
  }

  private paint(color: string, message = ''): string {
    return `${color}${message}${ANSI.reset}`;
  }

  log(message = ''): void {
    console.log(message);
  }

  info(message: string): void {
    console.log(this.paint(this.theme.colors.primary, `${this.theme.icons.info} ${message}`));
  }

  success(message: string): void {
    console.log(this.paint(this.theme.colors.success, `${this.theme.icons.success} ${message}`));
  }

  warning(message: string): void {
    console.log(this.paint(this.theme.colors.warning, `${this.theme.icons.warning} ${message}`));
  }

  error(message: string): void {
    console.error(this.paint(this.theme.colors.error, `${this.theme.icons.error} ${message}`));
  }

  header(message: string): void {
    console.log(this.paint(this.theme.colors.secondary, `${this.theme.icon} ${message}`));
  }

  zoneStatus(status: string): string {
    const lower = status.toLowerCase();
    if (lower === 'active') return this.paint(this.theme.colors.success, status);
    if (lower === 'paused') return this.paint(this.theme.colors.warning, status);
    return this.paint(this.theme.colors.muted, status);
  }

  dnsType(value: string): string {
    return this.paint(this.theme.colors.primary, value);
  }

  proxiedStatus(enabled: boolean): string {
    return enabled
      ? this.paint(this.theme.colors.success, 'proxied')
      : this.paint(this.theme.colors.muted, 'dns-only');
  }

  sslMode(mode: string): string {
    const lower = mode.toLowerCase();
    if (lower.includes('strict')) return this.paint(this.theme.colors.success, mode);
    if (lower.includes('full')) return this.paint(this.theme.colors.warning, mode);
    return this.paint(this.theme.colors.error, mode);
  }
}

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  syntax: {
    keyword: string;
    function: string;
    string: string;
    number: string;
    type: string;
    comment: string;
    operator: string;
    variable: string;
    property: string;
    tag: string;
  };
}

export interface ThemeConfig {
  name: string;
  type: "dark" | "light";
  colors: ThemeColors;
}

export class ThemeManager {
  private currentTheme: string = "crc32-dark";
  private readonly themes = new Map<string, ThemeConfig>();

  constructor() {
    this.initializeThemes();
  }

  private initializeThemes(): void {
    this.themes.set("crc32-dark", {
      name: "CRC32 Dark",
      type: "dark",
      colors: {
        background: "#0f172a",
        foreground: "#e6e6e6",
        primary: "#3b82f6",
        secondary: "#8b5cf6",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        syntax: {
          keyword: "#3b82f6",
          function: "#f59e0b",
          string: "#22c55e",
          number: "#ef4444",
          type: "#8b5cf6",
          comment: "#6b7280",
          operator: "#94a3b8",
          variable: "#06b6d4",
          property: "#ec4899",
          tag: "#f97316",
        },
      },
    });

    this.themes.set("crc32-light", {
      name: "CRC32 Light",
      type: "light",
      colors: {
        background: "#ffffff",
        foreground: "#1f2937",
        primary: "#2563eb",
        secondary: "#7c3aed",
        success: "#16a34a",
        warning: "#d97706",
        error: "#dc2626",
        syntax: {
          keyword: "#2563eb",
          function: "#d97706",
          string: "#16a34a",
          number: "#dc2626",
          type: "#7c3aed",
          comment: "#9ca3af",
          operator: "#6b7280",
          variable: "#0891b2",
          property: "#db2777",
          tag: "#ea580c",
        },
      },
    });

    this.themes.set("crc32-high-contrast", {
      name: "CRC32 High Contrast",
      type: "dark",
      colors: {
        background: "#000000",
        foreground: "#ffffff",
        primary: "#0066ff",
        secondary: "#9933ff",
        success: "#00ff00",
        warning: "#ffff00",
        error: "#ff0000",
        syntax: {
          keyword: "#0066ff",
          function: "#ffff00",
          string: "#00ff00",
          number: "#ff0000",
          type: "#9933ff",
          comment: "#808080",
          operator: "#ffffff",
          variable: "#00ffff",
          property: "#ff69b4",
          tag: "#ff8c00",
        },
      },
    });
  }

  getTheme(name: string): ThemeConfig | undefined {
    return this.themes.get(name);
  }

  getAllThemes(): ThemeConfig[] {
    return Array.from(this.themes.values());
  }

  setTheme(name: string): void {
    if (this.themes.has(name)) {
      this.currentTheme = name;
      this.applyTheme(name);
    } else {
      throw new Error(`Theme '${name}' not found`);
    }
  }

  getCurrentTheme(): ThemeConfig {
    return this.themes.get(this.currentTheme)!;
  }

  private applyTheme(name: string): void {
    const theme = this.themes.get(name);
    if (!theme) return;
    console.log(
      `\x1b[38;2;${this.hexToRgb(theme.colors.primary)}m🎨 Theme switched to: ${theme.name}\x1b[0m`,
    );
  }

  hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r};${g};${b}`;
  }

  generateTerminalColorCodes(theme: ThemeConfig): string[] {
    const colors = theme.colors;
    return [
      `\x1b[38;2;${this.hexToRgb(colors.primary)}m`,
      `\x1b[38;2;${this.hexToRgb(colors.success)}m`,
      `\x1b[38;2;${this.hexToRgb(colors.warning)}m`,
      `\x1b[38;2;${this.hexToRgb(colors.error)}m`,
    ];
  }
}

export const themeManager = new ThemeManager();

export const styledConsole = {
  primary: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    const rgb = themeManager.hexToRgb(theme.colors.primary);
    console.log(`\x1b[38;2;${rgb}m${text}\x1b[0m`);
  },
  success: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    const rgb = themeManager.hexToRgb(theme.colors.success);
    console.log(`\x1b[38;2;${rgb}m${text}\x1b[0m`);
  },
  warning: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    const rgb = themeManager.hexToRgb(theme.colors.warning);
    console.log(`\x1b[38;2;${rgb}m${text}\x1b[0m`);
  },
  error: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    const rgb = themeManager.hexToRgb(theme.colors.error);
    console.log(`\x1b[38;2;${rgb}m${text}\x1b[0m`);
  },
  info: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    const rgb = themeManager.hexToRgb(theme.colors.secondary);
    console.log(`\x1b[38;2;${rgb}m${text}\x1b[0m`);
  },
};

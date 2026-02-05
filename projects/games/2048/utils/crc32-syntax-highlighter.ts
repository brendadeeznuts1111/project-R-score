import { themeManager, type ThemeConfig } from "./theme-manager";

interface SyntaxPattern {
  regex: RegExp;
  color: string;
  className: string;
}

interface HighlightedCode {
  raw: string;
  highlighted: string;
  language: string;
  theme: string;
}

interface TextStyle {
  color: "primary" | "success" | "warning" | "error" | "info";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export class CRC32SyntaxHighlighter {
  private readonly theme: ThemeConfig;

  constructor(themeName: string = "crc32-dark") {
    this.theme =
      themeManager.getTheme(themeName) || themeManager.getTheme("crc32-dark")!;
  }

  highlightCode(
    code: string,
    language: string = "typescript",
  ): HighlightedCode {
    const patterns = this.getCRCPatterns(language);
    let highlighted = code;

    for (const pattern of patterns) {
      highlighted = highlighted.replace(pattern.regex, (_, p1) => {
        const rgb = themeManager.hexToRgb(pattern.color);
        return `\x1b[38;2;${rgb}m${p1}\x1b[0m`;
      });
    }

    return {
      raw: code,
      highlighted,
      language,
      theme: this.theme.name,
    };
  }

  private getCRCPatterns(language: string): SyntaxPattern[] {
    if (language === "typescript" || language === "javascript") {
      return [
        {
          regex: /Bun\.hash\.crc32\(/g,
          color: this.theme.colors.primary,
          className: "crc32-function",
        },
        {
          regex: /hardwareAcceleration|simd|pclmulqdq|hardware_acceleration/gi,
          color: this.theme.colors.success,
          className: "hardware",
        },
        {
          regex: /throughput|MB\/s|latency|processingTime|performance\.now/gi,
          color: this.theme.colors.warning,
          className: "performance",
        },
        {
          regex: /auditTrail|crc32_audit|batchId|audit_trail/gi,
          color: this.theme.colors.secondary,
          className: "audit",
        },
        {
          regex: /CRC32Error|ValidationError|IntegrityError/gi,
          color: this.theme.colors.error,
          className: "error-type",
        },
        {
          regex:
            /async|await|export|import|const|let|var|function|class|interface|type/gi,
          color: this.theme.colors.syntax.keyword,
          className: "keyword",
        },
        {
          regex: /\".*\"|'.*'|`.*`/g,
          color: this.theme.colors.syntax.string,
          className: "string",
        },
        {
          regex: /\b\d+\.?\d*\b/g,
          color: this.theme.colors.syntax.number,
          className: "number",
        },
        {
          regex: /\/\/.*|\/\*[\s\S]*?\*\//g,
          color: this.theme.colors.syntax.comment,
          className: "comment",
        },
      ];
    }
    return [];
  }

  generateStyledOutput(text: string, style: TextStyle): string {
    const colorMap: Record<string, string> = {
      primary: this.theme.colors.primary,
      success: this.theme.colors.success,
      warning: this.theme.colors.warning,
      error: this.theme.colors.error,
      info: this.theme.colors.secondary,
    };

    const color = colorMap[style.color] || this.theme.colors.foreground;
    const rgb = themeManager.hexToRgb(color);

    let output = `\x1b[38;2;${rgb}m${text}\x1b[0m`;

    if (style.bold) output = `\x1b[1m${output}`;
    if (style.italic) output = `\x1b[3m${output}`;
    if (style.underline) output = `\x1b[4m${output}`;

    return output;
  }

  highlightPerformanceBar(
    label: string,
    value: number,
    maxValue: number = 5000,
  ): string {
    const barLength = 40;
    const filled = Math.floor((value / maxValue) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
    const color =
      value > maxValue * 0.8
        ? this.theme.colors.success
        : value > maxValue * 0.5
          ? this.theme.colors.warning
          : this.theme.colors.error;
    const rgb = themeManager.hexToRgb(color);
    return `\x1b[38;2;${rgb}m[${bar}]\x1b[0m ${value.toFixed(2)}`;
  }
}

export const crc32Highlighter = new CRC32SyntaxHighlighter();

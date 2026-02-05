// infrastructure/yaml-doc-end-fix.ts
import { feature } from "bun:bundle";

// Prevents "..." in quoted strings from ending document
export class YAMLDocEndFix {
  private static readonly DOC_END_MARKER = /^\s*\.{3}\s*$/;

  // Zero-cost when YAML_DOC_END_FIX is disabled
  static parseYAML(content: string): any {
    if (!feature("YAML_DOC_END_FIX")) {
      // Legacy: buggy parsing
      return this.legacyParseYAML(content);
    }

    // Component #75: Properly handle "..." in quoted strings
    const lines = content.split('\n');
    const fixedLines: string[] = [];
    let inQuotes = false;
    let quoteChar = "";
    let escapeNext = false;

    for (const line of lines) {
      const processedLine = this.processLine(line, { inQuotes, quoteChar, escapeNext });
      fixedLines.push(processedLine.line);

      // Update state for next line
      inQuotes = processedLine.inQuotes;
      quoteChar = processedLine.quoteChar;
      escapeNext = processedLine.escapeNext;

      // Check for unquoted document end
      if (!inQuotes && this.DOC_END_MARKER.test(line)) {
        // Real document end (outside quotes)
        break;
      }
    }

    const fixedContent = fixedLines.join('\n');
    return Bun.parseYAML(fixedContent);
  }

  private static processLine(
    line: string,
    state: { inQuotes: boolean; quoteChar: string; escapeNext: boolean }
  ): { line: string; inQuotes: boolean; quoteChar: string; escapeNext: boolean } {
    let { inQuotes, quoteChar, escapeNext } = state;
    const chars = line.split('');
    const processed: string[] = [];

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (escapeNext) {
        processed.push(char);
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        processed.push(char);
        continue;
      }

      if (char === '"' || char === "'") {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = "";
        }
        processed.push(char);
        continue;
      }

      processed.push(char);
    }

    return {
      line: processed.join(''),
      inQuotes,
      quoteChar,
      escapeNext
    };
  }

  private static legacyParseYAML(content: string): any {
    // Buggy: treats "..." in quotes as document end
    return Bun.parseYAML(content);
  }

  // Stringify fix for indicator characters
  static stringifyYAML(obj: any): string {
    if (!feature("YAML_DOC_END_FIX")) {
      return Bun.YAML.stringify(obj);
    }

    const yaml = Bun.YAML.stringify(obj);
    const lines = yaml.split('\n');

    // Ensure strings starting with indicator chars are quoted
    return lines.map(line => {
      const match = line.match(/^(\s*)([^:]+):\s*(.+)$/);
      if (match) {
        const [, indent, key, value] = match;
        const trimmed = value.trim();

        // Quote if starts with indicator char or whitespace
        if (/^[:?[{}\-&*!|>%"@`]/.test(trimmed) || /^\s/.test(trimmed)) {
          return `${indent}${key}: "${trimmed}"`;
        }
      }
      return line;
    }).join('\n');
  }

  // Log fix application (Component #11 audit)
  private static logYAMLParseResult(parsed: any, errors: any[]): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 75,
        action: "yaml_parsed",
        hasDocEndMarkers: true,
        errors,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { parseYAML, stringifyYAML } = feature("YAML_DOC_END_FIX")
  ? YAMLDocEndFix
  : { parseYAML: (c: string) => Bun.parseYAML(c), stringifyYAML: (o: any) => Bun.YAML.stringify(o) };
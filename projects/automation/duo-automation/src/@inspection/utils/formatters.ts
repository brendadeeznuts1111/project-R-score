/**
 * Enhanced Formatters with Depth Control
 * 
 * Provides human-readable, JSON, and shell output formats
 * with configurable depth control and filtering.
 */

import type { DomainContext } from "../contexts/DomainContext.js";

export interface FormatOptions {
  depth: number;
  filter?: string;
  colors?: boolean;
}

/**
 * Human-readable formatter with depth control
 */
export function formatHuman(ctx: DomainContext, depth: number = 6, filter?: string): string {
  const inspected = Bun.inspect(ctx, { 
    depth, 
    colors: true,
    showHidden: false,
    getters: true,
    maxArrayLength: 50,
    maxStringLength: 200
  });
  
  let output = inspected;
  
  // Apply filter if provided
  if (filter) {
    output = filterOutput(inspected, filter, "human");
  }
  
  return `
🧩 FactoryWager Runtime Scope Inspection (depth=${depth}${filter ? `, filter=${filter}` : ""})
${"=".repeat(60)}
${output}
`.trim();
}

/**
 * JSON formatter with depth control
 */
export function formatJson(ctx: DomainContext, depth: number = 6, filter?: string): string {
  // Custom replacer to respect depth
  const serializeWithDepth = (obj: any, currentDepth: number = 0, path: string = ""): any => {
    if (currentDepth >= depth) {
      return typeof obj === 'object' ? `[truncated at depth ${currentDepth}]` : obj;
    }
    
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          serializeWithDepth(item, currentDepth + 1, `${path}[${index}]`)
        );
      }
      
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Skip hidden/internal properties unless at shallow depth
        if (currentDepth < 2 && (key.startsWith('_') || key.startsWith('#'))) {
          continue;
        }
        
        result[key] = serializeWithDepth(value, currentDepth + 1, currentPath);
      }
      return result;
    }
    
    return obj;
  };
  
  let output = JSON.stringify(serializeWithDepth(ctx), null, 2);
  
  // Apply filter if provided
  if (filter) {
    const parsed = JSON.parse(output);
    const filtered = filterOutput(parsed, filter, "json");
    output = JSON.stringify(filtered, null, 2);
  }
  
  return output;
}

/**
 * Shell formatter with depth control
 */
export function formatShell(ctx: DomainContext, depth: number = 6, filter?: string): string {
  // For shell, we limit depth to 3 for practical environment variables
  const maxDepth = Math.min(depth, 3);
  const data = maxDepth >= 1 ? ctx[Symbol.for("Bun.inspect.custom")]() : { domain: ctx.domain };
  
  const lines: string[] = [];
  const seen = new Set();
  
  const flatten = (obj: any, prefix = "FACTORY_WAGER", currentDepth = 0, path = "") => {
    if (currentDepth >= maxDepth || seen.has(obj)) {
      return;
    }
    
    seen.add(obj);
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Skip if filter doesn't match
      if (filter && !currentPath.toLowerCase().includes(filter.toLowerCase())) {
        continue;
      }
      
      if (value && typeof value === 'object' && !Array.isArray(value) && currentDepth < maxDepth - 1) {
        flatten(value, `${prefix}_${key.toUpperCase()}`, currentDepth + 1, currentPath);
      } else {
        const safeValue = sanitizeShellValue(value);
        const varName = `${prefix}_${key.toUpperCase()}`;
        lines.push(`export ${varName}="${safeValue}"`);
      }
    }
  };
  
  flatten(data);
  
  // Add header comment
  const header = [
    `# FactoryWager Scope Inspection (depth=${maxDepth}${filter ? `, filter=${filter}` : ""})`,
    `# Generated: ${new Date().toISOString()}`,
    `# Run: eval $(factory-wager scope --inspect --format=shell${depth !== 6 ? ` --inspect-depth=${depth}` : ""}${filter ? ` --filter=${filter}` : ""})`,
    ""
  ];
  
  return header.concat(lines).join("\n");
}

/**
 * Filter output based on pattern
 */
function filterOutput(output: any, pattern: string, format: "human" | "json" | "shell"): any {
  if (!pattern) return output;
  
  const filterPattern = pattern.toLowerCase();
  
  if (format === "json") {
    return filterObject(output, filterPattern);
  } else if (format === "shell") {
    // Shell filtering is handled during flattening
    return output;
  } else {
    // For human format, filter the string representation
    const lines = output.split("\n");
    return lines
      .filter(line => line.toLowerCase().includes(filterPattern))
      .join("\n");
  }
}

/**
 * Recursively filter object properties
 */
function filterObject(obj: any, pattern: string): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj
      .map(item => filterObject(item, pattern))
      .filter(item => item !== null && item !== undefined);
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyMatches = key.toLowerCase().includes(pattern);
    const valueMatches = typeof value === 'string' && 
      value.toLowerCase().includes(pattern);
    
    if (keyMatches || valueMatches) {
      result[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      const filtered = filterObject(value, pattern);
      if (Object.keys(filtered).length > 0) {
        result[key] = filtered;
      }
    }
  }
  
  return result;
}

/**
 * Sanitize value for shell export
 */
function sanitizeShellValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value)
    .replace(/"/g, '\\"')  // Escape quotes
    .replace(/\n/g, '\\n')  // Escape newlines
    .replace(/\r/g, '\\r')  // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}

/**
 * Get depth description for help text
 */
export function getDepthDescription(depth: number): string {
  if (depth <= 2) return "High-level overview";
  if (depth <= 6) return "Standard inspection";
  if (depth <= 12) return "Detailed debugging";
  return "Forensic deep-dive";
}

/**
 * Validate depth parameter
 */
export function validateDepth(depth: string): number | null {
  const parsed = parseInt(depth, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }
  return parsed;
}

/**
 * Format size for display
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate string for display
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toISOString();
}

/**
 * Colorize output for terminal
 */
export function colorize(text: string, color: "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white"): string {
  const colors = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    reset: "\x1b[0m"
  };
  
  return `${colors[color]}${text}${colors.reset}`;
}

// Export all formatters
export default {
  formatHuman,
  formatJson,
  formatShell,
  filterOutput,
  sanitizeShellValue,
  getDepthDescription,
  validateDepth,
  formatSize,
  truncateString,
  formatTimestamp,
  colorize
};

#!/usr/bin/env bun
/**
 * Table Engine v3.28 – Enhanced Table Architecture
 * 
 * Features:
 * - 20 Column Max with responsive overflow
 * - Unicode status aware (stringWidth)
 * - Bun.color HSL dynamic theming
 * - Hex/HEX case handling
 * - Dynamic status for URLs/endpoints
 */

import { stringWidth } from 'bun';

// Color utility using Bun.color HSL
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  reset: '\x1b[0m',
  
  // HSL color support via Bun.color
  hsl: (h: number, s: number, l: number, text: string): string => {
    try {
      // Try Bun.color first (Bun v1.3.9+)
      const color = Bun.color(`hsl(${h}, ${s}%, ${l}%)`, "ansi");
      return color ? `${color}${text}\x1b[0m` : text;
    } catch {
      // Fallback to RGB conversion
      const [r, g, b] = hslToRgb(h, s, l);
      return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
    }
  },
  
  // Hex color (always uppercase)
  hex: (hex: string, text: string): string => {
    const upperHex = hex.toUpperCase();
    // Convert hex to RGB
    const r = parseInt(upperHex.slice(1, 3), 16);
    const g = parseInt(upperHex.slice(3, 5), 16);
    const b = parseInt(upperHex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
  },
  
  // Background color
  bgHsl: (h: number, s: number, l: number, text: string): string => {
    const [r, g, b] = hslToRgb(h, s, l);
    return `\x1b[48;2;${r};${g};${b}m${text}\x1b[0m`;
  },
};

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255)
  ];
}

// Interfaces
export interface TableColumn {
  key: string;
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  color?: string;           // Hex color
  hsl?: [number, number, number]; // HSL tuple
  formatter?: (val: any, row?: any) => string;
  truncate?: boolean;
}

export interface TableConfig {
  columns: TableColumn[];
  maxColumns?: number;      // Default: 20
  maxWidth?: number;        // Terminal width
  headerColor?: string | [number, number, number];
  borderColor?: string | [number, number, number];
  rowAltColor?: string | [number, number, number];
  compact?: boolean;
  title?: string;
}

export interface TableMetrics {
  renders: number;
  lastRender: number;
  avgRenderTime: number;
}

// Tier-1380 Table Engine
export function createTier1380Table(config: TableConfig) {
  const maxCols = config.maxColumns || 20;
  const visibleCols = config.columns.slice(0, maxCols);
  const overflowCount = config.columns.length - maxCols;
  
  // Track metrics
  const metrics: TableMetrics = {
    renders: 0,
    lastRender: 0,
    avgRenderTime: 0,
  };

  return {
    metrics,
    
    // Main render function
    render(data: Record<string, any>[]): string {
      const startTime = performance.now();
      
      if (data.length === 0) {
        return config.title 
          ? c.dim(`${config.title}: (no data)`)
          : c.dim('(no data)');
      }

      // Calculate optimal column widths using stringWidth
      const colWidths = visibleCols.map(col => {
        const headerWidth = stringWidth(col.header);
        const maxDataWidth = Math.max(...data.map(row => {
          const rawVal = row[col.key];
          let formatted = col.formatter 
            ? col.formatter(rawVal, row)
            : formatValue(rawVal);
          return stringWidth(stripAnsi(formatted));
        }));
        
        let width = Math.max(headerWidth, maxDataWidth);
        if (col.minWidth) width = Math.max(width, col.minWidth);
        if (col.maxWidth) width = Math.min(width, col.maxWidth);
        if (col.width) width = col.width;
        
        return width + 2; // padding
      });

      const lines: string[] = [];
      
      // Title
      if (config.title) {
        const titleWidth = colWidths.reduce((a, b) => a + b, 0) + visibleCols.length + 1;
        const titlePadded = padCenter(config.title, titleWidth - 2);
        lines.push(colorizeBorder('┌' + '─'.repeat(titleWidth - 2) + '┐'));
        lines.push('│' + c.bold(config.title ? colorizeHeader(config.title) : '') + '│');
        lines.push(colorizeBorder('├' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┤'));
      } else {
        // Top border
        lines.push(colorizeBorder('┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐'));
      }

      // Header row
      const headerCells = visibleCols.map((col, i) => {
        const width = colWidths[i];
        const padded = padCenter(col.header, width);
        
        if (col.hsl) {
          return c.hsl(col.hsl[0], col.hsl[1], col.hsl[2], padded);
        } else if (col.color) {
          return c.hex(col.color, padded);
        }
        return c.bold(colorizeHeader(padded));
      });
      lines.push('│' + headerCells.join('│') + '│');

      // Separator
      lines.push(colorizeBorder('├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤'));

      // Data rows
      data.forEach((row, rowIdx) => {
        const cells = visibleCols.map((col, i) => {
          const width = colWidths[i];
          let val = row[col.key];
          
          // Format value
          let formatted: string;
          if (col.formatter) {
            formatted = col.formatter(val, row);
          } else {
            formatted = formatValue(val);
          }
          
          // Handle truncation
          if (col.truncate) {
            const visibleLen = stringWidth(stripAnsi(formatted));
            if (visibleLen > width - 2) {
              formatted = truncateString(formatted, width - 2) + '…';
            }
          }
          
          const visualWidth = stringWidth(stripAnsi(formatted));
          const padding = Math.max(0, width - visualWidth);
          
          // Alignment
          let cell: string;
          if (col.align === 'right') {
            cell = ' '.repeat(padding) + formatted;
          } else if (col.align === 'center') {
            const left = Math.floor(padding / 2);
            cell = ' '.repeat(left) + formatted + ' '.repeat(Math.max(0, padding - left));
          } else {
            cell = formatted + ' '.repeat(padding);
          }
          
          // Alternate row coloring
          if (rowIdx % 2 === 1 && config.rowAltColor) {
            if (typeof config.rowAltColor === 'string') {
              return c.hex(config.rowAltColor, stripAnsi(cell));
            } else {
              return c.hsl(config.rowAltColor[0], config.rowAltColor[1], config.rowAltColor[2], stripAnsi(cell));
            }
          }
          
          return cell;
        });

        lines.push('│' + cells.join('│') + '│');
      });

      // Bottom border
      lines.push(colorizeBorder('└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘'));

      // Overflow indicator
      if (overflowCount > 0) {
        lines.push(c.dim(`  … and ${overflowCount} more column${overflowCount > 1 ? 's' : ''}`));
      }

      // Update metrics
      const renderTime = performance.now() - startTime;
      metrics.renders++;
      metrics.lastRender = Date.now();
      metrics.avgRenderTime = (metrics.avgRenderTime * (metrics.renders - 1) + renderTime) / metrics.renders;

      return lines.join('\n');
    },

    // Compact mode for dense data
    renderCompact(data: Record<string, any>[]): string {
      if (data.length === 0) return c.dim('(no data)');
      
      const rows = data.map(row => 
        visibleCols.map(col => {
          let val = row[col.key];
          if (col.formatter) val = col.formatter(val, row);
          const header = c.dim(col.header + ':');
          return `${header} ${val}`;
        }).join(' │ ')
      );
      
      if (config.title) {
        return c.bold(colorizeHeader(config.title)) + '\n' + rows.join('\n');
      }
      return rows.join('\n');
    },

    // Get render statistics
    getStats(): TableMetrics {
      return { ...metrics };
    },
  };

  // Helper functions
  function colorizeBorder(str: string): string {
    if (config.borderColor) {
      if (typeof config.borderColor === 'string') {
        return c.hex(config.borderColor, str);
      } else {
        return c.hsl(config.borderColor[0], config.borderColor[1], config.borderColor[2], str);
      }
    }
    // Default: cyan-ish
    return c.hsl(200, 80, 60, str);
  }

  function colorizeHeader(str: string): string {
    if (config.headerColor) {
      if (typeof config.headerColor === 'string') {
        return c.hex(config.headerColor, str);
      } else {
        return c.hsl(config.headerColor[0], config.headerColor[1], config.headerColor[2], str);
      }
    }
    // Default: cyan
    return c.hsl(200, 90, 70, str);
  }
}

// Value formatting
function formatValue(val: any): string {
  if (val === undefined || val === null) return c.dim('-');
  if (typeof val === 'boolean') return val ? c.hsl(120, 80, 60, '✓') : c.hsl(0, 80, 60, '✗');
  if (typeof val === 'number') return val.toLocaleString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

// Pad center with stringWidth awareness
function padCenter(str: string, width: number): string {
  const visibleWidth = stringWidth(stripAnsi(str));
  const padding = Math.max(0, width - visibleWidth);
  const left = Math.floor(padding / 2);
  return ' '.repeat(left) + str + ' '.repeat(Math.max(0, padding - left));
}

// Strip ANSI codes for width calculation
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Truncate string respecting ANSI codes
function truncateString(str: string, maxWidth: number): string {
  let visibleLength = 0;
  let result = '';
  let inAnsi = false;
  
  for (const char of str) {
    if (char === '\x1b') {
      inAnsi = true;
      result += char;
      continue;
    }
    
    if (inAnsi) {
      result += char;
      if (char === 'm') {
        inAnsi = false;
      }
      continue;
    }
    
    if (visibleLength >= maxWidth) break;
    result += char;
    visibleLength += stringWidth(char);
  }
  
  return result;
}

// Export formatters for reuse
export const formatters = {
  // Status badge
  status: (status: string | boolean): string => {
    if (typeof status === 'boolean') {
      return status 
        ? c.hsl(120, 80, 60, '● ACTIVE') 
        : c.hsl(0, 80, 60, '● INACTIVE');
    }
    const map: Record<string, [number, number, number]> = {
      active: [120, 80, 60],
      running: [120, 80, 60],
      healthy: [120, 80, 60],
      completed: [200, 80, 60],
      warning: [45, 90, 60],
      error: [0, 80, 60],
      failed: [0, 80, 60],
      critical: [0, 80, 60],
      inactive: [0, 0, 60],
    };
    const [h, s, l] = map[status.toLowerCase()] || [200, 80, 60];
    return c.hsl(h, s, l, `● ${status.toUpperCase()}`);
  },

  // HTTP method badge
  method: (method: string): string => {
    const colors: Record<string, [number, number, number]> = {
      GET: [200, 80, 60],
      POST: [120, 80, 60],
      PUT: [60, 80, 60],
      PATCH: [180, 80, 60],
      DELETE: [0, 80, 60],
      WS: [280, 80, 60],
      GRPC: [320, 80, 60],
    };
    const [h, s, l] = colors[method.toUpperCase()] || [0, 0, 80];
    return c.hsl(h, s, l, method.toUpperCase());
  },

  // Grade badge
  grade: (grade: string): string => {
    const colors: Record<string, [number, number, number]> = {
      'A+': [120, 90, 60],
      'A': [120, 80, 60],
      'A-': [120, 70, 60],
      'B+': [100, 80, 60],
      'B': [90, 80, 60],
      'B-': [80, 80, 60],
      'C+': [60, 80, 60],
      'C': [50, 80, 60],
      'C-': [40, 80, 60],
      'D': [30, 80, 60],
      'F': [0, 80, 60],
    };
    const [h, s, l] = colors[grade.toUpperCase()] || [0, 0, 80];
    return c.bold(c.hsl(h, s, l, ` ${grade.toUpperCase()} `));
  },

  // Health badge
  health: (status: string): string => {
    const map: Record<string, [string, number, number, number]> = {
      healthy: ['✓', 120, 80, 60],
      warning: ['!', 45, 90, 60],
      critical: ['✗', 0, 80, 60],
      unknown: ['?', 200, 80, 60],
    };
    const [icon, h, s, l] = map[status.toLowerCase()] || ['?', 200, 80, 60];
    return c.hsl(h, s, l, `${icon} ${status.toUpperCase()}`);
  },

  // Trend arrow
  trend: (trend: string): string => {
    const arrows: Record<string, string> = {
      up: c.hsl(120, 80, 60, '↗'),
      down: c.hsl(0, 80, 60, '↘'),
      stable: c.hsl(200, 80, 60, '→'),
    };
    return arrows[trend.toLowerCase()] || '•';
  },

  // Duration
  duration: (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },

  // Bytes
  bytes: (b: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (b > 1024 && i < units.length - 1) {
      b /= 1024;
      i++;
    }
    return `${b.toFixed(1)}${units[i]}`;
  },

  // Latency with color
  latency: (ms: number): string => {
    if (ms < 50) return c.hsl(120, 80, 60, `${ms}ms`);
    if (ms < 200) return c.hsl(60, 80, 60, `${ms}ms`);
    if (ms < 500) return c.hsl(30, 80, 60, `${ms}ms`);
    return c.hsl(0, 80, 60, `${ms}ms`);
  },

  // Throughput
  throughput: (tps: number): string => {
    return tps > 10000 
      ? c.hsl(120, 80, 60, `${(tps / 1000).toFixed(1)}K/s`)
      : `${tps}/s`;
  },

  // Timestamp
  timeAgo: (ts: number): string => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  },

  // Score with color
  score: (score: number): string => {
    if (score >= 90) return c.hsl(120, 80, 60, score.toString());
    if (score >= 70) return c.hsl(60, 80, 60, score.toString());
    if (score >= 50) return c.hsl(30, 80, 60, score.toString());
    return c.hsl(0, 80, 60, score.toString());
  },

  // Variant badge
  variant: (variant: string): string => {
    const colors: Record<string, [number, number, number]> = {
      A: [200, 90, 60],
      B: [280, 90, 60],
      C: [320, 90, 60],
      control: [120, 80, 60],
    };
    const [h, s, l] = colors[variant] || [0, 0, 80];
    return c.hsl(h, s, l, `▣ ${variant}`);
  },

  // Token (masked)
  token: (token: string, visible = 6): string => {
    const visiblePart = token.slice(0, visible);
    return c.hsl(200, 80, 60, '🔒 ') + visiblePart + c.dim('…');
  },
};

// Export color utilities
export { c, hslToRgb };

// Default export
export default createTier1380Table;

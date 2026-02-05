/**
 * string-width.ts - Unicode String Width Utilities
 * Uses Bun.stringWidth() for accurate terminal display width
 *
 * Handles:
 * - Zero-width characters (soft hyphen, word joiner, Arabic formatting, Indic/Thai/Lao marks)
 * - ANSI escape sequences (CSI, OSC including hyperlinks)
 * - Emoji (flags, skin tones, ZWJ sequences, keycaps, variation selectors)
 */

/**
 * Get terminal display width of a string
 * Uses Bun.stringWidth() for accurate Unicode handling
 */
export function stringWidth(str: string): number {
  return Bun.stringWidth(str);
}

/**
 * Pad string to exact terminal width (right-aligned content)
 */
export function padStart(str: string, width: number, char = ' '): string {
  const currentWidth = Bun.stringWidth(str);
  if (currentWidth >= width) return str;
  return char.repeat(width - currentWidth) + str;
}

/**
 * Pad string to exact terminal width (left-aligned content)
 */
export function padEnd(str: string, width: number, char = ' '): string {
  const currentWidth = Bun.stringWidth(str);
  if (currentWidth >= width) return str;
  return str + char.repeat(width - currentWidth);
}

/**
 * Center string within terminal width
 */
export function padCenter(str: string, width: number, char = ' '): string {
  const currentWidth = Bun.stringWidth(str);
  if (currentWidth >= width) return str;

  const totalPadding = width - currentWidth;
  const leftPad = Math.floor(totalPadding / 2);
  const rightPad = totalPadding - leftPad;

  return char.repeat(leftPad) + str + char.repeat(rightPad);
}

/**
 * Truncate string to fit terminal width, adding ellipsis if needed
 */
export function truncate(str: string, maxWidth: number, ellipsis = '…'): string {
  const strWidth = Bun.stringWidth(str);
  if (strWidth <= maxWidth) return str;

  const ellipsisWidth = Bun.stringWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  if (targetWidth <= 0) {
    return ellipsis.slice(0, maxWidth);
  }

  // Build string character by character until we hit target width
  let result = '';
  let currentWidth = 0;

  for (const char of str) {
    const charWidth = Bun.stringWidth(char);
    if (currentWidth + charWidth > targetWidth) break;
    result += char;
    currentWidth += charWidth;
  }

  return result + ellipsis;
}

/**
 * Wrap text to fit terminal width, respecting word boundaries
 */
export function wordWrap(str: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const words = str.split(/(\s+)/);

  let currentLine = '';
  let currentWidth = 0;

  for (const word of words) {
    const wordWidth = Bun.stringWidth(word);

    if (currentWidth + wordWidth <= maxWidth) {
      currentLine += word;
      currentWidth += wordWidth;
    } else if (wordWidth > maxWidth) {
      // Word itself is too long, need to break it
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
        currentWidth = 0;
      }

      // Break long word across lines
      let remaining = word;
      while (Bun.stringWidth(remaining) > maxWidth) {
        const truncated = truncate(remaining, maxWidth, '');
        lines.push(truncated);
        remaining = remaining.slice(truncated.length);
      }
      currentLine = remaining;
      currentWidth = Bun.stringWidth(remaining);
    } else {
      // Start new line
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = word.trimStart();
      currentWidth = Bun.stringWidth(currentLine);
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Format table cell with proper alignment
 */
export function formatCell(
  content: string,
  width: number,
  align: 'left' | 'right' | 'center' = 'left'
): string {
  const truncated = truncate(content, width);

  switch (align) {
    case 'right':
      return padStart(truncated, width);
    case 'center':
      return padCenter(truncated, width);
    default:
      return padEnd(truncated, width);
  }
}

/**
 * Calculate column widths for a table based on content
 */
export function calculateColumnWidths(
  rows: string[][],
  maxTotalWidth?: number,
  minColumnWidth = 3
): number[] {
  if (rows.length === 0) return [];

  const columnCount = Math.max(...rows.map(row => row.length));
  const widths: number[] = new Array(columnCount).fill(0);

  // Find max width for each column
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cellWidth = Bun.stringWidth(row[i] || '');
      widths[i] = Math.max(widths[i], cellWidth, minColumnWidth);
    }
  }

  // If total width exceeds max, proportionally reduce
  if (maxTotalWidth) {
    const separatorWidth = columnCount - 1; // Assuming 1 char separators
    const totalContentWidth = widths.reduce((a, b) => a + b, 0);
    const availableWidth = maxTotalWidth - separatorWidth;

    if (totalContentWidth > availableWidth) {
      const scale = availableWidth / totalContentWidth;
      for (let i = 0; i < widths.length; i++) {
        widths[i] = Math.max(Math.floor(widths[i] * scale), minColumnWidth);
      }
    }
  }

  return widths;
}

/**
 * Strip ANSI escape codes from string
 */
export function stripAnsi(str: string): string {
  // CSI sequences: ESC [ ... final_byte
  // OSC sequences: ESC ] ... (BEL | ESC \)
  // Simple escapes: ESC followed by single char
  return str.replace(
    /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[^[\]]/g,
    ''
  );
}

/**
 * Check if string contains emoji
 */
export function containsEmoji(str: string): boolean {
  // Check if stringWidth differs from character count significantly
  // (emoji are typically 2 columns but 1+ code points)
  const width = Bun.stringWidth(str);
  const stripped = stripAnsi(str);
  const codePoints = [...stripped].length;

  // If width is less than codepoints, likely has ZWJ sequences
  // If any char has width 2, likely has emoji
  for (const char of stripped) {
    if (Bun.stringWidth(char) === 2) return true;
  }

  return false;
}

/**
 * Create a horizontal line/separator
 */
export function horizontalLine(width: number, char = '─'): string {
  const charWidth = Bun.stringWidth(char);
  return char.repeat(Math.floor(width / charWidth));
}

/**
 * Create a progress bar with proper width calculation
 */
export function progressBar(
  value: number,
  max: number,
  width: number,
  filled = '█',
  empty = '░',
  showPercent = true
): string {
  const percent = Math.min(Math.max(value / max, 0), 1);
  const percentStr = showPercent ? ` ${(percent * 100).toFixed(0)}%` : '';
  const percentWidth = Bun.stringWidth(percentStr);

  const barWidth = width - 2 - percentWidth; // 2 for brackets [ ]
  const filledWidth = Math.round(barWidth * percent);
  const emptyWidth = barWidth - filledWidth;

  return `[${filled.repeat(filledWidth)}${empty.repeat(emptyWidth)}]${percentStr}`;
}

/**
 * Create dashboard section header with underline
 */
export function sectionHeader(title: string, width?: number): string {
  const line = width ? horizontalLine(width, '=') : '='.repeat(Bun.stringWidth(title));
  return `${title}\n${line}`;
}

/**
 * Format metric with value and unit, properly aligned
 */
export function formatMetric(
  label: string,
  value: string | number,
  unit?: string,
  labelWidth = 20
): string {
  const valueStr = typeof value === 'number' ? value.toLocaleString() : value;
  const fullValue = unit ? `${valueStr} ${unit}` : valueStr;
  return padEnd(label, labelWidth) + fullValue;
}

/**
 * Create a two-column dashboard layout
 */
export function twoColumnLayout(
  left: string[],
  right: string[],
  totalWidth?: number
): string[] {
  const maxLeftWidth = Math.max(...left.map(line => Bun.stringWidth(line)));
  const separator = '  │  ';
  const result: string[] = [];

  const maxLines = Math.max(left.length, right.length);
  
  for (let i = 0; i < maxLines; i++) {
    const leftLine = left[i] || '';
    const rightLine = right[i] || '';
    const paddedLeft = padEnd(leftLine, maxLeftWidth);
    result.push(paddedLeft + separator + rightLine);
  }

  return result;
}

/**
 * Format financial ticker row
 */
export function formatTickerRow(
  symbol: string,
  price: number,
  change: number,
  changePercent: number,
  volume: number,
  high: number,
  low: number,
  spread: number,
  vwap: number,
  signal: string,
  columnWidths: number[]
): string {
  const data = [
    symbol,
    `$${price.toFixed(2)}`,
    change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2),
    `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
    volume.toLocaleString(),
    `$${high.toFixed(2)}`,
    `$${low.toFixed(2)}`,
    `$${spread.toFixed(2)}`,
    `$${vwap.toFixed(2)}`,
    signal
  ];

  return data.map((cell, i) => formatCell(cell, columnWidths[i], 'left')).join(' ');
}

/**
 * Create table with box drawing characters
 */
export function createTable(
  headers: string[],
  rows: string[][],
  options: { 
    showHeaders?: boolean; 
    colors?: boolean;
    maxWidth?: number;
  } = {}
): string {
  const { showHeaders = true, colors = false, maxWidth } = options;
  
  const allRows = showHeaders ? [headers, ...rows] : rows;
  const columnWidths = calculateColumnWidths(allRows, maxWidth);
  
  const horizontal = (char = '─') => 
    '┌' + columnWidths.map(w => char.repeat(w)).join('┬') + '┐';
  const separator = (char = '─') => 
    '├' + columnWidths.map(w => char.repeat(w)).join('┼') + '┤';
  const bottom = (char = '─') => 
    '└' + columnWidths.map(w => char.repeat(w)).join('┴') + '┘';
  
  const result: string[] = [horizontal()];
  
  if (showHeaders) {
    const headerRow = '│' + headers.map((h, i) => 
      formatCell(h, columnWidths[i], 'center')
    ).join('│') + '│';
    result.push(headerRow);
    result.push(separator());
  }
  
  for (const row of rows) {
    const dataRow = '│' + row.map((cell, i) => 
      formatCell(cell, columnWidths[i], 'left')
    ).join('│') + '│';
    result.push(dataRow);
  }
  
  result.push(bottom());
  return result.join('\n');
}

/**
 * Format network interface information
 */
export function formatNetworkInterface(
  interfaceName: string,
  family: string,
  address: string,
  type: string,
  netmask: string,
  cidr: string,
  mac: string,
  scope: string,
  internal: string,
  status: string,
  columnWidths: number[]
): string {
  const data = [
    interfaceName,
    family,
    address,
    type,
    netmask,
    cidr,
    mac,
    scope,
    internal,
    status
  ];

  return data.map((cell, i) => formatCell(cell, columnWidths[i], 'left')).join('\t');
}

/**
 * Format health status with color indicators
 */
export function formatHealthStatus(
  component: string,
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DEGRADED',
  componentWidth = 15
): string {
  const statusIcons = {
    HEALTHY: '✓',
    WARNING: '⚠',
    CRITICAL: '✗',
    DEGRADED: '◐'
  };
  
  const icon = statusIcons[status];
  return padEnd(component, componentWidth) + `${icon} ${status}`;
}

/**
 * Create dashboard summary box
 */
export function createSummaryBox(
  title: string,
  content: string[],
  width = 50
): string {
  const titleLine = padCenter(title, width, '═');
  const contentLines = content.map(line => 
    `║ ${padEnd(line, width - 4)} ║`
  );
  
  const top = `╔${'═'.repeat(width - 2)}╗`;
  const bottom = `╚${'═'.repeat(width - 2)}╝`;
  
  return [top, titleLine, top, ...contentLines, bottom].join('\n');
}

// Export as namespace for convenient access
export const StringWidth = {
  width: stringWidth,
  padStart,
  padEnd,
  padCenter,
  truncate,
  wordWrap,
  formatCell,
  calculateColumnWidths,
  stripAnsi,
  containsEmoji,
  horizontalLine,
  progressBar,
  sectionHeader,
  formatMetric,
  twoColumnLayout,
  formatTickerRow,
  createTable,
  formatNetworkInterface,
  formatHealthStatus,
  createSummaryBox
};

export default StringWidth;

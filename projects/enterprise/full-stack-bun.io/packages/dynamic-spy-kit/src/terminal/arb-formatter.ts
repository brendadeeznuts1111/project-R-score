/**
 * @dynamic-spy/kit - Arb Display Formatter
 *
 * High-level arb visualization components
 * Compact/detailed formats, dashboard grids, real-time displays
 */

import {
  type ArbColor,
  RESET,
  STYLE,
  BRIGHT,
  GREENS,
  REDS,
  YELLOWS,
  CYANS,
  GRAYS,
  pad,
  width,
  strip,
} from '../colors/bright-ansi';

import {
  EDGE,
  BOOK,
  STATUS,
  ARROWS,
  BOX,
  BLOCKS,
  edgeColor,
  bookColor,
  latencyColor,
  formatEdge,
  formatMoney,
  formatOdds,
  formatLatency,
  formatStatus,
  formatSteam,
  formatBook,
  sparkline,
  hline,
  box,
  type ColorFlags,
  ColorDataView,
} from '../colors/arb-colors';

import {
  edgeGradient,
  latencyGradient,
  ageGradient,
  gradientSparkline,
  EDGE_GRADIENT,
} from '../colors/gradients';

import {
  cursor,
  screen,
  colorize,
  bold,
  dim,
  LiveRenderer,
  sectionBox,
  header,
  divider,
  renderTable,
  type TableColumn,
} from './ansi-renderer';

// ============================================================================
// 1. ARB DATA TYPES
// ============================================================================

export interface ArbOpportunity {
  id: string;                    // UUIDv7
  market: string;                // "LAL@GSW"
  betType: string;               // "ML", "Spread", "Total"
  quarter?: string;              // "Q1", "Q2", "H1", "Full"

  bookA: {
    name: string;
    type: 'sharp' | 'square' | 'exchange' | 'asian' | 'offshore';
    odds: number;
    stake?: number;
  };

  bookB: {
    name: string;
    type: 'sharp' | 'square' | 'exchange' | 'asian' | 'offshore';
    odds: number;
    stake?: number;
  };

  edge: number;                  // Decimal (0.02 = 2%)
  profit: number;                // USD
  confidence: number;            // 0-1

  isSteam: boolean;
  isLive: boolean;
  status: 'live' | 'pending' | 'confirmed' | 'stale' | 'expired';

  detectedAt: number;            // Unix timestamp ms
  lastUpdate: number;            // Unix timestamp ms
  latencyMs: number;             // Detection latency

  priceHistory?: number[];       // For sparkline
}

// ============================================================================
// 2. COMPACT FORMAT
// ============================================================================

/**
 * Single-line compact arb display
 *
 * Example:
 * [+2.34%] LAL@GSW ML │ PIN 1.95 → DK 2.08 │ $847 │ STEAM
 */
export function formatArbCompact(arb: ArbOpportunity): string {
  const parts: string[] = [];

  // Edge with color
  parts.push('[' + formatEdge(arb.edge, 6) + ']');

  // Market and bet type
  const marketColor = arb.isLive ? BRIGHT.WHITE : GRAYS.GRAY_14;
  parts.push(colorize(arb.market, marketColor));
  parts.push(dim(arb.betType));

  // Separator
  parts.push(GRAYS.GRAY_8.ansi + '│' + RESET);

  // Books and odds
  parts.push(
    formatBook(arb.bookA.name, arb.bookA.type) + ' ' +
    formatOdds(arb.bookA.odds, arb.bookA.type) +
    GRAYS.GRAY_10.ansi + ' → ' + RESET +
    formatBook(arb.bookB.name, arb.bookB.type) + ' ' +
    formatOdds(arb.bookB.odds, arb.bookB.type)
  );

  // Separator
  parts.push(GRAYS.GRAY_8.ansi + '│' + RESET);

  // Profit
  parts.push(formatMoney(arb.profit));

  // Steam indicator
  if (arb.isSteam) {
    parts.push(GRAYS.GRAY_8.ansi + '│' + RESET);
    parts.push(formatSteam(true));
  }

  // Live indicator
  if (arb.isLive) {
    parts.push(STYLE.BLINK + BRIGHT.RED.ansi + '●' + RESET + dim(' LIVE'));
  }

  return parts.join(' ');
}

// ============================================================================
// 3. DETAILED FORMAT
// ============================================================================

/**
 * Multi-line detailed arb box
 *
 * ┌─────────────────────────────────────────────────────┐
 * │ ARB-0192ce11  │ +2.34% │ $847.32 │ STEAM ✓ │ LIVE  │
 * ├─────────────────────────────────────────────────────┤
 * │ LAL @ GSW │ Moneyline │ Q2 │ Conf: 94%             │
 * │ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅ (price history)               │
 * ├─────────────────────────────────────────────────────┤
 * │ PIN (sharp):  1.95  │ Stake: $1,234.56             │
 * │ DK (square):  2.08  │ Stake: $1,187.44             │
 * ├─────────────────────────────────────────────────────┤
 * │ Latency: 47ms │ Age: 2.3s │ Updated: 12:34:56      │
 * └─────────────────────────────────────────────────────┘
 */
export function formatArbDetailed(arb: ArbOpportunity, boxWidth = 55): string {
  const lines: string[] = [];
  const innerWidth = boxWidth - 4;
  const bc = GRAYS.GRAY_12; // Border color

  // Helper to pad content line
  const contentLine = (content: string): string => {
    const stripped = strip(content);
    const contentWidth = Bun.stringWidth(stripped);
    const padding = Math.max(0, innerWidth - contentWidth);
    return bc.ansi + '│ ' + RESET + content + ' '.repeat(padding) + bc.ansi + ' │' + RESET;
  };

  // Top border
  lines.push(bc.ansi + '┌' + '─'.repeat(boxWidth - 2) + '┐' + RESET);

  // Header row: ID | Edge | Profit | Steam | Status
  const headerId = dim('ARB-') + colorize(arb.id.slice(0, 8), BRIGHT.CYAN);
  const headerEdge = formatEdge(arb.edge, 6);
  const headerProfit = formatMoney(arb.profit);
  const headerSteam = arb.isSteam ? (EDGE.STEAM.ansi + '✓ STEAM' + RESET) : dim('─────');
  const headerStatus = formatStatus(arb.status);

  lines.push(contentLine(
    headerId + ' │ ' + headerEdge + ' │ ' + headerProfit + ' │ ' + headerSteam + ' │ ' + headerStatus
  ));

  // Divider
  lines.push(bc.ansi + '├' + '─'.repeat(boxWidth - 2) + '┤' + RESET);

  // Market info row
  const marketInfo = [
    colorize(arb.market, BRIGHT.WHITE),
    dim(arb.betType),
    arb.quarter ? dim(arb.quarter) : '',
    'Conf: ' + formatConfidence(arb.confidence),
  ].filter(Boolean).join(' │ ');
  lines.push(contentLine(marketInfo));

  // Price history sparkline (if available)
  if (arb.priceHistory && arb.priceHistory.length > 0) {
    const spark = gradientSparkline(arb.priceHistory, EDGE_GRADIENT);
    lines.push(contentLine(spark + dim(' (price history)')));
  }

  // Divider
  lines.push(bc.ansi + '├' + '─'.repeat(boxWidth - 2) + '┤' + RESET);

  // Book A row
  const bookALabel = formatBook(arb.bookA.name, arb.bookA.type) +
                     dim(` (${arb.bookA.type}):`);
  const bookAOdds = formatOdds(arb.bookA.odds, arb.bookA.type);
  const bookAStake = arb.bookA.stake ? 'Stake: ' + formatMoney(arb.bookA.stake) : '';
  lines.push(contentLine(pad(bookALabel, 18) + bookAOdds + '  │ ' + bookAStake));

  // Book B row
  const bookBLabel = formatBook(arb.bookB.name, arb.bookB.type) +
                     dim(` (${arb.bookB.type}):`);
  const bookBOdds = formatOdds(arb.bookB.odds, arb.bookB.type);
  const bookBStake = arb.bookB.stake ? 'Stake: ' + formatMoney(arb.bookB.stake) : '';
  lines.push(contentLine(pad(bookBLabel, 18) + bookBOdds + '  │ ' + bookBStake));

  // Divider
  lines.push(bc.ansi + '├' + '─'.repeat(boxWidth - 2) + '┤' + RESET);

  // Timing row
  const now = Date.now();
  const ageMs = now - arb.detectedAt;
  const ageColor = ageGradient(ageMs, 30000);

  const timingParts = [
    'Latency: ' + formatLatency(arb.latencyMs),
    'Age: ' + ageColor.ansi + formatAge(ageMs) + RESET,
    'Updated: ' + dim(formatTime(arb.lastUpdate)),
  ];
  lines.push(contentLine(timingParts.join(' │ ')));

  // Bottom border
  lines.push(bc.ansi + '└' + '─'.repeat(boxWidth - 2) + '┘' + RESET);

  return lines.join('\n');
}

// ============================================================================
// 4. DASHBOARD TABLE
// ============================================================================

/**
 * Multi-arb dashboard table
 */
export function formatArbTable(arbs: ArbOpportunity[]): string {
  const columns: TableColumn[] = [
    {
      header: 'ID',
      width: 10,
      align: 'left',
      headerColor: BRIGHT.CYAN,
      cellColor: () => CYANS.AQUA,
    },
    {
      header: 'Edge',
      width: 7,
      align: 'right',
      headerColor: BRIGHT.GREEN,
      cellColor: (value) => edgeColor(value as number),
    },
    {
      header: 'Market',
      width: 12,
      align: 'left',
      headerColor: BRIGHT.WHITE,
    },
    {
      header: 'Type',
      width: 6,
      align: 'center',
      headerColor: GRAYS.GRAY_14,
    },
    {
      header: 'Book A',
      width: 10,
      align: 'left',
      headerColor: CYANS.BRIGHT,
    },
    {
      header: 'Odds A',
      width: 6,
      align: 'right',
      headerColor: CYANS.AQUA,
    },
    {
      header: 'Book B',
      width: 10,
      align: 'left',
      headerColor: YELLOWS.ORANGE,
    },
    {
      header: 'Odds B',
      width: 6,
      align: 'right',
      headerColor: YELLOWS.TANGERINE,
    },
    {
      header: 'Profit',
      width: 10,
      align: 'right',
      headerColor: GREENS.BRIGHT,
      cellColor: (value) => (value as number) >= 0 ? GREENS.BRIGHT : REDS.BRIGHT,
    },
    {
      header: 'Status',
      width: 8,
      align: 'center',
      headerColor: BRIGHT.WHITE,
    },
  ];

  const getValue = (arb: ArbOpportunity, colIndex: number): unknown => {
    switch (colIndex) {
      case 0: return arb.id.slice(0, 8);
      case 1: return arb.edge;
      case 2: return arb.market;
      case 3: return arb.betType;
      case 4: return arb.bookA.name;
      case 5: return arb.bookA.odds.toFixed(2);
      case 6: return arb.bookB.name;
      case 7: return arb.bookB.odds.toFixed(2);
      case 8: return arb.profit;
      case 9: return arb.status.toUpperCase();
      default: return '';
    }
  };

  return renderTable(arbs, getValue, {
    columns,
    showBorder: true,
    showHeader: true,
    borderColor: GRAYS.GRAY_10,
    alternateRowStyle: { bg: GRAYS.GRAY_2 },
  });
}

// ============================================================================
// 5. DASHBOARD SUMMARY
// ============================================================================

export interface DashboardStats {
  totalArbs: number;
  liveArbs: number;
  steamArbs: number;
  totalProfit: number;
  avgEdge: number;
  avgLatency: number;
  topBooks: { name: string; count: number }[];
}

/**
 * Dashboard header with stats
 */
export function formatDashboardHeader(stats: DashboardStats): string {
  const lines: string[] = [];

  // Title
  lines.push(header('ARB DASHBOARD', BRIGHT.CYAN));
  lines.push('');

  // Stats row 1
  const statsLine1 = [
    bold('Active:') + ' ' + colorize(String(stats.totalArbs), BRIGHT.WHITE),
    bold('Live:') + ' ' + colorize(String(stats.liveArbs), stats.liveArbs > 0 ? BRIGHT.RED : GRAYS.GRAY_10),
    bold('Steam:') + ' ' + colorize(String(stats.steamArbs), stats.steamArbs > 0 ? EDGE.STEAM : GRAYS.GRAY_10),
  ].join('  │  ');
  lines.push(statsLine1);

  // Stats row 2
  const statsLine2 = [
    bold('Profit:') + ' ' + formatMoney(stats.totalProfit),
    bold('Avg Edge:') + ' ' + formatEdge(stats.avgEdge),
    bold('Avg Latency:') + ' ' + formatLatency(stats.avgLatency),
  ].join('  │  ');
  lines.push(statsLine2);

  // Top books
  if (stats.topBooks.length > 0) {
    const booksLine = bold('Top Books:') + ' ' +
      stats.topBooks.slice(0, 5).map(b =>
        colorize(b.name, CYANS.AQUA) + dim(`(${b.count})`)
      ).join(', ');
    lines.push(booksLine);
  }

  lines.push('');
  lines.push(divider());

  return lines.join('\n');
}

// ============================================================================
// 6. LIVE ARBS RENDERER
// ============================================================================

export class ArbDashboard {
  private renderer = new LiveRenderer();
  private arbs: ArbOpportunity[] = [];
  private stats: DashboardStats = {
    totalArbs: 0,
    liveArbs: 0,
    steamArbs: 0,
    totalProfit: 0,
    avgEdge: 0,
    avgLatency: 0,
    topBooks: [],
  };

  /**
   * Update arbs and re-render
   */
  update(arbs: ArbOpportunity[]): void {
    this.arbs = arbs;
    this.calculateStats();
    this.render();
  }

  /**
   * Add single arb with flash effect
   */
  addArb(arb: ArbOpportunity): void {
    this.arbs.unshift(arb);
    this.calculateStats();
    this.render();
  }

  /**
   * Remove arb by ID
   */
  removeArb(id: string): void {
    this.arbs = this.arbs.filter(a => a.id !== id);
    this.calculateStats();
    this.render();
  }

  private calculateStats(): void {
    const bookCounts = new Map<string, number>();

    this.stats = {
      totalArbs: this.arbs.length,
      liveArbs: this.arbs.filter(a => a.isLive).length,
      steamArbs: this.arbs.filter(a => a.isSteam).length,
      totalProfit: this.arbs.reduce((sum, a) => sum + a.profit, 0),
      avgEdge: this.arbs.length > 0
        ? this.arbs.reduce((sum, a) => sum + a.edge, 0) / this.arbs.length
        : 0,
      avgLatency: this.arbs.length > 0
        ? this.arbs.reduce((sum, a) => sum + a.latencyMs, 0) / this.arbs.length
        : 0,
      topBooks: [],
    };

    // Count books
    for (const arb of this.arbs) {
      bookCounts.set(arb.bookA.name, (bookCounts.get(arb.bookA.name) || 0) + 1);
      bookCounts.set(arb.bookB.name, (bookCounts.get(arb.bookB.name) || 0) + 1);
    }

    this.stats.topBooks = [...bookCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  private render(): void {
    const lines: string[] = [];

    // Header with stats
    lines.push(...formatDashboardHeader(this.stats).split('\n'));

    // Arb table (top 20)
    if (this.arbs.length > 0) {
      lines.push(formatArbTable(this.arbs.slice(0, 20)));
    } else {
      lines.push(dim('  No active arbitrage opportunities'));
    }

    // Footer with timestamp
    lines.push('');
    lines.push(dim(`  Last update: ${formatTime(Date.now())} │ Press Ctrl+C to exit`));

    this.renderer.update(lines);
  }

  /**
   * Clear display
   */
  clear(): void {
    this.renderer.clear();
  }
}

// ============================================================================
// 7. HELPER FORMATTERS
// ============================================================================

function formatConfidence(confidence: number): string {
  const pct = (confidence * 100).toFixed(0) + '%';
  const color = confidence >= 0.9 ? GREENS.BRIGHT
    : confidence >= 0.7 ? GREENS.EMERALD
    : confidence >= 0.5 ? YELLOWS.GOLD
    : REDS.BRIGHT;
  return color.ansi + pct + RESET;
}

function formatAge(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function colorize(text: string, color: ArbColor): string {
  return color.ansi + text + RESET;
}

// ============================================================================
// 8. BINARY PROTOCOL INTEGRATION
// ============================================================================

/**
 * Extract arb display color from binary market record
 */
export function getArbColorFromBinary(
  buffer: ArrayBuffer,
  offset: number
): { color: ArbColor; flags: import('../colors/arb-colors').ColorFlags } {
  const view = new DataView(buffer);
  return ColorDataView.get(view, offset);
}

/**
 * Set arb display color in binary market record
 */
export function setArbColorInBinary(
  buffer: ArrayBuffer,
  offset: number,
  arb: ArbOpportunity
): void {
  const view = new DataView(buffer);
  const color = edgeGradient(arb.edge);
  const flags: import('../colors/arb-colors').ColorFlags = {
    isProfit: arb.edge > 0,
    isSteam: arb.isSteam,
    isLive: arb.isLive,
    isSharp: arb.bookA.type === 'sharp' || arb.bookB.type === 'sharp',
    intensity: Math.min(15, Math.round(Math.abs(arb.edge) * 100)),
  };

  ColorDataView.set(view, offset, color, flags);
}

// ============================================================================
// 9. EXPORTS
// ============================================================================

export {
  formatArbCompact,
  formatArbDetailed,
  formatArbTable,
  formatDashboardHeader,
  ArbDashboard,
  type ArbOpportunity,
  type DashboardStats,
};

/**
 * Terminal Dashboard
 * Real-time sportsbook monitoring with Bun v1.3.5+ terminal APIs
 *
 * Features:
 * - Live odds feed display
 * - Buffer tracking metrics
 * - Performance telemetry
 * - OSC 8 hyperlinks for market URLs
 *
 * @module monitoring/terminal-dashboard
 */

import { TerminalStringWidth } from '../terminal/string-width-wrapper';
import { HyperlinkManager } from '../terminal/hyperlink-manager';
import { HalfLifeHeatmapPanel, type HeatmapPanelConfig } from './panels/half-life-heatmap';
import { PropagationAlertsPanel, type AlertsPanelConfig } from './panels/propagation-alerts';
import type { PropagationHeatmap, DetectedPattern } from '../sportsbook/propagation/types';

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  /** Refresh interval in milliseconds (default: 100) */
  readonly refreshIntervalMs?: number;
  /** Maximum rows to display (default: 20) */
  readonly maxRows?: number;
  /** Enable hyperlinks (default: true) */
  readonly enableHyperlinks?: boolean;
  /** Show buffer metrics (default: true) */
  readonly showBufferMetrics?: boolean;
  /** Show performance metrics (default: true) */
  readonly showPerformanceMetrics?: boolean;
  /** Terminal width override (auto-detect if not set) */
  readonly terminalWidth?: number;
  /** Show propagation heatmap (default: false) */
  readonly showPropagationHeatmap?: boolean;
  /** Show propagation alerts (default: false) */
  readonly showPropagationAlerts?: boolean;
  /** Heatmap panel configuration */
  readonly heatmapConfig?: Partial<HeatmapPanelConfig>;
  /** Alerts panel configuration */
  readonly alertsConfig?: Partial<AlertsPanelConfig>;
}

/**
 * Market data for display
 */
export interface MarketDisplayData {
  readonly marketId: string;
  readonly name: string;
  readonly status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  readonly selections: readonly SelectionDisplayData[];
  readonly url?: string;
}

/**
 * Selection data for display
 */
export interface SelectionDisplayData {
  readonly selectionId: string;
  readonly name: string;
  readonly odds: number;
  readonly previousOdds?: number;
  readonly volume?: number;
}

/**
 * Buffer metrics for display
 */
export interface BufferMetrics {
  readonly activeCount: number;
  readonly totalAllocatedBytes: number;
  readonly potentialLeaks: number;
  readonly byType?: Record<string, { count: number; bytes: number }>;
}

/**
 * Performance metrics for display
 */
export interface PerformanceMetrics {
  readonly throughput: number;
  readonly p99LatencyMs: number;
  readonly messagesSent: number;
  readonly uptime: number;
  readonly clients: number;
}

/**
 * Dashboard state
 */
interface DashboardState {
  markets: MarketDisplayData[];
  bufferMetrics: BufferMetrics | null;
  performanceMetrics: PerformanceMetrics | null;
  propagationHeatmap: PropagationHeatmap | null;
  lastUpdate: number;
  frameCount: number;
}

/**
 * ANSI color codes
 */
const COLORS = {
  // Reset
  RESET: '\x1b[0m',
  // Foreground
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  // Bright foreground
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_CYAN: '\x1b[96m',
  // Background
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  // Styles
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERLINE: '\x1b[4m',
} as const;

/**
 * Terminal control sequences
 */
const TERMINAL = {
  CLEAR_SCREEN: '\x1b[2J',
  CURSOR_HOME: '\x1b[H',
  CURSOR_HIDE: '\x1b[?25l',
  CURSOR_SHOW: '\x1b[?25h',
  CLEAR_LINE: '\x1b[2K',
  SAVE_CURSOR: '\x1b[s',
  RESTORE_CURSOR: '\x1b[u',
} as const;

/**
 * TerminalDashboard
 * Real-time terminal UI for sportsbook monitoring
 */
export class TerminalDashboard {
  private readonly config: Required<Omit<DashboardConfig, 'heatmapConfig' | 'alertsConfig'>> & {
    heatmapConfig: Partial<HeatmapPanelConfig>;
    alertsConfig: Partial<AlertsPanelConfig>;
  };
  private readonly stringWidth: TerminalStringWidth;
  private readonly hyperlinkManager: HyperlinkManager;
  private readonly state: DashboardState;
  private readonly heatmapPanel: HalfLifeHeatmapPanel;
  private readonly alertsPanel: PropagationAlertsPanel;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(config: DashboardConfig = {}) {
    this.config = {
      refreshIntervalMs: config.refreshIntervalMs ?? 100,
      maxRows: config.maxRows ?? 20,
      enableHyperlinks: config.enableHyperlinks ?? true,
      showBufferMetrics: config.showBufferMetrics ?? true,
      showPerformanceMetrics: config.showPerformanceMetrics ?? true,
      terminalWidth: config.terminalWidth ?? this.detectTerminalWidth(),
      showPropagationHeatmap: config.showPropagationHeatmap ?? false,
      showPropagationAlerts: config.showPropagationAlerts ?? false,
      heatmapConfig: config.heatmapConfig ?? {},
      alertsConfig: config.alertsConfig ?? {},
    };

    this.stringWidth = new TerminalStringWidth();
    this.hyperlinkManager = HyperlinkManager.getInstance();

    // Initialize propagation panels
    this.heatmapPanel = new HalfLifeHeatmapPanel({
      width: this.config.terminalWidth,
      ...this.config.heatmapConfig,
    });
    this.alertsPanel = new PropagationAlertsPanel({
      width: this.config.terminalWidth,
      ...this.config.alertsConfig,
    });

    this.state = {
      markets: [],
      bufferMetrics: null,
      performanceMetrics: null,
      propagationHeatmap: null,
      lastUpdate: 0,
      frameCount: 0,
    };
  }

  /**
   * Start the dashboard
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    process.stdout.write(TERMINAL.CURSOR_HIDE);
    process.stdout.write(TERMINAL.CLEAR_SCREEN);

    this.intervalId = setInterval(() => {
      this.render();
      this.state.frameCount++;
    }, this.config.refreshIntervalMs);

    // Handle terminal resize
    process.on('SIGWINCH', () => {
      (this.config as { terminalWidth: number }).terminalWidth = this.detectTerminalWidth();
    });
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    process.stdout.write(TERMINAL.CURSOR_SHOW);
    process.stdout.write('\n');
  }

  /**
   * Update market data
   */
  updateMarkets(markets: MarketDisplayData[]): void {
    this.state.markets = markets;
    this.state.lastUpdate = Date.now();
  }

  /**
   * Update buffer metrics
   */
  updateBufferMetrics(metrics: BufferMetrics): void {
    this.state.bufferMetrics = metrics;
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(metrics: PerformanceMetrics): void {
    this.state.performanceMetrics = metrics;
  }

  /**
   * Update propagation heatmap data
   */
  updatePropagationHeatmap(heatmap: PropagationHeatmap): void {
    this.state.propagationHeatmap = heatmap;
    this.heatmapPanel.update(heatmap);
  }

  /**
   * Add propagation pattern alert
   */
  addPropagationAlert(pattern: DetectedPattern): void {
    this.alertsPanel.addAlert(pattern);
  }

  /**
   * Expire propagation pattern
   */
  expirePropagationPattern(patternId: number): void {
    this.alertsPanel.expirePattern(patternId as any);
  }

  /**
   * Get propagation panels for external access
   */
  getPropagationPanels(): { heatmap: HalfLifeHeatmapPanel; alerts: PropagationAlertsPanel } {
    return { heatmap: this.heatmapPanel, alerts: this.alertsPanel };
  }

  /**
   * Check if dashboard is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current state (for testing)
   */
  getState(): Readonly<DashboardState> {
    return { ...this.state };
  }

  /**
   * Render the dashboard
   */
  private render(): void {
    const lines: string[] = [];
    const width = this.config.terminalWidth;

    // Header
    lines.push(this.renderHeader(width));
    lines.push(this.renderSeparator(width, '='));

    // Performance metrics
    if (this.config.showPerformanceMetrics && this.state.performanceMetrics) {
      lines.push(this.renderPerformanceMetrics(width));
      lines.push(this.renderSeparator(width));
    }

    // Buffer metrics
    if (this.config.showBufferMetrics && this.state.bufferMetrics) {
      lines.push(this.renderBufferMetrics(width));
      lines.push(this.renderSeparator(width));
    }

    // Propagation heatmap
    if (this.config.showPropagationHeatmap) {
      const heatmapOutput = this.heatmapPanel.render();
      lines.push(...heatmapOutput.split('\n'));
      lines.push(this.renderSeparator(width));
    }

    // Propagation alerts
    if (this.config.showPropagationAlerts) {
      const alertsOutput = this.alertsPanel.render();
      lines.push(...alertsOutput.split('\n'));
      lines.push(this.renderSeparator(width));
    }

    // Markets
    lines.push(this.renderMarketsHeader(width));
    const marketLines = this.renderMarkets(width);
    lines.push(...marketLines);

    // Footer
    lines.push(this.renderSeparator(width, '='));
    lines.push(this.renderFooter(width));

    // Output
    process.stdout.write(TERMINAL.CURSOR_HOME);
    for (const line of lines) {
      process.stdout.write(line + TERMINAL.CLEAR_LINE + '\n');
    }
  }

  /**
   * Render header
   */
  private renderHeader(width: number): string {
    const title = `${COLORS.BOLD}${COLORS.CYAN}SPORTSBOOK LIVE FEED${COLORS.RESET}`;
    const timestamp = new Date().toISOString().slice(11, 23);
    const timeStr = `${COLORS.DIM}${timestamp}${COLORS.RESET}`;

    const titleWidth = this.stringWidth.widthWithoutAnsi(title);
    const padding = width - titleWidth - 13; // timestamp length

    return title + ' '.repeat(Math.max(0, padding)) + timeStr;
  }

  /**
   * Render separator line
   */
  private renderSeparator(width: number, char: string = '-'): string {
    return `${COLORS.DIM}${char.repeat(width)}${COLORS.RESET}`;
  }

  /**
   * Render performance metrics
   */
  private renderPerformanceMetrics(width: number): string {
    const pm = this.state.performanceMetrics!;

    const parts = [
      `${COLORS.BRIGHT_CYAN}Throughput:${COLORS.RESET} ${pm.throughput.toFixed(0)}/s`,
      `${COLORS.BRIGHT_CYAN}P99:${COLORS.RESET} ${pm.p99LatencyMs.toFixed(2)}ms`,
      `${COLORS.BRIGHT_CYAN}Messages:${COLORS.RESET} ${this.formatNumber(pm.messagesSent)}`,
      `${COLORS.BRIGHT_CYAN}Clients:${COLORS.RESET} ${pm.clients}`,
      `${COLORS.BRIGHT_CYAN}Uptime:${COLORS.RESET} ${this.formatUptime(pm.uptime)}`,
    ];

    return parts.join('  |  ');
  }

  /**
   * Render buffer metrics
   */
  private renderBufferMetrics(width: number): string {
    const bm = this.state.bufferMetrics!;

    const leakColor = bm.potentialLeaks > 0 ? COLORS.BRIGHT_RED : COLORS.GREEN;
    const parts = [
      `${COLORS.MAGENTA}Buffers:${COLORS.RESET} ${bm.activeCount}`,
      `${COLORS.MAGENTA}Allocated:${COLORS.RESET} ${this.formatBytes(bm.totalAllocatedBytes)}`,
      `${leakColor}Leaks:${COLORS.RESET} ${bm.potentialLeaks}`,
    ];

    // Add type breakdown if available
    if (bm.byType) {
      const typeStr = Object.entries(bm.byType)
        .map(([type, stats]) => `${type}:${stats.count}`)
        .join(' ');
      if (typeStr) {
        parts.push(`${COLORS.DIM}[${typeStr}]${COLORS.RESET}`);
      }
    }

    return parts.join('  |  ');
  }

  /**
   * Render markets header
   */
  private renderMarketsHeader(width: number): string {
    const cols = [
      { label: 'MARKET', width: 30 },
      { label: 'STATUS', width: 10 },
      { label: 'SELECTION', width: 20 },
      { label: 'ODDS', width: 10 },
      { label: 'CHANGE', width: 10 },
      { label: 'VOLUME', width: 12 },
    ];

    const header = cols
      .map(c => this.stringWidth.pad(c.label, c.width))
      .join(' ');

    return `${COLORS.BOLD}${COLORS.BLUE}${header}${COLORS.RESET}`;
  }

  /**
   * Render markets
   */
  private renderMarkets(width: number): string[] {
    const lines: string[] = [];
    let rowCount = 0;

    for (const market of this.state.markets) {
      if (rowCount >= this.config.maxRows) break;

      // Market row
      const statusColor = this.getStatusColor(market.status);
      const marketName = this.config.enableHyperlinks && market.url
        ? this.hyperlinkManager.createWithFallback(market.url, market.name)
        : market.name;

      for (let i = 0; i < market.selections.length && rowCount < this.config.maxRows; i++) {
        const sel = market.selections[i];
        const isFirstRow = i === 0;

        const row = this.renderSelectionRow(
          isFirstRow ? marketName : '',
          isFirstRow ? market.status : '',
          statusColor,
          sel
        );

        lines.push(row);
        rowCount++;
      }
    }

    // Fill remaining rows if needed
    while (rowCount < Math.min(5, this.config.maxRows)) {
      lines.push(COLORS.DIM + '-'.repeat(width) + COLORS.RESET);
      rowCount++;
    }

    return lines;
  }

  /**
   * Render a single selection row
   */
  private renderSelectionRow(
    marketName: string,
    status: string,
    statusColor: string,
    sel: SelectionDisplayData
  ): string {
    const cols = [
      this.stringWidth.truncate(marketName, 30),
      status ? `${statusColor}${this.stringWidth.pad(status, 10)}${COLORS.RESET}` : ' '.repeat(10),
      this.stringWidth.truncate(sel.name, 20),
      this.formatOdds(sel.odds),
      this.formatOddsChange(sel.odds, sel.previousOdds),
      sel.volume !== undefined ? this.formatNumber(sel.volume).padStart(12) : ' '.repeat(12),
    ];

    return cols.join(' ');
  }

  /**
   * Render footer
   */
  private renderFooter(width: number): string {
    const fps = 1000 / this.config.refreshIntervalMs;
    const age = Date.now() - this.state.lastUpdate;
    const ageColor = age > 1000 ? COLORS.YELLOW : COLORS.GREEN;

    const left = `${COLORS.DIM}Frame: ${this.state.frameCount} | ${fps.toFixed(0)} FPS${COLORS.RESET}`;
    const right = `${ageColor}Data age: ${age}ms${COLORS.RESET}  ${COLORS.DIM}Press Ctrl+C to exit${COLORS.RESET}`;

    const leftWidth = this.stringWidth.widthWithoutAnsi(left);
    const rightWidth = this.stringWidth.widthWithoutAnsi(right);
    const padding = width - leftWidth - rightWidth;

    return left + ' '.repeat(Math.max(0, padding)) + right;
  }

  /**
   * Format odds display
   */
  private formatOdds(odds: number | undefined): string {
    if (odds === undefined || odds === null || isNaN(odds)) {
      return ' '.repeat(8);
    }
    return `${COLORS.WHITE}${odds.toFixed(2).padStart(8)}${COLORS.RESET}`;
  }

  /**
   * Format odds change indicator
   */
  private formatOddsChange(current: number | undefined, previous?: number): string {
    if (current === undefined || previous === undefined) return ' '.repeat(10);

    const diff = current - previous;
    if (Math.abs(diff) < 0.01) {
      return `${COLORS.DIM}  -----  ${COLORS.RESET}`;
    }

    const sign = diff > 0 ? '+' : '';
    const color = diff > 0 ? COLORS.GREEN : COLORS.RED;
    const arrow = diff > 0 ? '↑' : '↓';

    return `${color}${arrow} ${sign}${diff.toFixed(2).padStart(6)}${COLORS.RESET}`;
  }

  /**
   * Get status color
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE': return COLORS.GREEN;
      case 'SUSPENDED': return COLORS.YELLOW;
      case 'CLOSED': return COLORS.RED;
      default: return COLORS.WHITE;
    }
  }

  /**
   * Format byte count
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
  }

  /**
   * Format number with K/M suffix
   */
  private formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(1)}M`;
  }

  /**
   * Format uptime
   */
  private formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  /**
   * Detect terminal width
   */
  private detectTerminalWidth(): number {
    if (process.stdout.columns) {
      return process.stdout.columns;
    }
    return 120; // Default fallback
  }
}

/**
 * Create a dashboard instance
 */
export function createDashboard(config?: DashboardConfig): TerminalDashboard {
  return new TerminalDashboard(config);
}

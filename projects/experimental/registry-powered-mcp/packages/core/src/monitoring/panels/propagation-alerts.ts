/**
 * Propagation Alerts Dashboard Panel
 * Real-time scrolling alert stream for detected patterns
 *
 * Displays:
 * - Pattern detections with severity indicators
 * - Affected markets and bookmakers
 * - Confidence scores and profit potential
 * - Alert history with expiry tracking
 *
 * @module monitoring/panels/propagation-alerts
 */

import {
  type DetectedPattern,
  type PatternSeverity,
  type PatternId,
  PATTERN_DEFINITIONS,
  PatternCategory,
} from '../../sportsbook/propagation/types';

/**
 * ANSI color codes
 */
const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  BLINK: '\x1b[5m',
  UNDERLINE: '\x1b[4m',

  // Foreground
  BLACK: '\x1b[30m',
  WHITE: '\x1b[37m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',

  // Bright
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_MAGENTA: '\x1b[95m',
  BRIGHT_CYAN: '\x1b[96m',

  // Background
  BG_RED: '\x1b[41m',
  BG_YELLOW: '\x1b[43m',
  BG_GREEN: '\x1b[42m',
  BG_BLUE: '\x1b[44m',
} as const;

/**
 * Severity color mapping
 */
const SEVERITY_COLORS: Record<PatternSeverity, string> = {
  LOW: COLORS.BRIGHT_GREEN,
  MEDIUM: COLORS.BRIGHT_YELLOW,
  HIGH: COLORS.BRIGHT_RED,
  CRITICAL: `${COLORS.BLINK}${COLORS.BG_RED}${COLORS.WHITE}`,
};

/**
 * Severity indicator dots
 */
const SEVERITY_INDICATORS: Record<PatternSeverity, string> = {
  LOW: '●○○○',
  MEDIUM: '●●○○',
  HIGH: '●●●○',
  CRITICAL: '●●●●',
};

/**
 * Category icons
 */
const CATEGORY_ICONS: Record<PatternCategory, string> = {
  [PatternCategory.DERIVATIVE_DELAYS]: '📊',
  [PatternCategory.CROSS_BOOK_ARBITRAGE]: '🔄',
  [PatternCategory.TEMPORAL_INPLAY]: '⏱️',
  [PatternCategory.PROP_COMBO]: '🎯',
  [PatternCategory.STEAM_BEHAVIORAL]: '💨',
};

/**
 * Alert entry with metadata
 */
interface AlertEntry {
  readonly pattern: DetectedPattern;
  readonly receivedAt: number;
  readonly acknowledged: boolean;
  readonly expired: boolean;
}

/**
 * Alerts panel configuration
 */
export interface AlertsPanelConfig {
  /** Maximum alerts to display */
  readonly maxAlerts: number;
  /** Panel width in characters */
  readonly width: number;
  /** Panel height in lines */
  readonly height: number;
  /** Show expired alerts (dimmed) */
  readonly showExpired: boolean;
  /** Auto-acknowledge after ms */
  readonly autoAcknowledgeMs: number;
  /** Minimum severity to display */
  readonly minSeverity: PatternSeverity;
  /** Show category icons */
  readonly showIcons: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_ALERTS_CONFIG: AlertsPanelConfig = {
  maxAlerts: 10,
  width: 80,
  height: 15,
  showExpired: true,
  autoAcknowledgeMs: 30_000,
  minSeverity: 'LOW',
  showIcons: true,
} as const;

/**
 * Severity ranking for filtering
 */
const SEVERITY_RANK: Record<PatternSeverity, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/**
 * Propagation Alerts Panel
 * Displays detected pattern alerts in a scrolling list
 */
export class PropagationAlertsPanel {
  private config: AlertsPanelConfig;
  private alerts: AlertEntry[] = [];
  private alertIdCounter = 0;

  constructor(config: Partial<AlertsPanelConfig> = {}) {
    this.config = { ...DEFAULT_ALERTS_CONFIG, ...config };
  }

  /**
   * Add a new pattern detection alert
   */
  addAlert(pattern: DetectedPattern): void {
    const entry: AlertEntry = {
      pattern,
      receivedAt: Date.now(),
      acknowledged: false,
      expired: false,
    };

    // Insert at beginning (newest first)
    this.alerts.unshift(entry);

    // Trim to max
    if (this.alerts.length > this.config.maxAlerts * 2) {
      this.alerts = this.alerts.slice(0, this.config.maxAlerts * 2);
    }
  }

  /**
   * Mark pattern as expired
   */
  expirePattern(patternId: PatternId): void {
    for (const alert of this.alerts) {
      if (alert.pattern.patternId === patternId) {
        (alert as { expired: boolean }).expired = true;
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledge(patternId: PatternId): void {
    for (const alert of this.alerts) {
      if (alert.pattern.patternId === patternId) {
        (alert as { acknowledged: boolean }).acknowledged = true;
      }
    }
  }

  /**
   * Update panel state (auto-acknowledge, check expiry)
   */
  update(): void {
    const now = Date.now();

    for (const alert of this.alerts) {
      // Auto-acknowledge
      if (!alert.acknowledged && now - alert.receivedAt > this.config.autoAcknowledgeMs) {
        (alert as { acknowledged: boolean }).acknowledged = true;
      }

      // Check expiry
      if (!alert.expired && alert.pattern.expiresAt && now > alert.pattern.expiresAt) {
        (alert as { expired: boolean }).expired = true;
      }
    }
  }

  /**
   * Render panel to string
   */
  render(): string {
    this.update();

    const lines: string[] = [];

    // Header
    lines.push(this.renderHeader());
    lines.push(this.renderSeparator());

    // Filter and sort alerts
    const visibleAlerts = this.getVisibleAlerts();

    if (visibleAlerts.length === 0) {
      lines.push(this.renderEmptyState());
    } else {
      // Alert rows
      const maxRows = this.config.height - 4; // Header + separator + footer
      for (let i = 0; i < Math.min(visibleAlerts.length, maxRows); i++) {
        lines.push(this.renderAlertRow(visibleAlerts[i]));
      }

      // Overflow indicator
      if (visibleAlerts.length > maxRows) {
        lines.push(`${COLORS.DIM}  ... and ${visibleAlerts.length - maxRows} more alerts${COLORS.RESET}`);
      }
    }

    // Separator
    lines.push(this.renderSeparator());

    // Footer
    lines.push(this.renderFooter());

    return lines.join('\n');
  }

  /**
   * Get visible alerts based on config
   */
  private getVisibleAlerts(): AlertEntry[] {
    const minRank = SEVERITY_RANK[this.config.minSeverity];

    return this.alerts.filter((alert) => {
      // Filter by severity
      if (SEVERITY_RANK[alert.pattern.severity] < minRank) {
        return false;
      }

      // Filter expired if configured
      if (alert.expired && !this.config.showExpired) {
        return false;
      }

      return true;
    });
  }

  /**
   * Render header
   */
  private renderHeader(): string {
    const timestamp = new Date().toISOString().slice(11, 23);
    const activeCount = this.alerts.filter((a) => !a.expired && !a.acknowledged).length;
    const title = 'PROPAGATION ALERTS';
    const countBadge = activeCount > 0
      ? `${COLORS.BRIGHT_RED} [${activeCount} ACTIVE]${COLORS.RESET}`
      : '';

    const padding = Math.max(0, this.config.width - title.length - timestamp.length - 15);
    return `${COLORS.BOLD}${COLORS.MAGENTA}${title}${COLORS.RESET}${countBadge}${' '.repeat(padding)}${COLORS.DIM}${timestamp}${COLORS.RESET}`;
  }

  /**
   * Render separator
   */
  private renderSeparator(): string {
    return `${COLORS.DIM}${'─'.repeat(this.config.width)}${COLORS.RESET}`;
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): string {
    return `${COLORS.DIM}  No active pattern alerts${COLORS.RESET}`;
  }

  /**
   * Render an alert row
   */
  private renderAlertRow(entry: AlertEntry): string {
    const { pattern, receivedAt, acknowledged, expired } = entry;
    const def = PATTERN_DEFINITIONS[pattern.patternId];

    // Base styling
    const baseStyle = expired ? COLORS.DIM : acknowledged ? '' : COLORS.BOLD;
    const severityColor = SEVERITY_COLORS[pattern.severity];
    const indicator = SEVERITY_INDICATORS[pattern.severity];

    // Time ago
    const ago = this.formatTimeAgo(Date.now() - receivedAt);

    // Category icon
    const icon = this.config.showIcons ? CATEGORY_ICONS[def.category] + ' ' : '';

    // Pattern name (truncated)
    const name = def.name.slice(0, 20).padEnd(20);

    // Confidence
    const conf = `${Math.round(pattern.confidence * 100)}%`;

    // Profit potential
    const profit = pattern.profitBps > 0 ? `+${pattern.profitBps}bp` : '';

    // Markets affected
    const markets = `${pattern.affectedMarkets.length} mkts`;

    // Build row
    let row = `${baseStyle}`;
    row += `  ${severityColor}${indicator}${COLORS.RESET} `;
    row += `${icon}`;
    row += `${baseStyle}#${pattern.patternId} ${name}${COLORS.RESET} `;
    row += `${COLORS.CYAN}${conf}${COLORS.RESET} `;
    row += profit ? `${COLORS.GREEN}${profit}${COLORS.RESET} ` : '';
    row += `${COLORS.DIM}${markets}${COLORS.RESET} `;
    row += `${COLORS.DIM}${ago}${COLORS.RESET}`;

    // Expired marker
    if (expired) {
      row += ` ${COLORS.DIM}[EXPIRED]${COLORS.RESET}`;
    }

    return row;
  }

  /**
   * Format time ago string
   */
  private formatTimeAgo(ms: number): string {
    if (ms < 1000) return 'now';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
  }

  /**
   * Render footer with stats
   */
  private renderFooter(): string {
    const total = this.alerts.length;
    const active = this.alerts.filter((a) => !a.expired && !a.acknowledged).length;
    const expired = this.alerts.filter((a) => a.expired).length;

    // Severity breakdown
    const bySeverity = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const alert of this.alerts) {
      if (!alert.expired) {
        bySeverity[alert.pattern.severity]++;
      }
    }

    const parts = [
      `${COLORS.DIM}Total: ${total}${COLORS.RESET}`,
      `${COLORS.BRIGHT_GREEN}Active: ${active}${COLORS.RESET}`,
      bySeverity.CRITICAL > 0 ? `${COLORS.BRIGHT_RED}CRIT: ${bySeverity.CRITICAL}${COLORS.RESET}` : null,
      bySeverity.HIGH > 0 ? `${COLORS.YELLOW}HIGH: ${bySeverity.HIGH}${COLORS.RESET}` : null,
    ].filter(Boolean);

    return parts.join('  ');
  }

  /**
   * Get active alert count
   */
  getActiveCount(): number {
    return this.alerts.filter((a) => !a.expired && !a.acknowledged).length;
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: PatternSeverity): DetectedPattern[] {
    return this.alerts
      .filter((a) => a.pattern.severity === severity && !a.expired)
      .map((a) => a.pattern);
  }

  /**
   * Clear all alerts
   */
  clear(): void {
    this.alerts = [];
  }

  /**
   * Clear expired alerts
   */
  clearExpired(): void {
    this.alerts = this.alerts.filter((a) => !a.expired);
  }
}

/**
 * Create alerts panel with config
 */
export function createAlertsPanel(config?: Partial<AlertsPanelConfig>): PropagationAlertsPanel {
  return new PropagationAlertsPanel(config);
}

/**
 * Render alerts directly from pattern list
 */
export function renderPropagationAlerts(
  patterns: readonly DetectedPattern[],
  config?: Partial<AlertsPanelConfig>
): string {
  const panel = new PropagationAlertsPanel(config);
  for (const pattern of patterns) {
    panel.addAlert(pattern);
  }
  return panel.render();
}

/**
 * Format pattern for single-line display
 */
export function formatPatternAlert(pattern: DetectedPattern): string {
  const def = PATTERN_DEFINITIONS[pattern.patternId];
  const severityColor = SEVERITY_COLORS[pattern.severity];
  const icon = CATEGORY_ICONS[def.category];

  return `${severityColor}[${pattern.severity}]${COLORS.RESET} ${icon} #${pattern.patternId} ${def.name} (${Math.round(pattern.confidence * 100)}% conf, ${pattern.affectedMarkets.length} markets)`;
}

/**
 * Get severity level from pattern
 */
export function getPatternSeverityLevel(pattern: DetectedPattern): number {
  return SEVERITY_RANK[pattern.severity];
}

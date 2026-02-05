/**
 * Infrastructure Status Dashboard Panel
 * Real-time monitoring for Golden Matrix Components (Component #41)
 *
 * Displays:
 * - Component health by tier (Level 0-5)
 * - System metrics (heap, uptime, requests)
 * - Degraded/failed component alerts
 * - Feature flag status
 *
 * @module monitoring/panels/infrastructure-status
 */

import {
  type InfrastructureStatus,
  type InfrastructureHealth,
  type InfrastructureMetrics,
  type InfrastructureComponent,
  ComponentStatus,
  LogicTier,
  TIER_LABELS,
} from '../../infrastructure';

/**
 * ANSI color codes
 */
const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',

  // Foreground
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  // Bright
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_CYAN: '\x1b[96m',

  // Background for heatmap
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_RED: '\x1b[41m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
} as const;

/**
 * Status to color mapping
 */
const STATUS_COLORS: Record<ComponentStatus, string> = {
  [ComponentStatus.OPERATIONAL]: COLORS.BRIGHT_GREEN,
  [ComponentStatus.DEGRADED]: COLORS.BRIGHT_YELLOW,
  [ComponentStatus.MAINTENANCE]: COLORS.BRIGHT_BLUE,
  [ComponentStatus.FAILED]: COLORS.BRIGHT_RED,
  [ComponentStatus.UNKNOWN]: COLORS.DIM,
};

/**
 * Status indicators
 */
const STATUS_INDICATORS: Record<ComponentStatus, string> = {
  [ComponentStatus.OPERATIONAL]: '●',
  [ComponentStatus.DEGRADED]: '◐',
  [ComponentStatus.MAINTENANCE]: '◑',
  [ComponentStatus.FAILED]: '○',
  [ComponentStatus.UNKNOWN]: '×',
};

/**
 * Tier colors for heatmap
 */
const TIER_COLORS: Record<LogicTier, string> = {
  [LogicTier.LEVEL_0_KERNEL]: COLORS.BRIGHT_RED,
  [LogicTier.LEVEL_1_STATE]: COLORS.BRIGHT_YELLOW,
  [LogicTier.LEVEL_2_AUDIT]: COLORS.BRIGHT_GREEN,
  [LogicTier.LEVEL_3_CONTROL]: COLORS.BRIGHT_CYAN,
  [LogicTier.LEVEL_4_VAULT]: COLORS.BRIGHT_BLUE,
  [LogicTier.LEVEL_5_TEST]: COLORS.MAGENTA,
};

/**
 * Tier background colors for heatmap cells
 */
const TIER_BG_COLORS: Record<LogicTier, string> = {
  [LogicTier.LEVEL_0_KERNEL]: COLORS.BG_RED,
  [LogicTier.LEVEL_1_STATE]: COLORS.BG_YELLOW,
  [LogicTier.LEVEL_2_AUDIT]: COLORS.BG_GREEN,
  [LogicTier.LEVEL_3_CONTROL]: COLORS.BG_CYAN,
  [LogicTier.LEVEL_4_VAULT]: COLORS.BG_BLUE,
  [LogicTier.LEVEL_5_TEST]: COLORS.BG_MAGENTA,
};

/**
 * Short tier labels for compact display
 */
const TIER_SHORT_LABELS: Record<LogicTier, string> = {
  [LogicTier.LEVEL_0_KERNEL]: 'L0:KERN',
  [LogicTier.LEVEL_1_STATE]: 'L1:STATE',
  [LogicTier.LEVEL_2_AUDIT]: 'L2:AUDIT',
  [LogicTier.LEVEL_3_CONTROL]: 'L3:CTRL',
  [LogicTier.LEVEL_4_VAULT]: 'L4:VAULT',
  [LogicTier.LEVEL_5_TEST]: 'L5:TEST',
};

/**
 * Panel configuration
 */
export interface InfrastructurePanelConfig {
  /** Panel width (default: 80) */
  readonly width?: number;
  /** Show individual component details (default: true) */
  readonly showComponentDetails?: boolean;
  /** Show system metrics (default: true) */
  readonly showMetrics?: boolean;
  /** Show feature flags (default: true) */
  readonly showFeatures?: boolean;
  /** Show tier heatmap (default: true) */
  readonly showHeatmap?: boolean;
  /** Max components to display per tier (default: 5) */
  readonly maxComponentsPerTier?: number;
}

/**
 * Infrastructure Status Panel
 * Renders infrastructure status to terminal
 */
export class InfrastructureStatusPanel {
  private readonly config: Required<InfrastructurePanelConfig>;

  constructor(config: InfrastructurePanelConfig = {}) {
    this.config = {
      width: config.width ?? 80,
      showComponentDetails: config.showComponentDetails ?? true,
      showMetrics: config.showMetrics ?? true,
      showFeatures: config.showFeatures ?? true,
      showHeatmap: config.showHeatmap ?? true,
      maxComponentsPerTier: config.maxComponentsPerTier ?? 5,
    };
  }

  /**
   * Render the complete infrastructure status panel
   */
  render(status: InfrastructureStatus): string[] {
    const lines: string[] = [];

    // Header
    lines.push(this.renderHeader(status));
    lines.push(this.renderSeparator('='));

    // Overall health
    lines.push(this.renderHealthStatus(status.health));
    lines.push(this.renderSeparator());

    // System metrics
    if (this.config.showMetrics) {
      lines.push(this.renderMetrics(status.metrics));
      lines.push(this.renderSeparator());
    }

    // Tier heatmap
    if (this.config.showHeatmap) {
      lines.push(this.renderTierHeatmap(status.health));
      lines.push(this.renderSeparator());
    }

    // Component details
    if (this.config.showComponentDetails) {
      lines.push(...this.renderComponentDetails(status.components));
      lines.push(this.renderSeparator());
    }

    // Feature flags
    if (this.config.showFeatures && status.features.length > 0) {
      lines.push(this.renderFeatures(status.features));
      lines.push(this.renderSeparator());
    }

    // Alerts for degraded/failed components
    if (status.health.degradedComponents.length > 0 || status.health.failedComponents.length > 0) {
      lines.push(...this.renderAlerts(status.health));
    }

    // Footer
    lines.push(this.renderSeparator('='));
    lines.push(this.renderFooter(status));

    return lines;
  }

  /**
   * Render a compact single-line summary
   */
  renderCompact(status: InfrastructureStatus): string {
    const healthColor = STATUS_COLORS[status.health.status];
    const healthIndicator = STATUS_INDICATORS[status.health.status];

    const uptimeStr = this.formatUptime(status.metrics.uptimeSeconds);
    const heapStr = `${status.metrics.heapPressure.toFixed(0)}%`;

    return `${COLORS.BOLD}INFRA${COLORS.RESET} ` +
      `${healthColor}${healthIndicator}${COLORS.RESET} ` +
      `${COLORS.CYAN}Components:${COLORS.RESET}${status.health.totalComponents} ` +
      `${COLORS.CYAN}Health:${COLORS.RESET}${status.health.healthPercentage.toFixed(0)}% ` +
      `${COLORS.CYAN}Heap:${COLORS.RESET}${heapStr} ` +
      `${COLORS.CYAN}Up:${COLORS.RESET}${uptimeStr}`;
  }

  /**
   * Render header
   */
  private renderHeader(status: InfrastructureStatus): string {
    const title = `${COLORS.BOLD}${COLORS.CYAN}INFRASTRUCTURE STATUS${COLORS.RESET}`;
    const version = `${COLORS.DIM}v${status.version}${COLORS.RESET}`;
    const timestamp = new Date(status.timestamp).toISOString().slice(11, 23);
    const timeStr = `${COLORS.DIM}${timestamp}${COLORS.RESET}`;

    const titleLen = 21; // "INFRASTRUCTURE STATUS"
    const versionLen = status.version.length + 1;
    const padding = this.config.width - titleLen - versionLen - 12 - 3;

    return title + ' ' + version + ' '.repeat(Math.max(1, padding)) + timeStr;
  }

  /**
   * Render separator
   */
  private renderSeparator(char: string = '-'): string {
    return `${COLORS.DIM}${char.repeat(this.config.width)}${COLORS.RESET}`;
  }

  /**
   * Render overall health status
   */
  private renderHealthStatus(health: InfrastructureHealth): string {
    const healthColor = STATUS_COLORS[health.status];
    const indicator = STATUS_INDICATORS[health.status];

    const slaStatus = health.slaCompliant
      ? `${COLORS.GREEN}COMPLIANT${COLORS.RESET}`
      : `${COLORS.RED}VIOLATION${COLORS.RESET}`;

    return `${COLORS.BOLD}Health:${COLORS.RESET} ` +
      `${healthColor}${indicator} ${health.status}${COLORS.RESET}` +
      `  |  ` +
      `${COLORS.CYAN}Components:${COLORS.RESET} ${health.byStatus[ComponentStatus.OPERATIONAL]}/${health.totalComponents} operational` +
      `  |  ` +
      `${COLORS.CYAN}SLA:${COLORS.RESET} ${slaStatus}`;
  }

  /**
   * Render system metrics
   */
  private renderMetrics(metrics: InfrastructureMetrics): string {
    const heapColor = metrics.heapPressure > 80 ? COLORS.RED :
                      metrics.heapPressure > 60 ? COLORS.YELLOW : COLORS.GREEN;

    const parts = [
      `${COLORS.BRIGHT_CYAN}Uptime:${COLORS.RESET} ${this.formatUptime(metrics.uptimeSeconds)}`,
      `${COLORS.BRIGHT_CYAN}Requests:${COLORS.RESET} ${this.formatNumber(metrics.totalRequests)}`,
      `${COLORS.BRIGHT_CYAN}RPS:${COLORS.RESET} ${metrics.requestsPerSecond.toFixed(1)}`,
      `${COLORS.BRIGHT_CYAN}P99:${COLORS.RESET} ${metrics.p99LatencyMs.toFixed(2)}ms`,
      `${heapColor}Heap:${COLORS.RESET} ${metrics.heapPressure.toFixed(1)}%`,
      `${COLORS.BRIGHT_CYAN}Conn:${COLORS.RESET} ${metrics.activeConnections}`,
    ];

    return parts.join('  |  ');
  }

  /**
   * Render tier heatmap
   */
  private renderTierHeatmap(health: InfrastructureHealth): string {
    const parts: string[] = [];

    for (let tier = LogicTier.LEVEL_0_KERNEL; tier <= LogicTier.LEVEL_5_TEST; tier++) {
      const count = health.byTier[tier] || 0;
      const tierColor = TIER_COLORS[tier];
      const label = TIER_SHORT_LABELS[tier];

      // Create mini bar
      const bar = count > 0 ? '█'.repeat(Math.min(count, 8)) : '-';

      parts.push(`${tierColor}${label}${COLORS.RESET}:${bar}(${count})`);
    }

    return parts.join(' ');
  }

  /**
   * Render component details by tier
   */
  private renderComponentDetails(components: InfrastructureComponent[]): string[] {
    const lines: string[] = [];

    // Header
    const header = `${COLORS.BOLD}${COLORS.BLUE}` +
      'COMPONENT'.padEnd(25) +
      'TIER'.padEnd(12) +
      'STATUS'.padEnd(12) +
      'LATENCY'.padStart(10) +
      'RESOURCE'.padStart(12) +
      `${COLORS.RESET}`;
    lines.push(header);

    // Group by tier
    const byTier = new Map<LogicTier, InfrastructureComponent[]>();
    for (const c of components) {
      const list = byTier.get(c.tier) || [];
      list.push(c);
      byTier.set(c.tier, list);
    }

    // Render each tier
    for (let tier = LogicTier.LEVEL_0_KERNEL; tier <= LogicTier.LEVEL_5_TEST; tier++) {
      const tierComponents = byTier.get(tier) || [];
      if (tierComponents.length === 0) continue;

      // Tier header
      const tierColor = TIER_COLORS[tier];
      lines.push(`${tierColor}${TIER_LABELS[tier]}${COLORS.RESET}`);

      // Components (limited)
      const displayComponents = tierComponents.slice(0, this.config.maxComponentsPerTier);
      for (const c of displayComponents) {
        const statusColor = STATUS_COLORS[c.status];
        const statusIndicator = STATUS_INDICATORS[c.status];
        const latencyStr = c.latencyMs !== undefined
          ? `${c.latencyMs.toFixed(3)}ms`
          : '--';

        const row =
          `  ${c.name.slice(0, 23).padEnd(23)} ` +
          `${TIER_SHORT_LABELS[c.tier].padEnd(12)}` +
          `${statusColor}${statusIndicator} ${c.status.padEnd(10)}${COLORS.RESET}` +
          `${latencyStr.padStart(10)}` +
          `${c.resourceTax.value.padStart(12)}`;

        lines.push(row);
      }

      // Show count if more components exist
      if (tierComponents.length > this.config.maxComponentsPerTier) {
        const remaining = tierComponents.length - this.config.maxComponentsPerTier;
        lines.push(`${COLORS.DIM}  ... +${remaining} more${COLORS.RESET}`);
      }
    }

    return lines;
  }

  /**
   * Render feature flags
   */
  private renderFeatures(features: string[]): string {
    const featureStr = features
      .map(f => `${COLORS.GREEN}✓${COLORS.RESET}${f}`)
      .join(' ');

    return `${COLORS.BOLD}Features:${COLORS.RESET} ${featureStr}`;
  }

  /**
   * Render alerts for degraded/failed components
   */
  private renderAlerts(health: InfrastructureHealth): string[] {
    const lines: string[] = [];

    if (health.failedComponents.length > 0) {
      lines.push(`${COLORS.BOLD}${COLORS.RED}FAILED COMPONENTS${COLORS.RESET}`);
      for (const id of health.failedComponents) {
        lines.push(`  ${COLORS.RED}✗${COLORS.RESET} ${id}`);
      }
    }

    if (health.degradedComponents.length > 0) {
      lines.push(`${COLORS.BOLD}${COLORS.YELLOW}DEGRADED COMPONENTS${COLORS.RESET}`);
      for (const id of health.degradedComponents) {
        lines.push(`  ${COLORS.YELLOW}!${COLORS.RESET} ${id}`);
      }
    }

    return lines;
  }

  /**
   * Render footer
   */
  private renderFooter(status: InfrastructureStatus): string {
    return `${COLORS.DIM}` +
      `Runtime: Bun ${status.runtime.bun} | ` +
      `Platform: ${status.runtime.platform}/${status.runtime.arch} | ` +
      `Components: ${status.health.totalComponents}` +
      `${COLORS.RESET}`;
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
   * Format number with K/M suffix
   */
  private formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
    return `${(num / 1000000).toFixed(1)}M`;
  }
}

/**
 * Create a panel instance
 */
export function createInfrastructurePanel(config?: InfrastructurePanelConfig): InfrastructureStatusPanel {
  return new InfrastructureStatusPanel(config);
}

/**
 * Render infrastructure as ASCII heatmap grid
 * Shows tiers as rows, components as cells
 */
export function renderInfrastructureHeatmap(
  status: InfrastructureStatus,
  options: { width?: number; showLegend?: boolean } = {}
): string[] {
  const lines: string[] = [];
  const width = options.width ?? 60;
  const showLegend = options.showLegend ?? true;

  lines.push(`${COLORS.BOLD}${COLORS.CYAN}GOLDEN MATRIX HEATMAP${COLORS.RESET}`);
  lines.push(`${COLORS.DIM}${'-'.repeat(width)}${COLORS.RESET}`);

  // Group components by tier
  const byTier = new Map<LogicTier, InfrastructureComponent[]>();
  for (const c of status.components) {
    const list = byTier.get(c.tier) || [];
    list.push(c);
    byTier.set(c.tier, list);
  }

  // Render each tier as a row
  for (let tier = LogicTier.LEVEL_0_KERNEL; tier <= LogicTier.LEVEL_5_TEST; tier++) {
    const components = byTier.get(tier) || [];
    const tierColor = TIER_COLORS[tier];
    const tierBg = TIER_BG_COLORS[tier];

    // Tier label
    const label = TIER_SHORT_LABELS[tier].padEnd(10);

    // Component cells
    const cells = components.map(c => {
      const statusColor = STATUS_COLORS[c.status];
      const indicator = STATUS_INDICATORS[c.status];
      return `${statusColor}${indicator}${COLORS.RESET}`;
    }).join('');

    // Health bar
    const operational = components.filter(c => c.status === ComponentStatus.OPERATIONAL).length;
    const healthPct = components.length > 0 ? (operational / components.length * 100) : 100;
    const barWidth = 15;
    const filledWidth = Math.round((healthPct / 100) * barWidth);

    let barColor = COLORS.BG_GREEN;
    if (healthPct < 95) barColor = COLORS.BG_YELLOW;
    if (healthPct < 80) barColor = COLORS.BG_RED;

    const bar = `${barColor}${' '.repeat(filledWidth)}${COLORS.RESET}` +
      `${COLORS.DIM}${'░'.repeat(barWidth - filledWidth)}${COLORS.RESET}`;

    lines.push(
      `${tierColor}${label}${COLORS.RESET}` +
      `${cells.padEnd(10)} ` +
      `${bar} ` +
      `${healthPct.toFixed(0).padStart(3)}%`
    );
  }

  // Legend
  if (showLegend) {
    lines.push('');
    lines.push(`${COLORS.DIM}Status: ` +
      `${STATUS_COLORS[ComponentStatus.OPERATIONAL]}●${COLORS.RESET}OK ` +
      `${STATUS_COLORS[ComponentStatus.DEGRADED]}◐${COLORS.RESET}DEGRADED ` +
      `${STATUS_COLORS[ComponentStatus.MAINTENANCE]}◑${COLORS.RESET}MAINT ` +
      `${STATUS_COLORS[ComponentStatus.FAILED]}○${COLORS.RESET}FAIL` +
      `${COLORS.RESET}`);
  }

  return lines;
}

/**
 * Render compact status bar for terminal header
 */
export function renderInfrastructureStatusBar(status: InfrastructureStatus): string {
  const healthColor = STATUS_COLORS[status.health.status];
  const indicator = STATUS_INDICATORS[status.health.status];

  // Mini tier indicators
  const tierIndicators: string[] = [];
  for (let tier = LogicTier.LEVEL_0_KERNEL; tier <= LogicTier.LEVEL_5_TEST; tier++) {
    const count = status.health.byTier[tier] || 0;
    const color = TIER_COLORS[tier];
    tierIndicators.push(`${color}${count}${COLORS.RESET}`);
  }

  return `${COLORS.BOLD}[INFRA]${COLORS.RESET} ` +
    `${healthColor}${indicator}${COLORS.RESET} ` +
    `${status.health.healthPercentage.toFixed(0)}% ` +
    `[${tierIndicators.join('|')}]`;
}

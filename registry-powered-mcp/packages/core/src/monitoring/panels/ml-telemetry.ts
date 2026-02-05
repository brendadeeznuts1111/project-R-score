/**
 * ML Telemetry Dashboard Panel
 * Real-time monitoring for ML Intelligence Layer (#71-88)
 *
 * Displays:
 * - Model status and health per tier
 * - SLA compliance heatmap
 * - Latency distribution by model
 * - Signal distribution metrics
 * - Active SLA violations
 *
 * @module monitoring/panels/ml-telemetry
 */

import {
  type MLTelemetrySnapshot,
  type MLModelStats,
  type TierStats,
  type SLAViolation,
  MLProcessingTier,
  MLModelId,
  MLHealthStatus,
  MLSignal,
  ML_MODEL_DEFINITIONS,
  ML_TIER_CONFIG,
} from '../../sportsbook/ml';

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
} as const;

/**
 * Health status to color mapping
 */
const HEALTH_COLORS: Record<MLHealthStatus, string> = {
  [MLHealthStatus.HEALTHY]: COLORS.BRIGHT_GREEN,
  [MLHealthStatus.DEGRADED]: COLORS.BRIGHT_YELLOW,
  [MLHealthStatus.CRITICAL]: COLORS.BRIGHT_RED,
  [MLHealthStatus.OFFLINE]: COLORS.DIM,
};

/**
 * Health status indicators
 */
const HEALTH_INDICATORS: Record<MLHealthStatus, string> = {
  [MLHealthStatus.HEALTHY]: '●',
  [MLHealthStatus.DEGRADED]: '◐',
  [MLHealthStatus.CRITICAL]: '○',
  [MLHealthStatus.OFFLINE]: '×',
};

/**
 * Tier display names
 */
const TIER_NAMES: Record<MLProcessingTier, string> = {
  [MLProcessingTier.TIER_1_HF]: 'T1:HF',
  [MLProcessingTier.TIER_2_QUANT]: 'T2:QUANT',
  [MLProcessingTier.TIER_3_STATS]: 'T3:STATS',
  [MLProcessingTier.TIER_4_SYNC]: 'T4:SYNC',
};

/**
 * Signal type labels
 */
const SIGNAL_LABELS: Record<MLSignal, string> = {
  [MLSignal.HOLD]: 'HOLD',
  [MLSignal.ADJUST_UP]: 'UP',
  [MLSignal.ADJUST_DOWN]: 'DOWN',
  [MLSignal.REVIEW]: 'REV',
  [MLSignal.SUSPEND]: 'SUSP',
  [MLSignal.SYNC]: 'SYNC',
};

/**
 * Panel configuration
 */
export interface MLTelemetryPanelConfig {
  /** Panel width (default: 80) */
  readonly width?: number;
  /** Show individual model details (default: true) */
  readonly showModelDetails?: boolean;
  /** Show signal distribution (default: true) */
  readonly showSignalDistribution?: boolean;
  /** Show SLA violations (default: true) */
  readonly showViolations?: boolean;
  /** Max violations to display (default: 5) */
  readonly maxViolations?: number;
}

/**
 * ML Telemetry Panel
 * Renders ML model telemetry to terminal
 */
export class MLTelemetryPanel {
  private readonly config: Required<MLTelemetryPanelConfig>;

  constructor(config: MLTelemetryPanelConfig = {}) {
    this.config = {
      width: config.width ?? 80,
      showModelDetails: config.showModelDetails ?? true,
      showSignalDistribution: config.showSignalDistribution ?? true,
      showViolations: config.showViolations ?? true,
      maxViolations: config.maxViolations ?? 5,
    };
  }

  /**
   * Render the complete ML telemetry panel
   */
  render(snapshot: MLTelemetrySnapshot): string[] {
    const lines: string[] = [];
    const { width } = this.config;

    // Header
    lines.push(this.renderHeader(snapshot));
    lines.push(this.renderSeparator('='));

    // Overall health
    lines.push(this.renderHealthStatus(snapshot));
    lines.push(this.renderSeparator());

    // Tier summary
    lines.push(this.renderTierSummary(snapshot));
    lines.push(this.renderSeparator());

    // Model details (if enabled)
    if (this.config.showModelDetails) {
      lines.push(...this.renderModelDetails(snapshot));
      lines.push(this.renderSeparator());
    }

    // Signal distribution (if enabled)
    if (this.config.showSignalDistribution) {
      lines.push(this.renderSignalDistribution(snapshot));
      lines.push(this.renderSeparator());
    }

    // SLA violations (if enabled)
    if (this.config.showViolations && snapshot.activeViolations.length > 0) {
      lines.push(...this.renderViolations(snapshot));
    }

    // Footer
    lines.push(this.renderSeparator('='));
    lines.push(this.renderFooter(snapshot));

    return lines;
  }

  /**
   * Render a compact single-line summary
   */
  renderCompact(snapshot: MLTelemetrySnapshot): string {
    const healthColor = HEALTH_COLORS[snapshot.health];
    const healthIndicator = HEALTH_INDICATORS[snapshot.health];

    // Count totals
    let totalEvals = 0;
    let totalViolations = 0;
    for (const stats of snapshot.tierStats.values()) {
      totalEvals += stats.totalEvaluations;
      totalViolations += stats.totalViolations;
    }

    const slaRate = totalEvals > 0
      ? ((totalEvals - totalViolations) / totalEvals * 100).toFixed(1)
      : '100.0';

    return `${COLORS.BOLD}ML${COLORS.RESET} ` +
      `${healthColor}${healthIndicator}${COLORS.RESET} ` +
      `${COLORS.CYAN}Evals:${COLORS.RESET}${totalEvals} ` +
      `${COLORS.CYAN}SLA:${COLORS.RESET}${slaRate}% ` +
      `${COLORS.CYAN}Viol:${COLORS.RESET}${snapshot.activeViolations.length}`;
  }

  /**
   * Render header
   */
  private renderHeader(snapshot: MLTelemetrySnapshot): string {
    const title = `${COLORS.BOLD}${COLORS.MAGENTA}ML INTELLIGENCE LAYER${COLORS.RESET}`;
    const timestamp = new Date(snapshot.timestamp).toISOString().slice(11, 23);
    const timeStr = `${COLORS.DIM}${timestamp}${COLORS.RESET}`;

    // Compute padding
    const titleLen = 21; // "ML INTELLIGENCE LAYER"
    const padding = this.config.width - titleLen - 12;

    return title + ' '.repeat(Math.max(1, padding)) + timeStr;
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
  private renderHealthStatus(snapshot: MLTelemetrySnapshot): string {
    const healthColor = HEALTH_COLORS[snapshot.health];
    const indicator = HEALTH_INDICATORS[snapshot.health];

    // Count models meeting SLA
    let totalModels = 0;
    let modelsMeetingSLA = 0;
    for (const stats of snapshot.tierStats.values()) {
      totalModels += stats.modelCount;
      modelsMeetingSLA += stats.modelsMeetingSLA;
    }

    const slaRate = totalModels > 0
      ? (modelsMeetingSLA / totalModels * 100).toFixed(0)
      : '100';

    return `${COLORS.BOLD}Health:${COLORS.RESET} ` +
      `${healthColor}${indicator} ${snapshot.health}${COLORS.RESET}` +
      `  |  ` +
      `${COLORS.CYAN}Models:${COLORS.RESET} ${modelsMeetingSLA}/${totalModels} meeting SLA (${slaRate}%)`;
  }

  /**
   * Render tier summary with heatmap
   */
  private renderTierSummary(snapshot: MLTelemetrySnapshot): string {
    const parts: string[] = [];

    for (const tier of [
      MLProcessingTier.TIER_1_HF,
      MLProcessingTier.TIER_2_QUANT,
      MLProcessingTier.TIER_3_STATS,
      MLProcessingTier.TIER_4_SYNC,
    ]) {
      const stats = snapshot.tierStats.get(tier);
      const tierConfig = ML_TIER_CONFIG[tier];

      if (stats) {
        const slaRate = stats.totalEvaluations > 0
          ? (stats.totalEvaluations - stats.totalViolations) / stats.totalEvaluations
          : 1;

        // Color based on SLA rate
        let color = COLORS.BRIGHT_GREEN;
        if (slaRate < 0.95) color = COLORS.BRIGHT_YELLOW;
        if (slaRate < 0.80) color = COLORS.BRIGHT_RED;

        const avgMs = stats.avgLatencyUs / 1000;
        const latencyColor = avgMs <= tierConfig.maxLatencyMs ? COLORS.GREEN : COLORS.RED;

        parts.push(
          `${color}${TIER_NAMES[tier]}${COLORS.RESET}:` +
          `${latencyColor}${avgMs.toFixed(1)}ms${COLORS.RESET}`
        );
      } else {
        parts.push(`${COLORS.DIM}${TIER_NAMES[tier]}:--${COLORS.RESET}`);
      }
    }

    return parts.join('  |  ');
  }

  /**
   * Render model details
   */
  private renderModelDetails(snapshot: MLTelemetrySnapshot): string[] {
    const lines: string[] = [];

    // Header
    const header = `${COLORS.BOLD}${COLORS.BLUE}` +
      'MODEL'.padEnd(20) +
      'TIER'.padEnd(10) +
      'EVALS'.padStart(10) +
      'AVG(ms)'.padStart(10) +
      'P99(ms)'.padStart(10) +
      'SLA%'.padStart(8) +
      `${COLORS.RESET}`;
    lines.push(header);

    // Sort models by tier, then by ID
    const sortedModels = Array.from(snapshot.models.entries())
      .sort((a, b) => {
        const tierA = ML_MODEL_DEFINITIONS[a[0]].tier;
        const tierB = ML_MODEL_DEFINITIONS[b[0]].tier;
        if (tierA !== tierB) return tierA - tierB;
        return a[0] - b[0];
      });

    for (const [modelId, stats] of sortedModels) {
      const def = ML_MODEL_DEFINITIONS[modelId];
      const tierConfig = ML_TIER_CONFIG[def.tier];

      const slaRate = stats.evaluations > 0
        ? ((stats.evaluations - stats.slaViolations) / stats.evaluations * 100)
        : 100;

      const avgMs = stats.avgLatencyUs / 1000;
      const p99Ms = stats.p99LatencyUs / 1000;

      // Color based on SLA compliance
      let slaColor = COLORS.GREEN;
      if (slaRate < 95) slaColor = COLORS.YELLOW;
      if (slaRate < 80) slaColor = COLORS.RED;

      // Color latency based on target
      const avgColor = avgMs <= def.targetSlaMs ? COLORS.GREEN : COLORS.YELLOW;
      const p99Color = p99Ms <= tierConfig.maxLatencyMs ? COLORS.GREEN : COLORS.RED;

      const row =
        def.name.padEnd(20) +
        TIER_NAMES[def.tier].padEnd(10) +
        stats.evaluations.toString().padStart(10) +
        `${avgColor}${avgMs.toFixed(2).padStart(10)}${COLORS.RESET}` +
        `${p99Color}${p99Ms.toFixed(2).padStart(10)}${COLORS.RESET}` +
        `${slaColor}${slaRate.toFixed(1).padStart(8)}${COLORS.RESET}`;

      lines.push(row);
    }

    return lines;
  }

  /**
   * Render signal distribution
   */
  private renderSignalDistribution(snapshot: MLTelemetrySnapshot): string {
    // Aggregate signals across all models
    const totals: Record<MLSignal, number> = {
      [MLSignal.HOLD]: 0,
      [MLSignal.ADJUST_UP]: 0,
      [MLSignal.ADJUST_DOWN]: 0,
      [MLSignal.REVIEW]: 0,
      [MLSignal.SUSPEND]: 0,
      [MLSignal.SYNC]: 0,
    };

    for (const stats of snapshot.models.values()) {
      for (const [signal, count] of Object.entries(stats.signalDistribution)) {
        totals[Number(signal) as MLSignal] += count;
      }
    }

    const total = Object.values(totals).reduce((a, b) => a + b, 0);

    const parts = Object.entries(totals).map(([signal, count]) => {
      const pct = total > 0 ? (count / total * 100).toFixed(0) : '0';
      const label = SIGNAL_LABELS[Number(signal) as MLSignal];

      // Color coding
      let color = COLORS.WHITE;
      if (Number(signal) === MLSignal.ADJUST_UP) color = COLORS.GREEN;
      if (Number(signal) === MLSignal.ADJUST_DOWN) color = COLORS.RED;
      if (Number(signal) === MLSignal.SUSPEND) color = COLORS.BRIGHT_RED;
      if (Number(signal) === MLSignal.REVIEW) color = COLORS.YELLOW;

      return `${color}${label}${COLORS.RESET}:${pct}%`;
    });

    return `${COLORS.BOLD}Signals:${COLORS.RESET} ${parts.join(' ')}`;
  }

  /**
   * Render SLA violations
   */
  private renderViolations(snapshot: MLTelemetrySnapshot): string[] {
    const lines: string[] = [];

    lines.push(`${COLORS.BOLD}${COLORS.RED}SLA VIOLATIONS${COLORS.RESET}`);

    const violations = snapshot.activeViolations.slice(-this.config.maxViolations);

    for (const v of violations) {
      const def = ML_MODEL_DEFINITIONS[v.modelId];
      const overage = ((v.actualMs / v.targetMs - 1) * 100).toFixed(0);
      const age = ((Date.now() - v.timestamp) / 1000).toFixed(1);

      const severityColor = v.consecutiveCount >= 3 ? COLORS.BRIGHT_RED : COLORS.YELLOW;
      const severity = v.consecutiveCount >= 3 ? '!!!' : v.consecutiveCount >= 2 ? '!!' : '!';

      lines.push(
        `${severityColor}${severity}${COLORS.RESET} ` +
        `${def.name.padEnd(18)} ` +
        `${COLORS.RED}${v.actualMs.toFixed(1)}ms${COLORS.RESET}/${v.targetMs}ms ` +
        `(+${overage}%) ` +
        `${COLORS.DIM}${age}s ago${COLORS.RESET} ` +
        `x${v.consecutiveCount}`
      );
    }

    return lines;
  }

  /**
   * Render footer
   */
  private renderFooter(snapshot: MLTelemetrySnapshot): string {
    // Count totals
    let totalEvals = 0;
    for (const stats of snapshot.tierStats.values()) {
      totalEvals += stats.totalEvaluations;
    }

    const modelCount = snapshot.models.size;
    const violationCount = snapshot.activeViolations.length;

    return `${COLORS.DIM}` +
      `Models: ${modelCount} | ` +
      `Total Evals: ${totalEvals} | ` +
      `Active Violations: ${violationCount}` +
      `${COLORS.RESET}`;
  }
}

/**
 * Create a panel instance
 */
export function createMLTelemetryPanel(config?: MLTelemetryPanelConfig): MLTelemetryPanel {
  return new MLTelemetryPanel(config);
}

/**
 * Render ML telemetry as ASCII heatmap
 * Shows models as rows, time windows as columns
 */
export function renderMLHeatmap(
  snapshot: MLTelemetrySnapshot,
  options: { width?: number; showLegend?: boolean } = {}
): string[] {
  const lines: string[] = [];
  const width = options.width ?? 60;
  const showLegend = options.showLegend ?? true;

  lines.push(`${COLORS.BOLD}${COLORS.MAGENTA}ML MODEL SLA HEATMAP${COLORS.RESET}`);
  lines.push(`${COLORS.DIM}${'-'.repeat(width)}${COLORS.RESET}`);

  // Render each tier as a section
  for (const tier of [
    MLProcessingTier.TIER_1_HF,
    MLProcessingTier.TIER_2_QUANT,
    MLProcessingTier.TIER_3_STATS,
    MLProcessingTier.TIER_4_SYNC,
  ]) {
    const tierConfig = ML_TIER_CONFIG[tier];
    lines.push(`${COLORS.CYAN}${tierConfig.name} (<${tierConfig.maxLatencyMs}ms)${COLORS.RESET}`);

    // Find models in this tier
    for (const [modelId, stats] of snapshot.models.entries()) {
      const def = ML_MODEL_DEFINITIONS[modelId];
      if (def.tier !== tier) continue;

      const slaRate = stats.evaluations > 0
        ? (stats.evaluations - stats.slaViolations) / stats.evaluations
        : 1;

      // Create heatmap bar
      const barWidth = 20;
      const filledWidth = Math.round(slaRate * barWidth);

      let barColor = COLORS.BG_GREEN;
      if (slaRate < 0.95) barColor = COLORS.BG_YELLOW;
      if (slaRate < 0.80) barColor = COLORS.BG_RED;

      const bar = `${barColor}${' '.repeat(filledWidth)}${COLORS.RESET}` +
        `${COLORS.DIM}${'░'.repeat(barWidth - filledWidth)}${COLORS.RESET}`;

      const pctStr = `${(slaRate * 100).toFixed(0)}%`.padStart(4);

      lines.push(`  ${def.name.padEnd(18)} ${bar} ${pctStr}`);
    }

    lines.push('');
  }

  // Legend
  if (showLegend) {
    lines.push(`${COLORS.DIM}Legend: ` +
      `${COLORS.BG_GREEN} ${COLORS.RESET} >95% ` +
      `${COLORS.BG_YELLOW} ${COLORS.RESET} 80-95% ` +
      `${COLORS.BG_RED} ${COLORS.RESET} <80%` +
      `${COLORS.RESET}`);
  }

  return lines;
}

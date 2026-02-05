/**
 * Half-Life Heatmap Dashboard Panel
 * ASCII visualization of propagation delays across tiers and bookmakers
 *
 * Displays:
 * - 6x10 matrix (tiers x bookmakers)
 * - ANSI 256 color gradient (cold→hot)
 * - Anomaly indicators
 * - Pattern count overlays
 *
 * @module monitoring/panels/half-life-heatmap
 */

import {
  type PropagationHeatmap,
  type HeatmapCell,
  type HalfLifeMetrics,
  MarketTier,
  TIER_HALFLIFE_TARGETS,
} from '../../sportsbook/propagation/types';

/**
 * ANSI color codes for heatmap
 */
const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  BLINK: '\x1b[5m',

  // Foreground
  BLACK: '\x1b[30m',
  WHITE: '\x1b[37m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',

  // Bright
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_CYAN: '\x1b[96m',
} as const;

/**
 * ANSI 256-color codes for gradient (blue→green→yellow→red)
 */
const GRADIENT_256: readonly number[] = [
  21,  // Deep blue (cold - fast propagation)
  27,
  33,
  39,
  45,
  51,  // Cyan
  50,
  49,
  48,
  47,
  46,  // Green
  82,
  118,
  154,
  190,
  226, // Yellow
  220,
  214,
  208,
  202,
  196, // Red (hot - slow propagation)
] as const;

/**
 * Heatmap panel configuration
 */
export interface HeatmapPanelConfig {
  /** Panel width in characters */
  readonly width: number;
  /** Panel height in lines */
  readonly height: number;
  /** Cell width for each bookmaker column */
  readonly cellWidth: number;
  /** Show tier labels on left */
  readonly showTierLabels: boolean;
  /** Show bookmaker labels on top */
  readonly showBookmakerLabels: boolean;
  /** Show legend */
  readonly showLegend: boolean;
  /** Refresh rate in ms */
  readonly refreshMs: number;
  /** Use 256-color mode */
  readonly use256Colors: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_HEATMAP_CONFIG: HeatmapPanelConfig = {
  width: 80,
  height: 12,
  cellWidth: 6,
  showTierLabels: true,
  showBookmakerLabels: true,
  showLegend: true,
  refreshMs: 100,
  use256Colors: true,
} as const;

/**
 * Half-Life Heatmap Panel
 * Renders propagation delay visualization
 */
export class HalfLifeHeatmapPanel {
  private config: HeatmapPanelConfig;
  private lastHeatmap: PropagationHeatmap | null = null;
  private frameCount = 0;

  constructor(config: Partial<HeatmapPanelConfig> = {}) {
    this.config = { ...DEFAULT_HEATMAP_CONFIG, ...config };
  }

  /**
   * Update heatmap data
   */
  update(heatmap: PropagationHeatmap): void {
    this.lastHeatmap = heatmap;
    this.frameCount++;
  }

  /**
   * Render heatmap to string
   */
  render(): string {
    if (!this.lastHeatmap) {
      return this.renderEmpty();
    }

    const lines: string[] = [];

    // Header
    lines.push(this.renderHeader());
    lines.push(this.renderSeparator());

    // Bookmaker labels row
    if (this.config.showBookmakerLabels) {
      lines.push(this.renderBookmakerLabels());
    }

    // Heatmap rows (one per tier)
    for (let tierIdx = 0; tierIdx < this.lastHeatmap.cells.length; tierIdx++) {
      lines.push(this.renderTierRow(tierIdx));
    }

    // Separator
    lines.push(this.renderSeparator());

    // Legend
    if (this.config.showLegend) {
      lines.push(this.renderLegend());
    }

    // Footer with stats
    lines.push(this.renderFooter());

    return lines.join('\n');
  }

  /**
   * Render empty state
   */
  private renderEmpty(): string {
    const lines: string[] = [];
    lines.push(this.renderHeader());
    lines.push(this.renderSeparator());
    lines.push(`${COLORS.DIM}  No propagation data available${COLORS.RESET}`);
    lines.push(`${COLORS.DIM}  Waiting for market updates...${COLORS.RESET}`);
    lines.push(this.renderSeparator());
    return lines.join('\n');
  }

  /**
   * Render header
   */
  private renderHeader(): string {
    const timestamp = new Date().toISOString().slice(11, 23);
    const title = 'PROPAGATION HALF-LIFE HEATMAP';
    const padding = Math.max(0, this.config.width - title.length - timestamp.length - 4);
    return `${COLORS.BOLD}${COLORS.CYAN}${title}${COLORS.RESET}${' '.repeat(padding)}${COLORS.DIM}${timestamp}${COLORS.RESET}`;
  }

  /**
   * Render separator line
   */
  private renderSeparator(): string {
    return `${COLORS.DIM}${'═'.repeat(this.config.width)}${COLORS.RESET}`;
  }

  /**
   * Render bookmaker labels row
   */
  private renderBookmakerLabels(): string {
    if (!this.lastHeatmap) return '';

    const labelWidth = this.config.showTierLabels ? 14 : 0;
    let row = ' '.repeat(labelWidth);

    for (const label of this.lastHeatmap.columnLabels) {
      const truncated = label.slice(0, this.config.cellWidth - 1).padEnd(this.config.cellWidth);
      row += `${COLORS.DIM}${truncated}${COLORS.RESET}`;
    }

    return row;
  }

  /**
   * Render a tier row
   */
  private renderTierRow(tierIdx: number): string {
    if (!this.lastHeatmap) return '';

    const tierCells = this.lastHeatmap.cells[tierIdx];
    const tierLabel = this.lastHeatmap.rowLabels[tierIdx];

    let row = '';

    // Tier label
    if (this.config.showTierLabels) {
      const label = tierLabel.slice(0, 12).padEnd(12);
      row += `${COLORS.BOLD}${label}${COLORS.RESET}  `;
    }

    // Cells
    for (const cell of tierCells) {
      row += this.renderCell(cell);
    }

    return row;
  }

  /**
   * Render a single heatmap cell
   */
  private renderCell(cell: HeatmapCell): string {
    const { cellWidth, use256Colors } = this.config;

    // Get color based on heat value
    const colorCode = this.getHeatColor(cell.heat, use256Colors);

    // Cell content: half-life value or pattern indicator
    let content: string;
    if (cell.patternCount > 0) {
      // Show pattern count with blink for anomalous
      const indicator = cell.isAnomalous ? `${COLORS.BLINK}!${cell.patternCount}${COLORS.RESET}` : `*${cell.patternCount}`;
      content = indicator.padStart(cellWidth - 1);
    } else {
      // Show half-life in ms (abbreviated)
      content = this.formatHalfLife(cell.halfLifeMs).padStart(cellWidth - 1);
    }

    // Apply background color
    if (use256Colors) {
      return `\x1b[48;5;${colorCode}m${COLORS.BLACK}${content}${COLORS.RESET} `;
    } else {
      return `${colorCode}${content}${COLORS.RESET} `;
    }
  }

  /**
   * Get heat color (0=cold/blue, 1=hot/red)
   */
  private getHeatColor(heat: number, use256: boolean): number | string {
    const clampedHeat = Math.max(0, Math.min(1, heat));

    if (use256) {
      const idx = Math.floor(clampedHeat * (GRADIENT_256.length - 1));
      return GRADIENT_256[idx];
    } else {
      // Fallback to basic colors
      if (clampedHeat < 0.25) return COLORS.BLUE;
      if (clampedHeat < 0.5) return COLORS.GREEN;
      if (clampedHeat < 0.75) return COLORS.YELLOW;
      return COLORS.RED;
    }
  }

  /**
   * Format half-life for display
   */
  private formatHalfLife(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}`;
    } else if (ms < 10000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${Math.round(ms / 1000)}s`;
    }
  }

  /**
   * Render color legend
   */
  private renderLegend(): string {
    const { use256Colors } = this.config;

    let legend = `${COLORS.DIM}Legend: ${COLORS.RESET}`;

    // Gradient samples
    const samples = [0, 0.25, 0.5, 0.75, 1];
    const labels = ['Fast', '', 'Med', '', 'Slow'];

    for (let i = 0; i < samples.length; i++) {
      const color = this.getHeatColor(samples[i], use256Colors);
      if (use256Colors) {
        legend += `\x1b[48;5;${color}m  ${COLORS.RESET}`;
      } else {
        legend += `${color}██${COLORS.RESET}`;
      }
      if (labels[i]) {
        legend += `${COLORS.DIM}${labels[i]}${COLORS.RESET} `;
      }
    }

    legend += `  ${COLORS.DIM}*N=patterns !N=anomaly${COLORS.RESET}`;

    return legend;
  }

  /**
   * Render footer with stats
   */
  private renderFooter(): string {
    if (!this.lastHeatmap) return '';

    const { minHalfLife, maxHalfLife, lastUpdate } = this.lastHeatmap;
    const age = Date.now() - lastUpdate;

    const parts = [
      `${COLORS.DIM}Range: ${this.formatHalfLife(minHalfLife)}-${this.formatHalfLife(maxHalfLife)}${COLORS.RESET}`,
      `${COLORS.DIM}Frame: ${this.frameCount}${COLORS.RESET}`,
      age > 5000
        ? `${COLORS.YELLOW}Stale: ${Math.round(age / 1000)}s${COLORS.RESET}`
        : `${COLORS.DIM}Age: ${age}ms${COLORS.RESET}`,
    ];

    return parts.join('  ');
  }

  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Reset panel state
   */
  reset(): void {
    this.lastHeatmap = null;
    this.frameCount = 0;
  }
}

/**
 * Create heatmap panel with config
 */
export function createHeatmapPanel(config?: Partial<HeatmapPanelConfig>): HalfLifeHeatmapPanel {
  return new HalfLifeHeatmapPanel(config);
}

/**
 * Render heatmap directly from data
 */
export function renderHalfLifeHeatmap(
  heatmap: PropagationHeatmap,
  config?: Partial<HeatmapPanelConfig>
): string {
  const panel = new HalfLifeHeatmapPanel(config);
  panel.update(heatmap);
  return panel.render();
}

/**
 * Create empty heatmap structure for initialization
 */
export function createEmptyHeatmap(
  bookmakers: readonly string[],
  tiers: readonly MarketTier[] = [
    MarketTier.MAIN_LINE,
    MarketTier.TEAM_TOTALS,
    MarketTier.QUARTER_HALF,
    MarketTier.PLAYER_PROPS,
    MarketTier.ALT_LINES,
    MarketTier.PROP_COMBOS,
  ]
): PropagationHeatmap {
  const cells: HeatmapCell[][] = [];
  const rowLabels: string[] = [];
  const columnLabels = [...bookmakers];

  for (let tierIdx = 0; tierIdx < tiers.length; tierIdx++) {
    const tier = tiers[tierIdx];
    const tierTarget = TIER_HALFLIFE_TARGETS[tier];
    rowLabels.push(tierTarget.name);

    const tierCells: HeatmapCell[] = [];
    for (let colIdx = 0; colIdx < bookmakers.length; colIdx++) {
      tierCells.push({
        row: tierIdx,
        col: colIdx,
        tier,
        bookmaker: bookmakers[colIdx],
        halfLifeMs: 0,
        heat: 0,
        patternCount: 0,
        isAnomalous: false,
      });
    }
    cells.push(tierCells);
  }

  return {
    cells,
    rowLabels,
    columnLabels,
    minHalfLife: 0,
    maxHalfLife: 0,
    lastUpdate: Date.now(),
  };
}

/**
 * Calculate heat value from half-life and tier targets
 */
export function calculateHeat(halfLifeMs: number, tier: MarketTier): number {
  const target = TIER_HALFLIFE_TARGETS[tier];
  const { min, max } = target;

  // Normalize: below min = 0 (cold), above max = 1 (hot)
  if (halfLifeMs <= min) return 0;
  if (halfLifeMs >= max * 2) return 1; // Double max = maximum heat

  // Linear interpolation between min and max*2
  return (halfLifeMs - min) / (max * 2 - min);
}

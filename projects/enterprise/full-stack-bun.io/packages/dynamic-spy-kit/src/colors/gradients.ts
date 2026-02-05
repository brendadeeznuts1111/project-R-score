/**
 * @dynamic-spy/kit - Gradient Generators
 *
 * Smooth color gradients for edge, latency, volume visualization
 * True color (24-bit) interpolation with Bun.color() integration
 */

import {
  type ArbColor,
  fgRGB,
  bgRGB,
  RESET,
  toArbColor,
  GREENS,
  REDS,
  YELLOWS,
  CYANS,
  BLUES,
  GRAYS,
} from './bright-ansi';

// ============================================================================
// 1. GRADIENT TYPES
// ============================================================================

export interface GradientStop {
  position: number;  // 0-1
  color: ArbColor;
}

export interface Gradient {
  stops: GradientStop[];
  interpolate: (t: number) => ArbColor;
}

// ============================================================================
// 2. COLOR INTERPOLATION
// ============================================================================

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Interpolate between two colors
 */
function interpolateColors(c1: ArbColor, c2: ArbColor, t: number): ArbColor {
  const r = Math.round(lerp(c1.rgb[0], c2.rgb[0], t));
  const g = Math.round(lerp(c1.rgb[1], c2.rgb[1], t));
  const b = Math.round(lerp(c1.rgb[2], c2.rgb[2], t));

  return {
    code: 0,  // True color, no 256 code
    ansi: fgRGB(r, g, b),
    ansiBg: bgRGB(r, g, b),
    rgb: [r, g, b] as const,
    hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
    packed: (r << 16) | (g << 8) | b,
  };
}

/**
 * Create gradient from stops
 */
function createGradient(stops: GradientStop[]): Gradient {
  // Sort stops by position
  const sorted = [...stops].sort((a, b) => a.position - b.position);

  return {
    stops: sorted,
    interpolate(t: number): ArbColor {
      const clamped = clamp(t, 0, 1);

      // Find surrounding stops
      let lower = sorted[0];
      let upper = sorted[sorted.length - 1];

      for (let i = 0; i < sorted.length - 1; i++) {
        if (clamped >= sorted[i].position && clamped <= sorted[i + 1].position) {
          lower = sorted[i];
          upper = sorted[i + 1];
          break;
        }
      }

      // Interpolate between stops
      const range = upper.position - lower.position;
      const localT = range === 0 ? 0 : (clamped - lower.position) / range;

      return interpolateColors(lower.color, upper.color, localT);
    },
  };
}

// ============================================================================
// 3. PRESET GRADIENTS
// ============================================================================

/**
 * Edge gradient: Red → Yellow → Green
 * Maps -5% to +5% edge
 */
export const EDGE_GRADIENT = createGradient([
  { position: 0.0, color: REDS.BRIGHT },      // -5%: Bright red
  { position: 0.2, color: REDS.CORAL },       // -3%: Coral
  { position: 0.4, color: YELLOWS.ORANGE },   // -1%: Orange
  { position: 0.5, color: YELLOWS.GOLD },     //  0%: Yellow (break-even)
  { position: 0.6, color: YELLOWS.LEMON },    // +1%: Light yellow
  { position: 0.8, color: GREENS.EMERALD },   // +3%: Emerald green
  { position: 1.0, color: GREENS.BRIGHT },    // +5%: Bright green
]);

/**
 * Get color for edge percentage
 * @param edge - Edge as decimal (-0.05 to +0.05)
 */
export function edgeGradient(edge: number): ArbColor {
  // Map -5% to +5% → 0 to 1
  const t = clamp((edge + 0.05) / 0.10, 0, 1);
  return EDGE_GRADIENT.interpolate(t);
}

/**
 * Latency gradient: Green → Yellow → Red
 * Maps 0ms to 1000ms+
 */
export const LATENCY_GRADIENT = createGradient([
  { position: 0.0, color: GREENS.BRIGHT },    // 0ms: Excellent
  { position: 0.05, color: GREENS.EMERALD },  // 50ms: Great
  { position: 0.1, color: GREENS.SEA },       // 100ms: Good
  { position: 0.2, color: YELLOWS.GOLD },     // 200ms: Acceptable
  { position: 0.5, color: YELLOWS.ORANGE },   // 500ms: Warning
  { position: 0.8, color: REDS.CORAL },       // 800ms: Bad
  { position: 1.0, color: REDS.BRIGHT },      // 1000ms+: Critical
]);

/**
 * Get color for latency
 * @param ms - Latency in milliseconds (0-1000+)
 */
export function latencyGradient(ms: number): ArbColor {
  const t = clamp(ms / 1000, 0, 1);
  return LATENCY_GRADIENT.interpolate(t);
}

/**
 * Volume gradient: Gray → Blue → Cyan
 * Logarithmic scale for volume visualization
 */
export const VOLUME_GRADIENT = createGradient([
  { position: 0.0, color: GRAYS.GRAY_6 },     // Very low
  { position: 0.2, color: GRAYS.GRAY_12 },    // Low
  { position: 0.4, color: BLUES.SLATE },      // Below average
  { position: 0.6, color: BLUES.AZURE },      // Average
  { position: 0.8, color: CYANS.AQUA },       // High
  { position: 1.0, color: CYANS.BRIGHT },     // Very high
]);

/**
 * Get color for volume (normalized 0-1 or raw with log scale)
 * @param volume - Volume value (0-1 normalized, or raw value)
 * @param maxVolume - If provided, applies log scale normalization
 */
export function volumeGradient(volume: number, maxVolume?: number): ArbColor {
  let t: number;

  if (maxVolume !== undefined && maxVolume > 0) {
    // Log scale normalization
    const logMax = Math.log10(maxVolume + 1);
    const logVal = Math.log10(volume + 1);
    t = clamp(logVal / logMax, 0, 1);
  } else {
    t = clamp(volume, 0, 1);
  }

  return VOLUME_GRADIENT.interpolate(t);
}

/**
 * Confidence gradient: Red → Yellow → Green
 */
export const CONFIDENCE_GRADIENT = createGradient([
  { position: 0.0, color: REDS.BRIGHT },
  { position: 0.3, color: YELLOWS.ORANGE },
  { position: 0.5, color: YELLOWS.GOLD },
  { position: 0.7, color: GREENS.SEA },
  { position: 1.0, color: GREENS.BRIGHT },
]);

/**
 * Get color for confidence level
 * @param confidence - Confidence value (0-1)
 */
export function confidenceGradient(confidence: number): ArbColor {
  return CONFIDENCE_GRADIENT.interpolate(clamp(confidence, 0, 1));
}

/**
 * Heat gradient: Blue → Cyan → Green → Yellow → Red
 * For heat maps and intensity visualization
 */
export const HEAT_GRADIENT = createGradient([
  { position: 0.0, color: BLUES.BRIGHT },
  { position: 0.25, color: CYANS.BRIGHT },
  { position: 0.5, color: GREENS.BRIGHT },
  { position: 0.75, color: YELLOWS.BRIGHT },
  { position: 1.0, color: REDS.BRIGHT },
]);

/**
 * Get color for heat map value
 * @param value - Normalized value (0-1)
 */
export function heatGradient(value: number): ArbColor {
  return HEAT_GRADIENT.interpolate(clamp(value, 0, 1));
}

/**
 * Age gradient: Green → Yellow → Orange → Red → Gray
 * For staleness visualization (fresh → stale)
 */
export const AGE_GRADIENT = createGradient([
  { position: 0.0, color: GREENS.BRIGHT },    // Fresh
  { position: 0.25, color: GREENS.SEA },      // Recent
  { position: 0.5, color: YELLOWS.GOLD },     // Getting stale
  { position: 0.75, color: YELLOWS.ORANGE },  // Stale
  { position: 0.9, color: REDS.CORAL },       // Very stale
  { position: 1.0, color: GRAYS.GRAY_8 },     // Expired
]);

/**
 * Get color for data age
 * @param ageMs - Age in milliseconds
 * @param maxAgeMs - Maximum age before considered expired (default: 60000ms)
 */
export function ageGradient(ageMs: number, maxAgeMs = 60000): ArbColor {
  const t = clamp(ageMs / maxAgeMs, 0, 1);
  return AGE_GRADIENT.interpolate(t);
}

// ============================================================================
// 4. CUSTOM GRADIENT BUILDER
// ============================================================================

export interface GradientBuilder {
  addStop(position: number, color: ArbColor | string | number): GradientBuilder;
  build(): Gradient;
}

/**
 * Create a custom gradient
 */
export function gradient(): GradientBuilder {
  const stops: GradientStop[] = [];

  return {
    addStop(position: number, color: ArbColor | string | number): GradientBuilder {
      let arbColor: ArbColor;

      if (typeof color === 'string' || typeof color === 'number') {
        const converted = toArbColor(color);
        if (!converted) throw new Error(`Invalid color: ${color}`);
        arbColor = converted;
      } else {
        arbColor = color;
      }

      stops.push({ position: clamp(position, 0, 1), color: arbColor });
      return this;
    },

    build(): Gradient {
      if (stops.length < 2) {
        throw new Error('Gradient requires at least 2 stops');
      }
      return createGradient(stops);
    },
  };
}

// ============================================================================
// 5. GRADIENT RENDERING
// ============================================================================

/**
 * Render a gradient bar as colored text
 */
export function renderGradientBar(
  grad: Gradient,
  width: number,
  char = '█'
): string {
  let result = '';
  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const color = grad.interpolate(t);
    result += color.ansi + char;
  }
  return result + RESET;
}

/**
 * Render a value on a gradient scale
 */
export function renderGradientValue(
  value: number,
  grad: Gradient,
  width: number,
  filledChar = '█',
  emptyChar = '░'
): string {
  const clamped = clamp(value, 0, 1);
  const filledWidth = Math.round(clamped * width);

  let result = '';

  // Filled portion with gradient color
  for (let i = 0; i < filledWidth; i++) {
    const t = i / (width - 1);
    const color = grad.interpolate(t);
    result += color.ansi + filledChar;
  }

  // Empty portion in gray
  if (filledWidth < width) {
    result += GRAYS.GRAY_4.ansi + emptyChar.repeat(width - filledWidth);
  }

  return result + RESET;
}

/**
 * Create a gradient legend
 */
export function renderGradientLegend(
  grad: Gradient,
  labels: { position: number; label: string }[],
  width: number
): string {
  const bar = renderGradientBar(grad, width);

  // Create label line
  let labelLine = ' '.repeat(width);
  const labelArr = labelLine.split('');

  for (const { position, label } of labels) {
    const pos = Math.round(position * (width - 1));
    const startPos = Math.max(0, pos - Math.floor(label.length / 2));

    for (let i = 0; i < label.length && startPos + i < width; i++) {
      labelArr[startPos + i] = label[i];
    }
  }

  return bar + '\n' + labelArr.join('');
}

// ============================================================================
// 6. SPARKLINE WITH GRADIENT
// ============================================================================

const SPARK_BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * Create a sparkline with gradient coloring
 */
export function gradientSparkline(
  values: number[],
  grad: Gradient = EDGE_GRADIENT
): string {
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  let result = '';

  for (let i = 0; i < values.length; i++) {
    const normalized = (values[i] - min) / range;
    const blockIndex = Math.round(normalized * 8);
    const color = grad.interpolate(normalized);
    result += color.ansi + SPARK_BLOCKS[blockIndex];
  }

  return result + RESET;
}

/**
 * Create a mini bar chart with gradient
 */
export function gradientBars(
  values: number[],
  height: number,
  grad: Gradient = VOLUME_GRADIENT
): string[] {
  if (values.length === 0) return [];

  const max = Math.max(...values);
  const lines: string[] = [];

  for (let row = height - 1; row >= 0; row--) {
    let line = '';
    const threshold = (row + 1) / height;

    for (let i = 0; i < values.length; i++) {
      const normalized = max > 0 ? values[i] / max : 0;
      const color = grad.interpolate(normalized);

      if (normalized >= threshold) {
        line += color.ansi + '█';
      } else if (normalized >= threshold - (1 / height / 2)) {
        line += color.ansi + '▄';
      } else {
        line += ' ';
      }
    }

    lines.push(line + RESET);
  }

  return lines;
}

// ============================================================================
// 7. UTILITY EXPORTS
// ============================================================================

// Note: createGradient, interpolateColors, lerp, clamp are already exported above
// The types Gradient and GradientStop are exported at their definition

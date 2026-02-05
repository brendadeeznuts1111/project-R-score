/**
 * Visualizations - Terminal-based data visualizations
 * Placeholder for future WebGL and chart visualizations
 */

export interface ChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

export interface VisualizationOptions {
  width?: number;
  height?: number;
  theme?: 'quantum' | 'matrix' | 'classic';
  animate?: boolean;
}

/**
 * ASCII Sparkline generator
 */
export function sparkline(data: number[], width = 20): string {
  if (data.length === 0) return '';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const chars = ['_', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];

  // Resample data to fit width
  const step = data.length / width;
  const resampled: number[] = [];

  for (let i = 0; i < width; i++) {
    const idx = Math.floor(i * step);
    resampled.push(data[idx]);
  }

  return resampled.map(val => {
    const normalized = (val - min) / range;
    const charIdx = Math.floor(normalized * (chars.length - 1));
    return chars[charIdx];
  }).join('');
}

/**
 * ASCII Bar chart generator
 */
export function barChart(data: ChartData, options: VisualizationOptions = {}): string {
  const { width = 40 } = options;
  const maxValue = Math.max(...data.values);

  const lines = data.labels.map((label, i) => {
    const value = data.values[i];
    const barWidth = Math.floor((value / maxValue) * width);
    const bar = '\u2588'.repeat(barWidth);
    const padding = ' '.repeat(width - barWidth);

    return `${label.padEnd(10)} |${bar}${padding}| ${value.toFixed(2)}`;
  });

  return lines.join('\n');
}

/**
 * ASCII Progress bar
 */
export function progressBar(
  value: number,
  max: number,
  width = 20,
  filled = '\u2588',
  empty = '\u2591'
): string {
  const percent = Math.min(value / max, 1);
  const filledCount = Math.floor(percent * width);
  const emptyCount = width - filledCount;

  return `[${filled.repeat(filledCount)}${empty.repeat(emptyCount)}] ${(percent * 100).toFixed(1)}%`;
}

// Future: WebGL visualization components will be added here
// when feature('WEBGL') is enabled

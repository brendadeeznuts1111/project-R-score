/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
/**
 * 🎨 FactoryWager Color Theme v4.0
 * 
 * The heart of FactoryWager profiling - color-enhanced diagnostics
 * with severity-based theming and terminal-safe output.
 * 
 * @version 4.0
 * @author FactoryWager Team
 */

// ============================================================================
// FACTORYWAGER COLOR PALETTE
// ============================================================================

export const FW_COLORS = {
  // Primary brand colors
  primary: '#3b82f6',      // FactoryWager blue
  secondary: '#8b5cf6',    // Purple accent
  accent: '#06b6d4',       // Cyan highlight
  
  // Status colors (severity-based)
  success: '#22c55e',      // Green - all good
  warning: '#f59e0b',      // Amber - caution
  error: '#ef4444',        // Red - critical
  muted: '#6b7280',        // Gray - neutral
  
  // Specialized colors
  background: '#1f2937',   // Dark background
  highlight: '#fbbf24',    // Yellow highlight
  info: '#60a5fa',         // Light blue info
  
  // Extended palette for profiling
  cpu: '#3b82f6',          // CPU metrics - blue
  memory: '#22c55e',       // Memory - green
  network: '#f59e0b',      // Network - amber
  disk: '#8b5cf6',         // Disk I/O - purple
  cache: '#06b6d4',        // Cache - cyan
} as const;

export type FactoryWagerColor = keyof typeof FW_COLORS;

// ============================================================================
// STYLING FUNCTIONS
// ============================================================================

/**
 * Apply FactoryWager color styling to text
 */
export function styled(text: string, color: FactoryWagerColor, background?: FactoryWagerColor): string {
  const fgColor = FW_COLORS[color];
  const bgColor = background ? FW_COLORS[background] : undefined;
  
  // Use Bun.color for ANSI output (fallback to plain text if not available)
  try {
    const fg = Bun.color(fgColor, 'ansi') || '';
    const bg = bgColor ? (Bun.color(bgColor, 'ansi', 'background') || '') : '';
    const reset = Bun.color('reset', 'ansi') || '';
    
    if (bgColor) {
      return fg + text + bg + reset;
    }
    return fg + text + reset;
  } catch {
    return text;
  }
}

/**
 * Create a color bar for visual separation
 */
export function colorBar(color: FactoryWagerColor, length: number = 10): string {
  const bar = '━'.repeat(length);
  return styled(bar, color);
}

/**
 * Get color based on severity level
 */
export function getSeverityColor(severity: 'success' | 'warning' | 'error' | 'muted'): FactoryWagerColor {
  return severity;
}

/**
 * Analyze numeric value and return severity color
 */
export function analyzeSeverity(value: number, thresholds: { warning: number; error: number }): FactoryWagerColor {
  if (value >= thresholds.error) return 'error';
  if (value >= thresholds.warning) return 'warning';
  return 'success';
}

// ============================================================================
// PROFILING SPECIFIC STYLING
// ============================================================================

/**
 * Style profiling metrics with color coding
 */
export function styleMetric(value: number, unit: string, type: 'cpu' | 'memory' | 'network' | 'disk'): string {
  const color = FW_COLORS[type];
  return styled(`${value}${unit}`, type as FactoryWagerColor);
}

/**
 * Style percentage changes
 */
export function stylePercentage(percent: number): string {
  const color = percent > 0 ? 'success' : percent < 0 ? 'error' : 'muted';
  const symbol = percent > 0 ? '↑' : percent < 0 ? '↓' : '→';
  return styled(`${symbol}${Math.abs(percent)}%`, color);
}

/**
 * Style code blocks with syntax highlighting
 */
export function styleCode(code: string, language?: string): string {
  return styled(code, 'background', 'primary');
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

export const log = {
  info: (message: string) => console.log(styled('ℹ️', 'info') + ' ' + message),
  success: (message: string) => console.log(styled('✅', 'success') + ' ' + message),
  warning: (message: string) => console.log(styled('⚠️', 'warning') + ' ' + message),
  error: (message: string) => console.log(styled('❌', 'error') + ' ' + message),
  debug: (message: string) => console.log(styled('🐛', 'muted') + ' ' + message),
  
  /**
   * Color-coded section header
   */
  section: (title: string, color: FactoryWagerColor = 'primary') => {
    console.log('\n' + colorBar(color, 20));
    console.log(styled(`  ${title}  `, color, 'background'));
    console.log(colorBar(color, 20));
  },
  
  /**
   * Metric display with color coding
   */
  metric: (label: string, value: string | number, color: FactoryWagerColor = 'primary') => {
    console.log(styled(`  ${label}: `, 'muted') + styled(String(value), color));
  },
};

// ============================================================================
// VISUAL METADATA FOR R2 STORAGE
// ============================================================================

export interface VisualMetadata {
  'visual:theme': string;
  'visual:color-hex': string;
  'visual:color-rgb': string;
  'visual:color-hsl': string;
  'visual:ansi-sample': string;
  'profile:severity': string;
}

/**
 * Generate visual metadata for R2 storage
 */
export function generateVisualMetadata(severity: FactoryWagerColor): VisualMetadata {
  const color = FW_COLORS[severity];
  
  return {
    'visual:theme': `factorywager-${severity}`,
    'visual:color-hex': color,
    'visual:color-rgb': Bun.color(color, 'rgb') || '',
    'visual:color-hsl': Bun.color(color, 'hsl') || '',
    'visual:ansi-sample': Bun.color(color, 'ansi256') + '█' + Bun.color('reset', 'ansi256'),
    'profile:severity': severity,
  };
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

/**
 * Animated progress bar with color transitions
 */
export function animateProgress(message: string, color: FactoryWagerColor = 'primary'): void {
  const frames = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  frames.forEach((frame, i) => {
    setTimeout(() => {
      process.stdout.write(`\r${styled(message + ' ' + frame, color)}`);
      if (i === frames.length - 1) {
        console.log();
      }
    }, i * 100);
  });
}

// ============================================================================
// MARKDOWN COLORIZATION
// ============================================================================

/**
 * Colorize markdown with FactoryWager theme
 */
export function colorizeMarkdown(md: string): string {
  return md
    .replace(/^# (.+)/gm, (_, title) => styled('✨ ' + title, 'accent'))
    .replace(/^## (.+)/gm, (_, title) => styled('  🔧 ' + title, 'primary'))
    .replace(/^### (.+)/gm, (_, title) => styled('    ⚙️  ' + title, 'muted'))
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => 
      styled(code, 'background', 'primary'))
    .replace(/(\d+\.\d+)% slower/g, (_, pct) => styled(`${pct}% slower`, 'error'))
    .replace(/(\d+\.\d+)% faster/g, (_, pct) => styled(`${pct}% faster`, 'success'))
    .replace(/(\d+\.\d+)ms/g, (_, ms) => styled(`${ms}ms`, 'accent'))
    .replace(/(\d+)MB/g, (_, mb) => styled(`${mb}MB`, 'primary'));
}

// ============================================================================
// CLI EXPORT
// ============================================================================

if (import.meta.main) {
  console.log(styled('\n🎨 FactoryWager Color Theme v4.0', 'accent'));
  console.log(colorBar('primary', 30));
  
  log.section('Available Colors');
  Object.entries(FW_COLORS).forEach(([name, hex]) => {
    console.log(styled(`  ${name.padEnd(12)} `, 'muted') + styled(hex, name as FactoryWagerColor));
  });
  
  log.section('Example Usage');
  console.log(styled('  styled("Hello World", "primary")', 'code'));
  console.log('  ' + styled('Hello World', 'primary'));
  
  console.log(styled('\n🚀 Ready for FactoryWager profiling!', 'success'));
}

export default {
  FW_COLORS,
  styled,
  colorBar,
  getSeverityColor,
  analyzeSeverity,
  styleMetric,
  stylePercentage,
  styleCode,
  log,
  generateVisualMetadata,
  animateProgress,
  colorizeMarkdown,
};

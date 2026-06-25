// lib/utils/enhanced-status-matrix.ts — Enhanced status matrix with advanced HSL integration

import {
  getDynamicStatusColor,
  ensureContrast,
  autoAdjustContrast,
  perceivedBrightness,
} from './advanced-hsl-system';
import { colorize, ColorStatus } from './color-system';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ContextType = 'light' | 'dark';

export interface StatusConfig {
  status: ColorStatus;
  severity: SeverityLevel;
  context: ContextType;
  ensureWCAG?: boolean;
  backgroundHsl?: { h: number; s: number; l: number };
}

export interface StatusDisplay {
  text: string;
  ansi: string;
  hsl: string;
  hex: string;
  brightness: number;
  wcagCompliant: boolean;
}

/**
 * Enhanced status display with advanced HSL features
 */
export function createEnhancedStatus(config: StatusConfig, customText?: string): StatusDisplay {
  const { status, severity, context, ensureWCAG, backgroundHsl } = config;

  // Get dynamic HSL color based on status and severity
  const hslString = getDynamicStatusColor(status, severity, context);

  // Parse HSL values for advanced calculations
  const hslMatch = hslString.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
  if (!hslMatch) {
    console.error('Invalid HSL string:', JSON.stringify(hslString));
    throw new Error(`Invalid HSL string: ${hslString}`);
  }

  const hslValues = {
    h: parseInt(hslMatch[1]),
    s: parseInt(hslMatch[2]),
    l: parseInt(hslMatch[3]),
  };

  // Apply WCAG auto-adjustment if requested
  let finalHsl = hslValues;
  let compliant = true;

  if (ensureWCAG && backgroundHsl) {
    finalHsl = autoAdjustContrast(hslValues, backgroundHsl, 4.5);
    const contrastCheck = ensureContrast(finalHsl, backgroundHsl);
    compliant = contrastCheck.compliant;
  }

  // Generate final color string
  const finalHslString = `hsl(${finalHsl.h}, ${finalHsl.s}%, ${finalHsl.l}%)`;
  const hex = Bun.color(finalHslString, 'hex') || '#000000';
  const ansi = Bun.color(finalHslString, 'ansi') || '';

  // Calculate perceived brightness
  const brightness = perceivedBrightness(finalHsl.h, finalHsl.s, finalHsl.l);

  // Generate display text
  const severityIcon = getSeverityIcon(severity);
  const statusIcon = getStatusIcon(status);
  const text = customText || `${statusIcon} ${status.toUpperCase()} (${severity})`;

  return {
    text,
    ansi: `${ansi}${text}\x1b[0m`,
    hsl: finalHslString,
    hex,
    brightness,
    wcagCompliant: compliant,
  };
}

/**
 * Matrix of all status combinations with perceptual analysis
 */
export function generateStatusMatrix(
  context: ContextType = 'dark',
  backgroundHsl?: { h: number; s: number; l: number }
): Array<StatusDisplay & { status: ColorStatus; severity: SeverityLevel }> {
  const statuses: ColorStatus[] = ['success', 'warning', 'error', 'info'];
  const severities: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

  const matrix: Array<StatusDisplay & { status: ColorStatus; severity: SeverityLevel }> = [];

  for (const status of statuses) {
    for (const severity of severities) {
      const display = createEnhancedStatus({
        status,
        severity,
        context,
        ensureWCAG: !!backgroundHsl,
        backgroundHsl,
      });

      matrix.push({
        ...display,
        status,
        severity,
      });
    }
  }

  return matrix;
}

/**
 * Display the status matrix with advanced analysis
 */
export function displayStatusMatrix(
  context: ContextType = 'dark',
  backgroundHsl?: { h: number; s: number; l: number }
): void {
  const matrix = generateStatusMatrix(context, backgroundHsl);

  console.info(colorize(`🎯 ENHANCED STATUS MATRIX (${context.toUpperCase()})`, 'cyan', true));
  if (backgroundHsl) {
    console.info(
      colorize(
        `Background: hsl(${backgroundHsl.h}, ${backgroundHsl.s}%, ${backgroundHsl.l}%)`,
        'gray'
      )
    );
  }
  console.info(colorize('═'.repeat(80), 'gray'));
  console.info();

  const statuses: ColorStatus[] = ['success', 'warning', 'error', 'info'];

  statuses.forEach(status => {
    console.info(colorize(`${getStatusIcon(status)} ${status.toUpperCase()}`, 'white', true));
    console.info(colorize('─'.repeat(30), 'gray'));

    const statusItems = matrix.filter(item => item.status === status);
    statusItems.forEach(item => {
      const complianceIcon = backgroundHsl ? (item.wcagCompliant ? '✅' : '❌') : '○';
      console.info(`${complianceIcon} ${item.ansi}`);
      console.info(`   ${item.hex} | Brightness: ${(item.brightness * 100).toFixed(1)}%`);
      if (backgroundHsl && !item.wcagCompliant) {
        console.info(`   ${colorize('⚠️  WCAG AA not compliant', 'red')}`);
      }
      console.info();
    });
  });

  // Summary statistics
  const total = matrix.length;
  const wcagCompliant = backgroundHsl ? matrix.filter(m => m.wcagCompliant).length : total;
  const avgBrightness = matrix.reduce((sum, m) => sum + m.brightness, 0) / total;

  console.info(colorize('📊 MATRIX STATISTICS', 'magenta', true));
  console.info(`Total Combinations: ${total}`);
  if (backgroundHsl) {
    console.info(
      `WCAG AA Compliant: ${wcagCompliant}/${total} (${((wcagCompliant / total) * 100).toFixed(1)}%)`
    );
  }
  console.info(`Average Brightness: ${(avgBrightness * 100).toFixed(1)}%`);
  console.info(
    `Perceptual Range: ${(Math.max(...matrix.map(m => m.brightness)) - Math.min(...matrix.map(m => m.brightness))) * 100} points`
  );
}

/**
 * Helper functions for icons and symbols
 */
function getSeverityIcon(severity: SeverityLevel): string {
  switch (severity) {
    case 'low':
      return '🟢';
    case 'medium':
      return '🟡';
    case 'high':
      return '🟠';
    case 'critical':
      return '🔴';
  }
}

function getStatusIcon(status: ColorStatus): string {
  switch (status) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'info':
      return 'ℹ️';
    default:
      return '○';
  }
}

// Re-export perceivedBrightness for external use
export { perceivedBrightness } from './advanced-hsl-system';

// ──────────────────────────────────────────────────────────────────────────────
// DEMO & TESTING
// ──────────────────────────────────────────────────────────────────────────────

export function demoEnhancedStatusMatrix(): void {
  console.info(colorize('🚀 ENHANCED STATUS MATRIX DEMO', 'cyan', true));
  console.info();

  // Demo 1: Dark context (terminal default)
  console.info(colorize('🌙 DARK CONTEXT (Terminal)', 'blue', true));
  displayStatusMatrix('dark');
  console.info();

  // Demo 2: Light context
  console.info(colorize('☀️  LIGHT CONTEXT (Web)', 'yellow', true));
  displayStatusMatrix('light');
  console.info();

  // Demo 3: With background contrast checking
  console.info(colorize('♿ WITH WCAG CONTRAST CHECKING', 'green', true));
  console.info(colorize('Background: Dark blue header', 'gray'));
  displayStatusMatrix('light', { h: 210, s: 95, l: 20 });
}

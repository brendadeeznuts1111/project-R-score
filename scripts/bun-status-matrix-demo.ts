#!/usr/bin/env bun

/**
 * 🎯 Enhanced Status Matrix Demo
 *
 * Shows how to integrate advanced HSL techniques into your
 * daily development routine with perceptual uniformity.
 */

import { displayStatusMatrix, createEnhancedStatus, generateStatusMatrix } from '../lib/utils/enhanced-status-matrix.ts';
import { colorize } from '../lib/utils/color-system.ts';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'matrix') {
  const context = (args[1] as 'light' | 'dark') || 'dark';
  const hasBackground = args[2] === 'contrast';

  const backgroundHsl = hasBackground ? { h: 210, s: 95, l: 20 } : undefined;

  displayStatusMatrix(context, backgroundHsl);

} else if (command === 'single') {
  const status = (args[1] as 'success' | 'warning' | 'error' | 'info') || 'success';
  const severity = (args[2] as 'low' | 'medium' | 'high' | 'critical') || 'medium';
  const context = (args[3] as 'light' | 'dark') || 'dark';

  const display = createEnhancedStatus({
    status: status as any,
    severity: severity as any,
    context: context as any,
    ensureWCAG: false
  });

  console.info(colorize('🎯 SINGLE STATUS DISPLAY', 'cyan', true));
  console.info(display.ansi);
  console.info(`Hex: ${display.hex}`);
  console.info(`HSL: ${display.hsl}`);
  console.info(`Brightness: ${(display.brightness * 100).toFixed(1)}%`);

} else if (command === 'routine') {
  console.info(colorize('🚀 DAILY DEVELOPMENT ROUTINE - ENHANCED', 'cyan', true));
  console.info(colorize('Using Advanced HSL Status Matrix', 'gray'));
  console.info();

  // Simulate daily routine with enhanced status displays
  const routineSteps = [
    { name: 'Bun Quick Info', status: 'success' as const, severity: 'low' as const, message: 'Version 1.3.9, all systems green' },
    { name: 'GitHub Integration', status: 'success' as const, severity: 'medium' as const, message: 'All checks passed, latest commit synced' },
    { name: 'Deep Links', status: 'info' as const, severity: 'low' as const, message: 'Bun.secrets API links generated' },
    { name: 'MCP Monitor', status: 'warning' as const, severity: 'medium' as const, message: 'Cache hit rate at 72%, optimization needed' },
    { name: 'AI Insights', status: 'success' as const, severity: 'high' as const, message: 'Performance optimizations ready' }
  ];

  routineSteps.forEach((step, i) => {
    const display = createEnhancedStatus({
      status: step.status,
      severity: step.severity,
      context: 'dark'
    });

    console.info(`${i + 1}. ${display.ansi}`);
    console.info(`   ${step.message}`);
    console.info();
  });

  console.info(colorize('✨ All systems operational with perceptual color optimization!', 'green', true));

} else if (command === 'compare') {
  console.info(colorize('🔄 STATUS MATRIX COMPARISON', 'magenta', true));
  console.info();

  const status = (args[1] as 'success' | 'warning' | 'error' | 'info') || 'error';

  console.info(colorize(`Comparing "${status}" across all severities:`, 'yellow'));
  console.info();

  ['low', 'medium', 'high', 'critical'].forEach(severity => {
    const oldDisplay = colorize(`${status} (${severity})`, status as any);
    const newDisplay = createEnhancedStatus({
      status: status as any,
      severity: severity as any,
      context: 'dark'
    });

    console.info(colorize(`${severity.toUpperCase()}:`, 'white', true));
    console.info(`  Old: ${oldDisplay}`);
    console.info(`  New: ${newDisplay.ansi}`);
    console.info(`  Hex: ${newDisplay.hex} | Brightness: ${(newDisplay.brightness * 100).toFixed(1)}%`);
    console.info();
  });

} else {
  console.info(colorize('🎯 Enhanced Status Matrix Demo', 'cyan', true));
  console.info(colorize('Usage:', 'yellow'));
  console.info('  bun run bun-status-matrix-demo.ts matrix [dark|light] [contrast]  # Full matrix');
  console.info('  bun run bun-status-matrix-demo.ts single [status] [severity] [context]  # Single status');
  console.info('  bun run bun-status-matrix-demo.ts routine                    # Daily routine demo');
  console.info('  bun run bun-status-matrix-demo.ts compare [status]           # Compare old vs new');
  console.info();
  console.info(colorize('Examples:', 'gray'));
  console.info('  bun run bun-status-matrix-demo.ts matrix dark contrast');
  console.info('  bun run bun-status-matrix-demo.ts single error critical dark');
  console.info('  bun run bun-status-matrix-demo.ts compare warning');
  console.info();
  console.info(colorize('Run without args for this help', 'cyan'));
}
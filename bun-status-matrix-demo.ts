#!/usr/bin/env bun

/**
 * 🎯 Enhanced Status Matrix Demo
 *
 * Shows how to integrate advanced HSL techniques into your
 * daily development routine with perceptual uniformity.
 */

import { displayStatusMatrix, createEnhancedStatus, generateStatusMatrix } from './lib/utils/enhanced-status-matrix.ts';
import { colorize } from './lib/utils/color-system.ts';

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

  console.log(colorize('🎯 SINGLE STATUS DISPLAY', 'cyan', true));
  console.log(display.ansi);
  console.log(`Hex: ${display.hex}`);
  console.log(`HSL: ${display.hsl}`);
  console.log(`Brightness: ${(display.brightness * 100).toFixed(1)}%`);

} else if (command === 'routine') {
  console.log(colorize('🚀 DAILY DEVELOPMENT ROUTINE - ENHANCED', 'cyan', true));
  console.log(colorize('Using Advanced HSL Status Matrix', 'gray'));
  console.log();

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

    console.log(`${i + 1}. ${display.ansi}`);
    console.log(`   ${step.message}`);
    console.log();
  });

  console.log(colorize('✨ All systems operational with perceptual color optimization!', 'green', true));

} else if (command === 'compare') {
  console.log(colorize('🔄 STATUS MATRIX COMPARISON', 'magenta', true));
  console.log();

  const status = (args[1] as 'success' | 'warning' | 'error' | 'info') || 'error';

  console.log(colorize(`Comparing "${status}" across all severities:`, 'yellow'));
  console.log();

  ['low', 'medium', 'high', 'critical'].forEach(severity => {
    const oldDisplay = colorize(`${status} (${severity})`, status as any);
    const newDisplay = createEnhancedStatus({
      status: status as any,
      severity: severity as any,
      context: 'dark'
    });

    console.log(colorize(`${severity.toUpperCase()}:`, 'white', true));
    console.log(`  Old: ${oldDisplay}`);
    console.log(`  New: ${newDisplay.ansi}`);
    console.log(`  Hex: ${newDisplay.hex} | Brightness: ${(newDisplay.brightness * 100).toFixed(1)}%`);
    console.log();
  });

} else {
  console.log(colorize('🎯 Enhanced Status Matrix Demo', 'cyan', true));
  console.log(colorize('Usage:', 'yellow'));
  console.log('  bun run bun-status-matrix-demo.ts matrix [dark|light] [contrast]  # Full matrix');
  console.log('  bun run bun-status-matrix-demo.ts single [status] [severity] [context]  # Single status');
  console.log('  bun run bun-status-matrix-demo.ts routine                    # Daily routine demo');
  console.log('  bun run bun-status-matrix-demo.ts compare [status]           # Compare old vs new');
  console.log();
  console.log(colorize('Examples:', 'gray'));
  console.log('  bun run bun-status-matrix-demo.ts matrix dark contrast');
  console.log('  bun run bun-status-matrix-demo.ts single error critical dark');
  console.log('  bun run bun-status-matrix-demo.ts compare warning');
  console.log();
  console.log(colorize('Run without args for this help', 'cyan'));
}
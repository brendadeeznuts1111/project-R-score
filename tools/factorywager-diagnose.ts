#!/usr/bin/env bun
/**
 * 🏭 FactoryWager Diagnostics Tool
 * 
 * Complete diagnostic with color-coded output
 * 
 * @version 4.0
 */

import { styled, log, FW_COLORS } from '../lib/theme/colors.ts';
import { Utils } from '../lib/utils/index.ts';
import { FACTORYWAGER_CONFIG } from '../lib/config/index.ts';

// Simulate diagnostic data
function generateDiagnosticReport(): string {
  const cpu = Math.random() * 200; // 0-200ms
  const memory = Math.random() * 1024; // 0-1024MB
  const network = Math.random() * 500; // 0-500ms
  const hasErrors = Math.random() > 0.8;
  const hasWarnings = Math.random() > 0.6;
  
  let report = '';
  
  report += `CPU: ${Utils.Performance.formatMs(cpu)}\n`;
  report += `Memory: ${Utils.Performance.formatBytes(memory * 1024 * 1024)}\n`;
  report += `Network: ${Utils.Performance.formatMs(network)}\n`;
  
  if (hasErrors) {
    report += `Errors: High memory usage detected\n`;
  }
  
  if (hasWarnings) {
    report += `Warnings: CPU usage above threshold\n`;
  }
  
  if (!hasErrors && !hasWarnings) {
    report += `Status: All systems operational\n`;
  }
  
  return report;
}

// Main diagnostic function
async function runDiagnostics() {
  log.section('FactoryWager Diagnostics v4.0', 'accent');
  
  const report = generateDiagnosticReport();
  
  // Color-code by section
  const sections = {
    "CPU": "primary",
    "Memory": "accent", 
    "Network": "success",
    "Errors": "error",
    "Warnings": "warning",
    "Status": "success"
  };
  
  let coloredReport = report;
  Object.entries(sections).forEach(([section, color]) => {
    const regex = new RegExp(`^${section}:.*$`, "gm");
    coloredReport = coloredReport.replace(regex, 
      styled(`$&`, color as keyof typeof FW_COLORS));
  });
  
  // Highlight metrics
  coloredReport = coloredReport.replace(/(\d+\.\d+)ms/g, styled("$1ms", "accent"));
  coloredReport = coloredReport.replace(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/g, (_, size, unit) => 
    styled(`${size}${unit}`, "primary"));
  
  console.log(coloredReport);
  
  // Extract and tag dominant issue color
  const errorMatch = report.match(/Errors: (.+)/);
  const dominantColor = errorMatch ? FW_COLORS.error : FW_COLORS.success;
  
  // Store with color context (simulated R2 upload)
  const key = `diagnostics/${Date.now()}.txt`;
  const metadata = {
    "diagnostic:dominant-color": Bun.color(dominantColor, "hex"),
    "diagnostic:has-errors": (!!errorMatch).toString()
  };
  
  log.metric('Stored to', key, 'muted');
  log.metric('Dominant color', Bun.color(dominantColor, "hex"), 'accent');
  log.metric('Has errors', metadata["diagnostic:has-errors"], errorMatch ? 'error' : 'success');
  
  console.log('\n' + styled('🎯 Diagnostic complete!', 'success'));
}

// Run if called directly
if (import.meta.main) {
  await runDiagnostics();
}

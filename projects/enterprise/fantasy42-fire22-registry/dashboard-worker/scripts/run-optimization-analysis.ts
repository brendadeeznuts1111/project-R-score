#!/usr/bin/env bun

/**
 * 🚀 Run Workspace Optimization Analysis
 *
 * Entry point script to run the comprehensive workspace optimization analysis.
 * This script provides a complete review of the workspace orchestration system
 * with recommendations for memory management, bundle size optimization, and
 * performance improvements.
 */

import WorkspaceOptimizationAnalyzer from './workspace-optimization-analyzer.ts';
import { Logger, LogLevel } from './shared-utilities.ts';

async function main() {
  // Set up logging
  Logger.setLevel(LogLevel.INFO);

  console.log('🚀 Fire22 Workspace Optimization Analysis');
  console.log('='.repeat(50));

  try {
    const analyzer = new WorkspaceOptimizationAnalyzer();

    // Generate and display comprehensive optimization report
    await analyzer.generateOptimizationReport();
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

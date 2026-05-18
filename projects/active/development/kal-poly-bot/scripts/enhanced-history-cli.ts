#!/usr/bin/env bun
// scripts/enhanced-history-cli.ts - Unified HistoryCLI + Codebase Search
import { enhancedHistoryCLI } from '../surgical-precision-mcp/history-cli-manager.ts';

// Run enhanced HistoryCLI
if (import.meta.main) {
  const args = process.argv.slice(2);
  enhancedHistoryCLI(args).catch(console.error);
}
#!/usr/bin/env bun

import {
  generatePatternMatrixReport,
  generateCrossReferenceMatrixASCII,
  generateSubmarketReport,
  generateTensionReport,
  exportMatrixAsJSON
} from './matrix-visualization';

if (import.meta.main) {
  const command = Bun.argv[2] || 'full';
  const commandMap: Record<string, () => string> = {
    full: generatePatternMatrixReport,
    matrix: generateCrossReferenceMatrixASCII,
    submarkets: generateSubmarketReport,
    tensions: generateTensionReport,
    json: exportMatrixAsJSON
  };
  
  const handler = commandMap[command];
  if (!handler) {
    console.error('Usage: bun run matrix-report.ts [full|matrix|submarkets|tensions|json]');
    console.error('\nCommands:');
    console.error('  full       - Generate complete matrix report');
    console.error('  matrix     - Generate cross-reference matrix only');
    console.error('  submarkets - Generate submarket analysis only');
    console.error('  tensions   - Generate tension analysis only');
    console.error('  json       - Export matrix data as JSON');
    throw new Error(`Unknown command: ${command}`);
  }
  
  console.log(handler());
}

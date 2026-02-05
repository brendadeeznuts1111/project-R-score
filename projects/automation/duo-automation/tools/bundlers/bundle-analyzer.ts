#!/usr/bin/env bun
// 📦 DuoPlus Bundle Matrix Analyzer - Main Entry Point

import { BundleAnalyzerServer } from "./server/BundleAnalyzerServer.js";

console.log(`
📦 DuoPlus Bundle Matrix Analyzer
====================================

Bun Native Features Used:
• Bun.build() with metafile option
• Virtual files via Bun.build files option
• Bundle analysis with tension metrics
• Real-time WebSocket updates
• HSL/HEX color coding

Available Endpoints:
• http://localhost:8777/bundle        - Bundle matrix table
• http://localhost:8777/bundle-graph  - Interactive dependency graph
• http://localhost:8777/metafile.json - Download metafile
• ws://localhost:8777/                - WebSocket for live updates

Features:
• Real-time bundle tension analysis
• Circular dependency detection
• Duplicate file identification
• Health scoring with color coding
• Export to JSON, CSV, PNG
• Interactive dependency visualization

Press Ctrl+C to stop
`);

// Start the bundle analyzer server
BundleAnalyzerServer.serve();

// Also run a quick analysis in terminal
async function terminalAnalysis() {
  console.log('\n🧪 Running quick bundle analysis...\n');
  
  const files = {
    '/test.ts': `
      import { greet } from './utils.ts';
      export function main() {
        console.log(greet('Bundle Analyzer'));
      }
    `,
    '/utils.ts': `
      export function greet(name: string) {
        return \`Hello \${name}!\`;
      }
    `
  };
  
  const result = await Bun.build({
    entrypoints: ['/test.ts'],
    files,
    metafile: true
  });
  
  console.log('Build successful:', result.success);
  console.log('Outputs:', Object.keys(result.metafile.outputs));
  console.log('Total bytes:', Object.values(result.metafile.outputs)
    .reduce((sum, output) => sum + output.bytes, 0));
}

// Run terminal analysis
setTimeout(terminalAnalysis, 1000);

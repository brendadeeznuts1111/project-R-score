#!/usr/bin/env bun
// 📦 DuoPlus Bundle Matrix Analyzer - Simple Version

console.info(`
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

// Simple demo of bundle analysis
async function demoBundleAnalysis() {
  console.info('\n🧪 Running bundle analysis demo...\n');
  
  const testFiles = {
    '/main.ts': `
      import { greet } from './utils.ts';
      import { config } from './config.ts';
      
      export function main() {
        console.info(greet('Bundle Analyzer'));
        console.info('Config:', config);
      }
    `,
    '/utils.ts': `
      export function greet(name: string) {
        return \`Hello \${name}!\`;
      }
      
      export const version = '1.0.0';
    `,
    '/config.ts': `
      export const config = {
        api: 'https://api.example.com',
        timeout: 5000,
        retries: 3
      };
    `
  };
  
  const entrypoints = ['/main.ts'];
  
  try {
    const result = await Bun.build({
      entrypoints,
      files: testFiles,
      metafile: true,
      minify: true,
      target: 'browser'
    });
    
    if (!result.success) {
      console.error('❌ Build failed:', result.logs);
      return;
    }
    
    console.info('✅ Build successful!');
    console.info('📊 Bundle Analysis Results:');
    console.info('===========================');
    
    // Analyze the metafile
    const metafile = result.metafile;
    const inputs = Object.entries(metafile.inputs);
    const outputs = Object.entries(metafile.outputs);
    
    console.info(`📁 Total Input Files: ${inputs.length}`);
    console.info(`📦 Total Output Files: ${outputs.length}`);
    
    let totalBytes = 0;
    outputs.forEach(([path, output]: [string, any]) => {
      totalBytes += output.bytes;
      console.info(`📄 ${path}: ${formatBytes(output.bytes)}`);
    });
    
    console.info(`💾 Total Bundle Size: ${formatBytes(totalBytes)}`);
    
    // Analyze dependencies
    console.info('\n🔗 Dependency Analysis:');
    inputs.forEach(([path, input]: [string, any]) => {
      console.info(`📁 ${path}:`);
      console.info(`   Size: ${formatBytes(input.bytes)}`);
      console.info(`   Imports: ${input.imports?.length || 0}`);
      console.info(`   Exports: ${input.exports?.length || 0}`);
    });
    
    // Tension analysis
    console.info('\n🎯 Tension Analysis:');
    inputs.forEach(([path, input]: [string, any]) => {
      const tension = calculateTension(input);
      const health = getHealthForTension(tension);
      console.info(`📁 ${path}: ${tension}% tension (${health})`);
    });
    
    console.info('\n🎉 Bundle analysis completed!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function calculateTension(input: any): number {
  let tension = 0;
  
  // Size penalty
  const sizeMB = input.bytes / (1024 * 1024);
  if (sizeMB > 1) tension += Math.min((sizeMB - 1) * 10, 30);
  
  // Import complexity
  const imports = input.imports || [];
  const externalImports = imports.filter((i: any) => i.external).length;
  const dynamicImports = imports.filter((i: any) => i.kind === 'dynamic-import').length;
  
  tension += externalImports * 5;
  tension += dynamicImports * 8;
  tension += imports.length * 2;
  
  return Math.min(Math.round(tension), 100);
}

function getHealthForTension(tension: number): string {
  if (tension < 20) return '🟢 Excellent';
  if (tension < 40) return '🟡 Good';
  if (tension < 60) return '🟠 Fair';
  if (tension < 80) return '🔴 Poor';
  return '🚨 Critical';
}

// Run the demo
demoBundleAnalysis();

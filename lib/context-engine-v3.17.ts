#!/usr/bin/env bun

/**
 * Context Engine v3.17 - Metafile + JSONC Integration
 * 
 * Advanced context management with Bun.build metafile analysis,
 * JSONC tsconfig parsing, virtual file support, and dashboard integration
 */

import { executeBunCLI, parseOfficialFlags, BunCLIFlags } from './bun-cli-native-v3.15';
import { readFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { executeWithContext } from './context-run-server';

// Enhanced interfaces for v3.17
interface GlobalConfig {
  cwd: string;
  envFile?: string[];
  config?: string;
  tsconfig?: any;
  virtualFiles?: Record<string, string>;
}

interface LeadSpecProfile {
  id: string;
  name: string;
  entrypoint: string;
  buildTime: number;
  bundleSize: number;
  dependencies: string[];
  metafile?: any;
}

interface ContextBuildResult {
  metafile: any;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  bundleSize: number;
  buildTime: number;
}

// Color utilities
const c = {
  red: (s: string) => `\x1b[38;2;255;100;100m${s}\x1b[0m`,
  green: (s: string) => `\x1b[38;2;100;255;100m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[38;2;100;200;255m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[38;2;255;255;100m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[38;2;100;150;255m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[38;2;255;100;255m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[38;2;150;150;150m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  underline: (s: string) => `\x1b[4m${s}\x1b[0m`,
};

/**
 * Load global configuration with context
 */
export async function loadGlobalConfig(flags: BunCLIFlags): Promise<GlobalConfig> {
  const config: GlobalConfig = {
    cwd: flags.cwd || process.cwd(),
  };
  
  // Load environment files
  if (flags.envFile?.length) {
    config.envFile = flags.envFile;
  }
  
  // Load config file
  if (flags.config) {
    config.config = flags.config;
  }
  
  // Load and parse JSONC tsconfig
  try {
    const tsconfigPath = `${config.cwd}/tsconfig.json`;
    const text = await Bun.file(tsconfigPath).text();
    config.tsconfig = Bun.JSONC.parse(text);
  } catch (error) {
    console.log(c.yellow(`⚠️  Could not load tsconfig.json: ${error}`));
    config.tsconfig = {
      compilerOptions: { target: 'ES2022', module: 'ESNext' }
    };
  }
  
  // Setup virtual files
  config.virtualFiles = {
    '/virtual/bunfig-mock.toml': `[run]\nshell = "bun"\npreload = ["mock.ts"]`,
    '/virtual/context-config.json': JSON.stringify({
      context: 'v3.17',
      features: ['metafile', 'jsonc', 'virtual-files'],
      timestamp: new Date().toISOString()
    }, null, 2)
  };
  
  return config;
}

/**
 * v3.17: Metafile + JSONC in Context Engine!
 */
export async function contextBuildWithMetafile(
  entrypoints: string[], 
  flags: BunCLIFlags
): Promise<ContextBuildResult> {
  console.log(c.bold('🚀 Context Build v3.17 - Metafile + JSONC Engine'));
  
  const startTime = performance.now();
  const globalConfig = await loadGlobalConfig(flags);
  
  console.log(c.cyan(`📁 Working Directory: ${globalConfig.cwd}`));
  console.log(c.cyan(`📝 Entrypoints: ${entrypoints.join(', ')}`));
  console.log(c.cyan(`⚙️  JSONC Tsconfig: ${Object.keys(globalConfig.tsconfig?.compilerOptions || {}).length} options`));
  console.log(c.cyan(`📦 Virtual Files: ${Object.keys(globalConfig.virtualFiles || {}).length} files\n`));
  
  try {
    // v3.17: Metafile + JSONC in Context Engine!
    // Using global Bun.build since it may not be available on the Bun object in types
    const buildOptions = {
      entrypoints: entrypoints.map(e => join(globalConfig.cwd, e)),
      metafile: true,
      outdir: './dist-meta',
      // JSONC tsconfig!
      tsconfig: globalConfig.tsconfig,
      // Virtual files mock!
      files: globalConfig.virtualFiles
    };
    
    const result = await (globalThis as any).Bun.build(buildOptions);
    
    const buildTime = performance.now() - startTime;
    
    // Enhanced metafile processing
    const metafile = result.metafile;
    const inputs = metafile.inputs || {};
    const outputs = metafile.outputs || {};
    const bundleSize = Object.values(outputs).reduce((sum: number, output: any) => {
      const bytes = Number(output?.bytes) || 0;
      return sum + bytes;
    }, 0);
    
    // Metafile Dashboard Table!
    console.log(c.bold('\n📊 Metafile Dashboard'));
    const bundleSizeKB = Math.round(Number(Object.values(result.metafile.outputs).reduce((sum: number, o: any) => sum + Number(o.bytes || 0), 0)) / 1024 * 100) / 100;
    console.table({
      'Inputs Total': Object.keys(result.metafile.inputs).length,
      'Outputs Total': Object.keys(result.metafile.outputs).length,
      'Bundle Size KB': bundleSizeKB
    });
    
    // Detailed input analysis
    console.log(c.bold('\n📥 Input Analysis'));
    Object.entries(inputs).forEach(([path, input]: [string, any]) => {
      const size = input.bytes ? `${(input.bytes / 1024).toFixed(1)}KB` : 'N/A';
      const imports = input.imports?.length || 0;
      console.log(c.gray(`  ${path} - Size: ${size}, Imports: ${imports}`));
    });
    
    // Detailed output analysis
    console.log(c.bold('\n📤 Output Analysis'));
    Object.entries(outputs).forEach(([path, output]: [string, any]) => {
      const bytes = output?.bytes;
      const sizeKB = typeof bytes === 'number' ? (bytes / 1024).toFixed(1) : 'N/A';
      const type = output?.entryPoint ? 'Entry' : 'Chunk';
      console.log(c.gray(`  ${path} - Size: ${sizeKB}, Type: ${type}`));
    });
    
    return {
      metafile: result.metafile,
      inputs: result.metafile.inputs || {},
      outputs: result.metafile.outputs || {},
      bundleSize: Number(bundleSize) || 0,
      buildTime: Number(buildTime) || 0
    };
    
  } catch (error) {
    console.log(c.red(`❌ Build failed: ${error}`));
    throw error;
  }
}

/**
 * JuniorRunner Context Build with Metafile
 */
export async function juniorProfileWithMetafile(
  mdFile: string, 
  cliFlags: BunCLIFlags
): Promise<LeadSpecProfile & {metafile: any}> {
  console.log(c.bold('🎯 JuniorRunner Profile with Metafile Analysis'));
  console.log(c.cyan('🔍 Adding metafile analysis to profile...\n'));
  
  const profile = await juniorProfileWithContext(mdFile, cliFlags);
  const metafileResult = await contextBuildWithMetafile(['junior-runner.ts'], cliFlags);
  
  // Create the combined profile with metafile
  const combinedProfile = {
    ...profile,
    metafile: metafileResult.metafile
  } as LeadSpecProfile & {metafile: any};
  
  return combinedProfile;
}

/**
 * Enhanced junior profile with context
 */
async function juniorProfileWithContext(
  mdFile: string, 
  cliFlags: BunCLIFlags
): Promise<LeadSpecProfile> {
  const startTime = performance.now();
  
  // Simulate junior runner analysis
  const profile: LeadSpecProfile = {
    id: crypto.randomUUID(),
    name: `Junior Profile - ${mdFile}`,
    entrypoint: 'junior-runner.ts',
    buildTime: 0,
    bundleSize: 0,
    dependencies: ['bun', 'typescript', 'react', 'lucide-react']
  };
  
  // Simulate analysis work
  await new Promise(resolve => setTimeout(resolve, 50));
  
  profile.buildTime = performance.now() - startTime;
  profile.bundleSize = Math.floor(Math.random() * 500000) + 100000; // 100KB-600KB
  
  return profile;
}

/**
 * Context Engine Dashboard
 */
export function generateContextDashboard(results: Array<{name: string, data: any}>): string {
  console.log(c.bold('\n🎛️  Context Engine v3.17 Dashboard'));
  
  results.forEach(result => {
    console.log(c.cyan(`\n📊 ${result.name}`));
    
    if (result.data.metafile) {
      const { metafile, bundleSize, buildTime } = result.data;
      console.log(c.gray(`  Bundle Size: ${Math.round(bundleSize / 1024)}KB`));
      console.log(c.gray(`  Build Time: ${Math.round(buildTime)}ms`));
      console.log(c.gray(`  Inputs: ${Object.keys(metafile.inputs || {}).length}`));
      console.log(c.gray(`  Outputs: ${Object.keys(metafile.outputs || {}).length}`));
    }
    
    if (result.data.dependencies) {
      console.log(c.gray(`  Dependencies: ${result.data.dependencies.length}`));
      result.data.dependencies.slice(0, 5).forEach((dep: string) => {
        console.log(c.gray(`    - ${dep}`));
      });
    }
  });
  
  return 'Dashboard generated successfully';
}

/**
 * Export metafile to various formats
 */
export async function exportMetafile(
  metafile: any, 
  format: 'json' | 'md' | 'csv' = 'json',
  outputDir = '.'
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = outputDir.replace(/\/+$/g, '') || '.';
  await mkdir(dir, { recursive: true });
  
  switch (format) {
    case 'json':
      await Bun.write(`${dir}/metafile-${timestamp}.json`, new TextEncoder().encode(JSON.stringify(metafile, null, 2)));
      console.log(c.green(`✅ Metafile exported to JSON: ${dir}/metafile-${timestamp}.json`));
      break;
      
    case 'md':
      const mdContent = generateMetafileMarkdown(metafile);
      await Bun.write(`${dir}/metafile-${timestamp}.md`, new TextEncoder().encode(mdContent));
      console.log(c.green(`✅ Metafile exported to Markdown: ${dir}/metafile-${timestamp}.md`));
      break;
      
    case 'csv':
      const csvContent = generateMetafileCSV(metafile);
      await Bun.write(`${dir}/metafile-${timestamp}.csv`, new TextEncoder().encode(csvContent));
      console.log(c.green(`✅ Metafile exported to CSV: ${dir}/metafile-${timestamp}.csv`));
      break;
  }
}

/**
 * Generate markdown representation of metafile
 */
function generateMetafileMarkdown(metafile: any): string {
  let md = `# Bun Build Metafile Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Inputs section
  md += `## Inputs (${Object.keys(metafile.inputs || {}).length})\n\n`;
  md += `| Path | Size (KB) | Imports |\n`;
  md += `|------|----------|---------|\n`;
  
  Object.entries(metafile.inputs || {}).forEach(([path, input]: [string, any]) => {
    const sizeKB = input.bytes ? (input.bytes / 1024).toFixed(1) : 'N/A';
    const imports = input.imports?.length || 0;
    md += `| ${path} | ${sizeKB} | ${imports} |\n`;
  });
  
  // Outputs section
  md += `\n## Outputs (${Object.keys(metafile.outputs || {}).length})\n\n`;
  md += `| Path | Size (KB) | Type |\n`;
  md += `|------|----------|------|\n`;
  
  Object.entries(metafile.outputs || {}).forEach(([path, output]: [string, any]) => {
    const sizeKB = (output.bytes / 1024).toFixed(1);
    const type = output.entryPoint ? 'Entry' : 'Chunk';
    md += `| ${path} | ${sizeKB} | ${type} |\n`;
  });
  
  return md;
}

/**
 * Generate CSV representation of metafile
 */
function generateMetafileCSV(metafile: any): string {
  let csv = 'Type,Path,Size (Bytes),Size (KB),Details\n';
  
  // Inputs
  Object.entries(metafile.inputs || {}).forEach(([path, input]: [string, any]) => {
    const size = input.bytes || 0;
    const sizeKB = (size / 1024).toFixed(2);
    const imports = input.imports?.length || 0;
    csv += `Input,"${path}",${size},${sizeKB},"${imports} imports"\n`;
  });
  
  // Outputs
  Object.entries(metafile.outputs || {}).forEach(([path, output]: [string, any]) => {
    const size = output.bytes || 0;
    const sizeKB = (size / 1024).toFixed(2);
    const type = output.entryPoint ? 'Entry' : 'Chunk';
    csv += `Output,"${path}",${size},${sizeKB},"${type}"\n`;
  });
  
  return csv;
}

/**
 * Demo function for Context Engine v3.17
 */
export async function demoContextEngineV317(): Promise<void> {
  console.log(c.bold('🎯 Context Engine v3.17 - Metafile + JSONC Demo'));
  console.log(c.magenta('Showcasing advanced build analysis with context management\n'));
  
  const flags: BunCLIFlags = {
    cwd: './utils',
    smol: true,
    silent: false
  };
  
  try {
    // Demo 1: Basic metafile build
    console.log(c.yellow('\n--- Demo 1: Basic Metafile Build ---'));
    const buildResult1 = await contextBuildWithMetafile(['junior-runner.ts'], flags);
    
    // Demo 2: Multiple entrypoints
    console.log(c.yellow('\n--- Demo 2: Multiple Entrypoints ---'));
    const buildResult2 = await contextBuildWithMetafile(['junior-runner.ts', 'debug-demo.ts'], flags);
    
    // Demo 3: JuniorRunner with metafile
    console.log(c.yellow('\n--- Demo 3: JuniorRunner Profile with Metafile ---'));
    const profile = await juniorProfileWithMetafile('test.md', flags);
    
    // Generate dashboard
    const dashboardResults = [
      { name: 'Basic Build', data: buildResult1 },
      { name: 'Multi-Entry Build', data: buildResult2 },
      { name: 'JuniorRunner Profile', data: profile }
    ];
    
    generateContextDashboard(dashboardResults);
    
    // Export metafiles
    console.log(c.yellow('\n--- Exporting Metafiles ---'));
    await exportMetafile(buildResult1.metafile, 'json');
    await exportMetafile(buildResult2.metafile, 'md');
    await exportMetafile(profile.metafile, 'csv');
    
    console.log(c.green('\n✅ Context Engine v3.17 demo completed successfully!'));
    
  } catch (error) {
    console.error(c.red(`❌ Demo failed: ${error}`));
  }
}

// Auto-run if this is the main module
if (import.meta.main) {
  demoContextEngineV317().catch(console.error);
}

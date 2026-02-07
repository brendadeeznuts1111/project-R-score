#!/usr/bin/env bun
/**
 * Context Engine v3.17 - Metafile Profiler
 * Advanced metafile analysis and profiling for Bun builds
 * Usage: bun run context-metafile-profiler --cwd utils
 */

import { loadGlobalConfig, contextBuildWithMetafile, juniorProfileWithMetafile, exportMetafile } from '../lib/context-engine-v3.17';
import { join } from 'path';

// Color utilities
const c = {
  green: (s: string) => `\x1b[38;2;100;255;100m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[38;2;100;200;255m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[38;2;255;255;100m${s}\x1b[0m`,
  red: (s: string) => `\x1b[38;2;255;100;100m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[38;2;150;150;150m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[38;2;255;100;255m${s}\x1b[0m`,
};

interface CLIOptions {
  cwd?: string;
  entrypoint?: string;
  output?: string;
  format?: 'json' | 'md' | 'csv';
  profile?: boolean;
  analyze?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--cwd':
        options.cwd = args[++i];
        break;
      case '--entrypoint':
        options.entrypoint = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--format':
        options.format = args[++i] as 'json' | 'md' | 'csv';
        break;
      case '--profile':
        options.profile = true;
        break;
      case '--analyze':
        options.analyze = true;
        break;
    }
  }
  
  return options;
}

async function main() {
  console.log(c.bold('🎯 Context Engine v3.17 - Metafile Profiler'));
  console.log(c.cyan('Advanced metafile analysis and profiling\n'));
  
  const options = parseArgs();
  const cwd = options.cwd || process.cwd();
  
  console.log(c.yellow('📁 Configuration:'));
  console.log(c.gray(`  Working Directory: ${cwd}`));
  console.log(c.gray(`  Entrypoint: ${options.entrypoint || 'auto-detect'}`));
  console.log(c.gray(`  Output Format: ${options.format || 'json'}`));
  console.log(c.gray(`  Profile Mode: ${options.profile ? 'enabled' : 'disabled'}`));
  console.log(c.gray(`  Analysis Mode: ${options.analyze ? 'enabled' : 'disabled'}\n`));
  
  try {
    // Step 1: Load Global Configuration
    console.log(c.yellow('🔧 Step 1: Loading Global Configuration...'));
    const startTime = performance.now();
    
    const flags = {
      cwd,
      smol: false,
      silent: false,
      config: undefined,
      envFile: undefined
    };
    
    const globalConfig = await loadGlobalConfig(flags);
    const configTime = performance.now() - startTime;
    
    console.log(c.green('✅ Global Configuration Loaded:'));
    console.log(c.gray(`  CWD: ${globalConfig.cwd}`));
    console.log(c.gray(`  TSConfig Options: ${Object.keys(globalConfig.tsconfig?.compilerOptions || {}).length}`));
    console.log(c.gray(`  Virtual Files: ${Object.keys(globalConfig.virtualFiles || {}).length}`));
    console.log(c.gray(`  Load Time: ${configTime.toFixed(2)}ms\n`));
    
    // Step 2: Context Build with Metafile
    console.log(c.yellow('🏗️  Step 2: Context Build with Metafile Analysis...'));
    const buildStartTime = performance.now();
    
    const entrypoints = options.entrypoint ? [options.entrypoint] : ['junior-runner.ts'];
    
    // Simple build without virtual files to avoid issues
    const buildResult = await Bun.build({
      entrypoints: entrypoints.map(e => join(cwd, e)),
      metafile: true,
      outdir: './dist-meta',
      target: 'browser',
      format: 'esm'
    });
    
    // Create a simple metafile result structure
    const metafile = buildResult.metafile;
    const bundleSize = Object.values(metafile.outputs || {}).reduce((sum: number, output: any) => {
      const bytes = output?.bytes || 0;
      return sum + (typeof bytes === 'number' ? bytes : 0);
    }, 0);
    
    const buildResultWithMetafile = {
      metafile,
      inputs: metafile.inputs || {},
      outputs: metafile.outputs || {},
      bundleSize
    };
    
    const buildTime = performance.now() - buildStartTime;
    
    console.log(c.green('✅ Metafile Analysis Complete:'));
    console.log(c.gray(`  Inputs: ${Object.keys(buildResultWithMetafile.inputs || {}).length}`));
    console.log(c.gray(`  Outputs: ${Object.keys(buildResultWithMetafile.outputs || {}).length}`));
    console.log(c.gray(`  Bundle Size: ${((buildResultWithMetafile.bundleSize || 0) / 1024).toFixed(2)}KB`));
    console.log(c.gray(`  Build Time: ${buildTime.toFixed(2)}ms\n`));
    
    // Step 3: Enhanced Profile (if requested)
    let profileResult = null;
    let profileTime = 0;
    if (options.profile) {
      console.log(c.yellow('👤 Step 3: Enhanced Profile Generation...'));
      const profileStartTime = performance.now();
      
      const testMdFile = join(cwd, 'test.md');
      profileResult = await juniorProfileWithMetafile(testMdFile, flags);
      
      profileTime = performance.now() - profileStartTime;
      
      console.log(c.green('✅ Enhanced Profile Created:'));
      console.log(c.gray(`  Profile ID: ${profileResult.id}`));
      console.log(c.gray(`  Name: ${profileResult.name}`));
      console.log(c.gray(`  Bundle Size: ${(profileResult.bundleSize / 1024).toFixed(2)}KB`));
      console.log(c.gray(`  Dependencies: ${profileResult.dependencies.length}`));
      console.log(c.gray(`  Profile Time: ${profileTime.toFixed(2)}ms\n`));
    }
    
    // Step 4: Export Results
    console.log(c.yellow('📤 Step 4: Exporting Results...'));
    const exportStartTime = performance.now();
    
    const format = options.format || 'json';
    await exportMetafile(buildResultWithMetafile, format as 'json' | 'md' | 'csv');
    
    const exportTime = performance.now() - exportStartTime;
    
    console.log(c.green(`✅ Results Exported (${format.toUpperCase()}):`));
    console.log(c.gray(`  Export Time: ${exportTime.toFixed(2)}ms\n`));
    
    // Step 5: Analysis Summary
    const totalTime = configTime + buildTime + (profileResult ? profileTime : 0) + exportTime;
    
    console.log(c.bold('📊 Context Engine v3.17 Analysis Summary'));
    console.table({
      'Configuration Load': `${configTime.toFixed(2)}ms`,
      'Metafile Build': `${buildTime.toFixed(2)}ms`,
      'Profile Generation': profileResult ? `${profileTime.toFixed(2)}ms` : 'N/A',
      'Export Processing': `${exportTime.toFixed(2)}ms`,
      'Total Time': `${totalTime.toFixed(2)}ms`,
      'Bundle Size': `${((buildResultWithMetafile.bundleSize || 0) / 1024).toFixed(2)}KB`,
      'Inputs': Object.keys(buildResultWithMetafile.inputs || {}).length,
      'Outputs': Object.keys(buildResultWithMetafile.outputs || {}).length,
      'Virtual Files': Object.keys(globalConfig.virtualFiles || {}).length
    });
    
    if (options.analyze) {
      console.log(c.bold('🔍 Advanced Analysis'));
      
      // Analyze dependencies
      const inputs = buildResultWithMetafile.inputs || {};
      const dependencyMap = new Map<string, number>();
      
      Object.values(inputs).forEach((input: any) => {
        if (input.imports) {
          input.imports.forEach((imp: any) => {
            const path = imp.path;
            dependencyMap.set(path, (dependencyMap.get(path) || 0) + 1);
          });
        }
      });
      
      const topDependencies = Array.from(dependencyMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);
      
      console.log(c.yellow('Top Dependencies:'));
      topDependencies.forEach(([path, count]) => {
        console.log(c.gray(`  ${path}: ${count} imports`));
      });
      
      // Performance analysis
      const throughput = ((buildResultWithMetafile.bundleSize || 0) / 1024) / (buildTime / 1000); // KB/s
      console.log(c.yellow('\nPerformance Metrics:'));
      console.log(c.gray(`  Build Throughput: ${throughput.toFixed(2)}KB/s`));
      console.log(c.gray(`  Efficiency Score: ${Math.min(100, (1000 / buildTime) * 100).toFixed(1)}%`));
    }
    
    console.log(c.green('\n🎉 Context Engine v3.17 Metafile Profiling Complete!'));
    console.log(c.cyan('All metafile analysis and profiling tasks completed successfully.\n'));
    
  } catch (error) {
    console.log(c.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

// Run the profiler
if (import.meta.main) {
  main().catch(console.error);
}

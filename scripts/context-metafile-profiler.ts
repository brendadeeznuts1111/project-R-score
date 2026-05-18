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
  outputDir?: string;
  buildOutDir?: string;
  nativeMetafileJson?: string;
  nativeMetafileMd?: string;
  nativeMetafile?: boolean;
  useVirtualFiles?: boolean;
  memoryOnly?: boolean;
  overrideConfig?: 'prod' | 'dev';
  reactFastRefresh?: boolean;
  format?: 'json' | 'md' | 'csv';
  profile?: boolean;
  analyze?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = { useVirtualFiles: true };
  
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
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--build-outdir':
        options.buildOutDir = args[++i];
        break;
      case '--native-metafile':
        options.nativeMetafile = true;
        break;
      case '--native-metafile-json':
        options.nativeMetafileJson = args[++i];
        break;
      case '--native-metafile-md':
        options.nativeMetafileMd = args[++i];
        break;
      case '--no-virtual-files':
        options.useVirtualFiles = false;
        break;
      case '--memory-only':
        options.memoryOnly = true;
        break;
      case '--override-config': {
        const value = args[++i] as 'prod' | 'dev';
        if (value === 'prod' || value === 'dev') {
          options.overrideConfig = value;
        }
        break;
      }
      case '--react-fast-refresh':
        options.reactFastRefresh = true;
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
  console.info(c.bold('🎯 Context Engine v3.17 - Metafile Profiler'));
  console.info(c.cyan('Advanced metafile analysis and profiling\n'));
  
  const options = parseArgs();
  const cwd = options.cwd || process.cwd();
  const outputDir = options.outputDir || options.output || join(process.cwd(), '.artifacts', 'metafiles');
  const buildOutDir = options.buildOutDir || join(process.cwd(), '.artifacts', 'dist-meta');
  const nativeStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const buildId = crypto.randomUUID();
  const buildTime = Date.now();
  const nativeMetafileJsonPath = options.nativeMetafileJson || (options.nativeMetafile ? join(outputDir, `bun-metafile-${nativeStamp}.json`) : undefined);
  const nativeMetafileMdPath = options.nativeMetafileMd || (options.nativeMetafile ? join(outputDir, `bun-metafile-${nativeStamp}.md`) : undefined);
  const configOverrideContents = options.overrideConfig
    ? [
        `export const API_URL = ${JSON.stringify(options.overrideConfig === 'prod' ? 'https://api.production.com' : 'http://localhost:3000')};`,
        `export const DEBUG = ${options.overrideConfig === 'prod' ? 'false' : 'true'};`,
        `export const BUILD_ID = ${JSON.stringify(buildId)};`,
        `export const BUILD_TIME = ${buildTime};`,
      ].join('\n')
    : undefined;
  const overrideFileMap = configOverrideContents
    ? {
        './src/config.ts': configOverrideContents,
        [join(cwd, 'src', 'config.ts')]: configOverrideContents,
      }
    : {};
  
  console.info(c.yellow('📁 Configuration:'));
    console.info(c.gray(`  Working Directory: ${cwd}`));
    console.info(c.gray(`  Entrypoint: ${options.entrypoint || 'auto-detect'}`));
    console.info(c.gray(`  Output Format: ${options.format || 'json'}`));
    console.info(c.gray(`  Metafile Output Dir: ${outputDir}`));
    console.info(c.gray(`  Build Out Dir: ${buildOutDir}`));
    console.info(c.gray(`  Memory-only Build: ${options.memoryOnly ? 'enabled' : 'disabled'}`));
    if (nativeMetafileJsonPath) console.info(c.gray(`  Native Metafile JSON: ${nativeMetafileJsonPath}`));
    if (nativeMetafileMdPath) console.info(c.gray(`  Native Metafile MD: ${nativeMetafileMdPath}`));
    console.info(c.gray(`  Virtual Files Build Mode: ${options.useVirtualFiles ? 'enabled' : 'disabled'}`));
    if (options.overrideConfig) console.info(c.gray(`  Config Override: ${options.overrideConfig} (./src/config.ts)`));
    console.info(c.gray(`  React Fast Refresh: ${options.reactFastRefresh ? 'enabled' : 'disabled'}`));
    console.info(c.gray(`  Profile Mode: ${options.profile ? 'enabled' : 'disabled'}`));
    console.info(c.gray(`  Analysis Mode: ${options.analyze ? 'enabled' : 'disabled'}\n`));
  
  try {
    // Step 1: Load Global Configuration
    console.info(c.yellow('🔧 Step 1: Loading Global Configuration...'));
    const startTime = performance.now();
    
    const flags = {
      cwd,
      smol: false,
      silent: false,
      config: undefined,
      envFile: undefined
    };
    
    const globalConfig = await loadGlobalConfig(flags);
    const effectiveFiles = {
      ...(options.useVirtualFiles ? (globalConfig.virtualFiles || {}) : {}),
      ...overrideFileMap,
    };
    const configTime = performance.now() - startTime;
    
    console.info(c.green('✅ Global Configuration Loaded:'));
    console.info(c.gray(`  CWD: ${globalConfig.cwd}`));
    console.info(c.gray(`  TSConfig Options: ${Object.keys(globalConfig.tsconfig?.compilerOptions || {}).length}`));
    console.info(c.gray(`  Virtual Files: ${Object.keys(globalConfig.virtualFiles || {}).length}`));
    console.info(c.gray(`  Load Time: ${configTime.toFixed(2)}ms\n`));
    
    // Step 2: Context Build with Metafile
    console.info(c.yellow('🏗️  Step 2: Context Build with Metafile Analysis...'));
    const buildStartTime = performance.now();
    
    const entrypoints = options.entrypoint ? [options.entrypoint] : ['junior-runner.ts'];
    
    // Bun.build files support: inject virtual/override files at build time.
    const buildResult = await Bun.build({
      entrypoints: entrypoints.map(e => join(cwd, e)),
      files: Object.keys(effectiveFiles).length > 0 ? effectiveFiles : undefined,
      metafile: true,
      outdir: options.memoryOnly ? undefined : buildOutDir,
      target: 'browser',
      format: 'esm',
      reactFastRefresh: options.reactFastRefresh
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
    
    console.info(c.green('✅ Metafile Analysis Complete:'));
    console.info(c.gray(`  Inputs: ${Object.keys(buildResultWithMetafile.inputs || {}).length}`));
    console.info(c.gray(`  Outputs: ${Object.keys(buildResultWithMetafile.outputs || {}).length}`));
    console.info(c.gray(`  Bundle Size: ${((buildResultWithMetafile.bundleSize || 0) / 1024).toFixed(2)}KB`));
    console.info(c.gray(`  Build Time: ${buildTime.toFixed(2)}ms\n`));
    console.info(c.gray(`  Build Artifacts: ${(buildResult.outputs || []).length}`));
    for (const artifact of (buildResult.outputs || [])) {
      const size = typeof artifact.size === 'number' ? `${artifact.size} bytes` : 'unknown';
      console.info(c.gray(`    - kind=${artifact.kind}, loader=${artifact.loader}, path=${artifact.path}, size=${size}`));
    }
    console.info('');

    if (nativeMetafileJsonPath || nativeMetafileMdPath) {
      console.info(c.yellow('🧾 Step 2b: Emitting Native Bun Metafile Outputs...'));
      const nativeStart = performance.now();
      await Bun.build({
        entrypoints: entrypoints.map(e => join(cwd, e)),
        files: Object.keys(effectiveFiles).length > 0 ? effectiveFiles : undefined,
        metafile: {
          ...(nativeMetafileJsonPath ? { json: nativeMetafileJsonPath } : {}),
          ...(nativeMetafileMdPath ? { markdown: nativeMetafileMdPath } : {}),
        },
        outdir: options.memoryOnly ? undefined : buildOutDir,
        target: 'browser',
        format: 'esm',
        reactFastRefresh: options.reactFastRefresh
      });
      const nativeTime = performance.now() - nativeStart;
      console.info(c.green('✅ Native Bun Metafiles Emitted:'));
      if (nativeMetafileJsonPath) console.info(c.gray(`  JSON: ${nativeMetafileJsonPath}`));
      if (nativeMetafileMdPath) console.info(c.gray(`  Markdown: ${nativeMetafileMdPath}`));
      console.info(c.gray(`  Native Emit Time: ${nativeTime.toFixed(2)}ms\n`));
    }
    
    // Step 3: Enhanced Profile (if requested)
    let profileResult = null;
    let profileTime = 0;
    if (options.profile) {
      console.info(c.yellow('👤 Step 3: Enhanced Profile Generation...'));
      const profileStartTime = performance.now();
      
      const testMdFile = join(cwd, 'test.md');
      profileResult = await juniorProfileWithMetafile(testMdFile, flags);
      
      profileTime = performance.now() - profileStartTime;
      
      console.info(c.green('✅ Enhanced Profile Created:'));
      console.info(c.gray(`  Profile ID: ${profileResult.id}`));
      console.info(c.gray(`  Name: ${profileResult.name}`));
      console.info(c.gray(`  Bundle Size: ${(profileResult.bundleSize / 1024).toFixed(2)}KB`));
      console.info(c.gray(`  Dependencies: ${profileResult.dependencies.length}`));
      console.info(c.gray(`  Profile Time: ${profileTime.toFixed(2)}ms\n`));
    }
    
    // Step 4: Export Results
    console.info(c.yellow('📤 Step 4: Exporting Results...'));
    const exportStartTime = performance.now();
    
    const format = options.format || 'json';
    await exportMetafile(buildResultWithMetafile, format as 'json' | 'md' | 'csv', outputDir);
    
    const exportTime = performance.now() - exportStartTime;
    
    console.info(c.green(`✅ Results Exported (${format.toUpperCase()}):`));
    console.info(c.gray(`  Export Time: ${exportTime.toFixed(2)}ms\n`));
    
    // Step 5: Analysis Summary
    const totalTime = configTime + buildTime + (profileResult ? profileTime : 0) + exportTime;
    
    console.info(c.bold('📊 Context Engine v3.17 Analysis Summary'));
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
      console.info(c.bold('🔍 Advanced Analysis'));
      
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
      
      console.info(c.yellow('Top Dependencies:'));
      topDependencies.forEach(([path, count]) => {
        console.info(c.gray(`  ${path}: ${count} imports`));
      });
      
      // Performance analysis
      const throughput = ((buildResultWithMetafile.bundleSize || 0) / 1024) / (buildTime / 1000); // KB/s
      console.info(c.yellow('\nPerformance Metrics:'));
      console.info(c.gray(`  Build Throughput: ${throughput.toFixed(2)}KB/s`));
      console.info(c.gray(`  Efficiency Score: ${Math.min(100, (1000 / buildTime) * 100).toFixed(1)}%`));
    }
    
    console.info(c.green('\n🎉 Context Engine v3.17 Metafile Profiling Complete!'));
    console.info(c.cyan('All metafile analysis and profiling tasks completed successfully.\n'));
    
  } catch (error) {
    console.info(c.red(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

// Run the profiler
if (import.meta.main) {
  main().catch(console.error);
}

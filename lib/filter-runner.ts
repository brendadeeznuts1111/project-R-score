/**
 * Bun Filter Runner - Tier-1380 Implementation
 * 
 * Advanced workspace package filtering with glob patterns,
 * parallel execution, and comprehensive performance monitoring.
 */

import { Glob } from 'bun';

// Color utilities for terminal output
const c = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`
};

// Core interfaces
export interface WorkspacePackage {
  name: string;
  path: string;
  version: string;
  scripts?: Record<string, string>;
  private?: boolean;
  workspaces?: string[];
}

export interface FilterMatch {
  name: string;
  path: string;
  script: string;
  executed: boolean;
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  startTime: Date;
  endTime: Date;
}

export interface FilterOptions {
  parallel?: boolean;
  bail?: boolean;        // Stop on first failure
  args?: string[];
  dryRun?: boolean;      // Show what would execute
  silent?: boolean;      // Suppress output
  maxConcurrency?: number;
  timeout?: number;      // Per-package timeout in ms
}

export interface FilterSummary {
  pattern: string;
  script: string;
  totalPackages: number;
  matchedPackages: number;
  executedPackages: number;
  successfulPackages: number;
  failedPackages: number;
  totalDurationMs: number;
  averageDurationMs: number;
  results: FilterMatch[];
}

/**
 * Discover workspace packages from package.json or bun.lockb
 */
export async function discoverWorkspacePackages(rootPath: string = process.cwd()): Promise<WorkspacePackage[]> {
  const packages: WorkspacePackage[] = [];
  
  try {
    // Try to read workspace configuration from package.json
    const packageJsonPath = `${rootPath}/package.json`;
    const packageJson = await Bun.file(packageJsonPath).json();
    
    if (packageJson.workspaces) {
      console.log(c.blue(`📦 Discovering workspace packages...`));
      
      const workspacePatterns = Array.isArray(packageJson.workspaces) 
        ? packageJson.workspaces 
        : packageJson.workspaces.packages || [];
      
      for (const pattern of workspacePatterns) {
        const glob = new Glob(pattern);
        const matches = glob.scan({ cwd: rootPath, onlyFiles: false });
        
        for await (const match of matches) {
          const fullPath = `${rootPath}/${match}`;
          
          // Skip if not a directory
          const stat = await Bun.file(fullPath).stat();
          if (!stat.isDirectory) continue;
          
          // Try to read package.json in this directory
          const pkgJsonPath = `${fullPath}/package.json`;
          try {
            const pkgJson = await Bun.file(pkgJsonPath).json();
            if (pkgJson.name) {
              packages.push({
                name: pkgJson.name,
                path: fullPath,
                version: pkgJson.version || '0.0.0',
                scripts: pkgJson.scripts || {},
                private: pkgJson.private || false
              });
            }
          } catch {
            // No package.json, skip
            continue;
          }
        }
      }
    }
    
    // Also include root package if it has scripts
    try {
      const rootPkgJson = await Bun.file(packageJsonPath).json();
      if (rootPkgJson.name && rootPkgJson.scripts) {
        packages.unshift({
          name: rootPkgJson.name,
          path: rootPath,
          version: rootPkgJson.version || '0.0.0',
          scripts: rootPkgJson.scripts,
          private: rootPkgJson.private || false
        });
      }
    } catch {
      // Root package.json not readable
    }
    
  } catch (error) {
    console.error(c.red(`❌ Failed to discover workspace packages: ${error}`));
  }
  
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Run filtered script across matching packages
 */
export async function runFilteredScript(
  pattern: string,
  script: string,
  opts: FilterOptions = {}
): Promise<FilterSummary> {
  const startTime = performance.now();
  
  // Discover workspace packages
  const packages = await discoverWorkspacePackages();
  
  // Apply glob filter matching
  const matched = await filterPackages(packages, pattern);
  
  if (matched.length === 0) {
    console.log(c.yellow(`⚠️ No packages match pattern: ${pattern}`));
    return {
      pattern,
      script,
      totalPackages: packages.length,
      matchedPackages: 0,
      executedPackages: 0,
      successfulPackages: 0,
      failedPackages: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
      results: []
    };
  }

  console.log(c.bold(`🔍 Filter: ${pattern} → ${matched.length} packages`));
  
  if (opts.dryRun) {
    console.log(c.yellow(`🔍 Dry run - would execute script "${script}" in:`));
    matched.forEach(pkg => console.log(`  ${c.cyan(pkg.name)} (${pkg.path})`));
    return {
      pattern,
      script,
      totalPackages: packages.length,
      matchedPackages: matched.length,
      executedPackages: 0,
      successfulPackages: 0,
      failedPackages: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
      results: []
    };
  }
  
  // Validate script exists in packages
  const validPackages = matched.filter(pkg => 
    pkg.scripts && pkg.scripts[script]
  );
  
  if (validPackages.length === 0) {
    console.log(c.red(`❌ Script "${script}" not found in any matching packages`));
    return {
      pattern,
      script,
      totalPackages: packages.length,
      matchedPackages: matched.length,
      executedPackages: 0,
      successfulPackages: 0,
      failedPackages: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
      results: []
    };
  }
  
  if (validPackages.length < matched.length) {
    console.log(c.yellow(`⚠️ Script "${script}" not found in ${matched.length - validPackages.length} packages`));
  }
  
  // Execute script
  const results: FilterMatch[] = opts.parallel
    ? await runParallel(validPackages, script, opts)
    : await runSequential(validPackages, script, opts);
  
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  // Calculate summary
  const successful = results.filter(r => r.exitCode === 0).length;
  const failed = results.filter(r => r.exitCode !== 0).length;
  const avgDuration = results.length > 0 
    ? results.reduce((sum, r) => sum + r.durationMs, 0) / results.length 
    : 0;
  
  // Display results table
  if (!opts.silent) {
    console.log('\n' + formatFilterResults(results));
    console.log(formatFilterSummary({
      pattern,
      script,
      totalPackages: packages.length,
      matchedPackages: matched.length,
      executedPackages: results.length,
      successfulPackages: successful,
      failedPackages: failed,
      totalDurationMs: totalDuration,
      averageDurationMs: avgDuration,
      results
    }));
  }
  
  return {
    pattern,
    script,
    totalPackages: packages.length,
    matchedPackages: matched.length,
    executedPackages: results.length,
    successfulPackages: successful,
    failedPackages: failed,
    totalDurationMs: totalDuration,
    averageDurationMs: avgDuration,
    results
  };
}

/**
 * Filter packages using glob patterns
 */
export async function filterPackages(packages: WorkspacePackage[], pattern: string): Promise<WorkspacePackage[]> {
  // Handle negation patterns
  const negationPatterns: string[] = [];
  let filterPattern = pattern;
  
  if (pattern.startsWith('!')) {
    negationPatterns.push(pattern.slice(1));
    filterPattern = '*';
  }
  
  // Extract multiple patterns
  const patterns = filterPattern.split(/\s+/).filter(p => p && !p.startsWith('!'));
  const additionalNegations = pattern.split(/\s+/).filter(p => p.startsWith('!')).map(p => p.slice(1));
  negationPatterns.push(...additionalNegations);
  
  let matched: WorkspacePackage[] = [];
  
  // Apply positive patterns
  for (const pat of patterns) {
    const glob = new Glob(pat);
    const patternMatches = packages.filter(pkg => glob.match(pkg.name));
    
    // Union of all positive patterns
    patternMatches.forEach(pkg => {
      if (!matched.find(m => m.name === pkg.name)) {
        matched.push(pkg);
      }
    });
  }
  
  // Apply negation patterns
  for (const negPat of negationPatterns) {
    const negGlob = new Glob(negPat);
    matched = matched.filter(pkg => !negGlob.match(pkg.name));
  }
  
  return matched;
}

/**
 * Run script in packages sequentially
 */
async function runSequential(
  packages: WorkspacePackage[],
  script: string,
  opts: FilterOptions
): Promise<FilterMatch[]> {
  const results: FilterMatch[] = [];
  
  for (const pkg of packages) {
    const result = await runPackageScript(pkg, script, opts.args, opts.timeout);
    results.push(result);
    
    // Bail on first failure if requested
    if (opts.bail && result.exitCode !== 0) {
      console.log(c.red(`🛑 Bailing: ${pkg.name} failed with exit code ${result.exitCode}`));
      break;
    }
  }
  
  return results;
}

/**
 * Run script in packages in parallel
 */
async function runParallel(
  packages: WorkspacePackage[],
  script: string,
  opts: FilterOptions
): Promise<FilterMatch[]> {
  const maxConcurrency = opts.maxConcurrency || Math.min(packages.length, 10);
  const results: FilterMatch[] = [];
  
  // Process in batches to control concurrency
  for (let i = 0; i < packages.length; i += maxConcurrency) {
    const batch = packages.slice(i, i + maxConcurrency);
    
    const batchResults = await Promise.all(
      batch.map(pkg => runPackageScript(pkg, script, opts.args, opts.timeout))
    );
    
    results.push(...batchResults);
    
    // Bail if any failed and bail is enabled
    if (opts.bail && batchResults.some(r => r.exitCode !== 0)) {
      const failed = batchResults.find(r => r.exitCode !== 0);
      console.log(c.red(`🛑 Bailing: ${failed?.name} failed with exit code ${failed?.exitCode}`));
      break;
    }
  }
  
  return results;
}

/**
 * Run script in a single package
 */
async function runPackageScript(
  pkg: WorkspacePackage,
  script: string,
  args?: string[],
  timeout?: number
): Promise<FilterMatch> {
  const startTime = new Date();
  const startMs = performance.now();
  
  try {
    const proc = Bun.spawn({
      cmd: ['bun', 'run', script, ...(args || [])],
      cwd: pkg.path,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    let exitCode: number;
    let stdout = '';
    let stderr = '';
    
    if (timeout) {
      // Handle timeout
      const timeoutPromise = new Promise<number>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      });
      
      try {
        exitCode = await Promise.race([
          proc.exited,
          timeoutPromise
        ]) as number;
      } catch (error) {
        proc.kill();
        exitCode = 124; // timeout exit code
        stderr = `Script timed out after ${timeout}ms`;
      }
    } else {
      exitCode = await proc.exited;
    }
    
    // Read output
    try {
      stdout = await new Response(proc.stdout).text();
      stderr = await new Response(proc.stderr).text();
    } catch {
      // Output reading failed
    }
    
    const durationMs = performance.now() - startMs;
    
    // Stream output with package prefix
    if (!process.env.FILTER_SILENT) {
      const prefix = c.cyan(`[${pkg.name}]`);
      if (stdout) {
        stdout.split('\n').forEach(line => {
          if (line.trim()) console.log(`${prefix} ${line}`);
        });
      }
      if (stderr) {
        stderr.split('\n').forEach(line => {
          if (line.trim()) console.error(`${c.red(prefix)} ${line}`);
        });
      }
    }
    
    return {
      name: pkg.name,
      path: pkg.path,
      script,
      executed: true,
      durationMs,
      exitCode,
      stdout,
      stderr,
      startTime,
      endTime: new Date()
    };
    
  } catch (error) {
    const durationMs = performance.now() - startMs;
    
    return {
      name: pkg.name,
      path: pkg.path,
      script,
      executed: false,
      durationMs,
      exitCode: -1,
      stdout: '',
      stderr: String(error),
      startTime,
      endTime: new Date()
    };
  }
}

/**
 * Format filter results as table
 */
function formatFilterResults(results: FilterMatch[]): string {
  if (results.length === 0) return '';
  
  const table = [
    ['Package', 'Script', 'Status', 'Duration'],
    ...results.map(r => [
      r.name,
      r.script,
      r.exitCode === 0 ? c.green('✓') : c.red(`✗ (${r.exitCode})`),
      `${r.durationMs.toFixed(0)}ms`
    ])
  ];
  
  return formatTable(table);
}

/**
 * Format filter summary
 */
function formatFilterSummary(summary: FilterSummary): string {
  const successRate = summary.executedPackages > 0 
    ? (summary.successfulPackages / summary.executedPackages * 100).toFixed(1)
    : '0.0';
  
  return [
    c.bold('\n📊 Filter Execution Summary'),
    `${c.dim('Pattern:')} ${c.cyan(summary.pattern)}`,
    `${c.dim('Script:')} ${c.cyan(summary.script)}`,
    `${c.dim('Matched:')} ${summary.matchedPackages}/${summary.totalPackages} packages`,
    `${c.dim('Executed:')} ${summary.executedPackages} packages`,
    `${c.dim('Success:')} ${c.green(String(summary.successfulPackages))} ${c.dim(`(${successRate}%)`)}`,
    summary.failedPackages > 0 ? `${c.dim('Failed:')} ${c.red(String(summary.failedPackages))}` : '',
    `${c.dim('Total Time:')} ${summary.totalDurationMs.toFixed(0)}ms`,
    `${c.dim('Average:')} ${summary.averageDurationMs.toFixed(0)}ms/package`
  ].filter(Boolean).join('\n');
}

/**
 * Simple table formatter
 */
function formatTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  
  const colWidths = rows[0].map((_, colIndex) => 
    Math.max(...rows.map(row => (row[colIndex] || '').length))
  );
  
  const formattedRows = rows.map((row, rowIndex) => {
    const formatted = row.map((cell, colIndex) => 
      (cell || '').padEnd(colWidths[colIndex])
    ).join(' | ');
    
    return rowIndex === 0 ? c.bold(formatted) : formatted;
  });
  
  const separator = colWidths.map(width => '-'.repeat(width)).join('-|-');
  
  return [formattedRows[0], separator, ...formattedRows.slice(1)].join('\n');
}

/**
 * CLI interface for filter runner
 */
export async function runFilterCLI(): Promise<void> {
  const args = process.argv.slice(2);
  const filterIndex = args.indexOf('--filter');
  
  if (filterIndex === -1 || filterIndex === args.length - 1) {
    console.error(c.red('Usage: bun run --filter <pattern> <script> [options]'));
    console.error(c.dim('\nExamples:'));
    console.error(c.dim('  bun run --filter "ba*" test'));
    console.error(c.dim('  bun run --filter "app-*" --parallel build'));
    console.error(c.dim('  bun run --filter "!test-*" deploy'));
    console.error(c.dim('\nOptions:'));
    console.error(c.dim('  --parallel     Execute packages in parallel'));
    console.error(c.dim('  --bail         Stop on first failure'));
    console.error(c.dim('  --dry-run      Show what would execute'));
    console.error(c.dim('  --silent       Suppress output'));
    console.error(c.dim('  --max-concurrency <n>  Max parallel packages'));
    console.error(c.dim('  --timeout <ms>     Per-package timeout'));
    process.exit(1);
  }
  
  const pattern = args[filterIndex + 1];
  const scriptIndex = filterIndex + 2;
  
  if (scriptIndex >= args.length) {
    console.error(c.red('Error: Script name required after filter pattern'));
    process.exit(1);
  }
  
  const script = args[scriptIndex];
  const extraArgs = args.slice(scriptIndex + 1).filter(arg => !arg.startsWith('--'));
  
  const options: FilterOptions = {
    parallel: args.includes('--parallel'),
    bail: args.includes('--bail'),
    dryRun: args.includes('--dry-run'),
    silent: args.includes('--silent'),
    args: extraArgs
  };
  
  // Parse max concurrency
  const maxConcurrencyIndex = args.indexOf('--max-concurrency');
  if (maxConcurrencyIndex !== -1 && maxConcurrencyIndex + 1 < args.length) {
    options.maxConcurrency = parseInt(args[maxConcurrencyIndex + 1]);
  }
  
  // Parse timeout
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1 && timeoutIndex + 1 < args.length) {
    options.timeout = parseInt(args[timeoutIndex + 1]);
  }
  
  const summary = await runFilteredScript(pattern, script, options);
  
  // Exit with appropriate code
  process.exit(summary.failedPackages > 0 ? 1 : 0);
}

// Export main function for direct usage
export default runFilteredScript;

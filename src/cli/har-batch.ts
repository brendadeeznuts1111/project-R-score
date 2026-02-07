#!/usr/bin/env bun
/**
 * HAR Batch Processor - Process multiple HAR files in parallel
 * 
 * Usage:
 *   bun har-batch.ts process --pattern "*.har" --output ./processed/
 *   bun har-batch.ts merge --files a.har,b.har,c.har --output merged.har
 *   bun har-batch.ts report --pattern "*.har" --format html
 */

import { 
  enhanceHar, 
  calculateHarStats, 
  lintHar, 
  analyzeCookies,
  sortHarEntries,
  HarBuilder,
} from '../utils/har-enhancer';
import type { Har, HarEntry } from '../utils/har-enhancer';

interface BatchOptions {
  command: string;
  pattern?: string;
  files?: string[];
  output: string;
  format: 'json' | 'html' | 'csv';
  concurrency: number;
  filter?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

async function findHarFiles(pattern: string): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const files: string[] = [];
  
  for await (const file of glob.scan('.')) {
    if (file.endsWith('.har')) {
      files.push(file);
    }
  }
  
  return files.sort();
}

async function loadHarFile(path: string): Promise<Har | null> {
  try {
    const content = await Bun.file(path).text();
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ Failed to load ${path}:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

async function batchProcess(options: BatchOptions): Promise<void> {
  if (!options.pattern) {
    console.error('❌ Error: --pattern required');
    process.exit(1);
  }
  
  console.log(`🔍 Finding HAR files matching: ${options.pattern}`);
  const files = await findHarFiles(options.pattern);
  
  if (files.length === 0) {
    console.log('⚠️  No HAR files found');
    return;
  }
  
  console.log(`📁 Found ${files.length} files\n`);
  
  // Ensure output directory exists
  await Bun.write(options.output + '/.gitkeep', '');
  
  // Process files in parallel with concurrency limit
  const results: { file: string; success: boolean; error?: string }[] = [];
  
  for (let i = 0; i < files.length; i += options.concurrency) {
    const batch = files.slice(i, i + options.concurrency);
    
    await Promise.all(batch.map(async (file) => {
      try {
        console.log(`  Processing: ${file}`);
        
        const har = await loadHarFile(file);
        if (!har) {
          results.push({ file, success: false, error: 'Load failed' });
          return;
        }
        
        // Enhance
        const enhanced = enhanceHar(har, undefined, {
          protocol: false,
          security: true,
          performance: true,
        });
        
        // Generate output filename
        const basename = file.replace('.har', '');
        const outputFile = `${options.output}/${basename}-enhanced.har`;
        
        await Bun.write(outputFile, JSON.stringify(enhanced, null, 2));
        
        results.push({ file, success: true });
        console.log(`  ✅ Saved: ${outputFile}`);
      } catch (err: any) {
        results.push({ file, success: false, error: err.message });
        console.error(`  ❌ Failed: ${file}`);
      }
    }));
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Summary: ${successful} succeeded, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\nFailed files:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.file}: ${r.error}`);
    });
  }
}

async function batchMerge(options: BatchOptions): Promise<void> {
  if (!options.files || options.files.length === 0) {
    console.error('❌ Error: --files required');
    process.exit(1);
  }
  
  console.log(`🔄 Merging ${options.files.length} HAR files...\n`);
  
  const builder = new HarBuilder({
    name: 'har-batch-merge',
    version: '1.0.0',
  });
  
  const allEntries: HarEntry[] = [];
  
  for (const file of options.files) {
    console.log(`  Loading: ${file}`);
    const har = await loadHarFile(file);
    if (har) {
      allEntries.push(...har.log.entries);
    }
  }
  
  // Sort by start time
  const sorted = allEntries.sort((a, b) => 
    new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime()
  );
  
  // Add to builder
  sorted.forEach(entry => builder.addEntry(entry));
  
  const merged = builder.build();
  await Bun.write(options.output, JSON.stringify(merged, null, 2));
  
  console.log(`\n✅ Merged ${sorted.length} entries into ${options.output}`);
}

async function batchReport(options: BatchOptions): Promise<void> {
  if (!options.pattern) {
    console.error('❌ Error: --pattern required');
    process.exit(1);
  }
  
  console.log(`📊 Generating report for: ${options.pattern}\n`);
  
  const files = await findHarFiles(options.pattern);
  
  if (files.length === 0) {
    console.log('⚠️  No files found');
    return;
  }
  
  const reports: {
    file: string;
    stats: ReturnType<typeof calculateHarStats>;
    lint: ReturnType<typeof lintHar>;
    cookies: ReturnType<typeof analyzeCookies>;
  }[] = [];
  
  for (const file of files) {
    console.log(`  Analyzing: ${file}`);
    const har = await loadHarFile(file);
    if (har) {
      reports.push({
        file,
        stats: calculateHarStats(har),
        lint: lintHar(har),
        cookies: analyzeCookies(har),
      });
    }
  }
  
  // Generate report
  if (options.format === 'json') {
    const output = reports.map(r => ({
      file: r.file,
      stats: {
        ...r.stats,
        domains: Array.from(r.stats.domains),
        mimeTypes: Object.fromEntries(r.stats.mimeTypes),
        statusCodes: Object.fromEntries(r.stats.statusCodes),
      },
      lint: r.lint.summary,
      cookies: {
        total: r.cookies.totalCookies,
        secure: r.cookies.secureCookies,
        warnings: r.cookies.warnings.length,
      },
    }));
    
    const outputFile = options.output.endsWith('.json') 
      ? options.output 
      : `${options.output}/batch-report.json`;
    
    await Bun.write(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n✅ JSON report: ${outputFile}`);
    
  } else if (options.format === 'csv') {
    const csv = [
      'file,requests,size,compression,avg_time,errors,warnings,cookies_secure',
      ...reports.map(r => [
        r.file,
        r.stats.totalRequests,
        r.stats.totalSize,
        (r.stats.compressionRatio * 100).toFixed(2),
        r.stats.avgResponseTime.toFixed(2),
        r.lint.summary.errors,
        r.lint.summary.warnings,
        r.cookies.secureCookies,
      ].join(',')),
    ].join('\n');
    
    const outputFile = options.output.endsWith('.csv')
      ? options.output
      : `${options.output}/batch-report.csv`;
    
    await Bun.write(outputFile, csv);
    console.log(`\n✅ CSV report: ${outputFile}`);
    
  } else if (options.format === 'html') {
    const html = generateBatchHTMLReport(reports);
    const outputFile = options.output.endsWith('.html')
      ? options.output
      : `${options.output}/batch-report.html`;
    
    await Bun.write(outputFile, html);
    console.log(`\n✅ HTML report: ${outputFile}`);
  }
  
  // Print summary table
  console.log('\n📈 Summary:');
  console.log('─'.repeat(100));
  console.log(`${'File'.padEnd(30)} ${'Reqs'.padStart(6)} ${'Size'.padStart(10)} ${'Comp%'.padStart(6)} ${'Time'.padStart(8)} ${'E'.padStart(3)} ${'W'.padStart(3)}`);
  console.log('─'.repeat(100));
  
  reports.forEach(r => {
    const size = r.stats.totalSize > 1024 * 1024 
      ? `${(r.stats.totalSize / 1024 / 1024).toFixed(1)}MB`
      : `${(r.stats.totalSize / 1024).toFixed(1)}KB`;
    
    console.log(
      `${r.file.slice(0, 30).padEnd(30)} ` +
      `${r.stats.totalRequests.toString().padStart(6)} ` +
      `${size.padStart(10)} ` +
      `${(r.stats.compressionRatio * 100).toFixed(1).padStart(6)} ` +
      `${r.stats.avgResponseTime.toFixed(1).padStart(8)} ` +
      `${r.lint.summary.errors.toString().padStart(3)} ` +
      `${r.lint.summary.warnings.toString().padStart(3)}`
    );
  });
  
  console.log('─'.repeat(100));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generateBatchHTMLReport(
  reports: { file: string; stats: any; lint: any; cookies: any }[]
): string {
  const totalRequests = reports.reduce((sum, r) => sum + r.stats.totalRequests, 0);
  const totalSize = reports.reduce((sum, r) => sum + r.stats.totalSize, 0);
  const avgCompression = reports.reduce((sum, r) => sum + r.stats.compressionRatio, 0) / reports.length;
  const totalErrors = reports.reduce((sum, r) => sum + r.lint.summary.errors, 0);
  const totalWarnings = reports.reduce((sum, r) => sum + r.lint.summary.warnings, 0);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HAR Batch Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background: #0f172a; 
      color: #e2e8f0; 
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    h1 { color: #60a5fa; margin-bottom: 0.5rem; }
    .subtitle { color: #64748b; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { 
      background: #1e293b; 
      border-radius: 0.75rem; 
      padding: 1.5rem; 
      border: 1px solid #334155;
      transition: border-color 0.2s;
    }
    .card:hover { border-color: #60a5fa; }
    .card h3 { 
      color: #94a3b8; 
      font-size: 0.875rem; 
      text-transform: uppercase; 
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem; 
    }
    .card .value { 
      font-size: 2rem; 
      font-weight: 700; 
      color: #f8fafc;
    }
    .card .subtitle { 
      font-size: 0.875rem; 
      color: #64748b; 
      margin-top: 0.25rem;
    }
    .good { color: #4ade80; }
    .warn { color: #fbbf24; }
    .error { color: #f87171; }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 1rem;
      background: #1e293b;
      border-radius: 0.75rem;
      overflow: hidden;
    }
    th, td { 
      text-align: left; 
      padding: 0.875rem 1rem; 
      border-bottom: 1px solid #334155; 
    }
    th { 
      background: #0f172a;
      color: #94a3b8; 
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tr:hover { background: #252f47; }
    tr:last-child td { border-bottom: none; }
    
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-error { background: rgba(248, 113, 113, 0.1); color: #f87171; }
    .badge-warn { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
    .badge-good { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
    
    .progress-bar {
      height: 6px;
      background: #334155;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #60a5fa;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    
    .chart-container {
      background: #1e293b;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-top: 1.5rem;
      border: 1px solid #334155;
    }
    .chart-bar {
      display: flex;
      align-items: center;
      margin: 0.5rem 0;
    }
    .chart-label {
      width: 150px;
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .chart-value {
      flex: 1;
      height: 24px;
      background: #0f172a;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    .chart-fill {
      height: 100%;
      background: linear-gradient(90deg, #60a5fa, #3b82f6);
      border-radius: 4px;
    }
    .chart-text {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem;
      color: #e2e8f0;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 HAR Batch Report</h1>
    <p class="subtitle">Analysis of ${reports.length} HAR files</p>
    
    <div class="grid">
      <div class="card">
        <h3>Total Files</h3>
        <div class="value">${reports.length}</div>
      </div>
      <div class="card">
        <h3>Total Requests</h3>
        <div class="value">${totalRequests.toLocaleString()}</div>
      </div>
      <div class="card">
        <h3>Total Size</h3>
        <div class="value">${(totalSize / 1024 / 1024).toFixed(1)}MB</div>
      </div>
      <div class="card">
        <h3>Avg Compression</h3>
        <div class="value ${avgCompression > 0.5 ? 'good' : 'warn'}">${(avgCompression * 100).toFixed(1)}%</div>
      </div>
      <div class="card">
        <h3>Total Errors</h3>
        <div class="value ${totalErrors === 0 ? 'good' : 'error'}">${totalErrors}</div>
      </div>
      <div class="card">
        <h3>Total Warnings</h3>
        <div class="value ${totalWarnings === 0 ? 'good' : 'warn'}">${totalWarnings}</div>
      </div>
    </div>
    
    <h2 style="color: #94a3b8; margin: 2rem 0 1rem;">File Details</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Requests</th>
          <th>Size</th>
          <th>Compression</th>
          <th>Avg Time</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map(r => {
          const status = r.lint.summary.errors > 0 ? 'error' : r.lint.summary.warnings > 0 ? 'warn' : 'good';
          const statusText = r.lint.summary.errors > 0 ? 'Errors' : r.lint.summary.warnings > 0 ? 'Warnings' : 'Pass';
          return `<tr>
            <td>${r.file}</td>
            <td>${r.stats.totalRequests}</td>
            <td>${r.stats.totalSize > 1024 * 1024 
              ? (r.stats.totalSize / 1024 / 1024).toFixed(1) + 'MB'
              : (r.stats.totalSize / 1024).toFixed(1) + 'KB'}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${r.stats.compressionRatio * 100}%"></div>
              </div>
              <span style="font-size: 0.75rem; color: #64748b;">${(r.stats.compressionRatio * 100).toFixed(1)}%</span>
            </td>
            <td>${r.stats.avgResponseTime.toFixed(1)}ms</td>
            <td><span class="badge badge-${status}">${statusText}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    
    <div class="chart-container">
      <h3 style="color: #94a3b8; margin-bottom: 1rem;">Response Time Distribution</h3>
      ${reports.map(r => {
        const maxTime = Math.max(...reports.map(x => x.stats.avgResponseTime));
        const percent = maxTime > 0 ? (r.stats.avgResponseTime / maxTime) * 100 : 0;
        return `<div class="chart-bar">
          <div class="chart-label">${r.file.slice(0, 20)}</div>
          <div class="chart-value">
            <div class="chart-fill" style="width: ${percent}%"></div>
            <span class="chart-text">${r.stats.avgResponseTime.toFixed(1)}ms</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

function parseArgs(argv: string[]): BatchOptions {
  const args = argv.slice(2);
  const options: Partial<BatchOptions> = { 
    output: './batch-output',
    format: 'html',
    concurrency: 4,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case 'process':
      case 'merge':
      case 'report':
        options.command = arg;
        break;
      case '--pattern':
      case '-p':
        options.pattern = args[++i];
        break;
      case '--files':
      case '-f':
        options.files = args[++i].split(',');
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--format':
        options.format = args[++i] as 'json' | 'html' | 'csv';
        break;
      case '--concurrency':
      case '-c':
        options.concurrency = parseInt(args[++i], 10);
        break;
      case '--filter':
        options.filter = args[++i];
        break;
    }
  }
  
  return options as BatchOptions;
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              HAR Batch Processor v1.0.0                      ║
╠══════════════════════════════════════════════════════════════╣
║  Process multiple HAR files efficiently                     ║
╚══════════════════════════════════════════════════════════════╝

Commands:
  process --pattern "*.har" --output ./processed/
    Enhance all matching HAR files in parallel

  merge --files a.har,b.har,c.har --output merged.har
    Combine multiple HAR files into one

  report --pattern "*.har" --format html
    Generate aggregated report

Options:
  --pattern, -p      Glob pattern to match files
  --files, -f        Comma-separated list of files
  --output, -o       Output directory or file
  --format           Output format: json, html, csv (default: html)
  --concurrency, -c  Parallel processing limit (default: 4)

Examples:
  bun har-batch.ts process -p "tests/*.har" -o ./enhanced/
  bun har-batch.ts merge -f "a.har,b.har" -o combined.har
  bun har-batch.ts report -p "*.har" --format csv -o report.csv
`);
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv);
  
  if (!options.command) {
    showHelp();
    process.exit(1);
  }
  
  switch (options.command) {
    case 'process':
      await batchProcess(options);
      break;
    case 'merge':
      await batchMerge(options);
      break;
    case 'report':
      await batchReport(options);
      break;
    default:
      showHelp();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

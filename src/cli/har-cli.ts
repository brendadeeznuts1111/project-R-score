#!/usr/bin/env bun
/**
 * HAR CLI Tool - Capture, enhance, and analyze HTTP Archive files
 * 
 * Usage:
 *   bun src/cli/har-cli.ts capture [--output file.har] [--port 3000]
 *   bun src/cli/har-cli.ts enhance <file.har> [--output enhanced.har]
 *   bun src/cli/har-cli.ts analyze <file.har> [--format json|table|html]
 *   bun src/cli/har-cli.ts diff <baseline.har> <current.har>
 *   bun src/cli/har-cli.ts lint <file.har> [--fix]
 *   bun src/cli/har-cli.ts serve <file.har> [--port 8080]
 */

import {
  enhanceHar,
  validateHar,
  calculateHarStats,
  diffHar,
  detectRegressions,
  analyzeCookies,
  generateWaterfall,
  lintHar,
  sortHarEntries,
  HarBuilder,
} from '../utils/har-enhancer';
import type { Har } from '../utils/har-enhancer';

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════════

interface CLIOptions {
  command: string;
  args: string[];
  flags: Record<string, string | boolean | number>;
}

function parseArgs(argv: string[]): CLIOptions {
  const args: string[] = [];
  const flags: Record<string, string | boolean | number> = {};
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];
      
      if (nextArg && !nextArg.startsWith('-')) {
        const numValue = Number(nextArg);
        flags[key] = isNaN(numValue) ? nextArg : numValue;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      flags[key] = true;
    } else {
      args.push(arg);
    }
  }
  
  return {
    command: args[0] || 'help',
    args: args.slice(1),
    flags,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdCapture(options: CLIOptions): Promise<void> {
  const outputFile = String(options.flags.output || options.flags.o || 'capture.har');
  const port = Number(options.flags.port || options.flags.p || 0);
  const duration = Number(options.flags.duration || options.flags.d || 0);
  
  console.log(`🎬 Starting HAR capture server...`);
  console.log(`   Port: ${port || 'auto'}`);
  console.log(`   Output: ${outputFile}`);
  if (duration) console.log(`   Duration: ${duration}s`);
  
  const entries: any[] = [];
  
  const server = Bun.serve({
    port,
    async fetch(req) {
      const startTime = performance.now();
      const url = new URL(req.url);
      const body = await req.text().catch(() => '');
      
      const response = new Response(
        JSON.stringify({
          method: req.method,
          url: req.url,
          path: url.pathname,
          headers: Object.fromEntries(req.headers),
          body: body || undefined,
          timestamp: new Date().toISOString(),
        }, null, 2),
        {
          headers: {
            'content-type': 'application/json',
            'x-captured-by': 'har-cli',
          },
        }
      );
      
      const endTime = performance.now();
      
      entries.push({
        startedDateTime: new Date().toISOString(),
        time: endTime - startTime,
        request: {
          method: req.method,
          url: req.url,
          httpVersion: 'HTTP/1.1',
          headers: [...req.headers.entries()].map(([name, value]) => ({ name, value })),
          cookies: [],
          queryString: [...url.searchParams.entries()].map(([name, value]) => ({ name, value })),
          headersSize: -1,
          bodySize: body.length,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          httpVersion: 'HTTP/1.1',
          headers: [...response.headers.entries()].map(([name, value]) => ({ name, value })),
          cookies: [],
          content: { size: 0, mimeType: 'application/json' },
          redirectURL: '',
          headersSize: -1,
          bodySize: 0,
        },
        cache: {},
        timings: {
          blocked: 0, dns: 0, ssl: 0, connect: 0, send: 0,
          wait: endTime - startTime, receive: 0,
        },
      });
      
      return response;
    },
  });
  
  console.log(`\n✅ Capture server running at ${server.url}`);
  console.log(`   Press Ctrl+C to stop and save\n`);
  
  if (duration > 0) {
    setTimeout(() => server.stop(), duration * 1000);
  }
  
  process.on('SIGINT', () => server.stop());
  
  // Wait for shutdown
  await new Promise<void>(resolve => {
    const originalStop = server.stop.bind(server);
    (server as any).stop = () => { originalStop(); resolve(); };
  });
  
  const builder = new HarBuilder({ name: 'har-cli', version: '1.0.0' });
  entries.forEach(e => builder.addEntry(e));
  
  await Bun.write(outputFile, JSON.stringify(builder.build(), null, 2));
  console.log(`\n💾 Saved ${entries.length} entries to ${outputFile}`);
}

async function cmdEnhance(options: CLIOptions): Promise<void> {
  const inputFile = options.args[0];
  if (!inputFile) {
    console.error('❌ Error: Input file required');
    process.exit(1);
  }
  
  const outputFile = String(options.flags.output || options.flags.o || inputFile.replace('.har', '-enhanced.har'));
  
  console.log(`🔧 Enhancing ${inputFile}...`);
  
  const har: Har = JSON.parse(await Bun.file(inputFile).text());
  
  const validation = validateHar(har);
  if (!validation.valid) {
    console.error('❌ Invalid HAR file:');
    validation.errors.forEach(e => console.error(`   • ${e}`));
    process.exit(1);
  }
  
  const enhanced = enhanceHar(har, undefined, {
    protocol: false, security: true, performance: true,
  });
  
  await Bun.write(outputFile, JSON.stringify(enhanced, null, 2));
  console.log(`✅ Enhanced HAR saved to ${outputFile}`);
}

async function cmdAnalyze(options: CLIOptions): Promise<void> {
  const inputFile = options.args[0];
  if (!inputFile) {
    console.error('❌ Error: Input file required');
    process.exit(1);
  }
  
  const format = String(options.flags.format || options.flags.f || 'table');
  const har: Har = JSON.parse(await Bun.file(inputFile).text());
  
  const stats = calculateHarStats(har);
  const lintResult = lintHar(har);
  const cookieAnalysis = analyzeCookies(har);
  
  if (format === 'json') {
    console.log(JSON.stringify({
      stats: { ...stats, domains: Array.from(stats.domains), mimeTypes: Object.fromEntries(stats.mimeTypes), statusCodes: Object.fromEntries(stats.statusCodes) },
      lint: lintResult,
      cookies: { ...cookieAnalysis, cookiesByDomain: Object.fromEntries(cookieAnalysis.cookiesByDomain) },
    }, null, 2));
  } else if (format === 'html') {
    const html = generateHTMLReport(har, stats, lintResult, cookieAnalysis);
    const outputFile = inputFile.replace('.har', '-report.html');
    await Bun.write(outputFile, html);
    console.log(`📄 HTML report saved to ${outputFile}`);
  } else {
    // Table format
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    HAR ANALYSIS REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('📈 PERFORMANCE');
    console.log(`  Requests: ${stats.totalRequests} | Size: ${fmtBytes(stats.totalSize)} | Compression: ${(stats.compressionRatio * 100).toFixed(1)}%`);
    console.log(`  Avg Response: ${stats.avgResponseTime.toFixed(2)}ms | Avg TTFB: ${stats.avgTtfb.toFixed(2)}ms\n`);
    
    console.log('🔒 SECURITY');
    console.log(`  HTTPS: ${stats.secureRequests}/${stats.totalRequests} | HTTP/2: ${stats.http2Requests} | Cookies: ${cookieAnalysis.secureCookies}/${cookieAnalysis.totalCookies} secure\n`);
    
    console.log('🚨 LINT: ' + (lintResult.passed ? '✅ PASSED' : '❌ FAILED'));
    console.log(`  Errors: ${lintResult.summary.errors} | Warnings: ${lintResult.summary.warnings} | Info: ${lintResult.summary.info}\n`);
    
    if (har.log.entries.length > 0) {
      console.log('🌊 WATERFALL (top 10)');
      console.log(generateWaterfall(sortHarEntries(har.log.entries, 'started', 'asc').slice(0, 10)));
    }
  }
}

async function cmdDiff(options: CLIOptions): Promise<void> {
  const [baselineFile, currentFile] = options.args;
  if (!baselineFile || !currentFile) {
    console.error('❌ Error: Two files required');
    process.exit(1);
  }
  
  const [baseline, current]: [Har, Har] = await Promise.all([
    Bun.file(baselineFile).json(),
    Bun.file(currentFile).json(),
  ]);
  
  const diff = diffHar(baseline, current);
  const regressions = detectRegressions(baseline, current);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    DIFF RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`📊 Summary: +${diff.summary.totalAdded} -${diff.summary.totalRemoved} ~${diff.summary.totalModified}`);
  
  if (regressions.hasRegression) {
    console.log(`\n🚨 REGRESSION DETECTED (${regressions.severity.toUpperCase()})`);
    regressions.issues.forEach(i => {
      console.log(`  ${i.severity === 'critical' ? '🔴' : '🟠'} ${i.message} (+${i.deltaPercent.toFixed(1)}%)`);
    });
  } else {
    console.log('\n✅ No regressions detected');
  }
  
  if (diff.added.length > 0) {
    console.log(`\n➕ Added (${diff.added.length}):`);
    diff.added.forEach(e => console.log(`  • ${e.request.method} ${e.request.url.slice(0, 60)}`));
  }
  
  if (diff.modified.length > 0) {
    console.log(`\n📝 Modified (${diff.modified.length}):`);
    diff.modified.forEach(({ entry, changes }) => {
      console.log(`  • ${entry.request.url.slice(0, 50)}`);
      changes.forEach(c => console.log(`    ${c.field}: ${c.oldValue} → ${c.newValue}`));
    });
  }
}

async function cmdLint(options: CLIOptions): Promise<void> {
  const inputFile = options.args[0];
  if (!inputFile) {
    console.error('❌ Error: Input file required');
    process.exit(1);
  }
  
  const har: Har = await Bun.file(inputFile).json();
  const result = lintHar(har);
  
  console.log(`Summary: ${result.summary.errors} errors, ${result.summary.warnings} warnings`);
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  result.issues.forEach(i => {
    const icon = i.severity === 'error' ? '❌' : i.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${i.severity}] ${i.rule}: ${i.message}`);
  });
  
  process.exit(result.passed ? 0 : 1);
}

async function cmdServe(options: CLIOptions): Promise<void> {
  const inputFile = options.args[0];
  if (!inputFile) {
    console.error('❌ Error: Input file required');
    process.exit(1);
  }
  
  const port = Number(options.flags.port || options.flags.p || 8080);
  const har: Har = await Bun.file(inputFile).json();
  const stats = calculateHarStats(har);
  
  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/') {
        return new Response(generateHTMLReport(har, stats, lintHar(har), analyzeCookies(har)), {
          headers: { 'content-type': 'text/html' },
        });
      }
      if (url.pathname === '/api/har') return Response.json(har);
      if (url.pathname === '/api/stats') {
        return Response.json({ ...stats, domains: Array.from(stats.domains), mimeTypes: Object.fromEntries(stats.mimeTypes) });
      }
      return new Response('Not found', { status: 404 });
    },
  });
  
  console.log(`🌐 HAR viewer: ${server.url}`);
  console.log(`   API: ${server.url}/api/har | Stats: ${server.url}/api/stats`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function generateHTMLReport(har: Har, stats: any, lint: any, cookies: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HAR Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; padding: 2rem; }
    h1 { color: #60a5fa; margin-bottom: 1rem; }
    h2 { color: #94a3b8; margin: 2rem 0 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #1e293b; border-radius: 0.5rem; padding: 1.5rem; border: 1px solid #334155; }
    .card h3 { color: #60a5fa; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem; }
    .card .value { font-size: 1.5rem; font-weight: bold; }
    .good { color: #4ade80; } .warn { color: #fbbf24; } .error { color: #f87171; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; }
    .badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.7rem; }
    .badge-error { background: #7f1d1d; color: #fca5a5; }
    .badge-warn { background: #713f12; color: #fde047; }
  </style>
</head>
<body>
  <h1>📊 HAR Analysis Report</h1>
  <div class="grid">
    <div class="card"><h3>Requests</h3><div class="value">${stats.totalRequests}</div></div>
    <div class="card"><h3>Size</h3><div class="value">${fmtBytes(stats.totalSize)}</div></div>
    <div class="card"><h3>Compression</h3><div class="value ${stats.compressionRatio > 0.5 ? 'good' : 'warn'}">${(stats.compressionRatio * 100).toFixed(0)}%</div></div>
    <div class="card"><h3>Avg Time</h3><div class="value ${stats.avgResponseTime < 200 ? 'good' : 'warn'}">${stats.avgResponseTime.toFixed(0)}ms</div></div>
    <div class="card"><h3>HTTPS</h3><div class="value ${stats.secureRequests === stats.totalRequests ? 'good' : 'warn'}">${stats.secureRequests}/${stats.totalRequests}</div></div>
    <div class="card"><h3>Lint</h3><div class="value ${lint.summary.errors === 0 ? 'good' : 'error'}">${lint.summary.errors}E ${lint.summary.warnings}W</div></div>
  </div>
  ${lint.issues.length > 0 ? `<h2>Issues</h2><table><thead><tr><th>Sev</th><th>Rule</th><th>Message</th></tr></thead><tbody>${lint.issues.slice(0, 10).map((i: any) => `<tr><td><span class="badge badge-${i.severity}">${i.severity}</span></td><td>${i.rule}</td><td>${i.message}</td></tr>`).join('')}</tbody></table>` : ''}
</body>
</html>`;
}

function cmdHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  HAR CLI Tool v1.0.0                         ║
╠══════════════════════════════════════════════════════════════╣
║  Capture, enhance, and analyze HTTP Archive files           ║
╚══════════════════════════════════════════════════════════════╝

Commands:
  capture [--output file.har] [--port 3000] [--duration 60]
  enhance <file.har> [--output enhanced.har]
  analyze <file.har> [--format json|table|html]
  diff <baseline.har> <current.har>
  lint <file.har>
  serve <file.har> [--port 8080]

Examples:
  bun har-cli.ts capture --duration 30
  bun har-cli.ts analyze traffic.har --format html
  bun har-cli.ts diff baseline.har current.har
`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  
  switch (options.command) {
    case 'capture': await cmdCapture(options); break;
    case 'enhance': await cmdEnhance(options); break;
    case 'analyze': await cmdAnalyze(options); break;
    case 'diff': await cmdDiff(options); break;
    case 'lint': await cmdLint(options); break;
    case 'serve': await cmdServe(options); break;
    default: cmdHelp();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

#!/usr/bin/env bun
// batch-profiler.ts - v2.8: Batch Markdown Profiler with Enterprise Display

import { scanFeatures } from './junior-runner';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface BatchProfile {
  avgParseTime: number;
  avgThroughput: number;
  avgGfmScore: number;
  avgTableCols: number;
  totalFiles: number;
  peakThroughput: number;
  minParseTime: number;
  maxParseTime: number;
  memoryUsage: number;
  tierCounts: Record<string, number>;
  totalSize: number;
}

interface TestDoc {
  cols: number;
  tables: number;
  codeBlocks: number;
}

// ── Formatting Helpers ──────────────────────────────────────────────────────

function fmtKB(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(2)} KB`;
}

function fmtThru(charsPerSec: number): string {
  return `${(charsPerSec / 1000).toFixed(1)}K chars/s`;
}

function fmtMs(ms: number): string {
  return `${ms.toFixed(3)} ms`;
}

function pad(s: string, w: number, align: 'left' | 'right' = 'left'): string {
  return align === 'right' ? s.padStart(w) : s.padEnd(w);
}

const TIER_ICONS: Record<string, string> = {
  enterprise: '\u{1F7E3}', lead: '\u{1F535}', senior: '\u{1F7E2}', junior: '\u{1F7E1}'
};

const FEAT_ICONS: Record<string, string> = {
  headings: '\u{1F4CC}', tables: '\u{1F4CA}', codeBlocks: '\u{1F4BB}', links: '\u{1F517}',
  images: '\u{1F5BC}\uFE0F', taskLists: '\u2611\uFE0F', math: '\u2211', wikiLinks: '\u{1F4D6}',
  blockquotes: '\u{1F4AC}', 'lists.ordered': '\u{1F522}', 'lists.unordered': '\u2022',
  strikethrough: '\u{1F5D1}\uFE0F'
};

// ── Box Drawing ─────────────────────────────────────────────────────────────

function progressBar(current: number, total: number, width = 30): string {
  const pct = Math.min(current / total, 1);
  const filled = Math.round(pct * width);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
  return `Batch ${current}/${total}              ${bar} ${(pct * 100).toFixed(0)}%`;
}

function profileCard(profile: any): string {
  const { core, markdown, security, audit } = profile;
  const tier = markdown.complexityTier.toUpperCase();
  const fc = markdown.featureCounts;
  const W = 86;
  const hash = security.integrityHash;

  const parseStatus = core.parseTime < 1 ? '\u26A1 Fast' : core.parseTime < 5 ? '\u{1F7E2} OK' : '\u{1F7E1} Slow';
  const thruStatus = core.throughput > 100000 ? '\u{1F680} High' : core.throughput > 50000 ? '\u{1F7E2} OK' : '\u{1F7E1} Low';
  const memStatus = core.memoryMB < 2 ? '\u{1F7E2} Low' : core.memoryMB < 10 ? '\u{1F7E1} Moderate' : '\u{1F534} High';
  const gfmStatus = fc.gfmScore >= 80 ? '\u2705 Strong' : fc.gfmScore >= 50 ? '\u{1F7E2} Good' : '\u{1F7E1} Basic';
  const tierIcon = TIER_ICONS[markdown.complexityTier] || '\u26AA';

  const title = `\u{1F4CA} Markdown Profile: ${tier}`;
  const titlePad = Math.max(0, W - 4 - title.length);

  const rows = [
    ['Document Size', fmtKB(core.documentSize), '\u{1F7E2} OK'],
    ['Parse Time', fmtMs(core.parseTime), parseStatus],
    ['Throughput', fmtThru(core.throughput), thruStatus],
    ['Memory Delta', `${core.memoryMB.toFixed(2)} MB`, memStatus],
    ['Complexity Tier', tier, `${tierIcon} ${markdown.complexityTier}`],
    ['GFM Score', String(fc.gfmScore), gfmStatus],
  ];

  const C1 = 16, C2 = 19, C3 = 43;
  let out = '';
  out += `\u256D${'─'.repeat(W)}\u256E\n`;
  out += `\u2502${' '.repeat(Math.floor(titlePad / 2) + 2)}${title}${' '.repeat(Math.ceil(titlePad / 2) + 2)}\u2502\n`;
  out += `\u251C${'─'.repeat(C1 + 2)}\u252C${'─'.repeat(C2 + 2)}\u252C${'─'.repeat(C3 + 2)}\u2524\n`;
  out += `\u2502 ${pad('Metric', C1)} \u2502 ${pad('Value', C2, 'right')} \u2502 ${pad('Status', C3)} \u2502\n`;
  out += `\u251C${'─'.repeat(C1 + 2)}\u253C${'─'.repeat(C2 + 2)}\u253C${'─'.repeat(C3 + 2)}\u2524\n`;
  for (const [metric, value, status] of rows) {
    out += `\u2502 ${pad(metric, C1)} \u2502 ${pad(value, C2, 'right')} \u2502 ${pad(status, C3)} \u2502\n`;
  }
  out += `\u2570${'─'.repeat(C1 + 2)}\u2534${'─'.repeat(C2 + 2)}\u2534${'─'.repeat(C3 + 2)}\u256F\n`;
  out += `Hash: ${hash} | ${audit.environment}\n`;

  return out;
}

function featureMatrix(fc: any): string {
  const features: [string, string, number, string][] = [
    ['\u{1F4CC}', 'Headings', fc.headings, ''],
    ['\u{1F4CA}', 'Tables', fc.tables, fc.tableCols > 0 ? `(${fc.tableCols} cols)` : ''],
    ['\u{1F4BB}', 'Code Blocks', fc.codeBlocks, ''],
    ['\u{1F517}', 'Links', fc.links, ''],
    ['\u{1F5BC}\uFE0F', 'Images', fc.images, ''],
    ['\u2611\uFE0F', 'Task Lists', fc.taskLists, ''],
    ['\u2211', 'Math', fc.math, ''],
    ['\u{1F4D6}', 'Wiki Links', fc.wikiLinks, ''],
    ['\u{1F4AC}', 'Blockquotes', fc.blockquotes, ''],
    ['\u{1F522}', 'Ordered Lists', fc.lists?.ordered ?? 0, ''],
    ['\u2022', 'Unordered Lists', fc.lists?.unordered ?? 0, ''],
    ['\u{1F5D1}\uFE0F', 'Strikethrough', fc.strikethrough, ''],
  ];

  let out = '\n \u{1F50D} Feature Detection Matrix \n';
  out += '\u250C\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n';
  out += '\u2502    \u2502 Feature         \u2502 Count \u2502 Details   \u2502 Status \u2502\n';
  out += '\u251C\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524\n';

  for (const [icon, name, count, details] of features) {
    const status = count > 0 ? '  \u2713' : '  \u25CB';
    out += `\u2502 ${pad(icon, 2)} \u2502 ${pad(name, 15)} \u2502 ${pad(String(count), 5, 'right')} \u2502 ${pad(details, 9)} \u2502 ${pad(status, 6)} \u2502\n`;
  }

  out += '\u2514\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n';
  return out;
}

function batchSummaryBox(avg: BatchProfile, totalTime: number): string {
  const W = 86;
  const rows: [string, string, string][] = [
    ['Files Processed', String(avg.totalFiles), '\u{1F7E2}'],
    ['Total Size', fmtKB(avg.totalSize), '\u{1F4CA}'],
    ['Avg Parse Time', fmtMs(avg.avgParseTime), '\u26A1'],
    ['Avg Throughput', fmtThru(avg.avgThroughput), '\u{1F680}'],
  ];

  // Add tier breakdown
  for (const tier of ['enterprise', 'lead', 'senior', 'junior']) {
    const count = avg.tierCounts[tier] || 0;
    if (count > 0 || tier === 'enterprise' || tier === 'junior') {
      const label = tier.charAt(0).toUpperCase() + tier.slice(1);
      rows.push([label, String(count), TIER_ICONS[tier] || '\u26AA']);
    }
  }

  const C1 = 18, C2 = 50, C3 = 12;
  let out = '\n';
  out += `\u2554${'═'.repeat(W)}\u2557\n`;
  const title = '\u{1F4C8} Batch Summary';
  const titlePad = W - title.length;
  out += `\u2551${' '.repeat(Math.floor(titlePad / 2))}${title}${' '.repeat(Math.ceil(titlePad / 2))}\u2551\n`;
  out += `\u2560${'═'.repeat(W)}\u2563\n`;
  out += `\u2551 ${pad('Metric', C1)} \u2502 ${pad('Value', C2, 'right')} \u2502 ${pad('', C3)} \u2551\n`;
  out += `\u2560${'═'.repeat(W)}\u2563\n`;

  for (const [metric, value, icon] of rows) {
    out += `\u2551 ${pad(metric, C1)} \u2502 ${pad(value, C2, 'right')} \u2502 ${pad(icon, C3)} \u2551\n`;
  }

  out += `\u255A${'═'.repeat(W)}\u255D\n`;
  out += `Completed at ${new Date().toISOString()}\n`;
  return out;
}

// ── Document Generator ──────────────────────────────────────────────────────

async function genMassiveDoc(opts: TestDoc): Promise<string> {
  const { cols, tables, codeBlocks } = opts;
  let md = `# Massive Test Document\n\nGenerated: ${new Date().toISOString()}\n\n`;

  for (let t = 0; t < tables; t++) {
    const headers = Array.from({length: cols}, (_, i) => `Col${i+1}`).join(' | ');
    const separator = Array.from({length: cols}, () => '---').join(' | ');
    const data = Array.from({length: cols}, () => `Data${t}_${Math.random().toString(36).substr(2, 5)}`).join(' | ');
    md += `## Table ${t + 1}\n\n| ${headers} |\n| ${separator} |\n| ${data} |\n\n`;
  }

  for (let c = 0; c < codeBlocks; c++) {
    const languages = ['typescript', 'javascript', 'python', 'bash', 'json'];
    const lang = languages[c % languages.length];
    const fence = '```';
    md += `${fence}${lang}\n// Code block ${c + 1}\nfunction test${c}() {\n  return '${Math.random().toString(36)}';\n}\n${fence}\n\n`;
  }

  md += `## Features\n\n`;
  md += `- **Bold text** and *italic text*\n`;
  md += `- [Link](https://example.com)\n`;
  md += '- `Inline code` example\n';
  md += `- Task list: [x] Done [ ] Pending\n`;
  md += `- Math: $E = mc^2$\n`;
  md += `- Wiki link: [[Page Name]]\n`;
  md += `> Blockquote with important information\n\n`;

  return md;
}

// ── Real Profiling ──────────────────────────────────────────────────────────

async function juniorProfile(md: string, _options: { lspSafe?: boolean } = {}): Promise<any> {
  const memBefore = process.memoryUsage.rss();

  const ITER = 100;
  const t0 = performance.now();
  for (let i = 0; i < ITER; i++) {
    Bun.markdown.html(md, { tables: true, tasklists: true, latexMath: true });
  }
  const parseTime = (performance.now() - t0) / ITER;

  const memAfter = process.memoryUsage.rss();
  const memoryMB = Math.abs((memAfter - memBefore) / 1024 / 1024);

  const { features } = scanFeatures(md);
  const throughput = md.length / (parseTime / 1000);

  const tier = features.tableCols >= 30 ? 'enterprise'
    : features.tableCols >= 15 ? 'lead'
    : features.tableCols >= 5 ? 'senior'
    : 'junior';

  const hash = new Bun.CryptoHasher('sha256').update(md).digest('hex').slice(0, 8);

  return {
    core: { documentSize: md.length, parseTime, throughput, memoryMB },
    markdown: { parseTimeMs: parseTime, featureCounts: features, complexityTier: tier },
    security: {
      etag: `${new Bun.CryptoHasher('sha256').update(md).digest('hex')}-${hash}`,
      integrityHash: `sha256-${hash}`
    },
    audit: { timestamp: new Date().toISOString(), runner: 'batch-profiler', environment: `Bun ${Bun.version}` }
  };
}

// ── Batch Engine ────────────────────────────────────────────────────────────

function averageProfiles(profiles: any[]): BatchProfile {
  if (profiles.length === 0) {
    return {
      avgParseTime: 0, avgThroughput: 0, avgGfmScore: 0, avgTableCols: 0,
      totalFiles: 0, peakThroughput: 0, minParseTime: 0, maxParseTime: 0,
      memoryUsage: 0, tierCounts: {}, totalSize: 0
    };
  }

  const parseTimes = profiles.map(p => p.core.parseTime);
  const throughputs = profiles.map(p => p.core.throughput);
  const gfmScores = profiles.map(p => p.markdown.featureCounts.gfmScore);
  const tableCols = profiles.map(p => p.markdown.featureCounts.tableCols);
  const memoryUsage = profiles.map(p => p.core.memoryMB);
  const sizes = profiles.map(p => p.core.documentSize);

  const tierCounts: Record<string, number> = {};
  for (const p of profiles) {
    const t = p.markdown.complexityTier;
    tierCounts[t] = (tierCounts[t] || 0) + 1;
  }

  return {
    avgParseTime: parseTimes.reduce((a, b) => a + b, 0) / parseTimes.length,
    avgThroughput: throughputs.reduce((a, b) => a + b, 0) / throughputs.length,
    avgGfmScore: gfmScores.reduce((a, b) => a + b, 0) / gfmScores.length,
    avgTableCols: tableCols.reduce((a, b) => a + b, 0) / tableCols.length,
    totalFiles: profiles.length,
    peakThroughput: Math.max(...throughputs),
    minParseTime: Math.min(...parseTimes),
    maxParseTime: Math.max(...parseTimes),
    memoryUsage: memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length,
    tierCounts,
    totalSize: sizes.reduce((a, b) => a + b, 0)
  };
}

async function batchProfile(dir: string, count: number = 100, concurrency = 4): Promise<BatchProfile> {
  console.log(`\u{1F680} Batch profiling ${count} files with concurrency ${concurrency}...\n`);

  const profiles: any[] = [];
  const startTime = performance.now();
  const batches = Math.ceil(count / concurrency);

  for (let b = 0; b < batches; b++) {
    const batchSize = Math.min(concurrency, count - b * concurrency);
    const promises: Promise<any>[] = [];

    for (let j = 0; j < batchSize; j++) {
      const i = b * concurrency + j;
      const opts: TestDoc = {
        cols: 5 + (i % 25),
        tables: 1 + Math.floor(i / 10),
        codeBlocks: Math.floor(i / 20)
      };
      promises.push(genMassiveDoc(opts).then(md => juniorProfile(md, { lspSafe: true })));
    }

    const results = await Promise.all(promises);
    profiles.push(...results);

    // Progress bar
    process.stdout.write(`\r${progressBar(b + 1, batches)}`);
  }

  console.log('\n');

  const totalTime = performance.now() - startTime;
  const avg = averageProfiles(profiles);

  // Display per-file profile card for the last (most complex) file
  const last = profiles[profiles.length - 1];
  console.log(profileCard(last));
  console.log(featureMatrix(last.markdown.featureCounts));
  console.log(batchSummaryBox(avg, totalTime));

  // Save results (without individual profiles to keep output file small)
  const batchResult = {
    timestamp: new Date().toISOString(),
    summary: avg,
    performance: { totalTime, filesPerSecond: (count / totalTime) * 1000 }
  };

  await Bun.write('batch-profile.json', JSON.stringify(batchResult, null, 2));

  return avg;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let count = 100;
  let dir = './batch-tests';

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const num = parseInt(args[i].substring(2));
      if (!isNaN(num)) count = num;
    } else if (!args[i].startsWith('-')) {
      dir = args[i];
    }
  }

  try {
    await batchProfile(dir, count);
  } catch (error: any) {
    console.error('\u274C Batch profiling failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

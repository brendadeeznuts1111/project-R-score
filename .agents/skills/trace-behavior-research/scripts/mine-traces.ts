#!/usr/bin/env bun

import { mkdir, readdir, stat } from 'node:fs/promises';

type OutputFormat = 'all' | 'html' | 'json' | 'markdown' | 'summary';
type Promotion = 'candidate' | 'observe';
type TraceMessage = {
  content?: unknown;
  payload?: unknown;
  text?: unknown;
  timestamp?: unknown;
};
type FileCluster = {
  count: number;
  evidenceHashes: string[];
  lastSeen: string;
  samples: string[];
};
type FileResult = {
  clusters: Record<string, FileCluster>;
  messages: number;
  mtimeMs: number;
  size: number;
};
type Cache = { schemaVersion: 1; files: Record<string, FileResult> };
type Cluster = {
  confidence: number;
  count: number;
  evidenceHashes: string[];
  label: string;
  lastSeen: string;
  promotion: Promotion;
  samples: string[];
  sessions: number;
};
type Trend = {
  changed: Array<{ changePercent: number; current: number; label: string; previous: number }>;
  newFamilies: string[];
  staleFamilies: string[];
};
type Report = {
  schemaVersion: 2;
  generatedAt: string;
  source: {
    cacheHits: number;
    files: number;
    messages: number;
    rescannedFiles: number;
    root: string;
    sessions: number;
    since: string | null;
  };
  clusters: Cluster[];
  trend: Trend;
};

const args = Bun.argv.slice(2);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (name: string): boolean => args.includes(name);
const formats = new Set<OutputFormat>(['all', 'html', 'json', 'markdown', 'summary']);
const outArg = valueOf('--out');
const formatArg = formats.has(outArg as OutputFormat) ? outArg : valueOf('--format');
const format = (formatArg ?? 'all') as OutputFormat;
const outputDir = formats.has(outArg as OutputFormat)
  ? (valueOf('--output-dir') ?? './trace-behavior-report')
  : (outArg ?? valueOf('--output-dir') ?? './trace-behavior-report');
const root = valueOf('--root');
const minimum = Number(valueOf('--min-count') ?? '3');
const sinceValue = valueOf('--since');
const since = sinceValue ? Date.parse(sinceValue) : null;
const cachePath = valueOf('--cache') ?? `${outputDir}/.trace-cache.json`;
const historyDir = valueOf('--history-dir') ?? `${outputDir}/history`;
const draftDir = valueOf('--draft-dir') ?? `${outputDir}/drafts`;

const usage = `Trace behavior research

Usage:
  bun mine-traces.ts --root <directory> [options]

Options:
  --out <dir|json|html|markdown|summary>  Output directory or format
  --output-dir <directory>               Directory when --out selects a format
  --format <format>                      all, json, html, markdown, or summary
  --since <date>                         Include sessions on or after this date
  --cache <file>                         Incremental cache path
  --history-dir <directory>              Previous-report history
  --min-count <number>                   Promotion threshold (default: 3)
  --draft-skills                         Write review-only .draft.md files
  --draft-dir <directory>                Draft destination
  --no-cache                             Disable cache reads and writes
  -h, --help                             Show this help

Examples:
  bun mine-traces.ts --root ~/.codex/archived_sessions --out markdown
  bun mine-traces.ts --root ./sessions --out ./reports --since 2026-08-01
  bun mine-traces.ts --root ./sessions --out json --output-dir ./reports --draft-skills`;

if (has('--help') || has('-h')) {
  console.log(usage);
  process.exit(0);
}
if (
  !root ||
  !formats.has(format) ||
  !Number.isInteger(minimum) ||
  minimum < 2 ||
  (sinceValue !== undefined && Number.isNaN(since))
) {
  console.error(usage);
  process.exit(2);
}

const families: Array<{
  actions: string[];
  label: string;
  pattern: RegExp;
  triggers: string[];
}> = [
  {
    label: 'bun-native-grounding',
    pattern: /official bun|bun api|bun\.com|bun native|bun types/i,
    triggers: ['official Bun behavior', 'Bun API shape', 'Bun release claim'],
    actions: [
      'check the installed Bun runtime',
      'resolve the canonical Bun reference',
      'run focused proof',
    ],
  },
  {
    label: 'ci-and-proof-loop',
    pattern: /bun:ci|test:changed|focused test|proof|fresh rerun/i,
    triggers: ['CI failure', 'focused test failure', 'merge proof'],
    actions: [
      'isolate the earliest failing owner',
      'apply the smallest repair',
      'run a fresh rerun',
    ],
  },
  {
    label: 'git-delivery-loop',
    pattern: /commit|stage|push|pull request|merge|pr\b/i,
    triggers: ['commit request', 'push request', 'pull request delivery'],
    actions: ['verify scoped changes', 'run repository gates', 'commit and push the owned batch'],
  },
  {
    label: 'drift-remediation',
    pattern: /drift|stale|deprecated|api shape|reference audit/i,
    triggers: ['API drift', 'stale reference', 'deprecated surface'],
    actions: ['measure drift', 'ground the replacement', 'ratchet the remaining debt'],
  },
  {
    label: 'owner-triage',
    pattern: /owner|failure category|dependency boundary|workspace/i,
    triggers: ['multi-project failure', 'workspace dependency failure', 'owner classification'],
    actions: [
      'group failures by owner',
      'separate dependency and behavior failures',
      'route bounded repairs',
    ],
  },
  {
    label: 'automation-and-skills',
    pattern: /sub-agent|skill|automate|automation|trace/i,
    triggers: ['repeated workflow', 'automation request', 'skill maintenance'],
    actions: ['collect redacted evidence', 'draft a focused skill', 'validate before promotion'],
  },
];

const hash = (value: string): string => new Bun.CryptoHasher('sha256').update(value).digest('hex');
const normalize = (value: string): string =>
  value
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
    .replace(/\/Users\/[^/\s]+/g, '/Users/<user>')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '<ip-address>')
    .replace(/\b(?:token|secret|password|api[_-]?key)\s*[:=]\s*\S+/gi, '<redacted>')
    .replace(/\b[A-F0-9]{32,}\b/gi, '<opaque-id>')
    .replace(/\s+/g, ' ')
    .trim();
const textOf = (message: TraceMessage): string => {
  if (typeof message.content === 'string') return message.content;
  if (typeof message.text === 'string') return message.text;
  if (Array.isArray(message.content)) {
    return message.content
      .map(part => (typeof part === 'object' && part && 'text' in part ? String(part.text) : ''))
      .join(' ');
  }
  if (message.payload && typeof message.payload === 'object') {
    return textOf(message.payload as TraceMessage);
  }
  return '';
};
const timestampOf = (message: TraceMessage, fallback: string): string => {
  if (typeof message.timestamp === 'string' && !Number.isNaN(Date.parse(message.timestamp))) {
    return new Date(message.timestamp).toISOString();
  }
  if (message.payload && typeof message.payload === 'object') {
    return timestampOf(message.payload as TraceMessage, fallback);
  }
  return fallback;
};
const sessionDate = (file: string, mtimeMs: number): number => {
  const match = file.match(/(?:rollout-)?(\d{4}-\d{2}-\d{2})/);
  return match ? Date.parse(match[1]) : mtimeMs;
};
const readJson = async <T>(path: string): Promise<T | null> => {
  try {
    return (await Bun.file(path).json()) as T;
  } catch {
    return null;
  }
};

const oldCache = has('--no-cache') ? null : await readJson<Cache>(cachePath);
const nextCache: Cache = { schemaVersion: 1, files: {} };
const files = [...new Bun.Glob('**/*.jsonl').scanSync({ cwd: root, absolute: true })].sort();
let cacheHits = 0;
let rescannedFiles = 0;
for (const file of files) {
  const fileStat = await stat(file);
  if (since !== null && sessionDate(file, fileStat.mtimeMs) < since) continue;
  const cached = oldCache?.files[file];
  if (cached && cached.mtimeMs === fileStat.mtimeMs && cached.size === fileStat.size) {
    nextCache.files[file] = cached;
    cacheHits++;
    continue;
  }
  rescannedFiles++;
  const fallbackTimestamp = new Date(fileStat.mtimeMs).toISOString();
  const clusters: Record<string, FileCluster> = {};
  let messages = 0;
  for (const line of (await Bun.file(file).text()).split('\n')) {
    if (!line.trim()) continue;
    let record: TraceMessage;
    try {
      record = JSON.parse(line) as TraceMessage;
    } catch {
      continue;
    }
    const text = normalize(textOf(record));
    if (!text) continue;
    messages++;
    for (const family of families) {
      if (!family.pattern.test(text)) continue;
      const item = clusters[family.label] ?? {
        count: 0,
        evidenceHashes: [],
        lastSeen: fallbackTimestamp,
        samples: [],
      };
      const sample = text.slice(0, 220);
      item.count++;
      item.lastSeen = timestampOf(record, fallbackTimestamp);
      if (item.samples.length < 3 && !item.samples.includes(sample)) item.samples.push(sample);
      const evidenceHash = hash(sample);
      if (item.evidenceHashes.length < 12 && !item.evidenceHashes.includes(evidenceHash)) {
        item.evidenceHashes.push(evidenceHash);
      }
      clusters[family.label] = item;
    }
  }
  nextCache.files[file] = {
    clusters,
    messages,
    mtimeMs: fileStat.mtimeMs,
    size: fileStat.size,
  };
}

const aggregate = new Map<
  string,
  {
    count: number;
    evidenceHashes: Set<string>;
    lastSeen: string;
    samples: string[];
    sessions: number;
  }
>();
for (const result of Object.values(nextCache.files)) {
  for (const [label, item] of Object.entries(result.clusters)) {
    const total = aggregate.get(label) ?? {
      count: 0,
      evidenceHashes: new Set<string>(),
      lastSeen: item.lastSeen,
      samples: [],
      sessions: 0,
    };
    total.count += item.count;
    total.sessions++;
    if (Date.parse(item.lastSeen) > Date.parse(total.lastSeen)) total.lastSeen = item.lastSeen;
    for (const evidenceHash of item.evidenceHashes) total.evidenceHashes.add(evidenceHash);
    for (const sample of item.samples) {
      if (total.samples.length < 3 && !total.samples.includes(sample)) total.samples.push(sample);
    }
    aggregate.set(label, total);
  }
}
const clusters: Cluster[] = [...aggregate.entries()]
  .map(([label, item]) => ({
    confidence: Number(
      Math.min(
        0.99,
        0.5 + Math.log10(item.count + 1) / 10 + Math.min(item.sessions, 20) / 50
      ).toFixed(2)
    ),
    count: item.count,
    evidenceHashes: [...item.evidenceHashes].sort(),
    label,
    lastSeen: item.lastSeen,
    promotion: item.count >= minimum && item.sessions >= minimum ? 'candidate' : 'observe',
    samples: item.samples,
    sessions: item.sessions,
  }))
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

await mkdir(outputDir, { recursive: true });
await mkdir(historyDir, { recursive: true });
const historyFiles = (await readdir(historyDir)).filter(file => file.endsWith('.json')).sort();
const previous = historyFiles.length
  ? await readJson<Report>(`${historyDir}/${historyFiles.at(-1)}`)
  : null;
const previousByLabel = new Map(previous?.clusters.map(cluster => [cluster.label, cluster]) ?? []);
const currentLabels = new Set(clusters.map(cluster => cluster.label));
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const trend: Trend = {
  changed: clusters.flatMap(cluster => {
    const old = previousByLabel.get(cluster.label);
    if (!old || old.count === 0) return [];
    const changePercent = ((cluster.count - old.count) / old.count) * 100;
    return Math.abs(changePercent) > 20
      ? [
          {
            changePercent: Number(changePercent.toFixed(1)),
            current: cluster.count,
            label: cluster.label,
            previous: old.count,
          },
        ]
      : [];
  }),
  newFamilies: clusters
    .filter(cluster => !previousByLabel.has(cluster.label))
    .map(cluster => cluster.label),
  staleFamilies:
    previous?.clusters
      .filter(
        cluster => !currentLabels.has(cluster.label) && Date.parse(cluster.lastSeen) < sevenDaysAgo
      )
      .map(cluster => cluster.label) ?? [],
};
const report: Report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  source: {
    cacheHits,
    files: Object.keys(nextCache.files).length,
    messages: Object.values(nextCache.files).reduce((sum, file) => sum + file.messages, 0),
    rescannedFiles,
    root,
    sessions: Object.keys(nextCache.files).length,
    since: sinceValue ?? null,
  },
  clusters,
  trend,
};

const summary = [
  `Trace research: ${report.source.files} files, ${report.source.messages} messages, ${cacheHits} cache hits.`,
  ...clusters.map(
    cluster =>
      `${cluster.label}: ${cluster.count} occurrences / ${cluster.sessions} sessions / ${(cluster.confidence * 100).toFixed(0)}% confidence / ${cluster.promotion}`
  ),
];
const markdown = [
  '# Trace behavior research',
  '',
  `- Traces scanned: ${report.source.files}`,
  `- Messages inspected: ${report.source.messages}`,
  `- Incremental cache: ${cacheHits} hit(s), ${rescannedFiles} rescanned`,
  `- Promotion threshold: ${minimum} occurrences across ${minimum} sessions`,
  '',
  '## Trends',
  '',
  `- New families: ${trend.newFamilies.join(', ') || 'none'}`,
  `- Changed by more than 20%: ${trend.changed.map(item => `${item.label} (${item.changePercent}%)`).join(', ') || 'none'}`,
  `- Stale for 7 days: ${trend.staleFamilies.join(', ') || 'none'}`,
  '',
  '## Families',
  '',
  ...clusters.flatMap(cluster => [
    `### ${cluster.label}`,
    '',
    `- Count: ${cluster.count} across ${cluster.sessions} sessions`,
    `- Confidence: ${(cluster.confidence * 100).toFixed(0)}%`,
    `- Promotion: ${cluster.promotion}`,
    `- Last seen: ${cluster.lastSeen}`,
    `- Evidence hashes: ${cluster.evidenceHashes
      .slice(0, 3)
      .map(value => `\`${value}\``)
      .join(', ')}`,
    '',
    ...cluster.samples.map(sample => `> ${sample}`),
    '',
  ]),
  'Review candidate clusters manually before editing any active skill.',
].join('\n');
const escapeHtml = (value: string): string => Bun.escapeHTML(value);
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Trace behavior research</title><style>body{font:15px system-ui;max-width:960px;margin:2rem auto;padding:0 1rem}details{border:1px solid #ddd;border-radius:8px;padding:.8rem;margin:.8rem 0}code{word-break:break-all}blockquote{color:#555}</style></head><body><h1>Trace behavior research</h1><p>${escapeHtml(summary[0])}</p>${clusters.map(cluster => `<details><summary><strong>${escapeHtml(cluster.label)}</strong> — ${cluster.count} occurrences, ${(cluster.confidence * 100).toFixed(0)}% confidence</summary><p>Sessions: ${cluster.sessions}<br>Promotion: ${cluster.promotion}<br>Last seen: ${escapeHtml(cluster.lastSeen)}</p>${cluster.samples.map(sample => `<blockquote>${escapeHtml(sample)}</blockquote>`).join('')}<p><code>${escapeHtml(cluster.evidenceHashes.slice(0, 3).join(' · '))}</code></p></details>`).join('')}</body></html>`;

const writes: Array<Promise<number>> = [];
if (format === 'all' || format === 'json') {
  writes.push(
    Bun.write(`${outputDir}/behavior-research.json`, `${JSON.stringify(report, null, 2)}\n`)
  );
}
if (format === 'all' || format === 'markdown') {
  writes.push(Bun.write(`${outputDir}/behavior-research.md`, `${markdown}\n`));
}
if (format === 'all' || format === 'summary') {
  writes.push(
    Bun.write(
      `${outputDir}/behavior-research.summary.txt`,
      `${summary.map(line => `- ${line}`).join('\n')}\n`
    )
  );
}
if (format === 'all' || format === 'html') {
  writes.push(Bun.write(`${outputDir}/behavior-research.html`, html));
}
await Promise.all(writes);
if (!has('--no-cache')) await Bun.write(cachePath, `${JSON.stringify(nextCache, null, 2)}\n`);
const historyName = report.generatedAt.replace(/[:.]/g, '-') + '.json';
await Bun.write(`${historyDir}/${historyName}`, `${JSON.stringify(report, null, 2)}\n`);

if (has('--draft-skills')) {
  await mkdir(draftDir, { recursive: true });
  for (const cluster of clusters.filter(item => item.promotion === 'candidate')) {
    const family = families.find(item => item.label === cluster.label);
    if (!family) continue;
    const draft = `---\nname: ${cluster.label}\ndescription: Review-only draft from redacted trace research.\ntraceResearch:\n  confidence: ${cluster.confidence}\n  evidenceCount: ${cluster.count}\n  sessions: ${cluster.sessions}\n  evidenceHashes:\n${cluster.evidenceHashes
      .slice(0, 3)
      .map(value => `    - ${value}`)
      .join(
        '\n'
      )}\n  triggers:\n${family.triggers.map(value => `    - ${JSON.stringify(value)}`).join('\n')}\n  actions:\n${family.actions.map(value => `    - ${JSON.stringify(value)}`).join('\n')}\n---\n\n# ${cluster.label}\n\nThis is a review-only draft. Use skill-creator and Project R skill validation before promotion.\n`;
    await Bun.write(`${draftDir}/${cluster.label}.draft.md`, draft);
  }
}

console.log(summary.join('\n'));

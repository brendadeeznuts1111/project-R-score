#!/usr/bin/env bun

type TraceMessage = { role?: string; content?: unknown; text?: unknown; payload?: unknown };
type Cluster = {
  label: string;
  count: number;
  sessions: number;
  evidenceHash: string;
  promotion: 'candidate' | 'observe';
};

const args = Bun.argv.slice(2);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const root = valueOf('--root');
const out = valueOf('--out') ?? './trace-behavior-report';
const minimum = Number(valueOf('--min-count') ?? '3');

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: bun mine-traces.ts --root <directory> --out <directory> [--min-count N]');
  process.exit(0);
}

if (!root || !Number.isInteger(minimum) || minimum < 2) {
  console.error('Usage: bun mine-traces.ts --root <directory> --out <directory> [--min-count N]');
  process.exit(2);
}

const labels: Array<[string, RegExp]> = [
  ['bun-native-grounding', /official bun|bun api|bun\.com|bun native|bun types/i],
  ['ci-and-proof-loop', /bun:ci|test:changed|focused test|proof|fresh rerun/i],
  ['git-delivery-loop', /commit|stage|push|pull request|merge|pr\b/i],
  ['drift-remediation', /drift|stale|deprecated|api shape|reference audit/i],
  ['owner-triage', /owner|failure category|dependency boundary|workspace/i],
  ['automation-and-skills', /sub-agent|skill|automate|automation|trace/i],
];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
    .replace(/\b(?:token|secret|password|api[_-]?key)\s*[:=]\s*\S+/gi, '<redacted>')
    .replace(/\s+/g, ' ')
    .trim();

const hash = (value: string): string => new Bun.CryptoHasher('sha256').update(value).digest('hex');
const textOf = (message: TraceMessage): string => {
  if (typeof message.content === 'string') return message.content;
  if (typeof message.text === 'string') return message.text;
  if (Array.isArray(message.content))
    return message.content
      .map(part => (typeof part === 'object' && part && 'text' in part ? String(part.text) : ''))
      .join(' ');
  if (message.payload && typeof message.payload === 'object')
    return textOf(message.payload as TraceMessage);
  return '';
};

const files = [...new Bun.Glob('**/*.jsonl').scanSync({ cwd: root, absolute: true })];
const counts = new Map<string, { count: number; sessions: Set<string>; evidence: string[] }>();
let messages = 0;
for (const file of files) {
  const session = file.split('/').pop() ?? file;
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
    for (const [label, pattern] of labels) {
      if (!pattern.test(text)) continue;
      const item = counts.get(label) ?? { count: 0, sessions: new Set<string>(), evidence: [] };
      item.count++;
      item.sessions.add(session);
      item.evidence.push(text.slice(0, 240));
      counts.set(label, item);
    }
  }
}

const clusters: Cluster[] = [...counts.entries()]
  .map(([label, item]) => ({
    label,
    count: item.count,
    sessions: item.sessions.size,
    evidenceHash: hash(item.evidence.sort().join('\n')),
    promotion: item.count >= minimum && item.sessions.size >= minimum ? 'candidate' : 'observe',
  }))
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

await import('node:fs/promises').then(({ mkdir }) => mkdir(out, { recursive: true }));
await Bun.write(
  `${out}/behavior-research.json`,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      source: {
        root,
        files: files.length,
        sessions: new Set(files.map(file => file.split('/').pop())).size,
        messages,
      },
      clusters,
    },
    null,
    2
  )}\n`
);
await Bun.write(
  `${out}/behavior-research.md`,
  [
    '# Trace behavior research',
    '',
    `- Traces scanned: ${files.length}`,
    `- Messages inspected: ${messages}`,
    `- Promotion threshold: ${minimum} occurrences across ${minimum} sessions`,
    '',
    ...clusters.map(
      cluster =>
        `- **${cluster.label}** — ${cluster.count} occurrences across ${cluster.sessions} sessions (${cluster.promotion}); evidence hash \`${cluster.evidenceHash}\`.`
    ),
    '',
    'Review candidate clusters manually before editing any skill.',
  ].join('\n')
);

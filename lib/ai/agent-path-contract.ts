import { relativePath, resolvePath } from '../path-bun.ts';

export type DiscoveryKind = 'context' | 'command' | 'skill' | 'guidance' | 'friction';

export type DiscoveryHit = {
  kind: DiscoveryKind;
  id: string;
  score: number;
  summary: string;
  path?: string;
  command?: string;
  matchedTerms?: string[];
};

export type AgentDiscovery = {
  schemaVersion: 1;
  query: string;
  paths: string[];
  contexts: string[];
  hits: DiscoveryHit[];
};

export type FrictionEvent = {
  schemaVersion: 1;
  id: string;
  observedAt: string;
  fingerprint: string;
  tool: string;
  code: string;
  path?: string;
  detail?: string;
};

export type KnownFriction = {
  id: string;
  title: string;
  status: 'active' | 'resolved' | 'accepted';
  tags: string[];
  owner: string;
  match: { tool: string; code: string; path?: string };
  prevention?: string;
};

export type FrictionRegistry = {
  $schema: './schemas/ai-friction.schema.json';
  schemaVersion: 1;
  promotionThreshold: number;
  observationWindowDays: number;
  retentionDays: number;
  issues: KnownFriction[];
};

function exactKeys(value: object, expected: string[], label: string): void {
  const actual = Object.keys(value).sort().join('\0');
  const contract = [...expected].sort().join('\0');
  if (actual !== contract) throw new TypeError(`${label} keys do not match its contract`);
}

export function tokens(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter(
    token => token.length > 1
  );
}

export function relevance(queryTokens: string[], id: string, text: string): number {
  const normalizedId = id.toLowerCase();
  const normalizedText = text.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (normalizedId === token) score += 12;
    else if (normalizedId.includes(token)) score += 6;
    if (normalizedText.includes(token)) score += 2;
  }
  return score;
}

export function matchingTerms(queryTokens: string[], id: string, text: string): string[] {
  const haystack = `${id} ${text}`.toLowerCase();
  return queryTokens.filter(token => haystack.includes(token));
}

export function safeRepoPath(repoRoot: string, candidate: string): string {
  const absolute = resolvePath(repoRoot, candidate);
  if (absolute !== repoRoot && !absolute.startsWith(`${repoRoot}/`)) {
    throw new TypeError(`path leaves repository: ${candidate}`);
  }
  return relativePath(repoRoot, absolute);
}

export function validateFrictionValue(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9:._/-]{0,95}$/.test(normalized)) {
    throw new TypeError(`${label} must be a stable lowercase identifier`);
  }
  return normalized;
}

export function frictionFingerprint(tool: string, code: string, path?: string): string {
  return new Bun.CryptoHasher('sha256')
    .update(`${tool}\0${code}\0${path ?? ''}`)
    .digest('hex')
    .slice(0, 20);
}

export async function readFrictionRegistry(repoRoot: string): Promise<FrictionRegistry> {
  const raw = (await Bun.file(
    resolvePath(repoRoot, 'config/ai-friction.json')
  ).json()) as FrictionRegistry;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('config/ai-friction.json must be an object');
  }
  exactKeys(
    raw,
    [
      '$schema',
      'schemaVersion',
      'promotionThreshold',
      'observationWindowDays',
      'retentionDays',
      'issues',
    ],
    'ai friction registry'
  );
  if (
    raw.$schema !== './schemas/ai-friction.schema.json' ||
    raw.schemaVersion !== 1 ||
    !Number.isInteger(raw.promotionThreshold) ||
    raw.promotionThreshold < 2 ||
    !Number.isInteger(raw.observationWindowDays) ||
    raw.observationWindowDays < 1 ||
    !Number.isInteger(raw.retentionDays) ||
    raw.retentionDays < raw.observationWindowDays
  ) {
    throw new TypeError('config/ai-friction.json has an unsupported contract');
  }
  if (!Array.isArray(raw.issues)) throw new TypeError('ai friction issues must be an array');
  const ids = new Set<string>();
  for (const issue of raw.issues) {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
      throw new TypeError('friction issues must be objects');
    }
    exactKeys(
      issue,
      [
        'id',
        'title',
        'status',
        'tags',
        'owner',
        'match',
        ...('prevention' in issue ? ['prevention'] : []),
      ],
      `friction issue: ${issue.id ?? '<unknown>'}`
    );
    if (!/^[a-z][a-z0-9-]*$/.test(issue.id) || ids.has(issue.id)) {
      throw new TypeError(`invalid or duplicate friction id: ${issue.id}`);
    }
    ids.add(issue.id);
    if (!['active', 'resolved', 'accepted'].includes(issue.status)) {
      throw new TypeError(`invalid friction status: ${issue.id}`);
    }
    if (
      typeof issue.title !== 'string' ||
      !Array.isArray(issue.tags) ||
      issue.tags.length === 0 ||
      issue.tags.some(tag => typeof tag !== 'string' || tag.length === 0) ||
      typeof issue.owner !== 'string' ||
      (issue.prevention !== undefined && typeof issue.prevention !== 'string')
    ) {
      throw new TypeError(`friction issue requires tags: ${issue.id}`);
    }
    if (issue.status === 'resolved' && !issue.prevention) {
      throw new TypeError(`resolved friction issue requires prevention: ${issue.id}`);
    }
    if (!(await Bun.file(resolvePath(repoRoot, issue.owner)).exists())) {
      throw new TypeError(`friction owner does not resolve: ${issue.owner}`);
    }
    if (!issue.match || typeof issue.match !== 'object' || Array.isArray(issue.match)) {
      throw new TypeError(`friction issue requires match: ${issue.id}`);
    }
    exactKeys(
      issue.match,
      issue.match.path ? ['tool', 'code', 'path'] : ['tool', 'code'],
      `friction match: ${issue.id}`
    );
    validateFrictionValue(issue.match.tool ?? '', `friction match tool: ${issue.id}`);
    validateFrictionValue(issue.match?.code ?? '', `friction match code: ${issue.id}`);
    if (issue.match.path) safeRepoPath(repoRoot, issue.match.path);
  }
  return raw;
}

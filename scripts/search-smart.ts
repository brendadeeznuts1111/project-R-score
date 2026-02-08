#!/usr/bin/env bun

/**
 * Smart Search (Phase 1)
 * Hybrid code search that combines:
 * - lexical ripgrep retrieval
 * - query expansion (intent + aliases)
 * - semantic-style ranking on path + snippet context
 */
import { searchSymbolIndex, type SymbolSearchHit, type SymbolSearchKind } from '../lib/docs/smart-symbol-index';
import {
  buildCanonicalFamilies,
  computePathAuthorityScore,
  loadSearchPolicies,
  type BunFeaturePolicy,
  type CanonicalFamily,
  type SearchPolicies,
} from '../lib/docs/canonical-family';
import { resolve } from 'node:path';

type ViewMode = 'clean' | 'mixed' | 'slop-only' | 'all';
type TaskMode = 'default' | 'delivery' | 'cleanup';
type QualityTag = 'core' | 'generated' | 'duplicate' | 'compiled' | 'docs-noise' | 'ai-slop';
type ScopeTag = 'code' | 'docs' | 'tests' | 'generated';
type ArtifactTag = 'api' | 'constant' | 'global' | 'type' | 'example' | 'cli';
type RuntimeTag = 'bun' | 'ts' | 'js';

interface SearchOptions {
  rootDir: string;
  limit: number;
  caseSensitive: boolean;
  json: boolean;
  kind: SymbolSearchKind;
  targetSymbol?: string;
  groupLimit?: number;
  view: ViewMode;
  task: TaskMode;
  showMirrors: boolean;
  familyCap?: number;
  scopeFilter?: ScopeTag[];
  artifactFilter?: ArtifactTag[];
  runtimeFilter?: RuntimeTag[];
}

interface QueryPlan {
  raw: string;
  normalized: string;
  roots: string[];
  terms: string[];
  aliasHints: string[];
}

interface QueryIntent {
  asksForImports: boolean;
  asksForBun: boolean;
  asksForApi: boolean;
  asksForRuntime: boolean;
  asksForReleaseNotes: boolean;
  asksForDocs: boolean;
}

interface SearchHit {
  file: string;
  line: number;
  text: string;
  score: number;
  reason: string[];
  kind: 'definition' | 'usage';
  symbolKind?: SymbolSearchKind;
  qualityTag?: QualityTag;
  qualityScore?: number;
  duplicateCount?: number;
  mirrorCount?: number;
  canonicalFile?: string;
  mirrorFiles?: string[];
  familyId?: string;
  scopeTag?: ScopeTag;
  artifactTag?: ArtifactTag;
  runtimeTag?: RuntimeTag;
}

type RgEvent = {
  type: string;
  data?: {
    path?: { text?: string };
    line_number?: number;
    lines?: { text?: string };
  };
};

const SOURCE_GLOBS = ['*.ts', '*.tsx', '*.js', '*.jsx', '*.mjs', '*.cjs'];
const EXCLUDE_GLOBS = [
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/.git/**',
  '!**/coverage/**',
  '!**/*.min.js',
  '!**/*.bundle.js',
];
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'with', 'from', 'as',
  'where', 'how', 'what', 'when', 'why', 'which', 'who',
]);

const INTENT_EXPANSIONS: Record<string, string[]> = {
  auth: ['auth', 'authenticate', 'authorization', 'jwt', 'token', 'session'],
  cache: ['cache', 'memo', 'ttl', 'redis', 'lru'],
  search: ['search', 'query', 'index', 'rank', 'retrieve'],
  security: ['security', 'sanitize', 'validate', 'guard', 'permission'],
  perf: ['performance', 'latency', 'throughput', 'benchmark', 'optimiz'],
  error: ['error', 'exception', 'retry', 'fallback', 'recover'],
  config: ['config', 'env', 'settings', 'option', 'flag'],
};

const CORE_SEARCH_INFRA_PATHS = [
  '/lib/docs/canonical-family.ts',
  '/lib/docs/smart-symbol-index.ts',
  '/lib/docs/ripgrep-spawn.ts',
  '/lib/docs/stream-search.ts',
  '/lib/docs/enhanced-stream-search.ts',
];

function isCoreSearchInfraPath(path: string): boolean {
  const lower = path.toLowerCase();
  return CORE_SEARCH_INFRA_PATHS.some((needle) => lower.endsWith(needle));
}

function printUsage(): void {
  console.log(`
Smart Search (Hybrid Phase 1)

USAGE:
  bun run scripts/search-smart.ts <query> [options]

OPTIONS:
  --path <dir>         Directory to search (default: .)
  --limit <n>          Max returned results (default: 20)
  --group-limit <n>    Max results per output group (default: unlimited)
  --family-cap <n>     Max hits per canonical family (default: policies.json)
  --case-sensitive     Case-sensitive matching
  --strict             Preset: --view clean --task delivery --group-limit 3 --family-cap 2
  --show-mirrors       Print top mirror paths under canonical hits
  --kind <kind>        any|function|class|interface|type|enum|variable|import|export|call|callers|callees
  --of <symbol>        Target symbol for --kind callers|callees
  --view <mode>        clean|mixed|slop-only|all (default: clean)
  --task <mode>        default|delivery|cleanup (default: default)
  --scope, -S <list>   Filter scopes: code,docs,tests,generated (comma-separated)
  --artifact, -A <list> Filter artifacts: api,constant,global,type,example,cli
  --runtime, -R <list> Filter runtime: bun,ts,js
  --json               Emit JSON output

EXAMPLES:
  bun run scripts/search-smart.ts "@lib/r2 lifecycle"
  bun run scripts/search-smart.ts "R2LifecycleManager" --kind class
  bun run scripts/search-smart.ts "R2LifecycleManager" --kind callers --of R2LifecycleManager
  bun run scripts/search-smart.ts "R2LifecycleManager" --kind callees --of R2LifecycleManager
  bun run scripts/search-smart.ts "auth middleware" --strict --show-mirrors
  bun run scripts/search-smart.ts "auth middleware" --family-cap 2
  bun run scripts/search-smart.ts "Bun.serve" --runtime bun --artifact api
  bun run scripts/search-smart.ts "constants" --scope code --artifact constant
  bun run scripts/search-smart.ts "auth middleware" --view mixed --task delivery
  bun run scripts/search-smart.ts "generated declaration" --view slop-only --task cleanup
  bun run scripts/search-smart.ts "where auth is enforced" --limit 10
  bun run scripts/search-smart.ts "cache invalidation" --path ./lib
`);
}

function splitIdentifierPieces(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._\-/]+/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 2)
    .filter((part) => !STOP_WORDS.has(part));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const size = Math.max(1, Math.min(concurrency, items.length || 1));
  const out = new Array<R>(items.length);
  let cursor = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      out[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: size }, () => runWorker()));
  return out;
}

function featurePolicyMatches(
  normalizedQuery: string,
  policy: BunFeaturePolicy
): boolean {
  const q = normalizedQuery.toLowerCase();
  const aliases = policy.aliases || [];
  const terms = policy.terms || [];
  return [...aliases, ...terms].some((token) => q.includes(token.toLowerCase()));
}

function applyFeaturePoliciesToPlan(plan: QueryPlan, policies: SearchPolicies): QueryPlan {
  const terms = [...plan.terms];
  const aliasHints = [...plan.aliasHints];
  const q = plan.normalized.toLowerCase();

  for (const [featureId, feature] of Object.entries(policies.bunFeatureMap || {})) {
    if (!featurePolicyMatches(q, feature)) {
      continue;
    }
    if (feature.aliases && feature.aliases.length > 0) {
      aliasHints.push(`${featureId}: ${feature.aliases[0]}`);
      terms.push(...feature.aliases);
    }
    if (feature.terms && feature.terms.length > 0) {
      terms.push(...feature.terms);
    }
    if (feature.runtimeHint) {
      terms.push(feature.runtimeHint);
    }
    if (feature.artifactHint) {
      terms.push(feature.artifactHint);
    }
  }

  return {
    ...plan,
    terms: unique(terms).slice(0, 64),
    aliasHints: unique(aliasHints),
  };
}

function detectQueryIntent(plan: QueryPlan): QueryIntent {
  const q = plan.normalized.toLowerCase();

  const asksForImports = /(^|\s)(import|imports|dependency|dependencies|require|from)(\s|$)/i.test(plan.normalized);
  const asksForBun = /\b(bun|javascriptcore|jsc|webkit|wrapansi|arm64|apple silicon|windows arm64)\b/.test(q);
  const asksForApi = /\b(api|function|method|constant|global|runtime|header|ansi|wrap|flag|cli)\b/.test(q);
  const asksForRuntime = /\b(runtime|bun|node|jsc|arm64|windows arm64|apple silicon)\b/.test(q);
  const asksForReleaseNotes = /\b(release|changelog|upgrade|bug fix|bugfix|performance improvements?|latest)\b/.test(q);
  const asksForDocs = /\b(docs?|documentation|wiki|readme|guide|template)\b/.test(q);

  return {
    asksForImports,
    asksForBun,
    asksForApi,
    asksForRuntime,
    asksForReleaseNotes,
    asksForDocs,
  };
}

function isDocsAdjacentCode(hit: SearchHit): boolean {
  const file = hit.file.toLowerCase();
  const text = hit.text.toLowerCase();
  if (isCoreSearchInfraPath(file)) return false;
  if (file.includes('/docs/')) return true;
  if (file.includes('/wiki/')) return true;
  if (file.includes('documentation')) return true;
  if (file.includes('template')) return true;
  if (file.includes('generator')) return true;
  if (/\b(auto-generated|generated on|template|documentation)\b/.test(text)) return true;
  return false;
}

function isDeliveryDemotionPath(filePath: string, policies: SearchPolicies): boolean {
  const lower = filePath.toLowerCase();
  if ((policies.deliveryDemotionExceptions || []).some((needle) => lower.includes(needle.toLowerCase()))) {
    return false;
  }
  const configured = (policies.deliveryDemotionContains || [])
    .some((needle) => lower.includes(needle.toLowerCase()));
  if (configured) return true;
  return /\/lib\/docs\/.*(generator|template|validator)/i.test(lower);
}

function buildQueryPlan(rawQuery: string, rootDir: string): QueryPlan {
  const normalized = rawQuery.trim();
  const lower = normalized.toLowerCase();

  const terms: string[] = [normalized];
  const aliasHints: string[] = [];
  const roots = [rootDir];

  if (lower.includes('@lib')) {
    aliasHints.push('@lib/* -> ./lib/*');
    terms.push(normalized.replace(/@lib\//gi, 'lib/'));
    terms.push(normalized.replace(/@lib\//gi, 'lib/').replace(/\//g, ' '));
    roots.push('./lib');
  }

  const parts = splitIdentifierPieces(normalized);
  for (const part of parts) {
    terms.push(part);
    for (const [intentKey, expansions] of Object.entries(INTENT_EXPANSIONS)) {
      if (part.includes(intentKey) || intentKey.includes(part)) {
        terms.push(...expansions);
      }
    }
  }

  // Phrase-level intent expansion for common natural language asks.
  if (/(where|how)\s+.*(enforced|validated|checked)/i.test(normalized)) {
    terms.push('validate', 'guard', 'check', 'enforce', 'authorize', 'middleware', 'permission');
  }

  return {
    raw: rawQuery,
    normalized,
    roots: unique(roots),
    terms: unique(terms).slice(0, 24),
    aliasHints,
  };
}

async function runRipgrep(pattern: string, roots: string[], options: SearchOptions): Promise<SearchHit[]> {
  const args = ['rg'];

  if (!options.caseSensitive) {
    args.push('-i');
  }

  args.push('-F');
  args.push('--json');
  args.push('--line-number');
  args.push('--max-count', String(Math.max(25, options.limit * 3)));

  for (const glob of SOURCE_GLOBS) {
    args.push('--glob', glob);
  }
  for (const glob of EXCLUDE_GLOBS) {
    args.push('--glob', glob);
  }

  args.push(pattern);
  args.push(...roots);

  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'ignore',
  });

  const text = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if ((exitCode !== 0 && exitCode !== 1) || !text.trim()) {
    return [];
  }

  const hits: SearchHit[] = [];
  const lines = text.split('\n').filter(Boolean);

  for (const line of lines) {
    let parsed: RgEvent;
    try {
      parsed = JSON.parse(line) as RgEvent;
    } catch {
      continue;
    }

    if (parsed.type !== 'match') {
      continue;
    }

    const file = parsed.data?.path?.text;
    const lineNumber = parsed.data?.line_number;
    const snippet = parsed.data?.lines?.text;

    if (!file || typeof lineNumber !== 'number' || !snippet) {
      continue;
    }

    hits.push({
      file,
      line: lineNumber,
      text: snippet.trim(),
      score: 0,
      reason: [`matched: ${pattern}`],
      kind: classifyHit(snippet),
    });
  }

  return hits;
}

function classifyHit(line: string): 'definition' | 'usage' {
  const definitionRegex = /\b(export\s+)?(async\s+)?(function|class|interface|type|enum|const|let)\b/;
  return definitionRegex.test(line) ? 'definition' : 'usage';
}

function tokenize(input: string): string[] {
  return splitIdentifierPieces(input);
}

function scoreHit(
  hit: SearchHit,
  plan: QueryPlan,
  policies: SearchPolicies,
  intent: QueryIntent
): SearchHit {
  const textLower = hit.text.toLowerCase();
  const fileLower = hit.file.toLowerCase();
  const queryLower = plan.normalized.toLowerCase();
  const queryTokens = tokenize(plan.normalized);

  const reasons = [...hit.reason];
  let score = 0;
  const importLikeLine = /^\s*import\s/.test(hit.text) || /^\s*export\s+\{/.test(hit.text);

  if (textLower.includes(queryLower) || fileLower.includes(queryLower)) {
    score += 24;
    reasons.push('exact query match');
  }

  for (const term of plan.terms) {
    const t = term.toLowerCase();
    if (!t || t.length < 2) {
      continue;
    }

    if (textLower.includes(t)) {
      score += t.length > 5 ? 6 : 3;
    }

    if (fileLower.includes(t)) {
      score += t.length > 5 ? 7 : 4;
    }
  }

  let overlap = 0;
  const tokenSet = new Set(tokenize(`${hit.file} ${hit.text}`));
  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      overlap += 1;
    }
  }
  if (overlap > 0) {
    score += overlap * 5;
    reasons.push(`token overlap: ${overlap}`);
  }

  if (plan.normalized.includes('@lib') && fileLower.includes('/lib/')) {
    score += 18;
    reasons.push('@lib path boost');
  }

  if (hit.kind === 'definition') {
    score += 4;
    reasons.push('definition boost');
  }

  if (importLikeLine && !intent.asksForImports) {
    score -= policies.importDampeningPenalty;
    reasons.push('import dampening');
  }

  const runtimeTag = classifyRuntimeTag(hit);
  const artifactTag = classifyArtifactTag(hit);
  const boosts = policies.queryBoosts;

  if (intent.asksForBun && runtimeTag === 'bun') {
    score += boosts.bunRuntimeBoost || 0;
    reasons.push('bun-runtime boost');
  } else if (intent.asksForRuntime && runtimeTag !== 'bun') {
    score -= boosts.runtimeMismatchPenalty || 0;
    reasons.push('runtime mismatch penalty');
  }

  if (intent.asksForApi && artifactTag === 'api') {
    score += boosts.apiArtifactBoost || 0;
    reasons.push('api artifact boost');
  }

  if (
    !intent.asksForReleaseNotes &&
    (fileLower.includes('/docs/') || fileLower.endsWith('.md')) &&
    !isCoreSearchInfraPath(fileLower)
  ) {
    score -= boosts.nonReleaseDocsPenalty || 0;
    reasons.push('non-release docs penalty');
  }

  for (const feature of Object.values(policies.bunFeatureMap || {})) {
    if (!featurePolicyMatches(queryLower, feature)) {
      continue;
    }

    if (feature.runtimeHint && feature.runtimeHint === runtimeTag) {
      score += 6;
      reasons.push(`feature runtime hint (${feature.runtimeHint})`);
    }
    if (feature.artifactHint && feature.artifactHint === artifactTag) {
      score += 4;
      reasons.push(`feature artifact hint (${feature.artifactHint})`);
    }
    if (feature.pathBoostContains?.some((needle) => fileLower.includes(needle.toLowerCase()))) {
      score += 5;
      reasons.push('feature path boost');
    }
    if (feature.lineBoostContains?.some((needle) => textLower.includes(needle.toLowerCase()))) {
      score += 5;
      reasons.push('feature line boost');
    }
  }

  if (fileLower.includes('/scripts/search-smart.ts')) {
    score -= 20;
    reasons.push('self-file penalty');
  }

  return {
    ...hit,
    score,
    reason: unique(reasons),
  };
}

function dedupeHits(hits: SearchHit[]): SearchHit[] {
  const byKey = new Map<string, SearchHit>();

  for (const hit of hits) {
    const key = `${hit.file}:${hit.line}`;
    const existing = byKey.get(key);

    if (!existing || hit.score > existing.score) {
      byKey.set(key, hit);
    }
  }

  return [...byKey.values()];
}

function qualityForHit(hit: SearchHit, policies: SearchPolicies): { tag: QualityTag; score: number; reason: string } {
  const file = hit.file.toLowerCase();
  const text = hit.text.toLowerCase();
  const longLine = hit.text.length > 240;
  const escapedBlob = text.includes('\\n') && hit.text.length > 120;

  if (
    file.includes('/node_modules/') ||
    file.includes('/dist/') ||
    file.includes('/build/') ||
    file.endsWith('.min.js') ||
    file.endsWith('.bundle.js')
  ) {
    return { tag: 'compiled', score: 0.15, reason: 'compiled-path penalty' };
  }

  if (
    file.endsWith('.d.ts') ||
    text.includes('sourcemappingurl=') ||
    text.includes('generated by') ||
    text.includes('do not edit')
  ) {
    return { tag: 'generated', score: 0.3, reason: 'generated-file penalty' };
  }

  if ((file.includes('/docs/') || file.endsWith('.md')) && !isCoreSearchInfraPath(file)) {
    return { tag: 'docs-noise', score: 0.45, reason: 'docs-noise penalty' };
  }

  if (longLine || escapedBlob) {
    return { tag: 'ai-slop', score: 0.4, reason: 'slop-pattern penalty' };
  }

  const authority = computePathAuthorityScore(hit.file, policies);
  if (authority >= 12) {
    return { tag: 'core', score: 0.94, reason: 'authority-path boost' };
  }
  if (authority >= 4) {
    return { tag: 'core', score: 0.84, reason: 'core-code boost' };
  }
  return { tag: 'core', score: 0.7, reason: 'neutral-code quality' };
}

function applyQualityModel(
  hit: SearchHit,
  options: SearchOptions,
  policies: SearchPolicies,
  intent: QueryIntent,
  importQualityPenalty: number
): SearchHit {
  const quality = qualityForHit(hit, policies);
  let score = hit.score;
  const docsCompetitionAllowed = intent.asksForDocs || intent.asksForReleaseNotes;

  if (options.task === 'cleanup') {
    score = score * (1 + (1 - quality.score) * 0.7);
    if (quality.tag !== 'core') {
      score += 8;
    }
  } else if (options.task === 'delivery') {
    score = score * (0.65 + quality.score * 0.7);
  } else {
    score = score * (0.75 + quality.score * 0.6);
  }

  const importHeavy = hit.symbolKind === 'import' || /^\s*import\s/.test(hit.text);
  let adjustedScore = score;
  if (importHeavy && options.task !== 'cleanup' && !intent.asksForImports) {
    adjustedScore -= importQualityPenalty;
  }

  if (options.task === 'delivery' && !docsCompetitionAllowed && isDeliveryDemotionPath(hit.file, policies)) {
    adjustedScore -= 11;
  }

  if (options.task === 'delivery' && !docsCompetitionAllowed && isDocsAdjacentCode(hit)) {
    adjustedScore -= 7;
  }

  if (quality.tag === 'docs-noise' && intent.asksForReleaseNotes) {
    const relief = policies.queryBoosts.releaseDocsPenaltyRelief || 0;
    adjustedScore = adjustedScore * (1 + relief);
  }
  if (quality.tag === 'docs-noise' && intent.asksForReleaseNotes) {
    adjustedScore += policies.queryBoosts.releaseDocsBoost || 0;
  }

  return {
    ...hit,
    score: adjustedScore,
    qualityTag: quality.tag,
    qualityScore: quality.score,
    reason: [
      ...hit.reason,
      quality.reason,
      ...(options.task === 'delivery' && !docsCompetitionAllowed && isDeliveryDemotionPath(hit.file, policies)
        ? ['delivery path demotion']
        : []),
      ...(options.task === 'delivery' && !docsCompetitionAllowed && isDocsAdjacentCode(hit)
        ? ['delivery docs-adjacent dampening']
        : []),
    ],
  };
}

function hitAllowedByView(hit: SearchHit, view: ViewMode): boolean {
  const tag = hit.qualityTag || 'core';
  const slop = new Set<QualityTag>(['generated', 'compiled', 'docs-noise', 'ai-slop', 'duplicate']);

  if (view === 'all' || view === 'mixed') {
    return true;
  }
  if (view === 'slop-only') {
    return slop.has(tag);
  }
  return !slop.has(tag);
}

function fingerprintHit(hit: SearchHit): string {
  const normalized = hit.text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[0-9]+/g, '#')
    .trim();
  const symbol = hit.symbolKind || hit.kind;
  return `${symbol}:${normalized}`;
}

function collapseDuplicateClusters(hits: SearchHit[]): SearchHit[] {
  const clusters = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const fp = fingerprintHit(hit);
    const bucket = clusters.get(fp) || [];
    bucket.push(hit);
    clusters.set(fp, bucket);
  }

  const collapsed: SearchHit[] = [];
  for (const bucket of clusters.values()) {
    const sorted = [...bucket].sort((a, b) => b.score - a.score);
    const canonical = { ...sorted[0] };
    const duplicates = sorted.length - 1;
    if (duplicates > 0) {
      canonical.duplicateCount = duplicates;
      canonical.qualityTag = canonical.qualityTag === 'core' ? 'duplicate' : canonical.qualityTag;
      canonical.reason = [...canonical.reason, `collapsed ${duplicates} similar matches`];
    }
    collapsed.push(canonical);
  }

  return collapsed;
}

function attachCanonicalFamilyMetadata(
  hit: SearchHit,
  family: CanonicalFamily | undefined,
  options: SearchOptions
): SearchHit {
  if (!family || family.files.length <= 1) {
    return hit;
  }

  const mirrors = family.files.filter((file) => file !== family.canonicalFile);
  const isCleanupContext = options.task === 'cleanup' || options.view === 'slop-only';

  return {
    ...hit,
    file: isCleanupContext ? hit.file : family.canonicalFile,
    familyId: family.id,
    canonicalFile: family.canonicalFile,
    mirrorFiles: mirrors,
    mirrorCount: mirrors.length,
    reason: [...hit.reason, `canonical family (${mirrors.length} mirrors)`],
  };
}

function collapseFamilyAwareHits(
  hits: SearchHit[],
  byFile: Map<string, CanonicalFamily>,
  options: SearchOptions
): SearchHit[] {
  const clusters = new Map<string, SearchHit[]>();

  for (const hit of hits) {
    const family = byFile.get(resolve(hit.file));
    const annotated = attachCanonicalFamilyMetadata(hit, family, options);
    const familyKey = family?.id || resolve(hit.file);
    const key = `${familyKey}:${fingerprintHit(annotated)}`;
    const bucket = clusters.get(key) || [];
    bucket.push(annotated);
    clusters.set(key, bucket);
  }

  const collapsed: SearchHit[] = [];
  for (const bucket of clusters.values()) {
    const sorted = [...bucket].sort((a, b) => {
      const aCanonicalBonus = a.canonicalFile && a.file === a.canonicalFile ? 8 : 0;
      const bCanonicalBonus = b.canonicalFile && b.file === b.canonicalFile ? 8 : 0;
      return (b.score + bCanonicalBonus) - (a.score + aCanonicalBonus);
    });

    const winner = { ...sorted[0] };
    const duplicates = sorted.length - 1;
    if (duplicates > 0) {
      winner.duplicateCount = (winner.duplicateCount || 0) + duplicates;
      winner.qualityTag = winner.qualityTag === 'core' ? 'duplicate' : winner.qualityTag;
      winner.reason = [...winner.reason, `collapsed ${duplicates} family-similar matches`];
    }

    collapsed.push(winner);
  }

  return collapsed;
}

function applyFamilyCap(hits: SearchHit[], familyCap: number): SearchHit[] {
  const familyCounts = new Map<string, number>();
  const output: SearchHit[] = [];

  for (const hit of hits) {
    const familyKey = hit.familyId || hit.canonicalFile || resolve(hit.file);
    const group = classifyGroup(hit);
    const scopedFamilyKey = `${familyKey}:${group}`;
    const used = familyCounts.get(scopedFamilyKey) || 0;
    if (used >= familyCap) {
      continue;
    }
    familyCounts.set(scopedFamilyKey, used + 1);
    output.push(hit);
  }

  return output;
}

function sortFinalAssemblyHits(hits: SearchHit[], policies: SearchPolicies): SearchHit[] {
  const epsilon = 0.35;
  return [...hits].sort((a, b) => {
    const baseDiff = b.score - a.score;
    if (Math.abs(baseDiff) > epsilon) {
      return baseDiff;
    }

    const aGroup = classifyGroup(a);
    const bGroup = classifyGroup(b);
    const aWeight = policies.familyGroupWeights[aGroup] ?? 1;
    const bWeight = policies.familyGroupWeights[bGroup] ?? 1;
    const weightedDiff = (b.score * bWeight) - (a.score * aWeight);
    if (weightedDiff !== 0) {
      return weightedDiff;
    }

    return a.file.localeCompare(b.file) || a.line - b.line;
  });
}

function fromSymbolHit(hit: SymbolSearchHit): SearchHit {
  const isCallerHit = hit.reason.some((reason) => reason.includes('call edge'));
  return {
    file: hit.file,
    line: hit.line,
    text: hit.context,
    score: hit.score + 12,
    reason: [...hit.reason, 'symbol-index boost'],
    kind: hit.kind === 'import' || hit.kind === 'call' || isCallerHit ? 'usage' : 'definition',
    symbolKind: hit.kind,
  };
}

async function smartSearch(plan: QueryPlan, options: SearchOptions): Promise<SearchHit[]> {
  const policies = await loadSearchPolicies(options.rootDir);
  const enrichedPlan = applyFeaturePoliciesToPlan(plan, policies);
  const intent = detectQueryIntent(enrichedPlan);
  const familyCap = options.familyCap && options.familyCap > 0 ? options.familyCap : policies.familyCap;
  const termBudget = options.task === 'delivery' ? 8 : 10;
  const retrievalConcurrency = options.task === 'delivery' ? 3 : 4;
  const candidateTerms = enrichedPlan.terms
    .filter((term) => term.length >= 3)
    .filter((term) => !STOP_WORDS.has(term.toLowerCase()))
    .slice(0, termBudget);

  const retrievalBatches = await mapWithConcurrency(
    candidateTerms,
    retrievalConcurrency,
    (term) => runRipgrep(term, plan.roots, options)
  );

  const retrieved = retrievalBatches.flat();
  const rescored = retrieved.map((hit) => scoreHit(hit, enrichedPlan, policies, intent));
  const symbolQuery = options.targetSymbol?.trim() || enrichedPlan.normalized;
  const symbolHits = searchSymbolIndex(symbolQuery, {
    rootDir: options.rootDir,
    kind: options.kind,
    limit: options.limit * 3,
  }).map(fromSymbolHit);

  const lexicalPool = options.kind === 'any' ? rescored : [];

  const deduped = dedupeHits([...lexicalPool, ...symbolHits])
    .map((hit) => applyQualityModel(hit, options, policies, intent, policies.importQualityPenalty))
    .map((hit) => attachTaxonomy(hit))
    .filter((hit) => hitAllowedByView(hit, options.view))
    .filter((hit) => passesTaxonomyFilters(hit, options))
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);

  const familyData = await buildCanonicalFamilies(
    deduped.map((hit) => hit.file),
    { rootDir: options.rootDir, policies }
  );

  const collapsed = collapseFamilyAwareHits(collapseDuplicateClusters(deduped), familyData.byFile, options)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.line - b.line);

  const familyCapped = applyFamilyCap(collapsed, familyCap);
  const assembled = sortFinalAssemblyHits(familyCapped, policies);

  if (options.groupLimit && options.groupLimit > 0) {
    return applyGroupDiversity(assembled, options.limit, options.groupLimit);
  }

  return assembled.slice(0, options.limit);
}

function parseArgs(argv: string[]): { query: string; options: SearchOptions } | null {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return null;
  }

  const options: SearchOptions = {
    rootDir: '.',
    limit: 20,
    caseSensitive: false,
    json: false,
    kind: 'any',
    view: 'clean',
    task: 'default',
    showMirrors: false,
  };

  let query: string | null = null;
  let strictRequested = false;
  let scopeExplicitlySet = false;
  let familyCapExplicitlySet = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith('-') && query === null) {
      query = arg.trim();
      continue;
    }

    if (arg === '--path') {
      options.rootDir = argv[i + 1] || options.rootDir;
      i += 1;
      continue;
    }

    if (arg === '--limit') {
      const parsed = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      i += 1;
      continue;
    }

    if (arg === '--case-sensitive') {
      options.caseSensitive = true;
      continue;
    }

    if (arg === '--strict') {
      strictRequested = true;
      options.view = 'clean';
      options.task = 'delivery';
      options.groupLimit = 3;
      if (!familyCapExplicitlySet) {
        options.familyCap = 2;
      }
      continue;
    }

    if (arg === '--show-mirrors') {
      options.showMirrors = true;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--kind') {
      const value = (argv[i + 1] || 'any').toLowerCase();
      const allowed: SymbolSearchKind[] = [
        'any',
        'function',
        'class',
        'interface',
        'type',
        'enum',
        'variable',
        'import',
        'export',
        'call',
        'callers',
        'callees',
      ];
      options.kind = allowed.includes(value as SymbolSearchKind) ? (value as SymbolSearchKind) : 'any';
      i += 1;
      continue;
    }

    if (arg === '--view') {
      const value = (argv[i + 1] || 'clean').toLowerCase();
      const allowed: ViewMode[] = ['clean', 'mixed', 'slop-only', 'all'];
      options.view = allowed.includes(value as ViewMode) ? (value as ViewMode) : 'clean';
      i += 1;
      continue;
    }

    if (arg === '--task') {
      const value = (argv[i + 1] || 'default').toLowerCase();
      const allowed: TaskMode[] = ['default', 'delivery', 'cleanup'];
      options.task = allowed.includes(value as TaskMode) ? (value as TaskMode) : 'default';
      i += 1;
      continue;
    }

    if (arg === '--scope' || arg === '-S') {
      options.scopeFilter = parseEnumList(argv[i + 1], ['code', 'docs', 'tests', 'generated']);
      scopeExplicitlySet = true;
      i += 1;
      continue;
    }

    if (arg === '--artifact' || arg === '-A') {
      options.artifactFilter = parseEnumList(argv[i + 1], ['api', 'constant', 'global', 'type', 'example', 'cli']);
      i += 1;
      continue;
    }

    if (arg === '--runtime' || arg === '-R') {
      options.runtimeFilter = parseEnumList(argv[i + 1], ['bun', 'ts', 'js']);
      i += 1;
      continue;
    }

    if (arg === '--of') {
      options.targetSymbol = argv[i + 1] || '';
      i += 1;
      continue;
    }

    if (arg === '--group-limit') {
      const parsed = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.groupLimit = parsed;
      }
      i += 1;
      continue;
    }

    if (arg === '--family-cap') {
      const parsed = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.familyCap = parsed;
        familyCapExplicitlySet = true;
      }
      i += 1;
      continue;
    }
  }

  if (!query) {
    printUsage();
    return null;
  }

  if (options.task === 'delivery' && !scopeExplicitlySet && !queryLooksDocsIntent(query)) {
    options.scopeFilter = ['code'];
  }

  if (strictRequested && !scopeExplicitlySet) {
    options.scopeFilter = ['code'];
  }

  return { query, options };
}

function isTestPath(path: string): boolean {
  return /(^|\/)(test|tests)\//i.test(path) || /\.(test|spec)\.[a-z]+$/i.test(path);
}

function queryLooksDocsIntent(query: string): boolean {
  return /\b(docs?|documentation|wiki|readme|guide|template|validator|release|changelog|latest)\b/i.test(query);
}

function parseEnumList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[]
): T[] | undefined {
  if (!raw) {
    return undefined;
  }
  const set = new Set(allowed);
  const values = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value): value is T => set.has(value as T));
  return values.length > 0 ? Array.from(new Set(values)) : undefined;
}

function classifyScopeTag(hit: SearchHit): ScopeTag {
  const file = hit.file.toLowerCase();
  if (isCoreSearchInfraPath(file)) {
    return 'code';
  }
  if (isTestPath(file)) {
    return 'tests';
  }
  if (file.endsWith('.d.ts') || file.includes('/dist/') || file.includes('/build/')) {
    return 'generated';
  }
  if (file.includes('/docs/') || file.endsWith('.md')) {
    return 'docs';
  }
  return 'code';
}

function classifyRuntimeTag(hit: SearchHit): RuntimeTag {
  const file = hit.file.toLowerCase();
  const line = hit.text.toLowerCase();
  if (line.includes('bun.') || file.includes('/bun-') || file.includes('/bun/')) {
    return 'bun';
  }
  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.d.ts')) {
    return 'ts';
  }
  return 'js';
}

function classifyArtifactTag(hit: SearchHit): ArtifactTag {
  const file = hit.file.toLowerCase();
  const line = hit.text.toLowerCase();

  if (file.includes('/api/') || /\b(fetch|request|response|endpoint|router|route|serve)\b/.test(line)) {
    return 'api';
  }
  if (/\b(const|enum|readonly|constant)\b/.test(line) || file.includes('constant')) {
    return 'constant';
  }
  if (/\b(global|window|process\.env|bun\.env|globalthis)\b/.test(line)) {
    return 'global';
  }
  if (/\b(interface|type|declare)\b/.test(line) || file.endsWith('.d.ts')) {
    return 'type';
  }
  if (file.includes('/example') || file.includes('/examples/') || /\bexample\b/.test(line)) {
    return 'example';
  }
  if (file.includes('/cli/') || /\bcommand|argv|option\b/.test(line)) {
    return 'cli';
  }
  return 'api';
}

function attachTaxonomy(hit: SearchHit): SearchHit {
  return {
    ...hit,
    scopeTag: classifyScopeTag(hit),
    runtimeTag: classifyRuntimeTag(hit),
    artifactTag: classifyArtifactTag(hit),
  };
}

function passesTaxonomyFilters(hit: SearchHit, options: SearchOptions): boolean {
  if (options.scopeFilter && options.scopeFilter.length > 0) {
    if (!hit.scopeTag || !options.scopeFilter.includes(hit.scopeTag)) {
      return false;
    }
  }
  if (options.artifactFilter && options.artifactFilter.length > 0) {
    if (!hit.artifactTag || !options.artifactFilter.includes(hit.artifactTag)) {
      return false;
    }
  }
  if (options.runtimeFilter && options.runtimeFilter.length > 0) {
    if (!hit.runtimeTag || !options.runtimeFilter.includes(hit.runtimeTag)) {
      return false;
    }
  }
  return true;
}

function classifyGroup(hit: SearchHit): 'Definitions' | 'Callers' | 'Imports' | 'Tests' | 'Other' {
  if (isTestPath(hit.file)) {
    return 'Tests';
  }

  if (hit.symbolKind === 'import' || /^\s*import\s/.test(hit.text)) {
    return 'Imports';
  }

  if (
    hit.symbolKind === 'call' ||
    hit.reason.some((reason) => reason.includes('call edge')) ||
    hit.reason.some((reason) => reason.includes('graph proximity'))
  ) {
    return 'Callers';
  }

  if (hit.kind === 'definition') {
    return 'Definitions';
  }

  return 'Other';
}

function applyGroupDiversity(
  hits: SearchHit[],
  limit: number,
  groupLimit: number
): SearchHit[] {
  const buckets: Record<'Definitions' | 'Callers' | 'Imports' | 'Tests' | 'Other', SearchHit[]> = {
    Definitions: [],
    Callers: [],
    Imports: [],
    Tests: [],
    Other: [],
  };
  for (const hit of hits) {
    buckets[classifyGroup(hit)].push(hit);
  }

  const groups: Array<keyof typeof buckets> = ['Definitions', 'Callers', 'Imports', 'Tests', 'Other'];
  const cursors = new Map<keyof typeof buckets, number>(groups.map((group) => [group, 0]));
  const taken = new Map<keyof typeof buckets, number>(groups.map((group) => [group, 0]));
  const output: SearchHit[] = [];

  while (output.length < limit) {
    let advanced = false;

    for (const group of groups) {
      if (output.length >= limit) {
        break;
      }

      const alreadyTaken = taken.get(group) || 0;
      if (alreadyTaken >= groupLimit) {
        continue;
      }

      const index = cursors.get(group) || 0;
      const bucket = buckets[group];
      if (index >= bucket.length) {
        continue;
      }

      output.push(bucket[index]);
      cursors.set(group, index + 1);
      taken.set(group, alreadyTaken + 1);
      advanced = true;
    }

    if (!advanced) {
      break;
    }
  }

  return output;
}

function printGroupedSection(title: string, hits: SearchHit[], options: SearchOptions): void {
  if (hits.length === 0) {
    return;
  }

  console.log(`${title}:`);
  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i];
    const relPath = hit.file.replace(/^\.\//, '');
    const snippet = hit.text.length > 180 ? `${hit.text.slice(0, 177)}...` : hit.text;
    const quality = hit.qualityTag ? ` quality=${hit.qualityTag}:${(hit.qualityScore || 0).toFixed(2)}` : '';
    const taxonomy =
      hit.scopeTag || hit.artifactTag || hit.runtimeTag
        ? ` taxonomy=${hit.scopeTag || '?'}:${hit.artifactTag || '?'}:${hit.runtimeTag || '?'}`
        : '';
    const dup = hit.duplicateCount ? ` +${hit.duplicateCount} similar` : '';
    const mirrors = options.showMirrors && hit.mirrorCount ? ` +${hit.mirrorCount} mirrors` : '';
    const canonical = hit.canonicalFile && hit.canonicalFile !== hit.file
      ? ` canonical=${hit.canonicalFile}`
      : '';
    console.log(`${i + 1}. ${relPath}:${hit.line} score=${hit.score.toFixed(1)}${quality}${taxonomy}${dup}${mirrors}${canonical}`);
    console.log(`   ${snippet}`);
    if (options.showMirrors && hit.file === hit.canonicalFile && hit.mirrorFiles && hit.mirrorFiles.length > 0) {
      const topMirrors = hit.mirrorFiles.slice(0, 3).map((path) => path.replace(/^\.\//, ''));
      const extra = hit.mirrorFiles.length - topMirrors.length;
      console.log(`   mirrors: ${topMirrors.join(', ')}${extra > 0 ? ` (+${extra} more)` : ''}`);
    }
  }
  console.log('');
}

function printTable(plan: QueryPlan, hits: SearchHit[], elapsedMs: number, options: SearchOptions): void {
  console.log(`Smart Search: "${plan.raw}"`);
  console.log(`Roots: ${plan.roots.join(', ')}`);
  console.log(`View/Task: ${options.view}/${options.task}`);
  if (options.kind !== 'any') {
    const target = options.targetSymbol?.trim();
    console.log(`Mode: kind=${options.kind}${target ? ` of=${target}` : ''}`);
  }
  if (options.groupLimit && options.groupLimit > 0) {
    console.log(`Group limit: ${options.groupLimit}`);
  }
  if (options.familyCap && options.familyCap > 0) {
    console.log(`Family cap: ${options.familyCap}`);
  }
  if (options.showMirrors) {
    console.log('Show mirrors: enabled');
  }
  if (options.scopeFilter || options.artifactFilter || options.runtimeFilter) {
    const scope = options.scopeFilter?.join(',') || '*';
    const artifact = options.artifactFilter?.join(',') || '*';
    const runtime = options.runtimeFilter?.join(',') || '*';
    console.log(`Filters: scope=${scope} artifact=${artifact} runtime=${runtime}`);
  }
  if (plan.aliasHints.length > 0) {
    console.log(`Aliases: ${plan.aliasHints.join(', ')}`);
  }
  console.log(`Expanded terms: ${plan.terms.slice(0, 10).join(', ')}${plan.terms.length > 10 ? '...' : ''}`);
  console.log('');

  if (hits.length === 0) {
    console.log('No matches found.');
    console.log(`Completed in ${elapsedMs.toFixed(2)}ms`);
    return;
  }

  const groups: Record<'Definitions' | 'Callers' | 'Imports' | 'Tests' | 'Other', SearchHit[]> = {
    Definitions: [],
    Callers: [],
    Imports: [],
    Tests: [],
    Other: [],
  };

  for (const hit of hits) {
    groups[classifyGroup(hit)].push(hit);
  }

  printGroupedSection('Definitions', groups.Definitions, options);
  printGroupedSection('Callers', groups.Callers, options);
  printGroupedSection('Imports', groups.Imports, options);
  printGroupedSection('Tests', groups.Tests, options);
  printGroupedSection('Other', groups.Other, options);

  console.log(`\nCompleted in ${elapsedMs.toFixed(2)}ms`);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) {
    return;
  }

  const { query, options } = parsed;
  const basePlan = buildQueryPlan(query, options.rootDir);
  const policies = await loadSearchPolicies(options.rootDir);
  const plan = applyFeaturePoliciesToPlan(basePlan, policies);

  const start = performance.now();
  const hits = await smartSearch(plan, options);
  const elapsedMs = performance.now() - start;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          query: plan.raw,
          normalizedQuery: plan.normalized,
          roots: plan.roots,
          expandedTerms: plan.terms,
          mode: {
            kind: options.kind,
            of: options.targetSymbol || null,
            groupLimit: options.groupLimit || null,
            familyCap: options.familyCap || null,
            view: options.view,
            task: options.task,
            showMirrors: options.showMirrors,
            scope: options.scopeFilter || null,
            artifact: options.artifactFilter || null,
            runtime: options.runtimeFilter || null,
          },
          elapsedMs: Number(elapsedMs.toFixed(2)),
          hits,
        },
        null,
        2
      )
    );
    return;
  }

  printTable(plan, hits, elapsedMs, options);
}

await main();

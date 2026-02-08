import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export interface AuthorityRule {
  contains: string;
  weight: number;
}

export interface BunFeaturePolicy {
  aliases?: string[];
  terms?: string[];
  runtimeHint?: 'bun' | 'ts' | 'js';
  artifactHint?: 'api' | 'constant' | 'global' | 'type' | 'example' | 'cli';
  pathBoostContains?: string[];
  lineBoostContains?: string[];
}

export interface QueryBoostPolicy {
  bunRuntimeBoost?: number;
  apiArtifactBoost?: number;
  runtimeMismatchPenalty?: number;
  nonReleaseDocsPenalty?: number;
  releaseDocsBoost?: number;
  releaseDocsPenaltyRelief?: number;
}

export interface FamilyGroupWeights {
  Definitions?: number;
  Callers?: number;
  Imports?: number;
  Tests?: number;
  Other?: number;
}

export interface ScoreThresholdsPolicy {
  qualityDropWarn?: number;
  slopRiseWarn?: number;
  reliabilityDropWarn?: number;
}

export interface SearchPolicies {
  pathExcludeContains: string[];
  authorityRules: AuthorityRule[];
  mirrorPenaltyContains: string[];
  canonicalPreferContains: string[];
  deliveryDemotionContains: string[];
  familyCap: number;
  importDampeningPenalty: number;
  importQualityPenalty: number;
  bunFeatureMap: Record<string, BunFeaturePolicy>;
  queryBoosts: QueryBoostPolicy;
  familyGroupWeights: Required<FamilyGroupWeights>;
  deliveryDemotionExceptions: string[];
  scoreThresholds: Required<ScoreThresholdsPolicy>;
}

export interface CanonicalFamily {
  id: string;
  hash: string;
  astSignature: string;
  files: string[];
  canonicalFile: string;
  mirrors: string[];
}

export interface CanonicalFamilyBuildResult {
  policies: SearchPolicies;
  families: CanonicalFamily[];
  byFile: Map<string, CanonicalFamily>;
}

const DEFAULT_POLICIES: SearchPolicies = {
  pathExcludeContains: ['/node_modules/', '/dist/', '/build/', '/.git/'],
  authorityRules: [
    { contains: '/src/', weight: 18 },
    { contains: '/lib/', weight: 16 },
    { contains: '/packages/', weight: 12 },
    { contains: '/tests/', weight: 6 },
    { contains: '/test/', weight: 6 },
    { contains: '/workspaces/', weight: -6 },
    { contains: '/enterprise/', weight: -4 },
    { contains: '/docs/', weight: -8 },
    { contains: '.d.ts', weight: -12 },
  ],
  mirrorPenaltyContains: ['/workspaces/', '/dashboard/dashboard-worker/', '/enterprise/packages/dashboard-worker/'],
  canonicalPreferContains: ['/src/', '/lib/', '/packages/'],
  deliveryDemotionContains: [
    '/lib/docs/generator',
    '/lib/docs/template',
    '/lib/docs/validator',
    '/lib/docs/builders/url-builder',
    '/lib/docs/documentation-validator',
    '/lib/docs/template-scanner',
  ],
  familyCap: 3,
  importDampeningPenalty: 8,
  importQualityPenalty: 4,
  bunFeatureMap: {},
  queryBoosts: {
    bunRuntimeBoost: 18,
    apiArtifactBoost: 8,
    runtimeMismatchPenalty: 6,
    nonReleaseDocsPenalty: 4,
    releaseDocsBoost: 8,
    releaseDocsPenaltyRelief: 0.45,
  },
  familyGroupWeights: {
    Definitions: 1.0,
    Callers: 0.95,
    Imports: 0.7,
    Tests: 0.8,
    Other: 0.75,
  },
  deliveryDemotionExceptions: [
    '/lib/docs/canonical-family.ts',
    '/lib/docs/smart-symbol-index.ts',
    '/lib/docs/ripgrep-spawn.ts',
    '/lib/docs/stream-search.ts',
    '/lib/docs/enhanced-stream-search.ts',
  ],
  scoreThresholds: {
    qualityDropWarn: -1.5,
    slopRiseWarn: 2.0,
    reliabilityDropWarn: -2.0,
  },
};

function mergePolicies(raw: Partial<SearchPolicies> | null | undefined): SearchPolicies {
  if (!raw) {
    return { ...DEFAULT_POLICIES };
  }

  return {
    pathExcludeContains: raw.pathExcludeContains?.length ? raw.pathExcludeContains : DEFAULT_POLICIES.pathExcludeContains,
    authorityRules: raw.authorityRules?.length ? raw.authorityRules : DEFAULT_POLICIES.authorityRules,
    mirrorPenaltyContains: raw.mirrorPenaltyContains?.length ? raw.mirrorPenaltyContains : DEFAULT_POLICIES.mirrorPenaltyContains,
    canonicalPreferContains: raw.canonicalPreferContains?.length ? raw.canonicalPreferContains : DEFAULT_POLICIES.canonicalPreferContains,
    deliveryDemotionContains: raw.deliveryDemotionContains?.length ? raw.deliveryDemotionContains : DEFAULT_POLICIES.deliveryDemotionContains,
    familyCap: typeof raw.familyCap === 'number' && raw.familyCap > 0 ? raw.familyCap : DEFAULT_POLICIES.familyCap,
    importDampeningPenalty: typeof raw.importDampeningPenalty === 'number'
      ? raw.importDampeningPenalty
      : DEFAULT_POLICIES.importDampeningPenalty,
    importQualityPenalty: typeof raw.importQualityPenalty === 'number'
      ? raw.importQualityPenalty
      : DEFAULT_POLICIES.importQualityPenalty,
    bunFeatureMap: raw.bunFeatureMap || DEFAULT_POLICIES.bunFeatureMap,
    queryBoosts: {
      bunRuntimeBoost: typeof raw.queryBoosts?.bunRuntimeBoost === 'number'
        ? raw.queryBoosts.bunRuntimeBoost
        : DEFAULT_POLICIES.queryBoosts.bunRuntimeBoost,
      apiArtifactBoost: typeof raw.queryBoosts?.apiArtifactBoost === 'number'
        ? raw.queryBoosts.apiArtifactBoost
        : DEFAULT_POLICIES.queryBoosts.apiArtifactBoost,
      runtimeMismatchPenalty: typeof raw.queryBoosts?.runtimeMismatchPenalty === 'number'
        ? raw.queryBoosts.runtimeMismatchPenalty
        : DEFAULT_POLICIES.queryBoosts.runtimeMismatchPenalty,
      nonReleaseDocsPenalty: typeof raw.queryBoosts?.nonReleaseDocsPenalty === 'number'
        ? raw.queryBoosts.nonReleaseDocsPenalty
        : DEFAULT_POLICIES.queryBoosts.nonReleaseDocsPenalty,
      releaseDocsBoost: typeof raw.queryBoosts?.releaseDocsBoost === 'number'
        ? raw.queryBoosts.releaseDocsBoost
        : DEFAULT_POLICIES.queryBoosts.releaseDocsBoost,
      releaseDocsPenaltyRelief: typeof raw.queryBoosts?.releaseDocsPenaltyRelief === 'number'
        ? raw.queryBoosts.releaseDocsPenaltyRelief
        : DEFAULT_POLICIES.queryBoosts.releaseDocsPenaltyRelief,
    },
    familyGroupWeights: {
      Definitions: typeof raw.familyGroupWeights?.Definitions === 'number'
        ? raw.familyGroupWeights.Definitions
        : DEFAULT_POLICIES.familyGroupWeights.Definitions,
      Callers: typeof raw.familyGroupWeights?.Callers === 'number'
        ? raw.familyGroupWeights.Callers
        : DEFAULT_POLICIES.familyGroupWeights.Callers,
      Imports: typeof raw.familyGroupWeights?.Imports === 'number'
        ? raw.familyGroupWeights.Imports
        : DEFAULT_POLICIES.familyGroupWeights.Imports,
      Tests: typeof raw.familyGroupWeights?.Tests === 'number'
        ? raw.familyGroupWeights.Tests
        : DEFAULT_POLICIES.familyGroupWeights.Tests,
      Other: typeof raw.familyGroupWeights?.Other === 'number'
        ? raw.familyGroupWeights.Other
        : DEFAULT_POLICIES.familyGroupWeights.Other,
    },
    deliveryDemotionExceptions: raw.deliveryDemotionExceptions?.length
      ? raw.deliveryDemotionExceptions
      : DEFAULT_POLICIES.deliveryDemotionExceptions,
    scoreThresholds: {
      qualityDropWarn: typeof raw.scoreThresholds?.qualityDropWarn === 'number'
        ? raw.scoreThresholds.qualityDropWarn
        : DEFAULT_POLICIES.scoreThresholds.qualityDropWarn,
      slopRiseWarn: typeof raw.scoreThresholds?.slopRiseWarn === 'number'
        ? raw.scoreThresholds.slopRiseWarn
        : DEFAULT_POLICIES.scoreThresholds.slopRiseWarn,
      reliabilityDropWarn: typeof raw.scoreThresholds?.reliabilityDropWarn === 'number'
        ? raw.scoreThresholds.reliabilityDropWarn
        : DEFAULT_POLICIES.scoreThresholds.reliabilityDropWarn,
    },
  };
}

export async function loadSearchPolicies(rootDir: string = '.'): Promise<SearchPolicies> {
  const candidates = [
    resolve(rootDir, '.search/policies.json'),
    resolve('.search/policies.json'),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) {
      continue;
    }
    try {
      const content = await Bun.file(path).text();
      const parsed = JSON.parse(content) as Partial<SearchPolicies>;
      return mergePolicies(parsed);
    } catch {
      // keep trying other candidates
    }
  }

  return { ...DEFAULT_POLICIES };
}

export function computePathAuthorityScore(path: string, policies: SearchPolicies): number {
  const lower = path.toLowerCase();
  let score = 0;

  for (const rule of policies.authorityRules) {
    if (lower.includes(rule.contains.toLowerCase())) {
      score += rule.weight;
    }
  }

  for (const prefer of policies.canonicalPreferContains) {
    if (lower.includes(prefer.toLowerCase())) {
      score += 3;
      break;
    }
  }

  for (const mirror of policies.mirrorPenaltyContains) {
    if (lower.includes(mirror.toLowerCase())) {
      score -= 4;
    }
  }

  score -= Math.floor(path.length / 120);
  return score;
}

function isExcludedByPolicy(path: string, policies: SearchPolicies): boolean {
  const lower = path.toLowerCase();
  return policies.pathExcludeContains.some((needle) => lower.includes(needle.toLowerCase()));
}

function contentHash(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function scriptKindForFile(filePath: string): ts.ScriptKind {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (lower.endsWith('.ts') || lower.endsWith('.d.ts')) return ts.ScriptKind.TS;
  if (lower.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.Unknown;
}

function astSignature(code: string, filePath: string): string {
  const source = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, scriptKindForFile(filePath));
  const topLevel: string[] = [];

  for (const stmt of source.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      topLevel.push(`fn:${stmt.name.text}`);
      continue;
    }
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      topLevel.push(`class:${stmt.name.text}`);
      continue;
    }
    if (ts.isInterfaceDeclaration(stmt)) {
      topLevel.push(`iface:${stmt.name.text}`);
      continue;
    }
    if (ts.isTypeAliasDeclaration(stmt)) {
      topLevel.push(`type:${stmt.name.text}`);
      continue;
    }
    if (ts.isEnumDeclaration(stmt)) {
      topLevel.push(`enum:${stmt.name.text}`);
      continue;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          topLevel.push(`var:${decl.name.text}`);
        }
      }
      continue;
    }
    if (ts.isImportDeclaration(stmt)) {
      const spec = stmt.moduleSpecifier.getText(source).replace(/['"]/g, '');
      topLevel.push(`import:${spec}`);
      continue;
    }
  }

  const compact = topLevel.sort().join('|');
  return createHash('sha1').update(compact).digest('hex');
}

function pickCanonical(files: string[], policies: SearchPolicies): string {
  const ranked = [...files].sort((a, b) => {
    const scoreDiff = computePathAuthorityScore(b, policies) - computePathAuthorityScore(a, policies);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.length - b.length;
  });
  return ranked[0];
}

export async function buildCanonicalFamilies(
  files: string[],
  options: {
    rootDir?: string;
    policies?: SearchPolicies;
  } = {}
): Promise<CanonicalFamilyBuildResult> {
  const rootDir = options.rootDir || '.';
  const policies = options.policies || (await loadSearchPolicies(rootDir));

  const uniqueFiles = Array.from(new Set(files.map((file) => resolve(file))));
  const keyed = new Map<string, string[]>();

  for (const filePath of uniqueFiles) {
    if (isExcludedByPolicy(filePath, policies)) {
      continue;
    }

    let text: string;
    try {
      text = await Bun.file(filePath).text();
    } catch {
      continue;
    }

    const key = `${contentHash(text)}:${astSignature(text, filePath)}`;
    const bucket = keyed.get(key) || [];
    bucket.push(filePath);
    keyed.set(key, bucket);
  }

  const families: CanonicalFamily[] = [];
  const byFile = new Map<string, CanonicalFamily>();

  for (const [key, familyFiles] of keyed.entries()) {
    if (familyFiles.length === 0) {
      continue;
    }

    const canonicalFile = pickCanonical(familyFiles, policies);
    const mirrors = familyFiles.filter((file) => file !== canonicalFile).sort();

    const [hash, sig] = key.split(':');
    const family: CanonicalFamily = {
      id: key,
      hash,
      astSignature: sig || '',
      files: familyFiles.sort(),
      canonicalFile,
      mirrors,
    };

    families.push(family);
    for (const file of familyFiles) {
      byFile.set(file, family);
    }
  }

  return {
    policies,
    families,
    byFile,
  };
}

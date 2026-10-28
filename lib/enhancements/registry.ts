// @see https://bun.com/blog/bun-v1.3.6#bun-jsonc-api-for-parsing-json-with-comments — Bun.JSONC.parse
// @released Bun.JSONC.parse · released v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
import type {
  EnhancementItem,
  EnhancementKind,
  EnhancementRegistry,
  EnhancementStatus,
} from './types.ts';

export const ENHANCEMENT_REGISTRY_PATH = 'config/enhancements/registry.jsonc' as const;

const STATUSES = new Set<EnhancementStatus>([
  'proposed',
  'experimental',
  'beta',
  'stable',
  'deprecated',
  'removed',
]);
const KINDS = new Set<EnhancementKind>([
  'guarded-feature',
  'runtime-capability',
  'cli-capability',
  'compatibility-lane',
]);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FLAG = /^[A-Z][A-Z0-9_]+$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be text`);
  return value;
}

function parseNullableText(value: unknown, label: string): string | null {
  return value === null ? null : parseText(value, label);
}

function parseItem(input: unknown, index: number): EnhancementItem {
  const row = parseObject(input, `items[${index}]`);
  const id = parseText(row.id, `items[${index}].id`);
  const kind = parseText(row.kind, `items[${index}].kind`) as EnhancementKind;
  const status = parseText(row.status, `items[${index}].status`) as EnhancementStatus;
  const featureFlag = parseNullableText(row.featureFlag, `items[${index}].featureFlag`);
  const minimumBunVersion = parseText(row.minimumBunVersion, `items[${index}].minimumBunVersion`);
  const bunVersionRange = parseNullableText(row.bunVersionRange, `items[${index}].bunVersionRange`);
  if (!ID.test(id)) throw new TypeError(`invalid enhancement id: ${id}`);
  if (!KINDS.has(kind)) throw new TypeError(`invalid kind for ${id}: ${kind}`);
  if (!STATUSES.has(status)) throw new TypeError(`invalid status for ${id}: ${status}`);
  if (!VERSION.test(minimumBunVersion))
    throw new TypeError(`invalid minimum Bun version for ${id}`);
  if (featureFlag && !FLAG.test(featureFlag)) throw new TypeError(`invalid feature flag for ${id}`);
  if (kind !== 'guarded-feature' && featureFlag !== null)
    throw new TypeError(`${id}: only guarded features can have a flag`);
  if (status === 'stable' && featureFlag !== null)
    throw new TypeError(`${id}: stable items cannot have a flag`);
  if (
    kind === 'guarded-feature' &&
    status !== 'stable' &&
    status !== 'removed' &&
    featureFlag === null
  ) {
    throw new TypeError(`${id}: ${status} items require a flag`);
  }
  if (bunVersionRange) {
    try {
      Bun.semver.satisfies(minimumBunVersion, bunVersionRange);
    } catch {
      throw new TypeError(`${id}: invalid Bun version range`);
    }
  }
  if (!Array.isArray(row.evidence) || row.evidence.length === 0) {
    throw new TypeError(`${id}: evidence must be a non-empty array`);
  }
  const promotion = row.promotionCriteria;
  const promotionCriteria =
    promotion === null ? null : parseObject(promotion, `${id}.promotionCriteria`);
  const introducedIn = parseNullableText(row.introducedIn, `${id}.introducedIn`);
  if (introducedIn && !VERSION.test(introducedIn)) {
    throw new TypeError(`${id}: invalid introduction version`);
  }
  const docs = parseText(row.docs, `${id}.docs`);
  const intro = parseNullableText(row.intro, `${id}.intro`);
  const release = parseNullableText(row.release, `${id}.release`);
  if (!docs.startsWith('https://bun.com/')) throw new TypeError(`${id}: docs must use bun.com`);
  if (intro && !intro.startsWith('https://bun.com/blog/')) {
    throw new TypeError(`${id}: intro must use the official Bun blog`);
  }
  if (release && !release.startsWith('https://github.com/oven-sh/bun/releases/tag/')) {
    throw new TypeError(`${id}: release must use the official Bun repository`);
  }
  if (promotionCriteria) {
    const minimumDays = promotionCriteria.minimumDays;
    const ratio = promotionCriteria.minimumPerformanceRatio;
    if (!Number.isInteger(minimumDays) || Number(minimumDays) < 0) {
      throw new TypeError(`${id}: minimumDays must be a non-negative integer`);
    }
    if (promotionCriteria.noCriticalErrors !== true) {
      throw new TypeError(`${id}: noCriticalErrors must be true`);
    }
    if (typeof ratio !== 'number' || ratio < 0 || ratio > 1) {
      throw new TypeError(`${id}: minimumPerformanceRatio must be between 0 and 1`);
    }
  }
  const evidence = row.evidence.map((entry, evidenceIndex) =>
    parseText(entry, `${id}.evidence[${evidenceIndex}]`)
  );
  if (evidence.some(entry => entry.startsWith('/') || entry.split('/').includes('..'))) {
    throw new TypeError(`${id}: evidence paths must be repository-relative`);
  }
  return {
    id,
    name: parseText(row.name, `${id}.name`),
    kind,
    status,
    featureFlag,
    minimumBunVersion,
    bunVersionRange,
    introducedIn,
    docs,
    intro,
    release,
    replaces: parseNullableText(row.replaces, `${id}.replaces`),
    target: parseText(row.target, `${id}.target`),
    evidence,
    promotionCriteria:
      promotionCriteria === null
        ? null
        : {
            minimumDays: Number(promotionCriteria.minimumDays),
            noCriticalErrors: true,
            minimumPerformanceRatio: Number(promotionCriteria.minimumPerformanceRatio),
          },
  };
}

export function parseEnhancementRegistry(source: string): EnhancementRegistry {
  const root = parseObject(Bun.JSONC.parse(source), 'registry');
  if (!Array.isArray(root.items)) throw new TypeError('registry.items must be an array');
  const items = root.items.map(parseItem);
  const ids = new Set<string>();
  const flags = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new TypeError(`duplicate enhancement id: ${item.id}`);
    ids.add(item.id);
    if (item.featureFlag && flags.has(item.featureFlag)) {
      throw new TypeError(`duplicate enhancement flag: ${item.featureFlag}`);
    }
    if (item.featureFlag) flags.add(item.featureFlag);
  }
  const version = parseText(root.version, 'registry.version');
  const parsedTime = Date.parse(`${version}T00:00:00Z`);
  if (
    !DATE.test(version) ||
    Number.isNaN(parsedTime) ||
    new Date(parsedTime).toISOString().slice(0, 10) !== version
  ) {
    throw new TypeError('registry.version must be an ISO calendar date');
  }
  return {
    $schema: typeof root.$schema === 'string' ? root.$schema : undefined,
    version,
    items,
  };
}

export async function loadEnhancementRegistry(
  registryPath = ENHANCEMENT_REGISTRY_PATH
): Promise<EnhancementRegistry> {
  return parseEnhancementRegistry(await Bun.file(registryPath).text());
}

import { parseResourceId, type ResourceId } from '../types/branded.ts';
import { discoverPreloadStartupSurfaceIds } from './preload-startup-discovery.ts';
import { readRepoJson } from './preload-startup-scan-files.ts';

export { discoverPreloadStartupSurfaceIds } from './preload-startup-discovery.ts';

export const PRELOAD_STARTUP_CONCEPTS = [
  'test-runner-preload',
  'runtime-module-preload',
  'fetch-preconnect',
  'browser-resource-preload',
] as const;

export type PreloadStartupConcept = (typeof PRELOAD_STARTUP_CONCEPTS)[number];

export type PreloadStartupSurface = {
  readonly id: ResourceId;
  readonly concept: PreloadStartupConcept;
  readonly owner: string;
  readonly decision: 'allow' | 'deny' | 'review-required';
  readonly reason: string;
};

type Manifest = {
  readonly schema: 'factorywager.preload-startup-ownership.v1';
  readonly defaultDecision: 'deny';
  readonly surfaces: readonly PreloadStartupSurface[];
};

function parsePreloadStartupManifest(input: unknown): Manifest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('preload/startup manifest must be an object');
  }
  const record = input as Record<string, unknown>;
  if (
    record.schema !== 'factorywager.preload-startup-ownership.v1' ||
    record.defaultDecision !== 'deny' ||
    !Array.isArray(record.surfaces)
  ) {
    throw new TypeError('preload/startup manifest header is invalid');
  }
  const surfaces = record.surfaces.map((value, index): PreloadStartupSurface => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`preload/startup surface ${index} must be an object`);
    }
    const surface = value as Record<string, unknown>;
    if (
      typeof surface.id !== 'string' ||
      !PRELOAD_STARTUP_CONCEPTS.includes(surface.concept as PreloadStartupConcept) ||
      typeof surface.owner !== 'string' ||
      !['allow', 'deny', 'review-required'].includes(String(surface.decision)) ||
      typeof surface.reason !== 'string'
    ) {
      throw new TypeError(`preload/startup surface ${index} is invalid`);
    }
    return {
      id: parseResourceId(surface.id),
      concept: surface.concept as PreloadStartupConcept,
      owner: surface.owner,
      decision: surface.decision as PreloadStartupSurface['decision'],
      reason: surface.reason,
    };
  });
  return {
    schema: 'factorywager.preload-startup-ownership.v1',
    defaultDecision: 'deny',
    surfaces,
  };
}

export async function readPreloadStartupManifest(root: string): Promise<Manifest> {
  return parsePreloadStartupManifest(
    await readRepoJson(root, 'config/preload-startup-ownership.json')
  );
}

export async function preloadStartupOwnershipIssues(root: string): Promise<readonly string[]> {
  const manifest = await readPreloadStartupManifest(root);
  const issues: string[] = [];
  const discovered = await discoverPreloadStartupSurfaceIds(root);
  const declared = manifest.surfaces.map(surface => surface.id).sort();
  for (const id of discovered) if (!declared.includes(id)) issues.push(`unowned surface: ${id}`);
  for (const id of declared)
    if (!discovered.includes(id)) issues.push(`stale manifest surface: ${id}`);

  const duplicateIds = declared.filter((id, index) => declared.indexOf(id) !== index);
  for (const id of new Set(duplicateIds)) issues.push(`duplicate manifest surface: ${id}`);
  for (const surface of manifest.surfaces) {
    if (!surface.id.startsWith(`${surface.concept}:`))
      issues.push(`concept does not match id: ${surface.id}`);
    if (!surface.owner.trim()) issues.push(`missing owner: ${surface.id}`);
    if (!surface.reason.trim()) issues.push(`missing reason: ${surface.id}`);
    if (surface.id.startsWith('runtime-module-preload:') && surface.decision !== 'deny')
      issues.push(`runtime preload is not denied: ${surface.id}`);
    if (surface.id.endsWith(':missing') && surface.decision !== 'deny')
      issues.push(`missing test preload is not denied: ${surface.id}`);
  }
  return issues;
}

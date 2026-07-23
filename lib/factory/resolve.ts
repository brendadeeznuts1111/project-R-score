// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Resolve registry artifacts for downstream services (play routing, DOD models, …).
 */

import { type ArtifactRelease } from './artifact';
import { type RegistryClient } from './registry';

/** Verified install — returns release metadata + tarball bytes. */
export async function resolveArtifact(
  client: RegistryClient,
  name: string,
  range = 'latest'
): Promise<{ release: ArtifactRelease; data: Uint8Array } | undefined> {
  const hit = await client.install(name, range);
  if (!hit) return undefined;
  return { release: hit.release, data: hit.data };
}

/** Public CDN URL when `REGISTRY_PUBLIC_URL` is set (Pages or VM reverse proxy). */
export function artifactPublicUrl(release: ArtifactRelease): string | undefined {
  const base = Bun.env.REGISTRY_PUBLIC_URL?.replace(/\/$/, '');
  if (!base) return undefined;
  const path = release.storage.r2Key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `${base}/api/registry/${path}`;
}

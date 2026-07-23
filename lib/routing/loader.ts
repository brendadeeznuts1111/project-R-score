/**
 * Load routing algorithms published to the factory registry.
 *
 * Artifacts are verified via {@link RegistryClient.install}. The loader
 * deliberately returns bytes instead of evaluating registry-hosted code:
 * callers must extract the package into a controlled directory and import its
 * declared entry point through their normal trust/sandbox boundary.
 */

import { registry } from '../factory/registry';
import { resolveArtifact } from '../factory/resolve';
import { type ArtifactRelease } from '../factory/artifact';

export type RoutingModule = {
  release: ArtifactRelease;
  data: Uint8Array;
};

/**
 * Resolve `@factorywager/routing-algorithms` (or custom name) from registry.
 */
export async function loadRoutingAlgorithm(
  name = 'routing-algorithms',
  range = 'latest'
): Promise<RoutingModule> {
  const hit = await resolveArtifact(registry, name, range);
  if (!hit) throw new Error(`Routing artifact not found: ${name}@${range}`);

  return { release: hit.release, data: hit.data };
}

import {
  discoverPreloadStartupSurfaceIds,
  preloadStartupOwnershipIssues,
  readPreloadStartupManifest,
} from '../lib/security/preload-startup-ownership.ts';
import { resolvePath } from '../lib/path-bun.ts';

const root = resolvePath(import.meta.dir, '..');
const issues = await preloadStartupOwnershipIssues(root);
const manifest = await readPreloadStartupManifest(root);
const discovered = await discoverPreloadStartupSurfaceIds(root);
const counts = Object.fromEntries(
  [
    'test-runner-preload',
    'runtime-module-preload',
    'fetch-preconnect',
    'browser-resource-preload',
  ].map(concept => [
    concept,
    manifest.surfaces.filter(surface => surface.id.startsWith(`${concept}:`)).length,
  ])
);

if (issues.length) {
  console.error(`Preload/startup ownership: FAIL (${issues.length})`);
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}
console.log(`Preload/startup ownership: OK (${discovered.length} exact surfaces)`);
console.log(JSON.stringify(counts));

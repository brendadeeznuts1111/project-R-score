import { dirnamePath, relativePath, resolvePath } from '../path-bun.ts';
import { asResourceId, type ResourceId } from '../types/branded.ts';
import {
  parseTomlRecord,
  readRepoJson,
  readRepoText,
  repoFileExists,
  scannedPaths,
  stagedProjectPaths,
} from './preload-startup-scan-files.ts';

const SOURCE_GLOBS = [
  'lib/**/*.{ts,tsx,html}',
  'scripts/**/*.{ts,tsx,sh,html}',
  'tools/**/*.{ts,tsx,sh,html}',
  'projects/active/**/*.{ts,tsx,sh,html}',
] as const;

function normalize(root: string, file: string): string {
  return relativePath(root, resolvePath(root, file));
}

function parseStringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : [];
}

async function discoverBunfig(root: string): Promise<ResourceId[]> {
  const ids: ResourceId[] = [];
  for (const file of await scannedPaths(root, '**/bunfig.toml', file =>
    file.endsWith('/bunfig.toml')
  )) {
    if (file.includes('node_modules/')) continue;
    const source = await readRepoText(root, file);
    let parsed: Record<string, unknown>;
    try {
      parsed = parseTomlRecord(source);
    } catch (error) {
      if (/^\s*preload\s*=/m.test(source)) {
        throw new TypeError(`Cannot inventory preload in invalid ${file}: ${String(error)}`);
      }
      continue;
    }
    for (const module of parseStringValues(parsed.preload)) {
      ids.push(asResourceId(`runtime-module-preload:bunfig:${normalize(root, file)}:${module}`));
    }
    const test = parsed.test as Record<string, unknown> | undefined;
    for (const module of parseStringValues(test?.preload)) {
      const target = resolvePath(root, dirnamePath(file), module);
      const state = (await repoFileExists(target)) ? 'present' : 'missing';
      ids.push(
        asResourceId(`test-runner-preload:bunfig:${normalize(root, file)}:${module}:${state}`)
      );
    }
  }
  return ids;
}

async function discoverPackageScripts(root: string): Promise<ResourceId[]> {
  const ids: ResourceId[] = [];
  for (const file of await scannedPaths(root, '**/package.json', file =>
    file.endsWith('/package.json')
  )) {
    if (file.includes('node_modules/')) continue;
    let parsed: { scripts?: Record<string, unknown> };
    try {
      parsed = (await readRepoJson(root, file)) as typeof parsed;
    } catch {
      continue;
    }
    for (const [name, command] of Object.entries(parsed.scripts ?? {})) {
      if (typeof command !== 'string') continue;
      if (/\bbun\s+test\b[^\n]*--(?:preload|require|import)(?:=|\s)/.test(command)) {
        ids.push(
          asResourceId(`test-runner-preload:package-script:${normalize(root, file)}#${name}`)
        );
      }
      if (
        /\b(?:bun|BUN_OPTIONS=)[^\n]*--(?:preload|require|import)(?:=|\s)/.test(command) &&
        !/\bbun\s+test\b/.test(command)
      ) {
        ids.push(
          asResourceId(`runtime-module-preload:package-script:${normalize(root, file)}#${name}`)
        );
      }
      if (/\bbun\b[^\n]*--fetch-preconnect(?:=|\s)/.test(command)) {
        ids.push(asResourceId(`fetch-preconnect:package-script:${normalize(root, file)}#${name}`));
      }
    }
  }
  return ids;
}

async function discoverSourceSurfaces(root: string): Promise<ResourceId[]> {
  const files = new Set<string>();
  for (const glob of SOURCE_GLOBS) {
    for (const file of await scannedPaths(root, glob, () => false)) files.add(file);
  }
  for (const file of await stagedProjectPaths()) {
    if (/^projects\/active\/.*\.(?:ts|tsx|sh|html)$/.test(file) && !/(?:^|\/)\.[^/]+\//.test(file))
      files.add(file);
  }
  const ids: ResourceId[] = [];
  for (const file of [...files].sort()) {
    const source = await readRepoText(root, file);
    if (/rel=["'](?:module)?preload["']/.test(source))
      ids.push(asResourceId(`browser-resource-preload:source:${normalize(root, file)}`));
    if (/args\.push\(["']--preload["']|Bun\.\$`bun test --preload/.test(source))
      ids.push(asResourceId(`test-runner-preload:dynamic-launcher:${normalize(root, file)}`));
    if (
      /bunArgs\.push\(["']--fetch-preconnect["']|^\s*\$BUN_CMD\s+--fetch-preconnect/m.test(source)
    )
      ids.push(asResourceId(`fetch-preconnect:dynamic-launcher:${normalize(root, file)}`));
    if (/^\/\/ preload-startup-measurement-reviewed\b/m.test(source))
      ids.push(asResourceId(`fetch-preconnect:measurement-harness:${normalize(root, file)}`));
  }
  return ids;
}

export async function discoverPreloadStartupSurfaceIds(
  root: string
): Promise<readonly ResourceId[]> {
  return [
    ...(await discoverBunfig(root)),
    ...(await discoverPackageScripts(root)),
    ...(await discoverSourceSurfaces(root)),
  ].sort();
}

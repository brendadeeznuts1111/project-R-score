// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Agent desk registry browser + publish helpers.
 * Phase 0: browse/detail from public/registry/registry.json snapshot;
 * local `bun publish --registry`; prod via factory publish (confirm).
 *
 * @see https://bun.com/docs/pm/cli/publish#custom-registry
 * @see https://bun.com/blog/bun-v1.3.14#bun-publish-now-sends-readme-metadata-to-the-registry
 * @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html (readmeHtml)
 * @see https://bun.com/docs/runtime/file-io — Bun.file
 * @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
 * @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
 * @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout — AbortSignal.timeout
 * @see https://bun.com/docs/runtime/utils#bun-readablestreamto — Bun.readableStreamToText
 * @see docs/adr/0002-registry-index-ssot.md
 */

import { renderReadmeHTML } from '../factory/markdown.ts';
import { joinPath, relativePath, resolvePath } from '../path-bun.ts';
import { ROOT } from './paths.ts';

/** Cap rendered README body size in the desk detail payload. */
const README_HTML_MAX_CHARS = 120_000;

export type RegistryPresetId = 'local' | 'prod';

export type RegistryPreset = {
  id: RegistryPresetId;
  label: string;
  url: string;
  /** Whether `bun publish --registry` is allowed on this preset. */
  bunPublish: boolean;
  /** Whether factory publish (R2) is the write lane. */
  factoryPublish: boolean;
};

export const REGISTRY_PRESETS: Record<RegistryPresetId, RegistryPreset> = {
  local: {
    id: 'local',
    label: 'Local (serve-public :3000)',
    url: 'http://localhost:3000/',
    bunPublish: true,
    factoryPublish: false,
  },
  prod: {
    id: 'prod',
    label: 'FactoryWager npm API (read / factory publish)',
    url: 'https://registry.factory-wager.com/api/npm',
    bunPublish: false,
    factoryPublish: true,
  },
};

export type PublishableWorkspace = {
  dir: string;
  /** Absolute path */
  path: string;
  name: string;
  version: string;
  description?: string;
};

export type RegistrySearchHit = {
  name: string;
  version: string;
  type: string;
  description: string;
};

export type RegistryPackageDetail = {
  name: string;
  latest: string | null;
  /** Version whose release metadata (incl. readme) was selected. */
  selectedVersion: string | null;
  versions: string[];
  distTags: Record<string, string>;
  description: string;
  publishedAt?: string;
  publisher?: string;
  type?: string;
  /** From Bun 1.3.14+ publish body / factory index (snapshot). */
  readme?: string;
  readmeFilename?: string;
  /** Server-rendered HTML via Bun.markdown.html (tagFilter). */
  readmeHtml?: string;
  storage?: {
    r2Key?: string;
    size?: number;
    checksum?: string;
    contentType?: string;
  };
};

export type PublishFlags = {
  access?: 'public' | 'restricted';
  tag?: string;
  dryRun?: boolean;
  tolerateRepublish?: boolean;
  gzipLevel?: number;
};

export type RegistryPublishEvent =
  | {
      type: 'start';
      command: string[];
      dryRun: boolean;
      cwd: string;
      lane: 'bun-publish' | 'factory';
    }
  | { type: 'stdout'; line: string }
  | { type: 'stderr'; line: string }
  | { type: 'progress'; percent: number }
  | {
      type: 'done';
      ok: boolean;
      exitCode: number;
      dryRun: boolean;
      error?: string;
    };

const SNAPSHOT_PATH = joinPath(ROOT, 'public/registry/registry.json');
const PACKAGES_ROOT = joinPath(ROOT, 'packages');

export function parseRegistryPreset(raw: string | null | undefined): RegistryPresetId | null {
  if (raw === 'local' || raw === 'prod') return raw;
  return null;
}

export function listPresets(): RegistryPreset[] {
  return [REGISTRY_PRESETS.local, REGISTRY_PRESETS.prod];
}

type SnapshotPkg = {
  versions?: string[];
  'dist-tags'?: Record<string, string>;
  releases?: Record<
    string,
    {
      description?: string;
      type?: string;
      publishedAt?: string;
      publisher?: string;
      tags?: string[];
      /** @see https://bun.com/blog/bun-v1.3.14#bun-publish-now-sends-readme-metadata-to-the-registry */
      readme?: string;
      readmeFilename?: string;
      storage?: {
        r2Key?: string;
        size?: number;
        checksum?: string;
        contentType?: string;
      };
    }
  >;
};

type Snapshot = {
  packages?: Record<string, SnapshotPkg>;
};

async function readSnapshot(): Promise<Snapshot | null> {
  const file = Bun.file(SNAPSHOT_PATH);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as Snapshot;
  } catch {
    return null;
  }
}

export async function searchRegistryPackages(
  q = '',
  type = ''
): Promise<{ results: RegistrySearchHit[]; total: number; source: string }> {
  const reg = await readSnapshot();
  if (!reg?.packages) {
    return { results: [], total: 0, source: SNAPSHOT_PATH };
  }
  const query = q.toLowerCase();
  const typeFilter = type.toLowerCase();
  const results: RegistrySearchHit[] = [];
  for (const [name, pkg] of Object.entries(reg.packages)) {
    const latest = pkg['dist-tags']?.latest;
    const rel = latest ? pkg.releases?.[latest] : null;
    if (
      query &&
      !name.toLowerCase().includes(query) &&
      !(rel?.description || '').toLowerCase().includes(query) &&
      !(rel?.tags || []).some(t => t.toLowerCase().includes(query))
    ) {
      continue;
    }
    if (typeFilter && rel?.type !== typeFilter) continue;
    results.push({
      name,
      version: latest || '?',
      type: rel?.type || '?',
      description: rel?.description || '',
    });
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return { results, total: results.length, source: SNAPSHOT_PATH };
}

export async function getRegistryPackage(
  name: string,
  version?: string | null
): Promise<RegistryPackageDetail | null> {
  const reg = await readSnapshot();
  if (!reg?.packages) return null;
  const pkg = reg.packages[name];
  if (!pkg) return null;
  const latest = pkg['dist-tags']?.latest ?? null;
  const pick =
    (version && pkg.releases?.[version] ? version : null) || latest || pkg.versions?.[0] || null;
  const rel = pick ? pkg.releases?.[pick] : undefined;
  const readme = typeof rel?.readme === 'string' && rel.readme.length > 0 ? rel.readme : undefined;
  const readmeFilename =
    typeof rel?.readmeFilename === 'string' && rel.readmeFilename.length > 0
      ? rel.readmeFilename
      : readme
        ? 'README.md'
        : undefined;
  const readmeHtml = readme
    ? renderReadmeHTML(
        readme.length > README_HTML_MAX_CHARS
          ? `${readme.slice(0, README_HTML_MAX_CHARS)}\n\n…(truncated)`
          : readme
      )
    : undefined;
  return {
    name,
    latest,
    selectedVersion: pick,
    versions: [...(pkg.versions ?? [])],
    distTags: { ...(pkg['dist-tags'] ?? {}) },
    description: rel?.description ?? '',
    publishedAt: rel?.publishedAt,
    publisher: rel?.publisher,
    type: rel?.type,
    readme,
    readmeFilename,
    readmeHtml,
    storage: rel?.storage
      ? {
          r2Key: rel.storage.r2Key,
          size: rel.storage.size,
          checksum: rel.storage.checksum,
          contentType: rel.storage.contentType,
        }
      : undefined,
  };
}

export async function registryHealth(presetId: RegistryPresetId): Promise<{
  preset: RegistryPresetId;
  url: string;
  snapshot: { ok: boolean; path: string; packageCount: number };
  ping?: { ok: boolean; status?: number; error?: string };
}> {
  const preset = REGISTRY_PRESETS[presetId];
  const reg = await readSnapshot();
  const packageCount = reg?.packages ? Object.keys(reg.packages).length : 0;
  const out: {
    preset: RegistryPresetId;
    url: string;
    snapshot: { ok: boolean; path: string; packageCount: number };
    ping?: { ok: boolean; status?: number; error?: string };
  } = {
    preset: presetId,
    url: preset.url,
    snapshot: {
      ok: packageCount > 0,
      path: 'public/registry/registry.json',
      packageCount,
    },
  };

  if (presetId === 'local') {
    try {
      const res = await fetch(new URL('/-/ping', preset.url), {
        signal: AbortSignal.timeout(1500),
      });
      out.ping = { ok: res.ok, status: res.status };
    } catch (err) {
      out.ping = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return out;
}

/** Ensure path is under ROOT/packages/<dir> (no traversal). */
export function resolveWorkspacePath(dirOrName: string): string | null {
  const cleaned = dirOrName.replace(/^packages\//, '').replace(/\/+$/, '');
  if (!cleaned || cleaned.includes('..') || cleaned === '.') return null;
  // Single path segment only (direct child of packages/)
  if (cleaned.includes('/')) return null;

  const abs = resolvePath(PACKAGES_ROOT, cleaned);
  const rel = relativePath(PACKAGES_ROOT, abs);
  if (!rel || rel === '.' || rel.startsWith('..') || rel.includes('/')) return null;
  if (abs === ROOT || abs === PACKAGES_ROOT) return null;
  return abs;
}

export async function listPublishableWorkspaces(): Promise<PublishableWorkspace[]> {
  const out: PublishableWorkspace[] = [];
  const glob = new Bun.Glob('*/package.json');
  for await (const rel of glob.scan({ cwd: PACKAGES_ROOT, onlyFiles: true })) {
    const dir = rel.split('/')[0]!;
    const path = joinPath(PACKAGES_ROOT, dir);
    const pkgPath = joinPath(path, 'package.json');
    try {
      const pkg = (await Bun.file(pkgPath).json()) as {
        name?: string;
        version?: string;
        description?: string;
        private?: boolean;
      };
      if (!pkg.name || !pkg.version) continue;
      if (pkg.private === true) continue;
      out.push({
        dir,
        path,
        name: pkg.name,
        version: pkg.version,
        description: typeof pkg.description === 'string' ? pkg.description : undefined,
      });
    } catch {
      /* skip */
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function buildBunPublishArgs(flags: PublishFlags, registryUrl: string): string[] {
  const args = ['publish'];
  const dryRun = flags.dryRun !== false;
  if (dryRun) args.push('--dry-run');
  if (flags.access) args.push('--access', flags.access);
  if (flags.tag) args.push('--tag', flags.tag);
  if (flags.tolerateRepublish) args.push('--tolerate-republish');
  if (flags.gzipLevel != null && Number.isFinite(flags.gzipLevel)) {
    args.push('--gzip-level', String(Math.max(0, Math.min(9, Math.floor(flags.gzipLevel)))));
  }
  args.push('--registry', registryUrl);
  return args;
}

function* linesOf(text: string): Generator<string> {
  if (!text) return;
  const parts = text.replace(/\n$/, '').split('\n');
  for (const line of parts) yield line;
}

async function* spawnEvents(
  cmd: string[],
  cwd: string,
  dryRun: boolean,
  lane: 'bun-publish' | 'factory'
): AsyncGenerator<RegistryPublishEvent> {
  yield { type: 'start', command: cmd, dryRun, cwd, lane };

  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });

  const timeoutMs = Number(Bun.env.REGISTRY_PUBLISH_TIMEOUT_MS ?? 180_000);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
  }, timeoutMs);

  let lines = 0;
  let exitCode = 1;
  try {
    const [stdoutText, stderrText, code] = await Promise.all([
      proc.stdout ? Bun.readableStreamToText(proc.stdout) : Promise.resolve(''),
      proc.stderr ? Bun.readableStreamToText(proc.stderr) : Promise.resolve(''),
      proc.exited,
    ]);
    exitCode = code;
    for (const line of linesOf(stdoutText)) {
      lines += 1;
      yield { type: 'stdout', line };
      yield { type: 'progress', percent: Math.min(90, 10 + lines * 4) };
    }
    for (const line of linesOf(stderrText)) {
      lines += 1;
      yield { type: 'stderr', line };
      yield { type: 'progress', percent: Math.min(95, 10 + lines * 4) };
    }
  } finally {
    clearTimeout(timer);
  }

  yield { type: 'progress', percent: 100 };
  yield {
    type: 'done',
    ok: !timedOut && exitCode === 0,
    exitCode: timedOut ? 124 : exitCode,
    dryRun,
    error: timedOut
      ? `publish timed out after ${timeoutMs}ms`
      : exitCode === 0
        ? undefined
        : `publish exited with ${exitCode}`,
  };
}

export async function* runBunPublish(
  workspaceDir: string,
  flags: PublishFlags = {}
): AsyncGenerator<RegistryPublishEvent> {
  const cwd = resolveWorkspacePath(workspaceDir);
  if (!cwd) {
    yield {
      type: 'done',
      ok: false,
      exitCode: 1,
      dryRun: flags.dryRun !== false,
      error: 'Invalid workspace (must be packages/<name>)',
    };
    return;
  }
  if (!(await Bun.file(joinPath(cwd, 'package.json')).exists())) {
    yield {
      type: 'done',
      ok: false,
      exitCode: 1,
      dryRun: flags.dryRun !== false,
      error: `No package.json in ${workspaceDir}`,
    };
    return;
  }

  const dryRun = flags.dryRun !== false;
  const args = buildBunPublishArgs({ ...flags, dryRun }, REGISTRY_PRESETS.local.url);
  yield* spawnEvents(['bun', ...args], cwd, dryRun, 'bun-publish');
}

/**
 * Factory (R2) publish lane. Dry-run reports planned name@version only.
 * Confirm: `bun pm pack` then `bun lib/factory/cli.ts publish <tgz>`.
 */
export async function* runFactoryPublish(
  workspaceDir: string,
  opts: { dryRun?: boolean; confirm?: boolean } = {}
): AsyncGenerator<RegistryPublishEvent> {
  const dryRun = opts.confirm === true ? false : opts.dryRun !== false;
  const cwd = resolveWorkspacePath(workspaceDir);
  if (!cwd) {
    yield {
      type: 'done',
      ok: false,
      exitCode: 1,
      dryRun,
      error: 'Invalid workspace (must be packages/<name>)',
    };
    return;
  }

  let pkg: { name?: string; version?: string };
  try {
    pkg = (await Bun.file(joinPath(cwd, 'package.json')).json()) as typeof pkg;
  } catch {
    yield {
      type: 'done',
      ok: false,
      exitCode: 1,
      dryRun,
      error: `Cannot read package.json in ${workspaceDir}`,
    };
    return;
  }
  if (!pkg.name || !pkg.version) {
    yield {
      type: 'done',
      ok: false,
      exitCode: 1,
      dryRun,
      error: 'package.json missing name/version',
    };
    return;
  }

  if (dryRun) {
    const cmd = ['bun', 'lib/factory/cli.ts', 'publish', '<packed.tgz>'];
    yield { type: 'start', command: cmd, dryRun: true, cwd, lane: 'factory' };
    yield {
      type: 'stdout',
      line: `dry-run: would factory publish ${pkg.name}@${pkg.version} from packages/${workspaceDir}`,
    };
    yield {
      type: 'stdout',
      line: 'Refresh snapshot after live publish: bun run factory:snapshot',
    };
    yield { type: 'progress', percent: 100 };
    yield { type: 'done', ok: true, exitCode: 0, dryRun: true };
    return;
  }

  yield {
    type: 'start',
    command: ['bun', 'pm', 'pack'],
    dryRun: false,
    cwd,
    lane: 'factory',
  };
  yield { type: 'stdout', line: 'packing with bun pm pack…' };

  const packProc = Bun.spawn(['bun', 'pm', 'pack'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });
  const [packOut, packErr, packCode] = await Promise.all([
    packProc.stdout ? Bun.readableStreamToText(packProc.stdout) : Promise.resolve(''),
    packProc.stderr ? Bun.readableStreamToText(packProc.stderr) : Promise.resolve(''),
    packProc.exited,
  ]);
  for (const line of packOut.split('\n').filter(Boolean)) {
    yield { type: 'stdout', line };
  }
  for (const line of packErr.split('\n').filter(Boolean)) {
    yield { type: 'stderr', line };
  }
  if (packCode !== 0) {
    yield {
      type: 'done',
      ok: false,
      exitCode: packCode,
      dryRun: false,
      error: `bun pm pack exited with ${packCode}`,
    };
    return;
  }

  const tgzGlob = new Bun.Glob('*.tgz');
  let tgzPath: string | null = null;
  let newest = 0;
  for await (const f of tgzGlob.scan({ cwd, onlyFiles: true })) {
    const abs = joinPath(cwd, f);
    const st = await Bun.file(abs).stat();
    if (st && st.mtimeMs >= newest) {
      newest = st.mtimeMs;
      tgzPath = abs;
    }
  }
  if (!tgzPath) {
    yield {
      type: 'done',
      ok: false,
      exitCode: 1,
      dryRun: false,
      error: 'bun pm pack produced no .tgz',
    };
    return;
  }

  const factoryCli = joinPath(ROOT, 'lib/factory/cli.ts');
  yield* spawnEvents(['bun', factoryCli, 'publish', tgzPath], cwd, false, 'factory');
}

export function publishEventsToSse(
  events: AsyncIterable<RegistryPublishEvent>
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of events) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
          if (ev.type === 'done') break;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({ type: 'done', ok: false, exitCode: 1, dryRun: true, error: message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

/** Decode package name from `/api/registry/packages/<rest>` path suffix. */
export function packageNameFromPathSuffix(suffix: string): string {
  const trimmed = suffix.replace(/^\/+|\/+$/g, '');
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

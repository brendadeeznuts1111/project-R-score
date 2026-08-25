// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/reference/bun/JSONC — Bun.JSONC
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/toml — Bun.TOML.parse
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version / Bun.revision
/**
 * Read-only Bun runtime/type channel doctor.
 *
 * This module observes local declarations and official upstream metadata. It
 * never runs `bun upgrade`, installs packages, or rewrites pins.
 */
import { joinPath } from '../path-bun.ts';
import { expandBunMinorVersion, versionFromBunBlogUrl } from '../docs/bun-blog-url.ts';
import { parseRssChannelItems } from '../docs/bun-rss.ts';
import { parseBunReleaseTag, parseCanaryRelease } from './channels.ts';

export type BunChannelName = 'stable' | 'latest' | 'canary';

export type BunChannelConfig = {
  schema_version: 1;
  policy: {
    runtime_channel: 'stable';
    mutation: 'never';
    promotion: 'reviewed';
  };
  types: {
    wrapper_package: '@types/bun';
    wrapper_channel: 'latest';
    definitions_package: 'bun-types';
    definitions_channel: 'canary' | 'pinned-tip';
  };
  monitor: {
    os_schedule: string;
    os_timezone: 'system';
    in_process_timezone: string;
    title: string;
    artifact: string;
    fetch_timeout_ms: number;
  };
  sources: {
    stable_api: string;
    stable_api_fallback: string;
    canary_api: string;
    tip_api: string;
    /** Marketing blog index (`https://bun.com/blog`) — HTML research surface. */
    blog: string;
    /** Dated RSS feed (`https://bun.com/rss.xml`) — release provenance / corroboration. */
    rss: string;
    atom: string;
    npm_registry: string;
  };
};

export type BunChannelSource =
  | 'local-manifest'
  | 'local-lockfile'
  | 'resolved-types'
  | 'installed-runtime'
  | 'github-stable'
  | 'github-canary'
  | 'github-tip'
  | 'bun-blog'
  | 'bun-rss'
  | 'github-atom'
  | 'npm-@types/bun'
  | 'npm-bun-types';

export type BunChannelObservation = {
  source: BunChannelSource;
  ok: boolean;
  observedAt: string;
  url?: string;
  version?: string;
  revision?: string;
  publishedAt?: string;
  versions?: string[];
  error?: string;
};

export type BunChannelDrift = {
  code: string;
  kind: 'intentional' | 'informational' | 'actionable' | 'source-error';
  expected?: string;
  actual?: string;
  message: string;
};

export type BunChannelLocalState = {
  bunVersionFile?: string;
  packageManager?: string;
  engine?: string;
  wrapperPin?: string;
  definitionsPin?: string;
  lockWrapperPin?: string;
  lockDefinitionsPin?: string;
  lockWrapperResolved?: string;
  lockDefinitionsResolved?: string;
  resolvedWrapperVersion?: string;
  resolvedDefinitionsVersion?: string;
  wrapperDeclaredDefinitionsVersion?: string;
  wrapperReferenceResolvedVersion?: string;
  wrapperReferenceUsesSelectedDefinitions: boolean;
  installedVersion: string;
  installedRevision: string;
};

export type BunChannelDoctorReport = {
  schemaVersion: 1;
  generatedAt: string;
  policy: BunChannelConfig['policy'] & BunChannelConfig['types'];
  local: BunChannelLocalState;
  observations: BunChannelObservation[];
  capabilities: {
    cron: {
      evidence: 'resolved-bun-types' | 'unavailable';
      selectedDefinitionsVersion?: string;
      localContract: 'in-process-utc/no-tz-options' | 'timezone-options-present' | 'unknown';
      inProcessTimezone: 'UTC' | 'configurable' | 'unknown';
      timezoneOptions: 'absent' | 'present' | 'unknown';
      osTimezone: 'system';
      tipRevision?: string;
      tipCapability: 'not-probed-by-commit-endpoint';
      authority: 'informational';
    };
  };
  drift: BunChannelDrift[];
  summary: {
    status: 'healthy' | 'action-required' | 'degraded';
    exitCode: 0 | 1 | 2;
    intentional: number;
    informational: number;
    actionable: number;
    sourceErrors: number;
    reason: string;
  };
};

export type RunBunChannelDoctorOptions = {
  root?: string;
  config?: BunChannelConfig;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  runtime?: { version: string; revision: string };
  fetchTimeoutMs?: number;
};

type PackageManifest = {
  packageManager?: string;
  engines?: { bun?: string };
  catalog?: Record<string, string>;
};

type GithubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  target_commitish?: string;
  published_at?: string;
};

type GithubCommit = {
  sha?: string;
  commit?: { committer?: { date?: string } };
};

type NpmPackageMetadata = { 'dist-tags'?: Record<string, string> };

type BunLockfile = {
  catalog?: Record<string, string>;
  packages?: Record<string, [string, ...unknown[]]>;
};

type InstalledPackageManifest = {
  version?: string;
  dependencies?: Record<string, string>;
};

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`bun channel config: ${field} must be a non-empty string`);
  }
}

export function parseBunChannelConfig(text: string): BunChannelConfig {
  const raw = Bun.TOML.parse(text) as Partial<BunChannelConfig>;
  if (raw.schema_version !== 1) throw new Error('bun channel config: schema_version must be 1');
  if (
    raw.policy?.runtime_channel !== 'stable' ||
    raw.policy.mutation !== 'never' ||
    raw.policy.promotion !== 'reviewed'
  ) {
    throw new Error('bun channel config: policy must be stable / never / reviewed');
  }
  if (
    raw.types?.wrapper_package !== '@types/bun' ||
    raw.types.wrapper_channel !== 'latest' ||
    raw.types.definitions_package !== 'bun-types' ||
    !['canary', 'pinned-tip'].includes(raw.types.definitions_channel ?? '')
  ) {
    throw new Error(
      'bun channel config: expected latest @types/bun plus canary or pinned-tip bun-types'
    );
  }
  if (raw.monitor?.os_timezone !== 'system') {
    throw new Error('bun channel config: persistent OS cron timezone must be system');
  }
  for (const [field, value] of Object.entries(raw.monitor ?? {})) {
    if (field === 'fetch_timeout_ms') continue;
    assertString(value, `monitor.${field}`);
  }
  if (
    typeof raw.monitor?.fetch_timeout_ms !== 'number' ||
    !Number.isFinite(raw.monitor.fetch_timeout_ms) ||
    raw.monitor.fetch_timeout_ms <= 0
  ) {
    throw new Error('bun channel config: monitor.fetch_timeout_ms must be positive');
  }
  for (const [field, value] of Object.entries(raw.sources ?? {})) {
    assertString(value, `sources.${field}`);
  }
  const monitor = raw.monitor as BunChannelConfig['monitor'] | undefined;
  const sources = raw.sources as BunChannelConfig['sources'] | undefined;
  if (
    !monitor ||
    Object.keys(monitor).length !== 6 ||
    !sources ||
    Object.keys(sources).length !== 8
  ) {
    throw new Error('bun channel config: monitor or sources fields are incomplete');
  }
  return raw as BunChannelConfig;
}

export async function loadBunChannelConfig(root = process.cwd()): Promise<BunChannelConfig> {
  const path = joinPath(root, 'config/bun-channels.toml');
  return parseBunChannelConfig(await Bun.file(path).text());
}

// eslint-disable-next-line harness/no-unknown-function-param -- catch/fetch boundary normalization
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchChecked(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
  accept = 'application/json, application/atom+xml, application/rss+xml'
): Promise<Response> {
  const response = await fetchImpl(url, {
    headers: { Accept: accept },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText || 'request failed'}`);
  return response;
}

function versionsFromGenericFeed(text: string): string[] {
  const versions = new Set<string>();
  for (const match of text.matchAll(/(?:bun-v|Bun\s+v?)(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)/gi)) {
    if (!match[1]) continue;
    const version = expandBunMinorVersion(match[1]);
    if (/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(version)) versions.add(version);
  }
  return [...versions];
}

function versionsFromBunRss(text: string): string[] {
  const versions = new Set<string>();
  for (const item of parseRssChannelItems(text)) {
    const version = versionFromBunBlogUrl(item.link);
    if (version) versions.add(version);
  }
  return [...versions];
}

async function observe(
  source: BunChannelSource,
  observedAt: string,
  url: string,
  reader: () => Promise<Omit<BunChannelObservation, 'source' | 'ok' | 'observedAt' | 'url'>>
): Promise<BunChannelObservation> {
  try {
    return { source, ok: true, observedAt, url, ...(await reader()) };
  } catch (error) {
    return { source, ok: false, observedAt, url, error: errorText(error) };
  }
}

async function readLocalState(root: string, runtime: RunBunChannelDoctorOptions['runtime']) {
  const bunVersionPath = joinPath(root, '.bun-version');
  const manifestPath = joinPath(root, 'package.json');
  const lockPath = joinPath(root, 'bun.lock');
  const wrapperManifestPath = joinPath(root, 'node_modules/@types/bun/package.json');
  const wrapperIndexPath = joinPath(root, 'node_modules/@types/bun/index.d.ts');
  const directDefinitionsManifestPath = joinPath(root, 'node_modules/bun-types/package.json');
  const nestedDefinitionsManifestPath = joinPath(
    root,
    'node_modules/@types/bun/node_modules/bun-types/package.json'
  );
  const [
    bunVersionFile,
    manifestText,
    lockText,
    wrapperManifest,
    directDefinitions,
    nestedDefinitions,
  ] = await Promise.all([
    Bun.file(bunVersionPath)
      .exists()
      .then(exists =>
        exists
          ? Bun.file(bunVersionPath)
              .text()
              .then(text => text.trim())
          : undefined
      ),
    Bun.file(manifestPath).text(),
    Bun.file(lockPath)
      .exists()
      .then(exists => (exists ? Bun.file(lockPath).text() : undefined)),
    readInstalledPackage(wrapperManifestPath),
    readInstalledPackage(directDefinitionsManifestPath),
    readInstalledPackage(nestedDefinitionsManifestPath),
  ]);
  const manifest = JSON.parse(manifestText) as PackageManifest;
  const lock = lockText ? (Bun.JSONC.parse(lockText) as BunLockfile) : undefined;
  const wrapperIndex = await Bun.file(wrapperIndexPath)
    .exists()
    .then(exists => (exists ? Bun.file(wrapperIndexPath).text() : undefined));
  const wrapperReferencesDefinitions =
    wrapperIndex?.includes('reference types="bun-types"') === true;
  const referenceDefinitions = nestedDefinitions ?? directDefinitions;
  const referenceUsesSelectedDefinitions =
    wrapperReferencesDefinitions &&
    !nestedDefinitions &&
    referenceDefinitions?.version !== undefined &&
    referenceDefinitions.version === directDefinitions?.version;
  const selectedDefinitionsPath = nestedDefinitions
    ? joinPath(root, 'node_modules/@types/bun/node_modules/bun-types/bun.d.ts')
    : joinPath(root, 'node_modules/bun-types/bun.d.ts');
  const definitionsText = await Bun.file(selectedDefinitionsPath)
    .exists()
    .then(exists => (exists ? Bun.file(selectedDefinitionsPath).text() : undefined));
  const cronDeclaration = definitionsText?.match(/const cron:\s*\{([\s\S]*?)\};/)?.[1];
  const hasTimezoneOptions = cronDeclaration
    ? /\b(?:tz|timezone)\??\s*:/.test(cronDeclaration)
    : undefined;
  const statesUtc = cronDeclaration?.includes('interpreted in **UTC**') === true;
  return {
    local: {
      bunVersionFile,
      packageManager: manifest.packageManager,
      engine: manifest.engines?.bun,
      wrapperPin: manifest.catalog?.['@types/bun'],
      definitionsPin: manifest.catalog?.['bun-types'],
      lockWrapperPin: lock?.catalog?.['@types/bun'],
      lockDefinitionsPin: lock?.catalog?.['bun-types'],
      lockWrapperResolved: lockResolvedVersion(lock, '@types/bun'),
      lockDefinitionsResolved: lockResolvedVersion(lock, 'bun-types'),
      resolvedWrapperVersion: wrapperManifest?.version,
      resolvedDefinitionsVersion: directDefinitions?.version,
      wrapperDeclaredDefinitionsVersion: wrapperManifest?.dependencies?.['bun-types'],
      wrapperReferenceResolvedVersion: referenceDefinitions?.version,
      wrapperReferenceUsesSelectedDefinitions: referenceUsesSelectedDefinitions,
      installedVersion: runtime?.version ?? Bun.version,
      installedRevision: runtime?.revision ?? Bun.revision,
    } satisfies BunChannelLocalState,
    lockAvailable: lock !== undefined,
    resolvedTypesAvailable: wrapperManifest !== undefined && directDefinitions !== undefined,
    cron: {
      evidence: definitionsText ? ('resolved-bun-types' as const) : ('unavailable' as const),
      localContract:
        statesUtc && hasTimezoneOptions === false
          ? ('in-process-utc/no-tz-options' as const)
          : hasTimezoneOptions
            ? ('timezone-options-present' as const)
            : ('unknown' as const),
      inProcessTimezone: statesUtc
        ? ('UTC' as const)
        : hasTimezoneOptions
          ? ('configurable' as const)
          : ('unknown' as const),
      timezoneOptions:
        hasTimezoneOptions === undefined
          ? ('unknown' as const)
          : hasTimezoneOptions
            ? ('present' as const)
            : ('absent' as const),
    },
  };
}

async function readInstalledPackage(path: string): Promise<InstalledPackageManifest | undefined> {
  const file = Bun.file(path);
  if (!(await file.exists())) return undefined;
  return JSON.parse(await file.text()) as InstalledPackageManifest;
}

function lockResolvedVersion(
  lock: BunLockfile | undefined,
  packageName: string
): string | undefined {
  const locator = lock?.packages?.[packageName]?.[0];
  if (!locator) return undefined;
  if (packageName === 'bun-types') {
    const vendored = locator.match(/bun-types-([^/]+)\.tgz$/)?.[1];
    if (vendored) return vendored;
  }
  return locator.slice(locator.lastIndexOf('@') + 1) || undefined;
}

function addMismatch(
  drift: BunChannelDrift[],
  code: string,
  expected: string | undefined,
  actual: string | undefined,
  message: string
): void {
  if (expected !== undefined && expected !== actual) {
    drift.push({ code, kind: 'actionable', expected, actual, message });
  }
}

/** Query every configured source and classify drift without mutating local state. */
export async function runBunChannelDoctor(
  options: RunBunChannelDoctorOptions = {}
): Promise<BunChannelDoctorReport> {
  const root = options.root ?? process.cwd();
  const config = options.config ?? (await loadBunChannelConfig(root));
  const fetchImpl = options.fetchImpl ?? fetch;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? config.monitor.fetch_timeout_ms;
  const generatedAt = (options.now ?? (() => new Date()))().toISOString();
  const { local, lockAvailable, resolvedTypesAvailable, cron } = await readLocalState(
    root,
    options.runtime
  );

  const stable = (async () => {
    const readRelease = async (url: string) => {
      const release = (await (
        await fetchChecked(fetchImpl, url, fetchTimeoutMs)
      ).json()) as GithubRelease;
      assertString(release.tag_name, 'github stable tag_name');
      return {
        version: parseBunReleaseTag(release.tag_name),
        publishedAt: release.published_at,
      };
    };
    const primary = await observe('github-stable', generatedAt, config.sources.stable_api, () =>
      readRelease(config.sources.stable_api)
    );
    if (primary.ok) return primary;
    const fallback = await observe(
      'github-stable',
      generatedAt,
      config.sources.stable_api_fallback,
      () => readRelease(config.sources.stable_api_fallback)
    );
    if (!fallback.ok) fallback.error = `primary: ${primary.error}; fallback: ${fallback.error}`;
    return fallback;
  })();
  const canary = observe('github-canary', generatedAt, config.sources.canary_api, async () => {
    const release = (await (
      await fetchChecked(fetchImpl, config.sources.canary_api, fetchTimeoutMs)
    ).json()) as GithubRelease;
    const parsed = parseCanaryRelease(release);
    return {
      version: parsed.displayVersion,
      revision: parsed.commitFull,
      publishedAt: release.published_at,
    };
  });
  const tip = observe('github-tip', generatedAt, config.sources.tip_api, async () => {
    const commit = (await (
      await fetchChecked(fetchImpl, config.sources.tip_api, fetchTimeoutMs)
    ).json()) as GithubCommit;
    assertString(commit.sha, 'github tip sha');
    return { revision: commit.sha, publishedAt: commit.commit?.committer?.date };
  });
  const blog = observe('bun-blog', generatedAt, config.sources.blog, async () => {
    const text = await (
      await fetchChecked(
        fetchImpl,
        config.sources.blog,
        fetchTimeoutMs,
        'text/html, application/xhtml+xml'
      )
    ).text();
    if (!/\/blog\b/i.test(text) && !/Bun/i.test(text)) {
      throw new Error('blog index response did not look like the Bun blog surface');
    }
    return {};
  });
  const rss = observe('bun-rss', generatedAt, config.sources.rss, async () => ({
    versions: versionsFromBunRss(
      await (await fetchChecked(fetchImpl, config.sources.rss, fetchTimeoutMs)).text()
    ),
  }));
  const atom = observe('github-atom', generatedAt, config.sources.atom, async () => ({
    versions: versionsFromGenericFeed(
      await (await fetchChecked(fetchImpl, config.sources.atom, fetchTimeoutMs)).text()
    ),
  }));
  const npmPackage = (packageName: string, source: BunChannelSource, channel: BunChannelName) => {
    const url = `${config.sources.npm_registry.replace(/\/$/, '')}/${encodeURIComponent(packageName)}`;
    return observe(source, generatedAt, url, async () => {
      const metadata = (await (
        await fetchChecked(fetchImpl, url, fetchTimeoutMs)
      ).json()) as NpmPackageMetadata;
      const version = metadata['dist-tags']?.[channel];
      assertString(version, `${packageName} dist-tag ${channel}`);
      return { version };
    });
  };

  const upstream = await Promise.all([
    stable,
    canary,
    tip,
    blog,
    rss,
    atom,
    npmPackage('@types/bun', 'npm-@types/bun', config.types.wrapper_channel),
    npmPackage('bun-types', 'npm-bun-types', 'canary'),
  ]);
  const observations: BunChannelObservation[] = [
    { source: 'local-manifest', ok: true, observedAt: generatedAt },
    {
      source: 'local-lockfile',
      ok: lockAvailable,
      observedAt: generatedAt,
      ...(!lockAvailable ? { error: 'bun.lock is missing or unreadable' } : {}),
    },
    {
      source: 'resolved-types',
      ok: resolvedTypesAvailable,
      observedAt: generatedAt,
      ...(!resolvedTypesAvailable
        ? { error: '@types/bun or bun-types is not resolved in node_modules' }
        : {}),
    },
    {
      source: 'installed-runtime',
      ok: true,
      observedAt: generatedAt,
      version: local.installedVersion,
      revision: local.installedRevision,
    },
    ...upstream,
  ];
  const bySource = new Map(observations.map(item => [item.source, item]));
  const tipRevision = bySource.get('github-tip')?.revision;
  const tipRevisionShort = tipRevision?.slice(0, 8);
  const pinnedDefinitionsVersion = local.definitionsPin?.match(
    /^file:tools\/vendor\/bun-types\/bun-types-(\d+\.\d+\.\d+-tip\.[0-9a-f]{7,40})\.tgz$/
  )?.[1];
  const expectedDefinitionsVersion =
    config.types.definitions_channel === 'pinned-tip'
      ? pinnedDefinitionsVersion
      : bySource.get('npm-bun-types')?.version;
  const expectedDefinitionsPin =
    config.types.definitions_channel === 'pinned-tip' && expectedDefinitionsVersion
      ? `file:tools/vendor/bun-types/bun-types-${expectedDefinitionsVersion}.tgz`
      : expectedDefinitionsVersion;
  const drift: BunChannelDrift[] = [
    {
      code: 'intentional-type-channel-split',
      kind: 'intentional',
      expected: `@types/bun@latest + bun-types@${config.types.definitions_channel}`,
      actual: `${local.wrapperPin ?? 'missing'} + ${local.definitionsPin ?? 'missing'} (wrapper declares ${local.wrapperDeclaredDefinitionsVersion ?? 'unknown'})`,
      message:
        'The stable wrapper and selected forward declaration package are intentionally independent; the direct declaration package is authoritative.',
    },
  ];
  if (config.types.definitions_channel === 'pinned-tip' && !pinnedDefinitionsVersion) {
    drift.push({
      code: 'definitions-pin-invalid',
      kind: 'actionable',
      expected: 'file:tools/vendor/bun-types/bun-types-<version>-tip.<revision>.tgz',
      actual: local.definitionsPin,
      message: 'The reviewed tip channel requires an exact vendored declaration artifact.',
    });
  }
  const pinnedRevision = pinnedDefinitionsVersion?.match(/-tip\.([0-9a-f]{7,40})$/)?.[1];
  if (
    config.types.definitions_channel === 'pinned-tip' &&
    tipRevisionShort &&
    pinnedRevision !== tipRevisionShort
  ) {
    drift.push({
      code: 'pinned-tip-behind-upstream',
      kind: 'informational',
      expected: `reviewed pin ${pinnedRevision ?? 'unknown'}`,
      actual: `upstream tip ${tipRevisionShort}`,
      message: 'Upstream advanced after the reviewed declaration snapshot; promotion is separate.',
    });
  }
  for (const observation of observations) {
    if (!observation.ok) {
      if (observation.source === 'github-tip') {
        drift.push({
          code: 'tip-unavailable',
          kind: 'informational',
          actual: observation.error,
          message: 'The main-branch tip is informational and is never promotion authority.',
        });
        continue;
      }
      if (observation.source === 'bun-blog') {
        drift.push({
          code: 'blog-unavailable',
          kind: 'informational',
          actual: observation.error,
          message:
            'The marketing blog index is research reachability only; stable corroboration stays on RSS and Atom.',
        });
        continue;
      }
      drift.push({
        code: `source-unavailable:${observation.source}`,
        kind: 'source-error',
        actual: observation.error,
        message: `${observation.source} could not be observed; no promotion decision is safe.`,
      });
    }
  }

  const stableVersion = bySource.get('github-stable')?.version;
  addMismatch(
    drift,
    'bun-version-file-stale',
    stableVersion,
    local.bunVersionFile,
    '.bun-version does not match the official stable release.'
  );
  addMismatch(
    drift,
    'package-manager-stale',
    stableVersion ? `bun@${stableVersion}` : undefined,
    local.packageManager,
    'packageManager does not match the official stable release.'
  );
  addMismatch(
    drift,
    'installed-runtime-stale',
    stableVersion,
    local.installedVersion,
    'The executing Bun runtime does not match the reviewed stable pin.'
  );
  if (stableVersion && local.engine) {
    let supported = false;
    try {
      supported = Bun.semver.satisfies(stableVersion, local.engine);
    } catch {
      supported = false;
    }
    if (!supported) {
      drift.push({
        code: 'engine-excludes-stable',
        kind: 'actionable',
        expected: `range containing ${stableVersion}`,
        actual: local.engine,
        message: 'engines.bun excludes the selected stable runtime.',
      });
    }
  }
  addMismatch(
    drift,
    'wrapper-pin-stale',
    bySource.get('npm-@types/bun')?.version,
    local.wrapperPin,
    '@types/bun does not match its configured latest dist-tag.'
  );
  addMismatch(
    drift,
    'definitions-pin-stale',
    expectedDefinitionsPin,
    local.definitionsPin,
    `bun-types does not match its configured ${config.types.definitions_channel} channel.`
  );
  addMismatch(
    drift,
    'lock-wrapper-pin-drift',
    local.wrapperPin,
    local.lockWrapperPin,
    'bun.lock catalog @types/bun does not match the manifest catalog pin.'
  );
  addMismatch(
    drift,
    'lock-definitions-pin-drift',
    local.definitionsPin,
    local.lockDefinitionsPin,
    'bun.lock catalog bun-types does not match the manifest catalog pin.'
  );
  addMismatch(
    drift,
    'lock-wrapper-resolution-drift',
    local.wrapperPin,
    local.lockWrapperResolved,
    'bun.lock resolved @types/bun package does not match the selected wrapper pin.'
  );
  addMismatch(
    drift,
    'lock-definitions-resolution-drift',
    expectedDefinitionsVersion,
    local.lockDefinitionsResolved,
    'bun.lock resolved bun-types package does not match the selected declaration pin.'
  );
  addMismatch(
    drift,
    'installed-wrapper-resolution-drift',
    local.wrapperPin,
    local.resolvedWrapperVersion,
    'Installed @types/bun does not match the selected wrapper pin.'
  );
  addMismatch(
    drift,
    'installed-definitions-resolution-drift',
    expectedDefinitionsVersion,
    local.resolvedDefinitionsVersion,
    'Installed bun-types does not match the selected declaration pin.'
  );
  if (!local.wrapperReferenceUsesSelectedDefinitions) {
    drift.push({
      code: 'wrapper-reference-resolution-drift',
      kind: 'actionable',
      expected: expectedDefinitionsVersion,
      actual: local.wrapperReferenceResolvedVersion,
      message:
        '@types/bun must resolve its `bun-types` reference to the selected direct declaration package.',
    });
  }
  for (const source of ['bun-rss', 'github-atom'] as const) {
    const feed = bySource.get(source);
    if (stableVersion && feed?.ok && !feed.versions?.includes(stableVersion)) {
      drift.push({
        code: `stable-missing-from:${source}`,
        kind: 'actionable',
        expected: stableVersion,
        actual: feed.versions?.join(', ') || 'no release versions',
        message: `${source} does not corroborate the official stable release.`,
      });
    }
  }
  // bun-blog is reachability-only (HTML marketing index). Version corroboration
  // stays on bun-rss + github-atom — do not treat blog HTML as a release feed.

  const tipObservation = bySource.get('github-tip');
  drift.push({
    code: 'cron-capability-contract',
    kind: 'informational',
    expected: 'tip is observed, never inferred or promoted',
    actual: `${cron.localContract}; tip=${tipObservation?.revision ?? 'unavailable'}`,
    message:
      'Cron timezone capability is derived from resolved local declarations; the commits/main SHA does not prove a tip API shape.',
  });

  const sourceErrors = drift.filter(item => item.kind === 'source-error').length;
  const actionable = drift.filter(item => item.kind === 'actionable').length;
  const intentional = drift.filter(item => item.kind === 'intentional').length;
  const informational = drift.filter(item => item.kind === 'informational').length;
  const status = sourceErrors > 0 ? 'degraded' : actionable > 0 ? 'action-required' : 'healthy';
  const exitCode = sourceErrors > 0 ? 2 : actionable > 0 ? 1 : 0;
  return {
    schemaVersion: 1,
    generatedAt,
    policy: { ...config.policy, ...config.types },
    local,
    observations,
    capabilities: {
      cron: {
        ...cron,
        selectedDefinitionsVersion: local.resolvedDefinitionsVersion,
        osTimezone: 'system',
        tipRevision: tipObservation?.revision,
        tipCapability: 'not-probed-by-commit-endpoint',
        authority: 'informational',
      },
    },
    drift,
    summary: {
      status,
      exitCode,
      intentional,
      informational,
      actionable,
      sourceErrors,
      reason:
        status === 'degraded'
          ? 'One or more required observations failed.'
          : status === 'action-required'
            ? 'Reviewed pin changes are required; the doctor made no mutations.'
            : 'All actionable pins and release sources agree.',
    },
  };
}

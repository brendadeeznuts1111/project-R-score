// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/workers#creating-a-worker — Workers
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Cloudflare / R2 / Pages env SSOT (+ `bun run cloudflare:env` CLI).
 *
 * Sibling to [`config/ports.ts`](./ports.ts). Pages identity/pins live in
 * `CLOUDFLARE_DEFAULTS` — dashboard overlays: `BUN_VERSION`, `SKIP_DEPENDENCY_INSTALL`.
 *
 *
 * R2 S3 credentials ≠ Cloudflare API token (`requireR2Config` vs `requireCloudflareApiToken`).
 *
 * Claim: `cloudflare-pages-env-ssot` · Tenant: docs/harness/tenants/cloudflare-pages.md
 */

import { asAccountId, asZoneId } from '../lib/types/branded.ts';

/** Non-secret identity proven live (wrangler whoami + Pages/zones API). */
export const CLOUDFLARE_DEFAULTS = {
  accountId: '7a470541a704caaf91e71efccc78fd36',
  pages: {
    project: 'project-r-score',
    subdomain: 'project-r-score.pages.dev',
    /**
     * Custom domain (Pages project + zone DNS CNAME → pages.dev).
     * Dashboard: score.factory-wager.com · CNAME score → project-r-score.pages.dev (proxied).
     */
    customDomain: 'score.factory-wager.com',
    productionBranch: 'main',
    destinationDir: 'public',
    buildCommand: 'exit 0',
    rootDir: '',
    /** GitHub-releasable Bun for Pages asdf — not local canary packageManager. */
    bunVersion: '1.3.14',
    skipDependencyInstall: true,
  },
  zones: {
    factoryWager: {
      id: 'a3b7ba4bb62cb1b177b04b8675250674',
      name: 'factory-wager.com',
    },
    missonControl: {
      id: 'ba2906afe573e63c6b32f471d2fe01fe',
      name: 'misson-control.com',
    },
  },
  wikiHost: 'wiki.factory-wager.com',
  /** HTTPS package registry (npm / CDN front). */
  registryHost: 'registry.factory-wager.com',
  /** Default registry object store path (pack/release/changelog scripts). */
  registryBucket: 'factory-wager-registry',
  /** Doctor / deploy fallback when no R2_* bucket env is set. */
  registryDoctorBucket: 'npm-registry',
  benchPrefix: 'reports/search-bench',
} as const;

/** Keys checked by status CLI (secrets + account/zone identity). */
export const CLOUDFLARE_ENV_KEYS = {
  identity: [
    'CLOUDFLARE_ACCOUNT_ID',
    'R2_ACCOUNT_ID',
    'CLOUDFLARE_ZONE_ID',
    'CLOUDFLARE_ZONE_NAME',
  ],
  secrets: ['CLOUDFLARE_API_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
  /** Pages dashboard only — not local Bun runtime. */
  pagesBuild: ['BUN_VERSION', 'SKIP_DEPENDENCY_INSTALL'],
} as const;

/** Bun runtime or empty on Workers (Pages Functions bundle — use fallbacks). */
function runtimeEnv(): Record<string, string | undefined> {
  if (typeof Bun !== 'undefined') return Bun.env as Record<string, string | undefined>;
  return {};
}

function envString(key: string, fallback = ''): string {
  const val = runtimeEnv()[key];
  if (val == null) return fallback;
  const trimmed = val.trim();
  return trimmed || fallback;
}

function parseTruthy(raw: string, defaultValue: boolean): boolean {
  if (!raw) return defaultValue;
  const v = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return defaultValue;
}

const PLACEHOLDER_RE = /^(your_|replace_me|changeme|xxx|TODO|place.?holder)/i;

function isUsableSecret(value: string): boolean {
  return Boolean(value) && !PLACEHOLDER_RE.test(value);
}

/** Account id: prefer R2_*, then CLOUDFLARE_*, then proven default. */
export function cloudflareAccountIdFromEnv(): string {
  return (
    envString('R2_ACCOUNT_ID') ||
    envString('CLOUDFLARE_ACCOUNT_ID') ||
    CLOUDFLARE_DEFAULTS.accountId
  );
}

export function r2EndpointFromAccount(accountId = cloudflareAccountIdFromEnv()): string {
  return envString('R2_ENDPOINT') || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
}

/** Bucket cascade shared by r2-bridge / search-bench / CI. */
export function r2BucketFromEnv(): string {
  return (
    envString('R2_BENCH_BUCKET') ||
    envString('R2_BUCKET') ||
    envString('R2_BUCKET_NAME') ||
    envString('R2_REGISTRY_BUCKET')
  );
}

/**
 * Factory artifact registry bucket (CLI + Pages binding target).
 * Prefer dedicated `R2_REGISTRY_BUCKET` / `FACTORY_REGISTRY_BUCKET` over bench cascade.
 */
export function factoryRegistryBucketFromEnv(): string {
  return (
    envString('R2_REGISTRY_BUCKET') ||
    envString('FACTORY_REGISTRY_BUCKET') ||
    CLOUDFLARE_DEFAULTS.registryBucket
  );
}

/** Search-bench object prefix (dashboard + snapshot). */
export function r2BenchPrefixFromEnv(): string {
  return envString('R2_BENCH_PREFIX', CLOUDFLARE_DEFAULTS.benchPrefix);
}

/** Public/registry R2 URL used by pack/release/changelog scripts. */
export function r2BucketUrlFromEnv(): string {
  return (
    envString('R2_BUCKET_URL') ||
    `${r2EndpointFromAccount()}/${CLOUDFLARE_DEFAULTS.registryBucket}`
  );
}

export function r2UploadRetriesFromEnv(): number {
  return Number.parseInt(envString('R2_UPLOAD_RETRIES', '3'), 10) || 3;
}

export function r2RequestPayerFromEnv(): boolean {
  return parseTruthy(envString('R2_REQUEST_PAYER'), false);
}

/** Optional public base for search-bench HTML (CDN / custom domain). */
export function searchBenchR2PublicBaseFromEnv(): string {
  return envString('SEARCH_BENCH_R2_PUBLIC_BASE');
}

/** FactoryWager npm registry URL (`REGISTRY_URL` overlay). */
export function factoryWagerRegistryUrlFromEnv(): string {
  return envString('REGISTRY_URL', `https://${CLOUDFLARE_DEFAULTS.registryHost}`);
}

export function factoryWagerWikiUrl(): string {
  return `https://${CLOUDFLARE_DEFAULTS.wikiHost}`;
}

/** Cloudflare Pages production URL (pages.dev). */
export function factoryWagerPagesUrl(): string {
  return `https://${CLOUDFLARE_DEFAULTS.pages.subdomain}`;
}

/** Custom domain for Pages when DNS CNAME is active (may 404 until DNS exists). */
export function factoryWagerPagesCustomUrl(): string {
  return `https://${CLOUDFLARE_DEFAULTS.pages.customDomain}`;
}

/** Cloudflare dashboard URL for the factory-wager zone. */
export function cloudflareDashboardUrlFromEnv(
  accountId = cloudflareAccountIdFromEnv(),
  zoneName = CLOUDFLARE_DEFAULTS.zones.factoryWager.name
): string {
  return `https://dash.cloudflare.com/${accountId}/${zoneName}`;
}

export const R2_CONFIG = {
  accountId: cloudflareAccountIdFromEnv(),
  accessKeyId: envString('R2_ACCESS_KEY_ID'),
  secretAccessKey: envString('R2_SECRET_ACCESS_KEY'),
  cloudflareApiToken: envString('CLOUDFLARE_API_TOKEN'),
  bucket: envString('R2_BUCKET', 'bun-docs-prod'),
  bucketName: envString('R2_BUCKET_NAME', 'factory-wager-wiki'),
  benchPrefix: r2BenchPrefixFromEnv(),
  endpoint: r2EndpointFromAccount(),
  bucketUrl: r2BucketUrlFromEnv(),
} as const;

const pages = CLOUDFLARE_DEFAULTS.pages;

/** Pages identity from defaults; only Bun install pins overlay from env. */
export const CLOUDFLARE_PAGES = {
  ...pages,
  url: `https://${pages.subdomain}`,
  customUrl: `https://${pages.customDomain}`,
  bunVersion: envString('BUN_VERSION', pages.bunVersion),
  skipDependencyInstall: parseTruthy(
    envString('SKIP_DEPENDENCY_INSTALL'),
    pages.skipDependencyInstall
  ),
} as const;

export const CLOUDFLARE_ZONE = {
  id: envString('CLOUDFLARE_ZONE_ID', CLOUDFLARE_DEFAULTS.zones.factoryWager.id),
  name: envString('CLOUDFLARE_ZONE_NAME', CLOUDFLARE_DEFAULTS.zones.factoryWager.name),
} as const;

/** Layer 2 — dashboard token policy SSOT (MCP + harness). See tenant doc for mint steps. */
export const CLOUDFLARE_TOKEN_PERMISSIONS = {
  accountId: asAccountId(CLOUDFLARE_DEFAULTS.accountId),
  pagesProject: CLOUDFLARE_DEFAULTS.pages.project,
  zoneName: CLOUDFLARE_DEFAULTS.zones.factoryWager.name,
  zoneId: asZoneId(CLOUDFLARE_DEFAULTS.zones.factoryWager.id),
  /** Minimum for assert-live + DNS CNAME script */
  minimal: [
    { permission: 'Cloudflare Pages:Edit', resource: 'account → project-r-score' },
    { permission: 'Cloudflare Pages:Read', resource: 'account → project-r-score' },
    { permission: 'Zone:DNS:Edit', resource: 'factory-wager.com' },
    { permission: 'Zone:Read', resource: 'factory-wager.com' },
  ],
  /** Optional extras when using all five HTTP MCP servers (broader blast radius) */
  mcpOptional: [
    'Workers Scripts:Edit',
    'Workers Scripts:Read',
    'Workers R2 Storage:Edit',
    'Workers R2 Storage:Read',
    'Account Settings:Read',
    'Workers Observability Read',
    'Workers Tail Read',
    'Cloudflare Pages:Edit',
    'Cloudflare Pages:Read',
  ],
} as const;

/** Desired Git-integration build_config (matches live project-r-score). */
export function cloudflarePagesDesiredBuild() {
  return {
    build_command: CLOUDFLARE_PAGES.buildCommand,
    destination_dir: CLOUDFLARE_PAGES.destinationDir,
    root_dir: CLOUDFLARE_PAGES.rootDir,
    production_branch: CLOUDFLARE_PAGES.productionBranch,
  } as const;
}

/**
 * Fail if local env overlays would recreate the Pages Bun 404
 * (canary packageManager pin leaking into dashboard-shaped values).
 */
export function assertCloudflarePagesPins(): void {
  const { bunVersion, destinationDir, buildCommand, skipDependencyInstall } = CLOUDFLARE_PAGES;
  if (bunVersion === '1.4.0' || bunVersion.includes('canary')) {
    throw new Error(
      `BUN_VERSION=${bunVersion} is not Pages-safe (GitHub release 404). Use ${CLOUDFLARE_DEFAULTS.pages.bunVersion}.`
    );
  }
  if (destinationDir !== CLOUDFLARE_DEFAULTS.pages.destinationDir) {
    throw new Error(
      `Pages destination_dir must be ${CLOUDFLARE_DEFAULTS.pages.destinationDir} (got ${destinationDir})`
    );
  }
  if (buildCommand !== CLOUDFLARE_DEFAULTS.pages.buildCommand) {
    throw new Error(
      `Pages build_command must be ${JSON.stringify(CLOUDFLARE_DEFAULTS.pages.buildCommand)} (got ${JSON.stringify(buildCommand)})`
    );
  }
  if (!skipDependencyInstall) {
    throw new Error('SKIP_DEPENDENCY_INSTALL must be true for project-r-score static public/');
  }
}

export type CloudflareEnvPresence = {
  key: string;
  set: boolean;
  placeholder: boolean;
};

function presence(key: string): CloudflareEnvPresence {
  const raw = runtimeEnv()[key];
  const set = Boolean(raw && String(raw).trim());
  const placeholder = set && PLACEHOLDER_RE.test(String(raw).trim());
  return { key, set, placeholder };
}

/** Soft inventory — never prints secret values. */
export function describeCloudflareEnv() {
  const secrets = CLOUDFLARE_ENV_KEYS.secrets.map(presence);
  const accessOk =
    isUsableSecret(R2_CONFIG.accessKeyId) && isUsableSecret(R2_CONFIG.secretAccessKey);
  const token = presence('CLOUDFLARE_API_TOKEN');
  return {
    accountId: cloudflareAccountIdFromEnv(), // brand-ok — status dump hex
    pages: CLOUDFLARE_PAGES,
    zone: CLOUDFLARE_ZONE,
    desiredBuild: cloudflarePagesDesiredBuild(),
    wikiUrl: factoryWagerWikiUrl(),
    registryUrl: factoryWagerRegistryUrlFromEnv(),
    r2BucketUrl: r2BucketUrlFromEnv(),
    secrets,
    identity: CLOUDFLARE_ENV_KEYS.identity.map(presence),
    r2Ready: Boolean(cloudflareAccountIdFromEnv() && accessOk && r2BucketFromEnv()),
    apiTokenReady: token.set && !token.placeholder,
  };
}

export type R2S3Config = {
  accountId: string; // brand-ok — S3 account hex from env/defaults
  accessKeyId: string; // brand-ok — R2 access key wire string (brand at S3 send boundary)
  secretAccessKey: string;
  endpoint: string;
  bucket: string;
  benchPrefix: string;
  bucketUrl: string;
};

/** S3-compatible R2 only — does not require CLOUDFLARE_API_TOKEN. */
export function requireR2Config(): R2S3Config {
  const missing: string[] = [];
  if (!cloudflareAccountIdFromEnv()) missing.push('R2_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID');
  if (!isUsableSecret(R2_CONFIG.accessKeyId)) missing.push('R2_ACCESS_KEY_ID');
  if (!isUsableSecret(R2_CONFIG.secretAccessKey)) missing.push('R2_SECRET_ACCESS_KEY');
  const bucket = r2BucketFromEnv();
  if (!bucket) missing.push('R2_BENCH_BUCKET or R2_BUCKET or R2_BUCKET_NAME');
  if (missing.length > 0) {
    throw new Error(
      `Missing required R2 S3 configuration: ${missing.join(', ')}. Set these in your .env file (see .env.example).`
    );
  }
  return {
    accountId: cloudflareAccountIdFromEnv(),
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
    endpoint: r2EndpointFromAccount(),
    bucket,
    benchPrefix: R2_CONFIG.benchPrefix,
    bucketUrl: R2_CONFIG.bucketUrl,
  };
}

/** Soft S3 resolve for optional R2 features (dashboard / domain-health). */
export function tryR2Config(): R2S3Config | undefined {
  try {
    return requireR2Config();
  } catch {
    return undefined;
  }
}

/** API token from env (sync — domain manager / hard boundaries). */
export function requireCloudflareApiToken(): string {
  const token = R2_CONFIG.cloudflareApiToken;
  if (!isUsableSecret(token)) {
    throw new Error(
      'Missing CLOUDFLARE_API_TOKEN. Local ops may use `wrangler login` + `bun run cloudflare:env:assert-live`, or set the token for CI.'
    );
  }
  return token;
}

/** Read wrangler OAuth token from ~/.wrangler/config/default.toml (local only). */
async function wranglerOauthToken(): Promise<string | undefined> {
  const home = Bun.env.HOME;
  if (!home) return undefined;
  const path = `${home}/.wrangler/config/default.toml`;
  const file = Bun.file(path);
  if (!(await file.exists())) return undefined;
  const text = await file.text();
  const line = text.split('\n').find(l => l.startsWith('oauth_token'));
  if (!line) return undefined;
  const raw = line.split('=', 2)[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
  return isUsableSecret(raw) ? raw : undefined;
}

/** Env token, else wrangler OAuth — for live Pages assert CLI. */
export async function resolveCloudflareApiToken(): Promise<string> {
  const fromEnv = envString('CLOUDFLARE_API_TOKEN');
  if (isUsableSecret(fromEnv)) {
    return fromEnv;
  }
  const oauth = await wranglerOauthToken();
  if (oauth) return oauth;
  throw new Error(
    'Missing CLOUDFLARE_API_TOKEN (and no wrangler OAuth in ~/.wrangler/config/default.toml). Run `wrangler login` or set the token.'
  );
}

/**
 * Compare live Pages project settings to CLOUDFLARE_DEFAULTS (needs API token).
 * Does not mutate the project.
 */
export async function assertLiveCloudflarePages(): Promise<{
  project: string;
  url: string;
  build_config: Record<string, string | null | undefined>;
  bunVersion: string | undefined;
  skipDependencyInstall: string | undefined;
}> {
  assertCloudflarePagesPins();
  const token = await resolveCloudflareApiToken();
  const account = cloudflareAccountIdFromEnv();
  const project = CLOUDFLARE_DEFAULTS.pages.project;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    throw new Error(`Pages API ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as {
    success?: boolean;
    result?: {
      subdomain?: string;
      production_branch?: string;
      build_config?: {
        build_command?: string | null;
        destination_dir?: string | null;
        root_dir?: string | null;
      };
      deployment_configs?: {
        production?: {
          env_vars?: Record<string, { value?: string } | undefined>;
        };
      };
    };
  };
  const result = body.result;
  if (!body.success || !result) {
    throw new Error('Pages API returned unsuccessful payload');
  }
  const desired = cloudflarePagesDesiredBuild();
  const build = result.build_config || {};
  const env = result.deployment_configs?.production?.env_vars || {};
  const bunVersion = env.BUN_VERSION?.value;
  const skip = env.SKIP_DEPENDENCY_INSTALL?.value;
  const mismatches: string[] = [];
  if (build.build_command !== desired.build_command) {
    mismatches.push(`build_command=${JSON.stringify(build.build_command)}`);
  }
  if (build.destination_dir !== desired.destination_dir) {
    mismatches.push(`destination_dir=${JSON.stringify(build.destination_dir)}`);
  }
  if ((result.production_branch || '') !== desired.production_branch) {
    mismatches.push(`production_branch=${JSON.stringify(result.production_branch)}`);
  }
  if (bunVersion !== CLOUDFLARE_PAGES.bunVersion) {
    mismatches.push(`BUN_VERSION=${JSON.stringify(bunVersion)}`);
  }
  if (skip !== 'true' && skip !== '1') {
    mismatches.push(`SKIP_DEPENDENCY_INSTALL=${JSON.stringify(skip)}`);
  }
  if (mismatches.length > 0) {
    throw new Error(
      `Live Pages ${project} drifts from CLOUDFLARE_DEFAULTS: ${mismatches.join('; ')}`
    );
  }
  const url = `https://${result.subdomain || CLOUDFLARE_DEFAULTS.pages.subdomain}`;
  await assertCloudflarePagesApex(url);
  return {
    project,
    url,
    build_config: {
      build_command: build.build_command,
      destination_dir: build.destination_dir,
      root_dir: build.root_dir,
      production_branch: result.production_branch,
    },
    bunVersion,
    skipDependencyInstall: skip,
  };
}

/**
 * Layer 2 scope probe — token verify + Pages/zone reachability.
 * Harness operational confidence; does not restrict MCP runtime (dashboard-only).
 */
export async function assertCloudflareTokenScope(opts?: {
  strict?: boolean;
}): Promise<import('../lib/verification/cloudflare-token-scope.ts').CloudflareTokenScopeReport> {
  const { runCloudflareTokenScopeProbe } = await import(
    '../lib/verification/cloudflare-token-scope.ts'
  );
  return runCloudflareTokenScopeProbe(opts);
}

/** HTTP-only apex check — no API token (CI-safe when Pages is up). */
export async function assertCloudflarePagesApex(
  url: string = CLOUDFLARE_PAGES.url
): Promise<{ url: string; status: number }> {
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  if (!res.ok) {
    throw new Error(`Pages apex ${url} returned HTTP ${res.status}`);
  }
  if (!html.includes('FactoryWager')) {
    throw new Error(`Pages apex ${url} missing FactoryWager marker (publish surface stale?)`);
  }
  return { url, status: res.status };
}

if (import.meta.main) {
  const assertOnly = Bun.argv.includes('--assert');
  const assertLive = Bun.argv.includes('--assert-live');
  const assertApex = Bun.argv.includes('--assert-apex');
  if (Bun.argv.includes('--validate-token')) {
    console.error(
      'Use: bun run cloudflare:env:validate (tools/cloudflare-env-validate.ts — avoids CLI circular import)'
    );
    process.exit(1);
  }
  if (assertLive) {
    const live = await assertLiveCloudflarePages();
    console.log('cloudflare Pages live OK', live);
    process.exit(0);
  }
  if (assertApex) {
    const apex = await assertCloudflarePagesApex();
    console.log('cloudflare Pages apex OK', apex);
    process.exit(0);
  }
  if (assertOnly) {
    assertCloudflarePagesPins();
    console.log('cloudflare Pages pins OK', cloudflarePagesDesiredBuild());
    process.exit(0);
  }

  const status = describeCloudflareEnv();
  if (Bun.argv.includes('--json')) {
    console.log(JSON.stringify({ defaults: CLOUDFLARE_DEFAULTS, status }, null, 2));
  } else {
    const { pages: p, zone, desiredBuild } = status;
    console.log('Cloudflare env status');
    console.log(`  accountId     ${status.accountId}`);
    console.log(`  zone          ${zone.name} (${zone.id})`);
    console.log(`  pages         ${p.project} → ${p.url}`);
    console.log(
      `  build         cmd=${desiredBuild.build_command} out=${desiredBuild.destination_dir} branch=${desiredBuild.production_branch}`
    );
    console.log(
      `  pages_env     BUN_VERSION=${p.bunVersion} SKIP_DEPENDENCY_INSTALL=${p.skipDependencyInstall}`
    );
    console.log(`  apiTokenReady ${status.apiTokenReady}`);
    console.log(`  r2Ready       ${status.r2Ready}`);
    for (const s of status.secrets) {
      const flag = !s.set ? 'missing' : s.placeholder ? 'placeholder' : 'set';
      console.log(`  secret ${s.key}: ${flag}`);
    }
    console.log(`  wiki          ${factoryWagerWikiUrl()}`);
    console.log(`  registry      ${factoryWagerRegistryUrlFromEnv()}`);
    console.log(`  r2BucketUrl   ${r2BucketUrlFromEnv()}`);
  }
}

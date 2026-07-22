// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Cloudflare / R2 / Pages env SSOT (+ `bun run cloudflare:env` CLI).
 *
 * Sibling to [`config/ports.ts`](./ports.ts). Pages identity/pins live in
 * `CLOUDFLARE_DEFAULTS` — dashboard overlays: `BUN_VERSION`, `SKIP_DEPENDENCY_INSTALL`.
 * Root `wrangler.toml` is Worker `tier1380-production`, not Pages.
 *
 * R2 S3 credentials ≠ Cloudflare API token (`requireR2Config` vs `requireCloudflareApiToken`).
 *
 * Claim: `cloudflare-pages-env-ssot` · Tenant: docs/harness/tenants/cloudflare-pages.md
 */

/** Non-secret identity proven live (wrangler whoami + Pages/zones API). */
export const CLOUDFLARE_DEFAULTS = {
  accountId: '7a470541a704caaf91e71efccc78fd36',
  pages: {
    project: 'project-r-score',
    subdomain: 'project-r-score.pages.dev',
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

function envString(key: string, fallback = ''): string {
  const val = Bun.env[key];
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

export const R2_CONFIG = {
  accountId: cloudflareAccountIdFromEnv(),
  accessKeyId: envString('R2_ACCESS_KEY_ID'),
  secretAccessKey: envString('R2_SECRET_ACCESS_KEY'),
  cloudflareApiToken: envString('CLOUDFLARE_API_TOKEN'),
  bucket: envString('R2_BUCKET', 'bun-docs-prod'),
  bucketName: envString('R2_BUCKET_NAME', 'factory-wager-wiki'),
  benchPrefix: envString('R2_BENCH_PREFIX', 'reports/search-bench'),
  endpoint: r2EndpointFromAccount(),
  bucketUrl: envString('R2_BUCKET_URL'),
} as const;

const pages = CLOUDFLARE_DEFAULTS.pages;

/** Pages identity from defaults; only Bun install pins overlay from env. */
export const CLOUDFLARE_PAGES = {
  ...pages,
  url: `https://${pages.subdomain}`,
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
  const raw = Bun.env[key];
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
  if (isUsableSecret(R2_CONFIG.cloudflareApiToken)) {
    return R2_CONFIG.cloudflareApiToken;
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
  return {
    project,
    url: `https://${result.subdomain || CLOUDFLARE_DEFAULTS.pages.subdomain}`,
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

if (import.meta.main) {
  const assertOnly = Bun.argv.includes('--assert');
  const assertLive = Bun.argv.includes('--assert-live');
  if (assertLive) {
    const live = await assertLiveCloudflarePages();
    console.log('cloudflare Pages live OK', live);
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
    console.log(`  wiki          ${CLOUDFLARE_DEFAULTS.wikiHost}`);
  }
}

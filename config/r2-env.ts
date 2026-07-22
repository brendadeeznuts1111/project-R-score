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

/** S3-compatible R2 only — does not require CLOUDFLARE_API_TOKEN. */
export function requireR2Config() {
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

/** API token for Cloudflare REST (domain manager / Pages API). */
export function requireCloudflareApiToken(): string {
  const token = R2_CONFIG.cloudflareApiToken;
  if (!isUsableSecret(token)) {
    throw new Error(
      'Missing CLOUDFLARE_API_TOKEN. Local ops may use `wrangler login`; CI needs an API token.'
    );
  }
  return token;
}

if (import.meta.main) {
  const assertOnly = Bun.argv.includes('--assert');
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

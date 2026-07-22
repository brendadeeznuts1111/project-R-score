// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Cloudflare / R2 / Pages env SSOT for deploy tooling.
 *
 * Sibling pattern to [`config/ports.ts`](./ports.ts) (env → typed consts), plus
 * proven non-secret defaults and dashboard pin helpers. Do **not** encode Pages
 * in root `wrangler.toml` (that file is Worker `tier1380-production` only).
 * Prefer dashboard + these defaults; Cloudflare skill `wrangler.jsonc` applies
 * when Pages Functions/bindings exist — this monorepo serves static `public/`.
 *
 * Layers:
 * 1. `CLOUDFLARE_DEFAULTS` — non-secret identity proven against the live account
 * 2. `Bun.env` overlays — local `.env` / CI secrets and optional overrides
 * 3. `cloudflarePagesBuildEnvPlain()` — values for the Pages *dashboard*
 *    (not a substitute for local `packageManager` / bunfig)
 *
 * Why Pages pins `BUN_VERSION=1.3.14`: root `packageManager` may be `bun@1.4.0`
 * (canary). Pages downloads from GitHub releases; `bun-v1.4.0` 404s and fails
 * the build before `build_command` runs.
 *
 * Claim: `cloudflare-pages-env-ssot` · status: `bun run cloudflare:env`
 * Tenant: [`docs/harness/tenants/cloudflare-pages.md`](../docs/harness/tenants/cloudflare-pages.md)
 */

/** Non-secret identity proven live (wrangler whoami + Pages/zones API). */
export const CLOUDFLARE_DEFAULTS = {
  accountId: '7a470541a704caaf91e71efccc78fd36',
  accountLabel: "Utahj4754@gmail.com's Account",
  pages: {
    project: 'project-r-score',
    subdomain: 'project-r-score.pages.dev',
    url: 'https://project-r-score.pages.dev',
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
  /** Known R2 buckets on this account (names only; not credentials). */
  r2Buckets: [
    'artifacts',
    'bet-ticker-cache',
    'cascade-mover-thumbs',
    'fantasy402-raw',
    'fantasy402-raw-preview',
    'ledger-receipts',
  ],
} as const;

/** Documented env keys (for .env.example + status tooling). */
export const CLOUDFLARE_ENV_KEYS = {
  identity: [
    'CLOUDFLARE_ACCOUNT_ID',
    'R2_ACCOUNT_ID',
    'CLOUDFLARE_ZONE_ID',
    'CLOUDFLARE_ZONE_NAME',
    'CLOUDFLARE_PAGES_PROJECT',
    'CLOUDFLARE_PAGES_URL',
    'CLOUDFLARE_PAGES_DESTINATION_DIR',
    'CLOUDFLARE_PAGES_BUILD_COMMAND',
    'CLOUDFLARE_PAGES_PRODUCTION_BRANCH',
  ],
  secrets: ['CLOUDFLARE_API_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
  buckets: [
    'R2_BUCKET',
    'R2_BUCKET_NAME',
    'R2_REGISTRY_BUCKET',
    'R2_BENCH_BUCKET',
    'R2_BENCH_PREFIX',
    'R2_ENDPOINT',
    'R2_BUCKET_URL',
    'WIKI_DEPLOY_PATH',
    'WIKI_BASE_URL',
  ],
  /** Pages dashboard / build image — not required for local Bun runtime. */
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

/** Account id: prefer R2_*, then CLOUDFLARE_*, then proven default. */
export function cloudflareAccountIdFromEnv(): string {
  return (
    envString('R2_ACCOUNT_ID') ||
    envString('CLOUDFLARE_ACCOUNT_ID') ||
    CLOUDFLARE_DEFAULTS.accountId
  );
}

export function r2EndpointFromAccount(accountId = cloudflareAccountIdFromEnv()): string {
  const fromEnv = envString('R2_ENDPOINT');
  if (fromEnv) return fromEnv;
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '';
}

/** Bucket name cascade used across search-bench / r2-bridge / CI. */
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
  benchBucket: envString('R2_BENCH_BUCKET'),
  benchPrefix: envString('R2_BENCH_PREFIX', 'reports/search-bench'),
  registryBucket: envString('R2_REGISTRY_BUCKET'),
  endpoint: r2EndpointFromAccount(),
  bucketUrl: envString('R2_BUCKET_URL'),
} as const;

/** Resolved Pages identity (env overlay on proven defaults). */
export const CLOUDFLARE_PAGES = {
  project: envString('CLOUDFLARE_PAGES_PROJECT', CLOUDFLARE_DEFAULTS.pages.project),
  url: envString('CLOUDFLARE_PAGES_URL', CLOUDFLARE_DEFAULTS.pages.url),
  subdomain: CLOUDFLARE_DEFAULTS.pages.subdomain,
  destinationDir: envString(
    'CLOUDFLARE_PAGES_DESTINATION_DIR',
    CLOUDFLARE_DEFAULTS.pages.destinationDir
  ),
  buildCommand: envString(
    'CLOUDFLARE_PAGES_BUILD_COMMAND',
    CLOUDFLARE_DEFAULTS.pages.buildCommand
  ),
  productionBranch: envString(
    'CLOUDFLARE_PAGES_PRODUCTION_BRANCH',
    CLOUDFLARE_DEFAULTS.pages.productionBranch
  ),
  rootDir: CLOUDFLARE_DEFAULTS.pages.rootDir,
  bunVersion: envString('BUN_VERSION', CLOUDFLARE_DEFAULTS.pages.bunVersion),
  skipDependencyInstall: parseTruthy(
    envString('SKIP_DEPENDENCY_INSTALL'),
    CLOUDFLARE_DEFAULTS.pages.skipDependencyInstall
  ),
} as const;

/**
 * Plain env map for Cloudflare Pages → Settings → Environment variables.
 * Apply to both production and preview.
 */
export function cloudflarePagesBuildEnvPlain(): Record<string, string> {
  return {
    BUN_VERSION: CLOUDFLARE_PAGES.bunVersion,
    SKIP_DEPENDENCY_INSTALL: CLOUDFLARE_PAGES.skipDependencyInstall ? 'true' : 'false',
  };
}

/** Desired Pages build_config (Git integration). */
export function cloudflarePagesBuildConfig() {
  return {
    build_command: CLOUDFLARE_PAGES.buildCommand,
    destination_dir: CLOUDFLARE_PAGES.destinationDir,
    root_dir: CLOUDFLARE_PAGES.rootDir,
  } as const;
}

export const CLOUDFLARE_ZONE = {
  id: envString('CLOUDFLARE_ZONE_ID', CLOUDFLARE_DEFAULTS.zones.factoryWager.id),
  name: envString('CLOUDFLARE_ZONE_NAME', CLOUDFLARE_DEFAULTS.zones.factoryWager.name),
  missonControlId: CLOUDFLARE_DEFAULTS.zones.missonControl.id,
  missonControlName: CLOUDFLARE_DEFAULTS.zones.missonControl.name,
} as const;

export const WIKI_CONFIG = {
  host: envString('WIKI_BASE_URL', `https://${CLOUDFLARE_DEFAULTS.wikiHost}`),
  deployPath: envString('WIKI_DEPLOY_PATH'),
  /** GitHub Pages CNAME target; CF Pages serves `public/` for project-r-score. */
  cname: CLOUDFLARE_DEFAULTS.wikiHost,
} as const;

export type CloudflareEnvPresence = {
  key: string;
  set: boolean;
  /** True when value looks like a placeholder from .env.example */
  placeholder: boolean;
};

const PLACEHOLDER_RE =
  /^(your_|replace_me|changeme|xxx|TODO|place.?holder)/i;

function presence(key: string): CloudflareEnvPresence {
  const raw = Bun.env[key];
  const set = Boolean(raw && String(raw).trim());
  const placeholder = set && PLACEHOLDER_RE.test(String(raw).trim());
  return { key, set, placeholder };
}

/** Soft inventory — never prints secret values. */
export function describeCloudflareEnv(): {
  accountId: string; // brand-ok — status dump hex; callers brand via asAccountId when needed
  pages: typeof CLOUDFLARE_PAGES;
  zone: typeof CLOUDFLARE_ZONE;
  pagesBuildEnv: Record<string, string>;
  pagesBuildConfig: ReturnType<typeof cloudflarePagesBuildConfig>;
  secrets: CloudflareEnvPresence[];
  identity: CloudflareEnvPresence[];
  r2Ready: boolean;
  apiTokenReady: boolean;
} {
  const secrets = CLOUDFLARE_ENV_KEYS.secrets.map(presence);
  const identity = CLOUDFLARE_ENV_KEYS.identity.map(presence);
  const accessOk =
    presence('R2_ACCESS_KEY_ID').set &&
    !presence('R2_ACCESS_KEY_ID').placeholder &&
    presence('R2_SECRET_ACCESS_KEY').set &&
    !presence('R2_SECRET_ACCESS_KEY').placeholder;
  const token = presence('CLOUDFLARE_API_TOKEN');
  return {
    accountId: cloudflareAccountIdFromEnv(),
    pages: CLOUDFLARE_PAGES,
    zone: CLOUDFLARE_ZONE,
    pagesBuildEnv: cloudflarePagesBuildEnvPlain(),
    pagesBuildConfig: cloudflarePagesBuildConfig(),
    secrets,
    identity,
    r2Ready: Boolean(cloudflareAccountIdFromEnv() && accessOk),
    apiTokenReady: token.set && !token.placeholder,
  };
}

export function requireR2Config() {
  const missing: string[] = [];
  if (!cloudflareAccountIdFromEnv()) missing.push('R2_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID');
  if (!R2_CONFIG.accessKeyId || PLACEHOLDER_RE.test(R2_CONFIG.accessKeyId)) {
    missing.push('R2_ACCESS_KEY_ID');
  }
  if (!R2_CONFIG.secretAccessKey || PLACEHOLDER_RE.test(R2_CONFIG.secretAccessKey)) {
    missing.push('R2_SECRET_ACCESS_KEY');
  }
  if (!R2_CONFIG.cloudflareApiToken || PLACEHOLDER_RE.test(R2_CONFIG.cloudflareApiToken)) {
    missing.push('CLOUDFLARE_API_TOKEN');
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required R2 configuration: ${missing.join(', ')}. Set these in your .env file (see .env.example).`
    );
  }
  return R2_CONFIG;
}

/** API token for Cloudflare REST (domain manager / Pages PATCH). */
export function requireCloudflareApiToken(): string {
  const token = R2_CONFIG.cloudflareApiToken;
  if (!token || PLACEHOLDER_RE.test(token)) {
    throw new Error(
      'Missing CLOUDFLARE_API_TOKEN. Local ops may use `wrangler login`; CI needs an API token.'
    );
  }
  return token;
}

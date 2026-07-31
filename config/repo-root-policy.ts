/**
 * Root placement policy for the FactoryWager monorepo.
 *
 * Keep framework-required roots explicit and route generated output beneath
 * artifacts/. scripts/repo-hygiene.ts is the enforcement consumer.
 */

export interface RootIntegration {
  owner: string;
  purpose: string;
}

export interface RootOutputRoute {
  owner: string;
  target: string;
  action: string;
}

const CORE_ROOT_DIRECTORIES = [
  'archive',
  'artifacts',
  'assets',
  'config',
  'dashboard',
  'database',
  'docs',
  'examples',
  'functions',
  'herdr-worktrees',
  'Kalshi-bot',
  'lib',
  'logs',
  'node_modules',
  'packages',
  'plannator',
  'projects',
  'public',
  'reports',
  'scratch',
  'scripts',
  'server',
  'services',
  'spine',
  'src',
  'tests',
  'tools',
  'utils',
  'workers',
] as const;

/**
 * Top-level directories required by a concrete integration or source owner.
 * Adding a row is a policy decision, not a way to silence a hygiene finding.
 */
export const ROOT_INTEGRATIONS = {
  _includes: {
    owner: 'github-pages',
    purpose: 'Jekyll include root consumed by wiki.factory-wager.com',
  },
  'functions-bun-only': {
    owner: 'platform-routing',
    purpose: 'Bun runtime handlers kept separate from Cloudflare Pages edge functions',
  },
  jobs: {
    owner: 'operations',
    purpose: 'Operator-scheduled jobs with direct runtime entrypoints',
  },
  migrations: {
    owner: 'database',
    purpose: 'Ordered SQL migrations consumed by deployment operators',
  },
  warehouse: {
    owner: 'image-pipeline',
    purpose: 'Source media consumed by config/images.toml and images-generate',
  },
} as const satisfies Record<string, RootIntegration>;

export const ALLOWED_ROOT_DIRS = new Set<string>([
  ...CORE_ROOT_DIRECTORIES,
  ...Object.keys(ROOT_INTEGRATIONS),
]);

/** Known wrong-root directories and their durable owner destinations. */
export const ROOT_DIRECTORY_ROUTES = {
  'artifacts-browser': {
    owner: 'browser-export',
    target: 'artifacts/browser/',
    action: 'move browser exports to the artifact store',
  },
  research: {
    owner: 'kalshi-research',
    target: 'Kalshi-bot/research/cache/',
    action: 'run the nested research tool from its own repository',
  },
  snapshots: {
    owner: 'portal-snapshot',
    target: 'artifacts/snapshots/',
    action: 'use PORTAL_SNAPSHOT_DIR or the artifact-store default',
  },
} as const satisfies Record<string, RootOutputRoute>;

const ROOT_FILE_ROUTES: ReadonlyArray<{
  pattern: RegExp;
  route: RootOutputRoute;
}> = [
  {
    pattern: /^(?:temp-perf|test-integration)\.db$/,
    route: {
      owner: 'surgical-precision-tests',
      target: ':memory:',
      action: 'use an in-memory SQLite database in tests',
    },
  },
  {
    pattern: /^(?:test|test-integration|integration-test|large)-metafile\.json$/,
    route: {
      owner: 'bun-file-analyzer-tests',
      target: 'os temporary directory',
      action: 'await writes and cleanup outside the repository',
    },
  },
  {
    pattern: /^vulnerabilities\.db$/,
    route: {
      owner: 'fire22-security-scanner',
      target: 'dashboard-worker/vulnerabilities.db',
      action: 'resolve the database relative to its owning project',
    },
  },
  {
    pattern: /^shortcuts\.db$/,
    route: {
      owner: 'shortcut-registry',
      target: 'shortcut-registry/shortcuts.db',
      action: 'resolve the database relative to its owning project',
    },
  },
  {
    pattern: /^cascade_mover\.db$/,
    route: {
      owner: 'cascade-mover-v3',
      target: 'cascade-mover-v3 runtime store',
      action: 'run the nested product from its own repository',
    },
  },
];

export function rootOutputRoute(entry: string): RootOutputRoute | undefined {
  const normalized = entry.replace(/\/$/, '');
  const directoryRoute = ROOT_DIRECTORY_ROUTES[normalized as keyof typeof ROOT_DIRECTORY_ROUTES];
  if (directoryRoute) return directoryRoute;
  return ROOT_FILE_ROUTES.find(({ pattern }) => pattern.test(normalized))?.route;
}

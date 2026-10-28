export type ScriptOutboundAuthority =
  | 'api-fire22'
  | 'dashboard-bridge'
  | 'dashboard-local'
  | 'dashboard-monitor'
  | 'dashboard-worker-local'
  | 'deployment'
  | 'github-api'
  | 'httpbin'
  | 'package-registry'
  | 'private-registry'
  | 'worker-deployment';

export interface ScriptOutboundContract {
  readonly authority: ScriptOutboundAuthority;
  readonly origins: readonly string[];
  readonly methods: readonly string[];
  readonly credentialHeaders: readonly string[];
  readonly allowLoopback: boolean;
  readonly timeoutMs: number;
  readonly responseByteLimit: number;
  readonly path: (url: URL) => boolean;
}

const packageOrigins = [
  'https://registry.npmjs.org',
  'https://registry.yarnpkg.com',
  'https://registry.npmmirror.com',
  'https://cdn.jsdelivr.net',
  'https://npm.cloudflare.com',
  'https://packages.apexodds.net',
  'https://fire22.workers.dev',
] as const;

const deploymentOrigins = [
  'https://brendadeeznuts1111.github.io',
  'https://dashboard.fire22.ag',
  'https://fire22-dashboard.pages.dev',
  'https://staging.fire22-dashboard.pages.dev',
] as const;

const workerOrigins = [
  'https://dashboard-worker.nolarose1968-806.workers.dev',
  'https://dashboard-worker-development.nolarose1968-806.workers.dev',
  'https://dashboard-worker-staging.nolarose1968-806.workers.dev',
  'https://dashboard-worker.nolarose1968-806.workers.dev',
] as const;

const fire22ApiOrigins = [
  'https://api.fire22.com',
  'https://api.fire22.ag',
  'https://api.fire22.dev',
  'https://api.staging.fire22.com',
  'https://dev-api.fire22.com',
  'https://staging-api.fire22.com',
  'https://staging-api.fire22.ag',
  'https://test-api.fire22.ag',
  'https://fire22.ag',
] as const;

const anyPath = () => true;
const apiPath = (url: URL) =>
  url.pathname === '/health' || url.pathname === '/cloud/api/health';
const localApiPath = (url: URL) =>
  url.pathname === '/dashboard' || url.pathname === '/health' || url.pathname.startsWith('/api/');
const deploymentPath = (url: URL) =>
  url.pathname === '/' ||
  url.pathname.startsWith('/api/') ||
  url.pathname.startsWith('/departments') ||
  url.pathname.startsWith('/wiki') ||
  url.pathname.startsWith('/feeds') ||
  /^\/[a-z0-9-]+\/?$/.test(url.pathname) ||
  url.pathname.startsWith('/fire22-dashboard-worker');

export const SCRIPT_OUTBOUND_CONTRACTS: readonly ScriptOutboundContract[] = [
  {
    authority: 'package-registry',
    origins: packageOrigins,
    methods: ['GET', 'HEAD'],
    credentialHeaders: [],
    allowLoopback: false,
    timeoutMs: 12_000,
    responseByteLimit: 4_000_000,
    path: anyPath,
  },
  {
    authority: 'private-registry',
    origins: ['https://fire22-security-registry.nolarose1968-806.workers.dev'],
    methods: ['GET', 'HEAD'],
    credentialHeaders: ['authorization'],
    allowLoopback: false,
    timeoutMs: 10_000,
    responseByteLimit: 1_000_000,
    path: url => url.pathname === '/health',
  },
  {
    authority: 'deployment',
    origins: deploymentOrigins,
    methods: ['GET', 'HEAD'],
    credentialHeaders: [],
    allowLoopback: false,
    timeoutMs: 10_000,
    responseByteLimit: 4_000_000,
    path: deploymentPath,
  },
  {
    authority: 'worker-deployment',
    origins: workerOrigins,
    methods: ['GET', 'HEAD'],
    credentialHeaders: [],
    allowLoopback: false,
    timeoutMs: 10_000,
    responseByteLimit: 4_000_000,
    path: url => url.pathname === '/' || url.pathname.startsWith('/feeds/'),
  },
  {
    authority: 'github-api',
    origins: ['https://api.github.com'],
    methods: ['GET'],
    credentialHeaders: [],
    allowLoopback: false,
    timeoutMs: 10_000,
    responseByteLimit: 1_000_000,
    path: url => url.pathname === '/repos/brendadeeznuts1111/fire22-dashboard-worker/pages',
  },
  {
    authority: 'httpbin',
    origins: ['https://httpbin.org'],
    methods: ['GET'],
    credentialHeaders: [],
    allowLoopback: false,
    timeoutMs: 10_000,
    responseByteLimit: 100_000,
    path: url => url.pathname === '/user-agent',
  },
  {
    authority: 'api-fire22',
    origins: fire22ApiOrigins,
    methods: ['GET'],
    credentialHeaders: ['authorization'],
    allowLoopback: false,
    timeoutMs: 5_000,
    responseByteLimit: 1_000_000,
    path: apiPath,
  },
  ...([
    ['dashboard-local', 'http://localhost:3000'],
    ['dashboard-bridge', 'http://localhost:3001'],
    ['dashboard-monitor', 'http://localhost:8080'],
    ['dashboard-worker-local', 'http://localhost:8787'],
  ] as const).map(([authority, origin]) => ({
    authority,
    origins: [origin],
    methods: ['GET', 'HEAD', 'POST', 'PUT'],
    credentialHeaders: [],
    allowLoopback: true,
    timeoutMs: 10_000,
    responseByteLimit: 4_000_000,
    path: localApiPath,
  })),
];

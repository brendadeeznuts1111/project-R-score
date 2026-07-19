#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// tools/inspect-projects.ts — Project matrix inspection using Bun.inspect

console.clear();
console.info('╔═══════════════════════════════════════════════════════════════╗');
console.info('║         PROJECT MATRIX - Bun.inspect Table Visualization     ║');
console.info('╚═══════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// Define the complete project structure
// ============================================================================

const DEFAULT_PROJECT_PORT = parseInt(process.env.DEFAULT_PROJECT_PORT || '3000', 10);
const projects = [
  {
    name: 'my-bun-app',
    path: '/Users/ashley/PROJECTS/my-bun-app',
    description: 'Web server project',
    entryPoint: 'index.ts',
    status: 'active',
    port: DEFAULT_PROJECT_PORT,
    dependencies: ['express', 'cors', 'helmet'],
    envVars: ['NODE_ENV', 'DB_URL', 'SESSION_SECRET'],
    features: ['sessions', 'hmac', 'logging'],
  },
  {
    name: 'native-addon-tool',
    path: '/Users/ashley/PROJECTS/native-addon-tool',
    description: 'Native module builder',
    entryPoint: 'build.ts',
    status: 'active',
    port: null,
    dependencies: ['node-gyp', 'cmake', 'make'],
    envVars: ['BUILD_TARGET', 'NATIVE_ARCH'],
    features: ['cross-compile', 'bundling'],
  },
  {
    name: 'cli-dashboard',
    path: '/Users/ashley/PROJECTS/cli-dashboard',
    description: 'Interactive CLI dashboard',
    entryPoint: 'dashboard.ts',
    status: 'active',
    port: null,
    dependencies: ['blessed', 'term-kit'],
    envVars: ['LOG_LEVEL', 'THEME'],
    features: ['live-metrics', 'tui', 'system-monitor'],
  },
  {
    name: 'edge-worker',
    path: '/Users/ashley/PROJECTS/edge-worker',
    description: 'Edge function deployer',
    entryPoint: 'worker.ts',
    status: 'active',
    port: null,
    dependencies: ['@cloudflare/workers-types', 'wrangler'],
    envVars: ['DEPLOY_TARGET', 'KV_NAMESPACE'],
    features: ['deploy', 'bundle', 'kv-storage'],
  },
];

const cliTools = [
  {
    name: 'overseer-cli.ts',
    purpose: 'Monorepo manager',
    location: '/Users/nolarose/PROJECTS/tools/overseer-cli.ts',
    uses: ['Bun.main', 'Bun.spawn', 'entry guard'],
    commands: ['list', 'run', 'execute'],
    isolation: 'full',
  },
  {
    name: 'cli-resolver.ts',
    purpose: 'Project-specific binary resolution',
    location: '/Users/nolarose/PROJECTS/cli-resolver.ts',
    uses: ['Bun.which', 'Bun.spawn', 'Bun.main'],
    commands: ['typecheck', 'eslint', 'any binary'],
    isolation: 'project-local',
  },
  {
    name: 'guide-cli.ts',
    purpose: 'Advanced binary resolution demo',
    location: '/Users/nolarose/PROJECTS/utils/guide-cli.ts',
    uses: ['Bun.which', 'Bun.spawn', 'caching', 'diagnostics'],
    commands: ['--project', '--bin', '--args', '--diagnostics'],
    isolation: 'project-local + env',
  },
  {
    name: 'profiler.ts',
    purpose: 'CPU profiling with project isolation',
    location: '/Users/nolarose/PROJECTS/profiler.ts',
    uses: ['Bun.main', 'profile()', 'file outputs'],
    commands: ['--run', '--save', '--analyze'],
    isolation: 'file-based',
  },
  {
    name: 'server.ts',
    purpose: 'Web server with sessions',
    location: '/Users/nolarose/PROJECTS/server.ts',
    uses: ['Bun.serve', 'HMAC', 'cookies'],
    commands: ['start', 'dev'],
    isolation: 'session-based',
  },
  {
    name: 'terminal-tool.ts',
    purpose: 'Interactive PTY terminal',
    location: '/Users/nolarose/PROJECTS/utils/terminal-tool.ts',
    uses: ['Bun.Terminal', 'PTY', 'data events'],
    commands: ['interactive'],
    isolation: 'pty-session',
  },
];

// ============================================================================
// Demo 1: Simple projects table (depth: 0 - flat)
// ============================================================================

console.info('1️⃣  PROJECTS TABLE (depth: 0 - flat, no nested arrays)\n');
console.info(
  Bun.inspect(projects, {
    columns: true,
    depth: 0, // Don't expand arrays like dependencies, envVars, features
  })
);

console.info('\n' + '─'.repeat(80) + '\n');

// ============================================================================
// Demo 2: Projects with nested data (depth: 1 - show arrays)
// ============================================================================

console.info('2️⃣  PROJECTS WITH DEPENDENCIES & FEATURES (depth: 1 - single level)\n');
console.info(
  Bun.inspect(projects, {
    columns: true,
    depth: 1, // Show arrays but don't nest them further
    maxArrayLength: 3, // Limit array display to 3 items
  })
);

console.info('\n' + '─'.repeat(80) + '\n');

// ============================================================================
// Demo 3: Full depth projects table (depth: unlimited)
// ============================================================================

console.info('3️⃣  PROJECTS - FULL DEPTH (depth: null - show everything)\n');
console.info(
  Bun.inspect(projects, {
    columns: true,
    depth: null, // Unlimited depth
    maxArrayLength: 10,
  })
);

console.info('\n' + '─'.repeat(80) + '\n');

// ============================================================================
// Demo 4: CLI Tools table (depth: 0)
// ============================================================================

console.info('4️⃣  CLI TOOLS (depth: 0 - flat)\n');
console.info(
  Bun.inspect(cliTools, {
    columns: true,
    depth: 0,
  })
);

console.info('\n' + '─'.repeat(80) + '\n');

// ============================================================================
// Demo 5: CLI Tools with arrays (depth: 1)
// ============================================================================

console.info('5️⃣  CLI TOOLS WITH COMMANDS & USES (depth: 1)\n');
console.info(
  Bun.inspect(cliTools, {
    columns: true,
    depth: 1,
    maxArrayLength: 4,
  })
);

console.info('\n' + '─'.repeat(80) + '\n');

// ============================================================================
// Demo 6: Combined matrix view (projects + CLI as separate tables shows better)
// ============================================================================

console.info('6️⃣  COMBINED OVERVIEW\n');

const overview = {
  summary: {
    totalProjects: projects.length,
    totalCliTools: cliTools.length,
    platformHome: process.env.BUN_PLATFORM_HOME || process.env.HOME || '',
    runtime: 'Bun 1.2+',
  },
  projects,
  cliTools,
};

console.info(
  Bun.inspect(overview, {
    columns: true,
    depth: 0, // Flat tables for both
    maxArrayLength: 5,
  })
);

console.info('\n' + '─'.repeat(80) + '\n');

// ============================================================================
// Demo 7: Rich detail with full depth on nested overview
// ============================================================================

console.info('7️⃣  DETAILED NESTED VIEW (depth: 2)\n');

const detailedOverview = {
  platform: {
    BUN_PLATFORM_HOME: process.env.BUN_PLATFORM_HOME || process.env.HOME || '',
    runtime: Bun.version || '1.2.0',
    pid: process.pid,
    platform: Bun.platform,
    arch: Bun.arch,
  },
  projectsByStatus: projects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ),
  cliToolsByIsolation: cliTools.reduce(
    (acc, c) => {
      acc[c.isolation] = (acc[c.isolation] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ),
  projectList: projects,
  toolList: cliTools,
};

console.info(
  Bun.inspect(detailedOverview, {
    depth: 2,
    maxArrayLength: 5,
    columns: true, // This will format any arrays with columns
  })
);

console.info('\n' + '─'.repeat(80) + '\n');

// ============================================================================
// Demo 8: Quick reference - how to use Bun.inspect yourself
// ============================================================================

console.info('8️⃣  QUICK REFERENCE\n');
console.info('Usage:');
console.info('  Bun.inspect(data, {');
console.info('    columns: true,  // Format arrays as tables (key feature!)');
console.info('    depth: N,       // How deep to show nested objects (0, 1, 2, null)');
console.info('    maxArrayLength: N,  // Truncate long arrays');
console.info('    colors: true,   // ANSI colors (default in terminal)');
console.info('  })');
console.info('\nExamples:');
console.info('  Bun.inspect(projects, { columns: true, depth: 0 }) // flat table');
console.info('  Bun.inspect(projects, { columns: true, depth: 1 }) // show arrays');
console.info('  Bun.inspect(projects, { columns: true, depth: null }) // unlimited');
console.info('  Bun.inspect(projects, { depth: 0 }) // plain object (no columns)');

console.info('\n╔═══════════════════════════════════════════════════════════════╗');
console.info("║  Tip: Run with 'bun --depth 3 inspect-projects.ts' to set   ║");
console.info('║  global depth flag (affects all Bun.inspect calls)          ║');
console.info('╚═══════════════════════════════════════════════════════════════╝');

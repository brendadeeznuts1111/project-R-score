// utils/omega-tool-resolver.ts
// Enhanced tool resolver for Omega Phase 3.25

import { logInfo, logWarn } from "../core/shared/logger";

// Tool cache for performance optimization
const toolCache: Record<string, string | null> = {};

// Project root detection
export async function getProjectRoot(): Promise<string> {
  // Try multiple methods to find project root
  const possibleRoots = [
    process.cwd(),
    Bun.main ? Bun.main.split('/').slice(0, -1).join('/') : null,
    Bun.env.PWD
  ].filter(Boolean) as string[];

  // Look for package.json or similar markers
  for (const root of possibleRoots) {
    try {
      if (await Bun.file(`${root}/package.json`).exists()) {
        return root;
      }
    } catch {
      continue;
    }
  }

  return possibleRoots[0] || process.cwd();
}

// Enhanced resolver with local PATH support
export async function resolveLocalTool(
  tool: string,
  cwd?: string
): Promise<string | null> {
  const resolvedCwd = cwd || await getProjectRoot();
  const key = `${tool}:${resolvedCwd}`;

  // Check cache first
  if (key in toolCache) {
    return toolCache[key];
  }

  // Build local-aware PATH
  const localPath = [
    `${resolvedCwd}/node_modules/.bin`,
    `${resolvedCwd}/.bin`,
    `${resolvedCwd}/scripts`,
    Bun.env.PATH || ''
  ].join(':');

  // Temporarily set PATH for resolution
  const originalPath = Bun.env.PATH;
  Bun.env.PATH = localPath;

  // Resolve with custom PATH
  const result = Bun.which(tool, { cwd: resolvedCwd });

  // Restore original PATH
  Bun.env.PATH = originalPath;

  // Cache the result
  toolCache[key] = result;

  if (!result) {
    logWarn(`Tool not found: ${tool}`, { cwd: resolvedCwd, path: localPath });
  }

  return result;
}

// Fast cached resolver for hot paths
export function fastWhich(cmd: string, cwd?: string): string | null {
  const key = `${cmd}:${cwd || process.cwd()}`;

  if (toolCache[key] !== undefined) {
    return toolCache[key];
  }

  const result = cwd
    ? Bun.which(cmd, { cwd })
    : Bun.which(cmd);

  toolCache[key] = result;
  return result;
}

// System tool resolver (absolute paths only)
export function resolveSystemTool(tool: string): string | null {
  const systemPath = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin';
  return Bun.which(tool, {
    PATH: systemPath
  });
}

// Omega-specific tool resolution
export async function resolveOmegaTool(tool: string): Promise<string | null> {
  const projectRoot = await getProjectRoot();

  // Omega's preferred order
  const strategies = [
    async () => await resolveLocalTool(tool, projectRoot),           // Project-local first
    () => resolveSystemTool(tool),                       // System fallback
    () => Bun.which(tool),                               // Environment PATH last
  ];

  for (const strategy of strategies) {
    const result = await strategy();
    if (result) {
      logInfo(`Tool resolved: ${tool}`, {
        path: result,
        strategy: strategy.name
      });
      return result;
    }
  }

  logWarn(`Tool not found in any location: ${tool}`);
  return null;
}

// Bulk resolver for multiple tools
export async function resolveTools(tools: string[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};

  for (const tool of tools) {
    results[tool] = await resolveOmegaTool(tool);
  }

  return results;
}

// Validate all required tools
export async function validateRequiredTools(tools: string[]): Promise<{
  valid: boolean;
  missing: string[];
  found: Record<string, string>;
}> {
  const results = await resolveTools(tools);
  const missing = Object.entries(results)
    .filter(([_, path]) => !path)
    .map(([tool]) => tool);

  return {
    valid: missing.length === 0,
    missing,
    found: results as Record<string, string>
  };
}

// Clear cache (useful for testing or dynamic environments)
export function clearToolCache(): void {
  Object.keys(toolCache).forEach(key => delete toolCache[key]);
}

// Get tool resolution statistics
export function getToolStats(): {
  cacheSize: number;
  cachedTools: string[];
} {
  return {
    cacheSize: Object.keys(toolCache).length,
    cachedTools: Object.keys(toolCache)
  };
}

// Demo function
export async function demoToolResolution(): Promise<void> {
  console.log("🔥 Omega Tool Resolver Demo");
  console.log("========================\n");

  const projectRoot = await getProjectRoot();
  console.log(`Project root: ${projectRoot}\n`);

  // Test tools
  const testTools = ['bun', 'git', 'node', 'npm', 'ls', 'eslint'];

  console.log("Tool Resolution Results:");
  console.log("======================");

  for (const tool of testTools) {
    const local = await resolveLocalTool(tool);
    const system = resolveSystemTool(tool);
    const omega = await resolveOmegaTool(tool);

    console.log(`\n${tool}:`);
    console.log(`  Local (project): ${local || 'not found'}`);
    console.log(`  System: ${system || 'not found'}`);
    console.log(`  Omega (best): ${omega || 'not found'}`);
  }

  // Performance test
  console.log("\n\nPerformance Test:");
  console.log("================");

  const iterations = 1000;

  // Without cache
  clearToolCache();
  console.time(`${iterations}x without cache`);
  for (let i = 0; i < iterations; i++) {
    Bun.which('ls');
  }
  console.timeEnd(`${iterations}x without cache`);

  // With cache
  clearToolCache();
  console.time(`${iterations}x with cache`);
  for (let i = 0; i < iterations; i++) {
    fastWhich('ls');
  }
  console.timeEnd(`${iterations}x with cache`);

  // Cache stats
  const stats = getToolStats();
  console.log(`\nCache size: ${stats.cacheSize} tools`);

  // Validate required tools
  console.log("\n\nRequired Tools Validation:");
  console.log("==========================");

  const required = ['bun', 'git'];
  const validation = await validateRequiredTools(required);

  console.log(`Valid: ${validation.valid ? '✅' : '❌'}`);
  if (!validation.valid) {
    console.log(`Missing: ${validation.missing.join(', ')}`);
  }

  console.log("\n✅ Demo completed!");
}

// Export for direct execution
if (import.meta.path === Bun.main) {
  demoToolResolution().catch(console.error);
}

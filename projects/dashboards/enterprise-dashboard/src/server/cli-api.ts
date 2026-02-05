/**
 * CLI Tools API Endpoints
 * Exposes /analyze, /diagnose, and /! CLI tools via HTTP API
 * Enhanced with dedicated diagnose endpoints and JSON output support
 */

import { spawn } from "bun";
import { join } from "path";
import { homedir } from "os";

const CLI_DIR = join(import.meta.dir, "..", "cli");
const DIAGNOSE_SCRIPT = join(homedir(), ".claude", "scripts", "diagnose.ts");

// Cache for diagnose results (5 minute TTL, bounded size)
const diagnoseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_DIAGNOSE_CACHE_SIZE = 100;

/**
 * Evict oldest entries when cache exceeds size limit
 */
function evictStaleDiagnoseCache(): void {
  if (diagnoseCache.size <= MAX_DIAGNOSE_CACHE_SIZE) return;

  const now = Date.now();
  const entries = [...diagnoseCache.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.timestamp - b.timestamp); // Oldest first

  // Remove stale entries first
  for (const entry of entries) {
    if (now - entry.timestamp > CACHE_TTL) {
      diagnoseCache.delete(entry.key);
    }
  }

  // If still over limit, remove oldest
  while (diagnoseCache.size > MAX_DIAGNOSE_CACHE_SIZE) {
    const oldest = entries.shift();
    if (oldest) diagnoseCache.delete(oldest.key);
  }
}

interface CLIResponse {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

/**
 * Execute a CLI command and return JSON response
 */
async function executeCLI(
  script: string,
  args: string[] = [],
  options: { timeout?: number; cwd?: string } = {}
): Promise<CLIResponse> {
  const start = performance.now();
  const scriptPath = join(CLI_DIR, script);

  try {
    const proc = spawn(["bun", "run", scriptPath, ...args], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: options.cwd || process.cwd(),
    });

    // Collect output
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    const duration = performance.now() - start;

    return {
      success: exitCode === 0,
      output: stdout || stderr,
      error: exitCode !== 0 ? stderr : undefined,
      exitCode,
      duration: Math.round(duration * 100) / 100,
    };
  } catch (error) {
    const duration = performance.now() - start;
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      duration: Math.round(duration * 100) / 100,
    };
  }
}

/**
 * Analyze API endpoint
 * POST /api/cli/analyze
 */
export async function handleAnalyze(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const command = body.command || "scan";
  const args: string[] = [];

  // Parse options
  if (body.path) args.push(body.path);
  if (body.depth) args.push(`--depth=${body.depth}`);
  if (body.format) args.push(`--format=${body.format}`);
  if (body.exportedOnly) args.push("--exported-only");
  if (body.inheritance) args.push("--inheritance");
  if (body.dryRun) args.push("--dry-run");
  if (body.autoApply) args.push("--auto-apply");
  if (body.auto) args.push("--auto");
  if (body.byComplexity) args.push("--by-complexity");
  if (body.circular) args.push("--circular");

  const result = await executeCLI("analyze.ts", [command, ...args]);

  return Response.json({
    data: {
      command,
      args,
      ...result,
    },
  });
}

/**
 * Diagnose API endpoint
 * POST /api/cli/diagnose
 */
export async function handleDiagnose(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const command = body.command || "health";
  const args: string[] = [];

  // Parse options
  if (body.top) args.push(`--top=${body.top}`);
  if (body.format) args.push(`--format=${body.format}`);
  if (body.quick) args.push("--quick");
  if (body.deep) args.push("--deep");
  if (body.all) args.push("--all");
  if (body.stringwidth) args.push("--stringwidth");
  if (body.dce) args.push("--dce");

  const result = await executeCLI("diagnose.ts", [command, ...args]);

  return Response.json({
    data: {
      command,
      args,
      ...result,
    },
  });
}

/**
 * Execute diagnose script with JSON output
 */
async function executeDiagnose(
  command: string,
  args: string[] = [],
  options: { timeout?: number; cwd?: string; useCache?: boolean } = {}
): Promise<{ success: boolean; data: any; duration: number; error?: string }> {
  const cacheKey = `${command}:${args.join(":")}:${options.cwd || "."}`;

  // Check cache
  if (options.useCache !== false) {
    const cached = diagnoseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { success: true, data: cached.data, duration: 0 };
    }
  }

  const start = performance.now();

  try {
    const proc = spawn(["bun", "run", DIAGNOSE_SCRIPT, command, "--json", ...args], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: options.cwd || process.cwd(),
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    const duration = Math.round((performance.now() - start) * 100) / 100;

    if (exitCode !== 0) {
      return { success: false, data: null, duration, error: stderr || "Command failed" };
    }

    // Parse JSON output
    const data = JSON.parse(stdout);

    // Cache successful results (with bounds enforcement)
    diagnoseCache.set(cacheKey, { data, timestamp: Date.now() });
    evictStaleDiagnoseCache();

    return { success: true, data, duration };
  } catch (error) {
    const duration = Math.round((performance.now() - start) * 100) / 100;
    return {
      success: false,
      data: null,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Health Check API - Project health scores and metrics
 * GET/POST /api/diagnose/health
 */
export async function handleDiagnoseHealth(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || ".";
  const quick = url.searchParams.get("quick") === "true";

  const args: string[] = [path];
  if (quick) args.push("--quick");

  const result = await executeDiagnose("health", args);

  return Response.json({
    data: {
      command: "health",
      path,
      ...result,
    },
  });
}

/**
 * Grade Matrix API - Project grades across all projects
 * GET/POST /api/diagnose/grade
 */
export async function handleDiagnoseGrade(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || ".";
  const top = url.searchParams.get("top");

  const args: string[] = [path];
  if (top) args.push(`--top=${top}`);

  const result = await executeDiagnose("grade", args);

  return Response.json({
    data: {
      command: "grade",
      path,
      ...result,
    },
  });
}

/**
 * Painpoints API - Worst issues across projects
 * GET/POST /api/diagnose/painpoints
 */
export async function handleDiagnosePainpoints(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || ".";
  const top = url.searchParams.get("top");
  const filterCritical = url.searchParams.get("critical") === "true";

  const args: string[] = [path];
  if (top) args.push(`--top=${top}`);
  if (filterCritical) args.push("--filter-critical");

  const result = await executeDiagnose("painpoints", args);

  return Response.json({
    data: {
      command: "painpoints",
      path,
      ...result,
    },
  });
}

/**
 * Benchmark API - Performance metrics
 * GET/POST /api/diagnose/benchmark
 */
export async function handleDiagnoseBenchmark(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || ".";
  const quick = url.searchParams.get("quick") === "true";

  const args: string[] = [path];
  if (quick) args.push("--quick");

  // Benchmarks shouldn't be cached
  const result = await executeDiagnose("benchmark", args, { useCache: false });

  return Response.json({
    data: {
      command: "benchmark",
      path,
      ...result,
    },
  });
}

/**
 * Clear diagnose cache
 * POST /api/diagnose/cache/clear
 */
export async function handleDiagnoseCacheClear(): Promise<Response> {
  const size = diagnoseCache.size;
  diagnoseCache.clear();

  return Response.json({
    data: {
      cleared: size,
      message: `Cleared ${size} cached entries`,
    },
  });
}

/**
 * Bang (Quick Actions) API endpoint
 * POST /api/cli/bang
 */
export async function handleBang(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const action = body.action || "list";
  const args: string[] = [];

  // Pass through any additional args
  if (body.args && Array.isArray(body.args)) {
    args.push(...body.args);
  } else if (body.args && typeof body.args === "string") {
    args.push(body.args);
  }

  const result = await executeCLI("bang.ts", [action, ...args]);

  return Response.json({
    data: {
      action,
      args,
      ...result,
    },
  });
}

/**
 * List available CLI commands
 * GET /api/cli/commands
 */
export async function handleListCommands(): Promise<Response> {
  return Response.json({
    data: {
      analyze: {
        commands: ["scan", "types", "classes", "rename", "polish", "strength", "deps"],
        description: "Code analysis and refactoring tool",
      },
      diagnose: {
        commands: ["health", "painpoints", "grade", "benchmark"],
        description: "Project health and painpoint detection",
      },
      bang: {
        commands: ["list", "help"],
        description: "Quick actions and shortcuts system",
        actions: [
          { name: "health", aliases: ["h"], description: "Quick project health check" },
          { name: "test", aliases: ["t"], description: "Run tests" },
          { name: "dev", aliases: ["d"], description: "Start dev server" },
          { name: "build", aliases: ["b"], description: "Build project" },
          { name: "lint", aliases: ["l"], description: "Lint code" },
          { name: "format", aliases: ["f"], description: "Format code" },
          { name: "news", aliases: ["bn"], description: "Show latest Bun news" },
        ],
      },
    },
  });
}
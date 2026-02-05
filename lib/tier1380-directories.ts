// lib/tier1380-directories.ts — Node:fs integration for directory ops
import { readdir, mkdir, stat } from "node:fs/promises";

import { join, resolve } from "node:path";

/**
 * DIRECTORY OPERATION RISK ASSESSMENT
 *
 * Bun-native APIs: Bun.file(), Bun.write() — Risk: 1.x
 * Node:fs APIs: readdir, mkdir — Risk: 2.x (LOGIC_SWAP category)
 *
 * C = 2.0 (Using Node API instead of Bun-native)
 * E = 010 (Directory traversal edge cases)
 * S = 005 (5 lines scope)
 * V = 001 (File ordering dependencies)
 *
 * R = 2.0 + 0.010 + 0.000005 + 0.000000001 = 2.010005001
 */

interface DirectoryMetrics {
  operation: "readdir" | "mkdir" | "stat";
  path: string;
  entries: number;
  latencyNs: number;
  riskScore: number;
  fallback: "node:fs/promises";
}

export class Tier1380DirectoryScanner {
  /**
   * Scan projects directory with risk metrics
   */
  async scanProjectDirectories(rootPath: string): Promise<{
    projects: string[];
    metrics: DirectoryMetrics;
  }> {
    const startNs = Bun.nanoseconds();

    // Node:fs readdir (documented Bun approach)
    const entries = await readdir(rootPath, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory())
      .map(e => join(rootPath, e.name));

    const latencyNs = Number(Bun.nanoseconds() - startNs);

    const metrics: DirectoryMetrics = {
      operation: "readdir",
      path: rootPath,
      entries: dirs.length,
      latencyNs,
      riskScore: 2.010005001, // Node:fs = higher risk tier
      fallback: "node:fs/promises"
    };

    return { projects: dirs, metrics };
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir(path: string): Promise<DirectoryMetrics> {
    const startNs = Bun.nanoseconds();

    // Recursive mkdir via Node:fs
    await mkdir(path, { recursive: true });

    const latencyNs = Number(Bun.nanoseconds() - startNs);

    return {
      operation: "mkdir",
      path,
      entries: 0,
      latencyNs,
      riskScore: 2.010005001,
      fallback: "node:fs/promises"
    };
  }

  /**
   * Check if path is directory (for mixed scanning)
   */
  async isDirectory(path: string): Promise<boolean> {
    try {
      const s = await stat(path);
      return s.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 20-Column Directory Matrix
   */
  renderDirectoryMatrix(metrics: DirectoryMetrics[]): void {
    console.log(`\n\x1b[36m▵⟂⥂══════════════════════════════════════════════════════════════════════════════════════▵⟂⥂\x1b[0m`);
    console.log(`\x1b[36m  📁  DIRECTORY OPERATIONS — Node:fs Integration (Bun-native pending)\x1b[0m`);
    console.log(`\x1b[36m▵⟂⥂══════════════════════════════════════════════════════════════════════════════════════▵⟂⥸\x1b[0m\n`);
    console.log(`\x1b[90mNote: Bun-native directory API not yet implemented. Using node:fs/promises.\x1b[0m\n`);

    const table = metrics.map(m => ({
      Operation: m.operation,
      Path: m.path.split("/").pop() || "/",
      Entries: m.entries || "-",
      Latency: `${(m.latencyNs / 1e3).toFixed(2)}µs`,
      Risk: m.riskScore.toFixed(9),
      API: "\x1b[33mnode:fs\x1b[0m" // Yellow for non-native
    }));

    console.log(Bun.inspect.table(table, { colors: true }));

    const totalNs = metrics.reduce((a, m) => a + m.latencyNs, 0);
    console.log(`\n\x1b[36m◉ Total:\x1b[0m ${(totalNs / 1e6).toFixed(2)}ms │ \x1b[36mAPI:\x1b[0m node:fs/promises (documented) │ \x1b[36mRisk:\x1b[0m 2.010005001`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HYBRID SCANNER — Bun-native files + Node:fs directories
// ═══════════════════════════════════════════════════════════════════════════════
export async function hybridProjectScan(rootPath: string) {
  const scanner = new Tier1380DirectoryScanner();

  // Step 1: Directory scan (Node:fs) - Risk: 2.01
  const { projects, metrics: dirMetrics } = await scanner.scanProjectDirectories(rootPath);

  // Step 2: File operations (Bun-native) - Risk: 1.00
  const fileMetrics = [];
  for (const project of projects.slice(0, 5)) { // Sample first 5
    const pkgPath = join(project, "package.json");
    const s = Bun.nanoseconds();
    const exists = await Bun.file(pkgPath).exists();
    fileMetrics.push({
      project: project.split("/").pop(),
      exists,
      latency: Number(Bun.nanoseconds() - s),
      risk: 1.000001000 // Bun-native
    });
  }

  // Combined report
  console.log(`\n\x1b[36m◉ HYBRID SCAN COMPLETE\x1b[0m`);
  console.log(`\x1b[36mDirectories:\x1b[0m node:fs │ Risk: 2.010005001`);
  console.log(`\x1b[36mFiles:\x1b[0m Bun-native │ Risk: 1.000001000`);
  console.log(`\x1b[36mProjects:\x1b[0m ${projects.length} │ \x1b[36mPattern:\x1b[0m ▵⟂⥂`);

  return { projects, dirMetrics, fileMetrics };
}

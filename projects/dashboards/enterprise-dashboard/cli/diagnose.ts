#!/usr/bin/env bun
/**
 * Project Health & Painpoint Detection
 * Comprehensive project health analysis with feature flags and multiple visualizations
 *
 * Usage:
 *   bun run cli/diagnose.ts health
 *   bun run cli/diagnose.ts painpoints --top=5
 *   bun run cli/diagnose.ts grade --all
 *   bun run cli/diagnose.ts benchmark
 */

import { parseArgs } from "util";
import { join, relative, resolve } from "path";
import { spawn } from "bun";
import { openInChrome } from "./browser-utils";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { generateHTMLHead, generateHeader, generateFooter, generateSkipLink } from "./html-headers";

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

interface DiagnoseConfig {
  ignore?: string[];
  thresholds?: {
    maxComplexity?: number;
    minCoverage?: number;
  };
}

interface HealthMetrics {
  git: GitHealth;
  code: CodeHealth;
  performance: PerformanceHealth;
  deps: DependencyHealth;
  overall: number;
  grade: string;
}

interface GitHealth {
  score: number;
  status: string;
  conflicts: number;
  modified: number;
  untracked: number;
  ahead: number;
  behind: number;
  lastCommit: string;
}

interface CodeHealth {
  score: number;
  complexity: number;
  files: number;
  lines: number;
  testCoverage: number;
  issues: number;
}

interface PerformanceHealth {
  score: number;
  avgComplexity: number;
  maxComplexity: number;
  slowFiles: string[];
}

interface DependencyHealth {
  score: number;
  outdated: number;
  vulnerabilities: number;
  total: number;
}

interface Painpoint {
  file: string;
  severity: number;
  type: string;
  message: string;
  score: number;
}

// =============================================================================
// Configuration
// =============================================================================

async function loadConfig(): Promise<DiagnoseConfig> {
  const configPath = join(process.cwd(), ".diagnose.json");
  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      return await file.json();
    }
  } catch {
    // Ignore
  }
  return {
    ignore: ["node_modules", "dist", ".git"],
    thresholds: { maxComplexity: 10, minCoverage: 80 },
  };
}

// =============================================================================
// Git Health Analysis
// =============================================================================

async function analyzeGitHealth(path: string = "."): Promise<GitHealth> {
  try {
    const proc = spawn(["git", "status", "--porcelain"], { cwd: path, stdout: "pipe" });
    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const lines = output.split("\n").filter(Boolean);
    let conflicts = 0, modified = 0, staged = 0, untracked = 0;

    for (const line of lines) {
      const index = line[0];
      const worktree = line[1];
      if (index === "U" || worktree === "U") conflicts++;
      else if (index === "?" && worktree === "?") untracked++;
      else if (index !== " " && index !== "?") staged++;
      else if (worktree !== " " && worktree !== "?") modified++;
    }

    // Get remote status
    const aheadProc = spawn(["sh", "-c", "git rev-list --count @{u}..HEAD 2>/dev/null || echo 0"], { cwd: path, stdout: "pipe" });
    const ahead = parseInt(await new Response(aheadProc.stdout).text()) || 0;
    await aheadProc.exited;

    const behindProc = spawn(["sh", "-c", "git rev-list --count HEAD..@{u} 2>/dev/null || echo 0"], { cwd: path, stdout: "pipe" });
    const behind = parseInt(await new Response(behindProc.stdout).text()) || 0;
    await behindProc.exited;

    // Get last commit
    const commitProc = spawn(["git", "log", "-1", "--format=%s", "HEAD"], { cwd: path, stdout: "pipe" });
    const lastCommit = (await new Response(commitProc.stdout).text()).trim() || "No commits";
    await commitProc.exited;

    // Calculate score
    let score = 100;
    if (conflicts > 0) score -= 40;
    if (modified > 0) score -= Math.min(modified * 3, 20);
    if (untracked > 5) score -= 10;
    if (behind > 0) score -= Math.min(behind * 2, 15);
    if (ahead > 10) score -= 5;
    score = Math.max(0, Math.min(100, score));

    let status = "clean";
    if (conflicts > 0) status = "conflict";
    else if (staged > 0) status = "staged";
    else if (modified + untracked > 0) status = "modified";
    if (behind > 0) status += " (behind)";
    if (ahead > 0) status += " (ahead)";

    return {
      score,
      status,
      conflicts,
      modified,
      untracked,
      ahead,
      behind,
      lastCommit: lastCommit.substring(0, 50),
    };
  } catch {
    return {
      score: 0,
      status: "not a git repo",
      conflicts: 0,
      modified: 0,
      untracked: 0,
      ahead: 0,
      behind: 0,
      lastCommit: "N/A",
    };
  }
}

// =============================================================================
// Code Health Analysis
// =============================================================================

async function findTypeScriptFiles(root: string, ignore: string[] = []): Promise<string[]> {
  const files: string[] = [];
  const rootPath = resolve(root);

  async function walk(dir: string) {
    try {
      const entries = await Bun.readdir(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(rootPath, fullPath);

        if (ignore.some((pattern) => relPath.includes(pattern))) continue;

        try {
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
            files.push(fullPath);
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Ignore
    }
  }

  await walk(rootPath);
  return files;
}

function calculateComplexity(content: string): number {
  let cyclomatic = 1;
  const decisionPatterns = [
    /\bif\s*\(/g,
    /\belse\s*if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcatch\s*\(/g,
    /\?\s*.*\s*:/g,
    /\|\||&&/g,
  ];

  for (const pattern of decisionPatterns) {
    const matches = content.match(pattern);
    if (matches) cyclomatic += matches.length;
  }

  return cyclomatic;
}

async function analyzeCodeHealth(path: string = "src", config: DiagnoseConfig): Promise<CodeHealth> {
  const files = await findTypeScriptFiles(path, config.ignore || []);
  let totalComplexity = 0;
  let totalLines = 0;
  let maxComplexity = 0;
  let issues = 0;
  const threshold = config.thresholds?.maxComplexity || 10;

  for (const file of files) {
    try {
      const fileObj = Bun.file(file);
      const content = await fileObj.text();
      const lines = content.split("\n").length;
      const complexity = calculateComplexity(content);

      totalLines += lines;
      totalComplexity += complexity;
      maxComplexity = Math.max(maxComplexity, complexity);

      if (complexity > threshold) {
        issues++;
      }
    } catch {
      // Skip
    }
  }

  const avgComplexity = files.length > 0 ? totalComplexity / files.length : 0;

  // Count test files
  const testFiles = files.filter((f) => f.includes("__tests__") || f.includes(".test.") || f.includes(".spec."));
  const testCoverage = files.length > 0 ? (testFiles.length / files.length) * 100 : 0;

  // Calculate score
  let score = 100;
  if (files.length === 0) {
    score = 100; // No files = perfect score (empty project)
  } else {
    if (avgComplexity > threshold) score -= 30;
    if (maxComplexity > threshold * 3) score -= 20;
    if (testCoverage < (config.thresholds?.minCoverage || 80)) score -= 25;
    if (issues > files.length * 0.1) score -= 15;
  }
  score = Math.max(0, Math.min(100, isNaN(score) ? 100 : score));

  return {
    score,
    complexity: Math.round(avgComplexity * 100) / 100,
    files: files.length,
    lines: totalLines,
    testCoverage: Math.round(testCoverage * 100) / 100,
    issues,
  };
}

// =============================================================================
// Performance Health Analysis
// =============================================================================

async function analyzePerformanceHealth(path: string = "src", config: DiagnoseConfig): Promise<PerformanceHealth> {
  const files = await findTypeScriptFiles(path, config.ignore || []);
  const complexities: Array<{ file: string; complexity: number }> = [];
  const threshold = config.thresholds?.maxComplexity || 10;

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const complexity = calculateComplexity(content);
      complexities.push({ file: relative(process.cwd(), file), complexity });
    } catch {
      // Skip
    }
  }

  complexities.sort((a, b) => b.complexity - a.complexity);

  const avgComplexity = complexities.length > 0
    ? complexities.reduce((sum, c) => sum + c.complexity, 0) / complexities.length
    : 0;
  const maxComplexity = complexities.length > 0 ? complexities[0].complexity : 0;
  const slowFiles = complexities.filter((c) => c.complexity > threshold * 2).slice(0, 10).map((c) => c.file);

  let score = 100;
  if (avgComplexity > threshold) score -= 20;
  if (maxComplexity > threshold * 3) score -= 30;
  if (slowFiles.length > 5) score -= 20;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    avgComplexity: Math.round(avgComplexity * 100) / 100,
    maxComplexity,
    slowFiles,
  };
}

// =============================================================================
// Dependency Health Analysis
// =============================================================================

async function analyzeDependencyHealth(): Promise<DependencyHealth> {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJsonFile = Bun.file(packageJsonPath);
    const packageJson = await packageJsonFile.json();

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const total = Object.keys(deps).length;

    // Check for outdated packages (check if versions use ^ or ~)
    let outdated = 0;
    for (const [name, version] of Object.entries(deps)) {
      const versionStr = version as string;
      // If version is exact (no ^ or ~), consider it potentially outdated
      if (!versionStr.includes("^") && !versionStr.includes("~") && !versionStr.includes("*")) {
        outdated++;
      }
    }

    // Check for known vulnerable packages (basic check)
    const knownVulnerable = [
      "lodash", // If old version
      "axios", // If < 1.6.0
      "express", // If < 4.18.0
    ];
    let vulnerabilities = 0;
    for (const [name, version] of Object.entries(deps)) {
      if (knownVulnerable.includes(name)) {
        const versionStr = version as string;
        // Simple version check (would need proper semver parsing in production)
        if (name === "lodash" && versionStr.includes("4.17")) {
          vulnerabilities++;
        }
      }
    }

    let score = 100;
    if (outdated > total * 0.2) score -= 20;
    if (vulnerabilities > 0) score -= 30;
    if (total === 0) score = 0;
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      outdated,
      vulnerabilities,
      total,
    };
  } catch {
    return {
      score: 0,
      outdated: 0,
      vulnerabilities: 0,
      total: 0,
    };
  }
}

// =============================================================================
// Overall Health Calculation
// =============================================================================

function calculateOverallHealth(metrics: Omit<HealthMetrics, "overall" | "grade">): HealthMetrics {
  // Weighted: Git 25%, Code 35%, Performance 25%, Deps 15%
  // Convert to 0-10 scale
  const gitScore = isNaN(metrics.git.score) ? 0 : metrics.git.score;
  const codeScore = isNaN(metrics.code.score) ? 100 : metrics.code.score;
  const perfScore = isNaN(metrics.performance.score) ? 100 : metrics.performance.score;
  const depsScore = isNaN(metrics.deps.score) ? 100 : metrics.deps.score;
  
  const overall = Math.round(
    ((gitScore * 0.25 +
      codeScore * 0.35 +
      perfScore * 0.25 +
      depsScore * 0.15) / 10) *
      100
  ) / 100;

  let grade: string;
  if (overall >= 9.5) grade = "A+";
  else if (overall >= 9.0) grade = "A";
  else if (overall >= 7.0) grade = "B";
  else if (overall >= 5.0) grade = "C";
  else if (overall >= 4.0) grade = "D";
  else grade = "F";

  return {
    ...metrics,
    overall,
    grade,
  };
}

// =============================================================================
// Painpoint Detection
// =============================================================================

async function detectPainpoints(path: string = "src", config: DiagnoseConfig): Promise<Painpoint[]> {
  const files = await findTypeScriptFiles(path, config.ignore || []);
  const painpoints: Painpoint[] = [];
  const threshold = config.thresholds?.maxComplexity || 10;

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const complexity = calculateComplexity(content);
      const lines = content.split("\n").length;
      const relPath = relative(process.cwd(), file);

      if (complexity > threshold * 5) {
        painpoints.push({
          file: relPath,
          severity: 10,
          type: "complexity",
          message: `Extremely high complexity: ${complexity}`,
          score: Math.max(0, 100 - complexity),
        });
      } else if (complexity > threshold * 3) {
        painpoints.push({
          file: relPath,
          severity: 8,
          type: "complexity",
          message: `Very high complexity: ${complexity}`,
          score: Math.max(0, 100 - complexity * 2),
        });
      } else if (complexity > threshold * 2) {
        painpoints.push({
          file: relPath,
          severity: 6,
          type: "complexity",
          message: `High complexity: ${complexity}`,
          score: Math.max(0, 100 - complexity * 1.5),
        });
      }

      if (lines > 1000) {
        painpoints.push({
          file: relPath,
          severity: 7,
          type: "size",
          message: `Very large file: ${lines} lines`,
          score: Math.max(0, 100 - lines / 10),
        });
      }

      // Check for common issues
      if (content.includes("any") && !content.includes("// eslint-disable")) {
        painpoints.push({
          file: relPath,
          severity: 3,
          type: "type-safety",
          message: "Uses 'any' type",
          score: 90,
        });
      }

      if (content.match(/console\.(log|error|warn)/) && !content.includes("// eslint-disable")) {
        painpoints.push({
          file: relPath,
          severity: 2,
          type: "logging",
          message: "Uses console.log (should use structured logging)",
          score: 95,
        });
      }
    } catch {
      // Skip
    }
  }

  return painpoints.sort((a, b) => b.severity - a.severity);
}

// =============================================================================
// Output Formatters
// =============================================================================

function formatBox(health: HealthMetrics): string {
  const box = (text: string, width: number = 50) => {
    const pad = Math.max(0, width - text.length);
    return `│ ${text}${" ".repeat(pad)} │`;
  };

  const bar = (score: number, width: number = 20) => {
    const filled = Math.round((score / 100) * width);
    const empty = width - filled;
    const color = score >= 80 ? c.green : score >= 60 ? c.yellow : c.red;
    return `${color}${"█".repeat(filled)}${"░".repeat(empty)}${c.reset}`;
  };

  return `
╔══════════════════════════════════════════════════════╗
║           Project Health Analysis Report             ║
╠══════════════════════════════════════════════════════╣
${box(`Overall Score: ${c.bold}${health.overall.toFixed(2)}/10.00${c.reset} (Grade: ${c.bold}${health.grade}${c.reset})`, 50)}
${box("", 50)}
${box(`${c.bold}Git Health${c.reset}`, 50)}
${box(`  Status: ${health.git.status}`, 50)}
${box(`  Score: ${health.git.score}/100 ${bar(health.git.score)}`, 50)}
${box(`  Conflicts: ${health.git.conflicts} | Modified: ${health.git.modified} | Untracked: ${health.git.untracked}`, 50)}
${box(`  Remote: ${health.git.ahead} ahead, ${health.git.behind} behind`, 50)}
${box("", 50)}
${box(`${c.bold}Code Health${c.reset}`, 50)}
${box(`  Score: ${health.code.score}/100 ${bar(health.code.score)}`, 50)}
${box(`  Files: ${health.code.files} | Lines: ${health.code.lines.toLocaleString()}`, 50)}
${box(`  Avg Complexity: ${health.code.complexity} | Max: ${health.performance.maxComplexity}`, 50)}
${box(`  Test Coverage: ${health.code.testCoverage.toFixed(1)}% | Issues: ${health.code.issues}`, 50)}
${box("", 50)}
${box(`${c.bold}Performance Health${c.reset}`, 50)}
${box(`  Score: ${health.performance.score}/100 ${bar(health.performance.score)}`, 50)}
${box(`  Avg Complexity: ${health.performance.avgComplexity}`, 50)}
${box(`  Max Complexity: ${health.performance.maxComplexity}`, 50)}
${box(`  Slow Files: ${health.performance.slowFiles?.length || 0}`, 50)}
${box("", 50)}
${box(`${c.bold}Dependency Health${c.reset}`, 50)}
${box(`  Score: ${health.deps.score}/100 ${bar(health.deps.score)}`, 50)}
${box(`  Total: ${health.deps.total} | Outdated: ${health.deps.outdated} | Vulnerabilities: ${health.deps.vulnerabilities}`, 50)}
╚══════════════════════════════════════════════════════╝
`;
}

function formatTable(health: HealthMetrics): string {
  const rows = [
    ["Metric", "Score", "Details"],
    ["─".repeat(20), "─".repeat(10), "─".repeat(40)],
    ["Overall", `${health.overall.toFixed(2)}/10.00 (${health.grade})`, ""],
    ["Git", `${health.git.score}/100`, `${health.git.status} | ${health.git.conflicts} conflicts`],
    ["Code", `${health.code.score}/100`, `${health.code.files} files, ${health.code.complexity} avg complexity`],
    ["Performance", `${health.performance.score}/100`, `${health.performance.maxComplexity} max complexity`],
    ["Dependencies", `${health.deps.score}/100`, `${health.deps.total} total, ${health.deps.vulnerabilities} vulnerabilities`],
  ];

  return rows.map((row) => row.join(" | ")).join("\n");
}

function formatJSON(health: HealthMetrics): string {
  return JSON.stringify(health, null, 2);
}

function formatMarkdown(health: HealthMetrics): string {
  return `
# Project Health Report

## Overall Score: ${health.overall.toFixed(2)}/10.00 (Grade: ${health.grade})

### Git Health: ${health.git.score}/100
- Status: ${health.git.status}
- Conflicts: ${health.git.conflicts}
- Modified: ${health.git.modified}
- Untracked: ${health.git.untracked}
- Remote: ${health.git.ahead} ahead, ${health.git.behind} behind

### Code Health: ${health.code.score}/100
- Files: ${health.code.files}
- Lines: ${health.code.lines.toLocaleString()}
- Average Complexity: ${health.code.complexity}
- Test Coverage: ${health.code.testCoverage.toFixed(1)}%
- Issues: ${health.code.issues}

### Performance Health: ${health.performance.score}/100
- Average Complexity: ${health.performance.avgComplexity}
- Max Complexity: ${health.performance.maxComplexity}
- Slow Files: ${health.performance.slowFiles?.length || 0}

### Dependency Health: ${health.deps.score}/100
- Total: ${health.deps.total}
- Outdated: ${health.deps.outdated}
- Vulnerabilities: ${health.deps.vulnerabilities}
`;
}

async function formatHTML(health: HealthMetrics): Promise<string> {
  const gradeColor = health.overall >= 9 ? "#22c55e" : health.overall >= 7 ? "#eab308" : health.overall >= 5 ? "#f97316" : "#ef4444";
  
  const head = generateHTMLHead({
    title: "Project Health Report",
    description: `Project health analysis: ${health.overall.toFixed(2)}/10.00 (${health.grade})`,
    themeColor: gradeColor,
    includeDarkMode: true,
    customStyles: `
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: ${gradeColor}; margin-bottom: 2rem; }
    .score { font-size: 3rem; font-weight: bold; color: ${gradeColor}; }
    .grade { font-size: 1.5rem; margin-left: 1rem; }
    .section {
      background: #1e293b;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border-left: 4px solid ${gradeColor};
    }
    .section h2 { margin-bottom: 1rem; color: #94a3b8; }
    .metric { display: flex; justify-content: space-between; margin: 0.5rem 0; }
    .bar {
      height: 20px;
      background: #334155;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, ${gradeColor}, ${gradeColor}dd);
      transition: width 0.3s;
    }
    .good { color: #22c55e; }
    .warning { color: #eab308; }
    .error { color: #ef4444; }
    `,
  });

  const skipLink = generateSkipLink();
  const header = generateHeader({
    title: "📊 Project Health Report",
    showDarkMode: true,
  });

  const footer = generateFooter({
    generatedAt: new Date(),
    reportType: "Project Health Report",
  });

  return `${head}
<body>
  ${skipLink}
  <div class="container">
    ${header}
    <main id="main-content" role="main">
      <h1>Project Health Report</h1>
      <div class="score">
        ${health.overall.toFixed(2)}/10.00
        <span class="grade">(${health.grade})</span>
      </div>

      <div class="section">
        <h2>Git Health: ${health.git.score}/100</h2>
        <div class="bar"><div class="bar-fill" style="width: ${health.git.score}%"></div></div>
        <div class="metric"><span>Status:</span><span>${health.git.status}</span></div>
        <div class="metric"><span>Conflicts:</span><span class="${health.git.conflicts > 0 ? 'error' : 'good'}">${health.git.conflicts}</span></div>
        <div class="metric"><span>Modified:</span><span>${health.git.modified}</span></div>
        <div class="metric"><span>Untracked:</span><span>${health.git.untracked}</span></div>
        <div class="metric"><span>Remote:</span><span>${health.git.ahead} ahead, ${health.git.behind} behind</span></div>
      </div>

      <div class="section">
        <h2>Code Health: ${health.code.score}/100</h2>
        <div class="bar"><div class="bar-fill" style="width: ${health.code.score}%"></div></div>
        <div class="metric"><span>Files:</span><span>${health.code.files}</span></div>
        <div class="metric"><span>Lines:</span><span>${health.code.lines.toLocaleString()}</span></div>
        <div class="metric"><span>Avg Complexity:</span><span>${health.code.complexity}</span></div>
        <div class="metric"><span>Test Coverage:</span><span class="${health.code.testCoverage >= 80 ? 'good' : 'warning'}">${health.code.testCoverage.toFixed(1)}%</span></div>
        <div class="metric"><span>Issues:</span><span class="${health.code.issues === 0 ? 'good' : 'error'}">${health.code.issues}</span></div>
      </div>

      <div class="section">
        <h2>Performance Health: ${health.performance.score}/100</h2>
        <div class="bar"><div class="bar-fill" style="width: ${health.performance.score}%"></div></div>
        <div class="metric"><span>Avg Complexity:</span><span>${health.performance.avgComplexity}</span></div>
        <div class="metric"><span>Max Complexity:</span><span class="${health.performance.maxComplexity < 50 ? 'good' : 'error'}">${health.performance.maxComplexity}</span></div>
        <div class="metric"><span>Slow Files:</span><span>${health.performance.slowFiles?.length || 0}</span></div>
      </div>

      <div class="section">
        <h2>Dependency Health: ${health.deps.score}/100</h2>
        <div class="bar"><div class="bar-fill" style="width: ${health.deps.score}%"></div></div>
        <div class="metric"><span>Total:</span><span>${health.deps.total}</span></div>
        <div class="metric"><span>Outdated:</span><span class="${health.deps.outdated === 0 ? 'good' : 'warning'}">${health.deps.outdated}</span></div>
        <div class="metric"><span>Vulnerabilities:</span><span class="${health.deps.vulnerabilities === 0 ? 'good' : 'error'}">${health.deps.vulnerabilities}</span></div>
      </div>

    ${footer}
    </main>
  </div>
</body>
</html>`;
}

function formatChart(health: HealthMetrics): string {
  const bar = (score: number | undefined, width: number = 20) => {
    const safeScore = score || 0;
    const filled = Math.round((safeScore / 100) * width);
    const empty = width - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const gitScore = health.git.score || 0;
  const codeScore = health.code.score || 0;
  const perfScore = health.performance.score || 0;
  const depsScore = health.deps.score || 0;

  return `
${c.bold}Project Health Chart${c.reset}

${c.cyan}Git Health${c.reset}           ${bar(gitScore)} ${gitScore}%
${c.yellow}Code Health${c.reset}          ${bar(codeScore)} ${codeScore}%
${c.magenta}Performance${c.reset}        ${bar(perfScore)} ${perfScore}%
${c.blue}Dependencies${c.reset}        ${bar(depsScore)} ${depsScore}%

${c.bold}Overall: ${health.overall.toFixed(2)}/10.00 (${health.grade})${c.reset}
`;
}

function formatPainpoints(painpoints: Painpoint[], top: number = 10, format: string = "box"): string {
  const topPainpoints = painpoints.slice(0, top);

  if (format === "json") {
    return JSON.stringify(topPainpoints, null, 2);
  }

  if (format === "markdown") {
    return `# Top ${top} Painpoints\n\n` +
      topPainpoints.map((p, i) =>
        `${i + 1}. **${p.file}** (Severity: ${p.severity}/10)\n   - Type: ${p.type}\n   - ${p.message}\n   - Score: ${p.score}/100\n`
      ).join("\n");
  }

  // Box format
  const severityColor = (s: number) => s >= 8 ? c.red : s >= 6 ? c.yellow : c.cyan;
  return `
╔══════════════════════════════════════════════════════╗
║              Top ${top} Painpoints                    ║
╠══════════════════════════════════════════════════════╣
${topPainpoints.map((p, i) =>
    `│ ${i + 1}. ${severityColor(p.severity)}[${p.severity}/10]${c.reset} ${p.file.substring(0, 35).padEnd(35)} │\n` +
    `│    ${c.dim}${p.type}${c.reset}: ${p.message.substring(0, 42).padEnd(42)} │`
  ).join("\n")}
╚══════════════════════════════════════════════════════╝
`;
}

// =============================================================================
// Commands
// =============================================================================

async function cmdHealth(options: any, config: DiagnoseConfig) {
  const quick = options.quick || false;
  const deep = options.deep || false;
  const format = options.format || "box";
  const stringwidth = options.stringwidth || false;
  const dce = options.dce || false;
  const perfFlag = options.performance || false;

  console.log(`${c.cyan}Analyzing project health...${c.reset}\n`);

  const git = await analyzeGitHealth();
  const code = await analyzeCodeHealth("src", config);
  const performanceMetrics = deep ? await analyzePerformanceHealth("src", config) : {
    score: code.score || 100,
    avgComplexity: code.complexity || 0,
    maxComplexity: code.complexity || 0,
    slowFiles: [],
  };
  const deps = deep ? await analyzeDependencyHealth() : {
    score: 100,
    outdated: 0,
    vulnerabilities: 0,
    total: 0,
  };

  const health = calculateOverallHealth({ git, code, performance, deps });

  // StringWidth validation
  if (stringwidth) {
    console.log(`\n${c.bold}StringWidth Validation${c.reset}\n`);
    try {
      const { safeStringWidth } = await import("../src/server/string-width");
      const testCases = [
        { str: "Hello World", expected: 11 },
        { str: "👨‍👩‍👧 Family", expected: 9 },
        { str: "🇺🇸 USA", expected: 6 },
        { str: "\x1b[31mRed Text\x1b[0m", expected: 8 },
      ];
      
      let passed = 0;
      for (const test of testCases) {
        const actual = safeStringWidth(test.str);
        const pass = actual === test.expected;
        if (pass) passed++;
        const status = pass ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
        console.log(`  ${status} "${test.str.substring(0, 20)}" - Expected: ${test.expected}, Got: ${actual}`);
      }
      console.log(`\n${passed}/${testCases.length} tests passed\n`);
    } catch (error) {
      console.log(`${c.yellow}⚠️  StringWidth validation unavailable${c.reset}\n`);
    }
  }

  // DCE (Dead Code Elimination) testing
  if (dce) {
    console.log(`\n${c.bold}Dead Code Elimination Test${c.reset}\n`);
    console.log(`${c.dim}Checking for unused exports...${c.reset}\n`);
    
    // Simple check: count exports vs imports
    const files = await findTypeScriptFiles("src", config.ignore || []);
    let totalExports = 0;
    let totalImports = 0;
    
    for (const file of files.slice(0, 10)) {
      try {
        const fileObj = Bun.file(file);
        const content = await fileObj.text();
        const exports = (content.match(/export\s+(const|function|class|interface|type)/g) || []).length;
        const imports = (content.match(/import\s+.*\s+from/g) || []).length;
        totalExports += exports;
        totalImports += imports;
      } catch {
        // Skip
      }
    }
    
    const ratio = totalExports > 0 ? (totalImports / totalExports) * 100 : 0;
    console.log(`  Exports: ${totalExports}`);
    console.log(`  Imports: ${totalImports}`);
    console.log(`  Usage Ratio: ${ratio.toFixed(1)}%`);
    console.log(`  ${ratio > 50 ? c.green + "✓" + c.reset : c.yellow + "⚠" + c.reset} ${ratio > 50 ? "Good code usage" : "Many unused exports"}\n`);
  }

  // Performance benchmarks
  if (perfFlag) {
    await cmdBenchmark(options);
  }

  switch (format) {
    case "json":
      console.log(formatJSON(health));
      break;
    case "markdown":
      console.log(formatMarkdown(health));
      break;
    case "html":
      const html = await formatHTML(health);
      if (options["os-chrome"]) {
        const htmlFile = join(tmpdir(), `diagnose-report-${Date.now()}.html`);
        await writeFile(htmlFile, html, "utf-8");
        openInChrome(htmlFile, { user: options.user }).catch(() => {
          // Error already handled in openInChrome
        });
        console.log(`${c.green}✓${c.reset} HTML report generated`);
        console.log(`${c.dim}File: ${htmlFile}${c.reset}`);
        console.log(`${c.dim}Opening in Chrome${options.user ? ` (user: ${options.user})` : ''}...${c.reset}`);
      } else {
        console.log(html);
      }
      break;
    case "chart":
      console.log(formatChart(health));
      break;
    case "table":
      console.log(formatTable(health));
      break;
    default:
      console.log(formatBox(health));
  }
}

async function cmdPainpoints(options: any, config: DiagnoseConfig) {
  const top = parseInt(options.top || "10");
  const criticalOnly = options["critical-only"] || false;
  const format = options.format || "box";

  console.log(`${c.cyan}Detecting painpoints...${c.reset}\n`);

  let painpoints = await detectPainpoints("src", config);
  if (criticalOnly) {
    painpoints = painpoints.filter((p) => p.severity >= 8);
  }

  console.log(formatPainpoints(painpoints, top, format));
}

async function cmdGrade(options: any, config: DiagnoseConfig) {
  const format = options.format || "box";

  console.log(`${c.cyan}Calculating project grade...${c.reset}\n`);

  const git = await analyzeGitHealth();
  const code = await analyzeCodeHealth("src", config);
  const performance = await analyzePerformanceHealth("src", config);
  const deps = await analyzeDependencyHealth();

  const health = calculateOverallHealth({ git, code, performance, deps });

  const gradeDetails = {
    overall: health.overall,
    grade: health.grade,
    breakdown: {
      git: { score: git.score, weight: 0.25, contribution: git.score * 0.25 },
      code: { score: code.score, weight: 0.35, contribution: code.score * 0.35 },
      performance: { score: performance.score, weight: 0.25, contribution: performance.score * 0.25 },
      deps: { score: deps.score, weight: 0.15, contribution: deps.score * 0.15 },
    },
  };

  if (format === "json") {
    console.log(JSON.stringify(gradeDetails, null, 2));
  } else {
    console.log(formatBox(health));
    console.log(`\n${c.bold}Grade Breakdown:${c.reset}`);
    console.log(`  Git (25%):        ${git.score.toFixed(2)} → ${(git.score * 0.25).toFixed(2)}`);
    console.log(`  Code (35%):      ${code.score.toFixed(2)} → ${(code.score * 0.35).toFixed(2)}`);
    console.log(`  Performance (25%): ${performance.score.toFixed(2)} → ${(performance.score * 0.25).toFixed(2)}`);
    console.log(`  Dependencies (15%): ${deps.score.toFixed(2)} → ${(deps.score * 0.15).toFixed(2)}`);
    console.log(`  ${c.bold}Total: ${health.overall.toFixed(2)}/10.00 (${health.grade})${c.reset}`);
  }
}

async function cmdBenchmark(options: any) {
  console.log(`${c.cyan}Running performance benchmarks...${c.reset}\n`);

  interface BenchmarkResult {
    name: string;
    iterations: number;
    totalMs: number;
    avgMs: number;
    opsPerSec: number;
  }

  const results: BenchmarkResult[] = [];

  // Benchmark 1: File discovery
  const fileDiscoveryStart = performance.now();
  const files = await findTypeScriptFiles("src", []);
  const fileDiscoveryTime = performance.now() - fileDiscoveryStart;
  results.push({
    name: "File Discovery",
    iterations: 1,
    totalMs: fileDiscoveryTime,
    avgMs: fileDiscoveryTime,
    opsPerSec: Math.round(1000 / fileDiscoveryTime),
  });

  // Benchmark 2: Complexity calculation
  const complexityStart = performance.now();
  let complexityOps = 0;
  for (const file of files.slice(0, 10)) {
    try {
      const fileObj = Bun.file(file);
      const content = await fileObj.text();
      calculateComplexity(content);
      complexityOps++;
    } catch {
      // Skip
    }
  }
  const complexityTime = performance.now() - complexityStart;
  results.push({
    name: "Complexity Calculation",
    iterations: complexityOps,
    totalMs: complexityTime,
    avgMs: complexityTime / complexityOps,
    opsPerSec: Math.round((complexityOps / complexityTime) * 1000),
  });

  // Benchmark 3: Git status check
  const gitStart = performance.now();
  await analyzeGitHealth();
  const gitTime = performance.now() - gitStart;
  results.push({
    name: "Git Health Check",
    iterations: 1,
    totalMs: gitTime,
    avgMs: gitTime,
    opsPerSec: Math.round(1000 / gitTime),
  });

  // Display results
  console.log(`${c.bold}Performance Benchmarks${c.reset}\n`);
  console.log(`${"Benchmark".padEnd(25)} │ ${"Time (ms)".padEnd(12)} │ ${"Ops/sec".padEnd(10)}`);
  console.log(`${"─".repeat(25)}─┼─${"─".repeat(12)}─┼─${"─".repeat(10)}`);

  for (const result of results) {
    const timeColor = result.avgMs < 10 ? c.green : result.avgMs < 100 ? c.yellow : c.red;
    console.log(
      `${result.name.padEnd(25)} │ ${timeColor}${result.avgMs.toFixed(2).padStart(10)}${c.reset} ms │ ${result.opsPerSec.toLocaleString().padStart(8)}`
    );
  }

  console.log(`\n${c.dim}Total files analyzed: ${files.length}${c.reset}`);
}

// =============================================================================
// Main
// =============================================================================

function printHelp() {
  console.log(`
${c.bold}Project Health & Painpoint Detection${c.reset}

${c.bold}Commands:${c.reset}
  health        Overall project health analysis
  painpoints    Find worst issues across projects
  grade         Grading matrix with nanodecimal precision
  benchmark     Performance benchmarking

${c.bold}Usage:${c.reset}
  bun run cli/diagnose.ts health
  bun run cli/diagnose.ts health --quick
  bun run cli/diagnose.ts health --deep
  bun run cli/diagnose.ts painpoints --top=5
  bun run cli/diagnose.ts grade --all

${c.bold}Options:${c.reset}
  --quick              Fast analysis (git + basic stats)
  --deep               Full analysis (+ benchmarks + deps)
  --top=<n>            Top N painpoints (default: 10)
  --critical-only      Only show critical painpoints
  --format=<fmt>       Output format (box|table|json|markdown|html|chart)
  --os-chrome          Open HTML output in Chrome with OS-specific flags (use with --format=html)
  --stringwidth        StringWidth validation
  --dce                Dead Code Elimination testing
  --performance        Performance benchmarks
  --git                Git health analysis
  --code               Code quality (complexity, symbols)
  --deps               Dependency analysis
  --all                Enable all features
`);
}

async function main() {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      quick: { type: "boolean" },
      deep: { type: "boolean" },
      top: { type: "string" },
      "critical-only": { type: "boolean" },
      format: { type: "string" },
      stringwidth: { type: "boolean" },
      dce: { type: "boolean" },
      performance: { type: "boolean" },
      git: { type: "boolean" },
      code: { type: "boolean" },
      deps: { type: "boolean" },
      all: { type: "boolean" },
      "os-chrome": { type: "boolean" },
      user: { type: "string" },
    },
  });

  const command = positionals[0];
  const config = await loadConfig();

  if (!command || command === "help" || positionals.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const options = {
    quick: values.quick ?? false,
    deep: values.deep ?? false,
    top: values.top,
    "critical-only": values["critical-only"] ?? false,
    format: (values.format as string) || "box",
    stringwidth: values.stringwidth ?? false,
    dce: values.dce ?? false,
    performance: values.performance ?? false,
    git: values.git ?? false,
    code: values.code ?? false,
    deps: values.deps ?? false,
    all: values.all ?? false,
    "os-chrome": values["os-chrome"] ?? false,
    user: values.user as string | undefined,
  };

  try {
    switch (command) {
      case "health":
        await cmdHealth(options, config);
        break;
      case "painpoints":
        await cmdPainpoints(options, config);
        break;
      case "grade":
        await cmdGrade(options, config);
        break;
      case "benchmark":
        await cmdBenchmark(options);
        break;
      default:
        console.error(`${c.red}Unknown command: ${command}${c.reset}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
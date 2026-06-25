import type { Project } from "../types";
import { config } from "./config";

interface GitStatus {
  modified: number;
  staged: number;
  untracked: number;
  conflicts: number;
}

// Concurrency limiter with priority queue to prevent EAGAIN errors
// Priority 1 = high (user-initiated), Priority 10 = low (background scan)
const MAX_CONCURRENT_SPAWNS = 8;
let activeSpawns = 0;
const spawnQueue: Array<{ priority: number; resolve: () => void }> = [];

// Insert into queue maintaining priority order (lower number = higher priority)
function enqueue(priority: number, resolve: () => void) {
  const entry = { priority, resolve };
  // Binary search insert for O(log n) insertion
  let lo = 0, hi = spawnQueue.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (spawnQueue[mid].priority <= priority) lo = mid + 1;
    else hi = mid;
  }
  spawnQueue.splice(lo, 0, entry);
}

// Dequeue highest priority (lowest number)
function dequeue(): (() => void) | undefined {
  return spawnQueue.shift()?.resolve;
}

async function withConcurrencyLimit<T>(fn: () => Promise<T>, priority = 5): Promise<T> {
  // Wait for a slot if at capacity
  if (activeSpawns >= MAX_CONCURRENT_SPAWNS) {
    await new Promise<void>(resolve => enqueue(priority, resolve));
  }

  activeSpawns++;
  try {
    return await fn();
  } finally {
    activeSpawns--;
    // Release highest priority task in queue
    const next = dequeue();
    if (next) next();
  }
}

// Export priority constants for external use
export const PRIORITY = {
  USER_ACTION: 1,   // User clicked a project - scan immediately
  REFRESH: 3,       // Manual refresh button
  PERIODIC: 5,      // Regular interval scans
  BACKGROUND: 10,   // Initial startup scan
} as const;

// Export queue stats for system metrics visibility
export function getQueueStats() {
  return {
    active: activeSpawns,
    pending: spawnQueue.length,
    maxConcurrent: MAX_CONCURRENT_SPAWNS,
    isThrottled: activeSpawns >= MAX_CONCURRENT_SPAWNS,
    utilizationPercent: Math.round((activeSpawns / MAX_CONCURRENT_SPAWNS) * 100),
  };
}

async function exec(cmd: string, cwd: string, priority: number = PRIORITY.PERIODIC): Promise<string> {
  return withConcurrencyLimit(async () => {
    const proc = Bun.spawn(["sh", "-c", cmd], { cwd, stdout: "pipe", stderr: "pipe" });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    return output.trim();
  }, priority);
}

async function getGitStatus(repoPath: string, priority: number = PRIORITY.PERIODIC): Promise<GitStatus> {
  const output = await exec("git status --porcelain 2>/dev/null", repoPath, priority);
  const lines = output.split("\n").filter(Boolean);

  let modified = 0, staged = 0, untracked = 0, conflicts = 0;

  for (const line of lines) {
    const index = line[0];
    const worktree = line[1];

    if (index === "U" || worktree === "U") conflicts++;
    else if (index === "?" && worktree === "?") untracked++;
    else if (index !== " " && index !== "?") staged++;
    else if (worktree !== " " && worktree !== "?") modified++;
  }

  return { modified, staged, untracked, conflicts };
}

async function getRemoteStatus(repoPath: string, priority: number = PRIORITY.PERIODIC): Promise<{ ahead: number; behind: number }> {
  // Fetch silently in background (lowest priority)
  exec("git fetch --quiet 2>/dev/null &", repoPath, PRIORITY.BACKGROUND);

  const ahead = await exec("git rev-list --count @{u}..HEAD 2>/dev/null || echo 0", repoPath, priority);
  const behind = await exec("git rev-list --count HEAD..@{u} 2>/dev/null || echo 0", repoPath, priority);

  return {
    ahead: parseInt(ahead) || 0,
    behind: parseInt(behind) || 0,
  };
}

async function getLastCommit(repoPath: string, priority: number = PRIORITY.PERIODIC): Promise<{ message: string; date: Date }> {
  const message = await exec("git log -1 --format=%s 2>/dev/null || echo 'No commits'", repoPath, priority);
  const dateStr = await exec("git log -1 --format=%cI 2>/dev/null || echo ''", repoPath, priority);

  return {
    message: message.slice(0, 80),
    date: dateStr ? new Date(dateStr) : new Date(),
  };
}

async function getBranch(repoPath: string, priority: number = PRIORITY.PERIODIC): Promise<string> {
  const branch = await exec("git branch --show-current 2>/dev/null", repoPath, priority);
  if (branch) return branch;

  // Detached HEAD - get short SHA
  const sha = await exec("git rev-parse --short HEAD 2>/dev/null", repoPath, priority);
  return sha ? `detached:${sha}` : "unknown";
}

function calculateHealth(status: GitStatus, ahead: number, behind: number): number {
  let health = 100;

  // Deduct for local changes
  if (status.conflicts > 0) health -= 40;
  if (status.modified > 0) health -= Math.min(status.modified * 3, 20);
  if (status.untracked > 5) health -= 10;

  // Deduct for remote divergence
  if (behind > 0) health -= Math.min(behind * 2, 15);
  if (ahead > 10) health -= 5;

  return Math.max(0, Math.min(100, health));
}

// Scan a single repo with configurable priority
// Use PRIORITY.USER_ACTION for user-initiated scans (e.g., clicking a project)
export async function scanRepo(
  repoPath: string,
  id: string,
  priority: number = PRIORITY.PERIODIC
): Promise<Project | null> {
  try {
    const name = repoPath.split("/").filter(Boolean).pop() || "unknown";

    // Pass priority to all git commands for proper queue ordering
    const [branch, gitStatus, remoteStatus, lastCommit] = await Promise.all([
      getBranch(repoPath, priority),
      getGitStatus(repoPath, priority),
      getRemoteStatus(repoPath, priority),
      getLastCommit(repoPath, priority),
    ]);

    const totalChanges = gitStatus.modified + gitStatus.staged + gitStatus.untracked;

    let status: Project["status"] = "clean";
    if (gitStatus.conflicts > 0) status = "conflict";
    else if (gitStatus.staged > 0) status = "staged";
    else if (totalChanges > 0) status = "modified";

    let remote: Project["remote"] = "up-to-date";
    if (remoteStatus.ahead > 0 && remoteStatus.behind > 0) remote = "diverged";
    else if (remoteStatus.ahead > 0) remote = "ahead";
    else if (remoteStatus.behind > 0) remote = "behind";

    return {
      id,
      name,
      branch,
      status,
      modifiedFiles: totalChanges,
      remote,
      aheadBy: remoteStatus.ahead,
      behindBy: remoteStatus.behind,
      lastCommit: lastCommit.message,
      lastActivity: lastCommit.date,
      health: calculateHealth(gitStatus, remoteStatus.ahead, remoteStatus.behind),
    };
  } catch (error) {
    console.error(`Error scanning ${repoPath}:`, error);
    return null;
  }
}

export async function discoverRepos(baseDir: string = config.PROJECTS_DIR, depth: number = config.SCAN_DEPTH): Promise<string[]> {
  // Use find command - simple and reliable
  const cmd = `find "${baseDir}" -maxdepth ${depth + 1} -name ".git" -type d 2>/dev/null`;
  const proc = Bun.spawn(["sh", "-c", cmd], { stdout: "pipe", stderr: "pipe" });
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((gitPath) => gitPath.replace(/\/\.git$/, ""));
}

// Scan all repos with configurable priority
// Initial startup uses BACKGROUND priority to not block user interactions
export async function scanAllRepos(
  baseDir?: string,
  priority: number = PRIORITY.BACKGROUND
): Promise<Project[]> {
  const repoPaths = await discoverRepos(baseDir);

  // Use Promise.all but each scan respects the concurrency limit
  const projects = await Promise.all(
    repoPaths.map((path, i) => scanRepo(path, String(i + 1), priority))
  );

  return projects
    .filter((p): p is Project => p !== null)
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
}

// High-priority scan for a single project (user clicked on it)
export async function scanRepoByName(
  projectName: string,
  baseDir = config.PROJECTS_DIR
): Promise<Project | null> {
  const repoPaths = await discoverRepos(baseDir);
  const repoPath = repoPaths.find(p => p.endsWith(`/${projectName}`));

  if (!repoPath) return null;

  // Use USER_ACTION priority - jumps to front of queue
  return scanRepo(repoPath, projectName, PRIORITY.USER_ACTION);
}

// Get total commit count for a repo
export async function getCommitCount(repoPath: string, priority: number = PRIORITY.PERIODIC): Promise<number> {
  const count = await exec("git rev-list --count HEAD 2>/dev/null || echo 0", repoPath, priority);
  return parseInt(count) || 0;
}

// Get tracked file count for a repo
export async function getFileCount(repoPath: string, priority: number = PRIORITY.PERIODIC): Promise<number> {
  const count = await exec("git ls-files | wc -l", repoPath, priority);
  return parseInt(count.trim()) || 0;
}

// Get repo path for a project name
export async function getRepoPath(projectName: string, baseDir = config.PROJECTS_DIR): Promise<string | null> {
  const repoPaths = await discoverRepos(baseDir);
  return repoPaths.find(p => p.endsWith(`/${projectName}`)) || null;
}

// Enhanced project metrics with commits and files
export interface EnhancedProjectMetrics {
  id: string;
  name: string;
  files: number;
  commits: number;
  branch: string;
  path: string;
  health: number;
  status: string;
}

// Get enhanced metrics for top N projects
export async function getEnhancedProjectMetrics(
  projects: Project[],
  topN = 5,
  baseDir = config.PROJECTS_DIR
): Promise<EnhancedProjectMetrics[]> {
  const repoPaths = await discoverRepos(baseDir);

  // Sort by health desc, then by name
  const sorted = [...projects].sort((a, b) => b.health - a.health);
  const top = sorted.slice(0, topN);

  return Promise.all(
    top.map(async (proj) => {
      const repoPath = repoPaths.find(p => p.endsWith(`/${proj.name}`)) || "";
      const [files, commits] = await Promise.all([
        repoPath ? getFileCount(repoPath, PRIORITY.USER_ACTION) : 0,
        repoPath ? getCommitCount(repoPath, PRIORITY.USER_ACTION) : 0,
      ]);

      // Shorten path for display
      const homedir = process.env.HOME || "~";
      const shortPath = repoPath.replace(homedir, "~").slice(0, 28);

      return {
        id: proj.id,
        name: proj.name,
        files,
        commits,
        branch: proj.branch,
        path: shortPath + (repoPath.length > 28 ? "..." : ""),
        health: proj.health,
        status: proj.status,
      };
    })
  );
}

// Get aggregate git activity stats
export async function getGitActivityStats(projects: Project[]): Promise<{
  totalCommits24h: number;
  totalFilesChanged: number;
  stagedProjects: number;
  modifiedProjects: number;
  conflictProjects: number;
}> {
  return {
    totalCommits24h: 0, // Would need git log --since for real data
    totalFilesChanged: projects.reduce((sum, p) => sum + p.modifiedFiles, 0),
    stagedProjects: projects.filter(p => p.status === "staged").length,
    modifiedProjects: projects.filter(p => p.status === "modified").length,
    conflictProjects: projects.filter(p => p.status === "conflict").length,
  };
}

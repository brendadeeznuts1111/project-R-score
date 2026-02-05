/**
 * Project Benchmark using Mitata
 * Tests git operations per project
 * 
 * Based on Bun's benchmark structure: https://github.com/oven-sh/bun/tree/main/bench
 */

import { bench, group, run } from "./utils";
import { scanRepo, discoverRepos } from "../../src/server/git-scanner";

// Get project path from command line or use default
const projectPath = process.argv[2] || process.env.PROJECT_PATH || process.env.HOME + "/Projects";

group("Git Operations Performance", async () => {
  // Discover repositories
  const repos = await discoverRepos(projectPath, 2);
  
  if (repos.length === 0) {
    console.warn("No repositories found. Set PROJECT_PATH environment variable or pass as argument.");
    return;
  }

  // Use first repository for benchmarking
  const repoPath = repos[0];
  const repoName = repoPath.split("/").filter(Boolean).pop() || "unknown";

  bench(`scanRepo: ${repoName}`, async () => {
    await scanRepo(repoPath, "1");
  });

  // Note: Individual git operations (getBranch, getGitStatus, etc.) are not exported
  // from git-scanner.ts, so we benchmark scanRepo which internally calls them all
  // For more granular benchmarks, export those functions from git-scanner.ts
});

await run();

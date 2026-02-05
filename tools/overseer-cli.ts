#!/usr/bin/env bun
/**
 * Overseer CLI - Root project manager for Bun platform projects
 * Manages multiple projects from $BUN_PLATFORM_HOME with per-project isolation
 */

import { ensureDirectExecution } from "../shared/tools/entry-guard.ts";
ensureDirectExecution();

import { which, spawn } from "bun";
import fs from "bun:fs";

console.log(`Overseer running from: ${Bun.main}`);

// Discover projects (subdirs with package.json)
const projects = fs.readdirSync(Bun.cwd).filter(dir =>
  fs.existsSync(`${Bun.cwd}/${dir}/package.json`)
);

if (projects.length === 0) {
  console.error("No projects found (subdirectories with package.json required)");
  Bun.exit(1);
}

console.log("Available projects:");
console.table(projects.map(p => ({ name: p, path: `${Bun.cwd}/${p}` })));

// Run command in specific project
function runInProject(projectName: string, cmd: string[]) {
  const projectHome = `${Bun.cwd}/${projectName}`;

  // Verify project exists
  if (!fs.existsSync(projectHome)) {
    console.error(`Project not found: ${projectHome}`);
    return;
  }

  // Resolve binary with project-specific PATH
  const binPath = which(cmd[0], {
    cwd: projectHome,
    PATH: `${projectHome}/node_modules/.bin:${process.env.PATH || ""}`
  });

  if (!binPath) {
    console.error(`Command not found in ${projectHome}: ${cmd[0]}`);
    return;
  }

  console.log(`[${projectName}] Running: ${cmd.join(" ")}`);
  const proc = spawn([binPath, ...cmd.slice(1)], {
    cwd: projectHome,
    stdio: "inherit",
    env: {
      ...process.env,
      PROJECT_HOME: projectHome,
      BUN_PLATFORM_HOME: Bun.cwd
    }
  });

  return proc.exited;
}

// CLI argument parsing
const args = Bun.argv.slice(2);

if (args.length < 2) {
  console.log(`
Usage:
  bun tools/overseer-cli.ts <project> <command> [args...]

Examples:
  bun tools/overseer-cli.ts my-bun-app bun run dev
  bun tools/overseer-cli.ts cli-dashboard bun run start
  bun tools/overseer-cli.ts edge-worker bun run deploy

List available projects:
  bun tools/overseer-cli.ts
`);
  Bun.exit(0);
}

const [projectName, ...cmdArgs] = args;
runInProject(projectName, cmdArgs).then(exitCode => {
  if (exitCode !== undefined && exitCode !== 0) {
    Bun.exit(exitCode);
  }
});

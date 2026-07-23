#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// tools/overseer-cli.ts — Root project manager for Bun platform projects

import { which, spawn } from 'bun';
import { ensureDirectExecution } from '../lib/shared/tools/entry-guard';

ensureDirectExecution();

const cwd = process.cwd();

console.info(`Overseer running from: ${Bun.main}`);

// Discover projects (subdirs with package.json)
const projects = [...new Bun.Glob('*/package.json').scanSync({ cwd })].map(rel =>
  rel.replace(/\/package\.json$/, '')
);

if (projects.length === 0) {
  console.error('No projects found (subdirectories with package.json required)');
  process.exit(1);
}

console.info('Available projects:');
console.table(projects.map(p => ({ name: p, path: `${cwd}/${p}` })));

async function runInProject(projectName: string, cmd: string[]): Promise<number | undefined> {
  const projectHome = `${cwd}/${projectName}`;
  const pkg = Bun.file(`${projectHome}/package.json`);
  if (!(await pkg.exists())) {
    console.error(`Project not found: ${projectHome}`);
    return;
  }

  const bin = cmd[0];
  if (bin === undefined) {
    console.error(`[${projectName}] empty command`);
    return;
  }

  const binPath = which(bin, {
    cwd: projectHome,
    PATH: `${projectHome}/node_modules/.bin:${Bun.env.PATH || ''}`,
  });

  if (!binPath) {
    console.error(`Command not found in ${projectHome}: ${bin}`);
    return;
  }

  console.info(`[${projectName}] Running: ${cmd.join(' ')}`);
  const proc = spawn([binPath, ...cmd.slice(1)], {
    cwd: projectHome,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: {
      ...Bun.env,
      PROJECT_HOME: projectHome,
      BUN_PLATFORM_HOME: cwd,
    },
  });

  return proc.exited;
}

const args = Bun.argv.slice(2);

if (args.length < 2) {
  console.info(`
Usage:
  bun tools/overseer-cli.ts <project> <command> [args...]

Examples:
  bun tools/overseer-cli.ts my-bun-app bun run dev
  bun tools/overseer-cli.ts cli-dashboard bun run start
  bun tools/overseer-cli.ts edge-worker bun run deploy

List available projects:
  bun tools/overseer-cli.ts
`);
  process.exit(0);
}

const projectName = args[0];
const cmdArgs = args.slice(1);
if (projectName === undefined) process.exit(1);

void runInProject(projectName, cmdArgs).then(exitCode => {
  if (exitCode !== undefined && exitCode !== 0) {
    process.exit(exitCode);
  }
});

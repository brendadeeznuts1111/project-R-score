#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// tools/overseer-cli.ts — Root project manager for Bun platform projects

import { ensureDirectExecution } from '../lib/shared/tools/entry-guard';
ensureDirectExecution();

import { which, spawn } from 'bun';
import { logTable } from '../lib/console-depth';

console.info(`Overseer running from: ${Bun.main}`);

// Discover projects (subdirs with package.json)
const projects = [...new Bun.Glob('*/package.json').scanSync({ cwd: Bun.cwd })].map(rel =>
  rel.replace(/\/package\.json$/, '')
);

if (projects.length === 0) {
  console.error('No projects found (subdirectories with package.json required)');
  Bun.exit(1);
}

console.info('Available projects:');
logTable(
  projects.map(p => ({ name: p, path: `${Bun.cwd}/${p}` })),
  ['name', 'path']
);

async function runInProject(projectName: string, cmd: string[]) {
  const projectHome = `${Bun.cwd}/${projectName}`;

  if (Bun.peek(Bun.file(`${projectHome}/package.json`).exists()) !== true) {
    console.error(`Project not found: ${projectHome}`);
    return;
  }

  const binPath = which(cmd[0], {
    cwd: projectHome,
    PATH: `${projectHome}/node_modules/.bin:${Bun.env.PATH || ''}`,
  });

  if (!binPath) {
    console.error(`Command not found in ${projectHome}: ${cmd[0]}`);
    return;
  }

  console.info(`[${projectName}] Running: ${cmd.join(' ')}`);
  const proc = spawn([binPath, ...cmd.slice(1)], {
    cwd: projectHome,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...Bun.env,
      PROJECT_HOME: projectHome,
      BUN_PLATFORM_HOME: Bun.cwd,
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
  Bun.exit(0);
}

const [projectName, ...cmdArgs] = args;
runInProject(projectName, cmdArgs).then(exitCode => {
  if (exitCode !== undefined && exitCode !== 0) {
    Bun.exit(exitCode);
  }
});

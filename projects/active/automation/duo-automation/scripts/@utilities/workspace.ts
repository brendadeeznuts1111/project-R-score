#!/usr/bin/env bun

// Workspace build script for Duo Automation
import { spawn } from 'bun';

const workspaces = ['cli', 'components', 'utils', 'modules'];

async function buildWorkspace(name: string) {
  console.info(`🔨 Building ${name} workspace...`);
  
  try {
    const result = await Bun.spawn({
      cmd: ['bun', 'build', 'index.ts', '--outdir', 'dist'],
      cwd: `./${name}`,
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const [stdout, stderr] = await Promise.all([
      new Response(result.stdout).text(),
      new Response(result.stderr).text()
    ]);

    if (await result.exited === 0) {
      console.info(`✅ ${name} built successfully`);
    } else {
      console.error(`❌ ${name} build failed:`, stderr);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name} build error:`, error);
    return false;
  }
  
  return true;
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'build') {
    console.info('🚀 Building all workspaces...');
    
    for (const workspace of workspaces) {
      const success = await buildWorkspace(workspace);
      if (!success) {
        process.exit(1);
      }
    }
    
    console.info('🎉 All workspaces built successfully!');
  } else if (command === 'clean') {
    console.info('🧹 Cleaning all workspaces...');
    
    for (const workspace of workspaces) {
      await Bun.$`rm -rf ${workspace}/dist`.quiet().nothrow();
    }
    
    await Bun.$`rm -rf .bun-cache`.quiet().nothrow();
    console.info('✅ All workspaces cleaned!');
  } else {
    console.info('Usage: bun run scripts/workspace.ts [build|clean]');
  }
}

main().catch(console.error);

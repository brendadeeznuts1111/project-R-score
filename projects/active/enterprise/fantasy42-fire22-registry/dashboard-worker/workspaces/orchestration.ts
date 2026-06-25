#!/usr/bin/env bun

/**
 * 🎼 Enhanced Fire22 Workspace Orchestration with Bun Isolated Installs
 * Manage all isolated workspaces with strict dependency isolation
 */

const args = process.argv.slice(2);
const command = args[0] || 'help';

const workspaces = [
  '@fire22-core-dashboard',
  '@fire22-pattern-system',
  '@fire22-api-client',
  '@fire22-sports-betting',
  '@fire22-telegram-integration',
  '@fire22-build-system',
];

switch (command) {
  case 'build:linked':
    console.info('🔗 Building all linked workspaces...');
    for (const ws of workspaces) {
      await Bun.$`cd ${ws} && bun run build`;
    }
    break;

  case 'build:standalone':
    console.info('📦 Building all standalone workspaces...');
    for (const ws of workspaces) {
      await Bun.$`cd ${ws} && bun run build:standalone`;
    }
    break;

  case 'install:isolated':
    console.info('🔒 Installing all workspaces with isolated strategy...');
    for (const ws of workspaces) {
      await Bun.$`cd ${ws} && bun install --linker isolated`;
    }
    break;

  case 'test:all':
    console.info('🧪 Testing all workspaces...');
    for (const ws of workspaces) {
      await Bun.$`cd ${ws} && bun test`;
    }
    break;

  default:
    console.info(
      'Usage: bun orchestration.ts [build:linked|build:standalone|install:isolated|test:all]'
    );
    console.info('');
    console.info('Commands:');
    console.info('  build:linked      - Build all workspaces in linked mode');
    console.info('  build:standalone  - Build all workspaces in standalone mode');
    console.info('  install:isolated  - Install all dependencies with Bun isolated strategy');
    console.info('  test:all         - Run tests for all workspaces');
}

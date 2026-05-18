#!/usr/bin/env bun

/**
 * DuoPlus Development Tools
 * Comprehensive CLI for development, testing, and deployment
 */

import shellUtils from '../src/cli/shellUtils';

const commands = {
  async build() {
    console.info('🔨 Building project...');
    const result = await shellUtils.runBuild();
    if (result.success) {
      console.info('✅ Build completed successfully');
    } else {
      console.error('❌ Build failed:', result.stderr);
      process.exit(1);
    }
  },

  async test() {
    console.info('🧪 Running tests...');
    const result = await shellUtils.runTests();
    console.info(result.stdout);
    if (!result.success) {
      console.error('❌ Tests failed');
      process.exit(1);
    }
  },

  async lint() {
    console.info('🔍 Linting code...');
    const result = await shellUtils.lintCode(['src/', 'cli/']);
    console.info(result.stdout);
    if (!result.success) {
      console.warn('⚠️ Linting issues found');
    }
  },

  async format() {
    console.info('✨ Formatting code...');
    const result = await shellUtils.formatCode(['src/', 'cli/', 'web-app/']);
    console.info(result.stdout);
  },

  async typecheck() {
    console.info('📝 Type checking...');
    const result = await shellUtils.checkTypeScript();
    if (result.success) {
      console.info('✅ No type errors');
    } else {
      console.error('❌ Type errors found:', result.stderr);
      process.exit(1);
    }
  },

  async install() {
    console.info('📦 Installing dependencies...');
    const result = await shellUtils.installDependencies('bun');
    if (result.success) {
      console.info('✅ Dependencies installed');
    } else {
      console.error('❌ Installation failed:', result.stderr);
      process.exit(1);
    }
  },

  async clean() {
    console.info('🧹 Cleaning build artifacts...');
    await shellUtils.removeFiles(['dist/', 'build/', '.bun/', 'node_modules/.cache']);
    console.info('✅ Cleaned');
  },

  async status() {
    console.info('📊 Git Status:');
    const status = await shellUtils.getGitStatus();
    console.info(status || 'Working directory clean');

    console.info('\n📜 Recent Commits:');
    const log = await shellUtils.getGitLog(5);
    console.info(log);
  },

  async info() {
    console.info('ℹ️ System Information:');
    const info = await shellUtils.getSystemInfo();
    Object.entries(info).forEach(([key, value]) => {
      console.info(`  ${key}: ${value}`);
    });

    console.info('\n📊 Project Statistics:');
    const lines = await shellUtils.countLines('src/');
    console.info(`  Lines of code: ${lines}`);

    const size = await shellUtils.getFileSize('.');
    console.info(`  Project size: ${size}`);
  },

  async dev() {
    console.info('🚀 Starting development server...');
    const result = await shellUtils.executeCommand('bun run web-app/server.js', {
      verbose: true,
    });
    if (!result.success) {
      console.error('❌ Server failed to start:', result.stderr);
      process.exit(1);
    }
  },

  async deploy(target: string = 'production') {
    console.info(`🚀 Deploying to ${target}...`);
    
    // Run tests first
    console.info('Running tests before deployment...');
    const testResult = await shellUtils.runTests();
    if (!testResult.success) {
      console.error('❌ Tests failed, aborting deployment');
      process.exit(1);
    }

    // Build
    console.info('Building for deployment...');
    const buildResult = await shellUtils.runBuild();
    if (!buildResult.success) {
      console.error('❌ Build failed, aborting deployment');
      process.exit(1);
    }

    console.info(`✅ Ready to deploy to ${target}`);
  },

  async help() {
    console.info(`
DuoPlus Development Tools

Usage: bun run cli/dev-tools.ts <command> [options]

Commands:
  build       Build the project
  test        Run tests
  lint        Lint code
  format      Format code with prettier
  typecheck   Check TypeScript types
  install     Install dependencies
  clean       Clean build artifacts
  status      Show git status and recent commits
  info        Show system and project information
  dev         Start development server
  deploy      Deploy application
  help        Show this help message

Examples:
  bun run cli/dev-tools.ts build
  bun run cli/dev-tools.ts test
  bun run cli/dev-tools.ts deploy production
    `);
  },
};

async function main() {
  const command = process.argv[2] || 'help';
  const args = process.argv.slice(3);

  if (command in commands) {
    try {
      await (commands as any)[command](...args);
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown command: ${command}`);
    await commands.help();
    process.exit(1);
  }
}

main();


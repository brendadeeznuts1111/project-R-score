#!/usr/bin/env bun

/**
 * DuoPlus Development Tools
 * Comprehensive CLI for development, testing, and deployment
 */

import shellUtils from '../src/cli/shellUtils';

const commands = {
  async build() {
    console.log('🔨 Building project...');
    const result = await shellUtils.runBuild();
    if (result.success) {
      console.log('✅ Build completed successfully');
    } else {
      console.error('❌ Build failed:', result.stderr);
      process.exit(1);
    }
  },

  async test() {
    console.log('🧪 Running tests...');
    const result = await shellUtils.runTests();
    console.log(result.stdout);
    if (!result.success) {
      console.error('❌ Tests failed');
      process.exit(1);
    }
  },

  async lint() {
    console.log('🔍 Linting code...');
    const result = await shellUtils.lintCode(['src/', 'cli/']);
    console.log(result.stdout);
    if (!result.success) {
      console.warn('⚠️ Linting issues found');
    }
  },

  async format() {
    console.log('✨ Formatting code...');
    const result = await shellUtils.formatCode(['src/', 'cli/', 'web-app/']);
    console.log(result.stdout);
  },

  async typecheck() {
    console.log('📝 Type checking...');
    const result = await shellUtils.checkTypeScript();
    if (result.success) {
      console.log('✅ No type errors');
    } else {
      console.error('❌ Type errors found:', result.stderr);
      process.exit(1);
    }
  },

  async install() {
    console.log('📦 Installing dependencies...');
    const result = await shellUtils.installDependencies('bun');
    if (result.success) {
      console.log('✅ Dependencies installed');
    } else {
      console.error('❌ Installation failed:', result.stderr);
      process.exit(1);
    }
  },

  async clean() {
    console.log('🧹 Cleaning build artifacts...');
    await shellUtils.removeFiles(['dist/', 'build/', '.bun/', 'node_modules/.cache']);
    console.log('✅ Cleaned');
  },

  async status() {
    console.log('📊 Git Status:');
    const status = await shellUtils.getGitStatus();
    console.log(status || 'Working directory clean');

    console.log('\n📜 Recent Commits:');
    const log = await shellUtils.getGitLog(5);
    console.log(log);
  },

  async info() {
    console.log('ℹ️ System Information:');
    const info = await shellUtils.getSystemInfo();
    Object.entries(info).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    console.log('\n📊 Project Statistics:');
    const lines = await shellUtils.countLines('src/');
    console.log(`  Lines of code: ${lines}`);

    const size = await shellUtils.getFileSize('.');
    console.log(`  Project size: ${size}`);
  },

  async dev() {
    console.log('🚀 Starting development server...');
    const result = await shellUtils.executeCommand('bun run web-app/server.js', {
      verbose: true,
    });
    if (!result.success) {
      console.error('❌ Server failed to start:', result.stderr);
      process.exit(1);
    }
  },

  async deploy(target: string = 'production') {
    console.log(`🚀 Deploying to ${target}...`);
    
    // Run tests first
    console.log('Running tests before deployment...');
    const testResult = await shellUtils.runTests();
    if (!testResult.success) {
      console.error('❌ Tests failed, aborting deployment');
      process.exit(1);
    }

    // Build
    console.log('Building for deployment...');
    const buildResult = await shellUtils.runBuild();
    if (!buildResult.success) {
      console.error('❌ Build failed, aborting deployment');
      process.exit(1);
    }

    console.log(`✅ Ready to deploy to ${target}`);
  },

  async help() {
    console.log(`
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


#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 Wrangler Development CLI
 * Easy-to-use Cloudflare Workers development tools
 */

import { $ } from 'bun';

const COMMANDS = {
  dev: 'Start development server',
  build: 'Build the worker',
  deploy: 'Deploy to production',
  tail: 'Tail worker logs',
  kv: 'Manage KV namespaces',
  d1: 'Manage D1 databases',
  r2: 'Manage R2 buckets',
  queues: 'Manage queues',
  secrets: 'Manage secrets',
  analytics: 'View analytics',
  health: 'Check worker health',
  config: 'Show configuration',
};

const ENVIRONMENTS = {
  development: 'Development environment',
  staging: 'Staging environment',
  production: 'Production environment',
};

async function showHelp() {
  console.info(`
🚀 Fantasy42-Fire22 Wrangler CLI
Easy-to-use Cloudflare Workers development tools

USAGE:
  bun run scripts/wrangler-dev.bun.ts <command> [environment]

COMMANDS:
${Object.entries(COMMANDS)
  .map(([cmd, desc]) => `  ${cmd.padEnd(12)} ${desc}`)
  .join('\n')}

ENVIRONMENTS:
${Object.entries(ENVIRONMENTS)
  .map(([env, desc]) => `  ${env.padEnd(12)} ${desc}`)
  .join('\n')}

EXAMPLES:
  bun run scripts/wrangler-dev.bun.ts dev development
  bun run scripts/wrangler-dev.bun.ts deploy production
  bun run scripts/wrangler-dev.bun.ts tail staging
  bun run scripts/wrangler-dev.bun.ts health production
  bun run scripts/wrangler-dev.bun.ts kv list development

NOTES:
- Make sure you're authenticated with Cloudflare: wrangler auth login
- Environment defaults to 'development' if not specified
- All commands run from enterprise/packages/cloudflare/ directory
`);
}

async function runWranglerCommand(command: string, env: string = 'development') {
  const wranglerDir = 'enterprise/packages/cloudflare';
  const envFlag = env !== 'development' ? `--env ${env}` : '';

  console.info(`🔧 Running: wrangler ${command} ${envFlag}`);
  console.info(`📁 Working directory: ${wranglerDir}`);
  console.info(`🌍 Environment: ${env}`);
  console.info('─'.repeat(50));

  try {
    const result = await $`cd ${wranglerDir} && wrangler ${command} ${envFlag}`.quiet();
    console.info(result.stdout);
    if (result.stderr) {
      console.error(result.stderr);
    }
    return result;
  } catch (error) {
    console.error(`❌ Command failed:`, error.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const env = args[1] || 'development';

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  if (!Object.keys(COMMANDS).includes(command)) {
    console.error(`❌ Unknown command: ${command}`);
    console.info(`Available commands: ${Object.keys(COMMANDS).join(', ')}`);
    return;
  }

  if (!Object.keys(ENVIRONMENTS).includes(env)) {
    console.error(`❌ Unknown environment: ${env}`);
    console.info(`Available environments: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    return;
  }

  // Execute the appropriate wrangler command
  switch (command) {
    case 'dev':
      await runWranglerCommand('dev', env);
      break;

    case 'build':
      await runWranglerCommand('build', env);
      break;

    case 'deploy':
      console.info(`🚀 Deploying to ${env} environment...`);
      await runWranglerCommand('deploy', env);
      break;

    case 'tail':
      console.info(`📊 Tailing logs for ${env} environment...`);
      await runWranglerCommand('tail', env);
      break;

    case 'kv':
      const kvSubcommand = args[2] || 'list';
      console.info(`📦 Managing KV for ${env} environment...`);
      await runWranglerCommand(`kv:${kvSubcommand}`, env);
      break;

    case 'd1':
      const d1Subcommand = args[2] || 'list';
      console.info(`🗄️ Managing D1 for ${env} environment...`);
      await runWranglerCommand(`d1:${d1Subcommand}`, env);
      break;

    case 'r2':
      const r2Subcommand = args[2] || 'bucket';
      console.info(`☁️ Managing R2 for ${env} environment...`);
      await runWranglerCommand(`r2:${r2Subcommand}`, env);
      break;

    case 'queues':
      const queueSubcommand = args[2] || 'list';
      console.info(`📋 Managing Queues for ${env} environment...`);
      await runWranglerCommand(`queues:${queueSubcommand}`, env);
      break;

    case 'secrets':
      const secretSubcommand = args[2] || 'list';
      console.info(`🔐 Managing Secrets for ${env} environment...`);
      await runWranglerCommand(`secret:${secretSubcommand}`, env);
      break;

    case 'analytics':
      console.info(`📊 Fetching analytics for ${env} environment...`);
      // Custom analytics command - you might need to implement this
      console.info('Analytics feature coming soon...');
      break;

    case 'health':
      console.info(`🏥 Checking health of ${env} environment...`);
      try {
        const response = await fetch(
          `https://${env === 'production' ? 'api' : env}.apexodds.net/health`
        );
        const health = await response.json();
        console.info(JSON.stringify(health, null, 2));
      } catch (error) {
        console.error(`❌ Health check failed:`, error.message);
      }
      break;

    case 'config':
      console.info(`⚙️ Configuration for ${env} environment:`);
      await runWranglerCommand('whoami', env);
      console.info('\n📄 Worker Configuration:');
      const configPath = `enterprise/packages/cloudflare/wrangler.toml`;
      try {
        const config = await Bun.file(configPath).text();
        console.info(config);
      } catch (error) {
        console.error(`❌ Could not read config:`, error.message);
      }
      break;

    default:
      console.error(`❌ Command not implemented yet: ${command}`);
      break;
  }
}

// Run the CLI
if (import.meta.main) {
  main().catch(console.error);
}

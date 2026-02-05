#!/usr/bin/env bun
// secrets.ts - CLI command for secret management
import { Command } from 'commander';
import { secrets } from 'bun';
import { scopedService } from '../../utils/secrets-loader';

export const secretsCommand = new Command('secrets')
  .description('Manage per-user scoped secrets (Keyring/CredMgr)');

secretsCommand
  .command('list')
  .description('List secrets for a team')
  .option('-t, --team <team>', 'Team name', 'default')
  .option('--os <os>', 'Platform scope (win32, darwin, linux)', process.platform)
  .action(async (options) => {
    const platform = options.os;
    const scope = platform === 'win32' ? 'ENTERPRISE' : 'USER';
    const service = `windsurf-r2-empire-${scope}-${options.team}`;
    
    console.log(`🔐 Listing Scoped Secrets: ${service} (${platform})`);
    // Note: bun.secrets doesn't list all, but we can check essential ones
    const keys = ['R2_BUCKET', 'DUOPLUS_API_KEY'];
    for (const name of keys) {
      const val = await secrets.get({ service, name });
      console.log(`  ${name}: ${val ? '✅ Stored' : '⚠️ Missing'}`);
    }
  });

secretsCommand
  .command('set')
  .description('Set a secret for a team')
  .argument('<name>', 'Secret name (e.g., R2_BUCKET)')
  .argument('[value]', 'Secret value (prompts if missing)')
  .option('-t, --team <team>', 'Team name', 'default')
  .option('--os <os>', 'Platform scope (win32, darwin, linux)', process.platform)
  .action(async (name, value, options) => {
    const platform = options.os;
    const scope = platform === 'win32' ? 'ENTERPRISE' : 'USER';
    const service = `windsurf-r2-empire-${scope}-${options.team}`;
    
    let secretValue = value;
    if (!secretValue) {
      secretValue = prompt(`${name} for ${options.team}:`) || '';
    }

    if (!secretValue) {
      console.log('❌ No value provided.');
      return;
    }

    await secrets.set({ service, name, value: secretValue });
    console.log(`✅ Set ${name} for ${options.team} (${scope} scope)`);
  });

secretsCommand
  .command('get')
  .description('Get a secret for a team')
  .argument('<name>', 'Secret name')
  .option('-t, --team <team>', 'Team name', 'default')
  .option('--os <os>', 'Platform scope (win32, darwin, linux)', process.platform)
  .action(async (name, options) => {
    const platform = options.os;
    const scope = platform === 'win32' ? 'ENTERPRISE' : 'USER';
    const service = `windsurf-r2-empire-${scope}-${options.team}`;
    
    const val = await secrets.get({ service, name });
    console.log(`${name}: ${val || '⚠️ Not found'}`);
  });

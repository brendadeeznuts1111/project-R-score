#!/usr/bin/env bun
/**
 * @fileoverview Cloudflare Workers Deployment Script
 * @description Deploy to Cloudflare Workers using Wrangler CLI
 * @module scripts/deploy-worker
 */

import { spawn } from 'bun';
import { $ } from 'bun';

const environment = process.argv[2] || 'staging';
const validEnvs = ['production', 'staging', 'preview'];

if (!validEnvs.includes(environment)) {
  console.error(`Invalid environment: ${environment}`);
  console.error(`Valid environments: ${validEnvs.join(', ')}`);
  process.exit(1);
}

console.log(`🚀 Deploying to ${environment}...`);

try {
  // Check if wrangler is installed
  const wranglerCheck = await $`which wrangler`.quiet();
  if (!wranglerCheck.exitCode === 0) {
    console.error('❌ Wrangler CLI not found. Install with: npm install -g wrangler');
    process.exit(1);
  }

  // Build worker
  console.log('📦 Building worker...');
  const buildResult = await $`bun run build:worker`.quiet();
  if (buildResult.exitCode !== 0) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  // Deploy
  console.log(`🚀 Deploying to ${environment}...`);
  const deployCmd =
    environment === 'preview'
      ? ['wrangler', 'deploy', '--env', environment]
      : ['wrangler', 'deploy', '--env', environment, '--no-bundle'];

  const deploy = spawn(deployCmd, {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await deploy.exited;

  if (exitCode === 0) {
    console.log(`✅ Successfully deployed to ${environment}`);
  } else {
    console.error(`❌ Deployment failed with exit code ${exitCode}`);
    process.exit(exitCode);
  }
} catch (error) {
  console.error('❌ Deployment error:', error);
  process.exit(1);
}

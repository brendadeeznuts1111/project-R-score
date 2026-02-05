#!/usr/bin/env bun
/**
 * Edge Worker - Edge function deployer
 * Demonstrates project isolation with Bun.main context
 */

// Entry guard - only allow direct execution
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Edge Worker Deployer Starting                            ║
║  Entrypoint: ${Bun.main}${' '.repeat(Math.max(0, 80 - Bun.main.length))}║
╚═══════════════════════════════════════════════════════════╝
`);

const mainDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));

console.log(`Project Home: ${process.env.PROJECT_HOME || mainDir}`);
console.log(`BUN_PLATFORM_HOME: ${process.env.BUN_PLATFORM_HOME || 'Not set'}`);
console.log(`DEPLOY_TARGET: ${process.env.DEPLOY_TARGET || 'cloudflare'}`);
console.log('');

// Edge worker configuration
interface DeployConfig {
  name: string;
  entrypoint: string;
  compatibilityDate: string;
  env: Record<string, string>;
}

// Get project-specific config
function getConfig(): DeployConfig {
  return {
    name: Bun.main.split('/').pop()?.replace('.ts', '') || 'edge-worker',
    entrypoint: Bun.main,
    compatibilityDate: new Date().toISOString().split('T')[0],
    env: {
      PROJECT_HOME: process.env.PROJECT_HOME || mainDir,
      BUN_PLATFORM_HOME: process.env.BUN_PLATFORM_HOME || '',
      DEPLOY_TARGET: process.env.DEPLOY_TARGET || 'cloudflare',
      NODE_ENV: process.env.NODE_ENV || 'production'
    }
  };
}

// Simulate KV namespace creation
async function createKVNamespace(config: DeployConfig): Promise<string> {
  console.log(`Creating KV namespace for ${config.name}...`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const kvName = `${config.name}-kv-${Date.now()}`;
  console.log(`  ✓ KV namespace created: ${kvName}`);
  return kvName;
}

// Simulate worker build
async function buildWorker(config: DeployConfig): Promise<string> {
  console.log(`Building worker bundle...`);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate bundling
  const bundlePath = `${process.env.PROJECT_HOME || mainDir}/dist/worker.js`;
  const bundleContent = `
// Edge Worker Bundle
// Built from: ${config.entrypoint}
// Project: ${Bun.main}
// Generated: ${new Date().toISOString()}

export default {
  async fetch(request, env) {
    return new Response('Hello from ${config.name}!', { status: 200 });
  }
};
  `.trim();

  await Bun.write(bundlePath, bundleContent);
  console.log(`  ✓ Bundle written to: ${bundlePath}`);
  return bundlePath;
}

// Simulate deployment
async function deployWorker(config: DeployConfig, bundlePath: string, kvName: string): Promise<boolean> {
  console.log(`Deploying to ${config.env.DEPLOY_TARGET}...`);

  await new Promise(resolve => setTimeout(resolve, 800));

  console.log(`
═══════════════════════════════════════════════════════════
✅ Deployment Complete!
  Project: ${config.name}
  Entrypoint: ${Bun.main}
  Target: ${config.env.DEPLOY_TARGET}
  KV Namespace: ${kvName}
  Bundle: ${bundlePath}
  Deployed at: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════
`);

  return true;
}

// Main deployment flow
async function deploy() {
  const args = Bun.argv.slice(2);
  const local = args.includes('--local');
  const dryRun = args.includes('--dry-run');

  const config = getConfig();

  if (dryRun) {
    console.log('Dry run mode - no actual deployment\n');
  }

  console.log(`Deploy target: ${config.env.DEPLOY_TARGET}`);
  console.log(`Worker name: ${config.name}`);
  console.log('');

  // Step 1: Create KV namespace
  const kvName = await createKVNamespace(config);

  // Step 2: Build worker
  const bundlePath = await buildWorker(config);

  // Step 3: Deploy (unless dry run or local)
  if (!dryRun && !local) {
    await deployWorker(config, bundlePath, kvName);
  } else if (local) {
    const EDGE_WORKER_PORT = parseInt(process.env.EDGE_WORKER_PORT || '8788', 10);
    const EDGE_WORKER_HOST = process.env.EDGE_WORKER_HOST || process.env.SERVER_HOST || 'localhost';
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Local Development Mode                                  ║
║  Worker running at http://${EDGE_WORKER_HOST}:${EDGE_WORKER_PORT}                 ║
║  (simulated - not actually starting server)             ║
╚═══════════════════════════════════════════════════════════╝
    `);
    console.log(`Bundle ready at: ${bundlePath}`);
    console.log('KV namespace:', kvName);
  } else {
    console.log(`\nDry run complete. Would deploy:`);
    console.log(`  - KV: ${kvName}`);
    console.log(`  - Bundle: ${bundlePath}`);
  }
}

// CLI parsing
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Edge Worker Deployer - Deploy edge functions

Usage:
  bun worker.ts [options]

Options:
  --local         Run in local development mode
  --dry-run       Show what would be deployed without deploying
  --target <env>  Set DEPLOY_TARGET (default: cloudflare)

Examples:
  bun worker.ts                 # Deploy to cloudflare
  bun worker.ts --local         # Local dev mode
  bun worker.ts --dry-run       # Preview deployment

Environment Variables:
  DEPLOY_TARGET      Target platform (cloudflare, etc.)
  PROJECT_HOME       Project root
  BUN_PLATFORM_HOME  Platform root (overseer)
`);
  Bun.exit(0);
}

deploy()
  .then(() => {
    console.log('\n✅ Edge worker operation completed successfully');
    Bun.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Deployment failed:', err);
    Bun.exit(1);
  });
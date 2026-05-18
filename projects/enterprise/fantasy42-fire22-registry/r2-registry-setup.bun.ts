#!/usr/bin/env bun

/**
 * 🚀 Fire22 R2 Registry Setup & Configuration
 *
 * Complete setup for Cloudflare R2 registry storage
 * Includes environment configuration, bucket setup, and upload automation
 */

import * as fs from 'fs';
import * as path from 'path';
import { BunR2Client } from './enterprise/packages/dashboard-worker/src/utils/bun-r2-client.ts';

// R2 Registry Configuration
interface R2RegistryConfig {
  accountId: string;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  customDomain?: string;
  cdnDomain?: string;
}

// Registry Structure
const REGISTRY_STRUCTURE = {
  dashboards: {
    description: 'HTML dashboards and interfaces',
    path: 'dashboards/',
    cacheControl: 'public, max-age=3600',
  },
  designs: {
    description: 'Design artifacts and style guides',
    path: 'designs/',
    cacheControl: 'public, max-age=86400',
  },
  docs: {
    description: 'Documentation and guides',
    path: 'docs/',
    cacheControl: 'public, max-age=3600',
  },
  assets: {
    description: 'Static assets (CSS, JS, images)',
    path: 'assets/',
    cacheControl: 'public, max-age=31536000',
  },
  api: {
    description: 'API documentation and schemas',
    path: 'api/',
    cacheControl: 'public, max-age=3600',
  },
};

// Setup Functions
async function createEnvTemplate() {
  const envTemplate = `# Fire22 R2 Registry Configuration
# Copy this to .env and fill in your values

# Cloudflare Account
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here

# R2 Bucket Configuration
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_REGION=auto
R2_BUCKET=fire22-registry

# Custom Domain (optional)
R2_CUSTOM_DOMAIN=registry.fire22.dev
R2_CDN_DOMAIN=cdn.fire22.dev

# Registry Settings
REGISTRY_PUBLIC_READ=true
REGISTRY_VERSIONED_UPLOADS=true
REGISTRY_AUTO_INDEX=true
`;

  await Bun.write('.env.r2-template', envTemplate);
  console.info('✅ Created .env.r2-template');
}

async function createWranglerConfig() {
  const wranglerConfig = `name = "fire22-registry"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# Account configuration
account_id = "\${CLOUDFLARE_ACCOUNT_ID}"

# R2 Bucket bindings
[[r2_buckets]]
binding = "REGISTRY_BUCKET"
bucket_name = "\${R2_BUCKET}"
preview_bucket_name = "\${R2_BUCKET}-preview"

# Environment variables
[vars]
REGISTRY_NAME = "fire22-registry"
REGISTRY_VERSION = "1.0.0"
PUBLIC_READ = "true"

# Routes for custom domain
[[routes]]
pattern = "registry.fire22.dev/*"
zone_name = "fire22.dev"

# Development settings
[dev]
port = 8787
local_protocol = "https"

# Build configuration (if using Pages)
[pages_build_config]
build_command = "bun run build:registry"
destination_dir = "dist"

# CORS configuration
[cors]
origins = ["*"]
methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST"]
headers = ["*"]
max_age = 86400

# Security headers
[security]
content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
`;

  await Bun.write('wrangler-registry.toml', wranglerConfig);
  console.info('✅ Created wrangler-registry.toml');
}

async function createRegistryManifest() {
  const manifest = {
    name: 'Fire22 Registry',
    version: '1.0.0',
    description: 'Cloudflare R2-backed registry for Fire22 dashboards and artifacts',
    structure: REGISTRY_STRUCTURE,
    metadata: {
      created: new Date().toISOString(),
      branding: {
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        fontFamily: 'SF Mono, Inter, system-ui',
      },
      compliance: {
        audited: true,
        auditDate: new Date().toISOString(),
        score: '52%',
        criticalIssues: 4,
      },
    },
    endpoints: {
      base: 'https://registry.fire22.dev',
      dashboards: 'https://registry.fire22.dev/dashboards/',
      designs: 'https://registry.fire22.dev/designs/',
      docs: 'https://registry.fire22.dev/docs/',
      api: 'https://registry.fire22.dev/api/',
    },
    upload: {
      batchSize: 10,
      concurrency: 5,
      retryAttempts: 3,
      timeout: 30000,
    },
  };

  await Bun.write('registry-manifest.json', JSON.stringify(manifest, null, 2));
  console.info('✅ Created registry-manifest.json');
}

async function setupRegistryDirectories() {
  const dirs = [
    'registry/dashboards',
    'registry/designs',
    'registry/docs',
    'registry/assets',
    'registry/api',
    'registry/temp',
  ];

  for (const dir of dirs) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  console.info('✅ Created registry directory structure');
}

async function validateR2Connection(config: Partial<R2RegistryConfig>) {
  if (!config.accessKeyId || !config.secretAccessKey || !config.endpoint) {
    console.info('⚠️  R2 credentials not configured - skipping connection test');
    return false;
  }

  try {
    const client = new BunR2Client({
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region || 'auto',
      bucket: config.bucketName || 'fire22-registry',
    });

    // Test connection by listing objects
    await client.listObjects({ maxKeys: 1 });
    console.info('✅ R2 connection successful');
    return true;
  } catch (error) {
    console.info('❌ R2 connection failed:', error.message);
    return false;
  }
}

async function generateSetupInstructions() {
  const instructions = `# 🚀 Fire22 R2 Registry Setup Guide

## Prerequisites
1. Cloudflare account with R2 enabled
2. Wrangler CLI installed: \`npm install -g wrangler\`
3. Bun runtime installed

## Step 1: Configure R2 Bucket
\`\`\`bash
# Login to Cloudflare
wrangler auth login

# Create R2 bucket
wrangler r2 bucket create fire22-registry

# Generate API tokens
wrangler r2 token create --bucket fire22-registry
\`\`\`

## Step 2: Environment Setup
\`\`\`bash
# Copy environment template
cp .env.r2-template .env

# Edit .env with your values
nano .env
\`\`\`

## Step 3: Registry Setup
\`\`\`bash
# Run setup script
bun run r2-registry-setup.bun.ts

# Test R2 connection
bun run r2-registry-setup.bun.ts --test-connection
\`\`\`

## Step 4: Upload Content
\`\`\`bash
# Upload audited dashboards
bun run registry-upload.bun.ts

# Upload design artifacts
bun run upload-designs.bun.ts
\`\`\`

## Step 5: Configure Custom Domain (Optional)
\`\`\`bash
# Add custom domain to Cloudflare
wrangler pages deployment tail

# Configure DNS
# registry.fire22.dev -> your-r2-bucket-url
\`\`\`

## Registry Structure
\`\`\`
fire22-registry/
├── dashboards/     # HTML dashboards
├── designs/        # Design artifacts
├── docs/          # Documentation
├── assets/        # Static assets
└── api/           # API docs/schemas
\`\`\`

## Access URLs
- Registry: https://registry.fire22.dev
- Dashboards: https://registry.fire22.dev/dashboards/
- Designs: https://registry.fire22.dev/designs/
- Docs: https://registry.fire22.dev/docs/

## Maintenance
\`\`\`bash
# List registry contents
bun run registry-admin.bun.ts --list

# Sync local changes
bun run registry-admin.bun.ts --sync

# Generate audit report
bun run registry-admin.bun.ts --audit
\`\`\`
`;

  await Bun.write('R2-REGISTRY-SETUP.md', instructions);
  console.info('✅ Created R2-REGISTRY-SETUP.md');
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.info('🚀 Fire22 R2 Registry Setup');
  console.info('===========================\n');

  switch (command) {
    case '--test-connection':
      console.info('🔍 Testing R2 connection...');
      const config = {
        endpoint: process.env.R2_ENDPOINT,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        region: process.env.R2_REGION,
        bucketName: process.env.R2_BUCKET,
      };
      await validateR2Connection(config);
      break;

    case '--init':
      console.info('📁 Initializing R2 registry...');
      await createEnvTemplate();
      await createWranglerConfig();
      await createRegistryManifest();
      await setupRegistryDirectories();
      await generateSetupInstructions();
      console.info('\n🎉 Registry initialized!');
      console.info('📖 Read R2-REGISTRY-SETUP.md for next steps');
      break;

    case '--validate':
      console.info('✅ Validating registry setup...');
      const isConnected = await validateR2Connection({
        endpoint: process.env.R2_ENDPOINT,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        region: process.env.R2_REGION,
        bucketName: process.env.R2_BUCKET,
      });

      if (isConnected) {
        console.info('🎯 Registry is ready for uploads!');
      } else {
        console.info('⚠️  Registry needs configuration');
      }
      break;

    default:
      console.info('Usage:');
      console.info('  bun run r2-registry-setup.bun.ts --init        # Initialize registry');
      console.info('  bun run r2-registry-setup.bun.ts --test-connection  # Test R2 connection');
      console.info('  bun run r2-registry-setup.bun.ts --validate    # Validate setup');
      console.info('\nQuick start:');
      console.info('  1. bun run r2-registry-setup.bun.ts --init');
      console.info('  2. Configure .env file');
      console.info('  3. bun run r2-registry-setup.bun.ts --test-connection');
      console.info('  4. bun run registry-upload.bun.ts');
  }
}

main().catch(console.error);

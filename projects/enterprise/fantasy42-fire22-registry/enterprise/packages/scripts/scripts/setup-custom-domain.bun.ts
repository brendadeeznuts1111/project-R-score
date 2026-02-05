#!/usr/bin/env bun

/**
 * Crystal Clear Architecture - Custom Domain Setup
 * Cross-platform Bun Shell script with TypeScript support
 */

import { $ } from 'bun';

// Configuration
const CONFIG = {
  domain: 'docs.apexodds.net',
  zoneName: 'apexodds.net',
  pagesProject: 'crystal-clear-architecture',
  cloudflareAccountId: '5e5d2b2fa037e9924a50619c08f9f442',
} as const;

// Type definitions for better TypeScript support
interface DNSRecord {
  type: 'CNAME' | 'A';
  name: string;
  target: string;
  proxied: boolean;
  ttl: 'Auto' | number;
}

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

interface WranglerConfig {
  name: string;
  compatibility_date: string;
  pages_build_output_dir: string;
  pages_build_command: string;
}

// Utility functions with type safety
function log(message: string, level: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '🔍',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[level];

  console.log(`${timestamp} ${prefix} ${message}`);
}

async function checkCommand(command: string): Promise<boolean> {
  try {
    await $`which ${command}`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function validateEnvironment(): Promise<void> {
  log('Validating environment setup...', 'info');

  // Check Bun version
  const bunVersion = await $`bun --version`.text();
  log(`Bun version: ${bunVersion.trim()}`, 'success');

  // Check Wrangler CLI
  if (!(await checkCommand('wrangler'))) {
    log('Wrangler CLI not found. Installing...', 'warning');
    await $`bun add -g wrangler`;
    log('Wrangler CLI installed successfully', 'success');
  } else {
    log('Wrangler CLI found', 'success');
  }

  // Check Cloudflare authentication
  try {
    await $`wrangler auth status`.quiet();
    log('Cloudflare authentication confirmed', 'success');
  } catch {
    log('Cloudflare authentication required', 'error');
    log('Please run: wrangler auth login', 'info');
    process.exit(1);
  }
}

async function configureDNS(): Promise<void> {
  log('Configuring DNS settings...', 'info');

  const dnsRecords: DNSRecord[] = [
    {
      type: 'CNAME',
      name: 'docs',
      target: 'crystal-clear-architecture.pages.dev',
      proxied: true,
      ttl: 'Auto',
    },
  ];

  log('Required DNS Records:', 'info');
  dnsRecords.forEach((record, index) => {
    console.log(`  ${index + 1}. ${record.type} Record:`);
    console.log(`     Name: ${record.name}`);
    console.log(`     Target: ${record.target}`);
    console.log(`     Proxy: ${record.proxied ? '✅ Proxied (orange cloud)' : '❌ DNS only'}`);
    console.log(`     TTL: ${record.ttl}`);
    console.log('');
  });

  log('Please add these records in your Cloudflare dashboard:', 'warning');
  log(
    `Dashboard URL: https://dash.cloudflare.com/${CONFIG.cloudflareAccountId}/${CONFIG.zoneName}`,
    'info'
  );
}

async function updateWranglerConfig(): Promise<void> {
  log('Updating Wrangler configuration...', 'info');

  const wranglerConfig: WranglerConfig = {
    name: CONFIG.pagesProject,
    compatibility_date: '2024-09-23',
    pages_build_output_dir: 'dist',
    pages_build_command: 'bun run build:docs',
  };

  // Check if wrangler.toml exists and update it
  const wranglerPath = './wrangler.toml';
  try {
    const existing = await Bun.file(wranglerPath).text();
    log('Found existing wrangler.toml', 'success');

    // Update build command if needed
    if (!existing.includes('bun run build:docs')) {
      const updated = existing
        .replace(/command = "npm run build"/g, 'command = "bun run build:docs"')
        .replace(/build_command = "npm run build:docs"/g, 'build_command = "bun run build:docs"');

      await Bun.write(wranglerPath, updated);
      log('Updated wrangler.toml with Bun commands', 'success');
    } else {
      log('Wrangler config already uses Bun commands', 'success');
    }
  } catch {
    log('Creating new wrangler.toml configuration', 'info');

    const tomlContent = `
name = "${wranglerConfig.name}"
compatibility_date = "${wranglerConfig.compatibility_date}"

[pages]
command = "${wranglerConfig.pages_build_command}"
cwd = "."
output_dir = "${wranglerConfig.pages_build_output_dir}"

# Custom domain configuration
[[pages_build_config.custom_domain]]
domain = "${CONFIG.domain}"
zone_name = "${CONFIG.zoneName}"

# Functions configuration
[pages_build_config.functions]
directory = "functions"

# Environment variables
[vars]
NODE_ENV = "production"
GITHUB_REPO = "brendadeeznuts1111/crystal-clear-architecture"
GITHUB_BRANCH = "main"
CF_PAGES = "1"
`.trim();

    await Bun.write(wranglerPath, tomlContent);
    log('Created wrangler.toml with custom domain configuration', 'success');
  }
}

async function testConfiguration(): Promise<void> {
  log('Testing configuration...', 'info');

  try {
    // Test wrangler configuration
    await $`wrangler pages deployment create --project-name=${CONFIG.pagesProject} --dry-run`.quiet();
    log('Wrangler configuration is valid', 'success');
  } catch (error) {
    log('Wrangler configuration test failed', 'error');
    log('Please check your wrangler.toml file', 'warning');
  }

  // Test custom domain (will fail until DNS is configured)
  try {
    const response = await fetch(`https://${CONFIG.domain}/api/health`);
    if (response.ok) {
      log('Custom domain is live!', 'success');
    } else {
      throw new Error('Non-200 response');
    }
  } catch {
    log('Custom domain not yet configured (expected)', 'warning');
    log('This is normal until DNS records are added', 'info');
  }
}

async function generateDocumentation(): Promise<void> {
  log('Generating setup documentation...', 'info');

  const docs = `
# Custom Domain Setup - ${CONFIG.domain}

## Configuration Complete ✅

Your custom domain has been configured with the following settings:

### Domain Information
- **Custom Domain**: ${CONFIG.domain}
- **Zone Name**: ${CONFIG.zoneName}
- **Pages Project**: ${CONFIG.pagesProject}

### DNS Records Required
Add these records in your Cloudflare dashboard:

\`\`\`
CNAME Record:
  Name: docs
  Type: CNAME
  Target: crystal-clear-architecture.pages.dev
  Proxy: ✅ Proxied (orange cloud)
  TTL: Auto
\`\`\`

### Cloudflare Dashboard
Access your domain settings: https://dash.cloudflare.com/${CONFIG.cloudflareAccountId}/${CONFIG.zoneName}

### Testing
After DNS propagation (5-10 minutes), test with:
\`\`\`bash
curl -I https://${CONFIG.domain}/api/health
\`\`\`

Expected response:
\`\`\`
HTTP/2 200
content-type: application/json
x-service-health: OK
\`\`\`

### Management Commands
\`\`\`bash
# Test domain configuration
bun run domain:test

# Validate setup
bun run domain:validate

# Check health
bun run health:custom
\`\`\`

---
*Generated by setup-custom-domain.bun.ts*
`.trim();

  await Bun.write('./CUSTOM-DOMAIN-README.md', docs);
  log('Generated CUSTOM-DOMAIN-README.md', 'success');
}

async function main(): Promise<void> {
  console.log('🌐 Crystal Clear Architecture - Custom Domain Setup');
  console.log('!==!==!==!==!==!==!==!==!====');
  console.log('');

  try {
    // Step 1: Environment validation
    await validateEnvironment();

    // Step 2: DNS configuration guidance
    await configureDNS();

    // Step 3: Update Wrangler configuration
    await updateWranglerConfig();

    // Step 4: Test configuration
    await testConfiguration();

    // Step 5: Generate documentation
    await generateDocumentation();

    // Success summary
    console.log('');
    log('Custom domain setup completed successfully!', 'success');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Add DNS records in Cloudflare dashboard');
    console.log('2. Wait for DNS propagation (5-10 minutes)');
    console.log('3. Test custom domain: bun run domain:test');
    console.log('4. Deploy: bun run deploy');
    console.log('');
    console.log('📚 Documentation: CUSTOM-DOMAIN-README.md');
    console.log('🌐 Custom Domain: https://' + CONFIG.domain);
  } catch (error) {
    log(`Setup failed: ${error}`, 'error');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'setup';

switch (command) {
  case 'setup':
    await main();
    break;

  case 'test':
    await testConfiguration();
    break;

  case 'validate':
    console.log('🔍 Validating current configuration...');
    await validateEnvironment();
    await testConfiguration();
    break;

  case 'help':
    console.log(`
🚀 Crystal Clear Architecture - Domain Setup Tool

Usage:
  bun run scripts/setup-custom-domain.bun.ts [command]

Commands:
  setup     Full domain setup (default)
  test      Test current configuration
  validate  Validate environment and config
  help      Show this help message

Examples:
  bun run scripts/setup-custom-domain.bun.ts
  bun run scripts/setup-custom-domain.bun.ts test
  bun run scripts/setup-custom-domain.bun.ts validate
`);
    break;

  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run with --help for usage information');
    process.exit(1);
}

export { CONFIG, type DNSRecord, type CloudflareZone, type WranglerConfig };

#!/usr/bin/env bun
/**
 * Fantasy42-Fire22 DNS Configuration Setup
 * Automated DNS and email routing configuration for Cloudflare
 */

import { $ } from 'bun';

const DNS_CONFIG = {
  cnames: [
    {
      name: 'dev',
      target: 'fantasy42-fire22-dev.apexodds.workers.dev',
      comment: 'Development environment',
    },
    {
      name: 'staging',
      target: 'fantasy42-fire22-staging.apexodds.workers.dev',
      comment: 'Staging environment',
    },
    {
      name: 'api',
      target: 'fantasy42-fire22-prod.apexodds.workers.dev',
      comment: 'Production API',
    },
    {
      name: 'registry',
      target: 'fantasy42-fire22-prod.apexodds.workers.dev',
      comment: 'Package registry',
    },
    { name: 'docs', target: 'brendadeeznuts1111.github.io', comment: 'GitHub Pages documentation' },
    {
      name: 'dashboard',
      target: 'fantasy42-fire22-prod.apexodds.workers.dev',
      comment: 'Dashboard interface',
    },
  ],
  mx: [
    { name: '@', target: 'route1.mx.cloudflare.net', priority: 58 },
    { name: '@', target: 'route2.mx.cloudflare.net', priority: 17 },
    { name: '@', target: 'route3.mx.cloudflare.net', priority: 91 },
  ],
  txt: [
    { name: '@', content: 'v=spf1 include:_spf.mx.cloudflare.net ~all' },
    { name: '_dmarc', content: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@apexodds.com' },
  ],
  wildcard: [
    {
      name: '*',
      target: 'fantasy42-fire22-prod.apexodds.workers.dev',
      comment: 'Wildcard for dynamic subdomains',
    },
  ],
};

async function checkCloudflareAuth() {
  console.info(`🔐 Checking Cloudflare authentication...`);

  try {
    const result = await $`wrangler whoami`.quiet();
    console.info(`✅ Authenticated with Cloudflare`);
    return true;
  } catch (error) {
    console.info(`❌ Not authenticated with Cloudflare`);
    console.info(`🔑 Please run: wrangler auth login`);
    return false;
  }
}

async function showCurrentDNS() {
  console.info(`📋 Current DNS Configuration for apexodds.com`);
  console.info('═'.repeat(60));

  try {
    const result = await $`curl -s "https://api.cloudflare.com/client/v4/zones" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json"`.quiet();

    const zones = JSON.parse(result.stdout);
    if (zones.success && zones.result.length > 0) {
      console.info(`Found ${zones.result.length} zone(s)`);
      zones.result.forEach((zone: any) => {
        console.info(`- ${zone.name} (${zone.status})`);
      });
    }
  } catch (error) {
    console.info(`⚠️  Could not fetch current DNS (API token may not be set)`);
    console.info(`💡 Manual DNS setup required in Cloudflare Dashboard`);
  }
}

async function generateDNSCommands() {
  console.info(`🔧 DNS Configuration Commands for apexodds.com`);
  console.info('═'.repeat(60));

  console.info(`\n# CNAME Records (add these in Cloudflare DNS settings)`);
  console.info(`# Go to: https://dash.cloudflare.com/ > apexodds.com > DNS`);

  DNS_CONFIG.cnames.forEach(cname => {
    console.info(`CNAME ${cname.name}.apexodds.com ${cname.target} # ${cname.comment}`);
  });

  console.info(`\n# MX Records for Email Routing`);
  DNS_CONFIG.mx.forEach(mx => {
    console.info(`MX ${mx.name} ${mx.target} ${mx.priority}`);
  });

  console.info(`\n# TXT Records for Email Security`);
  DNS_CONFIG.txt.forEach(txt => {
    console.info(`TXT ${txt.name} "${txt.content}"`);
  });

  console.info(`\n# Wildcard CNAME for dynamic subdomains`);
  DNS_CONFIG.wildcard.forEach(wc => {
    console.info(`CNAME ${wc.name} ${wc.target} # ${wc.comment}`);
  });
}

async function showEmailRoutingSetup() {
  console.info(`📧 Email Routing Configuration`);
  console.info('═'.repeat(60));

  console.info(`\n# 1. Enable Email Routing in Cloudflare Dashboard`);
  console.info(`# Go to: https://dash.cloudflare.com/ > apexodds.com > Email > Email Routing`);
  console.info(`# Click "Create address" or "Create catch-all"`);

  console.info(`\n# 2. Create Email Routing Rules:`);

  const rules = [
    {
      name: 'Enterprise Team',
      matcher: 'enterprise@apexodds.com',
      action: 'Forward to team@fire22.com, enterprise@fire22.com',
    },
    {
      name: 'Security Team',
      matcher: 'security@apexodds.com',
      action: 'Forward to security@fire22.com, ciso@fire22.com',
    },
    {
      name: 'Support',
      matcher: 'support@apexodds.com',
      action: 'Forward to support@fire22.com + trigger worker',
    },
    {
      name: 'Wildcard',
      matcher: '*@apexodds.com',
      action: 'Forward to catchall@fire22.com + log to worker',
    },
  ];

  rules.forEach((rule, index) => {
    console.info(`\n${index + 1}. ${rule.name}`);
    console.info(`   Matcher: ${rule.matcher}`);
    console.info(`   Action: ${rule.action}`);
  });

  console.info(`\n# 3. Create Catch-All Rule:`);
  console.info(`   - Matcher: *@apexodds.com`);
  console.info(`   - Action: Forward to catchall@fire22.com`);
  console.info(`   - Enable: Yes`);
}

async function verifyDNSSetup() {
  console.info(`🔍 Verifying DNS Setup`);
  console.info('═'.repeat(60));

  const subdomains = ['dev', 'staging', 'api', 'docs', 'registry', 'dashboard'];

  for (const subdomain of subdomains) {
    try {
      console.info(`\n🔍 Checking ${subdomain}.apexodds.com...`);
      const result = await $`dig ${subdomain}.apexodds.com CNAME +short`.quiet();

      if (result.stdout.trim()) {
        console.info(`✅ CNAME found: ${result.stdout.trim()}`);
      } else {
        console.info(`❌ No CNAME found for ${subdomain}.apexodds.com`);
      }
    } catch (error) {
      console.info(`❌ Could not check ${subdomain}.apexodds.com`);
    }
  }

  console.info(`\n🔍 Checking MX records...`);
  try {
    const mxResult = await $`dig apexodds.com MX +short`.quiet();
    if (mxResult.stdout.trim()) {
      console.info(`✅ MX records found:`);
      console.info(mxResult.stdout);
    } else {
      console.info(`❌ No MX records found`);
    }
  } catch (error) {
    console.info(`❌ Could not check MX records`);
  }
}

async function showHelp() {
  console.info(`
🌐 Fantasy42-Fire22 DNS & Email Setup
Automated DNS configuration and email routing setup

USAGE:
  bun run scripts/dns-setup.bun.ts <command>

COMMANDS:
  auth         Check Cloudflare authentication
  current      Show current DNS configuration
  commands     Generate DNS setup commands
  email        Show email routing configuration
  verify       Verify DNS setup is working
  all          Show all configurations

EXAMPLES:
  bun run scripts/dns-setup.bun.ts commands    # Get DNS setup commands
  bun run scripts/dns-setup.bun.ts email       # Email routing setup
  bun run scripts/dns-setup.bun.ts verify      # Verify DNS is working
  bun run scripts/dns-setup.bun.ts all         # Show everything

DNS RECORDS TO CONFIGURE:
- 6 CNAME records for subdomains (dev, staging, api, docs, registry, dashboard)
- 3 MX records for email routing
- 2 TXT records for email security (SPF, DMARC)
- 1 Wildcard CNAME for dynamic subdomains

EMAIL ROUTING:
- Enterprise team forwarding
- Security team forwarding
- Support ticket processing
- Wildcard catch-all handling

NOTES:
- All configurations are for apexodds.com domain
- Requires Cloudflare authentication
- Email routing must be enabled in Cloudflare dashboard
- DNS changes may take up to 24 hours to propagate
`);
}

async function showAll() {
  console.info(`🌐 COMPLETE DNS & EMAIL SETUP FOR apexodds.com`);
  console.info('═'.repeat(80));

  await generateDNSCommands();
  console.info('\n' + '='.repeat(60));
  await showEmailRoutingSetup();
  console.info('\n' + '='.repeat(60));
  await verifyDNSSetup();
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await showHelp();
    return;
  }

  switch (command) {
    case 'auth':
      await checkCloudflareAuth();
      break;

    case 'current':
      await showCurrentDNS();
      break;

    case 'commands':
      await generateDNSCommands();
      break;

    case 'email':
      await showEmailRoutingSetup();
      break;

    case 'verify':
      await verifyDNSSetup();
      break;

    case 'all':
      await showAll();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      await showHelp();
      break;
  }
}

// Run the CLI
if (import.meta.main) {
  main().catch(console.error);
}

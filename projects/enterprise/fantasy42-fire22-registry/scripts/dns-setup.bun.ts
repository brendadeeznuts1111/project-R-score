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
  console.log(`🔐 Checking Cloudflare authentication...`);

  try {
    const result = await $`wrangler whoami`.quiet();
    console.log(`✅ Authenticated with Cloudflare`);
    return true;
  } catch (error) {
    console.log(`❌ Not authenticated with Cloudflare`);
    console.log(`🔑 Please run: wrangler auth login`);
    return false;
  }
}

async function showCurrentDNS() {
  console.log(`📋 Current DNS Configuration for apexodds.com`);
  console.log('═'.repeat(60));

  try {
    const result = await $`curl -s "https://api.cloudflare.com/client/v4/zones" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json"`.quiet();

    const zones = JSON.parse(result.stdout);
    if (zones.success && zones.result.length > 0) {
      console.log(`Found ${zones.result.length} zone(s)`);
      zones.result.forEach((zone: any) => {
        console.log(`- ${zone.name} (${zone.status})`);
      });
    }
  } catch (error) {
    console.log(`⚠️  Could not fetch current DNS (API token may not be set)`);
    console.log(`💡 Manual DNS setup required in Cloudflare Dashboard`);
  }
}

async function generateDNSCommands() {
  console.log(`🔧 DNS Configuration Commands for apexodds.com`);
  console.log('═'.repeat(60));

  console.log(`\n# CNAME Records (add these in Cloudflare DNS settings)`);
  console.log(`# Go to: https://dash.cloudflare.com/ > apexodds.com > DNS`);

  DNS_CONFIG.cnames.forEach(cname => {
    console.log(`CNAME ${cname.name}.apexodds.com ${cname.target} # ${cname.comment}`);
  });

  console.log(`\n# MX Records for Email Routing`);
  DNS_CONFIG.mx.forEach(mx => {
    console.log(`MX ${mx.name} ${mx.target} ${mx.priority}`);
  });

  console.log(`\n# TXT Records for Email Security`);
  DNS_CONFIG.txt.forEach(txt => {
    console.log(`TXT ${txt.name} "${txt.content}"`);
  });

  console.log(`\n# Wildcard CNAME for dynamic subdomains`);
  DNS_CONFIG.wildcard.forEach(wc => {
    console.log(`CNAME ${wc.name} ${wc.target} # ${wc.comment}`);
  });
}

async function showEmailRoutingSetup() {
  console.log(`📧 Email Routing Configuration`);
  console.log('═'.repeat(60));

  console.log(`\n# 1. Enable Email Routing in Cloudflare Dashboard`);
  console.log(`# Go to: https://dash.cloudflare.com/ > apexodds.com > Email > Email Routing`);
  console.log(`# Click "Create address" or "Create catch-all"`);

  console.log(`\n# 2. Create Email Routing Rules:`);

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
    console.log(`\n${index + 1}. ${rule.name}`);
    console.log(`   Matcher: ${rule.matcher}`);
    console.log(`   Action: ${rule.action}`);
  });

  console.log(`\n# 3. Create Catch-All Rule:`);
  console.log(`   - Matcher: *@apexodds.com`);
  console.log(`   - Action: Forward to catchall@fire22.com`);
  console.log(`   - Enable: Yes`);
}

async function verifyDNSSetup() {
  console.log(`🔍 Verifying DNS Setup`);
  console.log('═'.repeat(60));

  const subdomains = ['dev', 'staging', 'api', 'docs', 'registry', 'dashboard'];

  for (const subdomain of subdomains) {
    try {
      console.log(`\n🔍 Checking ${subdomain}.apexodds.com...`);
      const result = await $`dig ${subdomain}.apexodds.com CNAME +short`.quiet();

      if (result.stdout.trim()) {
        console.log(`✅ CNAME found: ${result.stdout.trim()}`);
      } else {
        console.log(`❌ No CNAME found for ${subdomain}.apexodds.com`);
      }
    } catch (error) {
      console.log(`❌ Could not check ${subdomain}.apexodds.com`);
    }
  }

  console.log(`\n🔍 Checking MX records...`);
  try {
    const mxResult = await $`dig apexodds.com MX +short`.quiet();
    if (mxResult.stdout.trim()) {
      console.log(`✅ MX records found:`);
      console.log(mxResult.stdout);
    } else {
      console.log(`❌ No MX records found`);
    }
  } catch (error) {
    console.log(`❌ Could not check MX records`);
  }
}

async function showHelp() {
  console.log(`
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
  console.log(`🌐 COMPLETE DNS & EMAIL SETUP FOR apexodds.com`);
  console.log('═'.repeat(80));

  await generateDNSCommands();
  console.log('\n' + '='.repeat(60));
  await showEmailRoutingSetup();
  console.log('\n' + '='.repeat(60));
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

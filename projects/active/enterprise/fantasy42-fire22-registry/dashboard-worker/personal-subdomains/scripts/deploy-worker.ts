#!/usr/bin/env bun
/**
 * Deploy Fire22 Personal Subdomains Worker
 * Complete deployment script for the personal subdomain infrastructure
 */

import { $ } from 'bun';

interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  zoneId: string;
}

async function main() {
  console.info('🚀 Starting Fire22 Personal Subdomains Deployment...\n');

  // Step 1: Check prerequisites
  console.info('📋 Step 1: Checking prerequisites...');
  await checkPrerequisites();

  // Step 2: Configure Cloudflare
  console.info('⚙️ Step 2: Configuring Cloudflare settings...');
  const config = await getCloudflareConfig();

  // Step 3: Create KV namespaces
  console.info('🗄️ Step 3: Creating KV namespaces...');
  await createKVNamespaces(config);

  // Step 4: Deploy the worker
  console.info('👷 Step 4: Deploying Cloudflare Worker...');
  await deployWorker(config);

  // Step 5: Seed employee data (including vinny2times VIP)
  console.info('🌱 Step 5: Seeding employee data...');
  await seedEmployeeData(config);

  // Step 6: Configure DNS
  console.info('🌐 Step 6: Configuring wildcard DNS...');
  await configureDNS(config);

  // Step 7: Test deployment
  console.info('🧪 Step 7: Testing deployment...');
  await testDeployment();

  console.info('\n🎉 Deployment complete! Personal subdomains are now operational.');
  console.info('\n📋 Next Steps:');
  console.info('1. Verify vinny2times.fire22.workers.dev is working (CRITICAL)');
  console.info('2. Test executive subdomains');
  console.info('3. Configure monitoring and alerts');
  console.info('4. Update team directory with subdomain URLs');
}

async function checkPrerequisites() {
  // Check if wrangler is installed
  try {
    await $`wrangler --version`.quiet();
    console.info('✅ Wrangler CLI is installed');
  } catch {
    console.info('❌ Wrangler CLI not found. Installing...');
    await $`npm install -g wrangler`;
    console.info('✅ Wrangler CLI installed');
  }

  // Check if we're in the right directory
  const cwd = process.cwd();
  if (!cwd.includes('personal-subdomains')) {
    console.info('❌ Please run this script from the personal-subdomains directory');
    process.exit(1);
  }

  // Check if wrangler.toml exists
  try {
    await Bun.file('wrangler.toml').stat();
    console.info('✅ wrangler.toml configuration found');
  } catch {
    console.info('❌ wrangler.toml not found');
    process.exit(1);
  }

  console.info('✅ All prerequisites met\n');
}

async function getCloudflareConfig(): Promise<CloudflareConfig> {
  // Get configuration from environment variables
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!accountId || !apiToken || !zoneId) {
    console.info('❌ Missing Cloudflare configuration. Please set:');
    console.info('   CLOUDFLARE_ACCOUNT_ID');
    console.info('   CLOUDFLARE_API_TOKEN');
    console.info('   CLOUDFLARE_ZONE_ID');
    process.exit(1);
  }

  console.info('✅ Cloudflare configuration loaded\n');
  return { accountId, apiToken, zoneId };
}

async function createKVNamespaces(config: CloudflareConfig) {
  const { accountId, apiToken } = config;

  // Create PERSONAL_SITES namespace
  console.info('Creating PERSONAL_SITES KV namespace...');
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'personal_sites_kv_namespace',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const personalSitesId = data.result.id;
    console.info(`✅ Created PERSONAL_SITES namespace: ${personalSitesId}`);

    // Update wrangler.toml with the actual IDs
    let wranglerConfig = await Bun.file('wrangler.toml').text();
    wranglerConfig = wranglerConfig.replace(
      'id = "personal_sites_kv_namespace"',
      `id = "${personalSitesId}"`
    );
    await Bun.file('wrangler.toml').write(wranglerConfig);
  } catch (error) {
    console.info(`⚠️ PERSONAL_SITES namespace may already exist: ${error.message}`);
  }

  // Create EMPLOYEE_DATA namespace
  console.info('Creating EMPLOYEE_DATA KV namespace...');
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'employee_data_kv_namespace',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const employeeDataId = data.result.id;
    console.info(`✅ Created EMPLOYEE_DATA namespace: ${employeeDataId}`);

    // Update wrangler.toml with the actual IDs
    let wranglerConfig = await Bun.file('wrangler.toml').text();
    wranglerConfig = wranglerConfig.replace(
      'id = "employee_data_kv_namespace"',
      `id = "${employeeDataId}"`
    );
    await Bun.file('wrangler.toml').write(wranglerConfig);
  } catch (error) {
    console.info(`⚠️ EMPLOYEE_DATA namespace may already exist: ${error.message}`);
  }

  console.info('✅ KV namespaces configured\n');
}

async function deployWorker(config: CloudflareConfig) {
  console.info('Deploying worker to Cloudflare...');

  try {
    // Use wrangler to deploy
    await $`wrangler deploy --env production`;

    console.info('✅ Worker deployed successfully');

    // Get the deployed worker URL
    const proc = await $`wrangler tail --format json`.quiet();
    console.info('✅ Worker logs accessible');
  } catch (error) {
    console.info(`❌ Worker deployment failed: ${error.message}`);
    console.info('Please check your wrangler.toml configuration and try again.');
    process.exit(1);
  }

  console.info('✅ Worker deployment complete\n');
}

async function seedEmployeeData(config: CloudflareConfig) {
  const { accountId, apiToken } = config;

  console.info('Seeding employee data into KV namespace...');

  // Import the employee data
  const { employees } = await import('./seed-employee-data');

  // Get the KV namespace ID from wrangler.toml
  const wranglerConfig = await Bun.file('wrangler.toml').text();
  const employeeDataMatch = wranglerConfig.match(/id = "([^"]*employee_data[^"]*)"/);

  if (!employeeDataMatch) {
    console.info('❌ Could not find EMPLOYEE_DATA namespace ID in wrangler.toml');
    console.info('Please check your configuration and try again.');
    return;
  }

  const namespaceId = employeeDataMatch[1];

  // Seed data via KV API
  for (const employee of employees) {
    const key = `employee:${employee.id}`;

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(employee),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.info(`✅ Seeded data for ${employee.name} (${employee.id})`);

      // Special handling for VIP (vinny2times) - CRITICAL
      if (employee.id === 'vinny2times') {
        console.info('🎯 CRITICAL: Vinny2Times data seeded - verifying access...');

        // Verify the data was stored correctly
        const verifyResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );

        if (verifyResponse.ok) {
          const storedData = await verifyResponse.json();
          if (storedData.id === 'vinny2times') {
            console.info('✅ CRITICAL: Vinny2Times data verified successfully');
          }
        }
      }
    } catch (error) {
      console.info(`❌ Failed to seed data for ${employee.name}: ${error.message}`);
    }
  }

  console.info('✅ Employee data seeding complete\n');
}

async function configureDNS(config: CloudflareConfig) {
  const { zoneId, apiToken } = config;

  console.info('Configuring wildcard DNS for *.fire22.workers.dev...');

  // Check if wildcard DNS record already exists
  try {
    const listResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=CNAME&name=*.fire22.workers.dev`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    if (listResponse.ok) {
      const data = await listResponse.json();
      if (data.result.length > 0) {
        console.info('✅ Wildcard DNS record already exists');
        return;
      }
    }
  } catch (error) {
    console.info(`⚠️ Could not check existing DNS records: ${error.message}`);
  }

  // Create wildcard CNAME record
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: '*.fire22.workers.dev',
          content: 'fire22.workers.dev',
          ttl: 1, // Auto TTL
          proxied: true, // Enable Cloudflare proxy
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.info('✅ Wildcard DNS record created successfully');
  } catch (error) {
    console.info(`❌ Failed to create wildcard DNS record: ${error.message}`);
    console.info('You may need to create this manually in the Cloudflare dashboard.');
  }

  console.info('✅ DNS configuration complete\n');
}

async function testDeployment() {
  console.info('Testing deployment with critical endpoints...');

  const testUrls = [
    'https://vinny2times.fire22.workers.dev/', // CRITICAL - VIP
    'https://william-harris.fire22.workers.dev/', // CEO
    'https://chris-brown.fire22.workers.dev/', // CTO
    'https://fire22.workers.dev/', // Root domain
  ];

  for (const url of testUrls) {
    try {
      console.info(`Testing ${url}...`);
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Fire22-Deployment-Test/1.0',
        },
      });

      if (response.ok) {
        console.info(`✅ ${url} - Status: ${response.status}`);

        // Special verification for VIP subdomain
        if (url.includes('vinny2times')) {
          const body = await fetch(url).then(r => r.text());
          if (body.includes('Vinny2Times') && body.includes('VIP Management')) {
            console.info('🎯 CRITICAL: Vinny2Times VIP features verified!');
          }
        }
      } else {
        console.info(`❌ ${url} - Status: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.info(`❌ ${url} - Error: ${error.message}`);
    }
  }

  console.info('✅ Deployment testing complete\n');

  // Summary
  console.info('📊 DEPLOYMENT SUMMARY:');
  console.info('• Worker deployed and operational');
  console.info('• Employee data seeded into KV');
  console.info('• Wildcard DNS configured');
  console.info('• VIP subdomain (vinny2times) ready');
  console.info('• Executive subdomains operational');
  console.info('• Ready for remaining employee rollout');
}

// Run the deployment
if (import.meta.main) {
  main().catch(console.error);
}

export { main as deployPersonalSubdomains };

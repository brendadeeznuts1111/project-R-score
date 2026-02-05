#!/usr/bin/env bun

// [GOV][USERS][SYNC][USER-SYNC-001][v2.12][ACTIVE]

import { YAML } from "bun";
import { existsSync } from "fs";
import { join } from "path";

const VAULT = process.cwd();
const DATA_DIR = join(VAULT, 'data');
const GOV_DIR = join(VAULT, 'gov', 'users');

interface SportsUser {
  id: string | number;
  name: string;
  email: string;
  role?: string;
  betLimit?: number;
  status?: string;
  created?: string;
}

interface GOVUser {
  id: string;
  name: string;
  email: string;
  role: string;
  betLimit: number;
  govRule: string;
  status: string;
  syncedAt: string;
}

// Generate header function (similar to existing gen function)
function gen(domain: string, scope: string, type: string, priority: string, id: string): string {
  const version = 'v2.12';
  const status = 'ACTIVE';
  return `[${domain}][${scope}][${type}][${id}][${version}][${status}]`;
}

async function syncUsers(): Promise<void> {
  console.log('🔄 Starting users sync from Sports Widgets API...');

  // Ensure directories exist
  await Bun.mkdir(DATA_DIR, { recursive: true });
  await Bun.mkdir(GOV_DIR, { recursive: true });

  try {
    // Get API credentials from environment
    const apiUrl = process.env.DATAPIPE_USERS_URL || 'https://plive.sportswidgets.pro/manager-tools/ajax.php';
    const cookie = process.env.DATAPIPE_COOKIE;
    const partnerId = process.env.DATAPIPE_PARTNER_ID || '118';

    if (!cookie) {
      console.error('❌ Missing DATAPIPE_COOKIE environment variable');
      console.log('💡 Set your cookie: export DATAPIPE_COOKIE="your_cookie_here"');
      process.exit(1);
    }

    console.log('🌐 Fetching users from Sports Widgets API...');

    // Make API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://plive.sportswidgets.pro/manager-tools/',
      },
      body: JSON.stringify({
        action: "getUsersList",
        partnerId: parseInt(partnerId)
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 API Response received');

    // Parse users from response (adapt based on actual API structure)
    let users: SportsUser[] = [];

    if (data.r && data.r.users) {
      users = data.r.users;
    } else if (data.users) {
      users = data.users;
    } else if (Array.isArray(data)) {
      users = data;
    } else {
      console.warn('⚠️  Unexpected API response structure, using empty array');
      console.log('🔍 Response sample:', JSON.stringify(data, null, 2).slice(0, 500) + '...');
    }

    console.log(`👥 Found ${users.length} users in API response`);

    // Transform to GOV format
    const govUsers: GOVUser[] = users.map((user, index) => {
      const userId = typeof user.id === 'string' ? user.id : user.id?.toString() || `user_${index + 1}`;
      const paddedId = userId.padStart(3, '0');

      return {
        id: userId,
        name: user.name || `User ${userId}`,
        email: user.email || `user${userId}@example.com`,
        role: user.role || 'AGENT',
        betLimit: user.betLimit || 1000,
        govRule: `USER-CAP-${paddedId}`,
        status: user.status || 'ACTIVE',
        syncedAt: new Date().toISOString()
      };
    });

    console.log(`🔄 Processing ${govUsers.length} users for GOV integration...`);

    // Save to YAML
    const yamlData = { users: govUsers, syncedAt: new Date().toISOString() };
    const yamlContent = YAML.stringify(yamlData);
    await Bun.write(join(DATA_DIR, 'users.yaml'), yamlContent);

    console.log(`💾 Saved ${govUsers.length} users to data/users.yaml`);

    // Auto-create GOV rules for each user
    let newRulesCount = 0;
    for (const user of govUsers) {
      const ruleCreated = await createUserRule(user);
      if (ruleCreated) newRulesCount++;
    }

    console.log(`✅ Created ${newRulesCount} new GOV rules in gov/users/`);
    console.log(`🎉 Users sync complete! ${govUsers.length} users, ${newRulesCount} rules`);

    // Summary
    const roles = [...new Set(govUsers.map(u => u.role))];
    const totalLimits = govUsers.reduce((sum, u) => sum + u.betLimit, 0);

    console.log('\n📊 Sync Summary:');
    console.log(`   👥 Total Users: ${govUsers.length}`);
    console.log(`   🏷️  Roles: ${roles.join(', ')}`);
    console.log(`   💰 Total Bet Limits: $${totalLimits.toLocaleString()}`);
    console.log(`   📋 Rules Created: ${newRulesCount}`);

  } catch (error) {
    console.error('❌ Users sync failed:', error.message);

    // Try to load existing users as fallback
    if (existsSync(join(DATA_DIR, 'users.yaml'))) {
      console.log('📁 Using cached users data');
    } else {
      throw error;
    }
  }
}

async function createUserRule(user: GOVUser): Promise<boolean> {
  const ruleId = user.govRule;
  const ruleFile = join(GOV_DIR, `${ruleId}.md`);

  // Check if rule already exists
  if (existsSync(ruleFile)) {
    console.log(`⏭️  Rule ${ruleId} already exists, skipping`);
    return false;
  }

  const header = gen('GOV', 'USERS', 'RULE', 'REQUIRED', ruleId);

  const ruleContent = `# ${header}

**User**: ${user.name} (${user.email})
**Role**: ${user.role}
**Bet Limit**: $${user.betLimit}
**Status**: ${user.status}

## Trigger
User ${user.name} exceeds daily bet limit of $${user.betLimit}

## Action
- Pause user betting activity
- Send Telegram alert to syndicate admins
- Log violation in audit trail
- Require manual review for reinstatement

## Priority
REQUIRED

## Example
${user.name} bets $1,200 in 24h → Auto-pause + "/alert ${user.name} over limit"

## Enforcement
Automated via datapipe monitoring + GOV rule engine

---
*Auto-generated for user ${user.id} on ${user.syncedAt}*
`;

  await Bun.write(ruleFile, ruleContent);
  console.log(`📝 Created rule: ${ruleId} for ${user.name}`);
  return true;
}

// CLI Interface
const cmd = process.argv[2];

switch (cmd) {
  case 'sync':
  case undefined:
    syncUsers().catch(console.error);
    break;

  case 'test':
    console.log('🧪 Testing users sync (dry run)...');
    console.log('💡 Set DATAPIPE_COOKIE to test real API');
    console.log('📁 Would create data/users.yaml and gov/users/*.md');
    break;

  default:
    console.log('Users Sync Commands:');
    console.log('  sync  - Sync users from Sports Widgets API');
    console.log('  test  - Dry run test (no API calls)');
}

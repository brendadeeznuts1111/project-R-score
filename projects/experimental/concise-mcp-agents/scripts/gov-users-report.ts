#!/usr/bin/env bun

// [GOV][USERS-REPORT][RULES][AUTO-GEN][v2.15][ACTIVE]

// Bun-native YAML support

const VAULT = process.cwd();

const USER_REPORT_RULES = [
  {
    id: 'USERREP-CAP-001',
    trigger: 'User profit >$5k',
    action: 'Cap bets + alert',
    example: 'John +$6k → Pause',
    priority: 'HIGH',
    automated: true
  },
  {
    id: 'USERREP-ROI-001',
    trigger: 'ROI < -10%',
    action: 'Review + limit down',
    example: 'ROI -15% → $200 cap',
    priority: 'MEDIUM',
    automated: true
  },
  {
    id: 'USERREP-INACTIVE-001',
    trigger: 'Bets =0 (7d)',
    action: 'Deactivate',
    example: 'No bets → Archive',
    priority: 'LOW',
    automated: true
  },
  {
    id: 'USERREP-SPEND-001',
    trigger: 'Vol >$10k/day',
    action: 'Manual approve',
    example: 'High vol → Telegram',
    priority: 'HIGH',
    automated: false
  },
  {
    id: 'USERREP-SYNC-001',
    trigger: 'Report >1h old',
    action: 'Auto-sync',
    example: 'Cron bun users-report:sync',
    priority: 'LOW',
    automated: true
  }
];

async function generateUserReportRules() {
  const rulesPath = `${VAULT}/config/users-report-rules.yaml`;

  const existingRules = await Bun.file(rulesPath).exists()
    ? YAML.parse(await Bun.file(rulesPath).text())
    : { rules: [] };

  // Merge with existing rules, avoiding duplicates
  const allRules = [...existingRules.rules];
  for (const rule of USER_REPORT_RULES) {
    if (!allRules.find(r => r.id === rule.id)) {
      allRules.push(rule);
    }
  }

  const yaml = YAML.stringify({ rules: allRules });
  await Bun.write(rulesPath, yaml);

  console.log(`✅ Generated ${allRules.length} user report rules`);
}

generateUserReportRules();

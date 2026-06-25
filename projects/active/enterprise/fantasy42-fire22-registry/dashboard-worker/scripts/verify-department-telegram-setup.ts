#!/usr/bin/env bun

/**
 * 🔍📱 Fire22 Department Telegram Setup Verification
 *
 * Verifies all departments are properly configured for Telegram support
 */

import { DepartmentalTelegramBot } from '../src/telegram/departmental-telegram-bot';

interface DepartmentVerification {
  name: string;
  configured: boolean;
  channel: string;
  issues: string[];
  recommendations: string[];
}

interface TeamDirectoryDepartment {
  name: string;
  domain: string;
  email: string;
  slack: string;
  color: string;
  members: Array<{
    id: string;
    name: string;
    role: string;
    email: string;
    status: string;
    quickActions: string[];
  }>;
}

async function verifyDepartmentTelegramSetup(): Promise<{
  totalDepartments: number;
  configuredDepartments: number;
  verificationResults: DepartmentVerification[];
  overallStatus: 'complete' | 'partial' | 'incomplete';
  recommendations: string[];
}> {
  console.info('🔍 Starting Fire22 Department Telegram Setup Verification...\n');

  const bot = new DepartmentalTelegramBot();
  const configuredDepartments = bot.getDepartments();
  const verificationResults: DepartmentVerification[] = [];

  // Load team directory to cross-reference
  let teamDirectory;
  try {
    const teamDirectoryFile = Bun.file('./src/communications/team-directory.json');
    teamDirectory = await teamDirectoryFile.json();
  } catch (error) {
    console.error('❌ Failed to load team directory:', error.message);
    throw error;
  }

  // Expected departments from team directory
  const expectedDepartments = Object.keys(teamDirectory.departments);
  console.info(`📋 Expected departments: ${expectedDepartments.length}`);
  console.info(`🤖 Configured in bot: ${configuredDepartments.length}\n`);

  // Verify each expected department
  for (const deptName of expectedDepartments) {
    const teamDept: TeamDirectoryDepartment = teamDirectory.departments[deptName];
    const botDept = configuredDepartments.find(d => d.name === deptName);

    const verification: DepartmentVerification = {
      name: deptName,
      configured: !!botDept,
      channel: botDept?.channel || 'NOT_CONFIGURED',
      issues: [],
      recommendations: [],
    };

    // Check if department is configured in bot
    if (!botDept) {
      verification.issues.push('Department not configured in Telegram bot');
      verification.recommendations.push('Add department configuration to DepartmentalTelegramBot');
    }

    // Check if Telegram channel exists in team directory
    const telegramChannels = teamDirectory.communicationChannels?.telegram?.channels;
    if (telegramChannels && !telegramChannels[deptName]) {
      verification.issues.push('No Telegram channel defined in team directory');
      verification.recommendations.push(
        `Add '${deptName}' channel to communicationChannels.telegram.channels`
      );
    }

    // Check if department members have Telegram quick actions
    const membersWithTelegram = teamDept.members.filter(
      member =>
        member.quickActions.includes('telegram') || member.quickActions.includes('telegram-dm')
    );

    if (membersWithTelegram.length === 0) {
      verification.issues.push('No team members configured with Telegram quick actions');
      verification.recommendations.push('Add telegram/telegram-dm to member quickActions');
    }

    // Check channel naming convention
    if (botDept && !botDept.channel.startsWith('@fire22_')) {
      verification.issues.push('Channel does not follow naming convention');
      verification.recommendations.push('Use @fire22_{department} naming pattern');
    }

    verificationResults.push(verification);

    // Log verification result
    const status = verification.configured ? '✅' : '❌';
    const issueCount = verification.issues.length;
    const issueText = issueCount > 0 ? ` (${issueCount} issues)` : '';

    console.info(`${status} ${deptName.toUpperCase()}: ${verification.channel}${issueText}`);
    if (verification.issues.length > 0) {
      verification.issues.forEach(issue => console.info(`   ⚠️ ${issue}`));
    }
  }

  // Check for extra departments in bot not in team directory
  const extraDepartments = configuredDepartments.filter(
    botDept => !expectedDepartments.includes(botDept.name)
  );

  if (extraDepartments.length > 0) {
    console.info('\n🤔 Extra departments in bot configuration:');
    extraDepartments.forEach(dept => {
      console.info(`   🤖 ${dept.name}: ${dept.channel}`);
    });
  }

  // Generate overall recommendations
  const overallRecommendations: string[] = [];
  const configuredCount = verificationResults.filter(v => v.configured).length;
  const totalIssues = verificationResults.reduce((sum, v) => sum + v.issues.length, 0);

  if (configuredCount < expectedDepartments.length) {
    overallRecommendations.push(
      `Configure ${expectedDepartments.length - configuredCount} missing departments in bot`
    );
  }

  if (totalIssues > 0) {
    overallRecommendations.push(`Resolve ${totalIssues} configuration issues across departments`);
  }

  // Check if all essential departments are covered
  const essentialDepartments = ['finance', 'support', 'compliance', 'technology', 'operations'];
  const missingEssential = essentialDepartments.filter(
    dept => !verificationResults.find(v => v.name === dept && v.configured)
  );

  if (missingEssential.length > 0) {
    overallRecommendations.push(`Configure essential departments: ${missingEssential.join(', ')}`);
  }

  // Check for 24/7 support coverage
  const support24x7 = ['support', 'technology', 'operations'];
  overallRecommendations.push(
    'Ensure 24/7 coverage for critical departments: support, technology, operations'
  );

  // Determine overall status
  let overallStatus: 'complete' | 'partial' | 'incomplete';
  if (configuredCount === expectedDepartments.length && totalIssues === 0) {
    overallStatus = 'complete';
  } else if (configuredCount >= expectedDepartments.length * 0.7) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'incomplete';
  }

  console.info('\n📊 VERIFICATION SUMMARY');
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.info(`Total Departments: ${expectedDepartments.length}`);
  console.info(`Configured: ${configuredCount}`);
  console.info(`Issues Found: ${totalIssues}`);
  console.info(`Overall Status: ${overallStatus.toUpperCase()}`);

  if (overallRecommendations.length > 0) {
    console.info('\n💡 RECOMMENDATIONS:');
    overallRecommendations.forEach(rec => console.info(`- ${rec}`));
  }

  return {
    totalDepartments: expectedDepartments.length,
    configuredDepartments: configuredCount,
    verificationResults,
    overallStatus,
    recommendations: overallRecommendations,
  };
}

async function generateSetupScript(): Promise<void> {
  console.info('\n🛠️ Generating department setup script...');

  const setupScript = `#!/usr/bin/env bun

/**
 * 🏗️📱 Fire22 Department Telegram Setup Script
 * 
 * Automatically sets up all department Telegram channels and configurations
 */

// 1. Create Telegram channels (manual step - requires Telegram admin)
const channelsToCreate = [
  '@fire22_finance_support',
  '@fire22_customer_support', 
  '@fire22_compliance',
  '@fire22_tech_support',
  '@fire22_operations',
  '@fire22_marketing',
  '@fire22_executive',
  '@fire22_communications',
  '@fire22_team',
  '@fire22_design',
  '@fire22_emergency',
  '@fire22_escalation',
  '@fire22_help'
];

console.info('📱 TELEGRAM CHANNELS TO CREATE:');
channelsToCreate.forEach(channel => {
  console.info(\`- \${channel}\`);
});

// 2. Bot setup commands
const botCommands = [
  '/setcommands',
  'help - Get help with Fire22 support',
  'departments - List all support departments', 
  'status - Check inquiry status',
  'escalate - Escalate your inquiry',
  'language - Change language (en/es/pt/fr)'
];

console.info('\\n🤖 BOT COMMANDS TO CONFIGURE:');
botCommands.forEach(cmd => {
  console.info(cmd);
});

// 3. Channel configuration
const channelConfig = {
  description: 'Fire22 {DEPARTMENT} Department - Professional customer support',
  rules: [
    'React with ✅ to claim inquiries',
    'Respond within department SLA times',
    'Update inquiry status when resolved',
    'Escalate if unable to resolve within time limit',
    'Maintain professional, helpful communication'
  ]
};

console.info('\\n⚙️ CHANNEL CONFIGURATION:');
console.info(\`Description template: \${channelConfig.description}\`);
console.info('Rules:');
channelConfig.rules.forEach(rule => {
  console.info(\`- \${rule}\`);
});

export { channelsToCreate, botCommands, channelConfig };
`;

  await Bun.write('./scripts/setup-department-telegram.ts', setupScript);
  console.info('✅ Setup script generated: scripts/setup-department-telegram.ts');
}

async function testSystemIntegration(): Promise<void> {
  console.info('\n🧪 Testing system integration...');

  try {
    const bot = new DepartmentalTelegramBot();

    // Test department stats
    const stats = bot.getDepartmentStats();
    console.info(`✅ Department stats: ${stats.size} departments tracked`);

    // Test performance report
    const report = bot.generatePerformanceReport();
    console.info(`✅ Performance report: ${report.length} characters generated`);

    // Test sample inquiry routing
    const testUser = {
      id: 99999,
      username: 'test_user',
      first_name: 'Test',
      language_code: 'en',
    };

    const testMessage = 'I need help with my payment withdrawal';
    const result = await bot.routeCustomerInquiry(testUser, testMessage, 'normal');

    console.info(`✅ Inquiry routing: ${result.inquiryId} → ${result.department} dept`);
    console.info(`   Wait time: ${result.estimatedWaitTime} minutes`);
  } catch (error) {
    console.error(`❌ Integration test failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.info('🔥📱 FIRE22 DEPARTMENT TELEGRAM VERIFICATION');
  console.info('='.repeat(50));

  try {
    // Run verification
    const results = await verifyDepartmentTelegramSetup();

    // Generate setup script
    await generateSetupScript();

    // Test system integration
    await testSystemIntegration();

    console.info('\n🎉 VERIFICATION COMPLETE!');
    console.info('='.repeat(50));

    if (results.overallStatus === 'complete') {
      console.info('✅ All departments properly configured for Telegram support');
    } else {
      console.info(`⚠️ Setup is ${results.overallStatus} - see recommendations above`);
    }

    return results;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { verifyDepartmentTelegramSetup, generateSetupScript, testSystemIntegration };

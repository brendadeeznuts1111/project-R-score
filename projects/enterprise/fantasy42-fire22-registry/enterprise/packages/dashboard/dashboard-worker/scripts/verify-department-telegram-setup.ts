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
  console.log('🔍 Starting Fire22 Department Telegram Setup Verification...\n');

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
  console.log(`📋 Expected departments: ${expectedDepartments.length}`);
  console.log(`🤖 Configured in bot: ${configuredDepartments.length}\n`);

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

    console.log(`${status} ${deptName.toUpperCase()}: ${verification.channel}${issueText}`);
    if (verification.issues.length > 0) {
      verification.issues.forEach(issue => console.log(`   ⚠️ ${issue}`));
    }
  }

  // Check for extra departments in bot not in team directory
  const extraDepartments = configuredDepartments.filter(
    botDept => !expectedDepartments.includes(botDept.name)
  );

  if (extraDepartments.length > 0) {
    console.log('\n🤔 Extra departments in bot configuration:');
    extraDepartments.forEach(dept => {
      console.log(`   🤖 ${dept.name}: ${dept.channel}`);
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

  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Departments: ${expectedDepartments.length}`);
  console.log(`Configured: ${configuredCount}`);
  console.log(`Issues Found: ${totalIssues}`);
  console.log(`Overall Status: ${overallStatus.toUpperCase()}`);

  if (overallRecommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    overallRecommendations.forEach(rec => console.log(`- ${rec}`));
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
  console.log('\n🛠️ Generating department setup script...');

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

console.log('📱 TELEGRAM CHANNELS TO CREATE:');
channelsToCreate.forEach(channel => {
  console.log(\`- \${channel}\`);
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

console.log('\\n🤖 BOT COMMANDS TO CONFIGURE:');
botCommands.forEach(cmd => {
  console.log(cmd);
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

console.log('\\n⚙️ CHANNEL CONFIGURATION:');
console.log(\`Description template: \${channelConfig.description}\`);
console.log('Rules:');
channelConfig.rules.forEach(rule => {
  console.log(\`- \${rule}\`);
});

export { channelsToCreate, botCommands, channelConfig };
`;

  await Bun.write('./scripts/setup-department-telegram.ts', setupScript);
  console.log('✅ Setup script generated: scripts/setup-department-telegram.ts');
}

async function testSystemIntegration(): Promise<void> {
  console.log('\n🧪 Testing system integration...');

  try {
    const bot = new DepartmentalTelegramBot();

    // Test department stats
    const stats = bot.getDepartmentStats();
    console.log(`✅ Department stats: ${stats.size} departments tracked`);

    // Test performance report
    const report = bot.generatePerformanceReport();
    console.log(`✅ Performance report: ${report.length} characters generated`);

    // Test sample inquiry routing
    const testUser = {
      id: 99999,
      username: 'test_user',
      first_name: 'Test',
      language_code: 'en',
    };

    const testMessage = 'I need help with my payment withdrawal';
    const result = await bot.routeCustomerInquiry(testUser, testMessage, 'normal');

    console.log(`✅ Inquiry routing: ${result.inquiryId} → ${result.department} dept`);
    console.log(`   Wait time: ${result.estimatedWaitTime} minutes`);
  } catch (error) {
    console.error(`❌ Integration test failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('🔥📱 FIRE22 DEPARTMENT TELEGRAM VERIFICATION');
  console.log('='.repeat(50));

  try {
    // Run verification
    const results = await verifyDepartmentTelegramSetup();

    // Generate setup script
    await generateSetupScript();

    // Test system integration
    await testSystemIntegration();

    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log('='.repeat(50));

    if (results.overallStatus === 'complete') {
      console.log('✅ All departments properly configured for Telegram support');
    } else {
      console.log(`⚠️ Setup is ${results.overallStatus} - see recommendations above`);
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

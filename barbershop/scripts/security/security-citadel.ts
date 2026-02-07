#!/usr/bin/env bun

// scripts/security-citadel.ts

import { factoryWagerSecurityCitadel } from '../lib/secrets/core/factorywager-security-citadel';
import { BUN_DOCS } from '../lib/utils/docs/urls';

const args = Bun.argv.slice(2);
const command = args[0];

function styled(
  text: string,
  type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'
): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m',
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

function showHelp() {
  console.log(styled('🏰 FactoryWager Security Citadel v5.1', 'accent'));
  console.log(styled('=====================================', 'muted'));
  console.log();
  console.log(styled('Enterprise-grade secrets management with immutable versioning', 'info'));
  console.log();
  console.log(styled('Core Features:', 'primary'));
  console.log('  📜 Immutable Versioning      - One-click rollback with full audit trail');
  console.log('  🔄 Lifecycle Automation      - Scheduled rotations and expiration monitoring');
  console.log('  📊 Visual Version Graphs     - Mermaid, D3.js, and terminal visualizations');
  console.log('  🌐 R2 Temporal Storage       - Persistent storage with compliance metadata');
  console.log();
  console.log(styled('Commands:', 'primary'));
  console.log('  create <key> <value> [author] [description]     Create immutable version');
  console.log('  rollback <key> <version> [author] [reason]      One-click rollback');
  console.log('  visualize <key>                                   Generate visual graphs');
  console.log('  timeline <key> [limit]                            Show version timeline');
  console.log('  automate <key> <schedule> [config]               Setup lifecycle automation');
  console.log('  dashboard                                         Show dashboard stats');
  console.log('  audit <key> [format]                              Export audit report');
  console.log('  help                                              Show this help');
  console.log();
  console.log(styled('Examples:', 'primary'));
  console.log('  # Create a new secret version');
  console.log(
    '  bun run scripts/security-citadel.ts create API_KEY "sk_live_xxx" "developer" "Production API key"'
  );
  console.log();
  console.log('  # One-click rollback');
  console.log(
    '  bun run scripts/security-citadel.ts rollback API_KEY v2.1.5 "admin" "Security issue"'
  );
  console.log();
  console.log('  # Generate visualizations');
  console.log('  bun run scripts/security-citadel.ts visualize API_KEY');
  console.log();
  console.log('  # Setup automated rotation');
  console.log('  bun run scripts/security-citadel.ts automate API_KEY cron "0 0 1 * *"');
  console.log();
  console.log(styled(`📖 Documentation: ${BUN_DOCS.factorywager.secrets}`, 'accent'));
}

async function handleCreate() {
  const [key, value, author, description] = [args[1], args[2], args[3], args[4]];

  if (!key || !value) {
    console.log(styled('❌ Missing key or value', 'error'));
    console.log(styled('Usage: create <key> <value> [author] [description]', 'muted'));
    return;
  }

  try {
    console.log(styled('📜 Creating immutable version...', 'info'));
    console.log(styled(`   Key: ${key}`, 'primary'));
    console.log(
      styled(`   Value: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`, 'muted')
    );

    const version = await factoryWagerSecurityCitadel.createImmutableVersion(
      key,
      value,
      author || Bun.env.USER || 'system',
      description
    );

    console.log();
    console.log(styled('✅ Immutable version created!', 'success'));
    console.log(styled(`   Version: ${version.version}`, 'primary'));
    console.log(styled(`   Author: ${version.author}`, 'info'));
    console.log(styled(`   Timestamp: ${version.timestamp}`, 'muted'));
    console.log(styled(`   Checksum: ${version.checksum}`, 'muted'));

    if (version.description) {
      console.log(styled(`   Description: ${version.description}`, 'info'));
    }
  } catch (error) {
    console.log(styled(`❌ Failed to create version: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleRollback() {
  const [key, targetVersion, author, reason] = [args[1], args[2], args[3], args[4]];

  if (!key || !targetVersion) {
    console.log(styled('❌ Missing key or target version', 'error'));
    console.log(styled('Usage: rollback <key> <version> [author] [reason]', 'muted'));
    return;
  }

  try {
    console.log(styled('⏪ One-click rollback...', 'warning'));
    console.log(styled(`   Key: ${key}`, 'primary'));
    console.log(styled(`   Target: ${targetVersion}`, 'info'));

    const result = await factoryWagerSecurityCitadel.oneClickRollback(
      key,
      targetVersion,
      author || Bun.env.USER || 'system',
      reason
    );

    console.log();
    console.log(styled('✅ Rollback completed!', 'success'));
    console.log(styled(`   Rolled back to: ${result.rolledBackTo}`, 'primary'));
    console.log(styled(`   Previous version: ${result.previousVersion}`, 'muted'));
    console.log(styled(`   Audit ID: ${result.auditId}`, 'info'));
  } catch (error) {
    console.log(styled(`❌ Rollback failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleVisualize() {
  const key = args[1];

  if (!key) {
    console.log(styled('❌ Missing key', 'error'));
    console.log(styled('Usage: visualize <key>', 'muted'));
    return;
  }

  try {
    console.log(styled('📊 Generating visual graphs...', 'info'));
    console.log(styled(`   Key: ${key}`, 'primary'));

    const visualData = await factoryWagerSecurityCitadel.generateVisualGraph(key);

    console.log();
    console.log(styled('📊 Visual Graphs Generated!', 'success'));
    console.log();

    // Show terminal visualization
    console.log(styled('🖥️  Terminal Visualization:', 'accent'));
    console.log(visualData.terminal);
    console.log();

    // Show Mermaid diagram
    console.log(styled('🔗 Mermaid Diagram:', 'accent'));
    console.log(styled('```mermaid', 'muted'));
    console.log(visualData.mermaid);
    console.log(styled('```', 'muted'));
    console.log();

    // Show D3 data summary
    console.log(styled('📈 D3.js Data:', 'accent'));
    console.log(styled(`   Nodes: ${visualData.d3.nodes.length}`, 'info'));
    console.log(styled(`   Links: ${visualData.d3.links.length}`, 'info'));
    console.log(styled(`   Latest: ${visualData.timeline[0]?.version || 'N/A'}`, 'primary'));
  } catch (error) {
    console.log(styled(`❌ Visualization failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleTimeline() {
  const [key, limitStr] = [args[1], args[2]];

  if (!key) {
    console.log(styled('❌ Missing key', 'error'));
    console.log(styled('Usage: timeline <key> [limit]', 'muted'));
    return;
  }

  const limit = parseInt(limitStr) || 10;

  try {
    console.log(styled('📅 Loading timeline...', 'info'));

    const timeline = await factoryWagerSecurityCitadel.getSecretTimeline(key, limit);

    console.log();
    console.log(styled(`📅 Timeline for ${key} (showing ${timeline.length})`, 'primary'));
    console.log(styled('─'.repeat(60), 'muted'));

    timeline.forEach((entry, index) => {
      const isLatest = index === 0;
      const prefix = isLatest ? '★' : '•';
      const color =
        entry.action === 'CREATE' ? 'success' : entry.action === 'ROLLBACK' ? 'warning' : 'info';

      console.log(
        styled(`${prefix} ${entry.version}`, color) +
          styled(` | ${entry.timestamp.split('T')[0]}`, 'muted') +
          styled(` | ${entry.author}`, 'primary')
      );

      if (entry.description) {
        console.log(styled(`   "${entry.description}"`, 'muted'));
      }
    });
  } catch (error) {
    console.log(styled(`❌ Timeline failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleAutomate() {
  const [key, scheduleType, expression] = [args[1], args[2], args[3]];

  if (!key || !scheduleType || !expression) {
    console.log(styled('❌ Missing key, schedule type, or expression', 'error'));
    console.log(styled('Usage: automate <key> <cron|interval> <expression>', 'muted'));
    console.log(styled('Examples:', 'primary'));
    console.log('  automate API_KEY cron "0 0 1 * *"     # Monthly');
    console.log('  automate DB_PASS interval 2592000000   # 30 days');
    return;
  }

  try {
    console.log(styled('🔄 Setting up lifecycle automation...', 'info'));
    console.log(styled(`   Key: ${key}`, 'primary'));
    console.log(styled(`   Schedule: ${scheduleType} ${expression}`, 'success'));

    const ruleId = await factoryWagerSecurityCitadel.setupLifecycleAutomation(key, {
      schedule: scheduleType as 'cron' | 'interval',
      expression: scheduleType === 'cron' ? expression : parseInt(expression),
      autoRotate: true,
      warningDays: 7,
      notifications: ['admin@company.com'],
    });

    console.log();
    console.log(styled('✅ Lifecycle automation configured!', 'success'));
    console.log(styled(`   Rule ID: ${ruleId}`, 'primary'));
    console.log(styled(`   Auto-rotate: enabled`, 'success'));
    console.log(styled(`   Warning days: 7`, 'info'));
  } catch (error) {
    console.log(styled(`❌ Automation setup failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleDashboard() {
  try {
    console.log(styled('📊 Security Citadel Dashboard', 'accent'));
    console.log(styled('================================', 'muted'));

    const stats = await factoryWagerSecurityCitadel.getDashboardStats();

    console.log(styled(`🔑 Total Secrets: ${stats.totalSecrets}`, 'primary'));
    console.log(styled(`📜 Total Versions: ${stats.totalVersions}`, 'info'));
    console.log(styled(`🤖 Active Automations: ${stats.activeAutomations}`, 'success'));
    console.log(
      styled(
        `⚠️  Recent Activity: ${stats.recentActivity}`,
        stats.recentActivity > 0 ? 'warning' : 'success'
      )
    );
    console.log(
      styled(
        `📈 Compliance Score: ${stats.complianceScore}%`,
        stats.complianceScore >= 95 ? 'success' : 'warning'
      )
    );

    console.log();
    console.log(styled('🏭 FactoryWager v5.1 Features Active:', 'info'));
    console.log(styled('   ✅ Immutable Versioning', 'success'));
    console.log(styled('   ✅ One-Click Rollback', 'success'));
    console.log(styled('   ✅ Visual Graphs', 'success'));
    console.log(styled('   ✅ Lifecycle Automation', 'success'));
    console.log(styled('   ✅ R2 Temporal Storage', 'success'));
    console.log(styled('   ✅ Audit Trails', 'success'));
  } catch (error) {
    console.log(styled(`❌ Dashboard failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleAudit() {
  const [key, format] = [args[1], args[2]];

  if (!key) {
    console.log(styled('❌ Missing key', 'error'));
    console.log(styled('Usage: audit <key> [format]', 'muted'));
    return;
  }

  try {
    console.log(styled('📋 Generating audit report...', 'info'));

    const report = await factoryWagerSecurityCitadel.exportAuditReport(
      key,
      format as 'json' | 'csv'
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audit-${key}-${timestamp}.${format || 'json'}`;

    await Bun.write(filename, report);

    console.log();
    console.log(styled('📋 Audit report generated!', 'success'));
    console.log(styled(`   File: ${filename}`, 'primary'));
    console.log(styled(`   Format: ${format || 'json'}`, 'info'));
    console.log(styled(`   Size: ${report.length} bytes`, 'muted'));
  } catch (error) {
    console.log(styled(`❌ Audit report failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function main() {
  try {
    switch (command) {
      case 'create':
        await handleCreate();
        break;

      case 'rollback':
        await handleRollback();
        break;

      case 'visualize':
        await handleVisualize();
        break;

      case 'timeline':
        await handleTimeline();
        break;

      case 'automate':
        await handleAutomate();
        break;

      case 'dashboard':
        await handleDashboard();
        break;

      case 'audit':
        await handleAudit();
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        if (!command) {
          showHelp();
        } else {
          console.log(styled(`❌ Unknown command: ${command}`, 'error'));
          console.log(styled('Use "help" to see available commands', 'muted'));
        }
    }
  } catch (error) {
    console.error(styled(`❌ Error: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Run the Security Citadel CLI
main().catch(console.error);

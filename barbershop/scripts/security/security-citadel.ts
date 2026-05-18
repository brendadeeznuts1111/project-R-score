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
  console.info(styled('🏰 FactoryWager Security Citadel v5.1', 'accent'));
  console.info(styled('=====================================', 'muted'));
  console.info();
  console.info(styled('Enterprise-grade secrets management with immutable versioning', 'info'));
  console.info();
  console.info(styled('Core Features:', 'primary'));
  console.info('  📜 Immutable Versioning      - One-click rollback with full audit trail');
  console.info('  🔄 Lifecycle Automation      - Scheduled rotations and expiration monitoring');
  console.info('  📊 Visual Version Graphs     - Mermaid, D3.js, and terminal visualizations');
  console.info('  🌐 R2 Temporal Storage       - Persistent storage with compliance metadata');
  console.info();
  console.info(styled('Commands:', 'primary'));
  console.info('  create <key> <value> [author] [description]     Create immutable version');
  console.info('  rollback <key> <version> [author] [reason]      One-click rollback');
  console.info('  visualize <key>                                   Generate visual graphs');
  console.info('  timeline <key> [limit]                            Show version timeline');
  console.info('  automate <key> <schedule> [config]               Setup lifecycle automation');
  console.info('  dashboard                                         Show dashboard stats');
  console.info('  audit <key> [format]                              Export audit report');
  console.info('  help                                              Show this help');
  console.info();
  console.info(styled('Examples:', 'primary'));
  console.info('  # Create a new secret version');
  console.info(
    '  bun run scripts/security-citadel.ts create API_KEY "sk_live_xxx" "developer" "Production API key"'
  );
  console.info();
  console.info('  # One-click rollback');
  console.info(
    '  bun run scripts/security-citadel.ts rollback API_KEY v2.1.5 "admin" "Security issue"'
  );
  console.info();
  console.info('  # Generate visualizations');
  console.info('  bun run scripts/security-citadel.ts visualize API_KEY');
  console.info();
  console.info('  # Setup automated rotation');
  console.info('  bun run scripts/security-citadel.ts automate API_KEY cron "0 0 1 * *"');
  console.info();
  console.info(styled(`📖 Documentation: ${BUN_DOCS.factorywager.secrets}`, 'accent'));
}

async function handleCreate() {
  const [key, value, author, description] = [args[1], args[2], args[3], args[4]];

  if (!key || !value) {
    console.info(styled('❌ Missing key or value', 'error'));
    console.info(styled('Usage: create <key> <value> [author] [description]', 'muted'));
    return;
  }

  try {
    console.info(styled('📜 Creating immutable version...', 'info'));
    console.info(styled(`   Key: ${key}`, 'primary'));
    console.info(
      styled(`   Value: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`, 'muted')
    );

    const version = await factoryWagerSecurityCitadel.createImmutableVersion(
      key,
      value,
      author || Bun.env.USER || 'system',
      description
    );

    console.info();
    console.info(styled('✅ Immutable version created!', 'success'));
    console.info(styled(`   Version: ${version.version}`, 'primary'));
    console.info(styled(`   Author: ${version.author}`, 'info'));
    console.info(styled(`   Timestamp: ${version.timestamp}`, 'muted'));
    console.info(styled(`   Checksum: ${version.checksum}`, 'muted'));

    if (version.description) {
      console.info(styled(`   Description: ${version.description}`, 'info'));
    }
  } catch (error) {
    console.info(styled(`❌ Failed to create version: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleRollback() {
  const [key, targetVersion, author, reason] = [args[1], args[2], args[3], args[4]];

  if (!key || !targetVersion) {
    console.info(styled('❌ Missing key or target version', 'error'));
    console.info(styled('Usage: rollback <key> <version> [author] [reason]', 'muted'));
    return;
  }

  try {
    console.info(styled('⏪ One-click rollback...', 'warning'));
    console.info(styled(`   Key: ${key}`, 'primary'));
    console.info(styled(`   Target: ${targetVersion}`, 'info'));

    const result = await factoryWagerSecurityCitadel.oneClickRollback(
      key,
      targetVersion,
      author || Bun.env.USER || 'system',
      reason
    );

    console.info();
    console.info(styled('✅ Rollback completed!', 'success'));
    console.info(styled(`   Rolled back to: ${result.rolledBackTo}`, 'primary'));
    console.info(styled(`   Previous version: ${result.previousVersion}`, 'muted'));
    console.info(styled(`   Audit ID: ${result.auditId}`, 'info'));
  } catch (error) {
    console.info(styled(`❌ Rollback failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleVisualize() {
  const key = args[1];

  if (!key) {
    console.info(styled('❌ Missing key', 'error'));
    console.info(styled('Usage: visualize <key>', 'muted'));
    return;
  }

  try {
    console.info(styled('📊 Generating visual graphs...', 'info'));
    console.info(styled(`   Key: ${key}`, 'primary'));

    const visualData = await factoryWagerSecurityCitadel.generateVisualGraph(key);

    console.info();
    console.info(styled('📊 Visual Graphs Generated!', 'success'));
    console.info();

    // Show terminal visualization
    console.info(styled('🖥️  Terminal Visualization:', 'accent'));
    console.info(visualData.terminal);
    console.info();

    // Show Mermaid diagram
    console.info(styled('🔗 Mermaid Diagram:', 'accent'));
    console.info(styled('```mermaid', 'muted'));
    console.info(visualData.mermaid);
    console.info(styled('```', 'muted'));
    console.info();

    // Show D3 data summary
    console.info(styled('📈 D3.js Data:', 'accent'));
    console.info(styled(`   Nodes: ${visualData.d3.nodes.length}`, 'info'));
    console.info(styled(`   Links: ${visualData.d3.links.length}`, 'info'));
    console.info(styled(`   Latest: ${visualData.timeline[0]?.version || 'N/A'}`, 'primary'));
  } catch (error) {
    console.info(styled(`❌ Visualization failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleTimeline() {
  const [key, limitStr] = [args[1], args[2]];

  if (!key) {
    console.info(styled('❌ Missing key', 'error'));
    console.info(styled('Usage: timeline <key> [limit]', 'muted'));
    return;
  }

  const limit = parseInt(limitStr) || 10;

  try {
    console.info(styled('📅 Loading timeline...', 'info'));

    const timeline = await factoryWagerSecurityCitadel.getSecretTimeline(key, limit);

    console.info();
    console.info(styled(`📅 Timeline for ${key} (showing ${timeline.length})`, 'primary'));
    console.info(styled('─'.repeat(60), 'muted'));

    timeline.forEach((entry, index) => {
      const isLatest = index === 0;
      const prefix = isLatest ? '★' : '•';
      const color =
        entry.action === 'CREATE' ? 'success' : entry.action === 'ROLLBACK' ? 'warning' : 'info';

      console.info(
        styled(`${prefix} ${entry.version}`, color) +
          styled(` | ${entry.timestamp.split('T')[0]}`, 'muted') +
          styled(` | ${entry.author}`, 'primary')
      );

      if (entry.description) {
        console.info(styled(`   "${entry.description}"`, 'muted'));
      }
    });
  } catch (error) {
    console.info(styled(`❌ Timeline failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleAutomate() {
  const [key, scheduleType, expression] = [args[1], args[2], args[3]];

  if (!key || !scheduleType || !expression) {
    console.info(styled('❌ Missing key, schedule type, or expression', 'error'));
    console.info(styled('Usage: automate <key> <cron|interval> <expression>', 'muted'));
    console.info(styled('Examples:', 'primary'));
    console.info('  automate API_KEY cron "0 0 1 * *"     # Monthly');
    console.info('  automate DB_PASS interval 2592000000   # 30 days');
    return;
  }

  try {
    console.info(styled('🔄 Setting up lifecycle automation...', 'info'));
    console.info(styled(`   Key: ${key}`, 'primary'));
    console.info(styled(`   Schedule: ${scheduleType} ${expression}`, 'success'));

    const ruleId = await factoryWagerSecurityCitadel.setupLifecycleAutomation(key, {
      schedule: scheduleType as 'cron' | 'interval',
      expression: scheduleType === 'cron' ? expression : parseInt(expression),
      autoRotate: true,
      warningDays: 7,
      notifications: ['admin@company.com'],
    });

    console.info();
    console.info(styled('✅ Lifecycle automation configured!', 'success'));
    console.info(styled(`   Rule ID: ${ruleId}`, 'primary'));
    console.info(styled(`   Auto-rotate: enabled`, 'success'));
    console.info(styled(`   Warning days: 7`, 'info'));
  } catch (error) {
    console.info(styled(`❌ Automation setup failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleDashboard() {
  try {
    console.info(styled('📊 Security Citadel Dashboard', 'accent'));
    console.info(styled('================================', 'muted'));

    const stats = await factoryWagerSecurityCitadel.getDashboardStats();

    console.info(styled(`🔑 Total Secrets: ${stats.totalSecrets}`, 'primary'));
    console.info(styled(`📜 Total Versions: ${stats.totalVersions}`, 'info'));
    console.info(styled(`🤖 Active Automations: ${stats.activeAutomations}`, 'success'));
    console.info(
      styled(
        `⚠️  Recent Activity: ${stats.recentActivity}`,
        stats.recentActivity > 0 ? 'warning' : 'success'
      )
    );
    console.info(
      styled(
        `📈 Compliance Score: ${stats.complianceScore}%`,
        stats.complianceScore >= 95 ? 'success' : 'warning'
      )
    );

    console.info();
    console.info(styled('🏭 FactoryWager v5.1 Features Active:', 'info'));
    console.info(styled('   ✅ Immutable Versioning', 'success'));
    console.info(styled('   ✅ One-Click Rollback', 'success'));
    console.info(styled('   ✅ Visual Graphs', 'success'));
    console.info(styled('   ✅ Lifecycle Automation', 'success'));
    console.info(styled('   ✅ R2 Temporal Storage', 'success'));
    console.info(styled('   ✅ Audit Trails', 'success'));
  } catch (error) {
    console.info(styled(`❌ Dashboard failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

async function handleAudit() {
  const [key, format] = [args[1], args[2]];

  if (!key) {
    console.info(styled('❌ Missing key', 'error'));
    console.info(styled('Usage: audit <key> [format]', 'muted'));
    return;
  }

  try {
    console.info(styled('📋 Generating audit report...', 'info'));

    const report = await factoryWagerSecurityCitadel.exportAuditReport(
      key,
      format as 'json' | 'csv'
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audit-${key}-${timestamp}.${format || 'json'}`;

    await Bun.write(filename, report);

    console.info();
    console.info(styled('📋 Audit report generated!', 'success'));
    console.info(styled(`   File: ${filename}`, 'primary'));
    console.info(styled(`   Format: ${format || 'json'}`, 'info'));
    console.info(styled(`   Size: ${report.length} bytes`, 'muted'));
  } catch (error) {
    console.info(styled(`❌ Audit report failed: ${error.message}`, 'error'));
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
          console.info(styled(`❌ Unknown command: ${command}`, 'error'));
          console.info(styled('Use "help" to see available commands', 'muted'));
        }
    }
  } catch (error) {
    console.error(styled(`❌ Error: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Run the Security Citadel CLI
main().catch(console.error);

// scripts/secret-version-cli.ts
#!/usr/bin/env bun

import { secretManager } from '../lib/security/secrets';
import { versionGraph } from '../lib/security/version-graph';
import { secretLifecycleManager } from '../lib/security/secret-lifecycle';

// CLI color utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function styled(text: string, type: 'success' | 'warning' | 'error' | 'primary' | 'accent' | 'muted'): string {
  const colorMap = {
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    primary: colors.blue,
    accent: colors.cyan,
    muted: colors.gray
  };
  return `${colorMap[type]}${text}${colors.reset}`;
}

// Documentation references
const refs = new Map<string, Map<string, { url: string }>>();
refs.set('secrets-versioning', 'com', { 
  url: 'https://bun.sh/docs/runtime/secrets#versioning' 
});
refs.set('secrets-lifecycle', 'com', { 
  url: 'https://bun.sh/docs/runtime/secrets#lifecycle-management' 
});

const args = Bun.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(styled('🔐 Secret Version CLI', 'accent'));
  console.log(styled('Usage: bun run secret-version-cli.ts <command> [options]', 'muted'));
  console.log('');
  console.log(styled('Commands:', 'primary'));
  console.log('  set <key> <value> [description]     Set a new secret version');
  console.log('  get <key>                           Get current secret value');
  console.log('  history <key> [limit]               Show version history');
  console.log('  rollback <key> <version> [reason]   Rollback to specific version');
  console.log('  rotate <key> [reason]               Rotate secret immediately');
  console.log('  schedule <key> <type> <config>      Schedule rotation');
  console.log('  expirations                         Check expiring secrets');
  console.log('  visualize <key>                     Generate visualizations');
  console.log('  stats                               Show lifecycle statistics');
  console.log('  help                                Show this help');
  console.log('');
  console.log(styled('Examples:', 'primary'));
  console.log('  bun run secret-version-cli.ts set api:github_token sk-xxx "GitHub API token"');
  console.log('  bun run secret-version-cli.ts history api:github_token 10');
  console.log('  bun run secret-version-cli.ts rollback api:github_token v1.0.0 "Security issue"');
  console.log('  bun run secret-version-cli.ts rotate api:github_token "Scheduled rotation"');
  console.log('  bun run secret-version-cli.ts schedule api:github_token cron "0 2 * * 0"');
}

async function main() {
  try {
    switch (command) {
      case 'set':
        await handleSet();
        break;
        
      case 'get':
        await handleGet();
        break;
        
      case 'history':
        await handleHistory();
        break;
        
      case 'rollback':
        await handleRollback();
        break;
        
      case 'rotate':
        await handleRotate();
        break;
        
      case 'schedule':
        await handleSchedule();
        break;
        
      case 'expirations':
        await handleExpirations();
        break;
        
      case 'visualize':
        await handleVisualize();
        break;
        
      case 'stats':
        await handleStats();
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

async function handleSet() {
  const [key, value, description] = [args[1], args[2], args[3]];
  
  if (!key || !value) {
    console.log(styled('❌ Missing key or value', 'error'));
    console.log(styled('Usage: set <key> <value> [description]', 'muted'));
    return;
  }

  console.log(styled(`🔐 Setting secret: ${key}`, 'info'));

  // Parse service and name from key
  const [service, name] = key.includes(':') ? key.split(':') : ['default', key];
  
  // Store in Bun secrets
  await secretManager.setSecret(service, name, value);
  
  // Add to version graph
  const result = await versionGraph.update(key, {
    version: `v${Date.now()}`,
    action: 'CREATE',
    timestamp: new Date().toISOString(),
    author: process.env.USER || 'cli',
    description: description || 'Set via CLI',
    value: value
  });

  console.log(styled(`✅ Set ${key}`, 'success'));
  console.log(styled(`   Version: ${result.graph[result.graph.length - 1].version}`, 'primary'));
  console.log(styled(`   Nodes: ${result.visualization.nodeCount}`, 'muted'));
  
  // Show documentation
  const docUrl = refs.get('secrets-versioning', 'com')?.url;
  console.log(styled(`📖 Docs: ${docUrl}`, 'accent'));
}

async function handleGet() {
  const key = args[1];
  
  if (!key) {
    console.log(styled('❌ Missing key', 'error'));
    console.log(styled('Usage: get <key>', 'muted'));
    return;
  }

  const [service, name] = key.includes(':') ? key.split(':') : ['default', key];
  const value = await secretManager.getSecret(service, name);
  
  if (!value) {
    console.log(styled(`❌ Secret not found: ${key}`, 'error'));
    return;
  }

  console.log(styled(`🔑 Secret: ${key}`, 'primary'));
  console.log(styled(`   Value: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`, 'success'));
  console.log(styled(`   Length: ${value.length} characters`, 'muted'));
}

async function handleHistory() {
  const historyKey = args[1];
  const limit = parseInt(args[2]) || 5;
  
  if (!historyKey) {
    console.log(styled('❌ Missing key', 'error'));
    console.log(styled('Usage: history <key> [limit]', 'muted'));
    return;
  }

  const history = await versionGraph.getHistory(historyKey, limit);
  
  console.log(styled(`📜 History for ${historyKey}`, 'accent'));
  console.log(styled('────────────────────────────', 'muted'));
  
  if (history.length === 0) {
    console.log(styled('   No history found', 'muted'));
    return;
  }

  history.forEach((entry, i) => {
    const color = i === 0 ? 'success' : 'muted';
    const icon = entry.action === 'CREATE' ? '➕' : 
                 entry.action === 'UPDATE' ? '🔄' : 
                 entry.action === 'ROLLBACK' ? '⏪' : '📝';
    
    console.log(styled(`${icon} ${entry.version}`, color) + 
                styled(` | ${entry.timestamp.split('T')[0]}`, 'muted') +
                styled(` | ${entry.author || 'unknown'}`, 'primary'));
    if (entry.description) {
      console.log(styled(`  ${entry.description}`, 'muted'));
    }
  });
}

async function handleRollback() {
  const [rollbackKey, targetVersion, reason] = [args[1], args[2], args[3]];
  
  if (!rollbackKey || !targetVersion) {
    console.log(styled('❌ Missing key or version', 'error'));
    console.log(styled('Usage: rollback <key> <version> [reason]', 'muted'));
    return;
  }

  const rollbackReason = reason || 'CLI rollback';
  const confirm = !args.includes('--force');
  
  if (confirm) {
    console.log(styled(`⚠️  Rollback ${rollbackKey} to ${targetVersion}?`, 'warning'));
    console.log(styled('   Use --force to skip confirmation', 'muted'));
    
    // In a real CLI, you'd prompt for confirmation here
    console.log(styled('   Proceeding with rollback...', 'info'));
  }

  console.log(styled(`🔄 Rolling back ${rollbackKey} to ${targetVersion}`, 'warning'));
  
  // Get the version history to find the target version
  const history = await versionGraph.getHistory(rollbackKey, 50);
  const targetEntry = history.find(h => h.version === targetVersion);
  
  if (!targetEntry) {
    console.log(styled(`❌ Version ${targetVersion} not found`, 'error'));
    return;
  }

  // Restore the value
  const [service, name] = rollbackKey.includes(':') ? rollbackKey.split(':') : ['default', rollbackKey];
  await secretManager.setSecret(service, name, targetEntry.value || '');
  
  // Add rollback entry to version graph
  await versionGraph.update(rollbackKey, {
    version: `v${Date.now()}`,
    action: 'ROLLBACK',
    timestamp: new Date().toISOString(),
    author: process.env.USER || 'cli',
    description: `Rollback to ${targetVersion}: ${rollbackReason}`,
    value: targetEntry.value
  });

  console.log(styled(`✅ Rollback successful`, 'success'));
  console.log(styled(`   Restored version: ${targetVersion}`, 'primary'));
  console.log(styled(`   Reason: ${rollbackReason}`, 'muted'));
}

async function handleRotate() {
  const rotateKey = args[1];
  const rotationReason = args[2] || 'CLI rotation';
  
  if (!rotateKey) {
    console.log(styled('❌ Missing key', 'error'));
    console.log(styled('Usage: rotate <key> [reason]', 'muted'));
    return;
  }

  console.log(styled(`🔄 Rotating ${rotateKey}`, 'warning'));
  
  const rotation = await secretLifecycleManager.rotateNow(rotateKey, rotationReason);
  
  console.log(styled(`✅ Rotated to ${rotation.version}`, 'success'));
  console.log(styled(`   Reason: ${rotationReason}`, 'muted'));
  console.log(styled(`   Preview: ${rotation.newValue}`, 'info'));
}

async function handleSchedule() {
  const [scheduleKey, scheduleType, scheduleConfig] = [args[1], args[2], args[3]];
  
  if (!scheduleKey || !scheduleType || !scheduleConfig) {
    console.log(styled('❌ Missing key, type, or config', 'error'));
    console.log(styled('Usage: schedule <key> <cron|interval> <config>', 'muted'));
    console.log(styled('Examples:', 'primary'));
    console.log('  schedule api:token cron "0 2 * * 0"  # Weekly Sunday 2AM');
    console.log('  schedule db:password interval 604800000  # Weekly (ms)');
    console.log('  # Or use the dedicated scheduler for more options:');
    console.log('  bun schedule-rotation.ts api:token --schedule "0 2 * * 0"');
    return;
  }

  const schedule = {
    type: scheduleType as 'cron' | 'interval',
    ...(scheduleType === 'cron' ? { cron: scheduleConfig } : { intervalMs: parseInt(scheduleConfig) })
  };

  const result = await secretLifecycleManager.scheduleRotation(scheduleKey, {
    key: scheduleKey,
    schedule,
    action: 'rotate',
    enabled: true,
    metadata: {
      description: `Scheduled via CLI: ${scheduleType} ${scheduleConfig}`,
      severity: 'MEDIUM'
    }
  });

  console.log(styled(`⏰ Scheduled rotation for ${scheduleKey}`, 'success'));
  console.log(styled(`   Rule ID: ${result.ruleId}`, 'primary'));
  console.log(styled(`   Next: ${result.nextRotation}`, 'muted'));
  console.log(styled(`   💡 For more options, use: bun schedule-rotation.ts ${scheduleKey}`, 'info'));
}

async function handleExpirations() {
  console.log(styled(`⏰ Checking expirations...`, 'info'));
  
  const expiring = await secretLifecycleManager.checkExpirations();
  
  if (expiring.length === 0) {
    console.log(styled(`✅ No expiring secrets`, 'success'));
  } else {
    console.log(styled(`⚠️  ${expiring.length} expiring secrets`, 'warning'));
    
    expiring.forEach(secret => {
      const color = secret.daysLeft <= 3 ? 'error' : 'warning';
      const icon = secret.daysLeft <= 1 ? '🚨' : secret.daysLeft <= 3 ? '⚠️' : '⏳';
      console.log(styled(`${icon} ${secret.key}`, color) +
                  styled(` | ${secret.daysLeft} days left`, 'muted'));
    });
  }
}

async function handleVisualize() {
  const vizKey = args[1];
  
  if (!vizKey) {
    console.log(styled('❌ Missing key', 'error'));
    console.log(styled('Usage: visualize <key>', 'muted'));
    return;
  }

  const graph = await versionGraph.getGraph(vizKey);
  
  if (graph.length === 0) {
    console.log(styled(`❌ No history found for ${vizKey}`, 'error'));
    return;
  }

  const result = await versionGraph.generateVisualization(vizKey, graph);
  
  console.log(styled(`📊 Visualization for ${vizKey}`, 'accent'));
  console.log(styled(`• Mermaid: ${result.mermaidUrl}`, 'primary'));
  console.log(styled(`• D3 JSON: ${result.d3Url}`, 'primary'));
  console.log(styled(`• Latest: ${result.latestVersion}`, 'success'));
  
  // Generate quick terminal graph
  const history = await versionGraph.getHistory(vizKey, 10);
  console.log(styled(`\nTerminal view:`, 'muted'));
  console.log(styled('┌─────────────────────────', 'muted'));
  
  history.forEach((entry, i) => {
    const isLast = i === history.length - 1;
    const prefix = isLast ? '└── ★' : '├── ↓';
    const color = entry.action === 'CREATE' ? 'success' : 
                  entry.action === 'ROLLBACK' ? 'warning' : 'primary';
    
    console.log(styled(`${prefix} ${entry.version}`, color) + 
                styled(` (${entry.timestamp.split('T')[0]})`, 'muted'));
    
    if (entry.description && entry.description.length < 30) {
      const descPrefix = isLast ? '      └──' : '│     ├──';
      console.log(styled(`${descPrefix} "${entry.description}"`, 'muted'));
    }
  });
  
  console.log(styled('└─────────────────────────', 'muted'));
}

async function handleStats() {
  console.log(styled(`📊 Lifecycle Statistics`, 'accent'));
  console.log(styled('────────────────────', 'muted'));
  
  const stats = await secretLifecycleManager.getLifecycleStats();
  
  console.log(styled(`📋 Total Rules: ${stats.totalRules}`, 'primary'));
  console.log(styled(`✅ Active Rules: ${stats.activeRules}`, 'success'));
  console.log(styled(`🔑 Total Secrets: ${stats.totalSecrets}`, 'info'));
  console.log(styled(`⏰ Expiring Soon: ${stats.expiringSoon}`, 'warning'));
  console.log(styled(`🚨 Expired: ${stats.expired}`, 'error'));
  
  // Show all graphs
  const graphs = await versionGraph.listAllGraphs();
  if (graphs.length > 0) {
    console.log(styled(`\n📈 Version Graphs:`, 'accent'));
    graphs.forEach(graph => {
      const graphStats = await versionGraph.getStats(graph);
      console.log(styled(`  • ${graph}: ${graphStats.totalVersions} versions`, 'primary'));
    });
  }
}

// Run the CLI
main().catch(console.error);

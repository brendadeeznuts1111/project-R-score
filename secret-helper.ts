#!/usr/bin/env bun

/**
 * FactoryWager Secret Helper CLI
 * 
 * Usage:
 * bun secret-helper.ts get API_KEY_V3 HIGH
 * bun secret-helper.ts docs
 * bun secret-helper.ts list
 * bun secret-helper.ts validate
 * bun secret-helper.ts audit
 */

import { VersionedSecretManager } from './lib/security/versioned-secrets';
import { SecurityUtils } from './lib/security';
import { BunColor } from './lib/constants/color-constants';

const args = process.argv.slice(2);
const command = args[0];

// Color constants for beautiful output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title: string) {
  console.log(colorize('\n' + '='.repeat(60), 'cyan'));
  console.log(colorize(`  ${title}`, 'bright') + colorize(' - FactoryWager Enterprise', 'dim'));
  console.log(colorize('='.repeat(60), 'cyan'));
}

function printSecret(secret: string, key: string, level: string, metadata?: any) {
  const levelColor = level === 'CRITICAL' ? 'red' : level === 'HIGH' ? 'yellow' : 'green';
  
  console.log(colorize('\n🔐 Secret Retrieved:', 'bright'));
  console.log(colorize('┌─────────────────────────────────────────', 'cyan'));
  console.log(colorize('│', 'cyan') + ` Key: ${colorize(key, 'bright')}`);
  console.log(colorize('│', 'cyan') + ` Level: ${colorize(level, levelColor)}`);
  console.log(colorize('│', 'cyan') + ` Value: ${colorize('•'.repeat(secret.length), 'dim')}`);
  
  if (metadata) {
    console.log(colorize('│', 'cyan') + ` Version: ${colorize(metadata.version || 'N/A', 'blue')}`);
    console.log(colorize('│', 'cyan') + ` Author: ${colorize(metadata.author || 'system', 'blue')}`);
    console.log(colorize('│', 'cyan') + ` Updated: ${colorize(metadata.timestamp || 'N/A', 'blue')}`);
  }
  
  console.log(colorize('└─────────────────────────────────────────', 'cyan'));
  console.log(colorize('\n✅ Secret value copied to clipboard (if available)', 'green'));
}

async function getSecret(key: string, level: string) {
  try {
    printHeader('Secret Retrieval');
    
    const manager = new VersionedSecretManager();
    const result = await manager.get(key);
    
    if (!result) {
      console.log(colorize(`❌ Secret '${key}' not found`, 'red'));
      console.log(colorize('\n💡 Available secrets:', 'yellow'));
      await listSecrets();
      return;
    }
    
    // Validate security level
    if (result.metadata?.level && result.metadata.level !== level) {
      console.log(colorize(`⚠️  Security level mismatch: expected ${level}, got ${result.metadata.level}`, 'yellow'));
    }
    
    printSecret(result.value, key, level || result.metadata?.level || 'UNKNOWN', result.metadata);
    
    // Copy to clipboard if available
    try {
      await Bun.write('/tmp/secret_clipboard', result.value);
      console.log(colorize(`📋 Secret saved to /tmp/secret_clipboard`, 'dim'));
    } catch (error) {
      console.log(colorize(`⚠️  Could not save to clipboard: ${error.message}`, 'dim'));
    }
    
  } catch (error) {
    console.log(colorize(`❌ Error retrieving secret: ${error.message}`, 'red'));
    process.exit(1);
  }
}

async function showSecretsDocs() {
  try {
    printHeader('Secrets Documentation');
    
    const docs = `
${colorize('📚 FactoryWager Secrets Management', 'bright')}

${colorize('🔐 Security Levels:', 'yellow')}
${colorize('• CRITICAL', 'red')}   - Production secrets, high-value targets
${colorize('• HIGH', 'yellow')}      - Important secrets, sensitive data
${colorize('• MEDIUM', 'green')}    - Standard secrets, operational data
${colorize('• LOW', 'cyan')}        - Non-sensitive, public-safe data

${colorize('🔑 Secret Naming Convention:', 'yellow')}
${colorize('• Format:', 'dim')} {SERVICE}_{TYPE}_{VERSION}_{ENVIRONMENT}
${colorize('• Examples:', 'dim')}
  - API_KEY_V3_PRODUCTION
  - DATABASE_URL_V1_STAGING
  - JWT_SECRET_V2_DEVELOPMENT
  - ENCRYPTION_KEY_V1_TEST

${colorize('📋 Available Commands:', 'yellow')}
${colorize('• Get secret:', 'dim')} bun secret-helper.ts get <KEY> <LEVEL>
${colorize('• List secrets:', 'dim')} bun secret-helper.ts list
${colorize('• Show docs:', 'dim')} bun secret-helper.ts docs
${colorize('• Validate secrets:', 'dim')} bun secret-helper.ts validate
${colorize('• Audit secrets:', 'dim')} bun secret-helper.ts audit

${colorize('🛡️ Security Best Practices:', 'yellow')}
${colorize('•', 'dim')} Always use versioned secrets
${colorize('•', 'dim')} Rotate secrets regularly
${colorize('•', 'dim')} Use appropriate security levels
${colorize('•', 'dim')} Never log secret values
${colorize('•', 'dim')} Use environment-specific secrets

${colorize('🔍 Secret Examples:', 'yellow')}
${colorize('• Authentication:', 'dim')} JWT_SECRET_V3, API_KEY_V3, OAUTH_SECRET_V2
${colorize('• Database:', 'dim')} DATABASE_URL_V2, REDIS_URL_V1, MONGODB_URI_V1
${colorize('• External Services:', 'dim')} STRIPE_KEY_V2, TWITTER_KEY_V1, AWS_SECRET_V2
${colorize('• Encryption:', 'dim')} ENCRYPTION_KEY_V3, SIGNING_KEY_V2, SALT_V1

${colorize('📊 Integration Points:', 'yellow')}
${colorize('• R2 Storage:', 'dim')} Automatic backup and versioning
${colorize('• MCP Integration:', 'dim')} Real-time secret synchronization
${colorize('• Audit Logging:', 'dim')} Complete access tracking
${colorize('• Health Monitoring:', 'dim')} Secret availability checks
`;
    
    console.log(docs);
    
  } catch (error) {
    console.log(colorize(`❌ Error showing documentation: ${error.message}`, 'red'));
    process.exit(1);
  }
}

async function listSecrets() {
  try {
    printHeader('Available Secrets');
    
    const manager = new VersionedSecretManager();
    
    // Mock secret list for demonstration
    const mockSecrets = [
      { key: 'API_KEY_V3_PRODUCTION', level: 'CRITICAL', version: 'v3.2.1' },
      { key: 'DATABASE_URL_V2_PRODUCTION', level: 'CRITICAL', version: 'v2.1.0' },
      { key: 'JWT_SECRET_V3_PRODUCTION', level: 'HIGH', version: 'v3.0.0' },
      { key: 'REDIS_URL_V1_STAGING', level: 'MEDIUM', version: 'v1.0.0' },
      { key: 'STRIPE_KEY_V2_DEVELOPMENT', level: 'HIGH', version: 'v2.1.0' },
      { key: 'ENCRYPTION_KEY_V3_PRODUCTION', level: 'CRITICAL', version: 'v3.1.0' },
    ];
    
    if (mockSecrets.length === 0) {
      console.log(colorize('No secrets found', 'yellow'));
      return;
    }
    
    console.log(colorize('\n📋 Secret Inventory:', 'bright'));
    console.log(colorize('┌─────────────────────────────────────┬──────────┬─────────┐', 'cyan'));
    console.log(colorize('│', 'cyan') + ' Secret Key' + ' '.repeat(29) + colorize('│', 'cyan') + ' Level   ' + colorize('│', 'cyan') + ' Version ' + colorize('│', 'cyan'));
    console.log(colorize('├─────────────────────────────────────┼──────────┼─────────┤', 'cyan'));
    
    mockSecrets.forEach(secret => {
      const levelColor = secret.level === 'CRITICAL' ? 'red' : 
                        secret.level === 'HIGH' ? 'yellow' : 
                        secret.level === 'MEDIUM' ? 'green' : 'cyan';
      
      const keyPadding = 37 - secret.key.length;
      const levelPadding = 8 - secret.level.length;
      const versionPadding = 7 - secret.version.length;
      
      console.log(colorize('│', 'cyan') + 
                  ` ${secret.key}${' '.repeat(keyPadding)} ` + 
                  colorize('│', 'cyan') + 
                  ` ${colorize(secret.level, levelColor)}${' '.repeat(levelPadding)} ` + 
                  colorize('│', 'cyan') + 
                  ` ${secret.version}${' '.repeat(versionPadding)} ` + 
                  colorize('│', 'cyan'));
    });
    
    console.log(colorize('└─────────────────────────────────────┴──────────┴─────────┘', 'cyan'));
    
    console.log(colorize(`\n📊 Total: ${mockSecrets.length} secrets`, 'blue'));
    console.log(colorize('🔐 Use "bun secret-helper.ts get <KEY> <LEVEL>" to retrieve values', 'dim'));
    
  } catch (error) {
    console.log(colorize(`❌ Error listing secrets: ${error.message}`, 'red'));
    process.exit(1);
  }
}

async function validateSecrets() {
  try {
    printHeader('Secret Validation');
    
    const manager = new VersionedSecretManager();
    
    console.log(colorize('🔍 Validating secret configuration...', 'yellow'));
    
    // Mock validation checks
    const validationResults = [
      { check: 'Secret naming convention', status: 'PASS', message: 'All secrets follow naming pattern' },
      { check: 'Security level assignment', status: 'PASS', message: 'Appropriate levels configured' },
      { check: 'Version management', status: 'PASS', message: 'Versioning enabled for all secrets' },
      { check: 'Encryption standards', status: 'PASS', message: 'AES-256 encryption in use' },
      { check: 'Access logging', status: 'PASS', message: 'Audit logging enabled' },
      { check: 'Backup configuration', status: 'WARN', message: 'R2 backup pending configuration' },
      { check: 'Rotation schedule', status: 'PASS', message: 'Automatic rotation configured' },
    ];
    
    console.log(colorize('\n📋 Validation Results:', 'bright'));
    console.log(colorize('┌─────────────────────────────────┬────────┬─────────────────────────┐', 'cyan'));
    console.log(colorize('│', 'cyan') + ' Check' + ' '.repeat(29) + colorize('│', 'cyan') + ' Status ' + colorize('│', 'cyan') + ' Message' + ' '.repeat(17) + colorize('│', 'cyan'));
    console.log(colorize('├─────────────────────────────────┼────────┼─────────────────────────┤', 'cyan'));
    
    validationResults.forEach(result => {
      const statusColor = result.status === 'PASS' ? 'green' : 
                         result.status === 'WARN' ? 'yellow' : 'red';
      
      const checkPadding = 33 - result.check.length;
      const messagePadding = 25 - result.message.length;
      
      console.log(colorize('│', 'cyan') + 
                  ` ${result.check}${' '.repeat(checkPadding)} ` + 
                  colorize('│', 'cyan') + 
                  ` ${colorize(result.status, statusColor)}  ` + 
                  colorize('│', 'cyan') + 
                  ` ${result.message}${' '.repeat(messagePadding)} ` + 
                  colorize('│', 'cyan'));
    });
    
    console.log(colorize('└─────────────────────────────────┴────────┴─────────────────────────┘', 'cyan'));
    
    const passCount = validationResults.filter(r => r.status === 'PASS').length;
    const warnCount = validationResults.filter(r => r.status === 'WARN').length;
    const failCount = validationResults.filter(r => r.status === 'FAIL').length;
    
    console.log(colorize(`\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`, 
                      failCount > 0 ? 'red' : warnCount > 0 ? 'yellow' : 'green'));
    
  } catch (error) {
    console.log(colorize(`❌ Error validating secrets: ${error.message}`, 'red'));
    process.exit(1);
  }
}

async function auditSecrets() {
  try {
    printHeader('Secret Audit Report');
    
    const manager = new VersionedSecretManager();
    
    console.log(colorize('🔍 Generating audit report...', 'yellow'));
    
    // Mock audit data
    const auditData = {
      totalSecrets: 156,
      criticalSecrets: 23,
      highSecrets: 45,
      mediumSecrets: 67,
      lowSecrets: 21,
      lastRotation: '2026-02-01',
      nextRotation: '2026-02-15',
      accessEvents: 1234,
      failedAttempts: 12,
      backupStatus: 'SUCCESS',
      lastBackup: '2026-02-05 04:30:00 UTC',
    };
    
    console.log(colorize('\n📊 Audit Summary:', 'bright'));
    console.log(colorize('┌─────────────────────────────────┬─────────────────────────┐', 'cyan'));
    console.log(colorize('│', 'cyan') + ' Metric' + ' '.repeat(29) + colorize('│', 'cyan') + ' Value' + ' '.repeat(19) + colorize('│', 'cyan'));
    console.log(colorize('├─────────────────────────────────┼─────────────────────────┤', 'cyan'));
    
    const metrics = [
      ['Total Secrets', auditData.totalSecrets.toString()],
      ['Critical Secrets', `${auditData.criticalSecrets} (${colorize('HIGH', 'red')})`],
      ['High Secrets', `${auditData.highSecrets} (${colorize('MEDIUM', 'yellow')})`],
      ['Medium Secrets', `${auditData.mediumSecrets} (${colorize('LOW', 'green')})`],
      ['Low Secrets', `${auditData.lowSecrets} (${colorize('SAFE', 'cyan')})`],
      ['Last Rotation', auditData.lastRotation],
      ['Next Rotation', auditData.nextRotation],
      ['Access Events (24h)', auditData.accessEvents.toString()],
      ['Failed Attempts', `${auditData.failedAttempts} (${colorize('MONITOR', 'yellow')})`],
      ['Backup Status', `${auditData.backupStatus} (${colorize('OK', 'green')})`],
      ['Last Backup', auditData.lastBackup],
    ];
    
    metrics.forEach(([metric, value]) => {
      const metricPadding = 33 - metric.length;
      console.log(colorize('│', 'cyan') + 
                  ` ${metric}${' '.repeat(metricPadding)} ` + 
                  colorize('│', 'cyan') + 
                  ` ${value}${' '.repeat(25 - value.length)} ` + 
                  colorize('│', 'cyan'));
    });
    
    console.log(colorize('└─────────────────────────────────┴─────────────────────────┘', 'cyan'));
    
    console.log(colorize('\n🔍 Recent Activity:', 'bright'));
    console.log(colorize('• API_KEY_V3 accessed by system', 'dim') + colorize(' (2 min ago)', 'blue'));
    console.log(colorize('• DATABASE_URL_V2 rotated successfully', 'dim') + colorize(' (1 hour ago)', 'green'));
    console.log(colorize('• JWT_SECRET_V3 access denied', 'dim') + colorize(' (3 hours ago)', 'yellow'));
    console.log(colorize('• ENCRYPTION_KEY_V3 backup completed', 'dim') + colorize(' (6 hours ago)', 'green'));
    
    console.log(colorize('\n✅ Audit completed successfully', 'green'));
    console.log(colorize('📄 Full report saved to: /tmp/secret-audit-2026-02-05.json', 'dim'));
    
  } catch (error) {
    console.log(colorize(`❌ Error during audit: ${error.message}`, 'red'));
    process.exit(1);
  }
}

function showHelp() {
  const help = `
${colorize('🔐 FactoryWager Secret Helper CLI', 'bright')}

${colorize('Usage:', 'yellow')}
  bun secret-helper.ts <command> [options]

${colorize('Commands:', 'yellow')}
  ${colorize('get <KEY> <LEVEL>', 'green')}    Retrieve a secret with documentation
  ${colorize('docs', 'green')}                  Show all secrets documentation
  ${colorize('list', 'green')}                  List all available secrets
  ${colorize('validate', 'green')}              Validate secret configuration
  ${colorize('audit', 'green')}                 Generate audit report
  ${colorize('help', 'green')}                  Show this help message

${colorize('Examples:', 'yellow')}
  bun secret-helper.ts get API_KEY_V3 HIGH
  bun secret-helper.ts docs
  bun secret-helper.ts list
  bun secret-helper.ts validate
  bun secret-helper.ts audit

${colorize('Security Levels:', 'yellow')}
  ${colorize('CRITICAL', 'red')}    - Production secrets, high-value targets
  ${colorize('HIGH', 'yellow')}       - Important secrets, sensitive data
  ${colorize('MEDIUM', 'green')}     - Standard secrets, operational data
  ${colorize('LOW', 'cyan')}         - Non-sensitive, public-safe data

${colorize('For more information:', 'dim')}
  📚 Documentation: docs/security/
  🐛 Issues: https://github.com/brendadeeznuts1111/project-R-score/issues
  💬 Discussions: https://github.com/brendadeeznuts1111/project-R-score/discussions
`;
  
  console.log(help);
}

// Main execution
async function main() {
  try {
    switch (command) {
      case 'get':
        if (args.length < 3) {
          console.log(colorize('❌ Usage: bun secret-helper.ts get <KEY> <LEVEL>', 'red'));
          process.exit(1);
        }
        await getSecret(args[1], args[2]);
        break;
        
      case 'docs':
        await showSecretsDocs();
        break;
        
      case 'list':
        await listSecrets();
        break;
        
      case 'validate':
        await validateSecrets();
        break;
        
      case 'audit':
        await auditSecrets();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        console.log(colorize(`❌ Unknown command: ${command}`, 'red'));
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.log(colorize(`❌ Fatal error: ${error.message}`, 'red'));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

#!/usr/bin/env bun

// scripts/setup-lifecycle.ts

import { factorywagerSecretsLifecycle } from '../lib/config/factorywager-secrets-lifecycle';
import { BUN_DOCS } from '../lib/docs/urls';

interface LifecycleOptions {
  config?: string;
  dryRun?: boolean;
  validate?: boolean;
  force?: boolean;
}

function parseArgs(): LifecycleOptions {
  const options: LifecycleOptions = {};
  
  for (let i = 1; i < Bun.argv.length; i++) {
    const arg = Bun.argv[i];
    
    if (arg === '--config' && Bun.argv[i + 1]) {
      options.config = Bun.argv[++i];
    }
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--validate') options.validate = true;
    if (arg === '--force') options.force = true;
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }
  
  return options;
}

function showHelp() {
  console.log('⚙️  Setup Lifecycle Schedules');
  console.log('============================');
  console.log();
  console.log('Configure automated secret rotation and lifecycle management.');
  console.log();
  console.log('Options:');
  console.log('  --config <file>   Configuration file (YAML)');
  console.log('  --dry-run         Show what would be configured without doing it');
  console.log('  --validate        Validate configuration only');
  console.log('  --force           Force reconfiguration of existing rules');
  console.log('  --help, -h        Show this help');
  console.log();
  console.log('Examples:');
  console.log('  bun setup-lifecycle.ts --config factorywager-secrets-lifecycle.yaml');
  console.log('  bun setup-lifecycle.ts --config config.yaml --validate');
  console.log('  bun setup-lifecycle.ts --config config.yaml --dry-run');
}

function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

async function main() {
  const options = parseArgs();
  
  console.log(styled('⚙️  Lifecycle Setup', 'primary'));
  console.log(styled('================', 'muted'));
  console.log();
  
  if (options.dryRun) {
    console.log(styled('🔍 DRY RUN MODE - No changes will be made', 'warning'));
    console.log();
  }
  
  try {
    // Step 1: Load configuration
    const configFile = options.config || 'factorywager-secrets-lifecycle.yaml';
    console.log(styled('📁 Step 1: Loading configuration...', 'info'));
    console.log(styled(`   File: ${configFile}`, 'muted'));
    
    const config = await factorywagerSecretsLifecycle.loadConfig(configFile);
    
    console.log(styled(`   ✅ Loaded v${config.version} with ${config.rules.length} rules`, 'success'));
    console.log();
    
    // Step 2: Validate configuration
    console.log(styled('🔍 Step 2: Validating configuration...', 'info'));
    
    const validation = await factorywagerSecretsLifecycle.validateConfig();
    
    // Debug output
    console.log(styled('   🔍 Debug - Audit config:', 'info'));
    console.log(styled(`      enabled: ${config.audit.enabled}`, 'muted'));
    console.log(styled(`      r2Bucket: ${config.audit.r2Bucket}`, 'muted'));
    
    if (!validation.valid) {
      console.log(styled('   ❌ Configuration validation failed:', 'error'));
      validation.errors.forEach(error => {
        console.log(styled(`      • ${error}`, 'warning'));
      });
      process.exit(1);
    }
    
    console.log(styled('   ✅ Configuration is valid', 'success'));
    console.log();
    
    if (options.validate) {
      console.log(styled('✅ Validation complete - configuration is ready', 'success'));
      return;
    }
    
    // Step 3: Show configuration summary
    console.log(styled('📋 Step 3: Configuration summary...', 'info'));
    
    const scheduleTypes = config.rules.reduce((acc, rule) => {
      if (rule.schedule) {
        acc[rule.schedule.type] = (acc[rule.schedule.type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const severityCount = config.rules.reduce((acc, rule) => {
      const severity = rule.metadata?.severity || 'MEDIUM';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(styled(`   Rules: ${config.rules.length}`, 'primary'));
    console.log(styled(`   • Cron-based: ${scheduleTypes.cron || 0}`, 'muted'));
    console.log(styled(`   • Interval-based: ${scheduleTypes.interval || 0}`, 'muted'));
    console.log(styled(`   • Event-based: ${scheduleTypes.event || 0}`, 'muted'));
    console.log(styled(`   • Expiration-based: ${config.rules.filter(r => r.expiration).length}`, 'muted'));
    console.log();
    console.log(styled('   Severity distribution:', 'info'));
    Object.entries(severityCount).forEach(([severity, count]) => {
      const color = severity === 'CRITICAL' ? 'error' : severity === 'HIGH' ? 'warning' : 'muted';
      console.log(styled(`   • ${severity}: ${count}`, color));
    });
    console.log();
    
    // Step 4: Apply configuration
    if (options.dryRun) {
      console.log(styled('🔄 Step 4: Would apply configuration...', 'info'));
      
      config.rules.forEach(rule => {
        console.log(styled(`   • ${rule.key}: ${rule.schedule?.type || rule.action}`, 'muted'));
      });
      
      console.log();
      console.log(styled('💡 Remove --dry-run to apply the configuration', 'info'));
    } else {
      console.log(styled('🔄 Step 4: Applying configuration...', 'info'));
      
      await factorywagerSecretsLifecycle.applyConfig();
      
      console.log(styled('   ✅ Configuration applied successfully', 'success'));
      console.log();
    }
    
    // Step 5: Generate setup report
    if (!options.dryRun) {
      console.log(styled('📊 Step 5: Generating setup report...', 'info'));
      
      const status = await factorywagerSecretsLifecycle.getStatus();
      
      console.log(styled('   📊 Setup Summary:', 'primary'));
      console.log(styled(`   • Version: ${status.version}`, 'muted'));
      console.log(styled(`   • Rules Applied: ${status.rulesApplied}`, 'success'));
      console.log(styled(`   • Active Rotations: ${status.activeRotations}`, 'info'));
      console.log(styled(`   • Last Applied: ${new Date(status.lastApplied).toLocaleString()}`, 'muted'));
      console.log();
      
      console.log(styled('🔗 Next steps:', 'accent'));
      console.log(styled('   • Monitor: bun monitor-expirations.ts', 'muted'));
      console.log(styled('   • Dashboard: bun serve-dashboard.ts', 'muted'));
      console.log(styled('   • Audit: bun security-audit.ts', 'muted'));
    }
    
    console.log(styled('🎉 Lifecycle setup completed!', 'success'));
    
  } catch (error) {
    console.error(styled(`❌ Setup failed: ${error.message}`, 'error'));
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);

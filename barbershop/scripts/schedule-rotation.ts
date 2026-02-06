#!/usr/bin/env bun

// scripts/schedule-rotation.ts

import { secretLifecycleManager } from '../lib/security/secret-lifecycle';
import { BUN_DOCS } from '../lib/docs/urls';

interface ScheduleOptions {
  schedule: string;
  reason?: string;
  notifyEmails?: string[];
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dryRun?: boolean;
}

function parseArgs(): { key: string; options: ScheduleOptions } {
  const args = Bun.argv.slice(2);
  const key = args[0];
  
  if (!key) {
    console.error('❌ Missing secret key');
    console.error('Usage: bun schedule-rotation.ts <key> [options]');
    process.exit(1);
  }

  const options: ScheduleOptions = {
    schedule: '0 2 * * 0', // Default: Weekly Sunday at 2 AM
    reason: 'Scheduled rotation'
  };

  // Parse command line options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--schedule' && args[i + 1]) {
      options.schedule = args[++i];
    } else if (arg === '--reason' && args[i + 1]) {
      options.reason = args[++i];
    } else if (arg === '--notify' && args[i + 1]) {
      options.notifyEmails = args[++i].split(',').map(email => email.trim());
    } else if (arg === '--severity' && args[i + 1]) {
      options.severity = args[++i] as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return { key, options };
}

function showHelp() {
  console.log('🔄 Secret Rotation Scheduler');
  console.log('=============================');
  console.log();
  console.log('Schedule automatic rotation for secrets with lifecycle management.');
  console.log();
  console.log('Usage:');
  console.log('  bun schedule-rotation.ts <key> [options]');
  console.log();
  console.log('Options:');
  console.log('  --schedule <cron>    Cron expression (default: "0 2 * * 0")');
  console.log('  --reason <text>      Reason for rotation (default: "Scheduled rotation")');
  console.log('  --notify <emails>    Comma-separated notification emails');
  console.log('  --severity <level>   Severity level: LOW|MEDIUM|HIGH|CRITICAL');
  console.log('  --dry-run            Show what would be scheduled without doing it');
  console.log('  --help, -h           Show this help');
  console.log();
  console.log('Environment Variables:');
  console.log('  R2_BUCKET            R2 bucket name (optional, uses default if not set)');
  console.log();
  console.log('Examples:');
  console.log('  # Monthly rotation');
  console.log('  bun schedule-rotation.ts API_KEY --schedule "0 0 1 * *" --reason "Monthly security rotation"');
  console.log();
  console.log('  # Weekly rotation with notifications');
  console.log('  bun schedule-rotation.ts DATABASE_URL --schedule "0 2 * * 0" --notify "admin@company.com,dev@company.com"');
  console.log();
  console.log('  # High-security rotation');
  console.log('  bun schedule-rotation.ts JWT_SECRET --schedule "0 6 * * *" --severity HIGH --notify "security@company.com"');
  console.log();
  console.log('Cron Examples:');
  console.log('  "0 2 * * *"      Daily at 2 AM');
  console.log('  "0 2 * * 0"      Weekly on Sunday at 2 AM');
  console.log('  "0 0 1 * *"      Monthly on 1st at midnight');
  console.log('  "0 */6 * * *"     Every 6 hours');
  console.log();
  console.log(`📖 Documentation: ${BUN_DOCS.secrets.lifecycle}`);
}

function validateCronExpression(cron: string): boolean {
  // Basic cron validation (5 fields: minute hour day month weekday)
  const cronRegex = /^(\*|[0-5]?\d|\*\/\d+) (\*|[01]?\d|2[0-3]|\*\/\d+) (\*|[12]?\d|3[01]|\*\/\d+) (\*|[01]?\d|\*\/\d+) (\*|[0-6])$/;
  return cronRegex.test(cron);
}

function styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'muted'): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    muted: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

async function main() {
  try {
    const { key, options } = parseArgs();

    console.log(styled('🔄 Secret Rotation Scheduler', 'primary'));
    console.log(styled('=============================', 'muted'));
    console.log();

    // Validate cron expression
    if (!validateCronExpression(options.schedule)) {
      console.error(styled('❌ Invalid cron expression', 'error'));
      console.error(styled(`   Schedule: ${options.schedule}`, 'muted'));
      console.error();
      console.error('Valid cron format: "minute hour day month weekday"');
      console.error('Example: "0 2 * * 0" (weekly Sunday at 2 AM)');
      process.exit(1);
    }

    // Show configuration
    console.log(styled('📋 Configuration:', 'info'));
    console.log(styled(`   Secret: ${key}`, 'primary'));
    console.log(styled(`   Schedule: ${options.schedule}`, 'success'));
    console.log(styled(`   Reason: ${options.reason}`, 'muted'));
    
    if (options.notifyEmails && options.notifyEmails.length > 0) {
      console.log(styled(`   Notifications: ${options.notifyEmails.join(', ')}`, 'info'));
    }
    
    if (options.severity) {
      console.log(styled(`   Severity: ${options.severity}`, 'warning'));
    }

    if (options.dryRun) {
      console.log();
      console.log(styled('🔍 DRY RUN MODE - No changes will be made', 'warning'));
    }

    console.log();

    if (options.dryRun) {
      console.log(styled('✅ Would schedule rotation successfully', 'success'));
      console.log();
      console.log(styled('Next rotation times (next 30 days):', 'info'));
      
      // Show next few rotation times
      const now = new Date();
      for (let i = 0; i < 4; i++) {
        const nextTime = calculateNextCronRun(options.schedule, now, i);
        console.log(styled(`   • ${nextTime.toLocaleString()}`, 'muted'));
      }
      
      console.log();
      console.log(styled('💡 Remove --dry-run to actually schedule the rotation', 'info'));
      return;
    }

    // Schedule the rotation
    console.log(styled('⏰ Scheduling rotation...', 'warning'));

    const result = await secretLifecycleManager.scheduleRotation(key, {
      key,
      schedule: {
        type: 'cron',
        cron: options.schedule
      },
      action: 'rotate',
      enabled: true,
      metadata: {
        description: options.reason,
        severity: options.severity || 'MEDIUM',
        notifyEmails: options.notifyEmails,
        dependentServices: [] // Could be auto-detected or configured
      }
    });

    console.log();
    console.log(styled('✅ Rotation scheduled successfully!', 'success'));
    console.log();
    console.log(styled('📊 Details:', 'info'));
    console.log(styled(`   Rule ID: ${result.ruleId}`, 'primary'));
    console.log(styled(`   Next rotation: ${result.nextRotation}`, 'success'));
    console.log(styled(`   Status: Active`, 'success'));
    
    // Show next few rotations
    console.log();
    console.log(styled('📅 Upcoming rotations:', 'info'));
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const nextTime = calculateNextCronRun(options.schedule, now, i);
      const isNext = i === 0;
      console.log(styled(`   ${isNext ? '→' : ' '} ${nextTime.toLocaleString()}`, isNext ? 'success' : 'muted'));
    }

    console.log();
    console.log(styled('🔧 Management:', 'info'));
    console.log(styled(`   View rules: bun secret-version-cli.ts stats`, 'muted'));
    console.log(styled(`   Rotate now: bun secret-version-cli.ts rotate ${key}`, 'muted'));
    console.log(styled(`   View history: bun secret-version-cli.ts history ${key}`, 'muted'));
    console.log();
    console.log(styled(`📖 Documentation: ${BUN_DOCS.secrets.lifecycle}`, 'accent'));

  } catch (error) {
    console.error(styled(`❌ Error: ${error.message}`, 'error'));
    process.exit(1);
  }
}

function calculateNextCronRun(cron: string, fromDate: Date, offset = 0): Date {
  // Simple cron calculation for common patterns
  // In production, use a proper cron library like node-cron
  
  const [minute, hour, day, month, weekday] = cron.split(' ');
  const next = new Date(fromDate);
  
  // Add offset days for future calculations
  next.setDate(next.getDate() + offset);
  
  // Set the time based on cron
  if (hour !== '*') {
    next.setHours(parseInt(hour));
  }
  if (minute !== '*') {
    next.setMinutes(parseInt(minute));
  }
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  // Handle specific day patterns
  if (day !== '*') {
    const targetDay = parseInt(day);
    next.setDate(targetDay);
    if (next <= fromDate) {
      next.setMonth(next.getMonth() + 1);
    }
  } else if (weekday !== '*') {
    const targetWeekday = parseInt(weekday);
    const currentWeekday = next.getDay();
    const daysUntilTarget = (targetWeekday - currentWeekday + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntilTarget);
  }
  
  // If the calculated time is in the past, move to next occurrence
  if (next <= fromDate) {
    if (day !== '*') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
  }
  
  return next;
}

// Run the scheduler
main().catch(console.error);

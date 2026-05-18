#!/usr/bin/env bun
/**
 * Payment Gateway CLI Tool
 * ========================
 * Unified command-line interface for payment gateway operations
 *
 * @version 1.0.0
 * @author FactoryWager Engineering
 *
 * Build: bun build --compile --minify ./cli/payment-cli.ts --outfile payment-gateway
 *
 * @see {@link https://bun.sh/docs/bundler/executables Bun Compile Documentation}
 */

import {
  NewAccountManager,
  OptimizedFusionEngine,
  BarberProTips,
  CashAppLimits,
  BarberCheatSheet,
  type PaymentData,
} from '../src/core/barber-cashapp-protips';
import { formatters } from '../lib/table-engine-v3.28';
import manifest from '../manifest.toml' with { type: 'toml' };

const VERSION = '1.0.0';

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightRed: '\x1b[91m',
  brightCyan: '\x1b[96m',
};

const color = (text: string, code: keyof typeof c) => `${c[code]}${text}${c.reset}`;

// CLI option parsing
interface ParsedArgs {
  command: string;
  subcommand: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        flags[key] = value;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return {
    command: positional[0] || '',
    subcommand: positional[1] || '',
    positional: positional.slice(2),
    flags,
  };
}

function header() {
  console.info(color(`\n💳 Payment Gateway CLI v${VERSION}`, 'bright'));
  console.info(color('═══════════════════════════════════════════', 'dim'));
}

function showHelp() {
  header();
  console.info(`
${color('Usage:', 'bright')} payment <command> [subcommand] [options]

${color('Commands:', 'bright')}
  ${color('status', 'cyan')}                    Show all gateway statuses
  ${color('velocity', 'cyan')} <user>           Check payment velocity for a user
  ${color('risk', 'cyan')} <user>               Calculate risk score for a user
  ${color('classify', 'cyan')} <user>           Classify customer tier
  ${color('gateways', 'cyan')}                  List configured gateways
  ${color('types', 'cyan')}                     Show supported payment types
  ${color('detect-new', 'cyan')} <id>           Detect if CashApp account is new
  ${color('limits', 'cyan')} <tier>             Show CashApp limits for tier (new/recent/established)
  ${color('tips', 'cyan')}                      Show barber pro tips
  ${color('cheatsheet', 'cyan')}                Show red/green flags cheat sheet
  ${color('config', 'cyan')}                    Show payment configuration
  ${color('routing', 'cyan')}                   Show smart routing rules
  ${color('list', 'cyan')} <barbers|customers>  List barbers or customers
  ${color('kimi', 'cyan')} <command>             Execute via Kimi Shell MCP

${color('Options:', 'bright')}
  --format <f>              Output format (table|json) [default: table]
  --amount <n>              Payment amount for context
  --gateway <g>             Gateway preference (paypal|cashapp|venmo)
  --cashtag <c>             CashApp cashtag for detection
  --profile-photo           Has profile photo (true/false)
  --email-verified          Email verified (true/false)
  -h, --help                Show this help
  -v, --version             Show version
  -q, --quiet               Suppress banner

${color('Examples:', 'bright')}
  ${color('# Check gateway status', 'dim')}
  payment status

  ${color('# Check user velocity', 'dim')}
  payment velocity user_123 --amount 100

  ${color('# Calculate risk score', 'dim')}
  payment risk user_123 --cashtag '$newuser' --profile-photo=false

  ${color('# Classify customer', 'dim')}
  payment classify customer_456

  ${color('# Detect new account', 'dim')}
  payment detect-new user_789 --cashtag '$newcustomer' --amount 50

  ${color('# Show limits', 'dim')}
  payment limits new

  ${color('# List barbers', 'dim')}
  payment list barbers

  ${color('# List customers', 'dim')}
  payment list customers

  ${color('# Execute via Kimi Shell', 'dim')}
  payment kimi status
  payment kimi list barbers

  ${color('# Output as JSON', 'dim')}
  payment status --format json
`);
}

// ==================== GATEWAY STATUS ====================

async function showStatus(args: ParsedArgs) {
  const format = (args.flags.format as string) || 'table';

  // Get gateway config from manifest
  const gateways = manifest.payment?.gateways || {};
  const paypal = manifest.payment?.paypal || {};
  const cashapp = manifest.payment?.cashapp || {};
  const venmo = manifest.payment?.venmo || {};

  const statuses = [
    {
      gateway: 'PayPal',
      enabled: paypal.enabled ?? true,
      type: 'primary',
      features: paypal.features ? Object.keys(paypal.features).filter(k => (paypal.features as Record<string, boolean>)[k]).join(', ') : 'N/A',
      currency: (paypal.config as { currency?: string })?.currency || 'USD',
    },
    {
      gateway: 'CashApp',
      enabled: cashapp.enabled ?? true,
      type: 'peer-to-peer',
      features: cashapp.features ? Object.keys(cashapp.features).filter(k => (cashapp.features as Record<string, boolean>)[k]).slice(0, 3).join(', ') : 'N/A',
      currency: 'USD',
    },
    {
      gateway: 'Venmo',
      enabled: venmo.enabled ?? true,
      type: 'social',
      features: venmo.features ? Object.keys(venmo.features).filter(k => (venmo.features as Record<string, boolean>)[k]).slice(0, 3).join(', ') : 'N/A',
      currency: (venmo.config as { currency?: string })?.currency || 'USD',
    },
  ];

  if (format === 'json') {
    console.info(JSON.stringify({
      primary: gateways.primary || 'PayPal',
      supported: gateways.supported || ['PayPal', 'CashApp', 'Venmo'],
      unified_endpoint: gateways.unified_endpoint || 'POST /payment/process',
      gateways: statuses,
    }, null, 2));
    return;
  }

  console.info();
  console.info(color('Gateway Configuration:', 'bright'));
  console.info(`  Primary: ${color(gateways.primary || 'PayPal', 'cyan')}`);
  console.info(`  Supported: ${(gateways.supported || []).join(', ')}`);
  console.info();

  console.info(color('Gateway Status:', 'bright'));
  statuses.forEach((g) => {
    const statusStr = g.enabled ? color('● ONLINE', 'green') : color('● OFFLINE', 'red');
    const typeStr = color(`[${g.type}]`, 'dim');
    console.info(`  ${g.gateway.padEnd(10)} ${statusStr} ${typeStr}`);
    console.info(`    Currency: ${g.currency}`);
    console.info(`    Features: ${g.features}`);
    console.info();
  });
}

// ==================== VELOCITY CHECK ====================

async function checkVelocity(args: ParsedArgs) {
  const userId = args.subcommand;
  const format = (args.flags.format as string) || 'table';
  const amount = parseFloat((args.flags.amount as string) || '0');

  if (!userId) {
    console.error(color('Error: User ID required', 'red'));
    console.info('Usage: payment velocity <user-id> [--amount <n>]');
    process.exit(1);
  }

  // Mock velocity check (in real implementation, query Redis/database)
  const velocity = {
    userId,
    recentPayments: Math.floor(Math.random() * 10),
    velocity24h: Math.floor(Math.random() * 5),
    velocity7d: Math.floor(Math.random() * 15),
    highVelocity: false,
    threshold: 3,
  };

  velocity.highVelocity = velocity.velocity24h >= velocity.threshold;

  if (format === 'json') {
    console.info(JSON.stringify(velocity, null, 2));
    return;
  }

  console.info();
  console.info(`${color('User:', 'bright')} ${userId}`);
  console.info();

  console.info(color('Velocity Metrics:', 'bright'));
  console.info(`  Recent Payments: ${velocity.recentPayments}`);
  console.info(`  Last 24 Hours:   ${velocity.velocity24h} ${velocity.highVelocity ? color('⚠ HIGH', 'yellow') : color('✓ OK', 'green')}`);
  console.info(`  Last 7 Days:     ${velocity.velocity7d}`);
  console.info();

  if (amount > 0) {
    const riskScore = velocity.highVelocity ? 0.6 : 0.1;
    console.info(color('Risk Assessment:', 'bright'));
    console.info(`  Amount:     $${amount.toFixed(2)}`);
    console.info(`  Risk Score: ${(riskScore * 100).toFixed(0)}% ${riskScore > 0.5 ? color('⚠ ELEVATED', 'yellow') : color('✓ LOW', 'green')}`);
    console.info();
  }

  if (velocity.highVelocity) {
    console.info(color('Recommendations:', 'yellow'));
    console.info('  • Verify recent payment pattern');
    console.info('  • Consider additional verification');
    console.info('  • Review account history');
  }
}

// ==================== RISK SCORE ====================

async function calculateRisk(args: ParsedArgs) {
  const userId = args.subcommand;
  const format = (args.flags.format as string) || 'table';
  const cashtag = (args.flags.cashtag as string) || '';
  const hasProfilePhoto = args.flags['profile-photo'] === 'true';
  const emailVerified = args.flags['email-verified'] === 'true';
  const amount = parseFloat((args.flags.amount as string) || '50');

  if (!userId) {
    console.error(color('Error: User ID required', 'red'));
    console.info('Usage: payment risk <user-id> [--cashtag <c>] [--profile-photo <bool>]');
    process.exit(1);
  }

  // Use NewAccountManager for risk calculation
  const paymentData: PaymentData = {
    cashapp_user_id: userId,
    sender_cashtag: cashtag,
    profile_photo: hasProfilePhoto,
    email_verified: emailVerified,
    name: cashtag || 'Unknown User',
    amount,
    timestamp: new Date().toISOString(),
    velocity: 0,
  };

  const result = await NewAccountManager.detectNewAccount(userId, paymentData);

  if (format === 'json') {
    console.info(JSON.stringify({
      userId,
      isNew: result.isNew,
      riskScore: result.riskScore,
      recommendations: result.recommendations,
      fusionAdjustments: result.fusionAdjustments,
    }, null, 2));
    return;
  }

  console.info();
  console.info(`${color('User:', 'bright')} ${userId}`);
  if (cashtag) console.info(`${color('Cashtag:', 'bright')} ${cashtag}`);
  console.info();

  // Risk Score Display
  const riskPct = Math.round(result.riskScore * 100);
  const riskColor = riskPct > 70 ? 'red' : riskPct > 40 ? 'yellow' : 'green';
  const riskLabel = riskPct > 70 ? 'HIGH' : riskPct > 40 ? 'MEDIUM' : 'LOW';

  console.info(color('Risk Assessment:', 'bright'));
  console.info(`  Is New Account: ${result.isNew ? color('YES', 'yellow') : color('NO', 'green')}`);
  console.info(`  Risk Score:     ${riskPct}% ${color(`[${riskLabel}]`, riskColor)}`);
  console.info();

  // Profile indicators
  console.info(color('Profile Indicators:', 'bright'));
  console.info(`  Profile Photo:   ${hasProfilePhoto ? color('✓ Yes', 'green') : color('✗ No', 'red')}`);
  console.info(`  Email Verified:  ${emailVerified ? color('✓ Yes', 'green') : color('✗ No', 'red')}`);
  console.info(`  Amount:          $${amount.toFixed(2)}`);
  console.info();

  // Recommendations
  console.info(color('Barber Recommendations:', 'bright'));
  result.recommendations.forEach((rec) => {
    console.info(`  • ${rec}`);
  });
  console.info();

  // Fusion Adjustments
  if (result.fusionAdjustments.flags?.length) {
    console.info(color('Fusion Adjustments:', 'bright'));
    console.info(`  Tier: ${result.fusionAdjustments.tier || 'unchanged'}`);
    console.info(`  Flags: ${result.fusionAdjustments.flags.join(', ')}`);
    if (result.fusionAdjustments.depositLimit) {
      console.info(`  Deposit Limit: $${result.fusionAdjustments.depositLimit}`);
    }
  }
}

// ==================== CUSTOMER CLASSIFICATION ====================

async function classifyCustomer(args: ParsedArgs) {
  const userId = args.subcommand;
  const format = (args.flags.format as string) || 'table';

  if (!userId) {
    console.error(color('Error: User ID required', 'red'));
    console.info('Usage: payment classify <user-id>');
    process.exit(1);
  }

  // Mock classification (in real implementation, query database)
  const mockData: PaymentData = {
    cashapp_user_id: userId,
    amount: 45,
    timestamp: new Date().toISOString(),
  };

  const classification = await OptimizedFusionEngine.classifyCustomer(userId, mockData);

  if (format === 'json') {
    console.info(JSON.stringify(classification, null, 2));
    return;
  }

  console.info();
  console.info(`${color('Customer:', 'bright')} ${userId}`);
  console.info();

  // Tier with color
  const tierColors: Record<string, keyof typeof c> = {
    whale: 'magenta',
    'high-volume': 'cyan',
    active: 'green',
    casual: 'dim',
  };

  console.info(color('Classification:', 'bright'));
  console.info(`  Tier:       ${color(classification.tier, tierColors[classification.tier] || 'white')}`);
  console.info(`  Confidence: ${Math.round(classification.confidence * 100)}%`);
  console.info(`  Age Factor: ${classification.accountAgeFactor}`);
  console.info();

  console.info(color('Next Best Action:', 'bright'));
  console.info(`  ${classification.nextBestAction}`);
  console.info();

  if (classification.barberAlerts.length) {
    console.info(color('Barber Alerts:', 'bright'));
    classification.barberAlerts.forEach((alert) => {
      console.info(`  ${alert}`);
    });
  }
}

// ==================== GATEWAYS LIST ====================

async function listGateways(args: ParsedArgs) {
  const format = (args.flags.format as string) || 'table';

  const paypal = manifest.payment?.paypal || {};
  const cashapp = manifest.payment?.cashapp || {};
  const venmo = manifest.payment?.venmo || {};
  const unified = manifest.payment?.unified || {};

  const gateways = [
    {
      name: 'PayPal',
      enabled: paypal.enabled ?? true,
      priority: 1,
      buyerProtection: true,
      instantTransfer: true,
      bestFor: 'Large amounts, new accounts',
    },
    {
      name: 'CashApp',
      enabled: cashapp.enabled ?? true,
      priority: 2,
      buyerProtection: false,
      instantTransfer: (cashapp.features as { instant_deposit?: boolean })?.instant_deposit ?? true,
      bestFor: 'Small amounts (< $50), regulars',
    },
    {
      name: 'Venmo',
      enabled: venmo.enabled ?? true,
      priority: 3,
      buyerProtection: true,
      instantTransfer: (venmo.features as { instant_transfer?: boolean })?.instant_transfer ?? true,
      bestFor: 'Split payments, social users',
    },
  ];

  if (format === 'json') {
    console.info(JSON.stringify({
      unified_endpoint: (unified as { endpoint?: string }).endpoint || 'POST /payment/process',
      default_gateway: (unified as { routing?: { default?: string } }).routing?.default || 'paypal',
      auto_selection: (unified as { features?: { auto_gateway_selection?: boolean } }).features?.auto_gateway_selection ?? true,
      gateways,
    }, null, 2));
    return;
  }

  console.info();
  console.info(color('Configured Payment Gateways:', 'bright'));
  console.info();

  gateways.forEach((g) => {
    const status = g.enabled ? color('● ENABLED', 'green') : color('● DISABLED', 'red');
    console.info(`  ${g.name.padEnd(10)} ${status}`);
    console.info(`    Priority:         ${g.priority}`);
    console.info(`    Buyer Protection: ${g.buyerProtection ? color('Yes', 'green') : color('No', 'red')}`);
    console.info(`    Instant Transfer: ${g.instantTransfer ? color('Yes', 'green') : color('No', 'red')}`);
    console.info(`    Best For:         ${g.bestFor}`);
    console.info();
  });

  console.info(color('Unified Endpoint:', 'bright'));
  console.info(`  ${(unified as { endpoint?: string }).endpoint || 'POST /payment/process'}`);
  console.info(`  Default: ${(unified as { routing?: { default?: string } }).routing?.default || 'paypal'}`);
  console.info(`  Auto Selection: ${(unified as { features?: { auto_gateway_selection?: boolean } }).features?.auto_gateway_selection ?? true ? 'Enabled' : 'Disabled'}`);
}

// ==================== PAYMENT TYPES ====================

async function showPaymentTypes(args: ParsedArgs) {
  const format = (args.flags.format as string) || 'table';

  const types = [
    {
      type: 'standard',
      description: 'Standard single payment',
      gateways: ['PayPal', 'CashApp', 'Venmo'],
      maxAmount: 'Unlimited',
    },
    {
      type: 'split',
      description: 'Split between multiple barbers',
      gateways: ['Venmo'],
      maxAmount: 'Unlimited',
    },
    {
      type: 'bundled',
      description: 'Service + product bundle',
      gateways: ['PayPal', 'CashApp', 'Venmo'],
      maxAmount: 'Unlimited',
    },
    {
      type: 'tip_only',
      description: 'Tip-only transaction',
      gateways: ['CashApp', 'Venmo'],
      maxAmount: '$100',
    },
    {
      type: 'subscription',
      description: 'Recurring monthly',
      gateways: ['PayPal'],
      maxAmount: 'Unlimited',
    },
  ];

  if (format === 'json') {
    console.info(JSON.stringify(types, null, 2));
    return;
  }

  console.info();
  console.info(color('Supported Payment Types:', 'bright'));
  console.info();

  types.forEach((t) => {
    console.info(`  ${color(t.type.toUpperCase(), 'cyan')}`);
    console.info(`    Description: ${t.description}`);
    console.info(`    Gateways:    ${t.gateways.join(', ')}`);
    console.info(`    Max Amount:  ${t.maxAmount}`);
    console.info();
  });
}

// ==================== DETECT NEW ACCOUNT ====================

async function detectNewAccount(args: ParsedArgs) {
  const userId = args.subcommand;
  const format = (args.flags.format as string) || 'table';
  const cashtag = (args.flags.cashtag as string) || `$user_${userId}`;
  const amount = parseFloat((args.flags.amount as string) || '50');
  const hasProfilePhoto = args.flags['profile-photo'] !== 'false';
  const emailVerified = args.flags['email-verified'] !== 'false';

  if (!userId) {
    console.error(color('Error: User ID required', 'red'));
    console.info('Usage: payment detect-new <user-id> [--cashtag <c>] [--amount <n>]');
    process.exit(1);
  }

  const paymentData: PaymentData = {
    cashapp_user_id: userId,
    sender_cashtag: cashtag,
    profile_photo: hasProfilePhoto,
    email_verified: emailVerified,
    name: cashtag,
    amount,
    timestamp: new Date().toISOString(),
    velocity: 0,
  };

  const result = await NewAccountManager.detectNewAccount(userId, paymentData);

  if (format === 'json') {
    console.info(JSON.stringify({
      userId,
      cashtag,
      amount,
      ...result,
    }, null, 2));
    return;
  }

  console.info();
  console.info(`${color('CashApp User:', 'bright')} ${cashtag}`);
  console.info(`${color('User ID:', 'bright')} ${userId}`);
  console.info(`${color('Amount:', 'bright')} $${amount.toFixed(2)}`);
  console.info();

  // New Account Detection
  const isNewStr = result.isNew ? color('⚠ NEW ACCOUNT', 'yellow') : color('✓ ESTABLISHED', 'green');
  console.info(color('Detection Result:', 'bright'));
  console.info(`  Status:     ${isNewStr}`);
  console.info(`  Risk Score: ${Math.round(result.riskScore * 100)}%`);
  console.info();

  // Recommendations
  if (result.recommendations.length) {
    console.info(color('Barber Actions:', 'bright'));
    result.recommendations.forEach((rec) => {
      console.info(`  • ${rec}`);
    });
    console.info();
  }

  // Pro Tips for new accounts
  if (result.isNew) {
    console.info(color('Pro Tips for New Accounts:', 'bright'));
    console.info('  1. Ask: "Is this your first time using CashApp with us?"');
    console.info('  2. Show payment notification on your phone');
    console.info('  3. Book next appointment BEFORE they leave');
    console.info();

    console.info(color('Fusion Adjustments:', 'dim'));
    console.info(`  Tier: ${result.fusionAdjustments.tier || 'unchanged'}`);
    console.info(`  Bonus Rate: ${result.fusionAdjustments.bonusRate ? `${(result.fusionAdjustments.bonusRate * 100).toFixed(0)}%` : 'default'}`);
    if (result.fusionAdjustments.depositLimit) {
      console.info(`  Deposit Limit: $${result.fusionAdjustments.depositLimit}`);
    }
  }
}

// ==================== CASHAPP LIMITS ====================

async function showLimits(args: ParsedArgs) {
  const tier = args.subcommand || 'all';
  const format = (args.flags.format as string) || 'table';

  const tiers: Record<string, { dailyLimit: number; weeklyLimit: number; instantAvailability: boolean; tips: string[] }> = CashAppLimits;

  if (format === 'json') {
    if (tier === 'all') {
      console.info(JSON.stringify(tiers, null, 2));
    } else if (tiers[tier]) {
      console.info(JSON.stringify({ tier, ...tiers[tier] }, null, 2));
    } else {
      console.error(color(`Error: Unknown tier "${tier}"`, 'red'));
      console.info(`Valid tiers: ${Object.keys(tiers).join(', ')}`);
      process.exit(1);
    }
    return;
  }

  console.info();

  if (tier === 'all') {
    console.info(color('CashApp Limits by Account Tier:', 'bright'));
    console.info();

    Object.entries(tiers).forEach(([name, limits]) => {
      const tierColor = name === 'new' ? 'yellow' : name === 'recent' ? 'cyan' : 'green';
      console.info(`  ${color(name.toUpperCase(), tierColor)} ${color(`(< ${name === 'new' ? '30' : name === 'recent' ? '90' : '90+'} days)`, 'dim')}`);
      console.info(`    Daily Limit:   $${limits.dailyLimit.toLocaleString()}`);
      console.info(`    Weekly Limit:  $${limits.weeklyLimit.toLocaleString()}`);
      console.info(`    Instant:       ${limits.instantAvailability ? color('Available', 'green') : color('1-3 days', 'yellow')}`);
      console.info(`    Tips:`);
      limits.tips.forEach((tip) => {
        console.info(`      • ${tip}`);
      });
      console.info();
    });
  } else if (tiers[tier]) {
    const limits = tiers[tier];
    console.info(color(`CashApp Limits (${tier.toUpperCase()}):`, 'bright'));
    console.info(`  Daily Limit:   $${limits.dailyLimit.toLocaleString()}`);
    console.info(`  Weekly Limit:  $${limits.weeklyLimit.toLocaleString()}`);
    console.info(`  Instant:       ${limits.instantAvailability ? color('Available', 'green') : color('Not available (1-3 days)', 'yellow')}`);
    console.info();
    console.info(color('Pro Tips:', 'bright'));
    limits.tips.forEach((tip, i) => {
      console.info(`  ${i + 1}. ${tip}`);
    });
  } else {
    console.error(color(`Error: Unknown tier "${tier}"`, 'red'));
    console.info(`Valid tiers: ${Object.keys(tiers).join(', ')}`);
    process.exit(1);
  }
}

// ==================== PRO TIPS ====================

async function showProTips(args: ParsedArgs) {
  const format = (args.flags.format as string) || 'table';

  const tips = [
    {
      category: 'Verification',
      tip: "Ask: 'Is this your first time using CashApp with us?'",
      script: 'I see this is your first CashApp payment - everything come through okay?',
      purpose: 'Opens conversation without sounding accusatory',
    },
    {
      category: 'Payment',
      tip: 'Show payment notification on your phone',
      script: "Looks like it came through! Here's the confirmation.",
      purpose: 'Builds trust with transparency',
    },
    {
      category: 'Booking',
      tip: 'Book next appointment BEFORE they leave',
      script: "Want to book your next appointment? I'll text you the reminder.",
      purpose: 'Increases retention',
    },
    {
      category: 'Growth',
      tip: 'Ask for referral after great service',
      script: "Know anyone else who'd appreciate a good cut? I'll take care of you both.",
      purpose: 'Leverages enthusiasm',
    },
  ];

  if (format === 'json') {
    console.info(JSON.stringify(tips, null, 2));
    return;
  }

  console.info();
  console.info(color('Barber Pro Tips:', 'bright'));
  console.info();

  tips.forEach((t) => {
    console.info(`  ${color(t.category.toUpperCase(), 'cyan')}`);
    console.info(`    Tip:     ${t.tip}`);
    console.info(`    Script:  "${color(t.script, 'dim')}"`);
    console.info(`    Purpose: ${t.purpose}`);
    console.info();
  });
}

// ==================== CHEATSHEET ====================

async function showCheatSheet(args: ParsedArgs) {
  const format = (args.flags.format as string) || 'table';

  if (format === 'json') {
    console.info(JSON.stringify(BarberCheatSheet, null, 2));
    return;
  }

  console.info();
  console.info(color('Barber Cheat Sheet:', 'bright'));
  console.info();

  console.info(color('Green Flags (Good):', 'green'));
  BarberCheatSheet.greenFlags.forEach((flag) => {
    console.info(`  ${flag}`);
  });
  console.info();

  console.info(color('Red Flags (Caution):', 'red'));
  BarberCheatSheet.redFlags.forEach((flag) => {
    console.info(`  ${flag}`);
  });
  console.info();

  console.info(color('Scripts:', 'bright'));
  Object.entries(BarberCheatSheet.scripts).forEach(([key, script]) => {
    console.info(`  ${key.charAt(0).toUpperCase() + key.slice(1)}:`);
    console.info(`    "${color(script, 'dim')}"`);
  });
}

// ==================== CONFIG ====================

async function showConfig(args: ParsedArgs) {
  const format = (args.flags.format as string) || 'table';

  const payment = manifest.payment || {};

  if (format === 'json') {
    console.info(JSON.stringify(payment, null, 2));
    return;
  }

  console.info();
  console.info(color('Payment Configuration:', 'bright'));
  console.info();

  console.info(color('Gateways:', 'bright'));
  console.info(`  Primary:   ${(payment.gateways as { primary?: string })?.primary || 'PayPal'}`);
  console.info(`  Supported: ${((payment.gateways as { supported?: string[] })?.supported || []).join(', ')}`);
  console.info(`  Unified:   ${(payment.gateways as { unified_endpoint?: string })?.unified_endpoint || 'POST /payment/process'}`);
  console.info();

  console.info(color('Risk Scoring:', 'bright'));
  const riskConfig = (payment.cashapp as { risk_scoring?: Record<string, unknown> })?.risk_scoring || {};
  console.info(`  Enabled:           ${(riskConfig.enabled ?? true) ? color('Yes', 'green') : color('No', 'red')}`);
  console.info(`  High Risk Threshold: ${(riskConfig.high_risk_threshold as number || 0.7) * 100}%`);
  console.info(`  New Account Days:  ${riskConfig.new_account_threshold_days || 30}`);
  console.info();

  console.info(color('Customer Tiers:', 'bright'));
  const tiers = (payment.cashapp as { classification?: { tiers?: string[] } })?.classification?.tiers || [];
  console.info(`  Tiers: ${tiers.join(' → ')}`);
}

// ==================== ROUTING ====================

async function showRouting(args: ParsedArgs) {
  const format = (args.flags.format as string) || 'table';

  const unified = manifest.payment?.unified || {};
  const rules = (unified as { routing?: { rules?: Array<Record<string, unknown>> } })?.routing?.rules || [];

  if (format === 'json') {
    console.info(JSON.stringify({
      strategy: (unified as { routing?: { strategy?: string } })?.routing?.strategy || 'smart_routing',
      default: (unified as { routing?: { default?: string } })?.routing?.default || 'paypal',
      rules,
    }, null, 2));
    return;
  }

  console.info();
  console.info(color('Smart Routing Rules:', 'bright'));
  console.info(`  Strategy: ${(unified as { routing?: { strategy?: string } })?.routing?.strategy || 'smart_routing'}`);
  console.info(`  Default:  ${(unified as { routing?: { default?: string } })?.routing?.default || 'paypal'}`);
  console.info();

  console.info(color('Routing Rules:', 'bright'));
  rules.forEach((rule: Record<string, unknown>, i: number) => {
    const priority = rule.priority ? `[P${rule.priority}]` : '';
    console.info(`  ${i + 1}. ${priority} ${color(rule.condition as string, 'dim')}`);
    console.info(`     → ${color(rule.gateway as string, 'cyan')} ${rule.tier ? `(${rule.tier})` : ''}`);
    console.info();
  });

  console.info(color('Routing Logic:', 'dim'));
  console.info('  1. Amount < $50 + CashApp preferred → CashApp');
  console.info('  2. Amount ≥ $100 OR Venmo preferred → Venmo');
  console.info('  3. New account + high amount → PayPal (buyer protection)');
  console.info('  4. Split payment → Venmo');
}

// ==================== BENCHMARK ====================

async function listEntities(args: ParsedArgs) {
  const entityType = args.subcommand;
  const format = (args.flags.format as string) || 'table';

  if (!entityType || !['barbers', 'customers'].includes(entityType)) {
    console.error(color('Error: Entity type required (barbers|customers)', 'red'));
    console.info('Usage: payment list <barbers|customers>');
    process.exit(1);
  }

  if (entityType === 'barbers') {
    // Enhanced barbers with contact, payment, stats, referral and location info
    const barbers = [
      { id: 'barber_jb', name: 'John Barber', code: 'JB', status: 'active', commission_rate: 0.60, skills: ['Haircut', 'Beard Trim', 'Hot Towel Shave'], phone: '555-1001', email: 'john@freshcuts.com', cashapp: '$JohnBarberFresh', venmo: '@JohnBarber-Fresh', paypal: 'john.barber@freshcuts.com', total_payments: 156, total_tips: 420.50, referrals_sent: 8, shop: 'Fresh Cuts Downtown', location: '123 Main St, New York, NY', zipcode: '10001', geocode: '40.7128,-74.0060' },
      { id: 'barber_ms', name: 'Mike Styles', code: 'MS', status: 'active', commission_rate: 0.55, skills: ['Haircut', 'Fade', 'Design'], phone: '555-1002', email: 'mike@freshcuts.com', cashapp: '$MikeStylesCuts', venmo: '@MikeStyles-Cuts', paypal: 'mike.styles@freshcuts.com', total_payments: 134, total_tips: 385.00, referrals_sent: 5, shop: 'Fresh Cuts Brooklyn', location: '456 Atlantic Ave, Brooklyn, NY', zipcode: '11217', geocode: '40.6782,-73.9442' },
      { id: 'barber_ck', name: 'Chris Kutz', code: 'CK', status: 'off_duty', commission_rate: 0.50, skills: ['Beard Trim', 'Hot Towel Shave'], phone: '555-1003', email: 'chris@freshcuts.com', cashapp: '$ChrisKutz', venmo: '@ChrisKutz-Barber', paypal: 'chris.kutz@freshcuts.com', total_payments: 89, total_tips: 210.25, referrals_sent: 2, shop: 'Fresh Cuts Downtown', location: '123 Main St, New York, NY', zipcode: '10001', geocode: '40.7128,-74.0060' },
      { id: 'barber_om', name: 'Omar Razor', code: 'OM', status: 'active', commission_rate: 0.58, skills: ['Hot Towel Shave', 'Beard Trim'], phone: '555-1004', email: 'omar@freshcuts.com', cashapp: '$OmarRazorSharp', venmo: '@OmarRazor-Barber', paypal: 'omar.razor@freshcuts.com', total_payments: 112, total_tips: 315.75, referrals_sent: 6, shop: 'Fresh Cuts Queens', location: '789 Queens Blvd, Queens, NY', zipcode: '11375', geocode: '40.7282,-73.7949' },
      { id: 'barber_ja', name: 'Jamal Braids', code: 'JA', status: 'active', commission_rate: 0.57, skills: ['Braids', 'Design', 'Fade'], phone: '555-1005', email: 'jamal@freshcuts.com', cashapp: '$JamalBraids', venmo: '@JamalBraids-Artist', paypal: 'jamal.braids@freshcuts.com', total_payments: 178, total_tips: 520.00, referrals_sent: 12, shop: 'Fresh Cuts Harlem', location: '321 125th St, New York, NY', zipcode: '10027', geocode: '40.8176,-73.9482' },
    ];

    if (format === 'json') {
      console.info(JSON.stringify(barbers, null, 2));
      return;
    }

    console.info();
    console.info(color('╔══════════════════════════════════════════════════════════════════════╗', 'bright'));
    console.info(color('║                          BARBERS LIST                                ║', 'bright'));
    console.info(color('╚══════════════════════════════════════════════════════════════════════╝', 'bright'));
    console.info();

    barbers.forEach((b, i) => {
      const status = b.status === 'active' ? '🟢' : '⚪';
      console.info(`  ${i + 1}. ${status} ${color(b.name, 'cyan')} (${color(b.code, 'yellow')})`);
      console.info(`     📧 ${color(b.email, 'dim')} | 📱 ${b.phone}`);
      console.info(`     💵 Commission: ${(b.commission_rate * 100).toFixed(0)}% | Skills: ${b.skills.join(', ')}`);
      console.info(`     🏪 ${color(b.shop, 'magenta')} | 📍 ${b.location}`);
      console.info(`     🗺️  Zip: ${b.zipcode} | Lat,Lng: ${b.geocode}`);
      console.info(`     💳 Payment Apps:`);
      console.info(`        CashApp: ${color(b.cashapp, 'green')} | Venmo: ${color(b.venmo, 'blue')} | PayPal: ${color(b.paypal, 'blue')}`);
      console.info(`     📊 Stats: 💰 ${b.total_payments} payments | 🎁 $${b.total_tips.toFixed(2)} tips | 🤝 ${b.referrals_sent} referrals sent`);
      console.info();
    });

    const activeCount = barbers.filter(b => b.status === 'active').length;
    const totalPayments = barbers.reduce((sum, b) => sum + b.total_payments, 0);
    const totalTips = barbers.reduce((sum, b) => sum + b.total_tips, 0);
    const totalReferrals = barbers.reduce((sum, b) => sum + b.referrals_sent, 0);
    console.info(color(`  Total: ${barbers.length} barbers (${activeCount} active) | ${totalPayments} payments | $${totalTips.toFixed(2)} tips | ${totalReferrals} referrals`, 'dim'));
    return;
  }

  if (entityType === 'customers') {
    // Enhanced customers with contact, payment, stats, referral and location info
    const customers = [
      { id: 'cust_001', name: 'Alice Johnson', phone: '555-0101', email: 'alice.j@gmail.com', tier: 'vip', visits: 12, total_spent: 650.00, total_payments: 15, total_tips: 85.50, preferred_barber: 'barber_jb', cashapp: '$AliceJ2024', venmo: '@Alice-Johnson', paypal: 'alice.j@gmail.com', referred_by: 'cust_003', referrals_made: 3, home_shop: 'Fresh Cuts Downtown', address: '456 Park Ave, New York, NY', zipcode: '10001', geocode: '40.7112,-73.9975' },
      { id: 'cust_002', name: 'Bob Smith', phone: '555-0102', email: 'bob.smith@yahoo.com', tier: 'regular', visits: 8, total_spent: 320.00, total_payments: 10, total_tips: 42.00, preferred_barber: 'barber_ms', cashapp: '$BobSmithCuts', venmo: '@BobSmith-Venmo', paypal: 'bob.smith@yahoo.com', referred_by: null, referrals_made: 1, home_shop: 'Fresh Cuts Brooklyn', address: '789 Fulton St, Brooklyn, NY', zipcode: '11217', geocode: '40.6795,-73.9423' },
      { id: 'cust_003', name: 'Carlos Ruiz', phone: '555-0103', email: 'c.ruiz@outlook.com', tier: 'casual', visits: 3, total_spent: 85.00, total_payments: 4, total_tips: 12.00, preferred_barber: null, cashapp: '$CarlosR', venmo: null, paypal: 'c.ruiz@outlook.com', referred_by: null, referrals_made: 2, home_shop: 'Fresh Cuts Downtown', address: '321 Broadway, New York, NY', zipcode: '10001', geocode: '40.7145,-74.0039' },
      { id: 'cust_004', name: 'David Kim', phone: '555-0104', email: 'dkim@gmail.com', tier: 'new', visits: 1, total_spent: 45.00, total_payments: 2, total_tips: 5.00, preferred_barber: 'barber_om', cashapp: null, venmo: '@DavidKim', paypal: null, referred_by: 'cust_001', referrals_made: 0, home_shop: 'Fresh Cuts Queens', address: '654 Austin St, Queens, NY', zipcode: '11375', geocode: '40.7268,-73.7965' },
      { id: 'cust_005', name: 'Eric Taylor', phone: '555-0105', email: 'eric.t@proton.me', tier: 'regular', visits: 6, total_spent: 240.00, total_payments: 8, total_tips: 35.00, preferred_barber: 'barber_ja', cashapp: '$EricTaylor', venmo: '@EricTaylor-Pay', paypal: 'eric.t@proton.me', referred_by: 'cust_002', referrals_made: 1, home_shop: 'Fresh Cuts Harlem', address: '987 Malcolm X Blvd, New York, NY', zipcode: '10027', geocode: '40.8142,-73.9496' },
    ];

    if (format === 'json') {
      console.info(JSON.stringify(customers, null, 2));
      return;
    }

    console.info();
    console.info(color('╔══════════════════════════════════════════════════════════════════════╗', 'bright'));
    console.info(color('║                         CUSTOMERS LIST                               ║', 'bright'));
    console.info(color('╚══════════════════════════════════════════════════════════════════════╝', 'bright'));
    console.info();

    customers.forEach((c, i) => {
      const tierIcon = c.tier === 'vip' ? '⭐' : c.tier === 'regular' ? '🔵' : c.tier === 'casual' ? '🟡' : '🆕';
      const tierColor = c.tier === 'vip' ? 'magenta' : c.tier === 'regular' ? 'blue' : c.tier === 'casual' ? 'yellow' : 'dim';
      console.info(`  ${i + 1}. ${tierIcon} ${color(c.name, 'cyan')} (${color(c.id, 'dim')})`);
      console.info(`     📧 ${color(c.email, 'dim')} | 📱 ${c.phone}`);
      console.info(`     Tier: ${color(c.tier.toUpperCase(), tierColor)} | Visits: ${c.visits} | Total Spent: $${c.total_spent.toFixed(2)}`);
      console.info(`     📊 Stats: 💰 ${c.total_payments} payments | 🎁 $${c.total_tips.toFixed(2)} tips`);
      console.info(`     🏪 Home Shop: ${color(c.home_shop, 'magenta')} | 📍 ${c.address}`);
      console.info(`     🗺️  Zip: ${c.zipcode} | Lat,Lng: ${c.geocode}`);
      console.info(`     Preferred Barber: ${c.preferred_barber ? color(c.preferred_barber, 'yellow') : 'None'}`);
      console.info(`     💳 Payment Apps:`);
      const payments = [];
      if (c.cashapp) payments.push(`CashApp: ${color(c.cashapp, 'green')}`);
      if (c.venmo) payments.push(`Venmo: ${color(c.venmo, 'blue')}`);
      if (c.paypal) payments.push(`PayPal: ${color(c.paypal, 'blue')}`);
      console.info(`        ${payments.join(' | ') || color('None configured', 'dim')}`);
      if (c.referred_by) {
        console.info(`     🤝 Referred by: ${color(c.referred_by, 'cyan')} | Referrals made: ${c.referrals_made}`);
      } else if (c.referrals_made > 0) {
        console.info(`     🤝 Referrals made: ${c.referrals_made}`);
      }
      console.info();
    });

    const totalPayments = customers.reduce((sum, c) => sum + c.total_payments, 0);
    const totalTips = customers.reduce((sum, c) => sum + c.total_tips, 0);
    const totalReferrals = customers.reduce((sum, c) => sum + c.referrals_made, 0);
    console.info(color(`  Total: ${customers.length} customers | ${totalPayments} payments | $${totalTips.toFixed(2)} tips | ${totalReferrals} referrals`, 'dim'));
  }
}

async function benchmark() {
  header();
  console.info(color('\nRunning payment benchmarks...\n', 'yellow'));

  const b = async (name: string, fn: () => void | Promise<void>, iter = 1000) => {
    // Warmup
    for (let i = 0; i < 100; i++) await fn();

    // Actual benchmark
    const start = performance.now();
    for (let i = 0; i < iter; i++) await fn();
    const elapsed = performance.now() - start;
    const ops = Math.round((iter / elapsed) * 1000);

    const opsFormatted = ops.toLocaleString().padStart(10);
    const status = ops >= 10000 ? color('✓', 'green') : color('○', 'dim');

    console.info(`  ${name.padEnd(25)} ${opsFormatted} ops/s ${status}`);
    return ops;
  };

  const results: number[] = [];

  // Mock payment data for benchmarks
  const mockData: PaymentData = {
    cashapp_user_id: 'user_123',
    sender_cashtag: '$testuser',
    amount: 50,
    profile_photo: true,
    email_verified: true,
    velocity: 0,
  };

  results.push(await b('detectNewAccount', () => NewAccountManager.detectNewAccount('user_123', mockData), 500));
  results.push(await b('classifyCustomer', () => OptimizedFusionEngine.classifyCustomer('user_123', mockData), 500));

  const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);

  console.info(`\n${color('Average:', 'bright')} ${avg.toLocaleString()} ops/s`);

  const targetOps = 10000;
  if (avg >= targetOps) {
    console.info(color(`✓ EXCEEDS TARGET (${targetOps.toLocaleString()} ops/s)`, 'green'));
  } else {
    const pct = Math.round((avg / targetOps) * 100);
    console.info(color(`○ ${pct}% of target (${targetOps.toLocaleString()} ops/s)`, 'yellow'));
  }
}

// ==================== KIMI SHELL INTEGRATION ====================

async function kimiShellExecute(args: ParsedArgs) {
  const subcommand = args.subcommand || 'status';
  const format = (args.flags.format as string) || 'table';
  
  console.info();
  console.info(color('╔══════════════════════════════════════════════════════════════╗', 'bright'));
  console.info(color('║                  KIMI SHELL INTEGRATION                      ║', 'bright'));
  console.info(color('╚══════════════════════════════════════════════════════════════╝', 'bright'));
  console.info();
  
  // Check if running in Kimi Shell environment
  const isKimiShell = !!process.env.KIMI_SHELL || !!process.env.KIMI_CLI;
  
  if (isKimiShell) {
    console.info(color('✓ Running in Kimi Shell environment', 'green'));
    console.info();
  }
  
  // Execute the requested command
  switch (subcommand) {
    case 'barbers':
    case 'customers':
      await listEntities({ ...args, subcommand });
      break;
    case 'status':
      await showStatus(args);
      break;
    case 'gateways':
      await listGateways(args);
      break;
    case 'risk':
      await calculateRisk(args);
      break;
    case 'classify':
      await classifyCustomer(args);
      break;
    case 'routing':
      await showRouting(args);
      break;
    case 'config':
      await showConfig(args);
      break;
    case 'help':
    default:
      console.info(color('Kimi Shell Commands:', 'bright'));
      console.info('  kimi barbers     - List all barbers with location data');
      console.info('  kimi customers   - List all customers with location data');
      console.info('  kimi status      - Show payment gateway status');
      console.info('  kimi gateways    - List configured gateways');
      console.info('  kimi risk <user> - Calculate risk for user');
      console.info('  kimi classify <user> - Classify customer tier');
      console.info('  kimi routing     - Show smart routing rules');
      console.info('  kimi config      - Show payment configuration');
      console.info();
      console.info(color('Environment Variables:', 'bright'));
      console.info('  KIMI_SHELL - Set when running in Kimi Shell');
      console.info('  KIMI_CLI   - Set when running via Kimi CLI');
      console.info('  R2_PROFILE - Active R2/Matrix profile');
      console.info();
  }
  
  // Show Matrix/OpenClaw context if available
  if (process.env.R2_PROFILE) {
    console.info(color('Matrix Profile:', 'bright'));
    console.info(`  Active: ${color(process.env.R2_PROFILE, 'cyan')}`);
    console.info();
  }
  
  // Show MCP server status
  console.info(color('MCP Integration:', 'bright'));
  console.info('  Status: ' + color('Available', 'green'));
  console.info('  Server: unified-shell');
  console.info('  Tools:  shell_execute, matrix_bridge_proxy');
  console.info();
}

// Main entry point
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { command, flags } = args;

  // Show banner unless quiet mode
  if (!flags.q && !flags.quiet && command !== '' && command !== 'help') {
    header();
  }

  switch (command) {
    case 'status':
      await showStatus(args);
      break;

    case 'velocity':
      await checkVelocity(args);
      break;

    case 'risk':
      await calculateRisk(args);
      break;

    case 'classify':
      await classifyCustomer(args);
      break;

    case 'gateways':
      await listGateways(args);
      break;

    case 'types':
      await showPaymentTypes(args);
      break;

    case 'detect-new':
      await detectNewAccount(args);
      break;

    case 'limits':
      await showLimits(args);
      break;

    case 'tips':
      await showProTips(args);
      break;

    case 'cheatsheet':
    case 'cheat':
      await showCheatSheet(args);
      break;

    case 'config':
      await showConfig(args);
      break;

    case 'routing':
      await showRouting(args);
      break;

    case 'benchmark':
      await benchmark();
      break;

    case 'list':
      await listEntities(args);
      break;

    case 'kimi':
      await kimiShellExecute(args);
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case '-v':
    case '--version':
      console.info(VERSION);
      break;

    case '':
      if (!flags.q && !flags.quiet) {
        showHelp();
      }
      break;

    default:
      console.error(color(`Unknown command: ${command}`, 'red'));
      console.info(`Run ${color('payment help', 'cyan')} for usage`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(color(`Error: ${err.message}`, 'red'));
  process.exit(1);
});

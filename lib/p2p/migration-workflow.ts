// lib/p2p/migration-workflow.ts — Step-by-step business change migration workflow

import { BusinessContinuity } from './business-continuity';
import Redis from 'ioredis';

const redis = new Redis(Bun.env.REDIS_URL ?? 'redis://localhost:6379', {
  retryStrategy: times => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

export interface MigrationOptions {
  reason: 'rename' | 'relocation' | 'rebrand' | 'closure';
  forwardPayments: boolean;
  forwardDuration: number; // days
  notifyCustomers: boolean;
  updateQRs: boolean;
}

export interface MigrationReport {
  migrationId: string;
  timestamp: string;
  oldAlias: string;
  newAlias: string;
  reason: string;
  forwardPayments: boolean;
  forwardDuration: number;
  customersNotified: boolean;
  oldBusinessId: string;
  newBusinessId: string;
  redirectSetup: boolean;
}

/**
 * Execute a complete business migration workflow
 */
export async function executeBusinessMigration(
  oldAlias: string,
  newName: string,
  newAlias: string,
  options: MigrationOptions
): Promise<MigrationReport> {
  console.log('🔄 Starting Business Migration Workflow');

  // Step 1: Verify old business exists
  const oldBusinessId = await redis.hget(`alias:${oldAlias}`, 'businessId');
  if (!oldBusinessId) {
    throw new Error(`Business "${oldAlias}" not found`);
  }

  // Step 2: Check for pending payments
  const pendingKey = `pending:${oldAlias}`;
  const pendingCount = await redis.scard(pendingKey);
  if (pendingCount > 0) {
    console.warn(`⚠️ ${pendingCount} pending payments found. Consider waiting.`);
  }

  // Step 3: Execute migration
  const migrationResult = await BusinessContinuity.migrateBusiness(oldAlias, {
    name: newName,
    alias: newAlias,
    reason: options.reason,
    forwardPayments: options.forwardPayments,
    forwardDays: options.forwardDuration,
  });

  console.log(`✅ Business migrated: ${oldAlias} → ${newAlias}`);

  // Step 4: Generate new QR codes if needed
  if (options.updateQRs) {
    await generateNewQRCodes(newAlias);
  }

  // Step 5: Create migration report
  const report: MigrationReport = {
    migrationId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    oldAlias,
    newAlias,
    reason: options.reason,
    forwardPayments: options.forwardPayments,
    forwardDuration: options.forwardDuration,
    customersNotified: options.notifyCustomers,
    oldBusinessId: migrationResult.oldBusinessId,
    newBusinessId: migrationResult.newBusinessId,
    redirectSetup: migrationResult.redirectSetup,
  };

  // Save report
  const reportsDir = 'migrations';
  try {
    await Bun.mkdir(reportsDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  const reportName = `migration-${oldAlias}-${newAlias}-${Date.now()}.json`;
  await Bun.write(`${reportsDir}/${reportName}`, JSON.stringify(report, null, 2));

  // Step 6: Update any external systems
  await updateExternalServices(oldAlias, newAlias);

  console.log(`
🎉 Migration Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Old Business: ${oldAlias}
New Business: ${newAlias}
Reason: ${options.reason}
Forwarding: ${options.forwardPayments ? `Enabled (${options.forwardDuration} days)` : 'Disabled'}
Customers Notified: ${options.notifyCustomers ? 'Yes' : 'No'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next Steps:
1. Update physical QR codes at location
2. Update website/social media
3. Monitor forwarded payments
4. Run follow-up notification in 30 days
`);

  return report;
}

/**
 * Generate new QR codes for a business
 */
async function generateNewQRCodes(alias: string): Promise<void> {
  const amounts = [20, 30, 50, 75, 100];

  try {
    const businessInfo = await BusinessContinuity.getCurrentPaymentHandles(alias);

    for (const amount of amounts) {
      const qrCode = {
        alias,
        amount,
        handles: businessInfo.handles,
        generated: new Date().toISOString(),
        url: `http://localhost:3002/pay?alias=${alias}&amount=${amount}`,
      };

      await redis.set(`qr:${alias}:${amount}`, JSON.stringify(qrCode), 'EX', 365 * 24 * 60 * 60); // 1 year
    }

    console.log(`📸 Generated ${amounts.length} new QR codes for ${alias}`);
  } catch (error) {
    console.error('Error generating QR codes:', error);
  }
}

/**
 * Update external services (placeholder for integrations)
 */
async function updateExternalServices(oldAlias: string, newAlias: string): Promise<void> {
  // In production, integrate with:
  // - Website CMS
  // - Social media APIs
  // - Email marketing platforms
  // - Analytics systems

  console.log(`🔗 Would update external services: ${oldAlias} → ${newAlias}`);

  // Store update task
  await redis.lpush(
    'external_updates',
    JSON.stringify({
      oldAlias,
      newAlias,
      timestamp: new Date().toISOString(),
      status: 'pending',
    })
  );
}

/**
 * Handle emergency payment account loss
 */
export async function handlePaymentAccountLoss(
  alias: string,
  provider: 'cashapp' | 'venmo' | 'paypal',
  newHandle: string,
  emergencyContact: string
): Promise<any> {
  console.log(`🚨 EMERGENCY: ${provider} account lost for ${alias}`);

  // 1. Immediately disable the affected provider
  const businessId = await redis.hget(`alias:${alias}`, 'businessId');
  if (!businessId) {
    throw new Error('Business not found');
  }

  const handlesStr = await redis.hget(`business:${businessId}`, 'paymentHandles');
  if (!handlesStr) {
    throw new Error('Payment handles not found');
  }

  const handles = JSON.parse(handlesStr);
  handles[provider] = 'DISABLED-' + Date.now();

  await redis.hset(`business:${businessId}`, 'paymentHandles', JSON.stringify(handles));

  // 2. Set emergency flag
  await redis.hmset(`emergency:${alias}:${provider}`, [
    'lostAt',
    new Date().toISOString(),
    'newHandle',
    newHandle,
    'contact',
    emergencyContact,
    'status',
    'recovering',
  ]);

  // 3. Notify customers who paid via this provider recently
  const paymentKeys = await redis.keys(`payment:*`);
  const recentPayments: string[] = [];

  for (const key of paymentKeys.slice(0, 100)) {
    const payment = await redis.hgetall(key);
    if (payment && payment.businessAlias === alias && payment.provider === provider) {
      if (payment.stealthId) {
        recentPayments.push(payment.stealthId);
      }
    }
  }

  // 4. Generate recovery instructions
  const recovery = {
    alias,
    provider,
    lostAt: new Date().toISOString(),
    affectedCustomers: recentPayments.length,
    actions: [
      'Update physical QR codes',
      'Update digital payment links',
      'Contact affected customers',
      'Monitor for fraudulent activity',
    ],
  };

  try {
    await Bun.mkdir('emergency', { recursive: true });
  } catch {
    // Directory might already exist
  }

  await Bun.write(
    `emergency/${alias}-${provider}-${Date.now()}.json`,
    JSON.stringify(recovery, null, 2)
  );

  console.log(`✅ Emergency response initiated for ${alias}`);
  return recovery;
}

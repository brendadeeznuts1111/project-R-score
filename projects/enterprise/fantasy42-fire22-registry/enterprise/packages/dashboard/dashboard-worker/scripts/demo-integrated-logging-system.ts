#!/usr/bin/env bun
/**
 * 🔥 Fire22 Integrated Logging System Demo
 * Comprehensive demonstration of L-Key system with enhanced logging
 */

import { createFire22Logger } from '../packages/enhanced-logging/src';
import { EnhancedTransactionProcessor } from '../src/services/enhanced-transaction-processor';
import {
  OTCMatchingEngine,
  OrderType,
  OrderSide,
  TradingAsset,
} from '../src/services/otc-order-matching-engine';
import {
  CustomerType,
  TransactionType,
  PaymentMethod,
  getLKeyForValue,
  calculateTotalFee,
} from '../src/types/fire22-otc-constants';

/**
 * Main integrated demo
 */
async function runIntegratedDemo(): Promise<void> {
  console.log('\n🔥🔥🔥 FIRE22 INTEGRATED LOGGING & L-KEY SYSTEM DEMO 🔥🔥🔥\n');

  // Initialize enhanced logger
  const logger = createFire22Logger({
    enableLKeyTracking: true,
    enableConsole: true,
    enableFile: true,
    filePath: './logs/demo-integrated.log',
    level: 0, // DEBUG level for demo
  });

  logger.info('🚀 Starting Fire22 Integrated System Demo', {
    component: 'demo-runner',
    sessionId: 'DEMO_SESSION_001',
  });

  // Demo 1: Enhanced Transaction Processing with Logging
  await demonstrateTransactionProcessing(logger);

  // Demo 2: OTC Trading with Audit Trails
  await demonstrateOTCTradingWithLogging(logger);

  // Demo 3: Security Events and Risk Monitoring
  await demonstrateSecurityLogging(logger);

  // Demo 4: Performance Monitoring
  await demonstratePerformanceLogging(logger);

  // Demo 5: Comprehensive Reporting
  await demonstrateReporting(logger);

  // Cleanup
  await logger.flush();

  console.log('\n✅ Integrated Demo Complete! Check logs/demo-integrated.log for detailed logs.\n');
}

/**
 * Demo 1: Transaction Processing with Enhanced Logging
 */
async function demonstrateTransactionProcessing(logger: any): Promise<void> {
  console.log('💳 === DEMO 1: TRANSACTION PROCESSING WITH L-KEY LOGGING ===\n');

  const processor = EnhancedTransactionProcessor.getInstance();

  // Create a high-value VIP transaction
  const vipTransaction = {
    id: 'TXN_VIP_DEMO_001',
    type: TransactionType.P2P_TRANSFER,
    fromCustomerId: 'CUST_VIP_001',
    fromCustomerType: CustomerType.VIP,
    fromTelegramId: '1111111111',
    fromUsername: '@diamond_trader_vip',
    toCustomerId: 'CUST_PRO_002',
    toCustomerType: CustomerType.PROFESSIONAL,
    toTelegramId: '2222222222',
    toUsername: '@pro_trader_elite',
    amount: 250000,
    currency: 'USD',
    paymentMethod: PaymentMethod.BANK_WIRE,
    serviceTier: 3,
    monthlyVolume: 2500000,
    description: 'High-value VIP P2P transfer with full L-Key tracking',
  };

  console.log('🔄 Processing VIP Transaction with Enhanced Logging:');
  console.log(`   From: ${vipTransaction.fromUsername} (${vipTransaction.fromCustomerType})`);
  console.log(`   To: ${vipTransaction.toUsername} (${vipTransaction.toCustomerType})`);
  console.log(`   Amount: $${vipTransaction.amount.toLocaleString()}`);
  console.log(`   Service Tier: ${vipTransaction.serviceTier}`);

  try {
    const startTimer = logger.time(
      'VIP_TRANSACTION_PROCESSING',
      getLKeyForValue(TransactionType.P2P_TRANSFER),
      vipTransaction.id
    );

    const result = await processor.processTransaction(vipTransaction);

    startTimer(); // Stop timer and log performance

    // Log transaction completion with L-Key context
    logger.logTransaction(result.id, result.type, result.transactionLKey, 'COMPLETED', {
      amount: result.amount,
      currency: result.currency,
      fromCustomerId: vipTransaction.fromCustomerId,
      toCustomerId: vipTransaction.toCustomerId,
      paymentMethod: vipTransaction.paymentMethod,
      paymentMethodLKey: result.paymentMethodLKey,
      status: result.status,
      statusLKey: result.statusLKey,
      fees: result.fees,
      riskScore: result.riskScore,
      flowSequence: result.flowSequence,
    });

    console.log(`\n✅ Transaction Completed Successfully!`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Total Fee: $${result.fees.totalFee.toFixed(2)}`);
    console.log(`   VIP Savings: $${result.fees.tierDiscount.toFixed(2)}`);
    console.log(`   Flow: ${result.flowSequence.slice(0, 5).join(' → ')}...`);
  } catch (error: any) {
    logger.error(
      'Transaction processing failed',
      {
        entityId: vipTransaction.id,
        component: 'transaction-processor',
      },
      { error: error.message }
    );

    console.log(`❌ Transaction Failed: ${error.message}`);
  }

  console.log('\n');
}

/**
 * Demo 2: OTC Trading with Audit Trails
 */
async function demonstrateOTCTradingWithLogging(logger: any): Promise<void> {
  console.log('🏛️ === DEMO 2: OTC TRADING WITH ENHANCED LOGGING ===\n');

  const otcEngine = new OTCMatchingEngine();

  // Create OTC block order
  const blockOrder = {
    customerId: 'CUST_INST_001',
    telegramId: '3333333333',
    telegramUsername: '@institutional_desk_alpha',
    customerType: CustomerType.INSTITUTIONAL,
    type: OrderType.OTC_BLOCK,
    side: OrderSide.BUY,
    asset: TradingAsset.BTC,
    amount: 1000000, // $1M order
    targetPrice: 64500,
    allowPartialFill: false,
    timeInForce: 'GTC' as const,
    serviceTier: 3,
    paymentMethod: PaymentMethod.BANK_WIRE,
    monthlyVolume: 10000000,
    isIceberg: false,
  };

  console.log('📈 Placing Institutional OTC Block Order:');
  console.log(`   Trader: ${blockOrder.telegramUsername} (${blockOrder.customerType})`);
  console.log(
    `   Order: ${blockOrder.side} $${blockOrder.amount.toLocaleString()} of ${blockOrder.asset}`
  );
  console.log(`   Target: $${blockOrder.targetPrice?.toLocaleString()}`);

  try {
    const orderTimer = logger.time(
      'OTC_BLOCK_ORDER_PLACEMENT',
      getLKeyForValue('OTC_BLOCK'),
      `ORDER_${Date.now()}`
    );

    const placedOrder = await otcEngine.placeOrder(blockOrder);

    orderTimer(); // Stop timer

    // Log OTC order with comprehensive details
    logger.logOTCOrder(placedOrder.id, placedOrder.type, placedOrder.orderLKey, 'ORDER_PLACED', {
      customerId: placedOrder.customerId,
      customerLKey: placedOrder.customerLKey,
      side: placedOrder.side,
      asset: placedOrder.asset,
      amount: placedOrder.amount,
      price: placedOrder.targetPrice,
      status: placedOrder.status,
      statusLKey: placedOrder.statusLKey,
      priority: placedOrder.priority,
      serviceTier: placedOrder.serviceTier,
      auditTrail: placedOrder.auditTrail,
    });

    console.log(`\n✅ OTC Block Order Placed Successfully!`);
    console.log(`   Order ID: ${placedOrder.id}`);
    console.log(`   L-Key: ${placedOrder.orderLKey}`);
    console.log(`   Priority: ${placedOrder.priority}`);
    console.log(`   Commission: ${(placedOrder.commissionRate * 100).toFixed(3)}%`);
    console.log(`   Audit Trail: ${placedOrder.auditTrail.join(', ')}`);
  } catch (error: any) {
    logger.error(
      'OTC order placement failed',
      {
        component: 'otc-matching-engine',
      },
      { error: error.message }
    );

    console.log(`❌ OTC Order Failed: ${error.message}`);
  }

  console.log('\n');
}

/**
 * Demo 3: Security Events and Risk Monitoring
 */
async function demonstrateSecurityLogging(logger: any): Promise<void> {
  console.log('🛡️ === DEMO 3: SECURITY LOGGING & RISK MONITORING ===\n');

  // Simulate various security events
  const securityEvents = [
    {
      event: 'SUSPICIOUS_LOGIN_ATTEMPT',
      severity: 'MEDIUM' as const,
      lKey: getLKeyForValue(CustomerType.HIGH_RISK)!,
      entityId: 'CUST_RISK_001',
      details: {
        sourceIP: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        endpoint: '/api/auth/login',
        riskScore: 75,
        blocked: true,
        reason: 'Multiple failed login attempts from new location',
        mitigation: 'Account temporarily locked, SMS verification required',
      },
    },
    {
      event: 'LARGE_TRANSACTION_FLAGGED',
      severity: 'HIGH' as const,
      lKey: getLKeyForValue(TransactionType.P2P_TRANSFER)!,
      entityId: 'TXN_LARGE_001',
      details: {
        sourceIP: '10.0.0.50',
        riskScore: 85,
        blocked: false,
        reason: 'Transaction amount exceeds customer historical patterns',
        mitigation: 'Enhanced KYC verification initiated',
      },
    },
    {
      event: 'COMPLIANCE_VIOLATION',
      severity: 'CRITICAL' as const,
      lKey: getLKeyForValue(CustomerType.RESTRICTED)!,
      entityId: 'CUST_RESTRICTED_001',
      details: {
        riskScore: 95,
        blocked: true,
        reason: 'Customer attempting transaction while under sanctions review',
        mitigation: 'All transactions blocked, compliance team notified',
      },
    },
  ];

  console.log('🚨 Processing Security Events:');

  for (const event of securityEvents) {
    logger.logSecurity(event.event, event.severity, event.lKey, event.entityId, event.details);

    console.log(`   ${event.severity}: ${event.event} (${event.lKey})`);
    console.log(`     Entity: ${event.entityId}`);
    console.log(`     Risk Score: ${event.details.riskScore}/100`);
    console.log(`     Blocked: ${event.details.blocked ? '🚫 YES' : '✅ NO'}`);
    console.log(`     Reason: ${event.details.reason}`);
    console.log('');
  }

  console.log('\n');
}

/**
 * Demo 4: Performance Monitoring
 */
async function demonstratePerformanceLogging(logger: any): Promise<void> {
  console.log('⚡ === DEMO 4: PERFORMANCE MONITORING ===\n');

  // Simulate various performance scenarios
  const performanceTests = [
    {
      operation: 'DATABASE_QUERY_CUSTOMERS',
      duration: 45,
      lKey: getLKeyForValue(CustomerType.VIP)!,
      entityId: 'DB_QUERY_001',
      details: {
        cpuUsage: 15.2,
        memoryUsage: 128.5,
        throughput: 1250,
        latency: 45,
      },
    },
    {
      operation: 'FEE_CALCULATION_BATCH',
      duration: 156,
      lKey: getLKeyForValue('FEE_COLLECTION')!,
      entityId: 'BATCH_CALC_001',
      details: {
        cpuUsage: 45.8,
        memoryUsage: 256.3,
        throughput: 500,
        latency: 156,
      },
    },
    {
      operation: 'L_KEY_MAPPING_BULK',
      duration: 1250, // Slow operation for demo
      lKey: 'L0000',
      entityId: 'BULK_MAPPING_001',
      details: {
        cpuUsage: 78.5,
        memoryUsage: 512.1,
        throughput: 100,
        latency: 1250,
        errorRate: 0.02,
      },
    },
  ];

  console.log('📊 Running Performance Tests:');

  for (const test of performanceTests) {
    // Simulate the operation
    const timer = logger.time(test.operation, test.lKey, test.entityId);

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, Math.min(test.duration, 100)));

    timer(); // This will log the actual timing

    // Log detailed performance metrics
    logger.logPerformance(test.operation, test.duration, test.lKey, test.entityId, test.details);

    console.log(`   ${test.operation}: ${test.duration}ms`);
    console.log(`     CPU: ${test.details.cpuUsage}%`);
    console.log(`     Memory: ${test.details.memoryUsage}MB`);
    console.log(`     Throughput: ${test.details.throughput} ops/sec`);

    if (test.duration > 1000) {
      console.log(`     ⚠️  Slow operation detected!`);
    }

    console.log('');
  }

  console.log('\n');
}

/**
 * Demo 5: Comprehensive Reporting
 */
async function demonstrateReporting(logger: any): Promise<void> {
  console.log('📋 === DEMO 5: COMPREHENSIVE REPORTING ===\n');

  // Generate audit report
  const auditReport = logger.generateAuditReport();

  console.log('📈 System Audit Report:');
  console.log(`   Total Log Entries: ${auditReport.totalEntries}`);
  console.log(`   Security Events: ${auditReport.securityEvents}`);

  console.log('\n   📊 Logs by Level:');
  for (const [level, count] of Object.entries(auditReport.byLevel)) {
    console.log(`     ${level}: ${count}`);
  }

  console.log('\n   🔑 Top L-Keys Used:');
  const topLKeys = Object.entries(auditReport.byLKey)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  for (const [lKey, count] of topLKeys) {
    console.log(`     ${lKey}: ${count} times`);
  }

  console.log('\n   ⚡ Performance Metrics:');
  console.log(
    `     Average Response Time: ${auditReport.performanceMetrics.averageResponseTime.toFixed(2)}ms`
  );
  console.log(`     Error Rate: ${(auditReport.performanceMetrics.errorRate * 100).toFixed(2)}%`);
  console.log(`     Throughput: ${auditReport.performanceMetrics.throughput.toFixed(2)} ops/hour`);

  console.log('\n   🔒 Compliance Metrics:');
  console.log(`     Total Transactions: ${auditReport.complianceMetrics.totalTransactions}`);
  console.log(`     High Risk: ${auditReport.complianceMetrics.highRiskTransactions}`);
  console.log(`     Blocked: ${auditReport.complianceMetrics.blockedTransactions}`);
  console.log(
    `     Average Risk Score: ${auditReport.complianceMetrics.averageRiskScore.toFixed(1)}/100`
  );

  // Get L-Key usage statistics
  const lKeyStats = logger.getLKeyUsageStats();
  const totalUsage = Object.values(lKeyStats).reduce(
    (sum: number, stat: any) => sum + stat.usage,
    0
  );

  console.log('\n   📈 L-Key Usage Statistics:');
  console.log(`     Total L-Key Operations: ${totalUsage}`);
  console.log(`     Unique L-Keys Used: ${Object.keys(lKeyStats).length}`);

  const topUsedLKeys = Object.entries(lKeyStats)
    .sort(([, a], [, b]) => (b as any).usage - (a as any).usage)
    .slice(0, 3);

  for (const [lKey, stats] of topUsedLKeys) {
    const s = stats as any;
    console.log(`     ${lKey} (${s.category}): ${s.usage} uses`);
  }

  // Get logger metrics
  const metrics = logger.getMetrics();
  console.log('\n   📊 Logger Metrics:');
  console.log(`     Total Logs Generated: ${metrics.totalLogs}`);
  console.log(`     Average Log Rate: ${metrics.logsPerSecond.toFixed(2)} logs/sec`);
  console.log(`     Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
  console.log(`     Audit Entries: ${logger.getAuditEntryCount()}`);

  console.log('\n   💾 Export Options Available:');
  console.log('     - JSON: logger.exportAuditEntries()');
  console.log('     - CSV: logger.exportAuditEntries(startDate, endDate, "csv")');
  console.log('     - Filtered: logger.generateAuditReport(startDate, endDate)');

  console.log('\n');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await runIntegratedDemo();
  } catch (error) {
    console.error('❌ Integrated demo failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main as runIntegratedDemo };

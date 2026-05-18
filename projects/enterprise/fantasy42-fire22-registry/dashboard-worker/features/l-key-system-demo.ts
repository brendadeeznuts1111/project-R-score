/**
 * 🔥 Fire22 L-Key System Comprehensive Demo
 * Complete demonstration of L-Key mapping system with real transaction flows
 */

import {
  PartyType,
  CustomerType,
  TransactionType,
  PaymentMethod,
  ORDER_CONSTANTS,
  FEE_STRUCTURE,
  L_KEY_MAPPING,
  calculateTotalFee,
  getLKeyForValue,
  getValueForLKey,
  getLKeyCategoryPrefix,
} from '../types/fire22-otc-constants';

import {
  lKeyMapper,
  entityMapper,
  transactionFlowMapper,
  auditTrailMapper,
} from '../utils/l-key-mapper';

import { EnhancedTransactionProcessor } from '../services/enhanced-transaction-processor';
import {
  OTCMatchingEngine,
  OrderType,
  OrderSide,
  TradingAsset,
  OrderStatus,
} from '../services/otc-order-matching-engine';

// !==!==!==!==!==!==!==!===
// DEMO CLASS
// !==!==!==!==!==!==!==!===

export class LKeySystemDemo {
  private transactionProcessor: EnhancedTransactionProcessor;
  private otcEngine: OTCMatchingEngine;

  constructor() {
    this.transactionProcessor = EnhancedTransactionProcessor.getInstance();
    this.otcEngine = new OTCMatchingEngine();
  }

  /**
   * Run complete L-Key system demonstration
   */
  public async runCompleteDemo(): Promise<void> {
    console.info('\n🔥🔥🔥 FIRE22 L-KEY SYSTEM DEMONSTRATION 🔥🔥🔥\n');

    // Demo 1: L-Key Mapping Basics
    await this.demonstrateLKeyMappingBasics();

    // Demo 2: Customer Entity Mapping
    await this.demonstrateCustomerMapping();

    // Demo 3: P2P Transaction Flow
    await this.demonstrateP2PTransactionFlow();

    // Demo 4: OTC Trading Flow
    await this.demonstrateOTCTradingFlow();

    // Demo 5: Complex Multi-Party Transaction
    await this.demonstrateComplexTransaction();

    // Demo 6: Fee Calculation with All Discounts
    await this.demonstrateFeeCalculation();

    // Demo 7: Audit Trail and Reporting
    await this.demonstrateAuditTrailReporting();

    // Demo 8: System Analytics
    await this.demonstrateSystemAnalytics();

    console.info('\n✅ L-KEY SYSTEM DEMONSTRATION COMPLETE!\n');
  }

  /**
   * Demo 1: L-Key Mapping Basics
   */
  private async demonstrateLKeyMappingBasics(): Promise<void> {
    console.info('📋 === DEMO 1: L-KEY MAPPING BASICS ===\n');

    // Show L-Key mappings for different categories
    const examples = [
      { value: CustomerType.VIP, category: 'Customer' },
      { value: TransactionType.P2P_TRANSFER, category: 'Transaction' },
      { value: PaymentMethod.PAYPAL, category: 'Payment Method' },
      { value: ORDER_CONSTANTS.TYPES.OTC_BLOCK, category: 'Order Type' },
      { value: ORDER_CONSTANTS.STATUS.FILLED, category: 'Status' },
    ];

    console.info('🗂️  L-Key Mappings:');
    for (const example of examples) {
      const lKey = getLKeyForValue(example.value);
      const category = getLKeyCategoryPrefix(lKey!);
      console.info(`   ${example.category}: ${example.value} → ${lKey} (${category})`);
    }

    // Show reverse mapping
    console.info('\n🔄 Reverse L-Key Lookups:');
    const lKeyExamples = ['L2003', 'L3001', 'L4002', 'L5004', 'L6004'];
    for (const lKey of lKeyExamples) {
      const value = getValueForLKey(lKey);
      const category = getLKeyCategoryPrefix(lKey);
      console.info(`   ${lKey} (${category}) → ${value}`);
    }

    console.info('\n');
  }

  /**
   * Demo 2: Customer Entity Mapping
   */
  private async demonstrateCustomerMapping(): Promise<void> {
    console.info('👥 === DEMO 2: CUSTOMER ENTITY MAPPING ===\n');

    // Create sample customers
    const customers = [
      {
        id: 'CUST_001',
        type: CustomerType.VIP,
        username: '@bigtrader_vip',
        telegramId: '1234567890',
        serviceTier: 3,
      },
      {
        id: 'CUST_002',
        type: CustomerType.PROFESSIONAL,
        username: '@pro_trader_emma',
        telegramId: '0987654321',
        serviceTier: 2,
      },
      {
        id: 'CUST_003',
        type: CustomerType.NEW,
        username: '@newbie_trader',
        telegramId: '1122334455',
        serviceTier: 1,
      },
    ];

    console.info('👤 Creating Customer Entities:');
    for (const customer of customers) {
      const entity = entityMapper.mapCustomer({
        id: customer.id,
        type: customer.type,
        username: customer.username,
        telegramId: customer.telegramId,
        serviceTier: customer.serviceTier,
        metadata: {
          joinDate: new Date(),
          totalVolume: Math.random() * 500000,
        },
      });

      console.info(`   ${customer.username}: ${entity.id} → ${entity.lKey} (${entity.type})`);
      console.info(`     Service Tier: ${customer.serviceTier}, Category: ${entity.category}`);
    }

    console.info('\n');
  }

  /**
   * Demo 3: P2P Transaction Flow
   */
  private async demonstrateP2PTransactionFlow(): Promise<void> {
    console.info('💸 === DEMO 3: P2P TRANSACTION FLOW ===\n');

    // Create P2P transaction request
    const p2pRequest = {
      id: 'TXN_P2P_001',
      type: TransactionType.P2P_TRANSFER,
      fromCustomerId: 'CUST_001',
      fromCustomerType: CustomerType.VIP,
      fromTelegramId: '1234567890',
      fromUsername: '@bigtrader_vip',
      toCustomerId: 'CUST_002',
      toCustomerType: CustomerType.PROFESSIONAL,
      toTelegramId: '0987654321',
      toUsername: '@pro_trader_emma',
      amount: 75000,
      currency: 'USD',
      paymentMethod: PaymentMethod.PAYPAL,
      serviceTier: 3,
      monthlyVolume: 250000,
      description: 'High-value P2P transfer with tier 3 benefits',
    };

    console.info('🔄 Processing P2P Transaction:');
    console.info(`   From: ${p2pRequest.fromUsername} (${p2pRequest.fromCustomerType})`);
    console.info(`   To: ${p2pRequest.toUsername} (${p2pRequest.toCustomerType})`);
    console.info(`   Amount: $${p2pRequest.amount.toLocaleString()}`);
    console.info(`   Payment Method: ${p2pRequest.paymentMethod}`);

    const processedTx = await this.transactionProcessor.processTransaction(p2pRequest);

    console.info('\n📊 Transaction Results:');
    console.info(`   Status: ${processedTx.status} (${processedTx.statusLKey})`);
    console.info(
      `   Total Fee: $${processedTx.fees.totalFee.toFixed(2)} (${(processedTx.fees.effectiveRate * 100).toFixed(3)}%)`
    );
    console.info(`   Tier Discount: -$${processedTx.fees.tierDiscount.toFixed(2)}`);
    console.info(`   Volume Discount: -$${processedTx.fees.volumeDiscount.toFixed(2)}`);
    console.info(`   Risk Score: ${processedTx.riskScore}/100`);
    console.info(`   Settlement Hash: ${processedTx.settlementHash}`);

    console.info('\n🔗 L-Key Flow Sequence:');
    console.info(`   ${processedTx.flowSequence.join(' → ')}`);

    console.info('\n');
  }

  /**
   * Demo 4: OTC Trading Flow
   */
  private async demonstrateOTCTradingFlow(): Promise<void> {
    console.info('💎 === DEMO 4: OTC TRADING FLOW ===\n');

    // Create OTC order request
    const otcRequest = {
      customerId: 'CUST_001',
      telegramId: '1234567890',
      telegramUsername: '@bigtrader_vip',
      customerType: CustomerType.VIP,
      type: OrderType.OTC_BLOCK,
      side: OrderSide.BUY,
      asset: TradingAsset.BTC,
      amount: 500000,
      targetPrice: 64875,
      allowPartialFill: false,
      timeInForce: 'GTC' as const,
      serviceTier: 3,
      paymentMethod: PaymentMethod.BANK_WIRE,
      monthlyVolume: 2500000,
      isIceberg: false,
    };

    console.info('📈 Placing OTC Block Order:');
    console.info(`   Trader: ${otcRequest.telegramUsername} (${otcRequest.customerType})`);
    console.info(
      `   Order: ${otcRequest.side} ${otcRequest.amount.toLocaleString()} USD of ${otcRequest.asset}`
    );
    console.info(`   Type: ${otcRequest.type}`);
    console.info(`   Target Price: $${otcRequest.targetPrice?.toLocaleString()}`);

    try {
      const placedOrder = await this.otcEngine.placeOrder(otcRequest);

      console.info('\n✅ Order Placed Successfully:');
      console.info(`   Order ID: ${placedOrder.id}`);
      console.info(`   Order L-Key: ${placedOrder.orderLKey}`);
      console.info(`   Customer L-Key: ${placedOrder.customerLKey}`);
      console.info(`   Status: ${placedOrder.status} (${placedOrder.statusLKey})`);
      console.info(`   Priority: ${placedOrder.priority}`);
      console.info(`   Commission Rate: ${(placedOrder.commissionRate * 100).toFixed(3)}%`);

      console.info('\n🔍 Audit Trail:');
      console.info(`   L-Keys: ${placedOrder.auditTrail.join(', ')}`);
    } catch (error: any) {
      console.info(`\n❌ Order Failed: ${error.message}`);
    }

    console.info('\n');
  }

  /**
   * Demo 5: Complex Multi-Party Transaction
   */
  private async demonstrateComplexTransaction(): Promise<void> {
    console.info('🔗 === DEMO 5: COMPLEX MULTI-PARTY TRANSACTION ===\n');

    // Simulate affiliate commission transaction
    const affiliateRequest = {
      id: 'TXN_AFFILIATE_001',
      type: TransactionType.COMMISSION_PAYMENT,
      fromCustomerId: 'PLATFORM_001',
      fromCustomerType: CustomerType.INSTITUTIONAL,
      fromTelegramId: 'FIRE22_BOT',
      fromUsername: '@Fire22Platform',
      toCustomerId: 'AFFILIATE_001',
      toCustomerType: CustomerType.AFFILIATE,
      toTelegramId: '5555666677',
      toUsername: '@diamond_affiliate',
      amount: 5000,
      currency: 'USD',
      paymentMethod: PaymentMethod.BANK_WIRE,
      serviceTier: 1,
      monthlyVolume: 0,
      referralCode: 'DIAMOND_REF_2024',
      description: 'Monthly affiliate commission payout - Diamond tier',
      metadata: {
        affiliateTier: 'DIAMOND',
        referralCount: 25,
        referralVolume: 1250000,
        commissionRate: 0.4,
      },
    };

    console.info('💰 Processing Affiliate Commission:');
    console.info(`   From: Platform → ${affiliateRequest.toUsername}`);
    console.info(`   Commission: $${affiliateRequest.amount.toLocaleString()}`);
    console.info(`   Affiliate Tier: ${affiliateRequest.metadata?.affiliateTier}`);
    console.info(
      `   Referral Volume: $${affiliateRequest.metadata?.referralVolume.toLocaleString()}`
    );

    const affiliateTx = await this.transactionProcessor.processTransaction(affiliateRequest);

    console.info('\n📋 Commission Transaction Results:');
    console.info(`   Status: ${affiliateTx.status}`);
    console.info(`   Platform Fee: $${affiliateTx.fees.totalFee.toFixed(2)} (Platform absorbs)`);
    console.info(`   Net Payment: $${(affiliateTx.amount - affiliateTx.fees.totalFee).toFixed(2)}`);

    // Show how this connects to the original customer transaction
    const originalTx = this.transactionProcessor.getTransaction('TXN_P2P_001');
    if (originalTx) {
      const commissionAmount = originalTx.fees.totalFee * 0.3; // 30% affiliate rate
      console.info('\n🔗 Connection to Original Transaction:');
      console.info(`   Original P2P Fee: $${originalTx.fees.totalFee.toFixed(2)}`);
      console.info(`   Affiliate Commission (30%): $${commissionAmount.toFixed(2)}`);
      console.info(
        `   Platform Revenue: $${(originalTx.fees.totalFee - commissionAmount).toFixed(2)}`
      );
    }

    console.info('\n');
  }

  /**
   * Demo 6: Fee Calculation with All Discounts
   */
  private async demonstrateFeeCalculation(): Promise<void> {
    console.info('💳 === DEMO 6: COMPREHENSIVE FEE CALCULATION ===\n');

    const testCases = [
      {
        name: 'New Customer - Small Transaction',
        amount: 1000,
        customerType: CustomerType.NEW,
        paymentMethod: PaymentMethod.PAYPAL,
        serviceTier: 1,
        monthlyVolume: 500,
      },
      {
        name: 'VIP Customer - Large Transaction',
        amount: 100000,
        customerType: CustomerType.VIP,
        paymentMethod: PaymentMethod.BANK_WIRE,
        serviceTier: 3,
        monthlyVolume: 750000,
      },
      {
        name: 'Professional - Crypto Payment',
        amount: 25000,
        customerType: CustomerType.PROFESSIONAL,
        paymentMethod: PaymentMethod.BITCOIN,
        serviceTier: 2,
        monthlyVolume: 150000,
      },
      {
        name: 'High-Risk Customer',
        amount: 50000,
        customerType: CustomerType.HIGH_RISK,
        paymentMethod: PaymentMethod.CASH_DEPOSIT,
        serviceTier: 1,
        monthlyVolume: 25000,
      },
    ];

    console.info('📊 Fee Calculation Examples:\n');

    for (const testCase of testCases) {
      console.info(`   ${testCase.name}:`);
      console.info(`     Amount: $${testCase.amount.toLocaleString()}`);
      console.info(`     Customer: ${testCase.customerType} (Tier ${testCase.serviceTier})`);
      console.info(`     Payment: ${testCase.paymentMethod}`);
      console.info(`     Monthly Volume: $${testCase.monthlyVolume.toLocaleString()}`);

      const fees = calculateTotalFee(testCase);

      console.info(`     Results:`);
      console.info(`       Base Fee: $${fees.baseFee.toFixed(2)}`);
      console.info(`       Tier Discount: -$${fees.tierDiscount.toFixed(2)}`);
      console.info(`       Volume Discount: -$${fees.volumeDiscount.toFixed(2)}`);
      console.info(`       Payment Surcharge: $${fees.paymentSurcharge.toFixed(2)}`);
      console.info(
        `       Total Fee: $${fees.totalFee.toFixed(2)} (${(fees.effectiveRate * 100).toFixed(3)}%)`
      );
      console.info(`       Savings vs Base: $${(fees.baseFee - fees.totalFee).toFixed(2)}\n`);
    }
  }

  /**
   * Demo 7: Audit Trail and Reporting
   */
  private async demonstrateAuditTrailReporting(): Promise<void> {
    console.info('📋 === DEMO 7: AUDIT TRAIL & REPORTING ===\n');

    // Generate audit report
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const endDate = new Date();

    const auditReport = auditTrailMapper.generateAuditReport(startDate, endDate);

    console.info('📈 System Audit Report (Last 24 Hours):');
    console.info(`   Total Audit Entries: ${auditReport.totalEntries}`);

    console.info('\n   📊 Actions Breakdown:');
    for (const [action, count] of Object.entries(auditReport.byAction)) {
      console.info(`     ${action}: ${count}`);
    }

    console.info('\n   🔑 L-Key Usage:');
    const sortedLKeys = Object.entries(auditReport.byLKey)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    for (const [lKey, count] of sortedLKeys) {
      const value = getValueForLKey(lKey);
      const category = getLKeyCategoryPrefix(lKey);
      console.info(`     ${lKey} (${category}): ${value} - ${count} uses`);
    }

    console.info('\n   🕒 Recent Activity:');
    const recentEntries = auditReport.timeline.slice(-5);
    for (const entry of recentEntries) {
      console.info(`     ${entry.timestamp.toISOString()}: ${entry.action} (${entry.lKey})`);
    }

    console.info('\n');
  }

  /**
   * Demo 8: System Analytics
   */
  private async demonstrateSystemAnalytics(): Promise<void> {
    console.info('📊 === DEMO 8: SYSTEM ANALYTICS ===\n');

    // Generate transaction processor report
    const txReport = this.transactionProcessor.generateReport();

    console.info('💼 Transaction Processing Analytics:');
    console.info(`   Total Transactions: ${txReport.totalTransactions}`);
    console.info(`   Total Volume: $${txReport.totalVolume.toLocaleString()}`);
    console.info(`   Total Fees Collected: $${txReport.totalFees.toLocaleString()}`);
    console.info(`   Average Risk Score: ${txReport.averageRiskScore.toFixed(1)}/100`);
    console.info(
      `   Average Transaction Size: $${(txReport.totalVolume / txReport.totalTransactions).toLocaleString()}`
    );

    console.info('\n   📈 Status Distribution:');
    for (const [status, count] of Object.entries(txReport.byStatus)) {
      const percentage = ((count / txReport.totalTransactions) * 100).toFixed(1);
      console.info(`     ${status}: ${count} (${percentage}%)`);
    }

    console.info('\n   🔄 Transaction Types:');
    for (const [type, count] of Object.entries(txReport.byType)) {
      const percentage = ((count / txReport.totalTransactions) * 100).toFixed(1);
      console.info(`     ${type}: ${count} (${percentage}%)`);
    }

    console.info('\n   🔑 Most Used L-Keys:');
    const sortedLKeys = Object.entries(txReport.byLKey)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    for (const [lKey, count] of sortedLKeys) {
      const value = getValueForLKey(lKey);
      const category = getLKeyCategoryPrefix(lKey);
      console.info(`     ${lKey} (${category}): ${value} - ${count} uses`);
    }

    // Entity mapper summary
    const entityExport = entityMapper.exportMappings();

    console.info(`\n   👥 Entity Mapping Summary:`);
    console.info(`     Total Entities: ${entityExport.entities.length}`);

    const categoryCount: Record<string, number> = {};
    for (const entity of entityExport.entities) {
      categoryCount[entity.category] = (categoryCount[entity.category] || 0) + 1;
    }

    for (const [category, count] of Object.entries(categoryCount)) {
      console.info(`     ${category}s: ${count}`);
    }

    console.info('\n');
  }
}

// !==!==!==!==!==!==!==!===
// QUICK DEMO RUNNER
// !==!==!==!==!==!==!==!===

export async function runLKeySystemDemo(): Promise<void> {
  const demo = new LKeySystemDemo();
  await demo.runCompleteDemo();
}

// Export for use in other modules
export default LKeySystemDemo;

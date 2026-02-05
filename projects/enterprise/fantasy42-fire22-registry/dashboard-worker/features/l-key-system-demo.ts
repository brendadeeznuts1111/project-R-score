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
    console.log('\n🔥🔥🔥 FIRE22 L-KEY SYSTEM DEMONSTRATION 🔥🔥🔥\n');

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

    console.log('\n✅ L-KEY SYSTEM DEMONSTRATION COMPLETE!\n');
  }

  /**
   * Demo 1: L-Key Mapping Basics
   */
  private async demonstrateLKeyMappingBasics(): Promise<void> {
    console.log('📋 === DEMO 1: L-KEY MAPPING BASICS ===\n');

    // Show L-Key mappings for different categories
    const examples = [
      { value: CustomerType.VIP, category: 'Customer' },
      { value: TransactionType.P2P_TRANSFER, category: 'Transaction' },
      { value: PaymentMethod.PAYPAL, category: 'Payment Method' },
      { value: ORDER_CONSTANTS.TYPES.OTC_BLOCK, category: 'Order Type' },
      { value: ORDER_CONSTANTS.STATUS.FILLED, category: 'Status' },
    ];

    console.log('🗂️  L-Key Mappings:');
    for (const example of examples) {
      const lKey = getLKeyForValue(example.value);
      const category = getLKeyCategoryPrefix(lKey!);
      console.log(`   ${example.category}: ${example.value} → ${lKey} (${category})`);
    }

    // Show reverse mapping
    console.log('\n🔄 Reverse L-Key Lookups:');
    const lKeyExamples = ['L2003', 'L3001', 'L4002', 'L5004', 'L6004'];
    for (const lKey of lKeyExamples) {
      const value = getValueForLKey(lKey);
      const category = getLKeyCategoryPrefix(lKey);
      console.log(`   ${lKey} (${category}) → ${value}`);
    }

    console.log('\n');
  }

  /**
   * Demo 2: Customer Entity Mapping
   */
  private async demonstrateCustomerMapping(): Promise<void> {
    console.log('👥 === DEMO 2: CUSTOMER ENTITY MAPPING ===\n');

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

    console.log('👤 Creating Customer Entities:');
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

      console.log(`   ${customer.username}: ${entity.id} → ${entity.lKey} (${entity.type})`);
      console.log(`     Service Tier: ${customer.serviceTier}, Category: ${entity.category}`);
    }

    console.log('\n');
  }

  /**
   * Demo 3: P2P Transaction Flow
   */
  private async demonstrateP2PTransactionFlow(): Promise<void> {
    console.log('💸 === DEMO 3: P2P TRANSACTION FLOW ===\n');

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

    console.log('🔄 Processing P2P Transaction:');
    console.log(`   From: ${p2pRequest.fromUsername} (${p2pRequest.fromCustomerType})`);
    console.log(`   To: ${p2pRequest.toUsername} (${p2pRequest.toCustomerType})`);
    console.log(`   Amount: $${p2pRequest.amount.toLocaleString()}`);
    console.log(`   Payment Method: ${p2pRequest.paymentMethod}`);

    const processedTx = await this.transactionProcessor.processTransaction(p2pRequest);

    console.log('\n📊 Transaction Results:');
    console.log(`   Status: ${processedTx.status} (${processedTx.statusLKey})`);
    console.log(
      `   Total Fee: $${processedTx.fees.totalFee.toFixed(2)} (${(processedTx.fees.effectiveRate * 100).toFixed(3)}%)`
    );
    console.log(`   Tier Discount: -$${processedTx.fees.tierDiscount.toFixed(2)}`);
    console.log(`   Volume Discount: -$${processedTx.fees.volumeDiscount.toFixed(2)}`);
    console.log(`   Risk Score: ${processedTx.riskScore}/100`);
    console.log(`   Settlement Hash: ${processedTx.settlementHash}`);

    console.log('\n🔗 L-Key Flow Sequence:');
    console.log(`   ${processedTx.flowSequence.join(' → ')}`);

    console.log('\n');
  }

  /**
   * Demo 4: OTC Trading Flow
   */
  private async demonstrateOTCTradingFlow(): Promise<void> {
    console.log('💎 === DEMO 4: OTC TRADING FLOW ===\n');

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

    console.log('📈 Placing OTC Block Order:');
    console.log(`   Trader: ${otcRequest.telegramUsername} (${otcRequest.customerType})`);
    console.log(
      `   Order: ${otcRequest.side} ${otcRequest.amount.toLocaleString()} USD of ${otcRequest.asset}`
    );
    console.log(`   Type: ${otcRequest.type}`);
    console.log(`   Target Price: $${otcRequest.targetPrice?.toLocaleString()}`);

    try {
      const placedOrder = await this.otcEngine.placeOrder(otcRequest);

      console.log('\n✅ Order Placed Successfully:');
      console.log(`   Order ID: ${placedOrder.id}`);
      console.log(`   Order L-Key: ${placedOrder.orderLKey}`);
      console.log(`   Customer L-Key: ${placedOrder.customerLKey}`);
      console.log(`   Status: ${placedOrder.status} (${placedOrder.statusLKey})`);
      console.log(`   Priority: ${placedOrder.priority}`);
      console.log(`   Commission Rate: ${(placedOrder.commissionRate * 100).toFixed(3)}%`);

      console.log('\n🔍 Audit Trail:');
      console.log(`   L-Keys: ${placedOrder.auditTrail.join(', ')}`);
    } catch (error: any) {
      console.log(`\n❌ Order Failed: ${error.message}`);
    }

    console.log('\n');
  }

  /**
   * Demo 5: Complex Multi-Party Transaction
   */
  private async demonstrateComplexTransaction(): Promise<void> {
    console.log('🔗 === DEMO 5: COMPLEX MULTI-PARTY TRANSACTION ===\n');

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

    console.log('💰 Processing Affiliate Commission:');
    console.log(`   From: Platform → ${affiliateRequest.toUsername}`);
    console.log(`   Commission: $${affiliateRequest.amount.toLocaleString()}`);
    console.log(`   Affiliate Tier: ${affiliateRequest.metadata?.affiliateTier}`);
    console.log(
      `   Referral Volume: $${affiliateRequest.metadata?.referralVolume.toLocaleString()}`
    );

    const affiliateTx = await this.transactionProcessor.processTransaction(affiliateRequest);

    console.log('\n📋 Commission Transaction Results:');
    console.log(`   Status: ${affiliateTx.status}`);
    console.log(`   Platform Fee: $${affiliateTx.fees.totalFee.toFixed(2)} (Platform absorbs)`);
    console.log(`   Net Payment: $${(affiliateTx.amount - affiliateTx.fees.totalFee).toFixed(2)}`);

    // Show how this connects to the original customer transaction
    const originalTx = this.transactionProcessor.getTransaction('TXN_P2P_001');
    if (originalTx) {
      const commissionAmount = originalTx.fees.totalFee * 0.3; // 30% affiliate rate
      console.log('\n🔗 Connection to Original Transaction:');
      console.log(`   Original P2P Fee: $${originalTx.fees.totalFee.toFixed(2)}`);
      console.log(`   Affiliate Commission (30%): $${commissionAmount.toFixed(2)}`);
      console.log(
        `   Platform Revenue: $${(originalTx.fees.totalFee - commissionAmount).toFixed(2)}`
      );
    }

    console.log('\n');
  }

  /**
   * Demo 6: Fee Calculation with All Discounts
   */
  private async demonstrateFeeCalculation(): Promise<void> {
    console.log('💳 === DEMO 6: COMPREHENSIVE FEE CALCULATION ===\n');

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

    console.log('📊 Fee Calculation Examples:\n');

    for (const testCase of testCases) {
      console.log(`   ${testCase.name}:`);
      console.log(`     Amount: $${testCase.amount.toLocaleString()}`);
      console.log(`     Customer: ${testCase.customerType} (Tier ${testCase.serviceTier})`);
      console.log(`     Payment: ${testCase.paymentMethod}`);
      console.log(`     Monthly Volume: $${testCase.monthlyVolume.toLocaleString()}`);

      const fees = calculateTotalFee(testCase);

      console.log(`     Results:`);
      console.log(`       Base Fee: $${fees.baseFee.toFixed(2)}`);
      console.log(`       Tier Discount: -$${fees.tierDiscount.toFixed(2)}`);
      console.log(`       Volume Discount: -$${fees.volumeDiscount.toFixed(2)}`);
      console.log(`       Payment Surcharge: $${fees.paymentSurcharge.toFixed(2)}`);
      console.log(
        `       Total Fee: $${fees.totalFee.toFixed(2)} (${(fees.effectiveRate * 100).toFixed(3)}%)`
      );
      console.log(`       Savings vs Base: $${(fees.baseFee - fees.totalFee).toFixed(2)}\n`);
    }
  }

  /**
   * Demo 7: Audit Trail and Reporting
   */
  private async demonstrateAuditTrailReporting(): Promise<void> {
    console.log('📋 === DEMO 7: AUDIT TRAIL & REPORTING ===\n');

    // Generate audit report
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const endDate = new Date();

    const auditReport = auditTrailMapper.generateAuditReport(startDate, endDate);

    console.log('📈 System Audit Report (Last 24 Hours):');
    console.log(`   Total Audit Entries: ${auditReport.totalEntries}`);

    console.log('\n   📊 Actions Breakdown:');
    for (const [action, count] of Object.entries(auditReport.byAction)) {
      console.log(`     ${action}: ${count}`);
    }

    console.log('\n   🔑 L-Key Usage:');
    const sortedLKeys = Object.entries(auditReport.byLKey)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    for (const [lKey, count] of sortedLKeys) {
      const value = getValueForLKey(lKey);
      const category = getLKeyCategoryPrefix(lKey);
      console.log(`     ${lKey} (${category}): ${value} - ${count} uses`);
    }

    console.log('\n   🕒 Recent Activity:');
    const recentEntries = auditReport.timeline.slice(-5);
    for (const entry of recentEntries) {
      console.log(`     ${entry.timestamp.toISOString()}: ${entry.action} (${entry.lKey})`);
    }

    console.log('\n');
  }

  /**
   * Demo 8: System Analytics
   */
  private async demonstrateSystemAnalytics(): Promise<void> {
    console.log('📊 === DEMO 8: SYSTEM ANALYTICS ===\n');

    // Generate transaction processor report
    const txReport = this.transactionProcessor.generateReport();

    console.log('💼 Transaction Processing Analytics:');
    console.log(`   Total Transactions: ${txReport.totalTransactions}`);
    console.log(`   Total Volume: $${txReport.totalVolume.toLocaleString()}`);
    console.log(`   Total Fees Collected: $${txReport.totalFees.toLocaleString()}`);
    console.log(`   Average Risk Score: ${txReport.averageRiskScore.toFixed(1)}/100`);
    console.log(
      `   Average Transaction Size: $${(txReport.totalVolume / txReport.totalTransactions).toLocaleString()}`
    );

    console.log('\n   📈 Status Distribution:');
    for (const [status, count] of Object.entries(txReport.byStatus)) {
      const percentage = ((count / txReport.totalTransactions) * 100).toFixed(1);
      console.log(`     ${status}: ${count} (${percentage}%)`);
    }

    console.log('\n   🔄 Transaction Types:');
    for (const [type, count] of Object.entries(txReport.byType)) {
      const percentage = ((count / txReport.totalTransactions) * 100).toFixed(1);
      console.log(`     ${type}: ${count} (${percentage}%)`);
    }

    console.log('\n   🔑 Most Used L-Keys:');
    const sortedLKeys = Object.entries(txReport.byLKey)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    for (const [lKey, count] of sortedLKeys) {
      const value = getValueForLKey(lKey);
      const category = getLKeyCategoryPrefix(lKey);
      console.log(`     ${lKey} (${category}): ${value} - ${count} uses`);
    }

    // Entity mapper summary
    const entityExport = entityMapper.exportMappings();

    console.log(`\n   👥 Entity Mapping Summary:`);
    console.log(`     Total Entities: ${entityExport.entities.length}`);

    const categoryCount: Record<string, number> = {};
    for (const entity of entityExport.entities) {
      categoryCount[entity.category] = (categoryCount[entity.category] || 0) + 1;
    }

    for (const [category, count] of Object.entries(categoryCount)) {
      console.log(`     ${category}s: ${count}`);
    }

    console.log('\n');
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

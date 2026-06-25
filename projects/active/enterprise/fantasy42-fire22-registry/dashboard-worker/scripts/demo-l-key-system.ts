#!/usr/bin/env bun
/**
 * 🔥 Fire22 L-Key System Demo Runner
 * Executable script to demonstrate the complete L-Key mapping system
 */

import { runLKeySystemDemo } from '../src/demo/l-key-system-demo';
import {
  getLKeyForValue,
  getValueForLKey,
  calculateTotalFee,
  CustomerType,
  PaymentMethod,
  TransactionType,
} from '../src/types/fire22-otc-constants';

/**
 * Quick L-Key examples for immediate understanding
 */
function showQuickExamples() {
  console.info('🚀 FIRE22 L-KEY SYSTEM QUICK START\n');

  console.info('📋 Basic L-Key Mappings:');
  console.info(`   VIP Customer:     ${CustomerType.VIP} → ${getLKeyForValue(CustomerType.VIP)}`);
  console.info(
    `   P2P Transfer:     ${TransactionType.P2P_TRANSFER} → ${getLKeyForValue(TransactionType.P2P_TRANSFER)}`
  );
  console.info(
    `   PayPal Payment:   ${PaymentMethod.PAYPAL} → ${getLKeyForValue(PaymentMethod.PAYPAL)}`
  );
  console.info(
    `   Bank Wire:        ${PaymentMethod.BANK_WIRE} → ${getLKeyForValue(PaymentMethod.BANK_WIRE)}`
  );

  console.info('\n🔄 Reverse Lookups:');
  console.info(`   L2003 → ${getValueForLKey('L2003')} (VIP Customer)`);
  console.info(`   L3001 → ${getValueForLKey('L3001')} (P2P Transfer)`);
  console.info(`   L4002 → ${getValueForLKey('L4002')} (PayPal)`);
  console.info(`   L4001 → ${getValueForLKey('L4001')} (Bank Wire)`);

  console.info('\n💰 Fee Calculation Example:');
  const fees = calculateTotalFee({
    amount: 10000,
    customerType: CustomerType.VIP,
    paymentMethod: PaymentMethod.PAYPAL,
    serviceTier: 3,
    monthlyVolume: 100000,
  });

  console.info(`   $10,000 VIP transaction via PayPal (Tier 3, $100K monthly volume):`);
  console.info(`     Base Fee:         $${fees.baseFee.toFixed(2)}`);
  console.info(`     Tier Discount:    -$${fees.tierDiscount.toFixed(2)}`);
  console.info(`     Volume Discount:  -$${fees.volumeDiscount.toFixed(2)}`);
  console.info(`     PayPal Surcharge: +$${fees.paymentSurcharge.toFixed(2)}`);
  console.info(
    `     Total Fee:        $${fees.totalFee.toFixed(2)} (${(fees.effectiveRate * 100).toFixed(3)}%)`
  );
  console.info(
    `     You Save:         $${(fees.baseFee - fees.totalFee).toFixed(2)} with VIP benefits!`
  );

  console.info('\n' + '='.repeat(80) + '\n');
}

/**
 * Main demo runner
 */
async function main() {
  try {
    // Show quick examples first
    showQuickExamples();

    console.info('🎯 Starting Complete L-Key System Demonstration...\n');
    console.info('This demo will show:');
    console.info('  ✓ L-Key mapping and reverse lookups');
    console.info('  ✓ Customer entity creation with L-Keys');
    console.info('  ✓ Real P2P transaction processing');
    console.info('  ✓ OTC trading order placement');
    console.info('  ✓ Complex affiliate commission flows');
    console.info('  ✓ Comprehensive fee calculations');
    console.info('  ✓ Complete audit trail reporting');
    console.info('  ✓ System analytics and insights\n');

    // Ask user if they want to continue with full demo
    console.info('Press Enter to continue with full demonstration, or Ctrl+C to exit...');

    // Simple pause for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    // Run the complete demonstration
    await runLKeySystemDemo();

    console.info('🎉 Demo completed successfully!');
    console.info('\n📚 Key Features Demonstrated:');
    console.info('  • Bidirectional L-Key mapping system');
    console.info('  • Dynamic fee calculation with all discounts');
    console.info('  • Complete transaction audit trails');
    console.info('  • Multi-party transaction flows');
    console.info('  • OTC trading integration');
    console.info('  • Real-time entity mapping');
    console.info('  • Comprehensive system analytics');

    console.info('\n🔧 Implementation Details:');
    console.info('  • 9 L-Key categories (L1xxx - L9xxx)');
    console.info('  • 60+ mapped constants and types');
    console.info('  • Dynamic L-Key generation for new entities');
    console.info('  • Complete audit trail with L-Key tracking');
    console.info('  • Production-ready transaction processing');

    console.info('\n🚀 Ready for Production Use:');
    console.info('  • Import from: src/types/fire22-otc-constants');
    console.info('  • Use: calculateTotalFee() for dynamic pricing');
    console.info('  • Access: EnhancedTransactionProcessor for processing');
    console.info('  • Integrate: OTCMatchingEngine for trading');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main as runDemo };

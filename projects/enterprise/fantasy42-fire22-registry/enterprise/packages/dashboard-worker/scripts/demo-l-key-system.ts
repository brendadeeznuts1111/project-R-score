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
  console.log('🚀 FIRE22 L-KEY SYSTEM QUICK START\n');

  console.log('📋 Basic L-Key Mappings:');
  console.log(`   VIP Customer:     ${CustomerType.VIP} → ${getLKeyForValue(CustomerType.VIP)}`);
  console.log(
    `   P2P Transfer:     ${TransactionType.P2P_TRANSFER} → ${getLKeyForValue(TransactionType.P2P_TRANSFER)}`
  );
  console.log(
    `   PayPal Payment:   ${PaymentMethod.PAYPAL} → ${getLKeyForValue(PaymentMethod.PAYPAL)}`
  );
  console.log(
    `   Bank Wire:        ${PaymentMethod.BANK_WIRE} → ${getLKeyForValue(PaymentMethod.BANK_WIRE)}`
  );

  console.log('\n🔄 Reverse Lookups:');
  console.log(`   L2003 → ${getValueForLKey('L2003')} (VIP Customer)`);
  console.log(`   L3001 → ${getValueForLKey('L3001')} (P2P Transfer)`);
  console.log(`   L4002 → ${getValueForLKey('L4002')} (PayPal)`);
  console.log(`   L4001 → ${getValueForLKey('L4001')} (Bank Wire)`);

  console.log('\n💰 Fee Calculation Example:');
  const fees = calculateTotalFee({
    amount: 10000,
    customerType: CustomerType.VIP,
    paymentMethod: PaymentMethod.PAYPAL,
    serviceTier: 3,
    monthlyVolume: 100000,
  });

  console.log(`   $10,000 VIP transaction via PayPal (Tier 3, $100K monthly volume):`);
  console.log(`     Base Fee:         $${fees.baseFee.toFixed(2)}`);
  console.log(`     Tier Discount:    -$${fees.tierDiscount.toFixed(2)}`);
  console.log(`     Volume Discount:  -$${fees.volumeDiscount.toFixed(2)}`);
  console.log(`     PayPal Surcharge: +$${fees.paymentSurcharge.toFixed(2)}`);
  console.log(
    `     Total Fee:        $${fees.totalFee.toFixed(2)} (${(fees.effectiveRate * 100).toFixed(3)}%)`
  );
  console.log(
    `     You Save:         $${(fees.baseFee - fees.totalFee).toFixed(2)} with VIP benefits!`
  );

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main demo runner
 */
async function main() {
  try {
    // Show quick examples first
    showQuickExamples();

    console.log('🎯 Starting Complete L-Key System Demonstration...\n');
    console.log('This demo will show:');
    console.log('  ✓ L-Key mapping and reverse lookups');
    console.log('  ✓ Customer entity creation with L-Keys');
    console.log('  ✓ Real P2P transaction processing');
    console.log('  ✓ OTC trading order placement');
    console.log('  ✓ Complex affiliate commission flows');
    console.log('  ✓ Comprehensive fee calculations');
    console.log('  ✓ Complete audit trail reporting');
    console.log('  ✓ System analytics and insights\n');

    // Ask user if they want to continue with full demo
    console.log('Press Enter to continue with full demonstration, or Ctrl+C to exit...');

    // Simple pause for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    // Run the complete demonstration
    await runLKeySystemDemo();

    console.log('🎉 Demo completed successfully!');
    console.log('\n📚 Key Features Demonstrated:');
    console.log('  • Bidirectional L-Key mapping system');
    console.log('  • Dynamic fee calculation with all discounts');
    console.log('  • Complete transaction audit trails');
    console.log('  • Multi-party transaction flows');
    console.log('  • OTC trading integration');
    console.log('  • Real-time entity mapping');
    console.log('  • Comprehensive system analytics');

    console.log('\n🔧 Implementation Details:');
    console.log('  • 9 L-Key categories (L1xxx - L9xxx)');
    console.log('  • 60+ mapped constants and types');
    console.log('  • Dynamic L-Key generation for new entities');
    console.log('  • Complete audit trail with L-Key tracking');
    console.log('  • Production-ready transaction processing');

    console.log('\n🚀 Ready for Production Use:');
    console.log('  • Import from: src/types/fire22-otc-constants');
    console.log('  • Use: calculateTotalFee() for dynamic pricing');
    console.log('  • Access: EnhancedTransactionProcessor for processing');
    console.log('  • Integrate: OTCMatchingEngine for trading');
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

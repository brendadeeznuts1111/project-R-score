/**
 * 🚀 Payment Builder Demo - FactoryWager Payment Methods Matrix
 * Comprehensive demonstration of the payment builder system
 */

import { 
  PaymentBuilderFactory, 
  CashAppBuilder, 
  VenmoBuilder, 
  BitcoinBuilder, 
  EthereumBuilder,
  PaymentRequest,
  PaymentResult
} from './payment-builder-factory';
import { SmartPaymentSelector, PaymentRequirements } from './smart-payment-selector';

/**
 * 🚀 Payment Builder Demo Class
 */
export class PaymentBuilderDemo {
  
  /**
   * 💚 Demo Cash App Payment
   */
  static async demoCashAppPayment(): Promise<void> {
    console.log('\n💚 Cash App Payment Demo');
    console.log('========================');
    
    try {
      const cashappBuilder = PaymentBuilderFactory.createBuilder('cashapp') as CashAppBuilder;
      
      const payment = cashappBuilder
        .setRecipient('$DadFamily')
        .setAmount(25.50)
        .setNote('Dinner +kids')
        .setParticipants(['mom', 'dad', 'kids'])
        .setSender('Mom')
        .addMetadata('familyId', 'smith_family')
        .addMetadata('category', 'food')
        .build();
      
      console.log('✅ Cash App Payment Created:');
      console.log(`   ID: ${payment.id}`);
      console.log(`   Recipient: ${payment.recipient}`);
      console.log(`   Amount: $${payment.amount}`);
      console.log(`   Note: ${payment.note}`);
      console.log(`   QR Code: ${payment.metadata.qrCode}`);
      console.log(`   Deep Link: ${payment.metadata.deepLink}`);
      console.log(`   Participants: ${payment.participants.join(', ')}`);
      
    } catch (error) {
      console.error('❌ Cash App Payment Error:', error);
    }
  }

  /**
   * 💙 Demo Venmo Payment (Manual and OAuth)
   */
  static async demoVenmoPayment(): Promise<void> {
    console.log('\n💙 Venmo Payment Demo');
    console.log('=======================');
    
    try {
      // Manual Venmo Payment
      console.log('\n📱 Manual Venmo Payment:');
      const venmoManualBuilder = PaymentBuilderFactory.createBuilder('venmo') as VenmoBuilder;
      
      const manualPayment = venmoManualBuilder
        .setRecipient('@DadFamily')
        .setAmount(25.50)
        .setNote('Dinner')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .build();
      
      console.log('✅ Manual Venmo Payment Created:');
      console.log(`   ID: ${manualPayment.id}`);
      console.log(`   Status: Requires manual confirmation`);
      console.log(`   QR Code: ${manualPayment.metadata.qrCode}`);
      
      // Execute manual payment
      const manualResult = await venmoManualBuilder.executePayment();
      console.log('📋 Manual Payment Result:');
      console.log(`   Status: ${manualResult.status}`);
      console.log(`   Instructions: ${manualResult.instructions}`);
      
      // OAuth Venmo Payment
      console.log('\n🔐 OAuth Venmo Payment:');
      const venmoOAuthBuilder = PaymentBuilderFactory.createBuilder('venmo') as VenmoBuilder;
      
      const oauthPayment = venmoOAuthBuilder
        .setRecipient('@DadFamily')
        .setAmount(25.50)
        .setNote('Dinner')
        .setOAuthToken('mock_oauth_token_here')
        .setSender('Mom')
        .build();
      
      console.log('✅ OAuth Venmo Payment Created:');
      console.log(`   ID: ${oauthPayment.id}`);
      console.log(`   OAuth Enabled: ${oauthPayment.metadata.venmoOAuth}`);
      
      // Execute OAuth payment
      const oauthResult = await venmoOAuthBuilder.executePayment();
      console.log('📋 OAuth Payment Result:');
      console.log(`   Status: ${oauthResult.status}`);
      console.log(`   Transaction ID: ${oauthResult.transactionId}`);
      
    } catch (error) {
      console.error('❌ Venmo Payment Error:', error);
    }
  }

  /**
   * ⛓️ Demo Bitcoin Payment
   */
  static async demoBitcoinPayment(): Promise<void> {
    console.log('\n⛓️ Bitcoin Payment Demo');
    console.log('========================');
    
    try {
      const btcBuilder = PaymentBuilderFactory.createBuilder('btc') as BitcoinBuilder;
      
      // Generate address first
      console.log('🔑 Generating Bitcoin address...');
      const address = await btcBuilder.generateAddress();
      console.log(`   Generated Address: ${address}`);
      
      const payment = await btcBuilder
        .setAmount(25.50)
        .setNetwork('mainnet')
        .setNote('Dinner payment')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .addMetadata('category', 'family')
        .build();
      
      console.log('✅ Bitcoin Payment Created:');
      console.log(`   ID: ${payment.id}`);
      console.log(`   Amount: $${payment.amount} (${payment.metadata.btcAmount} BTC)`);
      console.log(`   Address: ${payment.recipient}`);
      console.log(`   Network: ${payment.metadata.btcNetwork}`);
      console.log(`   QR Code: ${payment.metadata.qrCode}`);
      console.log(`   Explorer: ${payment.metadata.blockchainExplorer}`);
      console.log(`   Confirmations Required: ${payment.metadata.confirmationsRequired}`);
      
    } catch (error) {
      console.error('❌ Bitcoin Payment Error:', error);
    }
  }

  /**
   * 🔷 Demo Ethereum Payment
   */
  static async demoEthereumPayment(): Promise<void> {
    console.log('\n🔷 Ethereum Payment Demo');
    console.log('=========================');
    
    try {
      // Native ETH Payment
      console.log('💎 Native ETH Payment:');
      const ethBuilder = PaymentBuilderFactory.createBuilder('eth') as EthereumBuilder;
      
      const ethPayment = ethBuilder
        .setRecipient('0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45')
        .setAmount(25.50)
        .setNetwork('mainnet')
        .setNote('Dinner payment')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .build();
      
      console.log('✅ ETH Payment Created:');
      console.log(`   ID: ${ethPayment.id}`);
      console.log(`   Amount: $${ethPayment.amount} (${ethPayment.metadata.ethAmount} ETH)`);
      console.log(`   Wei Amount: ${ethPayment.metadata.weiAmount}`);
      console.log(`   QR Code: ${ethPayment.metadata.qrCode}`);
      console.log(`   Explorer: ${ethPayment.metadata.blockchainExplorer}`);
      
      // USDC Token Payment
      console.log('\n💰 USDC Token Payment:');
      const usdcBuilder = PaymentBuilderFactory.createBuilder('usdc') as EthereumBuilder;
      
      const usdcPayment = usdcBuilder
        .setRecipient('0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45')
        .setAmount(25.50)
        .setNetwork('mainnet')
        .setNote('Dinner payment')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .build();
      
      console.log('✅ USDC Payment Created:');
      console.log(`   ID: ${usdcPayment.id}`);
      console.log(`   Token: ${usdcPayment.metadata.tokenSymbol}`);
      console.log(`   Token Address: ${usdcPayment.metadata.tokenAddress}`);
      console.log(`   QR Code: ${usdcPayment.metadata.qrCode}`);
      
    } catch (error) {
      console.error('❌ Ethereum Payment Error:', error);
    }
  }

  /**
   * 🎯 Demo Smart Payment Selection
   */
  static async demoSmartSelection(): Promise<void> {
    console.log('\n🎯 Smart Payment Selection Demo');
    console.log('===============================');
    
    // Scenario 1: Family Payment
    console.log('\n🏠 Scenario 1: Family Payment');
    const familyRequirements: PaymentRequirements = {
      amount: 50,
      recipientCountry: 'US',
      senderCountry: 'US',
      urgency: 'instant',
      preferences: {
        preferCrypto: false,
        preferFree: true,
        preferMobile: true,
        requireWebhook: true
      }
    };
    
    const familyRecommendations = SmartPaymentSelector.selectBestMethods(familyRequirements);
    console.log('Top recommendations for family payment:');
    familyRecommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.details.name} (Score: ${rec.score.toFixed(2)})`);
      console.log(`      Reasons: ${rec.reasons.join(', ')}`);
      if (rec.warnings.length > 0) {
        console.log(`      Warnings: ${rec.warnings.join(', ')}`);
      }
    });
    
    // Scenario 2: International Transfer
    console.log('\n🌍 Scenario 2: International Transfer');
    const internationalRequirements: PaymentRequirements = {
      amount: 500,
      recipientCountry: 'GB',
      senderCountry: 'US',
      urgency: 'fast',
      preferences: {
        preferCrypto: false,
        preferFree: false,
        preferMobile: false,
        requireWebhook: false,
        maxFee: 15
      }
    };
    
    const internationalRecommendations = SmartPaymentSelector.selectBestMethods(internationalRequirements);
    console.log('Top recommendations for international transfer:');
    internationalRecommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.details.name} (Score: ${rec.score.toFixed(2)})`);
      console.log(`      Processing: ${rec.details.processingTime}, Fees: ${rec.details.fees}`);
    });
    
    // Scenario 3: Crypto Payment
    console.log('\n⛓️ Scenario 3: Crypto Payment');
    const cryptoRequirements: PaymentRequirements = {
      amount: 100,
      recipientCountry: 'US',
      senderCountry: 'US',
      urgency: 'slow',
      preferences: {
        preferCrypto: true,
        preferFree: false,
        preferMobile: false,
        requireWebhook: false
      }
    };
    
    const cryptoRecommendations = SmartPaymentSelector.selectBestMethods(cryptoRequirements);
    console.log('Top recommendations for crypto payment:');
    cryptoRecommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.details.name} (Score: ${rec.score.toFixed(2)})`);
      console.log(`      Type: ${rec.details.type}, Network: ${rec.details.protocol}`);
    });
  }

  /**
   * 📊 Demo Method Comparison
   */
  static async demoMethodComparison(): Promise<void> {
    console.log('\n📊 Method Comparison Demo');
    console.log('========================');
    
    const comparison = SmartPaymentSelector.getMethodComparison(['cashapp', 'venmo', 'paypal', 'btc', 'eth']);
    
    console.log('\nPayment Methods Comparison:');
    console.table(comparison.map(item => ({
      Method: item.method,
      Name: item.details.name,
      Type: item.details.type,
      Speed: item.speed,
      Cost: item.cost,
      Convenience: item.convenience,
      Availability: item.availability,
      'Min Amount': `$${item.details.limits.min}`,
      'Max Amount': `$${item.details.limits.max}`,
      'Processing Time': item.details.processingTime,
      Fees: item.details.fees
    })));
  }

  /**
   * 🏭 Demo Factory Usage
   */
  static async demoFactoryUsage(): Promise<void> {
    console.log('\n🏭 Factory Usage Demo');
    console.log('====================');
    
    // Get all available methods
    const availableMethods = PaymentBuilderFactory.getAvailableMethods();
    console.log(`\n📋 Available Payment Methods (${availableMethods.length}):`);
    availableMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.log(`   • ${method}: ${details?.name} (${details?.type})`);
    });
    
    // Get methods by type
    const fiatMethods = PaymentBuilderFactory.getMethodsByType('fiat');
    const cryptoMethods = PaymentBuilderFactory.getMethodsByType('crypto');
    
    console.log(`\n💳 Fiat Methods (${fiatMethods.length}):`);
    fiatMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.log(`   • ${method}: ${details?.name}`);
    });
    
    console.log(`\n⛓️ Crypto Methods (${cryptoMethods.length}):`);
    cryptoMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.log(`   • ${method}: ${details?.name}`);
    });
    
    // Get methods by availability
    const instantMethods = PaymentBuilderFactory.getMethodsByAvailability('instant');
    console.log(`\n⚡ Instant Methods (${instantMethods.length}):`);
    instantMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.log(`   • ${method}: ${details?.name}`);
    });
  }

  /**
   * 🚀 Run complete demo
   */
  static async runCompleteDemo(): Promise<void> {
    console.log('🚀 FactoryWager Payment Builder System - Complete Demo');
    console.log('==================================================');
    
    try {
      await this.demoFactoryUsage();
      await this.demoCashAppPayment();
      await this.demoVenmoPayment();
      await this.demoBitcoinPayment();
      await this.demoEthereumPayment();
      await this.demoSmartSelection();
      await this.demoMethodComparison();
      
      console.log('\n✅ Demo completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error);
    }
  }
}

/**
 * 🎯 Quick Usage Examples
 */

// Example 1: Create a simple Cash App payment
/*
const cashappBuilder = PaymentBuilderFactory.createBuilder('cashapp') as CashAppBuilder;
const payment = cashappBuilder
  .setRecipient('$DadFamily')
  .setAmount(25.50)
  .setNote('Dinner')
  .build();
*/

// Example 2: Get best payment method for family transfer
/*
const requirements: PaymentRequirements = {
  amount: 50,
  recipientCountry: 'US',
  senderCountry: 'US',
  urgency: 'instant',
  preferences: {
    preferCrypto: false,
    preferFree: true,
    preferMobile: true,
    requireWebhook: true
  }
};

const bestMethod = SmartPaymentSelector.getBestRecommendation(requirements);
console.log('Best method:', bestMethod?.method);
*/

// Example 3: Create Bitcoin payment with address generation
/*
const btcBuilder = PaymentBuilderFactory.createBuilder('btc') as BitcoinBuilder;
const btcPayment = await btcBuilder
  .setAmount(100)
  .generateAddress()
  .then(() => btcBuilder.build());
*/

// Example 4: Compare payment methods
/*
const comparison = SmartPaymentSelector.getMethodComparison(['cashapp', 'venmo', 'btc']);
console.table(comparison);
*/

// Export for easy usage
export default PaymentBuilderDemo;

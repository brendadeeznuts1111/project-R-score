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
    console.info('\n💚 Cash App Payment Demo');
    console.info('========================');
    
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
      
      console.info('✅ Cash App Payment Created:');
      console.info(`   ID: ${payment.id}`);
      console.info(`   Recipient: ${payment.recipient}`);
      console.info(`   Amount: $${payment.amount}`);
      console.info(`   Note: ${payment.note}`);
      console.info(`   QR Code: ${payment.metadata.qrCode}`);
      console.info(`   Deep Link: ${payment.metadata.deepLink}`);
      console.info(`   Participants: ${payment.participants.join(', ')}`);
      
    } catch (error) {
      console.error('❌ Cash App Payment Error:', error);
    }
  }

  /**
   * 💙 Demo Venmo Payment (Manual and OAuth)
   */
  static async demoVenmoPayment(): Promise<void> {
    console.info('\n💙 Venmo Payment Demo');
    console.info('=======================');
    
    try {
      // Manual Venmo Payment
      console.info('\n📱 Manual Venmo Payment:');
      const venmoManualBuilder = PaymentBuilderFactory.createBuilder('venmo') as VenmoBuilder;
      
      const manualPayment = venmoManualBuilder
        .setRecipient('@DadFamily')
        .setAmount(25.50)
        .setNote('Dinner')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .build();
      
      console.info('✅ Manual Venmo Payment Created:');
      console.info(`   ID: ${manualPayment.id}`);
      console.info(`   Status: Requires manual confirmation`);
      console.info(`   QR Code: ${manualPayment.metadata.qrCode}`);
      
      // Execute manual payment
      const manualResult = await venmoManualBuilder.executePayment();
      console.info('📋 Manual Payment Result:');
      console.info(`   Status: ${manualResult.status}`);
      console.info(`   Instructions: ${manualResult.instructions}`);
      
      // OAuth Venmo Payment
      console.info('\n🔐 OAuth Venmo Payment:');
      const venmoOAuthBuilder = PaymentBuilderFactory.createBuilder('venmo') as VenmoBuilder;
      
      const oauthPayment = venmoOAuthBuilder
        .setRecipient('@DadFamily')
        .setAmount(25.50)
        .setNote('Dinner')
        .setOAuthToken('mock_oauth_token_here')
        .setSender('Mom')
        .build();
      
      console.info('✅ OAuth Venmo Payment Created:');
      console.info(`   ID: ${oauthPayment.id}`);
      console.info(`   OAuth Enabled: ${oauthPayment.metadata.venmoOAuth}`);
      
      // Execute OAuth payment
      const oauthResult = await venmoOAuthBuilder.executePayment();
      console.info('📋 OAuth Payment Result:');
      console.info(`   Status: ${oauthResult.status}`);
      console.info(`   Transaction ID: ${oauthResult.transactionId}`);
      
    } catch (error) {
      console.error('❌ Venmo Payment Error:', error);
    }
  }

  /**
   * ⛓️ Demo Bitcoin Payment
   */
  static async demoBitcoinPayment(): Promise<void> {
    console.info('\n⛓️ Bitcoin Payment Demo');
    console.info('========================');
    
    try {
      const btcBuilder = PaymentBuilderFactory.createBuilder('btc') as BitcoinBuilder;
      
      // Generate address first
      console.info('🔑 Generating Bitcoin address...');
      const address = await btcBuilder.generateAddress();
      console.info(`   Generated Address: ${address}`);
      
      const payment = await btcBuilder
        .setAmount(25.50)
        .setNetwork('mainnet')
        .setNote('Dinner payment')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .addMetadata('category', 'family')
        .build();
      
      console.info('✅ Bitcoin Payment Created:');
      console.info(`   ID: ${payment.id}`);
      console.info(`   Amount: $${payment.amount} (${payment.metadata.btcAmount} BTC)`);
      console.info(`   Address: ${payment.recipient}`);
      console.info(`   Network: ${payment.metadata.btcNetwork}`);
      console.info(`   QR Code: ${payment.metadata.qrCode}`);
      console.info(`   Explorer: ${payment.metadata.blockchainExplorer}`);
      console.info(`   Confirmations Required: ${payment.metadata.confirmationsRequired}`);
      
    } catch (error) {
      console.error('❌ Bitcoin Payment Error:', error);
    }
  }

  /**
   * 🔷 Demo Ethereum Payment
   */
  static async demoEthereumPayment(): Promise<void> {
    console.info('\n🔷 Ethereum Payment Demo');
    console.info('=========================');
    
    try {
      // Native ETH Payment
      console.info('💎 Native ETH Payment:');
      const ethBuilder = PaymentBuilderFactory.createBuilder('eth') as EthereumBuilder;
      
      const ethPayment = ethBuilder
        .setRecipient('0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45')
        .setAmount(25.50)
        .setNetwork('mainnet')
        .setNote('Dinner payment')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .build();
      
      console.info('✅ ETH Payment Created:');
      console.info(`   ID: ${ethPayment.id}`);
      console.info(`   Amount: $${ethPayment.amount} (${ethPayment.metadata.ethAmount} ETH)`);
      console.info(`   Wei Amount: ${ethPayment.metadata.weiAmount}`);
      console.info(`   QR Code: ${ethPayment.metadata.qrCode}`);
      console.info(`   Explorer: ${ethPayment.metadata.blockchainExplorer}`);
      
      // USDC Token Payment
      console.info('\n💰 USDC Token Payment:');
      const usdcBuilder = PaymentBuilderFactory.createBuilder('usdc') as EthereumBuilder;
      
      const usdcPayment = usdcBuilder
        .setRecipient('0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45')
        .setAmount(25.50)
        .setNetwork('mainnet')
        .setNote('Dinner payment')
        .setParticipants(['mom', 'dad'])
        .setSender('Mom')
        .build();
      
      console.info('✅ USDC Payment Created:');
      console.info(`   ID: ${usdcPayment.id}`);
      console.info(`   Token: ${usdcPayment.metadata.tokenSymbol}`);
      console.info(`   Token Address: ${usdcPayment.metadata.tokenAddress}`);
      console.info(`   QR Code: ${usdcPayment.metadata.qrCode}`);
      
    } catch (error) {
      console.error('❌ Ethereum Payment Error:', error);
    }
  }

  /**
   * 🎯 Demo Smart Payment Selection
   */
  static async demoSmartSelection(): Promise<void> {
    console.info('\n🎯 Smart Payment Selection Demo');
    console.info('===============================');
    
    // Scenario 1: Family Payment
    console.info('\n🏠 Scenario 1: Family Payment');
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
    console.info('Top recommendations for family payment:');
    familyRecommendations.forEach((rec, index) => {
      console.info(`   ${index + 1}. ${rec.details.name} (Score: ${rec.score.toFixed(2)})`);
      console.info(`      Reasons: ${rec.reasons.join(', ')}`);
      if (rec.warnings.length > 0) {
        console.info(`      Warnings: ${rec.warnings.join(', ')}`);
      }
    });
    
    // Scenario 2: International Transfer
    console.info('\n🌍 Scenario 2: International Transfer');
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
    console.info('Top recommendations for international transfer:');
    internationalRecommendations.forEach((rec, index) => {
      console.info(`   ${index + 1}. ${rec.details.name} (Score: ${rec.score.toFixed(2)})`);
      console.info(`      Processing: ${rec.details.processingTime}, Fees: ${rec.details.fees}`);
    });
    
    // Scenario 3: Crypto Payment
    console.info('\n⛓️ Scenario 3: Crypto Payment');
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
    console.info('Top recommendations for crypto payment:');
    cryptoRecommendations.forEach((rec, index) => {
      console.info(`   ${index + 1}. ${rec.details.name} (Score: ${rec.score.toFixed(2)})`);
      console.info(`      Type: ${rec.details.type}, Network: ${rec.details.protocol}`);
    });
  }

  /**
   * 📊 Demo Method Comparison
   */
  static async demoMethodComparison(): Promise<void> {
    console.info('\n📊 Method Comparison Demo');
    console.info('========================');
    
    const comparison = SmartPaymentSelector.getMethodComparison(['cashapp', 'venmo', 'paypal', 'btc', 'eth']);
    
    console.info('\nPayment Methods Comparison:');
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
    console.info('\n🏭 Factory Usage Demo');
    console.info('====================');
    
    // Get all available methods
    const availableMethods = PaymentBuilderFactory.getAvailableMethods();
    console.info(`\n📋 Available Payment Methods (${availableMethods.length}):`);
    availableMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.info(`   • ${method}: ${details?.name} (${details?.type})`);
    });
    
    // Get methods by type
    const fiatMethods = PaymentBuilderFactory.getMethodsByType('fiat');
    const cryptoMethods = PaymentBuilderFactory.getMethodsByType('crypto');
    
    console.info(`\n💳 Fiat Methods (${fiatMethods.length}):`);
    fiatMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.info(`   • ${method}: ${details?.name}`);
    });
    
    console.info(`\n⛓️ Crypto Methods (${cryptoMethods.length}):`);
    cryptoMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.info(`   • ${method}: ${details?.name}`);
    });
    
    // Get methods by availability
    const instantMethods = PaymentBuilderFactory.getMethodsByAvailability('instant');
    console.info(`\n⚡ Instant Methods (${instantMethods.length}):`);
    instantMethods.forEach(method => {
      const details = PaymentBuilderFactory.getMethodDetails(method);
      console.info(`   • ${method}: ${details?.name}`);
    });
  }

  /**
   * 🚀 Run complete demo
   */
  static async runCompleteDemo(): Promise<void> {
    console.info('🚀 FactoryWager Payment Builder System - Complete Demo');
    console.info('==================================================');
    
    try {
      await this.demoFactoryUsage();
      await this.demoCashAppPayment();
      await this.demoVenmoPayment();
      await this.demoBitcoinPayment();
      await this.demoEthereumPayment();
      await this.demoSmartSelection();
      await this.demoMethodComparison();
      
      console.info('\n✅ Demo completed successfully!');
      
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
console.info('Best method:', bestMethod?.method);
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

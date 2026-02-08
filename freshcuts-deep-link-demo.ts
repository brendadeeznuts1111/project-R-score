/**
 * FreshCuts Deep Linking System - Complete Demo
 * Demonstrates all deep link functionality with real-world examples
 */

import {
  FreshCutsDeepLinkParser,
  FreshCutsDeepLinkHandler,
  FreshCutsDeepLinkGenerator,
  demonstrateDeepLinking,
  PaymentLinkParams,
  BookingLinkParams,
  TipLinkParams
} from './freshcuts-deep-linking';

// Mock Venmo gateway for demonstration
class MockVenmoGateway {
  async createPayment(request: any) {
    console.log('💳 Mock Venmo payment created:', request);
    return {
      paymentId: `payment_${Date.now()}`,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      privateTransaction: request.privateTransaction,
      createdAt: new Date().toISOString()
    };
  }
}

// Demo class to showcase all deep linking capabilities
class FreshCutsDeepLinkDemo {
  private handler: FreshCutsDeepLinkHandler;

  constructor() {
    this.handler = new FreshCutsDeepLinkHandler(new MockVenmoGateway());
  }

  /**
   * Run complete deep linking demonstration
   */
  async runCompleteDemo() {
    console.log('🚀 FreshCuts Deep Linking System - Complete Demo\n');
    console.log('=' .repeat(60));

    // 1. Basic parsing demonstration
    await this.demonstrateParsing();
    
    // 2. Payment deep links
    await this.demonstratePaymentLinks();
    
    // 3. Booking deep links
    await this.demonstrateBookingLinks();
    
    // 4. Tip deep links
    await this.demonstrateTipLinks();
    
    // 5. Navigation deep links
    await this.demonstrateNavigationLinks();
    
    // 6. Error handling
    await this.demonstrateErrorHandling();
    
    // 7. Link generation
    await this.demonstrateLinkGeneration();
    
    // 8. Real-world scenarios
    await this.demonstrateRealWorldScenarios();

    console.log('\n✅ Demo completed successfully!');
  }

  /**
   * Demonstrate basic URL parsing
   */
  private async demonstrateParsing() {
    console.log('\n📝 1. Basic URL Parsing');
    console.log('-'.repeat(30));

    const testUrls = [
      'freshcuts://payment?amount=45&shop=nyc_01',
      'freshcuts://booking?barber=jb&service=haircut',
      'freshcuts://tip?barber=jb&amount=10',
      'freshcuts://shop?shop=nyc_01',
      'freshcuts://barber?barber=jb'
    ];

    for (const url of testUrls) {
      try {
        const parsed = FreshCutsDeepLinkParser.parse(url);
        console.log(`✅ ${url}`);
        console.log(`   Action: ${parsed.action}`);
        console.log(`   Params: ${JSON.stringify(parsed.params, null, 6)}`);
      } catch (error) {
        console.log(`❌ ${url} - ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate payment deep links
   */
  private async demonstratePaymentLinks() {
    console.log('\n💳 2. Payment Deep Links');
    console.log('-'.repeat(30));

    const paymentLinks = [
      'freshcuts://payment?amount=45&shop=nyc_01&service=haircut&barber=jb',
      'freshcuts://payment?amount=120&shop=nyc_01&service=group&split=true',
      'freshcuts://payment?amount=65&shop=la_02&service=premium&private=false'
    ];

    for (const link of paymentLinks) {
      try {
        console.log(`\n🔗 Processing: ${link}`);
        const result = await this.handler.handleDeepLink(link);
        console.log(`✅ Result: ${result.type} - ${result.action}`);
        console.log(`   Data: ${JSON.stringify(result.data, null, 4)}`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate booking deep links
   */
  private async demonstrateBookingLinks() {
    console.log('\n📅 3. Booking Deep Links');
    console.log('-'.repeat(30));

    const bookingLinks = [
      'freshcuts://booking?barber=jb&service=haircut&datetime=2024-01-15T14:30:00Z',
      'freshcuts://booking?barber=jb&shop=nyc_01&service=beard&duration=30',
      'freshcuts://booking?barber=jb&group=true&participants=4&datetime=2024-01-15T16:00:00Z'
    ];

    for (const link of bookingLinks) {
      try {
        console.log(`\n🔗 Processing: ${link}`);
        const result = await this.handler.handleDeepLink(link);
        console.log(`✅ Result: ${result.type} - ${result.action}`);
        console.log(`   Data: ${JSON.stringify(result.data, null, 4)}`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate tip deep links
   */
  private async demonstrateTipLinks() {
    console.log('\n💰 4. Tip Deep Links');
    console.log('-'.repeat(30));

    const tipLinks = [
      'freshcuts://tip?barber=jb&amount=10',
      'freshcuts://tip?barber=jb&percentage=20',
      'freshcuts://tip?barber=jb&amount=15&appointment=apt_123'
    ];

    for (const link of tipLinks) {
      try {
        console.log(`\n🔗 Processing: ${link}`);
        const result = await this.handler.handleDeepLink(link);
        console.log(`✅ Result: ${result.type} - ${result.action}`);
        console.log(`   Data: ${JSON.stringify(result.data, null, 4)}`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate navigation deep links
   */
  private async demonstrateNavigationLinks() {
    console.log('\n🧭 5. Navigation Deep Links');
    console.log('-'.repeat(30));

    const navigationLinks = [
      'freshcuts://shop?shop=nyc_01',
      'freshcuts://barber?barber=jb',
      'freshcuts://review?appointment=apt_123',
      'freshcuts://promotions?code=SAVE20',
      'freshcuts://profile?user=user_456'
    ];

    for (const link of navigationLinks) {
      try {
        console.log(`\n🔗 Processing: ${link}`);
        const result = await this.handler.handleDeepLink(link);
        console.log(`✅ Result: ${result.type} - ${result.action}`);
        console.log(`   Data: ${JSON.stringify(result.data, null, 4)}`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate error handling
   */
  private async demonstrateErrorHandling() {
    console.log('\n⚠️ 6. Error Handling');
    console.log('-'.repeat(30));

    const invalidLinks = [
      'invalid://payment?amount=45',  // Invalid scheme
      'freshcuts://invalid?amount=45', // Invalid action
      'freshcuts://payment?amount=-10', // Invalid amount
      'freshcuts://payment?amount=abc', // Invalid amount format
      'freshcuts://booking?datetime=invalid-date' // Invalid datetime
    ];

    for (const link of invalidLinks) {
      try {
        console.log(`\n🔗 Testing invalid: ${link}`);
        await this.handler.handleDeepLink(link);
        console.log(`❌ Should have failed!`);
      } catch (error) {
        console.log(`✅ Correctly caught error: ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate link generation
   */
  private async demonstrateLinkGeneration() {
    console.log('\n🔗 7. Link Generation');
    console.log('-'.repeat(30));

    // Generate payment links
    console.log('\n💳 Payment Links:');
    const paymentLink1 = FreshCutsDeepLinkGenerator.payment({
      amount: 45,
      shop: 'nyc_01',
      service: 'haircut',
      barber: 'jb',
      private: true
    });
    console.log(`   ${paymentLink1}`);

    const paymentLink2 = FreshCutsDeepLinkGenerator.payment({
      amount: 120,
      shop: 'nyc_01',
      service: 'group',
      split: true
    });
    console.log(`   ${paymentLink2}`);

    // Generate booking links
    console.log('\n📅 Booking Links:');
    const bookingLink1 = FreshCutsDeepLinkGenerator.booking({
      barber: 'jb',
      shop: 'nyc_01',
      service: 'haircut',
      datetime: '2024-01-15T14:30:00Z',
      duration: 30
    });
    console.log(`   ${bookingLink1}`);

    const bookingLink2 = FreshCutsDeepLinkGenerator.booking({
      barber: 'jb',
      group: true,
      participants: 4,
      datetime: '2024-01-15T16:00:00Z'
    });
    console.log(`   ${bookingLink2}`);

    // Generate tip links
    console.log('\n💰 Tip Links:');
    const tipLink1 = FreshCutsDeepLinkGenerator.tip({
      barber: 'jb',
      amount: 10,
      appointment: 'apt_123'
    });
    console.log(`   ${tipLink1}`);

    const tipLink2 = FreshCutsDeepLinkGenerator.tip({
      barber: 'jb',
      percentage: 20,
      shop: 'nyc_01'
    });
    console.log(`   ${tipLink2}`);

    // Generate navigation links
    console.log('\n🧭 Navigation Links:');
    console.log(`   Shop: ${FreshCutsDeepLinkGenerator.shop('nyc_01')}`);
    console.log(`   Barber: ${FreshCutsDeepLinkGenerator.barber('jb')}`);
    console.log(`   Review: ${FreshCutsDeepLinkGenerator.review('apt_123')}`);
    console.log(`   Promotions: ${FreshCutsDeepLinkGenerator.promotions('SAVE20')}`);
    console.log(`   Profile: ${FreshCutsDeepLinkGenerator.profile('user_456')}`);
  }

  /**
   * Demonstrate real-world scenarios
   */
  private async demonstrateRealWorldScenarios() {
    console.log('\n🌍 8. Real-World Scenarios');
    console.log('-'.repeat(30));

    // Scenario 1: Customer finishes haircut, wants to tip
    console.log('\n💈 Scenario 1: Post-Haircut Tip');
    const tipScenario = 'freshcuts://tip?barber=jb&percentage=20&appointment=apt_123';
    console.log(`   Link: ${tipScenario}`);
    const tipResult = await this.handler.handleDeepLink(tipScenario);
    console.log(`   Result: ${JSON.stringify(tipResult, null, 4)}`);

    // Scenario 2: Group booking for friends
    console.log('\n👥 Scenario 2: Group Booking');
    const groupScenario = 'freshcuts://booking?barber=jb&group=true&participants=4&datetime=2024-01-15T16:00:00Z&service=haircut';
    console.log(`   Link: ${groupScenario}`);
    const groupResult = await this.handler.handleDeepLink(groupScenario);
    console.log(`   Result: ${JSON.stringify(groupResult, null, 4)}`);

    // Scenario 3: Quick payment for walk-in
    console.log('\n🚶 Scenario 3: Walk-in Payment');
    const walkinScenario = 'freshcuts://payment?amount=45&shop=nyc_01&service=haircut&private=true';
    console.log(`   Link: ${walkinScenario}`);
    const walkinResult = await this.handler.handleDeepLink(walkinScenario);
    console.log(`   Result: ${JSON.stringify(walkinResult, null, 4)}`);

    // Scenario 4: Promotion redemption
    console.log('\n🎁 Scenario 4: Promotion Redemption');
    const promoScenario = 'freshcuts://promotions?code=NEWYEAR2024';
    console.log(`   Link: ${promoScenario}`);
    const promoResult = await this.handler.handleDeepLink(promoScenario);
    console.log(`   Result: ${JSON.stringify(promoResult, null, 4)}`);

    // Scenario 5: Shop navigation from website
    console.log('\n🏪 Scenario 5: Website to App Navigation');
    const navScenario = 'freshcuts://shop?shop=nyc_01';
    console.log(`   Link: ${navScenario}`);
    const navResult = await this.handler.handleDeepLink(navScenario);
    console.log(`   Result: ${JSON.stringify(navResult, null, 4)}`);
  }

  /**
   * Performance testing
   */
  async performanceTest() {
    console.log('\n⚡ Performance Testing');
    console.log('-'.repeat(30));

    const testUrl = 'freshcuts://payment?amount=45&shop=nyc_01&service=haircut&barber=jb';
    const iterations = 1000;

    console.log(`\n🏃 Testing ${iterations} iterations...`);
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      FreshCutsDeepLinkParser.parse(testUrl);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`✅ Performance Results:`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average time: ${avgTime.toFixed(3)}ms per parse`);
    console.log(`   Parses per second: ${(1000 / avgTime).toFixed(0)}`);
  }
}

// Export for use in other modules
export { FreshCutsDeepLinkDemo };

// Run demo if this file is executed directly
if (require.main === module) {
  const demo = new FreshCutsDeepLinkDemo();
  
  // Run complete demo
  demo.runCompleteDemo()
    .then(() => {
      console.log('\n🎉 Demo completed successfully!');
      
      // Run performance test
      return demo.performanceTest();
    })
    .then(() => {
      console.log('\n🚀 All tests completed!');
    })
    .catch((error) => {
      console.error('❌ Demo failed:', error);
    });
}

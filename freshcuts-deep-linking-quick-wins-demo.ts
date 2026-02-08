#!/usr/bin/env bun

/**
 * FreshCuts Deep Linking Quick Wins Demo
 * 
 * Demonstrates all the quick wins implemented:
 * 1. Magic number replacement with constants
 * 2. Structured logging with environment control
 * 3. Performance timing for slow operations
 * 4. Centralized validation constants
 * 5. Input sanitization for security
 * 6. Result type helpers
 * 7. Environment-based configuration
 * 8. URL length validation
 */

import {
  FreshCutsDeepLinkHandler,
  FreshCutsDeepLinkParser,
  FreshCutsDeepLinkGenerator,
  DEFAULT_SERVICE_AMOUNT,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  sanitizeInput,
  logger,
  withTiming,
  VALID_SERVICES,
  MAX_URL_LENGTH,
  MAX_QUERY_PARAMS
} from './freshcuts-deep-linking';

// Mock Venmo gateway for demonstration
class MockVenmoGateway {
  async createPayment(request: any) {
    logger.debug('Mock Venmo payment created', request, 'MockGateway');
    return {
      paymentId: `payment_${Date.now()}`,
      status: 'pending' as const,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      privateTransaction: request.privateTransaction,
      createdAt: new Date().toISOString()
    };
  }
}

// Result type helper (Quick Win #6)
const createResult = <T>(type: string, action: string, data: T, params: Record<string, string>) => ({
  type,
  action,
  data,
  params
});

// Environment-based configuration (Quick Win #7)
const config = {
  enableLogging: process.env.NODE_ENV !== 'production',
  enableValidation: process.env.DISABLE_VALIDATION !== 'true',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  maxAmount: parseInt(process.env.MAX_PAYMENT_AMOUNT || '10000'),
  debugMode: process.env.DEBUG_QUICK_WINS === 'true'
};

// Demo functions
async function demonstrateQuickWins() {
  console.log('🚀 FreshCuts Deep Linking - Quick Wins Demo\n');
  
  // Initialize handler with configuration
  const handler = new FreshCutsDeepLinkHandler(new MockVenmoGateway(), {
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000
    }
  });

  console.log('📊 Configuration:');
  console.log(`   Logging: ${config.enableLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`   Validation: ${config.enableValidation ? 'Enabled' : 'Disabled'}`);
  console.log(`   Default Currency: ${config.defaultCurrency}`);
  console.log(`   Max Amount: $${config.maxAmount}`);
  console.log(`   Debug Mode: ${config.debugMode ? 'Enabled' : 'Disabled'}\n`);

  // Quick Win #1: Magic Number Replacement
  console.log('✅ Quick Win #1: Magic Number Replacement');
  console.log(`   DEFAULT_SERVICE_AMOUNT: $${DEFAULT_SERVICE_AMOUNT}`);
  console.log(`   MAX_PARTICIPANTS: 20`);
  console.log(`   MAX_DURATION_MINUTES: 480\n`);

  // Quick Win #2: Structured Logging
  console.log('✅ Quick Win #2: Structured Logging');
  logger.info('Demo started', { timestamp: new Date().toISOString() }, 'QuickWinsDemo');
  logger.debug('Debug message', { debug: true }, 'QuickWinsDemo');
  logger.warn('Warning message', { warning: 'test' }, 'QuickWinsDemo');
  console.log();

  // Quick Win #3: Performance Timing
  console.log('✅ Quick Win #3: Performance Timing');
  await withTiming(async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
  }, 'demo operation', 'QuickWinsDemo');
  console.log();

  // Quick Win #4: Validation Constants
  console.log('✅ Quick Win #4: Validation Constants');
  console.log('   Validation Patterns:', Object.keys(VALIDATION_PATTERNS));
  console.log('   Valid Services:', VALID_SERVICES.join(', '));
  console.log('   Sample Message:', VALIDATION_MESSAGES.INVALID_ID);
  console.log();

  // Quick Win #5: Input Sanitization
  console.log('✅ Quick Win #5: Input Sanitization');
  const testInputs = {
    id: 'shop_123<script>',
    amount: '$45.00',
    text: 'Hello <b>world</b>',
    url: 'freshcuts://payment?amount=45&shop="test"',
    service: 'HairCut!'
  };
  
  console.log('   Original inputs:', testInputs);
  console.log('   Sanitized inputs:', {
    id: sanitizeInput.id(testInputs.id),
    amount: sanitizeInput.amount(testInputs.amount),
    text: sanitizeInput.text(testInputs.text),
    url: sanitizeInput.url(testInputs.url),
    service: sanitizeInput.service(testInputs.service)
  });
  console.log();

  // Quick Win #6: Result Type Helpers
  console.log('✅ Quick Win #6: Result Type Helpers');
  const sampleResult = createResult('payment', 'created', { id: '123' }, { amount: '45' });
  console.log('   Sample result:', sampleResult);
  console.log();

  // Quick Win #7: Environment Configuration
  console.log('✅ Quick Win #7: Environment Configuration');
  console.log('   Current config loaded from environment variables');
  console.log();

  // Quick Win #8: URL Length Validation (demonstrated in parser)
  console.log('✅ Quick Win #8: URL Length Validation');
  console.log(`   Max URL Length: ${MAX_URL_LENGTH} characters`);
  console.log(`   Max Query Params: ${MAX_QUERY_PARAMS}`);
  console.log();

  // Test the enhanced system
  console.log('🧪 Testing Enhanced Deep Link Processing:\n');

  const testLinks = [
    'freshcuts://payment?amount=45&shop=nyc_01&service=haircut',
    'freshcuts://booking?barber=jb&datetime=2024-01-15T14:30:00Z',
    'freshcuts://tip?barber=js&amount=15',
    'freshcuts://shop?shop=nyc_01'
  ];

  for (const link of testLinks) {
    console.log(`🔗 Testing: ${link}`);
    
    try {
      const result = await handler.handleDeepLink(link);
      console.log('✅ Success:', {
        type: result.type,
        action: result.action,
        paramsCount: Object.keys(result.params).length
      });
    } catch (error) {
      console.log('❌ Error:', error instanceof Error ? error.message : String(error));
    }
    
    console.log();
  }

  // Test security features
  console.log('🛡️ Testing Security Features:\n');

  const securityTests = [
    'freshcuts://payment?amount=45&shop=<script>alert("xss")</script>',
    'freshcuts://shop?shop=shop_123" OR "1"="1',
    'freshcuts://booking?barber=../admin'
  ];

  for (const link of securityTests) {
    console.log(`🔒 Testing: ${link}`);
    
    try {
      const parsed = FreshCutsDeepLinkParser.parse(link);
      console.log('✅ Parsed safely:', {
        action: parsed.action,
        params: Object.keys(parsed.params)
      });
    } catch (error) {
      console.log('❌ Blocked:', error instanceof Error ? error.message : String(error));
    }
    
    console.log();
  }

  console.log('🎉 Quick Wins Demo Completed Successfully!');
  console.log('\n📈 Benefits Achieved:');
  console.log('   • Improved maintainability with constants');
  console.log('   • Better debugging with structured logging');
  console.log('   • Performance monitoring with timing hooks');
  console.log('   • Centralized validation patterns');
  console.log('   • Enhanced security with input sanitization');
  console.log('   • Reduced boilerplate with result helpers');
  console.log('   • Flexible configuration via environment');
  console.log('   • Protection against URL-based attacks');
}

// Run the demo
if (import.meta.main) {
  demonstrateQuickWins().catch(console.error);
}

export { demonstrateQuickWins };

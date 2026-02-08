#!/usr/bin/env bun

/**
 * FreshCuts Deep Linking - Integration Demo
 * 
 * Demonstrates the enhanced deep linking system with:
 * - Wiki documentation integration
 * - Session management
 * - R2 cloud storage analytics
 * - Complete tracking and monitoring
 */

import {
  EnhancedFreshCutsDeepLinkHandler,
  WikiIntegration,
  SessionManager,
  R2Integration,
  type EnhancedDeepLinkConfig
} from './freshcuts-deep-linking-integrations';

// Mock Venmo gateway for demonstration
class MockVenmoGateway {
  async createPayment(request: any) {
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

// Demo configuration
const demoConfig: EnhancedDeepLinkConfig = {
  wiki: {
    enabled: true,
    baseUrl: 'https://docs.freshcuts.com',
    cacheTimeout: 60, // 1 minute for demo
    documentationPaths: {
      payments: '/api/v1/docs/payments',
      bookings: '/api/v1/docs/bookings',
      tips: '/api/v1/docs/tips',
      navigation: '/api/v1/docs/navigation'
    }
  },
  session: {
    enabled: true,
    storage: 'memory',
    timeout: 300, // 5 minutes for demo
    cookieName: 'freshcuts_demo_session'
  },
  r2: {
    enabled: process.env.R2_DEMO_ENABLED === 'true',
    accountId: process.env.R2_ACCOUNT_ID || 'demo-account',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'demo-key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'demo-secret',
    bucketName: process.env.R2_DEEP_LINK_BUCKET || 'freshcuts-demo',
    prefix: 'demo-analytics/'
  },
  analytics: {
    enabled: true,
    trackProcessingTime: true,
    trackErrors: true,
    trackMetadata: true
  }
};

// Mock wiki API responses
const mockWikiResponses = {
  '/api/v1/docs/payments': {
    id: 'payment-docs',
    title: 'Payment Processing Guide',
    content: '# Payment Processing\n\nThis guide explains how to process payments through FreshCuts deep links.\n\n## Supported Parameters\n- `amount`: Payment amount in USD\n- `shop`: Shop identifier\n- `service`: Service type\n- `barber`: Barber identifier\n\n## Security Notes\n- All payments are processed through secure Venmo integration\n- Private transactions are enabled by default\n- Amount validation prevents invalid payments',
    category: 'payments',
    lastUpdated: new Date().toISOString()
  },
  '/api/v1/docs/bookings': {
    id: 'booking-docs',
    title: 'Booking System Guide',
    content: '# Booking System\n\nThis guide covers the FreshCuts booking system.\n\n## Booking Parameters\n- `barber`: Required barber identifier\n- `datetime`: Booking time (ISO 8601 format)\n- `service`: Service type\n- `duration`: Appointment duration in minutes\n\n## Group Bookings\n- Set `group=true` for group appointments\n- Use `participants` to specify number of people',
    category: 'bookings',
    lastUpdated: new Date().toISOString()
  },
  '/api/v1/docs/tips': {
    id: 'tip-docs',
    title: 'Tipping Guide',
    content: '# Tipping System\n\nLearn how to send tips to your favorite barbers.\n\n## Tip Parameters\n- `barber`: Barber identifier\n- `amount`: Fixed tip amount\n- `percentage`: Percentage tip (alternative to amount)\n\n## Calculation\n- Tips can be fixed amount or percentage\n- Percentage tips calculate from service amount\n- Default service amount: $45',
    category: 'tips',
    lastUpdated: new Date().toISOString()
  },
  '/api/v1/docs/navigation': {
    id: 'navigation-docs',
    title: 'Navigation Guide',
    content: '# App Navigation\n\nDeep links for navigating the FreshCuts app.\n\n## Navigation Types\n- **Shop**: View shop details and services\n- **Barber**: View barber profile and availability\n- **Profile**: User profile and settings\n- **Promotions**: Current promotions and discounts\n\n## Security\n- All navigation parameters are validated\n- Malicious inputs are automatically sanitized',
    category: 'navigation',
    lastUpdated: new Date().toISOString()
  }
};

// Mock fetch for wiki API
const originalFetch = global.fetch;
global.fetch = async (url: string, options?: any) => {
  // Mock wiki API responses
  if (url.includes('docs.freshcuts.com')) {
    const path = url.replace('https://docs.freshcuts.com', '');
    const mockResponse = mockWikiResponses[path as keyof typeof mockWikiResponses];
    
    if (mockResponse) {
      return {
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse)
      } as Response;
    }
  }
  
  // Mock R2 API responses
  if (url.includes('.r2.cloudflarestorage.com')) {
    return {
      ok: true,
      status: 200,
      text: async () => '<ListBucketResult></ListBucketResult>'
    } as Response;
  }
  
  // Fallback to original fetch
  return originalFetch(url, options);
};

// Demo functions
async function demonstrateIntegrations() {
  console.log('🚀 FreshCuts Deep Linking - Integration Demo\n');
  
  // Initialize enhanced handler
  const handler = new EnhancedFreshCutsDeepLinkHandler(new MockVenmoGateway(), demoConfig);
  
  console.log('📊 Integration Status:');
  console.log(`   Wiki Integration: ${demoConfig.wiki?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Session Management: ${demoConfig.session?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   R2 Storage: ${demoConfig.r2?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Analytics: ${demoConfig.analytics?.enabled ? '✅ Enabled' : '❌ Disabled'}\n`);

  // Test deep links with full integration
  const testScenarios = [
    {
      name: 'Payment with Documentation',
      url: 'freshcuts://payment?amount=45&shop=nyc_01&service=haircut&barber=john',
      description: 'Complete payment flow with wiki documentation'
    },
    {
      name: 'Booking with Session Tracking',
      url: 'freshcuts://booking?barber=sarah&datetime=2024-01-15T14:30:00Z&service=beard',
      description: 'Booking creation with session persistence'
    },
    {
      name: 'Tip with Analytics',
      url: 'freshcuts://tip?barber=mike&amount=15',
      description: 'Tip processing with full analytics tracking'
    },
    {
      name: 'Navigation with Context',
      url: 'freshcuts://shop?shop=downtown_01',
      description: 'Shop navigation with contextual help'
    },
    {
      name: 'Error Handling with Tracking',
      url: 'freshcuts://payment?amount=invalid',
      description: 'Invalid payment with error analytics'
    }
  ];

  let sessionId: string | undefined;

  for (const scenario of testScenarios) {
    console.log(`🧪 ${scenario.name}:`);
    console.log(`   URL: ${scenario.url}`);
    console.log(`   Description: ${scenario.description}`);
    
    try {
      const startTime = Date.now();
      const result = await handler.handleDeepLink(scenario.url, sessionId);
      const processingTime = Date.now() - startTime;
      
      // Extract session ID from first successful result
      if (!sessionId && result.session) {
        sessionId = result.session.id;
        console.log(`   📝 Session Created: ${sessionId}`);
      }
      
      console.log(`   ✅ Success (${processingTime}ms):`);
      console.log(`      Action: ${result.type}`);
      console.log(`      Result: ${result.action}`);
      
      // Show documentation if available
      if (result.documentation) {
        console.log(`   📚 Documentation:`);
        console.log(`      Title: ${result.documentation.title}`);
        console.log(`      Content: ${result.documentation.content.substring(0, 100)}...`);
      }
      
      // Show session context
      if (result.session) {
        console.log(`   🔐 Session Context:`);
        console.log(`      ID: ${result.session.id}`);
        console.log(`      Current Shop: ${result.session.context.currentShop || 'None'}`);
        console.log(`      Current Barber: ${result.session.context.currentBarber || 'None'}`);
        console.log(`      Navigation History: ${result.session.context.navigationHistory.length} links`);
      }
      
      // Show analytics
      if (result.analytics) {
        console.log(`   📊 Analytics:`);
        console.log(`      ID: ${result.analytics.id}`);
        console.log(`      Processing Time: ${result.analytics.processingTime}ms`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log();
  }

  // Show analytics dashboard
  console.log('📈 Analytics Dashboard:');
  try {
    const dashboard = await handler.getAnalyticsDashboard(7);
    
    console.log(`   Total Deep Links: ${dashboard.totalDeepLinks || 0}`);
    console.log(`   Error Rate: ${dashboard.errorRate?.toFixed(2) || 0}%`);
    console.log(`   Average Processing Time: ${dashboard.averageProcessingTime?.toFixed(2) || 0}ms`);
    
    if (dashboard.actionCounts) {
      console.log(`   Action Breakdown:`);
      Object.entries(dashboard.actionCounts).forEach(([action, count]) => {
        console.log(`      ${action}: ${count}`);
      });
    }
    
    if (dashboard.sessions) {
      console.log(`   Session Statistics:`);
      console.log(`      Total: ${dashboard.sessions.total}`);
      console.log(`      Active: ${dashboard.sessions.active}`);
      console.log(`      Expired: ${dashboard.sessions.expired}`);
    }
    
    if (dashboard.integrations) {
      console.log(`   Integration Status:`);
      Object.entries(dashboard.integrations).forEach(([name, config]: [string, any]) => {
        console.log(`      ${name}: ${config.enabled ? '✅' : '❌'}`);
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Dashboard Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log();
  
  // Demonstrate individual integration components
  await demonstrateIndividualComponents();
}

async function demonstrateIndividualComponents() {
  console.log('🔧 Individual Integration Components:\n');

  // Wiki Integration Demo
  console.log('📚 Wiki Integration Demo:');
  const wiki = new WikiIntegration(demoConfig.wiki);
  
  try {
    const deepLink = {
      scheme: 'freshcuts' as const,
      action: 'payment' as const,
      params: { amount: '45', shop: 'nyc_01' },
      originalUrl: 'freshcuts://payment?amount=45&shop=nyc_01'
    };
    
    const docs = await wiki.getDocumentationForDeepLink(deepLink);
    if (docs) {
      console.log(`   ✅ Documentation Found: ${docs.title}`);
      console.log(`   📝 Content Preview: ${docs.content.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`   ❌ Wiki Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log();

  // Session Management Demo
  console.log('🔐 Session Management Demo:');
  const sessionManager = new SessionManager(demoConfig.session);
  
  try {
    const session = await sessionManager.getSession();
    console.log(`   ✅ Session Created: ${session.id}`);
    console.log(`   📅 Created At: ${session.metadata.createdAt}`);
    
    await sessionManager.trackDeepLink(session.id, {
      scheme: 'freshcuts' as const,
      action: 'booking' as const,
      params: { barber: 'john' },
      originalUrl: 'freshcuts://booking?barber=john'
    });
    
    console.log(`   📊 Deep Links Tracked: ${session.deepLinks.length}`);
    console.log(`   🧭 Current Barber: ${session.context.currentBarber || 'None'}`);
    
    const stats = sessionManager.getStats();
    console.log(`   📈 Session Stats: Total=${stats.total}, Active=${stats.active}, Expired=${stats.expired}`);
  } catch (error) {
    console.log(`   ❌ Session Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log();

  // R2 Integration Demo
  console.log('🪣 R2 Storage Demo:');
  const r2 = new R2Integration(demoConfig.r2);
  
  try {
    if (demoConfig.r2?.enabled) {
      console.log(`   ✅ R2 Configured: ${r2['config'].bucketName}`);
      
      // This would normally store analytics, but we'll skip actual R2 calls in demo
      console.log(`   📊 Analytics Storage: Configured`);
      console.log(`   📈 Analytics Retrieval: Configured`);
    } else {
      console.log(`   ⚠️ R2 Disabled: Set R2_DEMO_ENABLED=true to enable`);
    }
  } catch (error) {
    console.log(`   ❌ R2 Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log();
}

// Run the demo
if (import.meta.main) {
  demonstrateIntegrations()
    .then(() => {
      console.log('🎉 Integration Demo Completed Successfully!');
      console.log('\n📋 Integration Features Demonstrated:');
      console.log('   • Wiki documentation integration with caching');
      console.log('   • Session management with context tracking');
      console.log('   • R2 cloud storage for analytics');
      console.log('   • Enhanced error handling and monitoring');
      console.log('   • Real-time analytics dashboard');
      console.log('   • Security and input sanitization');
      console.log('   • Performance monitoring and optimization');
    })
    .catch(console.error);
}

export { demonstrateIntegrations };

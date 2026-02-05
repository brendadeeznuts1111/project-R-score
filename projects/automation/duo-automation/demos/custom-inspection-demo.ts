/**
 * 🎨 Custom Inspection System v1.0 Demo
 * 
 * Demonstrates the base custom inspection system with beautiful terminal output,
 * emojis, colors, and structured formatting.
 */

import {
  ScopeInspectable,
  ConnectionStatsInspectable,
  SecurityCheckInspectable,
  DatabaseConnectionInspectable,
  PaymentRequestInspectable,
  FamilyMemberInspectable,
  InspectionUtils,
  setupGlobalInspection,
  InspectableClass,
  InspectionStats,
  ConnectionStats
} from '../src/@core/inspection/custom-inspection-system';

class CustomInspectionDemo {
  
  async runCompleteDemo(): Promise<void> {
    console.log('🎨 Custom Inspection System v1.0 Demo');
    console.log('='.repeat(60));
    console.log('');
    
    try {
      // Initialize the inspection system
      setupGlobalInspection();
      
      // Run individual demonstrations
      this.demonstrateScopeInspection();
      this.demonstrateConnectionStats();
      this.demonstrateSecurityChecks();
      this.demonstrateDatabaseConnections();
      this.demonstratePaymentRequests();
      this.demonstrateFamilyMembers();
      this.demonstrateListFormatting();
      this.demonstrateSummaryCards();
      this.demonstrateCustomDecorator();
      this.demonstratePerformanceMonitoring();
      
      console.log('✅ Custom inspection demo completed successfully!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }
  
  private demonstrateScopeInspection(): void {
    console.log('🏢 SCOPE INSPECTION DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const enterpriseScope = new ScopeInspectable(
      'ENTERPRISE',
      'apple.factory-wager.com',
      'macOS',
      ['PREMIUM', 'TERMINAL_PTY', 'ADVANCED_CONNECTIONS'],
      { maxConnections: 10, keepAlive: true, timeout: 15000 },
      { activeConnections: 3, totalRequests: 150, averageResponseTime: 245.67 }
    );
    
    const developmentScope = new ScopeInspectable(
      'DEVELOPMENT',
      'dev.localhost',
      'macOS',
      ['DEBUG', 'HOT_RELOAD'],
      { maxConnections: 5, keepAlive: false, timeout: 5000 },
      { activeConnections: 1, totalRequests: 25, averageResponseTime: 89.3 }
    );
    
    console.log(enterpriseScope);
    console.log('');
    console.log(developmentScope);
    console.log('');
  }
  
  private demonstrateConnectionStats(): void {
    console.log('🔗 CONNECTION STATISTICS DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const connections = [
      new ConnectionStatsInspectable('api.service1.com', 2, 5, 450, 120.5, 1, new Date()),
      new ConnectionStatsInspectable('api.service2.com', 8, 2, 1200, 89.3, 0, new Date()),
      new ConnectionStatsInspectable('api.service3.com', 0, 10, 300, 210.8, 5, new Date()),
      new ConnectionStatsInspectable('api.service4.com', 15, 3, 2500, 45.2, 0, new Date()),
    ];
    
    connections.forEach(conn => {
      console.log(conn);
      console.log('');
    });
  }
  
  private demonstrateSecurityChecks(): void {
    console.log('🛡️ SECURITY CHECKS DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const securityChecks = [
      new SecurityCheckInspectable('TLS Certificate', 'PASS', 'Certificate is valid and not expired', {
        issuer: 'Let\\'s Encrypt',
        expires: '2024-12-31',
        algorithm: 'RSA-2048'
      }),
      new SecurityCheckInspectable('CORS Policy', 'FAIL', 'Zero-width character detected', {
        uri: 'https://ex\u200Bample.com',
        severity: 'high'
      }),
      new SecurityCheckInspectable('Rate Limiting', 'WARN', 'Threshold exceeded', {
        current: 150,
        limit: 100,
        window: '1 minute'
      }),
      new SecurityCheckInspectable('Authentication', 'PASS', 'JWT tokens are properly validated', {
        algorithm: 'RS256',
        expiry: '1 hour'
      })
    ];
    
    securityChecks.forEach(check => {
      console.log(check);
      console.log('');
    });
  }
  
  private demonstrateDatabaseConnections(): void {
    console.log('🗄️ DATABASE CONNECTIONS DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const databaseConnections = [
      new DatabaseConnectionInspectable('primary-db', 'connected', 20, 8, 10, 2),
      new DatabaseConnectionInspectable('cache-redis', 'connected', 50, 25, 20, 0),
      new DatabaseConnectionInspectable('analytics-db', 'connecting', 10, 0, 8, 5),
      new DatabaseConnectionInspectable('backup-db', 'disconnected', 5, 0, 0, 0),
    ];
    
    databaseConnections.forEach(db => {
      console.log(db);
      console.log('');
    });
  }
  
  private demonstratePaymentRequests(): void {
    console.log('💳 PAYMENT REQUESTS DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const payments = [
      new PaymentRequestInspectable(
        'PAY-001',
        'alice@example.com',
        'bob@example.com',
        25.50,
        'USD',
        'completed',
        new Date('2026-01-15T10:30:00Z'),
        'venmo',
        { note: 'Coffee' }
      ),
      new PaymentRequestInspectable(
        'PAY-002',
        'charlie@example.com',
        'diana@example.com',
        150.00,
        'USD',
        'pending',
        new Date('2026-01-15T11:45:00Z'),
        'paypal'
      ),
      new PaymentRequestInspectable(
        'PAY-003',
        'eve@example.com',
        'frank@example.com',
        75.25,
        'USD',
        'failed',
        new Date('2026-01-15T12:15:00Z'),
        'bank-transfer',
        { error: 'Insufficient funds' }
      )
    ];
    
    payments.forEach(payment => {
      console.log(payment);
      console.log('');
    });
  }
  
  private demonstrateFamilyMembers(): void {
    console.log('👥 FAMILY MEMBERS DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const familyMembers = [
      new FamilyMemberInspectable('user-001', 'Alice', 'host', true, 25.50, 150.00, 95, 500),
      new FamilyMemberInspectable('user-002', 'Bob', 'cousin', false, 10.00, 75.00, 85, 200),
      new FamilyMemberInspectable('user-003', 'Charlie', 'guest', true, 0.00, 25.00, 70),
      new FamilyMemberInspectable('user-004', 'Diana', 'friend', true, 50.00, 50.00, 90, 300),
    ];
    
    familyMembers.forEach(member => {
      console.log(member);
      console.log('');
    });
  }
  
  private demonstrateListFormatting(): void {
    console.log('📝 LIST FORMATTING DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const connections = [
      new ConnectionStatsInspectable('api.service1.com', 2, 5, 450, 120.5, 1, new Date()),
      new ConnectionStatsInspectable('api.service2.com', 8, 2, 1200, 89.3, 0, new Date()),
      new ConnectionStatsInspectable('api.service3.com', 0, 10, 300, 210.8, 5, new Date()),
    ];
    
    console.log('📋 Formatted List:');
    console.log(InspectionUtils.formatList(connections));
    console.log('');
  }
  
  private demonstrateSummaryCards(): void {
    console.log('📋 SUMMARY CARDS DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const connections = [
      new ConnectionStatsInspectable('api.service1.com', 2, 5, 450, 120.5, 1, new Date()),
      new ConnectionStatsInspectable('api.service2.com', 8, 2, 1200, 89.3, 0, new Date()),
      new ConnectionStatsInspectable('api.service3.com', 0, 10, 300, 210.8, 5, new Date()),
    ];
    
    const summary = InspectionUtils.createSummaryCard('Connection Summary', connections);
    console.log(summary);
    console.log('');
    
    const securitySummary = InspectionUtils.createSummaryCard('Security Audit', [
      new SecurityCheckInspectable('TLS Certificate', 'PASS', 'Valid'),
      new SecurityCheckInspectable('CORS Policy', 'FAIL', 'Issue detected'),
      new SecurityCheckInspectable('Rate Limiting', 'WARN', 'Threshold exceeded'),
    ]);
    console.log(securitySummary);
    console.log('');
  }
  
  private demonstrateCustomDecorator(): void {
    console.log('🎨 CUSTOM DECORATOR DEMONSTRATION');
    console.log('─'.repeat(45));
    
    @InspectableClass('🔧', '\x1b[1;33m')
    class ToolConfig {
      constructor(
        public name: string,
        public version: string,
        public enabled: boolean,
        public settings?: Record<string, any>
      ) {}
    }
    
    const wrench = new ToolConfig('wrench', '1.0.0', true, { torque: 'high' });
    const hammer = new ToolConfig('hammer', '2.1.0', false);
    
    console.log(wrench);
    console.log('');
    console.log(hammer);
    console.log('');
  }
  
  private demonstratePerformanceMonitoring(): void {
    console.log('⚡ PERFORMANCE MONITORING DEMONSTRATION');
    console.log('─'.repeat(45));
    
    const stats = InspectionStats.getInstance();
    
    // Simulate some inspections
    const testObjects = [
      new ScopeInspectable('TEST', 'test.com', 'test', ['TEST'], { maxConnections: 1 }, {}),
      new ConnectionStatsInspectable('test.com', 1, 0, 10, 50.0, 0, new Date()),
      new SecurityCheckInspectable('Test', 'PASS', 'Test passed'),
    ];
    
    testObjects.forEach((obj, index) => {
      const startTime = Date.now();
      
      // Simulate inspection work
      console.log(`🔍 Inspecting object ${index + 1}...`);
      console.log(obj[Symbol.for("Bun.inspect.custom")]());
      
      const duration = Date.now() - startTime;
      stats.recordInspection(obj, duration, false);
    });
    
    console.log('');
    console.log('📊 Performance Statistics:');
    stats.printStats();
    console.log('');
  }
}

// Main execution
async function runCustomInspectionDemo(): Promise<void> {
  const demo = new CustomInspectionDemo();
  
  try {
    await demo.runCompleteDemo();
    
    console.log('🎉 Custom Inspection System v1.0 Demo Summary');
    console.log('='.repeat(55));
    console.log('');
    console.log('✅ Features Demonstrated:');
    console.log('   🏢 Scope inspection with feature flags and stats');
    console.log('   🔗 Connection statistics with utilization bars');
    console.log('   🛡️ Security checks with status indicators');
    console.log('   🗄️ Database connection pool monitoring');
    console.log('   💳 Payment request tracking');
    console.log('   👥 Family member management with trust scores');
    console.log('   📝 List formatting with numbered bullets');
    console.log('   📋 Summary cards with boxed layout');
    console.log('   🎨 Custom decorators for automatic inspection');
    console.log('   ⚡ Performance monitoring and statistics');
    console.log('');
    console.log('🎯 Key Benefits:');
    console.log('   • Beautiful visual output with emojis and colors');
    console.log('   • Type-safe inspection with TypeScript');
    console.log('   • Performance optimized with sub-millisecond times');
    console.log('   • Extensible architecture for custom types');
    console.log('   • Integration ready with existing systems');
    console.log('   • Unicode-safe text handling');
    console.log('   • Built-in benchmarking and monitoring');
    console.log('');
    console.log('🚀 Production Ready! 🎉');
    
  } catch (error) {
    console.error('❌ Custom inspection demo failed to complete:', error);
    process.exit(1);
  }
}

// Execute demo if run directly
if (import.meta.main) {
  runCustomInspectionDemo();
}

export { CustomInspectionDemo, runCustomInspectionDemo };

import {
  ScopeInspectable,
  ConnectionStatsInspectable,
  SecurityCheckInspectable,
  DatabaseConnectionInspectable,
  PaymentRequestInspectable,
  FamilyMemberInspectable,
  InspectionUtils,
  InspectableClass,
  INSPECT_CUSTOM
} from '../ecosystem/inspect-custom';

export function demonstrateInspection() {
  console.log('\n🎨 CUSTOM INSPECTION DEMONSTRATION\n');
  
  // 1. Scope Inspection
  const scope = new ScopeInspectable(
    'ENTERPRISE',
    'apple.factory-wager.com',
    'macOS',
    ['PREMIUM', 'TERMINAL_PTY', 'ADVANCED_CONNECTIONS'],
    { maxConnections: 10, keepAlive: true, timeout: 15000 },
    { activeConnections: 3, totalRequests: 150, averageResponseTime: 245.67 }
  );
  
  console.log(scope);
  console.log('');
  
  // 2. Connection Stats
  const stats = new ConnectionStatsInspectable(
    'api.example.com',
    5,
    2,
    1250,
    245.67,
    3,
    new Date()
  );
  
  console.log(stats);
  console.log('');
  
  // 3. Security Check
  const securityCheck = new SecurityCheckInspectable(
    'CORS Policy Validation',
    'FAIL',
    'Zero-width character in origin',
    { uri: 'https%3A%2F%2Fex\u200Bample.com', severity: 'high' }
  );
  
  console.log(securityCheck);
  console.log('');
  
  // 4. Payment Request
  const payment = new PaymentRequestInspectable(
    'txn_789012',
    'Alice Johnson',
    'Bob Smith',
    25.00,
    '$',
    'pending',
    new Date(),
    'venmo',
    { note: 'BBQ supplies', fees: 0.25 }
  );
  
  console.log(payment);
  console.log('');
  
  // 5. Family Member
  const familyMember = new FamilyMemberInspectable(
    'user_123',
    'Sarah',
    'guest',
    true,
    25.00,
    30.00,
    45,
    50
  );
  
  console.log(familyMember);
  console.log('');
  
  // 6. Table Formatting
  const connections = [
    new ConnectionStatsInspectable('api.service1.com', 2, 5, 450, 120.5, 1, new Date()),
    new ConnectionStatsInspectable('api.service2.com', 8, 2, 1200, 89.3, 0, new Date()),
    new ConnectionStatsInspectable('api.service3.com', 0, 10, 300, 210.8, 5, new Date()),
  ];
  
  console.log(InspectionUtils.formatList(connections));
  console.log('');
  
  console.log(InspectionUtils.createSummaryCard('Connection Summary', connections));
}

// ============================================
// DECORATOR EXAMPLES
// ============================================

@InspectableClass('🏢', '\x1b[1;34m')
class EnterpriseConfigInspectable {
  constructor(
    public maxUsers: number,
    public s3Bucket: string,
    public enableAudit: boolean,
    public retentionDays: number
  ) {}
}

@InspectableClass('🔐', '\x1b[1;35m')
class SecurityConfigInspectable {
  constructor(
    public encryptionEnabled: boolean,
    public keyRotationDays: number,
    public mfaRequired: boolean,
    public auditLogRetention: number
  ) {}
}

export function demonstrateDecoratorUsage() {
  console.log('\n🎨 DECORATOR DEMONSTRATION\n');
  
  const enterpriseConfig = new EnterpriseConfigInspectable(
    1000,
    'duoplus-enterprise',
    true,
    365
  );
  
  console.log(enterpriseConfig);
  console.log('');
  
  const securityConfig = new SecurityConfigInspectable(
    true,
    90,
    true,
    2555
  );
  
  console.log(securityConfig);
  console.log('');
}

// ============================================
// ADVANCED EXAMPLES
// ============================================

export function demonstrateAdvancedUsage() {
  console.log('\n🎨 ADVANCED INSPECTION EXAMPLES\n');
  
  // Complex security audit
  const securityChecks = [
    new SecurityCheckInspectable('TLS Certificate', 'PASS', 'Certificate valid and not expired'),
    new SecurityCheckInspectable('CORS Policy', 'FAIL', 'Zero-width character in origin', { 
      uri: 'https%3A%2F%2Fex\u200Bample.com', 
      severity: 'high' 
    }),
    new SecurityCheckInspectable('Rate Limiting', 'WARN', 'Rate limit threshold exceeded', {
      current: 150,
      limit: 100,
      window: '5m'
    }),
    new SecurityCheckInspectable('Authentication', 'PASS', 'All auth methods functional'),
  ];
  
  console.log('🔒 SECURITY AUDIT RESULTS');
  console.log('═'.repeat(60));
  securityChecks.forEach((check, index) => {
    console.log(check);
    if (index < securityChecks.length - 1) console.log('');
  });
  
  console.log('');
  console.log(InspectionUtils.createSummaryCard('Security Audit Summary', securityChecks));
  console.log('');
  
  // Database cluster status
  const databaseConnections = [
    new DatabaseConnectionInspectable('primary-db-01', 'connected', 20, 8, 12, 0),
    new DatabaseConnectionInspectable('replica-db-01', 'connected', 15, 3, 12, 0),
    new DatabaseConnectionInspectable('cache-db-01', 'connecting', 10, 0, 10, 5),
    new DatabaseConnectionInspectable('analytics-db-01', 'error', 25, 0, 0, 15),
  ];
  
  console.log('🗄️ DATABASE CLUSTER STATUS');
  console.log('═'.repeat(60));
  databaseConnections.forEach((db, index) => {
    console.log(db);
    if (index < databaseConnections.length - 1) console.log('');
  });
  
  console.log('');
  console.log(InspectionUtils.createSummaryCard('Database Cluster Summary', databaseConnections));
  console.log('');
  
  // Payment workflow tracking
  const payments = [
    new PaymentRequestInspectable(
      'txn_001', 'Alice', 'Bob', 25.00, '$', 'completed', 
      new Date(Date.now() - 3600000), 'venmo', { note: 'Lunch' }
    ),
    new PaymentRequestInspectable(
      'txn_002', 'Charlie', 'Dana', 150.00, '$', 'pending',
      new Date(), 'cashapp', { note: 'Rent split', fees: 1.50 }
    ),
    new PaymentRequestInspectable(
      'txn_003', 'Eve', 'Frank', 75.50, '$', 'failed',
      new Date(Date.now() - 7200000), 'paypal', { note: 'Gift' }
    ),
  ];
  
  console.log('💰 PAYMENT WORKFLOW TRACKING');
  console.log('═'.repeat(60));
  console.log(InspectionUtils.formatList(payments));
  console.log('');
  
  // Family group management
  const familyMembers = [
    new FamilyMemberInspectable('user_host', 'Mike', 'host', true, 0, 500, 95, 1000),
    new FamilyMemberInspectable('user_cousin1', 'Sarah', 'cousin', true, 125, 100, 75, 200),
    new FamilyMemberInspectable('user_cousin2', 'Tom', 'cousin', false, 50, 0, 60, 150),
    new FamilyMemberInspectable('user_guest1', 'Lisa', 'guest', true, 25, 50, 85, 100),
    new FamilyMemberInspectable('user_friend1', 'John', 'friend', false, 0, 30, 70),
  ];
  
  console.log('👨‍👩‍👧‍👦 FAMILY GROUP MANAGEMENT');
  console.log('═'.repeat(60));
  console.log(InspectionUtils.formatList(familyMembers));
  console.log('');
  
  console.log(InspectionUtils.createSummaryCard('Family Group Summary', familyMembers));
}

// ============================================
// PERFORMANCE BENCHMARKING
// ============================================

export function benchmarkInspection() {
  console.log('\n⚡ INSPECTION PERFORMANCE BENCHMARK\n');
  
  const iterations = 1000;
  const testObjects = [
    new ScopeInspectable('ENTERPRISE', 'test.com', 'macOS', ['TEST'], {}, {}),
    new ConnectionStatsInspectable('test.com', 5, 5, 100, 100, 0, new Date()),
    new SecurityCheckInspectable('Test', 'PASS', 'Test message'),
    new PaymentRequestInspectable('txn_test', 'A', 'B', 10, '$', 'pending', new Date()),
    new FamilyMemberInspectable('user_test', 'Test', 'guest', true, 0, 0, 50),
  ];
  
  console.log(`Running ${iterations} iterations per object type...`);
  
  testObjects.forEach((obj, index) => {
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      obj[INSPECT_CUSTOM]();
    }
    
    const end = performance.now();
    const avgTime = (end - start) / iterations;
    const className = obj.constructor.name.replace('Inspectable', '');
    
    console.log(`${className.padEnd(20)}: ${avgTime.toFixed(4)}ms avg (${(end - start).toFixed(2)}ms total)`);
  });
}

// ============================================
// MAIN DEMO FUNCTION
// ============================================

export function runAllDemos() {
  demonstrateInspection();
  demonstrateDecoratorUsage();
  demonstrateAdvancedUsage();
  benchmarkInspection();
}

// Run demos if this file is executed directly
if (import.meta.main) {
  runAllDemos();
}

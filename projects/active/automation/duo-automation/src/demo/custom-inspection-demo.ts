// src/demo/custom-inspection-demo.ts
/**
 * 🔍 Custom Inspection System Demo
 * 
 * Demonstrates the SecurityCheckInspectable and PaymentRequestInspectable classes
 * with their custom [Symbol.for('Bun.inspect.custom')] implementations.
 */

import { SecurityCheckInspectable, PaymentRequestInspectable, INSPECT_CUSTOM } from '../../ecosystem/inspect-custom.ts';

console.info('🔍 CUSTOM INSPECTION SYSTEM DEMO');
console.info('='.repeat(50));

// Demo 1: Security Check with Zero-Width Characters
console.info('\n🛡️  SECURITY CHECK INSPECTION');
console.info('-'.repeat(30));

const securityCheck = new SecurityCheckInspectable(
  'CORS Test',
  'FAIL',
  'Invalid origin',
  { 
    uri: 'https://ex\u200Bample.com',
    method: 'POST',
    headers: {
      'origin': 'https://evil.com',
      'user-agent': 'Mozilla/5.0...'
    }
  }
);

console.info(securityCheck[INSPECT_CUSTOM]());

// Demo 2: Payment Request Inspection
console.info('\n💰 PAYMENT REQUEST INSPECTION');
console.info('-'.repeat(30));

const payment = new PaymentRequestInspectable(
  'test_123',
  'Alice',
  'Bob',
  100.50,
  '€',
  'completed',
  new Date(),
  'venmo',
  {
    note: 'Dinner split',
    fees: 2.50
  }
);

console.info(payment[INSPECT_CUSTOM]());

// Demo 3: Multiple Security Checks
console.info('\n🔍 MULTIPLE SECURITY CHECKS');
console.info('-'.repeat(30));

const securityChecks = [
  new SecurityCheckInspectable('SQL Injection', 'PASS', 'No SQL patterns detected'),
  new SecurityCheckInspectable('XSS Protection', 'WARN', 'Potential XSS in user input', { input: '<script>alert("xss")</script>' }),
  new SecurityCheckInspectable('Rate Limiting', 'FAIL', 'Rate limit exceeded', { ip: '192.168.1.100', requests: 1000 }),
  new SecurityCheckInspectable('Authentication', 'PASS', 'JWT token valid'),
];

securityChecks.forEach((check, index) => {
  console.info(`\n${index + 1}. ${check[INSPECT_CUSTOM]()}`);
});

// Demo 4: Payment History
console.info('\n💳 PAYMENT HISTORY');
console.info('-'.repeat(30));

const payments = [
  new PaymentRequestInspectable('pay_001', 'Alice', 'Bob', 25.00, '$', 'completed', new Date(Date.now() - 86400000), 'cashapp'),
  new PaymentRequestInspectable('pay_002', 'Charlie', 'Alice', 50.00, '$', 'pending', new Date(), 'paypal'),
  new PaymentRequestInspectable('pay_003', 'Diana', 'Eve', 75.50, '€', 'failed', new Date(Date.now() - 172800000), 'bank_transfer'),
];

payments.forEach((payment, index) => {
  console.info(`\n${index + 1}. ${payment[INSPECT_CUSTOM]()}`);
});

console.info('\n✅ Custom Inspection Demo Complete!');
console.info('\n🎯 Key Features Demonstrated:');
console.info('  • Security checks with zero-width character detection (Ⓩ)');
console.info('  • Payment requests with currency formatting');
console.info('  • Status indicators and color coding');
console.info('  • Detailed metadata display');
console.info('  • Method-specific emojis and formatting');

if (import.meta.main) {
  // Demo completed
}

// tests/inspect-custom.test.ts
import { describe, expect, test } from 'bun:test';
import { SecurityCheckInspectable, PaymentRequestInspectable, INSPECT_CUSTOM } from '../ecosystem/inspect-custom';

describe('Custom Inspection', () => {
  test('Security check shows zero-width warning', () => {
    const check = new SecurityCheckInspectable(
      'CORS Test',
      'FAIL',
      'Invalid origin',
      { uri: 'https://ex\u200Bample.com' }
    );
    
    const output = check[INSPECT_CUSTOM]();
    expect(output).toContain('Ⓩ'); // Zero-width indicator
  });
  
  test('Payment formatting includes currency', () => {
    const payment = new PaymentRequestInspectable(
      'test_123',
      'Alice',
      'Bob',
      100.50,
      '€',
      'completed',
      new Date()
    );
    
    const output = payment[INSPECT_CUSTOM]();
    expect(output).toContain('€100.50');
  });
});

// tests/batch-inspection.test.ts
import { describe, expect, test } from 'bun:test';
import {
  SecurityCheckInspectable,
  PaymentRequestInspectable,
  InspectionUtils,
  INSPECT_CUSTOM
} from '../runtime/inspect-custom.ts';

describe('Batch Inspection', () => {
  test('batchInspect processes multiple objects efficiently', () => {
    const items = [
      new SecurityCheckInspectable('Test 1', 'PASS', 'All good'),
      new SecurityCheckInspectable('Test 2', 'FAIL', 'Issue found'),
      new PaymentRequestInspectable('pay_1', 'Alice', 'Bob', 25.00, '$', 'completed', new Date())
    ];

    const result = InspectionUtils.batchInspect(items);
    
    expect(result).toContain('Test 1');
    expect(result).toContain('Test 2');
    expect(result).toContain('pay_1');
    expect(result).toContain('---'); // Separator between items
    expect(result.split('---')).toHaveLength(3);
  });

  test('batchInspect handles empty array', () => {
    const result = InspectionUtils.batchInspect([]);
    expect(result).toBe('');
  });

  test('batchInspect handles single item', () => {
    const item = new SecurityCheckInspectable('Single', 'PASS', 'Only one');
    const result = InspectionUtils.batchInspect([item]);
    
    expect(result).toContain('Single');
    expect(result).not.toContain('---');
  });

  test('batchInspect processes mixed object types', () => {
    const items = [
      new SecurityCheckInspectable('Security', 'WARN', 'Warning'),
      new PaymentRequestInspectable('pay_mix', 'User', 'Merchant', 50.00, '€', 'pending', new Date()),
      new SecurityCheckInspectable('Security 2', 'PASS', 'All good')
    ];

    const result = InspectionUtils.batchInspect(items);
    const lines = result.split('---');
    
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Security');
    expect(lines[1]).toContain('pay_mix');
    expect(lines[2]).toContain('Security 2');
  });

  test('batchInspect maintains object order', () => {
    const items = [
      new SecurityCheckInspectable('First', 'PASS', 'First item'),
      new SecurityCheckInspectable('Second', 'PASS', 'Second item'),
      new SecurityCheckInspectable('Third', 'PASS', 'Third item')
    ];

    const result = InspectionUtils.batchInspect(items);
    const lines = result.split('---');
    
    expect(lines[0]).toContain('First');
    expect(lines[1]).toContain('Second');
    expect(lines[2]).toContain('Third');
  });

  test('batchInspect with zero-width characters', () => {
    const item = new SecurityCheckInspectable(
      'ZWS Test',
      'FAIL',
      'Hidden chars',
      { uri: 'https://ex\u200Bample.com' }
    );

    const result = InspectionUtils.batchInspect([item]);
    expect(result).toContain('Ⓩ'); // Zero-width indicator
  });

  test('batchInspect with currency formatting', () => {
    const payment = new PaymentRequestInspectable(
      'pay_currency',
      'Alice',
      'Bob',
      100.50,
      '€',
      'completed',
      new Date()
    );

    const result = InspectionUtils.batchInspect([payment]);
    expect(result).toContain('€100.50');
  });

  test('batchInspect performance with large dataset', () => {
    const items = [];
    
    // Create 100 items
    for (let i = 0; i < 100; i++) {
      items.push(new SecurityCheckInspectable(
        `Item ${i}`,
        i % 2 === 0 ? 'PASS' : 'FAIL',
        `Description ${i}`
      ));
    }

    const startTime = performance.now();
    const result = InspectionUtils.batchInspect(items);
    const endTime = performance.now();

    expect(result.split('---')).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(100); // Should process quickly
  });
});

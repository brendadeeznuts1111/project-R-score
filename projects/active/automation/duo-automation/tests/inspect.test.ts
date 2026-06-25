import { describe, it, expect, beforeEach } from 'bun:test';
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

describe('Custom Inspection System', () => {
  describe('ScopeInspectable', () => {
    it('should create a scope inspection with correct formatting', () => {
      const scope = new ScopeInspectable(
        'ENTERPRISE',
        'apple.factory-wager.com',
        'macOS',
        ['PREMIUM', 'TERMINAL_PTY'],
        { maxConnections: 10, keepAlive: true, timeout: 15000 },
        { activeConnections: 3, totalRequests: 150, averageResponseTime: 245.67 }
      );
      
      const inspection = scope[INSPECT_CUSTOM]();
      
      expect(inspection).toContain('ENTERPRISE SCOPE');
      expect(inspection).toContain('apple.factory-wager.com');
      expect(inspection).toContain('macOS');
      expect(inspection).toContain('PREMIUM');
      expect(inspection).toContain('TERMINAL_PTY');
      expect(inspection).toContain('10 max');
      expect(inspection).toContain('keep-alive');
      expect(inspection).toContain('15000ms');
      expect(inspection).toContain('Active: 3');
      expect(inspection).toContain('Total:  150');
      expect(inspection).toContain('245.67ms');
    });
    
    it('should use correct emoji and color for each scope type', () => {
      const enterprise = new ScopeInspectable('ENTERPRISE', '', '', [], {}, {});
      const development = new ScopeInspectable('DEVELOPMENT', '', '', [], {}, {});
      const local = new ScopeInspectable('LOCAL_SANDBOX', '', '', [], {}, {});
      const global = new ScopeInspectable('GLOBAL', '', '', [], {}, {});
      
      expect(enterprise[INSPECT_CUSTOM]()).toContain('🏢');
      expect(development[INSPECT_CUSTOM]()).toContain('🔧');
      expect(local[INSPECT_CUSTOM]()).toContain('🏠');
      expect(global[INSPECT_CUSTOM]()).toContain('🌐');
    });
  });
  
  describe('ConnectionStatsInspectable', () => {
    it('should format connection statistics correctly', () => {
      const stats = new ConnectionStatsInspectable(
        'api.example.com',
        5,
        2,
        1250,
        245.67,
        3,
        new Date('2023-01-01')
      );
      
      const inspection = stats[INSPECT_CUSTOM]();
      
      expect(inspection).toContain('api.example.com');
      expect(inspection).toContain('Active:    5');
      expect(inspection).toContain('Idle:      2');
      expect(inspection).toContain('Total:   1250');
      expect(inspection).toContain('245.67ms');
      expect(inspection).toContain('Failures:  3');
      expect(inspection).toContain('Utilization:');
    });
    
    it('should show correct status indicators', () => {
      const critical = new ConnectionStatsInspectable('test.com', 1, 0, 100, 100, 10, new Date());
      const warning = new ConnectionStatsInspectable('test.com', 1, 0, 100, 100, 3, new Date());
      const active = new ConnectionStatsInspectable('test.com', 5, 2, 100, 100, 0, new Date());
      const idle = new ConnectionStatsInspectable('test.com', 0, 5, 100, 100, 0, new Date());
      
      expect(critical[INSPECT_CUSTOM]()).toContain('🔴');
      expect(warning[INSPECT_CUSTOM]()).toContain('🟡');
      expect(active[INSPECT_CUSTOM]()).toContain('🟢');
      expect(idle[INSPECT_CUSTOM]()).toContain('⚪');
    });
  });
  
  describe('SecurityCheckInspectable', () => {
    it('should format security checks with status indicators', () => {
      const passCheck = new SecurityCheckInspectable('TLS Certificate', 'PASS', 'Certificate is valid');
      const failCheck = new SecurityCheckInspectable('CORS Policy', 'FAIL', 'Invalid origin');
      const warnCheck = new SecurityCheckInspectable('Rate Limit', 'WARN', 'Threshold exceeded');
      
      expect(passCheck[INSPECT_CUSTOM]()).toContain('✅');
      expect(passCheck[INSPECT_CUSTOM]()).toContain('Certificate is valid');
      expect(failCheck[INSPECT_CUSTOM]()).toContain('❌');
      expect(failCheck[INSPECT_CUSTOM]()).toContain('Invalid origin');
      expect(warnCheck[INSPECT_CUSTOM]()).toContain('⚠️');
      expect(warnCheck[INSPECT_CUSTOM]()).toContain('Threshold exceeded');
    });
    
    it('should detect zero-width characters', () => {
      const checkWithZWC = new SecurityCheckInspectable(
        'Test',
        'FAIL',
        'Contains zero-width',
        { uri: 'https://ex\u200Bample.com' }
      );
      
      expect(checkWithZWC[INSPECT_CUSTOM]()).toContain('Ⓩ');
    });
  });
  
  describe('DatabaseConnectionInspectable', () => {
    it('should format database connection status', () => {
      const db = new DatabaseConnectionInspectable(
        'primary-db-01',
        'connected',
        20,
        8,
        12,
        0
      );
      
      const inspection = db[INSPECT_CUSTOM]();
      
      expect(inspection).toContain('primary-db-01');
      expect(inspection).toContain('connected');
      expect(inspection).toContain('8/20');
      expect(inspection).toContain('40.0%');
      expect(inspection).toContain('💤 Idle:      12');
      expect(inspection).toContain('⏳ Waiting:   0');
    });
    
    it('should show error state for failed connections', () => {
      const errorDb = new DatabaseConnectionInspectable(
        'error-db',
        'error',
        10,
        0,
        0,
        15
      );
      
      const inspection = errorDb[INSPECT_CUSTOM]();
      expect(inspection).toContain('🔥');
      expect(inspection).toContain('error');
      expect(inspection).toContain('Connection in error state');
    });
  });
  
  describe('PaymentRequestInspectable', () => {
    it('should format payment requests correctly', () => {
      const payment = new PaymentRequestInspectable(
        'txn_123',
        'Alice Johnson',
        'Bob Smith',
        25.00,
        '$',
        'pending',
        new Date('2023-01-01'),
        'venmo',
        { note: 'BBQ supplies', fees: 0.25 }
      );
      
      const inspection = payment[INSPECT_CUSTOM]();
      
      expect(inspection).toContain('txn_123');
      expect(inspection).toContain('Alice Johnson');
      expect(inspection).toContain('Bob Smith');
      expect(inspection).toContain('$25.00');
      expect(inspection).toContain('pending');
      expect(inspection).toContain('venmo');
      expect(inspection).toContain('BBQ supplies');
      expect(inspection).toContain('$0.25');
    });
    
    it('should use correct method emojis', () => {
      const venmo = new PaymentRequestInspectable('1', 'A', 'B', 10, '$', 'pending', new Date(), 'venmo');
      const cashapp = new PaymentRequestInspectable('2', 'A', 'B', 10, '$', 'pending', new Date(), 'cashapp');
      const paypal = new PaymentRequestInspectable('3', 'A', 'B', 10, '$', 'pending', new Date(), 'paypal');
      
      expect(venmo[INSPECT_CUSTOM]()).toContain('💚');
      expect(cashapp[INSPECT_CUSTOM]()).toContain('💵');
      expect(paypal[INSPECT_CUSTOM]()).toContain('🔵');
    });
  });
  
  describe('FamilyMemberInspectable', () => {
    it('should format family member information', () => {
      const member = new FamilyMemberInspectable(
        'user_123',
        'Sarah',
        'guest',
        true,
        25.00,
        30.00,
        45,
        50
      );
      
      const inspection = member[INSPECT_CUSTOM]();
      
      expect(inspection).toContain('Sarah');
      expect(inspection).toContain('guest');
      expect(inspection).toContain('🟢 Online');
      expect(inspection).toContain('Trust:     \x1b[31m45\x1b[0m / 100');
      expect(inspection).toContain('Owes:      \x1b[31m$25.00\x1b[0m');
      expect(inspection).toContain('Paid:      \x1b[32m$30.00\x1b[0m');
      expect(inspection).toContain('└─ Limit:     \x1b[32m[█████░░░░░]\x1b[0m $50');
    });
    
    it('should show balance when no limit is set', () => {
      const member = new FamilyMemberInspectable(
        'user_456',
        'Tom',
        'friend',
        false,
        10,
        25,
        70
      );
      
      const inspection = member[INSPECT_CUSTOM]();
      expect(inspection).toContain('└─ Balance:   $15.00');
      expect(inspection).toContain('⚪ Offline');
    });
  });
  
  describe('InspectionUtils', () => {
    it('should format list of inspectable items', () => {
      const items = [
        new SecurityCheckInspectable('Test 1', 'PASS', 'Good'),
        new SecurityCheckInspectable('Test 2', 'FAIL', 'Bad'),
      ];
      
      const formatted = InspectionUtils.formatList(items);
      
      expect(formatted).toContain('1.');
      expect(formatted).toContain('2.');
      expect(formatted).toContain('Test 1');
      expect(formatted).toContain('Test 2');
    });
    
    it('should handle empty list', () => {
      const formatted = InspectionUtils.formatList([]);
      expect(formatted).toBe('📭 No items');
    });
    
    it('should create summary card', () => {
      const items = [
        new SecurityCheckInspectable('Test 1', 'PASS', 'Good'),
        new ConnectionStatsInspectable('test.com', 1, 1, 10, 100, 0, new Date()),
      ];
      
      const card = InspectionUtils.createSummaryCard('Test Summary', items);
      
      expect(card).toContain('Test Summary');
      expect(card).toContain('SecurityCheck: 1');
      expect(card).toContain('ConnectionStats: 1');
      expect(card).toContain('┌');
      expect(card).toContain('└');
    });
  });
  
  describe('InspectableClass Decorator', () => {
    it('should create inspectable class with decorator', () => {
      @InspectableClass('🏢', '\x1b[1;34m')
      class TestConfig {
        constructor(
          public name: string,
          public value: number,
          public enabled: boolean
        ) {}
      }
      
      const config = new TestConfig('test', 42, true);
      const inspection = config[INSPECT_CUSTOM]();
      
      expect(inspection).toContain('🏢');
      expect(inspection).toContain('TestConfig');
      expect(inspection).toContain('name           : "test"');
      expect(inspection).toContain('value          : 42');
      expect(inspection).toContain('enabled        : ✅ true');
    });
  });
  
  describe('Performance Tests', () => {
    it('should handle large numbers of inspections efficiently', () => {
      const items = Array.from({ length: 100 }, (_, i) => 
        new SecurityCheckInspectable(`Test ${i}`, 'PASS', `Message ${i}`)
      );
      
      const start = performance.now();
      
      items.forEach(item => item[INSPECT_CUSTOM]());
      
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / items.length;
      
      // Should average less than 1ms per inspection
      expect(avgTime).toBeLessThan(1);
      expect(totalTime).toBeLessThan(100); // Total should be under 100ms
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle null/undefined values gracefully', () => {
      const scope = new ScopeInspectable(
        'TEST',
        '',
        '',
        [],
        { maxConnections: 0, keepAlive: false, timeout: 0 },
        null
      );
      
      const inspection = scope[INSPECT_CUSTOM]();
      expect(inspection).toContain('TEST SCOPE');
      expect(inspection).toContain('🚩 Features (0):');
    });
    
    it('should handle very long strings by truncating', () => {
      const longHost = 'a'.repeat(100) + '.com';
      const stats = new ConnectionStatsInspectable(longHost, 1, 1, 10, 100, 0, new Date());
      
      const inspection = stats[INSPECT_CUSTOM]();
      expect(inspection).toContain('...');
      expect(inspection.length).toBeLessThan(200);
    });
    
    it('should handle zero division in utilization calculations', () => {
      const stats = new ConnectionStatsInspectable('test.com', 0, 0, 0, 0, 0, new Date());
      const inspection = stats[INSPECT_CUSTOM]();
      
      expect(inspection).toContain('0.0%');
    });
  });
});

#!/usr/bin/env bun

/**
 * 🧪 Timestamp Utility Tests
 * Tests the enhanced timestamp utilities with various formats
 */

import { describe, test, expect } from 'bun:test';
import {
  TimestampUtils,
  parseTimestamp,
  validateTimestamp,
  formatTimestamp,
} from '../../../src/utils/timestamp-utils';

describe('TimestampUtils', () => {
  describe('parseTimestamp', () => {
    test('should parse custom format timestamp correctly', () => {
      const timestamp = '2025-08-25 20:05:00.000';
      const result = parseTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('CUSTOM');
      expect(result.components.year).toBe(2025);
      expect(result.components.month).toBe(8);
      expect(result.components.day).toBe(25);
      expect(result.components.hour).toBe(20);
      expect(result.components.minute).toBe(5);
      expect(result.components.second).toBe(0);
      expect(result.components.millisecond).toBe(0);
    });

    test('should parse ISO format timestamp correctly', () => {
      const timestamp = '2025-08-25T20:05:00.000Z';
      const result = parseTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('ISO');
    });

    test('should parse date-only format correctly', () => {
      const timestamp = '2025-08-25';
      const result = parseTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('DATE_ONLY');
    });

    test('should parse time-only format correctly', () => {
      const timestamp = '20:05:00.000';
      const result = parseTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('TIME_ONLY');
    });

    test('should parse Unix timestamp correctly', () => {
      const timestamp = '1754004300';
      const result = parseTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('UNIX');
    });

    test('should handle invalid timestamp gracefully', () => {
      const timestamp = 'invalid-timestamp';
      const result = parseTimestamp(timestamp);

      expect(result.isValid).toBe(false);
      expect(result.format).toBe('FALLBACK');
    });
  });

  describe('validateTimestamp', () => {
    test('should validate custom format timestamp correctly', () => {
      const timestamp = '2025-08-25 20:05:00.000';
      const result = validateTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('CUSTOM');
      expect(result.errors).toHaveLength(0);
    });

    test('should detect future timestamp warnings', () => {
      const timestamp = '2030-08-25 20:05:00.000';
      const result = validateTimestamp(timestamp);

      expect(result.isValid).toBe(true);
      // Should have warning about future date
      expect(result.warnings.some(w => w.includes('future'))).toBe(true);
    });
  });

  describe('formatTimestamp', () => {
    test('should format timestamp in different output formats', () => {
      const timestamp = '2025-08-25 20:05:00.000';

      const iso = formatTimestamp(timestamp, 'iso');
      const human = formatTimestamp(timestamp, 'human');
      const custom = formatTimestamp(timestamp, 'custom');
      const unix = formatTimestamp(timestamp, 'unix');
      const relative = formatTimestamp(timestamp, 'relative');

      expect(iso).toContain('2025-08-25T');
      expect(human).toContain('8/25/2025');
      expect(custom).toBe('2025-08-25 20:05:00.000');
      expect(unix).toMatch(/^\d+$/);
      // Since this timestamp is now in the past, it should contain "ago" not "in"
      expect(relative).toContain('ago');
    });
  });

  describe('convertFormat', () => {
    test('should convert between different formats', () => {
      const timestamp = '2025-08-25 20:05:00.000';

      const iso = TimestampUtils.convertFormat(timestamp, 'iso');
      const unix = TimestampUtils.convertFormat(timestamp, 'unix');
      const rfc2822 = TimestampUtils.convertFormat(timestamp, 'rfc2822');

      expect(iso).toContain('2025-08-25T');
      expect(unix).toMatch(/^\d+$/);
      expect(rfc2822).toContain('Mon, 25 Aug 2025');
    });
  });

  describe('time calculations', () => {
    test('should detect future timestamps correctly', () => {
      const futureTimestamp = '2030-08-25 20:05:00.000';
      const pastTimestamp = '2020-01-01 12:00:00.000';

      expect(TimestampUtils.isFuture(futureTimestamp)).toBe(true);
      expect(TimestampUtils.isPast(pastTimestamp)).toBe(true);
    });

    test('should calculate time differences correctly', () => {
      const start = '2025-08-25 20:05:00.000';
      const end = '2025-08-26 20:05:00.000';

      const diff = TimestampUtils.getTimeDifference(start, end);

      expect(diff.days).toBe(1);
      expect(diff.hours).toBe(0); // 24 hours = 1 day, so hours should be 0
      expect(diff.minutes).toBe(0);
      expect(diff.humanReadable).toContain('1 day');
    });
  });

  describe('time manipulation', () => {
    test('should add time to timestamp correctly', () => {
      const timestamp = '2025-08-25 20:05:00.000';

      const oneHourLater = TimestampUtils.addTime(timestamp, 1, 'hours');
      const oneDayLater = TimestampUtils.addTime(timestamp, 1, 'days');

      expect(oneHourLater).toContain('2025-08-25T21:05:00');
      expect(oneDayLater).toContain('2025-08-26T20:05:00');
    });
  });

  describe('business hours calculation', () => {
    test('should calculate business hours correctly', () => {
      const start = '2025-08-25 09:00:00.000'; // Monday 9 AM
      const end = '2025-08-25 17:00:00.000'; // Monday 5 PM

      const businessHours = TimestampUtils.getBusinessHours(start, end);

      expect(businessHours).toBe(8); // 8 business hours
    });
  });

  describe('now function', () => {
    test('should return current timestamp in different formats', () => {
      const iso = TimestampUtils.now('iso');
      const custom = TimestampUtils.now('custom');
      const unix = TimestampUtils.now('unix');

      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(custom).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
      expect(unix).toMatch(/^\d+$/);
    });
  });
});

#!/usr/bin/env bun

/**
 * Validation System Unit Tests
 *
 * Comprehensive tests for input validation, sanitization, and edge cases
 */

import { describe, test, expect } from "bun:test";
import {
  Validator,
  InputSanitizer,
  validateRequest,
  validateR2Key,
  validateDomain,
  validateEvidenceId
} from '../lib/core/validation.ts';
import { ValidationError } from '../lib/core/error-handling.ts';

describe('InputSanitizer', () => {
  describe('sanitizeString', () => {
    test('should sanitize basic strings', () => {
      const result = InputSanitizer.sanitizeString('  Hello World  ');
      expect(result).toBe('Hello World');
    });

    test('should remove HTML tags', () => {
      const result = InputSanitizer.sanitizeString('<script>alert("xss")</script>Hello');
      expect(result).toBe('alert("xss")Hello');
    });

    test('should remove JavaScript protocols', () => {
      const result = InputSanitizer.sanitizeString('javascript:alert("xss")');
      expect(result).toBe('alert("xss")');
    });

    test('should remove data URLs', () => {
      const result = InputSanitizer.sanitizeString('data:text/html,<script>alert("xss")</script>');
      expect(result).toBe('text/html,<script>alert("xss")</script>');
    });

    test('should limit string length', () => {
      const longString = 'a'.repeat(2000);
      const result = InputSanitizer.sanitizeString(longString);
      expect(result.length).toBe(1000);
    });

    test('should handle non-string inputs', () => {
      expect(InputSanitizer.sanitizeString(123)).toBe('123');
      expect(InputSanitizer.sanitizeString(null)).toBe('');
      expect(InputSanitizer.sanitizeString(undefined)).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    test('should sanitize valid numbers', () => {
      expect(InputSanitizer.sanitizeNumber(42)).toBe(42);
      expect(InputSanitizer.sanitizeNumber('123')).toBe(123);
    });

    test('should handle invalid numbers', () => {
      expect(InputSanitizer.sanitizeNumber('invalid')).toBe(0);
      expect(InputSanitizer.sanitizeNumber(NaN)).toBe(0);
      expect(InputSanitizer.sanitizeNumber(null)).toBe(0);
    });
  });

  describe('sanitizeBoolean', () => {
    test('should sanitize boolean values', () => {
      expect(InputSanitizer.sanitizeBoolean(true)).toBe(true);
      expect(InputSanitizer.sanitizeBoolean(false)).toBe(false);
    });

    test('should sanitize string booleans', () => {
      expect(InputSanitizer.sanitizeBoolean('true')).toBe(true);
      expect(InputSanitizer.sanitizeBoolean('TRUE')).toBe(true);
      expect(InputSanitizer.sanitizeBoolean('false')).toBe(false);
      expect(InputSanitizer.sanitizeBoolean('FALSE')).toBe(false);
    });

    test('should sanitize other values', () => {
      expect(InputSanitizer.sanitizeBoolean(1)).toBe(true);
      expect(InputSanitizer.sanitizeBoolean('non-empty')).toBe(true);
      expect(InputSanitizer.sanitizeBoolean(0)).toBe(false);
      expect(InputSanitizer.sanitizeBoolean('')).toBe(false);
    });
  });

  describe('sanitizeArray', () => {
    test('should sanitize arrays', () => {
      const result = InputSanitizer.sanitizeArray([1, 2, null, undefined, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    test('should limit array size', () => {
      const largeArray = Array.from({ length: 200 }, (_, i) => i);
      const result = InputSanitizer.sanitizeArray(largeArray);
      expect(result.length).toBe(100);
    });

    test('should handle non-array inputs', () => {
      expect(InputSanitizer.sanitizeArray('not an array')).toEqual([]);
      expect(InputSanitizer.sanitizeArray(null)).toEqual([]);
    });
  });

  describe('sanitizeObject', () => {
    test('should sanitize objects', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = InputSanitizer.sanitizeObject(obj);
      expect(result).toEqual(obj);
    });

    test('should limit object size', () => {
      const largeObj = {};
      for (let i = 0; i < 100; i++) {
        largeObj[`key${i}`] = i;
      }
      const result = InputSanitizer.sanitizeObject(largeObj);
      expect(Object.keys(result).length <= 50).toBe(true);
    });

    test('should handle invalid inputs', () => {
      expect(InputSanitizer.sanitizeObject(null)).toEqual({});
      expect(InputSanitizer.sanitizeObject('not an object')).toEqual({});
      expect(InputSanitizer.sanitizeObject([])).toEqual({});
    });
  });
});

describe('Validator', () => {
  describe('string validator', () => {
    test('should validate required strings', () => {
      const validator = Validator.string({ required: true });

      const result1 = validator('hello');
      expect(result1.isValid).toBe(true);
      expect(result1.data).toBe('hello');

      const result2 = validator(null);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Field is required')).toBe(true);
    });

    test('should validate string length', () => {
      const validator = Validator.string({
        minLength: 3,
        maxLength: 10
      });

      const result1 = validator('hello');
      expect(result1.isValid).toBe(true);

      const result2 = validator('hi');
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Must be at least 3 characters')).toBe(true);

      const result3 = validator('this is too long');
      expect(result3.isValid).toBe(false);
      expect(result3.errors.includes('Must be no more than 10 characters')).toBe(true);
    });

    test('should validate patterns', () => {
      const validator = Validator.string({
        pattern: /^[a-z]+$/
      });

      const result1 = validator('hello');
      expect(result1.isValid).toBe(true);

      const result2 = validator('Hello123');
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Invalid format')).toBe(true);
    });

    test('should validate enums', () => {
      const validator = Validator.string({
        enum: ['red', 'green', 'blue']
      });

      const result1 = validator('red');
      expect(result1.isValid).toBe(true);

      const result2 = validator('yellow');
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Must be one of: red, green, blue')).toBe(true);
    });

    test('should sanitize when requested', () => {
      const validator = Validator.string({ sanitize: true });

      const result = validator('  <script>alert("xss")</script>hello  ');
      expect(result1.isValid).toBe(true);
      expect(result.data).toBe('alert("xss")hello');
      expect(result.warnings.includes('Input was sanitized')).toBe(true);
    });
  });

  describe('number validator', () => {
    test('should validate required numbers', () => {
      const validator = Validator.number({ required: true });

      const result1 = validator(42);
      expect(result1.isValid).toBe(true);
      expect(result1.data).toBe(42);

      const result2 = validator(null);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Field is required')).toBe(true);
    });

    test('should validate number ranges', () => {
      const validator = Validator.number({ min: 0, max: 100 });

      const result1 = validator(50);
      expect(result1.isValid).toBe(true);

      const result2 = validator(-10);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Must be at least 0')).toBe(true);

      const result3 = validator(150);
      expect(result3.isValid).toBe(false);
      expect(result3.errors.includes('Must be no more than 100')).toBe(true);
    });

    test('should validate integers', () => {
      const validator = Validator.number({ integer: true });

      const result1 = validator(42);
      expect(result1.isValid).toBe(true);

      const result2 = validator(3.14);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Must be an integer')).toBe(true);
    });

    test('should handle invalid numbers', () => {
      const validator = Validator.number();

      const result = validator('not a number');
      expect(result.isValid).toBe(false);
      expect(result.errors.includes('Must be a valid number')).toBe(true);
    });
  });

  describe('boolean validator', () => {
    test('should validate boolean values', () => {
      const validator = Validator.boolean();

      const result1 = validator(true);
      expect(result1.isValid).toBe(true);
      expect(result1.data).toBe(true);

      const result2 = validator(false);
      expect(result2.isValid).toBe(true);
      expect(result2.data).toBe(false);
    });

    test('should convert string booleans', () => {
      const validator = Validator.boolean();

      const result1 = validator('true');
      expect(result1.isValid).toBe(true);
      expect(result1.data).toBe(true);

      const result2 = validator('false');
      expect(result2.isValid).toBe(true);
      expect(result2.data).toBe(false);
    });
  });

  describe('array validator', () => {
    test('should validate arrays', () => {
      const stringValidator = Validator.string();
      const arrayValidator = Validator.array(stringValidator);

      const result1 = arrayValidator(['a', 'b', 'c']);
      expect(result1.isValid).toBe(true);
      expect(result1.data).toEqual(['a', 'b', 'c']);

      const result2 = arrayValidator('not an array');
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Must be an array')).toBe(true);
    });

    test('should validate array length', () => {
      const validator = Validator.array(Validator.string(), {
        minLength: 2,
        maxLength: 5
      });

      const result1 = validator(['a', 'b', 'c']);
      expect(result1.isValid).toBe(true);

      const result2 = validator(['a']);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Must have at least 2 items')).toBe(true);

      const result3 = validator(['a', 'b', 'c', 'd', 'e', 'f']);
      expect(result3.isValid).toBe(false);
      expect(result3.errors.includes('Must have no more than 5 items')).toBe(true);
    });

    test('should validate array items', () => {
      const stringValidator = Validator.string({ minLength: 3 });
      const arrayValidator = Validator.array(stringValidator);

      const result = arrayValidator(['ab', 'cde', 'f']);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Item 0'))).toBe(true);
    });
  });

  describe('object validator', () => {
    test('should validate objects', () => {
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', min: 0 },
        email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      };

      const validator = Validator.object(schema);

      const result1 = validator({
        name: 'John',
        age: 30,
        email: 'john@example.com'
      });
      expect(result1.isValid).toBe(true);

      const result2 = validator({
        age: -5,
        email: 'invalid-email'
      });
      expect(result2.isValid).toBe(false);
      expect(result2.errors.some(e => e.includes('name'))).toBe(true);
      expect(result2.errors.some(e => e.includes('age'))).toBe(true);
      expect(result2.errors.some(e => e.includes('email'))).toBe(true);
    });

    test('should handle missing required fields', () => {
      const schema = {
        required: { type: 'string', required: true },
        optional: { type: 'string' }
      };

      const validator = Validator.object(schema);

      const result = validator({ optional: 'value' });
      expect(result.isValid).toBe(false);
      expect(result.errors.includes('required: Field is required')).toBe(true);
    });
  });

  describe('custom validator', () => {
    test('should support custom validation logic', () => {
      const validator = Validator.custom((input) => {
        if (typeof input !== 'string' || !input.includes('@')) {
          return { isValid: false, error: 'Must contain @ symbol' };
        }
        return { isValid: true, data: input.toLowerCase() };
      });

      const result1 = validator('USER@EXAMPLE.COM');
      expect(result1.isValid).toBe(true);
      expect(result1.data).toBe('user@example.com');

      const result2 = validator('invalid');
      expect(result2.isValid).toBe(false);
      expect(result2.errors.includes('Must contain @ symbol')).toBe(true);
    });
  });
});

describe('Built-in Validators', () => {
  describe('validateR2Key', () => {
    test('should validate valid R2 keys', () => {
      const result1 = validateR2Key('valid-key-123');
      expect(result1.isValid).toBe(true);
      expect(result1.data).toBe('valid-key-123');

      const result2 = validateR2Key('path/to/object.json');
      expect(result1.isValid).toBe(true);
    });

    test('should reject invalid R2 keys', () => {
      const invalidKeys = [
        '',
        'a'.repeat(1025), // Too long
        '/starts-with-slash',
        'ends-with-slash/',
        'invalid<key',
        'key>with>brackets',
        'key|with|pipes'
      ];

      for (const key of invalidKeys) {
        const result = validateR2Key(key);
        expect(result.isValid).toBe(false);
      }
    });

    test('should reject non-string inputs', () => {
      const result = validateR2Key(123);
      expect(result.isValid).toBe(false);
      expect(result.errors.includes('R2 key must be a string')).toBe(true);
    });
  });

  describe('validateDomain', () => {
    test('should validate valid domains', () => {
      const validDomains = [
        'example.com',
        'sub.example.com',
        'test-site.co.uk',
        'a.b.c.d.e.f.g'
      ];

      for (const domain of validDomains) {
        const result = validateDomain(domain);
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid domains', () => {
      const invalidDomains = [
        '',
        'a', // Too short
        'a'.repeat(254), // Too long
        '-starts-with-hyphen.com',
        'ends-with-hyphen-.com',
        'invalid..domain.com',
        'domain with spaces.com',
        'domain.with_underscore.com'
      ];

      for (const domain of invalidDomains) {
        const result = validateDomain(domain);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('validateEvidenceId', () => {
    test('should validate valid evidence IDs', () => {
      const validIds = [
        'evidence-123',
        'evidence_456',
        'id123',
        'VALID-ID'
      ];

      for (const id of validIds) {
        const result = validateEvidenceId(id);
        expect(result.isValid).toBe(true);
      }
    });

    test('should reject invalid evidence IDs', () => {
      const invalidIds = [
        '',
        'a'.repeat(101), // Too long
        'id with spaces',
        'id.with.dots',
        'id/with/slashes',
        'id<with>brackets'
      ];

      for (const id of invalidIds) {
        const result = validateEvidenceId(id);
        expect(result.isValid).toBe(false);
      }
    });
  });
});

describe('validateRequest', () => {
  test('should validate valid request objects', () => {
    const validRequest = {
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json'
      },
      method: 'POST',
      url: '/api/test',
      body: { test: true }
    };

    expect(validateRequest(validRequest)).toBe(true);
  });

  test('should validate minimal request objects', () => {
    const minimalRequest = {};
    expect(validateRequest(minimalRequest)).toBe(true);
  });

  test('should reject invalid request objects', () => {
    const invalidRequests = [
      null,
      undefined,
      'string',
      123,
      [],
      new Date()
    ];

    for (const request of invalidRequests) {
      expect(validateRequest(request)).toBe(false);
    }
  });

  test('should handle request with invalid header types', () => {
    const requestWithInvalidHeaders = {
      headers: 'not an object'
    };

    expect(validateRequest(requestWithInvalidHeaders)).toBe(true);
  });
});

describe('Edge Cases', () => {
  test('should handle extreme values in string validation', () => {
    const validator = Validator.string({ maxLength: 10 });

    const result = validator('a'.repeat(1000));
    expect(result.isValid).toBe(false);
    expect(result.errors.includes('Must be no more than 10 characters')).toBe(true);
  });

  test('should handle NaN in number validation', () => {
    const validator = Validator.number();

    const result = validator(NaN);
    expect(result.isValid).toBe(false);
    expect(result.errors.includes('Must be a valid number')).toBe(true);
  });

  test('should handle infinite values in number validation', () => {
    const validator = Validator.number({ max: 100 });

    const result1 = validator(Infinity);
    expect(result1.isValid).toBe(false);

    const result2 = validator(-Infinity);
    expect(result2.isValid).toBe(false);
  });

  test('should handle circular references in object validation', () => {
    const validator = Validator.object({});

    const circular: any = { a: 1 };
    circular.self = circular;

    // Should not crash
    const result = validator(circular);
    expect(result.isValid).toBe(true);
  });

  test('should handle very deep nesting', () => {
    const validator = Validator.object({});

    // Create deeply nested object
    let deep: any = { value: 'deep' };
    for (let i = 0; i < 100; i++) {
      deep = { nested: deep };
    }

    // Should not crash
    const result = validator(deep);
    expect(result.isValid).toBe(true);
  });
});

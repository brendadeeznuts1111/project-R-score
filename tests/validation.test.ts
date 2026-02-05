#!/usr/bin/env bun

/**
 * 🧪 Validation System Unit Tests
 * 
 * Comprehensive tests for input validation, sanitization, and edge cases
 */

import { describe, it, testUtils } from '../lib/core/unit-test-framework.ts';
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
    it('should sanitize basic strings', (assert) => {
      const result = InputSanitizer.sanitizeString('  Hello World  ');
      assert.equal(result, 'Hello World');
    });

    it('should remove HTML tags', (assert) => {
      const result = InputSanitizer.sanitizeString('<script>alert("xss")</script>Hello');
      assert.equal(result, 'alert("xss")Hello');
    });

    it('should remove JavaScript protocols', (assert) => {
      const result = InputSanitizer.sanitizeString('javascript:alert("xss")');
      assert.equal(result, 'alert("xss")');
    });

    it('should remove data URLs', (assert) => {
      const result = InputSanitizer.sanitizeString('data:text/html,<script>alert("xss")</script>');
      assert.equal(result, 'text/html,<script>alert("xss")</script>');
    });

    it('should limit string length', (assert) => {
      const longString = 'a'.repeat(2000);
      const result = InputSanitizer.sanitizeString(longString);
      assert.equal(result.length, 1000);
    });

    it('should handle non-string inputs', (assert) => {
      assert.equal(InputSanitizer.sanitizeString(123), '123');
      assert.equal(InputSanitizer.sanitizeString(null), '');
      assert.equal(InputSanitizer.sanitizeString(undefined), '');
    });
  });

  describe('sanitizeNumber', () => {
    it('should sanitize valid numbers', (assert) => {
      assert.equal(InputSanitizer.sanitizeNumber(42), 42);
      assert.equal(InputSanitizer.sanitizeNumber('123'), 123);
    });

    it('should handle invalid numbers', (assert) => {
      assert.equal(InputSanitizer.sanitizeNumber('invalid'), 0);
      assert.equal(InputSanitizer.sanitizeNumber(NaN), 0);
      assert.equal(InputSanitizer.sanitizeNumber(null), 0);
    });
  });

  describe('sanitizeBoolean', () => {
    it('should sanitize boolean values', (assert) => {
      assert.isTrue(InputSanitizer.sanitizeBoolean(true));
      assert.isFalse(InputSanitizer.sanitizeBoolean(false));
    });

    it('should sanitize string booleans', (assert) => {
      assert.isTrue(InputSanitizer.sanitizeBoolean('true'));
      assert.isTrue(InputSanitizer.sanitizeBoolean('TRUE'));
      assert.isFalse(InputSanitizer.sanitizeBoolean('false'));
      assert.isFalse(InputSanitizer.sanitizeBoolean('FALSE'));
    });

    it('should sanitize other values', (assert) => {
      assert.isTrue(InputSanitizer.sanitizeBoolean(1));
      assert.isTrue(InputSanitizer.sanitizeBoolean('non-empty'));
      assert.isFalse(InputSanitizer.sanitizeBoolean(0));
      assert.isFalse(InputSanitizer.sanitizeBoolean(''));
    });
  });

  describe('sanitizeArray', (assert) => {
    it('should sanitize arrays', (assert) => {
      const result = InputSanitizer.sanitizeArray([1, 2, null, undefined, 3]);
      assert.deepEqual(result, [1, 2, 3]);
    });

    it('should limit array size', (assert) => {
      const largeArray = Array.from({ length: 200 }, (_, i) => i);
      const result = InputSanitizer.sanitizeArray(largeArray);
      assert.equal(result.length, 100);
    });

    it('should handle non-array inputs', (assert) => {
      assert.deepEqual(InputSanitizer.sanitizeArray('not an array'), []);
      assert.deepEqual(InputSanitizer.sanitizeArray(null), []);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize objects', (assert) => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = InputSanitizer.sanitizeObject(obj);
      assert.deepEqual(result, obj);
    });

    it('should limit object size', (assert) => {
      const largeObj = {};
      for (let i = 0; i < 100; i++) {
        largeObj[`key${i}`] = i;
      }
      const result = InputSanitizer.sanitizeObject(largeObj);
      assert.isTrue(Object.keys(result).length <= 50);
    });

    it('should handle invalid inputs', (assert) => {
      assert.deepEqual(InputSanitizer.sanitizeObject(null), {});
      assert.deepEqual(InputSanitizer.sanitizeObject('not an object'), {});
      assert.deepEqual(InputSanitizer.sanitizeObject([]), {});
    });
  });
});

describe('Validator', () => {
  describe('string validator', () => {
    it('should validate required strings', (assert) => {
      const validator = Validator.string({ required: true });
      
      const result1 = validator('hello');
      assert.isTrue(result1.isValid);
      assert.equal(result1.data, 'hello');
      
      const result2 = validator(null);
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Field is required'));
    });

    it('should validate string length', (assert) => {
      const validator = Validator.string({ 
        minLength: 3, 
        maxLength: 10 
      });
      
      const result1 = validator('hello');
      assert.isTrue(result1.isValid);
      
      const result2 = validator('hi');
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Must be at least 3 characters'));
      
      const result3 = validator('this is too long');
      assert.isFalse(result3.isValid);
      assert.isTrue(result3.errors.includes('Must be no more than 10 characters'));
    });

    it('should validate patterns', (assert) => {
      const validator = Validator.string({ 
        pattern: /^[a-z]+$/ 
      });
      
      const result1 = validator('hello');
      assert.isTrue(result1.isValid);
      
      const result2 = validator('Hello123');
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Invalid format'));
    });

    it('should validate enums', (assert) => {
      const validator = Validator.string({ 
        enum: ['red', 'green', 'blue'] 
      });
      
      const result1 = validator('red');
      assert.isTrue(result1.isValid);
      
      const result2 = validator('yellow');
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Must be one of: red, green, blue'));
    });

    it('should sanitize when requested', (assert) => {
      const validator = Validator.string({ sanitize: true });
      
      const result = validator('  <script>alert("xss")</script>hello  ');
      assert.isTrue(result1.isValid);
      assert.equal(result.data, 'alert("xss")hello');
      assert.isTrue(result.warnings.includes('Input was sanitized'));
    });
  });

  describe('number validator', () => {
    it('should validate required numbers', (assert) => {
      const validator = Validator.number({ required: true });
      
      const result1 = validator(42);
      assert.isTrue(result1.isValid);
      assert.equal(result1.data, 42);
      
      const result2 = validator(null);
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Field is required'));
    });

    it('should validate number ranges', (assert) => {
      const validator = Validator.number({ min: 0, max: 100 });
      
      const result1 = validator(50);
      assert.isTrue(result1.isValid);
      
      const result2 = validator(-10);
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Must be at least 0'));
      
      const result3 = validator(150);
      assert.isFalse(result3.isValid);
      assert.isTrue(result3.errors.includes('Must be no more than 100'));
    });

    it('should validate integers', (assert) => {
      const validator = Validator.number({ integer: true });
      
      const result1 = validator(42);
      assert.isTrue(result1.isValid);
      
      const result2 = validator(3.14);
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Must be an integer'));
    });

    it('should handle invalid numbers', (assert) => {
      const validator = Validator.number();
      
      const result = validator('not a number');
      assert.isFalse(result.isValid);
      assert.isTrue(result.errors.includes('Must be a valid number'));
    });
  });

  describe('boolean validator', () => {
    it('should validate boolean values', (assert) => {
      const validator = Validator.boolean();
      
      const result1 = validator(true);
      assert.isTrue(result1.isValid);
      assert.isTrue(result1.data);
      
      const result2 = validator(false);
      assert.isTrue(result2.isValid);
      assert.isFalse(result2.data);
    });

    it('should convert string booleans', (assert) => {
      const validator = Validator.boolean();
      
      const result1 = validator('true');
      assert.isTrue(result1.isValid);
      assert.isTrue(result1.data);
      
      const result2 = validator('false');
      assert.isTrue(result2.isValid);
      assert.isFalse(result2.data);
    });
  });

  describe('array validator', () => {
    it('should validate arrays', (assert) => {
      const stringValidator = Validator.string();
      const arrayValidator = Validator.array(stringValidator);
      
      const result1 = arrayValidator(['a', 'b', 'c']);
      assert.isTrue(result1.isValid);
      assert.deepEqual(result1.data, ['a', 'b', 'c']);
      
      const result2 = arrayValidator('not an array');
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Must be an array'));
    });

    it('should validate array length', (assert) => {
      const validator = Validator.array(Validator.string(), { 
        minLength: 2, 
        maxLength: 5 
      });
      
      const result1 = validator(['a', 'b', 'c']);
      assert.isTrue(result1.isValid);
      
      const result2 = validator(['a']);
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Must have at least 2 items'));
      
      const result3 = validator(['a', 'b', 'c', 'd', 'e', 'f']);
      assert.isFalse(result3.isValid);
      assert.isTrue(result3.errors.includes('Must have no more than 5 items'));
    });

    it('should validate array items', (assert) => {
      const stringValidator = Validator.string({ minLength: 3 });
      const arrayValidator = Validator.array(stringValidator);
      
      const result = arrayValidator(['ab', 'cde', 'f']);
      assert.isFalse(result.isValid);
      assert.isTrue(result.errors.some(e => e.includes('Item 0')));
    });
  });

  describe('object validator', () => {
    it('should validate objects', (assert) => {
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
      assert.isTrue(result1.isValid);
      
      const result2 = validator({
        age: -5,
        email: 'invalid-email'
      });
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.some(e => e.includes('name')));
      assert.isTrue(result2.errors.some(e => e.includes('age')));
      assert.isTrue(result2.errors.some(e => e.includes('email')));
    });

    it('should handle missing required fields', (assert) => {
      const schema = {
        required: { type: 'string', required: true },
        optional: { type: 'string' }
      };
      
      const validator = Validator.object(schema);
      
      const result = validator({ optional: 'value' });
      assert.isFalse(result.isValid);
      assert.isTrue(result.errors.includes('required: Field is required'));
    });
  });

  describe('custom validator', () => {
    it('should support custom validation logic', (assert) => {
      const validator = Validator.custom((input) => {
        if (typeof input !== 'string' || !input.includes('@')) {
          return { isValid: false, error: 'Must contain @ symbol' };
        }
        return { isValid: true, data: input.toLowerCase() };
      });
      
      const result1 = validator('USER@EXAMPLE.COM');
      assert.isTrue(result1.isValid);
      assert.equal(result1.data, 'user@example.com');
      
      const result2 = validator('invalid');
      assert.isFalse(result2.isValid);
      assert.isTrue(result2.errors.includes('Must contain @ symbol'));
    });
  });
});

describe('Built-in Validators', () => {
  describe('validateR2Key', () => {
    it('should validate valid R2 keys', (assert) => {
      const result1 = validateR2Key('valid-key-123');
      assert.isTrue(result1.isValid);
      assert.equal(result1.data, 'valid-key-123');
      
      const result2 = validateR2Key('path/to/object.json');
      assert.isTrue(result1.isValid);
    });

    it('should reject invalid R2 keys', (assert) => {
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
        assert.isFalse(result.isValid, `Should reject key: ${key}`);
      }
    });

    it('should reject non-string inputs', (assert) => {
      const result = validateR2Key(123);
      assert.isFalse(result.isValid);
      assert.isTrue(result.errors.includes('R2 key must be a string'));
    });
  });

  describe('validateDomain', () => {
    it('should validate valid domains', (assert) => {
      const validDomains = [
        'example.com',
        'sub.example.com',
        'test-site.co.uk',
        'a.b.c.d.e.f.g'
      ];
      
      for (const domain of validDomains) {
        const result = validateDomain(domain);
        assert.isTrue(result.isValid, `Should validate domain: ${domain}`);
      }
    });

    it('should reject invalid domains', (assert) => {
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
        assert.isFalse(result.isValid, `Should reject domain: ${domain}`);
      }
    });
  });

  describe('validateEvidenceId', () => {
    it('should validate valid evidence IDs', (assert) => {
      const validIds = [
        'evidence-123',
        'evidence_456',
        'id123',
        'VALID-ID'
      ];
      
      for (const id of validIds) {
        const result = validateEvidenceId(id);
        assert.isTrue(result.isValid, `Should validate ID: ${id}`);
      }
    });

    it('should reject invalid evidence IDs', (assert) => {
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
        assert.isFalse(result.isValid, `Should reject ID: ${id}`);
      }
    });
  });
});

describe('validateRequest', () => {
  it('should validate valid request objects', (assert) => {
    const validRequest = {
      headers: {
        authorization: 'Bearer token',
        'content-type': 'application/json'
      },
      method: 'POST',
      url: '/api/test',
      body: { test: true }
    };
    
    assert.isTrue(validateRequest(validRequest));
  });

  it('should validate minimal request objects', (assert) => {
    const minimalRequest = {};
    assert.isTrue(validateRequest(minimalRequest));
  });

  it('should reject invalid request objects', (assert) => {
    const invalidRequests = [
      null,
      undefined,
      'string',
      123,
      [],
      new Date()
    ];
    
    for (const request of invalidRequests) {
      assert.isFalse(validateRequest(request), `Should reject: ${typeof request}`);
    }
  });

  it('should handle request with invalid header types', (assert) => {
    const requestWithInvalidHeaders = {
      headers: 'not an object'
    };
    
    assert.isTrue(validateRequest(requestWithInvalidHeaders));
  });
});

describe('Edge Cases', () => {
  it('should handle extreme values in string validation', (assert) => {
    const validator = Validator.string({ maxLength: 10 });
    
    const result = validator('a'.repeat(1000));
    assert.isFalse(result.isValid);
    assert.isTrue(result.errors.includes('Must be no more than 10 characters'));
  });

  it('should handle NaN in number validation', (assert) => {
    const validator = Validator.number();
    
    const result = validator(NaN);
    assert.isFalse(result.isValid);
    assert.isTrue(result.errors.includes('Must be a valid number'));
  });

  it('should handle infinite values in number validation', (assert) => {
    const validator = Validator.number({ max: 100 });
    
    const result1 = validator(Infinity);
    assert.isFalse(result1.isValid);
    
    const result2 = validator(-Infinity);
    assert.isFalse(result2.isValid);
  });

  it('should handle circular references in object validation', (assert) => {
    const validator = Validator.object({});
    
    const circular: any = { a: 1 };
    circular.self = circular;
    
    // Should not crash
    const result = validator(circular);
    assert.isTrue(result.isValid);
  });

  it('should handle very deep nesting', (assert) => {
    const validator = Validator.object({});
    
    // Create deeply nested object
    let deep: any = { value: 'deep' };
    for (let i = 0; i < 100; i++) {
      deep = { nested: deep };
    }
    
    // Should not crash
    const result = validator(deep);
    assert.isTrue(result.isValid);
  });
});

// Run tests if this file is executed directly
if (import.meta.main) {
  const { runTests } = await import('../lib/core/unit-test-framework.ts');
  await runTests();
}

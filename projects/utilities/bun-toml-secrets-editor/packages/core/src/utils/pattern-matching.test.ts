/**
 * Tests for Pattern Matching utilities
 */

import { describe, it, expect } from "bun:test";
import { 
  match, 
  matchType, 
  Case, 
  StringCase, 
  RegExpCase, 
  TypeCase, 
  PropertyCase,
  handleApiResponse,
  parseInput,
  ApiResponse
} from "./pattern-matching";

describe("Pattern Matching", () => {
  describe("match function", () => {
    it("should match exact values", () => {
      const result = match(5)
        .case(5, () => "five")
        .case(10, () => "ten")
        .default(() => "unknown")
        .match();
      
      expect(result).toBe("five");
    });

    it("should match with predicate functions", () => {
      const result = match(15)
        .case((n) => n > 10, () => "greater than 10")
        .case((n) => n < 10, () => "less than 10")
        .default(() => "exactly 10")
        .match();
      
      expect(result).toBe("greater than 10");
    });

    it("should use default case when no match", () => {
      const result = match(7)
        .case(5, () => "five")
        .case(10, () => "ten")
        .default(() => "default")
        .match();
      
      expect(result).toBe("default");
    });

    it("should throw error when no default and no match", () => {
      expect(() => {
        match(7)
          .case(5, () => "five")
          .match();
      }).toThrow("No matching case found");
    });

    it("should support otherwise alias for default", () => {
      const result = match(7)
        .case(5, () => "five")
        .otherwise(() => "otherwise")
        .match();
      
      expect(result).toBe("otherwise");
    });
  });

  describe("matchType function", () => {
    it("should match discriminated union types", () => {
      const response: ApiResponse = { type: 'success', data: { id: 1 } };
      
      const result = matchType(response)
        .case('success', ({ data }) => `Success: ${data.id}`)
        .case('error', ({ message }) => `Error: ${message}`)
        .case('loading', () => 'Loading...')
        .match();
      
      expect(result).toBe("Success: 1");
    });

    it("should handle error case", () => {
      const response: ApiResponse = { type: 'error', message: 'Not found' };
      
      const result = matchType(response)
        .case('success', ({ data }) => `Success: ${data.id}`)
        .case('error', ({ message }) => `Error: ${message}`)
        .match();
      
      expect(result).toBe("Error: Not found");
    });
  });

  describe("Case Classes", () => {
    describe("StringCase", () => {
      it("should match exact strings", () => {
        const stringCase = new StringCase("hello");
        
        expect(stringCase.matches("hello")).toBe(true);
        expect(stringCase.matches("world")).toBe(false);
        expect(stringCase.extract("hello")).toBe("hello");
        expect(stringCase.extract("world")).toBe(null);
      });
    });

    describe("RegExpCase", () => {
      it("should match regex patterns", () => {
        const regexCase = new RegExpCase(/^\d+$/);
        
        expect(regexCase.matches("123")).toBe(true);
        expect(regexCase.matches("abc")).toBe(false);
        expect(regexCase.extract("123")?.[0]).toBe("123");
        expect(regexCase.extract("abc")).toBe(null);
      });
    });

    describe("TypeCase", () => {
      it("should match with type guards", () => {
        const isString = (value: any): value is string => typeof value === 'string';
        const typeCase = new TypeCase(isString);
        
        expect(typeCase.matches("hello")).toBe(true);
        expect(typeCase.matches(123)).toBe(false);
        expect(typeCase.extract("hello")).toBe("hello");
        expect(typeCase.extract(123)).toBe(null);
      });
    });

    describe("PropertyCase", () => {
      it("should match objects with specific properties", () => {
        const propCase = new PropertyCase('status');
        
        expect(propCase.matches({ status: 'active' })).toBe(true);
        expect(propCase.matches({ name: 'test' })).toBe(false);
        expect(propCase.extract({ status: 'active' })).toBe('active');
        expect(propCase.extract({ name: 'test' })).toBe(null);
      });

      it("should match with predicate", () => {
        const propCase = new PropertyCase('age', (age: any) => age >= 18);
        
        expect(propCase.matches({ age: 25 })).toBe(true);
        expect(propCase.matches({ age: 15 })).toBe(false);
        expect(propCase.extract({ age: 25 })).toBe(25);
        expect(propCase.extract({ age: 15 })).toBe(null);
      });
    });
  });

  describe("Case Utility Functions", () => {
    describe("Case.string", () => {
      it("should create string case", () => {
        const stringCase = Case.string("test");
        
        expect(stringCase.matches("test")).toBe(true);
        expect(stringCase.matches("other")).toBe(false);
      });
    });

    describe("Case.regex", () => {
      it("should create regex case", () => {
        const regexCase = Case.regex(/test\d+/);
        
        expect(regexCase.matches("test123")).toBe(true);
        expect(regexCase.matches("test")).toBe(false);
      });
    });

    describe("Case.is", () => {
      it("should create type guard case", () => {
        const isArray = Case.is(Array.isArray);
        
        expect(isArray.matches([])).toBe(true);
        expect(isArray.matches({})).toBe(false);
      });
    });

    describe("Case.has", () => {
      it("should create property existence case", () => {
        const hasName = Case.has('name');
        
        expect(hasName.matches({ name: 'test' })).toBe(true);
        expect(hasName.matches({ age: 25 })).toBe(false);
      });
    });

    describe("Case.where", () => {
      it("should create property predicate case", () => {
        const whereAge = Case.where('age', (value: any) => value >= 18);
        
        expect(whereAge.matches({ age: 25 })).toBe(true);
        expect(whereAge.matches({ age: 15 })).toBe(false);
      });
    });

    describe("Case.range", () => {
      it("should create numeric range case", () => {
        const range = Case.range(10, 20);
        
        expect(range.matches(15)).toBe(true);
        expect(range.matches(5)).toBe(false);
        expect(range.matches(25)).toBe(false);
        expect(range.extract(15)).toBe(15);
        expect(range.extract(5)).toBe(null);
      });
    });

    describe("Case.length", () => {
      it("should create array length case", () => {
        const length = Case.length(3);
        
        expect(length.matches([1, 2, 3])).toBe(true);
        expect(length.matches([1, 2])).toBe(false);
        expect(length.matches('123')).toBe(false); // not array
        expect(length.extract([1, 2, 3])).toEqual([1, 2, 3]);
        expect(length.extract([1, 2])).toBe(null);
      });
    });
  });

  describe("Example Functions", () => {
    describe("handleApiResponse", () => {
      it("should handle success response", () => {
        const response: ApiResponse = { type: 'success', data: { result: 'ok' } };
        const result = handleApiResponse(response);
        expect(result).toBe('Success: {"result":"ok"}');
      });

      it("should handle error response", () => {
        const response: ApiResponse = { type: 'error', message: 'Failed' };
        const result = handleApiResponse(response);
        expect(result).toBe('Error: Failed');
      });

      it("should handle loading response", () => {
        const response: ApiResponse = { type: 'loading' };
        const result = handleApiResponse(response);
        expect(result).toBe('Loading...');
      });
    });

    describe("parseInput", () => {
      it("should parse string input", () => {
        const result = parseInput('hello');
        expect(result).toBe('Greeting received!');
      });

      it("should parse number string", () => {
        const result = parseInput('123');
        expect(result).toBe('Number detected');
      });

      it("should parse array input", () => {
        const result = parseInput([1, 2, 3]);
        expect(result).toBe('📦 Array with 3 items');
      });

      it("should parse object with status", () => {
        const result = parseInput({ status: 'active', name: 'test' });
        expect(result).toBe('Object with status: active');
      });

      it("should handle unknown input", () => {
        const result = parseInput(42);
        expect(result).toBe('Unknown input');
      });
    });
  });

  describe("Complex Pattern Matching", () => {
    it("should chain multiple cases", () => {
      const result = match({ type: 'user', role: 'admin', age: 25 })
        .case((value) => value && typeof value === 'object' && 'role' in value, (obj) => `Role: ${obj.role}`)
        .case((value) => value && typeof value === 'object' && 'type' in value, (obj) => `Type: ${obj.type}`)
        .default(() => 'Unknown')
        .match();
      
      expect(result).toBe('Role: admin');
    });

    it("should combine predicates and patterns", () => {
      const result = match([1, 2, 3, 4, 5])
        .case((value) => Array.isArray(value) && value.length === 5, () => 'Array of length 5')
        .case(Array.isArray, (arr) => `Array of length ${arr.length}`)
        .default(() => 'Not an array')
        .match();
      
      expect(result).toBe('Array of length 5');
    });
  });
});

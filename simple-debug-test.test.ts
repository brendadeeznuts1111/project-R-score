// simple-debug-test.test.ts - v2.8: Simple Debugging Test

import { test, describe, expect } from 'bun:test';

describe('Simple Debugging Test', () => {
  test('debuggable calculation', () => {
    console.log('🐛 Starting debuggable calculation');
    
    let result = 0;
    
    // Add numbers step by step for debugging
    result += 10;  // Set breakpoint here
    console.log('🔍 After adding 10:', result);
    
    result *= 2;   // Set breakpoint here
    console.log('🔍 After multiplying by 2:', result);
    
    result -= 5;   // Set breakpoint here
    console.log('🔍 After subtracting 5:', result);
    
    expect(result).toBe(15);
    console.log('✅ Calculation completed');
  });
  
  test('debuggable string processing', () => {
    console.log('🐛 Starting string processing');
    
    const input = 'Hello, Debug World!';
    console.log('🔍 Input string:', input);
    
    // Process string step by step
    const words = input.split(' ');  // Set breakpoint here
    console.log('🔍 Split into words:', words);
    
    const filtered = words.filter(word => word !== 'Debug');  // Set breakpoint here
    console.log('🔍 After filtering:', filtered);
    
    const result = filtered.join(' ');  // Set breakpoint here
    console.log('🔍 Final result:', result);
    
    expect(result).toBe('Hello, World!');
    console.log('✅ String processing completed');
  });
});

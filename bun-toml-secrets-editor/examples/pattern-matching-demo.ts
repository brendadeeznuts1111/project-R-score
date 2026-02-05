#!/usr/bin/env bun
/**
 * Demo: Pattern Matching with Case Patterns
 * 
 * This example demonstrates:
 * 1. Basic pattern matching with case patterns
 * 2. Type-safe discriminated union matching
 * 3. Complex pattern combinations
 * 4. Real-world use cases for API responses and data validation
 */

import { match, matchType } from "../packages/core/src/utils/pattern-matching";

// Example 1: Basic Value Pattern Matching
function analyzeValue(value: unknown): string {
  return match(value)
    .case((val: any) => val === 'hello', () => "👋 Hello there!")
    .case((val: any) => val === 'goodbye', () => "👋 Goodbye!")
    .case((val: any) => typeof val === 'string' && /^\d+$/.test(val), () => "🔢 It's a whole number!")
    .case((val: any) => typeof val === 'string' && /^\d+\.\d+$/.test(val), () => "🔢 It's a decimal number!")
    .case(Array.isArray, (value: unknown) => {
      const arr = value as any[];
      return `📦 Array with ${arr.length} items`;
    })
    .case((val: any) => Array.isArray(val) && val.length === 0, () => "📭 Empty array")
    .case((val: any) => typeof val === 'number' && val >= 0 && val <= 100, (value: unknown) => {
      const n = value as number;
      return `📊 Number between 0-100: ${n}`;
    })
    .case((val: any) => val && typeof val === 'object' && 'status' in val, (obj: any) => `🏷️  Object with status: ${obj.status}`)
    .case((val: any) => val && typeof val === 'object' && 'age' in val && typeof val.age === 'number' && val.age >= 18, (obj: any) => `👤 Adult (${obj.age} years)`)
    .case((val: any) => val && typeof val === 'object' && 'age' in val && typeof val.age === 'number' && val.age < 18, (obj: any) => `🧒 Minor (${obj.age} years)`)
    .default(() => "❓ Unknown value type")
    .match();
}

// Example 2: Type-Safe Discriminated Union
type NetworkState = 
  | { type: 'idle' }
  | { type: 'loading'; progress: number }
  | { type: 'success'; data: any }
  | { type: 'error'; code: number; message: string };

function getNetworkStatus(state: NetworkState): string {
  return match(state)
    .case((val: any) => val.type === 'idle', () => "💤 Network is idle")
    .case((val: any) => val.type === 'loading', (val: any) => `⏳ Loading... ${val.progress}%`)
    .case((val: any) => val.type === 'success', (val: any) => `✅ Success! Got ${JSON.stringify(val.data).length} chars`)
    .case((val: any) => val.type === 'error', (val: any) => `❌ Error ${val.code}: ${val.message}`)
    .default(() => "Unknown state")
    .match();
}

// Example 3: Data Validation with Patterns
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  role: 'admin' | 'user' | 'guest';
}

function validateUser(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  match(input)
    .case((val: any): val is User => 
      val && typeof val === 'object' && 
      'id' in val && 'name' in val && 'email' in val && 'role' in val
    , (user: any) => {
      // Validate individual fields
      match(user.id)
        .case((id: any) => Number.isInteger(id) && id > 0, () => {})
        .default(() => errors.push('ID must be a positive integer'))
        .match();
      
      match(user.name)
        .case((name: any) => /^[A-Za-z\s]{2,50}$/.test(name), () => {})
        .default(() => errors.push('Name must be 2-50 letters only'))
        .match();
      
      match(user.email)
        .case((email: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), () => {})
        .default(() => errors.push('Invalid email format'))
        .match();
      
      match(user.role)
        .case((role: any) => role === 'admin' || role === 'user' || role === 'guest', () => {})
        .default(() => errors.push('Role must be admin, user, or guest'))
        .match();
      
      if (user.age !== undefined) {
        match(user.age)
          .case((age: any) => age >= 0 && age <= 150, () => {})
          .default(() => errors.push('Age must be between 0 and 150'))
          .match();
      }
    })
    .default(() => errors.push('Input must be a valid user object'))
    .match();
  
  return { valid: errors.length === 0, errors };
}

// Example 4: Simple Event System
type SimpleEvent = 
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string }
  | { type: 'scroll'; deltaY: number }
  | { type: 'resize'; width: number; height: number };

function handleSimpleEvent(event: SimpleEvent): string {
  return match(event)
    .case((val: any) => val.type === 'click', (val: any) => `🖱️  Click at (${val.x}, ${val.y})`)
    .case((val: any) => val.type === 'keydown', (val: any) => `⌨️  Key: ${val.key}`)
    .case((val: any) => val.type === 'scroll', (val: any) => `📜 Scroll: Y:${val.deltaY}`)
    .case((val: any) => val.type === 'resize', (val: any) => `📐 Resize to ${val.width}x${val.height}`)
    .default(() => "Unknown event")
    .match();
}

// Example 5: Simple File Processing
type SimpleFileInfo = 
  | { type: 'text'; lines: number }
  | { type: 'json'; size: number }
  | { type: 'binary'; mimeType: string }
  | { type: 'error'; message: string };

function processSimpleFile(filename: string, content: unknown): SimpleFileInfo {
  return match(filename)
    .case((name: string) => name.endsWith('.txt'), () => {
      const text = String(content);
      return { type: 'text', lines: text.split('\n').length };
    })
    .case((name: string) => name.endsWith('.json'), () => {
      try {
        const data = JSON.parse(String(content));
        return { type: 'json', size: JSON.stringify(data).length };
      } catch {
        return { type: 'error', message: 'Invalid JSON' };
      }
    })
    .case((name: string) => /\.(jpg|png|gif|pdf)$/i.test(name), () => ({
      type: 'binary' as const,
      mimeType: filename.split('.').pop()!
    }))
    .default(() => ({ type: 'error' as const, message: 'Unsupported file type' }));
}

// Demo execution
function runDemo() {
  console.log('🎯 Pattern Matching Demo');
  console.log('='.repeat(50));
  
  // Demo 1: Basic Pattern Matching
  console.log('\n📝 Basic Pattern Matching:');
  const testValues = [
    "hello", "123", "45.67", [1, 2, 3], 
    { status: "active" }, { age: 25 }, { age: 15 }, 42
  ];
  
  testValues.forEach(value => {
    console.log(`  ${JSON.stringify(value)} → ${analyzeValue(value)}`);
  });
  
  // Demo 2: Network States
  console.log('\n🌐 Network State Matching:');
  const networkStates: NetworkState[] = [
    { type: 'idle' },
    { type: 'loading', progress: 45 },
    { type: 'success', data: { result: 'ok' } },
    { type: 'error', code: 404, message: 'Not found' }
  ];
  
  networkStates.forEach(state => {
    console.log(`  ${state.type} → ${getNetworkStatus(state)}`);
  });
  
  // Demo 3: User Validation
  console.log('\n👤 User Validation:');
  const testUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' as const },
    { id: -1, name: 'A', email: 'invalid', role: 'invalid' as const },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, role: 'user' as const }
  ];
  
  testUsers.forEach(user => {
    const validation = validateUser(user);
    console.log(`  ${JSON.stringify(user)} → ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (!validation.valid) {
      validation.errors.forEach(error => console.log(`    - ${error}`));
    }
  });
  
  // Demo 4: Simple Event Handling
  console.log('\n⚡ Simple Event Handling:');
  const events: SimpleEvent[] = [
    { type: 'click', x: 100, y: 200 },
    { type: 'keydown', key: 'Enter' },
    { type: 'scroll', deltaY: 50 },
    { type: 'resize', width: 1024, height: 768 }
  ];
  
  events.forEach(event => {
    console.log(`  ${event.type} → ${handleSimpleEvent(event)}`);
  });
  
  // Demo 5: Simple File Processing
  console.log('\n📁 Simple File Processing:');
  const files = [
    ['test.txt', 'Hello\nWorld\nBun!'],
    ['config.json', '{"debug": true, "port": 3000}'],
    ['invalid.json', '{ invalid json }'],
    ['image.jpg', new ArrayBuffer(1024)],
    ['unknown.xyz', 'some content']
  ];
  
  files.forEach(([filename, content]) => {
    const result = processSimpleFile(filename as string, content);
    console.log(`  ${filename} → ${result.type}${result.type === 'error' ? `: ${result.message}` : ''}`);
  });
  
  console.log('\n✨ Demo completed!');
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down demo...");
  process.exit(0);
});

// Run the demo
if (import.meta.main) {
  runDemo();
}

export { analyzeValue, getNetworkStatus, validateUser, handleSimpleEvent, processSimpleFile };

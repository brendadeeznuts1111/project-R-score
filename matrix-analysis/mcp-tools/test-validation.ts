#!/usr/bin/env bun
// mcp-tools/test-validation.ts
import { validateToolCall, quickValidate } from './validate.js';

// Load registry for testing
const TOOL_SCHEMAS = require('./registry.json');

console.log('🧪 MCP Tool Registry Validation Tests\n');

// Test cases
const testCases = [
  {
    name: 'Valid RSS query',
    call: { name: 'rss/query', arguments: { pattern: 'bun' } },
    expected: true
  },
  {
    name: 'Invalid RSS query - missing required pattern',
    call: { name: 'rss/query', arguments: { limit: 10 } },
    expected: false
  },
  {
    name: 'Valid CDN purge',
    call: { name: 'cdn/purge', arguments: { domain: 'example.com', confirm: true } },
    expected: true
  },
  {
    name: 'Invalid CDN purge - missing confirm',
    call: { name: 'cdn/purge', arguments: { domain: 'example.com' } },
    expected: false
  },
  {
    name: 'Valid audit scan',
    call: { name: 'audit/scan', arguments: { path: '/src', max_width: 89 } },
    expected: true
  },
  {
    name: 'Invalid audit scan - width below minimum',
    call: { name: 'audit/scan', arguments: { path: '/src', max_width: 70 } },
    expected: false
  },
  {
    name: 'Non-existent tool',
    call: { name: 'fake/tool', arguments: {} },
    expected: false
  }
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = validateToolCall(testCase.call.name, testCase.call.arguments);
  const success = result.valid === testCase.expected;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${testCase.name}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result.valid}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

// Demonstrate quick validation one-liners
console.log('🚀 Quick Validation Examples:\n');

// Example 1: Valid subset
console.log('Example 1 - Valid subset:');
const validCall = { name: 'rss/query', arguments: { pattern: 'bun' } };
console.log(`Call: ${JSON.stringify(validCall)}`);
console.log(`Result: ${quickValidate(validCall) ? 'Valid subset' : 'Invalid'}\n`);

// Example 2: Missing required field
console.log('Example 2 - Missing required field:');
const invalidCall = { name: 'rss/query', arguments: { limit: 10 } };
console.log(`Call: ${JSON.stringify(invalidCall)}`);
console.log(`Result: ${quickValidate(invalidCall) ? 'Valid' : 'Missing pattern'}\n`);

// Example 3: DeepMatch validation details
console.log('Example 3 - DeepMatch validation details:');
const schema = TOOL_SCHEMAS['rss/query'];
const args = { pattern: 'bun', limit: 10 };
console.log(`Schema input: ${JSON.stringify(schema.input)}`);
console.log(`Arguments: ${JSON.stringify(args)}`);
console.log(`DeepMatch result: ${Bun.deepMatch(args, schema.input) ? 'Valid' : 'Invalid'}\n`);

// Registry stats
console.log('📋 Registry Statistics:');
const totalTools = Object.keys(TOOL_SCHEMAS).length;
const categories = [...new Set(Object.values(TOOL_SCHEMAS).map((t: any) => t.category))];
console.log(`Total tools: ${totalTools}`);
console.log(`Categories: ${categories.join(', ')}`);
console.log(`All tools at tier 1380: ${Object.values(TOOL_SCHEMAS).every((t: any) => t.tier === 1380) ? 'Yes' : 'No'}`);

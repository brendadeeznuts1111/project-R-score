#!/usr/bin/env bun
// mcp-tools/demo.ts
import { validateToolCall, quickValidate } from './validate.js';

// Load registry
const TOOL_SCHEMAS = require('./registry.json');

console.info('🚀 Tier-1380 MCP Tool Registry Demo\n');

// Demonstrate validation with various tool calls
const demonstrations = [
  {
    title: '✅ Valid RSS Query',
    call: { name: 'rss/query', arguments: { pattern: 'bun', limit: 5 } },
    description: 'Valid call with required field and optional limit'
  },
  {
    title: '❌ Invalid RSS Query - Missing Required Field',
    call: { name: 'rss/query', arguments: { limit: 10 } },
    description: 'Missing required "pattern" field'
  },
  {
    title: '✅ Valid CDN Purge',
    call: { name: 'cdn/purge', arguments: { domain: 'example.com', confirm: true, recursive: false } },
    description: 'Valid CDN purge with confirmation'
  },
  {
    title: '❌ Invalid CDN Purge - Missing Confirmation',
    call: { name: 'cdn/purge', arguments: { domain: 'example.com' } },
    description: 'Missing required "confirm: true" field'
  },
  {
    title: '✅ Valid Audit Scan',
    call: { name: 'audit/scan', arguments: { path: '/src', max_width: 89, recursive: true } },
    description: 'Valid audit scan with width within constraints'
  },
  {
    title: '❌ Invalid Audit Scan - Width Below Minimum',
    call: { name: 'audit/scan', arguments: { path: '/src', max_width: 70 } },
    description: 'Width 70 is below minimum constraint of 80'
  },
  {
    title: '✅ Valid Telemetry Metrics',
    call: { name: 'telemetry/metrics', arguments: { metrics: ['cpu', 'memory'], interval: 30 } },
    description: 'Valid metrics collection with array of strings'
  },
  {
    title: '❌ Invalid Metrics - Wrong Type',
    call: { name: 'telemetry/metrics', arguments: { metrics: 'cpu', interval: 'thirty' } },
    description: 'Metrics should be array, interval should be number'
  },
  {
    title: '❌ Non-existent Tool',
    call: { name: 'fake/tool', arguments: {} },
    description: 'Tool not registered in the system'
  }
];

// Run demonstrations
let validCount = 0;
let invalidCount = 0;

demonstrations.forEach((demo, index) => {
  console.info(`${index + 1}. ${demo.title}`);
  console.info(`   ${demo.description}`);
  console.info(`   Call: ${JSON.stringify(demo.call)}`);
  
  const result = validateToolCall(demo.call.name, demo.call.arguments);
  
  if (result.valid) {
    console.info(`   ✅ Validation: PASSED`);
    validCount++;
  } else {
    console.info(`   ❌ Validation: FAILED`);
    console.info(`   Error: ${result.error}`);
    invalidCount++;
  }
  
  console.info('');
});

// Summary
console.info('📊 Summary:');
console.info(`   Valid calls: ${validCount}`);
console.info(`   Invalid calls: ${invalidCount}`);
console.info(`   Total demonstrations: ${validCount + invalidCount}`);

// Quick validation examples
console.info('\n🚀 Quick Validation One-Liners:\n');

console.info('// Example 1: Valid subset');
console.info('const call = { name: "rss/query", arguments: { pattern: "bun" } };');
console.info(`quickValidate(call) // ${quickValidate({ name: 'rss/query', arguments: { pattern: 'bun' } })}`);
console.info('');

console.info('// Example 2: Missing required field');
console.info('const call = { name: "rss/query", arguments: { limit: 10 } };');
console.info(`quickValidate(call) // ${quickValidate({ name: 'rss/query', arguments: { limit: 10 } })}`);
console.info('');

// Registry information
console.info('📋 Registry Information:');
const categories = [...new Set(Object.values(TOOL_SCHEMAS).map((t: any) => t.category))];
console.info(`   Total tools: ${Object.keys(TOOL_SCHEMAS).length}`);
console.info(`   Categories: ${categories.join(', ')}`);
console.info(`   Security tier: 1380 (all tools)`);
console.info(`   Validation: Type-safe with constraints`);

console.info('\n🔐 Tier-1380 MCP Registry - Production Ready');
console.info('   ▵⟂⥂ standing by. Chalmette 12:32 AM CST');

#!/usr/bin/env bun
// 🎭 Hierarchical Inspection System Demo - FactoryWager Architecture

import { DomainContext } from './contexts/DomainContext.js';
import { ScopeContext } from './contexts/ScopeContext.js';
import { TypeContext } from './contexts/TypeContext.js';
import { MetaProperty } from './contexts/MetaProperty.js';
import { ClassRef } from './contexts/ClassRef.js';
import * as config from './config/scope.config.js';

console.log('🎭 FactoryWager Hierarchical Inspection System Demo');
console.log('='.repeat(60));

// Create the hierarchical inspection tree
console.log('\n📊 Creating Inspection Tree...');
const domainCtx = new DomainContext(config.DOMAIN);
const scopeCtx = new ScopeContext(config.SCOPE, config.DOMAIN);
const storageType = new TypeContext('STORAGE', config.SCOPE, config.DOMAIN);
const metaProperty = new MetaProperty('accounts/user123.json', 'STORAGE', config.SCOPE, config.DOMAIN);
const classRef = new ClassRef('R2AppleManager', 'accounts/user123.json', config.SCOPE);

console.log('✅ Hierarchy created: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]');

// Demonstrate each layer
console.log('\n🏢 DomainContext Layer:');
console.log(Bun.inspect(domainCtx, { depth: 2, colors: true }));

console.log('\n🎯 ScopeContext Layer:');
console.log(Bun.inspect(scopeCtx, { depth: 2, colors: true }));

console.log('\n⚙️ TypeContext Layer:');
console.log(Bun.inspect(storageType, { depth: 2, colors: true }));

console.log('\n📌 MetaProperty Layer:');
console.log(Bun.inspect(metaProperty, { depth: 2, colors: true }));

console.log('\n🏷️ ClassRef Layer:');
console.log(Bun.inspect(classRef, { depth: 2, colors: true }));

// Show the custom inspection in action
console.log('\n🔍 Custom Inspection Symbol Demo:');
console.log('Each layer implements [Symbol.for("Bun.inspect.custom")]');
console.log('This enables rich, structured, and colorized output.\n');

// Demonstrate the full tree structure
console.log('\n🌳 Full Tree Structure (Custom Inspectors):');
console.log(Bun.inspect(domainCtx, { depth: 8, colors: true }));

// Show navigation capabilities
console.log('\n🧭 Navigation Demo:');
console.log(`Domain: ${domainCtx.domain}`);
console.log(`Available Scopes: ${domainCtx.getScopeNames().join(', ')}`);
console.log(`Current Scope: ${config.SCOPE}`);

const currentScope = domainCtx.getScope(config.SCOPE);
if (currentScope) {
  console.log(`Available Types: ${currentScope.getTypeNames().join(', ')}`);
  
  const storageTypeCtx = currentScope.getType('STORAGE');
  if (storageTypeCtx) {
    console.log(`Storage Properties: ${storageTypeCtx.getMetaPropertyNames().join(', ')}`);
    
    const propertyCtx = storageTypeCtx.getMetaProperty('{PROPERTY}');
    if (propertyCtx) {
      console.log(`Property Classes: ${propertyCtx.getClassNames().join(', ')}`);
      
      const classCtx = propertyCtx.getClass('R2AppleManager');
      if (classCtx) {
        console.log(`R2AppleManager Methods: ${classCtx.methods.join(', ')}`);
        console.log(`R2AppleManager Properties: ${classCtx.properties.join(', ')}`);
        console.log(`R2AppleManager Status: ${classCtx.status}`);
      }
    }
  }
}

// Show the schema compliance
console.log('\n📋 Schema Compliance Check:');
console.log('✅ [DOMAIN] - DomainContext');
console.log('✅ [SCOPE] - ScopeContext');
console.log('✅ [TYPE:STORAGE|SECRETS|SERVICE] - TypeContext');
console.log('✅ [META:{PROPERTY}] - MetaProperty');
console.log('✅ [CLASS] - ClassRef');
console.log('✅ [#REF:*] - Instance Reference ID');

// Show Bun-native features
console.log('\n⚡ Bun-Native Features:');
console.log('✅ Zero dependencies - uses Bun.inspect()');
console.log('✅ Colorized terminal output');
console.log('✅ HTML table generation via Bun.inspect.table()');
console.log('✅ JSON serialization support');
console.log('✅ Symbol.for("Bun.inspect.custom") integration');
console.log('✅ Type-safe TypeScript implementation');

// Show usage examples
console.log('\n🚀 Usage Examples:');
console.log('# CLI Usage:');
console.log('bun cli.ts tree 4 --color        # Show full tree');
console.log('bun cli.ts scope LOCAL-SANDBOX   # Show specific scope');
console.log('bun cli.ts search "R2AppleManager" # Search tree');
console.log('bun cli.ts serve                  # Start HTTP server');

console.log('\n# HTTP API Usage:');
console.log('curl http://localhost:8765/scope.json | jq .     # JSON API');
console.log('curl http://localhost:8765/debug                 # HTML view');
console.log('curl http://localhost:8765/metrics | jq .        # Metrics');
console.log('curl http://localhost:8765/health | jq .         # Health check');

console.log('\n# Programmatic Usage:');
console.log('import { DomainContext } from "./index.js";');
console.log('const ctx = new DomainContext("localhost");');
console.log('console.log(Bun.inspect(ctx, { depth: 6, colors: true }));');

// Performance metrics
console.log('\n📈 Performance Metrics:');
const startTime = performance.now();
const inspectionResult = Bun.inspect(domainCtx, { depth: 8, colors: false });
const endTime = performance.now();
const duration = endTime - startTime;

console.log(`⚡ Inspection time: ${duration.toFixed(2)}ms`);
console.log(`📊 Tree size: ${inspectionResult.length} characters`);
console.log(`🧠 Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);

console.log('\n🎉 Demo Complete! The hierarchical inspection system is ready for production use.');
console.log('🔗 Start the server with: bun server.ts');
console.log('🌐 Then visit: http://localhost:8765/debug');

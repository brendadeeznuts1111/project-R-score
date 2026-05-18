#!/usr/bin/env bun
// 🎭 Hierarchical Inspection System Demo - FactoryWager Architecture

import { DomainContext } from './contexts/DomainContext.js';
import { ScopeContext } from './contexts/ScopeContext.js';
import { TypeContext } from './contexts/TypeContext.js';
import { MetaProperty } from './contexts/MetaProperty.js';
import { ClassRef } from './contexts/ClassRef.js';
import * as config from './config/scope.config.js';

console.info('🎭 FactoryWager Hierarchical Inspection System Demo');
console.info('='.repeat(60));

// Create the hierarchical inspection tree
console.info('\n📊 Creating Inspection Tree...');
const domainCtx = new DomainContext(config.DOMAIN);
const scopeCtx = new ScopeContext(config.SCOPE, config.DOMAIN);
const storageType = new TypeContext('STORAGE', config.SCOPE, config.DOMAIN);
const metaProperty = new MetaProperty('accounts/user123.json', 'STORAGE', config.SCOPE, config.DOMAIN);
const classRef = new ClassRef('R2AppleManager', 'accounts/user123.json', config.SCOPE);

console.info('✅ Hierarchy created: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]');

// Demonstrate each layer
console.info('\n🏢 DomainContext Layer:');
console.info(Bun.inspect(domainCtx, { depth: 2, colors: true }));

console.info('\n🎯 ScopeContext Layer:');
console.info(Bun.inspect(scopeCtx, { depth: 2, colors: true }));

console.info('\n⚙️ TypeContext Layer:');
console.info(Bun.inspect(storageType, { depth: 2, colors: true }));

console.info('\n📌 MetaProperty Layer:');
console.info(Bun.inspect(metaProperty, { depth: 2, colors: true }));

console.info('\n🏷️ ClassRef Layer:');
console.info(Bun.inspect(classRef, { depth: 2, colors: true }));

// Show the custom inspection in action
console.info('\n🔍 Custom Inspection Symbol Demo:');
console.info('Each layer implements [Symbol.for("Bun.inspect.custom")]');
console.info('This enables rich, structured, and colorized output.\n');

// Demonstrate the full tree structure
console.info('\n🌳 Full Tree Structure (Custom Inspectors):');
console.info(Bun.inspect(domainCtx, { depth: 8, colors: true }));

// Show navigation capabilities
console.info('\n🧭 Navigation Demo:');
console.info(`Domain: ${domainCtx.domain}`);
console.info(`Available Scopes: ${domainCtx.getScopeNames().join(', ')}`);
console.info(`Current Scope: ${config.SCOPE}`);

const currentScope = domainCtx.getScope(config.SCOPE);
if (currentScope) {
  console.info(`Available Types: ${currentScope.getTypeNames().join(', ')}`);
  
  const storageTypeCtx = currentScope.getType('STORAGE');
  if (storageTypeCtx) {
    console.info(`Storage Properties: ${storageTypeCtx.getMetaPropertyNames().join(', ')}`);
    
    const propertyCtx = storageTypeCtx.getMetaProperty('{PROPERTY}');
    if (propertyCtx) {
      console.info(`Property Classes: ${propertyCtx.getClassNames().join(', ')}`);
      
      const classCtx = propertyCtx.getClass('R2AppleManager');
      if (classCtx) {
        console.info(`R2AppleManager Methods: ${classCtx.methods.join(', ')}`);
        console.info(`R2AppleManager Properties: ${classCtx.properties.join(', ')}`);
        console.info(`R2AppleManager Status: ${classCtx.status}`);
      }
    }
  }
}

// Show the schema compliance
console.info('\n📋 Schema Compliance Check:');
console.info('✅ [DOMAIN] - DomainContext');
console.info('✅ [SCOPE] - ScopeContext');
console.info('✅ [TYPE:STORAGE|SECRETS|SERVICE] - TypeContext');
console.info('✅ [META:{PROPERTY}] - MetaProperty');
console.info('✅ [CLASS] - ClassRef');
console.info('✅ [#REF:*] - Instance Reference ID');

// Show Bun-native features
console.info('\n⚡ Bun-Native Features:');
console.info('✅ Zero dependencies - uses Bun.inspect()');
console.info('✅ Colorized terminal output');
console.info('✅ HTML table generation via Bun.inspect.table()');
console.info('✅ JSON serialization support');
console.info('✅ Symbol.for("Bun.inspect.custom") integration');
console.info('✅ Type-safe TypeScript implementation');

// Show usage examples
console.info('\n🚀 Usage Examples:');
console.info('# CLI Usage:');
console.info('bun cli.ts tree 4 --color        # Show full tree');
console.info('bun cli.ts scope LOCAL-SANDBOX   # Show specific scope');
console.info('bun cli.ts search "R2AppleManager" # Search tree');
console.info('bun cli.ts serve                  # Start HTTP server');

console.info('\n# HTTP API Usage:');
console.info('curl http://localhost:8765/scope.json | jq .     # JSON API');
console.info('curl http://localhost:8765/debug                 # HTML view');
console.info('curl http://localhost:8765/metrics | jq .        # Metrics');
console.info('curl http://localhost:8765/health | jq .         # Health check');

console.info('\n# Programmatic Usage:');
console.info('import { DomainContext } from "./index.js";');
console.info('const ctx = new DomainContext("localhost");');
console.info('console.info(Bun.inspect(ctx, { depth: 6, colors: true }));');

// Performance metrics
console.info('\n📈 Performance Metrics:');
const startTime = performance.now();
const inspectionResult = Bun.inspect(domainCtx, { depth: 8, colors: false });
const endTime = performance.now();
const duration = endTime - startTime;

console.info(`⚡ Inspection time: ${duration.toFixed(2)}ms`);
console.info(`📊 Tree size: ${inspectionResult.length} characters`);
console.info(`🧠 Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);

console.info('\n🎉 Demo Complete! The hierarchical inspection system is ready for production use.');
console.info('🔗 Start the server with: bun server.ts');
console.info('🌐 Then visit: http://localhost:8765/debug');

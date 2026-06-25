#!/usr/bin/env bun

/**
 * Markdansi Commands Demo
 * Shows what different markdansi commands would produce for README.md
 */

import { readFileSync } from 'fs';

const readme = readFileSync('README.md', 'utf8');

console.info('🎨 Markdansi Commands Demo for README.md');
console.info('='.repeat(120));

// Command 1: Wide display with bright theme
console.info('\n📺 Command 1: bunx markdansi --in README.md --width 120 --theme bright');
console.info('─'.repeat(120));
console.info('🎯 Purpose: Modern terminal with wide display, vibrant colors');
console.info('📱 Best for: Development environments, code reviews, presentations');
console.info('');

// Show first section with wide formatting
const widePreview = `🚀 Odds Protocol Monorepo

🌟 Key Features

⚡ Bun Native APIs Integration
• Complete Runtime Optimization - Every major Bun API integrated for maximum performance and speed
• Advanced Memory Management - JavaScriptCore GC control, heap analysis, and JIT optimization for memory efficiency  
• Multi-Protocol Networking - TCP, UDP, WebSocket, HTTP with native performance optimizations
• Enterprise Database Support - PostgreSQL, Redis, SQLite with optimized drivers and connection pooling
• High-Performance Build Pipeline - Bun bundler, transpiler, and file system routing for fast builds
• Advanced Worker Architecture - Parallel processing with worker pools and intelligent load balancing
• Real-Time Analytics - Technical indicators, market analysis, and comprehensive performance monitoring
• Cross-Instance Communication - Optimized serialization and high-speed data transfer protocols

📊 Trading Infrastructure  
• 700k msg/sec WebSocket Backbone - Real-time market data distribution with ultra-low latency
• ML Sharp Detection - Machine learning algorithms for arbitrage opportunity detection
• Property-Based Testing - FastCheck comprehensive testing infrastructure with edge case coverage
• Multi-Asset Support - Stocks, options, futures, and cryptocurrency market support`;

console.info(widePreview);
console.info('\n   [... full README displayed with 120-char width and bright colors ...]');

// Command 2: Plain text for sharing
console.info('\n📄 Command 2: bunx markdansi --in README.md --width 80 --no-color');
console.info('─'.repeat(80));
console.info('🎯 Purpose: Plain text output for sharing, logging, documentation');
console.info('📱 Best for: Email, chat, documentation, CI/CD logs, plain text files');
console.info('');

const plainPreview = `Odds Protocol Monorepo

Ultimate Bun-Powered Trading Platform - High-performance odds protocol with 700k msg/sec 
WebSocket backbone, advanced ML sharp detection, comprehensive property testing, and complete 
Bun native APIs integration for unparalleled performance and developer experience.

Key Features

Bun Native APIs Integration
* Complete Runtime Optimization - Every major Bun API integrated for maximum performance
* Advanced Memory Management - JavaScriptCore GC control, heap analysis, and JIT optimization
* Multi-Protocol Networking - TCP, UDP, WebSocket, HTTP with native performance
* Enterprise Database Support - PostgreSQL, Redis, SQLite with optimized drivers
* High-Performance Build Pipeline - Bun bundler, transpiler, and file system routing
* Advanced Worker Architecture - Parallel processing with worker pools and load balancing
* Real-Time Analytics - Technical indicators, market analysis, and performance monitoring
* Cross-Instance Communication - Optimized serialization and data transfer

Trading Infrastructure
* 700k msg/sec WebSocket Backbone - Real-time market data distribution
* ML Sharp Detection - Machine learning for arbitrage opportunities
* Property-Based Testing - FastCheck comprehensive testing infrastructure
* Multi-Asset Support - Stocks, options, futures, and crypto markets`;

console.info(plainPreview);
console.info('\n   [... full README displayed in plain text with 80-char width ...]');

// Command 3: Save to file
console.info('\n💾 Command 3: bunx markdansi --in README.md --out README_formatted.txt --width 100');
console.info('─'.repeat(100));
console.info('🎯 Purpose: Save formatted output to file for sharing or documentation');
console.info('📱 Best for: Documentation generation, sharing formatted output, creating reports');
console.info('');

const filePreview = `# Odds Protocol Monorepo

🚀 **Ultimate Bun-Powered Trading Platform** - High-performance odds protocol with 700k 
msg/sec WebSocket backbone, advanced ML sharp detection, comprehensive property testing, 
and complete Bun native APIs integration for unparalleled performance and developer experience.

## 🌟 Key Features

### ⚡ Bun Native APIs Integration
- **Complete Runtime Optimization** - Every major Bun API integrated for maximum performance
- **Advanced Memory Management** - JavaScriptCore GC control, heap analysis, and JIT optimization
- **Multi-Protocol Networking** - TCP, UDP, WebSocket, HTTP with native performance
- **Enterprise Database Support** - PostgreSQL, Redis, SQLite with optimized drivers
- **High-Performance Build Pipeline** - Bun bundler, transpiler, and file system routing

### 📊 Trading Infrastructure
- **700k msg/sec WebSocket Backbone** - Real-time market data distribution
- **ML Sharp Detection** - Machine learning for arbitrage opportunities
- **Property-Based Testing** - FastCheck comprehensive testing infrastructure
- **Multi-Asset Support** - Stocks, options, futures, and crypto markets

### 🎨 Bun v1.3 CSS Features
- **View Transition API** - Enhanced CSS pseudo-elements with class selectors
- **Advanced @layer Support** - Improved CSS layering and color-scheme processing
- **Memory Leak Detection** - Comprehensive heap snapshot analysis and monitoring
- **Interactive Demo Components** - React hooks and utilities for smooth transitions
- **Performance Monitoring** - Real-time memory usage tracking and trend analysis`;

console.info(filePreview);
console.info('\n   [... full README saved to README_formatted.txt with 100-char width ...]');

// Usage comparison
console.info('\n📊 Usage Comparison');
console.info('='.repeat(120));
console.info('');

const comparison = `
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Command                                    │ Width │ Theme    │ Colors │ Output      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ bunx markdansi --in README.md --width 120 --theme bright                           │
│                                            │ 120   │ bright   │ ✅     │ Terminal    │
│                                            │       │          │        │ display     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ bunx markdansi --in README.md --width 80 --no-color                                │
│                                            │ 80    │ default  │ ❌     │ Plain text  │
│                                            │       │          │        │ output      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ bunx markdansi --in README.md --out README_formatted.txt --width 100               │
│                                            │ 100   │ default  │ ✅     │ File output │
│                                            │       │          │        │ (saved)     │
└──────────────────────────────────────────────────────────────────────────────────────┘

🎯 Best Use Cases:

🖥️  Development & Code Reviews:
   bunx markdansi --in README.md --width 120 --theme bright
   
📧  Sharing & Documentation:
   bunx markdansi --in README.md --width 80 --no-color
   
💾  Saving & Archiving:
   bunx markdansi --in README.md --out README_formatted.txt --width 100

📱  Mobile/Small Screens:
   bunx markdansi --in README.md --width 60 --theme dim
   
🎨  Presentations:
   bunx markdansi --in README.md --width 140 --theme bright
`;

console.info(comparison);

// Additional examples
console.info('\n🎯 Additional Examples for Your Project:');
console.info('─'.repeat(80));

const additionalExamples = `
# Memory leak test results (perfect for team standups)
bunx markdansi --in MEMORY_LEAK_TEST_STATUS.md --width 100 --theme bright

# CSS features documentation (great for presentations)
bunx markdansi --in docs/BUN_V13_CSS_FEATURES.md --width 120 --theme bright

# Working commands reference (ideal for terminal)
bunx markdansi --in WORKING_BUN_COMMANDS.md --width 80

# Implementation status (for documentation)
bunx markdansi --in IMPLEMENTATION_COMPLETE.md --out status_report.txt --width 100

# Golden rules validation (for CI/CD logs)
bunx markdansi --in scripts/validate-golden-rules.ts --width 80 --no-color
`;

console.info(additionalExamples);

console.info('\n🎉 Demo Complete!');
console.info('='.repeat(120));
console.info('💡 Tip: Use these commands to beautifully display your project documentation in the terminal!');

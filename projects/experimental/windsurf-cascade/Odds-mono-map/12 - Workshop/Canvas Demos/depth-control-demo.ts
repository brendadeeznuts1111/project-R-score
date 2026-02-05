#!/usr/bin/env bun
/**
 * Bun Depth Control Demo - Focused on Enhanced Console Inspection
 * 
 * Demonstrates Bun's superior depth control capabilities with:
 * - Default console.log (depth 2) vs enhanced inspection
 * - Configurable inspection depth for complex nested objects
 * - True color support with canvas brand integration
 * - Performance optimization with caching
 * - CLI flag support: --console-depth <number>
 * 
 * Usage:
 *   bun run depth-control-demo.ts                    # Default depth (2)
 *   bun run depth-control-demo.ts --console-depth 4 # Custom depth (4)
 *   bun run depth-control-demo.ts --console-depth 8 # Deep inspection (8)
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { EnhancedConsoleInspectionModule } from './enhanced-console-inspection-module';

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

function parseDepth(): number {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--console-depth') {
            const depth = parseInt(args[i + 1]);
            if (isNaN(depth) || depth < 1 || depth > 20) {
                console.error('❌ Invalid depth. Please use a number between 1 and 20.');
                process.exit(1);
            }
            return depth;
        } else if (args[i].startsWith('--console-depth=')) {
            const depth = parseInt(args[i].split('=')[1]);
            if (isNaN(depth) || depth < 1 || depth > 20) {
                console.error('❌ Invalid depth. Please use a number between 1 and 20.');
                process.exit(1);
            }
            return depth;
        }
    }

    return 2; // Default
}

// =============================================================================
// BASIC DEPTH CONTROL DEMONSTRATION
// =============================================================================

function demonstrateBasicDepthControl(depth: number) {
    console.log('🔍 Basic Depth Control Demonstration');
    console.log('=====================================');
    console.log(`🔧 Using CLI-specified depth: ${depth}`);

    // Your exact example
    const nested = { a: { b: { c: { d: "deep" } } } };

    console.log('\n📋 Default console.log (depth 2):');
    console.log(nested);
    // Expected: { a: { b: [Object] } }

    console.log(`\n🔧 Bun.inspect with depth ${depth}:`);
    console.log(Bun.inspect(nested, { depth, colors: true }));
    // Expected with depth 4: { a: { b: { c: { d: 'deep' } } } }

    console.log('\n🎨 Enhanced with true colors:');
    const enhancedConsole = new EnhancedConsoleInspectionModule({
        showColors: true,
        inspectionDepth: depth,
        colorFormat: 'ansi-16m',
        enableCanvasBranding: true,
        performanceMode: true
    });

    const stylizer = enhancedConsole.getColorManager().createStylizer();
    console.log(Bun.inspect(nested, {
        depth,
        colors: true
    }));
}

// =============================================================================
// ADVANCED DEPTH CONTROL EXAMPLES
// =============================================================================

function demonstrateAdvancedDepthControl() {
    console.log('\n🏗️ Advanced Depth Control Examples');
    console.log('===================================');

    // Create progressively deeper objects
    const depthExamples = {
        depth2: { level1: { level2: "depth 2" } },
        depth3: { level1: { level2: { level3: "depth 3" } } },
        depth4: { level1: { level2: { level3: { level4: "depth 4" } } } },
        depth5: { level1: { level2: { level3: { level4: { level5: "depth 5" } } } } }
    };

    Object.entries(depthExamples).forEach(([name, obj]) => {
        console.log(`\n📊 ${name.toUpperCase()} - Default console.log:`);
        console.log(obj);

        console.log(`\n🔧 ${name.toUpperCase()} - Bun.inspect with full depth:`);
        const depth = parseInt(name.replace('depth', ''));
        console.log(Bun.inspect(obj, { depth, colors: true }));
    });
}

// =============================================================================
// REAL-WORLD COMPLEX OBJECT INSPECTION
// =============================================================================

function demonstrateRealWorldInspection() {
    console.log('\n🌐 Real-World Complex Object Inspection');
    console.log('=======================================');

    const apiResponse = {
        success: true,
        data: {
            user: {
                id: 12345,
                profile: {
                    name: 'John Doe',
                    settings: {
                        notifications: {
                            email: true,
                            push: false,
                            sms: {
                                enabled: true,
                                number: '+1234567890',
                                carrier: {
                                    name: 'Verizon',
                                    code: 'VZ',
                                    supported: true
                                }
                            }
                        }
                    }
                }
            }
        },
        metadata: {
            timestamp: new Date(),
            requestId: 'req_abc123',
            processingTime: 125.5
        }
    };

    console.log('\n📋 Default API response (depth 2):');
    console.log(apiResponse);

    console.log('\n🔧 Deep API inspection (depth 6):');
    console.log(Bun.inspect(apiResponse, {
        depth: 3,
        colors: true,
        compact: false
    }));

    console.log('\n🎨 Enhanced with canvas semantic colors:');
    const enhancedConsole = new EnhancedConsoleInspectionModule({
        showColors: true,
        inspectionDepth: 6,
        enableCanvasBranding: true
    });

    const semanticStylizer = (text: string, styleType: string): string => {
        if (!text) return text;

        const colorManager = enhancedConsole.getColorManager();

        if (styleType.includes('success') || styleType.includes('true')) {
            return `${colorManager.getCanvasColor('active')}${text}${colorManager.getResetCode()}`;
        }
        if (styleType.includes('error') || styleType.includes('false')) {
            return `${colorManager.getCanvasColor('deprecated')}${text}${colorManager.getResetCode()}`;
        }
        if (styleType.includes('warning') || styleType.includes('beta')) {
            return `${colorManager.getCanvasColor('beta')}${text}${colorManager.getResetCode()}`;
        }
        if (styleType.includes('experimental') || styleType.includes('pending')) {
            return `${colorManager.getCanvasColor('experimental')}${text}${colorManager.getResetCode()}`;
        }

        return colorManager.createStylizer()(text, styleType);
    };

    console.log(Bun.inspect(apiResponse, {
        depth: 4,
        colors: true,
        compact: false
    }));
}

// =============================================================================
// PERFORMANCE COMPARISON
// =============================================================================

function demonstratePerformanceComparison() {
    console.log('\n⚡ Performance Comparison: Depth Control Impact');
    console.log('===============================================');

    const largeObject = {
        services: Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            name: `Service ${i + 1}`,
            status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'beta' : 'deprecated',
            metrics: {
                requests: Math.floor(Math.random() * 1000000),
                errors: Math.floor(Math.random() * 100),
                uptime: (95 + Math.random() * 5).toFixed(1) + '%',
                metadata: {
                    version: `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
                    lastUpdated: new Date(),
                    features: Array.from({ length: 5 }, (_, j) => `feature-${j + 1}`)
                }
            }
        })),
        system: {
            health: (95 + Math.random() * 5).toFixed(1),
            memory: {
                used: Math.floor(Math.random() * 512),
                total: 512,
                percentage: Math.floor(Math.random() * 100)
            },
            cpu: {
                usage: (20 + Math.random() * 60).toFixed(1),
                cores: 8,
                loadAverage: Array.from({ length: 3 }, () => (Math.random() * 2).toFixed(2))
            }
        }
    };

    const iterations = 1000;
    const depths = [2, 4, 6, 8];

    console.log(`Testing performance with ${iterations} inspections of complex object...\n`);

    depths.forEach(depth => {
        console.log(`🔍 Testing depth ${depth}:`);

        // Test Bun.inspect performance
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            Bun.inspect(largeObject, { depth, colors: false });
        }
        const duration = performance.now() - start;
        const opsPerSec = Math.round(iterations / duration * 1000);

        console.log(`  Duration: ${duration.toFixed(2)}ms`);
        console.log(`  Operations/sec: ${opsPerSec.toLocaleString()}`);

        // Show sample output
        console.log(`  Sample output (depth ${depth}):`);
        console.log('  ' + Bun.inspect(largeObject, { depth, colors: true }).split('\n')[0] + '...');
        console.log('');
    });
}

// =============================================================================
// DEPTH CONTROL BEST PRACTICES
// =============================================================================

function demonstrateBestPractices() {
    console.log('\n💡 Depth Control Best Practices');
    console.log('================================');

    const examples = {
        // Shallow for quick debugging
        quickDebug: {
            recommendation: 'Depth 2-3 for quick debugging',
            example: { status: 'active', user: { id: 123, name: 'John' } },
            usage: 'console.log(obj) or Bun.inspect(obj, { depth: 2 })'
        },

        // Medium for API responses
        apiResponse: {
            recommendation: 'Depth 4-6 for API responses',
            example: { data: { user: { profile: { settings: { theme: 'dark' } } } } },
            usage: 'Bun.inspect(response, { depth: 5, colors: true })'
        },

        // Deep for complex objects
        complexObjects: {
            recommendation: 'Depth 6-8 for complex nested objects',
            example: { system: { services: { components: { modules: { functions: {} } } } } },
            usage: 'Bun.inspect(complex, { depth: 7, colors: true, compact: false })'
        },

        // Maximum for debugging
        maximumDepth: {
            recommendation: 'Depth 10+ for thorough debugging',
            example: { deep: { nesting: { levels: { going: { deep: { into: { the: { object: { structure: {} } } } } } } } } },
            usage: 'Bun.inspect(veryDeep, { depth: 12, colors: true, maxStringLength: 100 })'
        }
    };

    Object.entries(examples).forEach(([name, config]) => {
        console.log(`\n📝 ${config.recommendation}:`);
        console.log(`   Usage: ${config.usage}`);
        console.log(`   Example output:`);
        console.log('   ' + Bun.inspect(config.example, {
            depth: name === 'quickDebug' ? 2 : name === 'apiResponse' ? 4 : name === 'complexObjects' ? 6 : 8,
            colors: true
        }).split('\n')[0] + '...');
    });

    console.log('\n🎯 Pro Tips:');
    console.log('   • Use depth 2 for quick debugging and logging');
    console.log('   • Use depth 4-6 for API responses and data structures');
    console.log('   • Use depth 6-8 for complex nested objects');
    console.log('   • Use maxArrayLength and maxStringLength to control output size');
    console.log('   • Enable colors for better readability in development');
    console.log('   • Use compact: true for production logging');
    console.log('   • Combine with stylizers for semantic highlighting');
}

// =============================================================================
// MAIN EXECUTION WITH CLI SUPPORT
// =============================================================================

async function main() {
    const depth = parseDepth();

    console.log('🎯 Bun Depth Control Demo');
    console.log('==========================');
    console.log(`🔧 Console depth: ${depth}`);
    console.log('Demonstrating superior depth control capabilities in Bun');
    console.log('with enhanced console inspection and true color support.\n');

    demonstrateBasicDepthControl(depth);
    demonstrateAdvancedDepthControl();
    demonstrateRealWorldInspection();
    demonstratePerformanceComparison();
    demonstrateBestPractices();

    console.log('\n🎉 Depth Control Demo Complete!');
    console.log('🔍 You now have mastered Bun\'s enhanced console inspection!');
    console.log(`💡 Used depth ${depth} - perfect for ${depth < 4 ? 'quick debugging' : depth < 8 ? 'development' : 'deep analysis'}!`);
    console.log('🚀 Use --console-depth <number> to customize inspection depth!');
}

// Export for programmatic use
export {
    demonstrateBasicDepthControl,
    demonstrateAdvancedDepthControl,
    demonstrateRealWorldInspection,
    demonstratePerformanceComparison,
    demonstrateBestPractices
};

// Run if executed directly
if (import.meta.main) {
    main().catch(console.error);
}

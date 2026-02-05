#!/usr/bin/env bun
/**
 * Enhanced Console Demo with Bun.color ANSI Mastery
 * 
 * Demonstrates the integration of perfect Bun.color ANSI format support
 * with the ConsoleInspectionModule for superior terminal output:
 * 
 * - 24-bit true color (ansi-16m) for modern terminals
 * - 256-color (ansi-256) fallback for standard terminals  
 * - 16-color (ansi-16) fallback for legacy terminals
 * - Progressive enhancement with automatic capability detection
 * - Canvas brand color integration
 * - Performance optimized color caching
 * - Real-world canvas system dashboard examples
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// =============================================================================
// IMPORTS AND DEPENDENCIES
// =============================================================================

import { EnhancedConsoleInspectionModule, ColorManager } from './enhanced-console-inspection-module';

// =============================================================================
// MAIN DEMONSTRATION
// =============================================================================

async function main() {
    console.log('🚀 Enhanced Console Demo with Bun.color ANSI Mastery');
    console.log('=====================================================\n');

    // Create enhanced console inspection module with optimal configuration
    const enhancedConsole = new EnhancedConsoleInspectionModule({
        showColors: true,
        inspectionDepth: 4,
        showAnimations: true,
        colorFormat: 'auto', // Auto-detect terminal capabilities
        enableCanvasBranding: true,
        performanceMode: true
    });

    // Run comprehensive demonstrations
    await demonstrateObjectInspection(enhancedConsole);
    await demonstrateCanvasDashboard(enhancedConsole);
    await demonstrateColorFormats(enhancedConsole);
    await demonstratePerformanceOptimization(enhancedConsole);
    await demonstrateProgressiveEnhancement(enhancedConsole);

    console.log('\n🎉 Enhanced Console Demo Complete!');
    console.log('🌈 Your console now has perfect Bun.color ANSI mastery!');
}

async function demonstrateObjectInspection(consoleModule: EnhancedConsoleInspectionModule) {
    console.log('\n📋 Section 1: Enhanced Object Inspection');
    console.log('==========================================');

    consoleModule.demonstrateObjectInspection();
    consoleModule.demonstrateInspectionUtilities();
}

async function demonstrateCanvasDashboard(consoleModule: EnhancedConsoleInspectionModule) {
    console.log('\n📊 Section 2: Canvas System Dashboard');
    console.log('=====================================');

    const colorManager = consoleModule.getColorManager();

    // Create a real-time canvas dashboard with true colors
    console.log('\n🌈 Canvas System Status Dashboard (True Color)');
    console.log(''.padEnd(80, '═'));

    const services = [
        { name: 'Bridge Service', status: 'active', health: 98.5, connections: 42 },
        { name: 'Analytics Engine', status: 'beta', health: 87.2, connections: 28 },
        { name: 'Legacy Service', status: 'deprecated', health: 45.8, connections: 15 },
        { name: 'Experimental Feature', status: 'experimental', health: 92.1, connections: 8 },
        { name: 'API Gateway', status: 'active', health: 99.2, connections: 156 },
        { name: 'Database', status: 'active', health: 96.8, connections: 89 },
        { name: 'Cache Layer', status: 'beta', health: 91.3, connections: 234 },
        { name: 'Monitor Service', status: 'active', health: 94.7, connections: 67 }
    ];

    services.forEach((service, index) => {
        const statusColor = colorManager.getCanvasColor(service.status as any);
        const reset = colorManager.getResetCode();
        const healthColor = service.health >= 95 ? colorManager.getCanvasColor('active') :
            service.health >= 80 ? colorManager.getCanvasColor('beta') :
                colorManager.getCanvasColor('deprecated');

        const indicator = `${statusColor}●${reset}`;
        const healthBar = '█'.repeat(Math.floor(service.health / 10)) + '░'.repeat(10 - Math.floor(service.health / 10));
        const healthDisplay = `${healthColor}${healthBar}${reset} ${service.health}%`;

        console.log(`${index + 1}. ${indicator} ${service.name.padEnd(20)} ${service.status.padEnd(12)} ${healthDisplay} ${service.connections} connections`);
    });

    console.log(''.padEnd(80, '═'));

    // Show system metrics with color coding
    const systemMetrics = {
        totalServices: services.length,
        activeServices: services.filter(s => s.status === 'active').length,
        betaServices: services.filter(s => s.status === 'beta').length,
        deprecatedServices: services.filter(s => s.status === 'deprecated').length,
        averageHealth: (services.reduce((sum, s) => sum + s.health, 0) / services.length).toFixed(1),
        totalConnections: services.reduce((sum, s) => sum + s.connections, 0)
    };

    console.log('\n📈 System Metrics Summary:');
    console.log(Bun.inspect(systemMetrics, {
        depth: 3,
        colors: true,
        stylize: (text: string, styleType: string) => {
            if (styleType.includes('active')) return `${colorManager.getCanvasColor('active')}${text}${colorManager.getResetCode()}`;
            if (styleType.includes('beta')) return `${colorManager.getCanvasColor('beta')}${text}${colorManager.getResetCode()}`;
            if (styleType.includes('deprecated')) return `${colorManager.getCanvasColor('deprecated')}${text}${colorManager.getResetCode()}`;
            return text;
        }
    }));
}

async function demonstrateColorFormats(consoleModule: EnhancedConsoleInspectionModule) {
    console.log('\n🌈 Section 3: Comprehensive Color Formats');
    console.log('==========================================');

    consoleModule.demonstrateColorFormats();
}

async function demonstratePerformanceOptimization(consoleModule: EnhancedConsoleInspectionModule) {
    console.log('\n⚡ Section 4: Performance Optimization');
    console.log('=====================================');

    const colorManager = consoleModule.getColorManager();

    // Demonstrate color caching performance
    console.log('\n🎯 Color Caching Performance Test:');

    const testColors = ['#10B981', '#EAB308', '#EF4444', '#8B5CF6', '#F59E0B', '#06B6D4'];
    const iterations = 10000;

    console.log(`Testing ${iterations} color conversions with caching...\n`);

    // Test without caching
    const startNoCache = performance.now();
    for (let i = 0; i < iterations; i++) {
        const color = testColors[i % testColors.length];
        Bun.color(color, 'ansi-16m');
    }
    const noCacheTime = performance.now() - startNoCache;

    // Test with caching
    const startWithCache = performance.now();
    for (let i = 0; i < iterations; i++) {
        const color = testColors[i % testColors.length];
        colorManager.getColor(color, 'ansi-16m');
    }
    const withCacheTime = performance.now() - startWithCache;

    const noCacheOps = Math.round(iterations / noCacheTime * 1000);
    const withCacheOps = Math.round(iterations / withCacheTime * 1000);
    const improvement = (noCacheTime / withCacheTime).toFixed(1);

    console.log(`Without Cache: ${noCacheOps.toLocaleString()} ops/sec`);
    console.log(`With Cache:    ${withCacheOps.toLocaleString()} ops/sec`);
    console.log(`Improvement:   ${improvement}x faster`);
    console.log(`Cache Size:    ${colorManager.getCacheStats().size} entries`);

    // Demonstrate format switching performance
    console.log('\n🔄 Format Switching Performance:');

    const formats = ['ansi-16m', 'ansi-256', 'ansi-16'] as const;

    formats.forEach(format => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            colorManager.getColor('#10B981', format);
        }
        const duration = performance.now() - start;
        const opsPerSec = Math.round(1000 / duration * 1000);

        console.log(`${format.padEnd(10)}: ${opsPerSec.toLocaleString()} ops/sec`);
    });
}

async function demonstrateProgressiveEnhancement(consoleModule: EnhancedConsoleInspectionModule) {
    console.log('\n💻 Section 5: Progressive Enhancement');
    console.log('=====================================');

    // Test different terminal configurations
    const configurations = [
        { name: 'Modern Terminal', colorFormat: 'ansi-16m' as const, enableCanvasBranding: true },
        { name: 'Standard Terminal', colorFormat: 'ansi-256' as const, enableCanvasBranding: true },
        { name: 'Legacy Terminal', colorFormat: 'ansi-16' as const, enableCanvasBranding: false },
        { name: 'No Color Support', colorFormat: 'auto' as const, showColors: false, enableCanvasBranding: false }
    ];

    configurations.forEach(config => {
        console.log(`\n🖥️ ${config.name} Configuration:`);

        const testConsole = new EnhancedConsoleInspectionModule({
            showColors: config.showColors !== false,
            inspectionDepth: 3,
            colorFormat: config.colorFormat,
            enableCanvasBranding: config.enableCanvasBranding !== false,
            performanceMode: true
        });

        const sampleData = {
            service: 'Bridge Service',
            status: 'active',
            health: 98.5,
            color: '#10B981'
        };

        console.log('Sample data output:');
        console.log(Bun.inspect(sampleData, {
            depth: 3,
            colors: testConsole.getConfig().showColors,
            stylize: testConsole.getColorManager().createStylizer()
        }));

        const capabilities = testConsole.getColorManager().getCapabilities();
        const optimalFormat = testConsole.getColorManager().getOptimalColorFormat();

        console.log(`Capabilities: True Color ${capabilities.trueColor ? '✅' : '❌'}, 256-Color ${capabilities.color256 ? '✅' : '❌'}, 16-Color ${capabilities.color16 ? '✅' : '❌'}`);
        console.log(`Optimal Format: ${optimalFormat}`);
    });

    // Show automatic format detection
    console.log('\n🎯 Automatic Format Detection:');
    console.log('The system automatically selects the best format based on terminal capabilities:');
    console.log('1. Try ansi-16m (24-bit true color) first');
    console.log('2. Fallback to ansi-256 (256-color palette)');
    console.log('3. Final fallback to ansi-16 (16-color palette)');
    console.log('4. Plain text if no color support detected');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function createCanvasColorDemo(colorManager: ColorManager) {
    return {
        showColorPalette: () => {
            console.log('\n🎨 Canvas Color Palette Demo:');

            const canvasColors = [
                { name: 'Primary', hex: '#0f172a', usage: 'Main interface elements' },
                { name: 'Secondary', hex: '#1e40af', usage: 'Secondary actions and info' },
                { name: 'Accent', hex: '#f59e0b', usage: 'Highlights and emphasis' },
                { name: 'Active', hex: '#10b981', usage: 'Active states and success' },
                { name: 'Beta', hex: '#eab308', usage: 'Beta features and warnings' },
                { name: 'Deprecated', hex: '#ef4444', usage: 'Deprecated items and errors' },
                { name: 'Experimental', hex: '#8b5cf6', usage: 'Experimental features' }
            ];

            canvasColors.forEach(color => {
                const trueColor = colorManager.getColor(color.hex, 'ansi-16m');
                const color256 = colorManager.getColor(color.hex, 'ansi-256');
                const color16 = colorManager.getColor(color.hex, 'ansi-16');

                console.log(`${color.name.padEnd(15)} ${color.hex.padEnd(10)} → ${trueColor}${color.name}${colorManager.getResetCode()}`);
                console.log(`              Usage: ${color.usage}`);
                console.log(`              True Color: ${JSON.stringify(trueColor)}`);
                console.log(`              256-Color:  ${JSON.stringify(color256)}`);
                console.log(`              16-Color:  ${JSON.stringify(color16)}`);
                console.log('');
            });
        }
    };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Run the demonstration
if (import.meta.main) {
    main().catch(console.error);
}

// Export for programmatic use
export {
    main,
    demonstrateObjectInspection,
    demonstrateCanvasDashboard,
    demonstrateColorFormats,
    demonstratePerformanceOptimization,
    demonstrateProgressiveEnhancement,
    createCanvasColorDemo
};

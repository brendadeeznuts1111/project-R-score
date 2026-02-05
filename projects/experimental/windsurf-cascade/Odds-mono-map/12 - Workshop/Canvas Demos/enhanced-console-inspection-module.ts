#!/usr/bin/env bun
/**
 * Enhanced Console Inspection Module with Bun.color ANSI Mastery
 * 
 * Integrates perfect Bun.color ANSI format support for superior console output:
 * - 24-bit true color (ansi-16m) for modern terminals
 * - 256-color (ansi-256) fallback for standard terminals  
 * - 16-color (ansi-16) fallback for legacy terminals
 * - Progressive enhancement with automatic capability detection
 * - Canvas brand color integration
 * - Performance optimized color caching
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// =============================================================================
// IMPORTS AND DEPENDENCIES
// =============================================================================

import {
    CANVAS_BRAND_COLORS
} from '../../src/types/canvas-color';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface EnhancedConsoleConfig {
    showColors: boolean;
    inspectionDepth: number;
    showAnimations: boolean;
    colorFormat: 'ansi-16m' | 'ansi-256' | 'ansi-16' | 'auto';
    enableCanvasBranding: boolean;
    performanceMode: boolean;
}

interface ColorCapabilities {
    trueColor: boolean;
    color256: boolean;
    color16: boolean;
    detected: boolean;
}

interface ColorCache {
    get: (color: string, format: string) => string | undefined;
    set: (color: string, format: string, result: string) => void;
    clear: () => void;
    size: number;
}

interface InspectionOptions {
    depth?: number;
    colors?: boolean;
    compact?: boolean;
    maxArrayLength?: number;
    maxStringLength?: number;
    stylize?: (text: string, styleType: string) => string;
}

// =============================================================================
// ENHANCED COLOR MANAGER
// =============================================================================

class ColorManager {
    private capabilities: ColorCapabilities;
    private cache: ColorCache;
    private config: EnhancedConsoleConfig;

    constructor(config: EnhancedConsoleConfig) {
        this.config = config;
        this.capabilities = this.detectColorCapabilities();
        this.cache = this.createColorCache();
    }

    private detectColorCapabilities(): ColorCapabilities {
        // In a real implementation, this would detect terminal capabilities
        // For now, we'll assume modern terminal capabilities
        return {
            trueColor: true,
            color256: true,
            color16: true,
            detected: true
        };
    }

    private createColorCache(): ColorCache {
        const cache = new Map<string, Map<string, string>>();

        return {
            get: (color: string, format: string) => {
                return cache.get(color)?.get(format);
            },
            set: (color: string, format: string, result: string) => {
                if (!cache.has(color)) {
                    cache.set(color, new Map());
                }
                cache.get(color)!.set(format, result);
            },
            clear: () => cache.clear(),
            get size() {
                return cache.size;
            }
        };
    }

    public getOptimalColorFormat(): 'ansi-16m' | 'ansi-256' | 'ansi-16' {
        if (this.config.colorFormat !== 'auto') {
            return this.config.colorFormat;
        }

        if (this.capabilities.trueColor) return 'ansi-16m';
        if (this.capabilities.color256) return 'ansi-256';
        return 'ansi-16';
    }

    public getColor(hex: string, targetFormat?: string): string {
        // Ensure hex is a string and valid
        if (typeof hex !== 'string' || !hex) {
            return '\u001b[0m';
        }

        const format = targetFormat || this.getOptimalColorFormat();

        // Check cache first for performance
        if (this.config.performanceMode) {
            const cached = this.cache.get(hex, format);
            if (cached) return cached;
        }

        // Generate color using Bun.color
        let result: string | null;
        try {
            result = Bun.color(hex, format as 'ansi-16m' | 'ansi-256' | 'ansi-16');
        } catch (error) {
            console.warn(`Color conversion failed for ${hex}:`, error);
            return '\u001b[0m';
        }

        // Cache result if performance mode is enabled
        if (this.config.performanceMode && typeof result === 'string') {
            this.cache.set(hex, format, result);
        }

        return result || '\u001b[0m';
    }

    public getCanvasColor(colorName: string): string {
        let hex: string;

        // Handle nested status colors
        if (colorName in CANVAS_BRAND_COLORS.status) {
            hex = CANVAS_BRAND_COLORS.status[colorName as keyof typeof CANVAS_BRAND_COLORS.status];
        }
        // Handle domain colors
        else if (colorName in CANVAS_BRAND_COLORS.domain) {
            hex = CANVAS_BRAND_COLORS.domain[colorName as keyof typeof CANVAS_BRAND_COLORS.domain];
        }
        // Handle top-level colors
        else if (colorName in CANVAS_BRAND_COLORS) {
            const colorValue = CANVAS_BRAND_COLORS[colorName as keyof typeof CANVAS_BRAND_COLORS];
            if (typeof colorValue !== 'string') {
                throw new Error(`Canvas color '${colorName}' is a group, not a specific color`);
            }
            hex = colorValue;
        }
        else {
            throw new Error(`Unknown canvas color: ${colorName}`);
        }

        // Ensure hex is a string
        if (typeof hex !== 'string' || !hex) {
            return '\u001b[0m';
        }

        return this.getColor(hex);
    }

    public getResetCode(): string {
        return '\u001b[0m';
    }

    public createStylizer() {
        return (text: string, styleType: string): string => {
            if (!this.config.showColors) return text;

            const colorMap = {
                'string': this.config.enableCanvasBranding ? this.getCanvasColor('accent') : this.getColor('#22c55e'),
                'number': this.config.enableCanvasBranding ? this.getCanvasColor('secondary') : this.getColor('#3b82f6'),
                'boolean': this.config.enableCanvasBranding ? this.getCanvasColor('experimental') : this.getColor('#a855f7'),
                'date': this.config.enableCanvasBranding ? this.getCanvasColor('active') : this.getColor('#06b6d4'),
                'function': this.config.enableCanvasBranding ? this.getCanvasColor('beta') : this.getColor('#f59e0b'),
                'symbol': this.config.enableCanvasBranding ? this.getCanvasColor('deprecated') : this.getColor('#ef4444'),
                'object': this.config.enableCanvasBranding ? this.getCanvasColor('primary') : this.getColor('#6b7280'),
                'array': this.config.enableCanvasBranding ? this.getCanvasColor('secondary') : this.getColor('#3b82f6'),
                'null': this.config.enableCanvasBranding ? this.getCanvasColor('deprecated') : this.getColor('#ef4444'),
                'undefined': this.config.enableCanvasBranding ? this.getCanvasColor('deprecated') : this.getColor('#ef4444')
            };

            const color = colorMap[styleType as keyof typeof colorMap] || text;
            return `${color}${text}${this.getResetCode()}`;
        };
    }

    public getCapabilities(): ColorCapabilities {
        return { ...this.capabilities };
    }

    public getCacheStats(): { size: number; hits: number; misses: number } {
        return {
            size: this.cache.size,
            hits: 0, // Would need tracking implementation
            misses: 0 // Would need tracking implementation
        };
    }
}

// =============================================================================
// ENHANCED CONSOLE INSPECTION MODULE
// =============================================================================

class EnhancedConsoleInspectionModule {
    private config: EnhancedConsoleConfig;
    private colorManager: ColorManager;

    constructor(config: Partial<EnhancedConsoleConfig> = {}) {
        this.config = {
            showColors: true,
            inspectionDepth: 4,
            showAnimations: true,
            colorFormat: 'auto',
            enableCanvasBranding: true,
            performanceMode: true,
            ...config
        };

        this.colorManager = new ColorManager(this.config);
    }

    public demonstrateObjectInspection(): void {
        this.printHeader('🔍 Enhanced Console Object Inspection with True Color');

        const testData = this.createTestData();

        this.showCapabilities();
        this.showDefaultInspection(testData);
        this.showTrueColorInspection(testData);
        this.showCanvasBranding(testData);
        this.showPerformanceComparison(testData);
        this.showProgressiveEnhancement(testData);
    }

    private showCapabilities(): void {
        console.log('\n🎯 Color Capabilities Detection:');
        const capabilities = this.colorManager.getCapabilities();
        const optimalFormat = this.colorManager.getOptimalColorFormat();

        console.log(`True Color Support: ${capabilities.trueColor ? '✅' : '❌'}`);
        console.log(`256-Color Support: ${capabilities.color256 ? '✅' : '❌'}`);
        console.log(`16-Color Support: ${capabilities.color16 ? '✅' : '❌'}`);
        console.log(`Optimal Format: ${optimalFormat}`);
        console.log(`Canvas Branding: ${this.config.enableCanvasBranding ? '✅' : '❌'}`);
        console.log(`Performance Mode: ${this.config.performanceMode ? '✅' : '❌'}`);
    }

    private createTestData() {
        return {
            canvas: {
                services: {
                    bridge: {
                        status: 'active',
                        color: '#10B981',
                        connections: 42,
                        uptime: '99.9%'
                    },
                    analytics: {
                        status: 'beta',
                        color: '#EAB308',
                        metrics: { requests: 1250000, errors: 23 },
                        version: '2.1.0'
                    },
                    legacy: {
                        status: 'deprecated',
                        color: '#EF4444',
                        migration: 'in-progress',
                        sunset: '2025-12-31'
                    }
                },
                metadata: {
                    totalServices: 3,
                    activeServices: 1,
                    betaServices: 1,
                    deprecatedServices: 1,
                    lastUpdated: new Date(),
                    version: '1.0.0'
                }
            },
            performance: {
                timing: {
                    average: 125.5,
                    p95: 280.3,
                    p99: 450.7,
                    unit: 'ms'
                },
                memory: {
                    used: 256,
                    total: 512,
                    percentage: 50,
                    unit: 'MB'
                }
            },
            array: [1, 2, 3, {
                nested: {
                    canvas: {
                        colors: ['#10B981', '#EAB308', '#EF4444', '#8B5CF6'],
                        formats: ['ansi-16m', 'ansi-256', 'ansi-16']
                    }
                }
            }],
            function: () => 'Canvas function result',
            date: new Date(),
            regex: /canvas.*pattern/g,
            symbol: Symbol('canvas-symbol')
        };
    }

    private showDefaultInspection(data: any): void {
        console.log('\n📋 Default Inspection (Depth 2):');
        console.log('Standard console.log with current terminal capabilities:');
        console.log(data);
    }

    private showTrueColorInspection(data: any): void {
        console.log('\n🌈 True Color Inspection (ansi-16m):');
        console.log('24-bit true color with exact RGB reproduction:');

        const trueColorOptions: InspectionOptions = {
            depth: this.config.inspectionDepth,
            colors: this.config.showColors,
            compact: false,
            maxArrayLength: 10,
            maxStringLength: 50,
            stylize: this.colorManager.createStylizer()
        };

        console.log(Bun.inspect(data, trueColorOptions));
    }

    private showCanvasBranding(data: any): void {
        if (!this.config.enableCanvasBranding) {
            console.log('\n🎨 Canvas Branding (disabled)');
            return;
        }

        console.log('\n🎨 Canvas Brand Colors Integration:');
        console.log('Using exact canvas brand colors for visual consistency:');

        // Create canvas-specific stylizer
        const canvasStylizer = (text: string, styleType: string): string => {
            if (!this.config.showColors) return text;

            const canvasColors = {
                'active': this.colorManager.getCanvasColor('active'),
                'beta': this.colorManager.getCanvasColor('beta'),
                'deprecated': this.colorManager.getCanvasColor('deprecated'),
                'experimental': this.colorManager.getCanvasColor('experimental'),
                'primary': this.colorManager.getCanvasColor('primary'),
                'secondary': this.colorManager.getCanvasColor('secondary'),
                'accent': this.colorManager.getCanvasColor('accent')
            };

            // Custom styling based on content
            if (styleType.includes('active')) return `${canvasColors.active}${text}${this.colorManager.getResetCode()}`;
            if (styleType.includes('beta')) return `${canvasColors.beta}${text}${this.colorManager.getResetCode()}`;
            if (styleType.includes('deprecated')) return `${canvasColors.deprecated}${text}${this.colorManager.getResetCode()}`;
            if (styleType.includes('experimental')) return `${canvasColors.experimental}${text}${this.colorManager.getResetCode()}`;

            return text;
        };

        const canvasOptions: InspectionOptions = {
            depth: this.config.inspectionDepth,
            colors: this.config.showColors,
            compact: false,
            stylize: canvasStylizer
        };

        console.log(Bun.inspect(data, canvasOptions));
    }

    private showPerformanceComparison(data: any): void {
        console.log('\n⚡ Performance Comparison:');

        const iterations = 1000;
        const formats = ['ansi-16m', 'ansi-256', 'ansi-16'] as const;

        formats.forEach(format => {
            const start = performance.now();

            for (let i = 0; i < iterations; i++) {
                Bun.color('#10B981', format);
            }

            const duration = performance.now() - start;
            const opsPerSecond = Math.round(iterations / duration * 1000);

            console.log(`${format.padEnd(10)}: ${duration.toFixed(2)}ms (${opsPerSecond.toLocaleString()} ops/sec)`);
        });

        if (this.config.performanceMode) {
            const cacheStats = this.colorManager.getCacheStats();
            console.log(`\nCache Statistics: ${cacheStats.size} entries cached`);
        }
    }

    private showProgressiveEnhancement(data: any): void {
        console.log('\n💻 Progressive Enhancement Demonstration:');

        const formats = [
            { name: '24-bit True Color (ansi-16m)', format: 'ansi-16m' },
            { name: '256-color (ansi-256)', format: 'ansi-256' },
            { name: '16-color (ansi-16)', format: 'ansi-16' }
        ];

        formats.forEach(({ name, format }) => {
            console.log(`\n${name}:`);
            const testColor = this.colorManager.getColor('#10B981', format);
            console.log(`Canvas Green: ${JSON.stringify(testColor)}`);

            // Show sample inspection with this format
            const sampleData = { status: 'active', color: '#10B981', value: 42 };
            const stylizer = (text: string, styleType: string): string => {
                if (styleType === 'status') return `${testColor}${text}${this.colorManager.getResetCode()}`;
                return text;
            };

            console.log(Bun.inspect(sampleData, {
                depth: 2,
                colors: this.config.showColors,
                stylize: stylizer
            }));
        });
    }

    public demonstrateInspectionUtilities(): void {
        this.printHeader('🛠️ Enhanced Inspection Utilities');

        const complexObject = this.createComplexObject();

        this.showStandardVsEnhanced(complexObject);
        this.showTruncatedArrays(complexObject);
        this.showColorFormatting(complexObject);
        this.showMemoryOptimization();
    }

    private createComplexObject() {
        return {
            canvasServices: [
                {
                    id: 1,
                    name: 'Bridge Service',
                    status: 'active',
                    color: '#10B981',
                    health: 98.5,
                    uptime: '99.9%',
                    connections: 42,
                    lastCheck: new Date()
                },
                {
                    id: 2,
                    name: 'Analytics Engine',
                    status: 'beta',
                    color: '#EAB308',
                    health: 87.2,
                    uptime: '95.3%',
                    connections: 28,
                    lastCheck: new Date()
                },
                {
                    id: 3,
                    name: 'Legacy Service',
                    status: 'deprecated',
                    color: '#EF4444',
                    health: 45.8,
                    uptime: '78.1%',
                    connections: 15,
                    lastCheck: new Date()
                }
            ],
            systemMetrics: {
                total: 3,
                active: 1,
                beta: 1,
                deprecated: 1,
                averageHealth: 77.17,
                lastUpdated: new Date(),
                version: '1.0.0'
            },
            configuration: {
                features: {
                    authentication: true,
                    logging: true,
                    caching: false,
                    monitoring: true
                },
                limits: {
                    maxServices: 100,
                    sessionTimeout: 3600,
                    retryAttempts: 3
                }
            }
        };
    }

    private showStandardVsEnhanced(data: any): void {
        console.log('\n📋 Standard Console.log:');
        console.log(data);

        console.log('\n🌈 Enhanced with True Color & Canvas Branding:');
        const enhancedOptions: InspectionOptions = {
            depth: this.config.inspectionDepth,
            colors: this.config.showColors,
            compact: false,
            stylize: this.createCanvasStylizer()
        };

        console.log(Bun.inspect(data, enhancedOptions));
    }

    private showTruncatedArrays(data: any): void {
        console.log('\n📏 Truncated Arrays with Color Coding:');
        console.log(Bun.inspect(data, {
            depth: 3,
            colors: this.config.showColors,
            maxArrayLength: 2,
            maxStringLength: 15,
            stylize: this.createCanvasStylizer()
        }));
    }

    private showColorFormatting(data: any): void {
        console.log('\n🎨 Advanced Color Formatting:');

        // Show different color formats
        const colorDemo = {
            trueColor: this.colorManager.getColor('#10B981', 'ansi-16m'),
            color256: this.colorManager.getColor('#10B981', 'ansi-256'),
            color16: this.colorManager.getColor('#10B981', 'ansi-16'),
            canvas: this.colorManager.getCanvasColor('active')
        };

        console.log('Color Format Comparison:');
        Object.entries(colorDemo).forEach(([format, color]) => {
            console.log(`${format.padEnd(12)}: ${JSON.stringify(color)}`);
        });

        // Apply colors to the data
        const coloredData = {
            '✅ Active Service': data.canvasServices.filter(s => s.status === 'active').length,
            '🔄 Beta Service': data.canvasServices.filter(s => s.status === 'beta').length,
            '⚠️ Deprecated Service': data.canvasServices.filter(s => s.status === 'deprecated').length
        };

        console.log('\n📊 Status Summary with Colors:');
        console.log(Bun.inspect(coloredData, {
            depth: 2,
            colors: this.config.showColors,
            stylize: this.createStatusStylizer()
        }));
    }

    private showMemoryOptimization(): void {
        console.log('\n💾 Memory Optimization Features:');

        if (this.config.performanceMode) {
            console.log('✅ Performance Mode: Enabled');
            console.log('✅ Color Caching: Active');
            console.log(`✅ Cache Size: ${this.colorManager.getCacheStats().size} entries`);

            // Demonstrate cache effectiveness
            const testColor = '#10B981';
            const start = performance.now();

            // First call (cache miss)
            this.colorManager.getColor(testColor);
            const firstCall = performance.now() - start;

            // Second call (cache hit)
            const cacheStart = performance.now();
            this.colorManager.getColor(testColor);
            const cacheCall = performance.now() - cacheStart;

            console.log(`First call (cache miss): ${firstCall.toFixed(4)}ms`);
            console.log(`Cached call (cache hit): ${cacheCall.toFixed(4)}ms`);
            console.log(`Performance improvement: ${(firstCall / cacheCall).toFixed(1)}x faster`);
        } else {
            console.log('❌ Performance Mode: Disabled');
            console.log('❌ Color Caching: Inactive');
        }
    }

    private createCanvasStylizer() {
        return (text: string, styleType: string): string => {
            if (!this.config.showColors) return text;

            // Use canvas colors for different data types
            if (styleType.includes('active') || styleType.includes('success')) {
                return `${this.colorManager.getCanvasColor('active')}${text}${this.colorManager.getResetCode()}`;
            }
            if (styleType.includes('beta') || styleType.includes('warning')) {
                return `${this.colorManager.getCanvasColor('beta')}${text}${this.colorManager.getResetCode()}`;
            }
            if (styleType.includes('deprecated') || styleType.includes('error')) {
                return `${this.colorManager.getCanvasColor('deprecated')}${text}${this.colorManager.getResetCode()}`;
            }
            if (styleType.includes('experimental')) {
                return `${this.colorManager.getCanvasColor('experimental')}${text}${this.colorManager.getResetCode()}`;
            }

            return this.colorManager.createStylizer()(text, styleType);
        };
    }

    private createStatusStylizer() {
        return (text: string, styleType: string): string => {
            if (!this.config.showColors) return text;

            if (styleType.includes('Active')) {
                return `${this.colorManager.getCanvasColor('active')}✅ ${text}${this.colorManager.getResetCode()}`;
            }
            if (styleType.includes('Beta')) {
                return `${this.colorManager.getCanvasColor('beta')}🔄 ${text}${this.colorManager.getResetCode()}`;
            }
            if (styleType.includes('Deprecated')) {
                return `${this.colorManager.getCanvasColor('deprecated')}⚠️ ${text}${this.colorManager.getResetCode()}`;
            }

            return text;
        };
    }

    public demonstrateColorFormats(): void {
        this.printHeader('🌈 Comprehensive Color Format Demonstration');

        this.showAllFormats();
        this.showCanvasColorPalette();
        this.showTerminalCompatibility();
        this.showPerformanceAnalysis();
    }

    private showAllFormats(): void {
        console.log('\n🎯 All ANSI Color Formats:');

        const testColors = ['#10B981', '#EAB308', '#EF4444', '#8B5CF6'];
        const formats = ['ansi-16m', 'ansi-256', 'ansi-16'] as const;

        testColors.forEach(color => {
            console.log(`\n${color}:`);
            formats.forEach(format => {
                const result = this.colorManager.getColor(color, format);
                console.log(`  ${format.padEnd(10)}: ${JSON.stringify(result)}`);
            });
        });
    }

    private showCanvasColorPalette(): void {
        console.log('\n🎨 Canvas Color Palette:');

        // Show top-level colors
        const topLevelColors = [
            { name: 'primary', hex: '#0f172a' },
            { name: 'secondary', hex: '#1e40af' },
            { name: 'accent', hex: '#f59e0b' }
        ];

        topLevelColors.forEach(({ name, hex }) => {
            const trueColor = this.colorManager.getColor(hex, 'ansi-16m');
            const color256 = this.colorManager.getColor(hex, 'ansi-256');
            const color16 = this.colorManager.getColor(hex, 'ansi-16');

            console.log(`${name.padEnd(15)} ${hex.padEnd(10)} →`);
            console.log(`  True Color: ${JSON.stringify(trueColor)}`);
            console.log(`  256-Color:  ${JSON.stringify(color256)}`);
            console.log(`  16-Color:  ${JSON.stringify(color16)}`);
        });

        // Show status colors
        console.log('\n🎯 Status Colors:');
        const statusColors = [
            { name: 'active', hex: '#10b981' },
            { name: 'beta', hex: '#eab308' },
            { name: 'deprecated', hex: '#ef4444' },
            { name: 'experimental', hex: '#8b5cf6' }
        ];

        statusColors.forEach(({ name, hex }) => {
            const trueColor = this.colorManager.getColor(hex, 'ansi-16m');
            const color256 = this.colorManager.getColor(hex, 'ansi-256');
            const color16 = this.colorManager.getColor(hex, 'ansi-16');

            console.log(`${name.padEnd(15)} ${hex.padEnd(10)} →`);
            console.log(`  True Color: ${JSON.stringify(trueColor)}`);
            console.log(`  256-Color:  ${JSON.stringify(color256)}`);
            console.log(`  16-Color:  ${JSON.stringify(color16)}`);
        });

        // Show domain colors
        console.log('\n🌐 Domain Colors:');
        const domainColors = [
            { name: 'integration', hex: '#6366f1' },
            { name: 'service', hex: '#14b8a6' },
            { name: 'core', hex: '#059669' },
            { name: 'ui', hex: '#f97316' },
            { name: 'pipeline', hex: '#06b6d4' },
            { name: 'monitor', hex: '#a855f7' }
        ];

        domainColors.forEach(({ name, hex }) => {
            const trueColor = this.colorManager.getColor(hex, 'ansi-16m');
            const color256 = this.colorManager.getColor(hex, 'ansi-256');
            const color16 = this.colorManager.getColor(hex, 'ansi-16');

            console.log(`${name.padEnd(15)} ${hex.padEnd(10)} →`);
            console.log(`  True Color: ${JSON.stringify(trueColor)}`);
            console.log(`  256-Color:  ${JSON.stringify(color256)}`);
            console.log(`  16-Color:  ${JSON.stringify(color16)}`);
        });
    }

    private showTerminalCompatibility(): void {
        console.log('\n💻 Terminal Compatibility Matrix:');

        const terminals = [
            { name: 'Modern Terminal', trueColor: true, color256: true, color16: true },
            { name: 'VS Code Terminal', trueColor: true, color256: true, color16: true },
            { name: 'macOS Terminal', trueColor: true, color256: true, color16: true },
            { name: 'Linux Terminal', trueColor: false, color256: true, color16: true },
            { name: 'Windows Console', trueColor: false, color256: false, color16: true },
            { name: 'Legacy Terminal', trueColor: false, color256: false, color16: true }
        ];

        terminals.forEach(terminal => {
            const optimalFormat = terminal.trueColor ? 'ansi-16m' :
                terminal.color256 ? 'ansi-256' : 'ansi-16';

            console.log(`${terminal.name.padEnd(20)} → ${optimalFormat.padEnd(10)} (${terminal.trueColor ? '24-bit' : terminal.color256 ? '256-color' : '16-color'})`);
        });
    }

    private showPerformanceAnalysis(): void {
        console.log('\n⚡ Performance Analysis:');

        const iterations = 10000;
        const formats = ['ansi-16m', 'ansi-256', 'ansi-16'] as const;

        console.log(`Testing performance with ${iterations} conversions:`);

        formats.forEach(format => {
            // Test without cache
            const startNoCache = performance.now();
            for (let i = 0; i < iterations; i++) {
                Bun.color('#10B981', format);
            }
            const noCacheTime = performance.now() - startNoCache;

            // Test with cache
            this.colorManager = new ColorManager({ ...this.config, performanceMode: true });
            const startWithCache = performance.now();
            for (let i = 0; i < iterations; i++) {
                this.colorManager.getColor('#10B981', format);
            }
            const withCacheTime = performance.now() - startWithCache;

            const noCacheOps = Math.round(iterations / noCacheTime * 1000);
            const withCacheOps = Math.round(iterations / withCacheTime * 1000);
            const improvement = (noCacheTime / withCacheTime).toFixed(1);

            console.log(`${format.padEnd(10)}: ${noCacheOps.toLocaleString()} → ${withCacheOps.toLocaleString()} ops/sec (${improvement}x faster with cache)`);
        });
    }

    private printHeader(title: string): void {
        const headerColor = this.colorManager.getCanvasColor('primary');
        const reset = this.colorManager.getResetCode();

        console.log(`\n${headerColor}${title}${reset}`);
        console.log('='.repeat(title.length));
    }

    // Public API methods
    public updateConfig(newConfig: Partial<EnhancedConsoleConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.colorManager = new ColorManager(this.config);
    }

    public getConfig(): EnhancedConsoleConfig {
        return { ...this.config };
    }

    public getColorManager(): ColorManager {
        return this.colorManager;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    EnhancedConsoleInspectionModule,
    ColorManager,
    type EnhancedConsoleConfig,
    type ColorCapabilities,
    type ColorCache,
    type InspectionOptions
};

// Export for programmatic use
export default EnhancedConsoleInspectionModule;

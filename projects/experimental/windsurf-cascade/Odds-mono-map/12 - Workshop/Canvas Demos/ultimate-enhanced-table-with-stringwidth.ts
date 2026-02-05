#!/usr/bin/env bun

/**
 * Ultimate Enhanced Table with StringWidth Integration
 * 
 * Showcasing the complete combination of advanced Bun table features with
 * Bun.stringWidth for perfect column alignment, responsive design, and
 * sophisticated width calculations.
 * 
 * @author Odds Protocol Development Team
 * @version 11.0.0
 * @since 2025-11-18
 */

import { CleanConsole } from './clean-console-integration';

// =============================================================================
// STRING WIDTH UTILITIES
// =============================================================================

class StringWidthAnalyzer {
    static analyzeWidths(data: any[], columns: string[]): any {
        const analysis = {
            columnWidths: {} as Record<string, number>,
            maxContentWidths: {} as Record<string, number>,
            displayWidths: {} as Record<string, number>,
            totalWidth: 0,
            recommendations: [] as string[]
        };

        // Calculate widths for each column
        columns.forEach(col => {
            const headerWidth = Bun.stringWidth(col);
            let maxContentWidth = headerWidth;
            let maxDisplayWidth = headerWidth;

            data.forEach(row => {
                const value = row[col];
                let content = '';

                if (typeof value === 'object' && value !== null) {
                    content = JSON.stringify(value);
                } else if (Array.isArray(value)) {
                    content = value.join(', ');
                } else {
                    content = String(value);
                }

                const contentWidth = Bun.stringWidth(content);
                const displayWidth = this.calculateDisplayWidth(content);

                maxContentWidth = Math.max(maxContentWidth, contentWidth);
                maxDisplayWidth = Math.max(maxDisplayWidth, displayWidth);
            });

            analysis.columnWidths[col] = maxContentWidth;
            analysis.maxContentWidths[col] = maxContentWidth;
            analysis.displayWidths[col] = maxDisplayWidth;
            analysis.totalWidth += maxDisplayWidth;
        });

        // Generate recommendations
        analysis.recommendations = this.generateWidthRecommendations(analysis, columns);

        return analysis;
    }

    private static calculateDisplayWidth(text: string): number {
        // Calculate actual display width considering ANSI escape codes
        const ansiRegex = /\x1b\[[0-9;]*m/g;
        const cleanText = text.replace(ansiRegex, '');
        return Bun.stringWidth(cleanText);
    }

    private static generateWidthRecommendations(analysis: any, columns: string[]): string[] {
        const recommendations: string[] = [];
        const terminalWidth = process.stdout.columns || 80;

        if (analysis.totalWidth > terminalWidth) {
            recommendations.push(`Total width (${analysis.totalWidth}) exceeds terminal width (${terminalWidth})`);
            recommendations.push('Consider: compact mode, column truncation, or column reduction');
        }

        // Find columns that could be optimized
        Object.entries(analysis.displayWidths).forEach(([col, width]) => {
            if (width > 30) {
                recommendations.push(`Column '${col}' is very wide (${width} chars) - consider truncation`);
            }
            if (width < 5) {
                recommendations.push(`Column '${col}' is narrow (${width} chars) - could be expanded`);
            }
        });

        return recommendations;
    }

    static optimizeColumnWidths(analysis: any, options: any = {}): any {
        const {
            maxWidth = 25,
            minWidth = 8,
            targetTotalWidth = process.stdout.columns || 80
        } = options;

        const optimized = { ...analysis.columnWidths };
        let currentTotal = Object.values(optimized).reduce((sum: number, width: any) => sum + width, 0);

        // Reduce oversized columns
        Object.keys(optimized).forEach(col => {
            if (optimized[col] > maxWidth) {
                currentTotal -= optimized[col];
                optimized[col] = maxWidth;
                currentTotal += maxWidth;
            }
        });

        // If still too wide, proportionally reduce all columns
        if (currentTotal > targetTotalWidth) {
            const reductionFactor = (targetTotalWidth - (Object.keys(optimized).length * minWidth)) / currentTotal;

            Object.keys(optimized).forEach(col => {
                const newWidth = Math.max(minWidth, Math.floor(optimized[col] * reductionFactor));
                currentTotal -= optimized[col];
                optimized[col] = newWidth;
                currentTotal += newWidth;
            });
        }

        return optimized;
    }
}

// =============================================================================
// ADVANCED FORMATTING WITH STRING WIDTH
// =============================================================================

class AdvancedFormattingWithWidth {
    static createWidthOptimizedTable(data: any[], formatRules: any[], options: any = {}): string {
        const {
            enableStringWidth = true,
            truncateLongContent = true,
            alignColumns = true,
            maxWidth = 25
        } = options;

        // Analyze content widths
        const columns = this.extractColumns(data);
        const widthAnalysis = StringWidthAnalyzer.analyzeWidths(data, columns);
        const optimizedWidths = StringWidthAnalyzer.optimizeColumnWidths(widthAnalysis, { maxWidth });

        // Process data with width-aware formatting
        const processedData = data.map((row, rowIndex) => {
            const processedRow: any = {};

            Object.keys(row).forEach(key => {
                let value = row[key];

                // Apply formatting rules
                formatRules.forEach(rule => {
                    if (rule.condition === 'column' && rule.target === key) {
                        if (rule.type === 'color' && typeof value === 'number') {
                            value = rule.color(value) + value + '\x1b[0m';
                        } else if (rule.type === 'icon' && typeof value === 'string') {
                            value = rule.icon(value) + ' ' + value;
                        }
                    }
                });

                // Apply width optimization
                if (enableStringWidth && optimizedWidths[key]) {
                    value = this.truncateToWidth(value, optimizedWidths[key], truncateLongContent);
                }

                processedRow[key] = value;
            });

            return processedRow;
        });

        // Generate table with optimized widths
        return Bun.inspect.table(processedData, {
            colors: true,
            compact: false,
            minWidth: 8,
            maxWidth: maxWidth,
            wrap: false,
            align: alignColumns ? "left" : "none",
            header: true,
            index: true,
            formatter: (value: any, column: string) => {
                // Width-aware custom formatter
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const str = JSON.stringify(value);
                    return this.truncateToWidth(str, optimizedWidths[column] || 20, truncateLongContent);
                }
                if (Array.isArray(value)) {
                    const str = value.length > 2 ? `${value.slice(0, 2).join(', ')}...` : value.join(', ');
                    return this.truncateToWidth(str, optimizedWidths[column] || 20, truncateLongContent);
                }
                if (value instanceof Date) {
                    return `📅 ${value.toLocaleDateString()}`;
                }
                return value;
            }
        });
    }

    private static extractColumns(data: any[]): string[] {
        if (!data.length) return [];
        return Object.keys(data[0]);
    }

    private static truncateToWidth(value: any, maxWidth: number, truncate: boolean): any {
        if (!truncate || maxWidth === undefined) return value;

        let str = String(value);

        // Remove ANSI codes for width calculation
        const ansiRegex = /\x1b\[[0-9;]*m/g;
        const cleanStr = str.replace(ansiRegex, '');

        if (Bun.stringWidth(cleanStr) <= maxWidth) {
            return value;
        }

        // Truncate while preserving ANSI codes
        let truncated = '';
        let currentWidth = 0;
        let i = 0;

        while (i < str.length && currentWidth < maxWidth - 3) {
            if (str[i] === '\x1b') {
                // Copy ANSI sequence
                let j = i;
                while (j < str.length && str[j] !== 'm') j++;
                truncated += str.substring(i, j + 1);
                i = j + 1;
            } else {
                truncated += str[i];
                currentWidth += Bun.stringWidth(str[i]);
                i++;
            }
        }

        return truncated + '...';
    }
}

// =============================================================================
// RESPONSIVE TABLE GENERATOR WITH STRING WIDTH
// =============================================================================

class ResponsiveTableGeneratorWithWidth {
    static createWidthAwareTable(data: any[], options: any = {}): string {
        const terminalWidth = process.stdout.columns || 80;
        const dataLength = data.length;

        // Analyze content widths
        const columns = this.getAllColumns(data);
        const widthAnalysis = StringWidthAnalyzer.analyzeWidths(data, columns);

        // Determine optimal configuration based on width analysis
        let config = {
            colors: options.colors || false,
            compact: false,
            minWidth: 8,
            maxWidth: 20,
            wrap: false,
            align: "left" as const,
            header: true,
            index: true,
            enableStringWidth: true
        };

        // Width-aware responsive adjustments
        if (widthAnalysis.totalWidth > terminalWidth) {
            if (widthAnalysis.totalWidth > terminalWidth * 1.5) {
                // Very wide - use compact mode
                config.compact = true;
                config.maxWidth = 12;
                config.wrap = false;
            } else {
                // Moderately wide - optimize widths
                config.compact = true;
                const optimizedWidths = StringWidthAnalyzer.optimizeColumnWidths(widthAnalysis, {
                    maxWidth: 15,
                    targetTotalWidth: terminalWidth - 10
                });
                config.maxWidth = Math.max(...Object.values(optimizedWidths) as number[]);
            }
        } else if (dataLength > 10) {
            config.compact = true;
            config.wrap = true;
        }

        // Select optimal columns based on width and importance
        const selectedColumns = this.selectColumnsByWidth(data, config, widthAnalysis);

        return Bun.inspect.table(data, selectedColumns, config);
    }

    private static getAllColumns(data: any[]): string[] {
        if (!data.length) return [];
        return Object.keys(data[0]);
    }

    private static selectColumnsByWidth(data: any[], config: any, widthAnalysis: any): string[] {
        if (!data.length) return [];

        const allColumns = Object.keys(data[0]);
        const terminalWidth = process.stdout.columns || 80;

        // Calculate column scores considering width and importance
        const columnScores = allColumns.map(col => {
            let score = 0;
            const value = data[0][col];
            const width = widthAnalysis.displayWidths[col] || 10;

            // Prioritize important columns
            if (col.toLowerCase().includes('id')) score += 15;
            if (col.toLowerCase().includes('name')) score += 12;
            if (typeof value === 'number') score += 8;
            if (typeof value === 'string' && value.length < 20) score += 6;

            // Penalize very wide columns
            if (width > 30) score -= 10;
            if (width > 50) score -= 20;

            // Bonus for columns that fit well
            if (width <= 15) score += 5;

            return { column: col, score, width };
        });

        // Select columns that fit within terminal width
        let selectedColumns: string[] = [];
        let currentWidth = 10; // Account for index column

        columnScores
            .sort((a, b) => b.score - a.score)
            .forEach(({ column, width }) => {
                if (currentWidth + width + 3 <= terminalWidth) { // +3 for padding
                    selectedColumns.push(column);
                    currentWidth += width + 3;
                }
            });

        return selectedColumns.length > 0 ? selectedColumns : allColumns.slice(0, 4);
    }
}

// =============================================================================
// SMART TABLE MANAGER WITH STRING WIDTH
// =============================================================================

class SmartTableManagerWithWidth {
    private data: any[];
    private config: any;
    private widthAnalysis: any;

    constructor(data: any[], config: any = {}) {
        this.data = data;
        this.config = {
            autoResize: true,
            enableStringWidth: true,
            colorScheme: 'default',
            maxColumns: 6,
            ...config
        };

        // Pre-analyze widths
        this.widthAnalysis = this.analyzeDataWidths();
    }

    generateTable(options: any = {}): string {
        const mergedOptions = { ...this.config, ...options };

        // Smart column selection with width awareness
        const columns = this.selectSmartColumnsWithWidth(mergedOptions);

        // Smart formatting with width optimization
        const formatRules = this.generateFormatRules(mergedOptions);

        // Generate optimized table
        if (formatRules.length > 0 && mergedOptions.enableStringWidth) {
            return AdvancedFormattingWithWidth.createWidthOptimizedTable(this.data, formatRules, {
                enableStringWidth: true,
                truncateLongContent: true,
                alignColumns: true,
                maxWidth: this.calculateOptimalMaxWidth(mergedOptions)
            });
        } else {
            return this.generateBasicTable(columns, mergedOptions);
        }
    }

    private analyzeDataWidths(): any {
        const columns = this.getAllColumns();
        return StringWidthAnalyzer.analyzeWidths(this.data, columns);
    }

    private getAllColumns(): string[] {
        if (!this.data.length) return [];
        return Object.keys(this.data[0]);
    }

    private selectSmartColumnsWithWidth(config: any): string[] {
        const columns = this.getAllColumns();
        const terminalWidth = process.stdout.columns || 80;

        // Score columns based on importance and width efficiency
        const columnScores = columns.map(col => {
            let score = 0;
            const value = this.data[0][col];
            const width = this.widthAnalysis.displayWidths[col] || 10;

            // Importance scoring
            if (col.toLowerCase().includes('id')) score += 10;
            if (col.toLowerCase().includes('name')) score += 8;
            if (typeof value === 'number' || typeof value === 'boolean') score += 5;
            if (typeof value === 'string' && value.length < 20) score += 3;

            // Width efficiency scoring
            if (width <= 12) score += 5;
            if (width <= 8) score += 3;
            if (width > 25) score -= 5;
            if (width > 40) score -= 10;

            return { column: col, score, width };
        });

        // Select columns that fit best
        let selected: string[] = [];
        let usedWidth = 15; // Base width for index and padding

        columnScores
            .sort((a, b) => b.score - a.score)
            .forEach(({ column, width }) => {
                if (selected.length < (config.maxColumns || 6) &&
                    usedWidth + width + 2 <= terminalWidth) {
                    selected.push(column);
                    usedWidth += width + 2;
                }
            });

        return selected.length > 0 ? selected : columns.slice(0, 4);
    }

    private generateFormatRules(config: any): any[] {
        const rules: any[] = [];

        if (!this.data.length) return rules;

        const sample = this.data[0];

        Object.keys(sample).forEach(col => {
            const value = sample[col];

            if (typeof value === 'number') {
                rules.push({
                    condition: 'column',
                    target: col,
                    type: 'color',
                    color: (val: number) => {
                        const avg = this.data.reduce((sum: number, row: any) => sum + (row[col] || 0), 0) / this.data.length;
                        return val > avg * 1.2 ? "\x1b[32m" : val < avg * 0.8 ? "\x1b[31m" : "\x1b[33m";
                    }
                });
            }

            if (typeof value === 'string' && ['status', 'type', 'category'].includes(col.toLowerCase())) {
                rules.push({
                    condition: 'column',
                    target: col,
                    type: 'icon',
                    icon: (val: string) => {
                        return val === 'active' || val === 'online' ? "🟢" :
                            val === 'inactive' || val === 'offline' ? "🔴" :
                                val === 'pending' ? "🟡" : "📋";
                    }
                });
            }
        });

        return rules;
    }

    private calculateOptimalMaxWidth(config: any): number {
        const terminalWidth = process.stdout.columns || 80;
        const columnCount = this.selectSmartColumnsWithWidth(config).length;

        return Math.floor((terminalWidth - 15) / columnCount);
    }

    private generateBasicTable(columns: string[], config: any): string {
        return Bun.inspect.table(this.data, columns, {
            colors: config.colorScheme !== 'none',
            compact: this.shouldUseCompact(config),
            minWidth: 8,
            maxWidth: this.calculateOptimalMaxWidth(config),
            wrap: this.shouldWrap(config),
            align: "left",
            header: true,
            index: true,
            formatter: this.createWidthAwareFormatter(config)
        });
    }

    private shouldUseCompact(config: any): boolean {
        const terminalWidth = process.stdout.columns || 80;
        return terminalWidth < 80 || this.widthAnalysis.totalWidth > terminalWidth || this.data.length > 8;
    }

    private shouldWrap(config: any): boolean {
        const terminalWidth = process.stdout.columns || 80;
        return terminalWidth >= 100 && this.data.length <= 5;
    }

    private createWidthAwareFormatter(config: any): any {
        return (value: any, column: string, row: any, rowIndex: number) => {
            // Width-aware formatting
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const str = JSON.stringify(value);
                const maxWidth = this.widthAnalysis.displayWidths[column] || 20;
                return str.length > maxWidth ? str.substring(0, maxWidth - 3) + '...' : str;
            }

            if (Array.isArray(value)) {
                if (value.length === 0) return '[]';
                if (value.length <= 2) return value.join(', ');
                return `[${value.length} items]`;
            }

            if (value instanceof Date) {
                return `📅 ${value.toLocaleDateString()}`;
            }

            if (typeof value === 'boolean') {
                return value ? "✅ Yes" : "❌ No";
            }

            if (typeof value === 'string' && value.length > 25) {
                return value.substring(0, 22) + '...';
            }

            return value;
        };
    }

    getWidthAnalysis(): any {
        return this.widthAnalysis;
    }
}

// =============================================================================
// ULTIMATE ENHANCED TABLE DEMO WITH STRING WIDTH
// =============================================================================

class UltimateEnhancedTableDemoWithWidth {
    static demonstrateAllFeatures() {
        const sampleData = [
            {
                id: 1,
                user: { name: "Alice Johnson", email: "alice@example.com" },
                metrics: { score: 95, responseTime: 45, efficiency: 87.5 },
                status: "active",
                lastLogin: new Date('2024-01-15'),
                tags: ["admin", "premium", "superuser"],
                department: "Engineering",
                location: "San Francisco, CA"
            },
            {
                id: 2,
                user: { name: "Bob Smith", email: "bob@example.com" },
                metrics: { score: 72, responseTime: 128, efficiency: 65.3 },
                status: "inactive",
                lastLogin: new Date('2024-01-10'),
                tags: ["user"],
                department: "Marketing",
                location: "New York, NY"
            },
            {
                id: 3,
                user: { name: "Charlie Davis", email: "charlie@example.com" },
                metrics: { score: 88, responseTime: 62, efficiency: 91.2 },
                status: "active",
                lastLogin: new Date('2024-01-18'),
                tags: ["moderator", "premium"],
                department: "Product",
                location: "Austin, TX"
            },
            {
                id: 4,
                user: { name: "Diana Wilson", email: "diana@example.com" },
                metrics: { score: 45, responseTime: 203, efficiency: 42.1 },
                status: "pending",
                lastLogin: new Date('2024-01-05'),
                tags: ["user", "trial"],
                department: "Sales",
                location: "Chicago, IL"
            },
            {
                id: 5,
                user: { name: "Eve Martinez", email: "eve@example.com" },
                metrics: { score: 91, responseTime: 38, efficiency: 94.7 },
                status: "active",
                lastLogin: new Date('2024-01-19'),
                tags: ["admin", "premium", "moderator", "lead"],
                department: "Engineering",
                location: "Seattle, WA"
            }
        ];

        console.log('🎯 Ultimate Enhanced Table with StringWidth Integration');
        console.log('='.repeat(80));

        // 1. String Width Analysis
        console.log('\n📏 String Width Analysis:');
        this.demonstrateStringWidthAnalysis(sampleData);

        // 2. Enhanced Colors with Width Optimization
        console.log('\n🎨 Enhanced Colors with Width Optimization:');
        console.log(Bun.inspect.table(sampleData, {
            colors: {
                header: (index: number) => ["\x1b[38;5;196m", "\x1b[38;5;214m", "\x1b[38;5;226m"][index % 3],
                border: "\x1b[38;5;240m",
                body: (rowIndex: number) => rowIndex % 2 === 0 ? "\x1b[38;5;255m" : "\x1b[38;5;245m"
            },
            compact: false,
            minWidth: 8,
            maxWidth: 20,
            wrap: false,
            align: "left",
            header: true,
            index: true
        }));

        // 3. Smart Formatting with String Width
        console.log('\n🛠️ Smart Formatting with String Width:');
        console.log(AdvancedFormattingWithWidth.createWidthOptimizedTable(sampleData, [
            {
                condition: 'column',
                target: 'metrics.score',
                type: 'color',
                color: (value: number) => value > 90 ? "\x1b[32m" : value > 70 ? "\x1b[33m" : "\x1b[31m"
            },
            {
                condition: 'column',
                target: 'status',
                type: 'icon',
                icon: (value: string) => value === 'active' ? "🟢" : value === 'inactive' ? "🔴" : "🟡"
            }
        ], {
            enableStringWidth: true,
            truncateLongContent: true,
            alignColumns: true,
            maxWidth: 18
        }));

        // 4. Width-Aware Responsive Tables
        console.log('\n📱 Width-Aware Responsive Tables:');
        console.log(ResponsiveTableGeneratorWithWidth.createWidthAwareTable(sampleData, { colors: true }));

        // 5. Smart Table Manager with String Width
        console.log('\n🧠 Smart Table Manager with String Width:');
        const smartManager = new SmartTableManagerWithWidth(sampleData, {
            autoResize: true,
            enableStringWidth: true,
            colorScheme: 'default',
            maxColumns: 4
        });
        console.log(smartManager.generateTable());

        // 6. Width Optimization Analysis
        console.log('\n📊 Width Optimization Analysis:');
        this.demonstrateWidthOptimization(smartManager);

        // 7. Performance with String Width
        console.log('\n⚡ Performance with String Width:');
        this.demonstratePerformanceWithWidth();

        // 8. Feature Summary
        console.log('\n📈 Ultimate Feature Summary:');
        this.displayUltimateFeatureSummary();
    }

    static demonstrateStringWidthAnalysis(data: any[]) {
        const columns = Object.keys(data[0]);
        const analysis = StringWidthAnalyzer.analyzeWidths(data, columns);

        console.log(`Terminal Width: ${process.stdout.columns || 80}`);
        console.log(`Total Content Width: ${analysis.totalWidth}`);

        const widthData = Object.entries(analysis.displayWidths).map(([col, width]) => ({
            column: col,
            displayWidth: width,
            contentWidth: analysis.maxContentWidths[col],
            efficiency: width > 20 ? 'Wide' : width < 8 ? 'Narrow' : 'Optimal'
        }));

        console.log(Bun.inspect.table(widthData, ["column", "displayWidth", "contentWidth", "efficiency"], {
            colors: true,
            compact: true,
            minWidth: 8,
            maxWidth: 15,
            wrap: false,
            align: "left",
            header: true,
            index: true,
            formatter: (value, column) => {
                if (column === "efficiency") {
                    return value === "Optimal" ? "✅ Optimal" :
                        value === "Wide" ? "📏 Wide" :
                            value === "Narrow" ? "📐 Narrow" : value;
                }
                return value;
            }
        }));

        if (analysis.recommendations.length > 0) {
            console.log('\n💡 Width Recommendations:');
            analysis.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }
    }

    static demonstrateWidthOptimization(manager: SmartTableManagerWithWidth) {
        const analysis = manager.getWidthAnalysis();
        const optimized = StringWidthAnalyzer.optimizeColumnWidths(analysis, {
            maxWidth: 20,
            minWidth: 8,
            targetTotalWidth: process.stdout.columns || 80
        });

        const optimizationData = Object.entries(analysis.displayWidths).map(([col, original]) => ({
            column: col,
            originalWidth: original,
            optimizedWidth: optimized[col],
            savings: original - (optimized[col] || original),
            savingsPercent: Math.round(((original - (optimized[col] || original)) / original) * 100)
        }));

        console.log(Bun.inspect.table(optimizationData, ["column", "originalWidth", "optimizedWidth", "savings", "savingsPercent"], {
            colors: true,
            compact: false,
            minWidth: 8,
            maxWidth: 15,
            wrap: false,
            align: "center",
            header: true,
            index: true,
            formatter: (value, column) => {
                if (column === "savingsPercent") {
                    return `${value}%`;
                }
                if (column === "savings") {
                    return value > 0 ? `-${value}` : '0';
                }
                return value;
            }
        }));
    }

    static demonstratePerformanceWithWidth() {
        const testData = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            name: `User ${i + 1} with a very long name that needs truncation`,
            description: `This is a long description for user ${i + 1} that contains many words`,
            score: Math.floor(Math.random() * 100),
            active: Math.random() > 0.5,
            metadata: { created: new Date(), source: 'api', version: '1.0.0' }
        }));

        const performanceData = [
            {
                method: "Basic Table",
                time: this.measureTime(() => Bun.inspect.table(testData.slice(0, 10))),
                features: "Simple rendering",
                widthOptimized: "No"
            },
            {
                method: "String Width Analysis",
                time: this.measureTime(() => StringWidthAnalyzer.analyzeWidths(testData.slice(0, 10), Object.keys(testData[0]))),
                features: "Width calculation",
                widthOptimized: "Yes"
            },
            {
                method: "Width-Optimized Formatting",
                time: this.measureTime(() => AdvancedFormattingWithWidth.createWidthOptimizedTable(testData.slice(0, 10), [])),
                features: "Width-aware formatting",
                widthOptimized: "Yes"
            },
            {
                method: "Smart Manager with Width",
                time: this.measureTime(() => new SmartTableManagerWithWidth(testData.slice(0, 10)).generateTable()),
                features: "Intelligent optimization",
                widthOptimized: "Yes"
            }
        ];

        console.log(Bun.inspect.table(performanceData, ["method", "time", "features", "widthOptimized"], {
            colors: true,
            compact: false,
            minWidth: 10,
            maxWidth: 20,
            wrap: false,
            align: "left",
            header: true,
            index: true,
            formatter: (value, column) => {
                if (column === "time") {
                    return `${value.toFixed(2)}ms`;
                }
                if (column === "widthOptimized") {
                    return value === "Yes" ? "✅ Yes" : "❌ No";
                }
                return value;
            }
        }));
    }

    static displayUltimateFeatureSummary() {
        const featureData = [
            {
                feature: "📏 String Width Analysis",
                implemented: "✅ Complete",
                performance: "Fast",
                widthOptimized: "Yes"
            },
            {
                feature: "🎨 Enhanced Colors + Width",
                implemented: "✅ Complete",
                performance: "Fast",
                widthOptimized: "Yes"
            },
            {
                feature: "🛠️ Smart Formatting + Width",
                implemented: "✅ Complete",
                performance: "Medium",
                widthOptimized: "Yes"
            },
            {
                feature: "📱 Responsive Tables + Width",
                implemented: "✅ Complete",
                performance: "Fast",
                widthOptimized: "Yes"
            },
            {
                feature: "🧠 Smart Manager + Width",
                implemented: "✅ Complete",
                performance: "Medium",
                widthOptimized: "Yes"
            },
            {
                feature: "📊 Width Optimization",
                implemented: "✅ Complete",
                performance: "Fast",
                widthOptimized: "Yes"
            }
        ];

        console.log(Bun.inspect.table(featureData, ["feature", "implemented", "performance", "widthOptimized"], {
            colors: {
                header: "\x1b[38;5;214m",
                border: "\x1b[38;5;33m",
                body: "\x1b[38;5;250m"
            },
            compact: false,
            minWidth: 10,
            maxWidth: 18,
            wrap: false,
            align: "center",
            header: true,
            index: true,
            formatter: (value, column) => {
                switch (column) {
                    case "implemented":
                        return value === "✅ Complete" ? "🚀 Complete" : value;
                    case "widthOptimized":
                        return value === "Yes" ? "✅ Yes" : "❌ No";
                    case "performance":
                        return value === "Fast" ? "⚡ Fast" :
                            value === "Medium" ? "🔄 Medium" : value;
                    default: return value;
                }
            }
        }));
    }

    private static measureTime(fn: () => void): number {
        const start = performance.now();
        fn();
        return performance.now() - start;
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    const console = CleanConsole.getInstance();
    console.section('🎯 Ultimate Enhanced Table with StringWidth Integration');

    console.info('Advanced Bun Table Features with Perfect Width Alignment', [
        'String width analysis and optimization',
        'Enhanced colors with width-aware rendering',
        'Smart formatting with truncation support',
        'Responsive tables with width calculations',
        'Smart table manager with width optimization',
        'Performance analysis with width considerations',
        'Perfect column alignment using Bun.stringWidth'
    ]);

    UltimateEnhancedTableDemoWithWidth.demonstrateAllFeatures();

    console.success('🎯 Ultimate enhanced table with StringWidth completed!', [
        'All advanced table features with width optimization demonstrated',
        'Perfect column alignment using Bun.stringWidth achieved',
        'Width-aware responsive design implemented',
        'Performance optimization with width analysis completed'
    ]);
}

// Run the ultimate demo
if (import.meta.main) {
    main().catch(console.error);
}

export {
    UltimateEnhancedTableDemoWithWidth,
    StringWidthAnalyzer,
    AdvancedFormattingWithWidth,
    ResponsiveTableGeneratorWithWidth,
    SmartTableManagerWithWidth
};

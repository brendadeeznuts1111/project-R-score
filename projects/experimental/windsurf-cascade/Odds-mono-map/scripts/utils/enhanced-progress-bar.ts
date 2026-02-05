#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]enhanced-progress-bar
 * 
 * Enhanced Progress Bar
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils
 */

#!/usr/bin/env bun

/**
 * Enhanced Progress Bar System with Bun.stringWidth() Integration
 * Beautiful progress bars with perfect visual alignment and table integration
 * 
 * @fileoverview Advanced progress bar system with width calculation and table formatting
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import chalk from 'chalk';

interface ProgressBarConfig {
    label: string;
    current: number;
    total: number;
    width?: number;
    showPercentage?: boolean;
    showFraction?: boolean;
    color?: 'green' | 'yellow' | 'red' | 'blue' | 'cyan' | 'magenta' | 'white';
    style?: 'solid' | 'gradient' | 'dots' | 'blocks';
    animated?: boolean;
}

interface ProgressBarMetrics {
    label: string;
    progress: string;
    percentage: number;
    status: string;
    eta?: string;
    rate?: string;
}

class EnhancedProgressBarSystem {

    /**
     * Create a single progress bar with perfect width calculation
     */
    static createProgressBar(config: ProgressBarConfig): string {
        const {
            label,
            current,
            total,
            width = 30,
            showPercentage = true,
            showFraction = true,
            color = 'green',
            style = 'solid',
            animated = false
        } = config;

        const percentage = (current / total) * 100;
        const filledWidth = Math.round((width * current) / total);

        // Create bar based on style
        let bar = this.createBar(filledWidth, width - filledWidth, style, color);

        // Apply color
        const coloredBar = this.applyColor(bar, color, percentage);

        // Build text components
        const components: string[] = [`${label}:`];
        components.push(`[${coloredBar}]`);

        if (showFraction) {
            components.push(`${current}/${total}`);
        }

        if (showPercentage) {
            components.push(`(${percentage.toFixed(1)}%)`);
        }

        const text = components.join(' ');

        // Verify visual width
        const visualWidth = Bun.stringWidth(text);
        const actualWidth = Bun.stringWidth(text, { countAnsiEscapeCodes: true });

        console.log(chalk.gray(`📏 Width check: Visual=${visualWidth}, Actual=${actualWidth}, Diff=${actualWidth - visualWidth}`));

        return text;
    }

    /**
     * Create bar based on style
     */
    private static createBar(filled: number, empty: number, style: string, color: string): string {
        switch (style) {
            case 'gradient':
                const gradientChars = ['░', '▒', '▓', '█'];
                let gradientBar = '';
                for (let i = 0; i < filled; i++) {
                    gradientBar += gradientChars[Math.min(3, Math.floor((i / filled) * 4))];
                }
                gradientBar += '░'.repeat(empty);
                return gradientBar;

            case 'dots':
                return '●'.repeat(filled) + '○'.repeat(empty);

            case 'blocks':
                return '▣'.repeat(filled) + '▢'.repeat(empty);

            case 'solid':
            default:
                return '█'.repeat(filled) + '░'.repeat(empty);
        }
    }

    /**
     * Apply color based on percentage and color choice
     */
    private static applyColor(bar: string, color: string, percentage: number): string {
        const colorCodes = {
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            red: '\x1b[31m',
            blue: '\x1b[34m',
            cyan: '\x1b[36m',
            magenta: '\x1b[35m',
            white: '\x1b[37m'
        };

        const reset = '\x1b[0m';

        // Dynamic coloring based on percentage
        if (percentage < 30) {
            return `${colorCodes.red}${bar}${reset}`;
        } else if (percentage < 70) {
            return `${colorCodes.yellow}${bar}${reset}`;
        } else {
            return `${colorCodes[color] || colorCodes.green}${bar}${reset}`;
        }
    }

    /**
     * Create multiple progress bars for dashboard display
     */
    static createProgressDashboard(progressBars: ProgressBarConfig[]): void {
        console.log(chalk.blue.bold('📊 Progress Dashboard'));
        console.log(chalk.gray('═'.repeat(80)));

        const metrics: ProgressBarMetrics[] = progressBars.map(config => {
            const percentage = (config.current / config.total) * 100;
            const bar = this.createBar(
                Math.round((config.width! * config.current) / config.total),
                config.width! - Math.round((config.width! * config.current) / config.total),
                config.style || 'solid',
                config.color || 'green'
            );

            return {
                label: config.label,
                progress: `[${this.applyColor(bar, config.color || 'green', percentage)}]`,
                percentage,
                status: this.getStatus(percentage),
                eta: this.calculateETA(config.current, config.total),
                rate: this.calculateRate(config.current, config.total)
            };
        });

        // Display as beautiful table
        console.log(Bun.inspect.table(metrics, {
            'Task': 'label',
            'Progress': 'progress',
            '%': 'percentage',
            'Status': 'status',
            'ETA': 'eta',
            'Rate': 'rate'
        }, {
            colors: true,
            maxStringLength: 25,
            compact: false
        }));
    }

    /**
     * Create animated progress bar
     */
    static createAnimatedProgressBar(config: ProgressBarConfig, duration: number = 3000): void {
        const { current, total, width = 30 } = config;
        const steps = 20;
        const stepDelay = duration / steps;

        let step = 0;
        const interval = setInterval(() => {
            const progress = Math.round((current / total) * steps) + step;
            const clampedProgress = Math.min(progress, total);

            // Clear line and redraw
            process.stdout.write('\r' + ' '.repeat(100) + '\r');

            const bar = this.createProgressBar({
                ...config,
                current: clampedProgress,
                animated: true
            });

            process.stdout.write(bar);

            step++;
            if (clampedProgress >= total) {
                clearInterval(interval);
                console.log(); // New line when complete
            }
        }, stepDelay);
    }

    /**
     * Create template system specific progress bars
     */
    static createTemplateSystemProgress(): void {
        const templateProgress = [
            {
                label: 'Template Validation',
                current: 28,
                total: 35,
                width: 25,
                color: 'green' as const,
                style: 'solid' as const
            },
            {
                label: 'Complexity Optimization',
                current: 22,
                total: 35,
                width: 25,
                color: 'yellow' as const,
                style: 'gradient' as const
            },
            {
                label: 'Analytics Processing',
                current: 35,
                total: 35,
                width: 25,
                color: 'green' as const,
                style: 'blocks' as const
            },
            {
                label: 'Maintenance Tasks',
                current: 6,
                total: 8,
                width: 25,
                color: 'blue' as const,
                style: 'dots' as const
            },
            {
                label: 'Usage Score Improvement',
                current: 85,
                total: 100,
                width: 25,
                color: 'cyan' as const,
                style: 'solid' as const
            }
        ];

        this.createProgressDashboard(templateProgress);
    }

    /**
     * Create real-time system monitoring progress bars
     */
    static createSystemMonitoringProgress(): void {
        const systemMetrics = [
            {
                label: 'CPU Usage',
                current: 45,
                total: 100,
                width: 20,
                color: 'green' as const,
                style: 'solid' as const
            },
            {
                label: 'Memory Usage',
                current: 78,
                total: 100,
                width: 20,
                color: 'yellow' as const,
                style: 'solid' as const
            },
            {
                label: 'Disk Usage',
                current: 62,
                total: 100,
                width: 20,
                color: 'green' as const,
                style: 'solid' as const
            },
            {
                label: 'Network Bandwidth',
                current: 23,
                total: 100,
                width: 20,
                color: 'green' as const,
                style: 'gradient' as const
            }
        ];

        console.log(chalk.blue.bold('\n🖥️ System Monitoring Dashboard'));
        console.log(chalk.gray('═'.repeat(80)));

        const metrics = systemMetrics.map(metric => {
            const percentage = (metric.current / metric.total) * 100;
            const bar = this.createBar(metric.current, metric.total - metric.current, metric.style, metric.color);

            return {
                'Metric': metric.label,
                'Usage': `[${this.applyColor(bar, metric.color, percentage)}]`,
                'Percent': `${percentage.toFixed(1)}%`,
                'Status': this.getSystemStatus(percentage)
            };
        });

        console.log(Bun.inspect.table(metrics, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    private static getStatus(percentage: number): string {
        if (percentage >= 100) return '✅ Complete';
        if (percentage >= 75) return '🟢 Excellent';
        if (percentage >= 50) return '🟡 Good Progress';
        if (percentage >= 25) return '🟠 In Progress';
        return '🔴 Just Started';
    }

    private static getSystemStatus(percentage: number): string {
        if (percentage >= 90) return '🔴 Critical';
        if (percentage >= 75) return '🟡 Warning';
        if (percentage >= 50) return '🟡 Moderate';
        return '🟢 Normal';
    }

    private static calculateETA(current: number, total: number): string {
        if (current === 0) return '∞';
        const remaining = total - current;
        const rate = current / 10; // Simulated rate
        const eta = remaining / rate;
        return `${Math.round(eta)}s`;
    }

    private static calculateRate(current: number, total: number): string {
        const rate = (current / total) * 10; // Simulated rate
        return `${rate.toFixed(1)}/s`;
    }

    private static createBar(filled: number, empty: number, style: string, color: string): string {
        switch (style) {
            case 'gradient':
                const gradientChars = ['░', '▒', '▓', '█'];
                let gradientBar = '';
                for (let i = 0; i < filled; i++) {
                    gradientBar += gradientChars[Math.min(3, Math.floor((i / Math.max(1, filled)) * 4))];
                }
                gradientBar += '░'.repeat(empty);
                return gradientBar;

            case 'dots':
                return '●'.repeat(filled) + '○'.repeat(empty);

            case 'blocks':
                return '▣'.repeat(filled) + '▢'.repeat(empty);

            case 'solid':
            default:
                return '█'.repeat(filled) + '░'.repeat(empty);
        }
    }
}

// =============================================================================
// DEMO FUNCTIONS
// =============================================================================

function demonstrateBasicProgress(): void {
    console.log(chalk.blue.bold('🎯 Basic Progress Bar Demo'));
    console.log(chalk.gray('─'.repeat(80)));

    const progress1 = EnhancedProgressBarSystem.createProgressBar({
        label: 'Rules Enabled',
        current: 8,
        total: 12,
        width: 30,
        color: 'green',
        style: 'solid'
    });

    console.log(progress1);

    const progress2 = EnhancedProgressBarSystem.createProgressBar({
        label: 'Template Processing',
        current: 25,
        total: 35,
        width: 25,
        color: 'blue',
        style: 'gradient',
        showPercentage: true,
        showFraction: true
    });

    console.log(progress2);

    const progress3 = EnhancedProgressBarSystem.createProgressBar({
        label: 'System Optimization',
        current: 67,
        total: 100,
        width: 20,
        color: 'yellow',
        style: 'dots',
        showPercentage: true,
        showFraction: false
    });

    console.log(progress3);
}

function demonstrateWidthCalculation(): void {
    console.log(chalk.blue.bold('\n📏 Width Calculation Demo'));
    console.log(chalk.gray('─'.repeat(80)));

    const testCases = [
        { label: 'Short', current: 5, total: 10, width: 10 },
        { label: 'Medium Length Label', current: 15, total: 25, width: 20 },
        { label: 'Very Long Label Name for Testing', current: 30, total: 50, width: 30 }
    ];

    testCases.forEach((testCase, index) => {
        console.log(chalk.cyan(`\nTest Case ${index + 1}:`));
        const progress = EnhancedProgressBarSystem.createProgressBar(testCase);
        console.log(progress);

        // Show width analysis
        const visualWidth = Bun.stringWidth(progress);
        const actualWidth = Bun.stringWidth(progress, { countAnsiEscapeCodes: true });
        console.log(chalk.gray(`   Visual: ${visualWidth} chars, Actual: ${actualWidth} chars`));
    });
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('🎯 Enhanced Progress Bar System'));
        console.log(chalk.gray('Usage: bun enhanced-progress-bar.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        console.log(chalk.gray('  --demo        Run demonstration of all features'));
        console.log(chalk.gray('  --template    Show template system progress'));
        console.log(chalk.gray('  --system      Show system monitoring progress'));
        console.log(chalk.gray('\nFeatures: Bun.stringWidth() integration, table formatting, multiple styles'));
        process.exit(0);
    }

    if (args.includes('--demo')) {
        demonstrateBasicProgress();
        demonstrateWidthCalculation();
        EnhancedProgressBarSystem.createTemplateSystemProgress();
        EnhancedProgressBarSystem.createSystemMonitoringProgress();
    } else if (args.includes('--template')) {
        EnhancedProgressBarSystem.createTemplateSystemProgress();
    } else if (args.includes('--system')) {
        EnhancedProgressBarSystem.createSystemMonitoringProgress();
    } else {
        // Default demonstration
        demonstrateBasicProgress();
        demonstrateWidthCalculation();

        console.log(chalk.blue.bold('\n📊 Template System Progress Dashboard'));
        EnhancedProgressBarSystem.createTemplateSystemProgress();

        console.log(chalk.blue.bold('\n🖥️ System Monitoring Dashboard'));
        EnhancedProgressBarSystem.createSystemMonitoringProgress();
    }

    console.log(chalk.green.bold('\n🎉 Enhanced Progress Bar System Demo Complete!'));
}

// =============================================================================
// EXECUTION
// =============================================================================

if (import.meta.main) {
    main().catch(console.error);
}

export { EnhancedProgressBarSystem, type ProgressBarConfig, type ProgressBarMetrics };

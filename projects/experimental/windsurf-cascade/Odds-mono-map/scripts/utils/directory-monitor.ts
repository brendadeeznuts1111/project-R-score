#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]directory-monitor
 * 
 * Directory Monitor
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
 * Comprehensive Directory Monitoring & Error Tracking System
 * Advanced monitoring with beautiful table output using Bun utilities mastery
 * 
 * @fileoverview Real-time directory monitoring with error tracking and analytics
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { watch, FSWatcher, statSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import chalk from 'chalk';
import { BunTableProgress } from './enhanced-progress-bar.js';

interface DirectoryStatus {
    path: string;
    name: string;
    fileCount: number;
    totalSize: number;
    lastModified: Date;
    errorCount: number;
    status: string;
    health: number;
}

interface ErrorLog {
    timestamp: Date;
    directory: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    message: string;
    resolved: boolean;
}

interface MonitoringMetrics {
    totalDirectories: number;
    totalFiles: number;
    totalSize: number;
    errorRate: number;
    lastScan: Date;
    uptime: number;
}

class DirectoryMonitorSystem {
    private vaultPath: string;
    private directories: Map<string, DirectoryStatus> = new Map();
    private errors: ErrorLog[] = [];
    private metrics: MonitoringMetrics;
    private isRunning: boolean = false;
    private scanInterval: NodeJS.Timeout | null = null;
    private startTime: Date = new Date();

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.metrics = {
            totalDirectories: 0,
            totalFiles: 0,
            totalSize: 0,
            errorRate: 0,
            lastScan: new Date(),
            uptime: 0
        };
    }

    /**
     * Start comprehensive directory monitoring
     */
    async startMonitoring(): Promise<void> {
        console.clear();
        console.info(chalk.blue.bold('🔍 Comprehensive Directory Monitoring System'));
        console.info(chalk.gray('Powered by Bun Utilities Mastery - Real-time Analytics & Error Tracking'));
        console.info(chalk.gray('═'.repeat(120)));

        this.isRunning = true;
        this.startTime = new Date();

        // Initial scan
        await this.performFullScan();

        // Start real-time updates
        this.startRealTimeUpdates();

        // Handle graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());

        // Display initial dashboard
        await this.displayMonitoringDashboard();
    }

    /**
     * Perform full directory scan
     */
    private async performFullScan(): Promise<void> {
        try {
            const directories = this.getDirectoriesToMonitor();

            for (const dirPath of directories) {
                await this.scanDirectory(dirPath);
            }

            this.updateMetrics();
            this.metrics.lastScan = new Date();

        } catch (error) {
            this.logError('vault', 'critical', 'SCAN_ERROR', `Full scan failed: ${error.message}`);
        }
    }

    /**
     * Scan individual directory
     */
    private async scanDirectory(dirPath: string): Promise<void> {
        try {
            const files = readdirSync(dirPath);
            let totalSize = 0;
            let errorCount = 0;

            for (const file of files) {
                try {
                    const filePath = join(dirPath, file);
                    const stats = statSync(filePath);
                    totalSize += stats.size;
                } catch (error) {
                    errorCount++;
                    this.logError(dirPath, 'medium', 'FILE_ACCESS_ERROR', `Cannot access ${file}: ${error.message}`);
                }
            }

            const dirName = dirPath.split('/').pop() || dirPath;
            const health = this.calculateHealth(files.length, errorCount, totalSize);
            const status = this.getStatusFromHealth(health);

            this.directories.set(dirPath, {
                path: dirPath,
                name: dirName,
                fileCount: files.length,
                totalSize,
                lastModified: new Date(),
                errorCount,
                status,
                health
            });

        } catch (error) {
            this.logError(dirPath, 'high', 'DIRECTORY_SCAN_ERROR', `Directory scan failed: ${error.message}`);
        }
    }

    /**
     * Display comprehensive monitoring dashboard
     */
    private async displayMonitoringDashboard(): Promise<void> {
        console.clear();

        // Header
        this.displayHeader();

        // Directory Status Overview
        this.displayDirectoryOverview();

        // Error Summary
        this.displayErrorSummary();

        // System Metrics
        this.displaySystemMetrics();

        // Recent Errors
        this.displayRecentErrors();

        // Health Analysis
        this.displayHealthAnalysis();

        // Footer
        this.displayFooter();
    }

    /**
     * Display dashboard header
     */
    private displayHeader(): void {
        const uptime = this.getUptime();
        const headerText = `🔍 Directory Monitoring System - Uptime: ${uptime}`;

        console.info(chalk.blue.bold(headerText));
        console.info(chalk.gray('═'.repeat(120)));
    }

    /**
     * Display directory overview with progress bars
     */
    private displayDirectoryOverview(): void {
        console.info(chalk.cyan.bold('\n📁 Directory Status Overview'));
        console.info(chalk.gray('─'.repeat(120)));

        const directoryData = Array.from(this.directories.values()).map(dir => ({
            'Directory': dir.name,
            'Files': dir.fileCount,
            'Size': this.formatBytes(dir.totalSize),
            'Errors': dir.errorCount,
            'Health': `${dir.health.toFixed(1)}%`,
            'Status': dir.status,
            'Health Bar': this.createHealthBar(dir.health)
        }));

        console.info(Bun.inspect.table(directoryData, {}, {
            colors: true,
            maxStringLength: 25,
            compact: false
        }));
    }

    /**
     * Display error summary
     */
    private displayErrorSummary(): void {
        console.info(chalk.cyan.bold('\n🚨 Error Summary'));
        console.info(chalk.gray('─'.repeat(120)));

        const errorSummary = this.getErrorSummary();

        const summaryData = [
            {
                'Severity': '🔴 Critical',
                'Count': errorSummary.critical,
                'Trend': errorSummary.critical > 0 ? '📈 Rising' : '📉 Stable',
                'Status': errorSummary.critical > 0 ? '🔴 Action Required' : '🟢 Clear'
            },
            {
                'Severity': '🟠 High',
                'Count': errorSummary.high,
                'Trend': errorSummary.high > 2 ? '📈 Rising' : '📊 Stable',
                'Status': errorSummary.high > 0 ? '🟡 Monitor' : '🟢 Clear'
            },
            {
                'Severity': '🟡 Medium',
                'Count': errorSummary.medium,
                'Trend': errorSummary.medium > 5 ? '📈 Rising' : '📊 Stable',
                'Status': errorSummary.medium > 0 ? '🟡 Monitor' : '🟢 Clear'
            },
            {
                'Severity': '🔵 Low',
                'Count': errorSummary.low,
                'Trend': '📊 Normal',
                'Status': '🟢 Info Only'
            }
        ];

        console.info(Bun.inspect.table(summaryData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display system metrics
     */
    private displaySystemMetrics(): void {
        console.info(chalk.cyan.bold('\n📊 System Metrics'));
        console.info(chalk.gray('─'.repeat(120)));

        const metricsData = [
            {
                'Metric': 'Total Directories',
                'Value': this.metrics.totalDirectories.toString(),
                'Target': 'N/A',
                'Status': '🟢 Active',
                'Performance': this.createProgressBar(this.metrics.totalDirectories, 50, 15)
            },
            {
                'Metric': 'Total Files',
                'Value': this.metrics.totalFiles.toString(),
                'Target': '>1000',
                'Status': this.metrics.totalFiles > 1000 ? '🟢 Excellent' : '🟡 Growing',
                'Performance': this.createProgressBar(this.metrics.totalFiles, 2000, 15)
            },
            {
                'Metric': 'Total Size',
                'Value': this.formatBytes(this.metrics.totalSize),
                'Target': '<100MB',
                'Status': this.metrics.totalSize < 100 * 1024 * 1024 ? '🟢 Optimal' : '🟡 Large',
                'Performance': this.createProgressBar(this.metrics.totalSize, 100 * 1024 * 1024, 15)
            },
            {
                'Metric': 'Error Rate',
                'Value': `${(this.metrics.errorRate * 100).toFixed(2)}%`,
                'Target': '<1%',
                'Status': this.metrics.errorRate < 0.01 ? '🟢 Excellent' : '🟡 Monitor',
                'Performance': this.createProgressBar(100 - (this.metrics.errorRate * 100), 100, 15)
            }
        ];

        console.info(Bun.inspect.table(metricsData, {}, {
            colors: true,
            maxStringLength: 18,
            compact: false
        }));
    }

    /**
     * Display recent errors
     */
    private displayRecentErrors(): void {
        console.info(chalk.cyan.bold('\n📝 Recent Errors'));
        console.info(chalk.gray('─'.repeat(120)));

        const recentErrors = this.errors.slice(-10).reverse().map(error => ({
            'Time': error.timestamp.toLocaleTimeString(),
            'Directory': error.directory.split('/').pop() || 'Root',
            'Severity': this.getSeverityIcon(error.severity),
            'Category': error.category,
            'Message': error.message.length > 30 ? error.message.substring(0, 30) + '...' : error.message,
            'Status': error.resolved ? '✅' : '🔴'
        }));

        if (recentErrors.length > 0) {
            console.info(Bun.inspect.table(recentErrors, {}, {
                colors: true,
                maxStringLength: 25,
                compact: false
            }));
        } else {
            console.info(chalk.green('🎉 No recent errors detected! All systems operating normally.'));
        }
    }

    /**
     * Display health analysis
     */
    private displayHealthAnalysis(): void {
        console.info(chalk.cyan.bold('\n🏥 Health Analysis'));
        console.info(chalk.gray('─'.repeat(120)));

        const healthData = this.getHealthAnalysis();

        const analysisData = [
            {
                'Category': 'Directory Health',
                'Score': `${healthData.directoryHealth.toFixed(1)}%`,
                'Issues': healthData.directoryIssues,
                'Trend': healthData.directoryTrend,
                'Status': healthData.directoryStatus,
                'Visual': this.createHealthBar(healthData.directoryHealth)
            },
            {
                'Category': 'Error Rate',
                'Score': `${healthData.errorHealth.toFixed(1)}%`,
                'Issues': healthData.errorIssues,
                'Trend': healthData.errorTrend,
                'Status': healthData.errorStatus,
                'Visual': this.createHealthBar(healthData.errorHealth)
            },
            {
                'Category': 'Size Management',
                'Score': `${healthData.sizeHealth.toFixed(1)}%`,
                'Issues': healthData.sizeIssues,
                'Trend': healthData.sizeTrend,
                'Status': healthData.sizeStatus,
                'Visual': this.createHealthBar(healthData.sizeHealth)
            },
            {
                'Category': 'Overall System',
                'Score': `${healthData.overallHealth.toFixed(1)}%`,
                'Issues': healthData.overallIssues,
                'Trend': healthData.overallTrend,
                'Status': healthData.overallStatus,
                'Visual': this.createHealthBar(healthData.overallHealth)
            }
        ];

        console.info(Bun.inspect.table(analysisData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display footer with controls
     */
    private displayFooter(): void {
        console.info(chalk.gray('─'.repeat(120)));
        console.info(chalk.blue('Controls: [Ctrl+C] Exit | [Space] Refresh | [R] Reset | [L] View Logs'));
        console.info(chalk.gray(`Last Scan: ${this.metrics.lastScan.toLocaleTimeString()} | Next Scan: 30s | Errors: ${this.errors.length}`));
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    private getDirectoriesToMonitor(): string[] {
        const directories: string[] = [];

        try {
            const items = readdirSync(this.vaultPath, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory() && !item.name.startsWith('.') && !item.name.includes('node_modules')) {
                    directories.push(join(this.vaultPath, item.name));
                }
            }
        } catch (error) {
            this.logError('vault', 'critical', 'DIRECTORY_LIST_ERROR', `Cannot list directories: ${error.message}`);
        }

        return directories;
    }

    private calculateHealth(fileCount: number, errorCount: number, totalSize: number): number {
        let health = 100;

        // Penalize for errors
        if (errorCount > 0) {
            health -= Math.min(50, errorCount * 10);
        }

        // Penalize for too many or too few files
        if (fileCount === 0) {
            health -= 30;
        } else if (fileCount > 1000) {
            health -= Math.min(20, (fileCount - 1000) / 50);
        }

        // Penalize for excessive size
        if (totalSize > 100 * 1024 * 1024) { // > 100MB
            health -= Math.min(20, (totalSize - 100 * 1024 * 1024) / (10 * 1024 * 1024));
        }

        return Math.max(0, Math.min(100, health));
    }

    private getStatusFromHealth(health: number): string {
        if (health >= 90) return '🟢 Excellent';
        if (health >= 70) return '🟡 Good';
        if (health >= 50) return '🟠 Fair';
        return '🔴 Poor';
    }

    private createProgressBar(current: number, total: number, width: number): string {
        const percentage = Math.min(100, (current / total) * 100);
        const filledWidth = Math.round((width * percentage) / 100);
        const bar = '█'.repeat(filledWidth) + '░'.repeat(width - filledWidth);
        return `[${this.colorBar(bar, percentage)}]`;
    }

    private createHealthBar(health: number): string {
        const width = 10;
        const filledWidth = Math.round((width * health) / 100);
        const bar = '█'.repeat(filledWidth) + '░'.repeat(width - filledWidth);
        return `[${this.colorBar(bar, health)}]`;
    }

    private colorBar(bar: string, percentage: number): string {
        if (percentage >= 90) return `\x1b[32m${bar}\x1b[0m`; // Green
        if (percentage >= 70) return `\x1b[36m${bar}\x1b[0m`; // Cyan
        if (percentage >= 50) return `\x1b[33m${bar}\x1b[0m`; // Yellow
        if (percentage >= 30) return `\x1b[35m${bar}\x1b[0m`; // Magenta
        return `\x1b[31m${bar}\x1b[0m`; // Red
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    private getUptime(): string {
        const uptime = Date.now() - this.startTime.getTime();
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    private getSeverityIcon(severity: string): string {
        switch (severity) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🔵';
            default: return '⚪';
        }
    }

    private logError(directory: string, severity: 'low' | 'medium' | 'high' | 'critical', category: string, message: string): void {
        const error: ErrorLog = {
            timestamp: new Date(),
            directory,
            severity,
            category,
            message,
            resolved: false
        };

        this.errors.push(error);

        // Keep only last 100 errors
        if (this.errors.length > 100) {
            this.errors = this.errors.slice(-100);
        }
    }

    private updateMetrics(): void {
        this.metrics.totalDirectories = this.directories.size;
        this.metrics.totalFiles = Array.from(this.directories.values()).reduce((sum, dir) => sum + dir.fileCount, 0);
        this.metrics.totalSize = Array.from(this.directories.values()).reduce((sum, dir) => sum + dir.totalSize, 0);

        const totalErrors = Array.from(this.directories.values()).reduce((sum, dir) => sum + dir.errorCount, 0);
        this.metrics.errorRate = this.metrics.totalFiles > 0 ? totalErrors / this.metrics.totalFiles : 0;
    }

    private getErrorSummary(): Record<string, number> {
        const summary = { critical: 0, high: 0, medium: 0, low: 0 };

        for (const error of this.errors) {
            summary[error.severity]++;
        }

        return summary;
    }

    private getHealthAnalysis(): Record<string, any> {
        const directories = Array.from(this.directories.values());

        const avgHealth = directories.length > 0
            ? directories.reduce((sum, dir) => sum + dir.health, 0) / directories.length
            : 100;

        const totalErrors = directories.reduce((sum, dir) => sum + dir.errorCount, 0);
        const errorHealth = Math.max(0, 100 - (totalErrors * 5));

        const sizeHealth = this.metrics.totalSize < 100 * 1024 * 1024 ? 100 : Math.max(0, 100 - ((this.metrics.totalSize - 100 * 1024 * 1024) / (10 * 1024 * 1024)));

        const overallHealth = (avgHealth + errorHealth + sizeHealth) / 3;

        return {
            directoryHealth: avgHealth,
            directoryIssues: directories.filter(dir => dir.health < 70).length,
            directoryTrend: avgHealth >= 80 ? '📈 Improving' : '📊 Stable',
            directoryStatus: avgHealth >= 80 ? '🟢 Excellent' : avgHealth >= 60 ? '🟡 Good' : '🔴 Needs Attention',

            errorHealth,
            errorIssues: totalErrors,
            errorTrend: totalErrors === 0 ? '📉 None' : '📊 Present',
            errorStatus: totalErrors === 0 ? '🟢 Clear' : totalErrors < 5 ? '🟡 Minimal' : '🔴 Elevated',

            sizeHealth,
            sizeIssues: this.metrics.totalSize > 100 * 1024 * 1024 ? 1 : 0,
            sizeTrend: this.metrics.totalSize < 50 * 1024 * 1024 ? '📉 Optimal' : '📊 Growing',
            sizeStatus: this.metrics.totalSize < 50 * 1024 * 1024 ? '🟢 Excellent' : this.metrics.totalSize < 100 * 1024 * 1024 ? '🟡 Good' : '🔴 Large',

            overallHealth,
            overallIssues: (avgHealth < 70 ? 1 : 0) + (totalErrors > 0 ? 1 : 0) + (this.metrics.totalSize > 100 * 1024 * 1024 ? 1 : 0),
            overallTrend: overallHealth >= 80 ? '📈 Excellent' : overallHealth >= 60 ? '📊 Stable' : '📉 Declining',
            overallStatus: overallHealth >= 80 ? '🟢 Healthy' : overallHealth >= 60 ? '🟡 Monitor' : '🔴 Attention Needed'
        };
    }

    private startRealTimeUpdates(): void {
        this.scanInterval = setInterval(async () => {
            await this.performFullScan();
            await this.displayMonitoringDashboard();
        }, 30000); // Update every 30 seconds
    }

    private shutdown(): void {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }
        this.isRunning = false;
        console.info(chalk.yellow('\n👋 Directory Monitoring System shutting down...'));
        console.info(chalk.green('✅ All monitoring services stopped gracefully'));
        process.exit(0);
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.info(chalk.blue.bold('🔍 Comprehensive Directory Monitoring System'));
        console.info(chalk.gray('Usage: bun directory-monitor.ts [options]'));
        console.info(chalk.gray('\nOptions:'));
        console.info(chalk.gray('  --help, -h   Show this help message'));
        console.info(chalk.gray('  --demo       Run demo mode (single scan)'));
        console.info(chalk.gray('  --scan-only  Perform single scan and exit'));
        console.info(chalk.gray('\nFeatures: Real-time monitoring, error tracking, health analysis'));
        process.exit(0);
    }

    try {
        const monitor = new DirectoryMonitorSystem();

        if (args.includes('--demo')) {
            // Demo mode - single scan with dashboard
            await monitor.performFullScan();
            await monitor['displayMonitoringDashboard']();
        } else if (args.includes('--scan-only')) {
            // Scan only mode
            await monitor.performFullScan();
            console.info(chalk.green('✅ Directory scan completed'));
        } else {
            // Full monitoring mode
            await monitor.startMonitoring();
        }

    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

// =============================================================================
// EXECUTION
// =============================================================================

if (import.meta.main) {
    main().catch(console.error);
}

export { DirectoryMonitorSystem, type DirectoryStatus, type ErrorLog, type MonitoringMetrics };

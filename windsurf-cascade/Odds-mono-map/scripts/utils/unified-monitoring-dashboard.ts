#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]unified-monitoring-dashboard
 * 
 * Unified Monitoring Dashboard
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
 * Unified Monitoring Dashboard
 * Combines directory monitoring and error tracking with beautiful Bun utilities integration
 * 
 * @fileoverview Comprehensive monitoring system with real-time analytics
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { watch, FSWatcher, statSync, existsSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface UnifiedMetrics {
    system: {
        totalDirectories: number;
        totalFiles: number;
        totalSize: number;
        uptime: number;
        lastScan: Date;
    };
    errors: {
        totalErrors: number;
        criticalErrors: number;
        unresolvedErrors: number;
        errorRate: number;
        resolutionRate: number;
        recentTrend: 'improving' | 'stable' | 'worsening';
    };
    performance: {
        scanTime: number;
        memoryUsage: number;
        cpuUsage: number;
        responseTime: number;
    };
    health: {
        overallScore: number;
        directoryHealth: number;
        errorHealth: number;
        performanceHealth: number;
    };
}

interface DirectoryStatus {
    path: string;
    name: string;
    fileCount: number;
    totalSize: number;
    lastModified: Date;
    errorCount: number;
    health: number;
    status: string;
}

interface ErrorEntry {
    id: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    directory: string;
    message: string;
    resolved: boolean;
    occurrences: number;
    lastOccurrence: Date;
}

class UnifiedMonitoringDashboard {
    private vaultPath: string;
    private directories: Map<string, DirectoryStatus> = new Map();
    private errors: ErrorEntry[] = [];
    private metrics: UnifiedMetrics;
    private isRunning: boolean = false;
    private scanInterval: NodeJS.Timeout | null = null;
    private startTime: Date = new Date();

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.metrics = this.initializeMetrics();
    }

    /**
     * Start unified monitoring dashboard
     */
    async startUnifiedMonitoring(): Promise<void> {
        console.clear();
        console.log(chalk.blue.bold('🎯 Unified Monitoring Dashboard'));
        console.log(chalk.gray('Powered by Bun Utilities Mastery - Complete System Monitoring & Error Tracking'));
        console.log(chalk.gray('═'.repeat(140)));

        this.isRunning = true;
        this.startTime = new Date();

        // Initial scan
        await this.performUnifiedScan();

        // Start real-time updates
        this.startRealTimeUpdates();

        // Handle graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());

        // Display initial dashboard
        await this.displayUnifiedDashboard();
    }

    /**
     * Perform comprehensive unified scan
     */
    private async performUnifiedScan(): Promise<void> {
        const scanStartTime = Date.now();

        try {
            // Scan directories
            await this.scanAllDirectories();

            // Load existing errors
            await this.loadErrors();

            // Update metrics
            this.updateUnifiedMetrics();

            // Calculate performance metrics
            this.metrics.performance.scanTime = Date.now() - scanStartTime;
            this.metrics.performance.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
            this.metrics.performance.responseTime = this.metrics.performance.scanTime;

            this.metrics.system.lastScan = new Date();

        } catch (error) {
            this.logError('SYSTEM', 'critical', 'UNIFIED_SCAN_ERROR', `Unified scan failed: ${error.message}`);
        }
    }

    /**
     * Display comprehensive unified dashboard
     */
    private async displayUnifiedDashboard(): Promise<void> {
        console.clear();

        // Header
        this.displayHeader();

        // Executive Summary
        this.displayExecutiveSummary();

        // System Overview
        this.displaySystemOverview();

        // Error Analysis
        this.displayErrorAnalysis();

        // Performance Metrics
        this.displayPerformanceMetrics();

        // Health Assessment
        this.displayHealthAssessment();

        // Directory Deep Dive
        this.displayDirectoryDeepDive();

        // Recent Activity
        this.displayRecentActivity();

        // Footer
        this.displayFooter();
    }

    /**
     * Display executive summary with key metrics
     */
    private displayExecutiveSummary(): void {
        console.log(chalk.magenta.bold('\n📊 Executive Summary'));
        console.log(chalk.gray('═'.repeat(140)));

        const summaryData = [
            {
                'Category': 'System Status',
                'Metric': 'Total Directories',
                'Value': this.metrics.system.totalDirectories.toString(),
                'Status': this.getSystemStatus(),
                'Health': `${this.metrics.health.overallScore.toFixed(1)}%`,
                'Trend': this.getOverallTrend(),
                'Priority': this.metrics.health.overallScore >= 80 ? '🟢 Low' : this.metrics.health.overallScore >= 60 ? '🟡 Medium' : '🔴 High'
            },
            {
                'Category': 'File Management',
                'Metric': 'Total Files',
                'Value': this.metrics.system.totalFiles.toString(),
                'Status': this.getFileStatus(),
                'Health': `${this.metrics.health.directoryHealth.toFixed(1)}%`,
                'Trend': this.getFileTrend(),
                'Priority': this.metrics.health.directoryHealth >= 80 ? '🟢 Low' : this.metrics.health.directoryHealth >= 60 ? '🟡 Medium' : '🔴 High'
            },
            {
                'Category': 'Error Management',
                'Metric': 'Error Rate',
                'Value': `${(this.metrics.errors.errorRate * 100).toFixed(2)}%`,
                'Status': this.getErrorStatus(),
                'Health': `${this.metrics.health.errorHealth.toFixed(1)}%`,
                'Trend': this.metrics.errors.recentTrend === 'improving' ? '📉 Improving' : this.metrics.errors.recentTrend === 'worsening' ? '📈 Worsening' : '📊 Stable',
                'Priority': this.metrics.errors.errorRate < 0.01 ? '🟢 Low' : this.metrics.errors.errorRate < 0.05 ? '🟡 Medium' : '🔴 High'
            },
            {
                'Category': 'Performance',
                'Metric': 'Response Time',
                'Value': `${this.metrics.performance.responseTime}ms`,
                'Status': this.getPerformanceStatus(),
                'Health': `${this.metrics.health.performanceHealth.toFixed(1)}%`,
                'Trend': this.getPerformanceTrend(),
                'Priority': this.metrics.performance.responseTime < 100 ? '🟢 Low' : this.metrics.performance.responseTime < 500 ? '🟡 Medium' : '🔴 High'
            }
        ];

        console.log(Bun.inspect.table(summaryData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display system overview with progress bars
     */
    private displaySystemOverview(): void {
        console.log(chalk.cyan.bold('\n🖥️ System Overview'));
        console.log(chalk.gray('─'.repeat(140)));

        const systemData = [
            {
                'Component': 'Directory Coverage',
                'Count': `${this.metrics.system.totalDirectories} directories`,
                'Utilization': `${((this.metrics.system.totalDirectories / 50) * 100).toFixed(1)}%`,
                'Status': this.metrics.system.totalDirectories > 0 ? '🟢 Active' : '🔴 Inactive',
                'Performance': this.createProgressBar(this.metrics.system.totalDirectories, 50, 20),
                'Health': this.metrics.health.directoryHealth >= 80 ? '🟢 Excellent' : this.metrics.health.directoryHealth >= 60 ? '🟡 Good' : '🔴 Poor'
            },
            {
                'Component': 'File Management',
                'Count': `${this.metrics.system.totalFiles} files`,
                'Utilization': `${((this.metrics.system.totalFiles / 2000) * 100).toFixed(1)}%`,
                'Status': this.metrics.system.totalFiles > 100 ? '🟢 Robust' : this.metrics.system.totalFiles > 0 ? '🟡 Growing' : '🔴 Empty',
                'Performance': this.createProgressBar(this.metrics.system.totalFiles, 2000, 20),
                'Health': this.metrics.system.totalFiles > 0 ? '🟢 Healthy' : '🔴 Minimal'
            },
            {
                'Component': 'Storage Usage',
                'Count': this.formatBytes(this.metrics.system.totalSize),
                'Utilization': `${((this.metrics.system.totalSize / (100 * 1024 * 1024)) * 100).toFixed(1)}%`,
                'Status': this.metrics.system.totalSize < 50 * 1024 * 1024 ? '🟢 Optimal' : this.metrics.system.totalSize < 100 * 1024 * 1024 ? '🟡 Moderate' : '🔴 Large',
                'Performance': this.createProgressBar(this.metrics.system.totalSize, 100 * 1024 * 1024, 20),
                'Health': this.metrics.system.totalSize < 100 * 1024 * 1024 ? '🟢 Efficient' : '🟡 Bloated'
            },
            {
                'Component': 'System Uptime',
                'Count': this.getUptime(),
                'Utilization': '100%',
                'Status': this.isRunning ? '🟢 Running' : '🔴 Stopped',
                'Performance': this.createUptimeBar(),
                'Health': this.isRunning ? '🟢 Stable' : '🔴 Offline'
            }
        ];

        console.log(Bun.inspect.table(systemData, {}, {
            colors: true,
            maxStringLength: 18,
            compact: false
        }));
    }

    /**
     * Display error analysis with detailed breakdown
     */
    private displayErrorAnalysis(): void {
        console.log(chalk.red.bold('\n🚨 Error Analysis'));
        console.log(chalk.gray('─'.repeat(140)));

        const errorData = [
            {
                'Severity Level': '🔴 Critical',
                'Count': this.metrics.errors.criticalErrors.toString(),
                'Percentage': `${this.metrics.errors.totalErrors > 0 ? (this.metrics.errors.criticalErrors / this.metrics.errors.totalErrors * 100).toFixed(1) : 0}%`,
                'Trend': this.metrics.errors.criticalErrors > 0 ? '📈 Active' : '📉 None',
                'Resolution': `${this.getResolutionRate('critical').toFixed(1)}%`,
                'Impact': this.metrics.errors.criticalErrors > 0 ? '🚨 High' : '✅ None',
                'Action': this.metrics.errors.criticalErrors > 0 ? '🔴 Immediate' : '🟢 Monitor'
            },
            {
                'Severity Level': '🟠 High',
                'Count': (this.metrics.errors.totalErrors - this.metrics.errors.criticalErrors - this.getMediumErrors() - this.getLowErrors()).toString(),
                'Percentage': `${this.metrics.errors.totalErrors > 0 ? ((this.metrics.errors.totalErrors - this.metrics.errors.criticalErrors - this.getMediumErrors() - this.getLowErrors()) / this.metrics.errors.totalErrors * 100).toFixed(1) : 0}%`,
                'Trend': this.getHighErrorTrend(),
                'Resolution': `${this.getResolutionRate('high').toFixed(1)}%`,
                'Impact': this.getHighErrorCount() > 0 ? '🟡 Medium' : '✅ Low',
                'Action': this.getHighErrorCount() > 5 ? '🟡 Attention' : '🟢 Monitor'
            },
            {
                'Severity Level': '🟡 Medium',
                'Count': this.getMediumErrors().toString(),
                'Percentage': `${this.metrics.errors.totalErrors > 0 ? (this.getMediumErrors() / this.metrics.errors.totalErrors * 100).toFixed(1) : 0}%`,
                'Trend': this.getMediumErrorTrend(),
                'Resolution': `${this.getResolutionRate('medium').toFixed(1)}%`,
                'Impact': this.getMediumErrors() > 10 ? '🟡 Notable' : '✅ Minimal',
                'Action': this.getMediumErrors() > 15 ? '🟡 Review' : '🟢 Monitor'
            },
            {
                'Severity Level': '🔵 Low',
                'Count': this.getLowErrors().toString(),
                'Percentage': `${this.metrics.errors.totalErrors > 0 ? (this.getLowErrors() / this.metrics.errors.totalErrors * 100).toFixed(1) : 0}%`,
                'Trend': this.getLowErrorTrend(),
                'Resolution': `${this.getResolutionRate('low').toFixed(1)}%`,
                'Impact': '✅ Low',
                'Action': '🟢 Track'
            }
        ];

        console.log(Bun.inspect.table(errorData, {}, {
            colors: true,
            maxStringLength: 16,
            compact: false
        }));
    }

    /**
     * Display performance metrics
     */
    private displayPerformanceMetrics(): void {
        console.log(chalk.green.bold('\n⚡ Performance Metrics'));
        console.log(chalk.gray('─'.repeat(140)));

        const performanceData = [
            {
                'Metric': 'Scan Performance',
                'Current': `${this.metrics.performance.scanTime}ms`,
                'Target': '<100ms',
                'Status': this.metrics.performance.scanTime < 100 ? '🟢 Excellent' : this.metrics.performance.scanTime < 500 ? '🟡 Good' : '🔴 Slow',
                'Trend': this.getScanTrend(),
                'Benchmark': this.createProgressBar(100 - Math.min(100, this.metrics.performance.scanTime), 100, 15),
                'Score': `${Math.max(0, 100 - this.metrics.performance.scanTime / 10).toFixed(1)}%`
            },
            {
                'Metric': 'Memory Usage',
                'Current': `${this.metrics.performance.memoryUsage.toFixed(1)}MB`,
                'Target': '<50MB',
                'Status': this.metrics.performance.memoryUsage < 50 ? '🟢 Optimal' : this.metrics.performance.memoryUsage < 100 ? '🟡 Moderate' : '🔴 High',
                'Trend': this.getMemoryTrend(),
                'Benchmark': this.createProgressBar(100 - Math.min(100, this.metrics.performance.memoryUsage), 100, 15),
                'Score': `${Math.max(0, 100 - this.metrics.performance.memoryUsage).toFixed(1)}%`
            },
            {
                'Metric': 'Response Time',
                'Current': `${this.metrics.performance.responseTime}ms`,
                'Target': '<200ms',
                'Status': this.metrics.performance.responseTime < 200 ? '🟢 Fast' : this.metrics.performance.responseTime < 500 ? '🟡 Moderate' : '🔴 Slow',
                'Trend': this.getResponseTrend(),
                'Benchmark': this.createProgressBar(100 - Math.min(100, this.metrics.performance.responseTime / 2), 100, 15),
                'Score': `${Math.max(0, 100 - this.metrics.performance.responseTime / 5).toFixed(1)}%`
            },
            {
                'Metric': 'System Efficiency',
                'Current': `${this.getEfficiencyScore().toFixed(1)}%`,
                'Target': '>80%',
                'Status': this.getEfficiencyScore() > 80 ? '🟢 Excellent' : this.getEfficiencyScore() > 60 ? '🟡 Good' : '🔴 Poor',
                'Trend': this.getEfficiencyTrend(),
                'Benchmark': this.createProgressBar(this.getEfficiencyScore(), 100, 15),
                'Score': `${this.getEfficiencyScore().toFixed(1)}%`
            }
        ];

        console.log(Bun.inspect.table(performanceData, {}, {
            colors: true,
            maxStringLength: 18,
            compact: false
        }));
    }

    /**
     * Display health assessment
     */
    private displayHealthAssessment(): void {
        console.log(chalk.blue.bold('\n🏥 Health Assessment'));
        console.log(chalk.gray('─'.repeat(140)));

        const healthData = [
            {
                'Component': 'Directory Health',
                'Score': `${this.metrics.health.directoryHealth.toFixed(1)}%`,
                'Issues': this.getDirectoryIssues(),
                'Status': this.metrics.health.directoryHealth >= 80 ? '🟢 Excellent' : this.metrics.health.directoryHealth >= 60 ? '🟡 Good' : '🔴 Poor',
                'Trend': this.getDirectoryHealthTrend(),
                'Visual': this.createHealthBar(this.metrics.health.directoryHealth),
                'Recommendation': this.metrics.health.directoryHealth >= 80 ? '✅ Maintain' : this.metrics.health.directoryHealth >= 60 ? '🔍 Monitor' : '🔧 Improve'
            },
            {
                'Component': 'Error Health',
                'Score': `${this.metrics.health.errorHealth.toFixed(1)}%`,
                'Issues': this.metrics.errors.unresolvedErrors.toString(),
                'Status': this.metrics.health.errorHealth >= 80 ? '🟢 Clean' : this.metrics.health.errorHealth >= 60 ? '🟡 Minor Issues' : '🔴 Significant',
                'Trend': this.metrics.errors.recentTrend === 'improving' ? '📉 Improving' : this.metrics.errors.recentTrend === 'worsening' ? '📈 Worsening' : '📊 Stable',
                'Visual': this.createHealthBar(this.metrics.health.errorHealth),
                'Recommendation': this.metrics.errors.unresolvedErrors === 0 ? '✅ Maintain' : this.metrics.errors.unresolvedErrors < 5 ? '🔍 Monitor' : '🔧 Address'
            },
            {
                'Component': 'Performance Health',
                'Score': `${this.metrics.health.performanceHealth.toFixed(1)}%`,
                'Issues': this.getPerformanceIssues(),
                'Status': this.metrics.health.performanceHealth >= 80 ? '🟢 Optimal' : this.metrics.health.performanceHealth >= 60 ? '🟡 Acceptable' : '🔴 Degraded',
                'Trend': this.getPerformanceHealthTrend(),
                'Visual': this.createHealthBar(this.metrics.health.performanceHealth),
                'Recommendation': this.metrics.health.performanceHealth >= 80 ? '✅ Maintain' : this.metrics.health.performanceHealth >= 60 ? '🔍 Optimize' : '🔧 Upgrade'
            },
            {
                'Component': 'Overall System',
                'Score': `${this.metrics.health.overallScore.toFixed(1)}%`,
                'Issues': this.getOverallIssues(),
                'Status': this.metrics.health.overallScore >= 80 ? '🟢 Healthy' : this.metrics.health.overallScore >= 60 ? '🟡 Functional' : '🔴 At Risk',
                'Trend': this.getOverallHealthTrend(),
                'Visual': this.createHealthBar(this.metrics.health.overallScore),
                'Recommendation': this.metrics.health.overallScore >= 80 ? '✅ Excellent' : this.metrics.health.overallScore >= 60 ? '🔍 Monitor' : '🚨 Action Required'
            }
        ];

        console.log(Bun.inspect.table(healthData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display directory deep dive
     */
    private displayDirectoryDeepDive(): void {
        console.log(chalk.cyan.bold('\n📁 Directory Deep Dive'));
        console.log(chalk.gray('─'.repeat(140)));

        const directoryData = Array.from(this.directories.values())
            .sort((a, b) => b.health - a.health)
            .slice(0, 10)
            .map(dir => ({
                'Directory': dir.name,
                'Files': dir.fileCount.toString(),
                'Size': this.formatBytes(dir.totalSize),
                'Errors': dir.errorCount.toString(),
                'Health': `${dir.health.toFixed(1)}%`,
                'Status': dir.status,
                'Health Bar': this.createHealthBar(dir.health),
                'Priority': dir.health >= 80 ? '🟢 Low' : dir.health >= 60 ? '🟡 Medium' : '🔴 High'
            }));

        console.log(Bun.inspect.table(directoryData, {}, {
            colors: true,
            maxStringLength: 15,
            compact: false
        }));
    }

    /**
     * Display recent activity
     */
    private displayRecentActivity(): void {
        console.log(chalk.magenta.bold('\n📝 Recent Activity'));
        console.log(chalk.gray('─'.repeat(140)));

        const recentErrors = this.errors
            .filter(e => !e.resolved)
            .sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
            .slice(0, 8)
            .map(error => ({
                'Time': error.lastOccurrence.toLocaleTimeString(),
                'Type': '🚨 Error',
                'Severity': this.getSeverityIcon(error.severity),
                'Category': error.category,
                'Directory': error.directory.split('/').pop() || 'Root',
                'Occurrences': error.occurrences.toString(),
                'Status': error.resolved ? '✅ Resolved' : '🔴 Active',
                'Action': '🔍 Investigate'
            }));

        if (recentErrors.length > 0) {
            console.log(Bun.inspect.table(recentErrors, {}, {
                colors: true,
                maxStringLength: 15,
                compact: false
            }));
        } else {
            console.log(chalk.green('🎉 No recent activity! All systems operating normally.'));
        }
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    private initializeMetrics(): UnifiedMetrics {
        return {
            system: {
                totalDirectories: 0,
                totalFiles: 0,
                totalSize: 0,
                uptime: 0,
                lastScan: new Date()
            },
            errors: {
                totalErrors: 0,
                criticalErrors: 0,
                unresolvedErrors: 0,
                errorRate: 0,
                resolutionRate: 0,
                recentTrend: 'stable'
            },
            performance: {
                scanTime: 0,
                memoryUsage: 0,
                cpuUsage: 0,
                responseTime: 0
            },
            health: {
                overallScore: 100,
                directoryHealth: 100,
                errorHealth: 100,
                performanceHealth: 100
            }
        };
    }

    private async scanAllDirectories(): Promise<void> {
        const directories = this.getDirectoriesToMonitor();

        for (const dirPath of directories) {
            await this.scanDirectory(dirPath);
        }
    }

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
                }
            }

            const dirName = dirPath.split('/').pop() || dirPath;
            const health = this.calculateDirectoryHealth(files.length, errorCount, totalSize);
            const status = this.getDirectoryStatusFromHealth(health);

            this.directories.set(dirPath, {
                path: dirPath,
                name: dirName,
                fileCount: files.length,
                totalSize,
                lastModified: new Date(),
                errorCount,
                health,
                status
            });

        } catch (error) {
            this.logError('DIRECTORY_SCAN', 'medium', 'SCAN_ERROR', `Cannot scan ${dirPath}: ${error.message}`);
        }
    }

    private async loadErrors(): Promise<void> {
        // Load errors from log file (simplified for demo)
        const logFile = join(this.vaultPath, '08 - Logs', 'enhanced-error-tracker.log');

        if (existsSync(logFile)) {
            try {
                const content = readFileSync(logFile, 'utf-8');
                const lines = content.trim().split('\n');

                for (const line of lines.slice(-50)) { // Last 50 entries
                    if (line.trim()) {
                        try {
                            const entry = JSON.parse(line);
                            if (entry.type !== 'update') {
                                this.errors.push({
                                    id: entry.id,
                                    timestamp: new Date(entry.timestamp),
                                    severity: entry.severity,
                                    category: entry.category,
                                    directory: entry.directory,
                                    message: entry.message,
                                    resolved: entry.resolved || false,
                                    occurrences: entry.occurrences || 1,
                                    lastOccurrence: new Date(entry.timestamp)
                                });
                            }
                        } catch (parseError) {
                            // Skip invalid lines
                        }
                    }
                }
            } catch (readError) {
                // Handle file read errors
            }
        }
    }

    private updateUnifiedMetrics(): void {
        // Update system metrics
        this.metrics.system.totalDirectories = this.directories.size;
        this.metrics.system.totalFiles = Array.from(this.directories.values()).reduce((sum, dir) => sum + dir.fileCount, 0);
        this.metrics.system.totalSize = Array.from(this.directories.values()).reduce((sum, dir) => sum + dir.totalSize, 0);
        this.metrics.system.uptime = Date.now() - this.startTime.getTime();

        // Update error metrics
        this.metrics.errors.totalErrors = this.errors.length;
        this.metrics.errors.criticalErrors = this.errors.filter(e => e.severity === 'critical').length;
        this.metrics.errors.unresolvedErrors = this.errors.filter(e => !e.resolved).length;
        this.metrics.errors.errorRate = this.metrics.system.totalFiles > 0 ? this.metrics.errors.unresolvedErrors / this.metrics.system.totalFiles : 0;
        this.metrics.errors.resolutionRate = this.metrics.errors.totalErrors > 0 ? (this.metrics.errors.totalErrors - this.metrics.errors.unresolvedErrors) / this.metrics.errors.totalErrors : 1;

        // Calculate health scores
        this.calculateHealthScores();
    }

    private calculateHealthScores(): void {
        // Directory health
        const avgDirectoryHealth = Array.from(this.directories.values()).length > 0
            ? Array.from(this.directories.values()).reduce((sum, dir) => sum + dir.health, 0) / this.directories.size
            : 100;
        this.metrics.health.directoryHealth = avgDirectoryHealth;

        // Error health
        this.metrics.health.errorHealth = Math.max(0, 100 - (this.metrics.errors.unresolvedErrors * 10));

        // Performance health
        const performanceScore = Math.max(0, 100 - (this.metrics.performance.scanTime / 10) - (this.metrics.performance.memoryUsage / 2));
        this.metrics.health.performanceHealth = performanceScore;

        // Overall health
        this.metrics.health.overallScore = (this.metrics.health.directoryHealth + this.metrics.health.errorHealth + this.metrics.health.performanceHealth) / 3;
    }

    private displayHeader(): void {
        const uptime = this.getUptime();
        const headerText = `🎯 Unified Monitoring Dashboard - Uptime: ${uptime} | Last Scan: ${this.metrics.system.lastScan.toLocaleTimeString()}`;

        console.log(chalk.blue.bold(headerText));
        console.log(chalk.gray('═'.repeat(140)));
    }

    private displayFooter(): void {
        console.log(chalk.gray('─'.repeat(140)));
        console.log(chalk.blue('Controls: [Ctrl+C] Exit | [Space] Refresh | [R] Resolve Errors | [E] Export | [D] Deep Scan'));
        console.log(chalk.gray(`Next Update: 30s | Directories: ${this.metrics.system.totalDirectories} | Files: ${this.metrics.system.totalFiles} | Errors: ${this.metrics.errors.unresolvedErrors}`));
    }

    // Progress bar and utility methods
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

    private createUptimeBar(): string {
        const uptimeHours = this.metrics.system.uptime / (1000 * 60 * 60);
        const percentage = Math.min(100, uptimeHours * 10); // 10% per hour
        return this.createProgressBar(uptimeHours * 10, 100, 15);
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
        const uptime = this.metrics.system.uptime;
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

    // Status and trend methods
    private getSystemStatus(): string {
        return this.metrics.system.totalDirectories > 0 ? '🟢 Active' : '🔴 Inactive';
    }

    private getFileStatus(): string {
        return this.metrics.system.totalFiles > 1000 ? '🟢 Robust' : this.metrics.system.totalFiles > 0 ? '🟡 Growing' : '🔴 Empty';
    }

    private getErrorStatus(): string {
        return this.metrics.errors.errorRate < 0.01 ? '🟢 Clean' : this.metrics.errors.errorRate < 0.05 ? '🟡 Minor' : '🔴 Elevated';
    }

    private getPerformanceStatus(): string {
        return this.metrics.performance.responseTime < 100 ? '🟢 Fast' : this.metrics.performance.responseTime < 500 ? '🟡 Moderate' : '🔴 Slow';
    }

    private getOverallTrend(): string {
        return this.metrics.health.overallScore >= 80 ? '📈 Improving' : this.metrics.health.overallScore >= 60 ? '📊 Stable' : '📉 Declining';
    }

    private getFileTrend(): string {
        return this.metrics.system.totalFiles > 500 ? '📈 Growing' : '📊 Stable';
    }

    private getPerformanceTrend(): string {
        return this.metrics.performance.responseTime < 200 ? '📉 Improving' : '📊 Stable';
    }

    private getScanTrend(): string {
        return this.metrics.performance.scanTime < 100 ? '📉 Fast' : this.metrics.performance.scanTime < 500 ? '📊 Normal' : '📈 Slow';
    }

    private getMemoryTrend(): string {
        return this.metrics.performance.memoryUsage < 50 ? '📉 Low' : this.metrics.performance.memoryUsage < 100 ? '📊 Normal' : '📈 High';
    }

    private getResponseTrend(): string {
        return this.metrics.performance.responseTime < 200 ? '📉 Improving' : '📊 Stable';
    }

    private getEfficiencyScore(): number {
        const directoryEfficiency = Math.min(100, (this.metrics.system.totalFiles / Math.max(1, this.metrics.system.totalDirectories)) / 10);
        const errorEfficiency = Math.max(0, 100 - (this.metrics.errors.errorRate * 1000));
        const performanceEfficiency = Math.max(0, 100 - (this.metrics.performance.scanTime / 10));

        return (directoryEfficiency + errorEfficiency + performanceEfficiency) / 3;
    }

    private getEfficiencyTrend(): string {
        const score = this.getEfficiencyScore();
        return score > 80 ? '📈 Excellent' : score > 60 ? '📊 Good' : '📉 Poor';
    }

    // Error analysis methods
    private getMediumErrors(): number {
        return this.errors.filter(e => e.severity === 'medium').length;
    }

    private getLowErrors(): number {
        return this.errors.filter(e => e.severity === 'low').length;
    }

    private getHighErrorCount(): number {
        return this.errors.filter(e => e.severity === 'high').length;
    }

    private getHighErrorTrend(): string {
        const count = this.getHighErrorCount();
        return count > 5 ? '📈 Rising' : count > 0 ? '📊 Present' : '📉 None';
    }

    private getMediumErrorTrend(): string {
        const count = this.getMediumErrors();
        return count > 10 ? '📈 Rising' : count > 0 ? '📊 Present' : '📉 None';
    }

    private getLowErrorTrend(): string {
        const count = this.getLowErrors();
        return count > 0 ? '📊 Present' : '📉 None';
    }

    private getResolutionRate(severity: string): number {
        const relevantErrors = this.errors.filter(e => e.severity === severity);
        if (relevantErrors.length === 0) return 100;

        const resolvedErrors = relevantErrors.filter(e => e.resolved);
        return (resolvedErrors.length / relevantErrors.length) * 100;
    }

    // Health assessment methods
    private getDirectoryIssues(): number {
        return Array.from(this.directories.values()).filter(dir => dir.health < 70).length;
    }

    private getPerformanceIssues(): number {
        let issues = 0;
        if (this.metrics.performance.scanTime > 500) issues++;
        if (this.metrics.performance.memoryUsage > 100) issues++;
        if (this.metrics.performance.responseTime > 500) issues++;
        return issues;
    }

    private getOverallIssues(): number {
        return this.getDirectoryIssues() + this.metrics.errors.unresolvedErrors + this.getPerformanceIssues();
    }

    private getDirectoryHealthTrend(): string {
        return this.metrics.health.directoryHealth >= 80 ? '📈 Improving' : this.metrics.health.directoryHealth >= 60 ? '📊 Stable' : '📉 Declining';
    }

    private getPerformanceHealthTrend(): string {
        return this.metrics.health.performanceHealth >= 80 ? '📈 Optimal' : this.metrics.health.performanceHealth >= 60 ? '📊 Acceptable' : '📉 Degraded';
    }

    private getOverallHealthTrend(): string {
        return this.metrics.health.overallScore >= 80 ? '📈 Healthy' : this.metrics.health.overallScore >= 60 ? '📊 Functional' : '📉 At Risk';
    }

    // Directory-specific methods
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
            this.logError('SYSTEM', 'medium', 'DIRECTORY_LIST_ERROR', `Cannot list directories: ${error.message}`);
        }

        return directories;
    }

    private calculateDirectoryHealth(fileCount: number, errorCount: number, totalSize: number): number {
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

    private getDirectoryStatusFromHealth(health: number): string {
        if (health >= 90) return '🟢 Excellent';
        if (health >= 70) return '🟡 Good';
        if (health >= 50) return '🟠 Fair';
        return '🔴 Poor';
    }

    private logError(category: string, severity: 'low' | 'medium' | 'high' | 'critical', type: string, message: string): void {
        const error: ErrorEntry = {
            id: 'ERR_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            timestamp: new Date(),
            severity,
            category,
            directory: this.vaultPath,
            message,
            resolved: false,
            occurrences: 1,
            lastOccurrence: new Date()
        };

        this.errors.push(error);

        // Keep only last 100 errors
        if (this.errors.length > 100) {
            this.errors = this.errors.slice(-100);
        }
    }

    private startRealTimeUpdates(): void {
        this.scanInterval = setInterval(async () => {
            await this.performUnifiedScan();
            await this.displayUnifiedDashboard();
        }, 30000); // Update every 30 seconds
    }

    private shutdown(): void {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }
        this.isRunning = false;
        console.log(chalk.yellow('\n👋 Unified Monitoring Dashboard shutting down...'));
        console.log(chalk.green('✅ All monitoring services stopped gracefully'));
        process.exit(0);
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('🎯 Unified Monitoring Dashboard'));
        console.log(chalk.gray('Usage: bun unified-monitoring-dashboard.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        console.log(chalk.gray('  --demo       Run demo mode with sample data'));
        console.log(chalk.gray('  --scan-only  Perform single scan and exit'));
        console.log(chalk.gray('\nFeatures: Directory monitoring, error tracking, performance analysis, health assessment'));
        process.exit(0);
    }

    try {
        const dashboard = new UnifiedMonitoringDashboard();

        if (args.includes('--demo')) {
            // Demo mode - generate sample data and display
            await dashboard.performUnifiedScan();
            await dashboard['displayUnifiedDashboard']();
        } else if (args.includes('--scan-only')) {
            // Scan only mode
            await dashboard.performUnifiedScan();
            console.log(chalk.green('✅ Unified scan completed'));
        } else {
            // Full monitoring mode
            await dashboard.startUnifiedMonitoring();
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

export { UnifiedMonitoringDashboard, type UnifiedMetrics, type DirectoryStatus, type ErrorEntry };

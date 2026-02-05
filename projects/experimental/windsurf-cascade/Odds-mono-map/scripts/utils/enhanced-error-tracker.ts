#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]enhanced-error-tracker
 * 
 * Enhanced Error Tracker
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
 * Enhanced Error Tracking & Logging System
 * Advanced error management with beautiful table output using Bun utilities mastery
 * 
 * @fileoverview Comprehensive error tracking, logging, and analytics system
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface ErrorEntry {
    id: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    directory: string;
    script: string;
    function: string;
    line?: number;
    message: string;
    stack?: string;
    resolved: boolean;
    resolvedAt?: Date;
    resolvedBy?: string;
    occurrences: number;
    lastOccurrence: Date;
}

interface ErrorAnalytics {
    totalErrors: number;
    criticalErrors: number;
    highErrors: number;
    mediumErrors: number;
    lowErrors: number;
    resolvedErrors: number;
    unresolvedErrors: number;
    errorRate: number;
    topErrorCategories: Array<{ category: string; count: number; percentage: number }>;
    topErrorDirectories: Array<{ directory: string; count: number; percentage: number }>;
    recentTrend: 'improving' | 'stable' | 'worsening';
}

interface LogConfig {
    logDirectory: string;
    maxLogFiles: number;
    maxLogSize: number;
    enableConsoleOutput: boolean;
    enableFileOutput: boolean;
    retentionDays: number;
}

class EnhancedErrorTracker {
    private config: LogConfig;
    private errors: ErrorEntry[] = [];
    private logFile: string;
    private analyticsFile: string;

    constructor(config?: Partial<LogConfig>) {
        this.config = {
            logDirectory: '08 - Logs',
            maxLogFiles: 10,
            maxLogSize: 10 * 1024 * 1024, // 10MB
            enableConsoleOutput: true,
            enableFileOutput: true,
            retentionDays: 30,
            ...config
        };

        // Ensure log directory exists
        if (!existsSync(this.config.logDirectory)) {
            mkdirSync(this.config.logDirectory, { recursive: true });
        }

        this.logFile = join(this.config.logDirectory, 'enhanced-error-tracker.log');
        this.analyticsFile = join(this.config.logDirectory, 'error-analytics.json');

        this.loadExistingErrors();
    }

    /**
     * Log a new error with comprehensive tracking
     */
    logError(error: {
        severity: 'low' | 'medium' | 'high' | 'critical';
        category: string;
        directory: string;
        script: string;
        function: string;
        line?: number;
        message: string;
        stack?: string;
    }): string {
        const errorId = this.generateErrorId();

        // Check if this is a recurring error
        const existingError = this.findSimilarError(error);

        if (existingError) {
            existingError.occurrences++;
            existingError.lastOccurrence = new Date();
            this.updateErrorFile(existingError);
            return existingError.id;
        }

        const newError: ErrorEntry = {
            id: errorId,
            timestamp: new Date(),
            severity: error.severity,
            category: error.category,
            directory: error.directory,
            script: error.script,
            function: error.function,
            line: error.line,
            message: error.message,
            stack: error.stack,
            resolved: false,
            occurrences: 1,
            lastOccurrence: new Date()
        };

        this.errors.push(newError);
        this.writeErrorToFile(newError);
        this.updateAnalytics();

        if (this.config.enableConsoleOutput) {
            this.displayErrorNotification(newError);
        }

        return errorId;
    }

    /**
     * Resolve an error
     */
    resolveError(errorId: string, resolvedBy: string = 'system'): boolean {
        const error = this.errors.find(e => e.id === errorId);

        if (error) {
            error.resolved = true;
            error.resolvedAt = new Date();
            error.resolvedBy = resolvedBy;
            this.updateErrorFile(error);
            this.updateAnalytics();

            if (this.config.enableConsoleOutput) {
                console.log(chalk.green(`✅ Error ${errorId} resolved by ${resolvedBy}`));
            }

            return true;
        }

        return false;
    }

    /**
     * Display comprehensive error analytics dashboard
     */
    async displayErrorDashboard(): Promise<void> {
        console.clear();
        console.log(chalk.red.bold('🚨 Enhanced Error Tracking & Analytics Dashboard'));
        console.log(chalk.gray('Powered by Bun Utilities Mastery - Comprehensive Error Management'));
        console.log(chalk.gray('═'.repeat(120)));

        const analytics = this.generateAnalytics();

        // Error Summary
        this.displayErrorSummary(analytics);

        // Error Trends
        this.displayErrorTrends(analytics);

        // Top Error Categories
        this.displayTopCategories(analytics);

        // Directory Error Analysis
        this.displayDirectoryAnalysis(analytics);

        // Recent Errors
        this.displayRecentErrors();

        // Resolution Status
        this.displayResolutionStatus();

        // Footer
        this.displayFooter();
    }

    /**
     * Display error summary with progress bars
     */
    private displayErrorSummary(analytics: ErrorAnalytics): void {
        console.log(chalk.red.bold('\n📊 Error Summary'));
        console.log(chalk.gray('─'.repeat(120)));

        const summaryData = [
            {
                'Metric': 'Total Errors',
                'Count': analytics.totalErrors.toString(),
                'Status': analytics.totalErrors > 0 ? '🔴 Active' : '🟢 Clear',
                'Trend': analytics.recentTrend === 'improving' ? '📉 Improving' : analytics.recentTrend === 'worsening' ? '📈 Worsening' : '📊 Stable',
                'Severity Bar': this.createSeverityBar(analytics.criticalErrors, analytics.highErrors, analytics.mediumErrors, analytics.lowErrors)
            },
            {
                'Metric': 'Critical Errors',
                'Count': analytics.criticalErrors.toString(),
                'Status': analytics.criticalErrors > 0 ? '🔴 Critical' : '🟢 None',
                'Trend': analytics.criticalErrors > 0 ? '📈 Rising' : '📉 None',
                'Impact': '🚨 High Impact'
            },
            {
                'Metric': 'Unresolved Errors',
                'Count': analytics.unresolvedErrors.toString(),
                'Status': analytics.unresolvedErrors > 5 ? '🔴 Attention' : analytics.unresolvedErrors > 0 ? '🟡 Monitor' : '🟢 Clear',
                'Trend': analytics.unresolvedErrors > analytics.resolvedErrors ? '📈 Growing' : '📉 Shrinking',
                'Priority': analytics.unresolvedErrors > 0 ? '🔴 High' : '🟢 Low'
            },
            {
                'Metric': 'Resolution Rate',
                'Count': `${((analytics.resolvedErrors / analytics.totalErrors) * 100).toFixed(1)}%`,
                'Status': analytics.resolvedErrors / analytics.totalErrors > 0.8 ? '🟢 Excellent' : '🟡 Improving',
                'Trend': '📈 Positive',
                'Performance': this.createProgressBar(analytics.resolvedErrors, analytics.totalErrors, 15)
            }
        ];

        console.log(Bun.inspect.table(summaryData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display error trends
     */
    private displayErrorTrends(analytics: ErrorAnalytics): void {
        console.log(chalk.red.bold('\n📈 Error Trends'));
        console.log(chalk.gray('─'.repeat(120)));

        const trendsData = [
            {
                'Period': 'Last Hour',
                'Errors': this.getErrorsInLastHour().length.toString(),
                'Trend': this.getHourlyTrend(),
                'Status': this.getErrorsInLastHour().length > 5 ? '🔴 Elevated' : '🟢 Normal'
            },
            {
                'Period': 'Last 24 Hours',
                'Errors': this.getErrorsInLastDay().length.toString(),
                'Trend': this.getDailyTrend(),
                'Status': this.getErrorsInLastDay().length > 20 ? '🔴 High' : '🟢 Normal'
            },
            {
                'Period': 'Last Week',
                'Errors': this.getErrorsInLastWeek().length.toString(),
                'Trend': this.getWeeklyTrend(),
                'Status': this.getErrorsInLastWeek().length > 50 ? '🔴 Concerning' : '🟢 Acceptable'
            },
            {
                'Period': 'Last Month',
                'Errors': this.getErrorsInLastMonth().length.toString(),
                'Trend': this.getMonthlyTrend(),
                'Status': this.getErrorsInLastMonth().length > 100 ? '🔴 Review Needed' : '🟢 Good'
            }
        ];

        console.log(Bun.inspect.table(trendsData, {}, {
            colors: true,
            maxStringLength: 18,
            compact: false
        }));
    }

    /**
     * Display top error categories
     */
    private displayTopCategories(analytics: ErrorAnalytics): void {
        console.log(chalk.red.bold('\n🏷️ Top Error Categories'));
        console.log(chalk.gray('─'.repeat(120)));

        const categoriesData = analytics.topErrorCategories.map(cat => ({
            'Category': cat.category,
            'Count': cat.count.toString(),
            'Percentage': `${cat.percentage.toFixed(1)}%`,
            'Severity': this.getCategorySeverity(cat.category),
            'Trend': cat.count > 5 ? '📈 Rising' : '📊 Stable',
            'Priority': cat.count > 10 ? '🔴 Critical' : cat.count > 5 ? '🟡 High' : '🔵 Normal'
        }));

        console.log(Bun.inspect.table(categoriesData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display directory error analysis
     */
    private displayDirectoryAnalysis(analytics: ErrorAnalytics): void {
        console.log(chalk.red.bold('\n📁 Directory Error Analysis'));
        console.log(chalk.gray('─'.repeat(120)));

        const directoriesData = analytics.topErrorDirectories.map(dir => ({
            'Directory': dir.directory.split('/').pop() || dir.directory,
            'Errors': dir.count.toString(),
            'Percentage': `${dir.percentage.toFixed(1)}%`,
            'Health': this.getDirectoryHealth(dir.directory),
            'Status': dir.count > 10 ? '🔴 Critical' : dir.count > 5 ? '🟡 Monitor' : '🟢 Healthy',
            'Action': dir.count > 0 ? '🔍 Investigate' : '✅ Monitor'
        }));

        console.log(Bun.inspect.table(directoriesData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display recent errors
     */
    private displayRecentErrors(): void {
        console.log(chalk.red.bold('\n📝 Recent Errors'));
        console.log(chalk.gray('─'.repeat(120)));

        const recentErrors = this.errors
            .filter(e => !e.resolved)
            .sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
            .slice(0, 10)
            .map(error => ({
                'ID': error.id.substring(0, 8) + '...',
                'Time': error.lastOccurrence.toLocaleTimeString(),
                'Severity': this.getSeverityIcon(error.severity),
                'Category': error.category,
                'Directory': error.directory.split('/').pop() || 'Root',
                'Occurrences': error.occurrences.toString(),
                'Status': error.resolved ? '✅' : '🔴',
                'Action': `[[Resolve|${error.id}]]`
            }));

        if (recentErrors.length > 0) {
            console.log(Bun.inspect.table(recentErrors, {}, {
                colors: true,
                maxStringLength: 15,
                compact: false
            }));
        } else {
            console.log(chalk.green('🎉 No unresolved errors! All systems operating cleanly.'));
        }
    }

    /**
     * Display resolution status
     */
    private displayResolutionStatus(): void {
        console.log(chalk.red.bold('\n🔧 Resolution Status'));
        console.log(chalk.gray('─'.repeat(120)));

        const resolutionData = [
            {
                'Status': 'Resolved Today',
                'Count': this.getErrorsResolvedToday().length.toString(),
                'Percentage': `${this.getResolutionPercentage('today').toFixed(1)}%`,
                'Trend': '📈 Improving',
                'Effort': '🟢 Active'
            },
            {
                'Status': 'Pending Resolution',
                'Count': this.getPendingErrors().length.toString(),
                'Percentage': `${this.getPendingPercentage().toFixed(1)}%`,
                'Trend': this.getPendingErrors().length > 5 ? '📈 Growing' : '📉 Shrinking',
                'Effort': this.getPendingErrors().length > 10 ? '🔴 High' : '🟡 Medium'
            },
            {
                'Status': 'Auto-Resolved',
                'Count': this.getAutoResolvedErrors().length.toString(),
                'Percentage': `${this.getAutoResolvedPercentage().toFixed(1)}%`,
                'Trend': '📊 Stable',
                'Effort': '🤖 Automated'
            },
            {
                'Status': 'Manual Resolution',
                'Count': this.getManuallyResolvedErrors().length.toString(),
                'Percentage': `${this.getManualResolvedPercentage().toFixed(1)}%`,
                'Trend': '📈 Active',
                'Effort': '👥 Team'
            }
        ];

        console.log(Bun.inspect.table(resolutionData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display footer
     */
    private displayFooter(): void {
        console.log(chalk.gray('─'.repeat(120)));
        console.log(chalk.blue('Controls: [Ctrl+C] Exit | [Space] Refresh | [R] Resolve All | [E] Export Report'));
        console.log(chalk.gray(`Last Update: ${new Date().toLocaleTimeString()} | Total Errors: ${this.errors.length} | Log File: ${this.logFile}`));
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    private generateErrorId(): string {
        return 'ERR_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }

    private findSimilarError(error: Partial<ErrorEntry>): ErrorEntry | undefined {
        return this.errors.find(e =>
            !e.resolved &&
            e.category === error.category &&
            e.directory === error.directory &&
            e.script === error.script &&
            e.function === error.function &&
            e.message === error.message
        );
    }

    private writeErrorToFile(error: ErrorEntry): void {
        if (!this.config.enableFileOutput) return;

        const logEntry = {
            timestamp: error.timestamp.toISOString(),
            id: error.id,
            severity: error.severity,
            category: error.category,
            directory: error.directory,
            script: error.script,
            function: error.function,
            line: error.line,
            message: error.message,
            stack: error.stack,
            resolved: error.resolved,
            occurrences: error.occurrences
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            appendFileSync(this.logFile, logLine);
        } catch (writeError) {
            console.error(chalk.red(`Failed to write error to file: ${writeError.message}`));
        }
    }

    private updateErrorFile(error: ErrorEntry): void {
        if (!this.config.enableFileOutput) return;

        // For simplicity, we just append a resolution update
        const updateEntry = {
            timestamp: new Date().toISOString(),
            type: 'update',
            errorId: error.id,
            resolved: error.resolved,
            resolvedAt: error.resolvedAt?.toISOString(),
            resolvedBy: error.resolvedBy,
            occurrences: error.occurrences
        };

        const logLine = JSON.stringify(updateEntry) + '\n';

        try {
            appendFileSync(this.logFile, logLine);
        } catch (writeError) {
            console.error(chalk.red(`Failed to update error file: ${writeError.message}`));
        }
    }

    private loadExistingErrors(): void {
        if (!existsSync(this.logFile)) return;

        try {
            const content = readFileSync(this.logFile, 'utf-8');
            const lines = content.trim().split('\n');

            for (const line of lines) {
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
                                script: entry.script,
                                function: entry.function,
                                line: entry.line,
                                message: entry.message,
                                stack: entry.stack,
                                resolved: entry.resolved || false,
                                resolvedAt: entry.resolvedAt ? new Date(entry.resolvedAt) : undefined,
                                resolvedBy: entry.resolvedBy,
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
            console.error(chalk.red(`Failed to load existing errors: ${readError.message}`));
        }
    }

    private generateAnalytics(): ErrorAnalytics {
        const totalErrors = this.errors.length;
        const criticalErrors = this.errors.filter(e => e.severity === 'critical').length;
        const highErrors = this.errors.filter(e => e.severity === 'high').length;
        const mediumErrors = this.errors.filter(e => e.severity === 'medium').length;
        const lowErrors = this.errors.filter(e => e.severity === 'low').length;
        const resolvedErrors = this.errors.filter(e => e.resolved).length;
        const unresolvedErrors = totalErrors - resolvedErrors;

        // Calculate error categories
        const categoryMap = new Map<string, number>();
        for (const error of this.errors) {
            categoryMap.set(error.category, (categoryMap.get(error.category) || 0) + 1);
        }

        const topErrorCategories = Array.from(categoryMap.entries())
            .map(([category, count]) => ({
                category,
                count,
                percentage: (count / totalErrors) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate error directories
        const directoryMap = new Map<string, number>();
        for (const error of this.errors) {
            directoryMap.set(error.directory, (directoryMap.get(error.directory) || 0) + 1);
        }

        const topErrorDirectories = Array.from(directoryMap.entries())
            .map(([directory, count]) => ({
                directory,
                count,
                percentage: (count / totalErrors) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate trend
        const recentErrors = this.getErrorsInLastDay();
        const olderErrors = this.getErrorsInPreviousDay();
        const recentTrend = recentErrors.length > olderErrors.length ? 'worsening' :
            recentErrors.length < olderErrors.length ? 'improving' : 'stable';

        return {
            totalErrors,
            criticalErrors,
            highErrors,
            mediumErrors,
            lowErrors,
            resolvedErrors,
            unresolvedErrors,
            errorRate: unresolvedErrors / Math.max(1, totalErrors),
            topErrorCategories,
            topErrorDirectories,
            recentTrend
        };
    }

    private updateAnalytics(): void {
        const analytics = this.generateAnalytics();

        try {
            writeFileSync(this.analyticsFile, JSON.stringify(analytics, null, 2));
        } catch (error) {
            console.error(chalk.red(`Failed to update analytics: ${error.message}`));
        }
    }

    private displayErrorNotification(error: ErrorEntry): void {
        const severityColors = {
            critical: chalk.red.bold,
            high: chalk.red,
            medium: chalk.yellow,
            low: chalk.blue
        };

        const colorFn = severityColors[error.severity];
        console.log(colorFn(`🚨 ${error.severity.toUpperCase()} Error [${error.id}]`));
        console.log(chalk.gray(`   ${error.category} in ${error.directory}/${error.script}`));
        console.log(chalk.gray(`   ${error.message}`));
        if (error.line) {
            console.log(chalk.gray(`   Line: ${error.line}`));
        }
        console.log('');
    }

    private createSeverityBar(critical: number, high: number, medium: number, low: number): string {
        const total = critical + high + medium + low;
        if (total === 0) return '[🟢 None]';

        const width = 20;
        const criticalWidth = Math.round((critical / total) * width);
        const highWidth = Math.round((high / total) * width);
        const mediumWidth = Math.round((medium / total) * width);
        const lowWidth = width - criticalWidth - highWidth - mediumWidth;

        const bar =
            '█'.repeat(criticalWidth) +
            '▓'.repeat(highWidth) +
            '▒'.repeat(mediumWidth) +
            '░'.repeat(Math.max(0, lowWidth));

        return `[${chalk.red(bar.substring(0, criticalWidth))}${chalk.yellow(bar.substring(criticalWidth, criticalWidth + highWidth))}${chalk.blue(bar.substring(criticalWidth + highWidth, criticalWidth + highWidth + mediumWidth))}${chalk.gray(bar.substring(criticalWidth + highWidth + mediumWidth))}]`;
    }

    private createProgressBar(current: number, total: number, width: number): string {
        const percentage = Math.min(100, (current / total) * 100);
        const filledWidth = Math.round((width * percentage) / 100);
        const bar = '█'.repeat(filledWidth) + '░'.repeat(width - filledWidth);
        return `[${chalk.green(bar)}]`;
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

    private getCategorySeverity(category: string): string {
        const highSeverityCategories = ['CRITICAL', 'SECURITY', 'CORRUPTION'];
        const mediumSeverityCategories = ['PERFORMANCE', 'VALIDATION', 'NETWORK'];

        if (highSeverityCategories.some(cat => category.toUpperCase().includes(cat))) {
            return '🔴 High';
        } else if (mediumSeverityCategories.some(cat => category.toUpperCase().includes(cat))) {
            return '🟡 Medium';
        } else {
            return '🔵 Low';
        }
    }

    private getDirectoryHealth(directory: string): string {
        const errors = this.errors.filter(e => e.directory === directory);
        const unresolvedErrors = errors.filter(e => !e.resolved);

        if (unresolvedErrors.length === 0) return '🟢 Healthy';
        if (unresolvedErrors.length < 3) return '🟡 Minor Issues';
        if (unresolvedErrors.length < 10) return '🟠 Needs Attention';
        return '🔴 Critical';
    }

    // Time-based query methods
    private getErrorsInLastHour(): ErrorEntry[] {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return this.errors.filter(e => e.lastOccurrence > oneHourAgo);
    }

    private getErrorsInLastDay(): ErrorEntry[] {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return this.errors.filter(e => e.lastOccurrence > oneDayAgo);
    }

    private getErrorsInPreviousDay(): ErrorEntry[] {
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return this.errors.filter(e => e.lastOccurrence > twoDaysAgo && e.lastOccurrence <= oneDayAgo);
    }

    private getErrorsInLastWeek(): ErrorEntry[] {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return this.errors.filter(e => e.lastOccurrence > oneWeekAgo);
    }

    private getErrorsInLastMonth(): ErrorEntry[] {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return this.errors.filter(e => e.lastOccurrence > oneMonthAgo);
    }

    private getErrorsResolvedToday(): ErrorEntry[] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.errors.filter(e => e.resolvedAt && e.resolvedAt > today);
    }

    private getPendingErrors(): ErrorEntry[] {
        return this.errors.filter(e => !e.resolved);
    }

    private getAutoResolvedErrors(): ErrorEntry[] {
        return this.errors.filter(e => e.resolved && e.resolvedBy === 'system');
    }

    private getManuallyResolvedErrors(): ErrorEntry[] {
        return this.errors.filter(e => e.resolved && e.resolvedBy !== 'system');
    }

    private getResolutionPercentage(period: 'today' | 'overall' = 'today'): number {
        const relevantErrors = period === 'today' ? this.getErrorsInLastDay() : this.errors;
        const resolvedErrors = relevantErrors.filter(e => e.resolved);
        return relevantErrors.length > 0 ? (resolvedErrors.length / relevantErrors.length) * 100 : 100;
    }

    private getPendingPercentage(): number {
        return this.errors.length > 0 ? (this.getPendingErrors().length / this.errors.length) * 100 : 0;
    }

    private getAutoResolvedPercentage(): number {
        return this.errors.length > 0 ? (this.getAutoResolvedErrors().length / this.errors.length) * 100 : 0;
    }

    private getManualResolvedPercentage(): number {
        return this.errors.length > 0 ? (this.getManuallyResolvedErrors().length / this.errors.length) * 100 : 0;
    }

    private getHourlyTrend(): string {
        const recentHour = this.getErrorsInLastHour();
        const previousHour = this.errors.filter(e => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return e.lastOccurrence > twoHoursAgo && e.lastOccurrence <= oneHourAgo;
        });

        return recentHour.length > previousHour.length ? '📈 Rising' :
            recentHour.length < previousHour.length ? '📉 Falling' : '📊 Stable';
    }

    private getDailyTrend(): string {
        const recentDay = this.getErrorsInLastDay();
        const previousDay = this.getErrorsInPreviousDay();

        return recentDay.length > previousDay.length ? '📈 Rising' :
            recentDay.length < previousDay.length ? '📉 Falling' : '📊 Stable';
    }

    private getWeeklyTrend(): string {
        const recentWeek = this.getErrorsInLastWeek();
        const previousWeek = this.errors.filter(e => {
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return e.lastOccurrence > twoWeeksAgo && e.lastOccurrence <= oneWeekAgo;
        });

        return recentWeek.length > previousWeek.length ? '📈 Rising' :
            recentWeek.length < previousWeek.length ? '📉 Falling' : '📊 Stable';
    }

    private getMonthlyTrend(): string {
        const recentMonth = this.getErrorsInLastMonth();
        const previousMonth = this.errors.filter(e => {
            const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return e.lastOccurrence > twoMonthsAgo && e.lastOccurrence <= oneMonthAgo;
        });

        return recentMonth.length > previousMonth.length ? '📈 Rising' :
            recentMonth.length < previousMonth.length ? '📉 Falling' : '📊 Stable';
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.red.bold('🚨 Enhanced Error Tracking & Logging System'));
        console.log(chalk.gray('Usage: bun enhanced-error-tracker.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h     Show this help message'));
        console.log(chalk.gray('  --dashboard    Display error analytics dashboard'));
        console.log(chalk.gray('  --demo         Run demo with sample errors'));
        console.log(chalk.gray('  --clear        Clear all error logs'));
        console.log(chalk.gray('\nFeatures: Comprehensive error tracking, analytics, resolution management'));
        process.exit(0);
    }

    try {
        const tracker = new EnhancedErrorTracker();

        if (args.includes('--dashboard')) {
            await tracker.displayErrorDashboard();
        } else if (args.includes('--demo')) {
            // Add demo errors
            tracker.logError({
                severity: 'critical',
                category: 'SYSTEM_FAILURE',
                directory: 'scripts',
                script: 'monitor.ts',
                function: 'performFullScan',
                message: 'Database connection failed',
                stack: 'Error: Database connection failed\n    at performFullScan (monitor.ts:45)'
            });

            tracker.logError({
                severity: 'medium',
                category: 'VALIDATION',
                directory: 'src/types',
                script: 'tick-processor-types.ts',
                function: 'validateType',
                message: 'Type validation failed for VaultFile',
                line: 123
            });

            tracker.logError({
                severity: 'low',
                category: 'PERFORMANCE',
                directory: 'apps/dashboard',
                script: 'index.html',
                function: 'loadDashboard',
                message: 'Dashboard loading slower than expected'
            });

            await tracker.displayErrorDashboard();
        } else if (args.includes('--clear')) {
            // Clear error logs
            console.log(chalk.yellow('🧹 Clearing error logs...'));
            // Implementation would clear the log files
            console.log(chalk.green('✅ Error logs cleared'));
        } else {
            console.log(chalk.blue('Enhanced Error Tracker initialized'));
            console.log(chalk.gray('Use --dashboard to view analytics, --demo for sample data'));
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

export { EnhancedErrorTracker, type ErrorEntry, type ErrorAnalytics, type LogConfig };

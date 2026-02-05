#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]canvas-monitor
 * 
 * Canvas Monitor
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils,canvas,integration,visualization
 */

#!/usr/bin/env bun

/**
 * Canvas Visual Monitoring System
 * Specialized monitoring for Obsidian .canvas visual files with beautiful analytics
 * 
 * @fileoverview Canvas file monitoring with visual analytics and health tracking
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { statSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface CanvasFile {
    path: string;
    name: string;
    directory: string;
    size: number;
    lastModified: Date;
    nodeCount: number;
    connectionCount: number;
    complexity: number;
    health: number;
    status: string;
    type: string;
}

interface CanvasMetrics {
    totalCanvases: number;
    totalNodes: number;
    totalConnections: number;
    averageComplexity: number;
    totalSize: number;
    lastUpdated: Date;
    healthScore: number;
}

interface CanvasAnalytics {
    byDirectory: Array<{
        directory: string;
        canvasCount: number;
        totalNodes: number;
        totalSize: number;
        averageHealth: number;
        status: string;
    }>;
    byComplexity: Array<{
        complexity: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
        count: number;
        percentage: number;
        averageNodes: number;
    }>;
    bySize: Array<{
        sizeCategory: 'Small' | 'Medium' | 'Large' | 'Very Large';
        count: number;
        totalSize: number;
        averageSize: number;
    }>;
}

class CanvasMonitorSystem {
    private vaultPath: string;
    private canvasFiles: CanvasFile[] = [];
    private metrics: CanvasMetrics;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
        this.metrics = {
            totalCanvases: 0,
            totalNodes: 0,
            totalConnections: 0,
            averageComplexity: 0,
            totalSize: 0,
            lastUpdated: new Date(),
            healthScore: 0
        };
    }

    /**
     * Start canvas monitoring system
     */
    async startCanvasMonitoring(): Promise<void> {
        console.clear();
        console.log(chalk.magenta.bold('🎨 Canvas Visual Monitoring System'));
        console.log(chalk.gray('Powered by Bun Utilities Mastery - Visual Canvas Analytics & Health Tracking'));
        console.log(chalk.gray('═'.repeat(120)));

        // Scan for canvas files
        await this.scanCanvasFiles();

        // Display canvas dashboard
        await this.displayCanvasDashboard();
    }

    /**
     * Scan all canvas files in the vault
     */
    private async scanCanvasFiles(): Promise<void> {
        try {
            const canvasPaths = this.findCanvasFiles();

            for (const canvasPath of canvasPaths) {
                await this.analyzeCanvasFile(canvasPath);
            }

            this.updateMetrics();

        } catch (error) {
            console.error(chalk.red(`❌ Canvas scan failed: ${error.message}`));
        }
    }

    /**
     * Analyze individual canvas file
     */
    private async analyzeCanvasFile(canvasPath: string): Promise<void> {
        try {
            const stats = statSync(canvasPath);
            const content = readFileSync(canvasPath, 'utf-8');
            const canvasData = JSON.parse(content);

            const directory = canvasPath.split('/').slice(0, -1).join('/');
            const name = canvasPath.split('/').pop() || '';

            // Extract canvas metrics
            const nodeCount = this.extractNodeCount(canvasData);
            const connectionCount = this.extractConnectionCount(canvasData);
            const complexity = this.calculateComplexity(nodeCount, connectionCount, stats.size);
            const health = this.calculateCanvasHealth(nodeCount, connectionCount, stats.size);
            const status = this.getCanvasStatus(health);
            const type = this.determineCanvasType(canvasData);

            const canvasFile: CanvasFile = {
                path: canvasPath,
                name,
                directory,
                size: stats.size,
                lastModified: stats.mtime,
                nodeCount,
                connectionCount,
                complexity,
                health,
                status,
                type
            };

            this.canvasFiles.push(canvasFile);

        } catch (error) {
            console.error(chalk.yellow(`⚠️ Cannot analyze canvas ${canvasPath}: ${error.message}`));

            // Add basic info even if analysis fails
            const stats = statSync(canvasPath);
            const directory = canvasPath.split('/').slice(0, -1).join('/');
            const name = canvasPath.split('/').pop() || '';

            this.canvasFiles.push({
                path: canvasPath,
                name,
                directory,
                size: stats.size,
                lastModified: stats.mtime,
                nodeCount: 0,
                connectionCount: 0,
                complexity: 0,
                health: 50,
                status: '🟡 Unknown',
                type: 'Unknown'
            });
        }
    }

    /**
     * Display comprehensive canvas dashboard
     */
    private async displayCanvasDashboard(): Promise<void> {
        // Header
        this.displayHeader();

        // Canvas Overview
        this.displayCanvasOverview();

        // Visual Analytics
        this.displayVisualAnalytics();

        // Directory Breakdown
        this.displayDirectoryBreakdown();

        // Complexity Analysis
        this.displayComplexityAnalysis();

        // Size Distribution
        this.displaySizeDistribution();

        // Canvas Details
        this.displayCanvasDetails();

        // Health Assessment
        this.displayHealthAssessment();

        // Footer
        this.displayFooter();
    }

    /**
     * Display canvas overview with key metrics
     */
    private displayCanvasOverview(): void {
        console.log(chalk.cyan.bold('\n📊 Canvas Overview'));
        console.log(chalk.gray('─'.repeat(120)));

        const overviewData = [
            {
                'Metric': 'Total Canvases',
                'Value': this.metrics.totalCanvases.toString(),
                'Status': this.metrics.totalCanvases > 0 ? '🟢 Active' : '🔴 None',
                'Health': `${this.metrics.healthScore.toFixed(1)}%`,
                'Trend': this.getCanvasTrend(),
                'Priority': this.metrics.totalCanvases > 0 ? '🟢 Monitor' : '🔡 Create'
            },
            {
                'Metric': 'Total Nodes',
                'Value': this.metrics.totalNodes.toString(),
                'Status': this.metrics.totalNodes > 0 ? '🟢 Rich' : '🔡 Empty',
                'Health': this.metrics.totalNodes > 10 ? '🟢 Complex' : this.metrics.totalNodes > 0 ? '🟡 Simple' : '🔡 Minimal',
                'Trend': this.getNodeTrend(),
                'Priority': this.metrics.totalNodes > 0 ? '🟢 Maintain' : '🔡 Develop'
            },
            {
                'Metric': 'Total Connections',
                'Value': this.metrics.totalConnections.toString(),
                'Status': this.metrics.totalConnections > 0 ? '🟢 Connected' : '🔡 Isolated',
                'Health': this.metrics.totalConnections > 5 ? '🟢 Networked' : this.metrics.totalConnections > 0 ? '🟡 Linked' : '🔡 Standalone',
                'Trend': this.getConnectionTrend(),
                'Priority': this.metrics.totalConnections > 0 ? '🟢 Optimize' : '🔡 Connect'
            },
            {
                'Metric': 'Average Complexity',
                'Value': this.metrics.averageComplexity.toFixed(1),
                'Status': this.getComplexityStatus(this.metrics.averageComplexity),
                'Health': this.getComplexityHealth(this.metrics.averageComplexity),
                'Trend': this.getComplexityTrend(),
                'Priority': this.getComplexityPriority(this.metrics.averageComplexity)
            }
        ];

        console.log(Bun.inspect.table(overviewData, {}, {
            colors: true,
            maxStringLength: 18,
            compact: false
        }));
    }

    /**
     * Display visual analytics
     */
    private displayVisualAnalytics(): void {
        console.log(chalk.magenta.bold('\n🎨 Visual Analytics'));
        console.log(chalk.gray('─'.repeat(120)));

        const analyticsData = [
            {
                'Category': 'Visual Density',
                'Metric': 'Nodes per Canvas',
                'Value': (this.metrics.totalNodes / Math.max(1, this.metrics.totalCanvases)).toFixed(1),
                'Benchmark': '>5 nodes',
                'Status': this.metrics.totalNodes / Math.max(1, this.metrics.totalCanvases) > 5 ? '🟢 Rich' : '🟡 Sparse',
                'Score': `${Math.min(100, (this.metrics.totalNodes / Math.max(1, this.metrics.totalCanvases)) * 20).toFixed(1)}%`,
                'Visual': this.createProgressBar(this.metrics.totalNodes, Math.max(1, this.metrics.totalCanvases) * 10, 15)
            },
            {
                'Category': 'Connectivity',
                'Metric': 'Connections per Canvas',
                'Value': (this.metrics.totalConnections / Math.max(1, this.metrics.totalCanvases)).toFixed(1),
                'Benchmark': '>3 connections',
                'Status': this.metrics.totalConnections / Math.max(1, this.metrics.totalCanvases) > 3 ? '🟢 Connected' : '🟡 Isolated',
                'Score': `${Math.min(100, (this.metrics.totalConnections / Math.max(1, this.metrics.totalCanvases)) * 30).toFixed(1)}%`,
                'Visual': this.createProgressBar(this.metrics.totalConnections, Math.max(1, this.metrics.totalCanvases) * 5, 15)
            },
            {
                'Category': 'File Efficiency',
                'Metric': 'Size per Node',
                'Value': this.metrics.totalNodes > 0 ? (this.metrics.totalSize / this.metrics.totalNodes / 1024).toFixed(1) + ' KB' : 'N/A',
                'Benchmark': '<10 KB per node',
                'Status': this.metrics.totalNodes > 0 && this.metrics.totalSize / this.metrics.totalNodes < 10 * 1024 ? '🟢 Efficient' : '🟡 Bloated',
                'Score': this.metrics.totalNodes > 0 ? `${Math.max(0, 100 - (this.metrics.totalSize / this.metrics.totalNodes / 1024)).toFixed(1)}%` : '100%',
                'Visual': this.metrics.totalNodes > 0 ? this.createProgressBar(Math.min(100, 100 - (this.metrics.totalSize / this.metrics.totalNodes / 1024)), 100, 15) : '[███████████████]'
            },
            {
                'Category': 'Visual Health',
                'Metric': 'Overall Health Score',
                'Value': `${this.metrics.healthScore.toFixed(1)}%`,
                'Benchmark': '>80% health',
                'Status': this.metrics.healthScore > 80 ? '🟢 Excellent' : this.metrics.healthScore > 60 ? '🟡 Good' : '🔴 Poor',
                'Score': `${this.metrics.healthScore.toFixed(1)}%`,
                'Visual': this.createHealthBar(this.metrics.healthScore)
            }
        ];

        console.log(Bun.inspect.table(analyticsData, {}, {
            colors: true,
            maxStringLength: 20,
            compact: false
        }));
    }

    /**
     * Display directory breakdown
     */
    private displayDirectoryBreakdown(): void {
        console.log(chalk.blue.bold('\n📁 Directory Breakdown'));
        console.log(chalk.gray('─'.repeat(120)));

        const directoryMap = new Map<string, CanvasFile[]>();

        for (const canvas of this.canvasFiles) {
            const dir = canvas.directory.split('/').pop() || canvas.directory;
            if (!directoryMap.has(dir)) {
                directoryMap.set(dir, []);
            }
            directoryMap.get(dir)!.push(canvas);
        }

        const directoryData = Array.from(directoryMap.entries()).map(([dir, canvases]) => ({
            'Directory': dir,
            'Canvases': canvases.length.toString(),
            'Total Nodes': canvases.reduce((sum, c) => sum + c.nodeCount, 0).toString(),
            'Total Size': this.formatBytes(canvases.reduce((sum, c) => sum + c.size, 0)),
            'Avg Health': `${(canvases.reduce((sum, c) => sum + c.health, 0) / canvases.length).toFixed(1)}%`,
            'Status': this.getDirectoryStatus(canvases),
            'Complexity': `${(canvases.reduce((sum, c) => sum + c.complexity, 0) / canvases.length).toFixed(1)}`,
            'Priority': this.getDirectoryPriority(canvases)
        }));

        console.log(Bun.inspect.table(directoryData, {}, {
            colors: true,
            maxStringLength: 18,
            compact: false
        }));
    }

    /**
     * Display complexity analysis
     */
    private displayComplexityAnalysis(): void {
        console.log(chalk.yellow.bold('\n🧩 Complexity Analysis'));
        console.log(chalk.gray('─'.repeat(120)));

        const complexityCategories = {
            'Simple': { min: 0, max: 10 },
            'Moderate': { min: 10, max: 25 },
            'Complex': { min: 25, max: 50 },
            'Very Complex': { min: 50, max: Infinity }
        };

        const complexityData = Object.entries(complexityCategories).map(([category, range]) => {
            const canvases = this.canvasFiles.filter(c => c.complexity >= range.min && c.complexity < range.max);
            const count = canvases.length;
            const percentage = this.canvasFiles.length > 0 ? (count / this.canvasFiles.length) * 100 : 0;
            const avgNodes = count > 0 ? canvases.reduce((sum, c) => sum + c.nodeCount, 0) / count : 0;

            return {
                'Complexity': category,
                'Count': count.toString(),
                'Percentage': `${percentage.toFixed(1)}%`,
                'Avg Nodes': avgNodes.toFixed(1),
                'Status': this.getComplexityCategoryStatus(category),
                'Trend': count > 0 ? '📊 Active' : '📉 None',
                'Visual': this.createProgressBar(count, Math.max(1, this.canvasFiles.length), 10),
                'Priority': this.getComplexityCategoryPriority(category)
            };
        });

        console.log(Bun.inspect.table(complexityData, {}, {
            colors: true,
            maxStringLength: 16,
            compact: false
        }));
    }

    /**
     * Display size distribution
     */
    private displaySizeDistribution(): void {
        console.log(chalk.green.bold('\n📦 Size Distribution'));
        console.log(chalk.gray('─'.repeat(120)));

        const sizeCategories = {
            'Small': { max: 10 * 1024 }, // < 10KB
            'Medium': { max: 50 * 1024 }, // < 50KB
            'Large': { max: 200 * 1024 }, // < 200KB
            'Very Large': { max: Infinity }
        };

        const sizeData = Object.entries(sizeCategories).map(([category, range], index) => {
            const minSize = index === 0 ? 0 : Object.values(sizeCategories)[index - 1].max;
            const canvases = this.canvasFiles.filter(c => c.size >= minSize && c.size < range.max);
            const count = canvases.length;
            const totalSize = canvases.reduce((sum, c) => sum + c.size, 0);
            const avgSize = count > 0 ? totalSize / count : 0;

            return {
                'Size Category': category,
                'Count': count.toString(),
                'Total Size': this.formatBytes(totalSize),
                'Average Size': this.formatBytes(avgSize),
                'Status': this.getSizeCategoryStatus(category),
                'Efficiency': this.getSizeEfficiency(canvases),
                'Visual': this.createProgressBar(count, Math.max(1, this.canvasFiles.length), 10),
                'Priority': this.getSizeCategoryPriority(category)
            };
        });

        console.log(Bun.inspect.table(sizeData, {}, {
            colors: true,
            maxStringLength: 16,
            compact: false
        }));
    }

    /**
     * Display detailed canvas information
     */
    private displayCanvasDetails(): void {
        console.log(chalk.cyan.bold('\n🎨 Canvas Details'));
        console.log(chalk.gray('─'.repeat(120)));

        const canvasData = this.canvasFiles.map(canvas => ({
            'Name': canvas.name,
            'Directory': canvas.directory.split('/').pop() || 'Root',
            'Nodes': canvas.nodeCount.toString(),
            'Connections': canvas.connectionCount.toString(),
            'Size': this.formatBytes(canvas.size),
            'Complexity': canvas.complexity.toFixed(1),
            'Health': `${canvas.health.toFixed(1)}%`,
            'Status': canvas.status,
            'Type': canvas.type,
            'Modified': `${canvas.lastModified.toLocaleDateString()} ${canvas.lastModified.toLocaleTimeString()}`,
            'Priority': this.getCanvasPriority(canvas)
        }));

        console.log(Bun.inspect.table(canvasData, {}, {
            colors: true,
            maxStringLength: 15,
            compact: false
        }));
    }

    /**
     * Display health assessment
     */
    private displayHealthAssessment(): void {
        console.log(chalk.red.bold('\n🏥 Canvas Health Assessment'));
        console.log(chalk.gray('─'.repeat(120)));

        const healthData = [
            {
                'Component': 'Canvas Coverage',
                'Score': `${this.metrics.healthScore.toFixed(1)}%`,
                'Issues': this.getHealthIssues(),
                'Status': this.metrics.healthScore > 80 ? '🟢 Excellent' : this.metrics.healthScore > 60 ? '🟡 Good' : '🔴 Poor',
                'Trend': this.getHealthTrend(),
                'Visual': this.createHealthBar(this.metrics.healthScore),
                'Recommendation': this.getHealthRecommendation()
            },
            {
                'Component': 'Node Density',
                'Score': `${this.getNodeDensityScore().toFixed(1)}%`,
                'Issues': this.getNodeDensityIssues(),
                'Status': this.getNodeDensityStatus(),
                'Trend': this.getNodeDensityTrend(),
                'Visual': this.createHealthBar(this.getNodeDensityScore()),
                'Recommendation': this.getNodeDensityRecommendation()
            },
            {
                'Component': 'Connectivity',
                'Score': `${this.getConnectivityScore().toFixed(1)}%`,
                'Issues': this.getConnectivityIssues(),
                'Status': this.getConnectivityStatus(),
                'Trend': this.getConnectivityTrend(),
                'Visual': this.createHealthBar(this.getConnectivityScore()),
                'Recommendation': this.getConnectivityRecommendation()
            },
            {
                'Component': 'File Efficiency',
                'Score': `${this.getEfficiencyScore().toFixed(1)}%`,
                'Issues': this.getEfficiencyIssues(),
                'Status': this.getEfficiencyStatus(),
                'Trend': this.getEfficiencyTrend(),
                'Visual': this.createHealthBar(this.getEfficiencyScore()),
                'Recommendation': this.getEfficiencyRecommendation()
            }
        ];

        console.log(Bun.inspect.table(healthData, {}, {
            colors: true,
            maxStringLength: 18,
            compact: false
        }));
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    private findCanvasFiles(): string[] {
        const canvasFiles: string[] = [];
        const seenFiles = new Set<string>();

        try {
            const items = readdirSync(this.vaultPath, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory() && !item.name.startsWith('.')) {
                    const dirPath = join(this.vaultPath, item.name);
                    this.scanDirectoryForCanvases(dirPath, canvasFiles, seenFiles);
                }
            }

            // Also check root level
            this.scanDirectoryForCanvases(this.vaultPath, canvasFiles, seenFiles);

        } catch (error) {
            console.error(chalk.red(`❌ Cannot find canvas files: ${error.message}`));
        }

        return canvasFiles;
    }

    private scanDirectoryForCanvases(dirPath: string, canvasFiles: string[], seenFiles: Set<string>): void {
        try {
            const items = readdirSync(dirPath, { withFileTypes: true });

            for (const item of items) {
                if (item.isFile() && item.name.endsWith('.canvas')) {
                    const fullPath = join(dirPath, item.name);
                    const resolvedPath = fullPath.replace(/\/\//g, '/'); // Normalize path

                    // Only add if we haven't seen this file before
                    if (!seenFiles.has(resolvedPath)) {
                        seenFiles.add(resolvedPath);
                        canvasFiles.push(resolvedPath);
                    }
                } else if (item.isDirectory() && !item.name.startsWith('.')) {
                    this.scanDirectoryForCanvases(join(dirPath, item.name), canvasFiles, seenFiles);
                }
            }
        } catch (error) {
            // Skip directories we can't read
        }
    }

    private extractNodeCount(canvasData: any): number {
        try {
            if (canvasData.nodes && Array.isArray(canvasData.nodes)) {
                return canvasData.nodes.length;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    private extractConnectionCount(canvasData: any): number {
        try {
            if (canvasData.edges && Array.isArray(canvasData.edges)) {
                return canvasData.edges.length;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    private calculateComplexity(nodeCount: number, connectionCount: number, size: number): number {
        // Complexity based on nodes, connections, and file size
        const nodeComplexity = nodeCount * 1;
        const connectionComplexity = connectionCount * 2;
        const sizeComplexity = size / 1024; // 1 point per KB

        return nodeComplexity + connectionComplexity + sizeComplexity;
    }

    private calculateCanvasHealth(nodeCount: number, connectionCount: number, size: number): number {
        let health = 100;

        // Penalize for empty canvases
        if (nodeCount === 0) {
            health -= 50;
        }

        // Penalize for isolated nodes (no connections)
        if (nodeCount > 0 && connectionCount === 0) {
            health -= 30;
        }

        // Penalize for excessive size
        if (size > 100 * 1024) { // > 100KB
            health -= Math.min(20, (size - 100 * 1024) / (10 * 1024));
        }

        // Reward for good node-to-connection ratio
        if (nodeCount > 0 && connectionCount > 0) {
            const ratio = connectionCount / nodeCount;
            if (ratio >= 0.5 && ratio <= 2) {
                health += 10;
            }
        }

        return Math.max(0, Math.min(100, health));
    }

    private determineCanvasType(canvasData: any): string {
        try {
            if (!canvasData.nodes || canvasData.nodes.length === 0) {
                return 'Empty';
            }

            const nodeTypes = new Set();
            for (const node of canvasData.nodes) {
                if (node.type) {
                    nodeTypes.add(node.type);
                }
            }

            if (nodeTypes.has('text') && nodeTypes.size === 1) {
                return 'Text-Based';
            } else if (nodeTypes.has('image')) {
                return 'Visual-Rich';
            } else if (nodeTypes.size > 3) {
                return 'Complex-Mixed';
            } else if (canvasData.edges && canvasData.edges.length > 0) {
                return 'Connected-Diagram';
            } else {
                return 'Simple-Collection';
            }
        } catch (error) {
            return 'Unknown';
        }
    }

    private updateMetrics(): void {
        this.metrics.totalCanvases = this.canvasFiles.length;
        this.metrics.totalNodes = this.canvasFiles.reduce((sum, c) => sum + c.nodeCount, 0);
        this.metrics.totalConnections = this.canvasFiles.reduce((sum, c) => sum + c.connectionCount, 0);
        this.metrics.totalSize = this.canvasFiles.reduce((sum, c) => sum + c.size, 0);
        this.metrics.averageComplexity = this.canvasFiles.length > 0
            ? this.canvasFiles.reduce((sum, c) => sum + c.complexity, 0) / this.canvasFiles.length
            : 0;
        this.metrics.healthScore = this.canvasFiles.length > 0
            ? this.canvasFiles.reduce((sum, c) => sum + c.health, 0) / this.canvasFiles.length
            : 0;
        this.metrics.lastUpdated = new Date();
    }

    // Status and trend methods
    private getCanvasStatus(health: number): string {
        if (health >= 90) return '🟢 Excellent';
        if (health >= 70) return '🟡 Good';
        if (health >= 50) return '🟠 Fair';
        return '🔴 Poor';
    }

    private getCanvasTrend(): string {
        return this.metrics.totalCanvases > 0 ? '📈 Active' : '📉 None';
    }

    private getNodeTrend(): string {
        return this.metrics.totalNodes > 10 ? '📈 Growing' : this.metrics.totalNodes > 0 ? '📊 Stable' : '📉 Minimal';
    }

    private getConnectionTrend(): string {
        return this.metrics.totalConnections > 5 ? '📈 Connecting' : this.metrics.totalConnections > 0 ? '📊 Linked' : '📉 Isolated';
    }

    private getComplexityStatus(complexity: number): string {
        if (complexity < 10) return '🟢 Simple';
        if (complexity < 25) return '🟡 Moderate';
        if (complexity < 50) return '🟠 Complex';
        return '🔴 Very Complex';
    }

    private getComplexityHealth(complexity: number): string {
        if (complexity < 25) return '🟢 Manageable';
        if (complexity < 50) return '🟡 Challenging';
        return '🔴 Overwhelming';
    }

    private getComplexityTrend(): string {
        return this.metrics.averageComplexity < 25 ? '📉 Simple' : this.metrics.averageComplexity < 50 ? '📊 Moderate' : '📈 Complex';
    }

    private getComplexityPriority(complexity: number): string {
        if (complexity < 10) return '🟢 Low';
        if (complexity < 25) return '🟡 Medium';
        if (complexity < 50) return '🟠 High';
        return '🔴 Critical';
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

    // Additional utility methods for status calculations
    private getDirectoryStatus(canvases: CanvasFile[]): string {
        const avgHealth = canvases.reduce((sum, c) => sum + c.health, 0) / canvases.length;
        if (avgHealth >= 80) return '🟢 Healthy';
        if (avgHealth >= 60) return '🟡 Good';
        return '🔴 Needs Attention';
    }

    private getDirectoryPriority(canvases: CanvasFile[]): string {
        const avgHealth = canvases.reduce((sum, c) => sum + c.health, 0) / canvases.length;
        if (avgHealth >= 80) return '🟢 Low';
        if (avgHealth >= 60) return '🟡 Medium';
        return '🔴 High';
    }

    private getComplexityCategoryStatus(category: string): string {
        switch (category) {
            case 'Simple': return '🟢 Ideal';
            case 'Moderate': return '🟡 Balanced';
            case 'Complex': return '🟠 Challenging';
            case 'Very Complex': return '🔴 Overwhelming';
            default: return '⚪ Unknown';
        }
    }

    private getComplexityCategoryPriority(category: string): string {
        switch (category) {
            case 'Simple': return '🟢 Maintain';
            case 'Moderate': return '🟡 Monitor';
            case 'Complex': return '🟠 Optimize';
            case 'Very Complex': return '🔴 Simplify';
            default: return '⚪ Unknown';
        }
    }

    private getSizeCategoryStatus(category: string): string {
        switch (category) {
            case 'Small': return '🟢 Efficient';
            case 'Medium': return '🟡 Balanced';
            case 'Large': return '🟠 Heavy';
            case 'Very Large': return '🔴 Bloated';
            default: return '⚪ Unknown';
        }
    }

    private getSizeEfficiency(canvases: CanvasFile[]): string {
        if (canvases.length === 0) return '🟢 N/A';
        const avgSize = canvases.reduce((sum, c) => sum + c.size, 0) / canvases.length;
        return avgSize < 50 * 1024 ? '🟢 Efficient' : avgSize < 100 * 1024 ? '🟡 Moderate' : '🔴 Heavy';
    }

    private getSizeCategoryPriority(category: string): string {
        switch (category) {
            case 'Small': return '🟢 Optimize';
            case 'Medium': return '🟡 Monitor';
            case 'Large': return '🟠 Compress';
            case 'Very Large': return '🔴 Reduce';
            default: return '⚪ Unknown';
        }
    }

    private getCanvasPriority(canvas: CanvasFile): string {
        if (canvas.health >= 80) return '🟢 Low';
        if (canvas.health >= 60) return '🟡 Medium';
        return '🔴 High';
    }

    // Health assessment methods
    private getHealthIssues(): number {
        return this.canvasFiles.filter(c => c.health < 70).length;
    }

    private getHealthTrend(): string {
        return this.metrics.healthScore > 80 ? '📈 Improving' : this.metrics.healthScore > 60 ? '📊 Stable' : '📉 Declining';
    }

    private getHealthRecommendation(): string {
        if (this.metrics.healthScore > 80) return '✅ Maintain';
        if (this.metrics.healthScore > 60) return '🔍 Monitor';
        return '🔧 Improve';
    }

    private getNodeDensityScore(): number {
        if (this.metrics.totalCanvases === 0) return 100;
        const avgNodes = this.metrics.totalNodes / this.metrics.totalCanvases;
        return Math.min(100, avgNodes * 10);
    }

    private getNodeDensityIssues(): number {
        return this.canvasFiles.filter(c => c.nodeCount < 3).length;
    }

    private getNodeDensityStatus(): string {
        const score = this.getNodeDensityScore();
        return score > 80 ? '🟢 Rich' : score > 50 ? '🟡 Moderate' : '🔴 Sparse';
    }

    private getNodeDensityTrend(): string {
        const score = this.getNodeDensityScore();
        return score > 80 ? '📈 Growing' : score > 50 ? '📊 Stable' : '📉 Declining';
    }

    private getNodeDensityRecommendation(): string {
        const score = this.getNodeDensityScore();
        return score > 80 ? '✅ Maintain' : score > 50 ? '🔍 Monitor' : '🔧 Expand';
    }

    private getConnectivityScore(): number {
        if (this.metrics.totalCanvases === 0) return 100;
        const avgConnections = this.metrics.totalConnections / this.metrics.totalCanvases;
        return Math.min(100, avgConnections * 20);
    }

    private getConnectivityIssues(): number {
        return this.canvasFiles.filter(c => c.connectionCount === 0 && c.nodeCount > 1).length;
    }

    private getConnectivityStatus(): string {
        const score = this.getConnectivityScore();
        return score > 80 ? '🟢 Connected' : score > 50 ? '🟡 Linked' : '🔴 Isolated';
    }

    private getConnectivityTrend(): string {
        const score = this.getConnectivityScore();
        return score > 80 ? '📈 Connecting' : score > 50 ? '📊 Stable' : '📉 Isolating';
    }

    private getConnectivityRecommendation(): string {
        const score = this.getConnectivityScore();
        return score > 80 ? '✅ Maintain' : score > 50 ? '🔍 Monitor' : '🔧 Connect';
    }

    private getEfficiencyScore(): number {
        if (this.metrics.totalNodes === 0) return 100;
        const avgSizePerNode = this.metrics.totalSize / this.metrics.totalNodes;
        return Math.max(0, 100 - (avgSizePerNode / 1024)); // Penalize for >1KB per node
    }

    private getEfficiencyIssues(): number {
        return this.canvasFiles.filter(c => c.nodeCount > 0 && c.size / c.nodeCount > 10 * 1024).length;
    }

    private getEfficiencyStatus(): string {
        const score = this.getEfficiencyScore();
        return score > 80 ? '🟢 Efficient' : score > 60 ? '🟡 Moderate' : '🔴 Bloated';
    }

    private getEfficiencyTrend(): string {
        const score = this.getEfficiencyScore();
        return score > 80 ? '📉 Optimizing' : score > 60 ? '📊 Stable' : '📈 Growing';
    }

    private getEfficiencyRecommendation(): string {
        const score = this.getEfficiencyScore();
        return score > 80 ? '✅ Maintain' : score > 60 ? '🔍 Monitor' : '🔧 Optimize';
    }

    private displayHeader(): void {
        console.log(chalk.magenta.bold(`🎨 Canvas Visual Monitoring System - ${this.metrics.totalCanvases} Canvases Found`));
        console.log(chalk.gray('═'.repeat(120)));
    }

    private displayFooter(): void {
        console.log(chalk.gray('─'.repeat(120)));
        console.log(chalk.blue('Controls: [Ctrl+C] Exit | [Space] Refresh | [D] Deep Analysis | [E] Export Report'));
        console.log(chalk.gray(`Last Scan: ${this.metrics.lastUpdated.toLocaleTimeString()} | Total Nodes: ${this.metrics.totalNodes} | Total Connections: ${this.metrics.totalConnections}`));
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.magenta.bold('🎨 Canvas Visual Monitoring System'));
        console.log(chalk.gray('Usage: bun canvas-monitor.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        console.log(chalk.gray('  --demo       Run demo mode with sample data'));
        console.log(chalk.gray('  --scan-only  Perform single scan and exit'));
        console.log(chalk.gray('\nFeatures: Canvas file analysis, visual analytics, complexity assessment'));
        process.exit(0);
    }

    try {
        const monitor = new CanvasMonitorSystem();

        if (args.includes('--demo')) {
            // Demo mode - scan and display
            await monitor.scanCanvasFiles();
            await monitor['displayCanvasDashboard']();
        } else if (args.includes('--scan-only')) {
            // Scan only mode
            await monitor.scanCanvasFiles();
            console.log(chalk.green('✅ Canvas scan completed'));
        } else {
            // Full monitoring mode
            await monitor.startCanvasMonitoring();
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

export { CanvasMonitorSystem, type CanvasFile, type CanvasMetrics, type CanvasAnalytics };

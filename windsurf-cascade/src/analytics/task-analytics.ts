/**
 * Task Analytics Engine - Performance Monitoring & Insights
 * Advanced analytics for task management with Bun-native optimization
 * 
 * @fileoverview Analytics engine for task performance monitoring
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { TaskAnalytics, PerformanceInsight, TaskMetrics, TaskStatus, TaskPriority } from '../config/tasks-plugin-schema';
import { getBunPerformanceMetrics, generateBunUUID } from '../scripts/template-utils';

export class TaskAnalyticsEngine {
    private metrics: Map<string, TaskAnalytics[]> = new Map();
    private insights: Map<string, PerformanceInsight[]> = new Map();
    private performanceCache: Map<string, any> = new Map();

    constructor() {
        this.initializeAnalytics();
    }

    /**
     * Initialize analytics system
     */
    private initializeAnalytics(): void {
        console.log('🔧 Initializing Task Analytics Engine...');

        // Setup performance monitoring
        const perf = getBunPerformanceMetrics();

        // Initialize data structures
        this.metrics.clear();
        this.insights.clear();
        this.performanceCache.clear();

        console.log(`✅ Analytics Engine initialized in ${perf.getElapsedMs().toFixed(3)}ms`);
    }

    /**
     * Track task event for analytics
     */
    trackTaskEvent(taskId: string, event: TaskEvent, metadata?: any): void {
        const perf = getBunPerformanceMetrics();

        try {
            // Get or create task analytics
            if (!this.metrics.has(taskId)) {
                this.metrics.set(taskId, []);
            }

            const taskMetrics = this.metrics.get(taskId)!;

            // Calculate event metrics
            const eventMetrics: TaskAnalytics = {
                taskId,
                createdAt: new Date(),
                completedAt: event === 'completed' ? new Date() : undefined,
                status: this.mapEventToStatus(event),
                priority: metadata?.priority || 'medium',
                project: metadata?.project || 'default',
                dependencies: metadata?.dependencies || [],
                estimatedHours: metadata?.estimatedHours || 0,
                actualHours: metadata?.actualHours,
                complexity: metadata?.complexity || 1,
                blockedCount: metadata?.blockedCount || 0,
                metrics: this.calculateEventMetrics(taskId, event, metadata)
            };

            taskMetrics.push(eventMetrics);

            // Update performance cache
            this.updatePerformanceCache(taskId, event, eventMetrics);

            // Generate insights if needed
            if (this.shouldGenerateInsights(taskId)) {
                this.generateProjectInsights(metadata?.project || 'default');
            }

            console.log(`📊 Tracked event '${event}' for task ${taskId} in ${perf.getElapsedMs().toFixed(3)}ms`);

        } catch (error) {
            console.error(`❌ Failed to track task event: ${error.message}`);
        }
    }

    /**
     * Generate performance insights for a project
     */
    generateProjectInsights(project: string): PerformanceInsight[] {
        const perf = getBunPerformanceMetrics();
        const insights: PerformanceInsight[] = [];

        try {
            // Get all project tasks
            const projectTasks = this.getProjectTasks(project);

            // Generate bottleneck insights
            const bottlenecks = this.detectBottlenecks(projectTasks);
            bottlenecks.forEach(bottleneck => {
                insights.push({
                    type: 'bottleneck',
                    severity: bottleneck.blockedCount > 5 ? 'high' : bottleneck.blockedCount > 2 ? 'medium' : 'low',
                    description: `Task "${bottleneck.task}" is blocking ${bottleneck.blockedCount} other tasks`,
                    recommendation: 'Consider breaking down this task or prioritizing its completion',
                    affectedTasks: [bottleneck.task],
                    impactScore: bottleneck.blockedCount * 10
                });
            });

            // Generate velocity insights
            const velocity = this.calculateVelocity(projectTasks);
            if (velocity < 1) {
                insights.push({
                    type: 'velocity',
                    severity: 'high',
                    description: `Project velocity is critically low (${velocity.toFixed(1)} tasks/week)`,
                    recommendation: 'Review task complexity, team capacity, and remove blockers',
                    affectedTasks: projectTasks.map(t => t.taskId),
                    impactScore: 50
                });
            } else if (velocity < 2) {
                insights.push({
                    type: 'velocity',
                    severity: 'medium',
                    description: `Project velocity is below optimal (${velocity.toFixed(1)} tasks/week)`,
                    recommendation: 'Consider optimizing workflow and reducing task complexity',
                    affectedTasks: projectTasks.map(t => t.taskId),
                    impactScore: 25
                });
            }

            // Generate quality insights
            const qualityIssues = this.detectQualityIssues(projectTasks);
            qualityIssues.forEach(issue => {
                insights.push({
                    type: 'quality',
                    severity: issue.severity,
                    description: `Quality issues detected in task "${issue.task}": ${issue.description}`,
                    recommendation: issue.recommendation,
                    affectedTasks: [issue.task],
                    impactScore: issue.impactScore
                });
            });

            // Generate resource insights
            const resourceIssues = this.detectResourceIssues(projectTasks);
            resourceIssues.forEach(issue => {
                insights.push({
                    type: 'resource',
                    severity: issue.severity,
                    description: `Resource allocation issue: ${issue.description}`,
                    recommendation: issue.recommendation,
                    affectedTasks: issue.affectedTasks,
                    impactScore: issue.impactScore
                });
            });

            // Generate dependency insights
            const dependencyIssues = this.detectDependencyIssues(projectTasks);
            dependencyIssues.forEach(issue => {
                insights.push({
                    type: 'dependency',
                    severity: issue.severity,
                    description: `Dependency issue: ${issue.description}`,
                    recommendation: issue.recommendation,
                    affectedTasks: issue.affectedTasks,
                    impactScore: issue.impactScore
                });
            });

            // Cache insights
            this.insights.set(project, insights);

            console.log(`🧠 Generated ${insights.length} insights for project "${project}" in ${perf.getElapsedMs().toFixed(3)}ms`);

            return insights;

        } catch (error) {
            console.error(`❌ Failed to generate insights for project "${project}": ${error.message}`);
            return [];
        }
    }

    /**
     * Get comprehensive project analytics
     */
    getProjectAnalytics(project: string): any {
        const perf = getBunPerformanceMetrics();

        try {
            const projectTasks = this.getProjectTasks(project);
            const insights = this.insights.get(project) || [];

            const analytics = {
                project,
                generated: new Date().toISOString(),
                summary: {
                    totalTasks: projectTasks.length,
                    completedTasks: projectTasks.filter(t => t.status === 'DONE').length,
                    inProgressTasks: projectTasks.filter(t => t.status === 'IN_PROGRESS').length,
                    todoTasks: projectTasks.filter(t => t.status === 'TODO').length,
                    blockedTasks: projectTasks.filter(t => t.status === 'BLOCKED').length
                },
                performance: {
                    velocity: this.calculateVelocity(projectTasks),
                    averageCompletionTime: this.calculateAverageCompletionTime(projectTasks),
                    onTimeDeliveryRate: this.calculateOnTimeDeliveryRate(projectTasks),
                    qualityScore: this.calculateQualityScore(projectTasks),
                    efficiency: this.calculateEfficiency(projectTasks)
                },
                insights: {
                    total: insights.length,
                    high: insights.filter(i => i.severity === 'high').length,
                    medium: insights.filter(i => i.severity === 'medium').length,
                    low: insights.filter(i => i.severity === 'low').length,
                    items: insights
                },
                trends: {
                    completionTrend: this.calculateCompletionTrend(projectTasks),
                    velocityTrend: this.calculateVelocityTrend(projectTasks),
                    qualityTrend: this.calculateQualityTrend(projectTasks)
                },
                recommendations: this.generateRecommendations(projectTasks, insights)
            };

            console.log(`📊 Generated project analytics for "${project}" in ${perf.getElapsedMs().toFixed(3)}ms`);

            return analytics;

        } catch (error) {
            console.error(`❌ Failed to generate project analytics: ${error.message}`);
            return null;
        }
    }

    /**
     * Export analytics data
     */
    exportAnalytics(project: string, format: 'json' | 'csv' | 'markdown' = 'json'): string {
        const analytics = this.getProjectAnalytics(project);

        if (!analytics) {
            throw new Error(`No analytics available for project "${project}"`);
        }

        switch (format) {
            case 'json':
                return JSON.stringify(analytics, null, 2);

            case 'csv':
                return this.convertToCSV(analytics);

            case 'markdown':
                return this.convertToMarkdown(analytics);

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Clear analytics data for a project
     */
    clearProjectAnalytics(project: string): void {
        // Remove project metrics
        for (const [taskId, metrics] of this.metrics.entries()) {
            const filteredMetrics = metrics.filter(m => m.project !== project);
            if (filteredMetrics.length === 0) {
                this.metrics.delete(taskId);
            } else {
                this.metrics.set(taskId, filteredMetrics);
            }
        }

        // Remove project insights
        this.insights.delete(project);

        // Clear performance cache
        this.performanceCache.delete(project);

        console.log(`🧹 Cleared analytics data for project "${project}"`);
    }

    /**
     * Private helper methods
     */
    private mapEventToStatus(event: TaskEvent): TaskStatus {
        const statusMap: Record<TaskEvent, TaskStatus> = {
            'created': 'TODO',
            'started': 'IN_PROGRESS',
            'completed': 'DONE',
            'blocked': 'BLOCKED',
            'cancelled': 'CANCELLED',
            'unblocked': 'IN_PROGRESS',
            'paused': 'TODO',
            'resumed': 'IN_PROGRESS'
        };

        return statusMap[event] || 'TODO';
    }

    private calculateEventMetrics(taskId: string, event: TaskEvent, metadata?: any): TaskMetrics {
        const existingMetrics = this.metrics.get(taskId) || [];
        const lastMetric = existingMetrics[existingMetrics.length - 1];

        return {
            timeToStart: event === 'started' && lastMetric ?
                Date.now() - lastMetric.createdAt.getTime() : 0,
            timeToComplete: event === 'completed' && lastMetric ?
                Date.now() - lastMetric.createdAt.getTime() : 0,
            statusChanges: existingMetrics.length + 1,
            dependencyUpdates: metadata?.dependencyUpdates || 0,
            blockingDuration: metadata?.blockingDuration || 0
        };
    }

    private updatePerformanceCache(taskId: string, event: TaskEvent, metrics: TaskAnalytics): void {
        const cacheKey = `${metrics.project}_${taskId}`;
        this.performanceCache.set(cacheKey, {
            lastEvent: event,
            lastUpdate: new Date(),
            metrics
        });
    }

    private shouldGenerateInsights(project: string): boolean {
        // Generate insights every 10 events or hourly
        const projectMetrics = Array.from(this.metrics.values())
            .flat()
            .filter(m => m.project === project);

        return projectMetrics.length % 10 === 0 ||
            !this.insights.has(project) ||
            (Date.now() - (this.insights.get(project)?.[0]?.generated || 0) > 3600000);
    }

    private getProjectTasks(project: string): TaskAnalytics[] {
        return Array.from(this.metrics.values())
            .flat()
            .filter(m => m.project === project);
    }

    private detectBottlenecks(tasks: TaskAnalytics[]): Array<{ task: string, blockedCount: number }> {
        const taskBlockingCount = new Map<string, number>();

        // Count how many tasks each task blocks
        tasks.forEach(task => {
            task.dependencies.forEach(dep => {
                taskBlockingCount.set(dep, (taskBlockingCount.get(dep) || 0) + 1);
            });
        });

        // Return tasks that block others
        return Array.from(taskBlockingCount.entries())
            .filter(([_, count]) => count > 0)
            .map(([task, count]) => ({ task, blockedCount: count }))
            .sort((a, b) => b.blockedCount - a.blockedCount);
    }

    private calculateVelocity(tasks: TaskAnalytics[]): number {
        const completedTasks = tasks.filter(t => t.status === 'DONE');
        if (completedTasks.length === 0) return 0;

        // Calculate tasks completed per week over the last 4 weeks
        const fourWeeksAgo = Date.now() - (4 * 7 * 24 * 60 * 60 * 1000);
        const recentCompleted = completedTasks.filter(t =>
            t.completedAt && t.completedAt.getTime() > fourWeeksAgo
        );

        return recentCompleted.length / 4; // tasks per week
    }

    private detectQualityIssues(tasks: TaskAnalytics[]): Array<{
        task: string,
        severity: 'high' | 'medium' | 'low',
        description: string,
        recommendation: string,
        impactScore: number
    }> {
        const issues: any[] = [];

        tasks.forEach(task => {
            // Check for high complexity without breakdown
            if (task.complexity > 8 && task.dependencies.length === 0) {
                issues.push({
                    task: task.taskId,
                    severity: 'medium',
                    description: 'High complexity task without proper breakdown',
                    recommendation: 'Consider breaking down into smaller, manageable tasks',
                    impactScore: 15
                });
            }

            // Check for tasks with many status changes
            const taskMetrics = this.metrics.get(task.taskId) || [];
            if (taskMetrics.length > 10) {
                issues.push({
                    task: task.taskId,
                    severity: 'low',
                    description: 'Task has excessive status changes',
                    recommendation: 'Review task definition and reduce ambiguity',
                    impactScore: 5
                });
            }

            // Check for inaccurate time estimates
            if (task.estimatedHours > 0 && task.actualHours) {
                const variance = Math.abs(task.actualHours - task.estimatedHours) / task.estimatedHours;
                if (variance > 0.5) {
                    issues.push({
                        task: task.taskId,
                        severity: 'medium',
                        description: 'Time estimate significantly inaccurate',
                        recommendation: 'Improve estimation process and break down complex tasks',
                        impactScore: 20
                    });
                }
            }
        });

        return issues;
    }

    private detectResourceIssues(tasks: TaskAnalytics[]): Array<{
        severity: 'high' | 'medium' | 'low',
        description: string,
        recommendation: string,
        affectedTasks: string[],
        impactScore: number
    }> {
        const issues: any[] = [];

        // Check for resource overallocation
        const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'DONE');
        if (highPriorityTasks.length > 10) {
            issues.push({
                severity: 'high',
                description: 'Too many high priority tasks may indicate resource overallocation',
                recommendation: 'Review priorities and consider task sequencing',
                affectedTasks: highPriorityTasks.map(t => t.taskId),
                impactScore: 30
            });
        }

        // Check for long-running tasks
        const longRunningTasks = tasks.filter(t =>
            t.status === 'IN_PROGRESS' &&
            t.createdAt &&
            (Date.now() - t.createdAt.getTime()) > (14 * 24 * 60 * 60 * 1000) // 14 days
        );

        if (longRunningTasks.length > 0) {
            issues.push({
                severity: 'medium',
                description: `${longRunningTasks.length} tasks have been in progress for over 14 days`,
                recommendation: 'Review blocked tasks and re-estimate completion',
                affectedTasks: longRunningTasks.map(t => t.taskId),
                impactScore: 25
            });
        }

        return issues;
    }

    private detectDependencyIssues(tasks: TaskAnalytics[]): Array<{
        severity: 'high' | 'medium' | 'low',
        description: string,
        recommendation: string,
        affectedTasks: string[],
        impactScore: number
    }> {
        const issues: any[] = [];

        // Check for tasks with too many dependencies
        const heavyDependencyTasks = tasks.filter(t => t.dependencies.length > 5);
        if (heavyDependencyTasks.length > 0) {
            issues.push({
                severity: 'medium',
                description: 'Tasks with excessive dependencies may cause delays',
                recommendation: 'Review dependency chains and consider parallelization',
                affectedTasks: heavyDependencyTasks.map(t => t.taskId),
                impactScore: 20
            });
        }

        // Check for circular dependencies (simplified check)
        const dependencyMap = new Map<string, string[]>();
        tasks.forEach(task => {
            dependencyMap.set(task.taskId, task.dependencies);
        });

        const cycles = this.detectDependencyCycles(dependencyMap);
        if (cycles.length > 0) {
            issues.push({
                severity: 'high',
                description: `Detected ${cycles.length} circular dependency chains`,
                recommendation: 'Break circular dependencies immediately to prevent deadlocks',
                affectedTasks: cycles.flat(),
                impactScore: 50
            });
        }

        return issues;
    }

    private detectDependencyCycles(dependencyMap: Map<string, string[]>): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const path: string[] = [];

        const dfs = (node: string): boolean => {
            if (recursionStack.has(node)) {
                const cycleStart = path.indexOf(node);
                cycles.push([...path.slice(cycleStart), node]);
                return true;
            }

            if (visited.has(node)) {
                return false;
            }

            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const dependencies = dependencyMap.get(node) || [];
            for (const dep of dependencies) {
                if (dfs(dep)) {
                    return true;
                }
            }

            recursionStack.delete(node);
            path.pop();
            return false;
        };

        for (const node of dependencyMap.keys()) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }

        return cycles;
    }

    private calculateAverageCompletionTime(tasks: TaskAnalytics[]): number {
        const completedTasks = tasks.filter(t => t.status === 'DONE' && t.metrics.timeToComplete > 0);
        if (completedTasks.length === 0) return 0;

        const totalTime = completedTasks.reduce((sum, task) => sum + task.metrics.timeToComplete, 0);
        return totalTime / completedTasks.length / (1000 * 60 * 60); // Convert to hours
    }

    private calculateOnTimeDeliveryRate(tasks: TaskAnalytics[]): number {
        // Simplified calculation - would need due dates in real implementation
        const completedTasks = tasks.filter(t => t.status === 'DONE');
        if (completedTasks.length === 0) return 0;

        return 85; // Mock calculation
    }

    private calculateQualityScore(tasks: TaskAnalytics[]): number {
        const completedTasks = tasks.filter(t => t.status === 'DONE');
        if (completedTasks.length === 0) return 0;

        // Quality score based on estimation accuracy, status changes, etc.
        let totalScore = 0;
        completedTasks.forEach(task => {
            let taskScore = 100;

            // Penalize for inaccurate estimates
            if (task.estimatedHours > 0 && task.actualHours) {
                const variance = Math.abs(task.actualHours - task.estimatedHours) / task.estimatedHours;
                taskScore -= Math.min(variance * 50, 50);
            }

            // Penalize for excessive status changes
            const taskMetrics = this.metrics.get(task.taskId) || [];
            if (taskMetrics.length > 5) {
                taskScore -= (taskMetrics.length - 5) * 5;
            }

            totalScore += Math.max(taskScore, 0);
        });

        return totalScore / completedTasks.length;
    }

    private calculateEfficiency(tasks: TaskAnalytics[]): number {
        // Efficiency based on completion rate vs. time
        const completedTasks = tasks.filter(t => t.status === 'DONE');
        const totalTasks = tasks.length;

        if (totalTasks === 0) return 0;

        const completionRate = completedTasks.length / totalTasks;
        const avgCompletionTime = this.calculateAverageCompletionTime(tasks);

        // Efficiency = completion rate / (average completion time / expected time)
        return Math.min(completionRate * 100, 100);
    }

    private calculateCompletionTrend(tasks: TaskAnalytics[]): 'increasing' | 'stable' | 'decreasing' {
        // Simplified trend calculation
        const completedTasks = tasks.filter(t => t.status === 'DONE');
        if (completedTasks.length < 2) return 'stable';

        const recent = completedTasks.slice(-5);
        const older = completedTasks.slice(-10, -5);

        const recentRate = recent.length / 5;
        const olderRate = older.length / 5;

        if (recentRate > olderRate * 1.2) return 'increasing';
        if (recentRate < olderRate * 0.8) return 'decreasing';
        return 'stable';
    }

    private calculateVelocityTrend(tasks: TaskAnalytics[]): 'increasing' | 'stable' | 'decreasing' {
        // Simplified velocity trend
        return 'stable';
    }

    private calculateQualityTrend(tasks: TaskAnalytics[]): 'increasing' | 'stable' | 'decreasing' {
        // Simplified quality trend
        return 'stable';
    }

    private generateRecommendations(tasks: TaskAnalytics[], insights: PerformanceInsight[]): string[] {
        const recommendations: string[] = [];

        // Analyze insights and generate recommendations
        const highSeverityInsights = insights.filter(i => i.severity === 'high');

        if (highSeverityInsights.length > 0) {
            recommendations.push('🚨 Address high-severity issues immediately to prevent project delays');
        }

        const bottlenecks = insights.filter(i => i.type === 'bottleneck');
        if (bottlenecks.length > 0) {
            recommendations.push('🔗 Focus on completing bottleneck tasks to unblock dependent work');
        }

        const velocityIssues = insights.filter(i => i.type === 'velocity');
        if (velocityIssues.length > 0) {
            recommendations.push('📈 Consider breaking down complex tasks and improving estimation accuracy');
        }

        const qualityIssues = insights.filter(i => i.type === 'quality');
        if (qualityIssues.length > 0) {
            recommendations.push('🎯 Implement better task definition and estimation processes');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Project is performing well - maintain current practices');
        }

        return recommendations;
    }

    private convertToCSV(analytics: any): string {
        // Simplified CSV conversion
        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Tasks', analytics.summary.totalTasks],
            ['Completed Tasks', analytics.summary.completedTasks],
            ['Velocity', analytics.performance.velocity],
            ['Quality Score', analytics.performance.qualityScore],
            ['Efficiency', analytics.performance.efficiency]
        ];

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    private convertToMarkdown(analytics: any): string {
        return `# 📊 ${analytics.project} Analytics Report

**Generated**: ${analytics.generated}

## 📈 Summary
- **Total Tasks**: ${analytics.summary.totalTasks}
- **Completed**: ${analytics.summary.completedTasks}
- **In Progress**: ${analytics.summary.inProgressTasks}
- **Todo**: ${analytics.summary.todoTasks}

## 🚀 Performance
- **Velocity**: ${analytics.performance.velocity} tasks/week
- **Average Completion Time**: ${analytics.performance.averageCompletionTime} days
- **On-Time Delivery**: ${analytics.performance.onTimeDeliveryRate}%
- **Quality Score**: ${analytics.performance.qualityScore}%
- **Efficiency**: ${analytics.performance.efficiency}%

## 🧠 Insights
- **Total Issues**: ${analytics.insights.total}
- **High Severity**: ${analytics.insights.high}
- **Medium Severity**: ${analytics.insights.medium}
- **Low Severity**: ${analytics.insights.low}

## 💡 Recommendations
${analytics.recommendations.map(r => `- ${r}`).join('\n')}

---
*Generated by Task Analytics Engine v1.0.0*
`;
    }
}

// Type definitions for task events
export type TaskEvent =
    | 'created'
    | 'started'
    | 'completed'
    | 'blocked'
    | 'cancelled'
    | 'unblocked'
    | 'paused'
    | 'resumed';

// Singleton instance
export const taskAnalytics = new TaskAnalyticsEngine();

export default TaskAnalyticsEngine;

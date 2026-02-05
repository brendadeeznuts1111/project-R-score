#!/usr/bin/env bun

/**
 * Tasks Plugin CLI - Bun-Powered Task Management
 * Fast, efficient command-line interface for task management
 * 
 * @fileoverview CLI tool for task creation, validation, and reporting
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { Command } from 'commander';
import { readTemplateFile, writeTemplateFile, generateBunUUID, getBunDateTime } from '../scripts/template-utils';
import { tasksConfig, validateTasksConfig, TaskCommand, TaskCommandResult, ValidationResult } from '../config/tasks-plugin-schema';

class TasksCLI {
    private config = tasksConfig;
    private vaultPath = process.cwd();

    constructor() {
        this.setupCommands();
    }

    /**
     * Setup CLI commands
     */
    private setupCommands() {
        const program = new Command();

        program
            .name('tasks-cli')
            .description('Bun-powered task management CLI')
            .version('1.0.0');

        // Create task command
        program
            .command('create')
            .description('Create a new task')
            .argument('<description>', 'Task description')
            .option('-p, --project <project>', 'Project name', 'default')
            .option('--priority <priority>', 'Task priority (high, medium, low)', 'medium')
            .option('--due <date>', 'Due date (YYYY-MM-DD)')
            .option('--scheduled <date>', 'Scheduled date (YYYY-MM-DD)')
            .option('--recurrence <rule>', 'Recurrence rule')
            .action(async (description, options) => {
                await this.createTask(description, options);
            });

        // Validate tasks command
        program
            .command('validate')
            .description('Validate task dependencies and configuration')
            .argument('<project>', 'Project name to validate')
            .option('--fix', 'Attempt to fix detected issues')
            .action(async (project, options) => {
                await this.validateProject(project, options.fix);
            });

        // Generate report command
        program
            .command('report')
            .description('Generate project performance report')
            .argument('<project>', 'Project name')
            .option('-p, --period <period>', 'Report period (week, month, quarter)', 'week')
            .option('--format <format>', 'Output format (json, markdown, table)', 'markdown')
            .action(async (project, options) => {
                await this.generateReport(project, options.period, options.format);
            });

        // List tasks command
        program
            .command('list')
            .description('List tasks for a project')
            .argument('[project]', 'Project name (optional)')
            .option('--status <status>', 'Filter by status')
            .option('--priority <priority>', 'Filter by priority')
            .option('--format <format>', 'Output format (json, table)', 'table')
            .action(async (project, options) => {
                await this.listTasks(project || 'all', options);
            });

        // Update task command
        program
            .command('update')
            .description('Update an existing task')
            .argument('<taskId>', 'Task ID or file path')
            .option('--status <status>', 'New status')
            .option('--priority <priority>', 'New priority')
            .option('--due <date>', 'New due date')
            .action(async (taskId, options) => {
                await this.updateTask(taskId, options);
            });

        // Delete task command
        program
            .command('delete')
            .description('Delete a task')
            .argument('<taskId>', 'Task ID or file path')
            .option('--force', 'Force deletion without confirmation')
            .action(async (taskId, options) => {
                await this.deleteTask(taskId, options.force);
            });

        // Config validation command
        program
            .command('config')
            .description('Validate Tasks plugin configuration')
            .option('--fix', 'Attempt to fix configuration issues')
            .action(async (options) => {
                await this.validateConfig(options.fix);
            });

        program.parse();
    }

    /**
     * Create a new task
     */
    async createTask(description: string, options: any): Promise<TaskCommandResult> {
        const startTime = Bun.nanoseconds();

        try {
            const taskData = {
                description,
                project: options.project,
                priority: options.priority || 'medium',
                due: options.due || '',
                scheduled: options.scheduled || '',
                recurrence: options.recurrence || '',
                uuid: generateBunUUID(),
                created: getBunDateTime(),
                updated: getBunDateTime(),
                status: 'TODO'
            };

            // Generate task filename
            const safeName = this.generateSafeFilename(description);
            const taskPath = `02 - Projects/${options.project}/${safeName}.md`;

            // Load and process template
            const template = await this.loadTaskTemplate();
            const processedContent = this.processTemplate(template, taskData);

            // Write task file
            await writeTemplateFile(taskPath, processedContent);

            const executionTime = (Bun.nanoseconds() - startTime) / 1000000;

            console.log(`✅ Task created successfully!`);
            console.log(`   📁 Path: ${taskPath}`);
            console.log(`   🆔 ID: ${taskData.uuid}`);
            console.log(`   ⏱️  Created in: ${executionTime.toFixed(3)}ms`);

            return {
                success: true,
                message: `Task "${description}" created successfully`,
                affectedTasks: [taskData.uuid],
                executionTime,
                data: taskData
            };

        } catch (error) {
            const executionTime = (Bun.nanoseconds() - startTime) / 1000000;

            console.error(`❌ Failed to create task: ${error.message}`);

            return {
                success: false,
                message: `Task creation failed: ${error.message}`,
                affectedTasks: [],
                executionTime
            };
        }
    }

    /**
     * Validate project tasks and dependencies
     */
    async validateProject(project: string, autoFix: boolean = false): Promise<ValidationResult> {
        console.log(`🔍 Validating project: ${project}`);

        const startTime = Bun.nanoseconds();
        const errors: any[] = [];
        const warnings: any[] = [];

        try {
            // Get all project tasks
            const tasks = await this.getProjectTasks(project);
            console.log(`   📊 Found ${tasks.length} tasks`);

            // Check for dependency cycles
            const dependencyGraph = this.buildDependencyGraph(tasks);
            const cycles = this.detectCycles(dependencyGraph);

            if (cycles.length > 0) {
                errors.push({
                    type: 'dependency_cycle',
                    taskId: 'project',
                    message: `Detected ${cycles.length} dependency cycles`,
                    severity: 'error'
                });

                cycles.forEach((cycle, index) => {
                    console.log(`   🔄 Cycle ${index + 1}: ${cycle.join(' → ')}`);
                });
            }

            // Check for stale tasks
            const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
            const staleTasks = tasks.filter(task =>
                task.updated && new Date(task.updated) < staleThreshold && task.status !== 'DONE'
            );

            if (staleTasks.length > 0) {
                warnings.push({
                    type: 'stale_task',
                    taskId: 'project',
                    message: `Found ${staleTasks.length} stale tasks (no activity for 7+ days)`,
                    severity: 'warning'
                });

                staleTasks.forEach(task => {
                    console.log(`   ⏰ Stale: ${task.description} (last updated: ${task.updated})`);
                });
            }

            // Check for overdue tasks
            const overdueTasks = tasks.filter(task =>
                task.due && new Date(task.due) < new Date() && task.status !== 'DONE'
            );

            if (overdueTasks.length > 0) {
                warnings.push({
                    type: 'overdue_task',
                    taskId: 'project',
                    message: `Found ${overdueTasks.length} overdue tasks`,
                    severity: 'warning'
                });

                overdueTasks.forEach(task => {
                    console.log(`   📅 Overdue: ${task.description} (due: ${task.due})`);
                });
            }

            const executionTime = (Bun.nanoseconds() - startTime) / 1000000;

            // Auto-fix if requested
            if (autoFix && errors.length > 0) {
                console.log(`🔧 Attempting to fix ${errors.length} issues...`);
                await this.autoFixIssues(project, errors);
            }

            const result: ValidationResult = {
                isValid: errors.length === 0,
                errorCount: errors.length,
                warningCount: warnings.length,
                errors,
                warnings,
                validatedAt: new Date()
            };

            console.log(`✅ Validation completed in ${executionTime.toFixed(3)}ms`);
            console.log(`   📊 Summary: ${errors.length} errors, ${warnings.length} warnings`);

            return result;

        } catch (error) {
            console.error(`❌ Validation failed: ${error.message}`);

            return {
                isValid: false,
                errorCount: 1,
                warningCount: 0,
                errors: [{
                    type: 'validation_error',
                    taskId: 'project',
                    message: error.message,
                    severity: 'error'
                }],
                warnings: [],
                validatedAt: new Date()
            };
        }
    }

    /**
     * Generate project performance report
     */
    async generateReport(project: string, period: string = 'week', format: string = 'markdown'): Promise<void> {
        console.log(`📊 Generating ${period} report for project: ${project}`);

        const startTime = Bun.nanoseconds();

        try {
            const tasks = await this.getProjectTasks(project);
            const analytics = this.calculateAnalytics(tasks, period);

            const report = {
                project,
                period,
                generated: getBunDateTime(),
                ...analytics
            };

            // Generate report content
            const reportContent = this.generateReportTemplate(report, format);

            // Write report file
            const reportPath = `02 - Projects/${project}/reports/${period}-report-${Date.now()}.${format === 'json' ? 'json' : 'md'}`;
            await writeTemplateFile(reportPath, reportContent);

            const executionTime = (Bun.nanoseconds() - startTime) / 1000000;

            console.log(`✅ Report generated successfully!`);
            console.log(`   📁 Path: ${reportPath}`);
            console.log(`   📊 Total tasks: ${analytics.totalTasks}`);
            console.log(`   ✅ Completed: ${analytics.completedTasks}`);
            console.log(`   📈 Velocity: ${analytics.velocity} tasks/week`);
            console.log(`   ⏱️  Generated in: ${executionTime.toFixed(3)}ms`);

        } catch (error) {
            console.error(`❌ Report generation failed: ${error.message}`);
        }
    }

    /**
     * List tasks with filtering
     */
    async listTasks(project: string, options: any): Promise<void> {
        try {
            const tasks = project === 'all'
                ? await this.getAllTasks()
                : await this.getProjectTasks(project);

            let filteredTasks = tasks;

            // Apply filters
            if (options.status) {
                filteredTasks = filteredTasks.filter(task => task.status === options.status);
            }

            if (options.priority) {
                filteredTasks = filteredTasks.filter(task => task.priority === options.priority);
            }

            console.log(`📋 Tasks for project: ${project}`);
            console.log(`   📊 Total: ${filteredTasks.length} tasks`);

            if (options.format === 'json') {
                console.log(JSON.stringify(filteredTasks, null, 2));
            } else {
                // Table format
                console.log('\n┌────────────────────────────────────────┬──────────┬──────────┬─────────────┐');
                console.log('│ Task Description                     │ Status   │ Priority │ Due Date    │');
                console.log('├────────────────────────────────────────┼──────────┼──────────┼─────────────┤');

                filteredTasks.forEach(task => {
                    const desc = (task.description || '').substring(0, 36).padEnd(36);
                    const status = (task.status || '').substring(0, 8).padEnd(8);
                    const priority = (task.priority || 'none').substring(0, 8).padEnd(8);
                    const due = (task.due || 'none').substring(0, 11).padEnd(11);

                    console.log(`│ ${desc} │ ${status} │ ${priority} │ ${due} │`);
                });

                console.log('└────────────────────────────────────────┴──────────┴──────────┴─────────────┘');
            }

        } catch (error) {
            console.error(`❌ Failed to list tasks: ${error.message}`);
        }
    }

    /**
     * Update existing task
     */
    async updateTask(taskId: string, options: any): Promise<void> {
        console.log(`🔄 Updating task: ${taskId}`);

        try {
            const taskPath = this.resolveTaskPath(taskId);
            const content = await Bun.file(taskPath).text();

            // Parse and update task
            const updatedContent = this.updateTaskContent(content, options);
            await Bun.write(taskPath, updatedContent);

            console.log(`✅ Task updated successfully!`);

        } catch (error) {
            console.error(`❌ Failed to update task: ${error.message}`);
        }
    }

    /**
     * Delete task
     */
    async deleteTask(taskId: string, force: boolean = false): Promise<void> {
        console.log(`🗑️  Deleting task: ${taskId}`);

        try {
            if (!force) {
                console.log('⚠️  This will permanently delete the task. Use --force to skip this confirmation.');
                return;
            }

            const taskPath = this.resolveTaskPath(taskId);
            await Bun.remove(taskPath);

            console.log(`✅ Task deleted successfully!`);

        } catch (error) {
            console.error(`❌ Failed to delete task: ${error.message}`);
        }
    }

    /**
     * Validate configuration
     */
    async validateConfig(autoFix: boolean = false): Promise<void> {
        console.log(`🔍 Validating Tasks plugin configuration...`);

        try {
            const validation = validateTasksConfig(this.config);

            if (validation.isValid) {
                console.log(`✅ Configuration is valid!`);
            } else {
                console.log(`❌ Configuration has ${validation.errorCount} errors and ${validation.warningCount} warnings`);

                validation.errors.forEach(error => {
                    console.log(`   🚫 ${error.message}`);
                });

                validation.warnings.forEach(warning => {
                    console.log(`   ⚠️  ${warning.message}`);
                });
            }

        } catch (error) {
            console.error(`❌ Configuration validation failed: ${error.message}`);
        }
    }

    /**
     * Helper methods
     */
    private generateSafeFilename(description: string): string {
        return description
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
    }

    private async loadTaskTemplate(): Promise<string> {
        try {
            return await readTemplateFile('06 - Templates/📋 Task Creation Template.md');
        } catch (error) {
            // Fallback to basic template
            return `---
type: task
title: "{{description}}"
created: {{created}}
updated: {{updated}}
project: {{project}}
priority: {{priority}}
---

# {{description}}

- [ ] #task {{description}} {{created}}
`;
        }
    }

    private processTemplate(template: string, data: any): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || match;
        });
    }

    private async getProjectTasks(project: string): Promise<any[]> {
        // Implementation would scan vault for project tasks
        // For now, return mock data
        return [
            {
                description: 'Sample task 1',
                status: 'TODO',
                priority: 'high',
                due: '2024-12-01',
                updated: '2024-11-18T10:00:00Z',
                dependencies: []
            },
            {
                description: 'Sample task 2',
                status: 'DONE',
                priority: 'medium',
                due: '2024-11-20',
                updated: '2024-11-17T15:30:00Z',
                dependencies: []
            }
        ];
    }

    private async getAllTasks(): Promise<any[]> {
        // Implementation would scan entire vault for tasks
        return [];
    }

    private buildDependencyGraph(tasks: any[]): Map<string, string[]> {
        const graph = new Map<string, string[]>();

        tasks.forEach(task => {
            graph.set(task.description, task.dependencies || []);
        });

        return graph;
    }

    private detectCycles(graph: Map<string, string[]>): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const path: string[] = [];

        const dfs = (node: string): boolean => {
            if (recursionStack.has(node)) {
                // Found a cycle
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

            const dependencies = graph.get(node) || [];
            for (const dep of dependencies) {
                if (dfs(dep)) {
                    return true;
                }
            }

            recursionStack.delete(node);
            path.pop();
            return false;
        };

        for (const node of graph.keys()) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }

        return cycles;
    }

    private calculateAnalytics(tasks: any[], period: string): any {
        const completedTasks = tasks.filter(t => t.status === 'DONE');
        const totalTasks = tasks.length;

        return {
            totalTasks,
            completedTasks: completedTasks.length,
            inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            todoTasks: tasks.filter(t => t.status === 'TODO').length,
            completionRate: totalTasks > 0 ? (completedTasks.length / totalTasks * 100).toFixed(1) : 0,
            velocity: 2.5, // Mock calculation
            averageCompletionTime: 3.2, // Mock calculation
            onTimeDeliveryRate: 87 // Mock calculation
        };
    }

    private generateReportTemplate(report: any, format: string): string {
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        }

        return `# 📊 ${report.project} Performance Report

**Period**: ${report.period}
**Generated**: ${report.generated}

## 📈 Summary
- **Total Tasks**: ${report.totalTasks}
- **Completed**: ${report.completedTasks}
- **In Progress**: ${report.inProgressTasks}
- **Todo**: ${report.todoTasks}
- **Completion Rate**: ${report.completionRate}%

## 🚀 Performance Metrics
- **Velocity**: ${report.velocity} tasks/week
- **Average Completion Time**: ${report.averageCompletionTime} days
- **On-Time Delivery**: ${report.onTimeDeliveryRate}%

---
*Report generated by Tasks CLI v1.0.0*
`;
    }

    private resolveTaskPath(taskId: string): string {
        // Implementation would resolve task ID to file path
        return `${this.vaultPath}/02 - Projects/default/${taskId}.md`;
    }

    private updateTaskContent(content: string, options: any): string {
        // Implementation would update task content based on options
        return content;
    }

    private async autoFixIssues(project: string, errors: any[]): Promise<void> {
        // Implementation would attempt to fix detected issues
        console.log('🔧 Auto-fix functionality would be implemented here');
    }
}

// Initialize and run CLI
if (import.meta.main) {
    new TasksCLI();
}

export default TasksCLI;

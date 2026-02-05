#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]enhanced-dashboard-templates
 * 
 * Enhanced Dashboard Templates
 * Template management script
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,template,structure
 */

#!/usr/bin/env bun

/**
 * Enhanced Dashboard Templates
 * Creates comprehensive dashboard templates with factory pattern integration
 * 
 * @fileoverview Advanced dashboard templates for different vault workflows
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import {
    VaultDocumentType,
    VaultFile
} from '../../src/types/tick-processor-types.js';
import {
    getHeadingTemplate,
    formatHeadingTemplate
} from '../../src/config/heading-templates.js';
import {
    formatTable,
    createTimer
} from '../../src/constants/vault-constants.js';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { inspect } from 'bun';

// =============================================================================
// DASHBOARD TEMPLATE INTERFACES - 2025-11-18
// =============================================================================

interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    toString(): string;
}

interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    version: SemanticVersion;
    category: 'productivity' | 'analytics' | 'planning' | 'review' | 'monitoring' | 'environment' | 'canvas';
    sections: DashboardSection[];
    widgets: DashboardWidget[];
    layout: DashboardLayout;
    benchmark: TemplateBenchmark;
    lastUpdated: Date;
}

interface TemplateBenchmark {
    generationTime: number; // milliseconds
    complexity: 'low' | 'medium' | 'high';
    sections: number;
    widgets: number;
    estimatedRenderTime: number; // milliseconds
}

interface DashboardSection {
    id: string;
    title: string;
    type: 'dataview' | 'markdown' | 'chart' | 'metrics' | 'timeline' | 'environment' | 'canvas';
    content: string;
    priority: number;
    collapsible: boolean;
    version: SemanticVersion;
}

interface DashboardWidget {
    id: string;
    type: 'stat' | 'chart' | 'progress' | 'list' | 'calendar' | 'environment' | 'canvas';
    title: string;
    dataSource: string;
    config: Record<string, unknown>;
    version: SemanticVersion;
}

interface DashboardLayout {
    columns: number;
    width: 'full' | 'wide' | 'narrow';
    responsive: boolean;
    version: SemanticVersion;
}

// =============================================================================
// BUN TABLE FORMATTING UTILITIES - 2025-11-18
// =============================================================================

class BunTableFormatter {
    /**
     * Format data using Bun.inspect.table() with optimal settings
     */
    static formatTable<T extends Record<string, any>>(
        data: T[],
        options: {
            title?: string;
            maxColumnWidth?: number;
            colors?: boolean;
            compact?: boolean;
            header?: boolean;
        } = {}
    ): string {
        const {
            title,
            maxColumnWidth = 25,
            colors = true,
            compact = true,
            header = true
        } = options;

        const tableOptions = {
            header,
            maxColumnWidth,
            colors,
            compact,
            maxRows: 100,
            showHidden: false,
            depth: 2
        };

        let result = '';

        if (title) {
            result += chalk.blue.bold(`\n📊 ${title}\n`);
            result += chalk.gray('━'.repeat(Math.min(title.length + 4, 80))) + '\n';
        }

        result += inspect.table(data, tableOptions);

        return result;
    }

    /**
     * Format template comparison table
     */
    static formatTemplateTable(templates: DashboardTemplate[]): string {
        const tableData = templates.map(template => ({
            '📊 Template': template.name,
            '🏷️ Version': template.version?.toString() || 'N/A',
            '📂 Category': template.category.toUpperCase(),
            '🏗️ Sections': template.sections.length,
            '🎯 Widgets': template.widgets.length,
            '⚡ Complexity': template.benchmark?.complexity || 'unknown',
            '⏱️ Render': `${template.benchmark?.estimatedRenderTime || 0}ms`
        }));

        return this.formatTable(tableData, {
            title: 'Template Comparison Overview',
            maxColumnWidth: 20,
            colors: true
        });
    }

    /**
     * Format performance metrics table
     */
    static formatPerformanceTable(results: Array<{
        template: DashboardTemplate;
        benchmark: TemplateBenchmark;
    }>): string {
        const tableData = results.map(result => ({
            '📊 Template': result.template.name,
            '🏷️ Version': result.template.version?.toString() || 'N/A',
            '⚡ Lookup': `${result.benchmark.generationTime.toFixed(2)}ms`,
            '📊 Complexity': result.benchmark.complexity,
            '🏗️ Sections': result.benchmark.sections,
            '🎯 Widgets': result.benchmark.widgets,
            '⏱️ Estimate': `${result.benchmark.estimatedRenderTime.toFixed(2)}ms`
        }));

        return this.formatTable(tableData, {
            title: 'Performance Benchmark Results',
            maxColumnWidth: 18,
            colors: true
        });
    }

    /**
     * Format category summary table
     */
    static formatCategorySummary(categories: Record<string, number>): string {
        const tableData = Object.entries(categories).map(([category, count]) => ({
            '📂 Category': category.toUpperCase(),
            '📊 Templates': count,
            '📈 Percentage': `${((count / Object.values(categories).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%`
        }));

        return this.formatTable(tableData, {
            title: 'Template Distribution by Category',
            maxColumnWidth: 25,
            colors: true
        });
    }
}

// =============================================================================
// SEMANTIC VERSION UTILITIES - 2025-11-18
// =============================================================================

class SemanticVersionImpl implements SemanticVersion {
    constructor(
        public major: number = 1,
        public minor: number = 0,
        public patch: number = 0
    ) { }

    toString(): string {
        return `${this.major}.${this.minor}.${this.patch}`;
    }

    static parse(versionString: string): SemanticVersion {
        const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
        if (!match) {
            throw new Error(`Invalid semantic version: ${versionString}`);
        }
        return new SemanticVersionImpl(
            parseInt(match[1]),
            parseInt(match[2]),
            parseInt(match[3])
        );
    }

    static compare(a: SemanticVersion, b: SemanticVersion): number {
        if (a.major !== b.major) return a.major - b.major;
        if (a.minor !== b.minor) return a.minor - b.minor;
        return a.patch - b.patch;
    }
}

// =============================================================================
// BENCHMARKING UTILITIES - 2025-11-18
// =============================================================================

class TemplateBenchmarker {
    static measureGeneration<T>(fn: () => T, complexity: 'low' | 'medium' | 'high' = 'medium'): { result: T; benchmark: TemplateBenchmark } {
        const startTime = Bun.nanoseconds();
        const result = fn();
        const endTime = Bun.nanoseconds();

        const generationTime = (endTime - startTime) / 1_000_000; // Convert to milliseconds

        const benchmark: TemplateBenchmark = {
            generationTime,
            complexity,
            sections: 0, // Will be calculated based on result
            widgets: 0,  // Will be calculated based on result
            estimatedRenderTime: generationTime * 2.5 // Rough estimate
        };

        // Update sections and widgets if result is a template
        if (result && typeof result === 'object' && 'sections' in result) {
            benchmark.sections = (result as any).sections?.length || 0;
            benchmark.widgets = (result as any).widgets?.length || 0;
        }

        return { result, benchmark };
    }

    static formatBenchmark(benchmark: TemplateBenchmark): string {
        return `${benchmark.generationTime.toFixed(2)}ms (${benchmark.complexity} complexity)`;
    }
}

// =============================================================================
// ENHANCED DASHBOARD TEMPLATES - 2025-11-18
// =============================================================================

class EnhancedDashboardTemplates {
    private templates: Map<string, DashboardTemplate> = new Map();
    private version: SemanticVersion = new SemanticVersionImpl(2, 0, 0);

    constructor() {
        this.initializeTemplates();
    }

    private initializeTemplates(): void {
        // Environment Variables Dashboard
        this.templates.set('environment-variables', {
            id: 'environment-variables',
            name: '🌍 Environment Variables Dashboard',
            description: 'Real-time monitoring of Bun environment configuration and system settings',
            version: new SemanticVersionImpl(1, 0, 0),
            category: 'environment',
            sections: [
                {
                    id: 'env-config',
                    title: '📊 Environment Configuration Status',
                    type: 'environment',
                    content: 'Real-time environment variable monitoring with Bun.inspect.table()',
                    priority: 1,
                    collapsible: false,
                    version: new SemanticVersionImpl(1, 0, 0)
                },
                {
                    id: 'env-health',
                    title: '🏥 Environment Health Assessment',
                    type: 'environment',
                    content: 'Health scoring and recommendations for environment configuration',
                    priority: 2,
                    collapsible: true,
                    version: new SemanticVersionImpl(1, 0, 0)
                }
            ],
            widgets: [
                {
                    id: 'env-status',
                    type: 'environment',
                    title: 'Environment Status',
                    dataSource: 'Bun.env',
                    config: { refreshInterval: 60000 },
                    version: new SemanticVersionImpl(1, 0, 0)
                }
            ],
            layout: {
                columns: 2,
                width: 'full',
                responsive: true,
                version: new SemanticVersionImpl(1, 0, 0)
            },
            benchmark: {
                generationTime: 0,
                complexity: 'medium',
                sections: 2,
                widgets: 1,
                estimatedRenderTime: 50
            },
            lastUpdated: new Date()
        });

        // Canvas Dashboard
        this.templates.set('canvas-dashboard', {
            id: 'canvas-dashboard',
            name: '🎨 Canvas Dashboard',
            description: 'Real-time monitoring of Obsidian canvas files and vault integration',
            version: new SemanticVersionImpl(1, 0, 0),
            category: 'canvas',
            sections: [
                {
                    id: 'canvas-analytics',
                    title: '📈 Canvas Analytics',
                    type: 'canvas',
                    content: 'Canvas file statistics and node/edge analysis',
                    priority: 1,
                    collapsible: false,
                    version: new SemanticVersionImpl(1, 0, 0)
                },
                {
                    id: 'canvas-health',
                    title: '🏥 Canvas Health Assessment',
                    type: 'canvas',
                    content: 'Health scoring for canvas files and integration status',
                    priority: 2,
                    collapsible: true,
                    version: new SemanticVersionImpl(1, 0, 0)
                }
            ],
            widgets: [
                {
                    id: 'canvas-monitor',
                    type: 'canvas',
                    title: 'Canvas Monitor',
                    dataSource: 'vault://*.canvas',
                    config: { refreshInterval: 300000 },
                    version: new SemanticVersionImpl(1, 0, 0)
                }
            ],
            layout: {
                columns: 2,
                width: 'full',
                responsive: true,
                version: new SemanticVersionImpl(1, 0, 0)
            },
            benchmark: {
                generationTime: 0,
                complexity: 'medium',
                sections: 2,
                widgets: 1,
                estimatedRenderTime: 75
            },
            lastUpdated: new Date()
        });

        // Productivity Dashboard (updated with new fields)
        this.templates.set('productivity-hub', {
            id: 'productivity-hub',
            name: 'Productivity Hub',
            description: 'Comprehensive productivity tracking and task management',
            version: new SemanticVersionImpl(2, 0, 0),
            category: 'productivity',
            sections: [
                {
                    id: 'active-tasks',
                    title: '🎯 Active Tasks',
                    type: 'dataview',
                    content: `
\`\`\`dataview
TABLE 
    status as "Status",
    priority as "Priority",
    project as "Project",
    due as "Due Date"
FROM #task 
WHERE !completed AND !cancelled
SORT priority DESC, due ASC
LIMIT 15
\`\`\`
                    `,
                    priority: 1,
                    collapsible: false,
                    version: new SemanticVersionImpl(2, 0, 0)
                },
                {
                    id: 'time-tracking',
                    title: '⏰ Time Tracking',
                    type: 'metrics',
                    content: `
\`\`\`dataview
TABLE 
    duration as "Time Spent",
    category as "Category",
    efficiency as "Efficiency"
FROM #time-log 
WHERE date >= date(today) - dur(7 days)
SORT date DESC
\`\`\`
                    `,
                    priority: 2,
                    collapsible: true,
                    version: new SemanticVersionImpl(2, 0, 0)
                },
                {
                    id: 'focus-sessions',
                    title: '🧠 Focus Sessions',
                    type: 'dataview',
                    content: `
\`\`\`dataview
LIST rows.file.link
FROM #focus-session 
WHERE date >= date(today) - dur(7 days)
SORT date DESC, duration DESC
\`\`\`
                    `,
                    priority: 3,
                    collapsible: true
                }
            ],
            widgets: [
                {
                    id: 'task-count',
                    type: 'stat',
                    title: 'Active Tasks',
                    dataSource: 'dataview:task-count',
                    config: { icon: '📋', color: 'blue' }
                },
                {
                    id: 'completion-rate',
                    type: 'progress',
                    title: 'Completion Rate',
                    dataSource: 'dataview:completion-rate',
                    config: { target: 80, color: 'green' }
                },
                {
                    id: 'weekly-goals',
                    type: 'progress',
                    title: 'Weekly Goals',
                    dataSource: 'dataview:weekly-goals',
                    config: { target: 100, color: 'purple' }
                }
            ],
            layout: {
                columns: 3,
                width: 'full',
                responsive: true
            }
        });

        // Analytics Dashboard
        this.templates.set('analytics-center', {
            id: 'analytics-center',
            name: 'Analytics Center',
            description: 'Data-driven insights and performance metrics',
            version: new SemanticVersionImpl(1, 0, 0),
            category: 'analytics',
            sections: [
                {
                    id: 'performance-metrics',
                    title: '📊 Performance Metrics',
                    type: 'chart',
                    content: `
\`\`\`dataview
TABLE 
    metric_name as "Metric",
    current_value as "Current",
    previous_value as "Previous",
    change as "Change"
FROM #metrics AND #performance
WHERE date >= date(today) - dur(30 days)
SORT change DESC
\`\`\`
                    `,
                    priority: 1,
                    collapsible: false
                },
                {
                    id: 'trend-analysis',
                    title: '📈 Trend Analysis',
                    type: 'dataview',
                    content: `
\`\`\`dataview
LIST 
    file.link + " (" + trend + ")" as "Trend"
FROM #trend 
WHERE period >= date(today) - dur(90 days)
SORT date DESC
\`\`\`
                    `,
                    priority: 2,
                    collapsible: true
                },
                {
                    id: 'quality-metrics',
                    title: '✅ Quality Metrics',
                    type: 'metrics',
                    content: `
\`\`\`dataview
TABLE 
    completeness as "Complete",
    accuracy as "Accuracy",
    consistency as "Consistency"
FROM #quality 
WHERE date >= date(today) - dur(30 days)
SORT date DESC
\`\`\`
                    `,
                    priority: 3,
                    collapsible: true,
                    version: new SemanticVersionImpl(2, 0, 0)
                }
            ],
            widgets: [
                {
                    id: 'avg-performance',
                    type: 'stat',
                    title: 'Avg Performance',
                    dataSource: 'dataview:avg-performance',
                    config: { icon: '📊', color: 'green' },
                    version: new SemanticVersionImpl(2, 0, 0)
                },
                {
                    id: 'trend-direction',
                    type: 'chart',
                    title: '30-Day Trend',
                    dataSource: 'dataview:30-day-trend',
                    config: { type: 'line', color: 'blue' },
                    version: new SemanticVersionImpl(2, 0, 0)
                },
                {
                    id: 'quality-score',
                    type: 'stat',
                    title: 'Quality Score',
                    dataSource: 'dataview:quality-score',
                    config: { icon: '⭐', color: 'yellow' },
                    version: new SemanticVersionImpl(2, 0, 0)
                }
            ],
            layout: {
                columns: 2,
                width: 'wide',
                responsive: true,
                version: new SemanticVersionImpl(2, 0, 0)
            },
            benchmark: {
                generationTime: 0,
                complexity: 'high',
                sections: 4,
                widgets: 3,
                estimatedRenderTime: 100
            },
            lastUpdated: new Date()
        });

        // Planning Dashboard
        this.templates.set('planning-suite', {
            id: 'planning-suite',
            name: 'Planning Suite',
            description: 'Strategic planning and project management hub',
            category: 'planning',
            sections: [
                {
                    id: 'strategic-objectives',
                    title: '🎯 Strategic Objectives',
                    type: 'dataview',
                    content: `
\`\`\`dataview
TABLE 
    status as "Status",
    progress as "Progress",
    owner as "Owner",
    deadline as "Deadline"
FROM #objective AND #strategic
WHERE deadline >= date(today)
SORT priority DESC, deadline ASC
\`\`\`
                    `,
                    priority: 1,
                    collapsible: false
                },
                {
                    id: 'project-roadmap',
                    title: '🗺️ Project Roadmap',
                    type: 'timeline',
                    content: `
\`\`\`dataview
CALENDAR start_date
FROM #project AND #roadmap
WHERE start_date >= date(today) - dur(30 days)
\`\`\`
                    `,
                    priority: 2,
                    collapsible: true
                },
                {
                    id: 'resource-allocation',
                    title: '👥 Resource Allocation',
                    type: 'dataview',
                    content: `
\`\`\`dataview
TABLE 
    resource as "Resource",
    allocation as "Allocation",
    availability as "Available",
    utilization as "Utilization"
FROM #resource 
WHERE allocation > 0
SORT utilization DESC
\`\`\`
                    `,
                    priority: 3,
                    collapsible: true
                }
            ],
            widgets: [
                {
                    id: 'active-projects',
                    type: 'stat',
                    title: 'Active Projects',
                    dataSource: 'dataview:active-projects',
                    config: { icon: '🚀', color: 'blue' }
                },
                {
                    id: 'quarter-progress',
                    type: 'progress',
                    title: 'Quarter Progress',
                    dataSource: 'dataview:quarter-progress',
                    config: { target: 75, color: 'green' }
                },
                {
                    id: 'upcoming-deadlines',
                    type: 'list',
                    title: 'Upcoming Deadlines',
                    dataSource: 'dataview:upcoming-deadlines',
                    config: { limit: 5, color: 'red' }
                }
            ],
            layout: {
                columns: 2,
                width: 'wide',
                responsive: true
            }
        });

        // Review Dashboard
        this.templates.set('review-center', {
            id: 'review-center',
            name: 'Review Center',
            description: 'Comprehensive review and retrospective analysis',
            category: 'review',
            sections: [
                {
                    id: 'weekly-accomplishments',
                    title: '✅ Weekly Accomplishments',
                    type: 'dataview',
                    content: `
\`\`\`dataview
LIST rows.file.link
FROM #task AND #completed 
WHERE completed >= date(today) - dur(7 days)
SORT completed DESC
\`\`\`
                    `,
                    priority: 1,
                    collapsible: false
                },
                {
                    id: 'retrospective-insights',
                    title: '💡 Retrospective Insights',
                    type: 'markdown',
                    content: `
## What Went Well
- [List achievements and successes]

## What Could Be Improved
- [Identify areas for improvement]

## Action Items
- [Create actionable next steps]

## Lessons Learned
- [Document key takeaways]
                    `,
                    priority: 2,
                    collapsible: true
                },
                {
                    id: 'goal-progress-review',
                    title: '🎯 Goal Progress Review',
                    type: 'dataview',
                    content: `
\`\`\`dataview
TABLE 
    goal as "Goal",
    progress as "Progress",
    status as "Status",
    next_step as "Next Step"
FROM #goal 
WHERE review_date <= date(today)
SORT progress DESC
\`\`\`
                    `,
                    priority: 3,
                    collapsible: true
                }
            ],
            widgets: [
                {
                    id: 'tasks-completed',
                    type: 'stat',
                    title: 'Tasks Completed',
                    dataSource: 'dataview:tasks-completed',
                    config: { icon: '✅', color: 'green' }
                },
                {
                    id: 'goals-achieved',
                    type: 'progress',
                    title: 'Goals Achieved',
                    dataSource: 'dataview:goals-achieved',
                    config: { target: 100, color: 'blue' }
                },
                {
                    id: 'productivity-score',
                    type: 'stat',
                    title: 'Productivity Score',
                    dataSource: 'dataview:productivity-score',
                    config: { icon: '📈', color: 'purple' }
                }
            ],
            layout: {
                columns: 3,
                width: 'full',
                responsive: true
            }
        });
    }

    // =============================================================================
    // TEMPLATE GENERATION METHODS - 2025-11-18
    // =============================================================================

    generateDashboard(templateId: string, variables: Record<string, string> = {}): string {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Generate YAML frontmatter
        const frontmatter = this.generateFrontmatter(template, variables);

        // Generate dashboard header
        const header = this.generateHeader(template, variables);

        // Generate sections
        const sections = template.sections
            .sort((a, b) => a.priority - b.priority)
            .map(section => this.generateSection(section))
            .join('\n\n');

        // Generate widgets
        const widgets = this.generateWidgets(template.widgets);

        // Generate footer
        const footer = this.generateFooter(template, variables);

        return `${frontmatter}\n\n${header}\n\n${widgets}\n\n${sections}\n\n${footer}`;
    }

    private generateFrontmatter(template: DashboardTemplate, variables: Record<string, string>): string {
        const metadata = {
            type: VaultDocumentType.PROJECT_STATUS,
            template: template.id,
            category: template.category,
            created: new Date().toISOString(),
            tags: ['dashboard', template.category, 'dynamic'],
            layout: template.layout,
            ...variables
        };

        const frontmatter = Object.entries(metadata)
            .map(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    return `${key}: ${JSON.stringify(value)}`;
                } else if (typeof value === 'string') {
                    return `${key}: "${value}"`;
                } else {
                    return `${key}: ${value}`;
                }
            })
            .join('\n');

        return `---\n${frontmatter}\n---`;
    }

    private generateHeader(template: DashboardTemplate, variables: Record<string, string>): string {
        const mainHeading = getHeadingTemplate(VaultDocumentType.PROJECT_STATUS)[0];
        const subHeading = getHeadingTemplate(VaultDocumentType.PROJECT_STATUS)[1];

        return `${mainHeading} ${template.name}\n\n${subHeading} ${template.description}\n\n**Generated:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n**Category:** ${template.category}\n**Layout:** ${template.layout.columns} columns`;
    }

    private generateSection(section: DashboardSection): string {
        const heading = getHeadingTemplate(VaultDocumentType.PROJECT_STATUS)[2];
        const collapseIcon = section.collapsible ? '🔽' : '📌';

        return `${collapseIcon} ${heading} ${section.title}\n\n${section.content.trim()}`;
    }

    private generateWidgets(widgets: DashboardWidget[]): string {
        const widgetSection = widgets.map(widget => {
            const icon = this.getWidgetIcon(widget.type);
            return `${icon} **${widget.title}**\n\n> *Widget: ${widget.type}*\n> *Source: ${widget.dataSource}*\n`;
        }).join('\n');

        return `## 📊 Dashboard Widgets\n\n${widgetSection}`;
    }

    private generateFooter(template: DashboardTemplate, variables: Record<string, string>): string {
        return `---\n\n**Dashboard Information:**\n- **Template:** ${template.id} (${template.name})\n- **Sections:** ${template.sections.length}\n- **Widgets:** ${template.widgets.length}\n- **Layout:** ${template.layout.columns} columns, ${template.layout.width} width\n- **Generated:** ${new Date().toISOString()}\n- **Variables:** ${JSON.stringify(variables, null, 2)}`;
    }

    private getWidgetIcon(type: string): string {
        const icons = {
            'stat': '📊',
            'chart': '📈',
            'progress': '🎯',
            'list': '📋',
            'calendar': '📅'
        };
        return icons[type] || '🔧';
    }

    // =============================================================================
    // BATCH GENERATION - 2025-11-18
    // =============================================================================

    async generateAllDashboards(outputDir: string): Promise<string[]> {
        const generatedFiles: string[] = [];
        const timer = createTimer();

        console.log(chalk.blue.bold('📊 Generating Enhanced Dashboard Files...'));

        for (const [templateId, template] of this.templates) {
            try {
                const content = this.generateDashboard(templateId, {
                    generated_by: 'enhanced-dashboard-generator',
                    version: '1.0.0'
                });

                const fileName = `${templateId}-dashboard.md`;
                const filePath = path.join(outputDir, fileName);

                await fs.promises.writeFile(filePath, content, 'utf-8');
                generatedFiles.push(filePath);

                console.log(chalk.green(`✅ Created: ${fileName}`));
                console.log(chalk.gray(`   Sections: ${template.sections.length}, Widgets: ${template.widgets.length}`));

            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Failed to generate ${templateId}:`, error));
            }
        }

        timer.stop();
        console.log(chalk.blue(`\n📈 Generated ${generatedFiles.length} dashboard files in ${timer.formattedDuration}`));

        return generatedFiles;
    }

    getTemplateList(): DashboardTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Get template by ID with benchmarking and version information
     * @param id Template identifier
     * @returns Template with performance metrics or undefined if not found
     */
    getTemplateById(id: string): { template: DashboardTemplate; benchmark: TemplateBenchmark } | undefined {
        const startTime = Bun.nanoseconds();
        const template = this.templates.get(id);
        const endTime = Bun.nanoseconds();

        if (!template) {
            return undefined;
        }

        const generationTime = (endTime - startTime) / 1_000_000;

        const benchmark: TemplateBenchmark = {
            generationTime,
            complexity: template.sections.length > 5 ? 'high' : template.sections.length > 2 ? 'medium' : 'low',
            sections: template.sections.length,
            widgets: template.widgets.length,
            estimatedRenderTime: generationTime * 2.5
        };

        return { template, benchmark };
    }

    /**
     * Get template by ID with version comparison
     * @param id Template identifier
     * @param minimumVersion Minimum required version
     * @returns Template if version requirement is met
     */
    getTemplateByIdWithVersion(id: string, minimumVersion: SemanticVersion): { template: DashboardTemplate; benchmark: TemplateBenchmark } | undefined {
        const result = this.getTemplateById(id);

        if (!result) {
            return undefined;
        }

        const versionComparison = SemanticVersionImpl.compare(result.template.version, minimumVersion);

        if (versionComparison < 0) {
            console.warn(chalk.yellow(`⚠️  Template ${id} version ${result.template.version.toString()} is below minimum required ${minimumVersion.toString()}`));
            return undefined;
        }

        return result;
    }

    /**
     * Get template performance summary
     * @param id Template identifier
     * @returns Performance summary string
     */
    getTemplatePerformanceSummary(id: string): string | undefined {
        const result = this.getTemplateById(id);

        if (!result) {
            console.warn(chalk.yellow(`⚠️  Template ${id} not found`));
            return undefined;
        }

        if (!result.template.version) {
            console.warn(chalk.yellow(`⚠️  Template ${id} version not available`));
            return undefined;
        }

        if (!result.benchmark) {
            console.warn(chalk.yellow(`⚠️  Template ${id} benchmark not available`));
            return undefined;
        }

        const { template, benchmark } = result;
        return `${template.name} v${template.version.toString()} - ${TemplateBenchmarker.formatBenchmark(benchmark)} - ${benchmark.sections} sections, ${benchmark.widgets} widgets`;
    }
}

// =============================================================================
// DEMONSTRATION - 2025-11-18
// =============================================================================

async function demonstrateEnhancedDashboards(): Promise<void> {
    console.log(chalk.magenta.bold('📊 Enhanced Dashboard Templates Demonstration'));
    console.log(chalk.magenta('Advanced dashboard generation with semantic versioning and benchmarking'));
    console.log('');

    const templates = new EnhancedDashboardTemplates();
    const timer = createTimer();

    // Show template overview with enhanced information using Bun tables
    console.log(chalk.blue.bold('📋 Available Dashboard Templates:'));

    const templateList = templates.getTemplateList();

    // Display comprehensive template comparison table
    console.log(BunTableFormatter.formatTemplateTable(templateList));

    // Display category distribution
    const categories = templateList.reduce((acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log(BunTableFormatter.formatCategorySummary(categories));

    // Detailed topics coverage by category
    console.log(chalk.blue.bold('\n🎯 Topic Coverage by Category:'));
    console.log(chalk.gray('━'.repeat(80)));

    const categoryTopics = {
        'environment': [
            '🔧 Environment Configuration',
            '⚙️ System Variables',
            '📊 Real-time Monitoring',
            '🏥 Health Assessment',
            '🌡️ Performance Metrics'
        ],
        'canvas': [
            '📈 Canvas Analytics',
            '🎨 Visual Organization',
            '🔗 Node Relationships',
            '🏥 Integration Health',
            '📊 File Statistics'
        ],
        'productivity': [
            '🎯 Task Management',
            '⏰ Time Tracking',
            '🧠 Focus Sessions',
            '📊 Performance Metrics',
            '✅ Quality Assessment'
        ],
        'analytics': [
            '📊 Performance Metrics',
            '📈 Trend Analysis',
            '✅ Quality Metrics',
            '🎯 KPI Tracking',
            '📋 Data Visualization'
        ],
        'planning': [
            '🎯 Strategic Objectives',
            '🗺️ Project Roadmaps',
            '👥 Resource Allocation',
            '📅 Timeline Management',
            '🎯 Goal Tracking'
        ],
        'review': [
            '✅ Accomplishment Tracking',
            '💡 Retrospective Analysis',
            '🎯 Progress Review',
            '📊 Performance Summary',
            '🔮 Future Planning'
        ]
    };

    Object.entries(categoryTopics).forEach(([category, topics]) => {
        const template = templateList.find(t => t.category === category);
        const version = template?.version?.toString() || 'N/A';

        console.log(chalk.cyan(`\n📂 ${chalk.yellow(category.toUpperCase())} Templates (v${version}):`));
        topics.forEach((topic, index) => {
            const isLast = index === topics.length - 1;
            const prefix = isLast ? '└─' : '├─';
            console.log(chalk.gray(`${prefix} ${topic}`));
        });
    });

    console.log(chalk.gray('━'.repeat(80)));
    console.log(chalk.blue.bold('\n🚀 Advanced Features:'));
    console.log(chalk.white('   • Semantic Versioning (MAJOR.MINOR.PATCH)'));
    console.log(chalk.white('   • Real-time Performance Benchmarking'));
    console.log(chalk.white('   • Dynamic Complexity Assessment'));
    console.log(chalk.white('   • Template Version Validation'));
    console.log(chalk.white('   • Performance Metrics & Analytics'));
    console.log('');

    // Demonstrate enhanced getTemplateById with benchmarking using Bun tables
    console.log(chalk.blue.bold('🔍 Enhanced Template Lookup with Benchmarking:'));

    const testTemplateIds = ['environment-variables', 'canvas-dashboard', 'productivity-hub'];
    const benchmarkResults: Array<{ template: DashboardTemplate; benchmark: TemplateBenchmark }> = [];

    for (const templateId of testTemplateIds) {
        const result = templates.getTemplateById(templateId);

        if (result) {
            benchmarkResults.push(result);
            console.log(chalk.green(`✅ Found: ${result.template.name}`));
            console.log(chalk.gray(`   📋 Version: ${result.template.version?.toString() || 'N/A'}`));
            console.log(chalk.gray(`   ⚡ Lookup Time: ${TemplateBenchmarker.formatBenchmark(result.benchmark)}`));
            console.log(chalk.gray(`   📊 Complexity: ${result.benchmark.complexity}`));
            console.log(chalk.gray(`   🎯 Render Estimate: ${result.benchmark.estimatedRenderTime.toFixed(2)}ms`));
            console.log(chalk.gray(`   📝 ${result.template.sections.length} sections, ${result.template.widgets.length} widgets`));
        } else {
            console.log(chalk.red(`❌ Template not found: ${templateId}`));
        }
        console.log('');
    }

    // Display performance results table
    if (benchmarkResults.length > 0) {
        console.log(BunTableFormatter.formatPerformanceTable(benchmarkResults));
    }

    // Demonstrate version-aware template lookup
    console.log(chalk.blue.bold('🏷️  Semantic Versioning Features:'));

    const minimumVersion = new SemanticVersionImpl(1, 0, 0);
    const versionResult = templates.getTemplateByIdWithVersion('environment-variables', minimumVersion);

    if (versionResult) {
        console.log(chalk.green(`✅ Version requirement satisfied`));
        console.log(chalk.gray(`   Template version: ${versionResult.template.version?.toString() || 'N/A'}`));
        console.log(chalk.gray(`   Minimum required: ${minimumVersion.toString()}`));
    }

    // Test version comparison
    const higherVersion = new SemanticVersionImpl(2, 0, 0);
    const versionFail = templates.getTemplateByIdWithVersion('environment-variables', higherVersion);

    if (!versionFail) {
        console.log(chalk.yellow(`⚠️  Version requirement not met`));
        console.log(chalk.gray(`   Template version: ${versionFail?.template.version?.toString() || 'N/A'}`));
        console.log(chalk.gray(`   Minimum required: ${higherVersion.toString()}`));
    }

    // Show performance summaries
    console.log(chalk.blue.bold('\n📈 Performance Summaries:'));

    for (const templateId of testTemplateIds) {
        const summary = templates.getTemplatePerformanceSummary(templateId);
        if (summary) {
            console.log(chalk.gray(`   📊 ${summary}`));
        }
    }

    timer.stop();
    console.log(chalk.blue(`\n📈 Demonstration completed in ${timer.formattedDuration}`));
}

// =============================================================================
// MAIN EXECUTION - 2025-11-18
// =============================================================================

async function main(): Promise<void> {
    try {
        await demonstrateEnhancedDashboards();

        console.log(chalk.green.bold('\n🎉 Enhanced Dashboard Templates completed!'));
        console.log(chalk.blue('🚀 Semantic versioning and benchmarking integration ready'));

    } catch (error) {
        console.error(chalk.red('❌ Error running enhanced dashboard templates:'), error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.path === Bun.main) {
    main();
}

export { EnhancedDashboardTemplates, DashboardTemplate };
export { main as demonstrateEnhancedDashboards };

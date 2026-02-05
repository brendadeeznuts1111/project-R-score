#!/usr/bin/env bun
/**
 * Workshop Organizer - Systematic File Organization & Utilization Tracking
 * 
 * Automatically organizes workshop files, tracks utilization, and provides recommendations
 * for maintaining a clean, high-value workshop structure.
 */

import { readdir, writeFile, readFile, stat, mkdir, cp } from 'fs/promises';
import { join, dirname, basename, extname, relative } from 'path';

interface WorkshopFile {
    path: string;
    name: string;
    size: number;
    category: FileCategory;
    status: FileStatus;
    lastModified: Date;
    utilizationScore: number;
    priority: Priority;
}

interface OrganizationPlan {
    filesToKeep: WorkshopFile[];
    filesToArchive: WorkshopFile[];
    filesToConsolidate: WorkshopFile[];
    newStructure: DirectoryStructure;
}

enum FileCategory {
    COLOR_INTEGRATION = 'color-integration',
    NETWORK_APIS = 'network-apis',
    DEVELOPMENT_TOOLS = 'development-tools',
    PERFORMANCE_ANALYSIS = 'performance-analysis',
    ARCHIVE = 'archive',
    EXPERIMENTAL = 'experimental'
}

enum FileStatus {
    PRODUCTION_READY = 'production-ready',
    BETA = 'beta',
    EXPERIMENTAL = 'experimental',
    DEPRECATED = 'deprecated',
    ARCHIVED = 'archived'
}

enum Priority {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

interface DirectoryStructure {
    [key: string]: {
        description: string;
        subdirs: string[];
        files: WorkshopFile[];
    };
}

class WorkshopOrganizer {
    private readonly workshopPath: string;
    private readonly canvasDemosPath: string;
    private readonly files: WorkshopFile[] = [];

    constructor(workshopPath: string) {
        this.workshopPath = workshopPath;
        this.canvasDemosPath = join(workshopPath, 'Canvas Demos');
    }

    /**
     * Analyze all workshop files and categorize them
     */
    async analyzeWorkshop(): Promise<void> {
        console.log('🔍 Analyzing workshop structure...');

        const files = await this.scanDirectory(this.canvasDemosPath);

        for (const filePath of files) {
            const file = await this.analyzeFile(filePath);
            this.files.push(file);
        }

        console.log(`📊 Analyzed ${this.files.length} files`);
    }

    /**
     * Scan directory for all files
     */
    private async scanDirectory(dirPath: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = await readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name);

                if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
                    files.push(fullPath);
                } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    files.push(...await this.scanDirectory(fullPath));
                }
            }
        } catch (error) {
            console.warn(`⚠️  Could not read directory ${dirPath}: ${(error as Error).message}`);
        }

        return files;
    }

    /**
     * Analyze individual file and categorize
     */
    private async analyzeFile(filePath: string): Promise<WorkshopFile> {
        const stats = await stat(filePath);
        const fileName = basename(filePath);
        const fileExt = extname(fileName);

        // Determine category based on filename and content
        const category = this.determineCategory(fileName, filePath);

        // Determine status based on content and naming
        const status = this.determineStatus(fileName, filePath);

        // Calculate utilization score based on various factors
        const utilizationScore = await this.calculateUtilizationScore(filePath);

        // Determine priority
        const priority = this.determinePriority(fileName, category, utilizationScore);

        return {
            path: filePath,
            name: fileName,
            size: stats.size,
            category,
            status,
            lastModified: stats.mtime,
            utilizationScore,
            priority
        };
    }

    /**
     * Determine file category based on content and naming
     */
    private determineCategory(fileName: string, filePath: string): FileCategory {
        const lowerName = fileName.toLowerCase();

        // Color integration files
        if (lowerName.includes('hex') || lowerName.includes('color') || lowerName.includes('semantic')) {
            return FileCategory.COLOR_INTEGRATION;
        }

        // Network/API files
        if (lowerName.includes('fetch') || lowerName.includes('dns') || lowerName.includes('udp') ||
            lowerName.includes('network') || lowerName.includes('api')) {
            return FileCategory.NETWORK_APIS;
        }

        // Development tools
        if (lowerName.includes('debug') || lowerName.includes('error') || lowerName.includes('console') ||
            lowerName.includes('inspect') || lowerName.includes('development')) {
            return FileCategory.DEVELOPMENT_TOOLS;
        }

        // Performance analysis
        if (lowerName.includes('performance') || lowerName.includes('heap') || lowerName.includes('memory') ||
            lowerName.includes('optimization') || lowerName.includes('benchmark')) {
            return FileCategory.PERFORMANCE_ANALYSIS;
        }

        // Experimental or deprecated
        if (lowerName.includes('experimental') || lowerName.includes('prototype') ||
            lowerName.includes('deprecated') || lowerName.includes('v1.2.18')) {
            return FileCategory.ARCHIVE;
        }

        // Default to experimental for unknown files
        return FileCategory.EXPERIMENTAL;
    }

    /**
     * Determine file status based on content and naming patterns
     */
    private async determineStatus(fileName: string, filePath: string): Promise<FileStatus> {
        const lowerName = fileName.toLowerCase();

        // Check for deprecated indicators
        if (lowerName.includes('deprecated') || lowerName.includes('v1.2.18') ||
            lowerName.includes('legacy') || lowerName.includes('old')) {
            return FileStatus.DEPRECATED;
        }

        // Check for experimental indicators
        if (lowerName.includes('experimental') || lowerName.includes('prototype') ||
            lowerName.includes('research') || lowerName.includes('test')) {
            return FileStatus.EXPERIMENTAL;
        }

        // Check content for completion indicators
        try {
            const content = await readFile(filePath, 'utf-8');
            if (content.includes('✅ Complete') || content.includes('production-ready') ||
                content.includes('Status: Complete') || content.includes('🏆')) {
                return FileStatus.PRODUCTION_READY;
            }

            if (content.includes('🔄') || content.includes('In Progress') ||
                content.includes('Beta') || content.includes('⚠️')) {
                return FileStatus.BETA;
            }
        } catch (error) {
            // If we can't read the file, assume experimental
            return FileStatus.EXPERIMENTAL;
        }

        // Default to production-ready for documentation files
        return fileName.endsWith('.md') ? FileStatus.PRODUCTION_READY : FileStatus.BETA;
    }

    /**
     * Calculate utilization score based on various factors
     */
    private async calculateUtilizationScore(filePath: string): Promise<number> {
        let score = 50; // Base score

        try {
            const content = await readFile(filePath, 'utf-8');
            const fileName = basename(filePath);

            // Factor 1: File size (larger comprehensive files get higher score)
            if (content.length > 10000) score += 20;
            else if (content.length > 5000) score += 10;
            else if (content.length > 2000) score += 5;

            // Factor 2: Content quality indicators
            if (content.includes('```') && content.includes('```typescript')) score += 15; // Code examples
            if (content.includes('##') && content.includes('###')) score += 10; // Good structure
            if (content.includes('✅') || content.includes('🎯')) score += 10; // Professional formatting

            // Factor 3: Naming quality
            if (fileName.includes('COMPLETE') || fileName.includes('COMPREHENSIVE')) score += 15;
            if (fileName.includes('SUMMARY') || fileName.includes('GUIDE')) score += 10;

            // Factor 4: Recency (more recent files get higher score)
            const stats = await stat(filePath);
            const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceModified < 7) score += 10;
            else if (daysSinceModified < 30) score += 5;

        } catch (error) {
            // If we can't analyze the file, give a low score
            score = 20;
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Determine priority based on category, utilization, and content
     */
    private determinePriority(fileName: string, category: FileCategory, utilizationScore: number): Priority {
        // High utilization files get higher priority
        if (utilizationScore > 80) return Priority.CRITICAL;
        if (utilizationScore > 60) return Priority.HIGH;

        // Core categories get higher priority
        if (category === FileCategory.COLOR_INTEGRATION || category === FileCategory.NETWORK_APIS) {
            return utilizationScore > 40 ? Priority.HIGH : Priority.MEDIUM;
        }

        if (utilizationScore > 40) return Priority.MEDIUM;
        return Priority.LOW;
    }

    /**
     * Generate organization plan
     */
    generateOrganizationPlan(): OrganizationPlan {
        console.log('📋 Generating organization plan...');

        // Sort files by utilization score
        const sortedFiles = [...this.files].sort((a, b) => b.utilizationScore - a.utilizationScore);

        // Top 40% files to keep in active workspace
        const keepCount = Math.ceil(sortedFiles.length * 0.4);
        const filesToKeep = sortedFiles.slice(0, keepCount);

        // Bottom 30% files to archive
        const archiveCount = Math.ceil(sortedFiles.length * 0.3);
        const filesToArchive = sortedFiles.slice(-archiveCount);

        // Middle 30% files to consolidate
        const filesToConsolidate = sortedFiles.slice(keepCount, -archiveCount);

        // Generate new directory structure
        const newStructure = this.generateNewStructure(filesToKeep);

        return {
            filesToKeep,
            filesToArchive,
            filesToConsolidate,
            newStructure
        };
    }

    /**
     * Generate new directory structure
     */
    private generateNewStructure(filesToKeep: WorkshopFile[]): DirectoryStructure {
        const structure: DirectoryStructure = {
            '01-Color-Integration': {
                description: 'Color system features and HEX integration',
                subdirs: ['documentation', 'demos', 'tools', 'examples'],
                files: []
            },
            '02-Network-APIs': {
                description: 'Network operations and API implementations',
                subdirs: ['documentation', 'demos', 'tools', 'examples'],
                files: []
            },
            '03-Development-Tools': {
                description: 'Development utilities and debugging tools',
                subdirs: ['documentation', 'demos', 'tools', 'examples'],
                files: []
            },
            '04-Performance-Analysis': {
                description: 'Performance optimization and analysis tools',
                subdirs: ['documentation', 'demos', 'tools', 'examples'],
                files: []
            }
        };

        // Organize files into appropriate categories
        filesToKeep.forEach(file => {
            const categoryDir = this.getCategoryDirectory(file.category);
            if (structure[categoryDir]) {
                structure[categoryDir].files.push(file);
            }
        });

        return structure;
    }

    /**
     * Get directory name for category
     */
    private getCategoryDirectory(category: FileCategory): string {
        switch (category) {
            case FileCategory.COLOR_INTEGRATION: return '01-Color-Integration';
            case FileCategory.NETWORK_APIS: return '02-Network-APIs';
            case FileCategory.DEVELOPMENT_TOOLS: return '03-Development-Tools';
            case FileCategory.PERFORMANCE_ANALYSIS: return '04-Performance-Analysis';
            default: return '05-Archive';
        }
    }

    /**
     * Generate organization report
     */
    async generateOrganizationReport(): Promise<void> {
        const plan = this.generateOrganizationPlan();

        console.log('\n📊 WORKSHOP ORGANIZATION REPORT');
        console.log('=====================================');

        console.log(`\n📈 Summary:`);
        console.log(`   • Total Files Analyzed: ${this.files.length}`);
        console.log(`   • Files to Keep: ${plan.filesToKeep.length} (${Math.round(plan.filesToKeep.length / this.files.length * 100)}%)`);
        console.log(`   • Files to Archive: ${plan.filesToArchive.length} (${Math.round(plan.filesToArchive.length / this.files.length * 100)}%)`);
        console.log(`   • Files to Consolidate: ${plan.filesToConsolidate.length} (${Math.round(plan.filesToConsolidate.length / this.files.length * 100)}%)`);

        console.log(`\n🎯 High-Value Files to Keep:`);
        plan.filesToKeep.slice(0, 10).forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.name} (${file.category}) - Score: ${file.utilizationScore}`);
        });

        console.log(`\n🗃️ Files to Archive:`);
        plan.filesToArchive.slice(0, 10).forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.name} (${file.category}) - Score: ${file.utilizationScore}`);
        });

        console.log(`\n📁 New Directory Structure:`);
        Object.entries(plan.newStructure).forEach(([dir, info]) => {
            console.log(`   📂 ${dir}/`);
            console.log(`      ${info.description}`);
            console.log(`      Files: ${info.files.length}`);
        });

        // Save detailed report
        await this.saveDetailedReport(plan);
    }

    /**
     * Save detailed organization report
     */
    private async saveDetailedReport(plan: OrganizationPlan): Promise<void> {
        const reportPath = join(this.workshopPath, 'ORGANIZATION_REPORT.md');

        let report = `# 📊 Workshop Organization Report\n\n`;
        report += `**Generated**: ${new Date().toISOString()}\n`;
        report += `**Total Files**: ${this.files.length}\n\n`;

        report += `## 📈 Summary Statistics\n\n`;
        report += `| Category | Keep | Archive | Consolidate |\n`;
        report += `|----------|------|---------|-------------|\n`;

        const categories = [...new Set(this.files.map(f => f.category))];
        categories.forEach(category => {
            const keep = plan.filesToKeep.filter(f => f.category === category).length;
            const archive = plan.filesToArchive.filter(f => f.category === category).length;
            const consolidate = plan.filesToConsolidate.filter(f => f.category === category).length;
            report += `| ${category} | ${keep} | ${archive} | ${consolidate} |\n`;
        });

        report += `\n## 🎯 Files to Keep (High Value)\n\n`;
        plan.filesToKeep.forEach(file => {
            report += `### ${file.name}\n`;
            report += `- **Category**: ${file.category}\n`;
            report += `- **Score**: ${file.utilizationScore}/100\n`;
            report += `- **Priority**: ${file.priority}\n`;
            report += `- **Status**: ${file.status}\n`;
            report += `- **Size**: ${(file.size / 1024).toFixed(1)} KB\n\n`;
        });

        report += `## 🗃️ Files to Archive\n\n`;
        plan.filesToArchive.forEach(file => {
            report += `### ${file.name}\n`;
            report += `- **Category**: ${file.category}\n`;
            report += `- **Score**: ${file.utilizationScore}/100\n`;
            report += `- **Reason**: Low utilization, outdated, or experimental\n\n`;
        });

        await writeFile(reportPath, report);
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }
}

// CLI execution
async function main() {
    const workshopPath = process.argv[2] || join(process.cwd(), '11 - Workshop');

    console.log('🚀 Workshop Organizer Starting...');
    console.log(`📁 Workshop Path: ${workshopPath}`);

    const organizer = new WorkshopOrganizer(workshopPath);

    try {
        await organizer.analyzeWorkshop();
        await organizer.generateOrganizationReport();

        console.log('\n✅ Organization analysis complete!');
        console.log('📋 Review the generated report for detailed recommendations.');

    } catch (error) {
        console.error('❌ Organization analysis failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.main) {
    main().catch(console.error);
}

export { WorkshopOrganizer, FileCategory, FileStatus, Priority };

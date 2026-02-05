#!/usr/bin/env bun

/**
 * 🔗 Link Maintenance System
 * 
 * Automated link maintenance tools for detecting, fixing, and preventing
 * broken internal links across the vault.
 * 
 * @fileoverview Comprehensive link maintenance and auto-updating system
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category validation
 * @tags links, maintenance, auto-fix, references
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, relative, basename, dirname } from 'path';
import { execSync } from 'child_process';

interface LinkReference {
    type: 'wiki' | 'markdown' | 'image';
    original: string;
    target: string;
    display?: string;
    line: number;
    column: number;
    context: string;
}

interface LinkIssue {
    file: string;
    link: LinkReference;
    issue: 'broken' | 'ambiguous' | 'redirected' | 'deprecated';
    suggestion?: string;
    alternatives?: string[];
}

interface FileMapping {
    oldPath: string;
    newPath: string;
    timestamp: Date;
    reason: string;
}

interface LinkMaintenanceReport {
    timestamp: string;
    summary: {
        totalFiles: number;
        totalLinks: number;
        brokenLinks: number;
        fixedLinks: number;
        ambiguousLinks: number;
        deprecatedLinks: number;
    };
    issues: LinkIssue[];
    mappings: FileMapping[];
    recommendations: string[];
}

class LinkMaintenanceSystem {
    private vaultPath: string;
    private fileIndex: Map<string, string> = new Map(); // normalized name -> full path
    private reverseIndex: Map<string, string> = new Map(); // full path -> normalized name
    private mappings: FileMapping[] = [];

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
    }

    async initialize(): Promise<void> {
        console.log('🔗 Initializing link maintenance system...');
        await this.buildFileIndex();
        await this.loadMappings();
    }

    async scanForLinks(): Promise<LinkMaintenanceReport> {
        console.log('🔍 Scanning vault for links...');

        const files = await this.getAllMarkdownFiles();
        const issues: LinkIssue[] = [];
        let totalLinks = 0;

        for (const file of files) {
            const fileIssues = await this.scanFileForIssues(file);
            issues.push(...fileIssues);
            totalLinks += await this.countLinksInFile(file);
        }

        const summary = this.generateSummary(files.length, totalLinks, issues);
        const recommendations = this.generateRecommendations(issues);

        return {
            timestamp: new Date().toISOString(),
            summary,
            issues,
            mappings: this.mappings,
            recommendations
        };
    }

    async fixBrokenLinks(dryRun: boolean = true): Promise<number> {
        console.log(`🔧 ${dryRun ? 'Dry run: ' : ''}Fixing broken links...`);

        const report = await this.scanForLinks();
        const brokenIssues = report.issues.filter(issue => issue.issue === 'broken');

        let fixedCount = 0;

        for (const issue of brokenIssues) {
            if (issue.suggestion) {
                if (!dryRun) {
                    await this.applyFix(issue);
                    fixedCount++;
                } else {
                    console.log(`  📝 Would fix: ${issue.file} -> ${issue.suggestion}`);
                    fixedCount++;
                }
            }
        }

        if (!dryRun && fixedCount > 0) {
            await this.saveMappings();
        }

        return fixedCount;
    }

    async updateLinksAfterFileMove(oldPath: string, newPath: string, reason: string = 'File moved'): Promise<void> {
        console.log(`📁 Updating links after file move: ${oldPath} -> ${newPath}`);

        // Add to mappings
        const mapping: FileMapping = {
            oldPath,
            newPath,
            timestamp: new Date(),
            reason
        };
        this.mappings.push(mapping);

        // Find all files that reference the old path
        const referencingFiles = await this.findFilesReferencing(oldPath);

        for (const file of referencingFiles) {
            await this.updateLinksInFile(file, oldPath, newPath);
        }

        // Update file index
        this.fileIndex.delete(this.normalizePath(oldPath));
        this.reverseIndex.delete(oldPath);
        this.fileIndex.set(this.normalizePath(newPath), newPath);
        this.reverseIndex.set(newPath, this.normalizePath(newPath));

        await this.saveMappings();
    }

    async validateAllLinks(): Promise<LinkMaintenanceReport> {
        console.log('✅ Validating all internal links...');
        return this.scanForLinks();
    }

    private async buildFileIndex(): Promise<void> {
        const files = await this.getAllMarkdownFiles();

        for (const file of files) {
            const normalized = this.normalizePath(file);
            this.fileIndex.set(normalized, file);
            this.reverseIndex.set(file, normalized);

            // Also index by basename for easier lookup
            const baseName = basename(file, '.md');
            this.fileIndex.set(baseName.toLowerCase(), file);
        }

        console.log(`  📚 Indexed ${files.length} files`);
    }

    private async loadMappings(): Promise<void> {
        // Load existing mappings from a JSON file if it exists
        try {
            const mappingsPath = join(this.vaultPath, '.vault', 'link-mappings.json');
            const content = await readFile(mappingsPath, 'utf-8');
            this.mappings = JSON.parse(content);
            console.log(`  📋 Loaded ${this.mappings.length} file mappings`);
        } catch (error) {
            console.log('  📋 No existing mappings found');
            this.mappings = [];
        }
    }

    private async saveMappings(): Promise<void> {
        const vaultDir = join(this.vaultPath, '.vault');
        await this.ensureDirectoryExists(vaultDir);

        const mappingsPath = join(vaultDir, 'link-mappings.json');
        await writeFile(mappingsPath, JSON.stringify(this.mappings, null, 2), 'utf-8');
    }

    private async getAllMarkdownFiles(): Promise<string[]> {
        const files: string[] = [];
        await this.scanDirectory(this.vaultPath, files);
        return files;
    }

    private async scanDirectory(dir: string, files: string[]): Promise<void> {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                await this.scanDirectory(fullPath, files);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    }

    private async scanFileForIssues(filePath: string): Promise<LinkIssue[]> {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const issues: LinkIssue[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineIssues = this.scanLineForIssues(line, i + 1, filePath);
            issues.push(...lineIssues);
        }

        return issues;
    }

    private scanLineForIssues(line: string, lineNumber: number, filePath: string): LinkIssue[] {
        const issues: LinkIssue[] = [];

        // Scan for wiki-style links [[target]]
        const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
        let match;

        while ((match = wikiLinkPattern.exec(line)) !== null) {
            const link: LinkReference = {
                type: 'wiki',
                original: match[0],
                target: match[1],
                line: lineNumber,
                column: match.index + 1,
                context: line.trim()
            };

            const issue = this.analyzeLink(link, filePath);
            if (issue) issues.push(issue);
        }

        // Scan for markdown links [text](target)
        const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

        while ((match = markdownLinkPattern.exec(line)) !== null) {
            const link: LinkReference = {
                type: 'markdown',
                original: match[0],
                target: match[2],
                display: match[1],
                line: lineNumber,
                column: match.index + 1,
                context: line.trim()
            };

            // Only check internal links (not HTTP/HTTPS)
            if (!link.target.startsWith('http')) {
                const issue = this.analyzeLink(link, filePath);
                if (issue) issues.push(issue);
            }
        }

        // Scan for image links ![alt](target)
        const imageLinkPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

        while ((match = imageLinkPattern.exec(line)) !== null) {
            const link: LinkReference = {
                type: 'image',
                original: match[0],
                target: match[2],
                display: match[1],
                line: lineNumber,
                column: match.index + 1,
                context: line.trim()
            };

            const issue = this.analyzeLink(link, filePath);
            if (issue) issues.push(issue);
        }

        return issues;
    }

    private analyzeLink(link: LinkReference, filePath: string): LinkIssue | null {
        const cleanTarget = this.cleanLinkTarget(link.target);

        // Check if target exists
        if (this.linkExists(cleanTarget)) {
            return null; // Link is valid
        }

        // Check for mappings (redirected links)
        const mapping = this.findMapping(cleanTarget);
        if (mapping) {
            return {
                file: filePath,
                link,
                issue: 'redirected',
                suggestion: mapping.newPath,
                alternatives: [mapping.newPath]
            };
        }

        // Find similar files for suggestions
        const alternatives = this.findSimilarFiles(cleanTarget);

        return {
            file: filePath,
            link,
            issue: 'broken',
            suggestion: alternatives.length > 0 ? alternatives[0] : undefined,
            alternatives
        };
    }

    private cleanLinkTarget(target: string): string {
        // Remove anchor links, display text, and normalize
        return target
            .split('#')[0] // Remove anchor
            .split('|')[0] // Remove display text
            .replace(/\.(md|canvas)$/, '') // Remove extension
            .trim();
    }

    private linkExists(target: string): boolean {
        // Check exact match
        if (this.fileIndex.has(target)) {
            return true;
        }

        // Check with .md extension
        if (this.fileIndex.has(target + '.md')) {
            return true;
        }

        // Check by filename
        const filename = target.split('/').pop();
        if (filename && this.fileIndex.has(filename.toLowerCase())) {
            return true;
        }

        return false;
    }

    private findMapping(target: string): FileMapping | undefined {
        return this.mappings.find(mapping =>
            this.normalizePath(mapping.oldPath) === target ||
            basename(mapping.oldPath, '.md') === target
        );
    }

    private findSimilarFiles(target: string): string[] {
        const similar: string[] = [];
        const targetLower = target.toLowerCase();

        for (const [normalized, fullPath] of this.fileIndex) {
            // Calculate similarity score
            if (normalized.toLowerCase().includes(targetLower) ||
                targetLower.includes(normalized.toLowerCase())) {
                similar.push(fullPath);
            }
        }

        // Sort by similarity (simple heuristic)
        return similar.slice(0, 5);
    }

    private async countLinksInFile(filePath: string): Promise<number> {
        const content = await readFile(filePath, 'utf-8');
        const wikiLinks = (content.match(/\[\[[^\]]+\]\]/g) || []).length;
        const markdownLinks = (content.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
        const imageLinks = (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;

        return wikiLinks + markdownLinks + imageLinks;
    }

    private async findFilesReferencing(targetPath: string): Promise<string[]> {
        const files = await this.getAllMarkdownFiles();
        const referencing: string[] = [];
        const targetName = basename(targetPath, '.md');

        for (const file of files) {
            const content = await readFile(file, 'utf-8');

            // Check for any reference to the target
            if (content.includes(targetName) ||
                content.includes(targetPath) ||
                content.includes(`[[${targetName}`)) {
                referencing.push(file);
            }
        }

        return referencing;
    }

    private async updateLinksInFile(filePath: string, oldTarget: string, newTarget: string): Promise<void> {
        const content = await readFile(filePath, 'utf-8');
        let updated = content;

        // Update wiki-style links
        updated = updated.replace(
            new RegExp(`\\[\\[${this.escapeRegex(oldTarget)}[^\\]]*\\]\\]`, 'g'),
            `[[${newTarget}]]`
        );

        // Update markdown links
        updated = updated.replace(
            new RegExp(`\\[([^\\]]+)\\]\\(${this.escapeRegex(oldTarget)}[^)]*\\)`, 'g'),
            `[$1](${newTarget})`
        );

        // Update image links
        updated = updated.replace(
            new RegExp(`!\\[[^\\]]*\\]\\(${this.escapeRegex(oldTarget)}[^)]*\\)`, 'g'),
            `![${basename(newTarget)}](${newTarget})`
        );

        if (updated !== content) {
            await writeFile(filePath, updated, 'utf-8');
            console.log(`  ✅ Updated links in ${filePath}`);
        }
    }

    private async applyFix(issue: LinkIssue): Promise<void> {
        if (!issue.suggestion) return;

        const content = await readFile(issue.file, 'utf-8');
        const lines = content.split('\n');
        const targetLine = lines[issue.link.line - 1];

        // Replace the broken link with the suggestion
        const updatedLine = targetLine.replace(
            issue.link.original,
            issue.link.original.replace(issue.link.target, issue.suggestion)
        );

        lines[issue.link.line - 1] = updatedLine;
        await writeFile(issue.file, lines.join('\n'), 'utf-8');
    }

    private normalizePath(path: string): string {
        return path
            .replace(/\\/g, '/') // Normalize separators
            .toLowerCase()
            .replace(/\.md$/, ''); // Remove extension
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private generateSummary(totalFiles: number, totalLinks: number, issues: LinkIssue[]) {
        const broken = issues.filter(i => i.issue === 'broken').length;
        const fixed = issues.filter(i => i.issue === 'redirected').length;
        const ambiguous = issues.filter(i => i.issue === 'ambiguous').length;
        const deprecated = issues.filter(i => i.issue === 'deprecated').length;

        return {
            totalFiles,
            totalLinks,
            brokenLinks: broken,
            fixedLinks: fixed,
            ambiguousLinks: ambiguous,
            deprecatedLinks: deprecated
        };
    }

    private generateRecommendations(issues: LinkIssue[]): string[] {
        const recommendations: string[] = [];

        const brokenCount = issues.filter(i => i.issue === 'broken').length;
        const redirectedCount = issues.filter(i => i.issue === 'redirected').length;

        if (brokenCount > 0) {
            recommendations.push(`Fix ${brokenCount} broken links using auto-fix or manual updates`);
        }

        if (redirectedCount > 0) {
            recommendations.push(`Update ${redirectedCount} redirected links to new file locations`);
        }

        if (issues.length > 100) {
            recommendations.push('Consider implementing regular link validation schedule');
        }

        return recommendations;
    }

    private async ensureDirectoryExists(dir: string): Promise<void> {
        try {
            await execSync(`mkdir -p "${dir}"`);
        } catch (error) {
            // Directory might already exist
        }
    }
}

// CLI Interface
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = args[0] || process.cwd();

    if (args.includes('--help') || args.includes('-h')) {
        console.log('🔗 Link Maintenance System');
        console.log('Usage: bun link-maintenance.ts [vault-path] [options]');
        console.log('\nOptions:');
        console.log('  --help, -h              Show this help message');
        console.log('  --scan                  Scan for link issues');
        console.log('  --fix                   Fix broken links (dry run by default)');
        console.log('  --apply                 Actually apply fixes (not dry run)');
        console.log('  --validate              Validate all links');
        console.log('  --update <old> <new>    Update links after file move');
        process.exit(0);
    }

    try {
        const linkSystem = new LinkMaintenanceSystem(vaultPath);
        await linkSystem.initialize();

        if (args.includes('--scan')) {
            const report = await linkSystem.scanForLinks();
            console.log('\n📊 Scan Results:');
            console.log(`  Total Files: ${report.summary.totalFiles}`);
            console.log(`  Total Links: ${report.summary.totalLinks}`);
            console.log(`  Broken Links: ${report.summary.brokenLinks}`);
            console.log(`  Redirected Links: ${report.summary.fixedLinks}`);

            if (report.issues.length > 0) {
                console.log('\n🔍 Issues Found:');
                report.issues.slice(0, 10).forEach(issue => {
                    console.log(`  ${issue.issue === 'broken' ? '❌' : '⚠️'} ${issue.file}: ${issue.link.original}`);
                });

                if (report.issues.length > 10) {
                    console.log(`  ... and ${report.issues.length - 10} more`);
                }
            }
        } else if (args.includes('--fix')) {
            const dryRun = !args.includes('--apply');
            const fixedCount = await linkSystem.fixBrokenLinks(dryRun);
            console.log(`\n${dryRun ? '🔍 Dry run: ' : '✅ '}Fixed ${fixedCount} links`);
        } else if (args.includes('--validate')) {
            const report = await linkSystem.validateAllLinks();
            console.log('\n✅ Validation Complete');
            console.log(`  Compliance: ${((report.summary.totalLinks - report.summary.brokenLinks) / report.summary.totalLinks * 100).toFixed(1)}%`);
        } else if (args.includes('--update')) {
            const updateIndex = args.indexOf('--update');
            const oldPath = args[updateIndex + 1];
            const newPath = args[updateIndex + 2];

            if (!oldPath || !newPath) {
                console.error('❌ Please provide old and new paths: --update <old> <new>');
                process.exit(1);
            }

            await linkSystem.updateLinksAfterFileMove(oldPath, newPath);
            console.log('✅ Links updated successfully');
        } else {
            console.log('Use --help to see available options');
        }

    } catch (error) {
        console.error('❌ Link maintenance failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { LinkMaintenanceSystem, LinkMaintenanceReport, LinkIssue };

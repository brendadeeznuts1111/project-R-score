#!/usr/bin/env bun

/**
 * 🔧 Bulk Link Fixer
 * 
 * Systematic tool for fixing large numbers of broken links across the vault.
 * Designed to handle the 1,200+ broken links identified in the validation report.
 * 
 * @fileoverview Bulk link fixing with intelligent matching and batch processing
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category validation
 * @tags links, bulk-fix, automation, repair
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, basename, dirname, relative } from 'path';

interface LinkFix {
    filePath: string;
    lineNumber: number;
    originalLink: string;
    fixedLink: string;
    confidence: number;
    reason: string;
}

interface BatchFixResult {
    totalLinks: number;
    fixedLinks: number;
    skippedLinks: number;
    errors: number;
    fixes: LinkFix[];
}

interface FileMapping {
    oldName: string;
    newName: string;
    filePath: string;
    confidence: number;
}

class BulkLinkFixer {
    private vaultPath: string;
    private fileIndex: Map<string, string> = new Map();
    private templateMappings: Map<string, string> = new Map();
    private renamedFiles: FileMapping[] = [];

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.initializeTemplateMappings();
    }

    async initialize(): Promise<void> {
        console.log('🔧 Initializing bulk link fixer...');
        await this.buildFileIndex();
        await this.detectRenamedFiles();
    }

    async fixAllLinks(options: {
        dryRun?: boolean;
        confidenceThreshold?: number;
        batchSize?: number;
    } = {}): Promise<BatchFixResult> {
        const {
            dryRun = true,
            confidenceThreshold = 0.7,
            batchSize = 50
        } = options;

        console.log(`🔧 Starting bulk link fix (${dryRun ? 'dry run' : 'live'})...`);
        console.log(`  📊 Confidence threshold: ${(confidenceThreshold * 100).toFixed(0)}%`);
        console.log(`  📦 Batch size: ${batchSize}`);

        const allFiles = await this.getAllMarkdownFiles();
        const result: BatchFixResult = {
            totalLinks: 0,
            fixedLinks: 0,
            skippedLinks: 0,
            errors: 0,
            fixes: []
        };

        // Process files in batches
        for (let i = 0; i < allFiles.length; i += batchSize) {
            const batch = allFiles.slice(i, i + batchSize);
            console.log(`  📂 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allFiles.length / batchSize)}`);

            const batchResult = await this.processBatch(batch, confidenceThreshold, dryRun);

            result.totalLinks += batchResult.totalLinks;
            result.fixedLinks += batchResult.fixedLinks;
            result.skippedLinks += batchResult.skippedLinks;
            result.errors += batchResult.errors;
            result.fixes.push(...batchResult.fixes);

            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return result;
    }

    async generateFixReport(result: BatchFixResult): Promise<string> {
        const timestamp = new Date().toLocaleString();

        let report = `# 🔧 Bulk Link Fix Report - ${timestamp}

## 📊 Summary
- **Total Links Processed**: ${result.totalLinks}
- **Links Fixed**: ${result.fixedLinks}
- **Links Skipped**: ${result.skippedLinks}
- **Errors**: ${result.errors}
- **Success Rate**: ${result.totalLinks > 0 ? ((result.fixedLinks / result.totalLinks) * 100).toFixed(1) : 0}%

`;

        if (result.fixedLinks > 0) {
            report += `## ✅ Applied Fixes (${result.fixedLinks})

| File | Line | Original | Fixed | Confidence | Reason |
|------|------|----------|-------|-------------|--------|
`;

            for (const fix of result.fixes.slice(0, 100)) { // Limit to first 100 for readability
                const relativePath = relative(this.vaultPath, fix.filePath);
                report += `| ${relativePath} | ${fix.lineNumber} | \`${fix.originalLink}\` | \`${fix.fixedLink}\` | ${(fix.confidence * 100).toFixed(0)}% | ${fix.reason} |\n`;
            }

            if (result.fixes.length > 100) {
                report += `| ... | ... | ... | ... | ... | ... |\n`;
                report += `| *${result.fixes.length - 100} more fixes* | | | | | |\n`;
            }
            report += '\n';
        }

        if (result.skippedLinks > 0) {
            report += `## ⚠️ Skipped Links (${result.skippedLinks})\n\n`;
            report += `Links were skipped due to low confidence scores or ambiguous matches.\n`;
            report += `Run with lower confidence threshold to attempt more fixes.\n\n`;
        }

        if (result.errors > 0) {
            report += `## ❌ Errors (${result.errors})\n\n`;
            report += `Some links could not be processed due to file access errors or formatting issues.\n\n`;
        }

        report += `## 🎯 Recommendations\n\n`;

        if (result.skippedLinks > 0) {
            report += `- Consider running with lower confidence threshold to fix more links\n`;
        }

        if (result.errors > 0) {
            report += `- Investigate file access errors and permissions\n`;
        }

        if (result.fixedLinks > 0) {
            report += `- Run validation again to verify all fixes were applied correctly\n`;
            report += `- Update any remaining manual links that couldn't be auto-fixed\n`;
        }

        report += `- Schedule regular link maintenance to prevent future issues\n\n`;

        report += `## 📈 Template Mappings Applied\n\n`;
        for (const [oldName, newName] of this.templateMappings) {
            report += `- \`${oldName}\` → \`${newName}\`\n`;
        }

        return report;
    }

    private async buildFileIndex(): Promise<void> {
        const files = await this.getAllMarkdownFiles();

        for (const file of files) {
            const relativePath = relative(this.vaultPath, file);
            const fileName = basename(file, '.md');

            // Index by full path
            this.fileIndex.set(relativePath, file);

            // Index by filename
            this.fileIndex.set(fileName.toLowerCase(), file);

            // Index by basename without special characters
            const cleanName = fileName.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
            if (cleanName !== fileName.toLowerCase()) {
                this.fileIndex.set(cleanName, file);
            }
        }

        console.log(`  📚 Indexed ${files.length} files`);
    }

    private initializeTemplateMappings(): void {
        // Based on the template renames we did earlier
        this.templateMappings.set('Template-System-Excellence-Complete-Success', 'Template System Excellence Template');
        this.templateMappings.set('Template-System-Review-Comprehensive-Analysis', 'Template System Review Template');
        this.templateMappings.set('Template-System-Optimization-Complete-Success', 'Template System Optimization Template');
        this.templateMappings.set('00 - Tasks Plugin Integration And Enhancement', 'Tasks Plugin Integration Template');
        this.templateMappings.set('Bun-Utilities-Mastery-Complete-Integration-Guide', 'Bun Utilities Mastery Template');
        this.templateMappings.set('Bun-Utilities-Mastery-Ultimate-Achievement-Summary', 'Bun Utilities Achievement Template');
        this.templateMappings.set('09 - Dynamic Project Template With Script Integration', 'Dynamic Project Template');
        this.templateMappings.set('01 - Templates Organization Summary', 'Templates Organization Template');
        this.templateMappings.set('05 - Webpage HTML Export Configuration Guide', 'Webpage HTML Export Template');
        this.templateMappings.set('08 - Enhanced Semver With Bun Semver Order', 'Enhanced Semver Template');
        this.templateMappings.set('04 - Advanced Templater Configuration', 'Advanced Templater Template');
        this.templateMappings.set('07 - Bun Native Enhanced Template With Performance Metrics', 'Bun Native Enhanced Template');
        this.templateMappings.set('02 - Template Index', 'Template Index Template');
        this.templateMappings.set('📚-Template-Library-Master-Collection', 'Template Library Master Template');
        this.templateMappings.set('Analytics-Dashboard-Template', 'Analytics Dashboard Template');
        this.templateMappings.set('03 - Template Index Quick Navigation', 'Template Index Navigation Template');
        this.templateMappings.set('06 - Registry Aware Template With Version Management', 'Registry Aware Template');
        this.templateMappings.set('Research-Notebook-Template', 'Research Notebook Template');

        console.log(`  📋 Loaded ${this.templateMappings.size} template mappings`);
    }

    private async detectRenamedFiles(): Promise<void> {
        // This would detect files that have been renamed but links still point to old names
        // For now, we'll use the template mappings we know about

        for (const [oldName, newName] of this.templateMappings) {
            const newFilePath = this.findFileByName(newName);
            if (newFilePath) {
                this.renamedFiles.push({
                    oldName,
                    newName,
                    filePath: newFilePath,
                    confidence: 1.0
                });
            }
        }

        console.log(`  🔄 Detected ${this.renamedFiles.length} renamed files`);
    }

    private async processBatch(files: string[], confidenceThreshold: number, dryRun: boolean): Promise<BatchFixResult> {
        const result: BatchFixResult = {
            totalLinks: 0,
            fixedLinks: 0,
            skippedLinks: 0,
            errors: 0,
            fixes: []
        };

        for (const file of files) {
            try {
                const fileResult = await this.processFile(file, confidenceThreshold, dryRun);

                result.totalLinks += fileResult.totalLinks;
                result.fixedLinks += fileResult.fixedLinks;
                result.skippedLinks += fileResult.skippedLinks;
                result.errors += fileResult.errors;
                result.fixes.push(...fileResult.fixes);

            } catch (error) {
                console.error(`  ❌ Error processing ${file}:`, error);
                result.errors++;
            }
        }

        return result;
    }

    private async processFile(filePath: string, confidenceThreshold: number, dryRun: boolean): Promise<BatchFixResult> {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        const result: BatchFixResult = {
            totalLinks: 0,
            fixedLinks: 0,
            skippedLinks: 0,
            errors: 0,
            fixes: []
        };

        const fixes: LinkFix[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineFixes = this.findFixesInLine(line, i + 1, filePath);

            result.totalLinks += lineFixes.length;

            for (const fix of lineFixes) {
                if (fix.confidence >= confidenceThreshold) {
                    fixes.push(fix);
                    result.fixedLinks++;
                } else {
                    result.skippedLinks++;
                }
            }
        }

        // Apply fixes if not dry run
        if (!dryRun && fixes.length > 0) {
            await this.applyFixes(filePath, lines, fixes);
        }

        result.fixes = fixes;
        return result;
    }

    private findFixesInLine(line: string, lineNumber: number, filePath: string): LinkFix[] {
        const fixes: LinkFix[] = [];

        // Find wiki-style links
        const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
        let match;

        while ((match = wikiLinkPattern.exec(line)) !== null) {
            const target = match[1];
            const fix = this.findFixForLink(target, 'wiki', lineNumber, match[0]);
            if (fix) {
                fixes.push(fix);
            }
        }

        // Find markdown links
        const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

        while ((match = markdownLinkPattern.exec(line)) !== null) {
            const target = match[2];
            if (!target.startsWith('http')) { // Only internal links
                const fix = this.findFixForLink(target, 'markdown', lineNumber, match[0]);
                if (fix) {
                    fixes.push(fix);
                }
            }
        }

        return fixes;
    }

    private findFixForLink(target: string, type: string, lineNumber: number, originalLink: string): LinkFix | null {
        const cleanTarget = this.cleanLinkTarget(target);

        // Check template mappings first (highest confidence)
        if (this.templateMappings.has(cleanTarget)) {
            const newName = this.templateMappings.get(cleanTarget)!;
            return {
                filePath: '', // Will be set by caller
                lineNumber,
                originalLink,
                fixedLink: originalLink.replace(target, newName),
                confidence: 1.0,
                reason: 'Template renamed according to naming convention'
            };
        }

        // Check for exact file matches
        const exactMatch = this.fileIndex.get(cleanTarget + '.md') || this.fileIndex.get(cleanTarget);
        if (exactMatch) {
            const relativePath = relative(this.vaultPath, exactMatch);
            return {
                filePath: '',
                lineNumber,
                originalLink,
                fixedLink: originalLink.replace(target, relativePath),
                confidence: 0.95,
                reason: 'Exact file match found'
            };
        }

        // Check for similar files
        const similarFile = this.findSimilarFile(cleanTarget);
        if (similarFile) {
            const relativePath = relative(this.vaultPath, similarFile.filePath);
            return {
                filePath: '',
                lineNumber,
                originalLink,
                fixedLink: originalLink.replace(target, relativePath),
                confidence: similarFile.confidence,
                reason: `Similar file match (${similarFile.confidence * 100}% confidence)`
            };
        }

        return null;
    }

    private cleanLinkTarget(target: string): string {
        return target
            .split('#')[0] // Remove anchor
            .split('|')[0] // Remove display text
            .replace(/\.md$/, '') // Remove extension
            .trim();
    }

    private findSimilarFile(target: string): { filePath: string; confidence: number } | null {
        let bestMatch: { filePath: string; confidence: number } | null = null;
        const targetLower = target.toLowerCase();

        for (const [key, filePath] of this.fileIndex) {
            const keyLower = key.toLowerCase();

            // Calculate similarity score
            let confidence = 0;

            if (keyLower === targetLower) {
                confidence = 1.0;
            } else if (keyLower.includes(targetLower) || targetLower.includes(keyLower)) {
                confidence = 0.8;
            } else if (this.calculateStringSimilarity(keyLower, targetLower) > 0.7) {
                confidence = this.calculateStringSimilarity(keyLower, targetLower);
            }

            if (confidence > 0.6 && (!bestMatch || confidence > bestMatch.confidence)) {
                bestMatch = { filePath, confidence };
            }
        }

        return bestMatch;
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        // Simple Levenshtein distance based similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private async applyFixes(filePath: string, lines: string[], fixes: LinkFix[]): Promise<void> {
        // Sort fixes by line number in reverse order to avoid offset issues
        fixes.sort((a, b) => b.lineNumber - a.lineNumber);

        for (const fix of fixes) {
            const lineIndex = fix.lineNumber - 1;
            if (lineIndex >= 0 && lineIndex < lines.length) {
                lines[lineIndex] = lines[lineIndex].replace(fix.originalLink, fix.fixedLink);
            }
        }

        await writeFile(filePath, lines.join('\n'), 'utf-8');
    }

    private findFileByName(name: string): string | null {
        // Try different variations
        const variations = [
            name,
            name + '.md',
            name.toLowerCase(),
            name.toLowerCase() + '.md'
        ];

        for (const variation of variations) {
            if (this.fileIndex.has(variation)) {
                return this.fileIndex.get(variation)!;
            }
        }

        return null;
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
}

// CLI Interface
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = args[0] || process.cwd();

    if (args.includes('--help') || args.includes('-h')) {
        console.log('🔧 Bulk Link Fixer');
        console.log('Usage: bun bulk-link-fixer.ts [vault-path] [options]');
        console.log('\nOptions:');
        console.log('  --help, -h              Show this help message');
        console.log('  --apply                 Actually apply fixes (not dry run)');
        console.log('  --confidence <number>   Set confidence threshold (0.0-1.0, default: 0.7)');
        console.log('  --batch-size <number>   Set batch size (default: 50)');
        console.log('  --report                Generate detailed report');
        process.exit(0);
    }

    try {
        const fixer = new BulkLinkFixer(vaultPath);
        await fixer.initialize();

        const options = {
            dryRun: !args.includes('--apply'),
            confidenceThreshold: 0.7,
            batchSize: 50
        };

        // Parse confidence threshold
        const confidenceIndex = args.indexOf('--confidence');
        if (confidenceIndex !== -1 && args[confidenceIndex + 1]) {
            options.confidenceThreshold = parseFloat(args[confidenceIndex + 1]);
        }

        // Parse batch size
        const batchSizeIndex = args.indexOf('--batch-size');
        if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
            options.batchSize = parseInt(args[batchSizeIndex + 1]);
        }

        console.log(`🚀 Starting bulk link fix with ${(options.dryRun ? 'dry run' : 'live')} mode`);

        const result = await fixer.fixAllLinks(options);

        console.log('\n📊 Results:');
        console.log(`  Total Links: ${result.totalLinks}`);
        console.log(`  Fixed: ${result.fixedLinks}`);
        console.log(`  Skipped: ${result.skippedLinks}`);
        console.log(`  Errors: ${result.errors}`);
        console.log(`  Success Rate: ${result.totalLinks > 0 ? ((result.fixedLinks / result.totalLinks) * 100).toFixed(1) : 0}%`);

        if (args.includes('--report')) {
            const report = await fixer.generateFixReport(result);
            const reportPath = join(vaultPath, `bulk-link-fix-report-${Date.now()}.md`);
            await writeFile(reportPath, report, 'utf-8');
            console.log(`\n📄 Report saved to: ${reportPath}`);
        }

        if (!options.dryRun && result.fixedLinks > 0) {
            console.log('\n✅ Fixes applied successfully!');
            console.log('💡 Run validation again to verify the results');
        }

    } catch (error) {
        console.error('❌ Bulk link fix failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { BulkLinkFixer, BatchFixResult, LinkFix };

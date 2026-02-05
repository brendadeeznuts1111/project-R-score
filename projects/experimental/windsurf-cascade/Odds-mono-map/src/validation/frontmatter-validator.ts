#!/usr/bin/env bun
/**
 * Frontmatter and Code Block Validator
 * Validates YAML frontmatter and code block compliance across markdown files
 * 
 * @fileoverview Comprehensive validation of documentation standards
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { glob } from 'glob';

// Validation result interfaces
interface ValidationError {
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

interface FrontmatterValidationResult {
    isValid: boolean;
    hasFrontmatter: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    missingFields: string[];
    presentFields: string[];
}

interface CodeBlockValidationResult {
    isValid: boolean;
    totalBlocks: number;
    compliantBlocks: number;
    nonCompliantBlocks: number;
    errors: ValidationError[];
    warnings: ValidationError[];
}

interface FileValidationResult {
    filePath: string;
    frontmatter: FrontmatterValidationResult;
    codeBlocks: CodeBlockValidationResult;
    overallCompliance: number;
}

interface ProjectValidationResult {
    totalFiles: number;
    compliantFiles: number;
    nonCompliantFiles: number;
    overallCompliance: number;
    results: FileValidationResult[];
    summary: {
        frontmatterCompliance: number;
        codeBlockCompliance: number;
        commonIssues: Array<{ issue: string; count: number }>;
    };
}

// Required frontmatter fields
const REQUIRED_FRONTMATTER_FIELDS = [
    'type',
    'title',
    'version',
    'category',
    'priority',
    'status',
    'tags',
    'created',
    'updated',
    'author',
    'validation_rules'
];

// Optional but recommended fields
const RECOMMENDED_FRONTMATTER_FIELDS = [
    'template_version',
    'description'
];

// Valid code block languages
const VALID_CODE_LANGUAGES = [
    'typescript', 'javascript', 'ts', 'js',
    'bash', 'shell', 'sh',
    'json', 'yaml', 'yml', 'toml',
    'markdown', 'md',
    'python', 'py',
    'sql',
    'html', 'css', 'scss',
    'xml', 'svg',
    'dockerfile', 'docker',
    'gitignore',
    'txt', 'text'
];

class FrontmatterValidator {
    /**
     * Validates YAML frontmatter in markdown content
     */
    static validateFrontmatter(content: string): FrontmatterValidationResult {
        const result: FrontmatterValidationResult = {
            isValid: true,
            hasFrontmatter: false,
            errors: [],
            warnings: [],
            missingFields: [],
            presentFields: []
        };

        const lines = content.split('\n');

        // Check for YAML delimiters
        const firstLine = lines[0]?.trim();
        const hasYamlStart = firstLine === '---';

        if (!hasYamlStart) {
            result.errors.push({
                line: 1,
                message: 'Missing YAML frontmatter delimiter (---)',
                severity: 'error'
            });
            result.isValid = false;
            return result;
        }

        // Find end delimiter
        let yamlEndIndex = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i]?.trim() === '---') {
                yamlEndIndex = i;
                break;
            }
        }

        if (yamlEndIndex === -1) {
            result.errors.push({
                line: 1,
                message: 'Missing YAML frontmatter closing delimiter (---)',
                severity: 'error'
            });
            result.isValid = false;
            return result;
        }

        result.hasFrontmatter = true;

        // Parse frontmatter content
        const frontmatterLines = lines.slice(1, yamlEndIndex);
        const frontmatterContent = frontmatterLines.join('\n');

        // Extract fields
        const fields = this.extractFrontmatterFields(frontmatterContent);
        result.presentFields = Object.keys(fields);

        // Check required fields
        for (const field of REQUIRED_FRONTMATTER_FIELDS) {
            if (!fields[field]) {
                result.missingFields.push(field);
                result.errors.push({
                    line: 1,
                    message: `Missing required frontmatter field: ${field}`,
                    severity: 'error'
                });
                result.isValid = false;
            }
        }

        // Check recommended fields
        for (const field of RECOMMENDED_FRONTMATTER_FIELDS) {
            if (!fields[field]) {
                result.warnings.push({
                    line: 1,
                    message: `Missing recommended frontmatter field: ${field}`,
                    severity: 'warning'
                });
            }
        }

        // Validate field formats
        this.validateFieldFormats(fields, result);

        return result;
    }

    /**
     * Extracts fields from frontmatter content
     */
    private static extractFrontmatterFields(content: string): Record<string, any> {
        const fields: Record<string, any> = {};
        const lines = content.split('\n');
        let currentKey = '';
        let inArray = false;
        let arrayValues: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Array values
            if (trimmed.startsWith('- ') && currentKey) {
                inArray = true;
                arrayValues.push(trimmed.substring(2).trim());
                continue;
            }

            // End of array
            if (inArray && !trimmed.startsWith('- ')) {
                fields[currentKey] = arrayValues;
                arrayValues = [];
                inArray = false;
                currentKey = '';
            }

            // Key-value pairs
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                currentKey = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();

                if (value) {
                    // Remove quotes if present
                    const cleanValue = value.replace(/^["']|["']$/g, '');
                    fields[currentKey] = cleanValue;
                }
            }
        }

        // Handle array at end of content
        if (inArray && currentKey) {
            fields[currentKey] = arrayValues;
        }

        return fields;
    }

    /**
     * Validates specific field formats
     */
    private static validateFieldFormats(fields: Record<string, any>, result: FrontmatterValidationResult): void {
        // Validate version format (semver)
        if (fields.version) {
            const semverRegex = /^\d+\.\d+\.\d+$/;
            if (!semverRegex.test(fields.version.replace(/^["']|["']$/g, ''))) {
                result.errors.push({
                    line: 1,
                    message: `Invalid version format: ${fields.version}. Expected semantic version (x.y.z)`,
                    severity: 'error'
                });
                result.isValid = false;
            }
        }

        // Validate timestamp format (ISO-8601)
        ['created', 'updated'].forEach(field => {
            if (fields[field]) {
                const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
                if (!isoRegex.test(fields[field])) {
                    result.errors.push({
                        line: 1,
                        message: `Invalid ${field} format: ${fields[field]}. Expected ISO-8601 format (YYYY-MM-DDTHH:MM:SSZ)`,
                        severity: 'error'
                    });
                    result.isValid = false;
                }
            }
        });

        // Validate priority
        if (fields.priority) {
            const validPriorities = ['low', 'medium', 'high', 'critical'];
            if (!validPriorities.includes(fields.priority)) {
                result.errors.push({
                    line: 1,
                    message: `Invalid priority: ${fields.priority}. Must be one of: ${validPriorities.join(', ')}`,
                    severity: 'error'
                });
                result.isValid = false;
            }
        }

        // Validate status
        if (fields.status) {
            const validStatuses = ['draft', 'active', 'completed', 'deprecated'];
            if (!validStatuses.includes(fields.status)) {
                result.errors.push({
                    line: 1,
                    message: `Invalid status: ${fields.status}. Must be one of: ${validStatuses.join(', ')}`,
                    severity: 'error'
                });
                result.isValid = false;
            }
        }

        // Validate tags array
        if (fields.tags && !Array.isArray(fields.tags)) {
            result.warnings.push({
                line: 1,
                message: 'Tags field should be an array',
                severity: 'warning'
            });
        }
    }
}

class CodeBlockValidator {
    /**
     * Validates code blocks in markdown content
     */
    static validateCodeBlocks(content: string): CodeBlockValidationResult {
        const result: CodeBlockValidationResult = {
            isValid: true,
            totalBlocks: 0,
            compliantBlocks: 0,
            nonCompliantBlocks: 0,
            errors: [],
            warnings: []
        };

        const lines = content.split('\n');
        let currentLine = 0;

        while (currentLine < lines.length) {
            const line = lines[currentLine];

            // Check for code block start
            if (line?.trim().startsWith('```')) {
                result.totalBlocks++;

                const codeBlockStart = currentLine;
                const languageSpec = line.trim().substring(3).trim();

                // Check if language is specified
                if (!languageSpec) {
                    result.errors.push({
                        line: currentLine + 1,
                        message: 'Code block missing language specification',
                        severity: 'error'
                    });
                    result.isValid = false;
                    result.nonCompliantBlocks++;
                } else {
                    // Check if language is valid
                    if (!VALID_CODE_LANGUAGES.includes(languageSpec.toLowerCase())) {
                        result.warnings.push({
                            line: currentLine + 1,
                            message: `Unknown or uncommon language specification: ${languageSpec}`,
                            severity: 'warning'
                        });
                    }

                    // Check for empty code blocks
                    const nextLine = lines[currentLine + 1];
                    const endBlockIndex = this.findCodeBlockEnd(lines, currentLine + 1);

                    if (endBlockIndex === currentLine + 1 || !nextLine?.trim()) {
                        result.warnings.push({
                            line: currentLine + 1,
                            message: 'Empty code block detected',
                            severity: 'warning'
                        });
                    }

                    result.compliantBlocks++;
                }

                // Move to end of code block
                currentLine = this.findCodeBlockEnd(lines, currentLine + 1);
            }

            currentLine++;
        }

        return result;
    }

    /**
     * Finds the end of a code block
     */
    private static findCodeBlockEnd(lines: string[], startIndex: number): number {
        for (let i = startIndex; i < lines.length; i++) {
            if (lines[i]?.trim() === '```') {
                return i;
            }
        }
        return lines.length; // No end found
    }
}

class ProjectValidator {
    /**
     * Validates entire project for frontmatter and code block compliance
     */
    static async validateProject(projectPath: string, pattern: string = '**/*.md'): Promise<ProjectValidationResult> {
        const result: ProjectValidationResult = {
            totalFiles: 0,
            compliantFiles: 0,
            nonCompliantFiles: 0,
            overallCompliance: 0,
            results: [],
            summary: {
                frontmatterCompliance: 0,
                codeBlockCompliance: 0,
                commonIssues: []
            }
        };

        // Find all markdown files
        const markdownFiles = await glob(pattern, {
            cwd: projectPath,
            absolute: true
        });

        result.totalFiles = markdownFiles.length;

        // Validate each file
        for (const filePath of markdownFiles) {
            try {
                const content = readFileSync(filePath, 'utf-8');
                const fileResult = this.validateFile(filePath, content);
                result.results.push(fileResult);

                if (fileResult.overallCompliance >= 90) {
                    result.compliantFiles++;
                } else {
                    result.nonCompliantFiles++;
                }
            } catch (error) {
                console.error(`Error validating file ${filePath}:`, error);
            }
        }

        // Calculate summary statistics
        this.calculateSummary(result);

        return result;
    }

    /**
     * Validates a single file
     */
    private static validateFile(filePath: string, content: string): FileValidationResult {
        const frontmatterResult = FrontmatterValidator.validateFrontmatter(content);
        const codeBlockResult = CodeBlockValidator.validateCodeBlocks(content);

        // Calculate overall compliance
        const frontmatterCompliance = frontmatterResult.isValid ? 50 : 0;
        const codeBlockCompliance = codeBlockResult.totalBlocks > 0
            ? (codeBlockResult.compliantBlocks / codeBlockResult.totalBlocks) * 50
            : 25; // Partial credit for no code blocks

        const overallCompliance = frontmatterCompliance + codeBlockCompliance;

        return {
            filePath,
            frontmatter: frontmatterResult,
            codeBlocks: codeBlockResult,
            overallCompliance
        };
    }

    /**
     * Calculates summary statistics
     */
    private static calculateSummary(result: ProjectValidationResult): void {
        if (result.totalFiles === 0) return;

        // Calculate compliance percentages
        result.overallCompliance = (result.compliantFiles / result.totalFiles) * 100;

        const frontmatterCompliant = result.results.filter(r => r.frontmatter.isValid).length;
        result.summary.frontmatterCompliance = (frontmatterCompliant / result.totalFiles) * 100;

        const codeBlockCompliant = result.results.filter(r => r.codeBlocks.isValid).length;
        result.summary.codeBlockCompliance = (codeBlockCompliant / result.totalFiles) * 100;

        // Find common issues
        const issueCounts = new Map<string, number>();

        for (const fileResult of result.results) {
            // Count frontmatter issues
            for (const error of fileResult.frontmatter.errors) {
                const key = `Frontmatter: ${error.message}`;
                issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
            }

            // Count code block issues
            for (const error of fileResult.codeBlocks.errors) {
                const key = `Code Block: ${error.message}`;
                issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
            }
        }

        // Sort and top issues
        result.summary.commonIssues = Array.from(issueCounts.entries())
            .map(([issue, count]) => ({ issue, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    /**
     * Prints validation results
     */
    static printResults(result: ProjectValidationResult): void {
        console.log('\n' + '='.repeat(80));
        console.log('📋 PROJECT VALIDATION RESULTS');
        console.log('='.repeat(80));

        console.log(`\n📊 Overall Statistics:`);
        console.log(`   Total Files: ${result.totalFiles}`);
        console.log(`   Compliant Files: ${result.compliantFiles}`);
        console.log(`   Non-Compliant Files: ${result.nonCompliantFiles}`);
        console.log(`   Overall Compliance: ${result.overallCompliance.toFixed(1)}%`);

        console.log(`\n🎯 Compliance Breakdown:`);
        console.log(`   Frontmatter Compliance: ${result.summary.frontmatterCompliance.toFixed(1)}%`);
        console.log(`   Code Block Compliance: ${result.summary.codeBlockCompliance.toFixed(1)}%`);

        if (result.summary.commonIssues.length > 0) {
            console.log(`\n🚨 Most Common Issues:`);
            for (const { issue, count } of result.summary.commonIssues.slice(0, 5)) {
                console.log(`   ${count}× ${issue}`);
            }
        }

        // Show non-compliant files
        const nonCompliantFiles = result.results.filter(r => r.overallCompliance < 90);
        if (nonCompliantFiles.length > 0) {
            console.log(`\n❌ Non-Compliant Files (${nonCompliantFiles.length}):`);
            for (const file of nonCompliantFiles) {
                const relativePath = file.filePath.replace(process.cwd() + '/', '');
                console.log(`   ${relativePath} (${file.overallCompliance.toFixed(1)}%)`);

                // Show top issues for this file
                const allIssues = [...file.frontmatter.errors, ...file.codeBlocks.errors].slice(0, 3);
                for (const issue of allIssues) {
                    console.log(`     - Line ${issue.line}: ${issue.message}`);
                }
            }
        }

        console.log('\n' + '='.repeat(80));

        // Exit with appropriate code
        if (result.overallCompliance >= 90) {
            console.log('🎉 EXCELLENT: Project meets documentation standards!');
        } else if (result.overallCompliance >= 70) {
            console.log('⚠️  GOOD: Project mostly meets standards, some improvements needed.');
        } else {
            console.log('🚨 NEEDS WORK: Project requires significant improvements to meet standards.');
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run') || args.includes('-d');

    // Remove dry-run flags from args
    const cleanArgs = args.filter(arg => arg !== '--dry-run' && arg !== '-d');

    const projectPath = cleanArgs[0] || process.cwd();
    const pattern = cleanArgs[1] || '**/*.md';

    console.log(`🔍 Validating project: ${projectPath}`);
    console.log(`📁 Pattern: ${pattern}`);
    console.log(`🔧 Mode: ${isDryRun ? 'DRY RUN (analysis only)' : 'FULL VALIDATION'}`);
    console.log('');

    if (isDryRun) {
        console.log('📋 DRY RUN MODE - Analyzing what would be validated...');
        console.log('📁 Files that would be checked:');

        // Show files that would be validated
        const markdownFiles = await glob(pattern, {
            cwd: projectPath,
            absolute: true
        });

        console.log(`   Found ${markdownFiles.length} markdown files`);

        // Show first 10 files as example
        const sampleFiles = markdownFiles.slice(0, 10);
        for (const file of sampleFiles) {
            const relativePath = file.replace(projectPath + '/', '');
            console.log(`   - ${relativePath}`);
        }

        if (markdownFiles.length > 10) {
            console.log(`   ... and ${markdownFiles.length - 10} more files`);
        }

        console.log('');
        console.log('🎯 To run full validation, remove --dry-run flag');
        console.log('💡 Command: bun run src/validation/frontmatter-validator.ts . "*.md"');
        console.log('');

        return; // Exit early for dry run
    }

    const result = await ProjectValidator.validateProject(projectPath, pattern);
    ProjectValidator.printResults(result);

    // Exit with code based on compliance
    process.exit(result.overallCompliance >= 90 ? 0 : 1);
}

// Export for use in other modules
export { FrontmatterValidator, CodeBlockValidator, ProjectValidator };
export type {
    ValidationError,
    FrontmatterValidationResult,
    CodeBlockValidationResult,
    FileValidationResult,
    ProjectValidationResult
};

// Run if called directly
if (import.meta.main) {
    main().catch(console.error);
}

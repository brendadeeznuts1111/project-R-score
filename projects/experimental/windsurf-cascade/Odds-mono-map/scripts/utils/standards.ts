#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]standards
 * 
 * Standards
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
 * Vault Standards Check Script
 * Validates compliance with vault standards
 */

import { ErrorHandler, ErrorSeverity, ErrorCategory, createErrorContext } from '../../src/core/error-handler.js';
import { join } from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { parse as parseYaml } from 'yaml';

interface StandardCheck {
    name: string;
    description: string;
    passed: boolean;
    details: string[];
}

interface StandardsResult {
    overall: boolean;
    checks: StandardCheck[];
    score: number;
}

class VaultStandards {
    private vaultPath: string;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
    }

    async checkStandards(): Promise<StandardsResult> {
        console.log(chalk.blue.bold('📏 Checking Vault Standards Compliance...'));

        const checks: StandardCheck[] = [];

        // Check 1: Required files exist
        checks.push(await this.checkRequiredFiles());

        // Check 2: Folder structure
        checks.push(await this.checkFolderStructure());

        // Check 3: YAML frontmatter compliance
        checks.push(await this.checkFrontmatterStandards());

        // Check 4: File naming conventions
        checks.push(await this.checkNamingConventions());

        // Check 5: Content standards
        checks.push(await this.checkContentStandards());

        // Check 6: Configuration files
        checks.push(await this.checkConfiguration());

        // Calculate overall score
        const passedCount = checks.filter(c => c.passed).length;
        const score = Math.round((passedCount / checks.length) * 100);
        const overall = score >= 90;

        const result: StandardsResult = {
            overall,
            checks,
            score
        };

        this.displayResults(result);
        return result;
    }

    private async checkRequiredFiles(): Promise<StandardCheck> {
        const requiredFiles = [
            'README.md',
            'STANDARDS.md',
            '🏠 Home.md',
            '00 - Dashboard.md',
            'package.json'
        ];

        const details: string[] = [];
        let passed = true;

        for (const file of requiredFiles) {
            const fullPath = join(this.vaultPath, file);
            if (existsSync(fullPath)) {
                details.push(chalk.green(`✓ ${file}`));
            } else {
                details.push(chalk.red(`✗ Missing: ${file}`));
                passed = false;
            }
        }

        return {
            name: 'Required Files',
            description: 'Essential vault files are present',
            passed,
            details
        };
    }

    private async checkFolderStructure(): Promise<StandardCheck> {
        const requiredFolders = [
            '01 - Daily Notes',
            '02 - Architecture',
            '03 - Development',
            '04 - Documentation',
            '05 - Assets',
            '06 - Templates',
            '07 - Archive'
        ];

        const details: string[] = [];
        let passed = true;

        for (const folder of requiredFolders) {
            const fullPath = join(this.vaultPath, folder);
            if (existsSync(fullPath)) {
                details.push(chalk.green(`✓ ${folder}/`));
            } else {
                details.push(chalk.red(`✗ Missing folder: ${folder}/`));
                passed = false;
            }
        }

        return {
            name: 'Folder Structure',
            description: 'Vault follows standard folder organization',
            passed,
            details
        };
    }

    private async checkFrontmatterStandards(): Promise<StandardCheck> {
        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**']
        });

        const details: string[] = [];
        let compliantCount = 0;

        for (const file of files.slice(0, 10)) { // Check first 10 files
            try {
                const fullPath = join(this.vaultPath, file);
                const content = readFileSync(fullPath, 'utf-8');

                if (content.startsWith('---')) {
                    const frontmatterEnd = content.indexOf('---', 1);
                    if (frontmatterEnd !== -1) {
                        const frontmatterContent = content.slice(4, frontmatterEnd);
                        const frontmatter = parseYaml(frontmatterContent);

                        const requiredFields = ['type', 'title', 'tags', 'created', 'updated', 'author'];
                        const hasAllFields = requiredFields.every(field => frontmatter[field]);

                        if (hasAllFields) {
                            compliantCount++;
                            details.push(chalk.green(`✓ ${file}`));
                        } else {
                            const missing = requiredFields.filter(field => !frontmatter[field]);
                            details.push(chalk.yellow(`⚠ ${file} (missing: ${missing.join(', ')})`));
                        }
                    } else {
                        details.push(chalk.red(`✗ ${file} (unclosed frontmatter)`));
                    }
                } else {
                    details.push(chalk.red(`✗ ${file} (no frontmatter)`));
                }
            } catch (error) {
                details.push(chalk.red(`✗ ${file} (error: ${error})`));
            }
        }

        const passed = compliantCount >= Math.floor(files.length * 0.8);
        details.push(chalk.gray(`Checked ${Math.min(10, files.length)} files, ${compliantCount} compliant`));

        return {
            name: 'YAML Frontmatter',
            description: 'Files have proper YAML frontmatter with required fields',
            passed,
            details
        };
    }

    private async checkNamingConventions(): Promise<StandardCheck> {
        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**']
        });

        const details: string[] = [];
        let compliantCount = 0;
        const issues: string[] = [];

        for (const file of files.slice(0, 10)) { // Check first 10 files
            const fileName = file.split('/').pop() || '';

            // Check for spaces
            if (fileName.includes(' ')) {
                issues.push(`${fileName} has spaces`);
            }

            // Check template naming
            if (fileName.includes('Template') && !fileName.endsWith('Template.md')) {
                issues.push(`${fileName} should end with Template.md`);
            }

            // Check dashboard naming
            if (fileName.startsWith('00 -') && !fileName.match(/^00 - [\w\s-]+\.md$/)) {
                issues.push(`${fileName} has incorrect dashboard format`);
            }

            if (issues.length === 0) {
                compliantCount++;
                details.push(chalk.green(`✓ ${fileName}`));
            } else {
                details.push(chalk.yellow(`⚠ ${fileName}: ${issues.join(', ')}`));
                issues.length = 0; // Reset for next file
            }
        }

        const passed = compliantCount >= Math.floor(files.length * 0.8);
        details.push(chalk.gray(`Checked ${Math.min(10, files.length)} files, ${compliantCount} compliant`));

        return {
            name: 'Naming Conventions',
            description: 'Files follow standard naming conventions',
            passed,
            details
        };
    }

    private async checkContentStandards(): Promise<StandardCheck> {
        const files = await glob('**/*.md', {
            cwd: this.vaultPath,
            ignore: ['**/.obsidian/**', '**/07 - Archive/**', '**/node_modules/**']
        });

        const details: string[] = [];
        let compliantCount = 0;

        for (const file of files.slice(0, 5)) { // Check first 5 files
            try {
                const fullPath = join(this.vaultPath, file);
                const content = readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');

                let issues = 0;

                // Check for H1
                const hasH1 = lines.some(line => line.match(/^# /));
                if (!hasH1) issues++;

                // Check line length
                const longLines = lines.filter(line => line.length > 100 && !line.startsWith('```'));
                if (longLines.length > 0) issues++;

                // Check for Overview section (skip certain file types)
                if (!file.includes('Dashboard') && !file.includes('Daily Note')) {
                    const hasOverview = lines.some(line => line.trim().startsWith('## Overview'));
                    if (!hasOverview) issues++;
                }

                if (issues === 0) {
                    compliantCount++;
                    details.push(chalk.green(`✓ ${file}`));
                } else {
                    details.push(chalk.yellow(`⚠ ${file} (${issues} issues)`));
                }
            } catch (error) {
                details.push(chalk.red(`✗ ${file} (error: ${error})`));
            }
        }

        const passed = compliantCount >= Math.floor(files.length * 0.6);
        details.push(chalk.gray(`Checked ${Math.min(5, files.length)} files, ${compliantCount} compliant`));

        return {
            name: 'Content Standards',
            description: 'Content follows formatting and structure guidelines',
            passed,
            details
        };
    }

    private async checkConfiguration(): Promise<StandardCheck> {
        const configFiles = [
            '.vault-config.json',
            '.vault-status.json'
        ];

        const details: string[] = [];
        let passed = true;

        for (const file of configFiles) {
            const fullPath = join(this.vaultPath, file);
            if (existsSync(fullPath)) {
                try {
                    JSON.parse(readFileSync(fullPath, 'utf-8'));
                    details.push(chalk.green(`✓ ${file} (valid JSON)`));
                } catch (error) {
                    details.push(chalk.red(`✗ ${file} (invalid JSON: ${error})`));
                    passed = false;
                }
            } else {
                details.push(chalk.yellow(`⚠ ${file} (not found - run setup first)`));
                passed = false;
            }
        }

        return {
            name: 'Configuration Templates',
            description: 'Vault configuration files exist and are valid',
            passed,
            details
        };
    }

    private displayResults(result: StandardsResult): void {
        console.log(chalk.blue.bold('\n📊 Standards Compliance Results:'));
        console.log(chalk.gray('='.repeat(50)));

        // Overall score
        const scoreColor = result.score >= 90 ? chalk.green : result.score >= 70 ? chalk.yellow : chalk.red;
        console.log(scoreColor.bold(`\n🎯 Overall Score: ${result.score}%`));
        console.log(result.overall ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));

        // Individual checks
        console.log(chalk.blue.bold('\n📋 Detailed Results:'));

        for (const check of result.checks) {
            const status = check.passed ? chalk.green('✅') : chalk.red('❌');
            console.log(`\n${status} ${check.name}: ${check.description}`);

            for (const detail of check.details) {
                console.log(`   ${detail}`);
            }
        }

        // Recommendations
        console.log(chalk.blue.bold('\n💡 Recommendations:'));

        for (const check of result.checks) {
            if (!check.passed) {
                switch (check.name) {
                    case 'Required Files':
                        console.log(chalk.yellow('• Run: bun run vault:setup - Create missing files'));
                        break;
                    case 'Folder Structure':
                        console.log(chalk.yellow('• Run: bun run vault:setup - Create missing folders'));
                        break;
                    case 'YAML Frontmatter':
                        console.log(chalk.yellow('• Run: bun run vault:fix - Auto-fix frontmatter issues'));
                        break;
                    case 'Naming Conventions':
                        console.log(chalk.yellow('• Run: bun run vault:organize - Fix file naming'));
                        break;
                    case 'Content Standards':
                        console.log(chalk.yellow('• Run: bun run vault:fix - Fix content formatting'));
                        break;
                    case 'Configuration Templates':
                        console.log(chalk.yellow('• Run: bun run vault:setup - Create configuration'));
                        break;
                }
            }
        }

        if (result.overall) {
            console.log(chalk.green.bold('\n🎉 Excellent! Your vault meets all standards.'));
        } else {
            console.log(chalk.yellow.bold('\n⚠️  Some standards need attention. See recommendations above.'));
        }
    }
}

// Run standards check with proper error handling
if (import.meta.main) {
    ErrorHandler.handleAsync(
        async () => {
            const standards = new VaultStandards();
            await standards.checkStandards();
        },
        ErrorSeverity.HIGH,
        ErrorCategory.VALIDATION,
        createErrorContext()
            .script('standards.ts')
            .function('checkStandards')
            .build()
    );
}

export { VaultStandards };

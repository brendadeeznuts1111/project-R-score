#!/usr/bin/env bun
// HTML Review and Correction CLI Tool
// Reviews all HTML files and provides correction capabilities

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface HTMLIssue {
    type: 'error' | 'warning' | 'info';
    category: 'structure' | 'accessibility' | 'performance' | 'seo' | 'security';
    message: string;
    line?: number;
    column?: number;
    fix?: string;
    autoFixable: boolean;
}

interface HTMLReviewResult {
    file: string;
    issues: HTMLIssue[];
    stats: {
        total: number;
        errors: number;
        warnings: number;
        info: number;
        autoFixable: number;
    };
}

interface CLIOptions {
    fix: boolean;
    verbose: boolean;
    output: string;
    filter: string;
    exclude: string[];
}

class HTMLReviewCLI {
    private options: CLIOptions;
    private results: HTMLReviewResult[] = [];

    constructor(options: Partial<CLIOptions> = {}) {
        this.options = {
            fix: false,
            verbose: false,
            output: '',
            filter: '',
            exclude: ['node_modules'],
            ...options
        };
    }

    public async review(files: string[]): Promise<HTMLReviewResult[]> {
        console.log('🔍 Starting HTML Review...\n');

        for (const file of files) {
            if (this.shouldSkipFile(file)) {
                if (this.options.verbose) {
                    console.log(`⏭️  Skipping: ${file}`);
                }
                continue;
            }

            try {
                const result = await this.reviewFile(file);
                this.results.push(result);
                this.printResult(result);
            } catch (error) {
                console.error(`❌ Error reviewing ${file}:`, error);
            }
        }

        this.printSummary();
        
        if (this.options.output) {
            this.saveResults();
        }

        return this.results;
    }

    private async reviewFile(filePath: string): Promise<HTMLReviewResult> {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const issues: HTMLIssue[] = [];

        // Structure checks
        this.checkStructure(content, lines, issues);
        
        // Accessibility checks
        this.checkAccessibility(content, lines, issues);
        
        // Performance checks
        this.checkPerformance(content, lines, issues);
        
        // SEO checks
        this.checkSEO(content, lines, issues);
        
        // Security checks
        this.checkSecurity(content, lines, issues);

        const stats = this.calculateStats(issues);

        return {
            file: filePath,
            issues,
            stats
        };
    }

    private checkStructure(content: string, lines: string[], issues: HTMLIssue[]): void {
        // Check DOCTYPE
        if (!content.trim().startsWith('<!DOCTYPE html>')) {
            issues.push({
                type: 'error',
                category: 'structure',
                message: 'Missing or invalid DOCTYPE declaration',
                line: 1,
                autoFixable: true,
                fix: '<!DOCTYPE html>'
            });
        }

        // Check lang attribute
        if (!content.includes('<html lang=')) {
            issues.push({
                type: 'warning',
                category: 'accessibility',
                message: 'Missing lang attribute on html element',
                autoFixable: true,
                fix: '<html lang="en">'
            });
        }

        // Check viewport meta tag
        if (!content.includes('viewport')) {
            issues.push({
                type: 'warning',
                category: 'accessibility',
                message: 'Missing viewport meta tag for responsive design',
                autoFixable: true,
                fix: '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
            });
        }

        // Check charset
        if (!content.includes('charset=')) {
            issues.push({
                type: 'error',
                category: 'structure',
                message: 'Missing charset meta tag',
                autoFixable: true,
                fix: '<meta charset="UTF-8">'
            });
        }

        // Check title tag
        if (!content.includes('<title>')) {
            issues.push({
                type: 'error',
                category: 'seo',
                message: 'Missing title tag',
                autoFixable: false
            });
        }

        // Check for proper heading hierarchy
        const h1Count = (content.match(/<h1/g) || []).length;
        if (h1Count === 0) {
            issues.push({
                type: 'warning',
                category: 'accessibility',
                message: 'No H1 tags found - consider adding a main heading',
                autoFixable: false
            });
        } else if (h1Count > 1) {
            issues.push({
                type: 'warning',
                category: 'accessibility',
                message: `Multiple H1 tags found (${h1Count}). Consider using only one H1 per page.`,
                autoFixable: false
            });
        }

        // Check for alt attributes on images
        const imgMatches = content.match(/<img[^>]*>/g) || [];
        imgMatches.forEach((img, index) => {
            if (!img.includes('alt=')) {
                issues.push({
                    type: 'error',
                    category: 'accessibility',
                    message: `Image ${index + 1} missing alt attribute`,
                    autoFixable: false
                });
            }
        });

        // Check for proper form labels
        const inputMatches = content.match(/<input[^>]*>/g) || [];
        inputMatches.forEach((input, index) => {
            if (!input.includes('id=') || !content.includes(`for="${input.match(/id="([^"]*)"/)?.[1] || ''}"`)) {
                issues.push({
                    type: 'warning',
                    category: 'accessibility',
                    message: `Input ${index + 1} may be missing associated label`,
                    autoFixable: false
                });
            }
        });
    }

    private checkAccessibility(content: string, lines: string[], issues: HTMLIssue[]): void {
        // Check for ARIA labels
        if (content.includes('button') && !content.includes('aria-label') && !content.includes('aria-labelledby')) {
            issues.push({
                type: 'info',
                category: 'accessibility',
                message: 'Consider adding aria-label to buttons for better screen reader support',
                autoFixable: false
            });
        }

        // Check for skip links
        if (!content.includes('skip')) {
            issues.push({
                type: 'info',
                category: 'accessibility',
                message: 'Consider adding skip navigation links for keyboard users',
                autoFixable: false
            });
        }

        // Check color contrast (basic check)
        if (content.includes('color:') && !content.includes('contrast')) {
            issues.push({
                type: 'info',
                category: 'accessibility',
                message: 'Verify color contrast ratios meet WCAG guidelines',
                autoFixable: false
            });
        }
    }

    private checkPerformance(content: string, lines: string[], issues: HTMLIssue[]): void {
        // Check for external resources
        const externalScripts = (content.match(/<script[^>]*src="http/ig) || []).length;
        const externalStyles = (content.match(/<link[^>]*href="http/ig) || []).length;
        
        if (externalScripts > 3) {
            issues.push({
                type: 'warning',
                category: 'performance',
                message: `High number of external scripts (${externalScripts}). Consider bundling.`,
                autoFixable: false
            });
        }

        if (externalStyles > 2) {
            issues.push({
                type: 'warning',
                category: 'performance',
                message: `Multiple external stylesheets (${externalStyles}). Consider combining.`,
                autoFixable: false
            });
        }

        // Check for inline styles
        const inlineStyles = (content.match(/style="/g) || []).length;
        if (inlineStyles > 5) {
            issues.push({
                type: 'warning',
                category: 'performance',
                message: `High number of inline styles (${inlineStyles}). Consider using CSS classes.`,
                autoFixable: false
            });
        }

        // Check for image optimization
        if (content.includes('<img') && !content.includes('loading="lazy"')) {
            issues.push({
                type: 'info',
                category: 'performance',
                message: 'Consider adding loading="lazy" to images for better performance',
                autoFixable: false
            });
        }

        // Check for preconnect hints
        const externalDomains = [...new Set(content.match(/https:\/\/[^"']+/g) || [])];
        if (externalDomains.length > 2) {
            issues.push({
                type: 'info',
                category: 'performance',
                message: `Consider adding preconnect hints for external domains`,
                autoFixable: false
            });
        }
    }

    private checkSEO(content: string, lines: string[], issues: HTMLIssue[]): void {
        // Check meta description
        if (!content.includes('name="description"')) {
            issues.push({
                type: 'warning',
                category: 'seo',
                message: 'Missing meta description for SEO',
                autoFixable: false
            });
        }

        // Check meta keywords (optional but good practice)
        if (!content.includes('name="keywords"')) {
            issues.push({
                type: 'info',
                category: 'seo',
                message: 'Consider adding meta keywords',
                autoFixable: false
            });
        }

        // Check Open Graph tags
        if (!content.includes('property="og:')) {
            issues.push({
                type: 'info',
                category: 'seo',
                message: 'Consider adding Open Graph tags for social media sharing',
                autoFixable: false
            });
        }

        // Check structured data
        if (!content.includes('application/ld+json')) {
            issues.push({
                type: 'info',
                category: 'seo',
                message: 'Consider adding structured data (JSON-LD) for better SEO',
                autoFixable: false
            });
        }

        // Check heading structure
        const headings = content.match(/<h([1-6])/g) || [];
        let lastLevel = 0;
        let hasSkippedLevel = false;
        
        headings.forEach(heading => {
            const level = parseInt(heading.substring(2));
            if (lastLevel > 0 && level > lastLevel + 1) {
                hasSkippedLevel = true;
            }
            lastLevel = level;
        });

        if (hasSkippedLevel) {
            issues.push({
                type: 'warning',
                category: 'seo',
                message: 'Heading levels skip numbers (e.g., H1 to H3). Use sequential headings.',
                autoFixable: false
            });
        }
    }

    private checkSecurity(content: string, lines: string[], issues: HTMLIssue[]): void {
        // Check for HTTPS resources
        const httpResources = content.match(/http:\/\/[^"'\s>]+/g) || [];
        if (httpResources.length > 0) {
            issues.push({
                type: 'warning',
                category: 'security',
                message: `Found ${httpResources.length} HTTP resources. Consider using HTTPS.`,
                autoFixable: false
            });
        }

        // Check for inline scripts
        const inlineScripts = (content.match(/<script[^>]*>/g) || []).filter(script => !script.includes('src'));
        if (inlineScripts.length > 0) {
            issues.push({
                type: 'warning',
                category: 'security',
                message: `Found ${inlineScripts.length} inline scripts. Consider external files for CSP.`,
                autoFixable: false
            });
        }

        // Check for CSP meta tag
        if (!content.includes('Content-Security-Policy') && !content.includes('http-equiv="Content-Security-Policy"')) {
            issues.push({
                type: 'info',
                category: 'security',
                message: 'Consider adding Content Security Policy (CSP)',
                autoFixable: false
            });
        }

        // Check for XSS vulnerabilities (basic)
        if (content.includes('innerHTML') || content.includes('document.write')) {
            issues.push({
                type: 'warning',
                category: 'security',
                message: 'Potential XSS vulnerability detected. Review DOM manipulation code.',
                autoFixable: false
            });
        }
    }

    private calculateStats(issues: HTMLIssue[]) {
        return {
            total: issues.length,
            errors: issues.filter(i => i.type === 'error').length,
            warnings: issues.filter(i => i.type === 'warning').length,
            info: issues.filter(i => i.type === 'info').length,
            autoFixable: issues.filter(i => i.autoFixable).length
        };
    }

    private shouldSkipFile(filePath: string): boolean {
        return this.options.exclude.some(pattern => filePath.includes(pattern));
    }

    private printResult(result: HTMLReviewResult): void {
        const { file, issues, stats } = result;
        
        if (stats.total === 0) {
            console.log(`✅ ${file}: No issues found`);
            return;
        }

        console.log(`\n📄 ${file}`);
        console.log(`   Issues: ${stats.errors}❌ ${stats.warnings}⚠️  ${stats.info}ℹ️  (${stats.total} total)`);
        
        if (this.options.verbose) {
            issues.forEach(issue => {
                const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
                const location = issue.line ? `:${issue.line}` : '';
                console.log(`   ${icon} [${issue.category.toUpperCase()}] ${issue.message}${location}`);
                if (issue.autoFixable && this.options.fix) {
                    console.log(`      💡 Auto-fix: ${issue.fix}`);
                }
            });
        }

        if (stats.autoFixable > 0 && !this.options.fix) {
            console.log(`   🔧 ${stats.autoFixable} issues can be auto-fixed with --fix flag`);
        }
    }

    private printSummary(): void {
        const totalStats = this.results.reduce((acc, result) => ({
            total: acc.total + result.stats.total,
            errors: acc.errors + result.stats.errors,
            warnings: acc.warnings + result.stats.warnings,
            info: acc.info + result.stats.info,
            autoFixable: acc.autoFixable + result.stats.autoFixable
        }), { total: 0, errors: 0, warnings: 0, info: 0, autoFixable: 0 });

        console.log('\n' + '='.repeat(60));
        console.log('📊 HTML REVIEW SUMMARY');
        console.log('='.repeat(60));
        console.log(`Files reviewed: ${this.results.length}`);
        console.log(`Total issues: ${totalStats.total}`);
        console.log(`Errors: ${totalStats.errors} ❌`);
        console.log(`Warnings: ${totalStats.warnings} ⚠️`);
        console.log(`Info: ${totalStats.info} ℹ️`);
        console.log(`Auto-fixable: ${totalStats.autoFixable} 🔧`);
        
        if (totalStats.errors > 0) {
            console.log('\n❌ Review completed with errors. Fix critical issues before deployment.');
        } else if (totalStats.warnings > 0) {
            console.log('\n⚠️  Review completed with warnings. Consider addressing for improvement.');
        } else {
            console.log('\n✅ Review completed successfully! No critical issues found.');
        }
    }

    private saveResults(): void {
        const results = {
            timestamp: new Date().toISOString(),
            summary: this.calculateStats(this.results.flatMap(r => r.issues)),
            files: this.results
        };

        writeFileSync(this.options.output, JSON.stringify(results, null, 2));
        console.log(`\n💾 Results saved to: ${this.options.output}`);
    }

    public async fixIssues(): Promise<void> {
        console.log('🔧 Applying auto-fixes...\n');

        for (const result of this.results) {
            if (result.stats.autoFixable === 0) {
                continue;
            }

            const filePath = result.file;
            let content = readFileSync(filePath, 'utf-8');
            let modified = false;

            for (const issue of result.issues) {
                if (issue.autoFixable && issue.fix) {
                    // Apply fixes based on issue type
                    switch (issue.message) {
                        case 'Missing or invalid DOCTYPE declaration':
                            if (!content.trim().startsWith('<!DOCTYPE html>')) {
                                content = '<!DOCTYPE html>\n' + content;
                                modified = true;
                            }
                            break;
                        
                        case 'Missing charset meta tag':
                            if (!content.includes('charset=')) {
                                const headEnd = content.indexOf('</head>');
                                if (headEnd !== -1) {
                                    content = content.slice(0, headEnd) + '    <meta charset="UTF-8">\n' + content.slice(headEnd);
                                    modified = true;
                                }
                            }
                            break;
                        
                        case 'Missing viewport meta tag for responsive design':
                            if (!content.includes('viewport')) {
                                const headEnd = content.indexOf('</head>');
                                if (headEnd !== -1) {
                                    content = content.slice(0, headEnd) + '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' + content.slice(headEnd);
                                    modified = true;
                                }
                            }
                            break;
                    }
                }
            }

            if (modified) {
                writeFileSync(filePath, content);
                console.log(`✅ Fixed auto-fixable issues in: ${filePath}`);
            }
        }

        console.log('\n🎉 Auto-fixes applied successfully!');
    }
}

// CLI argument parsing
function parseArgs(): { files: string[], options: CLIOptions } {
    const args = process.argv.slice(2);
    const files: string[] = [];
    const options: Partial<CLIOptions> = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--fix':
                options.fix = true;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
            case '--filter':
            case '-f':
                options.filter = args[++i];
                break;
            case '--exclude':
            case '-e':
                if (!options.exclude) options.exclude = [];
                options.exclude.push(args[++i]);
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
            default:
                if (!arg.startsWith('-')) {
                    files.push(arg);
                }
                break;
        }
    }

    return { files, options: options as CLIOptions };
}

function showHelp(): void {
    console.log(`
🔍 HTML Review CLI Tool

Usage: bun html-review-cli.ts [options] [files...]

Options:
  --fix, -f          Apply auto-fixes for fixable issues
  --verbose, -v      Show detailed issue information
  --output, -o       Save results to JSON file
  --filter, -f       Filter issues by category (structure, accessibility, performance, seo, security)
  --exclude, -e      Exclude files/directories (default: node_modules)
  --help, -h         Show this help message

Examples:
  bun html-review-cli.ts *.html                    # Review all HTML files
  bun html-review-cli.ts --fix *.html              # Review and auto-fix issues
  bun html-review-cli.ts --verbose --filter seo *.html  # Review with SEO filter
  bun html-review-cli.ts --output results.json *.html   # Save results to file

Categories:
  structure      - HTML structure and semantic issues
  accessibility  - A11y and screen reader compatibility
  performance    - Loading speed and optimization
  seo           - Search engine optimization
  security      - Security vulnerabilities and best practices
`);
}

// Main execution
async function main(): Promise<void> {
    const { files, options } = parseArgs();
    
    if (files.length === 0) {
        console.log('❌ No files specified. Use --help for usage information.');
        process.exit(1);
    }

    const cli = new HTMLReviewCLI(options);
    const results = await cli.review(files);

    if (options.fix) {
        await cli.fixIssues();
    }

    // Exit with error code if critical issues found
    const hasErrors = results.some(r => r.stats.errors > 0);
    process.exit(hasErrors ? 1 : 0);
}

// Export for programmatic use
export { HTMLReviewCLI, HTMLIssue, HTMLReviewResult, CLIOptions };

// Run CLI if called directly
if (import.meta.main) {
    main().catch(error => {
        console.error('❌ CLI Error:', error);
        process.exit(1);
    });
}

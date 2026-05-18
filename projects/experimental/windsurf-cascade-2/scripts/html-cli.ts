#!/usr/bin/env bun
// HTML CLI - Unified HTML Review and Correction Tool
// Single command interface for all HTML operations

import { HTMLReviewCLI } from './html-review-cli.js';
import { HTMLCorrector } from './html-corrector.js';
import { existsSync } from 'fs';

interface CLIOptions {
    action: 'review' | 'correct' | 'fix' | 'all' | 'help';
    files: string[];
    verbose: boolean;
    output: string;
    filter: string;
    exclude: string[];
    autoFix: boolean;
}

class HTMLCLI {
    private options: CLIOptions;

    constructor(options: Partial<CLIOptions> = {}) {
        this.options = {
            action: 'review',
            files: [],
            verbose: false,
            output: '',
            filter: '',
            exclude: ['node_modules'],
            autoFix: false,
            ...options
        };
    }

    public async execute(): Promise<void> {
        console.info('🚀 HTML CLI - Unified Review and Correction Tool\n');

        switch (this.options.action) {
            case 'review':
                await this.review();
                break;
            case 'correct':
                await this.correct();
                break;
            case 'fix':
                await this.fix();
                break;
            case 'all':
                await this.all();
                break;
            case 'help':
                this.showHelp();
                break;
            default:
                this.showHelp();
                break;
        }
    }

    private async review(): Promise<void> {
        console.info('🔍 Running HTML Review...\n');
        
        const reviewer = new HTMLReviewCLI({
            verbose: this.options.verbose,
            output: this.options.output,
            filter: this.options.filter,
            exclude: this.options.exclude,
            fix: this.options.autoFix
        });

        const results = await reviewer.review(this.options.files);
        
        const hasErrors = results.some(r => r.stats.errors > 0);
        process.exit(hasErrors ? 1 : 0);
    }

    private async correct(): Promise<void> {
        console.info('🔧 Running HTML Correction...\n');
        
        const corrector = new HTMLCorrector();
        corrector.correctFiles(this.options.files);
        
        console.info('\n✅ HTML correction completed successfully!');
    }

    private async fix(): Promise<void> {
        console.info('🛠️ Running HTML Review with Auto-Fix...\n');
        
        const reviewer = new HTMLReviewCLI({
            verbose: this.options.verbose,
            output: this.options.output,
            filter: this.options.filter,
            exclude: this.options.exclude,
            fix: true
        });

        const results = await reviewer.review(this.options.files);
        
        if (this.options.autoFix) {
            await reviewer.fixIssues();
        }
        
        const hasErrors = results.some(r => r.stats.errors > 0);
        process.exit(hasErrors ? 1 : 0);
    }

    private async all(): Promise<void> {
        console.info('🎯 Running Complete HTML Optimization...\n');
        
        // Step 1: Review current state
        console.info('📊 Step 1: Initial Review');
        const reviewer = new HTMLReviewCLI({
            verbose: false,
            exclude: this.options.exclude
        });
        
        const initialResults = await reviewer.review(this.options.files);
        const initialIssues = initialResults.reduce((sum, r) => sum + r.stats.total, 0);
        
        // Step 2: Apply corrections
        console.info('\n🔧 Step 2: Apply Corrections');
        const corrector = new HTMLCorrector();
        corrector.correctFiles(this.options.files);
        
        // Step 3: Final review
        console.info('\n🔍 Step 3: Final Review');
        const finalResults = await reviewer.review(this.options.files);
        const finalIssues = finalResults.reduce((sum, r) => sum + r.stats.total, 0);
        
        // Summary
        console.info('\n' + '='.repeat(60));
        console.info('🎯 COMPLETE OPTIMIZATION SUMMARY');
        console.info('='.repeat(60));
        console.info(`Files processed: ${this.options.files.length}`);
        console.info(`Issues before: ${initialIssues}`);
        console.info(`Issues after: ${finalIssues}`);
        console.info(`Issues resolved: ${initialIssues - finalIssues} 🎉`);
        console.info(`Improvement: ${((initialIssues - finalIssues) / initialIssues * 100).toFixed(1)}%`);
        
        if (finalResults.some(r => r.stats.errors > 0)) {
            console.info('\n❌ Some critical issues remain. Review individual files for details.');
            process.exit(1);
        } else {
            console.info('\n✅ All HTML files optimized successfully!');
            process.exit(0);
        }
    }

    public showHelp(): void {
        console.info(`
🚀 HTML CLI - Unified Review and Correction Tool

Usage: bun html-cli.ts <action> [options] [files...]

Actions:
  review     Review HTML files for issues and best practices
  correct    Apply automatic corrections to common HTML issues
  fix        Review and auto-fix fixable issues
  all        Run complete optimization (review + correct + final review)

Options:
  --verbose, -v      Show detailed issue information
  --output, -o       Save results to JSON file
  --filter, -f       Filter issues by category
  --exclude, -e      Exclude files/directories (default: node_modules)
  --auto-fix         Apply auto-fixes during review
  --help, -h         Show this help message

Categories for filtering:
  structure      - HTML structure and semantic issues
  accessibility  - A11y and screen reader compatibility
  performance    - Loading speed and optimization
  seo           - Search engine optimization
  security      - Security vulnerabilities and best practices

Examples:
  bun html-cli.ts review *.html                    # Review all HTML files
  bun html-cli.ts correct *.html                  # Apply corrections
  bun html-cli.ts fix --verbose *.html            # Review and auto-fix
  bun html-cli.ts all --output results.json *.html # Complete optimization
  bun html-cli.ts review --filter seo *.html      # Review SEO issues only

Workflow:
  1. Use 'review' to identify issues
  2. Use 'correct' to apply automatic fixes
  3. Use 'fix' to review remaining issues and auto-fix what's possible
  4. Use 'all' for complete optimization in one command

Correction Features:
  • Structure: DOCTYPE, charset, viewport, lang attributes
  • SEO: Meta descriptions, keywords, Open Graph, structured data
  • Accessibility: ARIA labels, landmarks, skip navigation
  • Security: Content Security Policy, HTTPS enforcement
  • Performance: Lazy loading, preconnect hints

Review Features:
  • Comprehensive issue detection across 5 categories
  • Auto-fix capabilities for common issues
  • Detailed reporting and statistics
  • JSON output for CI/CD integration
  • Configurable filtering and exclusion
        `);
    }
}

// CLI argument parsing
function parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        return { action: 'help' as any, files: [], verbose: false, output: '', filter: '', exclude: [], autoFix: false };
    }

    const action = args[0] as CLIOptions['action'];
    const files: string[] = [];
    const options: Partial<CLIOptions> = { action };

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
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
            case '--auto-fix':
                options.autoFix = true;
                break;
            case '--help':
            case '-h':
                options.action = 'help';
                break;
            default:
                if (!arg.startsWith('-')) {
                    files.push(arg);
                }
                break;
        }
    }

    return { ...options, files } as CLIOptions;
}

// Main execution
async function main(): Promise<void> {
    const options = parseArgs();
    
    if (options.action === 'help') {
        const cli = new HTMLCLI();
        cli.showHelp();
        return;
    }
    
    if (options.files.length === 0) {
        console.info('❌ No files specified. Use --help for usage information.');
        process.exit(1);
    }

    // Validate files exist
    const missingFiles = options.files.filter(file => !existsSync(file));
    if (missingFiles.length > 0) {
        console.info(`❌ Files not found: ${missingFiles.join(', ')}`);
        process.exit(1);
    }

    const cli = new HTMLCLI(options);
    await cli.execute();
}

// Export for programmatic use
export { HTMLCLI };

// Run CLI if called directly
if (import.meta.main) {
    main().catch(error => {
        console.error('❌ CLI Error:', error);
        process.exit(1);
    });
}

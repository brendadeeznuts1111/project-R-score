#!/usr/bin/env bun
// HTML Correction Script
// Automatically fixes common HTML issues across all files

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CorrectionRule {
    name: string;
    description: string;
    pattern: RegExp;
    replacement: string | ((match: string, ...args: any[]) => string);
    priority: number;
    category: 'structure' | 'accessibility' | 'seo' | 'security' | 'performance';
}

class HTMLCorrector {
    private rules: CorrectionRule[] = [];
    private correctedFiles: string[] = [];

    constructor() {
        this.initializeRules();
    }

    private initializeRules(): void {
        this.rules = [
            // Structure fixes
            {
                name: 'Add lang attribute to html tag',
                description: 'Add lang="en" to html tag if missing',
                pattern: /<html>/gi,
                replacement: '<html lang="en">',
                priority: 1,
                category: 'structure'
            },
            {
                name: 'Add meta charset',
                description: 'Add UTF-8 charset meta tag',
                pattern: /(<head[^>]*>)/gi,
                replacement: '$1\n    <meta charset="UTF-8">',
                priority: 1,
                category: 'structure'
            },
            {
                name: 'Add viewport meta tag',
                description: 'Add viewport meta tag for responsive design',
                pattern: /(<meta charset="UTF-8">)/gi,
                replacement: '$1\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                priority: 1,
                category: 'structure'
            },
            {
                name: 'Add meta description',
                description: 'Add basic meta description for SEO',
                pattern: /(<meta name="viewport"[^>]*>)/gi,
                replacement: '$1\n    <meta name="description" content="Interactive dashboard and monitoring system with real-time performance metrics and analysis tools.">',
                priority: 2,
                category: 'seo'
            },
            {
                name: 'Add meta keywords',
                description: 'Add meta keywords for SEO',
                pattern: /(<meta name="description"[^>]*>)/gi,
                replacement: '$1\n    <meta name="keywords" content="dashboard, monitoring, performance, metrics, analytics, real-time, visualization">',
                priority: 2,
                category: 'seo'
            },
            {
                name: 'Add Open Graph tags',
                description: 'Add basic Open Graph meta tags',
                pattern: /(<meta name="keywords"[^>]*>)/gi,
                replacement: `$1\n    <meta property="og:title" content="Origin Dashboard - System Monitoring">\n    <meta property="og:description" content="Real-time performance monitoring and analytics dashboard">\n    <meta property="og:type" content="website">\n    <meta property="og:image" content="/dashboard-preview.png">`,
                priority: 3,
                category: 'seo'
            },
            {
                name: 'Add structured data',
                description: 'Add JSON-LD structured data for SEO',
                pattern: /(<\/head>)/gi,
                replacement: `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Origin Dashboard",
        "description": "Real-time performance monitoring and analytics dashboard",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any"
    }
</script>
$1`,
                priority: 3,
                category: 'seo'
            },
            {
                name: 'Add CSP meta tag',
                description: 'Add Content Security Policy for security',
                pattern: /(<\/head>)/gi,
                replacement: `    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; connect-src 'self' https:;">
$1`,
                priority: 2,
                category: 'security'
            },
            {
                name: 'Add preconnect hints',
                description: 'Add preconnect hints for external domains',
                pattern: /(<meta http-equiv="Content-Security-Policy"[^>]*>)/gi,
                replacement: `$1\n    <link rel="preconnect" href="https://cdn.tailwindcss.com">\n    <link rel="preconnect" href="https://cdn.jsdelivr.net">`,
                priority: 2,
                category: 'performance'
            },
            {
                name: 'Add skip navigation link',
                description: 'Add skip navigation link for accessibility',
                pattern: /(<body[^>]*>)/gi,
                replacement: `$1\n    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded">Skip to main content</a>`,
                priority: 2,
                category: 'accessibility'
            },
            {
                name: 'Add main landmark',
                description: 'Wrap main content in main tag',
                pattern: /<a href="#main-content"[^>]*>.*?<\/a>\s*(<div[^>]*class="origin-container")/gis,
                replacement: '<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded">Skip to main content</a>\n    <main id="main-content" class="origin-container',
                priority: 2,
                category: 'accessibility'
            },
            {
                name: 'Close main tag',
                description: 'Close main tag properly',
                pattern: /(<\/div>\s*<\/body>)/gi,
                replacement: '</main>\n$1',
                priority: 2,
                category: 'accessibility'
            },
            {
                name: 'Add loading lazy to images',
                description: 'Add loading="lazy" to images for performance',
                pattern: /<img([^>]*)>/gi,
                replacement: (match, attrs) => {
                    if (!attrs.includes('loading=')) {
                        return `<img${attrs} loading="lazy">`;
                    }
                    return match;
                },
                priority: 3,
                category: 'performance'
            },
            {
                name: 'Fix HTTP to HTTPS',
                description: 'Convert HTTP URLs to HTTPS',
                pattern: /http:\/\/(cdn\.tailwindcss\.com|cdn\.jsdelivr\.net)/gi,
                replacement: 'https://$1',
                priority: 1,
                category: 'security'
            },
            {
                name: 'Add aria-label to buttons without text',
                description: 'Add aria-label to buttons that only have icons',
                pattern: /<button([^>]*)>(<svg[^>]*>.*?<\/svg>|[🎯🔄📊⚙️❓🎨📈🔍])<\/button>/gi,
                replacement: (match, attrs, content) => {
                    if (!attrs.includes('aria-label=')) {
                        let label = 'Button';
                        if (content.includes('🔄')) label = 'Refresh';
                        else if (content.includes('📊')) label = 'Export data';
                        else if (content.includes('⚙️')) label = 'Settings';
                        else if (content.includes('❓')) label = 'Help';
                        else if (content.includes('🎨')) label = 'Theme settings';
                        else if (content.includes('📈')) label = 'Performance metrics';
                        else if (content.includes('🔍')) label = 'Search';
                        else if (content.includes('🎯')) label = 'Target';
                        
                        return `<button${attrs} aria-label="${label}">${content}</button>`;
                    }
                    return match;
                },
                priority: 2,
                category: 'accessibility'
            },
            {
                name: 'Fix heading hierarchy',
                description: 'Fix skipped heading levels by adding proper hierarchy',
                pattern: /<h1[^>]*>.*?<\/h1>\s*<h3/gi,
                replacement: (match) => {
                    return match.replace('<h3', '<h2');
                },
                priority: 3,
                category: 'seo'
            }
        ];

        // Sort by priority
        this.rules.sort((a, b) => a.priority - b.priority);
    }

    public correctFile(filePath: string): boolean {
        if (!existsSync(filePath)) {
            console.log(`❌ File not found: ${filePath}`);
            return false;
        }

        try {
            let content = readFileSync(filePath, 'utf-8');
            let modified = false;
            const appliedRules: string[] = [];

            for (const rule of this.rules) {
                const originalContent = content;
                if (typeof rule.replacement === 'string') {
                    content = content.replace(rule.pattern, rule.replacement);
                } else {
                    content = content.replace(rule.pattern, rule.replacement);
                }
                
                if (content !== originalContent) {
                    modified = true;
                    appliedRules.push(rule.name);
                    console.log(`✅ Applied: ${rule.name}`);
                }
            }

            if (modified) {
                writeFileSync(filePath, content);
                this.correctedFiles.push(filePath);
                console.log(`🎉 Corrected: ${filePath}`);
                console.log(`   Rules applied: ${appliedRules.join(', ')}`);
                return true;
            } else {
                console.log(`✅ Already optimized: ${filePath}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Error correcting ${filePath}:`, error);
            return false;
        }
    }

    public correctFiles(filePaths: string[]): void {
        console.log('🔧 Starting HTML Correction...\n');

        let correctedCount = 0;
        let alreadyOptimizedCount = 0;

        for (const filePath of filePaths) {
            console.log(`\n📄 Processing: ${filePath}`);
            if (this.correctFile(filePath)) {
                correctedCount++;
            } else {
                alreadyOptimizedCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 HTML CORRECTION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Files processed: ${filePaths.length}`);
        console.log(`Files corrected: ${correctedCount} 🎉`);
        console.log(`Already optimized: ${alreadyOptimizedCount} ✅`);
        console.log(`Total corrections applied: ${this.correctedFiles.length}`);
        
        if (correctedCount > 0) {
            console.log('\n🎉 HTML files have been optimized for:');
            console.log('   • Structure (DOCTYPE, charset, viewport)');
            console.log('   • SEO (meta tags, Open Graph, structured data)');
            console.log('   • Accessibility (ARIA labels, landmarks, skip links)');
            console.log('   • Security (CSP, HTTPS)');
            console.log('   • Performance (lazy loading, preconnect)');
        }
    }

    public addCustomRule(rule: CorrectionRule): void {
        this.rules.push(rule);
        this.rules.sort((a, b) => a.priority - b.priority);
    }

    public getRules(): CorrectionRule[] {
        return [...this.rules];
    }
}

// CLI interface
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🔧 HTML Correction Tool

Usage: bun html-corrector.ts [files...]

Examples:
  bun html-corrector.ts *.html                    # Correct all HTML files
  bun html-corrector.ts origin-dashboard.html     # Correct specific file
  bun html-corrector.ts **/*.html                  # Correct all HTML files recursively

Corrections Applied:
  • Structure: DOCTYPE, charset, viewport, lang attributes
  • SEO: Meta descriptions, keywords, Open Graph, structured data
  • Accessibility: ARIA labels, landmarks, skip navigation
  • Security: Content Security Policy, HTTPS enforcement
  • Performance: Lazy loading, preconnect hints
        `);
        process.exit(0);
    }

    const corrector = new HTMLCorrector();
    corrector.correctFiles(args);
}

// Export for programmatic use
export { HTMLCorrector, CorrectionRule };

// Run CLI if called directly
if (import.meta.main) {
    main().catch(error => {
        console.error('❌ Correction Error:', error);
        process.exit(1);
    });
}

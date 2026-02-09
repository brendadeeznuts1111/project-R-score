#!/usr/bin/env node

/**
 * Bun Docs CLI Demo Script
 * Demonstrates all major features of the bun-docs CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BunDocsDemo {
    constructor() {
        this.demoDir = './bun-docs-demo-temp';
        this.setupDemo();
    }

    setupDemo() {
        // Create demo directory
        if (!fs.existsSync(this.demoDir)) {
            fs.mkdirSync(this.demoDir, { recursive: true });
        }
        
        // Create sample documentation
        this.createSampleDocs();
        
        // Set up demo secrets
        this.setupDemoSecrets();
    }

    createSampleDocs() {
        const docsDir = path.join(this.demoDir, 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        // Create index.md
        fs.writeFileSync(path.join(docsDir, 'index.md'), `# Bun Docs Demo

Welcome to the Bun Docs demonstration!

## Features Demonstrated

1. **Documentation Publishing** - Upload to R2 storage
2. **RSS Feed Management** - Monitor multiple feeds
3. **Interactive Shell** - Command-line interface
4. **System Diagnostics** - Health checks and monitoring
5. **Analytics** - Comprehensive reporting

## Quick Links

- [API Reference](api.md)
- [User Guide](guide.md)
- [Examples](examples.md)

---

*Generated with Bun Docs v1.0.0*
`);

        // Create API documentation
        fs.writeFileSync(path.join(docsDir, 'api.md'), `# API Reference

## Core Functions

### publish()
Publish documentation to R2 storage.

\`\`\`bash
bun-docs publish [source]
\`\`\`

### rss fetch()
Fetch updates from RSS feeds.

\`\`\`bash
bun-docs rss fetch
\`\`\`

### r2 list()
List packages in R2 storage.

\`\`\`bash
bun-docs r2 list
\`\`\`

## Configuration

See \`bun-docs.config.json\` for configuration options.
`);

        // Create user guide
        fs.writeFileSync(path.join(docsDir, 'guide.md'), `# User Guide

## Getting Started

1. Initialize your project:
   \`\`\`bash
   bun-docs init
   \`\`\`

2. Configure R2 credentials:
   \`\`\`javascript
   Bun.secrets.set("R2_ACCOUNT_ID", "your-account-id");
   \`\`\`

3. Publish documentation:
   \`\`\`bash
   bun-docs publish ./docs
   \`\`\`

## Advanced Features

- Dry-run mode for safe operations
- Interactive shell for management
- Comprehensive diagnostics
- RSS feed monitoring
- Analytics and reporting
`);

        // Create examples
        fs.writeFileSync(path.join(docsDir, 'examples.md'), `# Examples

## Publishing Examples

### Basic Publishing
\`\`\`bash
# Publish from default directory
bun-docs publish

# Publish from custom directory
bun-docs publish ./documentation

# Preview before publishing
bun-docs publish --dryrun
\`\`\`

### RSS Management
\`\`\`bash
# Add RSS feed
bun-docs rss add https://bun.com/rss.xml

# Fetch feeds
bun-docs rss fetch

# List feeds
bun-docs rss list
\`\`\`

### R2 Storage
\`\`\`bash
# List packages
bun-docs r2 list

# Upload file
bun-docs r2 upload ./file.zip

# Download file
bun-docs r2 download docs/index.html
\`\`\`

## Interactive Shell

\`\`\`bash
bun-docs shell
\`\`\`

Shell commands:
- \`publish ./docs\`
- \`rss fetch\`
- \`r2 list\`
- \`doctor\`
- \`stats\`
- \`exit\`
`);

        console.log('✅ Created sample documentation');
    }

    setupDemoSecrets() {
        // Set up demo secrets (in real usage, these would be real credentials)
        if (typeof Bun !== 'undefined') {
            Bun.secrets.set("R2_ACCOUNT_ID", "demo-account-id");
            Bun.secrets.set("R2_ACCESS_KEY_ID", "demo-access-key");
            Bun.secrets.set("R2_SECRET_ACCESS_KEY", "demo-secret-key");
            Bun.secrets.set("CLOUDFLARE_API_TOKEN", "demo-cf-token");
            Bun.secrets.set("GITHUB_TOKEN", "demo-github-token");
        }
        
        // Also set as environment variables for fallback
        process.env.R2_ACCOUNT_ID = "demo-account-id";
        process.env.R2_ACCESS_KEY_ID = "demo-access-key";
        process.env.R2_SECRET_ACCESS_KEY = "demo-secret-key";
        process.env.CLOUDFLARE_API_TOKEN = "demo-cf-token";
        process.env.GITHUB_TOKEN = "demo-github-token";
        
        console.log('✅ Set up demo secrets');
    }

    async runDemo() {
        console.log('🚀 Bun Docs CLI Demo');
        console.log('====================\n');

        await this.demoInit();
        await this.demoConfig();
        await this.demoSecrets();
        await this.demoPublish();
        await this.demoRSS();
        await this.demoR2();
        await this.demoDoctor();
        await this.demoAnalyze();
        
        console.log('\n🎉 Demo completed!');
        console.log('\nNext steps:');
        console.log('1. Try the interactive shell: bun-docs shell');
        console.log('2. Configure your real R2 credentials');
        console.log('3. Publish your actual documentation');
        console.log('4. Set up RSS feeds for monitoring');
        
        this.cleanup();
    }

    async demoInit() {
        console.log('📦 1. Initialization Demo');
        console.log('========================');
        
        try {
            // Change to demo directory
            process.chdir(this.demoDir);
            
            console.log('🔄 Initializing Bun Docs project...');
            execSync('node ../bun-docs.cjs init', { stdio: 'inherit' });
            
            console.log('✅ Initialization complete!\n');
        } catch (error) {
            console.log(`❌ Init demo failed: ${error.message}\n`);
        }
    }

    async demoConfig() {
        console.log('⚙️ 2. Configuration Demo');
        console.log('========================');
        
        try {
            console.log('📋 Current configuration:');
            execSync('node ../bun-docs.cjs config', { stdio: 'inherit' });
            
            console.log('\n✅ Configuration displayed!\n');
        } catch (error) {
            console.log(`❌ Config demo failed: ${error.message}\n`);
        }
    }

    async demoSecrets() {
        console.log('🔐 3. Secrets Management Demo');
        console.log('=============================');
        
        try {
            console.log('🔍 Validating secrets...');
            execSync('node ../bun-docs.cjs doctor', { stdio: 'inherit' });
            
            console.log('\n✅ Secrets validated!\n');
        } catch (error) {
            console.log(`❌ Secrets demo failed: ${error.message}\n`);
        }
    }

    async demoPublish() {
        console.log('📚 4. Publishing Demo');
        console.log('====================');
        
        try {
            console.log('🔄 Publishing documentation (dry-run)...');
            execSync('node ../bun-docs.cjs publish ./docs --dryrun', { stdio: 'inherit' });
            
            console.log('\n✅ Publishing preview complete!\n');
        } catch (error) {
            console.log(`❌ Publish demo failed: ${error.message}\n`);
        }
    }

    async demoRSS() {
        console.log('📡 5. RSS Management Demo');
        console.log('========================');
        
        try {
            console.log('📋 Adding RSS feeds...');
            execSync('node ../bun-docs.cjs rss add https://bun.com/rss.xml', { stdio: 'inherit' });
            execSync('node ../bun-docs.cjs rss add https://github.com/oven-sh/bun/releases.atom', { stdio: 'inherit' });
            
            console.log('\n📋 Listing RSS feeds...');
            execSync('node ../bun-docs.cjs rss list', { stdio: 'inherit' });
            
            console.log('\n🔄 Fetching RSS feeds...');
            execSync('node ../bun-docs.cjs rss fetch', { stdio: 'inherit' });
            
            console.log('\n✅ RSS management demo complete!\n');
        } catch (error) {
            console.log(`❌ RSS demo failed: ${error.message}\n`);
        }
    }

    async demoR2() {
        console.log('🗄️ 6. R2 Storage Demo');
        console.log('===================');
        
        try {
            console.log('📋 Listing R2 packages...');
            execSync('node ../bun-docs.cjs r2 list', { stdio: 'inherit' });
            
            console.log('\n📊 R2 statistics...');
            execSync('node ../bun-docs.cjs r2 stats', { stdio: 'inherit' });
            
            console.log('\n✅ R2 storage demo complete!\n');
        } catch (error) {
            console.log(`❌ R2 demo failed: ${error.message}\n`);
        }
    }

    async demoDoctor() {
        console.log('🩺 7. System Diagnostics Demo');
        console.log('===========================');
        
        try {
            console.log('🔍 Running diagnostics with Enhanced Docs Fetcher...');
            execSync('node ../bun-docs.cjs doctor --verbose', { stdio: 'inherit' });
            
            console.log('\n✅ Diagnostics complete!');
            console.log('\n📚 Enhanced Docs Fetcher features demonstrated:');
            console.log('- Cache age monitoring');
            console.log('- Cache statistics tracking');
            console.log('- Automatic cache refresh testing');
            console.log('- Fallback to basic docs check');
        } catch (error) {
            console.log(`❌ Doctor demo failed: ${error.message}\n`);
        }
    }

    async demoAnalyze() {
        console.log('📊 8. Analytics Demo');
        console.log('==================');
        
        try {
            console.log('🔄 Generating analysis...');
            execSync('node ../bun-docs.cjs analyze --report --output demo-analysis.json', { stdio: 'inherit' });
            
            // Show the generated report
            if (fs.existsSync('./demo-analysis.json')) {
                const report = JSON.parse(fs.readFileSync('./demo-analysis.json', 'utf8'));
                console.log('\n📋 Analysis Summary:');
                console.log(`- Version: ${report.version}`);
                console.log(`- Secrets configured: ${report.secrets.configured}`);
                console.log(`- RSS feeds: ${report.configuration.rssFeeds}`);
                console.log(`- Cache hit rate: ${(report.performance.cacheHitRate * 100).toFixed(1)}%`);
                console.log(`- Memory usage: ${(report.system.memory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
                
                if (report.recommendations.length > 0) {
                    console.log('\n💡 Recommendations:');
                    report.recommendations.forEach((rec, index) => {
                        console.log(`${index + 1}. ${rec}`);
                    });
                }
            }
            
            console.log('\n✅ Analytics demo complete!\n');
        } catch (error) {
            console.log(`❌ Analytics demo failed: ${error.message}\n`);
        }
    }

    cleanup() {
        try {
            // Return to original directory
            process.chdir('..');
            
            // Remove demo directory
            if (fs.existsSync(this.demoDir)) {
                fs.rmSync(this.demoDir, { recursive: true, force: true });
                console.log('🧹 Cleaned up demo files');
            }
        } catch (error) {
            console.log(`⚠️ Cleanup warning: ${error.message}`);
        }
    }
}

// Interactive demo menu
function showInteractiveMenu() {
    console.log('🎮 Interactive Bun Docs Demo');
    console.log('============================\n');
    console.log('Select a demo to run:');
    console.log('1. 🚀 Full Demo (All features)');
    console.log('2. 📚 Publishing Demo');
    console.log('3. 📡 RSS Management Demo');
    console.log('4. 🗄️ R2 Storage Demo');
    console.log('5. 🩺 Diagnostics Demo');
    console.log('6. 📊 Analytics Demo');
    console.log('7. 🐚 Interactive Shell Demo');
    console.log('8. ❌ Exit');
    console.log();
}

async function runInteractiveDemo() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (question) => {
        return new Promise((resolve) => {
            rl.question(question, resolve);
        });
    };

    while (true) {
        showInteractiveMenu();
        const choice = await askQuestion('Enter your choice (1-8): ');
        
        const demo = new BunDocsDemo();
        
        switch (choice) {
            case '1':
                await demo.runDemo();
                break;
            case '2':
                await demo.demoInit();
                await demo.demoPublish();
                demo.cleanup();
                break;
            case '3':
                await demo.demoRSS();
                break;
            case '4':
                await demo.demoR2();
                break;
            case '5':
                await demo.demoDoctor();
                break;
            case '6':
                await demo.demoAnalyze();
                break;
            case '7':
                console.log('🐚 Starting interactive shell demo...');
                console.log('Type "exit" to return to menu\n');
                try {
                    execSync('node bun-docs.cjs shell', { stdio: 'inherit' });
                } catch (error) {
                    console.log(`Shell demo ended: ${error.message}`);
                }
                break;
            case '8':
                rl.close();
                console.log('👋 Goodbye!');
                return;
            default:
                console.log('❌ Invalid choice. Please try again.\n');
        }
        
        if (choice !== '7') {
            await askQuestion('\nPress Enter to continue...');
        }
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--interactive') || args.includes('-i')) {
        runInteractiveDemo().catch(console.error);
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🎮 Bun Docs Demo Script

USAGE:
  node bun-docs-demo.cjs [options]

OPTIONS:
  --interactive, -i    Run interactive demo menu
  --help, -h          Show this help

EXAMPLES:
  node bun-docs-demo.cjs              # Run full demo
  node bun-docs-demo.cjs --interactive # Interactive menu
        `);
    } else {
        const demo = new BunDocsDemo();
        demo.runDemo().catch(console.error);
    }
}

module.exports = BunDocsDemo;

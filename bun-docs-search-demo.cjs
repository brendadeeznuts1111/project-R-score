#!/usr/bin/env node

/**
 * Bun Docs Search Demo
 * Demonstrates the advanced search capabilities of bun-docs CLI
 */

const { execSync } = require('child_process');

class BunDocsSearchDemo {
    constructor() {
        this.searchExamples = [
            { query: 'Bun.serve', description: 'Search for Bun.serve API' },
            { query: 'sqlite', description: 'Search for SQLite database' },
            { query: 'linker', options: ['--com'], description: 'Search for linker with modern domain' },
            { query: 'copyfile', options: ['--sh'], description: 'Search for file system with legacy domain' },
            { query: 'http', options: ['--limit', '3'], description: 'Search for HTTP API with limited results' }
        ];
    }

    async runDemo() {
        console.log('🔍 Bun Docs Search Demo');
        console.log('======================\n');

        // First, build the index
        console.log('📚 Building search index...');
        try {
            execSync('node bun-docs.cjs index --verbose', { stdio: 'inherit' });
            console.log('');
        } catch (error) {
            console.log('⚠️ Index build had issues, continuing with demo...\n');
        }

        // Run search examples
        for (const example of this.searchExamples) {
            await this.runSearchExample(example);
        }

        // Show advanced usage
        this.showAdvancedUsage();

        console.log('\n🎉 Search demo completed!');
        console.log('\n💡 Pro tip: Pipe search results to open command');
        console.log('   bun-docs search "Binary" | head -n 1 | xargs -I {} bun-docs open "{}" --app');
    }

    async runSearchExample(example) {
        console.log(`🔍 ${example.description}`);
        console.log('='.repeat(example.description.length + 3));
        
        const args = ['search', example.query];
        if (example.options) {
            args.push(...example.options);
        }

        try {
            console.log(`📝 Command: bun-docs ${args.join(' ')}`);
            execSync(`node bun-docs.cjs ${args.join(' ')}`, { stdio: 'inherit' });
        } catch (error) {
            console.log(`❌ Search failed: ${error.message}`);
        }
        
        console.log('\n' + '-'.repeat(50) + '\n');
    }

    showAdvancedUsage() {
        console.log('🚀 Advanced Search Usage');
        console.log('========================\n');

        console.log('🎯 Domain Switching:');
        console.log('   bun-docs search "serve" --com   # Modern bun.com domain');
        console.log('   bun-docs search "serve" --sh    # Legacy bun.sh domain\n');

        console.log('🌐 Auto-open Results:');
        console.log('   bun-docs search "sqlite" --open           # Open top result');
        console.log('   bun-docs search "sqlite" --open --app     # Open in Chrome App\n');

        console.log('📊 Result Limiting:');
        console.log('   bun-docs search "http" --limit 5         # Limit to 5 results');
        console.log('   bun-docs search "api" --limit 1 --open    # Quick search and open\n');

        console.log('🔧 Index Management:');
        console.log('   bun-docs index --force                   # Force rebuild index');
        console.log('   bun-docs index --verbose                 # Show indexing details\n');

        console.log('⚡ Performance Tips:');
        console.log('   • Set BUN_DOCS_CACHE_TTL for custom cache duration');
        console.log('   • Use --limit for faster results');
        console.log('   • Cache is automatically refreshed when expired');
        console.log('   • Index lookup is <5ms with fresh cache\n');
    }
}

// Interactive demo menu
function showInteractiveMenu() {
    console.log('🎮 Interactive Search Demo');
    console.log('==========================\n');
    console.log('Select a search demo:');
    console.log('1. 🚀 Full Search Demo (All examples)');
    console.log('2. 🔍 Basic API Search');
    console.log('3. 🗄️ Database Search');
    console.log('4. ⚙️ Bundler Search');
    console.log('5. 📁 File System Search');
    console.log('6. 🌐 Domain Comparison');
    console.log('7. 📊 Limited Results');
    console.log('8. 🎯 Custom Search');
    console.log('9. ❌ Exit');
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
        const choice = await askQuestion('Enter your choice (1-9): ');
        
        switch (choice) {
            case '1':
                const fullDemo = new BunDocsSearchDemo();
                await fullDemo.runDemo();
                break;
            case '2':
                console.log('🔍 Searching for Bun.serve API...');
                execSync('node bun-docs.cjs search "Bun.serve"', { stdio: 'inherit' });
                break;
            case '3':
                console.log('🗄️ Searching for SQLite database...');
                execSync('node bun-docs.cjs search "sqlite"', { stdio: 'inherit' });
                break;
            case '4':
                console.log('⚙️ Searching for bundler linker...');
                execSync('node bun-docs.cjs search "linker" --com', { stdio: 'inherit' });
                break;
            case '5':
                console.log('📁 Searching for file system operations...');
                execSync('node bun-docs.cjs search "copyfile" --sh', { stdio: 'inherit' });
                break;
            case '6':
                console.log('🌐 Comparing domain results for "serve"...');
                console.log('Modern bun.com:');
                execSync('node bun-docs.cjs search "serve" --com --limit 2', { stdio: 'inherit' });
                console.log('\nLegacy bun.sh:');
                execSync('node bun-docs.cjs search "serve" --sh --limit 2', { stdio: 'inherit' });
                break;
            case '7':
                console.log('📊 Limited results for "http"...');
                execSync('node bun-docs.cjs search "http" --limit 3', { stdio: 'inherit' });
                break;
            case '8':
                const customQuery = await askQuestion('Enter search query: ');
                const domain = await askQuestion('Domain (com/sh) [com]: ');
                const limit = await askQuestion('Result limit [10]: ');
                
                const args = ['search', `"${customQuery}"`];
                if (domain === 'sh') args.push('--sh');
                if (limit && limit !== '10') args.push('--limit', limit);
                
                console.log(`🔍 Searching for "${customQuery}"...`);
                execSync(`node bun-docs.cjs ${args.join(' ')}`, { stdio: 'inherit' });
                break;
            case '9':
                rl.close();
                console.log('👋 Goodbye!');
                return;
            default:
                console.log('❌ Invalid choice. Please try again.\n');
        }
        
        if (choice !== '9') {
            await askQuestion('\nPress Enter to continue...');
            console.log();
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
🎮 Bun Docs Search Demo

USAGE:
  node bun-docs-search-demo.cjs [options]

OPTIONS:
  --interactive, -i    Run interactive demo menu
  --help, -h          Show this help

EXAMPLES:
  node bun-docs-search-demo.cjs              # Run full demo
  node bun-docs-search-demo.cjs --interactive # Interactive menu
        `);
    } else {
        const demo = new BunDocsSearchDemo();
        demo.runDemo().catch(console.error);
    }
}

module.exports = BunDocsSearchDemo;

#!/usr/bin/env bun
import { CheatsheetCore } from './cheatsheet-core.js';
import { existsSync } from 'fs';
import { join } from 'path';

class IntegratedCheatsheetSystem {
  constructor() {
    this.core = new CheatsheetCore();
    this.modules = {};
  }

  async initialize() {
    console.clear();
    this.showBanner();
    
    // Load additional modules
    await this.loadModules();
    
    console.log('🚀 Integrated Cheatsheet System Ready!');
    console.log('💡 Type "help" to see all available commands\n');
    
    this.startInteractiveMode();
  }

  showBanner() {
    const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏆 INTEGRATED BUN CHEATSHEET SYSTEM                        ║
║   =========================================                     ║
║                                                               ║
║   Advanced Search • AI Integration • Real-time Examples        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `;
    console.log(banner);
  }

  async loadModules() {
    const modules = [
      { name: 'AI Playground', path: '../examples/ai-playground.js' },
      { name: 'RSS Reader', path: '../examples/rss-reader.js' },
      { name: 'GitHub Explorer', path: '../examples/github-explorer.js' },
      { name: 'Workflows', path: '../examples/workflows/testing.js' }
    ];
    
    for (const module of modules) {
      try {
        if (existsSync(join(process.cwd(), module.path))) {
          const mod = await import(module.path);
          this.modules[module.name.toLowerCase().replace(/\s+/g, '-')] = mod;
          console.log(`✅ ${module.name} loaded`);
        }
      } catch (error) {
        console.log(`⚠️  ${module.name} failed to load: ${error.message}`);
      }
    }
  }

  startInteractiveMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🏆> '
    });

    const handleCommand = async (input) => {
      if (!input) return;
      
      const parts = input.trim().split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch (command) {
        case 'help':
          this.showHelp();
          break;
          
        case 'search':
          await this.handleSearch(args.join(' '));
          break;
          
        case 'ai':
          await this.handleAICommand(args);
          break;
          
        case 'rss':
          await this.handleRSSCommand(args);
          break;
          
        case 'github':
          await this.handleGitHubCommand(args);
          break;
          
        case 'workflow':
          await this.handleWorkflowCommand(args);
          break;
          
        case 'modules':
          this.showModules();
          break;
          
        case 'demo':
          await this.runDemo(args[0]);
          break;
          
        case 'stats':
          this.showStats();
          break;
          
        case 'clear':
          console.clear();
          this.showBanner();
          break;
          
        case 'exit':
        case 'quit':
          rl.close();
          return;
          
        default:
          // Try core cheatsheet commands
          if (['tip', 'list'].includes(command)) {
            await this.handleCoreCommand(command, args);
          } else {
            console.log(`❌ Unknown command: ${command}`);
            console.log('💡 Type "help" for available commands');
          }
          break;
      }
    };

    rl.on('line', handleCommand);
    rl.on('close', () => {
      console.log('\n👋 Goodbye! Happy coding with Bun!');
      process.exit(0);
    });

    rl.prompt();
  }

  showHelp() {
    console.log('\n📚 Integrated Cheatsheet Commands:');
    console.log('='.repeat(50));
    
    const commands = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'search <query>', desc: 'Search all cheatsheets' },
      { cmd: 'ai <subcommand>', desc: 'AI Playground commands' },
      { cmd: 'rss <subcommand>', desc: 'RSS Reader commands' },
      { cmd: 'github <subcommand>', desc: 'GitHub Explorer commands' },
      { cmd: 'workflow <type>', desc: 'Run workflow demos' },
      { cmd: 'modules', desc: 'Show loaded modules' },
      { cmd: 'demo <type>', desc: 'Run integrated demo' },
      { cmd: 'stats', desc: 'Show system statistics' },
      { cmd: 'tip', desc: 'Get random cheatsheet tip' },
      { cmd: 'list', desc: 'List all cheatsheets' },
      { cmd: 'clear', desc: 'Clear screen' },
      { cmd: 'exit', desc: 'Exit system' }
    ];
    
    commands.forEach(item => {
      console.log(`  ${item.cmd.padEnd(25)} ${item.desc}`);
    });
    
    console.log('\n🤖 AI Commands:');
    console.log('  ai generate <prompt>    - Generate code');
    console.log('  ai review <code>       - Review code');
    console.log('  ai docs <code>         - Generate docs');
    
    console.log('\n📡 RSS Commands:');
    console.log('  rss parse <url>         - Parse RSS feed');
    console.log('  rss search <query>     - Search feed items');
    
    console.log('\n🐙 GitHub Commands:');
    console.log('  github repo <owner/repo> - Get repository info');
    console.log('  github commits <repo>   - Show commit history');
    
    console.log('\n🔧 Workflow Commands:');
    console.log('  workflow testing        - Testing workflow demo');
    console.log('  workflow deployment     - Deployment workflow demo');
    console.log('  workflow pre-commit     - Pre-commit workflow demo');
  }

  async handleSearch(query) {
    if (!query) {
      console.log('Usage: search <query>');
      return;
    }
    
    console.log(`🔍 Searching for: "${query}"`);
    const results = this.core.search(query);
    this.core.displayResults(results);
    
    // Also search in loaded modules
    console.log('\n🔍 Searching in integrated modules...');
    for (const [moduleName, module] of Object.entries(this.modules)) {
      if (module.search && typeof module.search === 'function') {
        try {
          const moduleResults = await module.search(query);
          if (moduleResults && moduleResults.length > 0) {
            console.log(`\n📦 Found in ${moduleName}:`);
            moduleResults.slice(0, 3).forEach(result => {
              console.log(`   • ${result}`);
            });
          }
        } catch (error) {
          // Ignore search errors in modules
        }
      }
    }
  }

  async handleAICommand(args) {
    const subcommand = args[0];
    
    if (!subcommand) {
      console.log('AI Commands: generate, review, docs, optimize');
      return;
    }
    
    const aiModule = this.modules['ai-playground'];
    if (!aiModule) {
      console.log('❌ AI Playground module not loaded');
      return;
    }
    
    switch (subcommand) {
      case 'generate':
        const prompt = args.slice(1).join(' ') || 'create a simple HTTP server';
        console.log(`🤖 Generating code for: "${prompt}"`);
        await aiModule.demoAIPlayground();
        break;
        
      case 'review':
        console.log('🔍 AI Code Review Demo:');
        await aiModule.demoAIPlayground();
        break;
        
      case 'docs':
        console.log('📚 AI Documentation Demo:');
        await aiModule.demoAIPlayground();
        break;
        
      default:
        console.log('🤖 Running AI Playground Demo:');
        await aiModule.demoAIPlayground();
        break;
    }
  }

  async handleRSSCommand(args) {
    const subcommand = args[0];
    
    if (!subcommand) {
      console.log('RSS Commands: parse, search, analyze');
      return;
    }
    
    const rssModule = this.modules['rss-reader'];
    if (!rssModule) {
      console.log('❌ RSS Reader module not loaded');
      return;
    }
    
    console.log('📡 Running RSS Reader Demo:');
    await rssModule.demoRSSReader();
  }

  async handleGitHubCommand(args) {
    const subcommand = args[0];
    
    if (!subcommand) {
      console.log('GitHub Commands: repo, commits, issues, releases');
      return;
    }
    
    const githubModule = this.modules['github-explorer'];
    if (!githubModule) {
      console.log('❌ GitHub Explorer module not loaded');
      return;
    }
    
    console.log('🐙 Running GitHub Explorer Demo:');
    await githubModule.demoGitHubExplorer();
  }

  async handleWorkflowCommand(args) {
    const workflowType = args[0];
    
    if (!workflowType) {
      console.log('Available workflows: testing, deployment, pre-commit');
      return;
    }
    
    try {
      const workflowPath = `../examples/workflows/${workflowType}.js`;
      if (existsSync(join(process.cwd(), workflowPath))) {
        const workflow = await import(workflowPath);
        console.log(`🔧 Running ${workflowType} workflow demo:`);
        await workflow[`demo${workflowType.charAt(0).toUpperCase() + workflowType.slice(1)}Workflow`]();
      } else {
        console.log(`❌ Workflow not found: ${workflowType}`);
      }
    } catch (error) {
      console.log(`❌ Workflow error: ${error.message}`);
    }
  }

  showModules() {
    console.log('\n📦 Loaded Modules:');
    console.log('='.repeat(30));
    
    Object.keys(this.modules).forEach(name => {
      console.log(`  • ${name}`);
    });
    
    console.log(`\n📊 Total modules: ${Object.keys(this.modules).length}`);
  }

  async runDemo(type) {
    if (!type) {
      console.log('Available demos: ai, rss, github, testing, deployment, pre-commit');
      return;
    }
    
    switch (type) {
      case 'ai':
        await this.handleAICommand([]);
        break;
      case 'rss':
        await this.handleRSSCommand([]);
        break;
      case 'github':
        await this.handleGitHubCommand([]);
        break;
      default:
        await this.handleWorkflowCommand([type]);
        break;
    }
  }

  showStats() {
    console.log('\n📊 System Statistics:');
    console.log('='.repeat(30));
    
    const stats = {
      cheatsheets: Object.keys(this.core.cheatsheets).length,
      modules: Object.keys(this.modules).length,
      commands: this.getTotalCommands(),
      examples: this.getTotalExamples()
    };
    
    console.log(`📚 Cheatsheets: ${stats.cheatsheets}`);
    console.log(`📦 Modules: ${stats.modules}`);
    console.log(`⚡ Commands: ${stats.commands}`);
    console.log(`📝 Examples: ${stats.examples}`);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    console.log(`💾 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    
    // Bun version
    console.log(`🔧 Bun version: ${Bun.version}`);
  }

  getTotalCommands() {
    let total = 0;
    for (const cheatsheet of Object.values(this.core.cheatsheets)) {
      for (const section of Object.values(cheatsheet)) {
        if (section.commands) {
          total += Object.keys(section.commands).length;
        }
      }
    }
    return total;
  }

  getTotalExamples() {
    let total = 0;
    for (const cheatsheet of Object.values(this.core.cheatsheet)) {
      for (const section of Object.values(cheatsheet)) {
        if (section.examples) {
          total += section.examples.length;
        }
      }
    }
    return total;
  }

  async handleCoreCommand(command, args) {
    switch (command) {
      case 'tip':
        const tip = this.core.getRandomTip();
        console.log('💡 Cheatsheet Tip:');
        console.log(tip.type === 'command' ? `$ ${tip.content}` : tip.content);
        break;
        
      case 'list':
        console.log('📚 Available Cheatsheets:');
        Object.keys(this.core.cheatsheets).forEach(cat => {
          console.log(`  • ${cat}`);
        });
        break;
    }
  }
}

// CLI Interface
if (import.meta.main) {
  const system = new IntegratedCheatsheetSystem();
  await system.initialize();
}

export { IntegratedCheatsheetSystem };

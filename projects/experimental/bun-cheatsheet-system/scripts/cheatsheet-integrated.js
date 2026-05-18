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
    
    console.info('🚀 Integrated Cheatsheet System Ready!');
    console.info('💡 Type "help" to see all available commands\n');
    
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
    console.info(banner);
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
          console.info(`✅ ${module.name} loaded`);
        }
      } catch (error) {
        console.info(`⚠️  ${module.name} failed to load: ${error.message}`);
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
            console.info(`❌ Unknown command: ${command}`);
            console.info('💡 Type "help" for available commands');
          }
          break;
      }
    };

    rl.on('line', handleCommand);
    rl.on('close', () => {
      console.info('\n👋 Goodbye! Happy coding with Bun!');
      process.exit(0);
    });

    rl.prompt();
  }

  showHelp() {
    console.info('\n📚 Integrated Cheatsheet Commands:');
    console.info('='.repeat(50));
    
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
      console.info(`  ${item.cmd.padEnd(25)} ${item.desc}`);
    });
    
    console.info('\n🤖 AI Commands:');
    console.info('  ai generate <prompt>    - Generate code');
    console.info('  ai review <code>       - Review code');
    console.info('  ai docs <code>         - Generate docs');
    
    console.info('\n📡 RSS Commands:');
    console.info('  rss parse <url>         - Parse RSS feed');
    console.info('  rss search <query>     - Search feed items');
    
    console.info('\n🐙 GitHub Commands:');
    console.info('  github repo <owner/repo> - Get repository info');
    console.info('  github commits <repo>   - Show commit history');
    
    console.info('\n🔧 Workflow Commands:');
    console.info('  workflow testing        - Testing workflow demo');
    console.info('  workflow deployment     - Deployment workflow demo');
    console.info('  workflow pre-commit     - Pre-commit workflow demo');
  }

  async handleSearch(query) {
    if (!query) {
      console.info('Usage: search <query>');
      return;
    }
    
    console.info(`🔍 Searching for: "${query}"`);
    const results = this.core.search(query);
    this.core.displayResults(results);
    
    // Also search in loaded modules
    console.info('\n🔍 Searching in integrated modules...');
    for (const [moduleName, module] of Object.entries(this.modules)) {
      if (module.search && typeof module.search === 'function') {
        try {
          const moduleResults = await module.search(query);
          if (moduleResults && moduleResults.length > 0) {
            console.info(`\n📦 Found in ${moduleName}:`);
            moduleResults.slice(0, 3).forEach(result => {
              console.info(`   • ${result}`);
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
      console.info('AI Commands: generate, review, docs, optimize');
      return;
    }
    
    const aiModule = this.modules['ai-playground'];
    if (!aiModule) {
      console.info('❌ AI Playground module not loaded');
      return;
    }
    
    switch (subcommand) {
      case 'generate':
        const prompt = args.slice(1).join(' ') || 'create a simple HTTP server';
        console.info(`🤖 Generating code for: "${prompt}"`);
        await aiModule.demoAIPlayground();
        break;
        
      case 'review':
        console.info('🔍 AI Code Review Demo:');
        await aiModule.demoAIPlayground();
        break;
        
      case 'docs':
        console.info('📚 AI Documentation Demo:');
        await aiModule.demoAIPlayground();
        break;
        
      default:
        console.info('🤖 Running AI Playground Demo:');
        await aiModule.demoAIPlayground();
        break;
    }
  }

  async handleRSSCommand(args) {
    const subcommand = args[0];
    
    if (!subcommand) {
      console.info('RSS Commands: parse, search, analyze');
      return;
    }
    
    const rssModule = this.modules['rss-reader'];
    if (!rssModule) {
      console.info('❌ RSS Reader module not loaded');
      return;
    }
    
    console.info('📡 Running RSS Reader Demo:');
    await rssModule.demoRSSReader();
  }

  async handleGitHubCommand(args) {
    const subcommand = args[0];
    
    if (!subcommand) {
      console.info('GitHub Commands: repo, commits, issues, releases');
      return;
    }
    
    const githubModule = this.modules['github-explorer'];
    if (!githubModule) {
      console.info('❌ GitHub Explorer module not loaded');
      return;
    }
    
    console.info('🐙 Running GitHub Explorer Demo:');
    await githubModule.demoGitHubExplorer();
  }

  async handleWorkflowCommand(args) {
    const workflowType = args[0];
    
    if (!workflowType) {
      console.info('Available workflows: testing, deployment, pre-commit');
      return;
    }
    
    try {
      const workflowPath = `../examples/workflows/${workflowType}.js`;
      if (existsSync(join(process.cwd(), workflowPath))) {
        const workflow = await import(workflowPath);
        console.info(`🔧 Running ${workflowType} workflow demo:`);
        await workflow[`demo${workflowType.charAt(0).toUpperCase() + workflowType.slice(1)}Workflow`]();
      } else {
        console.info(`❌ Workflow not found: ${workflowType}`);
      }
    } catch (error) {
      console.info(`❌ Workflow error: ${error.message}`);
    }
  }

  showModules() {
    console.info('\n📦 Loaded Modules:');
    console.info('='.repeat(30));
    
    Object.keys(this.modules).forEach(name => {
      console.info(`  • ${name}`);
    });
    
    console.info(`\n📊 Total modules: ${Object.keys(this.modules).length}`);
  }

  async runDemo(type) {
    if (!type) {
      console.info('Available demos: ai, rss, github, testing, deployment, pre-commit');
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
    console.info('\n📊 System Statistics:');
    console.info('='.repeat(30));
    
    const stats = {
      cheatsheets: Object.keys(this.core.cheatsheets).length,
      modules: Object.keys(this.modules).length,
      commands: this.getTotalCommands(),
      examples: this.getTotalExamples()
    };
    
    console.info(`📚 Cheatsheets: ${stats.cheatsheets}`);
    console.info(`📦 Modules: ${stats.modules}`);
    console.info(`⚡ Commands: ${stats.commands}`);
    console.info(`📝 Examples: ${stats.examples}`);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    console.info(`💾 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    
    // Bun version
    console.info(`🔧 Bun version: ${Bun.version}`);
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
        console.info('💡 Cheatsheet Tip:');
        console.info(tip.type === 'command' ? `$ ${tip.content}` : tip.content);
        break;
        
      case 'list':
        console.info('📚 Available Cheatsheets:');
        Object.keys(this.core.cheatsheets).forEach(cat => {
          console.info(`  • ${cat}`);
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

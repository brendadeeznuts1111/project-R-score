#!/usr/bin/env bun
import readline from 'readline';
import { CheatsheetCore } from '../scripts/cheatsheet-core.js';
import { existsSync } from 'fs';
import { join } from 'path';

class InteractivePlayground {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🏆> '
    });
    
    this.cheatsheet = new CheatsheetCore();
    this.history = [];
    this.modules = {};
  }

  async initialize() {
    console.clear();
    this.showBanner();
    
    // Load additional modules if available
    await this.loadModules();
    
    console.info('🚀 Interactive Playground Ready!');
    console.info('💡 Type "help" to see available commands\n');
    
    this.rl.prompt();
    
    this.rl.on('line', async (line) => {
      await this.handleCommand(line.trim());
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.info('\n👋 Goodbye! Happy coding!');
      process.exit(0);
    });
  }

  showBanner() {
    const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏆 BUN INTERACTIVE PLAYGROUND                              ║
║   ===============================                             ║
║                                                               ║
║   Explore, Learn, and Experiment with Bun & TypeScript        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `;
    console.info(banner);
  }

  async loadModules() {
    const modules = [
      { name: 'HTTP Client', path: '../examples/http/basic-fetch.js' },
      { name: 'Bun API Examples', path: '../examples/bun-api/file-operations.js' },
      { name: 'GitHub Explorer', path: '../examples/github-explorer.js' },
    ];
    
    for (const module of modules) {
      try {
        if (existsSync(join(process.cwd(), module.path))) {
          const mod = await import(module.path);
          this.modules[module.name.toLowerCase().replace(/\s+/g, '-')] = mod;
          console.info(`✅ ${module.name} loaded`);
        }
      } catch (error) {
        // Module loading is optional
      }
    }
  }

  async handleCommand(input) {
    if (!input) return;
    
    this.history.push(input);
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (command) {
      case 'help':
        this.showHelp();
        break;
        
      case 'search':
        const query = args.join(' ');
        if (query) {
          const results = this.cheatsheet.search(query);
          this.cheatsheet.displayResults(results);
        } else {
          console.info('Usage: search <query>');
        }
        break;
        
      case 'tip':
        const tip = this.cheatsheet.getRandomTip();
        console.info('💡 Tip:');
        console.info(tip.type === 'command' ? `$ ${tip.content}` : tip.content);
        break;
        
      case 'history':
        console.info('📜 Command History:');
        this.history.forEach((cmd, i) => {
          console.info(`${i + 1}. ${cmd}`);
        });
        break;
        
      case 'clear':
        console.clear();
        this.showBanner();
        break;
        
      case 'exit':
      case 'quit':
        this.rl.close();
        break;
        
      case 'demo':
        await this.runDemo(args[0] || 'http');
        break;
        
      case 'run':
        await this.runExample(args.join(' '));
        break;
        
      case 'modules':
        console.info('📦 Loaded Modules:');
        Object.keys(this.modules).forEach(mod => {
          console.info(`  • ${mod}`);
        });
        break;
        
      case 'bun':
        this.showBunInfo();
        break;
        
      default:
        console.info(`❌ Unknown command: ${command}`);
        console.info('💡 Type "help" for available commands');
        break;
    }
  }

  showHelp() {
    console.info('\n📚 Available Commands:');
    console.info('='.repeat(50));
    
    const commands = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'search <query>', desc: 'Search cheatsheets' },
      { cmd: 'tip', desc: 'Get random cheatsheet tip' },
      { cmd: 'history', desc: 'Show command history' },
      { cmd: 'clear', desc: 'Clear screen' },
      { cmd: 'modules', desc: 'Show loaded modules' },
      { cmd: 'demo <type>', desc: 'Run demo (http, bun, github)' },
      { cmd: 'run <example>', desc: 'Run specific example' },
      { cmd: 'bun', desc: 'Show Bun runtime info' },
      { cmd: 'exit', desc: 'Exit playground' },
    ];
    
    commands.forEach(item => {
      console.info(`  ${item.cmd.padEnd(20)} ${item.desc}`);
    });
    
    console.info('\n🎯 Examples:');
    console.info('  search "file read"    - Find file operations');
    console.info('  demo http             - Run HTTP client demo');
    console.info('  run basic-fetch       - Run specific example');
  }

  async runDemo(type) {
    console.info(`\n🎬 Running ${type} demo...`);
    
    switch (type) {
      case 'http':
        await this.demoHTTP();
        break;
      case 'bun':
        await this.demoBunAPI();
        break;
      case 'github':
        await this.demoGitHub();
        break;
      default:
        console.info(`❌ Unknown demo type: ${type}`);
        console.info('Available: http, bun, github');
    }
  }

  async demoHTTP() {
    console.info('\n🌐 HTTP Client Demo');
    console.info('='.repeat(40));
    
    try {
      const response = await fetch('https://httpbin.org/anything', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playground: 'demo', timestamp: Date.now() }),
      });
      
      const data = await response.json();
      console.info('✅ Request successful!');
      console.info(`Method: ${data.method}`);
      console.info(`Status: ${response.status}`);
      console.info(`Headers: ${JSON.stringify(data.headers, null, 2)}`);
      
    } catch (error) {
      console.info(`❌ Error: ${error.message}`);
    }
  }

  async demoBunAPI() {
    console.info('\n⚡ Bun API Demo');
    console.info('='.repeat(40));
    
    console.info('Bun Runtime Information:');
    console.info(`Version: ${Bun.version}`);
    console.info(`Platform: ${process.platform}`);
    console.info(`Architecture: ${process.arch}`);
    console.info(`Node.js Compat: ${process.versions.node}`);
    
    // Demonstrate file writing/reading
    const tempFile = './playground-temp.txt';
    try {
      await Bun.write(tempFile, 'Hello from Bun Playground!\n' + new Date().toISOString());
      const content = await Bun.file(tempFile).text();
      console.info('\n📝 File Operations:');
      console.info(`Wrote and read file: ${tempFile}`);
      console.info(`Content: ${content}`);
      
      // Clean up
      await Bun.file(tempFile).delete();
    } catch (error) {
      console.info(`File error: ${error.message}`);
    }
  }

  async demoGitHub() {
    console.info('\n🐙 GitHub API Demo');
    console.info('='.repeat(40));
    
    try {
      const response = await fetch('https://api.github.com/repos/oven-sh/bun');
      if (response.ok) {
        const repo = await response.json();
        console.info('✅ Bun Repository Info:');
        console.info(`Name: ${repo.name}`);
        console.info(`Stars: ${repo.stargazers_count}`);
        console.info(`Forks: ${repo.forks_count}`);
        console.info(`Open Issues: ${repo.open_issues_count}`);
      } else {
        console.info(`❌ GitHub API error: ${response.status}`);
      }
    } catch (error) {
      console.info(`❌ Network error: ${error.message}`);
    }
  }

  async runExample(exampleName) {
    console.info(`\n🚀 Running example: ${exampleName}`);
    
    // Map example names to module functions
    const examples = {
      'basic-fetch': () => this.modules['http-client']?.demoBasicFetch?.(),
      'file-ops': () => this.modules['bun-api-examples']?.demoFileOperations?.(),
    };
    
    if (examples[exampleName]) {
      await examples[exampleName]();
    } else {
      console.info(`❌ Example not found: ${exampleName}`);
      console.info('Available examples:');
      Object.keys(examples).forEach(ex => console.info(`  • ${ex}`));
    }
  }

  showBunInfo() {
    console.info('\n⚡ Bun Runtime Information');
    console.info('='.repeat(40));
    
    const info = {
      'Bun Version': Bun.version,
      'Platform': process.platform,
      'Architecture': process.arch,
      'Node.js Version': process.versions.node,
      'V8 Version': process.versions.v8,
      'UV Version': process.versions.uv,
      'Executable': process.execPath,
      'PID': process.pid,
      'Memory Usage': `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    };
    
    Object.entries(info).forEach(([key, value]) => {
      console.info(`${key.padEnd(20)}: ${value}`);
    });
  }
}

// Start the playground
if (import.meta.main) {
  const playground = new InteractivePlayground();
  await playground.initialize();
}

export { InteractivePlayground };

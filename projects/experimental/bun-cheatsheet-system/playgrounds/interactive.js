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
    
    console.log('🚀 Interactive Playground Ready!');
    console.log('💡 Type "help" to see available commands\n');
    
    this.rl.prompt();
    
    this.rl.on('line', async (line) => {
      await this.handleCommand(line.trim());
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log('\n👋 Goodbye! Happy coding!');
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
    console.log(banner);
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
          console.log(`✅ ${module.name} loaded`);
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
          console.log('Usage: search <query>');
        }
        break;
        
      case 'tip':
        const tip = this.cheatsheet.getRandomTip();
        console.log('💡 Tip:');
        console.log(tip.type === 'command' ? `$ ${tip.content}` : tip.content);
        break;
        
      case 'history':
        console.log('📜 Command History:');
        this.history.forEach((cmd, i) => {
          console.log(`${i + 1}. ${cmd}`);
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
        console.log('📦 Loaded Modules:');
        Object.keys(this.modules).forEach(mod => {
          console.log(`  • ${mod}`);
        });
        break;
        
      case 'bun':
        this.showBunInfo();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('💡 Type "help" for available commands');
        break;
    }
  }

  showHelp() {
    console.log('\n📚 Available Commands:');
    console.log('='.repeat(50));
    
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
      console.log(`  ${item.cmd.padEnd(20)} ${item.desc}`);
    });
    
    console.log('\n🎯 Examples:');
    console.log('  search "file read"    - Find file operations');
    console.log('  demo http             - Run HTTP client demo');
    console.log('  run basic-fetch       - Run specific example');
  }

  async runDemo(type) {
    console.log(`\n🎬 Running ${type} demo...`);
    
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
        console.log(`❌ Unknown demo type: ${type}`);
        console.log('Available: http, bun, github');
    }
  }

  async demoHTTP() {
    console.log('\n🌐 HTTP Client Demo');
    console.log('='.repeat(40));
    
    try {
      const response = await fetch('https://httpbin.org/anything', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playground: 'demo', timestamp: Date.now() }),
      });
      
      const data = await response.json();
      console.log('✅ Request successful!');
      console.log(`Method: ${data.method}`);
      console.log(`Status: ${response.status}`);
      console.log(`Headers: ${JSON.stringify(data.headers, null, 2)}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async demoBunAPI() {
    console.log('\n⚡ Bun API Demo');
    console.log('='.repeat(40));
    
    console.log('Bun Runtime Information:');
    console.log(`Version: ${Bun.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log(`Node.js Compat: ${process.versions.node}`);
    
    // Demonstrate file writing/reading
    const tempFile = './playground-temp.txt';
    try {
      await Bun.write(tempFile, 'Hello from Bun Playground!\n' + new Date().toISOString());
      const content = await Bun.file(tempFile).text();
      console.log('\n📝 File Operations:');
      console.log(`Wrote and read file: ${tempFile}`);
      console.log(`Content: ${content}`);
      
      // Clean up
      await Bun.file(tempFile).delete();
    } catch (error) {
      console.log(`File error: ${error.message}`);
    }
  }

  async demoGitHub() {
    console.log('\n🐙 GitHub API Demo');
    console.log('='.repeat(40));
    
    try {
      const response = await fetch('https://api.github.com/repos/oven-sh/bun');
      if (response.ok) {
        const repo = await response.json();
        console.log('✅ Bun Repository Info:');
        console.log(`Name: ${repo.name}`);
        console.log(`Stars: ${repo.stargazers_count}`);
        console.log(`Forks: ${repo.forks_count}`);
        console.log(`Open Issues: ${repo.open_issues_count}`);
      } else {
        console.log(`❌ GitHub API error: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
  }

  async runExample(exampleName) {
    console.log(`\n🚀 Running example: ${exampleName}`);
    
    // Map example names to module functions
    const examples = {
      'basic-fetch': () => this.modules['http-client']?.demoBasicFetch?.(),
      'file-ops': () => this.modules['bun-api-examples']?.demoFileOperations?.(),
    };
    
    if (examples[exampleName]) {
      await examples[exampleName]();
    } else {
      console.log(`❌ Example not found: ${exampleName}`);
      console.log('Available examples:');
      Object.keys(examples).forEach(ex => console.log(`  • ${ex}`));
    }
  }

  showBunInfo() {
    console.log('\n⚡ Bun Runtime Information');
    console.log('='.repeat(40));
    
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
      console.log(`${key.padEnd(20)}: ${value}`);
    });
  }
}

// Start the playground
if (import.meta.main) {
  const playground = new InteractivePlayground();
  await playground.initialize();
}

export { InteractivePlayground };

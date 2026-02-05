#!/usr/bin/env bun

/**
 * 🎯 Command Station - Central Hub for Repository & Project Management
 * 
 * Interactive dashboard providing quick access to all project commands,
 * scripts, status checks, and documentation.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync, spawn } from 'child_process';
import { file, YAML } from 'bun';

interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  command: string;
  dangerous?: boolean;
}

interface ProjectStatus {
  git: {
    branch: string;
    status: string;
    ahead: number;
    behind: number;
  };
  dependencies: {
    installed: boolean;
    outdated: boolean;
  };
  services: {
    api: boolean;
    redis: boolean;
    database: boolean;
  };
  tests: {
    passing: boolean;
    coverage: number;
  };
  build: {
    success: boolean;
    lastBuild: string;
  };
}

class CommandStation {
  private commands: Command[] = [];
  private projectRoot: string;
  private packageJson: any;

  constructor() {
    this.projectRoot = process.cwd();
    this.loadPackageJson();
    this.loadCommands();
  }

  private loadPackageJson() {
    try {
      const pkgPath = join(this.projectRoot, 'package.json');
      this.packageJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch (error) {
      console.error('❌ Failed to load package.json:', error);
      this.packageJson = {};
    }
  }

  private loadCommands() {
    if (!this.packageJson.scripts) return;

    const categories = {
      'Development': ['dev', 'build', 'start', 'watch', 'hot'],
      'Testing': ['test', 'coverage', 'validate', 'check'],
      'AI & Registry': ['ai:', 'registry:', 'dashboard:', 'endpoint:'],
      'Database': ['db:', 'migrate', 'seed', 'backup'],
      'Deployment': ['deploy', 'production:', 'docker:', 'repo:'],
      'Monitoring': ['health', 'metrics', 'monitor', 'logs'],
      'CI/CD': ['ci:', 'validate:', 'lint', 'format'],
      'Utilities': ['clean', 'install', 'bun:', 'demo', 'smoke']
    };

    for (const [scriptName, scriptCommand] of Object.entries(this.packageJson.scripts)) {
      const category = this.categorizeCommand(scriptName as string, categories);
      if (category) {
        this.commands.push({
          id: scriptName,
          name: scriptName,
          description: this.generateDescription(scriptName as string, scriptCommand as string),
          category,
          command: scriptCommand as string,
          dangerous: this.isDangerous(scriptName as string)
        });
      }
    }

    // Sort commands by category and name
    this.commands.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }

  private categorizeCommand(name: string, categories: Record<string, string[]>): string | null {
    for (const [category, patterns] of Object.entries(categories)) {
      if (patterns.some(pattern => name.includes(pattern))) {
        return category;
      }
    }
    return 'Other';
  }

  private generateDescription(name: string, command: string): string {
    // Extract meaningful description from command or name
    if (name.includes('dev')) return 'Start development server';
    if (name.includes('build')) return 'Build project';
    if (name.includes('test')) return 'Run tests';
    if (name.includes('deploy')) return 'Deploy to production';
    if (name.includes('dashboard')) return 'Dashboard operations';
    if (name.includes('registry')) return 'Registry operations';
    if (name.includes('ai')) return 'AI registry operations';
    if (name.includes('health')) return 'Health check';
    if (name.includes('validate')) return 'Validation checks';
    return `Run ${name}`;
  }

  private isDangerous(name: string): boolean {
    const dangerousPatterns = ['clean', 'remove', 'delete', 'destroy', 'reset', 'wipe'];
    return dangerousPatterns.some(pattern => name.includes(pattern));
  }

  private async getProjectStatus(): Promise<ProjectStatus> {
    const status: ProjectStatus = {
      git: {
        branch: 'unknown',
        status: 'unknown',
        ahead: 0,
        behind: 0
      },
      dependencies: {
        installed: existsSync(join(this.projectRoot, 'node_modules')),
        outdated: false
      },
      services: {
        api: false,
        redis: false,
        database: false
      },
      tests: {
        passing: false,
        coverage: 0
      },
      build: {
        success: existsSync(join(this.projectRoot, 'dist')),
        lastBuild: 'unknown'
      }
    };

    try {
      // Git status
      const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
      status.git.branch = gitBranch;
      status.git.status = gitStatus ? 'modified' : 'clean';
      
      // Ahead/behind
      try {
        const revList = execSync(`git rev-list --left-right --count origin/${gitBranch}...HEAD`, { encoding: 'utf-8' }).trim();
        const [ahead, behind] = revList.split('\t').map(Number);
        status.git.ahead = ahead || 0;
        status.git.behind = behind || 0;
      } catch {
        // Not tracking remote
      }

      // Check services
      try {
        const redisCheck = execSync('redis-cli ping', { encoding: 'utf-8', stdio: 'pipe' }).trim();
        status.services.redis = redisCheck === 'PONG';
      } catch {
        status.services.redis = false;
      }

      // Check API (try to connect to common ports)
      status.services.api = await this.checkService('localhost', 8080) || await this.checkService('localhost', 3000);

    } catch (error) {
      // Ignore errors - status will show as unknown
    }

    return status;
  }

  private async checkService(host: string, port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://${host}:${port}/health`, { signal: AbortSignal.timeout(1000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  private displayHeader() {
    console.clear();
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🎯 COMMAND STATION - CENTRAL HUB                          ║');
    console.log('║                    Syndicate GOV Monorepo v3.0                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log();
  }

  private async displayStatus(status: ProjectStatus) {
    console.log('📊 PROJECT STATUS');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    // Git Status
    const gitIcon = status.git.status === 'clean' ? '✅' : '⚠️';
    console.log(`Git: ${gitIcon} ${status.git.branch} | ${status.git.status}`);
    if (status.git.ahead > 0) console.log(`   Ahead: ${status.git.ahead} commits`);
    if (status.git.behind > 0) console.log(`   Behind: ${status.git.behind} commits`);

    // Dependencies
    const depsIcon = status.dependencies.installed ? '✅' : '❌';
    console.log(`Dependencies: ${depsIcon} ${status.dependencies.installed ? 'Installed' : 'Not installed'}`);

    // Services
    const apiIcon = status.services.api ? '✅' : '❌';
    const redisIcon = status.services.redis ? '✅' : '❌';
    console.log(`Services: API ${apiIcon} | Redis ${redisIcon}`);

    // Build
    const buildIcon = status.build.success ? '✅' : '❌';
    console.log(`Build: ${buildIcon} ${status.build.success ? 'Available' : 'Not built'}`);

    console.log();
  }

  private displayCommands() {
    console.log('🚀 QUICK COMMANDS');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    const categories = Array.from(new Set(this.commands.map(c => c.category)));
    
    for (const category of categories) {
      const categoryCommands = this.commands.filter(c => c.category === category);
      if (categoryCommands.length === 0) continue;

      console.log(`\n${category}:`);
      categoryCommands.slice(0, 10).forEach((cmd, idx) => {
        const icon = cmd.dangerous ? '⚠️' : '  ';
        const key = idx < 9 ? `[${idx + 1}]` : '[ ]';
        console.log(`  ${icon} ${key.padEnd(5)} ${cmd.name.padEnd(35)} ${cmd.description}`);
      });
      if (categoryCommands.length > 10) {
        console.log(`  ... and ${categoryCommands.length - 10} more`);
      }
    }
    console.log();
  }

  private displayShortcuts() {
    console.log('⌨️  KEYBOARD SHORTCUTS');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    console.log('  [d] Development    [t] Testing    [a] AI/Registry    [h] Health Check');
    console.log('  [b] Build          [s] Status     [c] CI/CD          [x] Exit');
    console.log();
  }

  public async showDashboard() {
    const status = await this.getProjectStatus();
    
    this.displayHeader();
    await this.displayStatus(status);
    this.displayCommands();
    this.displayShortcuts();
    
    console.log('💡 Tips:');
    console.log('   • Type a command name or number to run it');
    console.log('   • Use shortcuts: d, t, a, h, b, s, c, x');
    console.log('   • Type "help" for detailed help');
    console.log('   • Type "status" for detailed status');
    console.log('   • Type "list" to see all commands');
    console.log();
  }

  public async runCommand(commandId: string) {
    const command = this.commands.find(c => 
      c.id === commandId || 
      c.id.includes(commandId) ||
      c.name === commandId
    );

    if (!command) {
      console.error(`❌ Command "${commandId}" not found`);
      return;
    }

    if (command.dangerous) {
      console.log(`⚠️  Warning: This command is potentially dangerous: ${command.name}`);
      console.log(`   Command: ${command.command}`);
      console.log('   Are you sure? Type "yes" to continue: ');
      
      // In a real interactive CLI, you'd use readline here
      // For now, we'll just warn
      console.log('   (Skipping execution - use direct command for dangerous operations)');
      return;
    }

    console.log(`🚀 Running: ${command.name}`);
    console.log(`   ${command.description}`);
    console.log(`   Command: ${command.command}`);
    console.log();

    try {
      // Execute the command
      const proc = spawn('bun', ['run', command.id], {
        stdio: 'inherit',
        shell: true,
        cwd: this.projectRoot
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(`\n✅ Command completed successfully`);
        } else {
          console.log(`\n❌ Command exited with code ${code}`);
        }
      });

    } catch (error: any) {
      console.error(`❌ Failed to run command: ${error.message}`);
    }
  }

  public listCommands(filter?: string) {
    const filtered = filter 
      ? this.commands.filter(c => 
          c.name.includes(filter) || 
          c.description.toLowerCase().includes(filter.toLowerCase()) ||
          c.category.toLowerCase().includes(filter.toLowerCase())
        )
      : this.commands;

    console.log(`\n📋 Available Commands${filter ? ` (filtered: "${filter}")` : ''}:`);
    console.log('─────────────────────────────────────────────────────────────────────────────\n');

    const categories = Array.from(new Set(filtered.map(c => c.category)));
    for (const category of categories) {
      console.log(`\n${category.toUpperCase()}:`);
      filtered
        .filter(c => c.category === category)
        .forEach(cmd => {
          const icon = cmd.dangerous ? '⚠️' : '  ';
          console.log(`  ${icon} ${cmd.name.padEnd(40)} ${cmd.description}`);
        });
    }
    console.log();
  }

  public async interactive() {
    // Use Bun's built-in readline or a simple prompt
    console.log('\n🎯 Interactive Mode');
    console.log('Note: For full interactive mode with readline, use: bun run station:interactive');
    console.log('Or run specific commands directly: bun run station <command>\n');
    
    await this.showDashboard();
  }

  public async nonInteractive() {
    await this.showDashboard();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const station = new CommandStation();

  if (args.includes('--interactive') || args.includes('-i')) {
    await station.interactive();
  } else if (args.includes('--list') || args.includes('-l')) {
    const filter = args.find(arg => arg.startsWith('--filter='))?.split('=')[1] ||
                   args.find(arg => arg.startsWith('-f='))?.split('=')[1];
    station.listCommands(filter);
  } else if (args.length > 0) {
    // Run specific command
    await station.runCommand(args[0]);
  } else {
    // Show dashboard
    await station.nonInteractive();
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { CommandStation };


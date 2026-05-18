#!/usr/bin/env bun
/**
 * Fire22 Enhanced Development Console
 * Leverages advanced Bun console features for interactive development
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

interface ConsoleSession {
  startTime: number;
  commandCount: number;
  workspaceContext: string | null;
  debugDepth: number;
}

class Fire22DevConsole {
  private session: ConsoleSession;
  private commands: Map<string, (args: string[]) => Promise<void>>;

  constructor() {
    this.session = {
      startTime: Date.now(),
      commandCount: 0,
      workspaceContext: null,
      debugDepth: 4, // Default from bunfig.toml
    };

    this.commands = new Map([
      ['help', this.showHelp.bind(this)],
      ['depth', this.setConsoleDepth.bind(this)],
      ['inspect', this.inspectObject.bind(this)],
      ['workspace', this.setWorkspace.bind(this)],
      ['deps', this.analyzeDependencies.bind(this)],
      ['test', this.runTests.bind(this)],
      ['build', this.buildWorkspace.bind(this)],
      ['status', this.showStatus.bind(this)],
      ['reset', this.resetSession.bind(this)],
      ['exit', this.exit.bind(this)],
    ]);
  }

  async start() {
    console.info('🚀 Fire22 Enhanced Development Console');
    console.info('!==!==!==!==!==!==!==');
    console.info(`📊 Console depth: ${this.session.debugDepth} levels`);
    console.info(`⏰ Session started: ${new Date().toLocaleTimeString()}`);
    console.info('💡 Type "help" for available commands\n');

    await this.interactiveLoop();
  }

  private async interactiveLoop() {
    console.write('🔥 fire22> ');

    for await (const line of console) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        console.write('🔥 fire22> ');
        continue;
      }

      this.session.commandCount++;

      try {
        await this.processCommand(trimmedLine);
      } catch (error) {
        console.error('❌ Error:', error);

        // Demonstrate deep object inspection on errors
        if (error instanceof Error) {
          console.info('🔍 Error details:');
          console.info({
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3), // First 3 stack frames
            timestamp: new Date().toISOString(),
            session: {
              commandCount: this.session.commandCount,
              workspace: this.session.workspaceContext,
              uptime: Date.now() - this.session.startTime,
            },
          });
        }
      }

      console.write('🔥 fire22> ');
    }
  }

  private async processCommand(input: string): Promise<void> {
    const [command, ...args] = input.split(' ');
    const handler = this.commands.get(command.toLowerCase());

    if (handler) {
      await handler(args);
    } else {
      console.info(`❓ Unknown command: ${command}`);
      console.info('💡 Type "help" for available commands');
    }
  }

  private async showHelp(): Promise<void> {
    const helpData = {
      title: '🚀 Fire22 Development Console Commands',
      commands: {
        console: {
          depth: 'Set console.info() inspection depth (1-10)',
          inspect: 'Deep inspect any object with custom depth',
        },
        workspace: {
          workspace: 'Set current workspace context (@fire22-*)',
          deps: 'Analyze dependencies in current workspace',
          build: 'Build current workspace',
          test: 'Run tests in current workspace',
        },
        session: {
          status: 'Show session and system status',
          reset: 'Reset session counters',
          exit: 'Exit console',
        },
      },
      examples: [
        'depth 6                    # Set deep object inspection',
        'workspace api-client       # Switch to @fire22-api-client',
        'deps                      # Analyze current workspace deps',
        'inspect { deep: { nested: { object: true } } }',
      ],
      bunFeatures: {
        consoleDepth: `Current: ${this.session.debugDepth} levels (configured in bunfig.toml)`,
        asyncIterable: 'Reading from stdin using console as AsyncIterable',
        performance: 'Bun native performance with zero Node.js overhead',
      },
    };

    console.info(helpData);
  }

  private async setConsoleDepth(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.info(`📊 Current console depth: ${this.session.debugDepth}`);
      console.info('🎯 Usage: depth <number> (1-10)');
      console.info(
        '📝 Note: This affects current session only. Update bunfig.toml for persistence.'
      );
      return;
    }

    const newDepth = parseInt(args[0]);

    if (isNaN(newDepth) || newDepth < 1 || newDepth > 10) {
      console.info('❌ Invalid depth. Please use a number between 1 and 10.');
      return;
    }

    const oldDepth = this.session.debugDepth;
    this.session.debugDepth = newDepth;

    console.info(`✅ Console depth changed: ${oldDepth} → ${newDepth}`);

    // Demonstrate the difference
    const testObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                message: 'Deep nested data',
                timestamp: Date.now(),
              },
            },
          },
        },
      },
    };

    console.info('🔍 Test object with new depth:');
    console.info(testObject);
  }

  private async inspectObject(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.info('🎯 Usage: inspect <object-expression>');
      console.info('📝 Example: inspect { a: { b: { c: "deep" } } }');
      return;
    }

    try {
      // Join args and evaluate as object (simplified for demo)
      const objectStr = args.join(' ');
      console.info(`🔍 Inspecting with depth ${this.session.debugDepth}:`);

      // For demo purposes, create a complex nested object
      const complexObject = {
        workspace: this.session.workspaceContext || 'root',
        session: {
          startTime: new Date(this.session.startTime).toISOString(),
          uptime: `${Math.round((Date.now() - this.session.startTime) / 1000)}s`,
          commands: this.session.commandCount,
          context: {
            bunVersion: process.versions.bun,
            nodeVersion: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              external: Math.round(process.memoryUsage().external / 1024 / 1024),
            },
          },
        },
        fireConfig: {
          console: { depth: this.session.debugDepth },
          debug: { editor: 'code' },
          build: { target: 'bun', format: 'esm' },
        },
      };

      console.info(complexObject);
    } catch (error) {
      console.info('❌ Could not inspect object:', error);
    }
  }

  private async setWorkspace(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.info(`📂 Current workspace: ${this.session.workspaceContext || 'root'}`);

      // List available workspaces
      try {
        const workspacesDir = './workspaces';
        const entries = await readdir(workspacesDir);
        const workspaces = [];

        for (const entry of entries) {
          const fullPath = join(workspacesDir, entry);
          const stats = await stat(fullPath);
          if (stats.isDirectory() && entry.startsWith('@fire22-')) {
            workspaces.push(entry.replace('@fire22-', ''));
          }
        }

        console.info('🎯 Available workspaces:');
        console.info({
          count: workspaces.length,
          workspaces: workspaces.sort(),
          usage: 'workspace <name> (without @fire22- prefix)',
        });
      } catch (error) {
        console.info('❌ Could not list workspaces');
      }
      return;
    }

    const workspaceName = args[0];
    const fullName = workspaceName.startsWith('@fire22-')
      ? workspaceName
      : `@fire22-${workspaceName}`;
    const workspacePath = `./workspaces/${fullName}`;

    try {
      const stats = await stat(workspacePath);
      if (stats.isDirectory()) {
        this.session.workspaceContext = fullName;
        console.info(`✅ Switched to workspace: ${fullName}`);

        // Show workspace info
        try {
          const packageJson = await Bun.file(`${workspacePath}/package.json`).json();
          console.info('📋 Workspace info:');
          console.info({
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            dependencies: packageJson.dependencies
              ? Object.keys(packageJson.dependencies).length
              : 0,
            devDependencies: packageJson.devDependencies
              ? Object.keys(packageJson.devDependencies).length
              : 0,
            scripts: packageJson.scripts ? Object.keys(packageJson.scripts).length : 0,
          });
        } catch {
          console.info('📋 Workspace found but package.json not readable');
        }
      }
    } catch (error) {
      console.info(`❌ Workspace not found: ${fullName}`);
      console.info('💡 Use "workspace" without arguments to see available workspaces');
    }
  }

  private async analyzeDependencies(): Promise<void> {
    const context = this.session.workspaceContext || 'root';
    console.info(`🔍 Analyzing dependencies for: ${context}`);

    try {
      // Use our enhanced dependency analysis
      const proc = Bun.spawn(['bun', 'run', 'deps:analyze'], {
        cwd: this.session.workspaceContext ? `./workspaces/${this.session.workspaceContext}` : '.',
        stdout: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      console.info(output);
    } catch (error) {
      console.info('❌ Could not analyze dependencies:', error);
    }
  }

  private async runTests(): Promise<void> {
    const context = this.session.workspaceContext || 'root';
    console.info(`🧪 Running tests for: ${context}`);

    try {
      const proc = Bun.spawn(['bun', 'test'], {
        cwd: this.session.workspaceContext ? `./workspaces/${this.session.workspaceContext}` : '.',
        stdout: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      console.info(output);
    } catch (error) {
      console.info('❌ Could not run tests:', error);
    }
  }

  private async buildWorkspace(): Promise<void> {
    const context = this.session.workspaceContext || 'root';
    console.info(`🔨 Building: ${context}`);

    try {
      const proc = Bun.spawn(['bun', 'run', 'build'], {
        cwd: this.session.workspaceContext ? `./workspaces/${this.session.workspaceContext}` : '.',
        stdout: 'pipe',
      });

      const output = await new Response(proc.stdout).text();
      console.info(output);
    } catch (error) {
      console.info('❌ Could not build workspace:', error);
    }
  }

  private async showStatus(): Promise<void> {
    const uptime = Date.now() - this.session.startTime;
    const statusInfo = {
      session: {
        uptime: `${Math.round(uptime / 1000)}s`,
        commands: this.session.commandCount,
        workspace: this.session.workspaceContext || 'root',
        consoleDepth: this.session.debugDepth,
      },
      bun: {
        version: process.versions.bun,
        node: process.versions.node,
        platform: `${process.platform}-${process.arch}`,
      },
      memory: {
        heap: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
      },
      features: {
        consoleAsyncIterable: 'Active - reading from stdin',
        objectInspection: `Depth ${this.session.debugDepth} levels`,
        bunNativePerformance: 'Zero Node.js overhead',
      },
    };

    console.info('📊 Fire22 Development Console Status:');
    console.info(statusInfo);
  }

  private async resetSession(): Promise<void> {
    this.session.commandCount = 0;
    this.session.startTime = Date.now();
    console.info('✅ Session counters reset');
  }

  private async exit(): Promise<void> {
    const uptime = Date.now() - this.session.startTime;
    console.info('\n👋 Fire22 Development Console Session Complete');
    console.info({
      duration: `${Math.round(uptime / 1000)}s`,
      commands: this.session.commandCount,
      workspace: this.session.workspaceContext || 'root',
      timestamp: new Date().toISOString(),
    });
    process.exit(0);
  }
}

// Start the enhanced development console
if (import.meta.main) {
  const devConsole = new Fire22DevConsole();
  await devConsole.start();
}

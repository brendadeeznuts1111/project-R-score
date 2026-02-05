#!/usr/bin/env bun

/**
 * 🛠️ Fire22 Build Command Generator
 *
 * Generates optimized bun build --compile commands with proper --define flags
 *
 * @version 3.0.8
 * @author Fire22 Development Team
 * @see docs/BUILD-INDEX.md for usage guide
 */

import {
  generateBuildCommand,
  generateBuildConstants,
  formatDefineFlags,
} from './build-constants.ts';
import { AdvancedProcessManager } from './advanced-process-manager.ts';

interface BuildTarget {
  name: string;
  environment: 'development' | 'staging' | 'production' | 'demo';
  port: number;
  execArgs: string[];
  optimization: {
    minify: boolean;
    sourcemap: boolean;
    bytecode: boolean;
  };
  windowsOptions?: {
    title: string;
    publisher: string;
    description: string;
    copyright: string;
  };
}

const buildTargets: BuildTarget[] = [
  {
    name: 'development',
    environment: 'development',
    port: 3000,
    execArgs: ['--env=development', '--debug', '--port=3000'],
    optimization: {
      minify: false,
      sourcemap: true,
      bytecode: false,
    },
  },
  {
    name: 'staging',
    environment: 'staging',
    port: 3001,
    execArgs: ['--env=staging', '--monitor', '--port=3001'],
    optimization: {
      minify: false,
      sourcemap: true,
      bytecode: false,
    },
  },
  {
    name: 'production',
    environment: 'production',
    port: 8080,
    execArgs: ['--env=production', '--optimize', '--port=8080'],
    optimization: {
      minify: true,
      sourcemap: true,
      bytecode: true,
    },
  },
  {
    name: 'demo',
    environment: 'demo',
    port: 3002,
    execArgs: ['--env=demo', '--demo-mode', '--port=3002'],
    optimization: {
      minify: false,
      sourcemap: true,
      bytecode: false,
    },
  },
  {
    name: 'windows',
    environment: 'production',
    port: 8080,
    execArgs: ['--env=production', '--optimize', '--port=8080'],
    optimization: {
      minify: true,
      sourcemap: true,
      bytecode: false, // Bytecode not always compatible with Windows
    },
    windowsOptions: {
      title: 'Fire22 Dashboard Worker',
      publisher: 'Fire22 Development Team',
      description: 'Professional dashboard worker for the Fire22 sportsbook platform',
      copyright: '© 2024 Fire22 Development Team',
    },
  },
];

async function generateCommands() {
  console.log('🛠️ Fire22 Build Command Generator');
  console.log('='.repeat(50));

  const profile = getBuildProfile('production');
  const context = createBuildContext(profile, {
    version: '3.0.8',
    environment: 'production',
  });

  const generator = new BuildCommandGenerator(context);

  console.log('\n📋 **Generated Build Commands**\n');

  // Pre-generate build constants context once for efficiency
  const sharedContext = createBuildContext(profile, {
    version: '3.0.8',
    environment: 'production',
  });
  const sharedUtilities = new BuildUtilities(sharedContext);

  for (const target of buildTargets) {
    console.log(`### ${target.name.charAt(0).toUpperCase() + target.name.slice(1)} Build`);
    console.log('```bash');

    const outputFile =
      target.name === 'windows' ? './dist/Fire22-Dashboard.exe' : `./dist/fire22-${target.name}`;

    // Generate base command
    let command = ['bun build ./src/index.ts', '--compile', `--outfile=${outputFile}`];

    // Generate enhanced build constants for this target
    const targetContext = createBuildContext(profile, {
      version: '3.0.8',
      environment: target.environment,
    });
    const utilities = new BuildUtilities(targetContext);
    const constants = await utilities.generateBuildConstants();
    const defineFlags = utilities.formatDefineFlags(constants);

    // Add all define flags to command (flatten the array since defineFlags comes as ['--define', 'KEY=value', '--define', 'KEY2=value2'])
    for (let i = 0; i < defineFlags.length; i += 2) {
      command.push(`${defineFlags[i]} ${defineFlags[i + 1]}`);
    }

    // Add execution arguments
    if (target.execArgs.length > 0) {
      command.push(`--compile-exec-argv="${target.execArgs.join(' ')}"`);
    }

    // Add optimization flags
    if (target.optimization.minify) command.push('--minify');
    if (target.optimization.sourcemap) command.push('--sourcemap');
    if (target.optimization.bytecode) command.push('--bytecode');

    // Add Windows-specific options
    if (target.windowsOptions) {
      const win = target.windowsOptions;
      command.push(`--windows-title="${win.title}"`);
      command.push(`--windows-publisher="${win.publisher}"`);
      command.push(`--windows-version="3.0.8"`);
      command.push(`--windows-description="${win.description}"`);
      command.push(`--windows-copyright="${win.copyright}"`);
    }

    // Format command with line continuation
    const formattedCommand = command.join(' \\\n  ');
    console.log(formattedCommand);
    console.log('```\n');
  }

  // Generate package.json script updates
  console.log('### 📦 **Package.json Script Updates**');
  console.log('```json');
  console.log('"scripts": {');

  for (let i = 0; i < buildTargets.length; i++) {
    const target = buildTargets[i];
    const scriptName =
      target.name === 'windows' ? 'build:executable:windows' : `build:executable:${target.name}`;

    const outputFile =
      target.name === 'windows' ? './dist/Fire22-Dashboard.exe' : `./dist/fire22-${target.name}`;

    const defines = [
      `ENVIRONMENT='\"${target.environment}\"'`,
      `DEBUG_MODE='${target.environment === 'development'}'`,
      `LOG_LEVEL='\"${getLogLevel(target.environment)}\"'`,
      `API_URL='\"${getApiUrl(target.environment)}\"'`,
      `VERSION='\"3.0.8\"'`,
      `BUILD_TIME='\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"'`,
    ]
      .map(d => `--define ${d}`)
      .join(' ');

    let scriptCommand = `bun build ./src/index.ts --compile --outfile=${outputFile} `;
    scriptCommand += `--compile-exec-argv=\"${target.execArgs.join(' ')}\" `;
    scriptCommand += defines;

    if (target.optimization.minify) scriptCommand += ' --minify';
    if (target.optimization.sourcemap) scriptCommand += ' --sourcemap';
    if (target.optimization.bytecode) scriptCommand += ' --bytecode';

    if (target.windowsOptions) {
      const win = target.windowsOptions;
      scriptCommand += ` --windows-title=\"${win.title}\"`;
      scriptCommand += ` --windows-publisher=\"${win.publisher}\"`;
      scriptCommand += ` --windows-version=\"3.0.8\"`;
      scriptCommand += ` --windows-description=\"${win.description}\"`;
      scriptCommand += ` --windows-copyright=\"${win.copyright}\"`;
    }

    const comma = i < buildTargets.length - 1 ? ',' : '';
    console.log(`  "${scriptName}": "${scriptCommand}"${comma}`);
  }

  console.log('}');
  console.log('```\n');

  console.log('### 🎯 **Usage Examples**');
  console.log('```bash');
  console.log('# Build development executable');
  console.log('bun run build:executable:dev');
  console.log('');
  console.log('# Build production executable with all optimizations');
  console.log('bun run build:executable:prod');
  console.log('');
  console.log('# Build Windows executable with metadata');
  console.log('bun run build:executable:windows');
  console.log('');
  console.log('# Build all executables');
  console.log('bun run build:executable:all');
  console.log('```');

  console.log('\n✅ Build commands generated successfully!');
}

function getLogLevel(environment: string): string {
  switch (environment) {
    case 'development':
      return 'debug';
    case 'staging':
      return 'info';
    case 'production':
      return 'warn';
    case 'demo':
      return 'debug';
    default:
      return 'info';
  }
}

function getApiUrl(environment: string): string {
  switch (environment) {
    case 'development':
      return 'http://localhost:3000';
    case 'staging':
      return 'https://staging-api.fire22.com';
    case 'production':
      return 'https://api.fire22.com';
    case 'demo':
      return 'https://demo-api.fire22.com';
    default:
      return 'http://localhost:3000';
  }
}

// Run if called directly
if (import.meta.main) {
  await generateCommands();
}

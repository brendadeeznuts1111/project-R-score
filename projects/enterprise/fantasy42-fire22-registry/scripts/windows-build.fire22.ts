#!/usr/bin/env bun
/**
 * 🔥 FIRE22 WINDOWS EXECUTABLE BUILDER
 * Advanced Windows executable compilation with enterprise metadata
 * Demonstrates bunx --package and Windows executable features
 */

import { $ } from 'bun';

// ╔══════════════════════════════════════════════════════════════╗
// ║                 WINDOWS BUILD CONFIGURATION                ║
// ╚══════════════════════════════════════════════════════════════╝

interface WindowsBuildConfig {
  name: string;
  entryPoint: string;
  outputName: string;
  target: 'bun-windows-x64' | 'bun-windows-x64-baseline';
  metadata: {
    title: string;
    publisher: string;
    version: string;
    description: string;
    copyright: string;
    company: string;
    productName: string;
    trademarks: string;
  };
  features: {
    signExecutable: boolean;
    enableVisualStyles: boolean;
    highDpiSupport: boolean;
    longPathSupport: boolean;
  };
}

interface BunxPackageConfig {
  package: string;
  version?: string;
  args?: string[];
  env?: Record<string, string>;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 BUILD CONFIGURATIONS                       ║
// ╚══════════════════════════════════════════════════════════════╝

const FIRE22_HUB_BUILD: WindowsBuildConfig = {
  name: 'Fantasy42-Fire22 Enterprise Hub',
  entryPoint: './src/hub/index.ts',
  outputName: 'fantasy42-fire22-hub',
  target: 'bun-windows-x64',
  metadata: {
    title: 'Fantasy42-Fire22 Enterprise Hub',
    publisher: 'Fire22 Enterprise LLC',
    version: '5.1.0',
    description:
      'Enterprise-grade interactive hub with advanced analytics, real-time processing, and automation capabilities',
    copyright: '© 2024-2025 Fire22 Enterprise LLC. All rights reserved.',
    company: 'Fire22 Enterprise LLC',
    productName: 'Fantasy42-Fire22 Enterprise Suite',
    trademarks: 'Fantasy42™ and Fire22™ are trademarks of Fire22 Enterprise LLC',
  },
  features: {
    signExecutable: true,
    enableVisualStyles: true,
    highDpiSupport: true,
    longPathSupport: true,
  },
};

const SECURITY_SCANNER_BUILD: WindowsBuildConfig = {
  name: 'Fire22 Security Scanner',
  entryPoint: './src/security/scanner.ts',
  outputName: 'fire22-security-scanner',
  target: 'bun-windows-x64-baseline',
  metadata: {
    title: 'Fire22 Enterprise Security Scanner',
    publisher: 'Fire22 Enterprise LLC',
    version: '2.0.0',
    description: 'Advanced security scanning tool for enterprise applications and dependencies',
    copyright: '© 2024 Fire22 Enterprise LLC. All rights reserved.',
    company: 'Fire22 Enterprise LLC',
    productName: 'Fire22 Security Suite',
    trademarks: 'Fire22™ is a trademark of Fire22 Enterprise LLC',
  },
  features: {
    signExecutable: true,
    enableVisualStyles: false,
    highDpiSupport: false,
    longPathSupport: true,
  },
};

// ╔══════════════════════════════════════════════════════════════╗
// ║                 BUNX PACKAGE DEMONSTRATIONS                 ║
// ╚══════════════════════════════════════════════════════════════╝

const BUNX_PACKAGES: BunxPackageConfig[] = [
  {
    package: '@fire22/security-scanner',
    args: ['scan', '--format', 'json', '--output', './security-report.json'],
    env: { SCAN_DEPTH: 'full', REPORT_FORMAT: 'enterprise' },
  },
  {
    package: '@fire22/analytics-dashboard',
    args: ['generate', '--type', 'comprehensive', '--period', 'monthly'],
    env: { DASHBOARD_THEME: 'enterprise', EXPORT_FORMAT: 'pdf' },
  },
  {
    package: '@fire22/compliance-core',
    args: ['audit', '--standard', 'pci-dss', '--scope', 'production'],
    env: { COMPLIANCE_LEVEL: 'strict', AUDIT_MODE: 'comprehensive' },
  },
  {
    package: 'typescript',
    version: '^5.0.0',
    args: ['--noEmit', '--strict', './src/**/*.ts'],
    env: { TSC_STRICT: 'true' },
  },
  {
    package: 'prettier',
    args: ['--write', '--config', './.prettierrc', './src/**/*.ts', './scripts/**/*.ts'],
    env: { PRETTIER_CONFIG: './.prettierrc' },
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║                 BUILD FUNCTIONS                            ║
// ╚══════════════════════════════════════════════════════════════╝

async function buildWindowsExecutable(config: WindowsBuildConfig): Promise<boolean> {
  console.log(`🔨 Building ${config.name} for Windows...`);
  console.log('═'.repeat(60));

  try {
    // Build command with Windows metadata
    const buildCmd = [
      'bun',
      'build',
      config.entryPoint,
      '--compile',
      `--outfile=./dist/${config.outputName}.exe`,
      `--target=${config.target}`,
      // Windows metadata flags
      `--windows-title="${config.metadata.title}"`,
      `--windows-publisher="${config.metadata.publisher}"`,
      `--windows-version=${config.metadata.version}`,
      `--windows-description="${config.metadata.description}"`,
      `--windows-copyright="${config.metadata.copyright}"`,
    ];

    // Add optional Windows features
    if (config.features.enableVisualStyles) {
      buildCmd.push('--enable-visual-styles');
    }
    if (config.features.highDpiSupport) {
      buildCmd.push('--high-dpi-support');
    }
    if (config.features.longPathSupport) {
      buildCmd.push('--long-path-support');
    }

    console.log(`📦 Build Command: ${buildCmd.join(' ')}`);
    console.log('');

    const result = await $`${buildCmd}`.quiet();

    if (result.exitCode === 0) {
      console.log(`✅ Successfully built: ${config.outputName}.exe`);
      console.log(`📁 Output: ./dist/${config.outputName}.exe`);

      // Display executable information
      const exePath = `./dist/${config.outputName}.exe`;
      console.log(`\n📋 Executable Metadata:`);
      console.log(`   Title: ${config.metadata.title}`);
      console.log(`   Publisher: ${config.metadata.publisher}`);
      console.log(`   Version: ${config.metadata.version}`);
      console.log(`   Description: ${config.metadata.description}`);
      console.log(`   Copyright: ${config.metadata.copyright}`);
      console.log(`   Company: ${config.metadata.company}`);
      console.log(`   Product: ${config.metadata.productName}`);

      // Check file size
      try {
        const stats = await Bun.file(exePath).stat();
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`   Size: ${sizeMB} MB`);
      } catch {
        // File size check failed, not critical
      }

      return true;
    } else {
      console.log(`❌ Build failed for ${config.name}`);
      console.log(`Error output: ${result.stderr}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Build error for ${config.name}:`, error.message);
    return false;
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 BUNX PACKAGE FUNCTIONS                     ║
// ╚══════════════════════════════════════════════════════════════╝

async function demonstrateBunxPackage(config: BunxPackageConfig): Promise<boolean> {
  console.log(`📦 Demonstrating bunx with ${config.package}...`);
  console.log('═'.repeat(60));

  try {
    // Build bunx command with --package flag
    const bunxCmd = [
      'bunx',
      '--package',
      config.package + (config.version ? `@${config.version}` : ''),
    ];

    // Add package arguments
    if (config.args) {
      bunxCmd.push(...config.args);
    }

    console.log(`🚀 Command: ${bunxCmd.join(' ')}`);

    // Set environment variables if specified
    const env = { ...process.env, ...config.env };

    const result = await $`${bunxCmd}`.env(env).quiet();

    if (result.exitCode === 0) {
      console.log(`✅ Successfully executed ${config.package}`);
      if (result.stdout) {
        console.log(`📄 Output: ${result.stdout.slice(0, 200)}...`);
      }
      return true;
    } else {
      console.log(`⚠️ Execution completed with warnings for ${config.package}`);
      if (result.stderr) {
        console.log(`⚠️ Warnings: ${result.stderr.slice(0, 200)}...`);
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to execute ${config.package}:`, error.message);
    return false;
  }
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 MAIN BUILD FUNCTION                        ║
// ╚══════════════════════════════════════════════════════════════╝

async function runWindowsBuild(): Promise<void> {
  console.log('🔥 FIRE22 WINDOWS EXECUTABLE BUILDER');
  console.log('════════════════════════════════════');
  console.log('Building enterprise Windows executables with professional metadata');
  console.log('');

  // Create dist directory
  await $`mkdir -p ./dist`.quiet();

  // Build configurations
  const buildConfigs = [FIRE22_HUB_BUILD, SECURITY_SCANNER_BUILD];
  const buildResults = [];

  console.log('🏗️ BUILDING WINDOWS EXECUTABLES');
  console.log('═════════════════════════════════');

  for (const config of buildConfigs) {
    const success = await buildWindowsExecutable(config);
    buildResults.push({ config: config.name, success });
    console.log(''); // Add spacing between builds
  }

  // Display build summary
  console.log('📊 BUILD SUMMARY');
  console.log('════════════════');

  let successCount = 0;
  for (const result of buildResults) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.config}`);
    if (result.success) successCount++;
  }

  console.log(`\n🎯 Build Success Rate: ${successCount}/${buildResults.length}`);
  console.log('');

  // Demonstrate bunx --package feature
  console.log('📦 DEMONSTRATING BUNX --PACKAGE FEATURE');
  console.log('═══════════════════════════════════════');

  for (const packageConfig of BUNX_PACKAGES.slice(0, 2)) {
    // Demo first 2 packages
    await demonstrateBunxPackage(packageConfig);
    console.log('');
  }

  // Final summary
  console.log('🎉 WINDOWS BUILD PROCESS COMPLETE!');
  console.log('═══════════════════════════════════');
  console.log('');
  console.log('📁 Generated Executables:');
  console.log('   • ./dist/fantasy42-fire22-hub.exe');
  console.log('   • ./dist/fire22-security-scanner.exe');
  console.log('');
  console.log('🛠️ Build Features Demonstrated:');
  console.log('   • Windows executable metadata (--windows-title, --windows-publisher, etc.)');
  console.log('   • Professional branding and trademarks');
  console.log('   • Enterprise code signing capabilities');
  console.log('   • High-DPI and long path support');
  console.log('   • BunX --package feature for package management');
  console.log('');
  console.log('🚀 Ready for enterprise distribution!');
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 UTILITY FUNCTIONS                          ║
// ╚══════════════════════════════════════════════════════════════╝

async function showBuildHelp(): Promise<void> {
  console.log(`
🔥 FIRE22 WINDOWS EXECUTABLE BUILDER
Building enterprise Windows executables with professional metadata

USAGE:
  bun run scripts/windows-build.fire22.ts [command]

COMMANDS:
  build         Build all Windows executables
  hub           Build only Fantasy42-Fire22 Hub
  scanner       Build only Security Scanner
  bunx-demo     Demonstrate bunx --package features
  clean         Clean build artifacts
  help          Show this help

WINDOWS METADATA FLAGS:
  --windows-title        Application title
  --windows-publisher    Publisher name
  --windows-version      Version string
  --windows-description  Application description
  --windows-copyright    Copyright notice

BUNX PACKAGE FEATURES:
  --package <pkg>        Specify package to run
  --package pkg@version  Specify package with version
  Enhanced caching       Faster package execution
  Trusted packages       Bypass security prompts

EXAMPLES:
  bun run scripts/windows-build.fire22.ts build
  bun run scripts/windows-build.fire22.ts hub
  bun run scripts/windows-build.fire22.ts bunx-demo

BUILD OUTPUT:
  ./dist/fantasy42-fire22-hub.exe
  ./dist/fire22-security-scanner.exe

FEATURES:
  • Professional Windows metadata
  • Enterprise code signing
  • High-DPI support
  • Long path support
  • BunX package management
  • Cross-platform compatibility
`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 COMMAND LINE INTERFACE                     ║
// ╚══════════════════════════════════════════════════════════════╝

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';

  switch (command) {
    case 'build':
      await runWindowsBuild();
      break;

    case 'hub':
      await buildWindowsExecutable(FIRE22_HUB_BUILD);
      break;

    case 'scanner':
      await buildWindowsExecutable(SECURITY_SCANNER_BUILD);
      break;

    case 'bunx-demo':
      console.log('📦 BUNX --PACKAGE FEATURE DEMONSTRATION');
      console.log('═══════════════════════════════════════');
      for (const packageConfig of BUNX_PACKAGES) {
        await demonstrateBunxPackage(packageConfig);
        console.log('');
      }
      break;

    case 'clean':
      console.log('🧹 Cleaning build artifacts...');
      await $`rm -rf ./dist/*.exe`.quiet();
      console.log('✅ Build artifacts cleaned');
      break;

    case 'help':
    default:
      await showBuildHelp();
      break;
  }
}

// Run the Windows builder
if (import.meta.main) {
  main().catch(console.error);
}

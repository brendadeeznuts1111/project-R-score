#!/usr/bin/env bun

/**
 * 🚀 Fire22 Dashboard - Enhanced Build Compilation Script
 *
 * Provides advanced Bun build compilation with custom defines, optimization,
 * and integration with the existing build system.
 *
 * Usage:
 *   bun run enhanced-build:compile                    # Basic compilation
 *   bun run enhanced-build:compile --production      # Production build
 *   bun run enhanced-build:compile --staging         # Staging build
 *   bun run enhanced-build:compile --demo            # Demo build
 *   bun run enhanced-build:compile --custom          # Custom build
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Build configurations
const BUILD_CONFIGS = {
  development: {
    name: 'fire22-dev',
    defines: {
      BUILD_VERSION: '"3.0.8-dev"',
      BUILD_TIME: `"${new Date().toISOString()}"`,
      ENVIRONMENT: '"development"',
      DEBUG_MODE: 'true',
      LOG_LEVEL: '"debug"',
      API_URL: '"http://localhost:3000"',
      FEATURES: '["dev-tools", "hot-reload", "debug-panel"]',
    },
    flags: ['--debug', '--sourcemap'],
    optimization: 'none',
  },

  staging: {
    name: 'fire22-staging',
    defines: {
      BUILD_VERSION: '"3.0.8-staging"',
      BUILD_TIME: `"${new Date().toISOString()}"`,
      ENVIRONMENT: '"staging"',
      DEBUG_MODE: 'false',
      LOG_LEVEL: '"info"',
      API_URL: '"https://staging-api.fire22.com"',
      FEATURES: '["monitoring", "analytics", "staging-tools"]',
    },
    flags: ['--monitor', '--sourcemap'],
    optimization: 'basic',
  },

  production: {
    name: 'fire22-production',
    defines: {
      BUILD_VERSION: '"3.0.8"',
      BUILD_TIME: `"${new Date().toISOString()}"`,
      ENVIRONMENT: '"production"',
      DEBUG_MODE: 'false',
      LOG_LEVEL: '"warn"',
      API_URL: '"https://api.fire22.com"',
      FEATURES: '["production", "monitoring", "analytics"]',
    },
    flags: ['--optimize', '--minify', '--bytecode'],
    optimization: 'full',
  },

  demo: {
    name: 'fire22-demo',
    defines: {
      BUILD_VERSION: '"3.0.8-demo"',
      BUILD_TIME: `"${new Date().toISOString()}"`,
      ENVIRONMENT: '"demo"',
      DEBUG_MODE: 'true',
      LOG_LEVEL: '"info"',
      API_URL: '"https://demo-api.fire22.com"',
      FEATURES: '["demo-mode", "sample-data", "tutorial"]',
    },
    flags: ['--demo-mode', '--sourcemap'],
    optimization: 'basic',
  },

  custom: {
    name: 'fire22-custom',
    defines: {
      BUILD_VERSION: '"3.0.8-custom"',
      BUILD_TIME: `"${new Date().toISOString()}"`,
      ENVIRONMENT: '"custom"',
      DEBUG_MODE: 'false',
      LOG_LEVEL: '"info"',
      API_URL: '"https://custom-api.fire22.com"',
      FEATURES: '["custom", "extensible"]',
    },
    flags: ['--custom', '--sourcemap'],
    optimization: 'basic',
  },
};

// Platform-specific configurations
const PLATFORM_CONFIGS = {
  windows: {
    extension: '.exe',
    title: 'Fire22 Dashboard Worker',
    publisher: 'Fire22 Development Team',
    version: '3.0.8',
    description: 'Professional dashboard worker for the Fire22 sportsbook platform',
    copyright: '© 2024 Fire22 Development Team',
  },

  darwin: {
    extension: '',
    title: 'Fire22 Dashboard Worker',
    publisher: 'Fire22 Development Team',
    version: '3.0.8',
    description: 'Professional dashboard worker for the Fire22 sportsbook platform',
    copyright: '© 2024 Fire22 Development Team',
  },

  linux: {
    extension: '',
    title: 'Fire22 Dashboard Worker',
    publisher: 'Fire22 Development Team',
    version: '3.0.8',
    description: 'Professional dashboard worker for the Fire22 sportsbook platform',
    copyright: '© 2024 Fire22 Development Team',
  },
};

/**
 * Get current platform
 */
function getPlatform(): string {
  return process.platform;
}

/**
 * Get current architecture
 */
function getArchitecture(): string {
  return process.arch;
}

/**
 * Get current Node.js version
 */
function getNodeVersion(): string {
  return process.version;
}

/**
 * Get current Bun version
 */
function getBunVersion(): string {
  try {
    const version = execSync('bun --version', { encoding: 'utf8' }).trim();
    return version;
  } catch {
    return 'Unknown';
  }
}

/**
 * Get Git information
 */
function getGitInfo() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const date = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8' }).trim();

    return { branch, commit, date };
  } catch {
    return { branch: 'Unknown', commit: 'Unknown', date: 'Unknown' };
  }
}

/**
 * Build define string from configuration
 */
function buildDefineString(defines: Record<string, string | boolean | string[]>): string[] {
  const defineArgs: string[] = [];

  for (const [key, value] of Object.entries(defines)) {
    if (typeof value === 'string') {
      defineArgs.push(`--define ${key}='${value}'`);
    } else if (typeof value === 'boolean') {
      defineArgs.push(`--define ${key}=${value}`);
    } else if (Array.isArray(value)) {
      defineArgs.push(`--define ${key}='${JSON.stringify(value)}'`);
    }
  }

  return defineArgs;
}

/**
 * Build platform-specific arguments
 */
function buildPlatformArgs(platform: string, config: any): string[] {
  const platformConfig = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
  if (!platformConfig) return [];

  const args: string[] = [];

  if (platform === 'win32') {
    args.push(`--windows-title="${platformConfig.title}"`);
    args.push(`--windows-publisher="${platformConfig.publisher}"`);
    args.push(`--windows-version="${platformConfig.version}"`);
    args.push(`--windows-description="${platformConfig.description}"`);
    args.push(`--windows-copyright="${platformConfig.copyright}"`);
  }

  return args;
}

/**
 * Execute build command
 */
async function executeBuild(
  config: any,
  platform: string,
  customDefines: Record<string, string> = {}
) {
  const platformConfig = PLATFORM_CONFIGS[platform as keyof typeof PLATFORM_CONFIGS];
  const extension = platformConfig?.extension || '';

  // Merge custom defines with config defines
  const allDefines = { ...config.defines, ...customDefines };

  // Build command components
  const baseCommand = 'bun build';
  const entryPoint = './src/index.ts';
  const compileFlag = '--compile';
  const outfile = `./dist/${config.name}${extension}`;

  // Build define arguments
  const defineArgs = buildDefineString(allDefines);

  // Build platform arguments
  const platformArgs = buildPlatformArgs(platform, config);

  // Build optimization flags
  const optimizationFlags = config.flags;

  // Construct full command
  const command = [
    baseCommand,
    compileFlag,
    ...defineArgs,
    ...platformArgs,
    ...optimizationFlags,
    entryPoint,
    '--outfile',
    outfile,
  ].join(' ');

  console.log(`🚀 Building ${config.name} for ${platform}...`);
  console.log(`📋 Configuration: ${config.optimization} optimization`);
  console.log(`🔧 Command: ${command}`);

  try {
    // Execute build
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: config.defines.ENVIRONMENT?.replace(/"/g, '') },
    });

    console.log(`✅ Build completed successfully!`);
    console.log(`📦 Output: ${outfile}`);

    // Get file size
    try {
      const fs = await import('fs');
      const stats = fs.statSync(outfile);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📏 File size: ${sizeInMB} MB`);
    } catch (error) {
      console.log(`📏 File size: Unable to determine`);
    }

    return { success: true, output: outfile };
  } catch (error) {
    console.error(`❌ Build failed:`, error);
    return { success: false, error };
  }
}

/**
 * Show build information
 */
function showBuildInfo() {
  const platform = getPlatform();
  const arch = getArchitecture();
  const nodeVersion = getNodeVersion();
  const bunVersion = getBunVersion();
  const gitInfo = getGitInfo();

  console.log(`
🏗️ Fire22 Dashboard - Build Information

🖥️ System Information:
  Platform: ${platform}
  Architecture: ${arch}
  Node.js: ${nodeVersion}
  Bun: ${bunVersion}

📚 Project Information:
  Project Root: ${projectRoot}
  Git Branch: ${gitInfo.branch}
  Git Commit: ${gitInfo.commit}
  Last Commit: ${gitInfo.date}

🔧 Available Build Configurations:
  Development: ${BUILD_CONFIGS.development.name}
  Staging: ${BUILD_CONFIGS.staging.name}
  Production: ${BUILD_CONFIGS.production.name}
  Demo: ${BUILD_CONFIGS.demo.name}
  Custom: ${BUILD_CONFIGS.custom.name}

📦 Build Features:
  - Custom defines for environment variables
  - Platform-specific optimizations
  - Source maps and debugging
  - Minification and bytecode compilation
  - Windows-specific metadata
  - Git integration
`);
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🔧 Fire22 Dashboard - Enhanced Build Compilation

📋 Usage:
  bun run enhanced-build:compile [options]

🎯 Build Types:
  --development     Development build with debugging
  --staging        Staging build with monitoring
  --production     Production build with optimization
  --demo           Demo build with sample data
  --custom         Custom build with extensibility

⚙️ Options:
  --platform       Target platform (win32, darwin, linux)
  --arch           Target architecture (x64, arm64)
  --outdir         Output directory (default: ./dist)
  --name           Custom executable name
  --version        Custom version string
  --time           Custom build time
  --debug          Enable debug mode
  --sourcemap      Generate source maps
  --minify         Minify output
  --bytecode       Enable bytecode compilation

🔍 Examples:
  # Basic production build
  bun run enhanced-build:compile --production
  
  # Windows production build
  bun run enhanced-build:compile --production --platform win32
  
  # Custom build with specific defines
  bun run enhanced-build:compile --custom --name myapp --version "1.2.3"
  
  # Development build with source maps
  bun run enhanced-build:compile --development --sourcemap

📚 Related Commands:
  bun run build:quick          # Quick build
  bun run build:standard       # Standard build
  bun run build:production     # Production build
  bun run build:packages       # Package build
  bun run enhanced-build:dev   # Enhanced development build
  bun run enhanced-build:prod  # Enhanced production build
`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--info')) {
    showBuildInfo();
    return;
  }

  // Determine build type
  let buildType = 'production';
  if (args.includes('--development')) buildType = 'development';
  else if (args.includes('--staging')) buildType = 'staging';
  else if (args.includes('--demo')) buildType = 'demo';
  else if (args.includes('--custom')) buildType = 'custom';

  // Get configuration
  const config = BUILD_CONFIGS[buildType as keyof typeof BUILD_CONFIGS];
  if (!config) {
    console.error(`❌ Invalid build type: ${buildType}`);
    return;
  }

  // Get platform
  const platform = getPlatform();

  // Parse custom defines
  const customDefines: Record<string, string> = {};

  // Parse --name, --version, --time arguments
  const nameIndex = args.indexOf('--name');
  if (nameIndex !== -1 && args[nameIndex + 1]) {
    customDefines.BUILD_NAME = `"${args[nameIndex + 1]}"`;
  }

  const versionIndex = args.indexOf('--version');
  if (versionIndex !== -1 && args[versionIndex + 1]) {
    customDefines.BUILD_VERSION = `"${args[versionIndex + 1]}"`;
  }

  const timeIndex = args.indexOf('--time');
  if (timeIndex !== -1 && args[timeIndex + 1]) {
    customDefines.BUILD_TIME = `"${args[timeIndex + 1]}"`;
  }

  // Execute build
  const result = await executeBuild(config, platform, customDefines);

  if (result.success) {
    console.log(`
🎉 Build completed successfully!

📦 Output: ${result.output}
🔧 Configuration: ${buildType}
🖥️ Platform: ${platform}
⏰ Build Time: ${new Date().toISOString()}

🚀 Next Steps:
  1. Test the executable: ${result.output}
  2. Deploy to target environment
  3. Run health checks: bun run health:comprehensive
  4. Validate deployment: bun run deploy:validate
`);
  } else {
    console.error(`
❌ Build failed!

🔍 Troubleshooting:
  1. Check TypeScript compilation: bun run build:quick
  2. Validate dependencies: bun install
  3. Check file permissions
  4. Review error messages above
  5. Run health check: bun run health:comprehensive
`);
    process.exit(1);
  }
}

// Run the main function
if (import.meta.main) {
  main().catch(console.error);
}

export { executeBuild, showBuildInfo, showHelp, BUILD_CONFIGS };

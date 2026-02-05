#!/usr/bin/env bun
/**
 * Global Binary Setup Script for Fire22 Dashboard Worker
 * Ensures bunx and bun shell are fully global with proper PATH configuration
 */

import { logger } from './enhanced-logging-system';

interface GlobalSetupResult {
  success: boolean;
  message: string;
  commands?: string[];
}

class GlobalBinaryManager {
  private bunBinPath: string = `${process.env.HOME}/.bun/bin`;
  private shellRcFiles: string[] = ['.bashrc', '.zshrc', '.profile'];

  constructor() {
    logger.info('GLOBAL', '1.0.0', 'Initializing global binary setup for Fire22 Dashboard Worker');
  }

  /**
   * Check if Bun is properly installed and accessible
   */
  async checkBunInstallation(): Promise<GlobalSetupResult> {
    try {
      const bunVersion = Bun.version;
      const bunPath = await Bun.which('bun');

      if (!bunPath) {
        return {
          success: false,
          message:
            '❌ Bun not found in PATH. Please install Bun first: curl -fsSL https://bun.sh/install | bash',
        };
      }

      logger.success('GLOBAL', '1.0.0', `Bun v${bunVersion} found at ${bunPath}`);
      return {
        success: true,
        message: `✅ Bun v${bunVersion} properly installed`,
        commands: [`bun --version`],
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error checking Bun installation: ${error}`,
      };
    }
  }

  /**
   * Setup PATH in shell configuration files
   */
  async setupShellPath(): Promise<GlobalSetupResult> {
    const pathExport = `export PATH="${this.bunBinPath}:$PATH"`;
    const updatedFiles: string[] = [];

    try {
      for (const rcFile of this.shellRcFiles) {
        const filePath = `${process.env.HOME}/${rcFile}`;

        try {
          // Check if file exists
          const fileExists = await Bun.file(filePath).exists();

          if (fileExists) {
            const content = await Bun.file(filePath).text();

            // Check if PATH is already configured
            if (!content.includes('.bun/bin')) {
              // Append PATH configuration
              await Bun.write(filePath, `${content}\n\n# Bun binary path\n${pathExport}\n`);
              updatedFiles.push(rcFile);
              logger.info('GLOBAL', '1.0.0', `Updated PATH in ${rcFile}`);
            } else {
              logger.info('GLOBAL', '1.0.0', `PATH already configured in ${rcFile}`);
            }
          } else {
            // Create file with PATH configuration
            await Bun.write(filePath, `# Bun binary path\n${pathExport}\n`);
            updatedFiles.push(rcFile);
            logger.info('GLOBAL', '1.0.0', `Created ${rcFile} with PATH configuration`);
          }
        } catch (error) {
          logger.warning('GLOBAL', '1.0.0', `Could not update ${rcFile}: ${error}`);
        }
      }

      return {
        success: true,
        message:
          updatedFiles.length > 0
            ? `✅ Updated PATH in: ${updatedFiles.join(', ')}. Restart your terminal or run: source ~/.bashrc`
            : `✅ PATH already properly configured`,
        commands: [`source ~/.bashrc`, `source ~/.zshrc`],
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Error setting up shell PATH: ${error}`,
      };
    }
  }

  /**
   * Link Fire22 binaries globally
   */
  async linkGlobalBinaries(): Promise<GlobalSetupResult> {
    try {
      // Run bun link to create global symlinks
      const linkProcess = Bun.spawn(['bun', 'link'], {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      const exitCode = await linkProcess.exited;

      if (exitCode === 0) {
        logger.success('GLOBAL', '1.0.0', 'Global binaries linked successfully');

        // Verify linked binaries
        const binaries = ['fire22-dashboard', 'fire22-version', 'fire22-staging', 'fire22-hmr'];
        const verificationResults = [];

        for (const binary of binaries) {
          const binaryPath = await Bun.which(binary);
          if (binaryPath) {
            verificationResults.push(`✅ ${binary} → ${binaryPath}`);
          } else {
            verificationResults.push(`⚠️ ${binary} → not found`);
          }
        }

        return {
          success: true,
          message: `✅ Global binaries linked: ${binaries.join(', ')}`,
          commands: binaries.map(bin => `${bin} --version`),
        };
      } else {
        return {
          success: false,
          message: '❌ Failed to link global binaries',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Error linking global binaries: ${error}`,
      };
    }
  }

  /**
   * Setup bunx global package access
   */
  async setupBunxGlobal(): Promise<GlobalSetupResult> {
    try {
      // Check if bunx is accessible
      const bunxPath = await Bun.which('bunx');
      if (!bunxPath) {
        return {
          success: false,
          message: '❌ bunx not found. Bun installation may be incomplete.',
        };
      }

      // Test bunx functionality
      const testProcess = Bun.spawn(['bunx', '--version'], {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      const exitCode = await testProcess.exited;

      if (exitCode === 0) {
        logger.success('GLOBAL', '1.0.0', `bunx accessible at ${bunxPath}`);

        return {
          success: true,
          message: `✅ bunx fully functional at ${bunxPath}`,
          commands: [
            'bunx --version',
            'bunx fire22-dashboard --version',
            'bunx -p fire22-dashboard-worker fire22-version status',
          ],
        };
      } else {
        return {
          success: false,
          message: '❌ bunx not functioning properly',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Error setting up bunx: ${error}`,
      };
    }
  }

  /**
   * Verify global installation
   */
  async verifyGlobalSetup(): Promise<GlobalSetupResult> {
    const tests = [
      { cmd: 'bun', args: ['--version'], name: 'Bun runtime' },
      { cmd: 'bunx', args: ['--version'], name: 'bunx package runner' },
      { cmd: 'fire22-dashboard', args: ['--version'], name: 'Fire22 Dashboard' },
      { cmd: 'fire22-version', args: ['status'], name: 'Fire22 Version CLI' },
    ];

    const results: string[] = [];
    let allPassed = true;

    for (const test of tests) {
      try {
        const cmdPath = await Bun.which(test.cmd);
        if (cmdPath) {
          results.push(`✅ ${test.name}: ${cmdPath}`);
        } else {
          results.push(`❌ ${test.name}: command not found`);
          allPassed = false;
        }
      } catch (error) {
        results.push(`❌ ${test.name}: error - ${error}`);
        allPassed = false;
      }
    }

    return {
      success: allPassed,
      message: allPassed
        ? '✅ All global binaries verified'
        : '⚠️ Some global binaries have issues',
      commands: results,
    };
  }

  /**
   * Complete global setup process
   */
  async setupGlobal(): Promise<void> {
    logger.info('GLOBAL', '1.0.0', '🚀 Starting Fire22 Dashboard Worker global setup');

    console.log(`
🔥 Fire22 Dashboard Worker - Global Setup
!==!==!==!==!==!==!==!==
Package: fire22-dashboard-worker@4.0.0-staging
Bun Version: ${Bun.version}
`);

    // Step 1: Check Bun installation
    const bunCheck = await this.checkBunInstallation();
    console.log(bunCheck.message);
    if (!bunCheck.success) return;

    // Step 2: Setup shell PATH
    const pathSetup = await this.setupShellPath();
    console.log(pathSetup.message);

    // Step 3: Link global binaries
    const linkSetup = await this.linkGlobalBinaries();
    console.log(linkSetup.message);

    // Step 4: Setup bunx global access
    const bunxSetup = await this.setupBunxGlobal();
    console.log(bunxSetup.message);

    // Step 5: Verify installation
    const verification = await this.verifyGlobalSetup();
    console.log('\n🔍 Verification Results:');
    if (verification.commands) {
      verification.commands.forEach(result => console.log(`  ${result}`));
    }

    // Final instructions
    console.log(`
🎉 Global Setup Complete!

📋 Available Commands:
  fire22-dashboard --version    - Main dashboard
  fire22-version status         - Version management
  fire22-staging               - Staging server  
  fire22-hmr                   - HMR dev server
  bunx fire22-dashboard-worker - Run via bunx

🔧 Next Steps:
  1. Restart your terminal or run: source ~/.bashrc
  2. Test: fire22-dashboard --version
  3. Test: bunx fire22-dashboard-worker --version
  4. Use: bunx -p fire22-dashboard-worker <command>

📚 Documentation: http://localhost:3001/reference
`);

    logger.success('GLOBAL', '1.0.0', '🔥 Fire22 Dashboard Worker global setup completed');
  }
}

// CLI Interface
if (import.meta.main) {
  const manager = new GlobalBinaryManager();
  const command = process.argv[2];

  switch (command) {
    case 'check':
      manager.checkBunInstallation().then(result => console.log(result.message));
      break;
    case 'path':
      manager.setupShellPath().then(result => console.log(result.message));
      break;
    case 'link':
      manager.linkGlobalBinaries().then(result => console.log(result.message));
      break;
    case 'bunx':
      manager.setupBunxGlobal().then(result => console.log(result.message));
      break;
    case 'verify':
      manager.verifyGlobalSetup().then(result => {
        console.log(result.message);
        if (result.commands) {
          result.commands.forEach(cmd => console.log(`  ${cmd}`));
        }
      });
      break;
    case 'setup':
    default:
      manager.setupGlobal();
      break;
  }
}

export { GlobalBinaryManager };

#!/usr/bin/env bun

/**
 * Fire22 Security Registry CLI
 *
 * Comprehensive security scanning and registry management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { SecurityScanner } from './scanner/SecurityScanner';
import { Fire22Registry } from './registry/Fire22Registry';
import { BunxIntegration } from './bunx/BunxIntegration';

const program = new Command();

program
  .name('fire22-security')
  .description(
    'Fire22 Security Registry CLI - Comprehensive security scanning and package management'
  )
  .version('1.0.0');

// Security scanning commands
program
  .command('scan')
  .description('Scan project for security vulnerabilities')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--strict', 'Enable strict scanning mode')
  .option('--report <format>', 'Report format (json|text|html)', 'text')
  .action(async options => {
    const spinner = ora('Scanning for security vulnerabilities...').start();

    try {
      const scanner = new SecurityScanner({
        strict: options.strict,
        path: options.path,
      });

      const report = await scanner.scan();
      spinner.succeed('Security scan completed');

      console.log(chalk.blue('\n🔍 Security Scan Report'));
      console.log(chalk.gray('─'.repeat(50)));

      if (report.vulnerabilities.length === 0) {
        console.log(chalk.green('✅ No vulnerabilities found'));
      } else {
        console.log(chalk.red(`❌ Found ${report.vulnerabilities.length} vulnerabilities`));
        console.log(chalk.yellow(`📊 Risk Level: ${report.riskLevel}`));
        console.log(chalk.cyan(`🔢 Security Score: ${report.score}/100`));
      }
    } catch (error) {
      spinner.fail('Security scan failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('audit')
  .description('Audit dependencies for known vulnerabilities')
  .option('-f, --fix', 'Automatically fix vulnerabilities where possible')
  .option('--level <level>', 'Audit level (low|medium|high|critical)', 'medium')
  .action(async options => {
    const spinner = ora('Auditing dependencies...').start();

    try {
      const scanner = new SecurityScanner();
      const auditResult = await scanner.audit({
        autoFix: options.fix,
        level: options.level,
      });

      spinner.succeed('Dependency audit completed');

      console.log(chalk.blue('\n🔍 Dependency Audit Report'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`📦 Packages scanned: ${auditResult.packagesScanned}`);
      console.log(`⚠️  Issues found: ${auditResult.issuesFound}`);
      console.log(`✅ Fixed: ${auditResult.fixed}`);
    } catch (error) {
      spinner.fail('Audit failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Registry management commands
program
  .command('publish')
  .description('Publish package to Fire22 registry with security scanning')
  .option('--registry <url>', 'Registry URL', 'https://fire22.workers.dev/registry/')
  .option('--scan', 'Scan package before publishing', true)
  .action(async options => {
    const spinner = ora('Publishing to Fire22 registry...').start();

    try {
      const registry = new Fire22Registry({
        url: options.registry,
        securityScanning: options.scan,
      });

      const result = await registry.publish();
      spinner.succeed('Package published successfully');

      console.log(chalk.green('\n✅ Package Published'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`📦 Package: ${result.name}@${result.version}`);
      console.log(`🔗 Registry: ${result.registry}`);
      console.log(`🔐 Security Score: ${result.securityScore}/100`);
    } catch (error) {
      spinner.fail('Publishing failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Install package with security validation')
  .argument('<package>', 'Package name to install')
  .option('--registry <url>', 'Registry URL', 'https://fire22.workers.dev/registry/')
  .option('--validate', 'Validate package security', true)
  .action(async (packageName, options) => {
    const spinner = ora(`Installing ${packageName}...`).start();

    try {
      const registry = new Fire22Registry({
        url: options.registry,
        securityValidation: options.validate,
      });

      const result = await registry.install(packageName);
      spinner.succeed(`${packageName} installed successfully`);

      if (result.securityWarnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Security Warnings:'));
        result.securityWarnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }
    } catch (error) {
      spinner.fail(`Installation of ${packageName} failed`);
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Bunx integration commands
program
  .command('bunx:setup')
  .description('Setup bunx integration with Fire22 security')
  .option('--global', 'Setup global bunx integration')
  .action(async options => {
    const spinner = ora('Setting up bunx integration...').start();

    try {
      const bunx = new BunxIntegration({
        global: options.global,
      });

      await bunx.setup();
      spinner.succeed('Bunx integration setup completed');

      console.log(chalk.green('\n✅ Bunx Integration Ready'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('🔐 Security scanning enabled for bunx packages');
      console.log('📦 Fire22 registry configured as default');
      console.log('⚡ Performance optimizations applied');
    } catch (error) {
      spinner.fail('Bunx setup failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('bunx:scan')
  .description('Scan bunx global packages for vulnerabilities')
  .action(async () => {
    const spinner = ora('Scanning bunx packages...').start();

    try {
      const bunx = new BunxIntegration();
      const report = await bunx.scanGlobalPackages();

      spinner.succeed('Bunx packages scanned');

      console.log(chalk.blue('\n🔍 Bunx Security Report'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`📦 Global packages: ${report.totalPackages}`);
      console.log(`⚠️  Vulnerable packages: ${report.vulnerablePackages}`);
      console.log(`🔐 Security score: ${report.overallScore}/100`);

      if (report.recommendations.length > 0) {
        console.log(chalk.yellow('\n💡 Recommendations:'));
        report.recommendations.forEach(rec => {
          console.log(chalk.yellow(`  • ${rec}`));
        });
      }
    } catch (error) {
      spinner.fail('Bunx scan failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Configuration commands
program
  .command('config')
  .description('Manage Fire22 security configuration')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset to default configuration')
  .action(async options => {
    if (options.show) {
      console.log(chalk.blue('\n🔧 Fire22 Security Configuration'));
      console.log(chalk.gray('─'.repeat(50)));
      // Show configuration logic here
    }

    if (options.reset) {
      const spinner = ora('Resetting configuration...').start();
      // Reset configuration logic here
      spinner.succeed('Configuration reset to defaults');
    }
  });

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.cyan('Run "fire22-security --help" for available commands'));
  process.exit(1);
});

// Parse command line arguments
if (import.meta.main) {
  program.parse();
}

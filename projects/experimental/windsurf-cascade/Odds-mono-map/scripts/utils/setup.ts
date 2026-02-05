#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]setup
 * 
 * Setup
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils
 */

#!/usr/bin/env bun

/**
 * Vault Setup Script
 * Initializes the vault automation system
 */

import { ErrorHandler, ErrorSeverity, ErrorCategory, createErrorContext, logger } from '../../src/core/error-handler.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const VAULT_PATH = process.cwd();
const SCRIPTS_PATH = join(VAULT_PATH, 'scripts');

interface SetupConfig {
    created: string[];
    errors: string[];
    warnings: string[];
}

async function setupVault(): Promise<void> {
    console.log(chalk.blue.bold('🚀 Setting up Odds Protocol Vault Automation...'));

    const config: SetupConfig = {
        created: [],
        errors: [],
        warnings: []
    };

    try {
        // Ensure required directories exist
        const requiredDirs = [
            '01 - Daily Notes',
            '02 - Architecture',
            '02 - Architecture/System Design',
            '03 - Development',
            '03 - Development/Code Snippets',
            '04 - Documentation',
            '04 - Documentation/Guides',
            '04 - Documentation/API',
            '05 - Assets',
            '05 - Assets/Diagrams',
            '05 - Assets/Images',
            '06 - Templates',
            '07 - Archive',
            'logs',
            'scripts'
        ];

        for (const dir of requiredDirs) {
            const dirPath = join(VAULT_PATH, dir);
            if (!existsSync(dirPath)) {
                mkdirSync(dirPath, { recursive: true });
                config.created.push(`Directory: ${dir}`);
                console.log(chalk.green(`✓ Created directory: ${dir}`));
            }
        }

        // Create monitoring log file
        const logFile = join(VAULT_PATH, 'logs', 'vault-automation.log');
        if (!existsSync(logFile)) {
            writeFileSync(logFile, `# Vault Automation Log\n\nStarted: ${new Date().toISOString()}\n\n`);
            config.created.push('Log file: vault-automation.log');
            console.log(chalk.green('✓ Created log file'));
        }

        // Create configuration file
        const configFile = join(VAULT_PATH, '.vault-config.json');
        if (!existsSync(configFile)) {
            const configData = {
                version: '1.0.0',
                setupDate: new Date().toISOString(),
                automation: {
                    enabled: true,
                    monitorInterval: 5000,
                    cleanupInterval: 3600000,
                    validationInterval: 86400000
                },
                standards: {
                    enforceNaming: true,
                    requireFrontmatter: true,
                    validateLinks: true,
                    maxLineLength: 100
                }
            };
            writeFileSync(configFile, JSON.stringify(configData, null, 2));
            config.created.push('Configuration: .vault-config.json');
            console.log(chalk.green('✓ Created configuration file'));
        }

        // Create status file
        const statusFile = join(VAULT_PATH, '.vault-status.json');
        const statusData = {
            lastValidation: null,
            lastOrganization: null,
            issues: 0,
            warnings: 0,
            compliance: 0,
            monitorActive: false,
            lastUpdate: new Date().toISOString()
        };
        writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
        config.created.push('Status file: .vault-status.json');
        console.log(chalk.green('✓ Created status file'));

        // Display results
        console.log(chalk.blue.bold('\n📊 Setup Results:'));
        console.log(chalk.green(`✅ Successfully created ${config.created.length} items`));

        if (config.warnings.length > 0) {
            console.log(chalk.yellow(`⚠️  ${config.warnings.length} warnings`));
            config.warnings.forEach(warning => console.log(chalk.yellow(`   - ${warning}`)));
        }

        if (config.errors.length > 0) {
            console.log(chalk.red(`❌ ${config.errors.length} errors`));
            config.errors.forEach(error => console.log(chalk.red(`   - ${error}`)));
        }

        console.log(chalk.blue.bold('\n🎯 Next Steps:'));
        console.log('1. Run: bun run vault:organize');
        console.log('2. Run: bun run vault:validate');
        console.log('3. Run: bun run vault:monitor');

    } catch (error) {
        ErrorHandler.handleError(
            error as Error,
            ErrorSeverity.HIGH,
            ErrorCategory.VAULT,
            createErrorContext()
                .script('setup.ts')
                .function('setupVault')
                .build()
        );
        process.exit(1);
    }
}

// Run setup with proper error handling
if (import.meta.main) {
    ErrorHandler.handleAsync(
        async () => {
            await setupVault();
        },
        ErrorSeverity.HIGH,
        ErrorCategory.VAULT,
        createErrorContext()
            .script('setup.ts')
            .function('setupVault')
            .build()
    );
}

export { setupVault };

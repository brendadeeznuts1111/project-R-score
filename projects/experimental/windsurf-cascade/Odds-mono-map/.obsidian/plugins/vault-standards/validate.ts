#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// Define paths for logging
const VAULT_ROOT = resolve(__dirname, '../../..');
const LOGS_DIR = resolve(VAULT_ROOT, '08 - Logs');
const VALIDATION_LOG = resolve(LOGS_DIR, 'vault-standards-validation.log');
const ERROR_LOG = resolve(LOGS_DIR, 'vault-standards-errors.log');

// Ensure logs directory exists
if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
}

// Logging utilities
function logToFile(filePath: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    try {
        writeFileSync(filePath, logEntry, { flag: 'a' });
    } catch (error) {
        console.error(`Failed to write to log file ${filePath}:`, error);
    }
}

function logValidation(message: string): void {
    console.log(message);
    logToFile(VALIDATION_LOG, message);
}

function logError(message: string): void {
    console.error(message);
    logToFile(ERROR_LOG, message);
}

interface PluginValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    summary: {
        totalErrors: number;
        totalWarnings: number;
        criticalIssues: number;
    };
    features: {
        bunIntegration: boolean;
        typeSystem: boolean;
        validation: boolean;
        automation: boolean;
    };
}

class PluginValidator {
    private pluginPath: string;
    private vaultRoot: string;

    constructor(pluginPath: string) {
        this.pluginPath = pluginPath;
        this.vaultRoot = VAULT_ROOT;
        logValidation(`🔍 PluginValidator initialized for path: ${pluginPath}`);
    }

    async validate(): Promise<PluginValidationResult> {
        logValidation('🔍 Starting Vault Standards Plugin validation...');

        const result: PluginValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            summary: {
                totalErrors: 0,
                totalWarnings: 0,
                criticalIssues: 0
            },
            features: {
                bunIntegration: false,
                typeSystem: false,
                validation: false,
                automation: false
            }
        };

        try {
            // Validate manifest
            await this.validateManifest(result);

            // Validate main plugin file
            await this.validateMainFile(result);

            // Validate package.json
            await this.validatePackageJson(result);

            // Validate TypeScript config
            await this.validateTypeScriptConfig(result);

            // Check feature implementations
            await this.validateFeatures(result);

            // Validate paths and structure
            await this.validatePaths(result);

            // Calculate summary
            result.summary.totalErrors = result.errors.length;
            result.summary.totalWarnings = result.warnings.length;
            result.summary.criticalIssues = result.errors.filter(e => e.includes('Critical')).length;
            result.isValid = result.errors.length === 0;

            logValidation(`✅ Validation completed: ${result.isValid ? 'VALID' : 'INVALID'}`);
            return result;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logError(`❌ Validation failed with error: ${errorMessage}`);
            result.errors.push(`Critical: Validation process failed - ${errorMessage}`);
            result.isValid = false;
            return result;
        }
    }

    private async validatePaths(result: PluginValidationResult): Promise<void> {
        logValidation('📁 Validating plugin paths and structure...');

        const requiredPaths = [
            'manifest.json',
            'main.ts',
            'package.json',
            'tsconfig.json',
            'esbuild.config.mjs',
            'README.md'
        ];

        for (const path of requiredPaths) {
            const fullPath = resolve(this.pluginPath, path);
            if (!existsSync(fullPath)) {
                result.errors.push(`Missing required file: ${path}`);
                logError(`❌ Missing file: ${fullPath}`);
            } else {
                logValidation(`✅ Found required file: ${path}`);
            }
        }

        // Check logs directory
        if (!existsSync(LOGS_DIR)) {
            result.warnings.push(`Logs directory not found: ${LOGS_DIR}`);
            logError(`❌ Logs directory missing: ${LOGS_DIR}`);
        } else {
            logValidation(`✅ Logs directory exists: ${LOGS_DIR}`);
        }
    }

    private async validateManifest(result: PluginValidationResult): Promise<void> {
        logValidation('📋 Validating manifest.json...');

        try {
            const manifestPath = resolve(this.pluginPath, 'manifest.json');
            const manifestData = JSON.parse(readFileSync(manifestPath, 'utf-8'));

            // Handle nested manifest structure
            const manifest = manifestData.manifest || manifestData;

            // Check required fields
            const requiredFields = ['id', 'name', 'version', 'minAppVersion', 'description'];
            for (const field of requiredFields) {
                if (!manifest[field]) {
                    result.errors.push(`Missing required field in manifest.json: ${field}`);
                    logError(`❌ Manifest missing field: ${field}`);
                }
            }

            // Check version format
            if (manifest.version && !manifest.version.match(/^\d+\.\d+\.\d+$/)) {
                result.errors.push('Invalid version format in manifest.json');
                logError('❌ Invalid version format in manifest.json');
            }

            // Check features section
            if (!manifestData.features) {
                result.warnings.push('Missing features section in manifest.json');
                logValidation('⚠️ Manifest missing features section');
            } else {
                logValidation('✅ Manifest features section found');
            }

            logValidation('✅ Manifest validation completed');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Failed to validate manifest.json: ${errorMessage}`);
            logError(`❌ Manifest validation failed: ${errorMessage}`);
        }
    }

    private async validateMainFile(result: PluginValidationResult): Promise<void> {
        logValidation('🔧 Validating main.ts...');

        try {
            const mainPath = resolve(this.pluginPath, 'main.ts');
            const content = readFileSync(mainPath, 'utf-8');

            // Check for required imports
            if (!content.includes('import { App, Plugin')) {
                result.errors.push('Missing required Obsidian imports in main.ts');
                logError('❌ main.ts missing Obsidian imports');
            }

            // Check for plugin class
            if (!content.includes('export default class')) {
                result.errors.push('Missing plugin class export in main.ts');
                logError('❌ main.ts missing plugin class export');
            }

            // Check for required methods
            const requiredMethods = ['onload', 'onunload', 'loadSettings', 'saveSettings'];
            for (const method of requiredMethods) {
                if (!content.includes(method)) {
                    result.warnings.push(`Missing recommended method: ${method}`);
                    logValidation(`⚠️ main.ts missing method: ${method}`);
                }
            }

            // Check for Bun integration
            if (content.includes('Bun') || content.includes('bunIntegration')) {
                result.features.bunIntegration = true;
                logValidation('✅ Bun integration detected in main.ts');
            }

            logValidation('✅ Main file validation completed');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Failed to validate main.ts: ${errorMessage}`);
            logError(`❌ Main file validation failed: ${errorMessage}`);
        }
    }

    private async validatePackageJson(result: PluginValidationResult): Promise<void> {
        logValidation('📦 Validating package.json...');

        try {
            const packagePath = resolve(this.pluginPath, 'package.json');
            const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

            // Check for TypeScript
            if (packageJson.devDependencies && packageJson.devDependencies['typescript']) {
                result.features.typeSystem = true;
                logValidation('✅ TypeScript found in package.json');
            }

            // Check for test scripts
            if (packageJson.scripts && packageJson.scripts.test) {
                result.features.validation = true;
                logValidation('✅ Test script found in package.json');
            }

            logValidation('✅ Package.json validation completed');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Failed to validate package.json: ${errorMessage}`);
            logError(`❌ Package.json validation failed: ${errorMessage}`);
        }
    }

    private async validateTypeScriptConfig(result: PluginValidationResult): Promise<void> {
        logValidation('⚙️ Validating tsconfig.json...');

        try {
            const tsconfigPath = resolve(this.pluginPath, 'tsconfig.json');
            const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

            // Check for strict mode
            if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
                result.features.typeSystem = true;
                logValidation('✅ Strict mode enabled in tsconfig.json');
            }

            // Check for path mapping
            if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
                result.features.typeSystem = true;
                logValidation('✅ Path mapping found in tsconfig.json');
            }

            logValidation('✅ TypeScript config validation completed');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.warnings.push(`Failed to validate tsconfig.json: ${errorMessage}`);
            logValidation(`⚠️ TypeScript config validation failed: ${errorMessage}`);
        }
    }

    private async validateFeatures(result: PluginValidationResult): Promise<void> {
        logValidation('🚀 Validating plugin features...');

        try {
            const mainPath = resolve(this.pluginPath, 'main.ts');
            const content = readFileSync(mainPath, 'utf-8');

            // Check validation features
            if (content.includes('validate') || content.includes('validation')) {
                result.features.validation = true;
                logValidation('✅ Validation features detected');
            }

            // Check automation features
            if (content.includes('automation') || content.includes('monitoring')) {
                result.features.automation = true;
                logValidation('✅ Automation features detected');
            }

            logValidation('✅ Feature validation completed');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.warnings.push(`Failed to validate features: ${errorMessage}`);
            logValidation(`⚠️ Feature validation failed: ${errorMessage}`);
        }
    }
}

// Run validation
async function main() {
    const pluginPath = process.cwd();
    const validator = new PluginValidator(pluginPath);

    try {
        const result = await validator.validate();

        logValidation('\n📊 Plugin Validation Results:');
        logValidation('================================');

        if (result.isValid) {
            logValidation('✅ Plugin is valid!');
        } else {
            logValidation('❌ Plugin has validation issues');
        }

        logValidation(`\n📋 Summary:`);
        logValidation(`  Errors: ${result.summary.totalErrors}`);
        logValidation(`  Warnings: ${result.summary.totalWarnings}`);
        logValidation(`  Critical Issues: ${result.summary.criticalIssues}`);

        logValidation(`\n🚀 Features Status:`);
        logValidation(`  🍞 Bun Integration: ${result.features.bunIntegration ? '✅' : '❌'}`);
        logValidation(`  📋 Type System: ${result.features.typeSystem ? '✅' : '❌'}`);
        logValidation(`  🔍 Validation: ${result.features.validation ? '✅' : '❌'}`);
        logValidation(`  🤖 Automation: ${result.features.automation ? '✅' : '❌'}`);

        if (result.errors.length > 0) {
            logValidation(`\n❌ Errors:`);
            result.errors.forEach(error => {
                logValidation(`  - ${error}`);
            });
        }

        if (result.warnings.length > 0) {
            logValidation(`\n⚠️ Warnings:`);
            result.warnings.forEach(warning => {
                logValidation(`  - ${warning}`);
            });
        }

        // Log completion
        logValidation(`\n📁 Log files created:`);
        logValidation(`  - Validation: ${VALIDATION_LOG}`);
        logValidation(`  - Errors: ${ERROR_LOG}`);

        // Exit with error code if validation failed
        process.exit(result.isValid ? 0 : 1);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`❌ Validation failed: ${errorMessage}`);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

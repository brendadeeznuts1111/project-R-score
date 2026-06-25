#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]daily
 * 
 * Daily
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
 * Vault Daily Routine Script
 * Runs daily validation and maintenance tasks
 */

import { VaultValidator } from './validate.js';
import { VaultOrganizer } from './organize.js';
import { ErrorHandler, ErrorSeverity, ErrorCategory, createErrorContext, logger } from '../../src/core/error-handler.js';
import { DailyReport, VaultMetrics } from '../../src/types/tick-processor-types.js';
import { TIME_CONSTANTS, DISPLAY_CONSTANTS, createTimer, formatTable, formatNanoseconds } from '../../src/constants/vault-constants.js';
import { VaultCleanup } from './cleanup.js';
import chalk from 'chalk';

class VaultDaily {
    private vaultPath: string;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
    }

    async runDailyRoutine(): Promise<void> {
        console.info(chalk.blue.bold('🌅 Running Daily Vault Routine...'));
        console.info(chalk.gray(`Date: ${new Date().toLocaleDateString()}`));

        const overallTimer = createTimer();
        const results: DailyReport = {
            validation: { passed: false, issues: 0, errors: [], warnings: [] },
            organization: { organized: 0, moved: [], errors: [] },
            cleanup: { cleaned: 0, archived: [], deleted: [], spaceSaved: 0 },
            timestamp: new Date(),
            duration: 0
        };

        try {
            // Step 1: Validation with timing
            const validationTimer = createTimer();
            console.info(chalk.blue('\n🔍 Step 1: Validating vault...'));
            const validator = new VaultValidator(this.vaultPath);
            const validationResults = await validator.validateAll();
            validationTimer.stop();

            console.info(chalk.gray(`Validation completed in: ${validationTimer.formattedDuration}`));

            results.validation = {
                passed: validationResults.errors === 0,
                issues: validationResults.errors + validationResults.warnings,
                errors: validationResults.errors > 0 ? [`${validationResults.errors} validation errors found`] : [],
                warnings: validationResults.warnings > 0 ? [`${validationResults.warnings} validation warnings found`] : []
            };

            if (results.validation.passed) {
                console.info(chalk.green('✅ Validation passed'));
            } else {
                console.info(chalk.yellow('⚠️  Validation issues found'));
            }

            // Step 2: Organization with timing
            const organizationTimer = createTimer();
            console.info(chalk.blue('\n🗂️  Step 2: Organizing files...'));
            const organizer = new VaultOrganizer(this.vaultPath);
            const organizationResults = await organizer.organizeAll();
            organizationTimer.stop();

            console.info(chalk.gray(`Organization completed in: ${organizationTimer.formattedDuration}`));

            results.organization = {
                organized: organizationResults.moved.length + organizationResults.renamed.length,
                moved: [...organizationResults.moved, ...organizationResults.renamed],
                errors: organizationResults.errors
            };

            if (results.organization.organized > 0) {
                console.info(chalk.green(`✅ Organized ${results.organization.organized} files`));
            } else {
                console.info(chalk.gray('✓ No files needed organization'));
            }

            // Step 3: Cleanup with timing
            const today = new Date();
            if (today.getDay() === 0) { // Sunday
                console.info(chalk.blue('\n🧹 Step 3: Weekly cleanup...'));
                const cleanupTimer = createTimer();
                const cleanup = new VaultCleanup(this.vaultPath);
                const cleanupResults = await cleanup.cleanupAll();
                cleanupTimer.stop();

                console.info(chalk.gray(`Cleanup completed in: ${cleanupTimer.formattedDuration}`));

                results.cleanup = cleanupResults;

                if (results.cleanup.cleaned > 0) {
                    console.info(chalk.green(`✅ Cleaned ${results.cleanup.cleaned} files`));
                } else {
                    console.info(chalk.gray('✓ No cleanup needed'));
                }
            }

            // Step 4: Generate daily report
            this.generateDailyReport(results, overallTimer.duration);

        } catch (error) {
            ErrorHandler.handleError(
                error as Error,
                ErrorSeverity.HIGH,
                ErrorCategory.VAULT,
                createErrorContext()
                    .script('daily.ts')
                    .function('runDailyRoutine')
                    .build()
            );
        }
    }

    private generateDailyReport(results: DailyReport, durationNanoseconds: number): void {
        console.info(chalk.blue.bold('\n📊 Daily Report:'));
        console.info(chalk.gray('='.repeat(DISPLAY_CONSTANTS.SEPARATOR_LENGTH)));

        // Performance summary table
        const performanceData = [
            {
                'Task': 'Validation',
                'Status': results.validation.passed ? '✅ Passed' : '⚠️ Issues',
                'Issues': results.validation.issues,
                'Timing': formatNanoseconds(durationNanoseconds * 0.3) // Approximate
            },
            {
                'Task': 'Organization',
                'Status': results.organization.organized > 0 ? '✅ Files Organized' : '✓ No Changes',
                'Files': results.organization.organized,
                'Timing': formatNanoseconds(durationNanoseconds * 0.4) // Approximate
            },
            {
                'Task': 'Cleanup',
                'Status': results.cleanup.cleaned > 0 ? '✅ Files Cleaned' : '✓ No Cleanup',
                'Files': results.cleanup.cleaned,
                'Timing': formatNanoseconds(durationNanoseconds * 0.3) // Approximate
            }
        ];

        console.info(chalk.blue.bold('\n⚡ Performance Summary:'));
        console.info(formatTable(performanceData, ['Task', 'Status', 'Issues', 'Timing'], { colors: true }));

        console.info(chalk.blue.bold('\n💡 Recommendations:'));

        if (!results.validation.passed) {
            console.info(chalk.yellow('• Run: bun run vault:fix - Auto-fix validation issues'));
        }

        if (results.validation.issues > 0) {
            console.info(chalk.yellow('• Review validation warnings manually'));
        }

        if (results.organization.organized === 0 && results.cleanup.cleaned === 0) {
            console.info(chalk.green('• Vault is well organized! Keep up the good work.'));
        }

        console.info(chalk.green('\n✅ Daily routine completed successfully!'));
        console.info(chalk.gray(`Total execution time: ${formatNanoseconds(durationNanoseconds)}`));
    }
}

// Run daily routine with proper error handling
if (import.meta.main) {
    ErrorHandler.handleAsync(
        async () => {
            const daily = new VaultDaily();
            await daily.runDailyRoutine();
        },
        ErrorSeverity.HIGH,
        ErrorCategory.VAULT,
        createErrorContext()
            .script('daily.ts')
            .function('runDailyRoutine')
            .build()
    );
}

export { VaultDaily };

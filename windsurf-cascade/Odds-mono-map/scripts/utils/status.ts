#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]status
 * 
 * Vault Status Script
 * Shows current vault status and statistics
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags status,vault,statistics,monitoring
 */

import { glob } from 'glob';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';

// Constants
const DISPLAY_CONSTANTS = {
    SEPARATOR_LENGTH: 50
};

const VALIDATION_CONSTANTS = {
    COMPLIANCE_THRESHOLDS: {
        GOOD: 80
    }
};

interface VaultStats {
    totalFiles: number;
    filesByFolder: Record<string, number>;
    lastValidation: string | null;
    lastOrganization: string | null;
    monitorActive: boolean;
    issues: number;
    warnings: number;
    compliance: number;
}

class VaultStatus {
    private vaultPath: string;

    constructor(vaultPath: string = process.cwd()) {
        this.vaultPath = vaultPath;
    }

    async showStatus(): Promise<void> {
        console.log(chalk.blue.bold('📊 Odds Protocol Vault Status'));
        console.log(chalk.gray('='.repeat(DISPLAY_CONSTANTS.SEPARATOR_LENGTH)));

        // Load status data
        const statusData = this.loadStatusFile();

        // Calculate file statistics
        const fileStats = await this.calculateFileStats();

        // Display information
        this.displayGeneralStatus(statusData, fileStats);
        this.displayFileStats(fileStats);
        this.displayAutomationStatus(statusData);
        this.displayRecommendations(statusData, fileStats);
    }

    private loadStatusFile(): any {
        const statusFile = join(this.vaultPath, '.vault-status.json');

        if (!existsSync(statusFile)) {
            return {
                lastValidation: null,
                lastOrganization: null,
                monitorActive: false,
                issues: 0,
                warnings: 0,
                compliance: 0
            };
        }

        try {
            return JSON.parse(readFileSync(statusFile, 'utf-8'));
        } catch (error) {
            console.warn(chalk.yellow('Warning: Could not read status file'));
            return {};
        }
    }

    private async calculateFileStats(): Promise<VaultStats> {
        try {
            // Use a more direct approach
            const { readdir } = await import('fs/promises');
            const files = await readdir(this.vaultPath);
            const mdFiles = files.filter(file => file.endsWith('.md'));

            console.log(chalk.gray(`Found ${mdFiles.length} markdown files to analyze`));

            const filesByFolder: Record<string, number> = {
                'root': mdFiles.length
            };

            return {
                totalFiles: mdFiles.length,
                filesByFolder,
                lastValidation: null,
                lastOrganization: null,
                monitorActive: false,
                issues: 0,
                warnings: 0,
                compliance: 0
            };
        } catch (error) {
            console.error(chalk.red('Error calculating file stats:'), error);
            return {
                totalFiles: 0,
                filesByFolder: {},
                lastValidation: null,
                lastOrganization: null,
                monitorActive: false,
                issues: 0,
                warnings: 0,
                compliance: 0
            };
        }
    }

    private displayGeneralStatus(statusData: any, fileStats: VaultStats): void {
        console.log(chalk.blue.bold('\n🏠 General Status:'));

        console.log(chalk.white(`Total Files: ${fileStats.totalFiles}`));
        console.log(chalk.white(`Folders: ${Object.keys(fileStats.filesByFolder).length}`));

        if (statusData.lastValidation) {
            const lastValidation = new Date(statusData.lastValidation);
            const timeAgo = this.getTimeAgo(lastValidation);
            console.log(chalk.white(`Last Validation: ${timeAgo}`));
        } else {
            console.log(chalk.gray('Last Validation: Never'));
        }

        if (statusData.lastOrganization) {
            const lastOrganization = new Date(statusData.lastOrganization);
            const timeAgo = this.getTimeAgo(lastOrganization);
            console.log(chalk.white(`Last Organization: ${timeAgo}`));
        } else {
            console.log(chalk.gray('Last Organization: Never'));
        }
    }

    private displayFileStats(fileStats: VaultStats): void {
        console.log(chalk.blue.bold('\n📁 Files by Folder:'));

        const sortedFolders = Object.entries(fileStats.filesByFolder)
            .sort(([, a], [, b]) => b - a);

        for (const [folder, count] of sortedFolders) {
            const percentage = Math.round((count / fileStats.totalFiles) * 100);
            console.log(chalk.white(`${folder.padEnd(25)}: ${count} files (${percentage}%)`));
        }
    }

    private displayAutomationStatus(statusData: any): void {
        console.log(chalk.blue.bold('\n🤖 Automation Status:'));

        // Monitor status
        if (statusData.monitorActive) {
            console.log(chalk.green('✅ Monitor: Active'));
        } else {
            console.log(chalk.red('❌ Monitor: Inactive'));
        }

        // Issues and warnings
        if (statusData.issues > 0) {
            console.log(chalk.red(`❌ Issues: ${statusData.issues}`));
        } else {
            console.log(chalk.green('✅ Issues: 0'));
        }

        if (statusData.warnings > 0) {
            console.log(chalk.yellow(`⚠️  Warnings: ${statusData.warnings}`));
        } else {
            console.log(chalk.green('✅ Warnings: 0'));
        }

        // Compliance
        const compliance = statusData.compliance || 0;
        if (compliance >= 90) {
            console.log(chalk.green(`✅ Compliance: ${compliance}%`));
        } else if (compliance >= 70) {
            console.log(chalk.yellow(`⚠️  Compliance: ${compliance}%`));
        } else {
            console.log(chalk.red(`❌ Compliance: ${compliance}%`));
        }

        // Organization stats
        if (statusData.organizationStats) {
            console.log(chalk.blue.bold('\n📊 Organization Stats:'));
            console.log(chalk.white(`Files Moved: ${statusData.organizationStats.moved}`));
            console.log(chalk.white(`Files Renamed: ${statusData.organizationStats.renamed}`));
            console.log(chalk.white(`Templates Applied: ${statusData.organizationStats.templated}`));
        }
    }

    private displayRecommendations(statusData: any, fileStats: VaultStats): void {
        console.log(chalk.blue.bold('\n💡 Recommendations:'));

        const recommendations: string[] = [];

        if (!statusData.lastValidation) {
            recommendations.push('Run "bun run vault:validate" to check vault compliance');
        }

        if (!statusData.lastOrganization) {
            recommendations.push('Run "bun run vault:organize" to organize files');
        }

        if (!statusData.monitorActive) {
            recommendations.push('Run "bun run vault:monitor start" to enable automatic monitoring');
        }

        if (statusData.issues > 0) {
            recommendations.push('Run "bun run vault:fix" to automatically fix common issues');
        }

        if ((statusData.compliance || 0) < VALIDATION_CONSTANTS.COMPLIANCE_THRESHOLDS.GOOD) {
            recommendations.push('Review validation warnings and fix remaining issues manually');
        }

        if (fileStats.totalFiles === 0) {
            recommendations.push('Start creating content - the vault is empty!');
        }

        if (recommendations.length === 0) {
            console.log(chalk.green('🎉 Everything looks good! Your vault is well maintained.'));
        } else {
            recommendations.forEach((rec, index) => {
                console.log(chalk.white(`${index + 1}. ${rec}`));
            });
        }
    }

    private getTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }
    }
}

// Run status
if (import.meta.main) {
    const status = new VaultStatus();
    status.showStatus().catch(console.error);
}

export { VaultStatus };

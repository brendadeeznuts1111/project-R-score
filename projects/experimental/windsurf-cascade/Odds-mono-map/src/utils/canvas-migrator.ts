// =============================================================================
// CANVAS COLOR MIGRATOR - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 2.0.0
// LAST_UPDATED: 2025-11-18T19:50:00Z
// DESCRIPTION: Migrates legacy color enums to HEX with full validation
// =============================================================================

import {
    CanvasColor,
    CanvasFile,
    MigrationResult,
    LEGACY_COLOR_MAP,
    isHexColor,
    isLegacyColor,
    getSemanticColor,
    toHexColor
} from '../types/canvas-types.js';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { join, basename } from 'path';

/**
 * Migrates legacy color enums to HEX while maintaining compatibility
 */
export class CanvasColorMigrator {
    private readonly backupRoot: string;

    constructor(backupRoot: string = './backups') {
        this.backupRoot = backupRoot;
    }

    /**
     * Converts legacy canvas files to HEX colors
     */
    async migrateCanvasToHex(canvasPath: string): Promise<MigrationResult> {
        console.log(`🎨 Starting color migration for: ${canvasPath}`);

        // Backup original
        await this.createBackup(canvasPath);

        // Load canvas
        const content = await readFile(canvasPath, 'utf8');
        const canvas: CanvasFile = JSON.parse(content);

        const migration: MigrationResult = {
            canvasPath,
            nodesProcessed: 0,
            nodesMigrated: 0,
            errors: [],
            warnings: [],
            timestamp: new Date().toISOString(),
            summary: {
                successRate: 0,
                backupLocation: this.backupRoot
            }
        };

        console.log(`📊 Processing ${canvas.nodes.length} nodes...`);

        // Process each node
        for (const node of canvas.nodes) {
            migration.nodesProcessed++;

            try {
                // Convert legacy color to HEX
                if (node.color && isLegacyColor(node.color)) {
                    const oldColor = node.color;
                    const newColor = LEGACY_COLOR_MAP[oldColor];

                    node.color = newColor;
                    migration.nodesMigrated++;

                    migration.warnings.push({
                        nodeId: node.id,
                        message: `Migrated color ${oldColor} → ${newColor}`,
                        oldColor,
                        newColor
                    });

                    console.log(`  ✅ ${node.id}: ${oldColor} → ${newColor}`);
                }

                // Add semantic color if missing
                if (!node.color && node.metadata) {
                    const semanticColor = getSemanticColor(node);
                    node.color = semanticColor;
                    migration.warnings.push({
                        nodeId: node.id,
                        message: `Auto-assigned semantic color: ${semanticColor}`
                    });

                    console.log(`  🎯 ${node.id}: Auto-assigned ${semanticColor}`);
                }

                // Validate the final color
                if (node.color) {
                    const hexColor = toHexColor(node.color);
                    if (hexColor !== node.color) {
                        migration.warnings.push({
                            nodeId: node.id,
                            message: `Normalized color: ${node.color} → ${hexColor}`,
                            oldColor: node.color,
                            newColor: hexColor
                        });
                        node.color = hexColor;
                    }
                }

            } catch (error: any) {
                migration.errors.push({
                    nodeId: node.id,
                    message: error.message
                });
                console.log(`  ❌ ${node.id}: ${error.message}`);
            }
        }

        // Process edges (relationships)
        for (const edge of canvas.edges) {
            if (edge.color && isLegacyColor(edge.color)) {
                const oldColor = edge.color;
                const newColor = LEGACY_COLOR_MAP[oldColor];

                edge.color = newColor;
                migration.warnings.push({
                    nodeId: edge.id,
                    message: `Edge color migrated: ${oldColor} → ${newColor}`,
                    oldColor,
                    newColor
                });

                console.log(`  🔗 ${edge.id}: Edge ${oldColor} → ${newColor}`);
            }
        }

        // Calculate success rate
        migration.summary.successRate = migration.nodesMigrated / migration.nodesProcessed;

        // Save migrated canvas
        await writeFile(canvasPath, JSON.stringify(canvas, null, 2));

        // Generate migration report
        await this.generateMigrationReport(migration);

        console.log(`🎉 Migration complete!`);
        console.log(`   Nodes processed: ${migration.nodesProcessed}`);
        console.log(`   Nodes migrated: ${migration.nodesMigrated}`);
        console.log(`   Success rate: ${(migration.summary.successRate * 100).toFixed(1)}%`);
        console.log(`   Backup location: ${migration.summary.backupLocation}`);

        return migration;
    }

    /**
     * Creates timestamped backup
     */
    private async createBackup(canvasPath: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = join(
            this.backupRoot,
            `${basename(canvasPath)}.backup-${timestamp}.canvas`
        );

        await copyFile(canvasPath, backupPath);
        console.log(`📁 Backup created: ${backupPath}`);
    }

    /**
     * Generates detailed migration report
     */
    private async generateMigrationReport(migration: MigrationResult): Promise<void> {
        const reportPath = `migration-report-${Date.now()}.json`;

        const report = {
            ...migration,
            summary: {
                ...migration.summary,
                migrationStats: {
                    totalNodes: migration.nodesProcessed,
                    migratedNodes: migration.nodesMigrated,
                    errorNodes: migration.errors.length,
                    warningNodes: migration.warnings.length,
                    successPercentage: (migration.summary.successRate * 100).toFixed(1)
                },
                colorStats: this.getColorStatistics(migration)
            }
        };

        await writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Migration report saved: ${reportPath}`);
    }

    /**
     * Gets color statistics from migration
     */
    private getColorStatistics(migration: MigrationResult): {
        legacyToHex: Record<string, number>;
        newColors: string[];
        mostMigrated: string;
    } {
        const legacyToHex: Record<string, number> = {};
        const newColors = new Set<string>();

        migration.warnings.forEach(warning => {
            if (warning.oldColor && warning.newColor) {
                legacyToHex[warning.oldColor] = (legacyToHex[warning.oldColor] || 0) + 1;
                newColors.add(warning.newColor);
            }
        });

        const mostMigrated = Object.entries(legacyToHex)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

        return {
            legacyToHex,
            newColors: Array.from(newColors),
            mostMigrated
        };
    }

    /**
     * Downgrade HEX back to legacy (for older Obsidian versions)
     */
    async revertToLegacyEnums(canvasPath: string): Promise<void> {
        console.log(`🔄 Reverting ${canvasPath} to legacy colors...`);

        const content = await readFile(canvasPath, 'utf8');
        const canvas: CanvasFile = JSON.parse(content);

        const reverseMap = this.buildReverseColorMap();
        let revertedCount = 0;

        // Process nodes
        for (const node of canvas.nodes) {
            if (node.color && isHexColor(node.color)) {
                const legacy = reverseMap.get(node.color.toUpperCase());
                if (legacy) {
                    node.color = legacy;
                    revertedCount++;
                    console.log(`  ↩️ ${node.id}: ${node.color} → ${legacy}`);
                }
            }
        }

        // Process edges
        for (const edge of canvas.edges) {
            if (edge.color && isHexColor(edge.color)) {
                const legacy = reverseMap.get(edge.color.toUpperCase());
                if (legacy) {
                    edge.color = legacy;
                    revertedCount++;
                }
            }
        }

        await writeFile(canvasPath, JSON.stringify(canvas, null, 2));

        console.log(`🔄 Reversion complete! Reverted ${revertedCount} items to legacy colors.`);
    }

    /**
     * Builds reverse mapping from HEX to legacy enum
     */
    private buildReverseColorMap(): Map<string, "0" | "1" | "2" | "3" | "4" | "5"> {
        const reverseMap = new Map<string, "0" | "1" | "2" | "3" | "4" | "5">();

        for (const [legacy, hex] of Object.entries(LEGACY_COLOR_MAP)) {
            reverseMap.set(hex.toUpperCase(), legacy as "0" | "1" | "2" | "3" | "4" | "5");
        }

        return reverseMap;
    }

    /**
     * Batch migrate multiple canvas files
     */
    async migrateDirectory(directoryPath: string, pattern: string = '*.canvas'): Promise<MigrationResult[]> {
        console.log(`🎨 Starting batch migration in: ${directoryPath}`);

        const { readdir } = await import('fs/promises');
        const files = await readdir(directoryPath);
        const canvasFiles = files.filter(file => file.endsWith('.canvas'));

        console.log(`📁 Found ${canvasFiles.length} canvas files to migrate`);

        const results: MigrationResult[] = [];

        for (const file of canvasFiles) {
            const fullPath = join(directoryPath, file);
            try {
                const result = await this.migrateCanvasToHex(fullPath);
                results.push(result);
            } catch (error: any) {
                console.error(`❌ Failed to migrate ${file}: ${error.message}`);
                // Add error result
                results.push({
                    canvasPath: fullPath,
                    nodesProcessed: 0,
                    nodesMigrated: 0,
                    errors: [{ nodeId: 'file', message: error.message }],
                    warnings: [],
                    timestamp: new Date().toISOString(),
                    summary: { successRate: 0, backupLocation: this.backupRoot }
                });
            }
        }

        // Generate batch report
        await this.generateBatchReport(results);

        return results;
    }

    /**
     * Generates batch migration report
     */
    private async generateBatchReport(results: MigrationResult[]): Promise<void> {
        const totalFiles = results.length;
        const successfulFiles = results.filter(r => r.errors.length === 0).length;
        const totalNodes = results.reduce((sum, r) => sum + r.nodesProcessed, 0);
        const totalMigrated = results.reduce((sum, r) => sum + r.nodesMigrated, 0);

        const batchReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFiles,
                successfulFiles,
                failedFiles: totalFiles - successfulFiles,
                successRate: (successfulFiles / totalFiles) * 100,
                totalNodes,
                totalMigrated,
                migrationRate: totalNodes > 0 ? (totalMigrated / totalNodes) * 100 : 0
            },
            details: results
        };

        const reportPath = `batch-migration-report-${Date.now()}.json`;
        await writeFile(reportPath, JSON.stringify(batchReport, null, 2));

        console.log(`📊 Batch Migration Summary:`);
        console.log(`   Files processed: ${totalFiles}`);
        console.log(`   Successful: ${successfulFiles}`);
        console.log(`   Failed: ${totalFiles - successfulFiles}`);
        console.log(`   Total nodes: ${totalNodes}`);
        console.log(`   Nodes migrated: ${totalMigrated}`);
        console.log(`   Migration rate: ${batchReport.summary.migrationRate.toFixed(1)}%`);
        console.log(`📄 Batch report saved: ${reportPath}`);
    }
}

// =============================================================================
// [MIGRATION_UTILITIES] - 2025-11-18
// =============================================================================

/**
 * Utility functions for color migration
 */
export class ColorMigrationUtils {

    /**
     * Validates if a canvas file needs migration
     */
    static async needsMigration(canvasPath: string): Promise<boolean> {
        try {
            const content = await readFile(canvasPath, 'utf8');
            const canvas: CanvasFile = JSON.parse(content);

            return canvas.nodes.some(node =>
                node.color && isLegacyColor(node.color)
            );
        } catch {
            return false;
        }
    }

    /**
     * Gets migration statistics for a directory
     */
    static async getDirectoryStats(directoryPath: string): Promise<{
        totalFiles: number;
        filesNeedingMigration: number;
        totalNodes: number;
        legacyColorNodes: number;
    }> {
        const { readdir } = await import('fs/promises');
        const files = await readdir(directoryPath);
        const canvasFiles = files.filter(file => file.endsWith('.canvas'));

        let filesNeedingMigration = 0;
        let totalNodes = 0;
        let legacyColorNodes = 0;

        for (const file of canvasFiles) {
            const fullPath = join(directoryPath, file);
            const content = await readFile(fullPath, 'utf8');
            const canvas: CanvasFile = JSON.parse(content);

            totalNodes += canvas.nodes.length;
            const hasLegacyColors = canvas.nodes.some(node =>
                node.color && isLegacyColor(node.color)
            );

            if (hasLegacyColors) {
                filesNeedingMigration++;
                legacyColorNodes += canvas.nodes.filter(node =>
                    node.color && isLegacyColor(node.color)
                ).length;
            }
        }

        return {
            totalFiles: canvasFiles.length,
            filesNeedingMigration,
            totalNodes,
            legacyColorNodes
        };
    }
}

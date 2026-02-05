/**
 * Real-time Vault Watcher with Bun Native APIs
 * Provides hot-reloading validation and graph updates
 */

import { ValidationOrchestrator } from '../validators/ValidationOrchestrator';
import { VaultGraph } from '../models/VaultNode';
import { glob } from 'bun';

export interface WatcherConfig {
    vaultPath: string;
    debounceMs: number;
    excludePatterns: string[];
    enableHotReload: boolean;
    maxConcurrentValidations: number;
}

export interface WatcherEvent {
    type: 'change' | 'add' | 'unlink';
    filePath: string;
    timestamp: string;
    affectedNodes: string[];
    validationResults?: any;
}

export class VaultWatcher {
    private graph: VaultGraph;
    private orchestrator: ValidationOrchestrator;
    private config: WatcherConfig;
    private watcher: any; // Bun watcher instance
    private eventQueue: WatcherEvent[] = [];
    private isProcessing = false;

    constructor(config: Partial<WatcherConfig> = {}) {
        this.config = {
            vaultPath: './Odds-mono-map',
            debounceMs: 500,
            excludePatterns: [
                '**/.git/**',
                '**/.obsidian/**',
                '**/node_modules/**',
                '**/07 - Archive/**',
                '**/*.tmp'
            ],
            enableHotReload: true,
            maxConcurrentValidations: 8,
            ...config
        };

        this.graph = new VaultGraph();
        this.orchestrator = new ValidationOrchestrator(this.graph);
    }

    async start() {
        console.log(`🔍 Starting vault watcher for: ${this.config.vaultPath}`);

        // Initialize graph with existing files
        await this.initializeGraph();

        // Start file watcher
        this.watcher = Bun.watch(this.config.vaultPath, {
            recursive: true,
            ignore: this.config.excludePatterns,
            async scan(path, stat) {
                // This is called for each file during initial scan
                if (stat?.isFile() && path.endsWith('.md')) {
                    console.log(`📁 Indexing: ${path}`);
                }
            }
        });

        // Set up event handler
        this.watcher.subscribe(async (event, filename) => {
            if (!filename || !filename.endsWith('.md')) return;

            await this.handleFileChange(event, filename);
        });

        console.log('✅ Vault watcher started successfully');
        console.log(`📊 Watching ${await this.getFileCount()} markdown files`);
    }

    private async initializeGraph() {
        console.log('🏗️ Building initial vault graph...');

        const startTime = Date.now();
        const files = await glob('**/*.md', {
            cwd: this.config.vaultPath,
            ignore: this.config.excludePatterns
        });

        // Process files in batches for better performance
        const batchSize = 50;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const batchPaths = batch.map(file => `${this.config.vaultPath}/${file}`);

            await this.orchestrator.validateBatch(batchPaths);

            if (i % 100 === 0) {
                console.log(`📈 Processed ${Math.min(i + batchSize, files.length)}/${files.length} files`);
            }
        }

        const metrics = this.graph.calculateGraphMetrics();
        console.log(`🎯 Graph built in ${Date.now() - startTime}ms`);
        console.log(`📊 Metrics: ${metrics.totalNodes} nodes, ${metrics.totalEdges} edges, ${metrics.orphanRate.toFixed(1)}% orphans`);
    }

    private async handleFileChange(event: 'add' | 'change' | 'unlink', filename: string) {
        const timestamp = new Date().toISOString();

        console.log(`🔄 File ${event}: ${filename}`);

        // Add to event queue with debouncing
        this.eventQueue.push({
            type: event,
            filePath: filename,
            timestamp,
            affectedNodes: []
        });

        // Process events with debounce
        if (!this.isProcessing) {
            this.isProcessing = true;
            setTimeout(() => this.processEventQueue(), this.config.debounceMs);
        }
    }

    private async processEventQueue() {
        if (this.eventQueue.length === 0) {
            this.isProcessing = false;
            return;
        }

        console.log(`🔄 Processing ${this.eventQueue.length} file changes...`);

        // Group events by file type and deduplicate
        const uniqueEvents = new Map<string, WatcherEvent>();

        this.eventQueue.forEach(event => {
            const existing = uniqueEvents.get(event.filePath);
            if (!existing || event.timestamp > existing.timestamp) {
                uniqueEvents.set(event.filePath, event);
            }
        });

        // Process events
        const events = Array.from(uniqueEvents.values());
        const filesToValidate: string[] = [];

        for (const event of events) {
            if (event.type === 'unlink') {
                // Remove from graph
                this.handleFileDeletion(event.filePath);
            } else {
                filesToValidate.push(event.filePath);
            }
        }

        // Validate affected files
        if (filesToValidate.length > 0) {
            await this.validateAffectedFiles(filesToValidate);
        }

        // Clear queue
        this.eventQueue = [];
        this.isProcessing = false;

        console.log('✅ Event processing complete');
    }

    private async validateAffectedFiles(files: string[]) {
        const startTime = Date.now();

        try {
            // Get all affected nodes (including neighbors)
            const allAffected = new Set<string>();

            for (const filePath of files) {
                allAffected.add(filePath);
                const affected = this.graph.getAffectedNodes(filePath, 2);
                affected.forEach(node => allAffected.add(node));
            }

            console.log(`🎯 Validating ${allAffected.size} affected nodes...`);

            // Run validation
            const results = await this.orchestrator.validateBatch(Array.from(allAffected));

            // Generate summary
            const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
            const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
            const avgHealth = results.reduce((sum, r) => sum + r.metrics.healthScore, 0) / results.length;

            console.log(`📊 Validation complete in ${Date.now() - startTime}ms`);
            console.log(`❌ Errors: ${totalErrors}, ⚠️ Warnings: ${totalWarnings}, 💚 Avg Health: ${avgHealth.toFixed(1)}%`);

            // Emit validation results for hot reload
            if (this.config.enableHotReload) {
                this.emitValidationResults(results);
            }

        } catch (error) {
            console.error('❌ Validation failed:', error.message);
        }
    }

    private async handleFileDeletion(filePath: string) {
        console.log(`🗑️ Processing file deletion: ${filePath}`);

        try {
            // Step 1: Find all files that link to this file (backlinks)
            const backlinks = this.findBacklinks(filePath);
            console.log(`🔗 Found ${backlinks.length} backlinks to update`);

            // Step 2: Archive the file content before deletion (soft deletion)
            await this.archiveFileContent(filePath);

            // Step 3: Update backlinks to remove broken references
            await this.updateBacklinks(backlinks, filePath);

            // Step 4: Handle cascade operations for dependent files
            const dependents = this.findDependentFiles(filePath);
            if (dependents.length > 0) {
                console.log(`🏗️ Processing ${dependents.length} dependent files`);
                await this.handleCascadeOperations(dependents, filePath);
            }

            // Step 5: Remove from main graph database (after handling dependencies)
            this.graph.db.run('DELETE FROM obsidian_nodes WHERE path = ?', [filePath]);
            this.graph.db.run('DELETE FROM obsidian_edges WHERE source = ? OR target = ?', [filePath, filePath]);

            // Step 6: Notify dependent systems
            await this.notifyDependentSystems(filePath, backlinks, dependents);

            // Step 7: Update health metrics for affected files
            await this.updateAffectedFileHealth(backlinks);

            console.log(`✅ File deletion processed: ${filePath}`);

        } catch (error) {
            console.error(`❌ Error processing file deletion ${filePath}:`, error);
            throw error;
        }
    }

    private findBacklinks(filePath: string): string[] {
        // Query edges table to find all files that link to the deleted file
        const backlinks = this.graph.db.prepare(`
            SELECT DISTINCT source as path 
            FROM obsidian_edges 
            WHERE target = ? AND type = 'wiki'
        `).all(filePath);

        return backlinks.map((row: any) => row.path);
    }

    private async archiveFileContent(filePath: string): Promise<void> {
        try {
            // Check if archived_nodes table exists, create if not
            this.graphDb.exec(`
                CREATE TABLE IF NOT EXISTS archived_nodes (
                    path TEXT PRIMARY KEY,
                    original_path TEXT,
                    type TEXT,
                    links TEXT,
                    properties TEXT,
                    tags TEXT,
                    aliases TEXT,
                    neighbors TEXT,
                    dependencies TEXT,
                    health TEXT,
                    lastValidated TIMESTAMP,
                    position TEXT,
                    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    archive_reason TEXT DEFAULT 'deleted'
                );
            `);

            // Move the node to archived table
            const node = this.graph.db.prepare(`
                SELECT * FROM obsidian_nodes WHERE path = ?
            `).get(filePath);

            if (node) {
                this.graphDb.prepare(`
                    INSERT INTO archived_nodes 
                    (path, original_path, type, links, properties, tags, aliases, neighbors, dependencies, health, lastValidated, position, archive_reason)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'deleted')
                `).run(
                    filePath, filePath, node.type, node.links, node.properties,
                    node.tags, node.aliases, node.neighbors, node.dependencies,
                    node.health, node.lastValidated, node.position
                );
                console.log(`📦 Archived file content: ${filePath}`);
            }

            // Also archive associated edges
            this.graphDb.exec(`
                CREATE TABLE IF NOT EXISTS archived_edges (
                    source TEXT,
                    target TEXT,
                    type TEXT,
                    weight REAL DEFAULT 1.0,
                    metadata TEXT,
                    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    archive_reason TEXT DEFAULT 'deleted',
                    PRIMARY KEY (source, target, type, archived_at)
                );
            `);

            const edges = this.graphDb.prepare(`
                SELECT * FROM obsidian_edges 
                WHERE source = ? OR target = ?
            `).all(filePath, filePath);

            for (const edge of edges) {
                this.graphDb.prepare(`
                    INSERT INTO archived_edges 
                    (source, target, type, weight, metadata, archive_reason)
                    VALUES (?, ?, ?, ?, ?, 'deleted')
                `).run(edge.source, edge.target, edge.type, edge.weight, edge.metadata);
            }

        } catch (error) {
            console.warn(`⚠️ Could not archive file ${filePath}:`, error);
        }
    }

    private async updateBacklinks(backlinks: string[], deletedFilePath: string): Promise<void> {
        for (const backlinkPath of backlinks) {
            try {
                // Get the current node data
                const node = this.graph.db.prepare(`
                    SELECT * FROM obsidian_nodes WHERE path = ?
                `).get(backlinkPath);

                if (node) {
                    // Parse and update links to remove the deleted file
                    const links = JSON.parse(node.links || '[]');
                    const filteredLinks = links.filter((link: string) => link !== deletedFilePath);

                    // Parse and update neighbors
                    const neighbors = JSON.parse(node.neighbors || '{}');
                    if (neighbors.direct) {
                        neighbors.direct = neighbors.direct.filter((path: string) => path !== deletedFilePath);
                    }
                    if (neighbors.backlinks) {
                        neighbors.backlinks = neighbors.backlinks.filter((path: string) => path !== deletedFilePath);
                    }

                    // Update the node with cleaned links and neighbors
                    this.graph.db.prepare(`
                        UPDATE obsidian_nodes 
                        SET links = ?, neighbors = ?, lastValidated = ?
                        WHERE path = ?
                    `).run(
                        JSON.stringify(filteredLinks),
                        JSON.stringify(neighbors),
                        Date.now(),
                        backlinkPath
                    );

                    // Remove the specific edge relationship
                    this.graph.db.prepare(`
                        DELETE FROM obsidian_edges 
                        WHERE source = ? AND target = ? AND type = 'wiki'
                    `).run(backlinkPath, deletedFilePath);

                    console.log(`🔧 Updated backlinks in: ${backlinkPath}`);
                }
            } catch (error) {
                console.error(`❌ Error updating backlinks for ${backlinkPath}:`, error);
            }
        }
    }

    private findDependentFiles(filePath: string): string[] {
        // Find files that have dependencies on the deleted file
        const dependents = this.graph.db.prepare(`
            SELECT DISTINCT path 
            FROM obsidian_nodes 
            WHERE json_extract(dependencies, '$') LIKE ?
        `).all(`%"${filePath}"%`);

        return dependents.map((row: any) => row.path);
    }

    private async handleCascadeOperations(dependents: string[], deletedFilePath: string): Promise<void> {
        for (const dependentPath of dependents) {
            try {
                const node = this.graph.db.prepare(`
                    SELECT * FROM obsidian_nodes WHERE path = ?
                `).get(dependentPath);

                if (node) {
                    // Remove the deleted file from dependencies
                    const dependencies = JSON.parse(node.dependencies || '[]');
                    const filteredDependencies = dependencies.filter((dep: string) => dep !== deletedFilePath);

                    // Update health score to reflect dependency loss
                    const health = JSON.parse(node.health || '{"score": 100}');
                    health.score = Math.max(0, health.score - 10); // Penalize for missing dependency
                    health.warnings = health.warnings || [];
                    health.warnings.push(`Missing dependency: ${deletedFilePath}`);

                    this.graphDb.prepare(`
                        UPDATE obsidian_nodes 
                        SET dependencies = ?, health = ?, lastValidated = ?
                        WHERE path = ?
                    `).run(
                        JSON.stringify(filteredDependencies),
                        JSON.stringify(health),
                        Date.now(),
                        dependentPath
                    );

                    console.log(`🏗️ Updated dependencies for: ${dependentPath}`);
                }
            } catch (error) {
                console.error(`❌ Error handling cascade for ${dependentPath}:`, error);
            }
        }
    }

    private async notifyDependentSystems(deletedFilePath: string, backlinks: string[], dependents: string[]): Promise<void> {
        // Emit event for real-time updates
        if (this.config.enableHotReload) {
            this.emitValidationResults([{
                type: 'file_deleted',
                path: deletedFilePath,
                affectedFiles: [...backlinks, ...dependents],
                timestamp: Date.now()
            }]);
        }

        // Could also send to external systems:
        // - WebSocket for live UI updates
        // - Webhook notifications
        // - Message queue for async processing
        console.log(`📢 Notified systems about deletion: ${deletedFilePath}`);
    }

    private async updateAffectedFileHealth(backlinks: string[]): Promise<void> {
        for (const backlinkPath of backlinks) {
            try {
                // Re-validate affected files to update their health scores
                const validationResult = await this.orchestrator.validateFile(backlinkPath);

                if (validationResult.node) {
                    this.graph.addNode(validationResult.node);
                    console.log(`💚 Updated health for affected file: ${backlinkPath}`);
                }
            } catch (error) {
                console.error(`❌ Error updating health for ${backlinkPath}:`, error);
            }
        }

    private emitValidationResults(results: any[]) {
        // Enhanced validation results emission
        results.forEach(result => {
            if (result.errors.length > 0) {
                console.error(`❌ Validation errors in ${result.path}:`, result.errors);
            }

            if (result.type === 'file_deleted') {
                console.log(`🗑️ File deletion notification: ${result.path}`);
                console.log(`   Affected files: ${result.affectedFiles.join(', ')}`);
            }
        });

        // Could integrate with:
        // - WebSocket server for real-time UI updates
        // - Event bus for system-wide notifications
        // - External monitoring services
    }

    /**
     * Restore a previously archived file
     */
    public async restoreArchivedFile(originalPath: string): Promise<boolean> {
        try {
            console.log(`🔄 Restoring archived file: ${originalPath}`);

            // Get archived node data
            const archivedNode = this.graph.db.prepare(`
                SELECT * FROM archived_nodes WHERE original_path = ? 
                ORDER BY archived_at DESC LIMIT 1
            `).get(originalPath);

            if (!archivedNode) {
                console.warn(`⚠️ No archived file found for: ${originalPath}`);
                return false;
            }

            // Restore node to main table
            this.graph.db.prepare(`
                INSERT OR REPLACE INTO obsidian_nodes 
                (path, type, links, properties, tags, aliases, neighbors, dependencies, health, lastValidated, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                archivedNode.original_path,
                archivedNode.type,
                archivedNode.links,
                archivedNode.properties,
                archivedNode.tags,
                archivedNode.aliases,
                archivedNode.neighbors,
                archivedNode.dependencies,
                archivedNode.health,
                archivedNode.lastValidated,
                archivedNode.position
            );

            // Restore associated edges
            const archivedEdges = this.graph.db.prepare(`
                SELECT * FROM archived_edges 
                WHERE (source = ? OR target = ?) AND archive_reason = 'deleted'
                ORDER BY archived_at DESC
            `).all(originalPath, originalPath);

            for (const edge of archivedEdges) {
                this.graph.db.prepare(`
                    INSERT OR IGNORE INTO obsidian_edges 
                    (source, target, type, weight, metadata)
                    VALUES (?, ?, ?, ?, ?)
                `).run(edge.source, edge.target, edge.type, edge.weight, edge.metadata);
            }

            // Update backlinks to restore references
            await this.restoreBacklinks(originalPath);

            console.log(`✅ Successfully restored file: ${originalPath}`);
            return true;

        } catch (error) {
            console.error(`❌ Error restoring archived file ${originalPath}:`, error);
            return false;
        }
    }

    /**
     * Update backlinks when a file is restored
     */
    private async restoreBacklinks(restoredPath: string): Promise<void> {
        // Find files that should link to the restored file
        const potentialBacklinks = this.graph.db.prepare(`
            SELECT path FROM obsidian_nodes 
            WHERE json_extract(links, '$') LIKE ?
        `).all(`%"${restoredPath}"%`);

        for (const backlinkPath of potentialBacklinks) {
            try {
                const node = this.graph.db.prepare(`
                    SELECT * FROM obsidian_nodes WHERE path = ?
                `).get(backlinkPath);

                if (node) {
                    // Ensure the restored file is in links and neighbors
                    const links = JSON.parse(node.links || '[]');
                    if (!links.includes(restoredPath)) {
                        links.push(restoredPath);
                    }

                    const neighbors = JSON.parse(node.neighbors || '{}');
                    if (!neighbors.direct) neighbors.direct = [];
                    if (!neighbors.direct.includes(restoredPath)) {
                        neighbors.direct.push(restoredPath);
                    }

                    // Update the node
                    this.graph.db.prepare(`
                        UPDATE obsidian_nodes 
                        SET links = ?, neighbors = ?, lastValidated = ?
                        WHERE path = ?
                    `).run(
                        JSON.stringify(links),
                        JSON.stringify(neighbors),
                        Date.now(),
                        backlinkPath
                    );

                    // Restore edge relationship
                    this.graph.db.prepare(`
                        INSERT OR IGNORE INTO obsidian_edges 
                        (source, target, type) VALUES (?, ?, 'wiki')
                    `).run(backlinkPath, restoredPath);

                    console.log(`🔗 Restored backlink in: ${backlinkPath}`);
                }
            } catch (error) {
                console.error(`❌ Error restoring backlinks for ${backlinkPath}:`, error);
            }
        }
    }

    /**
     * Clean up old archived files (retention policy)
     */
    public async cleanupOldArchives(retentionDays: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const deletedNodes = this.graph.db.prepare(`
                DELETE FROM archived_nodes 
                WHERE archived_at < ? AND archive_reason = 'deleted'
            `).run(cutoffDate.toISOString());

            const deletedEdges = this.graph.db.prepare(`
                DELETE FROM archived_edges 
                WHERE archived_at < ? AND archive_reason = 'deleted'
            `).run(cutoffDate.toISOString());

            const totalDeleted = deletedNodes.changes + deletedEdges.changes;
            console.log(`🧹 Cleaned up ${totalDeleted} old archived records (older than ${retentionDays} days)`);

            return totalDeleted;

        } catch (error) {
            console.error(`❌ Error cleaning up old archives:`, error);
            return 0;
        }
    }

    /**
     * Get archive statistics
     */
    public getArchiveStats(): any {
        try {
            const nodeStats = this.graph.db.prepare(`
                SELECT 
                    archive_reason,
                    COUNT(*) as count,
                    MIN(archived_at) as oldest,
                    MAX(archived_at) as newest
                FROM archived_nodes 
                GROUP BY archive_reason
            `).all();

            const edgeStats = this.graph.db.prepare(`
                SELECT 
                    archive_reason,
                    COUNT(*) as count
                FROM archived_edges 
                GROUP BY archive_reason
            `).all();

            return {
                nodes: nodeStats,
                edges: edgeStats,
                totalArchivedNodes: nodeStats.reduce((sum: number, stat: any) => sum + stat.count, 0),
                totalArchivedEdges: edgeStats.reduce((sum: number, stat: any) => sum + stat.count, 0)
            };

        } catch (error) {
            console.error(`❌ Error getting archive stats:`, error);
            return null;
        }
    }

    private async getFileCount(): Promise<number> {
        const files = await glob('**/*.md', {
            cwd: this.config.vaultPath,
            ignore: this.config.excludePatterns
        });
        return files.length;
    }

    async stop() {
        if (this.watcher) {
            this.watcher.close();
            console.log('🛑 Vault watcher stopped');
        }
    }

    // Utility methods
    async getGraphMetrics() {
        return this.graph.calculateGraphMetrics();
    }

    async getOrphans() {
        return this.graph.getOrphans();
    }

    async validatePath(pathPattern: string) {
        const files = await glob(pathPattern, {
            cwd: this.config.vaultPath,
            ignore: this.config.excludePatterns
        });

        const filePaths = files.map(file => `${this.config.vaultPath}/${file}`);
        return await this.orchestrator.validateBatch(filePaths);
    }
}

// CLI interface
if (import.meta.main) {
    const watcher = new VaultWatcher();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down vault watcher...');
        await watcher.stop();
        process.exit(0);
    });

    // Start watching
    await watcher.start();

    // Keep process alive
    console.log('⏳ Watching for file changes... (Press Ctrl+C to stop)');

    // Example commands that could be added:
    // - 'validate' to manually trigger validation
    // - 'metrics' to show current graph metrics
    // - 'orphans' to list disconnected files
}

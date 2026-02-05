#!/usr/bin/env bun
/**
 * Bun-Obsidian Bridge Service
 * Real-time communication between Bun services and Obsidian UI
 */

interface BridgeMessage {
    command: 'notice' | 'reload' | 'update-cache' | 'highlight' | 'navigate';
    args: any;
}

interface NoticeArgs {
    severity: 'info' | 'warning' | 'error';
    message: string;
    timeout?: number;
}

interface HighlightArgs {
    filePath: string;
    lineNumbers?: number[];
    ranges?: Array<{ start: number; end: number }>;
}

interface NavigateArgs {
    filePath: string;
    line?: number;
    scroll?: boolean;
}

class ObsidianBridge {
    private vaultPath: string;
    private pluginPath: string;
    private obsidianPort: number;
    private isConnected: boolean = false;

    constructor(vaultPath: string, obsidianPort: number = 27123) {
        this.vaultPath = vaultPath;
        this.pluginPath = `${vaultPath}/.obsidian/plugins/vault-standards`;
        this.obsidianPort = obsidianPort;
    }

    async connect(): Promise<boolean> {
        try {
            // Test connection to Obsidian
            const response = await fetch(`http://localhost:${this.obsidianPort}/obsidian`, {
                method: 'POST',
                body: JSON.stringify({ command: 'ping' }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                this.isConnected = true;
                console.log('✅ Connected to Obsidian');
                return true;
            }
        } catch (error) {
            console.log('⚠️ Obsidian not available - running in standalone mode');
        }

        this.isConnected = false;
        return false;
    }

    async sendMessage(message: BridgeMessage): Promise<boolean> {
        if (!this.isConnected) {
            console.log(`📢 [${message.command.toUpperCase()}] ${JSON.stringify(message.args)}`);
            return false;
        }

        try {
            const response = await fetch(`http://localhost:${this.obsidianPort}/obsidian`, {
                method: 'POST',
                body: JSON.stringify(message),
                headers: { 'Content-Type': 'application/json' }
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Failed to send message to Obsidian:', error);
            this.isConnected = false;
            return false;
        }
    }

    async pushNotice(severity: NoticeArgs['severity'], message: string, timeout?: number): Promise<void> {
        await this.sendMessage({
            command: 'notice',
            args: { severity, message, timeout }
        });
    }

    async highlightFile(filePath: string, lineNumbers?: number[], ranges?: Array<{ start: number; end: number }>): Promise<void> {
        await this.sendMessage({
            command: 'highlight',
            args: { filePath, lineNumbers, ranges }
        });
    }

    async navigateToFile(filePath: string, line?: number, scroll: boolean = true): Promise<void> {
        await this.sendMessage({
            command: 'navigate',
            args: { filePath, line, scroll }
        });
    }

    async reloadPlugin(pluginName: string = 'vault-standards'): Promise<void> {
        await this.sendMessage({
            command: 'reload',
            args: { plugin: pluginName }
        });
    }

    async updateMetadataCache(filePath: string, updates: any): Promise<void> {
        await this.sendMessage({
            command: 'update-cache',
            args: { filePath, updates }
        });
    }

    // Service methods for real-time validation
    async startValidationService(): Promise<void> {
        console.log('🚀 Starting Obsidian Bridge Validation Service...');

        // Start HTTP server for Obsidian callbacks
        const server = Bun.serve({
            port: 3999,
            async fetch(req) {
                const url = new URL(req.url);

                if (url.pathname === '/api/validate') {
                    // Handle validation requests from Obsidian
                    const { filePath, content } = await req.json();

                    // Run validation in Bun worker
                    const worker = new Worker(new URL('./validation-worker.ts', import.meta.url));
                    worker.postMessage({ filePath, content });

                    return new Response(JSON.stringify({ status: 'validating' }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                if (url.pathname === '/api/graph') {
                    // Serve graph data for Dataview queries
                    const path = url.searchParams.get('path');
                    if (path) {
                        const graphData = await this.getGraphNode(path);
                        return new Response(JSON.stringify(graphData), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }

                if (url.pathname === '/api/health') {
                    // Serve health metrics for dashboard
                    const healthData = await this.getHealthMetrics();
                    return new Response(JSON.stringify(healthData), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                return new Response('Not found', { status: 404 });
            }
        });

        console.log(`✅ Bridge service running on http://localhost:3999`);

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down bridge service...');
            server.stop();
            process.exit(0);
        });
    }

    private async getGraphNode(path: string): Promise<any> {
        // Query the graph database for node information
        const db = Bun.sqlite(`${this.vaultPath}/.obsidian/graph.db`);

        const node = db.query('SELECT * FROM obsidian_nodes WHERE path = ?').get(path);
        if (!node) return null;

        const neighbors = db.query(`
      SELECT target as path, type FROM obsidian_edges 
      WHERE source = ? 
      UNION
      SELECT source as path, type FROM obsidian_edges 
      WHERE target = ?
    `).all(path, path);

        return {
            node: {
                path: node.path,
                type: node.type,
                properties: JSON.parse(node.properties),
                tags: JSON.parse(node.tags),
                health: JSON.parse(node.health)
            },
            neighbors: neighbors.map((n: any) => ({ path: n.path, relationship: n.type }))
        };
    }

    private async getHealthMetrics(): Promise<any> {
        const db = Bun.sqlite(`${this.vaultPath}/.obsidian/graph.db`);

        const totalNodes = db.query('SELECT COUNT(*) as count FROM obsidian_nodes').get().count;
        const avgHealth = db.query(`
      SELECT AVG(json_extract(health, '$.score')) as avg_score 
      FROM obsidian_nodes
    `).get().avg_score;

        const errorsByType = db.query(`
      SELECT 
        json_extract(health, '$.issues') as issues,
        COUNT(*) as count
      FROM obsidian_nodes 
      WHERE json_extract(health, '$.issues') != '[]'
      GROUP BY issues
    `).all();

        return {
            totalNodes,
            averageHealth: Math.round(avgHealth * 100) / 100,
            errorsByType,
            lastUpdated: new Date().toISOString()
        };
    }
}

// Validation Worker for heavy processing
class ValidationWorker {
    private bridge: ObsidianBridge;

    constructor(bridge: ObsidianBridge) {
        this.bridge = bridge;
    }

    async validateFile(filePath: string, content: string): Promise<any> {
        // Run heavy validation logic
        const issues = await this.runValidation(filePath, content);

        // Send results back to Obsidian
        if (issues.length > 0) {
            await this.bridge.pushNotice('warning', `${issues.length} issues found in ${filePath}`);
            await this.bridge.highlightFile(filePath, issues.map(i => i.line));
        }

        return { filePath, issues };
    }

    private async runValidation(filePath: string, content: string): Promise<Array<{ line: number; message: string }>> {
        const issues: Array<{ line: number; message: string }> = [];
        const lines = content.split('\n');

        // Check for YAML frontmatter
        if (!content.startsWith('---')) {
            issues.push({ line: 1, message: 'Missing YAML frontmatter' });
        }

        // Check for required fields
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const requiredFields = ['type', 'title', 'tags', 'created', 'updated', 'author'];

            requiredFields.forEach(field => {
                if (!frontmatter.includes(`${field}:`)) {
                    issues.push({ line: 2, message: `Missing required field: ${field}` });
                }
            });
        }

        // Check for broken links
        lines.forEach((line, index) => {
            const wikiLinks = line.match(/\[\[([^\]]+)\]\]/g) || [];
            wikiLinks.forEach(link => {
                const target = link.slice(2, -2);
                // In real implementation, check if target file exists
                if (target.includes('nonexistent')) {
                    issues.push({ line: index + 1, message: `Broken link: [[${target}]]` });
                }
            });
        });

        return issues;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const vaultPath = args.find(arg => arg.startsWith('--vault='))?.split('=')[1] || './Odds-mono-map';
    const serviceMode = args.includes('--service');

    const bridge = new ObsidianBridge(vaultPath);

    if (serviceMode) {
        await bridge.connect();
        await bridge.startValidationService();
    } else {
        // Test connection
        const connected = await bridge.connect();

        if (connected) {
            // Send test notice
            await bridge.pushNotice('info', 'Bun-Obsidian bridge is working!', 3000);
        } else {
            console.log('❌ Could not connect to Obsidian');
            process.exit(1);
        }
    }
}

if (import.meta.main) {
    main().catch(console.error);
}

export { ObsidianBridge, ValidationWorker, type BridgeMessage };

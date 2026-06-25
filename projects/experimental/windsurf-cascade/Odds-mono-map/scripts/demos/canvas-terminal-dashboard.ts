#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]canvas-terminal-dashboard
 * 
 * Canvas Terminal Dashboard
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,canvas,integration,visualization
 */

#!/usr/bin/env bun
/**
 * Canvas Terminal Dashboard with Bun.color Integration
 * Renders canvas maps with colors in the terminal
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { renderColoredNode, convertAllCanvasColors, getTerminalColor, CANVAS_BRAND_COLORS } from '../../src/types/canvas-color';

interface CanvasNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    color?: string;
    text: string;
    metadata?: {
        documentType?: string;
        status?: string;
        priority?: string;
        version?: string;
        author?: string;
        lastValidated?: string;
    };
}

interface CanvasEdge {
    fromNode: string;
    toNode: string;
    label?: string;
    color?: string;
}

interface Canvas {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

/**
 * Displays canvas in terminal with colors and formatting
 */
async function displayCanvasInTerminal(canvasPath: string): Promise<void> {
    try {
        const content = await readFile(canvasPath, 'utf8');
        const canvas: Canvas = JSON.parse(content);

        console.info('🎨 Canvas Terminal Dashboard\n');
        console.info(`📁 File: ${canvasPath}`);
        console.info(`📊 Nodes: ${canvas.nodes.length} | Edges: ${canvas.edges?.length || 0}\n`);

        // Display nodes with colors
        console.info('📋 Canvas Nodes:');
        console.info('─'.repeat(80));

        canvas.nodes.forEach((node, index) => {
            const coloredHeader = renderColoredNode(node, { compact: false });
            const status = node.metadata?.status || 'unknown';
            const priority = node.metadata?.priority || 'medium';
            const type = node.metadata?.documentType || 'document';

            console.info(`${index + 1}. ${coloredHeader}`);
            console.info(`   🏷️  Status: ${getStatusIcon(status)} ${status}`);
            console.info(`   ⚡ Priority: ${getPriorityIcon(priority)} ${priority}`);
            console.info(`   📄 Type: ${type}`);
            console.info(`   📍 Position: (${node.x}, ${node.y}) | Size: ${node.width}×${node.height}`);

            if (node.metadata?.version) {
                console.info(`   🏷️  Version: ${node.metadata.version}`);
            }

            console.info('');
        });

        // Show color palette analysis
        console.info('\n🎨 Color Palette Analysis:');
        console.info('─'.repeat(50));

        const colors = convertAllCanvasColors(canvas, "ansi-256");
        const colorCounts = new Map<string, number>();

        colors.forEach((ansiCode, nodeId) => {
            if (ansiCode) {
                const node = canvas.nodes.find(n => n.id === nodeId);
                const colorHex = node?.color || 'default';
                colorCounts.set(colorHex, (colorCounts.get(colorHex) || 0) + 1);

                console.info(`${ansiCode}●${'\x1b[0m'} ${colorHex} (${colorCounts.get(colorHex)} nodes)`);
            }
        });

        // Show connectivity with colored edges
        if (canvas.edges && canvas.edges.length > 0) {
            console.info('\n🔗 Connection Map:');
            console.info('─'.repeat(80));

            canvas.edges.forEach((edge, index) => {
                const fromNode = canvas.nodes.find(n => n.id === edge.fromNode);
                const toNode = canvas.nodes.find(n => n.id === edge.toNode);

                if (fromNode && toNode) {
                    const fromColor = getTerminalColor(fromNode, "ansi-256");
                    const toColor = getTerminalColor(toNode, "ansi-256");

                    const reset = '\x1b[0m';
                    const arrow = '→';

                    console.info(
                        `${index + 1}. ${fromColor}${edge.fromNode}${reset} ` +
                        `${arrow} ${edge.label || 'connects'} ${arrow} ` +
                        `${toColor}${edge.toNode}${reset}`
                    );
                } else {
                    console.info(
                        `${index + 1}. ❌ Invalid edge: ${edge.fromNode} → ${edge.toNode} (node not found)`
                    );
                }
            });
        }

        // Show statistics
        console.info('\n📊 Canvas Statistics:');
        console.info('─'.repeat(30));

        const statusCounts = new Map<string, number>();
        const typeCounts = new Map<string, number>();
        const priorityCounts = new Map<string, number>();

        canvas.nodes.forEach(node => {
            const status = node.metadata?.status || 'unknown';
            const type = node.metadata?.documentType || 'unknown';
            const priority = node.metadata?.priority || 'unknown';

            statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
            typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
            priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
        });

        console.info('📈 Status Distribution:');
        statusCounts.forEach((count, status) => {
            console.info(`   ${getStatusIcon(status)} ${status}: ${count}`);
        });

        console.info('\n📄 Type Distribution:');
        typeCounts.forEach((count, type) => {
            console.info(`   📋 ${type}: ${count}`);
        });

        console.info('\n⚡ Priority Distribution:');
        priorityCounts.forEach((count, priority) => {
            console.info(`   ${getPriorityIcon(priority)} ${priority}: ${count}`);
        });

        console.info('\n✅ Canvas dashboard rendered successfully!');

    } catch (error) {
        console.error('❌ Error rendering canvas:', error);
        process.exit(1);
    }
}

/**
 * Gets status icon for display
 */
function getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
        active: '🟢',
        beta: '🟡',
        deprecated: '🔴',
        experimental: '🟣',
        unknown: '⚪'
    };
    return icons[status] || '⚪';
}

/**
 * Gets priority icon for display
 */
function getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
        high: '🔴',
        medium: '🟡',
        low: '🟢',
        unknown: '⚪'
    };
    return icons[priority] || '⚪';
}

/**
 * Shows usage information
 */
function showUsage(): void {
    console.info('🎨 Canvas Terminal Dashboard');
    console.info('');
    console.info('Usage:');
    console.info('  bun run canvas-terminal-dashboard <canvas-file>');
    console.info('');
    console.info('Examples:');
    console.info('  bun run canvas-terminal-dashboard 04\\ -\\ Canvas\\ Maps/integration-overview.canvas');
    console.info('  bun run canvas-terminal-dashboard 04\\ -\\ Canvas\\ Maps/system-architecture.canvas');
    console.info('');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showUsage();
        process.exit(0);
    }

    const canvasPath = args[0];

    // Handle relative paths
    if (!canvasPath.startsWith('/')) {
        const resolvedPath = join(process.cwd(), canvasPath);
        await displayCanvasInTerminal(resolvedPath);
    } else {
        await displayCanvasInTerminal(canvasPath);
    }
}

// Run if executed directly
if (import.meta.main) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

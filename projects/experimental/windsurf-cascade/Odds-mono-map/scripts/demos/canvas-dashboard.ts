#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]canvas-dashboard
 * 
 * Canvas Dashboard
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

import chalk from 'chalk';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, extname } from 'path';

console.log(chalk.blue.bold('🎨 Canvas Dashboard'));
console.log(chalk.gray('Real-time monitoring of Obsidian canvas files and vault integration'));
console.log(chalk.gray(`Last updated: ${new Date().toISOString()}\n`));

// Canvas file scanner
function scanCanvasFiles(vaultPath: string) {
    const canvasFiles = [];

    function scanDirectory(dir: string) {
        try {
            const items = readdirSync(dir);
            for (const item of items) {
                const fullPath = join(dir, item);
                const stat = require('fs').statSync(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    scanDirectory(fullPath);
                } else if (extname(item) === '.canvas') {
                    try {
                        const content = readFileSync(fullPath, 'utf-8');
                        const canvas = JSON.parse(content);
                        canvasFiles.push({
                            path: fullPath,
                            relativePath: fullPath.replace(vaultPath + '/', ''),
                            name: item.replace('.canvas', ''),
                            nodes: canvas.nodes?.length || 0,
                            edges: canvas.edges?.length || 0,
                            size: stat.size,
                            lastModified: stat.mtime
                        });
                    } catch (error) {
                        console.log(chalk.yellow(`   ⚠️  Could not parse ${item}: ${error.message}`));
                    }
                }
            }
        } catch (error) {
            // Skip directories we can't read
        }
    }

    scanDirectory(vaultPath);
    return canvasFiles;
}

// Canvas analytics
function analyzeCanvasFiles(canvasFiles: any[]) {
    const totalNodes = canvasFiles.reduce((sum, canvas) => sum + canvas.nodes, 0);
    const totalEdges = canvasFiles.reduce((sum, canvas) => sum + canvas.edges, 0);
    const totalSize = canvasFiles.reduce((sum, canvas) => sum + canvas.size, 0);
    const avgNodes = canvasFiles.length > 0 ? Math.round(totalNodes / canvasFiles.length) : 0;
    const avgEdges = canvasFiles.length > 0 ? Math.round(totalEdges / canvasFiles.length) : 0;

    return {
        totalFiles: canvasFiles.length,
        totalNodes,
        totalEdges,
        totalSize,
        avgNodes,
        avgEdges,
        largestCanvas: canvasFiles.reduce((max, canvas) => canvas.nodes > max.nodes ? canvas : max, canvasFiles[0] || { nodes: 0, name: 'None' }),
        mostConnected: canvasFiles.reduce((max, canvas) => canvas.edges > max.edges ? canvas : max, canvasFiles[0] || { edges: 0, name: 'None' })
    };
}

// Canvas health assessment
function assessCanvasHealth(canvasFiles: any[]) {
    let healthScore = 100;
    const issues = [];

    if (canvasFiles.length === 0) {
        healthScore -= 30;
        issues.push('No canvas files found');
        return { score: healthScore, issues };
    }

    // Check for empty canvases
    const emptyCanvases = canvasFiles.filter(canvas => canvas.nodes === 0);
    if (emptyCanvases.length > 0) {
        healthScore -= emptyCanvases.length * 5;
        issues.push(`${emptyCanvases.length} empty canvas(es) found`);
    }

    // Check for isolated nodes (no edges)
    const isolatedCanvases = canvasFiles.filter(canvas => canvas.nodes > 0 && canvas.edges === 0);
    if (isolatedCanvases.length > 0) {
        healthScore -= isolatedCanvases.length * 3;
        issues.push(`${isolatedCanvases.length} canvas(es) with isolated nodes`);
    }

    // Check for very large canvases
    const largeCanvases = canvasFiles.filter(canvas => canvas.nodes > 50);
    if (largeCanvases.length > 0) {
        healthScore -= largeCanvases.length * 2;
        issues.push(`${largeCanvases.length} very large canvas(es) (>50 nodes)`);
    }

    return { score: Math.max(0, healthScore), issues };
}

// Display canvas table
function displayCanvasTable(canvasFiles: any[]) {
    console.log(chalk.yellow('📊 Canvas Files Overview'));

    if (canvasFiles.length === 0) {
        console.log(chalk.gray('   No canvas files found in the vault'));
        return;
    }

    console.log(chalk.gray('┌─────────────────────────────────────────┬────────┬────────┬────────┬──────────┐'));
    console.log(chalk.gray('│ Canvas Name                              │ Nodes  │ Edges  │ Size   │ Modified  │'));
    console.log(chalk.gray('├─────────────────────────────────────────┼────────┼────────┼────────┼──────────┤'));

    canvasFiles.slice(0, 10).forEach(canvas => {
        const name = canvas.name.padEnd(41);
        const nodes = canvas.nodes.toString().padEnd(6);
        const edges = canvas.edges.toString().padEnd(6);
        const size = (canvas.size / 1024).toFixed(1) + 'KB'.padEnd(6);
        const modified = canvas.lastModified.toLocaleDateString().padEnd(8);

        console.log(chalk.gray(`│ ${name} │ ${nodes} │ ${edges} │ ${size} │ ${modified} │`));
    });

    if (canvasFiles.length > 10) {
        console.log(chalk.gray(`│ ... and ${canvasFiles.length - 10} more canvas files                    │        │        │        │           │`));
    }

    console.log(chalk.gray('└─────────────────────────────────────────┴────────┴────────┴────────┴──────────┘'));
}

// Main dashboard
const vaultPath = process.cwd();
const canvasFiles = scanCanvasFiles(vaultPath);
const analytics = analyzeCanvasFiles(canvasFiles);
const health = assessCanvasHealth(canvasFiles);

// Display analytics
console.log(chalk.blue.bold('📈 Canvas Analytics'));
console.log(chalk.gray(`   📁 Total Canvas Files: ${analytics.totalFiles}`));
console.log(chalk.gray(`   🔷 Total Nodes: ${analytics.totalNodes}`));
console.log(chalk.gray(`   🔗 Total Edges: ${analytics.totalEdges}`));
console.log(chalk.gray(`   📏 Total Size: ${(analytics.totalSize / 1024).toFixed(1)}KB`));
console.log(chalk.gray(`   📊 Average Nodes per Canvas: ${analytics.avgNodes}`));
console.log(chalk.gray(`   🔗 Average Edges per Canvas: ${analytics.avgEdges}`));
console.log(chalk.gray(`   🏆 Largest Canvas: ${analytics.largestCanvas.name} (${analytics.largestCanvas.nodes} nodes)`));
console.log(chalk.gray(`   🌐 Most Connected: ${analytics.mostConnected.name} (${analytics.mostConnected.edges} edges)`));

// Display health
console.log(chalk.blue.bold('\n🏥 Canvas Health Assessment'));
console.log(chalk.gray(`   Overall Score: ${health.score >= 80 ? chalk.green(health.score) : health.score >= 60 ? chalk.yellow(health.score) : chalk.red(health.score)}/100`));

if (health.issues.length > 0) {
    console.log(chalk.yellow('\n⚠️  Issues Detected:'));
    health.issues.forEach(issue => {
        console.log(chalk.red(`   • ${issue}`));
    });
} else {
    console.log(chalk.green('   ✅ No issues detected - all canvases look healthy!'));
}

// Display table
displayCanvasTable(canvasFiles);

// Integration status
console.log(chalk.blue.bold('\n🔗 Integration Status'));
const integrationFiles = [
    'src/canvas/canvas-vault-integration.ts',
    'scripts/canvas-monitor.ts',
    'docs/CANVAS_VAULT_INTEGRATION.md'
];

integrationFiles.forEach(file => {
    const exists = existsSync(join(vaultPath, file));
    console.log(chalk.gray(`   ${exists ? '✅' : '⚪'} ${file}`));
});

// Recommendations
console.log(chalk.blue.bold('\n💡 Canvas Recommendations'));
const recommendations = [];

if (analytics.totalFiles === 0) {
    recommendations.push('🎨 Create your first canvas file to visualize relationships');
} else if (analytics.avgNodes < 5) {
    recommendations.push('📊 Add more nodes to your canvases for better visualization');
}

if (analytics.totalEdges < analytics.totalNodes / 2) {
    recommendations.push('🔗 Connect more nodes with edges to show relationships');
}

if (analytics.largestCanvas.nodes > 50) {
    recommendations.push('📂 Consider breaking down very large canvases into smaller, focused ones');
}

if (!existsSync(join(vaultPath, 'src/canvas/canvas-vault-integration.ts'))) {
    recommendations.push('🔧 Set up canvas-vault integration for automatic metadata enrichment');
}

if (recommendations.length > 0) {
    recommendations.forEach(rec => {
        console.log(chalk.cyan(`   ${rec}`));
    });
} else {
    console.log(chalk.green('   ✅ Your canvas setup looks excellent!'));
}

// Canvas templates
console.log(chalk.blue.bold('\n📋 Available Canvas Templates'));
const templateDir = join(vaultPath, '06 - Templates/Canvas Templates');
if (existsSync(templateDir)) {
    try {
        const templates = readdirSync(templateDir).filter(file => extname(file) === '.canvas');
        templates.forEach(template => {
            console.log(chalk.gray(`   📄 ${template.replace('.canvas', '')}`));
        });
    } catch (error) {
        console.log(chalk.gray('   ⚪ Template directory not accessible'));
    }
} else {
    console.log(chalk.gray('   ⚪ No canvas templates directory found'));
}

console.log(chalk.green('\n✅ Canvas dashboard updated successfully!'));

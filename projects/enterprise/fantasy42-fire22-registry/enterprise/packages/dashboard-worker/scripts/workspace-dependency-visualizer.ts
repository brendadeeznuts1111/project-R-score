#!/usr/bin/env bun

/**
 * 🎨 Fire22 Workspace Dependency Visualizer
 *
 * Generates visual representations of workspace dependencies:
 * - ASCII dependency tree
 * - Mermaid diagrams
 * - HTML interactive graph
 * - Dependency matrix
 *
 * @version 1.0.0
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface WorkspaceNode {
  name: string;
  displayName: string;
  version: string;
  dependencies: string[];
  dependents: string[];
  level: number;
  size: number;
  private: boolean;
}

class WorkspaceDependencyVisualizer {
  private workspacesPath: string;
  private workspaces: Map<string, WorkspaceNode>;

  constructor() {
    this.workspacesPath = join(process.cwd(), 'workspaces');
    this.workspaces = new Map();
  }

  /**
   * 🚀 Generate all visualizations
   */
  async generateVisualizations(): Promise<void> {
    console.log('🎨 Fire22 Workspace Dependency Visualizer');
    console.log('='.repeat(60));

    // Load workspace data
    await this.loadWorkspaceData();

    // Generate visualizations
    this.generateASCIITree();
    this.generateMermaidDiagram();
    this.generateDependencyMatrix();
    await this.generateHTMLVisualization();

    console.log('\n✅ Visualizations generated successfully!');
  }

  /**
   * 📊 Load workspace data
   */
  private async loadWorkspaceData(): Promise<void> {
    const workspaceDirs = [
      '@fire22-pattern-system',
      '@fire22-api-client',
      '@fire22-core-dashboard',
      '@fire22-sports-betting',
      '@fire22-telegram-integration',
      '@fire22-build-system',
    ];

    for (const dir of workspaceDirs) {
      const packageJsonPath = join(this.workspacesPath, dir, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

        const node: WorkspaceNode = {
          name: packageJson.name,
          displayName: dir,
          version: packageJson.version || '1.0.0',
          dependencies: [],
          dependents: [],
          level: 0,
          size: 0,
          private: packageJson.private || false,
        };

        // Extract dependencies
        if (packageJson.dependencies) {
          for (const [dep, version] of Object.entries(packageJson.dependencies)) {
            if (version === 'workspace:*' || dep.startsWith('@fire22/')) {
              node.dependencies.push(dep);
            }
          }
        }

        // Get workspace size
        try {
          const distPath = join(this.workspacesPath, dir, 'dist');
          if (existsSync(distPath)) {
            const result = await Bun.$`du -sk ${distPath}`.quiet();
            node.size = parseInt(result.stdout.toString().split('\t')[0]);
          }
        } catch {}

        this.workspaces.set(packageJson.name, node);
      }
    }

    // Calculate dependents and levels
    this.calculateDependents();
    this.calculateLevels();
  }

  /**
   * 🔗 Calculate dependents
   */
  private calculateDependents(): void {
    for (const [name, node] of this.workspaces) {
      for (const dep of node.dependencies) {
        const depNode = this.workspaces.get(dep);
        if (depNode) {
          depNode.dependents.push(name);
        }
      }
    }
  }

  /**
   * 📊 Calculate dependency levels
   */
  private calculateLevels(): void {
    const visited = new Set<string>();

    const calculateLevel = (name: string, level: number = 0): number => {
      const node = this.workspaces.get(name);
      if (!node || visited.has(name)) return level;

      visited.add(name);
      node.level = Math.max(node.level, level);

      for (const dep of node.dependencies) {
        calculateLevel(dep, level + 1);
      }

      return node.level;
    };

    for (const name of this.workspaces.keys()) {
      calculateLevel(name);
    }
  }

  /**
   * 🌳 Generate ASCII dependency tree
   */
  private generateASCIITree(): void {
    console.log('\n🌳 ASCII Dependency Tree');
    console.log('-'.repeat(60));

    const printed = new Set<string>();

    const printNode = (name: string, prefix: string = '', isLast: boolean = true): void => {
      const node = this.workspaces.get(name);
      if (!node) return;

      const connector = isLast ? '└── ' : '├── ';
      const sizeStr = node.size ? ` (${node.size}KB)` : '';
      console.log(`${prefix}${connector}${node.displayName} v${node.version}${sizeStr}`);

      if (printed.has(name)) {
        if (node.dependencies.length > 0) {
          console.log(`${prefix}${isLast ? '    ' : '│   '}└── [circular reference]`);
        }
        return;
      }

      printed.add(name);

      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      node.dependencies.forEach((dep, index) => {
        printNode(dep, childPrefix, index === node.dependencies.length - 1);
      });
    };

    // Find root nodes (no dependents)
    const roots = Array.from(this.workspaces.entries())
      .filter(([_, node]) => node.dependents.length === 0)
      .map(([name, _]) => name);

    if (roots.length === 0) {
      // If no roots (circular dependencies), start with level 0 nodes
      const level0 = Array.from(this.workspaces.entries())
        .filter(([_, node]) => node.level === 0)
        .map(([name, _]) => name);
      roots.push(...level0);
    }

    roots.forEach((root, index) => {
      printNode(root, '', index === roots.length - 1);
    });
  }

  /**
   * 📊 Generate Mermaid diagram
   */
  private generateMermaidDiagram(): void {
    console.log('\n📊 Mermaid Diagram');
    console.log('-'.repeat(60));

    const mermaid = ['graph TD'];

    // Add nodes
    for (const [name, node] of this.workspaces) {
      const id = name.replace('@fire22/', '').replace(/-/g, '_');
      const label = `${node.displayName}<br/>v${node.version}`;
      const style = node.level === 0 ? 'fill:#f9f,stroke:#333,stroke-width:4px' : '';

      mermaid.push(`    ${id}[${label}]`);
      if (style) {
        mermaid.push(`    style ${id} ${style}`);
      }
    }

    // Add edges
    for (const [name, node] of this.workspaces) {
      const fromId = name.replace('@fire22/', '').replace(/-/g, '_');
      for (const dep of node.dependencies) {
        const toId = dep.replace('@fire22/', '').replace(/-/g, '_');
        mermaid.push(`    ${fromId} --> ${toId}`);
      }
    }

    const mermaidContent = mermaid.join('\n');
    console.log(mermaidContent);

    // Save to file
    const mermaidPath = join(process.cwd(), 'docs', 'workspace-dependencies.mmd');
    writeFileSync(mermaidPath, mermaidContent);
    console.log(`\n💾 Mermaid diagram saved to: ${mermaidPath}`);
  }

  /**
   * 📊 Generate dependency matrix
   */
  private generateDependencyMatrix(): void {
    console.log('\n📊 Dependency Matrix');
    console.log('-'.repeat(60));

    const names = Array.from(this.workspaces.keys());
    const shortNames = names.map(n => n.replace('@fire22/', ''));

    // Print header
    console.log('         ', shortNames.map(n => n.substring(0, 8).padEnd(9)).join(''));
    console.log('         ', shortNames.map(() => '---------').join(''));

    // Print matrix
    for (let i = 0; i < names.length; i++) {
      const row = [];
      const node = this.workspaces.get(names[i])!;

      for (let j = 0; j < names.length; j++) {
        if (i === j) {
          row.push('    •    ');
        } else if (node.dependencies.includes(names[j])) {
          row.push('    →    ');
        } else if (node.dependents.includes(names[j])) {
          row.push('    ←    ');
        } else {
          row.push('         ');
        }
      }

      console.log(shortNames[i].substring(0, 8).padEnd(9), row.join(''));
    }

    console.log('\nLegend: → depends on, ← depended by, • self');
  }

  /**
   * 🌐 Generate HTML visualization
   */
  private async generateHTMLVisualization(): Promise<void> {
    const nodes = Array.from(this.workspaces.values()).map((node, index) => ({
      id: node.name,
      label: node.displayName,
      level: node.level,
      size: Math.max(10, Math.sqrt(node.size || 100) * 2),
      color: this.getNodeColor(node.level),
      x: (index % 3) * 200 + 100,
      y: node.level * 150 + 100,
    }));

    const edges = [];
    for (const [name, node] of this.workspaces) {
      for (const dep of node.dependencies) {
        edges.push({
          source: name,
          target: dep,
        });
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Workspace Dependencies</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            color: #1f2937;
            margin-bottom: 20px;
        }
        
        #graph {
            width: 100%;
            height: 600px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
        }
        
        .node {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .node:hover {
            filter: brightness(1.2);
        }
        
        .node-label {
            font-size: 12px;
            font-weight: 600;
            fill: #1f2937;
            pointer-events: none;
        }
        
        .edge {
            fill: none;
            stroke: #9ca3af;
            stroke-width: 2px;
            marker-end: url(#arrowhead);
        }
        
        .tooltip {
            position: absolute;
            background: #1f2937;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #7c3aed;
        }
        
        .stat-label {
            color: #6b7280;
            font-size: 0.9rem;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Fire22 Workspace Dependencies</h1>
        
        <div id="graph"></div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${nodes.length}</div>
                <div class="stat-label">Workspaces</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${edges.length}</div>
                <div class="stat-label">Dependencies</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.max(...nodes.map(n => n.level)) + 1}</div>
                <div class="stat-label">Depth Levels</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${nodes.reduce((sum, n) => sum + (n.size || 0), 0)}KB</div>
                <div class="stat-label">Total Size</div>
            </div>
        </div>
        
        <div class="tooltip"></div>
    </div>
    
    <script>
        const nodes = ${JSON.stringify(nodes)};
        const edges = ${JSON.stringify(edges)};
        
        const width = 1140;
        const height = 600;
        
        const svg = d3.select("#graph")
            .append("svg")
            .attr("width", "100%")
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);
        
        // Define arrowhead marker
        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#9ca3af");
        
        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => d.size + 10));
        
        // Draw edges
        const link = svg.append("g")
            .selectAll("line")
            .data(edges)
            .join("line")
            .attr("class", "edge");
        
        // Draw nodes
        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("class", "node")
            .call(drag(simulation));
        
        node.append("circle")
            .attr("r", d => d.size)
            .attr("fill", d => d.color);
        
        node.append("text")
            .attr("class", "node-label")
            .attr("dy", 4)
            .attr("text-anchor", "middle")
            .text(d => d.label.replace('@fire22-', ''));
        
        // Tooltip
        const tooltip = d3.select(".tooltip");
        
        node.on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(\`<strong>\${d.label}</strong><br/>Level: \${d.level}<br/>Size: \${d.size}KB\`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
        
        // Update positions on tick
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node.attr("transform", d => \`translate(\${d.x},\${d.y})\`);
        });
        
        // Drag functionality
        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            
            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            
            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
    </script>
</body>
</html>`;

    const htmlPath = join(process.cwd(), 'docs', 'workspace-dependencies.html');
    await Bun.write(htmlPath, html);
    console.log(`\n🌐 HTML visualization saved to: ${htmlPath}`);
  }

  /**
   * 🎨 Get node color based on level
   */
  private getNodeColor(level: number): string {
    const colors = [
      '#10b981', // Green - Level 0 (foundation)
      '#3b82f6', // Blue - Level 1
      '#8b5cf6', // Purple - Level 2
      '#f59e0b', // Orange - Level 3
      '#ef4444', // Red - Level 4+
    ];
    return colors[Math.min(level, colors.length - 1)];
  }
}

// === CLI Interface ===

if (import.meta.main) {
  const visualizer = new WorkspaceDependencyVisualizer();
  await visualizer.generateVisualizations();
}

export default WorkspaceDependencyVisualizer;

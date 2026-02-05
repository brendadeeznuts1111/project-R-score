/**
 * 📊 FactoryWager Version Graph Visualization
 * 
 * Visual representation of secret version history with Mermaid and D3 support
 * 
 * @version 5.1
 */

import { styled } from '../theme/colors.ts';
import type { VersionNode } from './versioned-secrets.ts';

export interface VisualizationData {
  mermaidUrl?: string;
  d3Url?: string;
  nodeCount: number;
}

export class VersionGraph {
  private r2Bucket: any; // R2 bucket instance
  
  constructor(r2Bucket?: any) {
    this.r2Bucket = r2Bucket;
  }
  
  async update(key: string, node: VersionNode) {
    // Get existing graph
    const graphKey = `versions/graph/${key}.json`;
    let graph: VersionNode[] = [];
    
    if (this.r2Bucket) {
      try {
        const existing = await this.r2Bucket.get(graphKey);
        if (existing) {
          graph = JSON.parse(await existing.text());
        }
      } catch {
        // Graph doesn't exist yet
      }
    }
    
    // Add new node
    graph.push(node);
    
    // Store updated graph
    if (this.r2Bucket) {
      await this.r2Bucket.put(graphKey, JSON.stringify(graph, null, 2), {
        customMetadata: {
          'graph:type': 'secret-versions',
          'graph:key': key,
          'graph:versions': graph.length.toString(),
          'graph:latest': node.version,
          'visual:render': 'force-directed',
          'factorywager:version': '5.1'
        }
      });
    }
    
    // Generate visualization data
    return await this.generateVisualization(key, graph);
  }
  
  async getHistory(key: string, limit = 10) {
    if (!this.r2Bucket) return [];
    
    const graphKey = `versions/graph/${key}.json`;
    try {
      const graph = await this.r2Bucket.get(graphKey);
      if (!graph) return [];
      
      const history = JSON.parse(await graph.text());
      return history.slice(-limit).reverse(); // Latest first
    } catch {
      return [];
    }
  }
  
  async generateVisualization(key: string, graph: VersionNode[]): Promise<VisualizationData> {
    // Generate Mermaid.js diagram
    const mermaid = this.generateMermaidDiagram(key, graph);
    
    // Generate D3.js data
    const d3Data = this.generateD3Data(graph);
    
    let mermaidUrl: string | undefined;
    let d3Url: string | undefined;
    
    if (this.r2Bucket) {
      // Store both representations
      await this.r2Bucket.put(
        `versions/viz/${key}/mermaid.md`, 
        mermaid,
        { customMetadata: { 'viz:format': 'mermaid', 'viz:type': 'graph' } }
      );
      
      await this.r2Bucket.put(
        `versions/viz/${key}/d3.json`,
        JSON.stringify(d3Data, null, 2),
        { customMetadata: { 'viz:format': 'd3', 'viz:type': 'graph' } }
      );
      
      // Generate signed URLs for immediate viewing
      mermaidUrl = await this.r2Bucket.createSignedUrl(
        `versions/viz/${key}/mermaid.md`,
        { expiresInSeconds: 3600 }
      );
      
      d3Url = await this.r2Bucket.createSignedUrl(
        `versions/viz/${key}/d3.json`,
        { expiresInSeconds: 3600 }
      );
    }
    
    return { mermaidUrl, d3Url, nodeCount: graph.length };
  }
  
  private generateMermaidDiagram(key: string, graph: VersionNode[]): string {
    let mermaid = `graph TD\n`;
    mermaid += `    A["${key}"] --> B["${graph[0]?.version || 'v1.0.0'}"]\n`;
    
    for (let i = 1; i < graph.length; i++) {
      const prev = graph[i - 1];
      const curr = graph[i];
      const color = this.getMermaidColor(curr.action);
      
      mermaid += `    ${prev.id || 'v' + i}["${prev.version}"] -- ${curr.action} --> ${curr.id || 'v' + (i + 1)}["${curr.version}"]\n`;
      mermaid += `    style ${curr.id || 'v' + (i + 1)} fill:${color}\n`;
    }
    
    if (graph.length > 0) {
      const latest = graph[graph.length - 1];
      mermaid += `    click ${latest.id || 'v' + graph.length} callback "Latest Version"\n`;
    }
    
    mermaid += `    classDef default fill:#f9f,stroke:#333,stroke-width:2px;\n`;
    
    return mermaid;
  }
  
  private generateD3Data(graph: VersionNode[]) {
    const nodes = graph.map((node, index) => ({
      id: node.id || `v${index + 1}`,
      version: node.version,
      timestamp: node.timestamp,
      author: node.author,
      description: node.description,
      action: node.action,
      color: node.visual?.color || '#3b82f6',
      icon: node.visual?.icon || '📝',
      x: Math.cos((index / graph.length) * 2 * Math.PI) * 200,
      y: Math.sin((index / graph.length) * 2 * Math.PI) * 200
    }));
    
    const links = graph.slice(1).map((node, index) => ({
      source: graph[index].id || `v${index + 1}`,
      target: node.id || `v${index + 2}`,
      action: node.action,
      color: this.getLinkColor(node.action)
    }));
    
    return {
      nodes,
      links,
      metadata: {
        nodeCount: nodes.length,
        latestVersion: graph[graph.length - 1]?.version,
        generated: new Date().toISOString(),
        factorywager: '5.1'
      }
    };
  }
  
  private getMermaidColor(action: string): string {
    switch (action) {
      case 'SET': return '#22c55e';
      case 'ROLLBACK': return '#f59e0b';
      case 'ROTATE': return '#06b6d4';
      case 'INITIAL': return '#3b82f6';
      default: return '#6b7280';
    }
  }
  
  private getLinkColor(action: string): string {
    switch (action) {
      case 'SET': return '#22c55e';
      case 'ROLLBACK': return '#ef4444';
      case 'ROTATE': return '#06b6d4';
      case 'INITIAL': return '#3b82f6';
      default: return '#6b7280';
    }
  }
  
  async generateTerminalVisualization(key: string, graph: VersionNode[]) {
    console.log(styled(`\n📊 Version Timeline for ${key}`, 'accent'));
    console.log(styled('─'.repeat(50), 'muted'));
    
    graph.forEach((node, index) => {
      const isLatest = index === graph.length - 1;
      const prefix = isLatest ? '★' : '│';
      const indent = '  '.repeat(Math.max(0, graph.length - index - 1));
      
      const color = node.action === 'ROLLBACK' ? 'warning' : 
                   node.action === 'SET' ? 'success' : 
                   node.action === 'ROTATE' ? 'accent' : 'primary';
      
      console.log(`${indent}${styled(prefix, color)} ${styled(node.version, color)}`);
      
      if (node.description) {
        console.log(`${indent}  ${styled(node.description, 'muted')}`);
      }
      
      console.log(`${indent}  ${styled(node.timestamp.split('T')[0], 'muted')} by ${styled(node.author, 'primary')}`);
      
      if (index < graph.length - 1) {
        console.log(`${indent}  ${styled('↓', 'muted')}`);
      }
    });
    
    console.log(styled('\n─'.repeat(50), 'muted'));
    console.log(styled(`Total versions: ${graph.length}`, 'primary'));
  }
  
  async generateImpactAnalysis(key: string, graph: VersionNode[]) {
    if (!this.r2Bucket) return;
    
    // Analyze which services might be affected by changes
    const impact = {
      key,
      totalVersions: graph.length,
      rollbacks: graph.filter(n => n.action === 'ROLLBACK').length,
      rotations: graph.filter(n => n.action === 'ROTATE').length,
      lastChange: graph[graph.length - 1]?.timestamp,
      stability: this.calculateStability(graph),
      recommendations: this.generateRecommendations(graph)
    };
    
    // Store impact analysis
    await this.r2Bucket.put(
      `analysis/impact/${key}.json`,
      JSON.stringify(impact, null, 2),
      {
        customMetadata: {
          'analysis:type': 'impact-analysis',
          'analysis:key': key,
          'analysis:stability': impact.stability.toString(),
          'factorywager:version': '5.1'
        }
      }
    );
    
    return impact;
  }
  
  private calculateStability(graph: VersionNode[]): number {
    if (graph.length < 2) return 1.0;
    
    const rollbacks = graph.filter(n => n.action === 'ROLLBACK').length;
    const total = graph.length;
    
    // Stability score: 1.0 - (rollbacks / total)
    return Math.max(0, 1.0 - (rollbacks / total));
  }
  
  private generateRecommendations(graph: VersionNode[]): string[] {
    const recommendations: string[] = [];
    
    const rollbacks = graph.filter(n => n.action === 'ROLLBACK').length;
    const recentRollbacks = graph.slice(-5).filter(n => n.action === 'ROLLBACK').length;
    
    if (rollbacks > graph.length * 0.3) {
      recommendations.push('High rollback rate detected - consider reviewing change process');
    }
    
    if (recentRollbacks >= 2) {
      recommendations.push('Multiple recent rollbacks - investigate root cause');
    }
    
    const lastChange = graph[graph.length - 1]?.timestamp;
    if (lastChange) {
      const daysSinceLastChange = (Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastChange > 90) {
        recommendations.push('Secret hasn't been updated in 90+ days - consider rotation');
      }
    }
    
    return recommendations;
  }
}

export default VersionGraph;

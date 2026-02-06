import { env } from 'bun';
import type { VersionNode } from './versioned-secrets';

const DEFAULT_R2 = env.R2_BUCKET;

export class VersionGraph {
  private r2Bucket = DEFAULT_R2;

  async update(key: string, node: VersionNode) {
    if (!this.r2Bucket) {
      return [node];
    }

    const graphKey = `versions/graph/${key}.json`;
    const existing = await this.r2Bucket.get(graphKey);

    let graph: VersionNode[] = [];
    if (existing) {
      graph = JSON.parse(await existing.text());
    }

    const id = `v${graph.length + 1}`;
    graph.push({
      ...node,
      id,
      visual: {
        color: this.getColorForAction(node.action),
        icon: this.getIconForAction(node.action),
        theme: `factorywager-version-${node.action.toLowerCase()}`,
      },
    });

    await this.r2Bucket.put(graphKey, JSON.stringify(graph, null, 2), {
      customMetadata: {
        'graph:type': 'secret-versions',
        'graph:key': key,
        'graph:versions': graph.length.toString(),
        'graph:latest': node.version,
        'visual:render': 'force-directed',
      },
    });

    await this.generateVisualization(key, graph);
    return graph;
  }

  async getHistory(key: string, limit = 10) {
    if (!this.r2Bucket) return [];
    const graphKey = `versions/graph/${key}.json`;
    const graph = await this.r2Bucket.get(graphKey);
    if (!graph) return [];
    const history = JSON.parse(await graph.text());
    return history.slice(-limit).reverse();
  }

  async generateVisualization(key: string, graph?: VersionNode[]) {
    if (!this.r2Bucket) return { nodeCount: graph?.length ?? 0 };

    const resolved = graph ?? (await this.getHistory(key, 100)).reverse();
    const mermaid = this.generateMermaidDiagram(key, resolved);
    const d3Data = this.generateD3Data(resolved);

    const mermaidKey = `versions/viz/${key}/mermaid.md`;
    const d3Key = `versions/viz/${key}/d3.json`;

    await this.r2Bucket.put(mermaidKey, mermaid, {
      customMetadata: { 'viz:format': 'mermaid', 'viz:type': 'graph' },
    });

    await this.r2Bucket.put(d3Key, JSON.stringify(d3Data, null, 2), {
      customMetadata: { 'viz:format': 'd3', 'viz:type': 'graph' },
    });

    let mermaidUrl: string | undefined;
    let d3Url: string | undefined;
    if (typeof this.r2Bucket.createSignedUrl === 'function') {
      try {
        mermaidUrl = await this.r2Bucket.createSignedUrl(mermaidKey, { expiresInSeconds: 3600 });
        d3Url = await this.r2Bucket.createSignedUrl(d3Key, { expiresInSeconds: 3600 });
      } catch {
        // ignore signed url failures
      }
    }

    return { nodeCount: resolved.length, mermaidUrl, d3Url };
  }

  private generateMermaidDiagram(key: string, graph: VersionNode[]) {
    let mermaid = `graph TD\n`;
    if (!graph.length) {
      mermaid += `    A[${key}]`;
      return mermaid;
    }
    mermaid += `    A[${key}] --> ${graph[0].id}["${graph[0].version}"]\n`;

    for (let i = 1; i < graph.length; i++) {
      const prev = graph[i - 1];
      const curr = graph[i];
      const color = this.getMermaidColor(curr.action);
      mermaid += `    ${prev.id}["${prev.version}"] -- ${curr.action} --> ${curr.id}["${curr.version}"]\n`;
      mermaid += `    style ${curr.id} fill:${color}\n`;
    }

    return mermaid;
  }

  private generateD3Data(graph: VersionNode[]) {
    return {
      nodes: graph.map(node => ({
        id: node.id,
        label: node.version,
        action: node.action,
      })),
      links: graph.slice(1).map((node, i) => ({
        source: graph[i].id,
        target: node.id,
        action: node.action,
      })),
    };
  }

  private getColorForAction(action: string) {
    switch (action) {
      case 'ROLLBACK':
        return '#EF4444';
      case 'ROTATE':
        return '#F59E0B';
      default:
        return '#3B82F6';
    }
  }

  private getMermaidColor(action: string) {
    return this.getColorForAction(action);
  }

  private getIconForAction(action: string) {
    switch (action) {
      case 'ROLLBACK':
        return '⏪';
      case 'ROTATE':
        return '🔄';
      default:
        return '✅';
    }
  }
}

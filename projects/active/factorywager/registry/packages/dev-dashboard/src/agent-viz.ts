/**
 * Agent interaction visualization: network graph, heatmap, experiment impact.
 * Consumes AB testing + social data (in-memory).
 */

import type { ABTestingFramework } from './ab-testing.ts';
import type { SocialFeed } from './social.ts';

export interface NetworkNode {
  id: string;
  label: string;
  group: string;
}

export interface NetworkEdge {
  from: string;
  to: string;
  weight: number;
  type?: string;
}

export interface AgentNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface HeatmapCell {
  day: number; // 0-6 or date
  hour: number; // 0-23
  count: number;
}

export interface InteractionHeatmap {
  cells: HeatmapCell[];
  dayLabels: string[];
  hourLabels: string[];
}

export interface ExperimentImpact {
  experimentId: string;
  experimentName: string;
  variants: { variantId: string; variantName: string; conversions: number; engagement: number; assignments: number; conversionRate: number; engagementRate: number }[];
  significance?: string; // placeholder
}

export class AgentInteractionVisualizer {
  private abTesting: ABTestingFramework | null;
  private socialFeed: SocialFeed | null;

  constructor(abTesting: ABTestingFramework | null, socialFeed: SocialFeed | null) {
    this.abTesting = abTesting;
    this.socialFeed = socialFeed;
  }

  visualizeAgentNetwork(agentIds?: string[]): AgentNetwork {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const edgeCount = new Map<string, number>(); // key: "from:to"

    if (this.socialFeed) {
      const interactions = this.socialFeed.getInteractions(500);
      const agentSet = new Set<string>();
      for (const i of interactions) {
        agentSet.add(i.fromAgent);
        agentSet.add(i.toAgent);
        const key = `${i.fromAgent}:${i.toAgent}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
      const agents = agentIds && agentIds.length > 0 ? agentIds.filter((a) => agentSet.has(a)) : Array.from(agentSet);
      for (const a of agents) {
        nodes.push({ id: a, label: a.slice(0, 12) + (a.length > 12 ? '…' : ''), group: 'agent' });
      }
      for (const [key, count] of edgeCount) {
        const [from, to] = key.split(':');
        if (agents.length === 0 || (agents.includes(from) && agents.includes(to))) {
          edges.push({ from, to, weight: count });
        }
      }
    }

    return { nodes, edges };
  }

  createInteractionHeatmap(timeRangeHours = 24 * 7): InteractionHeatmap {
    const cells: HeatmapCell[] = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const grid = new Map<string, number>(); // key: "day:hour"

    if (this.socialFeed) {
      const since = Date.now() - timeRangeHours * 60 * 60 * 1000;
      const interactions = this.socialFeed.getInteractions(2000).filter((i) => i.timestamp >= since);
      for (const i of interactions) {
        const d = new Date(i.timestamp);
        const day = d.getDay();
        const hour = d.getHours();
        const key = `${day}:${hour}`;
        grid.set(key, (grid.get(key) ?? 0) + 1);
      }
    }

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        cells.push({ day, hour, count: grid.get(`${day}:${hour}`) ?? 0 });
      }
    }

    return { cells, dayLabels, hourLabels };
  }

  visualizeExperimentImpact(experimentId: string): ExperimentImpact | null {
    if (!this.abTesting) return null;
    const result = this.abTesting.getResults(experimentId);
    if (!result) return null;
    const variants = result.metrics.map((m) => ({
      variantId: m.variantId,
      variantName: m.variantName,
      conversions: m.conversions,
      engagement: m.engagement,
      assignments: m.assignments,
      conversionRate: m.assignments > 0 ? m.conversions / m.assignments : 0,
      engagementRate: m.assignments > 0 ? m.engagement / m.assignments : 0,
    }));
    return {
      experimentId: result.experiment.id,
      experimentName: result.experiment.name,
      variants,
      significance: undefined, // placeholder for chi-square etc.
    };
  }
}

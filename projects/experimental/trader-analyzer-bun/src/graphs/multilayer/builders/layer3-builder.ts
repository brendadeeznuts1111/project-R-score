/**
 * @fileoverview Cross-Event Graph Builder
 * @description Builder for Layer 3 cross-event correlations
 * @module graphs/multilayer/builders/layer3-builder
 * @version 1.1.1.1.4.2.3
 */

import type { GraphEdge, GraphNode } from '../interfaces';
import type { CrossEventGraph } from '../schemas/layer-graphs';
import type { SportType } from '../schemas/layer-schemas';
import type { EventData } from '../types/data';

/**
 * Header 1.1.1.1.4.2.3: Cross-Event Graph Builder
 */
export class CrossEventGraphBuilder {
  private graph: CrossEventGraph;
  private eventRegistry: Map<string, GraphNode>;

  constructor(private sportFilter?: SportType) {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      correlations: [],
    };
    this.eventRegistry = new Map();
  }

  buildFromEvents(
    events: EventData[],
    config: { minCorrelationScore: number },
  ): CrossEventGraph {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      correlations: [],
    };

    // Filter events by sport if specified
    const filteredEvents = this.sportFilter
      ? events.filter((e) => e.sport === this.sportFilter)
      : events;

    // Create event nodes
    for (const event of filteredEvents) {
      const eventNode = this.createEventNode(event);
      this.eventRegistry.set(event.id, eventNode);
      this.graph.nodes.set(event.id, eventNode);
    }

    // Calculate event correlations
    this.calculateEventCorrelations(filteredEvents, config);

    // Add temporal edges
    this.addTemporalEdges(filteredEvents);

    // Add market-based edges
    this.addMarketBasedEdges(filteredEvents);

    // Add team-based edges
    this.addTeamBasedEdges(filteredEvents);

    return this.graph;
  }

  private createEventNode(event: EventData): GraphNode {
    return {
      id: event.id,
      type: 'event',
      layer: 3,
      metadata: {
        eventData: event,
        marketCount: event.markets.length,
        volume24h: this.calculate24hVolume(event),
        volatility: this.calculateEventVolatility(event),
        popularity: this.calculatePopularityScore(event),
      },
    };
  }

  private calculateEventCorrelations(
    events: EventData[],
    config: { minCorrelationScore: number },
  ): void {
    // Pairwise event correlation calculation
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const correlation = this.calculatePairwiseCorrelation(
          events[i],
          events[j],
        );

        if (correlation.score >= config.minCorrelationScore) {
          const edge: GraphEdge = {
            id: `event_corr_${events[i].id}_${events[j].id}`,
            source: events[i].id,
            target: events[j].id,
            weight: correlation.score,
            sourceLayer: 3,
            targetLayer: 3,
            metadata: {
              correlationType: correlation.type,
              confidence: correlation.confidence,
              detectionMethod: correlation.method,
            },
          };

          const existing = this.graph.edges.get(edge.source) || [];
          existing.push(edge);
          this.graph.edges.set(edge.source, existing);

          this.graph.correlations.push({
            eventAId: events[i].id,
            eventBId: events[j].id,
            correlationType: correlation.type,
            strength: correlation.score,
            lagTime: correlation.lagTime || 0,
          });
        }
      }
    }
  }

  private calculatePairwiseCorrelation(
    eventA: EventData,
    eventB: EventData,
  ): {
    score: number;
    type: string;
    confidence: number;
    method: string;
    lagTime?: number;
  } {
    // Multiple correlation methods
    const correlations = [
      this.calculateOddsMovementCorrelation(eventA, eventB),
      this.calculateVolumePatternCorrelation(eventA, eventB),
      this.calculateMarketStructureCorrelation(eventA, eventB),
      this.calculateTemporalCorrelation(eventA, eventB),
    ];

    // Weighted average
    const weightedScore =
      correlations.reduce((sum, corr) => sum + corr.score * corr.weight, 0) /
      correlations.reduce((sum, corr) => sum + corr.weight, 0);

    // Determine primary correlation type
    const primaryType = correlations.reduce((max, corr) =>
      corr.score > max.score ? corr : max,
    ).type;

    return {
      score: weightedScore,
      type: primaryType,
      confidence: this.calculateConfidence(correlations),
      method: 'weighted_composite',
      lagTime: this.calculateLagTime(eventA, eventB),
    };
  }

  private calculateOddsMovementCorrelation(
    eventA: EventData,
    eventB: EventData,
  ): { score: number; weight: number; type: string } {
    // Simplified odds movement correlation
    return {
      score: 0.6,
      weight: 0.3,
      type: 'odds_movement',
    };
  }

  private calculateVolumePatternCorrelation(
    eventA: EventData,
    eventB: EventData,
  ): { score: number; weight: number; type: string } {
    const volumeA = eventA.volume24h || 0;
    const volumeB = eventB.volume24h || 0;

    if (volumeA === 0 || volumeB === 0) {
      return { score: 0, weight: 0.2, type: 'volume' };
    }

    const ratio = Math.min(volumeA, volumeB) / Math.max(volumeA, volumeB);
    return {
      score: ratio,
      weight: 0.25,
      type: 'volume',
    };
  }

  private calculateMarketStructureCorrelation(
    eventA: EventData,
    eventB: EventData,
  ): { score: number; weight: number; type: string } {
    // Compare market structures
    const marketsA = eventA.markets.length;
    const marketsB = eventB.markets.length;

    const similarity = 1 - Math.abs(marketsA - marketsB) / Math.max(marketsA, marketsB);

    return {
      score: similarity,
      weight: 0.2,
      type: 'market_structure',
    };
  }

  private calculateTemporalCorrelation(
    eventA: EventData,
    eventB: EventData,
  ): { score: number; weight: number; type: string } {
    const timeDiff = Math.abs(eventA.startTime - eventB.startTime);
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // Events closer in time are more correlated
    const correlation = Math.max(0, 1 - hoursDiff / 24); // Decay over 24 hours

    return {
      score: correlation,
      weight: 0.25,
      type: 'temporal',
    };
  }

  private calculateConfidence(correlations: unknown[]): number {
    return correlations.length > 0 ? 0.8 : 0;
  }

  private calculateLagTime(eventA: EventData, eventB: EventData): number {
    return eventB.startTime - eventA.startTime;
  }

  private addTemporalEdges(events: EventData[]): void {
    // Add edges for events close in time
    const maxTimeDiff = 3600000 * 2; // 2 hours

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const timeDiff = Math.abs(events[i].startTime - events[j].startTime);
        if (timeDiff <= maxTimeDiff) {
          const edge: GraphEdge = {
            id: `temporal_${events[i].id}_${events[j].id}`,
            source: events[i].id,
            target: events[j].id,
            weight: 1 - timeDiff / maxTimeDiff,
            sourceLayer: 3,
            targetLayer: 3,
            metadata: {
              edgeType: 'temporal',
              timeDifference: timeDiff,
            },
          };

          const existing = this.graph.edges.get(edge.source) || [];
          existing.push(edge);
          this.graph.edges.set(edge.source, existing);
        }
      }
    }
  }

  private addMarketBasedEdges(events: EventData[]): void {
    // Add edges based on similar market patterns
  }

  private addTeamBasedEdges(events: EventData[]): void {
    // Add edges for events with same teams
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const sharedTeams = this.findSharedTeams(events[i], events[j]);
        if (sharedTeams.length > 0) {
          const edge: GraphEdge = {
            id: `team_${events[i].id}_${events[j].id}`,
            source: events[i].id,
            target: events[j].id,
            weight: sharedTeams.length / 2, // Normalize by max 2 teams
            sourceLayer: 3,
            targetLayer: 3,
            metadata: {
              edgeType: 'team_based',
              sharedTeams,
            },
          };

          const existing = this.graph.edges.get(edge.source) || [];
          existing.push(edge);
          this.graph.edges.set(edge.source, existing);
        }
      }
    }
  }

  private findSharedTeams(eventA: EventData, eventB: EventData): string[] {
    const teamsA = new Set(eventA.teams);
    const teamsB = new Set(eventB.teams);
    return Array.from(teamsA).filter((team) => teamsB.has(team));
  }

  private calculate24hVolume(event: EventData): number {
    return event.volume24h || 0;
  }

  private calculateEventVolatility(event: EventData): number {
    // Simplified volatility calculation
    return 0.5; // Placeholder
  }

  private calculatePopularityScore(event: EventData): number {
    // Simplified popularity calculation based on volume
    return Math.min(1, (event.volume24h || 0) / 1000000);
  }
}

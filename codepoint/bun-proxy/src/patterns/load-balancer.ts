// @bun/proxy/patterns/load-balancer.ts - Load balancer implementation
import type { LoadBalancerConfiguration, LoadBalancerTarget } from './index.js';

export class LoadBalancer {
  private currentIndex: number = 0;
  private connectionCounts: Map<string, number> = new Map();

  constructor(private configuration: LoadBalancerConfiguration) {
    this.validateConfiguration(configuration);
  }

  private validateConfiguration(config: LoadBalancerConfiguration): void {
    if (config.targetServers.length === 0) {
      throw new Error('At least one target server is required');
    }
  }

  selectTarget(): LoadBalancerTarget {
    const healthyTargets = this.configuration.targetServers.filter(target => target.isEnabled);

    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }

    switch (this.configuration.balancingStrategy) {
      case 'round-robin':
        return this.roundRobinSelect(healthyTargets);
      case 'least-connections':
        return this.leastConnectionsSelect(healthyTargets);
      case 'random':
        return this.randomSelect(healthyTargets);
      case 'weighted':
        return this.weightedSelect(healthyTargets);
      default:
        return healthyTargets[0];
    }
  }

  private roundRobinSelect(targets: LoadBalancerTarget[]): LoadBalancerTarget {
    const target = targets[this.currentIndex % targets.length];
    this.currentIndex++;
    return target;
  }

  private leastConnectionsSelect(targets: LoadBalancerTarget[]): LoadBalancerTarget {
    return targets.reduce((least, current) => {
      const leastConnections = this.connectionCounts.get(least.serverUrl) || 0;
      const currentConnections = this.connectionCounts.get(current.serverUrl) || 0;
      return currentConnections < leastConnections ? current : least;
    }, targets[0]);
  }

  private randomSelect(targets: LoadBalancerTarget[]): LoadBalancerTarget {
    return targets[Math.floor(Math.random() * targets.length)];
  }

  private weightedSelect(targets: LoadBalancerTarget[]): LoadBalancerTarget {
    const totalWeight = targets.reduce((sum, target) => sum + target.weight, 0);
    let random = Math.random() * totalWeight;

    for (const target of targets) {
      random -= target.weight;
      if (random <= 0) {
        return target;
      }
    }

    return targets[targets.length - 1];
  }

  incrementConnectionCount(serverUrl: string): void {
    const current = this.connectionCounts.get(serverUrl) || 0;
    this.connectionCounts.set(serverUrl, current + 1);
  }

  decrementConnectionCount(serverUrl: string): void {
    const current = this.connectionCounts.get(serverUrl) || 0;
    this.connectionCounts.set(serverUrl, Math.max(0, current - 1));
  }
}

// === Arbitrage Pathfinder ===

export interface PathfindingOptions {
  maxHops: number;
  minProfit: number;
  maxRisk: number;
  minLiquidity: number;
  maxComplexity: number;
}

export interface ArbitragePath {
  pathId: string;
  pathType: 'direct' | 'triangle' | 'multi-hop' | 'butterfly';
  nodes: string[];
  estimatedProfit: number;
  riskScore: number;
  executionComplexity: number;
  confidence: number;
  status: 'active' | 'review' | 'hold';
  estimatedDuration: number;
  gasEstimate?: number;
  slippage: number;
}

export interface PathDetail {
  path: ArbitragePath;
  steps: PathStep[];
  riskAnalysis: RiskAnalysis;
  executionPlan: ExecutionPlan;
  profitability: ProfitabilityBreakdown;
}

export interface PathStep {
  stepId: number;
  fromNode: string;
  toNode: string;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  expectedPrice: number;
  slippageTolerance: number;
  executionTime: number;
}

export interface RiskAnalysis {
  marketRisk: number;
  executionRisk: number;
  liquidityRisk: number;
  counterpartyRisk: number;
  totalRisk: number;
  riskFactors: string[];
}

export interface ExecutionPlan {
  phases: ExecutionPhase[];
  totalDuration: number;
  criticalPath: string[];
  rollbackPlan: string[];
}

export interface ExecutionPhase {
  phaseId: number;
  description: string;
  duration: number;
  dependencies: number[];
  actions: string[];
}

export interface ProfitabilityBreakdown {
  grossProfit: number;
  estimatedFees: number;
  slippageCost: number;
  netProfit: number;
  profitMargin: number;
  breakEvenPoint: number;
}

export class ArbitragePathfinder {
  private marketGraph: Map<string, Set<string>> = new Map();
  private pathCache: Map<string, ArbitragePath[]> = new Map();
  private lastScanTime = 0;

  constructor() {
    this.initializeMarketGraph();
  }

  private initializeMarketGraph(): void {
    // Initialize mock market graph
    const markets = [
      'nba-ml-warriors-lakers',
      'nba-spread-warriors-lakers',
      'nba-total-warriors-lakers',
      'player-prop-warriors',
      'nba-ml-celtics-bucks',
      'nba-spread-celtics-bucks',
      'player-prop-celtics'
    ];

    // Create connections between related markets
    markets.forEach(market => {
      this.marketGraph.set(market, new Set());
    });

    // Add connections based on market relationships
    this.addConnection('nba-ml-warriors-lakers', 'nba-spread-warriors-lakers');
    this.addConnection('nba-ml-warriors-lakers', 'nba-total-warriors-lakers');
    this.addConnection('nba-ml-warriors-lakers', 'player-prop-warriors');
    this.addConnection('nba-spread-warriors-lakers', 'nba-total-warriors-lakers');
    this.addConnection('nba-ml-celtics-bucks', 'nba-spread-celtics-bucks');
    this.addConnection('nba-ml-celtics-bucks', 'player-prop-celtics');
  }

  private addConnection(from: string, to: string): void {
    if (this.marketGraph.has(from)) {
      this.marketGraph.get(from)!.add(to);
    }
    if (this.marketGraph.has(to)) {
      this.marketGraph.get(to)!.add(from);
    }
  }

  public findOptimalPaths(source: string, targets: string[], options: PathfindingOptions): ArbitragePath[] {
    const cacheKey = `${source}-${targets.join(',')}-${JSON.stringify(options)}`;
    
    // Check cache (valid for 30 seconds)
    if (Date.now() - this.lastScanTime < 30000 && this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey)!;
    }

    const allPaths: ArbitragePath[] = [];

    // Find direct paths
    targets.forEach(target => {
      const directPaths = this.findDirectPaths(source, target, options);
      allPaths.push(...directPaths);
    });

    // Find triangle paths
    targets.forEach(target => {
      const trianglePaths = this.findTrianglePaths(source, target, options);
      allPaths.push(...trianglePaths);
    });

    // Find multi-hop paths
    targets.forEach(target => {
      const multiHopPaths = this.findMultiHopPaths(source, target, options);
      allPaths.push(...multiHopPaths);
    });

    // Find butterfly paths (complex multi-market)
    const butterflyPaths = this.findButterflyPaths(source, targets, options);
    allPaths.push(...butterflyPaths);

    // Sort by profit and filter by constraints
    const validPaths = allPaths
      .filter(path => path.estimatedProfit >= options.minProfit)
      .filter(path => path.riskScore <= options.maxRisk)
      .filter(path => path.executionComplexity <= options.maxComplexity)
      .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
      .slice(0, 20); // Return top 20 paths

    // Cache results
    this.pathCache.set(cacheKey, validPaths);
    this.lastScanTime = Date.now();

    return validPaths;
  }

  private findDirectPaths(source: string, target: string, options: PathfindingOptions): ArbitragePath[] {
    const paths: ArbitragePath[] = [];
    
    // Check if direct connection exists
    if (this.marketGraph.get(source)?.has(target)) {
      paths.push({
        pathId: `DIRECT-${source}-${target}-${Date.now()}`,
        pathType: 'direct',
        nodes: [source, target],
        estimatedProfit: 0.008 + Math.random() * 0.02,
        riskScore: 5 + Math.random() * 10,
        executionComplexity: 2,
        confidence: 0.8 + Math.random() * 0.2,
        status: 'active',
        estimatedDuration: 1000 + Math.random() * 2000,
        slippage: 0.001 + Math.random() * 0.005
      });
    }

    return paths;
  }

  private findTrianglePaths(source: string, target: string, options: PathfindingOptions): ArbitragePath[] {
    const paths: ArbitragePath[] = [];
    const neighbors = this.marketGraph.get(source) || new Set();

    // Find intermediate nodes for triangle arbitrage
    neighbors.forEach(intermediate => {
      if (intermediate !== target && this.marketGraph.get(intermediate)?.has(target)) {
        paths.push({
          pathId: `TRIANGLE-${source}-${intermediate}-${target}-${Date.now()}`,
          pathType: 'triangle',
          nodes: [source, intermediate, target],
          estimatedProfit: 0.015 + Math.random() * 0.025,
          riskScore: 10 + Math.random() * 15,
          executionComplexity: 4 + Math.floor(Math.random() * 3),
          confidence: 0.7 + Math.random() * 0.2,
          status: 'review',
          estimatedDuration: 2000 + Math.random() * 3000,
          slippage: 0.002 + Math.random() * 0.008
        });
      }
    });

    return paths;
  }

  private findMultiHopPaths(source: string, target: string, options: PathfindingOptions): ArbitragePath[] {
    const paths: ArbitragePath[] = [];
    const visited = new Set<string>();
    const currentPath = [source];

    this.dfsMultiHop(source, target, currentPath, visited, options, paths, options.maxHops);

    return paths;
  }

  private dfsMultiHop(
    current: string,
    target: string,
    path: string[],
    visited: Set<string>,
    options: PathfindingOptions,
    paths: ArbitragePath[],
    maxDepth: number
  ): void {
    if (path.length > maxDepth + 1) return; // +1 because path includes source
    if (current === target && path.length >= 3) {
      // Found a valid multi-hop path
      paths.push({
        pathId: `MULTI-${path.join('-')}-${Date.now()}`,
        pathType: 'multi-hop',
        nodes: [...path],
        estimatedProfit: 0.012 + Math.random() * 0.02,
        riskScore: 8 + Math.random() * 12,
        executionComplexity: path.length,
        confidence: 0.75 + Math.random() * 0.15,
        status: 'active',
        estimatedDuration: path.length * (800 + Math.random() * 1200),
        slippage: 0.0015 + Math.random() * 0.006
      });
      return;
    }

    visited.add(current);
    const neighbors = this.marketGraph.get(current) || new Set();

    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        path.push(neighbor);
        this.dfsMultiHop(neighbor, target, path, visited, options, paths, maxDepth);
        path.pop();
      }
    });

    visited.delete(current);
  }

  private findButterflyPaths(source: string, targets: string[], options: PathfindingOptions): ArbitragePath[] {
    const paths: ArbitragePath[] = [];

    // Create complex butterfly paths using multiple targets
    if (targets.length >= 2) {
      paths.push({
        pathId: `BUTTERFLY-${source}-${targets.join('-')}-${Date.now()}`,
        pathType: 'butterfly',
        nodes: [source, ...targets.slice(0, 3), source], // Return to source
        estimatedProfit: 0.02 + Math.random() * 0.03,
        riskScore: 15 + Math.random() * 20,
        executionComplexity: 6 + Math.floor(Math.random() * 4),
        confidence: 0.6 + Math.random() * 0.2,
        status: 'hold',
        estimatedDuration: 4000 + Math.random() * 4000,
        slippage: 0.003 + Math.random() * 0.01
      });
    }

    return paths;
  }

  public getPathDetail(pathId: string): PathDetail | null {
    // Mock path detail generation
    const mockPath: ArbitragePath = {
      pathId,
      pathType: 'triangle',
      nodes: ['nba-ml-warriors-lakers', 'nba-spread-warriors-lakers', 'nba-total-warriors-lakers'],
      estimatedProfit: 0.024,
      riskScore: 18,
      executionComplexity: 6,
      confidence: 0.76,
      status: 'review',
      estimatedDuration: 2500,
      slippage: 0.0045
    };

    const steps: PathStep[] = mockPath.nodes.slice(0, -1).map((node, index) => ({
      stepId: index + 1,
      fromNode: node,
      toNode: mockPath.nodes[index + 1],
      action: index % 2 === 0 ? 'buy' : 'sell',
      amount: 10000 + Math.random() * 50000,
      expectedPrice: 1.5 + Math.random() * 2,
      slippageTolerance: 0.005,
      executionTime: 500 + Math.random() * 1000
    }));

    const riskAnalysis: RiskAnalysis = {
      marketRisk: 8,
      executionRisk: 6,
      liquidityRisk: 4,
      counterpartyRisk: 2,
      totalRisk: 20,
      riskFactors: ['High volatility', 'Low liquidity', 'Network congestion']
    };

    const executionPlan: ExecutionPlan = {
      phases: [
        {
          phaseId: 1,
          description: 'Initial position setup',
          duration: 1000,
          dependencies: [],
          actions: ['Approve tokens', 'Initial swap']
        },
        {
          phaseId: 2,
          description: 'Arbitrage execution',
          duration: 1500,
          dependencies: [1],
          actions: ['Execute swaps', 'Monitor prices']
        },
        {
          phaseId: 3,
          description: 'Profit realization',
          duration: 500,
          dependencies: [2],
          actions: ['Final swap', 'Claim profits']
        }
      ],
      totalDuration: 3000,
      criticalPath: ['nba-ml-warriors-lakers', 'nba-spread-warriors-lakers'],
      rollbackPlan: ['Reverse initial swap', 'Claim partial profits']
    };

    const profitability: ProfitabilityBreakdown = {
      grossProfit: 240,
      estimatedFees: 45,
      slippageCost: 18,
      netProfit: 177,
      profitMargin: 2.4,
      breakEvenPoint: 0.5
    };

    return {
      path: mockPath,
      steps,
      riskAnalysis,
      executionPlan,
      profitability
    };
  }

  public getMarketGraph(): Map<string, Set<string>> {
    return new Map(this.marketGraph);
  }

  public updateMarketGraph(newConnections: [string, string][]): void {
    newConnections.forEach(([from, to]) => {
      this.addConnection(from, to);
    });
    
    // Clear cache since graph changed
    this.pathCache.clear();
  }

  public clearCache(): void {
    this.pathCache.clear();
  }

  public getPathfinderStats(): any {
    return {
      totalMarkets: this.marketGraph.size,
      totalConnections: Array.from(this.marketGraph.values())
        .reduce((sum, connections) => sum + connections.size, 0) / 2, // Divide by 2 since connections are bidirectional
      cachedPaths: this.pathCache.size,
      lastScanTime: new Date(this.lastScanTime),
      averagePathComplexity: 4.2
    };
  }
}

/**
 * @fileoverview Enhanced Cross-Reference Index Builder
 * @description Graph-based reference tracking with visualization
 * @module audit/enhanced/cross-reference-builder
 */

/**
 * Reference graph node
 */
export interface ReferenceNode {
	id: string;
	type: string;
	metadata: Record<string, any>;
}

/**
 * Reference graph edge
 */
export interface ReferenceEdge {
	from: string;
	to: string;
	type: string;
	weight?: number;
}

/**
 * Reference graph
 */
export interface ReferenceGraph {
	nodes: ReferenceNode[];
	edges: ReferenceEdge[];
	metadata: {
		totalNodes: number;
		totalEdges: number;
		density: number;
		cycles: CircularReference[];
	};
}

/**
 * Circular reference
 */
export interface CircularReference {
	chain: string[];
	severity: "low" | "medium" | "high";
	breaking: boolean;
	suggestions: string[];
}

/**
 * Visualization
 */
export interface Visualization {
	dot: string;
	svg?: string;
	interactive?: any;
	metrics: VisualizationMetrics;
}

/**
 * Visualization metrics
 */
export interface VisualizationMetrics {
	nodeCount: number;
	edgeCount: number;
	averageDegree: number;
	maxDepth: number;
}

/**
 * Graph validator
 */
export class GraphValidator {
	validate(graph: ReferenceGraph): boolean {
		// Basic validation
		return graph.nodes.length > 0 && graph.edges.length >= 0;
	}
}

/**
 * Enhanced Cross-Reference Index Builder
 */
export class CrossReferenceIndexBuilder {
	private graph: ReferenceGraph = {
		nodes: [],
		edges: [],
		metadata: {
			totalNodes: 0,
			totalEdges: 0,
			density: 0,
			cycles: [],
		},
	};

	private index: Map<string, ReferenceNode> = new Map();
	private validator: GraphValidator = new GraphValidator();

	/**
	 * Build reference graph
	 */
	async buildReferenceGraph(matches: any[]): Promise<ReferenceGraph> {
		const nodes = this.createNodes(matches);
		const edges = this.createEdges(matches);

		this.graph = {
			nodes,
			edges,
			metadata: {
				totalNodes: nodes.length,
				totalEdges: edges.length,
				density: this.calculateDensity(nodes, edges),
				cycles: await this.detectCycles(nodes, edges),
			},
		};

		return this.graph;
	}

	/**
	 * Create nodes from matches
	 */
	private createNodes(matches: any[]): ReferenceNode[] {
		const nodeMap = new Map<string, ReferenceNode>();

		for (const match of matches) {
			const id = match.pattern || match.number || match.id;
			if (id && !nodeMap.has(id)) {
				const node: ReferenceNode = {
					id,
					type: match.type || "unknown",
					metadata: {
						file: match.file,
						line: match.line,
						column: match.column,
					},
				};
				nodeMap.set(id, node);
				this.index.set(id, node);
			}
		}

		return Array.from(nodeMap.values());
	}

	/**
	 * Create edges from matches
	 */
	private createEdges(matches: any[]): ReferenceEdge[] {
		const edges: ReferenceEdge[] = [];
		const edgeSet = new Set<string>();

		for (const match of matches) {
			if (match.references && Array.isArray(match.references)) {
				for (const ref of match.references) {
					const edgeKey = `${match.pattern || match.number}->${ref}`;
					if (!edgeSet.has(edgeKey)) {
						edges.push({
							from: match.pattern || match.number,
							to: ref,
							type: "reference",
							weight: 1,
						});
						edgeSet.add(edgeKey);
					}
				}
			}
		}

		return edges;
	}

	/**
	 * Calculate graph density
	 */
	private calculateDensity(
		nodes: ReferenceNode[],
		edges: ReferenceEdge[],
	): number {
		if (nodes.length === 0) return 0;
		const maxEdges = nodes.length * (nodes.length - 1);
		return maxEdges > 0 ? edges.length / maxEdges : 0;
	}

	/**
	 * Detect cycles
	 */
	private async detectCycles(
		nodes: ReferenceNode[],
		edges: ReferenceEdge[],
	): Promise<CircularReference[]> {
		const cycles: CircularReference[] = [];
		const visited = new Set<string>();
		const recStack = new Set<string>();

		const adjList = new Map<string, string[]>();
		for (const edge of edges) {
			if (!adjList.has(edge.from)) {
				adjList.set(edge.from, []);
			}
			adjList.get(edge.from)!.push(edge.to);
		}

		const dfs = (node: string, path: string[]): void => {
			visited.add(node);
			recStack.add(node);
			path.push(node);

			const neighbors = adjList.get(node) || [];
			for (const neighbor of neighbors) {
				if (!visited.has(neighbor)) {
					dfs(neighbor, [...path]);
				} else if (recStack.has(neighbor)) {
					// Cycle detected
					const cycleStart = path.indexOf(neighbor);
					const cycle = path.slice(cycleStart).concat([neighbor]);
					cycles.push({
						chain: cycle,
						severity: this.calculateCycleSeverity(cycle),
						breaking: this.isBreakingCycle(cycle),
						suggestions: this.generateFixSuggestions(cycle),
					});
				}
			}

			recStack.delete(node);
		};

		for (const node of nodes) {
			if (!visited.has(node.id)) {
				dfs(node.id, []);
			}
		}

		return cycles;
	}

	/**
	 * Calculate cycle severity
	 */
	private calculateCycleSeverity(cycle: string[]): "low" | "medium" | "high" {
		if (cycle.length <= 3) return "low";
		if (cycle.length <= 5) return "medium";
		return "high";
	}

	/**
	 * Check if cycle is breaking
	 */
	private isBreakingCycle(cycle: string[]): boolean {
		// Simple heuristic: longer cycles are more likely to be breaking
		return cycle.length > 5;
	}

	/**
	 * Generate fix suggestions
	 */
	private generateFixSuggestions(cycle: string[]): string[] {
		return [
			`Break circular dependency between: ${cycle.join(" -> ")}`,
			"Consider introducing an intermediate abstraction",
			"Review dependency direction and refactor if needed",
		];
	}

	/**
	 * Detect circular references
	 */
	async detectCircularReferences(): Promise<CircularReference[]> {
		return this.graph.metadata.cycles;
	}

	/**
	 * Generate visualization
	 */
	async generateVisualization(): Promise<Visualization> {
		const dotGraph = this.generateDotGraph();
		const metrics = this.calculateVisualizationMetrics();

		return {
			dot: dotGraph,
			metrics,
		};
	}

	/**
	 * Generate DOT graph
	 */
	private generateDotGraph(): string {
		const lines: string[] = ["digraph ReferenceGraph {"];

		// Add nodes
		for (const node of this.graph.nodes) {
			lines.push(`  "${node.id}" [label="${node.id}", type="${node.type}"];`);
		}

		// Add edges
		for (const edge of this.graph.edges) {
			const weight = edge.weight ? ` [weight=${edge.weight}]` : "";
			lines.push(`  "${edge.from}" -> "${edge.to}"${weight};`);
		}

		lines.push("}");
		return lines.join("\n");
	}

	/**
	 * Calculate visualization metrics
	 */
	private calculateVisualizationMetrics(): VisualizationMetrics {
		const nodeCount = this.graph.nodes.length;
		const edgeCount = this.graph.edges.length;

		// Calculate average degree
		const degreeMap = new Map<string, number>();
		for (const edge of this.graph.edges) {
			degreeMap.set(edge.from, (degreeMap.get(edge.from) || 0) + 1);
			degreeMap.set(edge.to, (degreeMap.get(edge.to) || 0) + 1);
		}

		const degrees = Array.from(degreeMap.values());
		const averageDegree =
			degrees.length > 0
				? degrees.reduce((a, b) => a + b, 0) / degrees.length
				: 0;

		// Calculate max depth (simplified)
		const maxDepth = this.calculateMaxDepth();

		return {
			nodeCount,
			edgeCount,
			averageDegree,
			maxDepth,
		};
	}

	/**
	 * Calculate max depth
	 */
	private calculateMaxDepth(): number {
		// Simplified depth calculation
		const visited = new Set<string>();
		let maxDepth = 0;

		const dfs = (node: string, depth: number): void => {
			if (visited.has(node)) return;
			visited.add(node);
			maxDepth = Math.max(maxDepth, depth);

			for (const edge of this.graph.edges) {
				if (edge.from === node) {
					dfs(edge.to, depth + 1);
				}
			}
		};

		for (const node of this.graph.nodes) {
			if (!visited.has(node.id)) {
				dfs(node.id, 0);
			}
		}

		return maxDepth;
	}
}

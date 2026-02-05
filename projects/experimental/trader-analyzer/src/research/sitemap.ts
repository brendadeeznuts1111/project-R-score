/**
 * Node Sitemap & Manifest Generator
 *
 * Generates hierarchical sitemap of sub-market nodes showing:
 * - Parent-child relationships
 * - Tension events between nodes
 * - Node properties and types
 * - Graph traversal paths
 */

import type { Database } from "bun:sqlite";
import type { TensionEvent } from "./tension/tension-detector.js";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface NodeManifest {
	nodeId: string;
	eventId: string;
	marketId: string;
	bookmaker: string;
	period: string;
	baseLineType: string;
	parentNodeId: string | null;
	children: NodeManifest[];
	properties: {
		impliedVolume: number | null;
		numberOfMoves: number;
		velocity: number;
		juiceVolatility: number;
		arbitragePressure: number;
		tensionScore: number;
		lastLine: number | null;
		lastOdds: number | null;
		lastMoveTimestamp: number | null;
	};
	tensions: TensionEvent[];
	edges: Array<{
		edgeId: string;
		toNodeId: string;
		relationshipType: string;
		correlationCoefficient: number | null;
		confidence: number;
	}>;
	depth: number;
	path: string[]; // Path from root to this node
}

export interface Sitemap {
	eventId: string;
	rootNodes: NodeManifest[];
	totalNodes: number;
	totalTensions: number;
	maxDepth: number;
	generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// SITEMAP GENERATOR
// ═══════════════════════════════════════════════════════════════

export class NodeSitemapGenerator {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Get active tensions for an event (direct DB query)
	 */
	private getActiveTensions(eventId: string): TensionEvent[] {
		const stmt = this.db.prepare(`
			SELECT 
				tensionId,
				tension_type,
				severity,
				involved_nodes,
				snapshot
			FROM sub_market_tension_events
			WHERE eventId = ?
				AND resolved_at IS NULL
			ORDER BY detected_at DESC
			LIMIT 100
		`);
		const tensions = stmt.all(eventId) as Array<{
			tensionId: number;
			tension_type: string;
			severity: number;
			involved_nodes: string;
			snapshot: string;
		}>;

		return tensions.map((t) => ({
			tensionId: t.tensionId,
			tension_type: t.tension_type,
			severity: t.severity,
			nodes: JSON.parse(t.involved_nodes),
			snapshot: JSON.parse(t.snapshot),
		}));
	}

	/**
	 * Generate complete sitemap for an event
	 */
	generateSitemap(eventId: string): Sitemap {
		// Get all nodes for event
		const nodesStmt = this.db.prepare(`
			SELECT 
				nodeId, eventId, marketId, bookmaker, period,
				base_line_type, parent_node_id,
				implied_volume, number_of_moves, velocity,
				juice_volatility, arbitrage_pressure, tension_score,
				last_line, last_odds, last_move_timestamp
			FROM sub_market_nodes
			WHERE eventId = ?
			ORDER BY period, bookmaker, marketId
		`);

		const rawNodes = nodesStmt.all(eventId) as Array<{
			nodeId: string;
			eventId: string;
			marketId: string;
			bookmaker: string;
			period: string;
			base_line_type: string;
			parent_node_id: string | null;
			implied_volume: number | null;
			number_of_moves: number;
			velocity: number;
			juice_volatility: number;
			arbitrage_pressure: number;
			tension_score: number;
			last_line: number | null;
			last_odds: number | null;
			last_move_timestamp: number | null;
		}>;

		// Get all edges for nodes in this event
		const edgesStmt = this.db.prepare(`
			SELECT 
				edgeId, fromNodeId, toNodeId,
				relationship_type, correlation_coefficient, confidence
			FROM sub_market_edges
			WHERE fromNodeId IN (
				SELECT nodeId FROM sub_market_nodes WHERE eventId = ?
			) OR toNodeId IN (
				SELECT nodeId FROM sub_market_nodes WHERE eventId = ?
			)
		`);

		const rawEdges = edgesStmt.all(eventId, eventId) as Array<{
			edgeId: string;
			fromNodeId: string;
			toNodeId: string;
			relationship_type: string;
			correlation_coefficient: number | null;
			confidence: number;
		}>;

		// Get active tensions
		const tensions = this.getActiveTensions(eventId);

		// Build node map
		const nodeMap = new Map<string, NodeManifest>();

		// Create manifest entries
		for (const node of rawNodes) {
			const manifest: NodeManifest = {
				nodeId: node.nodeId,
				eventId: node.eventId,
				marketId: node.marketId,
				bookmaker: node.bookmaker,
				period: node.period,
				baseLineType: node.base_line_type,
				parentNodeId: node.parent_node_id,
				children: [],
				properties: {
					impliedVolume: node.implied_volume,
					numberOfMoves: node.number_of_moves,
					velocity: node.velocity,
					juiceVolatility: node.juice_volatility,
					arbitragePressure: node.arbitrage_pressure,
					tensionScore: node.tension_score,
					lastLine: node.last_line,
					lastOdds: node.last_odds,
					lastMoveTimestamp: node.last_move_timestamp,
				},
				tensions: tensions.filter((t) => t.nodes.includes(node.nodeId)),
				edges: rawEdges
					.filter((e) => e.fromNodeId === node.nodeId)
					.map((e) => ({
						edgeId: e.edgeId,
						toNodeId: e.toNodeId,
						relationshipType: e.relationship_type,
						correlationCoefficient: e.correlation_coefficient,
						confidence: e.confidence,
					})),
				depth: 0,
				path: [],
			};

			nodeMap.set(node.nodeId, manifest);
		}

		// Build parent-child relationships
		const rootNodes: NodeManifest[] = [];

		for (const [nodeId, manifest] of nodeMap) {
			if (manifest.parentNodeId) {
				const parent = nodeMap.get(manifest.parentNodeId);
				if (parent) {
					parent.children.push(manifest);
				} else {
					// Parent not found, treat as root
					rootNodes.push(manifest);
				}
			} else {
				// No parent, this is a root node
				rootNodes.push(manifest);
			}
		}

		// Calculate depths and paths
		const calculateDepth = (
			node: NodeManifest,
			depth: number = 0,
			path: string[] = [],
		): void => {
			node.depth = depth;
			node.path = [...path, node.nodeId];

			for (const child of node.children) {
				calculateDepth(child, depth + 1, node.path);
			}
		};

		for (const root of rootNodes) {
			calculateDepth(root);
		}

		// Find max depth
		const maxDepth = Math.max(
			...Array.from(nodeMap.values()).map((n) => n.depth),
			0,
		);

		return {
			eventId,
			rootNodes,
			totalNodes: nodeMap.size,
			totalTensions: tensions.length,
			maxDepth,
			generatedAt: new Date().toISOString(),
		};
	}

	/**
	 * Get node tree as nested structure
	 */
	getNodeTree(eventId: string): NodeManifest[] {
		const sitemap = this.generateSitemap(eventId);
		return sitemap.rootNodes;
	}

	/**
	 * Find all child nodes recursively
	 */
	getAllChildren(nodeId: string, eventId: string): NodeManifest[] {
		const sitemap = this.generateSitemap(eventId);
		const nodeMap = new Map<string, NodeManifest>();

		const flatten = (nodes: NodeManifest[]): void => {
			for (const node of nodes) {
				nodeMap.set(node.nodeId, node);
				flatten(node.children);
			}
		};

		flatten(sitemap.rootNodes);

		const targetNode = nodeMap.get(nodeId);
		if (!targetNode) {
			return [];
		}

		const children: NodeManifest[] = [];

		const collectChildren = (node: NodeManifest): void => {
			for (const child of node.children) {
				children.push(child);
				collectChildren(child);
			}
		};

		collectChildren(targetNode);
		return children;
	}

	/**
	 * Get nodes with tensions
	 */
	getTensionNodes(eventId: string): NodeManifest[] {
		const sitemap = this.generateSitemap(eventId);
		const allNodes: NodeManifest[] = [];

		const flatten = (nodes: NodeManifest[]): void => {
			for (const node of nodes) {
				allNodes.push(node);
				flatten(node.children);
			}
		};

		flatten(sitemap.rootNodes);

		return allNodes.filter((n) => n.tensions.length > 0);
	}

	/**
	 * Get node path (breadcrumb trail)
	 */
	getNodePath(nodeId: string, eventId: string): NodeManifest[] {
		const sitemap = this.generateSitemap(eventId);
		const nodeMap = new Map<string, NodeManifest>();

		const flatten = (nodes: NodeManifest[]): void => {
			for (const node of nodes) {
				nodeMap.set(node.nodeId, node);
				flatten(node.children);
			}
		};

		flatten(sitemap.rootNodes);

		const node = nodeMap.get(nodeId);
		if (!node) {
			return [];
		}

		const path: NodeManifest[] = [];

		// Walk up the tree
		let current: NodeManifest | null = node;
		while (current) {
			path.unshift(current);
			if (current.parentNodeId) {
				current = nodeMap.get(current.parentNodeId) || null;
			} else {
				current = null;
			}
		}

		return path;
	}
}

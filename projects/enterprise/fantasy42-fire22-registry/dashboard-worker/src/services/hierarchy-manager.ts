/**
 * 🏢 Fire22 Dashboard - Hierarchy Manager Service
 * Centralized management for the unified hierarchy system
 */

import {
  UnifiedHierarchyNode,
  UniversalLevel,
  UnifiedPermission,
  HierarchyTree,
  HierarchyQueryOptions,
  HierarchyUpdateRequest,
  HierarchyMigration,
  HierarchyAnalytics,
  ValidationResult,
  Fire22AgentMapping,
  OrganizationalMapping,
  LevelDescriptors,
  PermissionAction,
  PermissionScope,
  getEffectiveLevel,
} from '../types/hierarchy/unified';

export class HierarchyManager {
  private nodes: Map<string, UnifiedHierarchyNode>;
  private tree: HierarchyTree | null;
  private cache: Map<string, any>;
  private readonly cacheTimeout = 300000; // 5 minutes

  constructor() {
    this.nodes = new Map();
    this.tree = null;
    this.cache = new Map();
  }

  /**
   * Initialize hierarchy from database or API
   */
  async initialize(data?: UnifiedHierarchyNode[]): Promise<void> {
    if (data) {
      this.loadNodes(data);
    } else {
      await this.fetchHierarchyData();
    }
    this.buildTree();
  }

  /**
   * Load nodes into the manager
   */
  private loadNodes(nodes: UnifiedHierarchyNode[]): void {
    this.nodes.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
  }

  /**
   * Fetch hierarchy data from API
   */
  private async fetchHierarchyData(): Promise<void> {
    try {
      const response = await fetch('/api/hierarchy/unified');
      if (!response.ok) throw new Error('Failed to fetch hierarchy data');

      const data = await response.json();
      this.loadNodes(data.nodes || []);
    } catch (error) {
      console.error('Error fetching hierarchy data:', error);
      throw error;
    }
  }

  /**
   * Build the hierarchy tree structure
   */
  private buildTree(): void {
    const edges: Array<{ from: string; to: string; type: string }> = [];
    let root: UnifiedHierarchyNode | null = null;
    let maxDepth = 0;
    const departments = new Set<string>();

    // Find root and build edges
    this.nodes.forEach(node => {
      if (!node.parentId) {
        root = node;
      }

      departments.add(node.department);

      // Create edges for reporting relationships
      if (node.parentId) {
        edges.push({
          from: node.parentId,
          to: node.id,
          type: 'reports_to',
        });
      }

      // Calculate max depth
      const depth = this.getNodeDepth(node.id);
      if (depth > maxDepth) maxDepth = depth;
    });

    if (!root) {
      // If no single root, create a virtual root
      root = this.createVirtualRoot();
    }

    this.tree = {
      root,
      nodes: this.nodes,
      edges,
      metadata: {
        totalNodes: this.nodes.size,
        maxDepth,
        departments: Array.from(departments),
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  /**
   * Create a virtual root node for multi-root hierarchies
   */
  private createVirtualRoot(): UnifiedHierarchyNode {
    return {
      id: 'root',
      name: 'Organization',
      level: UniversalLevel.EXECUTIVE,
      title: 'Virtual Root',
      department: 'Organization',
      parentId: null,
      children: Array.from(this.nodes.values())
        .filter(n => !n.parentId)
        .map(n => n.id),
      permissions: [],
      reportingTo: [],
      directReports: [],
      mappings: {},
    };
  }

  /**
   * Get node depth in the hierarchy
   */
  private getNodeDepth(nodeId: string, visited = new Set<string>()): number {
    if (visited.has(nodeId)) return 0; // Circular reference protection
    visited.add(nodeId);

    const node = this.nodes.get(nodeId);
    if (!node || !node.parentId) return 0;

    return 1 + this.getNodeDepth(node.parentId, visited);
  }

  /**
   * Query nodes based on criteria
   */
  query(options: HierarchyQueryOptions): UnifiedHierarchyNode[] {
    const cacheKey = JSON.stringify(options);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.timestamp + this.cacheTimeout > Date.now()) {
        return cached.data;
      }
    }

    let results = Array.from(this.nodes.values());

    // Apply filters
    if (options.level !== undefined) {
      results = results.filter(n => n.level === options.level);
    }

    if (options.department) {
      results = results.filter(n => n.department === options.department);
    }

    if (options.filter) {
      results = results.filter(options.filter);
    }

    // Include related nodes
    if (options.includeChildren || options.includeParents) {
      const expanded = new Set<UnifiedHierarchyNode>();

      for (const node of results) {
        expanded.add(node);

        if (options.includeChildren) {
          this.getDescendants(node.id, options.maxDepth).forEach(n => expanded.add(n));
        }

        if (options.includeParents) {
          this.getAncestors(node.id).forEach(n => expanded.add(n));
        }
      }

      results = Array.from(expanded);
    }

    // Cache results
    this.cache.set(cacheKey, { data: results, timestamp: Date.now() });

    return results;
  }

  /**
   * Get all descendants of a node
   */
  getDescendants(nodeId: string, maxDepth?: number, currentDepth = 0): UnifiedHierarchyNode[] {
    if (maxDepth && currentDepth >= maxDepth) return [];

    const node = this.nodes.get(nodeId);
    if (!node) return [];

    const descendants: UnifiedHierarchyNode[] = [];

    for (const childId of node.children) {
      const child = this.nodes.get(childId);
      if (child) {
        descendants.push(child);
        descendants.push(...this.getDescendants(childId, maxDepth, currentDepth + 1));
      }
    }

    return descendants;
  }

  /**
   * Get all ancestors of a node
   */
  getAncestors(nodeId: string): UnifiedHierarchyNode[] {
    const ancestors: UnifiedHierarchyNode[] = [];
    let current = this.nodes.get(nodeId);

    while (current && current.parentId) {
      const parent = this.nodes.get(current.parentId);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Update a hierarchy node
   */
  async updateNode(request: HierarchyUpdateRequest): Promise<UnifiedHierarchyNode> {
    const node = this.nodes.get(request.nodeId);
    if (!node) {
      throw new Error(`Node ${request.nodeId} not found`);
    }

    // Validate the update
    const validation = this.validateUpdate(node, request.updates);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Apply updates
    const updatedNode = { ...node, ...request.updates };

    // Update children if requested
    if (request.updateChildren && request.updates.department) {
      for (const childId of node.children) {
        const child = this.nodes.get(childId);
        if (child) {
          child.department = request.updates.department;
        }
      }
    }

    // Save to database
    await this.saveNode(updatedNode, request.auditInfo);

    // Update local state
    this.nodes.set(request.nodeId, updatedNode);
    this.clearCache();
    this.buildTree();

    return updatedNode;
  }

  /**
   * Validate node update
   */
  private validateUpdate(
    node: UnifiedHierarchyNode,
    updates: Partial<UnifiedHierarchyNode>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check level changes
    if (updates.level !== undefined) {
      // Ensure no level inversions with parent
      if (node.parentId) {
        const parent = this.nodes.get(node.parentId);
        if (parent && updates.level <= parent.level) {
          errors.push('Child level must be lower than parent level');
        }
      }

      // Ensure no level inversions with children
      for (const childId of node.children) {
        const child = this.nodes.get(childId);
        if (child && updates.level >= child.level) {
          errors.push('Parent level must be higher than child level');
        }
      }
    }

    // Check for circular references
    if (updates.parentId) {
      if (updates.parentId === node.id) {
        errors.push('Node cannot be its own parent');
      }

      const ancestors = this.getAncestors(updates.parentId);
      if (ancestors.some(a => a.id === node.id)) {
        errors.push('Update would create circular reference');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Save node to database
   */
  private async saveNode(node: UnifiedHierarchyNode, auditInfo: any): Promise<void> {
    try {
      const response = await fetch(`/api/hierarchy/unified/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node, auditInfo }),
      });

      if (!response.ok) {
        throw new Error('Failed to save node');
      }
    } catch (error) {
      console.error('Error saving node:', error);
      throw error;
    }
  }

  /**
   * Migrate from legacy hierarchy systems
   */
  async migrate(migration: HierarchyMigration): Promise<void> {
    try {
      migration.status = 'in_progress';

      switch (migration.sourceSystem) {
        case 'fire22':
          await this.migrateFire22Hierarchy(migration);
          break;
        case 'organizational':
          await this.migrateOrganizationalHierarchy(migration);
          break;
        case 'department':
          await this.migrateDepartmentHierarchy(migration);
          break;
        default:
          throw new Error(`Unknown source system: ${migration.sourceSystem}`);
      }

      migration.status = 'completed';
    } catch (error) {
      migration.status = 'failed';
      migration.errors = migration.errors || [];
      migration.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Migrate Fire22 agent hierarchy
   */
  private async migrateFire22Hierarchy(migration: HierarchyMigration): Promise<void> {
    const response = await fetch('/api/agents/hierarchy');
    const agents = await response.json();

    for (const agent of agents) {
      const level = Fire22AgentMapping[agent.level] || UniversalLevel.STAFF;

      const node: UnifiedHierarchyNode = {
        id: `fire22_${agent.agentId}`,
        name: agent.name,
        level,
        title: agent.role || LevelDescriptors[level],
        department: agent.department || 'Sales',
        parentId: agent.parentId ? `fire22_${agent.parentId}` : null,
        children: agent.children ? agent.children.map((c: string) => `fire22_${c}`) : [],
        permissions: this.convertPermissions(agent.permissions),
        reportingTo: [agent.parentId].filter(Boolean),
        directReports: agent.children || [],
        mappings: {
          fire22AgentLevel: agent.level,
          customAttributes: agent,
        },
      };

      this.nodes.set(node.id, node);
    }
  }

  /**
   * Migrate organizational hierarchy
   */
  private async migrateOrganizationalHierarchy(migration: HierarchyMigration): Promise<void> {
    // Implementation for organizational hierarchy migration
    console.log('Migrating organizational hierarchy...');
  }

  /**
   * Migrate department hierarchy
   */
  private async migrateDepartmentHierarchy(migration: HierarchyMigration): Promise<void> {
    // Implementation for department hierarchy migration
    console.log('Migrating department hierarchy...');
  }

  /**
   * Convert legacy permissions to unified format
   */
  private convertPermissions(legacyPermissions: any[]): UnifiedPermission[] {
    if (!legacyPermissions) return [];

    return legacyPermissions.map(p => ({
      resource: p.resource || 'unknown',
      actions: p.actions || [PermissionAction.READ],
      scope: p.scope || PermissionScope.SELF,
      conditions: p.conditions,
      inherited: p.inherited || false,
      expiresAt: p.expiresAt,
    }));
  }

  /**
   * Get analytics for the hierarchy
   */
  getAnalytics(): HierarchyAnalytics {
    const levelDistribution: Record<UniversalLevel, number> = {
      [UniversalLevel.EXECUTIVE]: 0,
      [UniversalLevel.DIRECTOR]: 0,
      [UniversalLevel.MANAGER]: 0,
      [UniversalLevel.SENIOR_STAFF]: 0,
      [UniversalLevel.STAFF]: 0,
    };

    const departmentDistribution: Record<string, number> = {};
    const spanOfControls: number[] = [];
    const orphanedNodes: string[] = [];
    const circularReferences: Array<{ nodeId: string; path: string[] }> = [];

    this.nodes.forEach(node => {
      // Level distribution
      levelDistribution[node.level]++;

      // Department distribution
      departmentDistribution[node.department] = (departmentDistribution[node.department] || 0) + 1;

      // Span of control
      if (node.children.length > 0) {
        spanOfControls.push(node.children.length);
      }

      // Orphaned nodes (excluding root)
      if (
        (!node.parentId && node.id !== 'root' && !this.tree?.root) ||
        this.tree?.root.id !== node.id
      ) {
        orphanedNodes.push(node.id);
      }

      // Circular references
      const path = this.detectCircularReference(node.id);
      if (path.length > 0) {
        circularReferences.push({ nodeId: node.id, path });
      }
    });

    const avgSpanOfControl =
      spanOfControls.length > 0
        ? spanOfControls.reduce((a, b) => a + b, 0) / spanOfControls.length
        : 0;

    // Calculate compliance score (0-100)
    const complianceScore = this.calculateComplianceScore(orphanedNodes, circularReferences);

    return {
      levelDistribution,
      departmentDistribution,
      avgSpanOfControl,
      orphanedNodes,
      circularReferences,
      complianceScore,
    };
  }

  /**
   * Detect circular references in hierarchy
   */
  private detectCircularReference(
    nodeId: string,
    visited = new Set<string>(),
    path: string[] = []
  ): string[] {
    if (visited.has(nodeId)) {
      return [...path, nodeId];
    }

    visited.add(nodeId);
    path.push(nodeId);

    const node = this.nodes.get(nodeId);
    if (!node || !node.parentId) return [];

    return this.detectCircularReference(node.parentId, visited, path);
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(orphanedNodes: string[], circularRefs: any[]): number {
    let score = 100;

    // Deduct for orphaned nodes
    score -= orphanedNodes.length * 5;

    // Deduct for circular references
    score -= circularRefs.length * 10;

    // Deduct if no root
    if (!this.tree?.root) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * Export hierarchy data
   */
  exportHierarchy(): any {
    return {
      nodes: Array.from(this.nodes.values()),
      tree: this.tree,
      analytics: this.getAnalytics(),
      exportDate: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const hierarchyManager = new HierarchyManager();

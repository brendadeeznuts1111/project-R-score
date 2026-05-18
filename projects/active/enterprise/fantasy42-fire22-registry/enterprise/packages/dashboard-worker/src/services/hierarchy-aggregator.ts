/**
 * 🏢 Fire22 Dashboard - Hierarchy Aggregator Service
 * Natural hierarchy aggregation that respects existing systems while providing unified access
 */

import { AgentHierarchy } from '../types/business/index';

// Flexible hierarchy node that can represent any system
export interface AggregatedHierarchyNode {
  // Core identification
  id: string;
  name: string;
  title: string;
  department: string;

  // Natural hierarchy (not forced levels)
  parentId?: string;
  children: string[];
  depth: number;

  // Source system information
  sourceSystem: 'fire22' | 'organizational' | 'department';
  sourceData: any; // Original data preserved

  // Natural relationships
  reportsTo: string[];
  manages: string[];
  collaboratesWith: string[];

  // Contextual information
  context: {
    isLeadership: boolean;
    isManager: boolean;
    isContributor: boolean;
    hasDirectReports: boolean;
    permissions?: string[];
    specializations?: string[];
  };

  // Metrics (optional, varies by system)
  metrics?: {
    teamSize?: number;
    implementations?: number;
    efficiency?: string;
    performance?: number;
    customMetrics?: Record<string, any>;
  };

  // Cross-system references (natural links, not forced mapping)
  references?: {
    fire22AgentId?: string;
    employeeId?: string;
    departmentRoleId?: string;
    aliases?: string[]; // Other names this person might be known by
  };
}

// Aggregated view that combines all systems naturally
export interface AggregatedHierarchy {
  // Multiple roots allowed (natural organizational reality)
  roots: AggregatedHierarchyNode[];
  nodes: Map<string, AggregatedHierarchyNode>;

  // System-specific views
  fire22View: AggregatedHierarchyNode[];
  organizationalView: AggregatedHierarchyNode[];
  departmentViews: Record<string, AggregatedHierarchyNode[]>;

  // Natural groupings
  leadership: AggregatedHierarchyNode[];
  managers: AggregatedHierarchyNode[];
  contributors: AggregatedHierarchyNode[];

  // Cross-references and connections
  crossReferences: Array<{
    nodeId: string;
    relatedNodes: string[];
    relationship: string;
    confidence: number; // How confident we are about this connection
  }>;

  // Metadata
  lastUpdated: string;
  sources: Array<{
    system: string;
    lastSync: string;
    nodeCount: number;
  }>;
}

export class HierarchyAggregator {
  private aggregated: AggregatedHierarchy | null = null;
  private sourceData: Map<string, any> = new Map();

  constructor() {
    this.initializeAggregator();
  }

  private async initializeAggregator(): Promise<void> {
    // Load data from all sources without forcing integration
    await this.loadSourceSystems();
    this.buildNaturalAggregation();
  }

  /**
   * Load data from all source systems independently
   */
  private async loadSourceSystems(): Promise<void> {
    try {
      // Load Fire22 agent hierarchy (preserve 8-level structure)
      const fire22Data = await this.loadFire22Hierarchy();
      this.sourceData.set('fire22', fire22Data);

      // Load organizational structure (preserve as-is)
      const orgData = await this.loadOrganizationalHierarchy();
      this.sourceData.set('organizational', orgData);

      // Load department hierarchies (preserve department-specific structures)
      const deptData = await this.loadDepartmentHierarchies();
      this.sourceData.set('departments', deptData);
    } catch (error) {
      console.error('Error loading source systems:', error);
    }
  }

  /**
   * Build natural aggregation without forcing unified structure
   */
  private buildNaturalAggregation(): void {
    const nodes = new Map<string, AggregatedHierarchyNode>();
    const crossReferences: any[] = [];

    // Process each system naturally
    this.processFire22System(nodes);
    this.processOrganizationalSystem(nodes);
    this.processDepartmentSystems(nodes);

    // Find natural connections (don't force them)
    this.discoverNaturalConnections(nodes, crossReferences);

    // Group by natural roles (emergent, not prescribed)
    const groupings = this.createNaturalGroupings(nodes);

    this.aggregated = {
      roots: this.findNaturalRoots(nodes),
      nodes,
      fire22View: Array.from(nodes.values()).filter(n => n.sourceSystem === 'fire22'),
      organizationalView: Array.from(nodes.values()).filter(
        n => n.sourceSystem === 'organizational'
      ),
      departmentViews: this.groupByDepartment(nodes),
      leadership: groupings.leadership,
      managers: groupings.managers,
      contributors: groupings.contributors,
      crossReferences,
      lastUpdated: new Date().toISOString(),
      sources: [
        {
          system: 'fire22',
          lastSync: new Date().toISOString(),
          nodeCount: this.countBySource(nodes, 'fire22'),
        },
        {
          system: 'organizational',
          lastSync: new Date().toISOString(),
          nodeCount: this.countBySource(nodes, 'organizational'),
        },
        {
          system: 'departments',
          lastSync: new Date().toISOString(),
          nodeCount: this.countBySource(nodes, 'department'),
        },
      ],
    };
  }

  /**
   * Process Fire22 system while preserving its 8-level structure
   */
  private processFire22System(nodes: Map<string, AggregatedHierarchyNode>): void {
    const fire22Data = this.sourceData.get('fire22') || [];

    for (const agent of fire22Data) {
      const node: AggregatedHierarchyNode = {
        id: `fire22_${agent.agentId}`,
        name: agent.name,
        title: this.getFire22Title(agent.level),
        department: agent.department || 'Sales',
        parentId: agent.parentId ? `fire22_${agent.parentId}` : undefined,
        children: (agent.children || []).map((c: string) => `fire22_${c}`),
        depth: this.calculateDepth(agent.level, 'fire22'),
        sourceSystem: 'fire22',
        sourceData: agent,
        reportsTo: agent.parentId ? [`fire22_${agent.parentId}`] : [],
        manages: (agent.children || []).map((c: string) => `fire22_${c}`),
        collaboratesWith: [],
        context: {
          isLeadership: agent.level <= 2,
          isManager: agent.level <= 4,
          isContributor: agent.level >= 5,
          hasDirectReports: (agent.children || []).length > 0,
          permissions: agent.permissions,
          specializations: agent.specializations,
        },
        references: {
          fire22AgentId: agent.agentId,
        },
      };

      nodes.set(node.id, node);
    }
  }

  /**
   * Process organizational system while preserving its structure
   */
  private processOrganizationalSystem(nodes: Map<string, AggregatedHierarchyNode>): void {
    // Mock organizational data - in production, this would come from HR system
    const orgData = [
      {
        id: 'ceo_001',
        name: 'Michael Johnson',
        title: 'CEO',
        department: 'Executive',
        parentId: null,
      },
      {
        id: 'cmo_001',
        name: 'Sarah Johnson',
        title: 'Chief Marketing Officer',
        department: 'Marketing',
        parentId: 'ceo_001',
      },
      {
        id: 'cto_001',
        name: 'Chris Brown',
        title: 'Chief Technology Officer',
        department: 'Technology',
        parentId: 'ceo_001',
      },
    ];

    for (const person of orgData) {
      const node: AggregatedHierarchyNode = {
        id: `org_${person.id}`,
        name: person.name,
        title: person.title,
        department: person.department,
        parentId: person.parentId ? `org_${person.parentId}` : undefined,
        children: [], // Will be populated in second pass
        depth: this.calculateOrgDepth(person.title),
        sourceSystem: 'organizational',
        sourceData: person,
        reportsTo: person.parentId ? [`org_${person.parentId}`] : [],
        manages: [],
        collaboratesWith: [],
        context: {
          isLeadership: person.title.includes('CEO') || person.title.includes('Chief'),
          isManager: person.title.includes('Manager') || person.title.includes('Director'),
          isContributor: !person.title.includes('CEO') && !person.title.includes('Chief'),
          hasDirectReports: false, // Will be updated
        },
        references: {
          employeeId: person.id,
        },
      };

      nodes.set(node.id, node);
    }
  }

  /**
   * Process department systems while preserving their unique structures
   */
  private processDepartmentSystems(nodes: Map<string, AggregatedHierarchyNode>): void {
    const departments = ['finance', 'marketing', 'operations', 'technology'];

    for (const dept of departments) {
      const deptData = this.loadDepartmentData(dept);

      for (const member of deptData) {
        const node: AggregatedHierarchyNode = {
          id: `dept_${dept}_${member.id}`,
          name: member.name,
          title: member.role,
          department: dept,
          parentId: member.reportsTo ? `dept_${dept}_${member.reportsTo}` : undefined,
          children: [], // Populated later
          depth: member.level || 1,
          sourceSystem: 'department',
          sourceData: member,
          reportsTo: member.reportsTo ? [`dept_${dept}_${member.reportsTo}`] : [],
          manages: [],
          collaboratesWith: member.collaboratesWith || [],
          context: {
            isLeadership: member.role.includes('Director') || member.role.includes('VP'),
            isManager: member.role.includes('Manager') || member.role.includes('Lead'),
            isContributor: true,
            hasDirectReports: false,
            specializations: member.specializations,
          },
          metrics: member.metrics,
          references: {
            departmentRoleId: member.id,
            aliases: member.aliases,
          },
        };

        nodes.set(node.id, node);
      }
    }
  }

  /**
   * Discover natural connections between systems without forcing them
   */
  private discoverNaturalConnections(
    nodes: Map<string, AggregatedHierarchyNode>,
    crossReferences: any[]
  ): void {
    const nodeArray = Array.from(nodes.values());

    // Find potential matches by name similarity
    for (const node1 of nodeArray) {
      for (const node2 of nodeArray) {
        if (node1.id === node2.id || node1.sourceSystem === node2.sourceSystem) continue;

        const similarity = this.calculateNameSimilarity(node1.name, node2.name);
        if (similarity > 0.8) {
          // High confidence threshold
          crossReferences.push({
            nodeId: node1.id,
            relatedNodes: [node2.id],
            relationship: 'likely_same_person',
            confidence: similarity,
          });
        }
      }
    }

    // Find department-role connections
    this.findDepartmentConnections(nodeArray, crossReferences);
  }

  /**
   * Create natural groupings based on actual behavior, not forced levels
   */
  private createNaturalGroupings(nodes: Map<string, AggregatedHierarchyNode>): any {
    const nodeArray = Array.from(nodes.values());

    return {
      leadership: nodeArray.filter(n => n.context.isLeadership),
      managers: nodeArray.filter(n => n.context.isManager && !n.context.isLeadership),
      contributors: nodeArray.filter(n => n.context.isContributor && !n.context.isManager),
    };
  }

  /**
   * Get aggregated hierarchy view
   */
  getAggregatedHierarchy(): AggregatedHierarchy | null {
    return this.aggregated;
  }

  /**
   * Query nodes naturally without forcing structure
   */
  query(options: {
    sourceSystem?: string;
    department?: string;
    name?: string;
    isLeadership?: boolean;
    isManager?: boolean;
    hasDirectReports?: boolean;
  }): AggregatedHierarchyNode[] {
    if (!this.aggregated) return [];

    let results = Array.from(this.aggregated.nodes.values());

    if (options.sourceSystem) {
      results = results.filter(n => n.sourceSystem === options.sourceSystem);
    }

    if (options.department) {
      results = results.filter(n =>
        n.department.toLowerCase().includes(options.department!.toLowerCase())
      );
    }

    if (options.name) {
      results = results.filter(n => n.name.toLowerCase().includes(options.name!.toLowerCase()));
    }

    if (options.isLeadership !== undefined) {
      results = results.filter(n => n.context.isLeadership === options.isLeadership);
    }

    if (options.isManager !== undefined) {
      results = results.filter(n => n.context.isManager === options.isManager);
    }

    if (options.hasDirectReports !== undefined) {
      results = results.filter(n => n.context.hasDirectReports === options.hasDirectReports);
    }

    return results;
  }

  // Helper methods
  private async loadFire22Hierarchy(): Promise<any[]> {
    // Mock data - in production, fetch from Fire22 API
    return [
      {
        agentId: 'A001',
        name: 'Master Agent One',
        level: 1,
        department: 'Sales',
        parentId: null,
        children: ['A002'],
      },
      {
        agentId: 'A002',
        name: 'Senior Agent Two',
        level: 3,
        department: 'Sales',
        parentId: 'A001',
        children: [],
      },
    ];
  }

  private async loadOrganizationalHierarchy(): Promise<any[]> {
    // Mock data - in production, fetch from HR system
    return [];
  }

  private async loadDepartmentHierarchies(): Promise<Record<string, any[]>> {
    // Mock data - in production, fetch from department systems
    return {};
  }

  private loadDepartmentData(department: string): any[] {
    // Mock department-specific data
    const mockData: Record<string, any[]> = {
      marketing: [
        {
          id: 'mar001',
          name: 'Sarah Johnson',
          role: 'Marketing Director',
          level: 2,
          metrics: { implementations: 62 },
        },
        {
          id: 'mar002',
          name: 'Michelle Rodriguez',
          role: 'Marketing Manager',
          level: 3,
          reportsTo: 'mar001',
          metrics: { implementations: 45 },
        },
      ],
      operations: [
        {
          id: 'ops001',
          name: 'Jennifer Wilson',
          role: 'VP of Operations',
          level: 2,
          metrics: { implementations: 71 },
        },
        {
          id: 'ops002',
          name: 'David Martinez',
          role: 'Operations Director',
          level: 3,
          reportsTo: 'ops001',
          metrics: { implementations: 67 },
        },
      ],
    };

    return mockData[department] || [];
  }

  private getFire22Title(level: number): string {
    const titles: Record<number, string> = {
      1: 'Master Agent',
      2: 'Senior Master Agent',
      3: 'Agent',
      4: 'Senior Agent',
      5: 'Sub-Agent',
      6: 'Senior Sub-Agent',
      7: 'Basic Agent',
      8: 'Clerk',
    };
    return titles[level] || 'Agent';
  }

  private calculateDepth(level: number, system: string): number {
    switch (system) {
      case 'fire22':
        return level;
      default:
        return 1;
    }
  }

  private calculateOrgDepth(title: string): number {
    if (title.includes('CEO')) return 1;
    if (title.includes('Chief')) return 2;
    if (title.includes('Director')) return 3;
    if (title.includes('Manager')) return 4;
    return 5;
  }

  private findNaturalRoots(nodes: Map<string, AggregatedHierarchyNode>): AggregatedHierarchyNode[] {
    return Array.from(nodes.values()).filter(node => !node.parentId);
  }

  private groupByDepartment(
    nodes: Map<string, AggregatedHierarchyNode>
  ): Record<string, AggregatedHierarchyNode[]> {
    const groups: Record<string, AggregatedHierarchyNode[]> = {};

    for (const node of nodes.values()) {
      if (!groups[node.department]) {
        groups[node.department] = [];
      }
      groups[node.department].push(node);
    }

    return groups;
  }

  private countBySource(nodes: Map<string, AggregatedHierarchyNode>, source: string): number {
    return Array.from(nodes.values()).filter(n => n.sourceSystem === source).length;
  }

  private calculateNameSimilarity(name1: string, name2: string): number {
    // Simple similarity calculation - in production, use more sophisticated matching
    const words1 = name1.toLowerCase().split(' ');
    const words2 = name2.toLowerCase().split(' ');

    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2) matches++;
      }
    }

    return matches / Math.max(words1.length, words2.length);
  }

  private findDepartmentConnections(
    nodes: AggregatedHierarchyNode[],
    crossReferences: any[]
  ): void {
    // Find connections between organizational and department systems
    for (const orgNode of nodes.filter(n => n.sourceSystem === 'organizational')) {
      for (const deptNode of nodes.filter(
        n => n.sourceSystem === 'department' && n.department === orgNode.department
      )) {
        if (this.calculateNameSimilarity(orgNode.name, deptNode.name) > 0.7) {
          crossReferences.push({
            nodeId: orgNode.id,
            relatedNodes: [deptNode.id],
            relationship: 'org_dept_connection',
            confidence: 0.8,
          });
        }
      }
    }
  }
}

// Export singleton instance
export const hierarchyAggregator = new HierarchyAggregator();

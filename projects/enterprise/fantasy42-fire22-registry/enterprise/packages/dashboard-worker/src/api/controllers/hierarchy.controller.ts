/**
 * 🏢 Fire22 Dashboard - Hierarchy Controller
 * Comprehensive multi-system hierarchy API endpoints
 * Preserves existing systems while providing unified access
 */

import { hierarchyAggregator, AggregatedHierarchy } from '../../services/hierarchy-aggregator';
import { hierarchyManager } from '../../services/hierarchy-manager';

export interface HierarchyQueryRequest {
  name?: string;
  department?: string;
  sourceSystem?: 'fire22' | 'organizational' | 'department';
  isLeadership?: boolean;
  isManager?: boolean;
}

export interface HierarchyResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  details?: any;
}

/**
 * Get aggregated hierarchy view across all systems
 * GET /api/hierarchy/aggregated
 */
export async function getAggregatedHierarchy(): Promise<HierarchyResponse> {
  try {
    const aggregated = hierarchyAggregator.getAggregatedHierarchy();

    if (!aggregated) {
      return {
        success: false,
        error: 'Hierarchy data not available',
        code: 'HIERARCHY_NOT_FOUND',
      };
    }

    return {
      success: true,
      data: {
        roots: aggregated.roots,
        fire22View: aggregated.fire22View,
        organizationalView: aggregated.organizationalView,
        departmentViews: aggregated.departmentViews,
        leadership: aggregated.leadership,
        managers: aggregated.managers,
        crossReferences: aggregated.crossReferences,
        lastUpdated: aggregated.lastUpdated,
        sources: aggregated.sources,
        note: 'This preserves all existing systems while providing unified access',
      },
    };
  } catch (error) {
    console.error('Error getting aggregated hierarchy:', error);
    return {
      success: false,
      error: 'Failed to retrieve aggregated hierarchy',
      code: 'AGGREGATION_ERROR',
    };
  }
}

/**
 * Natural search across all hierarchy systems
 * POST /api/hierarchy/query
 */
export async function queryHierarchy(request: HierarchyQueryRequest): Promise<HierarchyResponse> {
  try {
    const results = hierarchyAggregator.query(request);

    return {
      success: true,
      data: {
        results,
        total: results.length,
        query: request,
        note: 'Natural query across all hierarchy systems',
      },
    };
  } catch (error) {
    console.error('Error querying hierarchy:', error);
    return {
      success: false,
      error: 'Failed to query hierarchy',
      code: 'QUERY_ERROR',
      details: { originalQuery: request },
    };
  }
}

/**
 * Discover cross-system connections
 * GET /api/hierarchy/cross-references
 */
export async function getCrossReferences(): Promise<HierarchyResponse> {
  try {
    const aggregated = hierarchyAggregator.getAggregatedHierarchy();

    if (!aggregated) {
      return {
        success: false,
        error: 'Hierarchy data not available',
        code: 'HIERARCHY_NOT_FOUND',
      };
    }

    // Group cross-references by person for better presentation
    const personGroups: Record<string, any> = {};

    for (const ref of aggregated.crossReferences) {
      const sourceNode = aggregated.nodes.get(ref.nodeId);
      if (!sourceNode) continue;

      const personName = sourceNode.name;
      if (!personGroups[personName]) {
        personGroups[personName] = {
          person: personName,
          connections: [],
          likely_same_person: false,
          confidence: 0,
        };
      }

      // Add this connection
      const targetNode = aggregated.nodes.get(ref.relatedNodes[0]);
      if (targetNode) {
        personGroups[personName].connections.push({
          id: targetNode.id,
          system: targetNode.sourceSystem,
          title: targetNode.title,
          confidence: ref.confidence,
        });

        // Update overall confidence
        if (ref.confidence > personGroups[personName].confidence) {
          personGroups[personName].confidence = ref.confidence;
          personGroups[personName].likely_same_person = ref.confidence > 0.8;
        }
      }
    }

    return {
      success: true,
      data: {
        crossReferences: Object.values(personGroups),
        note: 'Natural connections discovered across systems, not forced',
      },
    };
  } catch (error) {
    console.error('Error getting cross-references:', error);
    return {
      success: false,
      error: 'Failed to retrieve cross-references',
      code: 'CROSS_REFERENCE_ERROR',
    };
  }
}

/**
 * Get system-specific hierarchy view
 * GET /api/hierarchy/view/{system}
 */
export async function getSystemView(system: string): Promise<HierarchyResponse> {
  try {
    const validSystems = ['fire22', 'organizational', 'departments'];

    if (!validSystems.includes(system)) {
      return {
        success: false,
        error: 'View not found',
        code: 'SYSTEM_NOT_FOUND',
        details: {
          requestedSystem: system,
          availableViews: validSystems,
        },
      };
    }

    const aggregated = hierarchyAggregator.getAggregatedHierarchy();

    if (!aggregated) {
      return {
        success: false,
        error: 'Hierarchy data not available',
        code: 'HIERARCHY_NOT_FOUND',
      };
    }

    let viewData: any = null;
    let systemName = '';

    switch (system) {
      case 'fire22':
        viewData = aggregated.fire22View;
        systemName = 'Fire22 Agent Hierarchy';
        break;
      case 'organizational':
        viewData = aggregated.organizationalView;
        systemName = 'Organizational Chart';
        break;
      case 'departments':
        viewData = aggregated.departmentViews;
        systemName = 'Department Hierarchies';
        break;
    }

    return {
      success: true,
      data: {
        view: {
          system: systemName,
          preserves: getSystemDescription(system),
          nodes: system === 'departments' ? undefined : viewData,
          departments: system === 'departments' ? viewData : undefined,
        },
        note: `${systemName} preserved in its natural structure`,
      },
    };
  } catch (error) {
    console.error(`Error getting ${system} view:`, error);
    return {
      success: false,
      error: `Failed to retrieve ${system} view`,
      code: 'SYSTEM_VIEW_ERROR',
    };
  }
}

/**
 * Get Fire22 agent hierarchy (legacy endpoint)
 * GET /api/agents/hierarchy
 */
export async function getAgentsHierarchy(): Promise<HierarchyResponse> {
  try {
    const aggregated = hierarchyAggregator.getAggregatedHierarchy();

    if (!aggregated) {
      return {
        success: false,
        error: 'Agent hierarchy data not available',
        code: 'HIERARCHY_NOT_FOUND',
      };
    }

    // Return just the Fire22 view for backward compatibility
    return {
      success: true,
      data: {
        agents: aggregated.fire22View,
        totalCount: aggregated.fire22View.length,
        note: 'Fire22 agent hierarchy (use /api/hierarchy/view/fire22 for new API)',
      },
    };
  } catch (error) {
    console.error('Error getting agents hierarchy:', error);
    return {
      success: false,
      error: 'Failed to retrieve agent hierarchy',
      code: 'AGENTS_HIERARCHY_ERROR',
    };
  }
}

/**
 * Get unified hierarchy (legacy endpoint)
 * GET /api/hierarchy/unified
 */
export async function getUnifiedHierarchy(): Promise<HierarchyResponse> {
  try {
    const aggregated = hierarchyAggregator.getAggregatedHierarchy();

    if (!aggregated) {
      return {
        success: false,
        error: 'Unified hierarchy data not available',
        code: 'HIERARCHY_NOT_FOUND',
      };
    }

    // Create a unified view (flattened)
    const allNodes = [
      ...aggregated.fire22View,
      ...aggregated.organizationalView,
      ...Object.values(aggregated.departmentViews).flat(),
    ];

    return {
      success: true,
      data: {
        nodes: allNodes,
        totalCount: allNodes.length,
        sources: aggregated.sources,
        lastUpdated: aggregated.lastUpdated,
        note: 'Unified hierarchy view (deprecated - use /api/hierarchy/aggregated)',
      },
    };
  } catch (error) {
    console.error('Error getting unified hierarchy:', error);
    return {
      success: false,
      error: 'Failed to retrieve unified hierarchy',
      code: 'UNIFIED_HIERARCHY_ERROR',
    };
  }
}

// Helper functions

function getSystemDescription(system: string): string {
  const descriptions: Record<string, string> = {
    fire22: '8-level agent structure',
    organizational: 'Company org structure',
    departments: 'Department-specific structures',
  };
  return descriptions[system] || 'System structure';
}

// Export all functions
export {
  getAggregatedHierarchy,
  queryHierarchy,
  getCrossReferences,
  getSystemView,
  getAgentsHierarchy,
  getUnifiedHierarchy,
};

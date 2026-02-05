/**
 * 🏢 Fire22 Dashboard - Unified Hierarchy System
 * Standardized hierarchy structure across all departments and systems
 */

// Universal 5-level hierarchy system
export enum UniversalLevel {
  EXECUTIVE = 1, // C-Suite, Board, Top-level agents
  DIRECTOR = 2, // Department Heads, Regional Directors
  MANAGER = 3, // Team Leads, Supervisors
  SENIOR_STAFF = 4, // Senior Specialists, Coordinators
  STAFF = 5, // Junior Staff, Support, Entry-level
}

// Level descriptors for UI display
export const LevelDescriptors: Record<UniversalLevel, string> = {
  [UniversalLevel.EXECUTIVE]: 'Executive',
  [UniversalLevel.DIRECTOR]: 'Director',
  [UniversalLevel.MANAGER]: 'Manager',
  [UniversalLevel.SENIOR_STAFF]: 'Senior Staff',
  [UniversalLevel.STAFF]: 'Staff',
};

// Unified hierarchy node interface
export interface UnifiedHierarchyNode {
  id: string;
  name: string;
  level: UniversalLevel;
  title: string;
  department: string;
  parentId: string | null;
  children: string[];

  // Metadata
  email?: string;
  phone?: string;
  location?: string;
  startDate?: string;

  // Permissions and access
  permissions: UnifiedPermission[];
  reportingTo: string[];
  directReports: string[];

  // Cross-system mappings
  mappings: {
    fire22AgentLevel?: number; // 1-8 Fire22 agent levels
    organizationalLevel?: string; // Original org structure level
    departmentRole?: string; // Department-specific role
    customAttributes?: Record<string, any>;
  };

  // Performance and metrics
  metrics?: {
    teamSize?: number;
    kpis?: Record<string, number>;
    performance?: number;
    implementations?: number;
  };
}

// Unified permission system
export interface UnifiedPermission {
  resource: string;
  actions: PermissionAction[];
  scope: PermissionScope;
  conditions?: Record<string, any>;
  inherited: boolean;
  expiresAt?: string;
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  ASSIGN = 'assign',
  DELEGATE = 'delegate',
}

export enum PermissionScope {
  GLOBAL = 'global', // Entire organization
  DEPARTMENT = 'department', // Department-wide
  TEAM = 'team', // Team only
  SELF = 'self', // Self only
}

// Department hierarchy configuration
export interface DepartmentHierarchyConfig {
  departmentId: string;
  departmentName: string;
  structure: {
    hasDirector: boolean;
    hasManagers: boolean;
    hasSeniorStaff: boolean;
    customRoles?: string[];
  };
  levelMappings: Record<string, UniversalLevel>;
}

// Fire22 Agent level mapping to universal levels
export const Fire22AgentMapping: Record<number, UniversalLevel> = {
  1: UniversalLevel.EXECUTIVE, // Master Agent
  2: UniversalLevel.EXECUTIVE, // Senior Master
  3: UniversalLevel.DIRECTOR, // Agent
  4: UniversalLevel.DIRECTOR, // Senior Agent
  5: UniversalLevel.MANAGER, // Sub-Agent
  6: UniversalLevel.MANAGER, // Senior Sub-Agent
  7: UniversalLevel.SENIOR_STAFF, // Basic Agent
  8: UniversalLevel.STAFF, // Clerk
};

// Organizational structure mapping
export const OrganizationalMapping: Record<string, UniversalLevel> = {
  CEO: UniversalLevel.EXECUTIVE,
  President: UniversalLevel.EXECUTIVE,
  VP: UniversalLevel.EXECUTIVE,
  Director: UniversalLevel.DIRECTOR,
  Manager: UniversalLevel.MANAGER,
  Lead: UniversalLevel.MANAGER,
  Senior: UniversalLevel.SENIOR_STAFF,
  Specialist: UniversalLevel.SENIOR_STAFF,
  Coordinator: UniversalLevel.SENIOR_STAFF,
  Associate: UniversalLevel.STAFF,
  Assistant: UniversalLevel.STAFF,
  Junior: UniversalLevel.STAFF,
};

// Hierarchy tree structure for visualization
export interface HierarchyTree {
  root: UnifiedHierarchyNode;
  nodes: Map<string, UnifiedHierarchyNode>;
  edges: Array<{ from: string; to: string; type: string }>;
  metadata: {
    totalNodes: number;
    maxDepth: number;
    departments: string[];
    lastUpdated: string;
  };
}

// Hierarchy query options
export interface HierarchyQueryOptions {
  level?: UniversalLevel;
  department?: string;
  includeChildren?: boolean;
  includeParents?: boolean;
  includeMetrics?: boolean;
  maxDepth?: number;
  filter?: (node: UnifiedHierarchyNode) => boolean;
}

// Hierarchy update request
export interface HierarchyUpdateRequest {
  nodeId: string;
  updates: Partial<UnifiedHierarchyNode>;
  updateChildren?: boolean;
  preservePermissions?: boolean;
  auditInfo: {
    updatedBy: string;
    reason: string;
    timestamp: string;
  };
}

// Migration mapping for converting existing structures
export interface HierarchyMigration {
  sourceSystem: 'fire22' | 'organizational' | 'department';
  sourceId: string;
  targetNodeId: string;
  mappingRules: {
    levelMapping: Record<string | number, UniversalLevel>;
    attributeMapping: Record<string, string>;
    permissionMapping: Record<string, UnifiedPermission>;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  errors?: string[];
}

// Hierarchy validation rules
export interface HierarchyValidation {
  rules: {
    maxDirectReports?: number;
    minLevelForApproval?: UniversalLevel;
    requiredAttributes?: string[];
    departmentRestrictions?: Record<string, UniversalLevel[]>;
  };
  validate: (node: UnifiedHierarchyNode) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Analytics and reporting
export interface HierarchyAnalytics {
  levelDistribution: Record<UniversalLevel, number>;
  departmentDistribution: Record<string, number>;
  avgSpanOfControl: number;
  orphanedNodes: string[];
  circularReferences: Array<{ nodeId: string; path: string[] }>;
  complianceScore: number;
}

// Export type guards
export function isExecutive(node: UnifiedHierarchyNode): boolean {
  return node.level === UniversalLevel.EXECUTIVE;
}

export function isDirector(node: UnifiedHierarchyNode): boolean {
  return node.level === UniversalLevel.DIRECTOR;
}

export function isManager(node: UnifiedHierarchyNode): boolean {
  return node.level === UniversalLevel.MANAGER;
}

export function canApprove(node: UnifiedHierarchyNode, resource: string): boolean {
  return node.permissions.some(
    p => p.resource === resource && p.actions.includes(PermissionAction.APPROVE)
  );
}

export function getEffectiveLevel(
  fire22Level?: number,
  orgRole?: string,
  deptRole?: string
): UniversalLevel {
  // Priority: Fire22 > Organizational > Department
  if (fire22Level && Fire22AgentMapping[fire22Level]) {
    return Fire22AgentMapping[fire22Level];
  }

  if (orgRole) {
    for (const [key, level] of Object.entries(OrganizationalMapping)) {
      if (orgRole.includes(key)) {
        return level;
      }
    }
  }

  // Default to staff level if no mapping found
  return UniversalLevel.STAFF;
}

// Export all types
export type {
  UnifiedHierarchyNode,
  UnifiedPermission,
  DepartmentHierarchyConfig,
  HierarchyTree,
  HierarchyQueryOptions,
  HierarchyUpdateRequest,
  HierarchyMigration,
  HierarchyValidation,
  ValidationResult,
  HierarchyAnalytics,
};

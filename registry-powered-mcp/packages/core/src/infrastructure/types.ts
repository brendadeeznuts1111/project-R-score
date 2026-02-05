/**
 * Infrastructure Status Types - Component #41
 *
 * Golden Matrix Integration for Zero-Cost Infrastructure Monitoring
 *
 * | Infrastructure ID | Logic Tier | Resource Tax | Parity Lock | Status |
 * |:------------------|:-----------|:-------------|:------------|:-------|
 * | **Infrastructure-Status** | **Level 2: Audit** | `CPU: <0.5%` | `sha256-...` | **ACTIVE** |
 *
 * Performance Targets:
 * - Status aggregation: <5ms
 * - Component health: <1ms per component
 * - Parity verification: <2ms
 *
 * @module infrastructure
 */

/**
 * Infrastructure component status levels
 */
export enum ComponentStatus {
  /** Component is fully operational */
  OPERATIONAL = 'OPERATIONAL',
  /** Component is running with degraded performance */
  DEGRADED = 'DEGRADED',
  /** Component is under maintenance */
  MAINTENANCE = 'MAINTENANCE',
  /** Component has failed */
  FAILED = 'FAILED',
  /** Component status is unknown */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Logic tiers from Golden Matrix
 */
export enum LogicTier {
  /** Level 0: Kernel - Core runtime optimizations */
  LEVEL_0_KERNEL = 0,
  /** Level 1: Operational - Primary service layer */
  LEVEL_1_STATE = 1,
  /** Level 1: Security - Security components */
  LEVEL_1_SECURITY = 1,
  /** Level 2: Monitoring - Audit and security */
  LEVEL_2_AUDIT = 2,
  /** Level 2: Distribution - Content distribution */
  LEVEL_2_DISTRIBUTION = 2,
  /** Level 3: Governance - Policy and orchestration */
  LEVEL_3_CONTROL = 3,
  /** Level 3: Workspace - Workspace management */
  LEVEL_3_WORKSPACE = 3,
  /** Level 3: Package Manager - Package management */
  LEVEL_3_PACKAGE_MANAGER = 3,
  /** Level 3: Build - Build system optimizations */
  LEVEL_3_BUILD = 3,
  /** Level 4: Distribution - Storage and replication */
  LEVEL_4_VAULT = 4,
  /** Level 5: Validation - Testing infrastructure */
  LEVEL_5_TEST = 5,
  /** Level 1: Database - Database client fixes */
  LEVEL_1_DATABASE = 1,
  /** Level 0: FFI - Foreign function interface */
  LEVEL_0_FFI = 0,
  /** Level 1: Network - Network protocol fixes */
  LEVEL_1_NETWORK = 1,
  /** Level 1: Cache - Caching layer fixes */
  LEVEL_1_CACHE = 1,
  /** Level 1: Storage - Storage client fixes */
  LEVEL_1_STORAGE = 1,
  /** Level 0: Compatibility - Node.js compatibility */
  LEVEL_0_COMPATIBILITY = 0,
  /** Level 0: Security - Security hardening */
  LEVEL_0_SECURITY = 0,
}

/**
 * Resource tax category
 */
export type ResourceCategory = 'CPU' | 'Heap' | 'Net' | 'I/O' | 'Mem' | 'Disk';

/**
 * Resource tax specification
 */
export interface ResourceTax {
  category: ResourceCategory;
  value: string;
  currentUsage?: number;
  threshold?: number;
}

/**
 * Individual infrastructure component
 */
export interface InfrastructureComponent {
  /** Unique component identifier (e.g., 'Lattice-Route-Compiler') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Logic tier from Golden Matrix */
  tier: LogicTier;

  /** Current operational status */
  status: ComponentStatus;

  /** Resource tax specification */
  resourceTax: ResourceTax;

  /** SHA-256 parity lock (first 8 + last 4 chars) */
  parityLock: string;

  /** Protocol or RFC reference */
  protocol?: string;

  /** Feature flag dependency */
  featureFlag?: string;

  /** Last health check timestamp */
  lastCheck: number;

  /** Latency of last operation in ms */
  latencyMs?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated infrastructure health
 */
export interface InfrastructureHealth {
  /** Overall system status */
  status: ComponentStatus;

  /** Total component count */
  totalComponents: number;

  /** Components by status */
  byStatus: Record<ComponentStatus, number>;

  /** Components by tier */
  byTier: Record<LogicTier, number>;

  /** Degraded component IDs */
  degradedComponents: string[];

  /** Failed component IDs */
  failedComponents: string[];

  /** Overall health percentage (0-100) */
  healthPercentage: number;

  /** SLA compliance status */
  slaCompliant: boolean;

  /** Last aggregation timestamp */
  timestamp: number;
}

/**
 * Infrastructure metrics snapshot
 */
export interface InfrastructureMetrics {
  /** Uptime in seconds */
  uptimeSeconds: number;

  /** Total requests handled */
  totalRequests: number;

  /** P99 latency in ms */
  p99LatencyMs: number;

  /** Current heap usage in bytes */
  heapUsedBytes: number;

  /** Heap limit in bytes */
  heapLimitBytes: number;

  /** Heap pressure percentage */
  heapPressure: number;

  /** Active WebSocket connections */
  activeConnections: number;

  /** Requests per second */
  requestsPerSecond: number;

  /** Error rate (0-1) */
  errorRate: number;

  /** Snapshot timestamp */
  timestamp: number;
}

/**
 * Full infrastructure status response
 */
export interface InfrastructureStatus {
  /** System version */
  version: string;

  /** Runtime information */
  runtime: {
    bun: string;
    platform: string;
    arch: string;
  };

  /** Aggregated health */
  health: InfrastructureHealth;

  /** All components */
  components: InfrastructureComponent[];

  /** Performance metrics */
  metrics: InfrastructureMetrics;

  /** Feature flags enabled */
  features: string[];

  /** Response generation timestamp */
  timestamp: number;
}

/**
 * Component health check result
 */
export interface ComponentHealthResult {
  id: string;
  status: ComponentStatus;
  latencyMs: number;
  parityValid: boolean;
  message?: string;
  timestamp: number;
}

/**
 * Infrastructure status API message types
 */
export type InfrastructureMessageType =
  | 'STATUS_UPDATE'
  | 'COMPONENT_HEALTH'
  | 'METRIC_SNAPSHOT'
  | 'ALERT'
  | 'PARITY_VIOLATION';

/**
 * WebSocket message for infrastructure updates
 */
export interface InfrastructureMessage {
  type: InfrastructureMessageType;
  payload: InfrastructureStatus | InfrastructureComponent | InfrastructureMetrics | { componentId: string; error: string };
  timestamp: number;
}

/**
 * Status collector configuration
 */
export interface StatusCollectorConfig {
  /** Enable status collection */
  enabled: boolean;

  /** Health check interval in ms */
  checkIntervalMs: number;

  /** Enable parity verification */
  verifyParity: boolean;

  /** Alert on degraded components */
  alertOnDegraded: boolean;

  /** SLA latency threshold in ms */
  slaThresholdMs: number;
}

/**
 * Default status collector configuration
 */
export const DEFAULT_STATUS_COLLECTOR_CONFIG: StatusCollectorConfig = {
  enabled: true,
  checkIntervalMs: 30_000,
  verifyParity: true,
  alertOnDegraded: true,
  slaThresholdMs: 50,
};

/**
 * Type guards
 */
export function isValidComponentStatus(status: unknown): status is ComponentStatus {
  return typeof status === 'string' && Object.values(ComponentStatus).includes(status as ComponentStatus);
}

export function isValidLogicTier(tier: unknown): tier is LogicTier {
  return typeof tier === 'number' && tier >= 0 && tier <= 5;
}

export function isOperational(component: InfrastructureComponent): boolean {
  return component.status === ComponentStatus.OPERATIONAL;
}

export function isDegraded(component: InfrastructureComponent): boolean {
  return component.status === ComponentStatus.DEGRADED || component.status === ComponentStatus.MAINTENANCE;
}

export function isFailed(component: InfrastructureComponent): boolean {
  return component.status === ComponentStatus.FAILED || component.status === ComponentStatus.UNKNOWN;
}

/**
 * Logic tier labels for display
 */
export const TIER_LABELS: Record<LogicTier, string> = {
  [LogicTier.LEVEL_0_KERNEL]: 'Level 0: Kernel',
  [LogicTier.LEVEL_1_STATE]: 'Level 1: State',
  [LogicTier.LEVEL_2_AUDIT]: 'Level 2: Audit',
  [LogicTier.LEVEL_3_CONTROL]: 'Level 3: Control',
  [LogicTier.LEVEL_4_VAULT]: 'Level 4: Vault',
  [LogicTier.LEVEL_5_TEST]: 'Level 5: Test',
};

/**
 * Status color mapping for terminal/dashboard display
 */
export const STATUS_COLORS: Record<ComponentStatus, string> = {
  [ComponentStatus.OPERATIONAL]: '#10b981', // green
  [ComponentStatus.DEGRADED]: '#f59e0b',    // amber
  [ComponentStatus.MAINTENANCE]: '#6366f1', // indigo
  [ComponentStatus.FAILED]: '#ef4444',      // red
  [ComponentStatus.UNKNOWN]: '#6b7280',     // gray
};

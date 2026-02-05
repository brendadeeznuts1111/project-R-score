// factory-wager/tabular/types-v45.ts
// FactoryWager YAML-Native Tabular v4.5 - Enhanced 15-Column Schema with Nexus Integration

export interface YAMLNode {
  // Core Identity (1-3)
  docIndex: number;       // [1] Document sequence
  key: string;            // [2] Full path (e.g., "server.ssl.cert")
  value: string;          // [3] Display value (truncated with indicator)

  // Type System (4-5)
  yamlType: 'scalar' | 'alias' | 'anchor' | 'mapping' | 'sequence' | 'merge';
  jsType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'date' | 'error';

  // YAML Features (6-7)
  anchor?: string;        // [6] &anchor name
  alias?: string;         // [7] *alias reference
  isMerge?: boolean;      // [7a] Merge key flag for visual "M" badge
  inheritanceChain?: string[]; // [7b] Track what gets merged

  // FactoryWager Metadata (8-12)
  version?: string;       // [8] Semantic version
  bun?: string;           // [9] Runtime version
  interpolated: boolean;  // [10] Env var ${...} detected
  author?: string;        // [11] Creator (from anchor inheritance)
  status?: string;        // [12] active | draft | deprecated

  // Infrastructure Nexus Integration (13-15) - NEW
  registryId?: string;    // [13] FACTORY-XXX-001 format
  r2Bucket?: string;      // [14] Storage bucket target
  domainEndpoint?: string;// [15] Health check URL

  // Merge Inheritance (16) - ENHANCED
  inheritance?: string;   // [16] Inheritance chain display (e.g., "→defaults+ovrd")

  // Internal tracking
  _rawValue: any;         // Original value for truncation detection
  _depth: number;         // Nesting depth for indentation
  _lineNumber: number;    // Source line for error reporting
  _truncated: boolean;    // Truncation indicator
}

export const COLUMNS_V45 = [
  // Index & Identity
  { name: "doc", w: 3, align: "right" as const,  hsl: "hsl(210, 20%, 50%)",  key: "docIndex" },
  { name: "depth", w: 2, align: "right" as const,  hsl: "hsl(210, 20%, 40%)", key: "_depth" },

  // Key with visual indentation
  { name: "key", w: 26, align: "left" as const,   hsl: "hsl(0, 0%, 95%)",     key: "key" },

  // Value with truncation awareness
  { name: "value", w: 28, align: "left" as const,   hsl: "hsl(200, 15%, 80%)",  key: "value" },
  { name: "trunc", w: 1, align: "center" as const, hsl: "hsl(10, 90%, 55%)",   key: "_truncated" }, // NEW

  // Type indicators
  { name: "yamlType", w: 9, align: "center" as const, hsl: "hsl(280, 60%, 60%)", key: "yamlType" },
  { name: "jsType", w: 7, align: "center" as const, hsl: "hsl(180, 60%, 55%)", key: "jsType" },

  // YAML features
  { name: "anchor", w: 8, align: "left" as const,   hsl: "hsl(120, 40%, 45%)", key: "anchor" },
  { name: "alias", w: 10, align: "left" as const,   hsl: "hsl(48, 100%, 60%)", key: "alias" },

  // Metadata
  { name: "ver", w: 7, align: "center" as const, hsl: "hsl(300, 70%, 65%)", key: "version" },
  { name: "bun", w: 6, align: "center" as const, hsl: "hsl(220, 90%, 60%)", key: "bun" },
  { name: "env", w: 3, align: "center" as const, hsl: "hsl(10, 90%, 55%)", key: "interpolated" },

  // Infrastructure Nexus (NEW)
  { name: "registry", w: 10, align: "left" as const, hsl: "hsl(160, 60%, 50%)", key: "registryId" },
  { name: "r2", w: 8, align: "left" as const, hsl: "hsl(30, 90%, 60%)", key: "r2Bucket" },

  // Merge Inheritance (NEW)
  { name: "inheritance", w: 15, align: "left" as const, hsl: "hsl(300, 70%, 65%)", key: "inheritance" },

  // Status with dynamic color
  { name: "status", w: 8, align: "center" as const, hsl: null, key: "status" },
] as const;

export interface ColumnConfigV45 {
  name: string;
  w: number;
  align: "left" | "right" | "center";
  hsl: string | null;
  key: keyof YAMLNode;
}

export interface DocStats {
  totalDocs: number;
  totalNodes: number;
  anchorsDefined: number;
  aliasesResolved: number;
  interpolated: number;
  maxDepth: number;
}

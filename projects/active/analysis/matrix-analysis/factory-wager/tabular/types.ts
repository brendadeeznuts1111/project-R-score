// factory-wager/tabular/types.ts
// FactoryWager YAML-Native Tabular v4.4 - Schema Definitions

export interface YAMLNode {
  docIndex: number;       // [1] Multi-doc sequence (0, 1, 2...)
  key: string;            // [2] YAML key name
  value: string;          // [3] Resolved value (alias expanded)
  yamlType: 'scalar' | 'alias' | 'anchor' | 'mapping' | 'sequence'; // [4] Node type
  jsType: string;         // [5] Inferred JS type (string, number, etc.)
  anchor?: string;        // [6] Anchor label if defined (&name)
  alias?: string;         // [7] Alias reference if used (*name)
  version?: string;       // [8] Semantic version from field
  bun?: string;           // [9] Bun runtime version
  interpolated: boolean;  // [10] Env var interpolation detected
  author?: string;        // [11] Creator identity
  status?: string;        // [12] Document state
}

export const COLUMNS_V44: ColumnConfig[] = [
  { name: "doc",          w: 4,  align: "right" as const,  hsl: "hsl(210, 20%, 50%)",  key: "docIndex" },
  { name: "key",          w: 24, align: "left" as const,   hsl: "hsl(0, 0%, 95%)",     key: "key" },
  { name: "value",        w: 24, align: "left" as const,   hsl: "hsl(200, 15%, 80%)",  key: "value" },
  { name: "yamlType",     w: 10, align: "center" as const, hsl: "hsl(280, 60%, 60%)",  key: "yamlType" },  // Purple for YAML
  { name: "jsType",       w: 8,  align: "center" as const, hsl: "hsl(180, 60%, 55%)",  key: "jsType" },    // Cyan for JS
  { name: "anchor",       w: 10, align: "left" as const,   hsl: "hsl(120, 40%, 45%)",  key: "anchor" },    // Green for anchors
  { name: "alias",        w: 12, align: "left" as const,   hsl: "hsl(48, 100%, 60%)",  key: "alias" },     // Gold for aliases
  { name: "version",      w: 8,  align: "center" as const, hsl: "hsl(300, 70%, 65%)",  key: "version" },
  { name: "bun",          w: 8,  align: "center" as const, hsl: "hsl(220, 90%, 60%)",  key: "bun" },
  { name: "interp",       w: 6,  align: "center" as const, hsl: "hsl(10, 90%, 55%)",   key: "interpolated" }, // Red if true
  { name: "author",       w: 12, align: "left" as const,   hsl: "hsl(48, 100%, 60%)",  key: "author" },
  { name: "status",       w: 8,  align: "center" as const, hsl: null,                  key: "status" },     // Dynamic
];

export interface ColumnConfig {
  name: string;
  w: number;
  align: "left" | "right" | "center";
  hsl: string | null;
  key: keyof YAMLNode;
}

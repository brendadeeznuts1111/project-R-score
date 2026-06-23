export type Loader = "js" | "jsx" | "ts" | "tsx";

export type Severity = "info" | "warn" | "error" | "low" | "medium" | "high" | "critical";

export type ScanLayer = "import" | "source" | "output" | "integrity" | "deps";

export type ImportKind =
  | "import-statement"
  | "require-call"
  | "require-resolve"
  | "dynamic-import"
  | "import-rule"
  | "url-token"
  | "internal"
  | "entry-point-build"
  | "entry-point-run";

export type RuleType = "regex" | "ast" | "import";

export interface PolicyRule {
  id: string;
  description: string;
  severity: Severity;
  type: RuleType;
  layer: ScanLayer;
  pattern?: string;
  path_pattern?: string;
  kind?: ImportKind;
  astPattern?: string;
  message?: string;
}

export interface RuleSet {
  version: number;
  import_rules: PolicyRule[];
  source_rules: PolicyRule[];
  output_rules: PolicyRule[];
}

export interface ScanProfile {
  description?: string;
  min_severity: Severity;
  transform_output: boolean;
  use_scan_imports: boolean;
  max_file_kb: number;
  include_node_modules?: boolean;
  exclude_globs?: string[];
  threat_feed?: boolean;
  include_dev_dependencies?: boolean;
  correlate_symbols?: boolean;
}

export interface ScanResult {
  type: "transpiler" | "semver";
  file: string;
  line: number;
  column: number;
  ruleId: string;
  severity: Severity;
  message: string;
  layer: ScanLayer;
  snippet?: string;
  detail?: string;
  hashBefore?: string;
  hashAfter?: string;
  integrityMismatch?: boolean;
}

export interface FileScanResult {
  file: string;
  skipped?: boolean;
  skip_reason?: string;
  findings: ScanResult[];
  imports_scanned?: number;
  scan_ms?: number;
  sha256?: string;
}

export interface TargetScanResult {
  id: string;
  path: string;
  skipped: boolean;
  files_scanned: number;
  findings: ScanResult[];
  files: FileScanResult[];
  scan_ms: number;
}

export interface BundleScanReport {
  repo: string;
  profile: string;
  layer: "4.5";
  description?: string;
  min_severity: Severity;
  format: "json" | "html" | "markdown";
  elapsed_ms: number;
  workers: number;
  integrity_enabled: boolean;
  threat_feed_enabled: boolean;
  advisories_matched: number;
  targets: TargetScanResult[];
  summary: {
    files: number;
    findings: number;
    by_severity: Record<string, number>;
  };
}
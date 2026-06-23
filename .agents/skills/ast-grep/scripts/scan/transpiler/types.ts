export type Loader = "js" | "jsx" | "ts" | "tsx";

export type Severity = "info" | "warn" | "error" | "low" | "medium" | "high" | "critical";

export type ScanLayer = "import" | "source" | "output" | "integrity" | "deps" | "network";

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
  network_rules: PolicyRule[];
}

export type ReportFormat = "json" | "html" | "markdown" | "ansi" | "plaintext";

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
  remediation_plan?: boolean;
  policy_constraints?: boolean;
  report_format?: ReportFormat;
  markdown_colored?: boolean;
  platform_target?: { cpu: string; os: string };
  install_profile?: string;
  network_audit?: boolean;
  network_dedupe?: boolean;
  endpoint_meta?: boolean;
}

export type RemediationAction = "upgrade" | "remove";

export type ScanRemediation = {
  action?: RemediationAction;
  safeRange: string;
  suggestedVersion: string | null;
  latestInLockfile: string | null;
  command: string;
  reason?: string;
};

export type ViolationKind = "semver_rule" | "allowed" | "blocked" | "threat";

export interface ScanResult {
  type: "transpiler" | "semver" | "threat";
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
  cve?: string;
  violationKind?: ViolationKind;
  kinds?: ViolationKind[];
  packageVersion?: string;
  remediation?: ScanRemediation;
  networkSurface?: string;
  colors?: {
    severity: string;
    kinds?: string[];
  };
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
  format: ReportFormat;
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
  remediation?: {
    actionable: number;
    upgrades: number;
    removals: number;
    commands: string[];
  };
  platform?: {
    host: { cpu: string; os: string; rawArch: string; bunVersion: string };
    target: { cpu: string; os: string };
    crossTarget: boolean;
    installProfile?: string;
    installArgs: string[];
    docs: string;
  };
  network?: {
    enabled: boolean;
    total: number;
    unique_total: number;
    by_surface: Record<string, number>;
    by_rule: Record<string, number>;
    by_file: Array<{
      file: string;
      basename: string;
      hits: number;
      uniqueRules: string[];
      surfaces: Record<string, number>;
    }>;
    hotspots: Array<{
      file: string;
      basename: string;
      hits: number;
      uniqueRules: string[];
      surfaces: Record<string, number>;
    }>;
    docs: string;
  };
  endpoints?: {
    source: string;
    title?: string;
    version?: string;
    total: number;
    health_count: number;
    by_tag: Record<string, number>;
    by_kind: Record<string, number>;
    health_routes: Array<{ path: string; method: string; summary?: string }>;
    route_fingerprints?: string[];
  };
  health?: {
    probed: boolean;
    base_url: string;
    overall: "healthy" | "degraded" | "unreachable";
    probes: Array<{
      url: string;
      ok: boolean;
      status: number;
      latency_ms: number;
      error?: string;
    }>;
  };
}
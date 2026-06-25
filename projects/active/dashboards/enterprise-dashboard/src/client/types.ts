export interface PolishConfig {
  deferredDelay: number;
  deferredAnalytics: number;
  deferredMetrics: number;
  themeTransitionDuration: number;
  virtualizationRowHeight: number;
  virtualizationOverscan: number;
  virtualizationDefaultColumns: number;
  virtualizationMaxColumns: number;
  probeTimeout: number;
  integrityCacheTTL: number;
  integrityVisualCue: string;
}

export interface ThemeConfig {
  primary: string;
  'primary-hover': string;
  secondary: string;
  'secondary-hover': string;
  success: string;
  'success-hover': string;
  warning: string;
  'warning-hover': string;
  danger: string;
  'danger-hover': string;
  info: string;
  'info-hover': string;
  background: string;
  surface: string;
  'surface-elevated': string;
  'surface-sunken': string;
  'text-primary': string;
  'text-secondary': string;
  'text-muted': string;
  'text-inverted': string;
  border: string;
  'border-hover': string;
  'border-focus': string;
  shadow: string;
  'shadow-md': string;
  'shadow-lg': string;
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;
  'chart-6': string;
}

export interface MatrixColumn {
  id: string;
  label: string;
  width: number;
  type: string;
  sortable?: boolean;
  filterable?: boolean;
}

export interface AssetInfo {
  path: string;
  crc32: number;
}

export interface NetworkProbeResult {
  latency: number | null;
  online: boolean;
  timestamp: number;
}

export interface DeferredDataOptions {
  key: string;
  customDelay?: number;
}

export interface DeferredDataResult<T> {
  data: T | null;
  isLoading: boolean;
  delay: number;
}

export type ThemeName = 'light' | 'dark' | 'high-contrast' | 'midnight';

export type ProbeStatus = 'idle' | 'probing' | 'online' | 'offline';

export interface ProbeResult {
  status: ProbeStatus;
  latency: number | null;
  error: string | null;
  timestamp: number;
}

export interface UseOptimisticProbeResult {
  status: ProbeStatus;
  latency: number | null;
  error: string | null;
  isProbing: boolean;
  probe: () => Promise<void>;
  lastProbe: ProbeResult | null;
}

export interface UseCRC32Result {
  isValid: boolean | null;
  isLoading: boolean;
  error: string | null;
  computedCRC32: number | null;
  expectedCRC32: number | null;
  reload: () => void;
}

export interface VirtualizedMatrixResult {
  columns: MatrixColumn[];
  visibleRows: number[];
  totalHeight: number;
  visibleRange: { start: number; end: number };
  scrollToIndex: (index: number) => void;
  getColumnStyle: (column: MatrixColumn, index: number) => React.CSSProperties;
}

export interface TransitionThemeResult {
  switchTheme: (newTheme: ThemeName) => void;
  currentTheme: ThemeName;
  isPending: boolean;
  availableThemes: ThemeName[];
  getThemeColors: (theme: ThemeName) => ThemeConfig;
}

/** Dashboard tab view identifier */
export type TabView =
  | "dashboard"
  | "projects"
  | "analytics"
  | "network"
  | "config"
  | "settings"
  | "clitools"
  | "urlpattern"
  | "pty"
  | "resources"
  | "topology"
  | "kyc"
  | "diagnose"
  | "benchmarks"
  | "tests";

/** Snapshot metadata for dashboard storage UI */
export interface Snapshot {
  filename: string;
  size: number;
  timestamp: string;
  projectCount: number;
}

/** Map API list response (name/lastModified) to Snapshot (filename/timestamp) */
export function mapApiSnapshots(raw: Array<{ name?: string; filename?: string; size?: number; lastModified?: string | number | Date; timestamp?: string; projectCount?: number }>): Snapshot[] {
  return raw.map((s) => ({
    filename: s.name ?? s.filename ?? "",
    size: s.size ?? 0,
    timestamp:
      typeof s.lastModified === "number"
        ? new Date(s.lastModified).toISOString()
        : s.lastModified instanceof Date
          ? s.lastModified.toISOString()
          : (typeof s.lastModified === "string" ? s.lastModified : null) ?? s.timestamp ?? new Date().toISOString(),
    projectCount: s.projectCount ?? 0,
  }));
}

/** Storage configuration for snapshot UX */
export interface StorageConfig {
  configured: boolean;
  bucket?: string;
  endpoint?: string;
  snapshotCount?: number;
}

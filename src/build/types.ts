// src/build/types.ts
// Type definitions for Bun Build Metafile v4.0

export type ImportKind = Bun.ImportKind;

export interface ImportMeta {
  path: string;
  kind: ImportKind;
  original?: string;
  external?: boolean;
  with?: Record<string, string>;
}

export interface InputMeta {
  bytes: number;
  imports: ImportMeta[];
  format?: 'esm' | 'cjs' | 'json' | 'css';
}

export interface OutputInputMeta {
  bytesInOutput: number;
}

export interface OutputMeta {
  bytes: number;
  inputs: Record<string, OutputInputMeta>;
  imports: ImportMeta[];
  exports: string[];
  entryPoint?: string;
  cssBundle?: string;
}

export type BuildMetafile = NonNullable<Bun.BuildOutput["metafile"]>;

export interface MetafileOptions {
  json?: string;
  markdown?: string;
  analyze?: boolean;
  graph?: boolean;
}

export interface BundleAnalysis {
  totalFiles: number;
  totalBytes: number;
  averageFileSize: number;
  formatBreakdown: Record<string, { count: number; bytes: number }>;
  importAnalysis: Record<string, { count: number; external: number; internal: number }>;
  largestFiles: Array<{ path: string; bytes: number; format?: string }>;
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: 'input' | 'output';
    bytes: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'import' | 'input';
    weight: number;
  }>;
}

export interface SizeAnalysis {
  compressionRatio: number;
  sizeBreakdown: {
    inputs: number;
    outputs: number;
    savings: number;
  };
  largestDependencies: Array<{
    path: string;
    size: number;
    files: number;
  }>;
  optimizationOpportunities: string[];
}

export interface MetafileReport {
  timestamp: string;
  version: string;
  inputAnalysis: BundleAnalysis;
  outputAnalysis: {
    totalFiles: number;
    totalBytes: number;
    averageFileSize: number;
    exportAnalysis: Record<string, number>;
    bundleAnalysis: {
      totalBundles: number;
      entryPointBundles: number;
      cssBundles: number;
      averageExports: number;
    };
    entryPoints: Array<{ path: string; entryPoint: string }>;
    cssBundles: Array<{ path: string; cssBundle: string }>;
  };
  sizeAnalysis: SizeAnalysis;
  dependencyGraph: DependencyGraph;
  importFrequency: Array<{ path: string; count: number }>;
  unusedExports: string[];
  circularDependencies: string[][];
}

// Bundle Snapshot types for regression testing
export interface BundleSnapshot {
  inputCount: number;
  outputCount: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  compressionRatio: number;
  formatBreakdown: Record<string, { count: number; bytes: number }>;
  circularDependencyCount: number;
  unusedExportCount: number;
  graphNodeCount: number;
  graphEdgeCount: number;
  largestFiles: Array<{ path: string; bytes: number }>;
}

export interface SnapshotDiff {
  inputCountDelta: number;
  outputCountDelta: number;
  totalInputBytesDelta: number;
  totalOutputBytesDelta: number;
  compressionRatioDelta: number;
  circularDependencyCountDelta: number;
  unusedExportCountDelta: number;
  graphNodeCountDelta: number;
  graphEdgeCountDelta: number;
  newFiles: string[];
  removedFiles: string[];
}

// Bundle Guard types for threshold-based assertions
export interface BundleGuardConfig {
  maxBundleSize?: number;
  maxFileCount?: number;
  maxInputCount?: number;
  maxCircularDeps?: number;
  maxUnusedExports?: number;
  maxSingleFileSize?: number;
  maxCompressionRatio?: number;
}

export interface GuardViolation {
  rule: string;
  message: string;
  actual: number | string;
  threshold: number | string;
  severity: 'error' | 'warning';
}

export interface GuardResult {
  passed: boolean;
  violations: GuardViolation[];
  summary: string;
}

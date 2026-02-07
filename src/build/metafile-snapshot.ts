// src/build/metafile-snapshot.ts
// Snapshot test helpers for deterministic bundle regression testing
import type { BuildMetafile, BundleSnapshot, SnapshotDiff } from './types';
import { MetafileAnalyzer } from './metafile-analyzer';

export function createBundleSnapshot(metafile: BuildMetafile): BundleSnapshot {
  const analyzer = new MetafileAnalyzer(metafile);
  const inputAnalysis = analyzer.getInputAnalysis();
  const outputAnalysis = analyzer.getOutputAnalysis();
  const sizeAnalysis = analyzer.getSizeAnalysis();
  const graph = analyzer.getDependencyGraph();
  const circularDeps = analyzer.getCircularDependencies();
  const unusedExports = analyzer.getUnusedExports();

  return {
    inputCount: inputAnalysis.totalFiles,
    outputCount: outputAnalysis.totalFiles,
    totalInputBytes: inputAnalysis.totalBytes,
    totalOutputBytes: outputAnalysis.totalBytes,
    compressionRatio: sizeAnalysis.compressionRatio,
    formatBreakdown: inputAnalysis.formatBreakdown,
    circularDependencyCount: circularDeps.length,
    unusedExportCount: unusedExports.length,
    graphNodeCount: graph.nodes.length,
    graphEdgeCount: graph.edges.length,
    largestFiles: inputAnalysis.largestFiles
      .slice(0, 5)
      .map((f: { path: string; bytes: number }) => ({ path: f.path, bytes: f.bytes })),
  };
}

export function diffSnapshots(baseline: BundleSnapshot, current: BundleSnapshot): SnapshotDiff {
  const baselinePaths = new Set(baseline.largestFiles.map((f) => f.path));
  const currentPaths = new Set(current.largestFiles.map((f) => f.path));

  return {
    inputCountDelta: current.inputCount - baseline.inputCount,
    outputCountDelta: current.outputCount - baseline.outputCount,
    totalInputBytesDelta: current.totalInputBytes - baseline.totalInputBytes,
    totalOutputBytesDelta: current.totalOutputBytes - baseline.totalOutputBytes,
    compressionRatioDelta: current.compressionRatio - baseline.compressionRatio,
    circularDependencyCountDelta: current.circularDependencyCount - baseline.circularDependencyCount,
    unusedExportCountDelta: current.unusedExportCount - baseline.unusedExportCount,
    graphNodeCountDelta: current.graphNodeCount - baseline.graphNodeCount,
    graphEdgeCountDelta: current.graphEdgeCount - baseline.graphEdgeCount,
    newFiles: [...currentPaths].filter((p) => !baselinePaths.has(p)),
    removedFiles: [...baselinePaths].filter((p) => !currentPaths.has(p)),
  };
}

export function normalizeMetafilePaths(metafile: BuildMetafile): BuildMetafile {
  const normalize = (p: string): string =>
    p.replace(/\\/g, '/').replace(/^(?:[A-Za-z]:)?(?:\/[^/]+)*\/(?=(?:src|lib|dist|out|build|node_modules)\/)/, '');

  const normalizeRecord = <T>(record: Record<string, T>): Record<string, T> => {
    const result: Record<string, T> = {};
    for (const [key, value] of Object.entries(record)) {
      result[normalize(key)] = value;
    }
    return result;
  };

  const inputs = normalizeRecord(metafile.inputs);
  // Normalize import paths inside inputs
  for (const meta of Object.values(inputs)) {
    meta.imports = meta.imports.map((imp) => ({ ...imp, path: normalize(imp.path) }));
  }

  const outputs = normalizeRecord(metafile.outputs);
  // Normalize input keys inside outputs
  for (const meta of Object.values(outputs)) {
    meta.inputs = normalizeRecord(meta.inputs);
    meta.imports = meta.imports.map((imp) => ({ ...imp, path: normalize(imp.path) }));
    if (meta.entryPoint) meta.entryPoint = normalize(meta.entryPoint);
  }

  return { inputs, outputs };
}

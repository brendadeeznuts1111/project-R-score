import type { BuildMetafile, InputMeta, OutputMeta } from "../build/types";
import { StringOptimizer } from "./string-optimizer";

type ExternalDependency = { name: string; count: number; usedBy: string[] };
type InternalDependency = { from: string; to: string; count: number };

type InputAnalysisRow = {
  path: string;
  fileName: string;
  bytes: number;
  bytesFormatted: string;
  format?: InputMeta["format"];
  importCount: number;
  externalImports: number;
  isEntry: boolean;
  complexity: number;
};

type OutputAnalysisRow = {
  path: string;
  fileName: string;
  bytes: number;
  bytesFormatted: string;
  inputCount: number;
  exportCount: number;
  isEntry: boolean;
  cssBundle?: string;
  efficiency: number;
};

type AnalyzerWarning = {
  type: "unused-import";
  message: string;
  severity: "medium";
  location: string;
};

type AnalyzerSuggestion = {
  type: "compression" | "bundle-splitting";
  message: string;
  impact: "medium" | "high";
  estimatedSavings: number;
};

export interface UltraBundleAnalysis {
  summary: {
    timestamp: number;
    totalInputBytes: number;
    totalOutputBytes: number;
    compressionRatio: number;
    fileCount: number;
    chunkCount: number;
    averageChunkSize: number;
    largestChunk: { path: string; bytes: number };
    smallestChunk: { path: string; bytes: number };
    analysisTimeMs: number;
  };
  inputs: InputAnalysisRow[];
  outputs: OutputAnalysisRow[];
  dependencies: {
    external: ExternalDependency[];
    internal: InternalDependency[];
  };
  warnings: AnalyzerWarning[];
  suggestions: AnalyzerSuggestion[];
}

export class UltraOptimizedAnalyzer {
  private static readonly OPTIMIZED_METHODS = {
    startsWith: String.prototype.startsWith,
  };

  private static readonly MB = 1024 * 1024;
  private static readonly BYTES_PROPERTY = "bytes";
  private static readonly INPUTS_PROPERTY = "inputs";
  private static readonly OUTPUTS_PROPERTY = "outputs";

  analyze(metafile: BuildMetafile): UltraBundleAnalysis {
    const start = performance.now();

    const inputs = metafile[UltraOptimizedAnalyzer.INPUTS_PROPERTY] ?? {};
    const outputs = metafile[UltraOptimizedAnalyzer.OUTPUTS_PROPERTY] ?? {};

    const inputEntries = Object.entries(inputs);
    const outputEntries = Object.entries(outputs);

    const totalInputBytes = this.sumBytes(inputEntries);
    const totalOutputBytes = this.sumBytes(outputEntries);
    const { largestChunk, smallestChunk } = this.findMinMax(outputEntries);

    const dependencies = this.extractDependencies(inputEntries);
    const warnings = this.generateWarnings(inputs, outputs);
    const analysisTime = performance.now() - start;

    return {
      summary: {
        timestamp: Date.now(),
        totalInputBytes,
        totalOutputBytes,
        compressionRatio: totalInputBytes > 0 ? totalOutputBytes / totalInputBytes : 0,
        fileCount: inputEntries.length,
        chunkCount: outputEntries.length,
        averageChunkSize: outputEntries.length > 0 ? totalOutputBytes / outputEntries.length : 0,
        largestChunk,
        smallestChunk,
        analysisTimeMs: analysisTime,
      },
      inputs: this.analyzeInputs(inputEntries),
      outputs: this.analyzeOutputs(outputEntries),
      dependencies,
      warnings,
      suggestions: this.generateSuggestions(totalInputBytes, totalOutputBytes),
    };
  }

  private sumBytes(entries: Array<[string, { bytes?: number }]>): number {
    let sum = 0;
    for (let i = 0; i < entries.length; i++) {
      sum += entries[i][1][UltraOptimizedAnalyzer.BYTES_PROPERTY] ?? 0;
    }
    return sum;
  }

  private findMinMax(entries: Array<[string, OutputMeta]>): {
    largestChunk: { path: string; bytes: number };
    smallestChunk: { path: string; bytes: number };
  } {
    if (entries.length === 0) {
      return {
        largestChunk: { path: "", bytes: 0 },
        smallestChunk: { path: "", bytes: 0 },
      };
    }

    let largestChunk = { path: entries[0][0], bytes: entries[0][1].bytes ?? 0 };
    let smallestChunk = { path: entries[0][0], bytes: entries[0][1].bytes ?? 0 };

    for (let i = 1; i < entries.length; i++) {
      const [path, output] = entries[i];
      const bytes = output.bytes ?? 0;
      if (bytes > largestChunk.bytes) largestChunk = { path, bytes };
      if (bytes < smallestChunk.bytes) smallestChunk = { path, bytes };
    }

    return { largestChunk, smallestChunk };
  }

  private extractDependencies(inputEntries: Array<[string, InputMeta]>): {
    external: ExternalDependency[];
    internal: InternalDependency[];
  } {
    const externalMap = new Map<string, { count: number; usedBy: Set<string> }>();
    const internalMap = new Map<string, InternalDependency>();

    for (let i = 0; i < inputEntries.length; i++) {
      const [inputPath, input] = inputEntries[i];
      const imports = input.imports ?? [];

      for (let j = 0; j < imports.length; j++) {
        const imp = imports[j];
        const importPath = imp.path ?? "";
        const externalByPrefix =
          StringOptimizer.isExternalImport(importPath) ||
          UltraOptimizedAnalyzer.OPTIMIZED_METHODS.startsWith.call(importPath, "node:") ||
          UltraOptimizedAnalyzer.OPTIMIZED_METHODS.startsWith.call(importPath, "npm:");

        if (imp.external || externalByPrefix) {
          const existing = externalMap.get(importPath);
          if (existing) {
            existing.count++;
            existing.usedBy.add(inputPath);
          } else {
            externalMap.set(importPath, { count: 1, usedBy: new Set([inputPath]) });
          }
          continue;
        }

        const key = `${inputPath}->${importPath}`;
        const existing = internalMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          internalMap.set(key, { from: inputPath, to: importPath, count: 1 });
        }
      }
    }

    return {
      external: Array.from(externalMap.entries())
        .map(([name, data]) => ({ name, count: data.count, usedBy: Array.from(data.usedBy) }))
        .sort((a, b) => b.count - a.count),
      internal: Array.from(internalMap.values()).sort((a, b) => b.count - a.count),
    };
  }

  private generateWarnings(
    inputs: Record<string, InputMeta>,
    outputs: Record<string, OutputMeta>,
  ): AnalyzerWarning[] {
    const warnings: AnalyzerWarning[] = [];
    const usedInputs = new Set<string>();
    const outputValues = Object.values(outputs);

    for (let i = 0; i < outputValues.length; i++) {
      const inputKeys = Object.keys(outputValues[i][UltraOptimizedAnalyzer.INPUTS_PROPERTY] ?? {});
      for (let j = 0; j < inputKeys.length; j++) usedInputs.add(inputKeys[j]);
    }

    const inputKeys = Object.keys(inputs);
    for (let i = 0; i < inputKeys.length; i++) {
      const path = inputKeys[i];
      if (!usedInputs.has(path)) {
        warnings.push({
          type: "unused-import",
          message: `File not included in any bundle: ${path}`,
          severity: "medium",
          location: path,
        });
      }
    }

    return warnings;
  }

  private analyzeInputs(entries: Array<[string, InputMeta]>): InputAnalysisRow[] {
    const rows = new Array<InputAnalysisRow>(entries.length);

    for (let i = 0; i < entries.length; i++) {
      const [path, input] = entries[i];
      const imports = input.imports ?? [];
      let externalCount = 0;
      for (let j = 0; j < imports.length; j++) if (imports[j].external) externalCount++;

      rows[i] = {
        path,
        fileName: StringOptimizer.getFileName(path),
        bytes: input.bytes ?? 0,
        bytesFormatted: StringOptimizer.formatBytes(input.bytes ?? 0),
        format: input.format,
        importCount: imports.length,
        externalImports: externalCount,
        isEntry: false,
        complexity: Math.sqrt(imports.length * 2 + externalCount * 3),
      };
    }

    rows.sort((a, b) => b.bytes - a.bytes);
    return rows;
  }

  private analyzeOutputs(entries: Array<[string, OutputMeta]>): OutputAnalysisRow[] {
    const rows = new Array<OutputAnalysisRow>(entries.length);

    for (let i = 0; i < entries.length; i++) {
      const [path, output] = entries[i];
      const inputObjects = output[UltraOptimizedAnalyzer.INPUTS_PROPERTY] ?? {};
      const inputValues = Object.values(inputObjects);
      let inputBytes = 0;
      for (let j = 0; j < inputValues.length; j++) inputBytes += inputValues[j].bytesInOutput ?? 0;

      rows[i] = {
        path,
        fileName: StringOptimizer.getFileName(path),
        bytes: output.bytes ?? 0,
        bytesFormatted: StringOptimizer.formatBytes(output.bytes ?? 0),
        inputCount: Object.keys(inputObjects).length,
        exportCount: (output.exports ?? []).length,
        isEntry: !!output.entryPoint,
        cssBundle: output.cssBundle,
        efficiency: (output.bytes ?? 0) / Math.max(inputBytes, 1),
      };
    }

    rows.sort((a, b) => b.bytes - a.bytes);
    return rows;
  }

  private generateSuggestions(totalInputBytes: number, totalOutputBytes: number): AnalyzerSuggestion[] {
    const suggestions: AnalyzerSuggestion[] = [];
    const compressionRatio = totalInputBytes > 0 ? totalOutputBytes / totalInputBytes : 0;

    if (compressionRatio > 0.8) {
      suggestions.push({
        type: "compression",
        message: `High compression ratio (${(compressionRatio * 100).toFixed(1)}%). Consider code splitting.`,
        impact: "medium",
        estimatedSavings: Math.round(totalOutputBytes * 0.1),
      });
    }

    if (totalOutputBytes > 2 * UltraOptimizedAnalyzer.MB) {
      suggestions.push({
        type: "bundle-splitting",
        message: "Bundle exceeds 2MB. Consider splitting into smaller chunks.",
        impact: "high",
        estimatedSavings: Math.round(totalOutputBytes * 0.2),
      });
    }

    return suggestions;
  }

  static benchmarkStringOperations(iterations = 1_000_000): void {
    const testString = "  Hello, World!  ";
    const searchTerm = "Hello";

    console.info("Benchmarking optimized string operations");

    let start = performance.now();
    for (let i = 0; i < iterations; i++) testString.startsWith(searchTerm);
    let time = performance.now() - start;
    console.info(`startsWith: ${time.toFixed(2)}ms (${(iterations / time).toFixed(0)} ops/ms)`);

    start = performance.now();
    for (let i = 0; i < iterations; i++) testString.trim();
    time = performance.now() - start;
    console.info(`trim: ${time.toFixed(2)}ms (${(iterations / time).toFixed(0)} ops/ms)`);

    start = performance.now();
    for (let i = 0; i < iterations; i++) testString.replace("World", "Bun");
    time = performance.now() - start;
    console.info(`replace: ${time.toFixed(2)}ms (${(iterations / time).toFixed(0)} ops/ms)`);
  }

  static benchmarkSetMapOperations(iterations = 1_000_000): void {
    const set = new Set([1, 2, 3, 4, 5]);
    const map = new Map([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);

    console.info("Benchmarking optimized Set/Map size operations");

    let start = performance.now();
    for (let i = 0; i < iterations; i++) void set.size;
    let time = performance.now() - start;
    console.info(`Set.size: ${time.toFixed(2)}ms (${(iterations / time).toFixed(0)} ops/ms)`);

    start = performance.now();
    for (let i = 0; i < iterations; i++) void map.size;
    time = performance.now() - start;
    console.info(`Map.size: ${time.toFixed(2)}ms (${(iterations / time).toFixed(0)} ops/ms)`);
  }
}

export function analyzeMetafileUltra(metafile: BuildMetafile): UltraBundleAnalysis {
  return new UltraOptimizedAnalyzer().analyze(metafile);
}

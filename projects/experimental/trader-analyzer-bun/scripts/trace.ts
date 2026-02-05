/**
 * @fileoverview Deep Code Traversal Tool
 * @description Generate call graphs and analyze code flow
 * @module scripts/trace
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TRACE@0.1.0;instance-id=TRACE-001;version=0.1.0}]
 * [PROPERTIES:{trace={value:"code-traversal";@root:"ROOT-DEV";@chain:["BP-AST","BP-CALL-GRAPH"];@version:"0.1.0"}}]
 * [CLASS:CodeTracer][#REF:v-0.1.0.BP.TRACE.1.0.A.1.1.DEV.1.1]]
 */

// Use Bun.Glob for file matching

interface TraceOptions {
  entry?: string;
  depth?: number | "inf";
  visualize?: boolean;
  hotspots?: boolean;
  export?: string;
}

interface CallNode {
  name: string;
  file: string;
  line: number;
  calls: CallNode[];
  callCount: number;
}

/**
 * Code tracer for call graph analysis
 */
export class CodeTracer {
  private nodes = new Map<string, CallNode>();
  private entryPoint?: string;
  private maxDepth: number;

  constructor(private options: TraceOptions) {
    this.maxDepth = options.depth === "inf" ? Infinity : (options.depth || 10);
  }

  /**
   * Trace call graph from entry point
   */
  async trace(entryPoint: string): Promise<CallNode | null> {
    this.entryPoint = entryPoint;
    const entryNode = await this.traceFile(entryPoint, 0);
    return entryNode;
  }

  /**
   * Trace file and its calls
   */
  private async traceFile(
    filePath: string,
    depth: number,
  ): Promise<CallNode | null> {
    if (depth > this.maxDepth) return null;

    const nodeId = filePath;
    if (this.nodes.has(nodeId)) {
      return this.nodes.get(nodeId)!;
    }

    const content = await Bun.file(filePath).text();
    const calls = this.extractCalls(content);

    const node: CallNode = {
      name: filePath.split("/").pop() || filePath,
      file: filePath,
      line: 0,
      calls: [],
      callCount: 0,
    };

    this.nodes.set(nodeId, node);

    // Trace called functions
    for (const call of calls) {
      const calledFile = await this.resolveCall(call, filePath);
      if (calledFile) {
        const calledNode = await this.traceFile(calledFile, depth + 1);
        if (calledNode) {
          node.calls.push(calledNode);
          node.callCount++;
        }
      }
    }

    return node;
  }

  /**
   * Extract function calls from code
   */
  private extractCalls(content: string): string[] {
    const calls: string[] = [];
    const lines = content.split("\n");

    // Match function calls: functionName(), obj.method(), import()
    const callRegex = /(\w+)\(/g;

    for (const line of lines) {
      let match;
      while ((match = callRegex.exec(line)) !== null) {
        const funcName = match[1];
        // Filter out common keywords
        if (
          !["if", "for", "while", "switch", "catch", "await", "return"].includes(
            funcName,
          )
        ) {
          calls.push(funcName);
        }
      }
    }

    return [...new Set(calls)]; // Deduplicate
  }

  /**
   * Resolve call to file path
   */
  private async resolveCall(
    callName: string,
    fromFile: string,
  ): Promise<string | null> {
    // Check imports in file
    const content = await Bun.file(fromFile).text();
    const importRegex = new RegExp(
      `import.*from\\s+['"](.*?)['"]`,
      "g",
    );

    const imports: string[] = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Try to resolve from imports
    for (const imp of imports) {
      if (imp.includes(callName.toLowerCase())) {
        return this.resolveImportPath(imp, fromFile);
      }
    }

    return null;
  }

  /**
   * Resolve import path to file
   */
  private resolveImportPath(importPath: string, fromFile: string): string {
    // Simple resolution - can be enhanced
    if (importPath.startsWith(".")) {
      const dir = fromFile.split("/").slice(0, -1).join("/");
      const resolved = `${dir}/${importPath.replace(/^\.\//, "")}.ts`;
      // Check if file exists
      try {
        const file = Bun.file(resolved);
        if (file.size !== undefined) {
          return resolved;
        }
      } catch {
        // File doesn't exist
      }
      return importPath;
    }
    // For node_modules imports, skip resolution
    return "";
  }

  /**
   * Find hotspots (most called functions)
   */
  findHotspots(limit: number = 10): CallNode[] {
    const allNodes = Array.from(this.nodes.values());
    return allNodes
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, limit);
  }

  /**
   * Export to Graphviz format
   */
  exportGraphviz(outputPath: string): string {
    const lines: string[] = ["digraph CallGraph {", "  rankdir=LR;"];

    for (const node of this.nodes.values()) {
      for (const called of node.calls) {
        lines.push(
          `  "${node.name}" -> "${called.name}" [label="${node.callCount}"];`,
        );
      }
    }

    lines.push("}");
    const dotContent = lines.join("\n");

    Bun.write(outputPath, dotContent);
    return dotContent;
  }

  /**
   * Visualize hotspots
   */
  visualizeHotspots(): void {
    const hotspots = this.findHotspots();
    console.log("\n🔥 Hotspots (most called functions):\n");
    for (const hotspot of hotspots) {
      console.log(`  ${hotspot.name} (${hotspot.callCount} calls)`);
      console.log(`    File: ${hotspot.file}`);
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: TraceOptions = {
    entry: args.find((a) => a.startsWith("--entry="))?.split("=")[1] || "src/index.ts",
    depth: args.find((a) => a.startsWith("--depth="))?.split("=")[1] === "inf" ? "inf" : parseInt(args.find((a) => a.startsWith("--depth="))?.split("=")[1] || "10"),
    visualize: args.includes("--visualize"),
    hotspots: args.includes("--hotspots"),
    export: args.find((a) => a.startsWith("--export="))?.split("=")[1],
  };

  const tracer = new CodeTracer(options);
  const root = await tracer.trace(options.entry!);

  if (options.hotspots) {
    tracer.visualizeHotspots();
  }

  if (options.export) {
    tracer.exportGraphviz(options.export);
    console.log(`✅ Exported call graph to ${options.export}`);
  }
}

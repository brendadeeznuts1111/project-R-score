#!/usr/bin/env bun
/**
 * Code Analysis & Refactoring Tool
 * Pure Bun code analysis, type extraction, and intelligent refactoring
 *
 * Usage:
 *   bun run cli/analyze.ts scan src/ --depth=3
 *   bun run cli/analyze.ts types --exported-only
 *   bun run cli/analyze.ts classes --inheritance
 *   bun run cli/analyze.ts rename --auto --dry-run
 *   bun run cli/analyze.ts polish --auto-apply
 *   bun run cli/analyze.ts strength --by-complexity
 *   bun run cli/analyze.ts deps --circular
 */

import { parseArgs } from "util";
import { join, relative, resolve } from "path";
import { readdir, writeFile, stat } from "fs/promises";
import { spawn } from "bun";
import { tmpdir } from "os";
import { openInChrome } from "./browser-utils";
import { generateHTMLHead, generateHeader, generateFooter, generateSkipLink } from "./html-headers";

// ANSI colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

// -----------------------------------------------------------------------------
// Bun.inspect.table + Bun.inspect.custom helpers
// -----------------------------------------------------------------------------

/**
 * Format tabular data with Bun.inspect.table (colors optional).
 */
function inspectTable<T extends Record<string, unknown>>(
  rows: T[],
  columns?: (keyof T)[],
  opts?: { colors?: boolean },
): string {
  const colors = opts?.colors ?? true;
  if (columns && columns.length > 0) {
    return Bun.inspect.table(rows, columns as string[], { colors });
  }
  return Bun.inspect.table(rows, { colors });
}

// Get Bun.inspect.custom symbol (like util.inspect.custom in Node.js)
const inspectCustom = typeof Bun !== "undefined" && (Bun as any).inspect?.custom;

/**
 * Table report with [Bun.inspect.custom] for pretty console output.
 * console.log(report) => renders Bun.inspect.table.
 */
class AnalyzeTable<T extends Record<string, unknown>> {
  constructor(
    public readonly rows: T[],
    public readonly columns?: (keyof T)[],
    public readonly opts: { colors?: boolean } = { colors: true },
  ) {}

  // Type declaration for Bun.inspect.custom (optional method)
  [key: symbol]: (() => string) | undefined;
}

// Implement Bun.inspect.custom if available
if (inspectCustom) {
  (AnalyzeTable.prototype as any)[inspectCustom] = function (this: AnalyzeTable<Record<string, unknown>>) {
    return inspectTable(this.rows, this.columns, this.opts);
  };
}

interface ThresholdOverrides {
  pattern: string;
  thresholds?: {
    maxComplexity?: number;
    minCoverage?: number;
    maxFileLines?: number;
    maxFileLinesWarning?: number;
    maxFunctionLines?: number;
    maxParameters?: number;
    maxNestedCallbacks?: number;
    minTypeCoverage?: number;
    maxDuplicateLines?: number;
    maxDependencyDepth?: number;
    allowUnsafe?: boolean;
  };
}

interface AnalyzeConfig {
  ignore?: string[];
  thresholds?: {
    maxComplexity?: number;
    minCoverage?: number;
    maxFileLines?: number;
    maxFileLinesWarning?: number;
    maxFunctionLines?: number;
    maxParameters?: number;
    maxNestedCallbacks?: number;
    minTypeCoverage?: number;
    maxDuplicateLines?: number;
    maxDependencyDepth?: number;
  };
  overrides?: ThresholdOverrides[];
  bun?: {
    ignoreTestFilesInCoverage?: boolean;
    checkLockfileIntegrity?: boolean;
    verifyNativeAddons?: boolean;
  };
  v8?: {
    maxArrayBufferSize?: number;
    warnOnSlowTypes?: boolean;
    checkExternalReferences?: boolean;
  };
}

interface AnalyzeOptions {
  depth?: number;
  typesOnly?: boolean;
  classesOnly?: boolean;
  functionsOnly?: boolean;
  metrics?: boolean;
  format?: "json" | "table" | "text" | "html";
  dryRun?: boolean;
  autoApply?: boolean;
  exportedOnly?: boolean;
  inheritance?: boolean;
  auto?: boolean;
  byComplexity?: boolean;
  circular?: boolean;
  path?: string;
  osChrome?: boolean;
  user?: string;
  domain?: string;
  scope?: string;
  bunNative?: boolean;
  ref?: string;
  stats?: boolean;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Resolves threshold overrides for a given file path
 */
function resolveThresholds(
  filePath: string,
  config: AnalyzeConfig
): AnalyzeConfig["thresholds"] {
  const baseThresholds = config.thresholds || {};
  if (!config.overrides || config.overrides.length === 0) {
    return baseThresholds;
  }

  // Simple glob pattern matching (supports ** and *)
  function matchesPattern(pattern: string, path: string): boolean {
    // Normalize paths (handle both absolute and relative)
    const normalizedPath = path.startsWith(process.cwd())
      ? relative(process.cwd(), path)
      : path;
    
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  }

  // Find matching overrides (last match wins)
  let resolved = { ...baseThresholds };
  for (const override of config.overrides) {
    if (matchesPattern(override.pattern, filePath)) {
      resolved = { ...resolved, ...override.thresholds };
    }
  }

  return resolved;
}

async function loadConfig(): Promise<AnalyzeConfig> {
  const configPath = join(process.cwd(), ".analyze.json");
  try {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      return await file.json();
    }
  } catch {
    // Ignore
  }
  return {
    ignore: [
      "node_modules",
      "dist",
      ".git",
      "__tests__",
      "build",
      ".bun",
      "coverage",
      "*.config.ts",
      "*.d.ts",
      "scripts/__mocks__",
      "**/*.spec.ts.snap",
      ".vinxi",
      ".output",
    ],
    thresholds: {
      maxComplexity: 8,
      minCoverage: 85,
      maxFileLines: 400,
      maxFileLinesWarning: 800,
      maxFunctionLines: 50,
      maxParameters: 4,
      maxNestedCallbacks: 3,
      minTypeCoverage: 95,
      maxDuplicateLines: 5,
      maxDependencyDepth: 3,
    },
    bun: {
      ignoreTestFilesInCoverage: true,
      checkLockfileIntegrity: true,
      verifyNativeAddons: true,
    },
    v8: {
      maxArrayBufferSize: 1073741824,
      warnOnSlowTypes: true,
      checkExternalReferences: true,
    },
  };
}

// =============================================================================
// File Discovery
// =============================================================================

async function findTypeScriptFiles(
  root: string,
  depth: number = 3,
  ignore: string[] = []
): Promise<string[]> {
  const files: string[] = [];
  const rootPath = resolve(root);

  // Check if the path is a file (not a directory)
  try {
    const stats = await stat(rootPath);
    if (stats.isFile()) {
      // If it's a TypeScript file, return it directly
      if (rootPath.endsWith(".ts") || rootPath.endsWith(".tsx")) {
        return [rootPath];
      }
      // If it's not a TypeScript file, return empty array
      return [];
    }
  } catch {
    // If stat fails, assume it's a directory and continue
  }

  async function walk(dir: string, currentDepth: number) {
    if (currentDepth > depth) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = relative(rootPath, fullPath);

        // Skip ignored patterns
        if (ignore.some((pattern) => relPath.includes(pattern))) {
          continue;
        }

        try {
          if (entry.isDirectory()) {
            await walk(fullPath, currentDepth + 1);
          } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
            files.push(fullPath);
          }
        } catch {
          // Skip entries that can't be accessed
        }
      }
    } catch {
      // Ignore errors
    }
  }

  await walk(rootPath, 0);
  return files;
}

// =============================================================================
// Type Extraction
// =============================================================================

interface TypeInfo {
  name: string;
  kind: "interface" | "type" | "class";
  file: string;
  line: number;
  exported: boolean;
  members?: string[];
}

async function extractTypes(
  files: string[],
  options: AnalyzeOptions
): Promise<TypeInfo[]> {
  const types: TypeInfo[] = [];

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      const lines = content.split("\n");

      // Simple regex-based extraction (for Bun, avoiding heavy deps)
      const interfaceRegex = /^(export\s+)?interface\s+(\w+)/gm;
      const typeRegex = /^(export\s+)?type\s+(\w+)\s*=/gm;
      const classRegex = /^(export\s+)?(abstract\s+)?class\s+(\w+)/gm;

      let match;
      while ((match = interfaceRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        types.push({
          name: match[2],
          kind: "interface",
          file: relative(process.cwd(), file),
          line: lineNum,
          exported: match[1]?.includes("export") ?? false,
        });
      }

      while ((match = typeRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        types.push({
          name: match[2],
          kind: "type",
          file: relative(process.cwd(), file),
          line: lineNum,
          exported: match[1]?.includes("export") ?? false,
        });
      }

      while ((match = classRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        types.push({
          name: match[3],
          kind: "class",
          file: relative(process.cwd(), file),
          line: lineNum,
          exported: match[1]?.includes("export") ?? false,
        });
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  if (options.exportedOnly) {
    return types.filter((t) => t.exported);
  }

  return types;
}

// =============================================================================
// Class Analysis
// =============================================================================

interface ClassInfo {
  name: string;
  file: string;
  line: number;
  exported: boolean;
  extends?: string;
  implements?: string[];
  methods: string[];
  properties: string[];
  tenant?: string;
  scope?: string;
  team?: string;
}

async function analyzeClasses(
  files: string[],
  options: AnalyzeOptions
): Promise<ClassInfo[]> {
  const classes: ClassInfo[] = [];

  // Extract tenant/scope/team from file paths and content
  function extractMetadata(file: string, content: string, className: string): { tenant?: string; scope?: string; team?: string } {
    const metadata: { tenant?: string; scope?: string; team?: string } = {};
    
    // Extract from file path patterns
    const pathParts = file.split('/');
    
    // Scope: Extract from directory structure (e.g., src/server/kyc/ -> scope: kyc)
    const scopePatterns = [
      /src\/server\/(\w+)\//,
      /src\/client\/(\w+)\//,
      /src\/(\w+)\//,
      /(\w+)\/.*\.ts/
    ];
    for (const pattern of scopePatterns) {
      const match = file.match(pattern);
      if (match && match[1] && match[1] !== 'server' && match[1] !== 'client' && match[1] !== 'src') {
        metadata.scope = match[1];
        break;
      }
    }
    
    // Tenant: Extract from comments or class name patterns
    const tenantPatterns = [
      /@tenant[:\s]+(\w+)/i,
      /tenant[:\s]+['"](\w+)['"]/i,
      /class\s+\w*Tenant\w*/i,
    ];
    for (const pattern of tenantPatterns) {
      const match = content.match(pattern) || className.match(pattern);
      if (match && match[1]) {
        metadata.tenant = match[1];
        break;
      }
    }
    
    // Team: Extract from comments, file path, or class name
    const teamPatterns = [
      /@team[:\s]+(\w+)/i,
      /team[:\s]+['"](\w+)['"]/i,
      /class\s+\w*Team\w*/i,
      /src\/teams\/(\w+)\//i,
    ];
    for (const pattern of teamPatterns) {
      const match = content.match(pattern) || file.match(pattern) || className.match(pattern);
      if (match && match[1]) {
        metadata.team = match[1];
        break;
      }
    }
    
    // Default scope based on common patterns
    if (!metadata.scope) {
      if (file.includes('/kyc/')) metadata.scope = 'kyc';
      else if (file.includes('/auth/')) metadata.scope = 'auth';
      else if (file.includes('/api/')) metadata.scope = 'api';
      else if (file.includes('/utils/')) metadata.scope = 'utils';
      else if (file.includes('/server/')) metadata.scope = 'server';
      else if (file.includes('/client/')) metadata.scope = 'client';
      else metadata.scope = 'core';
    }
    
    // Default tenant if not found
    if (!metadata.tenant) {
      metadata.tenant = 'default';
    }
    
    // Default team based on scope
    if (!metadata.team) {
      const scopeToTeam: Record<string, string> = {
        'kyc': 'security',
        'auth': 'security',
        'api': 'platform',
        'utils': 'platform',
        'server': 'platform',
        'client': 'frontend',
      };
      metadata.team = scopeToTeam[metadata.scope || 'core'] || 'platform';
    }
    
    return metadata;
  }

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();

      const classRegex = /^(export\s+)?(abstract\s+)?class\s+(\w+)(\s+extends\s+(\w+))?(\s+implements\s+([^\{]+))?/gm;
      let match;

      while ((match = classRegex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        const className = match[3];
        const extendsClass = match[5];
        const implementsList = match[7]
          ?.split(",")
          .map((i) => i.trim())
          .filter(Boolean);

        // Extract tenant/scope/team metadata
        const metadata = extractMetadata(file, content, className);

        // Extract methods and properties
        const classStart = match.index;
        const classEnd = findMatchingBrace(content, classStart);
        const classBody = content.substring(classStart, classEnd);

        const methods: string[] = [];
        const methodRegex = /(?:public|private|protected)?\s*(\w+)\s*\(/g;
        let methodMatch;
        while ((methodMatch = methodRegex.exec(classBody)) !== null) {
          if (methodMatch[1] !== "constructor") {
            methods.push(methodMatch[1]);
          }
        }

        const properties: string[] = [];
        const propRegex = /(?:public|private|protected)?\s*(\w+)\s*[:=]/g;
        let propMatch;
        while ((propMatch = propRegex.exec(classBody)) !== null) {
          properties.push(propMatch[1]);
        }

        classes.push({
          name: className,
          file: relative(process.cwd(), file),
          line: lineNum,
          exported: match[1]?.includes("export") ?? false,
          extends: extendsClass,
          implements: implementsList,
          methods,
          properties,
          tenant: metadata.tenant,
          scope: metadata.scope,
          team: metadata.team,
        });
      }
    } catch {
      // Skip
    }
  }

  return classes;
}

function findMatchingBrace(content: string, start: number): number {
  let depth = 0;
  let inString = false;
  let stringChar = "";

  for (let i = start; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : "";

    if (!inString && (char === '"' || char === "'" || char === "`")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== "\\") {
      inString = false;
    }

    if (!inString) {
      if (char === "{") depth++;
      if (char === "}") {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
  }

  return content.length;
}

// =============================================================================
// Complexity Analysis
// =============================================================================

interface ComplexityMetrics {
  cyclomatic: number;
  lines: number;
  functions: number;
  maxDepth: number;
}

function calculateComplexity(content: string): ComplexityMetrics {
  let cyclomatic = 1; // Base complexity
  let maxDepth = 0;
  let currentDepth = 0;
  const lines = content.split("\n").length;

  // Count decision points
  const decisionPatterns = [
    /\bif\s*\(/g,
    /\belse\s*if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcatch\s*\(/g,
    /\?\s*.*\s*:/g, // Ternary
    /\|\||&&/g, // Logical operators
  ];

  for (const pattern of decisionPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      cyclomatic += matches.length;
    }
  }

  // Calculate nesting depth
  const depthPattern = /[{}]/g;
  let match;
  while ((match = depthPattern.exec(content)) !== null) {
    if (match[0] === "{") {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else {
      currentDepth--;
    }
  }

  // Count functions
  const functionRegex = /(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|(?:async\s+)?\w+\s*\([^)]*\)\s*=>)/g;
  const functions = (content.match(functionRegex) || []).length;

  return {
    cyclomatic,
    lines,
    functions,
    maxDepth,
  };
}

// =============================================================================
// Dependency Analysis
// =============================================================================

interface DependencyInfo {
  file: string;
  imports: string[];
  exports: string[];
}

async function analyzeDependencies(
  files: string[],
  options: AnalyzeOptions
): Promise<Map<string, DependencyInfo>> {
  const deps = new Map<string, DependencyInfo>();

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      const relPath = relative(process.cwd(), file);
      const imports: string[] = [];
      const exports: string[] = [];

      // Extract imports
      const importRegex = /import\s+(?:.*\s+from\s+)?["']([^"']+)["']/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }

      // Extract exports
      const exportRegex = /export\s+(?:const|function|class|interface|type|default)\s+(\w+)/g;
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }

      deps.set(relPath, { file: relPath, imports, exports });
    } catch {
      // Skip
    }
  }

  return deps;
}

function findCircularDependencies(
  deps: Map<string, DependencyInfo>
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function resolvePath(importPath: string, fromFile: string): string | null {
    // Simple resolution - in real implementation, would use TypeScript resolver
    if (importPath.startsWith(".")) {
      const dir = fromFile.substring(0, fromFile.lastIndexOf("/"));
      return join(dir, importPath).replace(/\.tsx?$/, "");
    }
    return null;
  }

  function dfs(file: string, path: string[]): void {
    if (recStack.has(file)) {
      const cycleStart = path.indexOf(file);
      cycles.push([...path.slice(cycleStart), file]);
      return;
    }

    if (visited.has(file)) return;

    visited.add(file);
    recStack.add(file);

    const depInfo = deps.get(file);
    if (depInfo) {
      for (const imp of depInfo.imports) {
        const resolved = resolvePath(imp, file);
        if (resolved && deps.has(resolved)) {
          dfs(resolved, [...path, file]);
        }
      }
    }

    recStack.delete(file);
  }

  for (const file of deps.keys()) {
    if (!visited.has(file)) {
      dfs(file, []);
    }
  }

  return cycles;
}

// =============================================================================
// Commands
// =============================================================================

async function cmdScan(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const depth = options.depth || 3;
  const files = await findTypeScriptFiles(path, depth, config.ignore || []);

  console.log(`${c.bold}📊 Code Structure Analysis${c.reset}\n`);
  console.log(`Path: ${c.cyan}${path}${c.reset}`);
  console.log(`Depth: ${c.cyan}${depth}${c.reset}`);
  console.log(`Files found: ${c.green}${files.length}${c.reset}\n`);

  if (options.format === "json") {
    console.log(JSON.stringify({ files: files.map((f) => relative(process.cwd(), f)) }, null, 2));
    return;
  }

  if (options.metrics) {
    const rows: { file: string; lines: number; complexity: number; functions: number; "max depth": number }[] = [];
    for (const file of files) {
      try {
        const content = await Bun.file(file).text();
        const metrics = calculateComplexity(content);
        rows.push({
          file: relative(process.cwd(), file),
          lines: metrics.lines,
          complexity: metrics.cyclomatic,
          functions: metrics.functions,
          "max depth": metrics.maxDepth,
        });
      } catch {
        /* skip */
      }
    }
    rows.sort((a, b) => b.complexity - a.complexity);
    console.log(`${c.bold}Metrics (Bun.inspect.table)${c.reset}\n`);
    console.log(new AnalyzeTable(rows, ["file", "lines", "complexity", "functions", "max depth"]));
    return;
  }

  if (options.format === "table") {
    const rows = files.map((f) => ({ file: relative(process.cwd(), f) }));
    console.log(new AnalyzeTable(rows, ["file"]));
    return;
  }

  // Group by directory (default text tree)
  const byDir = new Map<string, string[]>();
  for (const file of files) {
    const rel = relative(process.cwd(), file);
    const dir = rel.substring(0, rel.lastIndexOf("/")) || ".";
    if (!byDir.has(dir)) {
      byDir.set(dir, []);
    }
    byDir.get(dir)!.push(rel);
  }

  for (const [dir, dirFiles] of Array.from(byDir.entries()).sort()) {
    console.log(`${c.bold}${dir}/${c.reset}`);
    for (const file of dirFiles.sort()) {
      console.log(`  ${c.dim}${file}${c.reset}`);
    }
  }
}

async function cmdTypes(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const files = await findTypeScriptFiles(path, options.depth || 3, config.ignore || []);
  const types = await extractTypes(files, options);

  if (options.format === "json") {
    console.log(JSON.stringify(types, null, 2));
    return;
  }

  if (options.format === "table") {
    const rows = types.map((t) => ({
      name: t.name,
      kind: t.kind,
      file: t.file,
      line: t.line,
      exported: t.exported,
    }));
    console.log(`${c.bold}📋 Type Extraction (${rows.length})${c.reset}\n`);
    console.log(new AnalyzeTable(rows, ["name", "kind", "file", "line", "exported"]));
    return;
  }

  console.log(`${c.bold}📋 Type Extraction${c.reset}\n`);

  const byKind = {
    interface: types.filter((t) => t.kind === "interface"),
    type: types.filter((t) => t.kind === "type"),
    class: types.filter((t) => t.kind === "class"),
  };

  console.log(`${c.bold}Interfaces (${byKind.interface.length}):${c.reset}`);
  for (const t of byKind.interface) {
    const exportMark = t.exported ? `${c.green}export${c.reset} ` : "";
    console.log(`  ${exportMark}${c.cyan}${t.name}${c.reset}      ${c.dim}${t.file}:${t.line}${c.reset}`);
  }

  console.log(`\n${c.bold}Type Aliases (${byKind.type.length}):${c.reset}`);
  for (const t of byKind.type) {
    const exportMark = t.exported ? `${c.green}export${c.reset} ` : "";
    console.log(`  ${exportMark}${c.cyan}${t.name}${c.reset}      ${c.dim}${t.file}:${t.line}${c.reset}`);
  }

  console.log(`\n${c.bold}Classes (${byKind.class.length}):${c.reset}`);
  for (const t of byKind.class) {
    const exportMark = t.exported ? `${c.green}export${c.reset} ` : "";
    console.log(`  ${exportMark}${c.cyan}${t.name}${c.reset}      ${c.dim}${t.file}:${t.line}${c.reset}`);
  }
}

async function formatClassesHTML(classes: ClassInfo[], inheritanceMap: Map<string, string[]>): Promise<string> {
  const totalMethods = classes.reduce((sum, cls) => sum + cls.methods.length, 0);
  const totalProperties = classes.reduce((sum, cls) => sum + cls.properties.length, 0);
  const avgMethods = (totalMethods / classes.length).toFixed(1);
  const avgProperties = (totalProperties / classes.length).toFixed(1);
  
  // Build a more complete inheritance tree including all classes
  const allParents = new Set<string>();
  const allChildren = new Set<string>();
  inheritanceMap.forEach((children, parent) => {
    allParents.add(parent);
    children.forEach(child => allChildren.add(child));
  });
  
  // Find root classes (parents that are not children)
  const rootClasses = Array.from(allParents).filter(p => !allChildren.has(p));
  
  // Build hierarchy map for matrix indentation
  const hierarchyMap = new Map<string, number>();
  const calculateLevel = (className: string, visited = new Set<string>()): number => {
    if (visited.has(className)) return 0; // Prevent cycles
    visited.add(className);
    
    const cls = classes.find(c => c.name === className);
    if (!cls || !cls.extends) return 0;
    
    if (hierarchyMap.has(className)) {
      return hierarchyMap.get(className)!;
    }
    
    const level = calculateLevel(cls.extends, visited) + 1;
    hierarchyMap.set(className, level);
    return level;
  };
  
  classes.forEach(cls => {
    if (cls.extends) {
      calculateLevel(cls.name);
    }
  });
  
  // Sort classes by hierarchy level, then by name for matrix
  const sortedClasses = [...classes].sort((a, b) => {
    const levelA = hierarchyMap.get(a.name) || 0;
    const levelB = hierarchyMap.get(b.name) || 0;
    if (levelA !== levelB) return levelA - levelB;
    return a.name.localeCompare(b.name);
  });
  
  // Calculate max values for ratios
  const maxMethods = Math.max(...classes.map(c => c.methods.length));
  const maxProperties = Math.max(...classes.map(c => c.properties.length));
  
  // Build tree structure with class details
  const buildTreeHTML = (parent: string, level: number = 0): string => {
    const children = inheritanceMap.get(parent) || [];
    const parentClass = classes.find(c => c.name === parent);
    const indent = "  ".repeat(level);
    const connector = level === 0 ? "" : level === 1 ? "└─ " : "  └─ ";
    const branch = level > 0 ? "│  ".repeat(level - 1) + connector : "";
    
    let html = `
      <div class="tree-node" style="margin-left: ${level * 1.5}rem;">
        <div class="tree-item">
          ${branch}<span class="tree-parent">${parent}</span>
          ${parentClass ? `<span class="tree-meta">(${parentClass.methods.length} methods, ${parentClass.properties.length} props)</span>` : ''}
        </div>
    `;
    
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const childClass = classes.find(c => c.name === child);
      html += `
        <div class="tree-item" style="margin-left: ${(level + 1) * 1.5}rem;">
          ${isLast ? '└─' : '├─'} <span class="tree-child">${child}</span>
          ${childClass ? `<span class="tree-meta">(${childClass.methods.length} methods, ${childClass.properties.length} props)</span>` : ''}
        </div>
      `;
      // Recursively build subtree if this child is also a parent
      if (inheritanceMap.has(child)) {
        html += buildTreeHTML(child, level + 1);
      }
    });
    
    html += `</div>`;
    return html;
  };
  
    const inheritanceTreeHTML = inheritanceMap.size > 0
    ? `
    <section class="section" aria-labelledby="inheritance-heading">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #334155;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 4px; height: 32px; background: linear-gradient(180deg, #34d399, #10b981); border-radius: 2px;"></div>
          <div>
            <h2 id="inheritance-heading" style="margin: 0; font-size: 1.5rem; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">🌳</span>
              Class Hierarchy
              ${inheritanceMap.size > 0 ? `
              <span style="
                background: linear-gradient(135deg, #34d399, #10b981);
                color: #ffffff;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.875rem;
                font-weight: 600;
                margin-left: 0.5rem;
                box-shadow: 0 2px 4px rgba(52, 211, 153, 0.3);
              ">${inheritanceMap.size} relationship${inheritanceMap.size !== 1 ? 's' : ''}</span>
              ` : ''}
            </h2>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #94a3b8; font-weight: 400;">
              ${rootClasses.length > 0 
                ? `${rootClasses.length} root class${rootClasses.length !== 1 ? 'es' : ''}, ${Array.from(inheritanceMap.values()).flat().length} child class${Array.from(inheritanceMap.values()).flat().length !== 1 ? 'es' : ''}`
                : 'Visual representation of class inheritance relationships'
              }
            </p>
          </div>
        </div>
        ${inheritanceMap.size > 0 ? `
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button 
            onclick="document.querySelectorAll('.tree-item').forEach(el => el.style.display = '');"
            style="
              background: linear-gradient(135deg, #334155 0%, #475569 100%);
              border: 1px solid #475569;
              color: #94a3b8;
              padding: 0.5rem 1rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 0.75rem;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='linear-gradient(135deg, #475569 0%, #64748b 100%)';"
            onmouseout="this.style.background='linear-gradient(135deg, #334155 0%, #475569 100%)';"
            title="Expand all tree nodes"
          >
            🔽 Expand All
          </button>
          <button 
            onclick="document.querySelectorAll('.tree-item').forEach((el, i) => { if (i > 0) el.style.display = 'none'; });"
            style="
              background: linear-gradient(135deg, #334155 0%, #475569 100%);
              border: 1px solid #475569;
              color: #94a3b8;
              padding: 0.5rem 1rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 0.75rem;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='linear-gradient(135deg, #475569 0%, #64748b 100%)';"
            onmouseout="this.style.background='linear-gradient(135deg, #334155 0%, #475569 100%)';"
            title="Collapse all tree nodes"
          >
            🔼 Collapse All
          </button>
        </div>
        ` : ''}
      </div>
      <div class="tree-container" role="tree" aria-label="Class inheritance hierarchy">
        ${rootClasses.length > 0 
          ? rootClasses.map(root => buildTreeHTML(root)).join("")
          : Array.from(inheritanceMap.entries()).map(([parent, children]) => buildTreeHTML(parent)).join("")
        }
      </div>
      ${inheritanceMap.size === 0 ? '<p class="tree-empty">No inheritance relationships found. All classes are standalone.</p>' : ''}
    </section>`
    : `<section class="section" aria-labelledby="inheritance-heading">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #334155;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 4px; height: 32px; background: linear-gradient(180deg, #64748b, #475569); border-radius: 2px;"></div>
          <div>
            <h2 id="inheritance-heading" style="margin: 0; font-size: 1.5rem; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">🌳</span>
              Class Hierarchy
            </h2>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #94a3b8; font-weight: 400;">
              No inheritance relationships found. All classes are standalone.
            </p>
          </div>
        </div>
      </div>
      <p class="tree-empty">No inheritance relationships found. All classes are standalone.</p>
    </section>`;

  // Generate reusable header components
  const head = generateHTMLHead({
    title: "Class Hierarchy Analysis",
    description: "Class hierarchy analysis report with interactive filtering and search",
    themeColor: "#007acc",
    includeDarkMode: true,
    customStyles: `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #60a5fa; margin-bottom: 1rem; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #1e293b;
      border-radius: 8px;
      padding: 1.5rem;
      border-left: 4px solid #60a5fa;
    }
    .stat-card .value { font-size: 2rem; font-weight: bold; color: #60a5fa; }
    .stat-card .label { color: #94a3b8; font-size: 0.875rem; margin-top: 0.5rem; }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-trend {
      opacity: 0.8;
    }
    #summaryDetailsBtn:hover {
      background: linear-gradient(135deg, #475569 0%, #64748b 100%) !important;
      border-color: #64748b !important;
    }
    #summaryDetailsBtn:focus {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }
    #summaryDetailsBtn:active {
      transform: translateY(0) !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
    }
    #summaryDetailsIcon {
      display: inline-block;
    }
    #summaryDetailsBtn[aria-expanded="true"] #summaryDetailsIcon {
      transform: rotate(180deg);
    }
    .section {
      background: #1e293b;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section h2 { margin-bottom: 1rem; color: #94a3b8; }
    .class-item {
      background: #0f172a;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
      border-left: 3px solid #3b82f6;
    }
    .class-name { font-size: 1.25rem; font-weight: bold; color: #60a5fa; margin-bottom: 0.5rem; }
    .class-meta { color: #64748b; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .class-info { display: flex; gap: 1rem; margin-top: 0.5rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-extends { background: #fbbf24; color: #78350f; }
    .badge-implements { background: #34d399; color: #064e3b; }
    .badge-exported { background: #22c55e; color: #14532d; }
    .badge-internal { background: #64748b; color: #f1f5f9; }
    .tree-container { 
      margin-top: 1rem; 
      padding: 1rem;
      background: #0f172a;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    }
    .tree-node { 
      margin-bottom: 0.5rem;
    }
    .tree-item {
      padding: 0.25rem 0;
      line-height: 1.8;
    }
    .tree-parent { 
      color: #60a5fa; 
      font-weight: bold;
      font-size: 1.1rem;
    }
    .tree-child { 
      color: #94a3b8;
      font-weight: 500;
    }
    .tree-meta {
      color: #64748b;
      font-size: 0.875rem;
      margin-left: 0.5rem;
      font-style: italic;
    }
    .tree-empty {
      color: #64748b;
      font-style: italic;
      text-align: center;
      padding: 2rem;
    }
    .methods-props {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .methods-props div { font-size: 0.875rem; color: #cbd5e1; }
    .search-input:focus, .filter-select:focus, .sort-select:focus {
      outline: none;
      border-color: #60a5fa !important;
    }
    .size-bar {
      height: 8px;
      background: #334155;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .size-bar-fill {
      height: 100%;
      transition: width 0.3s;
    }
    .class-item.hidden {
      display: none;
    }
    .toggle-details:hover {
      background: #475569 !important;
    }
    #telemetryBtn:hover {
      background: linear-gradient(135deg, #475569 0%, #64748b 100%) !important;
      border-color: #64748b !important;
    }
    #telemetryBtn:focus {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }
    #telemetryBtn:active {
      transform: translateY(0) !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
    }
    #telemetryBtn[aria-pressed="true"] {
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3) !important;
    }
    #telemetryBtn[aria-pressed="true"]:hover {
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4) !important;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    #telemetryIcon {
      display: inline-block;
      transition: transform 0.3s ease;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-weight: 600; }
    tr:hover { background: #0f172a;     }
    `,
  });

  const skipLink = generateSkipLink();
  const header = generateHeader({
    title: "🏛️ Class Hierarchy Analysis",
    showTelemetry: true,
    showDarkMode: true,
  });

  const footer = generateFooter({
    generatedAt: new Date(),
    reportType: "Class Hierarchy Analysis",
  });

  return `${head}
<body>
  ${skipLink}
  <div class="container">
    ${header}
    <main id="main-content" role="main">
    
    <section aria-labelledby="summary-heading" class="summary" role="region">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #334155;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 4px; height: 32px; background: linear-gradient(180deg, #60a5fa, #3b82f6); border-radius: 2px;"></div>
          <div>
            <h2 id="summary-heading" style="margin: 0; font-size: 1.5rem; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">📊</span>
              Summary Statistics
            </h2>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #94a3b8; font-weight: 400;">
              Overview of class metrics and distribution
            </p>
          </div>
        </div>
        <button 
          onclick="toggleSummaryDetails()" 
          id="summaryDetailsBtn" 
          aria-expanded="false"
          aria-controls="summaryDetails"
          style="
            background: linear-gradient(135deg, #334155 0%, #475569 100%);
            border: 1px solid #475569;
            color: #e2e8f0;
            padding: 0.625rem 1.25rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
            overflow: hidden;
          "
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.1)';"
        >
          <span id="summaryDetailsIcon" style="font-size: 1rem; transition: transform 0.3s ease;">📋</span>
          <span id="summaryDetailsText">Show Details</span>
        </button>
      </div>
      <div class="stat-card" role="article" aria-label="Total classes" onclick="filterByScope('all')" style="cursor: pointer;">
        <div class="value" aria-label="${classes.length} total classes">${classes.length}</div>
        <div class="label">Total Classes</div>
        <div class="stat-trend" style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
          ${classes.filter(c => c.exported).length} exported, ${classes.filter(c => !c.exported).length} internal
        </div>
      </div>
      <div class="stat-card" role="article" aria-label="Total methods" onclick="filterByScope('all')" style="cursor: pointer;">
        <div class="value" aria-label="${totalMethods} total methods">${totalMethods.toLocaleString()}</div>
        <div class="label">Total Methods</div>
        <div class="stat-trend" style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
          ${Math.max(...classes.map(c => c.methods.length))} max, ${Math.min(...classes.map(c => c.methods.length))} min
        </div>
      </div>
      <div class="stat-card" role="article" aria-label="Total properties" onclick="filterByScope('all')" style="cursor: pointer;">
        <div class="value" aria-label="${totalProperties} total properties">${totalProperties.toLocaleString()}</div>
        <div class="label">Total Properties</div>
        <div class="stat-trend" style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
          ${Math.max(...classes.map(c => c.properties.length))} max, ${Math.min(...classes.map(c => c.properties.length))} min
        </div>
      </div>
      <div class="stat-card" role="article" aria-label="Average methods per class" onclick="filterByScope('all')" style="cursor: pointer;">
        <div class="value" aria-label="${avgMethods} average methods per class">${avgMethods}</div>
        <div class="label">Avg Methods/Class</div>
        <div class="stat-trend" style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
          ${classes.filter(c => c.methods.length > parseFloat(avgMethods)).length} above avg
        </div>
      </div>
      <div class="stat-card" role="article" aria-label="Average properties per class" onclick="filterByScope('all')" style="cursor: pointer;">
        <div class="value" aria-label="${avgProperties} average properties per class">${avgProperties}</div>
        <div class="label">Avg Properties/Class</div>
        <div class="stat-trend" style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
          ${classes.filter(c => c.properties.length > parseFloat(avgProperties)).length} above avg
        </div>
      </div>
      <div class="stat-card" role="article" aria-label="Inheritance relationships" onclick="filterByScope('hierarchy')" style="cursor: pointer;">
        <div class="value" aria-label="${inheritanceMap.size} inheritance relationships">${inheritanceMap.size}</div>
        <div class="label">Inheritance Relationships</div>
        <div class="stat-trend" style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
          ${classes.filter(c => !!(c.extends || (c.implements && c.implements.length > 0))).length} classes with inheritance
        </div>
      </div>
      <div id="summaryDetails" style="display: none; margin-top: 1.5rem; padding: 1.5rem; background: #0f172a; border-radius: 8px;">
        <h3 style="color: #94a3b8; margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 600;">Detailed Breakdown</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
          <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 3px solid #22c55e;">
            <h4 style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>📊</span> Class Distribution
            </h4>
            <div style="font-size: 0.875rem; color: #cbd5e1;">
              ${(() => {
                const exported = classes.filter(c => c.exported).length;
                const internal = classes.filter(c => !c.exported).length;
                const withInheritance = classes.filter(c => !!(c.extends || (c.implements && c.implements.length > 0))).length;
                const standalone = classes.filter(c => !(c.extends || (c.implements && c.implements.length > 0))).length;
                const total = classes.length;
                return `
              <div style="margin-bottom: 0.75rem; cursor: pointer;" onclick="filterByScope('exported')" title="Click to filter by exported classes">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Exported:</span>
                  <strong style="color: #22c55e;">${exported}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">${((exported / total) * 100).toFixed(1)}%</span>
                </div>
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${(exported / total) * 100}%; background: #22c55e; transition: width 0.3s;"></div>
                </div>
              </div>
              <div style="margin-bottom: 0.75rem; cursor: pointer;" onclick="filterByScope('internal')" title="Click to filter by internal classes">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Internal:</span>
                  <strong style="color: #64748b;">${internal}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">${((internal / total) * 100).toFixed(1)}%</span>
                </div>
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${(internal / total) * 100}%; background: #64748b; transition: width 0.3s;"></div>
                </div>
              </div>
              <div style="margin-bottom: 0.75rem; cursor: pointer;" onclick="filterByScope('hierarchy')" title="Click to filter by classes with inheritance">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>With Inheritance:</span>
                  <strong style="color: #fbbf24;">${withInheritance}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">${((withInheritance / total) * 100).toFixed(1)}%</span>
                </div>
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${(withInheritance / total) * 100}%; background: #fbbf24; transition: width 0.3s;"></div>
                </div>
              </div>
              <div style="cursor: pointer;" onclick="filterByScope('standalone')" title="Click to filter by standalone classes">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Standalone:</span>
                  <strong style="color: #94a3b8;">${standalone}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">${((standalone / total) * 100).toFixed(1)}%</span>
                </div>
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${(standalone / total) * 100}%; background: #94a3b8; transition: width 0.3s;"></div>
                </div>
              </div>
            `;
              })()}
            </div>
          </div>
          <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 3px solid #f59e0b;">
            <h4 style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>📏</span> Size Distribution
            </h4>
            <div style="font-size: 0.875rem; color: #cbd5e1;">
              ${(() => {
                const large = classes.filter(c => {
                  const m = c.methods.length / maxMethods;
                  const p = c.properties.length / maxProperties;
                  return (m + p) / 2 > 0.7;
                }).length;
                const medium = classes.filter(c => {
                  const m = c.methods.length / maxMethods;
                  const p = c.properties.length / maxProperties;
                  const score = (m + p) / 2;
                  return score > 0.4 && score <= 0.7;
                }).length;
                const small = classes.length - large - medium;
                const total = classes.length;
                return `
              <div style="margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Large:</span>
                  <strong style="color: #ef4444;">${large}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">${total > 0 ? ((large / total) * 100).toFixed(1) : 0}%</span>
                </div>
                <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; width: ${total > 0 ? (large / total) * 100 : 0}%; background: #ef4444; transition: width 0.3s;"></div>
                </div>
              </div>
              <div style="margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Medium:</span>
                  <strong style="color: #f59e0b;">${medium}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">${total > 0 ? ((medium / total) * 100).toFixed(1) : 0}%</span>
                </div>
                <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; width: ${total > 0 ? (medium / total) * 100 : 0}%; background: #f59e0b; transition: width 0.3s;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Small:</span>
                  <strong style="color: #22c55e;">${small}</strong>
                  <span style="color: #64748b; font-size: 0.75rem;">${total > 0 ? ((small / total) * 100).toFixed(1) : 0}%</span>
                </div>
                <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; width: ${total > 0 ? (small / total) * 100 : 0}%; background: #22c55e; transition: width 0.3s;"></div>
                </div>
              </div>
            `;
              })()}
            </div>
          </div>
          <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 3px solid #60a5fa;">
            <h4 style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>🏆</span> Top Classes
            </h4>
            <div style="font-size: 0.875rem; color: #cbd5e1;">
              ${[...classes].sort((a, b) => (b.methods.length + b.properties.length) - (a.methods.length + a.properties.length)).slice(0, 3).map((c, i) => {
                const totalMembers = c.methods.length + c.properties.length;
                const maxMembers = Math.max(...classes.map(cls => cls.methods.length + cls.properties.length));
                const percentage = maxMembers > 0 ? (totalMembers / maxMembers) * 100 : 0;
                return `
                <div style="margin-bottom: ${i < 2 ? '0.75rem' : '0'}; cursor: pointer; padding: 0.5rem; border-radius: 4px; transition: background 0.2s;" 
                     onclick="document.getElementById('classSearch').value='${c.name}'; filterTests(); document.getElementById('classSearch').focus();"
                     onmouseover="this.style.background='#334155'"
                     onmouseout="this.style.background='transparent'"
                     title="Click to search for ${c.name}">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span style="color: #fbbf24; font-weight: 600; margin-right: 0.5rem;">${i + 1}.</span>
                    <strong style="color: #60a5fa; flex: 1;">${c.name}</strong>
                    <span style="color: #94a3b8; font-size: 0.75rem; margin-left: 0.5rem;">${totalMembers}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem; font-size: 0.7rem; color: #64748b; margin-top: 0.25rem;">
                    <span>${c.methods.length} methods</span>
                    <span>•</span>
                    <span>${c.properties.length} props</span>
                  </div>
                  <div style="height: 3px; background: #334155; border-radius: 2px; overflow: hidden; margin-top: 0.5rem;">
                    <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #60a5fa, #3b82f6); transition: width 0.3s;"></div>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
          <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 3px solid #34d399;">
            <h4 style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>🌳</span> Inheritance Stats
            </h4>
            <div style="font-size: 0.875rem; color: #cbd5e1;">
              ${(() => {
                const rootCount = rootClasses.length;
                const childCount = Array.from(inheritanceMap.values()).flat().length;
                const avgDepth = (Array.from(hierarchyMap.values()).reduce((sum, l) => sum + l, 0) / Math.max(hierarchyMap.size, 1)).toFixed(1);
                const totalWithInheritance = classes.filter(c => !!(c.extends || (c.implements && c.implements.length > 0))).length;
                return `
              <div style="margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Root Classes:</span>
                  <strong style="color: #60a5fa;">${rootCount}</strong>
                </div>
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${totalWithInheritance > 0 ? (rootCount / totalWithInheritance) * 100 : 0}%; background: #60a5fa; transition: width 0.3s;"></div>
                </div>
              </div>
              <div style="margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Child Classes:</span>
                  <strong style="color: #fbbf24;">${childCount}</strong>
                </div>
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${totalWithInheritance > 0 ? (childCount / totalWithInheritance) * 100 : 0}%; background: #fbbf24; transition: width 0.3s;"></div>
                </div>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                  <span>Avg Depth:</span>
                  <strong style="color: #34d399;">${avgDepth}</strong>
                </div>
                <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden; position: relative;">
                  <div style="height: 100%; width: ${Math.min(parseFloat(avgDepth) * 20, 100)}%; background: #34d399; transition: width 0.3s;"></div>
                </div>
              </div>
            `;
              })()}
            </div>
          </div>
          <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 3px solid #7c3aed;">
            <h4 style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>📋</span> Scope Distribution
            </h4>
            <div style="font-size: 0.875rem; color: #cbd5e1; max-height: 200px; overflow-y: auto;">
              ${(() => {
                const scopeGroups = new Map<string, number>();
                classes.forEach(c => {
                  const scope = c.scope || 'core';
                  scopeGroups.set(scope, (scopeGroups.get(scope) || 0) + 1);
                });
                return Array.from(scopeGroups.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([scope, count]) => {
                    const percentage = (count / classes.length) * 100;
                    return `
                    <div style="margin-bottom: 0.75rem; cursor: pointer;" onclick="document.getElementById('scopeFilter').value='${scope}'; filterAndSort();" title="Click to filter by ${scope}">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span>${scope}:</span>
                        <strong style="color: #a78bfa;">${count}</strong>
                        <span style="color: #64748b; font-size: 0.75rem;">${percentage.toFixed(1)}%</span>
                      </div>
                      <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: #7c3aed; transition: width 0.3s;"></div>
                      </div>
                    </div>
                  `;
                  }).join('');
              })()}
            </div>
          </div>
          <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 3px solid #059669;">
            <h4 style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>👥</span> Team Distribution
            </h4>
            <div style="font-size: 0.875rem; color: #cbd5e1; max-height: 200px; overflow-y: auto;">
              ${(() => {
                const teamGroups = new Map<string, number>();
                classes.forEach(c => {
                  const team = c.team || 'platform';
                  teamGroups.set(team, (teamGroups.get(team) || 0) + 1);
                });
                return Array.from(teamGroups.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([team, count]) => {
                    const percentage = (count / classes.length) * 100;
                    return `
                    <div style="margin-bottom: 0.75rem; cursor: pointer;" onclick="document.getElementById('teamFilter').value='${team}'; filterAndSort();" title="Click to filter by ${team}">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span>${team}:</span>
                        <strong style="color: #34d399;">${count}</strong>
                        <span style="color: #64748b; font-size: 0.75rem;">${percentage.toFixed(1)}%</span>
                      </div>
                      <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: #059669; transition: width 0.3s;"></div>
                      </div>
                    </div>
                  `;
                  }).join('');
              })()}
            </div>
          </div>
          <div style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 3px solid #dc2626;">
            <h4 style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>🏢</span> Tenant Distribution
            </h4>
            <div style="font-size: 0.875rem; color: #cbd5e1; max-height: 200px; overflow-y: auto;">
              ${(() => {
                const tenantGroups = new Map<string, number>();
                classes.forEach(c => {
                  const tenant = c.tenant || 'default';
                  tenantGroups.set(tenant, (tenantGroups.get(tenant) || 0) + 1);
                });
                return Array.from(tenantGroups.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([tenant, count]) => {
                    const percentage = (count / classes.length) * 100;
                    return `
                    <div style="margin-bottom: 0.75rem; cursor: pointer;" onclick="document.getElementById('tenantFilter').value='${tenant}'; filterAndSort();" title="Click to filter by ${tenant}">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span>${tenant}:</span>
                        <strong style="color: #f87171;">${count}</strong>
                        <span style="color: #64748b; font-size: 0.75rem;">${percentage.toFixed(1)}%</span>
                      </div>
                      <div style="height: 4px; background: #334155; border-radius: 2px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: #dc2626; transition: width 0.3s;"></div>
                      </div>
                    </div>
                  `;
                  }).join('');
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="classes-heading">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #334155; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 200px;">
          <div style="width: 4px; height: 32px; background: linear-gradient(180deg, #8b5cf6, #7c3aed); border-radius: 2px;"></div>
          <div>
            <h2 id="classes-heading" style="margin: 0; font-size: 1.5rem; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">🏛️</span>
              Classes
              <span style="
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                color: #ffffff;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-size: 0.875rem;
                font-weight: 600;
                margin-left: 0.5rem;
                box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
              ">${classes.length}</span>
            </h2>
            <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: #94a3b8; font-weight: 400;">
              Browse, search, and filter class definitions
            </p>
          </div>
        </div>
        <div role="search" aria-label="Filter and search classes" style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <label for="classSearch" class="sr-only">Search classes</label>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 0.75rem; color: #64748b; font-size: 0.875rem;">🔍</span>
            <input 
              type="text" 
              id="classSearch" 
              placeholder="Search classes..." 
              class="search-input" 
              aria-label="Search classes by name"
              style="
                padding: 0.625rem 0.75rem 0.625rem 2.5rem;
                border-radius: 8px;
                border: 1px solid #334155;
                background: #0f172a;
                color: #e2e8f0;
                width: 220px;
                font-size: 0.875rem;
                transition: all 0.2s ease;
              "
              onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
              onblur="this.style.borderColor='#334155'; this.style.boxShadow='none';"
            >
          </div>
          <label for="classFilter" class="sr-only">Filter classes</label>
          <select 
            id="classFilter" 
            class="filter-select" 
            aria-label="Filter classes by type"
            style="
              padding: 0.625rem 2.5rem 0.625rem 0.75rem;
              border-radius: 8px;
              border: 1px solid #334155;
              background: #0f172a;
              color: #e2e8f0;
              font-size: 0.875rem;
              cursor: pointer;
              transition: all 0.2s ease;
              appearance: none;
              background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\"><path fill=\"%2364748b\" d=\"M6 9L1 4h10z\"/></svg>');
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
            "
            onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
            onblur="this.style.borderColor='#334155'; this.style.boxShadow='none';"
          >
            <option value="all">🔍 All Classes</option>
            <option value="exported">✅ Exported Only</option>
            <option value="internal">🔒 Internal Only</option>
            <option value="with-inheritance">🌳 With Inheritance</option>
            <option value="standalone">📦 Standalone</option>
          </select>
          <label for="scopeFilter" class="sr-only">Filter by scope</label>
          <select 
            id="scopeFilter" 
            class="filter-select" 
            aria-label="Filter classes by scope"
            style="
              padding: 0.625rem 2.5rem 0.625rem 0.75rem;
              border-radius: 8px;
              border: 1px solid #334155;
              background: #0f172a;
              color: #e2e8f0;
              font-size: 0.875rem;
              cursor: pointer;
              transition: all 0.2s ease;
              appearance: none;
              background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\"><path fill=\"%2364748b\" d=\"M6 9L1 4h10z\"/></svg>');
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
            "
            onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
            onblur="this.style.borderColor='#334155'; this.style.boxShadow='none';"
          >
            <option value="all">📋 All Scopes</option>
            ${[...new Set(classes.map(c => c.scope).filter(Boolean))].sort().map(scope => `
            <option value="${scope}">${scope}</option>
            `).join('')}
          </select>
          <label for="teamFilter" class="sr-only">Filter by team</label>
          <select 
            id="teamFilter" 
            class="filter-select" 
            aria-label="Filter classes by team"
            style="
              padding: 0.625rem 2.5rem 0.625rem 0.75rem;
              border-radius: 8px;
              border: 1px solid #334155;
              background: #0f172a;
              color: #e2e8f0;
              font-size: 0.875rem;
              cursor: pointer;
              transition: all 0.2s ease;
              appearance: none;
              background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\"><path fill=\"%2364748b\" d=\"M6 9L1 4h10z\"/></svg>');
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
            "
            onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
            onblur="this.style.borderColor='#334155'; this.style.boxShadow='none';"
          >
            <option value="all">👥 All Teams</option>
            ${[...new Set(classes.map(c => c.team).filter(Boolean))].sort().map(team => `
            <option value="${team}">${team}</option>
            `).join('')}
          </select>
          <label for="tenantFilter" class="sr-only">Filter by tenant</label>
          <select 
            id="tenantFilter" 
            class="filter-select" 
            aria-label="Filter classes by tenant"
            style="
              padding: 0.625rem 2.5rem 0.625rem 0.75rem;
              border-radius: 8px;
              border: 1px solid #334155;
              background: #0f172a;
              color: #e2e8f0;
              font-size: 0.875rem;
              cursor: pointer;
              transition: all 0.2s ease;
              appearance: none;
              background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\"><path fill=\"%2364748b\" d=\"M6 9L1 4h10z\"/></svg>');
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
            "
            onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
            onblur="this.style.borderColor='#334155'; this.style.boxShadow='none';"
          >
            <option value="all">🏢 All Tenants</option>
            ${[...new Set(classes.map(c => c.tenant).filter(Boolean))].sort().map(tenant => `
            <option value="${tenant}">${tenant}</option>
            `).join('')}
          </select>
          <label for="classSort" class="sr-only">Sort classes</label>
          <select 
            id="classSort" 
            class="sort-select" 
            aria-label="Sort classes"
            style="
              padding: 0.625rem 2.5rem 0.625rem 0.75rem;
              border-radius: 8px;
              border: 1px solid #334155;
              background: #0f172a;
              color: #e2e8f0;
              font-size: 0.875rem;
              cursor: pointer;
              transition: all 0.2s ease;
              appearance: none;
              background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\"><path fill=\"%2364748b\" d=\"M6 9L1 4h10z\"/></svg>');
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
            "
            onfocus="this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.1)';"
            onblur="this.style.borderColor='#334155'; this.style.boxShadow='none';"
          >
            <option value="name">📝 Sort by Name</option>
            <option value="methods-desc">⬇️ Methods (High to Low)</option>
            <option value="methods-asc">⬆️ Methods (Low to High)</option>
            <option value="props-desc">⬇️ Properties (High to Low)</option>
            <option value="props-asc">⬆️ Properties (Low to High)</option>
            <option value="file">📁 Sort by File</option>
          </select>
        </div>
      </div>
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding: 0.75rem 1rem;
        background: #1e293b;
        border-radius: 8px;
        border-left: 3px solid #8b5cf6;
      ">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="color: #94a3b8; font-size: 0.875rem;">📊</span>
          <span id="classCount" role="status" aria-live="polite" style="color: #cbd5e1; font-size: 0.875rem; font-weight: 500;">
            Showing ${classes.length} of ${classes.length} classes
          </span>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span style="color: #64748b; font-size: 0.75rem;">
            Press <kbd style="background: #334155; padding: 0.125rem 0.375rem; border-radius: 4px; font-family: monospace; font-size: 0.7rem;">Ctrl/Cmd+F</kbd> to focus search
          </span>
        </div>
      </div>
      <div id="classesContainer" role="list" aria-label="List of classes">
        ${classes.map((cls, index) => `
          <article class="class-item" role="listitem" data-name="${cls.name.toLowerCase()}" data-exported="${cls.exported}" data-has-inheritance="${!!(cls.extends || (cls.implements && cls.implements.length > 0))}" data-methods="${cls.methods.length}" data-props="${cls.properties.length}" data-file="${cls.file}" data-tenant="${cls.tenant || 'default'}" data-scope="${cls.scope || 'core'}" data-team="${cls.team || 'platform'}" aria-labelledby="class-name-${index}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <h3 id="class-name-${index}" class="class-name">${cls.name}</h3>
                <div class="class-meta" aria-label="File location">${cls.file}:${cls.line}</div>
                <div class="class-info" role="group" aria-label="Class metadata">
                  ${cls.exported ? '<span class="badge badge-exported" aria-label="Exported class">exported</span>' : '<span class="badge badge-internal" aria-label="Internal class">internal</span>'}
                  ${cls.extends ? `<span class="badge badge-extends" aria-label="Extends ${cls.extends}">extends ${cls.extends}</span>` : ''}
                  ${cls.implements && cls.implements.length > 0 ? cls.implements.map(i => `<span class="badge badge-implements" aria-label="Implements ${i}">implements ${i}</span>`).join('') : ''}
                  ${cls.scope ? `<span class="badge" style="background: #7c3aed; color: #e9d5ff; font-size: 0.7rem;" aria-label="Scope: ${cls.scope}">📋 ${cls.scope}</span>` : ''}
                  ${cls.team ? `<span class="badge" style="background: #059669; color: #d1fae5; font-size: 0.7rem;" aria-label="Team: ${cls.team}">👥 ${cls.team}</span>` : ''}
                  ${cls.tenant && cls.tenant !== 'default' ? `<span class="badge" style="background: #dc2626; color: #fee2e2; font-size: 0.7rem;" aria-label="Tenant: ${cls.tenant}">🏢 ${cls.tenant}</span>` : ''}
                </div>
              </div>
              <button 
                class="toggle-details" 
                onclick="toggleDetails(${index})" 
                aria-expanded="false"
                aria-controls="details-${index}"
                aria-label="Toggle details for ${cls.name}"
                id="toggle-${index}"
                style="background: #334155; border: none; color: #94a3b8; padding: 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem;">Details</button>
            </div>
            <div class="methods-props" role="group" aria-label="Class statistics">
              <div aria-label="${cls.methods.length} methods"><strong>${cls.methods.length}</strong> methods</div>
              <div aria-label="${cls.properties.length} properties"><strong>${cls.properties.length}</strong> properties</div>
              <div style="grid-column: 1 / -1; margin-top: 0.5rem;">
                <div class="size-bar" role="progressbar" aria-valuenow="${cls.methods.length}" aria-valuemin="0" aria-valuemax="100" aria-label="Class size indicator">
                  <div class="size-bar-fill" style="width: ${Math.min((cls.methods.length / 100) * 100, 100)}%; background: ${cls.methods.length > 50 ? '#ef4444' : cls.methods.length > 20 ? '#f59e0b' : '#22c55e'};"></div>
                </div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;" aria-label="Class size">
                  ${cls.methods.length > 50 ? 'Large class' : cls.methods.length > 20 ? 'Medium class' : 'Small class'}
                </div>
              </div>
            </div>
            <div class="class-details" id="details-${index}" role="region" aria-labelledby="details-heading-${index}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #334155;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <section aria-labelledby="methods-heading-${index}">
                  <h4 id="methods-heading-${index}" style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 0.875rem;">Methods (${cls.methods.length})</h4>
                  <div role="list" aria-label="List of methods" style="max-height: 200px; overflow-y: auto; background: #0f172a; padding: 0.5rem; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">
                    ${cls.methods.slice(0, 20).map(m => `<div role="listitem" style="padding: 0.25rem 0; color: #cbd5e1;">${m}</div>`).join('')}
                    ${cls.methods.length > 20 ? `<div style="color: #64748b; font-style: italic;" aria-label="${cls.methods.length - 20} more methods not shown">... and ${cls.methods.length - 20} more</div>` : ''}
                  </div>
                </section>
                <section aria-labelledby="properties-heading-${index}">
                  <h4 id="properties-heading-${index}" style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 0.875rem;">Properties (${cls.properties.length})</h4>
                  <div role="list" aria-label="List of properties" style="max-height: 200px; overflow-y: auto; background: #0f172a; padding: 0.5rem; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">
                    ${cls.properties.slice(0, 20).map(p => `<div role="listitem" style="padding: 0.25rem 0; color: #cbd5e1;">${p}</div>`).join('')}
                    ${cls.properties.length > 20 ? `<div style="color: #64748b; font-style: italic;" aria-label="${cls.properties.length - 20} more properties not shown">... and ${cls.properties.length - 20} more</div>` : ''}
                  </div>
                </section>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
    ${inheritanceTreeHTML}
    
    <section class="section" aria-labelledby="matrix-heading">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
        <h2 id="matrix-heading">Class Comparison Matrix</h2>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
          <label for="matrixScope" class="sr-only">User scope</label>
          <select id="matrixScope" aria-label="Filter by user scope" style="padding: 0.5rem; border-radius: 4px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; font-size: 0.875rem;">
            <option value="all">All Classes</option>
            <option value="hierarchy">With Hierarchy</option>
            <option value="standalone">Standalone</option>
            <option value="exported">Exported Only</option>
            <option value="large">Large Classes</option>
            ${[...new Set(classes.map(c => c.scope).filter(Boolean))].sort().map(scope => `
            <option value="scope_${scope}">📋 Scope: ${scope}</option>
            `).join('')}
            ${[...new Set(classes.map(c => c.team).filter(Boolean))].sort().map(team => `
            <option value="team_${team}">👥 Team: ${team}</option>
            `).join('')}
            <option value="custom">Custom Scope</option>
          </select>
          <button onclick="toggleMatrixView()" id="matrixViewBtn" style="background: #334155; border: 1px solid #475569; color: #94a3b8; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
            <span id="matrixViewText">Heatmap</span>
          </button>
          <button onclick="exportMatrix()" style="background: #334155; border: 1px solid #475569; color: #94a3b8; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
            Export CSV
          </button>
        </div>
      </div>
      <div id="matrixContainer" style="overflow-x: auto;">
        <table id="classMatrix" role="table" aria-label="Class comparison matrix with hierarchy" style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr>
              <th style="position: sticky; left: 0; background: #1e293b; z-index: 10; padding: 0.75rem; text-align: left; border: 1px solid #334155; min-width: 200px;">Class Hierarchy</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Methods</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Properties</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Size</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Scope</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Team</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Tenant</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Exported</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Extends</th>
              <th style="padding: 0.75rem; text-align: center; border: 1px solid #334155;">Implements</th>
            </tr>
          </thead>
          <tbody>
            ${sortedClasses.map((cls) => {
              const methodRatio = cls.methods.length / maxMethods;
              const propRatio = cls.properties.length / maxProperties;
              const sizeScore = (methodRatio + propRatio) / 2;
              const sizeColor = sizeScore > 0.7 ? '#ef4444' : sizeScore > 0.4 ? '#f59e0b' : '#22c55e';
              const hasInheritance = !!(cls.extends || (cls.implements && cls.implements.length > 0));
              const hierarchyLevel = hierarchyMap.get(cls.name) || 0;
              const indent = hierarchyLevel * 1.5;
              const children = inheritanceMap.get(cls.name) || [];
              const indentStr = hierarchyLevel > 0 ? '│ '.repeat(Math.floor(hierarchyLevel / 2)) + (hierarchyLevel % 2 === 1 ? '├─' : '└─') : '';
              
              return `
              <tr data-class="${cls.name}" data-hierarchy-level="${hierarchyLevel}" data-has-inheritance="${hasInheritance}" data-exported="${cls.exported}" data-size="${sizeScore > 0.7 ? 'large' : sizeScore > 0.4 ? 'medium' : 'small'}" data-tenant="${cls.tenant || 'default'}" data-scope="${cls.scope || 'core'}" data-team="${cls.team || 'platform'}" style="border-bottom: 1px solid #334155;">
                <td style="position: sticky; left: 0; background: #1e293b; z-index: 5; padding: 0.75rem; border-right: 1px solid #334155;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${hierarchyLevel > 0 ? `<span style="color: #64748b; font-family: monospace; width: ${indent}rem; display: inline-block;">${indentStr}</span>` : ''}
                    <div style="flex: 1;">
                      <strong style="color: #60a5fa;">${cls.name}</strong>
                      ${cls.extends ? `<div style="font-size: 0.7rem; color: #fbbf24; margin-top: 0.125rem;">extends ${cls.extends}</div>` : ''}
                      ${cls.implements && cls.implements.length > 0 ? `<div style="font-size: 0.7rem; color: #34d399; margin-top: 0.125rem;">implements ${cls.implements.join(', ')}</div>` : ''}
                      ${children.length > 0 ? `<div style="font-size: 0.7rem; color: #94a3b8; margin-top: 0.125rem;">${children.length} child${children.length > 1 ? 'ren' : ''}</div>` : ''}
                      <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">${cls.file}</div>
                    </div>
                  </div>
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.methods.length}">
                  <span style="font-weight: bold;">${cls.methods.length}</span>
                  <div style="width: 60px; height: 4px; background: #334155; border-radius: 2px; margin: 0.25rem auto;">
                    <div style="width: ${(methodRatio * 100).toFixed(0)}%; height: 100%; background: ${methodRatio > 0.7 ? '#ef4444' : methodRatio > 0.4 ? '#f59e0b' : '#22c55e'}; border-radius: 2px;"></div>
                  </div>
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.properties.length}">
                  <span style="font-weight: bold;">${cls.properties.length}</span>
                  <div style="width: 60px; height: 4px; background: #334155; border-radius: 2px; margin: 0.25rem auto;">
                    <div style="width: ${(propRatio * 100).toFixed(0)}%; height: 100%; background: ${propRatio > 0.7 ? '#ef4444' : propRatio > 0.4 ? '#f59e0b' : '#22c55e'}; border-radius: 2px;"></div>
                  </div>
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155; background: ${sizeColor}20;" data-value="${sizeScore.toFixed(2)}">
                  <span style="color: ${sizeColor}; font-weight: bold;">${sizeScore > 0.7 ? 'Large' : sizeScore > 0.4 ? 'Medium' : 'Small'}</span>
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.scope || 'core'}" title="${cls.scope || 'core'}">
                  <span style="background: #7c3aed; color: #e9d5ff; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${cls.scope || 'core'}</span>
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.team || 'platform'}" title="${cls.team || 'platform'}">
                  <span style="background: #059669; color: #d1fae5; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${cls.team || 'platform'}</span>
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.tenant || 'default'}" title="${cls.tenant || 'default'}">
                  ${cls.tenant && cls.tenant !== 'default' ? `<span style="background: #dc2626; color: #fee2e2; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">${cls.tenant}</span>` : '<span style="color: #64748b;">—</span>'}
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.exported ? 1 : 0}">
                  ${cls.exported ? '<span style="color: #22c55e;">✓</span>' : '<span style="color: #64748b;">✗</span>'}
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.extends ? 1 : 0}">
                  ${cls.extends ? `<span style="color: #fbbf24;" title="${cls.extends}">${cls.extends}</span>` : '<span style="color: #64748b;">—</span>'}
                </td>
                <td style="padding: 0.75rem; text-align: center; border: 1px solid #334155;" data-value="${cls.implements && cls.implements.length > 0 ? cls.implements.length : 0}">
                  ${cls.implements && cls.implements.length > 0 ? `<span style="color: #34d399;" title="${cls.implements.join(', ')}">${cls.implements.length}</span>` : '<span style="color: #64748b;">—</span>'}
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top: 1rem; padding: 1rem; background: #0f172a; border-radius: 6px; font-size: 0.875rem; color: #94a3b8;">
        <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
          <div><span style="display: inline-block; width: 12px; height: 12px; background: #22c55e; border-radius: 2px; margin-right: 0.5rem;"></span>Small</div>
          <div><span style="display: inline-block; width: 12px; height: 12px; background: #f59e0b; border-radius: 2px; margin-right: 0.5rem;"></span>Medium</div>
          <div><span style="display: inline-block; width: 12px; height: 12px; background: #ef4444; border-radius: 2px; margin-right: 0.5rem;"></span>Large</div>
        </div>
      </div>
    </section>
    
    ${footer}
    </main>
  </div>
  <script>
    const classes = ${JSON.stringify(classes)};
    
    function toggleDetails(index) {
      const details = document.getElementById('details-' + index);
      const button = document.getElementById('toggle-' + index);
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      
      if (isExpanded) {
        details.style.display = 'none';
        button.textContent = 'Details';
        button.setAttribute('aria-expanded', 'false');
      } else {
        details.style.display = 'block';
        button.textContent = 'Hide';
        button.setAttribute('aria-expanded', 'true');
        // Focus management for keyboard users
        details.focus();
      }
    }
    
    // Keyboard navigation support
    document.addEventListener('keydown', (e) => {
      // Escape key closes expanded details
      if (e.key === 'Escape') {
        const expandedButtons = document.querySelectorAll('[aria-expanded="true"]');
        expandedButtons.forEach(btn => {
          const index = btn.id.replace('toggle-', '');
          toggleDetails(parseInt(index));
        });
      }
    });
    
    function filterAndSort() {
      const search = document.getElementById('classSearch').value.toLowerCase();
      const filter = document.getElementById('classFilter').value;
      const scopeFilter = document.getElementById('scopeFilter')?.value || 'all';
      const teamFilter = document.getElementById('teamFilter')?.value || 'all';
      const tenantFilter = document.getElementById('tenantFilter')?.value || 'all';
      const sort = document.getElementById('classSort').value;
      const items = Array.from(document.querySelectorAll('.class-item'));
      
      // Filter
      let visible = items.filter(item => {
        const name = item.dataset.name;
        const exported = item.dataset.exported === 'true';
        const hasInheritance = item.dataset.hasInheritance === 'true';
        const scope = item.dataset.scope || 'core';
        const team = item.dataset.team || 'platform';
        const tenant = item.dataset.tenant || 'default';
        
        // Search filter
        if (search && !name.includes(search)) return false;
        
        // Type filter
        if (filter === 'exported' && !exported) return false;
        if (filter === 'internal' && exported) return false;
        if (filter === 'with-inheritance' && !hasInheritance) return false;
        if (filter === 'standalone' && hasInheritance) return false;
        
        // Scope filter
        if (scopeFilter !== 'all' && scope !== scopeFilter) return false;
        
        // Team filter
        if (teamFilter !== 'all' && team !== teamFilter) return false;
        
        // Tenant filter
        if (tenantFilter !== 'all' && tenant !== tenantFilter) return false;
        
        return true;
      });
      
      // Sort
      visible.sort((a, b) => {
        switch(sort) {
          case 'name':
            return a.dataset.name.localeCompare(b.dataset.name);
          case 'methods-desc':
            return parseInt(b.dataset.methods) - parseInt(a.dataset.methods);
          case 'methods-asc':
            return parseInt(a.dataset.methods) - parseInt(b.dataset.methods);
          case 'props-desc':
            return parseInt(b.dataset.props) - parseInt(a.dataset.props);
          case 'props-asc':
            return parseInt(a.dataset.props) - parseInt(b.dataset.props);
          case 'file':
            return a.dataset.file.localeCompare(b.dataset.file);
          default:
            return 0;
        }
      });
      
      // Hide all, then show filtered
      items.forEach(item => {
        item.classList.add('hidden');
        item.style.order = '';
      });
      
      visible.forEach((item, index) => {
        item.classList.remove('hidden');
        item.style.order = index;
      });
      
      // Update count with live region for screen readers
      const countEl = document.getElementById('classCount');
      countEl.textContent = \`Showing \${visible.length} of \${items.length} classes\`;
      countEl.setAttribute('aria-label', \`Showing \${visible.length} of \${items.length} classes\`);
    }
    
    document.getElementById('classSearch').addEventListener('input', filterAndSort);
    document.getElementById('classFilter').addEventListener('change', filterAndSort);
    document.getElementById('scopeFilter')?.addEventListener('change', filterAndSort);
    document.getElementById('teamFilter')?.addEventListener('change', filterAndSort);
    document.getElementById('tenantFilter')?.addEventListener('change', filterAndSort);
    document.getElementById('classSort').addEventListener('change', filterAndSort);
    
    // Initial sort by name
    document.getElementById('classSort').value = 'name';
    filterAndSort();
    
    // Telemetry functionality
    let telemetryEnabled = localStorage.getItem('classAnalysisTelemetry') === 'true';
    const telemetryData = {
      pageLoad: new Date().toISOString(),
      classes: classes.length,
      interactions: [],
      filters: [],
      searches: []
    };
    
    function updateTelemetryButton() {
      const btn = document.getElementById('telemetryBtn');
      const icon = document.getElementById('telemetryIcon');
      const text = document.getElementById('telemetryText');
      const status = document.getElementById('telemetryStatus');
      
      if (telemetryEnabled) {
        btn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        btn.style.borderColor = '#16a34a';
        btn.style.color = '#ffffff';
        btn.setAttribute('aria-pressed', 'true');
        if (icon) {
          icon.textContent = '✅';
          icon.style.transform = 'scale(1.1)';
        }
        if (text) text.textContent = 'Telemetry ON';
        if (status) {
          status.style.background = '#ffffff';
          status.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.6)';
          status.style.animation = 'pulse 2s infinite';
        }
      } else {
        btn.style.background = 'linear-gradient(135deg, #334155 0%, #475569 100%)';
        btn.style.borderColor = '#475569';
        btn.style.color = '#94a3b8';
        btn.setAttribute('aria-pressed', 'false');
        if (icon) {
          icon.textContent = '📊';
          icon.style.transform = 'scale(1)';
        }
        if (text) text.textContent = 'Telemetry';
        if (status) {
          status.style.background = '#64748b';
          status.style.boxShadow = 'none';
          status.style.animation = 'none';
        }
      }
    }
    
    function toggleTelemetry() {
      telemetryEnabled = !telemetryEnabled;
      localStorage.setItem('classAnalysisTelemetry', telemetryEnabled.toString());
      updateTelemetryButton();
      
      if (telemetryEnabled) {
        console.log('Telemetry enabled - collecting interaction data');
      } else {
        console.log('Telemetry disabled');
      }
    }
    
    function trackTelemetry(event, data) {
      if (!telemetryEnabled) return;
      
      telemetryData.interactions.push({
        timestamp: new Date().toISOString(),
        event,
        ...data
      });
      
      // Limit to last 100 interactions
      if (telemetryData.interactions.length > 100) {
        telemetryData.interactions.shift();
      }
    }
    
    function exportTelemetryManifest() {
      const manifest = {
        version: '1.0.0',
        generated: new Date().toISOString(),
        report: {
          type: 'class-hierarchy-analysis',
          totalClasses: classes.length,
          totalMethods: ${classes.reduce((sum, cls) => sum + cls.methods.length, 0)},
          totalProperties: ${classes.reduce((sum, cls) => sum + cls.properties.length, 0)}
        },
        telemetry: telemetryData,
        classes: classes.map(cls => ({
          name: cls.name,
          file: cls.file,
          line: cls.line,
          exported: cls.exported,
          methods: cls.methods.length,
          properties: cls.properties.length,
          extends: cls.extends || null,
          implements: cls.implements || []
        }))
      };
      
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'class-analysis-telemetry-' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      trackTelemetry('manifest_export', { type: 'telemetry_manifest' });
    }
    
    // Track interactions
    document.getElementById('classSearch').addEventListener('input', (e) => {
      trackTelemetry('search', { query: e.target.value });
    });
    
    document.getElementById('classFilter').addEventListener('change', (e) => {
      trackTelemetry('filter', { filter: e.target.value });
    });
    
    document.getElementById('classSort').addEventListener('change', (e) => {
      trackTelemetry('sort', { sort: e.target.value });
    });
    
    // Add export button to telemetry button (right-click or long-press)
    document.getElementById('telemetryBtn').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      exportTelemetryManifest();
    });
    
    // Double-click to export
    let clickTimer = null;
    document.getElementById('telemetryBtn').addEventListener('click', (e) => {
      if (e.detail === 2) {
        e.preventDefault();
        exportTelemetryManifest();
      }
    });
    
    // Initialize telemetry button state
    updateTelemetryButton();
    
    // Add keyboard shortcut for telemetry toggle (Ctrl+T or Cmd+T)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't' && !e.shiftKey) {
        e.preventDefault();
        toggleTelemetry();
      }
      // Export manifest: Ctrl+Shift+T or Cmd+Shift+T
      if ((e.ctrlKey || e.metaKey) && e.key === 'T' && e.shiftKey) {
        e.preventDefault();
        exportTelemetryManifest();
      }
    });
    
    // Dark mode functionality is handled by reusable headers script in <head>
    
    // User scope management
    const userScopes = {
      all: () => true,
      hierarchy: (row) => row.dataset.hasInheritance === 'true',
      standalone: (row) => row.dataset.hasInheritance === 'false',
      exported: (row) => row.dataset.exported === 'true',
      large: (row) => row.dataset.size === 'large',
      custom: () => true, // Custom scope can be configured per user
      // Per-scope filters
      scope_kyc: (row) => row.dataset.scope === 'kyc',
      scope_auth: (row) => row.dataset.scope === 'auth',
      scope_api: (row) => row.dataset.scope === 'api',
      scope_server: (row) => row.dataset.scope === 'server',
      scope_client: (row) => row.dataset.scope === 'client',
      // Per-team filters
      team_security: (row) => row.dataset.team === 'security',
      team_platform: (row) => row.dataset.team === 'platform',
      team_frontend: (row) => row.dataset.team === 'frontend',
      // Per-tenant filters
      tenant_default: (row) => row.dataset.tenant === 'default',
    };
    
    // Load user-specific scope preferences
    function getUserScope() {
      const user = localStorage.getItem('matrixUser') || 'default';
      const scope = localStorage.getItem('matrixScope_' + user) || 'all';
      return scope;
    }
    
    function saveUserScope(scope) {
      const user = localStorage.getItem('matrixUser') || 'default';
      localStorage.setItem('matrixScope_' + user, scope);
    }
    
    function applyMatrixScope(scope) {
      const rows = document.querySelectorAll('#classMatrix tbody tr');
      const filterFn = userScopes[scope] || userScopes.all;
      const scopeFilter = document.getElementById('scopeFilter')?.value || 'all';
      const teamFilter = document.getElementById('teamFilter')?.value || 'all';
      const tenantFilter = document.getElementById('tenantFilter')?.value || 'all';
      let visibleCount = 0;
      
      rows.forEach(row => {
        const shouldShow = filterFn(row);
        const rowScope = row.dataset.scope || 'core';
        const rowTeam = row.dataset.team || 'platform';
        const rowTenant = row.dataset.tenant || 'default';
        
        // Apply tenant/scope/team filters
        if (scopeFilter !== 'all' && rowScope !== scopeFilter) {
          row.classList.add('hidden');
          row.style.display = 'none';
          return;
        }
        if (teamFilter !== 'all' && rowTeam !== teamFilter) {
          row.classList.add('hidden');
          row.style.display = 'none';
          return;
        }
        if (tenantFilter !== 'all' && rowTenant !== tenantFilter) {
          row.classList.add('hidden');
          row.style.display = 'none';
          return;
        }
        
        if (shouldShow) {
          row.classList.remove('hidden');
          row.style.display = '';
          visibleCount++;
        } else {
          row.classList.add('hidden');
          row.style.display = 'none';
        }
      });
      
      // Update scope selector
      document.getElementById('matrixScope').value = scope;
      saveUserScope(scope);
      
      // Show count
      const container = document.getElementById('matrixContainer');
      let countEl = document.getElementById('matrixCount');
      if (!countEl) {
        countEl = document.createElement('div');
        countEl.id = 'matrixCount';
        countEl.style.marginTop = '1rem';
        countEl.style.color = '#64748b';
        countEl.style.fontSize = '0.875rem';
        container.parentNode.insertBefore(countEl, container.nextSibling);
      }
      countEl.textContent = \`Showing \${visibleCount} of \${rows.length} classes\`;
    }
    
    // Matrix functionality
    let matrixView = 'table'; // 'table' or 'heatmap'
    
    function toggleMatrixView() {
      const matrix = document.getElementById('classMatrix');
      const btn = document.getElementById('matrixViewBtn');
      const text = document.getElementById('matrixViewText');
      
      if (matrixView === 'table') {
        // Switch to heatmap view
        matrixView = 'heatmap';
        text.textContent = 'Table';
        matrix.classList.add('heatmap-view');
        
        // Apply heatmap colors to cells
        const rows = matrix.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const methodCell = row.querySelector('td[data-value]');
          const propCell = row.querySelectorAll('td[data-value]')[1];
          const sizeCell = row.querySelectorAll('td[data-value]')[2];
          
          if (methodCell && propCell && sizeCell) {
            const methodVal = parseInt(methodCell.getAttribute('data-value'));
            const propVal = parseInt(propCell.getAttribute('data-value'));
            const maxMethods = Math.max(...Array.from(rows).map(r => parseInt(r.querySelector('td[data-value]')?.getAttribute('data-value') || '0')));
            const maxProps = Math.max(...Array.from(rows).map(r => parseInt(r.querySelectorAll('td[data-value]')[1]?.getAttribute('data-value') || '0')));
            
            const methodIntensity = methodVal / maxMethods;
            const propIntensity = propVal / maxProps;
            
            methodCell.style.background = \`rgba(239, 68, 68, \${methodIntensity * 0.3})\`;
            propCell.style.background = \`rgba(59, 130, 246, \${propIntensity * 0.3})\`;
          }
        });
      } else {
        // Switch back to table view
        matrixView = 'table';
        text.textContent = 'Heatmap';
        matrix.classList.remove('heatmap-view');
        
        // Reset cell backgrounds
        const cells = matrix.querySelectorAll('td[data-value]');
        cells.forEach(cell => {
          if (!cell.closest('thead')) {
            cell.style.background = '';
          }
        });
      }
    }
    
    function exportMatrix() {
      const rows = Array.from(document.querySelectorAll('#classMatrix tbody tr:not(.hidden)'));
      const csv = [
        ['Class', 'Hierarchy Level', 'File', 'Methods', 'Properties', 'Size', 'Scope', 'Team', 'Tenant', 'Exported', 'Extends', 'Implements'].join(','),
        ...rows.map(row => {
          const name = row.querySelector('td strong')?.textContent || '';
          const hierarchyLevel = row.dataset.hierarchyLevel || '0';
          const file = row.querySelector('td div[style*="color: #64748b"]')?.textContent || '';
          const methodVal = row.querySelectorAll('td[data-value]')[0]?.getAttribute('data-value') || '0';
          const propVal = row.querySelectorAll('td[data-value]')[1]?.getAttribute('data-value') || '0';
          const size = row.querySelectorAll('td[data-value]')[2]?.textContent?.trim() || '';
          const scope = row.dataset.scope || 'core';
          const team = row.dataset.team || 'platform';
          const tenant = row.dataset.tenant || 'default';
          const exported = row.querySelectorAll('td[data-value]')[6]?.textContent?.includes('✓') ? 'Yes' : 'No';
          const extendsVal = row.querySelectorAll('td[data-value]')[7]?.textContent?.trim() || '—';
          const implementsVal = row.querySelectorAll('td[data-value]')[8]?.textContent?.trim() || '—';
          
          return [name, hierarchyLevel, file, methodVal, propVal, size, scope, team, tenant, exported, extendsVal, implementsVal].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
        })
      ].join('\\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'class-matrix-' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      trackTelemetry('matrix_export', { type: 'csv' });
    }
    
    // Summary details toggle
    function toggleSummaryDetails() {
      const details = document.getElementById('summaryDetails');
      const btn = document.getElementById('summaryDetailsBtn');
      const text = document.getElementById('summaryDetailsText');
      const icon = document.getElementById('summaryDetailsIcon');
      
      if (details.style.display === 'none' || !details.style.display) {
        details.style.display = 'block';
        text.textContent = 'Hide Details';
        if (icon) icon.textContent = '📖';
        btn.setAttribute('aria-expanded', 'true');
        btn.style.background = 'linear-gradient(135deg, #475569 0%, #64748b 100%)';
        btn.style.borderColor = '#64748b';
        
        // Smooth scroll to details if not visible
        setTimeout(() => {
          details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } else {
        details.style.display = 'none';
        text.textContent = 'Show Details';
        btn.setAttribute('aria-expanded', 'false');
      }
    }
    
    // Filter by clicking summary cards
    function filterByScope(scope) {
      if (document.getElementById('matrixScope')) {
        document.getElementById('matrixScope').value = scope;
        applyMatrixScope(scope);
        // Scroll to matrix
        document.getElementById('matrix-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    
    // Initialize matrix scope
    const initialScope = getUserScope();
    applyMatrixScope(initialScope);
    
    // Scope selector change handler
    document.getElementById('matrixScope').addEventListener('change', (e) => {
      applyMatrixScope(e.target.value);
      trackTelemetry('matrix_scope_change', { scope: e.target.value });
    });
    
    // Make matrix sortable
    document.querySelectorAll('#classMatrix thead th').forEach((th, idx) => {
      if (idx > 0) { // Skip first column (class name)
        th.style.cursor = 'pointer';
        th.setAttribute('role', 'button');
        th.setAttribute('tabindex', '0');
        th.setAttribute('aria-label', \`Sort by \${th.textContent}\`);
        
        th.addEventListener('click', () => {
          const tbody = document.querySelector('#classMatrix tbody');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          const isAsc = th.getAttribute('data-sort') === 'asc';
          
          // Reset all headers
          document.querySelectorAll('#classMatrix thead th').forEach(h => {
            h.removeAttribute('data-sort');
            h.textContent = h.textContent.replace(' ▲', '').replace(' ▼', '');
          });
          
          // Sort rows (account for hierarchy column offset)
          const dataIdx = idx === 0 ? null : idx - 1; // First column is hierarchy, skip it
          rows.sort((a, b) => {
            if (idx === 0) {
              // Sort by hierarchy level, then name
              const levelA = parseInt(a.dataset.hierarchyLevel || '0');
              const levelB = parseInt(b.dataset.hierarchyLevel || '0');
              if (levelA !== levelB) {
                return isAsc ? levelB - levelA : levelA - levelB;
              }
              const nameA = a.querySelector('td strong')?.textContent || '';
              const nameB = b.querySelector('td strong')?.textContent || '';
              return isAsc ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
            }
            
            const aVal = a.querySelectorAll('td[data-value]')[dataIdx]?.getAttribute('data-value') || '0';
            const bVal = b.querySelectorAll('td[data-value]')[dataIdx]?.getAttribute('data-value') || '0';
            const numA = parseFloat(aVal);
            const numB = parseFloat(bVal);
            
            return isAsc ? numB - numA : numA - numB;
          });
          
          // Reorder rows
          rows.forEach(row => tbody.appendChild(row));
          
          // Update header
          th.setAttribute('data-sort', isAsc ? 'desc' : 'asc');
          th.textContent = th.textContent.replace(' ▲', '').replace(' ▼', '') + (isAsc ? ' ▼' : ' ▲');
        });
        
        th.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            th.click();
          }
        });
      }
    });
  </script>
  <style>
    #classMatrix.heatmap-view tbody tr:hover {
      background: rgba(96, 165, 250, 0.1) !important;
    }
    #classMatrix thead th[role="button"]:hover {
      background: #334155;
    }
    #classMatrix thead th[role="button"]:focus {
      outline: 2px solid #60a5fa;
      outline-offset: -2px;
    }
    #classMatrix tbody tr[data-hierarchy-level="1"] {
      border-left: 2px solid #fbbf24;
    }
    #classMatrix tbody tr[data-hierarchy-level="2"] {
      border-left: 2px solid #34d399;
    }
    #classMatrix tbody tr[data-hierarchy-level="0"] {
      border-left: 2px solid #60a5fa;
    }
    #matrixScope:focus {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
    }
  </style>
</body>
</html>`;
}


async function cmdClasses(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const files = await findTypeScriptFiles(path, options.depth || 3, config.ignore || []);
  const classes = await analyzeClasses(files, options);

  // Build inheritance map
  const inheritanceMap = new Map<string, string[]>();
  if (options.inheritance) {
    for (const cls of classes) {
      if (cls.extends) {
        if (!inheritanceMap.has(cls.extends)) {
          inheritanceMap.set(cls.extends, []);
        }
        inheritanceMap.get(cls.extends)!.push(cls.name);
      }
    }
  }

  if (options.format === "json") {
    console.log(JSON.stringify(classes, null, 2));
    return;
  }

  if (options.format === "html") {
    const html = await formatClassesHTML(classes, inheritanceMap);
    const htmlFile = join(tmpdir(), `class-analysis-${Date.now()}.html`);
    await writeFile(htmlFile, html, "utf-8");
    
    if (options.osChrome) {
      // Open browser asynchronously without waiting
      openInChrome(htmlFile, { user: options.user }).catch(() => {
        // Error already handled in openInChrome
      });
      const userInfo = options.user ? ` (user: ${options.user})` : '';
      console.log(`${c.green}✓${c.reset} HTML report generated`);
      console.log(`${c.dim}File: ${htmlFile}${c.reset}`);
      console.log(`${c.dim}Opening in Chrome${userInfo}...${c.reset}`);
    } else {
      console.log(html);
    }
    return;
  }

  console.log(`${c.bold}🏛️  Class Hierarchy Analysis${c.reset}\n`);

  for (const cls of classes) {
    console.log(`${c.bold}${cls.name}${c.reset}`);
    console.log(`  ${c.dim}${cls.file}:${cls.line}${c.reset}`);
    if (cls.extends) {
      console.log(`  ${c.yellow}extends${c.reset} ${cls.extends}`);
    }
    if (cls.implements && cls.implements.length > 0) {
      console.log(`  ${c.yellow}implements${c.reset} ${cls.implements.join(", ")}`);
    }
    console.log(`  Methods: ${cls.methods.length}`);
    console.log(`  Properties: ${cls.properties.length}`);
    console.log();
  }

  if (options.inheritance) {
    if (inheritanceMap.size > 0) {
      console.log(`\n${c.bold}Inheritance Tree:${c.reset}\n`);
      
      // Find root classes (parents that are not children of other classes in our analysis)
      const allParents = new Set<string>();
      const allChildren = new Set<string>();
      inheritanceMap.forEach((children, parent) => {
        allParents.add(parent);
        children.forEach(child => allChildren.add(child));
      });
      const rootClasses = Array.from(allParents).filter(p => !allChildren.has(p));
      
      const printTree = (parent: string, prefix: string = "", isLast: boolean = true) => {
        const children = inheritanceMap.get(parent) || [];
        const parentClass = classes.find(c => c.name === parent);
        
        // Print parent (only if it's a root or we're recursing)
        if (prefix === "" || rootClasses.includes(parent)) {
          console.log(`${prefix}${c.cyan}${parent}${c.reset}${parentClass ? ` ${c.dim}(${parentClass.methods.length} methods, ${parentClass.properties.length} props)${c.reset}` : ''}`);
        }
        
        // Print children
        const newPrefix = prefix + (isLast ? "   " : "│  ");
        children.forEach((child, index) => {
          const childIsLast = index === children.length - 1;
          const childClass = classes.find(c => c.name === child);
          const childConnector = childIsLast ? "└─ " : "├─ ";
          console.log(`${newPrefix}${childConnector}${c.yellow}${child}${c.reset}${childClass ? ` ${c.dim}(${childClass.methods.length} methods, ${childClass.properties.length} props)${c.reset}` : ''}`);
          
          // Recursively print subtree if this child is also a parent
          if (inheritanceMap.has(child)) {
            printTree(child, newPrefix + (childIsLast ? "   " : "│  "), true);
          }
        });
      };
      
      if (rootClasses.length > 0) {
        rootClasses.forEach((root, index) => {
          printTree(root, "", index === rootClasses.length - 1);
        });
      } else {
        // Fallback: print all parent-child relationships
        for (const [parent, children] of inheritanceMap.entries()) {
          printTree(parent, "", true);
        }
      }
      
      console.log(`\n${c.dim}Total inheritance relationships: ${inheritanceMap.size}${c.reset}`);
    } else {
      console.log(`\n${c.bold}Inheritance Tree:${c.reset}`);
      console.log(`${c.dim}No inheritance relationships found. All classes are standalone.${c.reset}\n`);
    }
  }
}

async function cmdStrength(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const files = await findTypeScriptFiles(path, options.depth || 3, config.ignore || []);
  
  // Use base thresholds as defaults (will be overridden per-file if needed)
  const baseThresholds = config.thresholds || {};
  const threshold = baseThresholds.maxComplexity ?? 8;
  const maxFileLines = baseThresholds.maxFileLines ?? 400;
  const maxFileLinesWarning = baseThresholds.maxFileLinesWarning ?? 800;

  interface FileStrength {
    file: string;
    complexity: ComplexityMetrics;
    score: number;
  }

  const strengths: FileStrength[] = [];

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      const complexity = calculateComplexity(content);
      const relPath = relative(process.cwd(), file);

      // Resolve per-file threshold overrides
      const fileThresholds = resolveThresholds(file, config);
      const fileMaxComplexity = fileThresholds.maxComplexity ?? threshold;
      const fileMaxFileLines = fileThresholds.maxFileLines ?? maxFileLines;
      const fileMaxFileLinesWarning = fileThresholds.maxFileLinesWarning ?? maxFileLinesWarning;

      // Score: lower complexity = higher strength
      const complexityScore = Math.max(0, 10 - (complexity.cyclomatic / fileMaxComplexity) * 5);
      const lineScore = complexity.lines < fileMaxFileLines ? 2 : complexity.lines < fileMaxFileLinesWarning ? 1 : 0;
      const depthScore = complexity.maxDepth < 5 ? 2 : complexity.maxDepth < 8 ? 1 : 0;
      const score = (complexityScore + lineScore + depthScore) / 1.4;

      strengths.push({
        file: relPath,
        complexity,
        score: Math.min(10, Math.max(0, score)),
      });
    } catch {
      // Skip
    }
  }

  strengths.sort((a, b) => (options.byComplexity ? a.complexity.cyclomatic - b.complexity.cyclomatic : b.score - a.score));

  if (options.format === "json") {
    console.log(JSON.stringify(strengths, null, 2));
    return;
  }

  const cols = ["file", "score", "complexity", "lines"] as const;
  const toRow = (s: FileStrength) => ({
    file: s.file,
    score: s.score.toFixed(1),
    complexity: s.complexity.cyclomatic,
    lines: s.complexity.lines,
  });

  const strongest = strengths.slice(0, 5).map(toRow);
  const weakest = strengths.slice(-5).reverse().map(toRow);

  console.log(`${c.bold}💪 Component Strength Analysis (Bun.inspect.table)${c.reset}\n`);

  console.log(`${c.bold}Strongest:${c.reset}`);
  console.log(new AnalyzeTable(strongest, [...cols]));

  console.log(`\n${c.bold}Weakest:${c.reset}`);
  console.log(new AnalyzeTable(weakest, [...cols]));
}

async function cmdDeps(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const files = await findTypeScriptFiles(path, options.depth || 3, config.ignore || []);
  const deps = await analyzeDependencies(files, options);

  if (options.circular) {
    const cycles = findCircularDependencies(deps);
    if (cycles.length > 0) {
      console.log(`${c.bold}${c.red}⚠️  Circular Dependencies Found${c.reset}\n`);
      for (const cycle of cycles) {
        console.log(`  ${cycle.join(" → ")}`);
      }
    } else {
      console.log(`${c.green}✓ No circular dependencies found${c.reset}`);
    }
    return;
  }

  if (options.format === "json") {
    console.log(JSON.stringify(Array.from(deps.entries()), null, 2));
    return;
  }

  if (options.format === "table") {
    const trunc = (s: string, max = 36) => (s.length <= max ? s : s.slice(0, max - 3) + "...");
    const rows = Array.from(deps.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, info]) => ({
        file,
        imports: info.imports.length,
        exports: info.exports.length,
        "imports (sample)": trunc(info.imports.slice(0, 2).join(", ") || "—"),
        "exports (sample)": trunc(info.exports.slice(0, 2).join(", ") || "—"),
      }));
    console.log(`${c.bold}📦 Dependency Analysis (Bun.inspect.table)${c.reset}\n`);
    console.log(new AnalyzeTable(rows, ["file", "imports", "exports", "imports (sample)", "exports (sample)"]));
    return;
  }

  console.log(`${c.bold}📦 Dependency Analysis${c.reset}\n`);

  for (const [file, info] of Array.from(deps.entries()).sort()) {
    console.log(`${c.bold}${file}${c.reset}`);
    if (info.imports.length > 0) {
      console.log(`  ${c.dim}Imports:${c.reset} ${info.imports.join(", ")}`);
    }
    if (info.exports.length > 0) {
      console.log(`  ${c.dim}Exports:${c.reset} ${info.exports.join(", ")}`);
    }
    console.log();
  }
}

async function cmdRename(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const files = await findTypeScriptFiles(path, options.depth || 3, config.ignore || []);

  console.log(`${c.bold}🔀 Intelligent Symbol Renaming${c.reset}\n`);

  if (options.dryRun) {
    console.log(`${c.yellow}Dry run mode: No changes will be made${c.reset}\n`);
  }

  // Extract symbols that need renaming
  interface RenameCandidate {
    file: string;
    symbol: string;
    kind: "variable" | "function" | "class" | "interface" | "type";
    line: number;
    currentName: string;
    suggestedName: string;
    reason: string;
  }

  const candidates: RenameCandidate[] = [];

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      const lines = content.split("\n");

      // Find single-letter variables (except common ones like i, j, k)
      const singleLetterRegex = /\b([a-z])\b(?![a-z])/g;
      let match;
      while ((match = singleLetterRegex.exec(content)) !== null) {
        const letter = match[1];
        if (!["i", "j", "k", "x", "y", "z", "n", "e"].includes(letter)) {
          const lineNum = content.substring(0, match.index).split("\n").length;
          candidates.push({
            file: relative(process.cwd(), file),
            symbol: letter,
            kind: "variable",
            line: lineNum,
            currentName: letter,
            suggestedName: `value${letter.toUpperCase()}`,
            reason: "Single-letter variable name",
          });
        }
      }

      // Find camelCase inconsistencies
      const camelCaseRegex = /\b([a-z]+_[a-z]+)\b/g;
      while ((match = camelCaseRegex.exec(content)) !== null) {
        const name = match[1];
        const lineNum = content.substring(0, match.index).split("\n").length;
        const suggested = name.split("_").map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join("");
        candidates.push({
          file: relative(process.cwd(), file),
          symbol: name,
          kind: "variable",
          line: lineNum,
          currentName: name,
          suggestedName: suggested,
          reason: "snake_case should be camelCase",
        });
      }
    } catch {
      // Skip
    }
  }

  if (candidates.length === 0) {
    console.log(`${c.green}✓ No rename candidates found${c.reset}`);
    return;
  }

  console.log(`Found ${candidates.length} rename candidates:\n`);

  for (const candidate of candidates.slice(0, 20)) {
    console.log(`${c.cyan}${candidate.file}:${candidate.line}${c.reset}`);
    console.log(`  ${candidate.kind}: ${c.yellow}${candidate.currentName}${c.reset} → ${c.green}${candidate.suggestedName}${c.reset}`);
    console.log(`  ${c.dim}Reason: ${candidate.reason}${c.reset}\n`);
  }

  if (candidates.length > 20) {
    console.log(`${c.dim}... and ${candidates.length - 20} more${c.reset}\n`);
  }

  if (!options.dryRun && options.auto) {
    console.log(`${c.yellow}⚠️  Auto-rename not implemented. Use --dry-run to preview.${c.reset}`);
  }
}

async function cmdPolish(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const files = await findTypeScriptFiles(path, options.depth || 3, config.ignore || []);

  console.log(`${c.bold}✨ Code Enhancement & Fixes${c.reset}\n`);

  interface PolishIssue {
    file: string;
    line: number;
    issue: string;
    fix: string;
    severity: "low" | "medium" | "high";
  }

  const issues: PolishIssue[] = [];

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      const lines = content.split("\n");
      const relPath = relative(process.cwd(), file);

      // Check for common issues
      lines.forEach((line, index) => {
        // Trailing whitespace
        if (line.trimEnd() !== line && line.trim().length > 0) {
          issues.push({
            file: relPath,
            line: index + 1,
            issue: "Trailing whitespace",
            fix: line.trimEnd(),
            severity: "low",
          });
        }

        // Missing semicolons (optional but preferred)
        if (line.trim() && !line.trim().endsWith(";") && !line.trim().endsWith("{") && !line.trim().endsWith("}") && !line.includes("//") && !line.includes("import") && !line.includes("export")) {
          // Skip if it's a comment, import, or control structure
          if (!line.match(/^\s*(if|for|while|switch|function|const|let|var|return|break|continue|throw)\s/)) {
            issues.push({
              file: relPath,
              line: index + 1,
              issue: "Missing semicolon",
              fix: line.trim() + ";",
              severity: "low",
            });
          }
        }

        // Double quotes instead of single (or vice versa based on style)
        if (line.includes('"') && !line.includes("'")) {
          // Could suggest single quotes for consistency
        }

        // Console.log in production code
        if (line.includes("console.log") && !file.includes("__tests__") && !file.includes(".test.")) {
          issues.push({
            file: relPath,
            line: index + 1,
            issue: "console.log in production code",
            fix: "Use structured logging",
            severity: "medium",
          });
        }

        // TODO/FIXME comments
        if (line.match(/TODO|FIXME|HACK|XXX/i)) {
          issues.push({
            file: relPath,
            line: index + 1,
            issue: "TODO/FIXME comment found",
            fix: line,
            severity: "low",
          });
        }
      });
    } catch {
      // Skip
    }
  }

  if (issues.length === 0) {
    console.log(`${c.green}✓ No polish issues found${c.reset}`);
    return;
  }

  const bySeverity = {
    high: issues.filter((i) => i.severity === "high"),
    medium: issues.filter((i) => i.severity === "medium"),
    low: issues.filter((i) => i.severity === "low"),
  };

  console.log(`Found ${issues.length} polish issues:\n`);
  console.log(`  ${c.red}High:${c.reset} ${bySeverity.high.length}`);
  console.log(`  ${c.yellow}Medium:${c.reset} ${bySeverity.medium.length}`);
  console.log(`  ${c.cyan}Low:${c.reset} ${bySeverity.low.length}\n`);

  // Show top issues
  const topIssues = [...bySeverity.high, ...bySeverity.medium, ...bySeverity.low].slice(0, 15);
  for (const issue of topIssues) {
    const severityColor = issue.severity === "high" ? c.red : issue.severity === "medium" ? c.yellow : c.cyan;
    console.log(`${severityColor}[${issue.severity.toUpperCase()}]${c.reset} ${issue.file}:${issue.line}`);
    console.log(`  ${c.dim}${issue.issue}${c.reset}`);
    if (issue.fix.length < 60) {
      console.log(`  Fix: ${c.green}${issue.fix}${c.reset}\n`);
    }
  }

  if (issues.length > 15) {
    console.log(`\n${c.dim}... and ${issues.length - 15} more issues${c.reset}\n`);
  }

  if (options.autoApply) {
    console.log(`${c.yellow}⚠️  Auto-apply not fully implemented. Review issues above.${c.reset}`);
  } else {
    console.log(`\n${c.dim}Use --auto-apply to automatically fix issues${c.reset}`);
  }
}

async function cmdAnnotations(options: AnalyzeOptions, config: AnalyzeConfig) {
  const path = options.path || "src";
  const files = await findTypeScriptFiles(path, options.depth || 3, config.ignore || []);

  interface Annotation {
    file: string;
    line: number;
    domain?: string;
    scope?: string;
    type?: string;
    meta?: Record<string, string>;
    class?: string;
    function?: string;
    interface?: string;
    refs?: string[];
    bunNative?: string[];
    raw: string;
  }

  const annotations: Annotation[] = [];

  // Regex patterns for different annotation components
  const domainPattern = /\[([A-Z][A-Z0-9-]*)\]/;
  const scopePattern = /\[([A-Z][A-Z0-9-]*)\]/g;
  const metaPattern = /\[META:([^\]]+)\]/g;
  const refPattern = /\[#REF:([^\]]+)\]/g;
  const refPatternPlain = /#REF:([A-Z0-9-]+)/g;
  const bunNativePattern = /\[(BUN-[A-Z-]+)\]/g;

  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      const lines = content.split("\n");
      const relPath = relative(process.cwd(), file);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for annotations in comments (// or /* */)
        if (line.includes("[") && (line.trim().startsWith("//") || line.trim().startsWith("*") || line.includes("/**"))) {
          // Check if line contains annotation pattern (starts with [DOMAIN])
          const domainMatch = line.match(domainPattern);
          if (!domainMatch) continue;

          // Look ahead for #REF tags on following lines (within same comment block)
          let annotationText = line.trim();
          let refsFromNextLines: string[] = [];
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            // Stop if we hit a non-comment line or end of comment block
            if (!nextLine.startsWith("//") && !nextLine.startsWith("*") && nextLine !== "") break;
            if (nextLine.includes("*/")) break;
            
            // Extract #REF tags from following lines (both [#REF:...] and #REF:... formats)
            const refMatches = [...nextLine.matchAll(refPattern)];
            const refMatchesPlain = [...nextLine.matchAll(refPatternPlain)];
            if (refMatches.length > 0) {
              refsFromNextLines.push(...refMatches.map(m => m[1]));
              annotationText += "\n" + nextLine;
            } else if (refMatchesPlain.length > 0) {
              refsFromNextLines.push(...refMatchesPlain.map(m => m[1]));
              annotationText += "\n" + nextLine;
            }
          }

          const annotation: Annotation = {
            file: relPath,
            line: i + 1,
            raw: annotationText,
          };

          // Extract domain (first bracket)
          annotation.domain = domainMatch[1];

          // Extract scope (second bracket, if not META/REF/BUN)
          const scopeMatches = [...line.matchAll(scopePattern)];
          if (scopeMatches.length > 1) {
            const secondBracket = scopeMatches[1][1];
            if (!secondBracket.startsWith("META:") && !secondBracket.startsWith("#REF:") && !secondBracket.startsWith("BUN-")) {
              annotation.scope = secondBracket;
            }
          }

          // Extract type (third bracket, if not special)
          if (scopeMatches.length > 2) {
            const thirdBracket = scopeMatches[2][1];
            if (!thirdBracket.startsWith("META:") && !thirdBracket.startsWith("#REF:") && !thirdBracket.startsWith("BUN-")) {
              annotation.type = thirdBracket;
            }
          }

          // Extract META tags
          const metaMatches = [...line.matchAll(metaPattern)];
          if (metaMatches.length > 0) {
            annotation.meta = {};
            for (const meta of metaMatches) {
              // Parse META:{property} or META:{key:value}
              const content = meta[1];
              if (content.startsWith("{") && content.endsWith("}")) {
                const inner = content.slice(1, -1);
                const colonIndex = inner.indexOf(":");
                if (colonIndex > 0) {
                  annotation.meta[inner.slice(0, colonIndex)] = inner.slice(colonIndex + 1);
                } else {
                  annotation.meta[inner] = "true";
                }
              } else {
                annotation.meta[content] = "true";
              }
            }
          }

          // Extract REF tags (from current line and following lines)
          const refMatches = [...line.matchAll(refPattern)];
          const refMatchesPlain = [...line.matchAll(refPatternPlain)];
          const allRefs = [
            ...refMatches.map(m => m[1]),
            ...refMatchesPlain.map(m => m[1]),
            ...refsFromNextLines
          ];
          if (allRefs.length > 0) {
            annotation.refs = allRefs;
          }

          // Extract BUN-NATIVE tags
          const bunMatches = [...line.matchAll(bunNativePattern)];
          if (bunMatches.length > 0) {
            annotation.bunNative = bunMatches.map(m => m[1]);
          }

          // Extract CLASS, FUNCTION, INTERFACE from remaining brackets
          const remainingBrackets = scopeMatches
            .slice(1)
            .map(m => m[1])
            .filter(tag => 
              !tag.startsWith("META:") && 
              !tag.startsWith("#REF:") && 
              !tag.startsWith("BUN-") &&
              tag !== annotation.scope &&
              tag !== annotation.type
            );

          if (remainingBrackets.includes("CLASS") || remainingBrackets.includes("ABSTRACT") || remainingBrackets.includes("SINGLETON")) {
            annotation.class = remainingBrackets.find(b => ["CLASS", "ABSTRACT", "SINGLETON", "FACTORY", "BUILDER"].includes(b)) || "CLASS";
          }
          if (remainingBrackets.includes("FUNCTION") || remainingBrackets.includes("PURE") || remainingBrackets.includes("ASYNC")) {
            annotation.function = remainingBrackets.find(b => ["FUNCTION", "PURE", "ASYNC", "GENERATOR", "CURRIED", "MEMOIZED"].includes(b)) || "FUNCTION";
          }
          if (remainingBrackets.includes("INTERFACE") || remainingBrackets.includes("TYPE") || remainingBrackets.includes("GENERIC")) {
            annotation.interface = remainingBrackets.find(b => ["INTERFACE", "TYPE", "GENERIC", "UNION", "INTERSECTION"].includes(b)) || "INTERFACE";
          }

          annotations.push(annotation);
        }
      }
    } catch {
      // Skip
    }
  }

  // Apply filters
  let filtered = annotations;
  if (options.domain) {
    filtered = filtered.filter(a => a.domain?.toUpperCase() === options.domain?.toUpperCase());
  }
  if (options.scope) {
    filtered = filtered.filter(a => a.scope?.toUpperCase() === options.scope?.toUpperCase());
  }
  if (options.bunNative) {
    filtered = filtered.filter(a => a.bunNative && a.bunNative.length > 0);
  }
  if (options.ref) {
    filtered = filtered.filter(a => a.refs?.some(r => r.includes(options.ref!)));
  }

  if (filtered.length === 0) {
    console.log(`${c.yellow}No annotations found${c.reset}`);
    if (options.domain || options.scope || options.bunNative || options.ref) {
      console.log(`${c.dim}Try removing filters or check your criteria${c.reset}`);
    } else {
      console.log(`\n${c.dim}Add annotations using format:${c.reset}`);
      console.log(`  ${c.cyan}[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][FUNCTION][INTERFACE][#REF:*][BUN-NATIVE]${c.reset}`);
    }
    return;
  }

  // JSON output - show only JSON, no human-readable output
  if (options.format === "json") {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  console.log(`${c.bold}📋 Code Annotations${c.reset}\n`);
  if (filtered.length !== annotations.length) {
    console.log(`Found ${c.green}${filtered.length}${c.reset} annotations (filtered from ${annotations.length} total)\n`);
  } else {
    console.log(`Found ${c.green}${filtered.length}${c.reset} annotations\n`);
  }

  // Group by domain
  const byDomain = new Map<string, Annotation[]>();
  for (const ann of filtered) {
    const domain = ann.domain || "UNKNOWN";
    if (!byDomain.has(domain)) {
      byDomain.set(domain, []);
    }
    byDomain.get(domain)!.push(ann);
  }

  // Display by domain
  for (const [domain, domainAnns] of Array.from(byDomain.entries()).sort()) {
    console.log(`${c.bold}${domain}${c.reset} (${domainAnns.length})`);
    for (const ann of domainAnns.slice(0, 5)) {
      const tags: string[] = [];
      if (ann.scope) tags.push(`scope:${ann.scope}`);
      if (ann.type) tags.push(`type:${ann.type}`);
      if (ann.bunNative && ann.bunNative.length > 0) {
        tags.push(`bun:${ann.bunNative.join(",")}`);
      }
      if (ann.refs && ann.refs.length > 0) {
        tags.push(`refs:${ann.refs.join(",")}`);
      }
      if (ann.meta && Object.keys(ann.meta).length > 0) {
        const metaKeys = Object.keys(ann.meta).join(",");
        tags.push(`meta:${metaKeys}`);
      }
      
      console.log(`  ${c.dim}${ann.file}:${ann.line}${c.reset} ${tags.join(" ")}`);
      console.log(`    ${c.cyan}${ann.raw.split("\n")[0]}${c.reset}`);
    }
    if (domainAnns.length > 5) {
      console.log(`  ${c.dim}... and ${domainAnns.length - 5} more${c.reset}\n`);
    } else {
      console.log();
    }
  }

  // Show statistics if requested
  if (options.stats) {
    const byDomain = new Map<string, number>();
    const byScope = new Map<string, number>();
    const byType = new Map<string, number>();
    const bunNativeCount = filtered.filter(a => a.bunNative && a.bunNative.length > 0).length;
    const withRefs = filtered.filter(a => a.refs && a.refs.length > 0).length;

    for (const ann of filtered) {
      byDomain.set(ann.domain || "UNKNOWN", (byDomain.get(ann.domain || "UNKNOWN") || 0) + 1);
      byScope.set(ann.scope || "UNKNOWN", (byScope.get(ann.scope || "UNKNOWN") || 0) + 1);
      byType.set(ann.type || "UNKNOWN", (byType.get(ann.type || "UNKNOWN") || 0) + 1);
    }

    console.log(`\n${c.bold}📊 Annotation Statistics${c.reset}\n`);
    console.log(`Total: ${c.green}${filtered.length}${c.reset} annotations\n`);
    
    console.log(`${c.bold}By Domain:${c.reset}`);
    for (const [domain, count] of Array.from(byDomain.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${domain}: ${count}`);
    }
    
    console.log(`\n${c.bold}By Scope:${c.reset}`);
    for (const [scope, count] of Array.from(byScope.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${scope}: ${count}`);
    }
    
    console.log(`\n${c.bold}By Type:${c.reset}`);
    for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
    
    console.log(`\n${c.bold}Features:${c.reset}`);
    console.log(`  Bun-Native: ${c.cyan}${bunNativeCount}${c.reset} (${Math.round(bunNativeCount / filtered.length * 100)}%)`);
    console.log(`  With References: ${c.cyan}${withRefs}${c.reset} (${Math.round(withRefs / filtered.length * 100)}%)\n`);
  }
}

// =============================================================================
// Main
// =============================================================================

function printHelp() {
  console.log(`
${c.bold}Code Analysis & Refactoring Tool${c.reset}

${c.bold}Commands:${c.reset}
  scan          Deep code structure analysis
  types         Extract TypeScript types/interfaces
  classes       Class hierarchy analysis
  rename        Intelligent symbol renaming (TODO)
  polish        Code enhancement and fixes (TODO)
  strength      Identify strong/weak components
  deps          Import/dependency analysis

${c.bold}Usage:${c.reset}
  bun run cli/analyze.ts scan src/ --depth=3
  bun run cli/analyze.ts scan src/ --metrics              # Bun.inspect.table (lines, complexity, etc.)
  bun run cli/analyze.ts scan src/ --format=table         # File list as table
  bun run cli/analyze.ts types --exported-only
  bun run cli/analyze.ts types --format=table             # Types as Bun.inspect.table
  bun run cli/analyze.ts classes --inheritance
  bun run cli/analyze.ts annotations --format=json
  bun run cli/analyze.ts annotations --domain=KYC --stats
  bun run cli/analyze.ts annotations --bun-native --scope=SERVICE
  bun run cli/analyze.ts rename --auto --dry-run
  bun run cli/analyze.ts polish --auto-apply
  bun run cli/analyze.ts strength --by-complexity         # Bun.inspect.table (strongest/weakest)
  bun run cli/analyze.ts deps --circular
  bun run cli/analyze.ts deps --format=table              # Deps as Bun.inspect.table

${c.bold}Options:${c.reset}
  --depth=<n>         Scan depth (default: 3)
  --types-only        Only types
  --classes-only      Only classes
  --functions-only    Only functions
  --metrics           Include complexity
  --format=json       Output format (json|table|text|html)
  --dry-run           Preview changes
  --auto-apply        Apply fixes
  --exported-only     Only exported symbols
  --inheritance       Show inheritance tree
  --auto              Auto mode
  --by-complexity     Sort by complexity
  --circular          Find circular dependencies
  --os-chrome         Open HTML output in Chrome with OS-specific flags (use with --format=html)
  --user=<name>       User profile to use for Chrome (use with --os-chrome)
  --domain=<name>     Filter annotations by domain (annotations command)
  --scope=<name>      Filter annotations by scope (annotations command)
  --bun-native        Show only Bun-native code (annotations command)
  --ref=<pattern>     Filter by reference pattern (annotations command)
  --stats             Show annotation statistics (annotations command)
`);
}

async function main() {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      depth: { type: "string" },
      "types-only": { type: "boolean" },
      "classes-only": { type: "boolean" },
      "functions-only": { type: "boolean" },
      metrics: { type: "boolean" },
      format: { type: "string" },
      "dry-run": { type: "boolean" },
      "auto-apply": { type: "boolean" },
      "exported-only": { type: "boolean" },
      inheritance: { type: "boolean" },
      auto: { type: "boolean" },
      "by-complexity": { type: "boolean" },
      circular: { type: "boolean" },
      "os-chrome": { type: "boolean" },
      user: { type: "string" },
      domain: { type: "string" },
      scope: { type: "string" },
      "bun-native": { type: "boolean" },
      ref: { type: "string" },
      stats: { type: "boolean" },
    },
  });

  const command = positionals[0];
  const config = await loadConfig();

  const options: AnalyzeOptions = {
    depth: values.depth ? parseInt(values.depth as string) : undefined,
    typesOnly: values["types-only"] ?? false,
    classesOnly: values["classes-only"] ?? false,
    functionsOnly: values["functions-only"] ?? false,
    metrics: values.metrics ?? false,
    format: (values.format as "json" | "table" | "text" | "html") || "text",
    dryRun: values["dry-run"] ?? false,
    autoApply: values["auto-apply"] ?? false,
    exportedOnly: values["exported-only"] ?? false,
    inheritance: values.inheritance ?? false,
    auto: values.auto ?? false,
    byComplexity: values["by-complexity"] ?? false,
    circular: values.circular ?? false,
    osChrome: values["os-chrome"] ?? false,
    user: values.user as string | undefined,
    path: positionals[1],
    domain: values.domain as string | undefined,
    scope: values.scope as string | undefined,
    bunNative: values["bun-native"] ?? false,
    ref: values.ref as string | undefined,
    stats: values.stats ?? false,
  };

  if (!command || command === "help" || positionals.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case "scan":
        await cmdScan(options, config);
        break;
      case "types":
        await cmdTypes(options, config);
        break;
      case "classes":
        await cmdClasses(options, config);
        break;
      case "annotations":
        await cmdAnnotations(options, config);
        break;
      case "rename":
        await cmdRename(options, config);
        break;
      case "polish":
        await cmdPolish(options, config);
        break;
      case "strength":
        await cmdStrength(options, config);
        break;
      case "deps":
        await cmdDeps(options, config);
        break;
      default:
        console.error(`${c.red}Unknown command: ${command}${c.reset}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
// ──────────────────────────────
// 1. BUNDLE MATRIX ANALYZER
// ──────────────────────────────

// analyzers/BundleMatrix.ts

// Type declarations for Bun
declare const Bun: any;

import { Bun } from 'bun';

export interface BundleNode {
  id: string;
  path: string;
  bytes: number;
  format: 'esm' | 'cjs' | 'iife' | 'css' | 'unknown';
  
  // Dependencies
  imports: Array<{
    path: string;
    kind: 'import-statement' | 'require-call' | 'dynamic-import' | 'url';
    external?: boolean;
  }>;
  exports: string[];
  
  // Tension metrics
  tension: number;
  bundleScore: number; // 0-100
  health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  
  // Visual
  hsl: string;
  hex: string;
  gradient: string;
  
  // Metadata
  depth: number;
  circular: boolean;
  duplicated: boolean;
  sideEffects: boolean;
}

export interface BundleMatrix {
  inputs: Record<string, BundleNode>;
  outputs: Record<string, {
    bytes: number;
    imports: string[];
    exports: string[];
    entryPoint?: string;
    cssBundle?: string;
  }>;
  
  summary: {
    totalFiles: number;
    totalBytes: number;
    avgFileSize: number;
    avgDepth: number;
    circularDeps: number;
    duplicatedFiles: number;
    externalImports: number;
    bundleHealth: number;
  };
}

export class BundleMatrixAnalyzer {
  static async analyzeProject(
    entrypoints: string[], 
    options: {
      outdir?: string;
      target?: 'browser' | 'bun' | 'node';
      minify?: boolean;
      sourcemap?: 'none' | 'inline' | 'external';
      splitting?: boolean;
      external?: string[];
      define?: Record<string, string>;
      files?: Record<string, string>;
    } = {}
  ): Promise<BundleMatrix> {
    
    // Build with metafile
    const buildOptions: any = {
      entrypoints,
      outdir: options.outdir || "./dist",
      target: options.target || "browser",
      minify: options.minify ?? true,
      sourcemap: options.sourcemap || "none",
      splitting: options.splitting ?? true,
      external: options.external,
      define: options.define,
      metafile: true,
    };
    
    if (options.files) {
      buildOptions.files = options.files;
    }
    
    // Check if Bun.build is available
    if (typeof Bun === 'undefined' || !Bun.build) {
      throw new Error('Bun.build is not available. Please run this with Bun runtime.');
    }
    
    const result = await Bun.build(buildOptions);
    
    if (!result.success) {
      throw new Error(`Build failed: ${result.logs.join('\n')}`);
    }
    
    return this.analyzeMetafile(result.metafile);
  }
  
  static analyzeMetafile(metafile: any): BundleMatrix {
    const inputs = this.analyzeInputs(metafile.inputs);
    const outputs = metafile.outputs;
    
    return {
      inputs,
      outputs,
      summary: this.calculateSummary(inputs, outputs)
    };
  }
  
  private static analyzeInputs(inputs: any): Record<string, BundleNode> {
    const analyzed: Record<string, BundleNode> = {};
    
    // First pass: collect basic info
    Object.entries(inputs).forEach(([path, data]: [string, any]) => {
      const tension = this.calculateFileTension(data);
      
      analyzed[path] = {
        id: this.generateNodeId(path),
        path,
        bytes: data.bytes,
        format: this.detectFormat(path, data),
        imports: data.imports || [],
        exports: data.exports || [],
        tension,
        bundleScore: 100 - tension,
        health: this.getHealthForTension(tension),
        hsl: this.generateHSL(tension),
        hex: this.generateHEX(tension),
        gradient: this.generateGradientHSL(tension),
        depth: this.calculateDepth(path, inputs),
        circular: this.hasCircularDependency(path, inputs),
        duplicated: this.isDuplicated(path, inputs),
        sideEffects: data.sideEffects || false
      };
    });
    
    return analyzed;
  }
  
  private static calculateFileTension(file: any): number {
    let tension = 0;
    
    // Size penalty
    const sizeMB = file.bytes / (1024 * 1024);
    if (sizeMB > 1) tension += Math.min((sizeMB - 1) * 10, 30);
    
    // Import complexity
    const imports = file.imports || [];
    const externalImports = imports.filter((i: any) => i.external).length;
    const dynamicImports = imports.filter((i: any) => i.kind === 'dynamic-import').length;
    
    tension += externalImports * 5;
    tension += dynamicImports * 8;
    tension += imports.length * 2;
    
    // Circular dependency penalty
    if (this.hasCircularDependency(file.path, { [file.path]: file })) {
      tension += 25;
    }
    
    return Math.min(Math.round(tension), 100);
  }
  
  private static calculateDepth(path: string, inputs: any, visited = new Set<string>()): number {
    if (visited.has(path)) return 0;
    visited.add(path);
    
    const file = inputs[path];
    if (!file || !file.imports) return 0;
    
    let maxDepth = 0;
    file.imports.forEach((imp: any) => {
      if (!imp.external && inputs[imp.path]) {
        const depth = 1 + this.calculateDepth(imp.path, inputs, new Set(visited));
        maxDepth = Math.max(maxDepth, depth);
      }
    });
    
    return maxDepth;
  }
  
  private static hasCircularDependency(path: string, inputs: any): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();
    
    const dfs = (currentPath: string): boolean => {
      if (stack.has(currentPath)) return true;
      if (visited.has(currentPath)) return false;
      
      visited.add(currentPath);
      stack.add(currentPath);
      
      const file = inputs[currentPath];
      if (file?.imports) {
        for (const imp of file.imports) {
          if (!imp.external && inputs[imp.path]) {
            if (dfs(imp.path)) return true;
          }
        }
      }
      
      stack.delete(currentPath);
      return false;
    };
    
    return dfs(path);
  }
  
  private static isDuplicated(path: string, inputs: any): boolean {
    const fileName = path.split('/').pop();
    let count = 0;
    
    Object.keys(inputs).forEach(otherPath => {
      if (otherPath.split('/').pop() === fileName) {
        count++;
      }
    });
    
    return count > 1;
  }
  
  private static getHealthForTension(tension: number): BundleNode['health'] {
    if (tension < 20) return 'excellent';
    if (tension < 40) return 'good';
    if (tension < 60) return 'fair';
    if (tension < 80) return 'poor';
    return 'critical';
  }
  
  private static detectFormat(path: string, data: any): BundleNode['format'] {
    if (path.endsWith('.css')) return 'css';
    if (data.format === 'esm') return 'esm';
    if (data.format === 'cjs') return 'cjs';
    if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.jsx') || path.endsWith('.tsx')) {
      return data.exports?.length ? 'esm' : 'unknown';
    }
    return 'unknown';
  }
  
  private static calculateSummary(inputs: Record<string, BundleNode>, outputs: any) {
    const nodes = Object.values(inputs);
    const totalBytes = nodes.reduce((sum, node) => sum + node.bytes, 0);
    const avgDepth = nodes.reduce((sum, node) => sum + node.depth, 0) / nodes.length;
    const circularDeps = nodes.filter(n => n.circular).length;
    const duplicatedFiles = nodes.filter(n => n.duplicated).length;
    
    let externalImports = 0;
    nodes.forEach(node => {
      externalImports += node.imports.filter(i => i.external).length;
    });
    
    const avgTension = nodes.reduce((sum, node) => sum + node.tension, 0) / nodes.length;
    const bundleHealth = 100 - avgTension;
    
    return {
      totalFiles: nodes.length,
      totalBytes,
      avgFileSize: totalBytes / nodes.length,
      avgDepth,
      circularDeps,
      duplicatedFiles,
      externalImports,
      bundleHealth
    };
  }
  
  private static generateNodeId(path: string): string {
    return Buffer.from(path).toString('base64').replace(/[+/=]/g, '').slice(0, 8);
  }
  
  private static generateHSL(tension: number): string {
    // Green (120) to Red (0) based on tension
    const hue = 120 - (tension * 1.2);
    return `hsl(${hue}, 70%, 50%)`;
  }
  
  private static generateHEX(tension: number): string {
    const hue = 120 - (tension * 1.2);
    // Convert HSL to HEX (simplified)
    const r = Math.round(255 * (1 - tension / 100));
    const g = Math.round(255 * (1 - tension / 200));
    const b = Math.round(255 * (1 - tension / 100));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  private static generateGradientHSL(tension: number): string {
    const baseHue = 120 - (tension * 1.2);
    return `linear-gradient(135deg, hsl(${baseHue}, 70%, 50%), hsl(${baseHue - 20}, 80%, 40%))`;
  }
}

#!/usr/bin/env bun
/**
 * Bottleneck Elimination Script
 * 
 * Implements optimizations based on bottleneck analysis:
 * - Function object optimization (memoization, reuse)
 * - Large object optimization (streaming, pagination, object pooling)
 * - GC root cleanup (circular reference breaking, cleanup handlers)
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import { 
  createProfilingError, 
  handleProfilingError,
  ProfilingErrorCode,
  type ProfilingError 
} from './profiling-errors.ts';

const ROOT_DIR = '/Users/nolarose/Projects';
const BOTTLENECK_REPORT = join(ROOT_DIR, 'BOTTLENECK_REPORT.md');

interface Optimization {
  project: string;
  type: 'function' | 'large_object' | 'gc_root';
  description: string;
  file?: string;
  line?: number;
  fix: string;
  applied: boolean;
}

/**
 * Read bottleneck report
 */
function readBottleneckReport(): string | null {
  if (!existsSync(BOTTLENECK_REPORT)) {
    const error = createProfilingError(
      ProfilingErrorCode.PROFILE_NOT_FOUND,
      { reportPath: BOTTLENECK_REPORT, suggestion: 'Run analyze-bottlenecks.ts first' }
    );
    error.log();
    return null;
  }
  
  try {
    return readFileSync(BOTTLENECK_REPORT, 'utf-8');
  } catch (error) {
    const profilingError = handleProfilingError(
      error,
      ProfilingErrorCode.PROFILE_PARSE_ERROR,
      { reportPath: BOTTLENECK_REPORT }
    );
    profilingError.log();
    return null;
  }
}

/**
 * Parse bottleneck report and identify optimizations
 */
function identifyOptimizations(report: string): Optimization[] {
  const optimizations: Optimization[] = [];
  
  // Parse projects with high function counts
  const functionMatch = report.match(/clawdbot.*?(\d{1,3}(?:,\d{3})*)\s+functions/);
  if (functionMatch) {
    const count = parseInt(functionMatch[1].replace(/,/g, ''), 10);
    if (count > 500) {
      optimizations.push({
        project: 'clawdbot',
        type: 'function',
        description: `High function count: ${count.toLocaleString()} functions`,
        fix: 'Implement function memoization and reuse in plugin system',
        applied: false,
      });
    }
  }
  
  // Parse large objects
  const largeObjectMatch = report.match(/clawdbot.*?(\d+\.\d+)\s+MB total/);
  if (largeObjectMatch) {
    const sizeMB = parseFloat(largeObjectMatch[1]);
    if (sizeMB > 10) {
      optimizations.push({
        project: 'clawdbot',
        type: 'large_object',
        description: `Large objects totaling ${sizeMB.toFixed(2)} MB`,
        fix: 'Implement object pooling and streaming for large data structures',
        applied: false,
      });
    }
  }
  
  // Parse GC roots
  const gcRootMatch = report.match(/clawdbot.*?(\d{1,3}(?:,\d{3})*)\s+GC roots/);
  if (gcRootMatch) {
    const count = parseInt(gcRootMatch[1].replace(/,/g, ''), 10);
    if (count > 100) {
      optimizations.push({
        project: 'clawdbot',
        type: 'gc_root',
        description: `High GC root count: ${count.toLocaleString()} GC roots`,
        fix: 'Add cleanup handlers and break circular references',
        applied: false,
      });
    }
  }
  
  // Similar checks for lib and warstrike-refractions
  ['lib', 'warstrike-refractions'].forEach(project => {
    const projectSection = report.match(new RegExp(`### ${project}([\\s\\S]*?)(?=###|$)`));
    if (projectSection) {
      const section = projectSection[1];
      
      // Check function count
      const funcMatch = section.match(/Function Objects.*?(\d{1,3}(?:,\d{3})*)/);
      if (funcMatch) {
        const count = parseInt(funcMatch[1].replace(/,/g, ''), 10);
        if (count > 500) {
          optimizations.push({
            project,
            type: 'function',
            description: `High function count: ${count.toLocaleString()} functions`,
            fix: 'Review closures and implement function memoization',
            applied: false,
          });
        }
      }
      
      // Check GC roots
      const gcMatch = section.match(/GC Roots.*?(\d{1,3}(?:,\d{3})*)/);
      if (gcMatch) {
        const count = parseInt(gcMatch[1].replace(/,/g, ''), 10);
        if (count > 100) {
          optimizations.push({
            project,
            type: 'gc_root',
            description: `High GC root count: ${count.toLocaleString()} GC roots`,
            fix: 'Add cleanup handlers and review global references',
            applied: false,
          });
        }
      }
    }
  });
  
  return optimizations;
}

/**
 * Apply function object optimizations
 */
async function optimizeFunctions(project: string): Promise<boolean> {
  console.log(`  🔧 Applying function optimizations for ${project}...`);
  
  // For clawdbot, focus on plugin system optimizations
  if (project === 'clawdbot') {
    const pluginRegistryPath = join(ROOT_DIR, 'clawdbot/src/plugins/registry.ts');
    if (existsSync(pluginRegistryPath)) {
      try {
        let content = readFileSync(pluginRegistryPath, 'utf-8');
        let modified = false;
        
        // Add function memoization helper if not present
        if (!content.includes('functionMemoCache')) {
          const memoCacheCode = `
// Function memoization cache to reduce function object creation
const functionMemoCache = new WeakMap<Function, Function>();

function memoizeFunction<T extends Function>(fn: T): T {
  if (functionMemoCache.has(fn)) {
    return functionMemoCache.get(fn) as T;
  }
  functionMemoCache.set(fn, fn);
  return fn;
}
`;
          
          // Insert after imports or at top of createPluginRegistry function
          const insertPoint = content.indexOf('export function createPluginRegistry');
          if (insertPoint > 0) {
            const functionStart = content.indexOf('{', insertPoint);
            if (functionStart > 0) {
              content = content.slice(0, functionStart + 1) + memoCacheCode + content.slice(functionStart + 1);
              modified = true;
            }
          }
        }
        
        if (modified) {
          writeFileSync(pluginRegistryPath, content, 'utf-8');
          console.log(`    ✅ Added function memoization to ${pluginRegistryPath}`);
          return true;
        }
      } catch (error) {
        const profilingError = handleProfilingError(
          error,
          ProfilingErrorCode.FILE_WRITE_FAILED,
          { file: pluginRegistryPath, project, optimization: 'function-memoization' }
        );
        profilingError.log();
        return false;
      }
    }
  }
  
  // For lib, add cleanup utilities
  if (project === 'lib') {
    const utilsPath = join(ROOT_DIR, 'lib/utils/function-utils.ts');
    if (!existsSync(utilsPath)) {
      try {
        const cleanupCode = `/**
 * Function cleanup utilities to reduce memory leaks
 */

// WeakMap for tracking function references
const functionRefs = new WeakMap<Function, Set<() => void>>();

/**
 * Register a cleanup function for a given function instance
 */
export function registerFunctionCleanup(fn: Function, cleanup: () => void): void {
  if (!functionRefs.has(fn)) {
    functionRefs.set(fn, new Set());
  }
  functionRefs.get(fn)!.add(cleanup);
}

/**
 * Execute cleanup for a function instance
 */
export function cleanupFunction(fn: Function): void {
  const cleanups = functionRefs.get(fn);
  if (cleanups) {
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    functionRefs.delete(fn);
  }
}
`;
        writeFileSync(utilsPath, cleanupCode, 'utf-8');
        console.log(`    ✅ Created function cleanup utilities at ${utilsPath}`);
        return true;
      } catch (error) {
        const profilingError = handleProfilingError(
          error,
          ProfilingErrorCode.FILE_WRITE_FAILED,
          { file: utilsPath, project, optimization: 'function-cleanup' }
        );
        profilingError.log();
        return false;
      }
    }
  }
  
  return false;
}

/**
 * Apply large object optimizations
 */
async function optimizeLargeObjects(project: string): Promise<boolean> {
  console.log(`  🔧 Applying large object optimizations for ${project}...`);
  
  // Create object pool utility
  const poolPath = join(ROOT_DIR, project, 'utils', 'object-pool.ts');
  const poolDir = join(ROOT_DIR, project, 'utils');
  
  try {
    // Ensure utils directory exists
    if (!existsSync(poolDir)) {
      await $`mkdir -p ${poolDir}`.quiet();
    }
    
    if (!existsSync(poolPath)) {
      const poolCode = `/**
 * Object pooling utility to reduce large object allocations
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      if (this.resetFn) {
        this.resetFn(obj);
      }
      return obj;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  get size(): number {
    return this.pool.length;
  }
}
`;
      writeFileSync(poolPath, poolCode, 'utf-8');
      console.log(`    ✅ Created object pool utility at ${poolPath}`);
      return true;
    }
  } catch (error) {
    const profilingError = handleProfilingError(
      error,
      ProfilingErrorCode.FILE_WRITE_FAILED,
      { file: poolPath, project, optimization: 'object-pool' }
    );
    profilingError.log();
    return false;
  }
  
  return false;
}

/**
 * Apply GC root optimizations
 */
async function optimizeGCRoots(project: string): Promise<boolean> {
  console.log(`  🔧 Applying GC root optimizations for ${project}...`);
  
  // Create cleanup manager
  const cleanupPath = join(ROOT_DIR, project, 'utils', 'cleanup-manager.ts');
  const utilsDir = join(ROOT_DIR, project, 'utils');
  
  try {
    // Ensure utils directory exists
    if (!existsSync(utilsDir)) {
      await $`mkdir -p ${utilsDir}`.quiet();
    }
    
    if (!existsSync(cleanupPath)) {
      const cleanupCode = `/**
 * Cleanup manager to break circular references and reduce GC roots
 */

type CleanupFn = () => void;

export class CleanupManager {
  private cleanups: Set<CleanupFn> = new Set();
  private isCleaned = false;

  register(cleanup: CleanupFn): () => void {
    if (this.isCleaned) {
      cleanup();
      return () => {};
    }
    
    this.cleanups.add(cleanup);
    
    // Return unregister function
    return () => {
      this.cleanups.delete(cleanup);
    };
  }

  cleanup(): void {
    if (this.isCleaned) return;
    
    for (const cleanup of this.cleanups) {
      try {
        cleanup();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    this.cleanups.clear();
    this.isCleaned = true;
  }

  get size(): number {
    return this.cleanups.size;
  }
}

// Global cleanup manager instance
export const globalCleanupManager = new CleanupManager();

// Auto-cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    globalCleanupManager.cleanup();
  });
  
  process.on('SIGINT', () => {
    globalCleanupManager.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    globalCleanupManager.cleanup();
    process.exit(0);
  });
}
`;
      writeFileSync(cleanupPath, cleanupCode, 'utf-8');
      console.log(`    ✅ Created cleanup manager at ${cleanupPath}`);
      return true;
    }
  } catch (error) {
    const profilingError = handleProfilingError(
      error,
      ProfilingErrorCode.FILE_WRITE_FAILED,
      { file: cleanupPath, project, optimization: 'gc-cleanup' }
    );
    profilingError.log();
    return false;
  }
  
  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Reading bottleneck report...\n');
  
  const report = readBottleneckReport();
  if (!report) {
    process.exit(1);
  }
  
  console.log('📊 Identifying optimizations...\n');
  
  const optimizations = identifyOptimizations(report);
  
  if (optimizations.length === 0) {
    console.log('✅ No optimizations needed!');
    return;
  }
  
  console.log(`Found ${optimizations.length} optimization opportunities:\n`);
  optimizations.forEach((opt, idx) => {
    console.log(`${idx + 1}. [${opt.type}] ${opt.project}: ${opt.description}`);
    console.log(`   Fix: ${opt.fix}\n`);
  });
  
  console.log('🚀 Applying optimizations...\n');
  
  const results = {
    applied: 0,
    failed: 0,
  };
  
  // Group optimizations by project and type
  const byProject = new Map<string, Optimization[]>();
  for (const opt of optimizations) {
    if (!byProject.has(opt.project)) {
      byProject.set(opt.project, []);
    }
    byProject.get(opt.project)!.push(opt);
  }
  
  for (const [project, opts] of byProject.entries()) {
    console.log(`\n📦 Processing ${project}:`);
    
    for (const opt of opts) {
      try {
        let success = false;
        
        switch (opt.type) {
          case 'function':
            success = await optimizeFunctions(project);
            break;
          case 'large_object':
            success = await optimizeLargeObjects(project);
            break;
          case 'gc_root':
            success = await optimizeGCRoots(project);
            break;
        }
        
        if (success) {
          opt.applied = true;
          results.applied++;
        } else {
          results.failed++;
        }
      } catch (error) {
        const profilingError = handleProfilingError(
          error,
          ProfilingErrorCode.OPTIMIZATION_FAILED,
          { project, optimizationType: opt.type, description: opt.description }
        );
        profilingError.log();
        results.failed++;
      }
    }
  }
  
  console.log(`\n\n📈 Summary:`);
  console.log(`   ✅ Applied: ${results.applied}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📊 Total: ${optimizations.length}`);
  
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the created utility files`);
  console.log(`   2. Integrate them into your codebase`);
  console.log(`   3. Re-run profile generation and analysis`);
  console.log(`   4. Verify improvements`);
}

if (import.meta.main) {
  await main();
}

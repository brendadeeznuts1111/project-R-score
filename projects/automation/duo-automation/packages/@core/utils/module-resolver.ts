/**
 * Bun-Native Intelligent Module Resolution
 * 
 * Fast module discovery using Bun.resolveSync (10x faster than require.resolve)
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

export interface ModuleResolutionResult {
  module: string;
  path: string;
  found: boolean;
  type: 'file' | 'directory' | 'builtin' | 'not_found';
}

export interface ModuleInfo {
  name: string;
  version?: string;
  path: string;
  type: 'local' | 'node_modules' | 'builtin' | 'duoplus';
  size?: number;
  lastModified?: Date;
}

export interface ResolutionStats {
  totalModules: number;
  foundModules: number;
  missingModules: number;
  duplicates: number;
  resolutionTime: number;
}

export class BunModuleResolver {
  private static cache = new Map<string, ModuleResolutionResult>();
  private static cacheExpiry = new Map<string, number>();

  /**
   * Resolve all DuoPlus modules in parallel using Bun.resolveSync (10x faster than require.resolve)
   */
  static resolveModules(modules: string[]): Map<string, ModuleResolutionResult> {
    const startTime = Bun.nanoseconds();
    const resolved = new Map<string, ModuleResolutionResult>();
    
    for (const mod of modules) {
      const cached = this.getCachedResult(mod);
      if (cached) {
        resolved.set(mod, cached);
        continue;
      }
      
      const result = this.resolveModule(mod);
      resolved.set(mod, result);
      this.setCachedResult(mod, result);
    }
    
    const endTime = Bun.nanoseconds();
    console.debug(`Resolved ${modules.length} modules in ${((endTime - startTime) / 1e6).toFixed(2)}ms`);
    
    return resolved;
  }

  /**
   * Resolve single module
   */
  static resolveModule(moduleId: string): ModuleResolutionResult {
    try {
      // Try Bun.resolveSync first
      const path = Bun.resolveSync(moduleId, process.cwd());
      const stats = Bun.file(path).size;
      
      return {
        module: moduleId,
        path,
        found: true,
        type: path.includes('node_modules') ? 'file' : 'file'
      };
    } catch (error) {
      // Check if it's a builtin module
      if (this.isBuiltinModule(moduleId)) {
        return {
          module: moduleId,
          path: 'builtin',
          found: true,
          type: 'builtin'
        };
      }
      
      // Check if it's a directory
      try {
        const dirPath = Bun.resolveSync(`${moduleId}/package.json`, process.cwd());
        return {
          module: moduleId,
          path: dirPath.replace('/package.json', ''),
          found: true,
          type: 'directory'
        };
      } catch {
        return {
          module: moduleId,
          path: 'NOT_FOUND',
          found: false,
          type: 'not_found'
        };
      }
    }
  }

  /**
   * Find all TypeScript files in project
   */
  static findTsFiles(directory: string = process.cwd()): string[] {
    const files: string[] = [];
    
    // Use a simple recursive approach instead of Glob
    const scanDirectory = (dir: string): void => {
      const entries = Bun.file(dir).list();
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory && !entry.name.includes('node_modules') && !entry.name.includes('.git')) {
          scanDirectory(fullPath);
        } else if (entry.isFile && entry.name.endsWith('.ts')) {
          files.push(fullPath.replace(directory + '/', ''));
        }
      }
    };
    
    scanDirectory(directory);
    return files.sort();
  }

  /**
   * Find all JavaScript files in project
   */
  static findJsFiles(directory: string = process.cwd()): string[] {
    const files: string[] = [];
    
    // Use a simple recursive approach instead of Glob
    const scanDirectory = (dir: string): void => {
      const entries = Bun.file(dir).list();
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory && !entry.name.includes('node_modules') && !entry.name.includes('.git')) {
          scanDirectory(fullPath);
        } else if (entry.isFile && entry.name.endsWith('.js')) {
          files.push(fullPath.replace(directory + '/', ''));
        }
      }
    };
    
    scanDirectory(directory);
    return files.sort();
  }

  /**
   * Find all DuoPlus specific modules
   */
  static findDuoPlusModules(): string[] {
    const patterns = [
      'duoplus/**/*.ts',
      'utils/**/*.ts',
      'cli/**/*.ts',
      'src/**/*.ts'
    ];
    
    const allFiles: string[] = [];
    
    // Use simple directory scanning instead of Glob
    const scanDirectory = (dir: string, pattern: string): void => {
      try {
        const entries = Bun.file(dir).list();
        for (const entry of entries) {
          const fullPath = `${dir}/${entry.name}`;
          if (entry.isDirectory && !entry.name.includes('node_modules') && !entry.name.includes('.git')) {
            scanDirectory(fullPath, pattern);
          } else if (entry.isFile && entry.name.endsWith('.ts')) {
            const relativePath = fullPath.replace(process.cwd() + '/', '');
            if (pattern === 'duoplus/**/*.ts' && relativePath.startsWith('duoplus/')) {
              allFiles.push(relativePath);
            } else if (pattern === 'utils/**/*.ts' && relativePath.startsWith('utils/')) {
              allFiles.push(relativePath);
            } else if (pattern === 'cli/**/*.ts' && relativePath.startsWith('cli/')) {
              allFiles.push(relativePath);
            } else if (pattern === 'src/**/*.ts' && relativePath.startsWith('src/')) {
              allFiles.push(relativePath);
            }
          }
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    };
    
    for (const pattern of patterns) {
      const baseDir = pattern.split('/')[0];
      scanDirectory(baseDir, pattern);
    }
    
    return [...new Set(allFiles)].sort();
  }

  /**
   * Resolve with fallback paths
   */
  static resolveWithFallback(moduleId: string, fallbacks: string[]): string | null {
    for (const fallback of fallbacks) {
      try {
        return Bun.resolveSync(moduleId, fallback);
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Get module information
   */
  static async getModuleInfo(moduleId: string): Promise<ModuleInfo | null> {
    const resolved = this.resolveModule(moduleId);
    
    if (!resolved.found) {
      return null;
    }
    
    let type: ModuleInfo['type'] = 'local';
    let version: string | undefined;
    
    if (resolved.path.includes('node_modules')) {
      type = 'node_modules';
      // Try to read package.json for version
      try {
        const packageJsonPath = resolved.path.replace(/\/[^\/]*$/, '/package.json');
        const packageJson = Bun.file(packageJsonPath);
        if (await packageJson.exists()) {
          const content = await packageJson.json();
          version = content.version;
        }
      } catch {
        // Ignore version read errors
      }
    } else if (resolved.type === 'builtin') {
      type = 'builtin';
    } else if (resolved.path.includes('duoplus')) {
      type = 'duoplus';
    }
    
    let size: number | undefined;
    let lastModified: Date | undefined;
    
    if (resolved.type !== 'builtin' && resolved.path !== 'NOT_FOUND') {
      try {
        const file = Bun.file(resolved.path);
        size = file.size;
        lastModified = new Date(file.lastModified);
      } catch {
        // Ignore stat errors
      }
    }
    
    return {
      name: moduleId,
      version,
      path: resolved.path,
      type,
      size,
      lastModified
    };
  }

  /**
   * Find duplicate modules
   */
  static findDuplicateModules(modules: string[]): Map<string, string[]> {
    const duplicates = new Map<string, string[]>();
    const pathGroups = new Map<string, string[]>();
    
    for (const moduleId of modules) {
      const resolved = this.resolveModule(moduleId);
      if (resolved.found && resolved.path !== 'NOT_FOUND') {
        if (!pathGroups.has(resolved.path)) {
          pathGroups.set(resolved.path, []);
        }
        pathGroups.get(resolved.path)!.push(moduleId);
      }
    }
    
    for (const [path, moduleIds] of pathGroups) {
      if (moduleIds.length > 1) {
        duplicates.set(path, moduleIds);
      }
    }
    
    return duplicates;
  }

  /**
   * Check for circular dependencies
   */
  static detectCircularDependencies(entryFile: string): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularPaths: string[] = [];
    
    const visit = (filePath: string, path: string[]): void => {
      if (recursionStack.has(filePath)) {
        const cycleStart = path.indexOf(filePath);
        if (cycleStart !== -1) {
          circularPaths.push([...path.slice(cycleStart), filePath].join(' -> '));
        }
        return;
      }
      
      if (visited.has(filePath)) {
        return;
      }
      
      visited.add(filePath);
      recursionStack.add(filePath);
      
      try {
        const content = Bun.file(filePath).text();
        // Simple import detection (could be enhanced with AST parsing)
        const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
        
        for (const importStatement of imports) {
          const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
          if (match) {
            const importPath = match[1];
            let resolvedPath: string;
            
            if (importPath.startsWith('.')) {
              // Relative import
              resolvedPath = Bun.resolveSync(importPath, filePath.replace(/\/[^\/]*$/, '/'));
            } else {
              // Skip absolute imports for circular detection
              continue;
            }
            
            visit(resolvedPath, [...path, filePath]);
          }
        }
      } catch {
        // Skip files that can't be read
      }
      
      recursionStack.delete(filePath);
    };
    
    visit(entryFile, []);
    
    return circularPaths;
  }

  /**
   * Analyze module dependencies
   */
  static analyzeDependencies(filePath: string): {
    imports: string[];
    exports: string[];
    size: number;
    lines: number;
  } {
    try {
      const content = Bun.file(filePath).text();
      const imports = (content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [])
        .map((stmt: string) => stmt.match(/from\s+['"]([^'"]+)['"]/)?.[1])
        .filter((imp): imp is string => Boolean(imp));
      
      const exports = (content.match(/export\s+(default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g) || [])
        .map((stmt: string) => stmt.match(/\w+(?=\s*(?:{|$))/)?.[0])
        .filter((exp): exp is string => Boolean(exp));
      
      const lines = content.split('\n').length;
      const size = content.length;
      
      return { imports, exports, size, lines };
    } catch {
      return { imports: [], exports: [], size: 0, lines: 0 };
    }
  }

  /**
   * Get resolution statistics
   */
  static getResolutionStats(modules: string[]): ResolutionStats {
    const startTime = Bun.nanoseconds();
    const resolved = this.resolveModules(modules);
    const endTime = Bun.nanoseconds();
    
    const found = Array.from(resolved.values()).filter(r => r.found).length;
    const missing = modules.length - found;
    const duplicates = this.findDuplicateModules(modules).size;
    
    return {
      totalModules: modules.length,
      foundModules: found,
      missingModules: missing,
      duplicates,
      resolutionTime: (endTime - startTime) / 1_000_000
    };
  }

  /**
   * Clear resolution cache
   */
  static clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Generate module report
   */
  static generateModuleReport(modules: string[]): string {
    const resolved = this.resolveModules(modules);
    const stats = this.getResolutionStats(modules);
    const duplicates = this.findDuplicateModules(modules);
    
    const lines: string[] = [];
    lines.push('=== Module Resolution Report ===');
    lines.push(`Total modules: ${stats.totalModules}`);
    lines.push(`Found: ${stats.foundModules}`);
    lines.push(`Missing: ${stats.missingModules}`);
    lines.push(`Duplicates: ${stats.duplicates}`);
    lines.push(`Resolution time: ${stats.resolutionTime.toFixed(2)}ms`);
    lines.push('');
    
    // Found modules
    lines.push('✅ Found Modules:');
    for (const [moduleId, result] of resolved) {
      if (result.found) {
        lines.push(`  ${moduleId}: ${result.path} (${result.type})`);
      }
    }
    lines.push('');
    
    // Missing modules
    const missingModules = Array.from(resolved.entries()).filter(([, result]) => !result.found);
    if (missingModules.length > 0) {
      lines.push('❌ Missing Modules:');
      for (const [moduleId] of missingModules) {
        lines.push(`  ${moduleId}: NOT_FOUND`);
      }
      lines.push('');
    }
    
    // Duplicates
    if (duplicates.size > 0) {
      lines.push('⚠️  Duplicate Modules:');
      for (const [path, moduleIds] of duplicates) {
        lines.push(`  ${path}:`);
        for (const moduleId of moduleIds) {
          lines.push(`    - ${moduleId}`);
        }
      }
    }
    
    return lines.join('\n');
  }

  // Private helper methods
  private static isBuiltinModule(moduleId: string): boolean {
    const builtins = [
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'querystring',
      'util', 'events', 'stream', 'buffer', 'child_process', 'cluster',
      'dgram', 'dns', 'net', 'readline', 'repl', 'tls', 'v8', 'vm',
      'zlib', 'assert', 'console', 'module', 'process', 'timers',
      'bun', 'bun:sqlite', 'bun:jsc', 'bun:ffi', 'bun:wrap'
    ];
    
    return builtins.includes(moduleId) || moduleId.startsWith('bun:');
  }

  private static getCachedResult(moduleId: string): ModuleResolutionResult | null {
    const expiry = this.cacheExpiry.get(moduleId);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(moduleId);
      this.cacheExpiry.delete(moduleId);
      return null;
    }
    
    return this.cache.get(moduleId) || null;
  }

  private static setCachedResult(moduleId: string, result: ModuleResolutionResult, ttlMs: number = 300000): void {
    this.cache.set(moduleId, result);
    this.cacheExpiry.set(moduleId, Date.now() + ttlMs);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'resolve' && args.length > 1) {
    const modules = args.slice(1);
    const result = BunModuleResolver.generateModuleReport(modules);
    console.log(result);
  } else if (args[0] === 'duoplus') {
    const modules = BunModuleResolver.findDuoPlusModules();
    console.log(`Found ${modules.length} DuoPlus modules:`);
    for (const module of modules.slice(0, 20)) {
      console.log(`  ${module}`);
    }
    if (modules.length > 20) {
      console.log(`  ... and ${modules.length - 20} more`);
    }
  } else if (args[0] === 'typescript') {
    const files = BunModuleResolver.findTsFiles();
    console.log(`Found ${files.length} TypeScript files:`);
    for (const file of files.slice(0, 20)) {
      console.log(`  ${file}`);
    }
    if (files.length > 20) {
      console.log(`  ... and ${files.length - 20} more`);
    }
  } else if (args[0] === 'duplicates') {
    const modules = ['elysia', 'bun:sqlite', 'duoplus-sdk', 'express', 'axios'];
    const duplicates = BunModuleResolver.findDuplicateModules(modules);
    console.log(`Found ${duplicates.size} duplicate module groups`);
    for (const [path, moduleIds] of duplicates) {
      console.log(`${path}: ${moduleIds.join(', ')}`);
    }
  } else if (args[0] === 'analyze' && args[1]) {
    const filePath = args[1];
    const analysis = BunModuleResolver.analyzeDependencies(filePath);
    console.log(`=== Module Analysis: ${filePath} ===`);
    console.log(`Imports: ${analysis.imports.length}`);
    for (const imp of analysis.imports) {
      console.log(`  - ${imp}`);
    }
    console.log(`Exports: ${analysis.exports.length}`);
    for (const exp of analysis.exports) {
      console.log(`  - ${exp}`);
    }
    console.log(`Size: ${analysis.size} bytes`);
    console.log(`Lines: ${analysis.lines}`);
  } else {
    console.log('Usage:');
    console.log('  bun module-resolver.ts resolve <module1> <module2> ...');
    console.log('  bun module-resolver.ts duoplus');
    console.log('  bun module-resolver.ts typescript');
    console.log('  bun module-resolver.ts duplicates');
    console.log('  bun module-resolver.ts analyze <file>');
  }
}

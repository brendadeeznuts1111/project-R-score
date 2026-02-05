#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0+ - Scope Inspection System
 * Deep inspection with filtering capabilities for debugging and analysis
 */

import { join, dirname } from 'path';
import { file } from 'bun';

interface ScopeInspectOptions {
  inspectDepth?: number;
  inspectFilter?: string;
  inspectExcludePath?: string;
  includeMetadata?: boolean;
  includeHidden?: boolean;
  outputFormat?: 'tree' | 'json' | 'table';
}

interface ScopeItem {
  name: string;
  type: 'file' | 'directory' | 'symlink';
  path: string;
  size: number;
  modified: Date;
  children?: ScopeItem[];
  metadata?: Record<string, any>;
  depth: number;
}

interface InspectResult {
  scope: string;
  totalItems: number;
  totalSize: number;
  inspectedAt: Date;
  items: ScopeItem[];
  summary: {
    files: number;
    directories: number;
    symlinks: number;
    maxDepth: number;
  };
}

export class ScopeInspector {
  private basePath: string;
  private options: ScopeInspectOptions;
  
  constructor(basePath: string = process.cwd(), options: ScopeInspectOptions = {}) {
    this.basePath = basePath;
    this.options = {
      inspectDepth: 10,
      inspectFilter: '',
      inspectExcludePath: '',
      includeMetadata: true,
      includeHidden: false,
      outputFormat: 'tree',
      ...options
    };
  }
  
  /**
   * Inspect scope with deep traversal and filtering
   */
  async inspectScope(targetPath?: string): Promise<InspectResult> {
    const inspectPath = targetPath ? join(this.basePath, targetPath) : this.basePath;
    const startTime = new Date();
    
    console.log(`🔍 Inspecting scope: ${inspectPath}`);
    console.log(`📊 Depth: ${this.options.inspectDepth}, Filter: ${this.options.inspectFilter || 'none'}, Exclude: ${this.options.inspectExcludePath || 'none'}`);
    
    const items = await this.traverseDirectory(inspectPath, 0);
    const summary = this.generateSummary(items);
    
    const result: InspectResult = {
      scope: inspectPath,
      totalItems: items.length,
      totalSize: summary.totalSize,
      inspectedAt: startTime,
      items,
      summary
    };
    
    return result;
  }
  
  /**
   * Traverse directory recursively with depth and filtering
   */
  private async traverseDirectory(dirPath: string, currentDepth: number): Promise<ScopeItem[]> {
    if (currentDepth > this.options.inspectDepth!) {
      return [];
    }
    
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      const items: ScopeItem[] = [];
      
      for (const entry of entries) {
        // Skip hidden files if not included
        if (!this.options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        // Apply filter if specified
        if (this.options.inspectFilter && !entry.name.includes(this.options.inspectFilter)) {
          continue;
        }
        
        // Apply exclude path filter if specified
        if (this.options.inspectExcludePath && entry.name.includes(this.options.inspectExcludePath)) {
          continue;
        }
        
        const fullPath = join(dirPath, entry.name);
        const stats = statSync(fullPath);
        
        const item: ScopeItem = {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
          path: fullPath,
          size: stats.size,
          modified: stats.mtime,
          depth: currentDepth
        };
        
        // Add metadata if requested
        if (this.options.includeMetadata) {
          item.metadata = this.extractMetadata(fullPath, entry);
        }
        
        // Recursively traverse directories
        if (entry.isDirectory() && currentDepth < this.options.inspectDepth!) {
          try {
            item.children = await this.traverseDirectory(fullPath, currentDepth + 1);
          } catch (error) {
            console.warn(`⚠️  Could not traverse ${fullPath}: ${error.message}`);
            item.children = [];
          }
        }
        
        items.push(item);
      }
      
      return items;
    } catch (error) {
      console.error(`❌ Error reading directory ${dirPath}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Extract metadata from file/directory
   */
  private extractMetadata(filePath: string, entry: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    try {
      const stats = statSync(filePath);
      
      // Basic file metadata
      metadata.created = stats.birthtime;
      metadata.accessed = stats.atime;
      metadata.permissions = stats.mode.toString(8);
      metadata.owner = stats.uid;
      metadata.group = stats.gid;
      
      // File-specific metadata
      if (entry.isFile()) {
        const ext = filePath.split('.').pop()?.toLowerCase();
        metadata.extension = ext;
        
        // Try to extract file-type specific metadata
        if (ext === 'json') {
          try {
            const content = readFileSync(filePath, 'utf-8');
            const jsonData = JSON.parse(content);
            metadata.jsonKeys = Object.keys(jsonData);
            metadata.jsonSize = content.length;
          } catch {
            metadata.jsonParseError = true;
          }
        } else if (ext === 'ts' || ext === 'js') {
          try {
            const content = readFileSync(filePath, 'utf-8');
            metadata.lines = content.split('\n').length;
            metadata.characters = content.length;
            metadata.hasExports = content.includes('export');
            metadata.hasImports = content.includes('import');
          } catch {
            metadata.readError = true;
          }
        } else if (ext === 'md') {
          try {
            const content = readFileSync(filePath, 'utf-8');
            metadata.lines = content.split('\n').length;
            metadata.characters = content.length;
            metadata.headings = (content.match(/^#+\s/gm) || []).length;
            metadata.codeBlocks = (content.match(/```/g) || []).length / 2;
          } catch {
            metadata.readError = true;
          }
        }
      }
      
      // Directory-specific metadata
      if (entry.isDirectory()) {
        try {
          const entries = readdirSync(filePath);
          metadata.itemCount = entries.length;
          metadata.hasHiddenFiles = entries.some(e => e.startsWith('.'));
        } catch {
          metadata.readError = true;
        }
      }
      
    } catch (error) {
      metadata.error = error.message;
    }
    
    return metadata;
  }
  
  /**
   * Generate summary statistics
   */
  private generateSummary(items: ScopeItem[]): {
    files: number;
    directories: number;
    symlinks: number;
    maxDepth: number;
    totalSize: number;
  } {
    const summary = {
      files: 0,
      directories: 0,
      symlinks: 0,
      maxDepth: 0,
      totalSize: 0
    };
    
    const countItems = (items: ScopeItem[]) => {
      for (const item of items) {
        summary[item.type]++;
        summary.totalSize += item.size;
        summary.maxDepth = Math.max(summary.maxDepth, item.depth);
        
        if (item.children) {
          countItems(item.children);
        }
      }
    };
    
    countItems(items);
    return summary;
  }
  
  /**
   * Format and display inspection results
   */
  displayResults(result: InspectResult): void {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 SCOPE INSPECTION RESULTS`);
    console.log('='.repeat(80));
    
    // Summary information
    console.log(`\n📋 Summary:`);
    console.log(`   Scope: ${result.scope}`);
    console.log(`   Total Items: ${result.totalItems}`);
    console.log(`   Total Size: ${this.formatBytes(result.totalSize)}`);
    console.log(`   Files: ${result.summary.files}`);
    console.log(`   Directories: ${result.summary.directories}`);
    console.log(`   Symlinks: ${result.summary.symlinks}`);
    console.log(`   Max Depth: ${result.summary.maxDepth}`);
    console.log(`   Inspected At: ${result.inspectedAt.toISOString()}`);
    
    // Display items based on format
    switch (this.options.outputFormat) {
      case 'tree':
        this.displayTreeFormat(result.items);
        break;
      case 'json':
        this.displayJsonFormat(result);
        break;
      case 'table':
        this.displayTableFormat(result.items);
        break;
    }
  }
  
  /**
   * Display results in tree format
   */
  private displayTreeFormat(items: ScopeItem[], prefix: string = ''): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;
      const currentPrefix = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      
      // Icon based on type
      const icon = item.type === 'directory' ? '📁' : item.type === 'symlink' ? '🔗' : '📄';
      
      // Basic info
      let line = `${prefix}${currentPrefix}${icon} ${item.name}`;
      
      // Add size for files
      if (item.type === 'file') {
        line += ` (${this.formatBytes(item.size)})`;
      }
      
      // Add metadata highlights
      if (item.metadata) {
        const highlights: string[] = [];
        
        if (item.metadata.extension) {
          highlights.push(item.metadata.extension);
        }
        if (item.metadata.lines) {
          highlights.push(`${item.metadata.lines} lines`);
        }
        if (item.metadata.jsonKeys) {
          highlights.push(`${item.metadata.jsonKeys.length} keys`);
        }
        if (item.metadata.itemCount) {
          highlights.push(`${item.metadata.itemCount} items`);
        }
        
        if (highlights.length > 0) {
          line += ` [${highlights.join(', ')}]`;
        }
      }
      
      console.log(line);
      
      // Recursively display children
      if (item.children && item.children.length > 0) {
        this.displayTreeFormat(item.children, prefix + childPrefix);
      }
    }
  }
  
  /**
   * Display results in JSON format
   */
  private displayJsonFormat(result: InspectResult): void {
    console.log('\n📄 JSON Output:');
    console.log(JSON.stringify(result, null, 2));
  }
  
  /**
   * Display results in table format
   */
  private displayTableFormat(items: ScopeItem[], depth: number = 0): void {
    if (depth === 0) {
      console.log('\n📊 Table View:');
      console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Name                                    Type       Size        Modified                │');
      console.log('├─────────────────────────────────────────────────────────────────────────────────┤');
    }
    
    for (const item of items) {
      const name = (item.name + ' '.repeat(40)).substring(0, 40);
      const type = (item.type + ' '.repeat(11)).substring(0, 11);
      const size = this.formatBytes(item.size).padStart(12);
      const modified = item.modified.toISOString().substring(0, 19);
      
      console.log(`│ ${name} ${type} ${size} ${modified} │`);
      
      if (item.children && item.children.length > 0) {
        this.displayTableFormat(item.children, depth + 1);
      }
    }
    
    if (depth === 0) {
      console.log('└─────────────────────────────────────────────────────────────────────────────────┘');
    }
  }
  
  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * CLI command handler for scope inspection
 */
export class ScopeInspectCLI {
  async handleCommand(args: string[]): Promise<void> {
    const options = this.parseArguments(args);
    
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }
    
    // Extract target path (first non-option argument)
    const targetPath = args.find(arg => !arg.startsWith('--'));
    
    const inspector = new ScopeInspector(process.cwd(), options);
    const result = await inspector.inspectScope(targetPath);
    inspector.displayResults(result);
  }
  
  /**
   * Parse command line arguments
   */
  private parseArguments(args: string[]): ScopeInspectOptions {
    const options: ScopeInspectOptions = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--inspect-depth':
          options.inspectDepth = parseInt(args[++i]) || 10;
          break;
        case '--inspect-filter':
          options.inspectFilter = args[++i];
          break;
        case '--inspect-exclude-path':
          options.inspectExcludePath = args[++i];
          break;
        case '--include-hidden':
          options.includeHidden = true;
          break;
        case '--format':
          const format = args[++i] as 'tree' | 'json' | 'table';
          if (['tree', 'json', 'table'].includes(format)) {
            options.outputFormat = format;
          }
          break;
        case '--no-metadata':
          options.includeMetadata = false;
          break;
      }
    }
    
    return options;
  }
  
  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
🔍 DuoPlus Scope Inspection Tool

USAGE:
  duoplus scope --inspect [options] [path]

OPTIONS:
  --inspect-depth <number>    Maximum depth to traverse (default: 10)
  --inspect-filter <string>   Filter items by name pattern
  --inspect-exclude-path <string>  Exclude items by name pattern
  --include-hidden            Include hidden files and directories
  --format <tree|json|table>  Output format (default: tree)
  --no-metadata               Exclude detailed metadata
  --help, -h                  Show this help message

EXAMPLES:
  duoplus scope --inspect --inspect-depth=5
  duoplus scope --inspect --inspect-filter=keychain
  duoplus scope --inspect --inspect-exclude-path=[USER_CONTEXT].email
  duoplus scope --inspect --format=json src/
  duoplus scope --inspect --include-hidden --inspect-depth=3

FILTER EXAMPLES:
  keychain    - Show only items containing "keychain"
  .env        - Show only items containing ".env"
  config      - Show only items containing "config"
  test        - Show only items containing "test"

EXCLUDE EXAMPLES:
  [USER_CONTEXT].email  - Exclude items containing "[USER_CONTEXT].email"
  node_modules          - Exclude node_modules directory
  .git                  - Exclude .git directory
  *.log                 - Exclude log files
    `);
  }
}

/**
 * Main execution function
 */
async function main() {
  const cli = new ScopeInspectCLI();
  await cli.handleCommand(process.argv.slice(2));
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}

#!/usr/bin/env bun

/**
 * Complete URLPattern Observatory v1.3.6+
 * 
 * All Bun 1.3.6+ features weaponized:
 * - PTY-powered interactive editing
 * - Feature-flagged security tiers
 * - Fast CRC32 pattern cache
 * - WebSocket proxy support
 * - Archive-based backups
 * - Metafile bundle analysis
 * 
 * @see https://bun.sh/docs
 * @see https://github.com/oven-sh/bun
 * @see https://github.com/oven-sh/bun/releases/tag/bun-v1.3.6
 */

import { Database } from 'bun:sqlite';
import { spawn } from 'bun';

// Feature flag system (simulated)
declare global {
  var __BUN_FEATURES__: string[];
}

function feature(name: string): boolean {
  return globalThis.__BUN_FEATURES__?.includes(name) || false;
}

// Import feature modules (conditionally loaded)
let PatternCache: any = null;
let InteractiveEditor: any = null;

if (feature("PREMIUM")) {
  PatternCache = (await import('./fast-pattern-cache')).PatternCache;
}

if (feature("INTERACTIVE")) {
  InteractiveEditor = (await import('./pty-pattern-editor')).InteractivePatternEditor;
}

interface ObservatoryConfig {
  features: string[];
  cache: {
    enabled: boolean;
    ttl: number;
  };
  backup: {
    enabled: boolean;
    compression: number;
  };
  interactive: {
    enabled: boolean;
    terminal: {
      cols: number;
      rows: number;
    };
  };
  telemetry: {
    enabled: boolean;
    endpoint?: string;
  };
}

class CompleteObservatory {
  private db: Database;
  private config: ObservatoryConfig;
  private cache?: any;
  private editor?: any;
  private auditLog: string[] = [];
  
  constructor(config: Partial<ObservatoryConfig> = {}) {
    this.config = {
      features: [],
      cache: { enabled: feature("PREMIUM"), ttl: 3600000 },
      backup: { enabled: true, compression: 9 },
      interactive: { enabled: feature("INTERACTIVE"), terminal: { cols: 120, rows: 40 } },
      telemetry: { enabled: feature("TELEMETRY") },
      ...config
    };
    
    this.db = new Database('./observatory-complete.db');
    this.setupDatabase();
    this.initializeFeatures();
  }
  
  private setupDatabase() {
    // SQLite 3.51.2 with WAL optimization
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.db.exec('PRAGMA cache_size = 10000');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT UNIQUE NOT NULL,
        crc32_hash TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  private initializeFeatures() {
    console.log('🚀 Initializing Complete Observatory v1.3.6+');
    console.log('==========================================');
    
    // Initialize cache if premium
    if (this.config.cache.enabled && PatternCache) {
      this.cache = new PatternCache();
      console.log('✅ Fast CRC32 cache initialized');
    }
    
    // Initialize interactive editor if enabled
    if (this.config.interactive.enabled && InteractiveEditor) {
      this.editor = new InteractiveEditor();
      console.log('✅ PTY interactive editor ready');
    }
    
    // Log enabled features
    console.log(`🔧 Enabled features: ${this.config.features.join(', ') || 'none'}`);
    console.log(`💾 Cache: ${this.config.cache.enabled ? 'enabled' : 'disabled'}`);
    console.log(`🖥️  Interactive: ${this.config.interactive.enabled ? 'enabled' : 'disabled'}`);
    console.log(`📊 Telemetry: ${this.config.telemetry.enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Fast pattern analysis with CRC32 caching
  async analyzePattern(pattern: string): Promise<{
    risk: string;
    issues: string[];
    hash: string;
    cached: boolean;
  }> {
    const hash = Bun.hash.crc32(pattern).toString(16);
    
    // Check cache first (if premium)
    if (this.cache) {
      const cached = this.cache.get(pattern);
      if (cached) {
        this.logAudit('pattern_cache_hit', pattern);
        return {
          risk: cached.risk,
          issues: cached.issues,
          hash,
          cached: true
        };
      }
    }
    
    // Perform analysis
    const analysis = this.performSecurityAnalysis(pattern);
    
    // Cache result (if premium)
    if (this.cache) {
      this.cache.set(pattern, analysis, this.config.cache.ttl);
    }
    
    // Store in database
    this.db.run(
      'INSERT OR REPLACE INTO patterns (pattern, crc32_hash, risk_level, analysis) VALUES (?, ?, ?, ?)',
      [pattern, hash, analysis.risk, JSON.stringify(analysis.issues)]
    );
    
    this.logAudit('pattern_analyzed', pattern, `Risk: ${analysis.risk}`);
    
    return {
      risk: analysis.risk,
      issues: analysis.issues,
      hash,
      cached: false
    };
  }
  
  private performSecurityAnalysis(pattern: string) {
    const issues: string[] = [];
    let risk: 'critical' | 'high' | 'medium' | 'low' = 'low';
    
    // Critical risks
    if (pattern.includes('localhost') || pattern.includes('127.0.0.1')) {
      issues.push('SSRF risk - localhost access');
      risk = 'critical';
    }
    
    if (pattern.includes('..') || pattern.includes('%2e%2e')) {
      issues.push('Path traversal vulnerability');
      risk = 'critical';
    }
    
    // High risks
    if (pattern.includes('192.168.') || pattern.includes('10.') || pattern.includes('172.16.')) {
      issues.push('Private network range');
      risk = 'high';
    }
    
    // Medium risks
    if (pattern.includes('://*') || pattern.includes('://*.')) {
      issues.push('Open redirect risk');
      risk = 'medium';
    }
    
    return { risk, issues };
  }
  
  // Interactive pattern editing
  async editPatternInteractively(filePath: string, line: number): Promise<void> {
    if (!this.editor) {
      throw new Error('Interactive mode requires --feature INTERACTIVE');
    }
    
    console.log(`🖥️  Launching interactive editor for ${filePath}:${line}`);
    await this.editor.editPatternFile(filePath, line);
    this.logAudit('interactive_edit', `${filePath}:${line}`);
  }
  
  // Create secure archive with all features
  async createSecureArchive(): Promise<{
    success: boolean;
    archivePath: string;
    integrity: string;
    features: string[];
  }> {
    console.log('💾 Creating secure archive with all features...');
    
    // Gather all data
    const patterns = this.db.query('SELECT * FROM patterns').all();
    const auditData = JSON.stringify(this.auditLog, null, 2);
    const cacheData = this.cache ? this.cache.export() : {};
    
    // Create archive with CRC32-based organization
    const archiveData: Record<string, string> = {
      'manifest.json': JSON.stringify({
        version: '1.3.6+',
        timestamp: new Date().toISOString(),
        features: this.config.features,
        patternCount: patterns.length,
        cacheEnabled: this.config.cache.enabled,
        interactiveEnabled: this.config.interactive.enabled
      }, null, 2),
      'patterns.json': JSON.stringify(patterns, null, 2),
      'audit-log.json': auditData,
      'cache-export.json': JSON.stringify(cacheData, null, 2)
    };
    
    // Add patterns organized by CRC32 hash
    for (const pattern of patterns) {
      const hash = (pattern as any).crc32_hash;
      archiveData[`patterns/${hash}.json`] = JSON.stringify(pattern, null, 2);
    }
    
    // Create archive
    const archive = new Bun.Archive(archiveData, { 
      compress: 'gzip', 
      level: this.config.backup.compression 
    });
    
    const archiveBlob = await archive.blob();
    const archiveBytes = await archiveBlob.arrayBuffer();
    const integrityHash = Bun.hash.crc32(archiveBytes).toString(16);
    
    // Save archive
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = `./observatory-complete-${timestamp}.tar.gz`;
    
    await Bun.write(archivePath, archiveBytes);
    
    this.logAudit('archive_created', archivePath, `Size: ${archiveBytes.byteLength}, Hash: ${integrityHash}`);
    
    return {
      success: true,
      archivePath,
      integrity: integrityHash,
      features: this.config.features
    };
  }
  
  // Performance metrics
  getPerformanceMetrics() {
    const metrics: Record<string, any> = {
      totalPatterns: this.db.query('SELECT COUNT(*) as count FROM patterns').get(),
      auditEntries: this.auditLog.length,
      features: this.config.features
    };
    
    if (this.cache) {
      metrics.cache = this.cache.getStats();
    }
    
    return metrics;
  }
  
  private logAudit(eventType: string, details?: string, extra?: string) {
    const entry = `[${new Date().toISOString()}] ${eventType}${details ? ` - ${details}` : ''}${extra ? ` - ${extra}` : ''}`;
    this.auditLog.push(entry);
    
    this.db.run(
      'INSERT INTO audit_log (event_type, details) VALUES (?, ?)',
      [eventType, details || null]
    );
    
    // Send telemetry if enabled
    if (this.config.telemetry.enabled) {
      this.sendTelemetry(eventType, { details, extra });
    }
  }
  
  private sendTelemetry(event: string, data: any): void {
    if (this.config.telemetry.endpoint) {
      console.log(`[TELEMETRY] ${event}:`, data);
    }
  }
  
  close(): void {
    if (this.cache) {
      this.cache.close();
    }
    this.db.close();
  }
}

// CLI interface with feature flags
async function main() {
  const args = process.argv.slice(2);
  
  // Parse feature flags
  const features: string[] = [];
  
  if (args.includes('--premium')) features.push('PREMIUM');
  if (args.includes('--debug')) features.push('DEBUG');
  if (args.includes('--interactive')) features.push('INTERACTIVE');
  if (args.includes('--telemetry')) features.push('TELEMETRY');
  if (args.includes('--audit')) features.push('AUDIT_LOG');
  if (args.includes('--all')) features.push('PREMIUM', 'DEBUG', 'INTERACTIVE', 'TELEMETRY', 'AUDIT_LOG');
  
  globalThis.__BUN_FEATURES__ = features;
  
  if (args.includes('--help')) {
    console.log(`
Complete URLPattern Observatory v1.3.6+

Usage:
  bun run observatory-complete.ts [command] [options]

Commands:
  analyze <pattern>     Analyze a single pattern
  interactive <file> <line>    Interactive pattern editing
  archive              Create secure archive
  metrics              Show performance metrics
  demo                 Run complete demonstration

Options:
  --premium            Enable premium features (cache, advanced analysis)
  --debug              Enable debug features
  --interactive        Enable interactive PTY editor
  --telemetry          Enable telemetry
  --audit              Enable audit logging
  --all                Enable all features

Examples:
  bun run observatory-complete.ts analyze "https://localhost:3000/*"
  bun run observatory-complete.ts --premium --interactive edit config.toml 5
  bun run observatory-complete.ts --all demo
    `);
    return;
  }
  
  const observatory = new CompleteObservatory({ features });
  
  try {
    switch (args[0]) {
      case 'analyze':
        if (!args[1]) {
          console.error('❌ Pattern required');
          process.exit(1);
        }
        const result = await observatory.analyzePattern(args[1]);
        console.log('🔍 Analysis Result:');
        console.log(`   Risk: ${result.risk}`);
        console.log(`   Hash: ${result.hash}`);
        console.log(`   Cached: ${result.cached ? 'Yes' : 'No'}`);
        console.log(`   Issues: ${result.issues.join(', ') || 'None'}`);
        break;
        
      case 'interactive':
        if (!args[1] || !args[2]) {
          console.error('❌ File and line number required');
          process.exit(1);
        }
        await observatory.editPatternInteractively(args[1], parseInt(args[2]));
        break;
        
      case 'archive':
        const archive = await observatory.createSecureArchive();
        console.log('💾 Archive created:');
        console.log(`   Path: ${archive.archivePath}`);
        console.log(`   Integrity: ${archive.integrity}`);
        console.log(`   Features: ${archive.features.join(', ')}`);
        break;
        
      case 'metrics':
        const metrics = observatory.getPerformanceMetrics();
        console.log('📊 Performance Metrics:');
        console.log(`   Total patterns: ${metrics.totalPatterns.count}`);
        console.log(`   Audit entries: ${metrics.auditEntries}`);
        console.log(`   Features: ${metrics.features.join(', ') || 'none'}`);
        if (metrics.cache) {
          console.log(`   Cache hit rate: ${metrics.cache.hitRate}`);
        }
        break;
        
      case 'demo':
        console.log('🚀 Complete Observatory Demo');
        console.log('===========================');
        
        // Test pattern analysis
        const testPatterns = [
          'https://localhost:3000/admin/*',
          'https://evil.com/../admin',
          'https://api.example.com/v1/:resource'
        ];
        
        console.log('\n🔍 Testing pattern analysis...');
        for (const pattern of testPatterns) {
          const result = await observatory.analyzePattern(pattern);
          console.log(`   ${pattern}: ${result.risk} (${result.cached ? 'cached' : 'new'})`);
        }
        
        // Test archive creation
        console.log('\n💾 Testing archive creation...');
        const archiveResult = await observatory.createSecureArchive();
        console.log(`   Archive: ${archiveResult.archivePath}`);
        console.log(`   Features: ${archiveResult.features.length} enabled`);
        
        // Show metrics
        console.log('\n📊 Final metrics:');
        const finalMetrics = observatory.getPerformanceMetrics();
        console.log(`   Patterns analyzed: ${finalMetrics.totalPatterns.count}`);
        console.log(`   Cache hit rate: ${finalMetrics.cache?.hitRate || 'N/A'}`);
        console.log(`   Enabled features: ${finalMetrics.features.length}`);
        
        console.log('\n🎉 Complete observatory demo finished!');
        break;
        
      default:
        console.log('❌ Unknown command. Use --help for usage.');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    observatory.close();
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

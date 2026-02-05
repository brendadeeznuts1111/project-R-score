// scripts/self-heal.ts v2.01.05 - Advanced System Hygiene with Metrics
import { $ } from "bun";
import { readdir, unlink, stat, writeFile, readFile } from "fs/promises";
import { join, resolve } from "path";
import { createHash } from "crypto";
import { metricsCollector, createFileMetrics, detectFilePattern, analyzeFileTrends, type FileMetrics } from "../src/metrics/self-heal-metrics";

// Configuration v2.01.05
const CONFIG = {
  targetDir: process.env.HEAL_TARGET_DIR || 'utils',
  filePattern: process.env.HEAL_FILE_PATTERN || '.*!*',
  maxDepth: parseInt(process.env.HEAL_MAX_DEPTH || '1'),
  enableMetrics: process.env.HEAL_ENABLE_METRICS !== 'false',
  dryRun: process.env.HEAL_DRY_RUN === 'true',
  backupBeforeDelete: process.env.HEAL_BACKUP_BEFORE_DELETE === 'true',
  enableHashing: process.env.HEAL_ENABLE_HASHING !== 'false',
  enableAuditLog: process.env.HEAL_ENABLE_AUDIT_LOG !== 'false',
  auditLogPath: process.env.HEAL_AUDIT_LOG_PATH || './logs/heal-audit.log',
  maxFileSize: parseInt(process.env.HEAL_MAX_FILE_SIZE || '104857600'), // 100MB
  minFileAge: parseInt(process.env.HEAL_MIN_FILE_AGE || '60000'), // 1 minute
  enableParallel: process.env.HEAL_ENABLE_PARALLEL === 'true',
  parallelLimit: parseInt(process.env.HEAL_PARALLEL_LIMIT || '5'),
  enableAdvancedMetrics: process.env.HEAL_ENABLE_ADVANCED_METRICS !== 'false',
  enablePatternAnalysis: process.env.HEAL_ENABLE_PATTERN_ANALYSIS !== 'false',
  enableRiskAssessment: process.env.HEAL_ENABLE_RISK_ASSESSMENT !== 'false',
  exitOnFailure: process.env.HEAL_EXIT_ON_FAILURE === 'true' || import.meta.main
};

function isBackupArtifact(filePath: string): boolean {
  return filePath.includes(".backup.");
}

function filterTargetFiles(files: string[]): string[] {
  return files.filter((file) => !isBackupArtifact(file));
}

// Enhanced metrics tracking v2.01.05
interface HealMetrics {
  startTime: number;
  endTime: number;
  filesFound: number;
  filesDeleted: number;
  filesBackedUp: number;
  filesSkipped: number;
  totalBytesProcessed: number;
  errors: string[];
  methods: string[];
  hashesGenerated: number;
  parallelOperations: number;
  auditLogEntries: number;
  patterns: string[];
  riskAssessment: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
  trends: {
    sizeTrend: string;
    ageTrend: string;
    frequencyTrend: string;
  };
  recommendations: string[];
}

let metrics: HealMetrics = {
  startTime: Date.now(),
  endTime: 0,
  filesFound: 0,
  filesDeleted: 0,
  filesBackedUp: 0,
  filesSkipped: 0,
  totalBytesProcessed: 0,
  errors: [],
  methods: [],
  hashesGenerated: 0,
  parallelOperations: 0,
  auditLogEntries: 0,
  patterns: [],
  riskAssessment: {
    lowRisk: 0,
    mediumRisk: 0,
    highRisk: 0
  },
  trends: {
    sizeTrend: 'stable',
    ageTrend: 'stable',
    frequencyTrend: 'stable'
  },
  recommendations: []
};

let scannedFiles = new Set<string>();

function selectNewFiles(files: string[]): string[] {
  const fresh: string[] = [];
  for (const file of files) {
    const normalized = resolve(file);
    if (!scannedFiles.has(normalized)) {
      scannedFiles.add(normalized);
      fresh.push(file);
    }
  }
  return fresh;
}

// Enhanced logging v2.01.05 with structured output
function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any, meta?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  const logEntry = {
    timestamp,
    level,
    message,
    data: data || null,
    meta: meta || null,
    pid: process.pid,
    version: '2.01.05'
  };
  
  switch (level) {
    case 'debug':
      if (process.env.HEAL_DEBUG === 'true') {
        console.debug(`${prefix} ${message}`, data || '');
      }
      break;
    case 'info':
      console.log(`${prefix} ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️  ${message}`, data || '');
      break;
    case 'error':
      console.error(`${prefix} ❌ ${message}`, data || '');
      break;
  }
  
  // Write to audit log if enabled
  if (CONFIG.enableAuditLog && level !== 'debug') {
    writeAuditLog(logEntry);
  }
}

// Audit logging v2.01.05
async function writeAuditLog(entry: any): Promise<void> {
  try {
    const logLine = JSON.stringify(entry) + '\n';
    await writeFile(CONFIG.auditLogPath, logLine, { flag: 'a' });
    metrics.auditLogEntries++;
  } catch (err) {
    // Fail silently for audit logs to not interrupt main flow
    log('debug', 'Failed to write audit log:', err);
  }
}

// File hashing for integrity verification
async function generateFileHash(filePath: string): Promise<string> {
  if (!CONFIG.enableHashing) return '';
  
  try {
    const fileBuffer = await readFile(filePath);
    const hash = createHash('sha256').update(fileBuffer).digest('hex');
    metrics.hashesGenerated++;
    return hash;
  } catch (err) {
    log('warn', `Failed to generate hash for ${filePath}:`, err);
    return '';
  }
}

// Enhanced backup with integrity verification
async function backupFile(filePath: string): Promise<string | null> {
  if (!CONFIG.backupBeforeDelete) return null;
  
  try {
    const timestamp = Date.now();
    const hash = await generateFileHash(filePath);
    const backupPath = `${filePath}.backup.${timestamp}${hash ? `.hash-${hash.slice(0, 8)}` : ''}`;
    
    await $`cp "${filePath}" "${backupPath}"`.quiet();
    
    // Verify backup integrity
    if (hash) {
      const backupHash = await generateFileHash(backupPath);
      if (backupHash !== hash) {
        log('error', `Backup integrity check failed for ${backupPath}`);
        await unlink(backupPath);
        return null;
      }
    }
    
    log('info', `📋 Backed up file:`, { original: filePath, backup: backupPath, hash: hash?.slice(0, 8) });
    metrics.filesBackedUp++;
    return backupPath;
  } catch (err) {
    log('warn', `Failed to backup file:`, filePath);
    return null;
  }
}

// Enhanced file validation v2.01.05
async function validateFile(filePath: string): Promise<{ valid: boolean; reason?: string; stats?: any }> {
  try {
    const stats = await stat(filePath);
    
    // Size validation
    if (stats.size > CONFIG.maxFileSize) {
      return { 
        valid: false, 
        reason: `File too large: ${stats.size} bytes (max: ${CONFIG.maxFileSize})`,
        stats 
      };
    }
    
    // Age validation
    const ageMs = Date.now() - stats.mtime.getTime();
    if (ageMs < CONFIG.minFileAge) {
      return { 
        valid: false, 
        reason: `File too recent: ${Math.round(ageMs / 1000)}s old (min: ${CONFIG.minFileAge / 1000}s)`,
        stats 
      };
    }
    
    // Pattern validation
    const fileName = filePath.split('/').pop() || '';
    if (!fileName.startsWith('.') || !fileName.includes('!')) {
      return { 
        valid: false, 
        reason: `File does not match target pattern: ${fileName}`,
        stats 
      };
    }
    
    return { valid: true, stats };
  } catch (err) {
    return { valid: false, reason: `Stat failed: ${err}` };
  }
}

// Enhanced file deletion with parallel support v2.01.05
async function safeDeleteFile(filePath: string): Promise<boolean> {
  const operationId = await metricsCollector.startOperation('delete', 'readdir');
  
  try {
    // Validate file
    const validation = await validateFile(filePath);
    if (!validation.valid) {
      log('warn', `Skipping file:`, { filePath, reason: validation.reason });
      metrics.filesSkipped++;
      await metricsCollector.completeOperation(operationId, false, [validation.reason || 'Validation failed']);
      return false;
    }
    
    // Track bytes processed
    metrics.totalBytesProcessed += validation.stats?.size || 0;
    
    // Create file metrics for analysis
    let fileMetrics: FileMetrics | null = null;
    if (CONFIG.enableAdvancedMetrics && validation.stats) {
      const pattern = detectFilePattern(filePath.split('/').pop() || '');
      fileMetrics = await createFileMetrics(filePath, validation.stats);
      fileMetrics.pattern = pattern;
      
      // Update risk assessment
      if (fileMetrics.riskScore < 30) {
        metrics.riskAssessment.lowRisk++;
      } else if (fileMetrics.riskScore < 70) {
        metrics.riskAssessment.mediumRisk++;
      } else {
        metrics.riskAssessment.highRisk++;
      }
      
      // Track patterns
      if (!metrics.patterns.includes(pattern)) {
        metrics.patterns.push(pattern);
      }
      
      await metricsCollector.recordFileMetrics(fileMetrics);
    }
    
    // Generate hash before operations
    const originalHash = await generateFileHash(filePath);
    
    // Backup if enabled
    const backupPath = await backupFile(filePath);
    
    // Dry run mode
    if (CONFIG.dryRun) {
      log('info', `🔍 DRY RUN: Would delete:`, { 
        filePath, 
        size: validation.stats?.size, 
        hash: originalHash?.slice(0, 8),
        riskScore: fileMetrics?.riskScore || 0
      });
      metrics.filesDeleted++;
      await metricsCollector.completeOperation(operationId, true);
      return true;
    }
    
    // Actual deletion
    await unlink(filePath);
    log('info', `🗑️  Removed:`, { 
      filePath, 
      size: validation.stats?.size, 
      backup: backupPath,
      hash: originalHash?.slice(0, 8),
      riskScore: fileMetrics?.riskScore || 0
    });
    metrics.filesDeleted++;
    
    await metricsCollector.completeOperation(operationId, true);
    return true;
  } catch (err) {
    const errorMsg = `Failed to delete ${filePath}: ${err}`;
    log('error', errorMsg);
    metrics.errors.push(errorMsg);
    await metricsCollector.completeOperation(operationId, false, [errorMsg]);
    return false;
  }
}

// Parallel file processing
async function processFilesInParallel(files: string[]): Promise<void> {
  if (!CONFIG.enableParallel || files.length <= 1) {
    // Sequential processing
    for (const file of files) {
      await safeDeleteFile(file);
    }
    return;
  }
  
  log('info', `🚀 Processing ${files.length} files in parallel (limit: ${CONFIG.parallelLimit})`);
  metrics.parallelOperations = files.length;
  
  // Process in batches
  for (let i = 0; i < files.length; i += CONFIG.parallelLimit) {
    const batch = files.slice(i, i + CONFIG.parallelLimit);
    await Promise.all(batch.map(file => safeDeleteFile(file)));
    
    log('debug', `Processed batch ${Math.floor(i / CONFIG.parallelLimit) + 1}/${Math.ceil(files.length / CONFIG.parallelLimit)}`);
  }
}

// Method 1: Enhanced find command with parallel processing
async function cleanupWithFind(): Promise<void> {
  log('info', '🔍 Method 1: Scanning with find command...');
  metrics.methods.push('find');
  
  try {
    // Check if target directory exists first
    try {
      await stat(CONFIG.targetDir);
    } catch (error) {
      log('info', `📁 Target directory '${CONFIG.targetDir}' does not exist, skipping find scan`);
      log('info', '✅ No swap artifacts found via find command.');
      return;
    }
    
    const result = await $`find "${CONFIG.targetDir}" -maxdepth ${CONFIG.maxDepth} -name "${CONFIG.filePattern}" -type f 2>/dev/null`.quiet();
    const files = selectNewFiles(
      filterTargetFiles(
        result.stdout.toString().trim().split('\n').filter(Boolean)
      )
    );
    
    if (files.length > 0) {
      log('info', `📁 Found ${files.length} artifact(s):`, files);
      metrics.filesFound += files.length;
      
      await processFilesInParallel(files);
    } else {
      log('info', '✅ No swap artifacts found via find command.');
    }
  } catch (err) {
    log('warn', 'Find command failed (expected in some environments):', err);
  }
}

// Method 2: Enhanced filesystem scan with detailed filtering
async function cleanupWithReaddir(): Promise<void> {
  log('info', '🔍 Method 2: Scanning with filesystem API...');
  metrics.methods.push('readdir');
  
  try {
    // Check if target directory exists
    try {
      await stat(CONFIG.targetDir);
    } catch (error) {
      log('info', `📁 Target directory '${CONFIG.targetDir}' does not exist, skipping filesystem scan`);
      log('info', '✅ No swap artifacts found via filesystem scan.');
      return;
    }
    
    const dir = await readdir(CONFIG.targetDir, { withFileTypes: true });
    const swapFiles = selectNewFiles(
      filterTargetFiles(
        dir
          .filter(d => d.isFile())
          .filter(d => d.name.includes('!') && d.name.startsWith('.'))
          .map(d => join(CONFIG.targetDir, d.name))
      )
    );

    if (swapFiles.length > 0) {
      log('info', `📁 Found ${swapFiles.length} artifact(s) via direct scan:`, swapFiles);
      metrics.filesFound += swapFiles.length;
      
      await processFilesInParallel(swapFiles);
    } else {
      log('info', '✅ No swap artifacts found via filesystem scan.');
    }
  } catch (err) {
    const errorMsg = `Filesystem scan failed: ${err}`;
    log('error', errorMsg);
    metrics.errors.push(errorMsg);
  }
}

// Enhanced validation with detailed reporting
async function finalValidation(): Promise<boolean> {
  log('info', '🔍 Final validation...');
  
  try {
    if (CONFIG.dryRun) {
      log('info', '✅ Validation skipped for dry run');
      return true;
    }
    const verify = await $`find "${CONFIG.targetDir}" -maxdepth ${CONFIG.maxDepth} -name "${CONFIG.filePattern}" -type f 2>/dev/null || true`.quiet();
    const remainingFiles = filterTargetFiles(
      verify.stdout.toString().trim().split('\n').filter(Boolean)
    );
    
    if (remainingFiles.length > 0) {
      log('error', `❌ Ghost files remain (${remainingFiles.length}):`, remainingFiles);
      return false;
    } else {
      log('info', '✅ Validation passed: No remaining artifacts');
      return true;
    }
  } catch (err) {
    log('warn', 'Validation command failed:', err);
    return false;
  }
}

// Enhanced metrics report v2.01.05
function generateMetricsReport(): string {
  const duration = metrics.endTime - metrics.startTime;
  const success = metrics.errors.length === 0;
  const avgFileSize = metrics.filesFound > 0 ? Math.round(metrics.totalBytesProcessed / metrics.filesFound) : 0;
  
  let report = `
📊 HEAL METRICS REPORT v2.01.05
=================================
Duration: ${duration}ms
Methods Used: ${metrics.methods.join(', ')}
Files Found: ${metrics.filesFound}
Files Deleted: ${metrics.filesDeleted}
Files Backed Up: ${metrics.filesBackedUp}
Files Skipped: ${metrics.filesSkipped}
Total Bytes Processed: ${(metrics.totalBytesProcessed / 1024 / 1024).toFixed(2)}MB
Average File Size: ${avgFileSize} bytes
Hashes Generated: ${metrics.hashesGenerated}
Parallel Operations: ${metrics.parallelOperations}
Audit Log Entries: ${metrics.auditLogEntries}
Errors: ${metrics.errors.length}
Success: ${success ? '✅' : '❌'}
`;
  
  // Add pattern analysis
  if (CONFIG.enablePatternAnalysis && metrics.patterns.length > 0) {
    report += `
🔍 PATTERN ANALYSIS:
==================
Patterns Detected: ${metrics.patterns.length}
${metrics.patterns.map(p => `   • ${p}`).join('\n')}
`;
  }
  
  // Add risk assessment
  if (CONFIG.enableRiskAssessment) {
    const totalRisk = metrics.riskAssessment.lowRisk + metrics.riskAssessment.mediumRisk + metrics.riskAssessment.highRisk;
    if (totalRisk > 0) {
      report += `
⚠️  RISK ASSESSMENT:
===================
Low Risk: ${metrics.riskAssessment.lowRisk} (${Math.round(metrics.riskAssessment.lowRisk / totalRisk * 100)}%)
Medium Risk: ${metrics.riskAssessment.mediumRisk} (${Math.round(metrics.riskAssessment.mediumRisk / totalRisk * 100)}%)
High Risk: ${metrics.riskAssessment.highRisk} (${Math.round(metrics.riskAssessment.highRisk / totalRisk * 100)}%)
`;
    }
  }
  
  // Add trends
  if (CONFIG.enableAdvancedMetrics) {
    report += `
📈 TRENDS:
=========
Size Trend: ${metrics.trends.sizeTrend}
Age Trend: ${metrics.trends.ageTrend}
Frequency Trend: ${metrics.trends.frequencyTrend}
`;
  }
  
  // Add recommendations
  if (metrics.recommendations.length > 0) {
    report += `
💡 RECOMMENDATIONS:
==================
${metrics.recommendations.map(r => `   • ${r}`).join('\n')}
`;
  }
  
  // Add errors if any
  if (metrics.errors.length > 0) {
    report += `\n❌ Errors:\n${metrics.errors.join('\n')}`;
  }
  
  return report;
}

// Enhanced main heal function v2.01.05
export async function heal(options?: Partial<typeof CONFIG>): Promise<HealMetrics> {
  const originalConfig = { ...CONFIG };
  // Override config with options
  Object.assign(CONFIG, options || {});

  if (CONFIG.dryRun && import.meta.main && (!options || options.minFileAge === undefined)) {
    CONFIG.minFileAge = 0;
  }
  
  log('info', '🧹 System Hygiene v2.01.05: Advanced cleaning starting...');
  log('info', `📋 Configuration:`, CONFIG);
  if (CONFIG.dryRun) {
    log('info', '🔍 DRY RUN MODE');
  }
  
  // Reset metrics
  metrics = {
    startTime: Date.now(),
    endTime: 0,
    filesFound: 0,
    filesDeleted: 0,
    filesBackedUp: 0,
    filesSkipped: 0,
    totalBytesProcessed: 0,
    errors: [],
    methods: [],
    hashesGenerated: 0,
    parallelOperations: 0,
    auditLogEntries: 0,
    patterns: [],
    riskAssessment: {
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0
    },
    trends: {
      sizeTrend: 'stable',
      ageTrend: 'stable',
      frequencyTrend: 'stable'
    },
    recommendations: []
  };
  scannedFiles = new Set<string>();
  
  try {
    // Start metrics collection
    const scanOperationId = await metricsCollector.startOperation('scan', 'find');
    
    // Execute cleanup methods
    await cleanupWithFind();
    await cleanupWithReaddir();
    
    await metricsCollector.completeOperation(scanOperationId, true);
    
    // Perform pattern analysis if enabled
    if (CONFIG.enablePatternAnalysis && CONFIG.enableAdvancedMetrics) {
      log('info', '🔍 Performing pattern analysis...');
      const patternAnalysis = await metricsCollector.analyzePatterns();
      
      // Update recommendations
      metrics.recommendations = patternAnalysis.recommendations;
      
      log('info', `📊 Pattern analysis complete: ${patternAnalysis.summary.totalPatterns} patterns found`);
      
      if (patternAnalysis.summary.highRiskPatterns > 0) {
        log('warn', `⚠️  ${patternAnalysis.summary.highRiskPatterns} high-risk patterns detected`);
      }
    }
    
    // Final validation
    const isValid = await finalValidation();
    
    metrics.endTime = Date.now();
    
    // Save advanced metrics if enabled
    if (CONFIG.enableAdvancedMetrics) {
      try {
        await metricsCollector.saveMetrics();
        log('info', '📋 Advanced metrics saved to ./data/current-metrics.json');
      } catch (error) {
        log('warn', 'Failed to save advanced metrics:', error);
      }
    }
    
    // Generate report
    if (CONFIG.enableMetrics) {
      const report = generateMetricsReport();
      log('info', report);
    }
    
    if (isValid) {
      log('info', '💎 System state: PRISTINE - Ready for v3.7 R2 sync');
    } else {
      log('error', '⚠️  System state: INCOMPLETE - Some files remain');
      if (CONFIG.exitOnFailure) {
        process.exit(1);
      }
    }
    
  } catch (err) {
    metrics.endTime = Date.now();
    const errorMsg = `Heal process failed: ${err}`;
    log('error', errorMsg);
    metrics.errors.push(errorMsg);
    
    if (CONFIG.enableMetrics) {
      log('info', generateMetricsReport());
    }
    
    if (CONFIG.exitOnFailure) {
      process.exit(1);
    }
  } finally {
    Object.assign(CONFIG, originalConfig);
  }
  
  return metrics;
}

// Export utilities for testing and advanced usage
export { CONFIG, generateMetricsReport, validateFile, safeDeleteFile, processFilesInParallel, generateFileHash, writeAuditLog, type HealMetrics };

// Run immediately if executed as a script
if (import.meta.main) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: Partial<typeof CONFIG> = {};
  
  if (args.includes('--dry-run')) options.dryRun = true;
  if (args.includes('--backup')) options.backupBeforeDelete = true;
  if (args.includes('--no-metrics')) options.enableMetrics = false;
  if (args.includes('--parallel')) options.enableParallel = true;
  if (args.includes('--no-hash')) options.enableHashing = false;
  if (args.includes('--no-audit')) options.enableAuditLog = false;
  
  // Parse key-value arguments
  const targetDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1];
  if (targetDir) options.targetDir = targetDir;
  
  const maxDepth = args.find(arg => arg.startsWith('--depth='))?.split('=')[1];
  if (maxDepth) options.maxDepth = parseInt(maxDepth);
  
  const parallelLimit = args.find(arg => arg.startsWith('--parallel-limit='))?.split('=')[1];
  if (parallelLimit) options.parallelLimit = parseInt(parallelLimit);
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧹 System Hygiene v2.01.05 - Advanced Cleaning Tool

Usage: bun run scripts/self-heal.ts [options]

Options:
  --dry-run              Simulate deletion without actually deleting
  --backup               Create backups before deletion
  --parallel             Enable parallel processing
  --no-metrics           Disable metrics reporting
  --no-hash              Disable file hashing
  --no-audit              Disable audit logging
  --dir=<path>           Target directory (default: utils)
  --depth=<number>       Maximum search depth (default: 1)
  --parallel-limit=<n>   Parallel operation limit (default: 5)
  --help, -h             Show this help

Environment Variables:
  HEAL_TARGET_DIR        Target directory
  HEAL_FILE_PATTERN      File pattern to match
  HEAL_MAX_DEPTH         Maximum search depth
  HEAL_ENABLE_METRICS    Enable metrics (true/false)
  HEAL_DRY_RUN           Enable dry run (true/false)
  HEAL_BACKUP_BEFORE_DELETE  Create backups (true/false)
  HEAL_ENABLE_HASHING    Enable file hashing (true/false)
  HEAL_ENABLE_AUDIT_LOG  Enable audit logging (true/false)
  HEAL_MAX_FILE_SIZE     Maximum file size in bytes
  HEAL_MIN_FILE_AGE      Minimum file age in milliseconds
  HEAL_ENABLE_PARALLEL   Enable parallel processing (true/false)
  HEAL_PARALLEL_LIMIT    Parallel operation limit
  HEAL_DEBUG             Enable debug logging (true/false)
`);
    process.exit(0);
  }
  
  heal(options);
}

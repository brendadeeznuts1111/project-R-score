import { QuantumResistantSecureDataRepository } from '../quantum-audit.js';
import { BUN_DOC_MAP } from '../col93-matrix.js';

export async function auditCommand(args: string[]) {
  const options = parseAuditArgs(args);
  
  if (options.report) {
    return await generateAuditReport(options);
  }
  
  if (options.query) {
    return await queryAuditEntry(options.query);
  }
  
  if (options.matrix) {
    return await auditMatrix();
  }
  
  // Default: show audit status
  return await showAuditStatus();
}

async function generateAuditReport(options: any) {
  console.log('📊 Generating comprehensive audit report...');
  
  const auditLog = new QuantumResistantSecureDataRepository();
  const matrixReport = await BUN_DOC_MAP.generateReport();
  const auditReport = await auditLog.generateAuditReport(options.timeRange);
  
  console.log(`
🔍 COMPREHENSIVE AUDIT REPORT
┌─────────────────────────────────────────┐
│ Matrix Entries: ${matrixReport.totalEntries.toString().padEnd(25)} │
│ Audit Entries: ${auditReport.totalEntries.toString().padEnd(25)} │
│ Avg Processing Time: ${auditReport.averageProcessingTime.toFixed(2)}ms       │
│ Violations Detected: ${matrixReport.violations.length.toString().padEnd(21)} │
│ Success Rate: ${(matrixReport.performanceMetrics.successRate * 100).toFixed(1)}%               │
└─────────────────────────────────────────┘
`);
  
  if (matrixReport.violations.length > 0) {
    console.log('\n🚨 SECURITY VIOLATIONS:');
    matrixReport.violations.forEach(violation => {
      const icon = violation.severity === 'critical' ? '🔴' : 
                   violation.severity === 'high' ? '🟠' : 
                   violation.severity === 'medium' ? '🟡' : '🟢';
      console.log(`   ${icon} ${violation.package}@${violation.version}: ${violation.violation}`);
    });
  }
  
  // Performance metrics
  console.log('\n📈 PERFORMANCE METRICS:');
  console.log(`   • Average Processing Time: ${matrixReport.performanceMetrics.avgProcessingTime.toFixed(2)}ms`);
  console.log(`   • Average Tarball Size: ${formatBytes(matrixReport.performanceMetrics.avgTarballSize)}`);
  console.log(`   • Average Compression: ${matrixReport.performanceMetrics.avgCompressionRatio.toFixed(1)}%`);
  console.log(`   • Total Processed: ${matrixReport.performanceMetrics.totalProcessed}`);
  
  // Integrity score distribution
  if (matrixReport.integrityScores.length > 0) {
    const avgScore = matrixReport.integrityScores.reduce((a, b) => a + b, 0) / matrixReport.integrityScores.length;
    const minScore = Math.min(...matrixReport.integrityScores);
    const maxScore = Math.max(...matrixReport.integrityScores);
    
    console.log('\n🛡️  INTEGRITY SCORE DISTRIBUTION:');
    console.log(`   • Average: ${(avgScore * 100).toFixed(1)}%`);
    console.log(`   • Minimum: ${(minScore * 100).toFixed(1)}%`);
    console.log(`   • Maximum: ${(maxScore * 100).toFixed(1)}%`);
    
    // Score ranges
    const excellent = matrixReport.integrityScores.filter(s => s >= 0.99).length;
    const good = matrixReport.integrityScores.filter(s => s >= 0.95 && s < 0.99).length;
    const fair = matrixReport.integrityScores.filter(s => s >= 0.9 && s < 0.95).length;
    const poor = matrixReport.integrityScores.filter(s => s < 0.9).length;
    
    console.log('\n   SCORE RANGES:');
    console.log(`   • Excellent (≥99%): ${excellent} packages`);
    console.log(`   • Good (95-99%): ${good} packages`);
    console.log(`   • Fair (90-95%): ${fair} packages`);
    console.log(`   • Poor (<90%): ${poor} packages`);
  }
  
  return {
    matrixReport,
    auditReport,
    generatedAt: new Date().toISOString()
  };
}

async function queryAuditEntry(entryId: string) {
  console.log(`🔍 Querying audit entry: ${entryId}`);
  
  const auditLog = new QuantumResistantSecureDataRepository();
  const entry = await auditLog.retrieveAuditEntry(entryId);
  
  if (!entry) {
    console.log('❌ Audit entry not found');
    return null;
  }
  
  console.log(`
📋 AUDIT ENTRY DETAILS
┌─────────────────────────────────────────┐
│ Event: ${entry.event.padEnd(33)} │
│ Package: ${entry.packageName.padEnd(31)} │
│ Version: ${entry.packageVersion.padEnd(31)} │
│ Integrity Score: ${(entry.integrityScore * 100).toFixed(1)}%             │
│ Anomaly Score: ${entry.anomalyScore.toFixed(4)}              │
│ Processing Time: ${entry.processingTime.toFixed(2)}ms           │
│ Timestamp: ${new Date(Number(entry.timestamp)).toISOString().padEnd(25)} │
└─────────────────────────────────────────┘
`);
  
  if (entry.lifecycleScripts.length > 0) {
    console.log('\n🔧 LIFECYCLE SCRIPTS:');
    entry.lifecycleScripts.forEach(script => {
      console.log(`   • ${script}`);
    });
  }
  
  console.log(`\n🔐 HASHES:`);
  console.log(`   • Original: ${entry.originalHash}`);
  console.log(`   • Final: ${entry.finalHash}`);
  console.log(`   • Seal: ${entry.seal.length} bytes`);
  
  return entry;
}

async function auditMatrix() {
  console.log('🔍 Auditing Col 93 Matrix...');
  
  const stats = await BUN_DOC_MAP.getMatrixStats();
  
  console.log(`
📊 COL 93 MATRIX AUDIT
┌─────────────────────────────────────────┐
│ Total Entries: ${stats.totalEntries.toString().padEnd(27)} │
│ Average Integrity: ${(stats.averageIntegrityScore * 100).toFixed(1)}%               │
│ High Threat Entries: ${stats.highThreatEntries.toString().padEnd(21)} │
│ Matrix Size: ${formatBytes(stats.matrixSize)}            │
│ Last Updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'Never'.padEnd(23)} │
└─────────────────────────────────────────┘
`);
  
  if (stats.highThreatEntries > 0) {
    console.log(`\n⚠️  ${stats.highThreatEntries} high threat entries detected`);
    console.log('   Run with --report for detailed violation information');
  }
  
  return stats;
}

async function showAuditStatus() {
  console.log('🔍 Audit System Status');
  
  const auditLog = new QuantumResistantSecureDataRepository();
  const workerStats = auditLog.getWorkerStats();
  const matrixStats = await BUN_DOC_MAP.getMatrixStats();
  
  console.log(`
🔧 SYSTEM STATUS
┌─────────────────────────────────────────┐
│ Worker Pool: ${workerStats.workers.toString().padEnd(29)} │
│ Queue Size: ${workerStats.queueSize.toString().padEnd(29)} │
│ Avg Latency: ${workerStats.avgLatency.toFixed(2)}ms              │
│ Matrix Entries: ${matrixStats.totalEntries.toString().padEnd(25)} │
│ Audit Storage: ${getStorageStatus()}            │
└─────────────────────────────────────────┘
`);
  
  console.log('\n🔍 QUICK STATS:');
  console.log(`   • Total packages processed: ${matrixStats.totalEntries}`);
  console.log(`   • Average integrity score: ${(matrixStats.averageIntegrityScore * 100).toFixed(1)}%`);
  console.log(`   • High threat packages: ${matrixStats.highThreatEntries}`);
  
  console.log('\n💡 AVAILABLE COMMANDS:');
  console.log('   • bun-pm-audit --report           Generate full report');
  console.log('   • bun-pm-audit --matrix           Audit matrix only');
  console.log('   • bun-pm-audit --query <id>       Query specific entry');
  console.log('   • bun-pm-audit --time-range <start>,<end>  Time-based report');
}

function parseAuditArgs(args: string[]) {
  const options: any = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--report':
      case '-r':
        options.report = true;
        break;
        
      case '--query':
      case '-q':
        options.query = args[++i];
        break;
        
      case '--matrix':
      case '-m':
        options.matrix = true;
        break;
        
      case '--time-range':
        const range = args[++i];
        if (range && range.includes(',')) {
          const [start, end] = range.split(',');
          options.timeRange = {
            start: parseInt(start),
            end: parseInt(end)
          };
        }
        break;
        
      case '--help':
      case '-h':
        displayAuditHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

function displayAuditHelp() {
  console.log(`
🔍 BUN PM AUDIT CLI - TIER-1380

USAGE:
  bun-pm-audit [options]

OPTIONS:
  --report, -r                 Generate comprehensive audit report
  --query, -q <id>             Query specific audit entry
  --matrix, -m                 Audit Col 93 Matrix only
  --time-range <start>,<end>   Report for specific time range
  --help, -h                   Show this help message

EXAMPLES:
  bun-pm-audit                                    # Show system status
  bun-pm-audit --report                          # Generate full report
  bun-pm-audit --query audit_12345678_1234567890 # Query specific entry
  bun-pm-audit --matrix                          # Audit matrix only
  bun-pm-audit --time-range 1640995200,1641081600 # Report for date range

AUDIT FEATURES:
  • Quantum-resistant audit trails
  • Real-time violation detection
  • Performance metrics tracking
  • Col 93 Matrix validation
  • Threat intelligence integration

For more information, visit: https://bun.sh/docs/pm/audit
`);
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function getStorageStatus(): string {
  try {
    const auditDir = `${process.env.HOME}/.bun-integrity-audit`;
    const stats = Bun.file(auditDir);
    return stats.exists ? 'Available' : 'Not Available';
  } catch {
    return 'Error';
  }
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  auditCommand(args).catch(error => {
    console.error('💥 Audit CLI Error:', error);
    process.exit(1);
  });
}

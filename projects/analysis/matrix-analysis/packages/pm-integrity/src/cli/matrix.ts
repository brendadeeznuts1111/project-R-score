import { BUN_DOC_MAP } from '../col93-matrix.js';

export async function matrixCommand(args: string[]) {
  const options = parseMatrixArgs(args);
  
  if (options.search) {
    return await searchMatrix(options);
  }
  
  if (options.export) {
    return await exportMatrix(options);
  }
  
  if (options.stats) {
    return await showMatrixStats();
  }
  
  if (options.clear) {
    return await clearMatrix();
  }
  
  if (options.query) {
    return await queryMatrix(options.query);
  }
  
  // Default: show matrix overview
  return await showMatrixOverview();
}

async function showMatrixOverview() {
  console.log('🌐 Col 93 Matrix Overview');
  
  const report = await BUN_DOC_MAP.generateReport();
  const stats = await BUN_DOC_MAP.getMatrixStats();
  
  console.log(`
📊 MATRIX OVERVIEW
┌─────────────────────────────────────────┐
│ Total Entries: ${report.totalEntries.toString().padEnd(27)} │
│ Average Score: ${(report.averageScore * 100).toFixed(1)}%               │
│ Violations: ${report.violations.length.toString().padEnd(31)} │
│ Success Rate: ${(report.performanceMetrics.successRate * 100).toFixed(1)}%               │
│ Last Updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'Never'.padEnd(23)} │
│ Matrix Size: ${formatBytes(stats.matrixSize)}            │
└─────────────────────────────────────────┘
`);
  
  if (report.totalEntries > 0) {
    console.log('\n🔍 RECENT ENTRIES:');
    const recentEntries = await BUN_DOC_MAP.searchMatrix({});
    const sorted = recentEntries
      .sort((a, b) => new Date(b.lastVerified).getTime() - new Date(a.lastVerified).getTime())
      .slice(0, 5);
    
    sorted.forEach(entry => {
      const icon = entry.integrityScore >= 0.99 ? '🟢' : 
                   entry.integrityScore >= 0.95 ? '🟡' : 
                   entry.integrityScore >= 0.9 ? '🟠' : '🔴';
      const date = new Date(entry.lastVerified).toLocaleDateString();
      console.log(`   ${icon} ${entry.term} - ${(entry.integrityScore * 100).toFixed(1)}% - ${date}`);
    });
  }
  
  if (report.violations.length > 0) {
    console.log(`\n⚠️  ${report.violations.length} violations detected`);
    console.log('   Run --search threatLevel=HIGH to see high-threat entries');
  }
  
  return { report, stats };
}

async function searchMatrix(options: any) {
  console.log(`🔍 Searching matrix with criteria:`, options.search);
  
  const searchQuery = parseSearchQuery(options.search);
  const results = await BUN_DOC_MAP.searchMatrix(searchQuery);
  
  console.log(`
📊 SEARCH RESULTS
┌─────────────────────────────────────────┐
│ Query: ${options.search.padEnd(35)} │
│ Results: ${results.length.toString().padEnd(31)} │
└─────────────────────────────────────────┘
`);
  
  if (results.length === 0) {
    console.log('No entries found matching the search criteria.');
    return [];
  }
  
  console.log('\n🔍 MATCHING ENTRIES:');
  results.forEach(entry => {
    const icon = entry.integrityScore >= 0.99 ? '🟢' : 
                 entry.integrityScore >= 0.95 ? '🟡' : 
                 entry.integrityScore >= 0.9 ? '🟠' : '🔴';
    
    console.log(`   ${icon} ${entry.term}@${entry.minVer}`);
    console.log(`      Integrity: ${(entry.integrityScore * 100).toFixed(1)}%`);
    console.log(`      Security: ${entry.securityProfile}`);
    console.log(`      Last Verified: ${new Date(entry.lastVerified).toLocaleDateString()}`);
    console.log('');
  });
  
  return results;
}

async function exportMatrix(options: any) {
  const format = options.format || 'json';
  console.log(`📤 Exporting matrix in ${format.toUpperCase()} format...`);
  
  try {
    const exportData = await BUN_DOC_MAP.exportMatrix(format as 'json' | 'csv' | 'xml');
    const filename = `bun-integrity-matrix-${Date.now()}.${format}`;
    
    await Bun.write(filename, exportData);
    
    console.log(`✅ Matrix exported to: ${filename}`);
    console.log(`📊 File size: ${formatBytes(exportData.length)}`);
    
    return { filename, size: exportData.length, format };
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

async function showMatrixStats() {
  console.log('📊 Detailed Matrix Statistics');
  
  const stats = await BUN_DOC_MAP.getMatrixStats();
  const report = await BUN_DOC_MAP.generateReport();
  
  console.log(`
📈 MATRIX STATISTICS
┌─────────────────────────────────────────┐
│ Total Entries: ${stats.totalEntries.toString().padEnd(27)} │
│ Average Integrity: ${(stats.averageIntegrityScore * 100).toFixed(1)}%               │
│ High Threat: ${stats.highThreatEntries.toString().padEnd(29)} │
│ Matrix Size: ${formatBytes(stats.matrixSize)}            │
│ Last Updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'.padEnd(23)} │
└─────────────────────────────────────────┘
`);
  
  // Integrity score distribution
  if (report.integrityScores.length > 0) {
    const distribution = calculateScoreDistribution(report.integrityScores);
    
    console.log('\n📊 INTEGRITY DISTRIBUTION:');
    Object.entries(distribution).forEach(([range, count]) => {
      const percentage = (count / report.integrityScores.length * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / report.integrityScores.length * 20));
      console.log(`   ${range}: ${count.toString().padEnd(4)} (${percentage}%) ${bar}`);
    });
  }
  
  // Performance metrics
  console.log('\n⚡ PERFORMANCE METRICS:');
  console.log(`   • Avg Processing Time: ${report.performanceMetrics.avgProcessingTime.toFixed(2)}ms`);
  console.log(`   • Avg Tarball Size: ${formatBytes(report.performanceMetrics.avgTarballSize)}`);
  console.log(`   • Avg Compression: ${report.performanceMetrics.avgCompressionRatio.toFixed(1)}%`);
  console.log(`   • Total Processed: ${report.performanceMetrics.totalProcessed}`);
  console.log(`   • Success Rate: ${(report.performanceMetrics.successRate * 100).toFixed(1)}%`);
  
  // Security profile breakdown
  const entries = await BUN_DOC_MAP.searchMatrix({});
  const profileBreakdown = entries.reduce((acc, entry) => {
    acc[entry.securityProfile] = (acc[entry.securityProfile] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n🛡️  SECURITY PROFILE BREAKDOWN:');
  Object.entries(profileBreakdown).forEach(([profile, count]) => {
    const percentage = (count / entries.length * 100).toFixed(1);
    console.log(`   • ${profile}: ${count} (${percentage}%)`);
  });
  
  return { stats, report, distribution: report.integrityScores.length > 0 ? calculateScoreDistribution(report.integrityScores) : {} };
}

async function clearMatrix() {
  console.log('⚠️  WARNING: This will clear the entire Col 93 Matrix');
  console.log('   All audit data will be lost except for backups');
  
  // In a real CLI, you'd want to prompt for confirmation
  console.log('   Run with --confirm to proceed');
  
  if (process.argv.includes('--confirm')) {
    await BUN_DOC_MAP.clearMatrix();
    console.log('✅ Matrix cleared successfully');
    console.log('   Backup saved to bun_pm_pack.backup.json');
  } else {
    console.log('   Operation cancelled. Use --confirm to proceed.');
  }
}

async function queryMatrix(term: string) {
  console.log(`🔍 Querying matrix for term: ${term}`);
  
  const entry = await BUN_DOC_MAP.query(term);
  
  if (!entry) {
    console.log('❌ No entry found for this term');
    return null;
  }
  
  console.log(`
📋 MATRIX ENTRY DETAILS
┌─────────────────────────────────────────┐
│ Term: ${entry.term.padEnd(35)} │
│ Min Version: ${entry.minVer.padEnd(29)} │
│ Integrity Score: ${(entry.integrityScore * 100).toFixed(1)}%             │
│ Security Profile: ${entry.securityProfile.padEnd(23)} │
│ Tarball Integrity: ${entry.tarballIntegrity.padEnd(19)} │
│ Last Verified: ${new Date(entry.lastVerified).toLocaleDateString().padEnd(23)} │
└─────────────────────────────────────────┘
`);
  
  console.log('\n🔧 LIFECYCLE SCRIPTS:');
  entry.lifecycleScripts.forEach(script => {
    console.log(`   • ${script}`);
  });
  
  console.log('\n🛡️  SECURITY FEATURES:');
  console.log(`   • Quantum Seal: ${entry.quantumSeal ? '✅' : '❌'}`);
  console.log(`   • Mutation Guarded: ${entry.mutationGuarded ? '✅' : '❌'}`);
  console.log(`   • Audit Trail: ${entry.auditTrail ? '✅' : '❌'}`);
  console.log(`   • Zero Trust: ${entry.zeroTrust ? '✅' : '❌'}`);
  
  console.log(`\n📊 PERFORMANCE:`);
  console.log(`   • Performance Arb: ${entry.performanceArb}`);
  console.log(`   • Compression Ratio: ${entry.compressionRatio}`);
  
  return entry;
}

function parseMatrixArgs(args: string[]) {
  const options: any = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--search':
      case '-s':
        options.search = args[++i];
        break;
        
      case '--export':
      case '-e':
        options.export = true;
        break;
        
      case '--format':
      case '-f':
        options.format = args[++i];
        break;
        
      case '--stats':
        options.stats = true;
        break;
        
      case '--clear':
        options.clear = true;
        break;
        
      case '--query':
      case '-q':
        options.query = args[++i];
        break;
        
      case '--help':
      case '-h':
        displayMatrixHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

function parseSearchQuery(query: string): any {
  const result: any = {};
  
  if (query.includes('term=')) {
    result.term = query.match(/term=([^&]+)/)?.[1];
  }
  
  if (query.includes('minIntegrityScore=')) {
    result.minIntegrityScore = parseFloat(query.match(/minIntegrityScore=([^&]+)/)?.[1] || '0');
  }
  
  if (query.includes('securityProfile=')) {
    result.securityProfile = query.match(/securityProfile=([^&]+)/)?.[1];
  }
  
  if (query.includes('threatLevel=')) {
    result.threatLevel = query.match(/threatLevel=([^&]+)/)?.[1] as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }
  
  // If no structured query, treat as term search
  if (Object.keys(result).length === 0) {
    result.term = query;
  }
  
  return result;
}

function calculateScoreDistribution(scores: number[]): Record<string, number> {
  const distribution = {
    'Excellent (≥99%)': 0,
    'Good (95-99%)': 0,
    'Fair (90-95%)': 0,
    'Poor (<90%)': 0
  };
  
  scores.forEach(score => {
    if (score >= 0.99) distribution['Excellent (≥99%)']++;
    else if (score >= 0.95) distribution['Good (95-99%)']++;
    else if (score >= 0.9) distribution['Fair (90-95%)']++;
    else distribution['Poor (<90%)']++;
  });
  
  return distribution;
}

function displayMatrixHelp() {
  console.log(`
🌐 BUN PM MATRIX CLI - COL 93

USAGE:
  bun-pm-matrix [options]

OPTIONS:
  --search, -s <query>        Search matrix entries
  --export, -e                Export matrix data
  --format, -f <format>       Export format: json, csv, xml
  --stats                     Show detailed statistics
  --clear                     Clear matrix (use --confirm)
  --query, -q <term>          Query specific term
  --help, -h                  Show this help message

SEARCH QUERY EXAMPLES:
  term=pm pack                Search by term
  minIntegrityScore=0.95      Minimum integrity score
  securityProfile=High        Security profile filter
  threatLevel=HIGH            Threat level filter

EXAMPLES:
  bun-pm-matrix                               # Show overview
  bun-pm-matrix --search "term=pm pack"      # Search entries
  bun-pm-matrix --export --format csv        # Export as CSV
  bun-pm-matrix --stats                      # Show statistics
  bun-pm-matrix --query "pm pack"            # Query specific term

MATRIX FEATURES:
  • 12-dimensional integrity tracking
  • Real-time threat level assessment
  • Performance metrics collection
  • Quantum seal verification
  • Export in multiple formats

For more information, visit: https://bun.sh/docs/pm/matrix
`);
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  matrixCommand(args).catch(error => {
    console.error('💥 Matrix CLI Error:', error);
    process.exit(1);
  });
}

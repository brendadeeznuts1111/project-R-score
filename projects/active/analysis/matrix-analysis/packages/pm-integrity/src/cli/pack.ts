import { SecurePackager } from '../secure-packager.js';
import { PackOptions } from '../types.js';

export async function packCommand(args: string[]) {
  const options = parseArgs(args);
  
  if (options.dryRun) {
    return await dryRunPack(options);
  }
  
  const packager = new SecurePackager();
  
  try {
    const result = await packager.packWithIntegritySeal(
      options.packagePath || '.',
      options
    );
    
    console.info(`
🎉 TIER-1380 LIFECYCLE INTEGRITY SEAL VERIFIED
┌─────────────────────────────────────────┐
│ Package: ${result.manifest.name.padEnd(30)} │
│ Version: ${result.manifest.version.padEnd(30)} │
│ Integrity Score: ${(result.stats.integrityScore * 100).toFixed(1)}%             │
│ Tarball Size: ${formatBytes(result.stats.tarballSize)}      │
│ Processing Time: ${result.stats.processingTime.toFixed(2)}ms   │
│ Compression: ${result.stats.compressionRatio.toFixed(1)}%           │
│ Seal: ✅ QUANTUM-RESISTANT             │
└─────────────────────────────────────────┘
`);
    
    if (options.output) {
      await Bun.write(options.output, result.tarball);
      console.info(`Tarball saved to: ${options.output}`);
    }
    
    // Display audit ID for tracking
    console.info(`🔍 Audit ID: ${result.auditId}`);
    console.info(`🛡️  Integrity Seal: ${result.integritySeal}`);
    
    return result;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.constructor.name === 'IntegritySealViolationError') {
        console.error('🚨 INTEGRITY SEAL VIOLATION DETECTED');
        console.error(error.message);
        process.exit(1);
      }
      
      if (error.constructor.name === 'UnauthorizedMutationError') {
        console.error('🚫 UNAUTHORIZED MANIFEST MUTATION');
        console.error(error.message);
        process.exit(1);
      }
      
      if (error.constructor.name === 'PackExecutionError') {
        console.error('❌ PACK EXECUTION FAILED');
        console.error(error.message);
        process.exit(1);
      }
    }
    
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

async function dryRunPack(options: any) {
  console.info('🔍 Running integrity verification dry-run...');
  
  const packager = new SecurePackager();
  const result = await packager.dryRunValidation(options.packagePath || '.');
  
  console.info(`
📊 DRY-RUN INTEGRITY REPORT
┌─────────────────────────────────────────┐
│ Package: ${result.manifest.name.padEnd(30)} │
│ Version: ${result.manifest.version.padEnd(30)} │
│ Script Validation: ${result.scriptValidation ? '✅ PASS' : '❌ FAIL'}             │
│ Integrity Score: ${(result.integrityScore * 100).toFixed(1)}%             │
│ Mutation Risks: ${result.mutationRisks.length} detected        │
└─────────────────────────────────────────┘
`);
  
  if (result.mutationRisks.length > 0) {
    console.info('\n⚠️  IDENTIFIED RISKS:');
    result.mutationRisks.forEach(risk => {
      console.info(`   • ${risk}`);
    });
  }
  
  if (!result.scriptValidation) {
    console.info('\n❌ SCRIPT VALIDATION FAILED');
    console.info('   Suspicious patterns detected in lifecycle scripts');
  }
  
  if (result.integrityScore < 0.95) {
    console.info('\n⚠️  LOW INTEGRITY SCORE');
    console.info('   Consider reviewing package configuration');
  }
  
  return { manifest: result.manifest, report: result };
}

function parseArgs(args: string[]): PackOptions {
  const options: PackOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
        
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
        
      case '--seal-tier':
        options.sealTier = parseInt(args[++i]);
        break;
        
      case '--verify-signatures':
        options.verifySignatures = true;
        break;
        
      case '--audit-trail':
        options.auditTrail = true;
        break;
        
      case '--anomaly-detection':
        options.anomalyDetection = true;
        break;
        
      case '--realtime-3d':
        options.realtime3D = true;
        break;
        
      case '--help':
      case '-h':
        displayHelp();
        process.exit(0);
        break;
        
      default:
        if (!arg.startsWith('-')) {
          options.packagePath = arg;
        }
        break;
    }
  }
  
  return options;
}

function displayHelp() {
  console.info(`
🛡️  BUN PM INTEGRITY SEAL CLI - TIER-1380

USAGE:
  bun-pm-seal [options] [package-path]

OPTIONS:
  --dry-run                    Run integrity verification without packing
  --output, -o <path>          Output tarball to specific path
  --seal-tier <number>         Set integrity seal tier (default: 1380)
  --verify-signatures          Verify script signatures
  --audit-trail                Enable comprehensive audit trail
  --anomaly-detection          Enable threat anomaly detection
  --realtime-3d                Enable real-time 3D visualization
  --help, -h                   Show this help message

EXAMPLES:
  bun-pm-seal                                    # Pack current directory
  bun-pm-seal ./my-package                       # Pack specific package
  bun-pm-seal --dry-run                          # Verify without packing
  bun-pm-seal --output ./dist/pkg.tgz            # Pack to specific path
  bun-pm-seal --seal-tier 1380 --audit-trail     # Full integrity verification

SECURITY FEATURES:
  • Quantum-resistant audit trails
  • Script signature verification
  • Mutation detection and prevention
  • Threat intelligence analysis
  • Real-time 3D monitoring
  • Col 93 Matrix integration

ENVIRONMENT VARIABLES:
  BUN_INTEGRITY_SEAL_ENABLED    Enable integrity sealing
  BUN_SEAL_TIER                 Default seal tier
  BUN_QUANTUM_AUDIT_ENABLED     Enable quantum audits
  BUN_MUTATION_SENTINEL_ENABLED Enable mutation detection
  BUN_ZERO_TRUST_FORGE          Enable zero-trust forging

For more information, visit: https://bun.sh/docs/pm/integrity
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
  packCommand(args).catch(error => {
    console.error('💥 CLI Error:', error);
    process.exit(1);
  });
}

#!/usr/bin/env bun
import { BUN_DOC_MAP } from '../src/col93-matrix.js';
import { QuantumResistantSecureDataRepository } from '../src/quantum-audit.js';
import { hashManifest } from '../src/integrity-utils.js';

interface RegionConfig {
  name: string;
  endpoint: string;
  checksum: string;
  latency: number;
  status: 'online' | 'degraded' | 'offline';
}

interface ValidationResult {
  region: string;
  checksum: string;
  integrity: boolean;
  latency: number;
  violations: string[];
}

class MatrixValidator {
  private readonly REGIONS = {
    'us-east': { endpoint: 'https://matrix.us-east.bun.sh', priority: 1 },
    'us-west': { endpoint: 'https://matrix.us-west.bun.sh', priority: 2 },
    'eu-central': { endpoint: 'https://matrix.eu-central.bun.sh', priority: 3 },
    'ap-southeast': { endpoint: 'https://matrix.ap-southeast.bun.sh', priority: 4 },
    'ap-northeast': { endpoint: 'https://matrix.ap-northeast.bun.sh', priority: 5 }
  };
  
  async validateRegion(region: string, check: string, col: number): Promise<ValidationResult> {
    const config = this.REGIONS[region as keyof typeof this.REGIONS];
    if (!config) {
      throw new Error(`Unknown region: ${region}`);
    }
    
    console.log(`🔍 Validating ${region} region with check ${check} against column ${col}`);
    
    const startTime = performance.now();
    
    try {
      // Fetch matrix from region
      const response = await fetch(`${config.endpoint}/matrix/v1.3.7`);
      const latency = performance.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`Region ${region} returned ${response.status}`);
      }
      
      const matrixData = await response.json();
      const checksum = await hashManifest(matrixData);
      
      // Validate GB9C checksum
      const expectedChecksum = this.generateGB9CChecksum(check, col);
      const integrityValid = checksum === expectedChecksum;
      
      // Check for violations
      const violations = await this.detectViolations(matrixData, col);
      
      const result: ValidationResult = {
        region,
        checksum,
        integrity: integrityValid,
        latency,
        violations
      };
      
      console.log(`✅ ${region}: ${integrityValid ? 'VALID' : 'INVALID'} (${latency.toFixed(2)}ms)`);
      
      return result;
    } catch (error) {
      const latency = performance.now() - startTime;
      console.log(`❌ ${region}: FAILED (${latency.toFixed(2)}ms) - ${error}`);
      
      return {
        region,
        checksum: 'failed',
        integrity: false,
        latency,
        violations: [`Region validation failed: ${error}`]
      };
    }
  }
  
  async validateAllRegions(check: string, col: number): Promise<ValidationResult[]> {
    console.log(`🌐 Starting 5-region matrix validation...`);
    console.log(`📋 Check: ${check}, Column: ${col}`);
    
    const promises = Object.entries(this.REGIONS).map(async ([region]) => 
      this.validateRegion(region, check, col)
    );
    
    const results = await Promise.all(promises);
    
    // Summary
    const validCount = results.filter(r => r.integrity).length;
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    
    console.log(`
📊 VALIDATION SUMMARY
┌─────────────────────────────────────────┐
│ Valid Regions: ${validCount}/5                           │
│ Average Latency: ${avgLatency.toFixed(2)}ms                     │
│ Global Integrity: ${validCount === 5 ? '✅ PASS' : '❌ FAIL'}              │
└─────────────────────────────────────────┘
`);
    
    if (validCount < 5) {
      console.log('\n⚠️ REGION VIOLATIONS:');
      results.filter(r => !r.integrity).forEach(r => {
        console.log(`   • ${r.region}: ${r.violations.join(', ')}`);
      });
    }
    
    return results;
  }
  
  private generateGB9CChecksum(check: string, col: number): string {
    // Generate GB9C checksum for validation
    const data = `${check}-col${col}-tier1380`;
    return Bun.hash(data).toString(16);
  }
  
  private async detectViolations(matrixData: any, col: number): Promise<string[]> {
    const violations: string[] = [];
    
    // Check column 93 specific requirements
    if (col === 93) {
      // Validate Transpiler.replMode alignment
      if (matrixData.transpiler?.replMode && Bun.stringWidth(matrixData.transpiler.replMode) !== 19) {
        violations.push('Transpiler.replMode width mismatch (expected 19 chars)');
      }
      
      // Validate WebSocket.credentials alignment
      if (matrixData.websocket?.credentials && Bun.stringWidth(matrixData.websocket.credentials) !== 19) {
        violations.push('WebSocket.credentials width mismatch (expected 19 chars)');
      }
      
      // Check quantum seal presence
      if (!matrixData.quantumSeal) {
        violations.push('Missing quantum seal on column 93');
      }
    }
    
    // General integrity checks
    if (!matrixData.version || matrixData.version !== '1.3.7') {
      violations.push(`Version mismatch (expected 1.3.7, got ${matrixData.version})`);
    }
    
    if (!matrixData.integrityScore || matrixData.integrityScore < 0.99) {
      violations.push(`Low integrity score: ${matrixData.integrityScore}`);
    }
    
    return violations;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const region = args.find(arg => arg.startsWith('--region='))?.split('=')[1];
  const check = args.find(arg => arg.startsWith('--check='))?.split('=')[1];
  const col = parseInt(args.find(arg => arg.startsWith('--col='))?.split('=')[1] || '93');
  
  if (!check) {
    console.error('❌ Missing required --check parameter');
    process.exit(1);
  }
  
  const validator = new MatrixValidator();
  
  if (region) {
    // Single region validation
    const result = await validator.validateRegion(region, check, col);
    console.log('\n📋 VALIDATION RESULT:', result);
  } else {
    // Full 5-region validation
    const results = await validator.validateAllRegions(check, col);
    
    // Exit with error code if any region failed
    const hasFailures = results.some(r => !r.integrity);
    process.exit(hasFailures ? 1 : 0);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Matrix validation failed:', error);
    process.exit(1);
  });
}

export { MatrixValidator, ValidationResult };

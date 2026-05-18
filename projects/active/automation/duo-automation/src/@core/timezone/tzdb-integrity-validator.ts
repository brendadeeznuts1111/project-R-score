#!/usr/bin/env bun

/**
 * Timezone Database Integrity Validation System
 * 
 * Incorporates tzdb integrity verification with canonical zone validation
 * and integrates with the Enhanced CLI system for production monitoring.
 */

import { spawn } from 'bun';

interface TzdbValidationResult {
  zone: string;
  isValid: boolean;
  canonicalZones: string[];
  linkTargets: string[];
  integrityCheck: 'PASS' | 'FAIL' | 'WARNING';
  timestamp: string;
  server?: string;
}

interface TzdbIntegrityReport {
  totalZones: number;
  validZones: number;
  invalidZones: number;
  canonicalZoneCount: number;
  linkZoneCount: number;
  integrityStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  recommendations: string[];
  validationResults: TzdbValidationResult[];
}

class TzdbIntegrityValidator {
  private readonly canonicalZones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
    'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'
  ];

  private readonly criticalZones = [
    'Etc/UTC', 'Etc/GMT', 'UTC', 'GMT'
  ];

  /**
   * Run tzdata-zdump validation on a specific zone
   */
  async validateZone(zone: string, server?: string): Promise<TzdbValidationResult> {
    const timestamp = new Date().toISOString();
    
    try {
      // Run tzdata-zdump command
      const cmd = ['tzdata-zdump', '-v', zone];
      let result: any;
      
      if (server) {
        // Run on remote server via SSH
        result = await this.runRemoteCommand(server, cmd);
      } else {
        // Run locally
        result = await this.runLocalCommand(cmd);
      }
      
      const output = result.stdout.toString();
      const lines = output.split('\n').filter(line => line.trim());
      
      // Parse output for canonical zones and links
      const canonicalZones: string[] = [];
      const linkTargets: string[] = [];
      let isValid = true;
      let integrityCheck: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
      
      for (const line of lines) {
        // Look for canonical zones (should not appear in LINK column)
        if (line.includes('UTC') || this.canonicalZones.some(cz => line.includes(cz))) {
          // Check if this canonical zone appears as a LINK (bad sign)
          if (line.includes('LINK')) {
            isValid = false;
            integrityCheck = 'FAIL';
            linkTargets.push(zone);
          } else {
            canonicalZones.push(zone);
          }
        }
        
        // Look for LINK entries
        if (line.includes('LINK')) {
          const parts = line.split(/\s+/);
          const linkZone = parts[parts.length - 1];
          linkTargets.push(linkZone);
        }
      }
      
      return {
        zone,
        isValid,
        canonicalZones,
        linkTargets,
        integrityCheck,
        timestamp,
        server
      };
      
    } catch (error) {
      return {
        zone,
        isValid: false,
        canonicalZones: [],
        linkTargets: [],
        integrityCheck: 'FAIL',
        timestamp,
        server,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate all critical zones
   */
  async validateCriticalZones(servers?: string[]): Promise<TzdbIntegrityReport> {
    const validationResults: TzdbValidationResult[] = [];
    
    for (const zone of this.criticalZones) {
      if (servers && servers.length > 0) {
        // Validate on each server
        for (const server of servers) {
          const result = await this.validateZone(zone, server);
          validationResults.push(result);
        }
      } else {
        // Local validation
        const result = await this.validateZone(zone);
        validationResults.push(result);
      }
    }
    
    return this.generateIntegrityReport(validationResults);
  }

  /**
   * Generate comprehensive integrity report
   */
  private generateIntegrityReport(results: TzdbValidationResult[]): TzdbIntegrityReport {
    const validZones = results.filter(r => r.isValid).length;
    const invalidZones = results.length - validZones;
    const canonicalZoneCount = results.reduce((sum, r) => sum + r.canonicalZones.length, 0);
    const linkZoneCount = results.reduce((sum, r) => sum + r.linkTargets.length, 0);
    
    let integrityStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    const recommendations: string[] = [];
    
    if (invalidZones > 0) {
      integrityStatus = 'CRITICAL';
      recommendations.push('Immediate tzdata update required');
      recommendations.push('Verify system package management');
      recommendations.push('Check for corrupted timezone data');
    } else if (linkZoneCount > 0) {
      integrityStatus = 'DEGRADED';
      recommendations.push('Schedule tzdata update at next maintenance window');
      recommendations.push('Monitor for timezone-related issues');
    }
    
    if (canonicalZoneCount === 0) {
      recommendations.push('No canonical zones detected - system may be misconfigured');
    }
    
    // Add monthly validation recommendation
    recommendations.push('Run monthly: tzdata-zdump -v Etc/UTC | head');
    recommendations.push('Monitor canonical zones in LINK column (should never appear)');
    
    return {
      totalZones: results.length,
      validZones,
      invalidZones,
      canonicalZoneCount,
      linkZoneCount,
      integrityStatus,
      recommendations,
      validationResults: results
    };
  }

  /**
   * Run command locally
   */
  private async runLocalCommand(cmd: string[]): Promise<{ stdout: Buffer; stderr: Buffer }> {
    const proc = spawn({
      cmd,
      stdout: 'pipe',
      stderr: 'pipe'
    });
    
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text()
    ]);
    
    if (proc.exitCode !== 0) {
      throw new Error(`Command failed: ${stderr}`);
    }
    
    return { 
      stdout: Buffer.from(stdout), 
      stderr: Buffer.from(stderr) 
    };
  }

  /**
   * Run command on remote server via SSH
   */
  private async runRemoteCommand(server: string, cmd: string[]): Promise<{ stdout: Buffer; stderr: Buffer }> {
    const sshCmd = ['ssh', server, ...cmd];
    return this.runLocalCommand(sshCmd);
  }

  /**
   * Get monthly validation command for production monitoring
   */
  getMonthlyValidationCommand(): string {
    return 'tzdata-zdump -v Etc/UTC | head';
  }

  /**
   * Get validation script for cron/automation
   */
  getValidationScript(): string {
    return `#!/bin/bash
# Monthly TZDB Integrity Validation
# Add to cron: 0 0 1 * * /path/to/this/script.sh

echo "🕐 TZDB Integrity Validation - $(date)"
echo "=========================================="

# Check critical zones
for zone in Etc/UTC Etc/GMT UTC GMT; do
    echo "Checking $zone..."
    result=$(tzdata-zdump -v $zone | head -5)
    
    if echo "$result" | grep -q "LINK.*$zone"; then
        echo "❌ CRITICAL: Canonical zone $zone found in LINK column"
        exit 1
    else
        echo "✅ OK: $zone properly configured"
    fi
done

echo ""
echo "✅ All critical zones validated"
echo "💡 Pro Tip: Canonical zones should never appear in LINK column"
`;
  }
}

// Export for integration with Enhanced CLI
export { TzdbIntegrityValidator, TzdbValidationResult, TzdbIntegrityReport };

// CLI Integration
async function runTzdbValidation() {
  console.info('🕐 Timezone Database Integrity Validation');
  console.info('==========================================\n');
  
  const validator = new TzdbIntegrityValidator();
  
  console.info('📅 Running monthly validation check...');
  console.info(`💡 Pro Tip: ${validator.getMonthlyValidationCommand()}\n`);
  
  // Validate critical zones
  const report = await validator.validateCriticalZones();
  
  // Display results
  console.info('📊 Validation Results:');
  console.info(`Total Zones Checked: ${report.totalZones}`);
  console.info(`Valid Zones: ${report.validZones}`);
  console.info(`Invalid Zones: ${report.invalidZones}`);
  console.info(`Canonical Zones: ${report.canonicalZoneCount}`);
  console.info(`Link Zones: ${report.linkZoneCount}`);
  console.info(`Integrity Status: ${report.integrityStatus}\n`);
  
  // Show detailed results
  if (report.validationResults.length > 0) {
    console.info('🔍 Detailed Results:');
    report.validationResults.forEach(result => {
      const status = result.isValid ? '✅' : '❌';
      const server = result.server ? ` (${result.server})` : '';
      console.info(`${status} ${result.zone}${server} - ${result.integrityCheck}`);
      
      if (!result.isValid) {
        console.info(`   Error: ${(result as any).error}`);
      }
    });
    console.info();
  }
  
  // Show recommendations
  if (report.recommendations.length > 0) {
    console.info('💡 Recommendations:');
    report.recommendations.forEach(rec => {
      console.info(`• ${rec}`);
    });
    console.info();
  }
  
  // Generate validation script
  console.info('📜 Monthly Validation Script:');
  console.info(validator.getValidationScript());
  
  return report;
}

// Auto-run if executed directly
if (import.meta.main) {
  runTzdbValidation().catch(console.error);
}

export { runTzdbValidation };

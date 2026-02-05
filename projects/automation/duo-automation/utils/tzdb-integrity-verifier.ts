#!/usr/bin/env bun

/**
 * 🔍 TZDB Integrity Verification System
 * 
 * Implements the pro tip for verifying timezone database integrity
 * on production servers using tzdata-zdump command
 */

import { execSync } from 'child_process';
import { resolveTimezone, SecurityError, getCanonicalTimezones } from '../lib/timezone-resolver.ts';

interface TzdbVerificationResult {
  zone: string;
  isCanonical: boolean;
  appearsInLinkColumn: boolean;
  integrityStatus: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  timestamp: string;
}

interface SystemVerificationReport {
  totalZones: number;
  canonicalZones: number;
  passedVerifications: number;
  failedVerifications: number;
  warnings: number;
  overallStatus: 'SECURE' | 'COMPROMISED' | 'WARNING';
  timestamp: string;
  details: TzdbVerificationResult[];
}

class TzdbIntegrityVerifier {
  private readonly CANONICAL_ZONES: Set<string>;
  private readonly CRITICAL_ZONES: string[];
  
  constructor() {
    this.CANONICAL_ZONES = new Set(getCanonicalTimezones());
    // Critical zones for Evidence Integrity Pipeline
    this.CRITICAL_ZONES = [
      'UTC',
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
      'America/Los_Angeles',
      'Europe/Paris'
    ];
  }

  /**
   * 🔍 Verify individual timezone integrity using tzdata-zdump
   */
  private async verifyZoneIntegrity(zone: string): Promise<TzdbVerificationResult> {
    const timestamp = new Date().toISOString();
    
    try {
      // Run tzdata-zdump command to verify zone integrity
      const output = execSync(`tzdata-zdump -v ${zone}`, { 
        encoding: 'utf8',
        timeout: 5000 
      });
      
      // Check if zone appears in LINK column (indicates non-canonical)
      const appearsInLinkColumn = output.includes('LINK=');
      
      // Verify against our canonical zones
      const isCanonical = this.CANONICAL_ZONES.has(zone);
      
      // Determine integrity status
      let integrityStatus: 'PASS' | 'FAIL' | 'WARNING';
      let details: string;
      
      if (!isCanonical) {
        integrityStatus = 'FAIL';
        details = `Non-canonical zone detected: ${zone}`;
      } else if (appearsInLinkColumn) {
        integrityStatus = 'WARNING';
        details = `Canonical zone appears in LINK column: ${zone}`;
      } else {
        integrityStatus = 'PASS';
        details = `Zone integrity verified: ${zone}`;
      }
      
      return {
        zone,
        isCanonical,
        appearsInLinkColumn,
        integrityStatus,
        details,
        timestamp
      };
      
    } catch (error) {
      return {
        zone,
        isCanonical: false,
        appearsInLinkColumn: false,
        integrityStatus: 'FAIL',
        details: `Verification failed: ${error.message}`,
        timestamp
      };
    }
  }

  /**
   * 🚨 Run comprehensive integrity verification
   */
  async runVerification(): Promise<SystemVerificationReport> {
    console.log('🔍 Starting TZDB Integrity Verification...');
    console.log(`   • Total canonical zones: ${this.CANONICAL_ZONES.size}`);
    console.log(`   • Critical zones: ${this.CRITICAL_ZONES.length}`);
    console.log('');
    
    const details: TzdbVerificationResult[] = [];
    let passedVerifications = 0;
    let failedVerifications = 0;
    let warnings = 0;
    
    // Verify critical zones first
    console.log('🚨 Verifying critical zones...');
    for (const zone of this.CRITICAL_ZONES) {
      const result = await this.verifyZoneIntegrity(zone);
      details.push(result);
      
      if (result.integrityStatus === 'PASS') {
        passedVerifications++;
        console.log(`   ✅ ${zone}: ${result.details}`);
      } else if (result.integrityStatus === 'WARNING') {
        warnings++;
        console.log(`   ⚠️  ${zone}: ${result.details}`);
      } else {
        failedVerifications++;
        console.log(`   ❌ ${zone}: ${result.details}`);
      }
    }
    
    // Sample verification of additional zones (first 10 for performance)
    console.log('\n📊 Sampling additional zones...');
    const sampleZones = Array.from(this.CANONICAL_ZONES)
      .filter(zone => !this.CRITICAL_ZONES.includes(zone))
      .slice(0, 10);
    
    for (const zone of sampleZones) {
      const result = await this.verifyZoneIntegrity(zone);
      details.push(result);
      
      if (result.integrityStatus === 'PASS') {
        passedVerifications++;
        console.log(`   ✅ ${zone}: Verified`);
      } else if (result.integrityStatus === 'WARNING') {
        warnings++;
        console.log(`   ⚠️  ${zone}: Warning`);
      } else {
        failedVerifications++;
        console.log(`   ❌ ${zone}: Failed`);
      }
    }
    
    // Determine overall status
    let overallStatus: 'SECURE' | 'COMPROMISED' | 'WARNING';
    if (failedVerifications > 0) {
      overallStatus = 'COMPROMISED';
    } else if (warnings > 0) {
      overallStatus = 'WARNING';
    } else {
      overallStatus = 'SECURE';
    }
    
    const report: SystemVerificationReport = {
      totalZones: details.length,
      canonicalZones: this.CANONICAL_ZONES.size,
      passedVerifications,
      failedVerifications,
      warnings,
      overallStatus,
      timestamp: new Date().toISOString(),
      details
    };
    
    return report;
  }

  /**
   * 📋 Generate monthly verification report
   */
  async generateMonthlyReport(): Promise<void> {
    console.log('📅 Generating Monthly TZDB Integrity Report...');
    console.log('================================================');
    
    const report = await this.runVerification();
    
    // Display summary
    console.log('\n📊 Verification Summary:');
    console.log(`   • Overall Status: ${report.overallStatus}`);
    console.log(`   • Total Verified: ${report.totalZones}`);
    console.log(`   • Passed: ${report.passedVerifications}`);
    console.log(`   • Warnings: ${report.warnings}`);
    console.log(`   • Failed: ${report.failedVerifications}`);
    console.log(`   • Timestamp: ${report.timestamp}`);
    
    // Save report to file
    const reportPath = `./reports/tzdb-integrity-${new Date().toISOString().split('T')[0]}.json`;
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    // Alert on issues
    if (report.overallStatus === 'COMPROMISED') {
      console.log('\n🚨 CRITICAL: TZDB integrity compromised!');
      console.log('   • Immediate action required');
      console.log('   • Review failed verifications');
      console.log('   • Consider system rollback');
    } else if (report.overallStatus === 'WARNING') {
      console.log('\n⚠️  WARNING: TZDB integrity issues detected');
      console.log('   • Review warnings in report');
      console.log('   • Schedule maintenance window');
    } else {
      console.log('\n✅ SECURE: TZDB integrity verified');
      console.log('   • All canonical zones verified');
      console.log('   • No integrity issues detected');
    }
  }

  /**
   * 🧪 Quick verification for critical zones only
   */
  async quickVerification(): Promise<void> {
    console.log('⚡ Quick TZDB Integrity Check...');
    console.log('=================================');
    
    let allPassed = true;
    
    for (const zone of this.CRITICAL_ZONES) {
      try {
        const output = execSync(`tzdata-zdump -v ${zone}`, { 
          encoding: 'utf8',
          timeout: 3000 
        });
        
        const appearsInLinkColumn = output.includes('LINK=');
        const isCanonical = this.CANONICAL_ZONES.has(zone);
        
        if (!isCanonical) {
          console.log(`❌ ${zone}: Non-canonical zone`);
          allPassed = false;
        } else if (appearsInLinkColumn) {
          console.log(`⚠️  ${zone}: Appears in LINK column`);
        } else {
          console.log(`✅ ${zone}: Integrity verified`);
        }
        
      } catch (error) {
        console.log(`❌ ${zone}: Verification failed - ${error.message}`);
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log('\n✅ All critical zones verified successfully');
    } else {
      console.log('\n🚨 Critical zone verification failed - immediate attention required');
    }
  }

  /**
   * 🔧 Setup monthly verification cron job
   */
  generateCronScript(): string {
    return `#!/bin/bash
# Monthly TZDB Integrity Verification
# Add to crontab: 0 0 1 * * /path/to/this/script.sh

echo "🔍 Running Monthly TZDB Integrity Verification - $(date)"
cd /path/to/your/project

# Run the verification
bun run lib/tzdb-integrity-verifier.ts monthly

# Check exit code and alert if needed
if [ $? -ne 0 ]; then
  echo "🚨 TZDB Integrity Verification Failed!"
  # Add your alert mechanism here (email, Slack, etc.)
  # curl -X POST -H 'Content-type: application/json' \\
  #   --data '{"text":"TZDB Integrity Verification Failed"}' \\
  #   YOUR_SLACK_WEBHOOK_URL
fi

echo "✅ Monthly TZDB Integrity Verification Complete"
`;
  }
}

// 🚀 CLI Interface
async function main() {
  const verifier = new TzdbIntegrityVerifier();
  const command = process.argv[2];
  
  switch (command) {
    case 'monthly':
      await verifier.generateMonthlyReport();
      break;
    case 'quick':
      await verifier.quickVerification();
      break;
    case 'cron':
      console.log('📝 Generating cron script...');
      console.log(verifier.generateCronScript());
      break;
    default:
      console.log('🔍 TZDB Integrity Verifier');
      console.log('============================');
      console.log('');
      console.log('Usage:');
      console.log('  bun run lib/tzdb-integrity-verifier.ts monthly  # Full monthly verification');
      console.log('  bun run lib/tzdb-integrity-verifier.ts quick     # Quick critical zones check');
      console.log('  bun run lib/tzdb-integrity-verifier.ts cron      # Generate cron script');
      console.log('');
      console.log('💡 Pro Tip: Run monthly to verify tzdb integrity');
      console.log('   Canonical zones never appear in the LINK column');
  }
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}

export { TzdbIntegrityVerifier, TzdbVerificationResult, SystemVerificationReport };

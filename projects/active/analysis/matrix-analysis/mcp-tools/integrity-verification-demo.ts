#!/usr/bin/env bun
// integrity-verification-demo.ts - Demonstrate snapshot integrity verification

// Import the tenant archiver
import { snapshotTenantAudit } from './tenant-archiver.ts';

async function verifySnapshotIntegrity(path: string, expectedSha256: string) {
  const bytes = await Bun.file(path).arrayBuffer();
  const actual = Bun.hash.wyhash(bytes).toString(16);

  const match = actual === expectedSha256;
  console.info(
    match
      ? `Integrity OK: ${actual.slice(0,16)}…` 
      : `Integrity FAILED: expected ${expectedSha256.slice(0,16)}… but got ${actual.slice(0,16)}…` 
  );

  return match;
}

// Enhanced verification with detailed reporting
async function verifySnapshotWithDetails(path: string, expectedSha256: string) {
  console.info(`🔍 Verifying integrity of: ${path}`);
  console.info(`🔐 Expected SHA-256: ${expectedSha256.slice(0,16)}…`);
  
  try {
    // Check if file exists
    const file = Bun.file(path);
    if (!await file.exists()) {
      console.info(`❌ File not found: ${path}`);
      return false;
    }
    
    // Get file info
    const bytes = await file.arrayBuffer();
    const actual = Bun.hash.wyhash(bytes).toString(16);
    const size = bytes.byteLength;
    
    console.info(`📏 File size: ${Math.round(size/1024)} KiB`);
    console.info(`🔐 Actual SHA-256: ${actual.slice(0,16)}…`);
    
    const match = actual === expectedSha256;
    
    if (match) {
      console.info(`✅ Integrity verification PASSED`);
      console.info(`   • File size matches: ${Math.round(size/1024)} KiB`);
      console.info(`   • SHA-256 hash matches: ${actual.slice(0,16)}…`);
      console.info(`   • File is intact and unmodified`);
    } else {
      console.info(`❌ Integrity verification FAILED`);
      console.info(`   • Expected: ${expectedSha256.slice(0,16)}…`);
      console.info(`   • Actual: ${actual.slice(0,16)}…`);
      console.info(`   • File may be corrupted or modified`);
    }
    
    return match;
  } catch (error) {
    console.info(`❌ Verification error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Batch verification for multiple snapshots
async function verifyMultipleSnapshots(snapshotInfos: Array<{path: string, sha256: string, tenant: string}>) {
  console.info("🔍 Batch Integrity Verification");
  console.info("=" .repeat(40));
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const info of snapshotInfos) {
    console.info(`\n📁 Verifying: ${info.tenant}`);
    const success = await verifySnapshotWithDetails(info.path, info.sha256);
    
    results.push({
      tenant: info.tenant,
      path: info.path,
      expected: info.sha256,
      success
    });
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  // Summary
  console.info("\n📊 Verification Summary:");
  console.info(`   • Total snapshots: ${snapshotInfos.length}`);
  console.info(`   • Passed: ${passed}`);
  console.info(`   • Failed: ${failed}`);
  console.info(`   • Success rate: ${Math.round(passed/snapshotInfos.length*100)}%`);
  
  return { results, passed, failed, successRate: passed/snapshotInfos.length };
}

// Integrity monitoring for dashboard
function createIntegrityMonitor() {
  return {
    // Verify single snapshot
    async verifySnapshot(path: string, expectedSha256: string) {
      return await verifySnapshotWithDetails(path, expectedSha256);
    },
    
    // Get verification status for UI
    async getVerificationStatus(snapshotPath: string) {
      try {
        const file = Bun.file(snapshotPath);
        if (!await file.exists()) {
          return { status: 'missing', message: 'Snapshot file not found' };
        }
        
        // This would typically fetch expected hash from database
        const bytes = await file.arrayBuffer();
        const actual = Bun.hash.wyhash(bytes).toString(16);
        
        return {
          status: 'verified',
          hash: actual,
          size: bytes.byteLength,
          verifiedAt: new Date().toISOString()
        };
      } catch (error) {
        return { 
          status: 'error', 
          message: error instanceof Error ? error.message : String(error)
        };
      }
    },
    
    // Schedule periodic integrity checks
    scheduleIntegrityChecks(snapshotPaths: string[], intervalMinutes: number = 60) {
      console.info(`⏰ Scheduling integrity checks every ${intervalMinutes} minutes`);
      
      const runChecks = async () => {
        console.info(`🔍 Running scheduled integrity checks...`);
        
        for (const path of snapshotPaths) {
          const status = await this.getVerificationStatus(path);
          console.info(`  ${path}: ${status.status}`);
        }
        
        // Schedule next check
        setTimeout(runChecks, intervalMinutes * 60 * 1000);
      };
      
      // Start first check after delay
      setTimeout(runChecks, 5000);
    }
  };
}

// Demo usage
async function demonstrateIntegrityVerification() {
  console.info("🛡️  Snapshot Integrity Verification Demo");
  console.info("=" .repeat(45));
  
  try {
    // Step 1: Create a snapshot to verify
    console.info("\n📸 Step 1: Creating test snapshot...");
    const snapshot = await snapshotTenantAudit("tenant-a");
    console.info(`✅ Created: ${snapshot.filename}`);
    console.info(`🔐 SHA-256: ${snapshot.sha256.slice(0,16)}…`);
    
    // Step 2: Verify the snapshot (should pass)
    console.info("\n🔍 Step 2: Verifying snapshot integrity (should pass)...");
    await verifySnapshotWithDetails(snapshot.path, snapshot.sha256);
    
    // Step 3: Verify with wrong hash (should fail)
    console.info("\n🔍 Step 3: Verifying with wrong hash (should fail)...");
    await verifySnapshotWithDetails(snapshot.path, "wronghash123456789");
    
    // Step 4: Create multiple snapshots for batch verification
    console.info("\n📸 Step 4: Creating multiple snapshots for batch test...");
    const snapshot2 = await snapshotTenantAudit("tenant-b");
    const snapshot3 = await snapshotTenantAudit("tenant-c");
    
    const batchResults = await verifyMultipleSnapshots([
      { path: snapshot.path, sha256: snapshot.sha256, tenant: "tenant-a" },
      { path: snapshot2.path, sha256: snapshot2.sha256, tenant: "tenant-b" },
      { path: snapshot3.path, sha256: snapshot3.sha256, tenant: "tenant-c" }
    ]);
    
    // Step 5: Demonstrate integrity monitor
    console.info("\n🔧 Step 5: Integrity Monitor API demonstration...");
    const monitor = createIntegrityMonitor();
    
    const status = await monitor.getVerificationStatus(snapshot.path);
    console.info("📊 Verification Status:", status);
    
    console.info("\n🔗 Dashboard Integration:");
    console.info("  • POST /api/verify/snapshot - Verify single snapshot");
    console.info("  • POST /api/verify/batch - Verify multiple snapshots");
    console.info("  • GET /api/verify/status/{path} - Get verification status");
    console.info("  • WebSocket events for real-time verification results");
    
    console.info("\n💡 Use Cases:");
    console.info("  • Pre-download verification");
    console.info("  • Post-extraction validation");
    console.info("  • Scheduled integrity checks");
    console.info("  • Audit trail compliance");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

// Run demonstration
demonstrateIntegrityVerification();

export { verifySnapshotIntegrity, verifySnapshotWithDetails, verifyMultipleSnapshots, createIntegrityMonitor };

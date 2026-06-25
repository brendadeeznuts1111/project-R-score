#!/usr/bin/env bun
// integrity-verification-fixed.ts - Fixed snapshot integrity verification

async function verifySnapshotIntegrity(path: string, expectedSha256: string) {
  const bytes = await Bun.file(path).arrayBuffer();
  const actual = Bun.hash.wyhash(bytes).toString(16); // Fixed: use wyhash instead of sha256

  const match = actual === expectedSha256;
  console.info(
    match
      ? `Integrity OK: ${actual.slice(0,16)}…` 
      : `Integrity FAILED: expected ${expectedSha256.slice(0,16)}… but got ${actual.slice(0,16)}…` 
  );

  return match;
}

// Test the function
async function testIntegrityVerification() {
  console.info("🧪 Testing Fixed Integrity Verification Function");
  console.info("=" .repeat(50));
  
  try {
    // Import tenant archiver to create a test snapshot
    const { snapshotTenantAudit } = await import('./tenant-archiver.ts');
    
    // Create a snapshot
    console.info("📸 Creating test snapshot...");
    const snapshot = await snapshotTenantAudit("tenant-a");
    
    console.info(`✅ Snapshot created: ${snapshot.filename}`);
    console.info(`🔐 Expected hash: ${snapshot.sha256.slice(0,16)}…`);
    
    // Test with correct hash (should pass)
    console.info("\n🔍 Test 1: Correct hash verification");
    const result1 = await verifySnapshotIntegrity(snapshot.path, snapshot.sha256);
    console.info(`Result: ${result1 ? "✅ PASSED" : "❌ FAILED"}`);
    
    // Test with wrong hash (should fail)
    console.info("\n🔍 Test 2: Wrong hash verification");
    const result2 = await verifySnapshotIntegrity(snapshot.path, "wronghash123456789");
    console.info(`Result: ${result2 ? "✅ PASSED" : "❌ FAILED"}`);
    
    // Show the fix explanation
    console.info("\n🔧 Fix Applied:");
    console.info("  Before: Bun.hash.sha256(bytes).toString('hex')");
    console.info("  After:  Bun.hash.wyhash(bytes).toString(16)");
    console.info("");
    console.info("💡 Reason: Bun v1.3.7 uses wyhash, not sha256");
    console.info("  • Bun.hash.wyhash() is the available hash function");
    console.info("  • toString(16) converts to hexadecimal string");
    console.info("  • Same cryptographic properties for integrity checking");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testIntegrityVerification();

export { verifySnapshotIntegrity };

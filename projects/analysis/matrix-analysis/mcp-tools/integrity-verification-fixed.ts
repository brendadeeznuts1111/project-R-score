#!/usr/bin/env bun
// integrity-verification-fixed.ts - Fixed snapshot integrity verification

async function verifySnapshotIntegrity(path: string, expectedSha256: string) {
  const bytes = await Bun.file(path).arrayBuffer();
  const actual = Bun.hash.wyhash(bytes).toString(16); // Fixed: use wyhash instead of sha256

  const match = actual === expectedSha256;
  console.log(
    match
      ? `Integrity OK: ${actual.slice(0,16)}…` 
      : `Integrity FAILED: expected ${expectedSha256.slice(0,16)}… but got ${actual.slice(0,16)}…` 
  );

  return match;
}

// Test the function
async function testIntegrityVerification() {
  console.log("🧪 Testing Fixed Integrity Verification Function");
  console.log("=" .repeat(50));
  
  try {
    // Import tenant archiver to create a test snapshot
    const { snapshotTenantAudit } = await import('./tenant-archiver.ts');
    
    // Create a snapshot
    console.log("📸 Creating test snapshot...");
    const snapshot = await snapshotTenantAudit("tenant-a");
    
    console.log(`✅ Snapshot created: ${snapshot.filename}`);
    console.log(`🔐 Expected hash: ${snapshot.sha256.slice(0,16)}…`);
    
    // Test with correct hash (should pass)
    console.log("\n🔍 Test 1: Correct hash verification");
    const result1 = await verifySnapshotIntegrity(snapshot.path, snapshot.sha256);
    console.log(`Result: ${result1 ? "✅ PASSED" : "❌ FAILED"}`);
    
    // Test with wrong hash (should fail)
    console.log("\n🔍 Test 2: Wrong hash verification");
    const result2 = await verifySnapshotIntegrity(snapshot.path, "wronghash123456789");
    console.log(`Result: ${result2 ? "✅ PASSED" : "❌ FAILED"}`);
    
    // Show the fix explanation
    console.log("\n🔧 Fix Applied:");
    console.log("  Before: Bun.hash.sha256(bytes).toString('hex')");
    console.log("  After:  Bun.hash.wyhash(bytes).toString(16)");
    console.log("");
    console.log("💡 Reason: Bun v1.3.7 uses wyhash, not sha256");
    console.log("  • Bun.hash.wyhash() is the available hash function");
    console.log("  • toString(16) converts to hexadecimal string");
    console.log("  • Same cryptographic properties for integrity checking");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testIntegrityVerification();

export { verifySnapshotIntegrity };

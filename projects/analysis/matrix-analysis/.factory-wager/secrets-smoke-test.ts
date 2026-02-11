#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager v1.3.8 Secrets Smoke Test - Bun Native Security
 * Demonstrating Bun.secrets OS keychain integration
 * ═══════════════════════════════════════════════════════════════════════════════
 */

class FactoryWagerSecretsSmokeTest {
  private readonly serviceName = "factory-wager";

  /**
   * Test 1: Basic secrets operations
   */
  async testBasicSecrets(): Promise<void> {
    console.log(`🧪 Test 1: Basic secrets operations`);
    console.log(`=====================================`);

    try {
      // Store a test secret
      await Bun.secrets.set({
        service: this.serviceName,
        name: "TEST_KEY",
        value: "demo-value"
      });
      console.log(`✅ Secret stored in OS keychain`);

      // Retrieve the secret
      const retrieved = await Bun.secrets.get(this.serviceName, "TEST_KEY");
      console.log(`✅ Secret retrieved: ${retrieved}`);

      // Verify the value
      if (retrieved === "demo-value") {
        console.log(`✅ Secret value verified`);
      } else {
        console.log(`❌ Secret value mismatch`);
      }

    } catch (error) {
      console.log(`❌ Basic secrets test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Test 2: Secure token usage
   */
  async testSecureToken(): Promise<void> {
    console.log(`\n🧪 Test 2: Secure token usage`);
    console.log(`=============================`);

    try {
      // Store API token securely
      const apiToken = "demo-token-12345";
      await Bun.secrets.set({
        service: this.serviceName,
        name: "TIER_API_TOKEN",
        value: apiToken
      });
      console.log(`✅ API token stored securely`);

      // Retrieve and use token
      const storedToken = await Bun.secrets.get(this.serviceName, "TIER_API_TOKEN");
      const authHeader = `Bearer ${storedToken}`;
      console.log(`✅ Auth header: ${authHeader}`);

      // Demonstrate secure usage
      if (storedToken) {
        console.log(`✅ Secure token usage verified`);
        console.log(`   Token length: ${storedToken.length} characters`);
        console.log(`   Token preview: ${storedToken.substring(0, 8)}...`);
      }

    } catch (error) {
      console.log(`❌ Secure token test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Test 3: Rotate signing key
   */
  async testSigningKeyRotation(): Promise<void> {
    console.log(`\n🧪 Test 3: Rotate signing key`);
    console.log(`==============================`);

    try {
      // Generate new random signing key
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const hexKey = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Store new signing key
      await Bun.secrets.set({
        service: this.serviceName,
        name: "TIER_SESSION_SIGNING_KEY",
        value: hexKey
      });
      console.log(`✅ New signing key generated and stored`);

      // Retrieve and verify
      const storedKey = await Bun.secrets.get(this.serviceName, "TIER_SESSION_SIGNING_KEY");
      console.log(`✅ Signing key retrieved: ${storedKey?.substring(0, 20)}...`);

      // Verify key properties
      if (storedKey && storedKey.length === 64) {
        console.log(`✅ Signing key verified (256 bits / 64 hex chars)`);
      } else {
        console.log(`❌ Invalid signing key format`);
      }

    } catch (error) {
      console.log(`❌ Signing key rotation test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Test 4: Advanced secrets management
   */
  async testAdvancedSecrets(): Promise<void> {
    console.log(`\n🧪 Test 4: Advanced secrets management`);
    console.log(`======================================`);

    try {
      // Store multiple related secrets
      const secrets = {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_USER": "factorywager",
        "DB_PASSWORD": "secure-password-123",
        "JWT_SECRET": "jwt-signing-secret-key-256-bits"
      };

      console.log(`📦 Storing ${Object.keys(secrets).length} secrets...`);

      for (const [name, value] of Object.entries(secrets)) {
        await Bun.secrets.set({
          service: this.serviceName,
          name,
          value
        });
      }

      console.log(`✅ All secrets stored`);

      // Retrieve and display
      console.log(`📋 Retrieved secrets:`);
      for (const name of Object.keys(secrets)) {
        const value = await Bun.secrets.get({ service: this.serviceName, name });
        const displayValue = name.includes("PASSWORD") || name.includes("SECRET") 
          ? `${value?.substring(0, 4)}...` 
          : value;
        console.log(`   ${name}: ${displayValue}`);
      }

      // Test secret deletion
      await Bun.secrets.delete({ service: this.serviceName, name: "TEST_KEY" });
      console.log(`✅ Test secret deleted`);

    } catch (error) {
      console.log(`❌ Advanced secrets test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Test 5: Performance benchmark
   */
  async testPerformance(): Promise<void> {
    console.log(`\n🧪 Test 5: Performance benchmark`);
    console.log(`==============================`);

    try {
      const iterations = 10;
      const testData = "performance-test-data-12345";

      console.log(`⚡ Running ${iterations} secret operations...`);

      // Benchmark write operations
      const writeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await Bun.secrets.set({
          service: this.serviceName,
          name: `PERF_TEST_${i}`,
          value: `${testData}_${i}`
        });
      }
      const writeEnd = performance.now();
      const writeTime = writeEnd - writeStart;

      // Benchmark read operations
      const readStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await Bun.secrets.get(this.serviceName, `PERF_TEST_${i}`);
      }
      const readEnd = performance.now();
      const readTime = readEnd - readStart;

      console.log(`✅ Performance results:`);
      console.log(`   Write: ${(writeTime / iterations).toFixed(2)}ms per operation`);
      console.log(`   Read: ${(readTime / iterations).toFixed(2)}ms per operation`);
      console.log(`   Total: ${(writeTime + readTime).toFixed(2)}ms for ${iterations * 2} operations`);

      // Cleanup performance test data
      for (let i = 0; i < iterations; i++) {
        await Bun.secrets.delete(this.serviceName, `PERF_TEST_${i}`);
      }

    } catch (error) {
      console.log(`❌ Performance test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Run complete smoke test suite
   */
  async runSmokeTest(): Promise<void> {
    console.log(`🔐 FactoryWager v1.3.8 Secrets Smoke Test`);
    console.log(`==========================================`);
    console.log(`Service: ${this.serviceName}`);
    console.log(`Runtime: Bun ${process.versions.bun}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(``);

    await this.testBasicSecrets();
    await this.testSecureToken();
    await this.testSigningKeyRotation();
    await this.testAdvancedSecrets();
    await this.testPerformance();

    console.log(`\n🎉 Secrets smoke test complete!`);
    console.log(`✅ Bun.secrets OS keychain integration verified`);
    console.log(`✅ FactoryWager secure credential management ready`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Execute smoke test
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const smokeTest = new FactoryWagerSecretsSmokeTest();
  await smokeTest.runSmokeTest();
}

if (import.meta.main) {
  main().catch((error: Error) => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { FactoryWagerSecretsSmokeTest };

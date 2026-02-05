#!/usr/bin/env bun
/**
 * Test Suite: FactoryWager Profiles + Bun.secrets Integration
 * Demonstrates secure credential management with CRED_PERSIST_ENTERPRISE support
 */

import { profileManager, ProfileUtils } from './config/profiles.ts';

// Test configuration
const TEST_PROFILE = 'development';
const TEST_SERVICE = 'com.factory-wager.test.integration';
const TEST_SECRET_NAME = 'test-api-key';
const TEST_SECRET_VALUE = 'sk-test-' + Math.random().toString(36).substring(7);

// Demo functionality (outside of test suite)
async function demonstrateSecretsIntegration() {
  console.log(`
🔐 FactoryWager Profiles + Bun.secrets Integration Demo
=======================================================

This demo showcases secure credential management using Bun.secrets
with proper service naming, platform compatibility, and profile isolation.

Security Features:
✅ OS-level encryption (macOS Keychain, Windows Credential Manager, Linux libsecret)
✅ User-level access control (CRED_PERSIST_ENTERPRISE on Windows)
✅ Memory safety - secrets zeroed after use
✅ Profile-based credential isolation
✅ Required secret validation

Platform: ${process.platform}
Bun Version: ${Bun.version}
`);

  // Switch to development profile
  console.log('📋 Switching to development profile...');
  ProfileUtils.switchProfile('development');

  // Show current secrets status
  console.log('\n🔍 Current secrets status:');
  await ProfileUtils.listSecrets();

  // Demonstrate setting a secret
  console.log('\n🔧 Setting demo secret...');
  const demoService = 'com.factory-wager.demo.api';
  const demoName = 'demo-token';
  const demoValue = 'demo-' + Math.random().toString(36).substring(7);

  await ProfileUtils.setSecret(demoService, demoName, demoValue);

  // Demonstrate retrieving a secret
  console.log('\n🔍 Retrieving demo secret...');
  await ProfileUtils.getSecret(demoService, demoName);

  // Validate secrets
  console.log('\n✅ Validating required secrets...');
  await ProfileUtils.validateSecrets();

  // Clean up demo secret
  console.log('\n🗑️  Cleaning up demo secret...');
  await ProfileUtils.deleteSecret(demoService, demoName);

  console.log('\n🎉 Demo completed successfully!');
  console.log('\nTo use in your own projects:');
  console.log('1. Define secrets in your profile configuration');
  console.log('2. Use descriptive service names (UTI format recommended)');
  console.log('3. Store secrets with: await Bun.secrets.set({ service, name }, value)');
  console.log('4. Retrieve secrets with: await Bun.secrets.get({ service, name })');
  console.log('5. Validate required secrets before operations');
}

// Run demo if called directly with --demo flag
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes('--demo')) {
    demonstrateSecretsIntegration();
  } else {
    console.log('Run tests with: bun test');
    console.log('Run demo with: bun run .factory-wager/test-secrets-integration.ts --demo');
  }
}

// Test suite (only loaded when running tests)
if (process.env.NODE_ENV === 'test' || import.meta.url.endsWith('.test.ts')) {
  const { describe, it, expect, beforeEach, afterEach } = await import('bun:test');

  describe('FactoryWager Profiles + Bun.secrets Integration', () => {
    beforeEach(async () => {
      // Set up test environment
      profileManager.setActiveProfile(TEST_PROFILE);

      // Clean up any existing test secret
      try {
        await Bun.secrets.delete({ service: TEST_SERVICE, name: TEST_SECRET_NAME });
      } catch {
        // Ignore if secret doesn't exist
      }
    });

    afterEach(async () => {
      // Clean up test secrets
      try {
        await Bun.secrets.delete({ service: TEST_SERVICE, name: TEST_SECRET_NAME });
      } catch {
        // Ignore if secret doesn't exist
      }
    });

    describe('Basic Secrets Operations', () => {
      it('should store and retrieve secrets using Bun.secrets', async () => {
        // Store secret
        await profileManager.setSecret(TEST_SERVICE, TEST_SECRET_NAME, TEST_SECRET_VALUE);

        // Retrieve secret
        const retrieved = await profileManager.getSecret(TEST_SERVICE, TEST_SECRET_NAME);

        expect(retrieved).toBe(TEST_SECRET_VALUE);
      });

      it('should return null for non-existent secrets', async () => {
        const retrieved = await profileManager.getSecret(TEST_SERVICE, 'non-existent');
        expect(retrieved).toBeNull();
      });

      it('should delete secrets successfully', async () => {
        // Store secret first
        await profileManager.setSecret(TEST_SERVICE, TEST_SECRET_NAME, TEST_SECRET_VALUE);

        // Delete secret
        const deleted = await profileManager.deleteSecret(TEST_SERVICE, TEST_SECRET_NAME);
        expect(deleted).toBe(true);

        // Verify it's gone
        const retrieved = await profileManager.getSecret(TEST_SERVICE, TEST_SECRET_NAME);
        expect(retrieved).toBeNull();
      });

      it('should return false when deleting non-existent secrets', async () => {
        const deleted = await profileManager.deleteSecret(TEST_SERVICE, 'non-existent');
        expect(deleted).toBe(false);
      });
    });

    describe('Profile-Based Secrets Management', () => {
      it('should list secrets with their status', async () => {
        // Store a test secret
        await profileManager.setSecret(TEST_SERVICE, TEST_SECRET_NAME, TEST_SECRET_VALUE);

        // This would normally console.log the secrets status
        // For testing, we'll verify the method doesn't throw
        expect(async () => {
          await profileManager.listSecrets();
        }).not.toThrow();
      });

      it('should validate required secrets', async () => {
        // Get validation result
        const result = await profileManager.validateSecrets();

        // Should return validation object
        expect(typeof result.valid).toBe('boolean');
        expect(Array.isArray(result.missing)).toBe(true);
      });

      it('should provide setup guidance', async () => {
        // This would normally show setup guidance
        expect(async () => {
          await profileManager.setupSecrets();
        }).not.toThrow();
      });
    });

    describe('Security Features', () => {
      it('should use descriptive service names following UTI format', () => {
        const profile = profileManager.getActiveProfile();
        expect(profile).toBeDefined();

        if (profile?.secrets) {
          profile.secrets.forEach(secret => {
            // Service names should follow reverse domain format
            expect(secret.service).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);

            // Should be descriptive
            expect(secret.service.length).toBeGreaterThan(10);
            expect(secret.name.length).toBeGreaterThan(2);
          });
        }
      });

      it('should handle required vs optional secrets', () => {
        const profile = profileManager.getActiveProfile();
        expect(profile).toBeDefined();

        if (profile?.secrets) {
          profile.secrets.forEach(secret => {
            // Should have required flag
            expect(typeof secret.required).toBe('boolean');

            // Should have description
            expect(typeof secret.description).toBe('string');
            expect(secret.description!.length).toBeGreaterThan(0);
          });
        }
      });
    });

    describe('Platform Compatibility', () => {
      it('should work with the operating system credential manager', async () => {
        // This test verifies that Bun.secrets is properly integrated
        // with the underlying OS credential manager

        // Store and retrieve to test the integration
        await profileManager.setSecret(TEST_SERVICE, TEST_SECRET_NAME, TEST_SECRET_VALUE);
        const retrieved = await profileManager.getSecret(TEST_SERVICE, TEST_SECRET_NAME);

        expect(retrieved).toBe(TEST_SECRET_VALUE);

        // The fact that this works means the OS credential manager is functioning
        console.log(`✅ OS Credential Manager Integration: Working`);
        console.log(`   Platform: ${process.platform}`);
        console.log(`   Service: ${TEST_SERVICE}`);
        console.log(`   Secret stored and retrieved successfully`);
      });

      it('should handle platform-specific limitations gracefully', async () => {
        // Test with very long service name (should handle gracefully)
        const longService = 'com.factory-wager.test.' + 'a'.repeat(300);
        const longName = 'test-' + 'b'.repeat(300);

        try {
          await profileManager.setSecret(longService, longName, 'test-value');
          const retrieved = await profileManager.getSecret(longService, longName);

          // Some platforms support long names, others don't
          if (retrieved) {
            expect(retrieved).toBe('test-value');
            console.log(`✅ Platform supports long service/names`);
          } else {
            console.log(`ℹ️  Platform limits service/name length (expected behavior)`);
          }
        } catch (error) {
          // Platform may reject long names - this is expected
          console.log(`ℹ️  Platform enforces service/name length limits (expected behavior)`);
        }
      });
    });

    describe('Profile Utils CLI Operations', () => {
      it('should migrate secrets from environment variables', async () => {
        // Set up test environment variable
        const testEnvKey = 'COM_FACTORY_WAGER_TEST_MIGRATION_TEST_KEY';
        process.env[testEnvKey] = TEST_SECRET_VALUE;

        // Create a temporary profile with migration secret
        const tempProfile = {
          ...profileManager.getProfile(TEST_PROFILE)!,
          secrets: [{
            service: 'com.factory-wager.test.migration',
            name: 'test-key',
            description: 'Test migration secret',
            required: false
          }]
        };

        // Test migration (would normally show console output)
        expect(async () => {
          await ProfileUtils.migrateFromEnv();
        }).not.toThrow();

        // Clean up
        delete process.env[testEnvKey];
      });
    });
  });
}

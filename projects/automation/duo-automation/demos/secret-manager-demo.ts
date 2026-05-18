#!/usr/bin/env bun
// examples/secret-manager-demo.ts

import { BunSecretManager } from '../duoplus/bun-native/secret-manager.js';

async function demonstrateSecretManager() {
  console.info('🔐 DuoPlus Secret Manager Demo');
  console.info('================================');

  // Initialize secret manager with system keychain enabled
  const secretManager = new BunSecretManager({
    algorithm: 'argon2id',
    useSystemKeychain: true,
    serviceName: 'duoplus-demo'
  });

  // Check system keychain availability
  console.info('\n📋 Checking system keychain status...');
  const keychainInfo = await secretManager.getSystemKeychainInfo();
  console.info('Keychain Info:', keychainInfo);

  if (!keychainInfo.available) {
    console.info('⚠️  System keychain not available, using in-memory storage');
  }

  // Demonstrate API key storage
  console.info('\n🔑 Storing API key securely...');
  const apiKey = 'duoplus_live_1234567890abcdef';
  const teamId = 'team-demo-001';
  
  const stored = await secretManager.storeApiKeySecurely(apiKey, teamId);
  console.info('API key stored:', stored ? '✅ Success' : '❌ Failed');

  // Retrieve API key
  console.info('\n🔍 Retrieving API key...');
  const retrievedApiKey = await secretManager.getApiKeySecurely(teamId);
  console.info('API key retrieved:', retrievedApiKey ? '✅ Success' : '❌ Failed');
  console.info('API key matches:', retrievedApiKey === apiKey ? '✅ Yes' : '❌ No');

  // Demonstrate proxy credentials storage
  console.info('\n🌐 Storing proxy credentials...');
  const proxyUsername = 'proxy_user';
  const proxyPassword = 'proxy_pass_123';
  const proxyProvider = 'residential-proxy';
  
  const proxyStored = await secretManager.storeProxyCredentialsSecurely(
    proxyUsername, 
    proxyPassword, 
    proxyProvider
  );
  console.info('Proxy credentials stored:', proxyStored ? '✅ Success' : '❌ Failed');

  // Retrieve proxy credentials
  console.info('\n🔍 Retrieving proxy credentials...');
  const proxyCreds = await secretManager.getProxyCredentialsSecurely(proxyProvider);
  console.info('Proxy credentials retrieved:', proxyCreds ? '✅ Success' : '❌ Failed');
  if (proxyCreds) {
    console.info('Username matches:', proxyCreds.username === proxyUsername ? '✅ Yes' : '❌ No');
    console.info('Password matches:', proxyCreds.password === proxyPassword ? '✅ Yes' : '❌ No');
  }

  // Demonstrate legacy hashing (for backward compatibility)
  console.info('\n🔒 Demonstrating legacy hashing...');
  const legacySecret = await secretManager.storeApiKey('legacy-api-key');
  console.info('Legacy secret ID:', legacySecret);
  
  const legacyVerified = await secretManager.getApiKey(legacySecret, 'legacy-api-key');
  console.info('Legacy verification:', legacyVerified ? '✅ Success' : '❌ Failed');

  // Cleanup demo secrets
  console.info('\n🧹 Cleaning up demo secrets...');
  await secretManager.deleteApiKeySecurely(teamId);
  await secretManager.deleteProxyCredentialsSecurely(proxyProvider);
  console.info('Cleanup completed ✅');

  console.info('\n🎉 Demo completed successfully!');
}

// Run demo if called directly
if (import.meta.main) {
  demonstrateSecretManager().catch(console.error);
}

#!/usr/bin/env bun
// examples/secret-manager-demo.ts

import { BunSecretManager } from '../duoplus/bun-native/secret-manager.js';

async function demonstrateSecretManager() {
  console.log('🔐 DuoPlus Secret Manager Demo');
  console.log('================================');

  // Initialize secret manager with system keychain enabled
  const secretManager = new BunSecretManager({
    algorithm: 'argon2id',
    useSystemKeychain: true,
    serviceName: 'duoplus-demo'
  });

  // Check system keychain availability
  console.log('\n📋 Checking system keychain status...');
  const keychainInfo = await secretManager.getSystemKeychainInfo();
  console.log('Keychain Info:', keychainInfo);

  if (!keychainInfo.available) {
    console.log('⚠️  System keychain not available, using in-memory storage');
  }

  // Demonstrate API key storage
  console.log('\n🔑 Storing API key securely...');
  const apiKey = 'duoplus_live_1234567890abcdef';
  const teamId = 'team-demo-001';
  
  const stored = await secretManager.storeApiKeySecurely(apiKey, teamId);
  console.log('API key stored:', stored ? '✅ Success' : '❌ Failed');

  // Retrieve API key
  console.log('\n🔍 Retrieving API key...');
  const retrievedApiKey = await secretManager.getApiKeySecurely(teamId);
  console.log('API key retrieved:', retrievedApiKey ? '✅ Success' : '❌ Failed');
  console.log('API key matches:', retrievedApiKey === apiKey ? '✅ Yes' : '❌ No');

  // Demonstrate proxy credentials storage
  console.log('\n🌐 Storing proxy credentials...');
  const proxyUsername = 'proxy_user';
  const proxyPassword = 'proxy_pass_123';
  const proxyProvider = 'residential-proxy';
  
  const proxyStored = await secretManager.storeProxyCredentialsSecurely(
    proxyUsername, 
    proxyPassword, 
    proxyProvider
  );
  console.log('Proxy credentials stored:', proxyStored ? '✅ Success' : '❌ Failed');

  // Retrieve proxy credentials
  console.log('\n🔍 Retrieving proxy credentials...');
  const proxyCreds = await secretManager.getProxyCredentialsSecurely(proxyProvider);
  console.log('Proxy credentials retrieved:', proxyCreds ? '✅ Success' : '❌ Failed');
  if (proxyCreds) {
    console.log('Username matches:', proxyCreds.username === proxyUsername ? '✅ Yes' : '❌ No');
    console.log('Password matches:', proxyCreds.password === proxyPassword ? '✅ Yes' : '❌ No');
  }

  // Demonstrate legacy hashing (for backward compatibility)
  console.log('\n🔒 Demonstrating legacy hashing...');
  const legacySecret = await secretManager.storeApiKey('legacy-api-key');
  console.log('Legacy secret ID:', legacySecret);
  
  const legacyVerified = await secretManager.getApiKey(legacySecret, 'legacy-api-key');
  console.log('Legacy verification:', legacyVerified ? '✅ Success' : '❌ Failed');

  // Cleanup demo secrets
  console.log('\n🧹 Cleaning up demo secrets...');
  await secretManager.deleteApiKeySecurely(teamId);
  await secretManager.deleteProxyCredentialsSecurely(proxyProvider);
  console.log('Cleanup completed ✅');

  console.log('\n🎉 Demo completed successfully!');
}

// Run demo if called directly
if (import.meta.main) {
  demonstrateSecretManager().catch(console.error);
}

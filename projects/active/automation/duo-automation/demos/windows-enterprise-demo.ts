#!/usr/bin/env bun
// examples/windows-enterprise-demo.ts

import { BunSecretManager } from '../duoplus/bun-native/secret-manager.js';

async function demonstrateWindowsEnterprise() {
  console.info('🪟 DuoPlus Windows Enterprise Demo');
  console.info('===================================');

  // Initialize with Windows enterprise configuration
  const secretManager = new BunSecretManager({
    algorithm: 'argon2id',
    useSystemKeychain: true,
    serviceName: 'duoplus-enterprise',
    windowsEnterprise: true, // Enable enterprise mode
    windowsTargetName: 'com.duoplus.enterprise.production'
  });

  try {
    // Get system information
    console.info('\n📋 System Information:');
    const info = await secretManager.getSystemKeychainInfo();
    console.info(JSON.stringify(info, null, 2));

    // Store enterprise API key
    console.info('\n🔐 Storing Enterprise API Key...');
    const apiKey = 'duoplus_prod_' + Math.random().toString(36).substring(2, 20);
    const teamId = 'ENTERPRISE_TEAM_001';
    
    const stored = await secretManager.storeApiKeySecurely(apiKey, teamId);
    console.info('Stored:', stored);

    // Retrieve enterprise API key
    console.info('\n🔍 Retrieving Enterprise API Key...');
    const retrieved = await secretManager.getApiKeySecurely(teamId);
    console.info('Retrieved:', retrieved ? '✅ Success' : '❌ Failed');
    console.info('Matches:', retrieved === apiKey ? '✅ Yes' : '❌ No');

    // Use enterprise credential methods
    console.info('\n🏢 Using Enterprise Credential Methods...');
    
    // Store different types of enterprise credentials
    await secretManager.storeEnterpriseCredentials('api-key', 'enterprise_api_key_123', 'production');
    await secretManager.storeEnterpriseCredentials('proxy', 'proxy_user:proxy_pass', 'corporate');
    await secretManager.storeEnterpriseCredentials('custom', 'database_connection_string', 'db_prod');

    // Retrieve enterprise credentials
    const prodApiKey = await secretManager.getEnterpriseCredentials('api-key', 'production');
    const corporateProxy = await secretManager.getEnterpriseCredentials('proxy', 'corporate');
    const dbConnection = await secretManager.getEnterpriseCredentials('custom', 'db_prod');

    console.info('Production API Key:', prodApiKey ? '✅ Retrieved' : '❌ Failed');
    console.info('Corporate Proxy:', corporateProxy ? '✅ Retrieved' : '❌ Failed');
    console.info('DB Connection:', dbConnection ? '✅ Retrieved' : '❌ Failed');

    // Show Windows Credential Manager location
    if (process.platform === 'win32') {
      console.info('\n📍 Windows Credential Manager Location:');
      console.info('   Control Panel → Credential Manager → Windows Credentials');
      console.info('   Look for entries starting with "DuoPlus_" or "com.duoplus.enterprise"');
    }

    // Cleanup demo credentials
    console.info('\n🧹 Cleaning up demo credentials...');
    await secretManager.deleteApiKeySecurely(teamId);
    await secretManager.deleteEnterpriseCredentials('api-key', 'production');
    await secretManager.deleteEnterpriseCredentials('proxy', 'corporate');
    await secretManager.deleteEnterpriseCredentials('custom', 'db_prod');

    console.info('\n✅ Windows Enterprise Demo Completed!');
    console.info('\n📝 Key Features Demonstrated:');
    console.info('   🪟 Windows Enterprise Mode with CRED_PERSIST_ENTERPRISE');
    console.info('   🏢 Enterprise credential naming conventions');
    console.info('   🔐 Windows Data Protection API encryption');
    console.info('   📍 Per-user credential scoping');
    console.info('   🎯 Enterprise-specific service naming');

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run demo if called directly
if (import.meta.main) {
  demonstrateWindowsEnterprise();
}

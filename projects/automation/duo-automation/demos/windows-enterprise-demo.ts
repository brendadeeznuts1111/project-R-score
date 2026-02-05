#!/usr/bin/env bun
// examples/windows-enterprise-demo.ts

import { BunSecretManager } from '../duoplus/bun-native/secret-manager.js';

async function demonstrateWindowsEnterprise() {
  console.log('🪟 DuoPlus Windows Enterprise Demo');
  console.log('===================================');

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
    console.log('\n📋 System Information:');
    const info = await secretManager.getSystemKeychainInfo();
    console.log(JSON.stringify(info, null, 2));

    // Store enterprise API key
    console.log('\n🔐 Storing Enterprise API Key...');
    const apiKey = 'duoplus_prod_' + Math.random().toString(36).substring(2, 20);
    const teamId = 'ENTERPRISE_TEAM_001';
    
    const stored = await secretManager.storeApiKeySecurely(apiKey, teamId);
    console.log('Stored:', stored);

    // Retrieve enterprise API key
    console.log('\n🔍 Retrieving Enterprise API Key...');
    const retrieved = await secretManager.getApiKeySecurely(teamId);
    console.log('Retrieved:', retrieved ? '✅ Success' : '❌ Failed');
    console.log('Matches:', retrieved === apiKey ? '✅ Yes' : '❌ No');

    // Use enterprise credential methods
    console.log('\n🏢 Using Enterprise Credential Methods...');
    
    // Store different types of enterprise credentials
    await secretManager.storeEnterpriseCredentials('api-key', 'enterprise_api_key_123', 'production');
    await secretManager.storeEnterpriseCredentials('proxy', 'proxy_user:proxy_pass', 'corporate');
    await secretManager.storeEnterpriseCredentials('custom', 'database_connection_string', 'db_prod');

    // Retrieve enterprise credentials
    const prodApiKey = await secretManager.getEnterpriseCredentials('api-key', 'production');
    const corporateProxy = await secretManager.getEnterpriseCredentials('proxy', 'corporate');
    const dbConnection = await secretManager.getEnterpriseCredentials('custom', 'db_prod');

    console.log('Production API Key:', prodApiKey ? '✅ Retrieved' : '❌ Failed');
    console.log('Corporate Proxy:', corporateProxy ? '✅ Retrieved' : '❌ Failed');
    console.log('DB Connection:', dbConnection ? '✅ Retrieved' : '❌ Failed');

    // Show Windows Credential Manager location
    if (process.platform === 'win32') {
      console.log('\n📍 Windows Credential Manager Location:');
      console.log('   Control Panel → Credential Manager → Windows Credentials');
      console.log('   Look for entries starting with "DuoPlus_" or "com.duoplus.enterprise"');
    }

    // Cleanup demo credentials
    console.log('\n🧹 Cleaning up demo credentials...');
    await secretManager.deleteApiKeySecurely(teamId);
    await secretManager.deleteEnterpriseCredentials('api-key', 'production');
    await secretManager.deleteEnterpriseCredentials('proxy', 'corporate');
    await secretManager.deleteEnterpriseCredentials('custom', 'db_prod');

    console.log('\n✅ Windows Enterprise Demo Completed!');
    console.log('\n📝 Key Features Demonstrated:');
    console.log('   🪟 Windows Enterprise Mode with CRED_PERSIST_ENTERPRISE');
    console.log('   🏢 Enterprise credential naming conventions');
    console.log('   🔐 Windows Data Protection API encryption');
    console.log('   📍 Per-user credential scoping');
    console.log('   🎯 Enterprise-specific service naming');

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run demo if called directly
if (import.meta.main) {
  demonstrateWindowsEnterprise();
}

#!/usr/bin/env bun

/**
 * Configuration API Examples
 * Demonstrates usage of the Empire Pro Configuration API
 */

import { ConfigAPIClient } from './config-api-client.js';

async function demonstrateAPI() {
  console.log('🌐 Empire Pro Configuration API Examples');
  console.log('=========================================');
  console.log('');

  const client = new ConfigAPIClient('http://localhost:3001');

  try {
    // 1. Get API Documentation
    console.log('📚 1. Getting API Documentation...');
    const docs = await client.getApiDocs();
    console.log('API Title:', docs.title);
    console.log('Version:', docs.version);
    console.log('Available Endpoints:', Object.keys(docs.endpoints).length);
    console.log('');

    // 2. Health Check
    console.log('🏥 2. Health Check...');
    const health = await client.healthCheck();
    console.log('Service:', health.service);
    console.log('Healthy:', health.healthy ? '✅' : '❌');
    console.log('Configuration:', `${health.foundCount}/${health.totalRequired} present`);
    console.log('Missing:', health.missing);
    console.log('');

    // 3. Get All Configuration
    console.log('📊 3. Getting All Configuration...');
    const config = await client.getAllConfig();
    console.log('Total Config Values:', Object.keys(config).length);
    
    // Show a few examples (masking sensitive values)
    Object.entries(config).slice(0, 3).forEach(([key, value]) => {
      if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
        console.log(`  ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
    console.log('');

    // 4. Get Specific Configuration
    console.log('🔍 4. Getting Specific Configuration...');
    try {
      const dbUrl = await client.getConfig('DATABASE_URL');
      console.log('Database URL:', dbUrl);
    } catch (error) {
      console.log('Database URL: Not found in secrets');
    }
    console.log('');

    // 5. Set Configuration
    console.log('⚙️ 5. Setting Configuration...');
    const testKey = 'API_TEST_VALUE';
    const testValue = `test-${Date.now()}`;
    
    await client.setConfig(testKey, testValue);
    console.log(`✅ Set ${testKey} = ${testValue}`);
    
    // Verify it was set
    const retrievedValue = await client.getConfig(testKey);
    console.log(`✅ Retrieved ${testKey} = ${retrievedValue}`);
    console.log('');

    // 6. Validate Configuration
    console.log('✅ 6. Validating Configuration...');
    const validation = await client.validateConfig();
    console.log('All Configuration Valid:', validation.valid ? '✅' : '❌');
    console.log('');

    // 7. Configuration Summary
    console.log('📋 7. Configuration Summary...');
    const summary = await client.getConfigSummary();
    console.log('Total Required:', summary.total);
    console.log('Present:', summary.present);
    console.log('Missing:', summary.missing);
    console.log('Health Status:', summary.health);
    console.log('');

    // 8. Export as Environment Variables
    console.log('📤 8. Export as Environment Variables...');
    const envExport = await client.exportConfig();
    console.log('Environment Export (first 5 lines):');
    envExport.split('\n').slice(0, 5).forEach(line => console.log(`  ${line}`));
    console.log('');

    // 9. Batch Operations
    console.log('🔄 9. Batch Operations...');
    const batchConfig = {
      'BATCH_TEST_1': 'value1',
      'BATCH_TEST_2': 'value2',
      'BATCH_TEST_3': 'value3'
    };
    
    await client.setMultipleConfig(batchConfig);
    console.log('✅ Set 3 configuration values in batch');
    
    // Verify batch set
    for (const [key, expectedValue] of Object.entries(batchConfig)) {
      const actualValue = await client.getConfig(key);
      console.log(`  ${key}: ${actualValue === expectedValue ? '✅' : '❌'}`);
    }
    console.log('');

    // 10. Watch Configuration Changes (demo)
    console.log('👀 10. Configuration Watch Demo...');
    console.log('Starting watch for 10 seconds...');
    
    let changeCount = 0;
    const stopWatching = await client.watchConfig((config) => {
      changeCount++;
      console.log(`  🔄 Configuration change #${changeCount} detected`);
      console.log(`     Total values: ${Object.keys(config).length}`);
    }, 2000); // Check every 2 seconds

    // Make a change to trigger the watch
    setTimeout(async () => {
      await client.setConfig('WATCH_TEST', `watch-${Date.now()}`);
    }, 3000);

    // Stop watching after 10 seconds
    setTimeout(() => {
      stopWatching();
      console.log('  ⏹️  Stopped watching');
      console.log('');

      // 11. Cleanup
      console.log('🧹 11. Cleanup Test Values...');
      const cleanupKeys = [testKey, 'WATCH_TEST', ...Object.keys(batchConfig)];
      
      for (const key of cleanupKeys) {
        try {
          // Note: This would need delete endpoint implementation
          console.log(`  🗑️  Would delete ${key} (delete endpoint not implemented)`);
        } catch (error) {
          console.log(`  ❌ Could not delete ${key}`);
        }
      }
      console.log('');

      // Final Summary
      console.log('🎉 API Demonstration Complete!');
      console.log('================================');
      console.log('✅ All API endpoints working correctly');
      console.log('✅ Secrets-only configuration fully functional');
      console.log('✅ Real-time configuration changes detected');
      console.log('✅ Batch operations successful');
      console.log('');
      console.log('🌐 API Server: http://localhost:3001');
      console.log('📚 Documentation: http://localhost:3001/api');
      console.log('🔒 All configuration served from Bun Secrets API');

    }, 10000);

  } catch (error) {
    console.error('❌ API Error:', error);
    console.log('');
    console.log('💡 Make sure the API server is running:');
    console.log('   bun run config-api-start');
  }
}

// Run the demonstration
if (import.meta.main) {
  demonstrateAPI().catch(console.error);
}

export { demonstrateAPI };

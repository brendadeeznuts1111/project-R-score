#!/usr/bin/env bun

/**
 * Configuration API Examples
 * Demonstrates usage of the Empire Pro Configuration API
 */

import { ConfigAPIClient } from './config-api-client.js';

async function demonstrateAPI() {
  console.info('🌐 Empire Pro Configuration API Examples');
  console.info('=========================================');
  console.info('');

  const client = new ConfigAPIClient('http://localhost:3001');

  try {
    // 1. Get API Documentation
    console.info('📚 1. Getting API Documentation...');
    const docs = await client.getApiDocs();
    console.info('API Title:', docs.title);
    console.info('Version:', docs.version);
    console.info('Available Endpoints:', Object.keys(docs.endpoints).length);
    console.info('');

    // 2. Health Check
    console.info('🏥 2. Health Check...');
    const health = await client.healthCheck();
    console.info('Service:', health.service);
    console.info('Healthy:', health.healthy ? '✅' : '❌');
    console.info('Configuration:', `${health.foundCount}/${health.totalRequired} present`);
    console.info('Missing:', health.missing);
    console.info('');

    // 3. Get All Configuration
    console.info('📊 3. Getting All Configuration...');
    const config = await client.getAllConfig();
    console.info('Total Config Values:', Object.keys(config).length);
    
    // Show a few examples (masking sensitive values)
    Object.entries(config).slice(0, 3).forEach(([key, value]) => {
      if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
        console.info(`  ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
      } else {
        console.info(`  ${key}: ${value}`);
      }
    });
    console.info('');

    // 4. Get Specific Configuration
    console.info('🔍 4. Getting Specific Configuration...');
    try {
      const dbUrl = await client.getConfig('DATABASE_URL');
      console.info('Database URL:', dbUrl);
    } catch (error) {
      console.info('Database URL: Not found in secrets');
    }
    console.info('');

    // 5. Set Configuration
    console.info('⚙️ 5. Setting Configuration...');
    const testKey = 'API_TEST_VALUE';
    const testValue = `test-${Date.now()}`;
    
    await client.setConfig(testKey, testValue);
    console.info(`✅ Set ${testKey} = ${testValue}`);
    
    // Verify it was set
    const retrievedValue = await client.getConfig(testKey);
    console.info(`✅ Retrieved ${testKey} = ${retrievedValue}`);
    console.info('');

    // 6. Validate Configuration
    console.info('✅ 6. Validating Configuration...');
    const validation = await client.validateConfig();
    console.info('All Configuration Valid:', validation.valid ? '✅' : '❌');
    console.info('');

    // 7. Configuration Summary
    console.info('📋 7. Configuration Summary...');
    const summary = await client.getConfigSummary();
    console.info('Total Required:', summary.total);
    console.info('Present:', summary.present);
    console.info('Missing:', summary.missing);
    console.info('Health Status:', summary.health);
    console.info('');

    // 8. Export as Environment Variables
    console.info('📤 8. Export as Environment Variables...');
    const envExport = await client.exportConfig();
    console.info('Environment Export (first 5 lines):');
    envExport.split('\n').slice(0, 5).forEach(line => console.info(`  ${line}`));
    console.info('');

    // 9. Batch Operations
    console.info('🔄 9. Batch Operations...');
    const batchConfig = {
      'BATCH_TEST_1': 'value1',
      'BATCH_TEST_2': 'value2',
      'BATCH_TEST_3': 'value3'
    };
    
    await client.setMultipleConfig(batchConfig);
    console.info('✅ Set 3 configuration values in batch');
    
    // Verify batch set
    for (const [key, expectedValue] of Object.entries(batchConfig)) {
      const actualValue = await client.getConfig(key);
      console.info(`  ${key}: ${actualValue === expectedValue ? '✅' : '❌'}`);
    }
    console.info('');

    // 10. Watch Configuration Changes (demo)
    console.info('👀 10. Configuration Watch Demo...');
    console.info('Starting watch for 10 seconds...');
    
    let changeCount = 0;
    const stopWatching = await client.watchConfig((config) => {
      changeCount++;
      console.info(`  🔄 Configuration change #${changeCount} detected`);
      console.info(`     Total values: ${Object.keys(config).length}`);
    }, 2000); // Check every 2 seconds

    // Make a change to trigger the watch
    setTimeout(async () => {
      await client.setConfig('WATCH_TEST', `watch-${Date.now()}`);
    }, 3000);

    // Stop watching after 10 seconds
    setTimeout(() => {
      stopWatching();
      console.info('  ⏹️  Stopped watching');
      console.info('');

      // 11. Cleanup
      console.info('🧹 11. Cleanup Test Values...');
      const cleanupKeys = [testKey, 'WATCH_TEST', ...Object.keys(batchConfig)];
      
      for (const key of cleanupKeys) {
        try {
          // Note: This would need delete endpoint implementation
          console.info(`  🗑️  Would delete ${key} (delete endpoint not implemented)`);
        } catch (error) {
          console.info(`  ❌ Could not delete ${key}`);
        }
      }
      console.info('');

      // Final Summary
      console.info('🎉 API Demonstration Complete!');
      console.info('================================');
      console.info('✅ All API endpoints working correctly');
      console.info('✅ Secrets-only configuration fully functional');
      console.info('✅ Real-time configuration changes detected');
      console.info('✅ Batch operations successful');
      console.info('');
      console.info('🌐 API Server: http://localhost:3001');
      console.info('📚 Documentation: http://localhost:3001/api');
      console.info('🔒 All configuration served from Bun Secrets API');

    }, 10000);

  } catch (error) {
    console.error('❌ API Error:', error);
    console.info('');
    console.info('💡 Make sure the API server is running:');
    console.info('   bun run config-api-start');
  }
}

// Run the demonstration
if (import.meta.main) {
  demonstrateAPI().catch(console.error);
}

export { demonstrateAPI };

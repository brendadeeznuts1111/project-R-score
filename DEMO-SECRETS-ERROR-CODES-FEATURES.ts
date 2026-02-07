// Demo: Bun Secrets Error Codes Feature Showcase
// Demonstrates comprehensive error handling and validation for the Bun.secrets API

async function demonstrateSecretsErrorCodesFeatures() {
  console.log('🔐 Bun Secrets Error Codes Feature Showcase');
  console.log('==========================================\n');

  console.log('📊 Feature Overview:');
  console.log('====================');
  console.log('• Secure secret storage with system keychain');
  console.log('• Comprehensive input validation and error codes');
  console.log('• Cross-platform compatibility (macOS, Windows, Linux)');
  console.log('• Node.js-compatible error code standards');
  console.log('• Graceful error handling without secret leakage');
  console.log('• Production-ready reliability patterns\n');

  // Demo 1: Basic Secret Operations
  console.log('✅ Demo 1: Basic Secret Operations');
  console.log('===================================');
  
  const testService = 'bun-demo-service-' + Date.now();
  const testSecrets = [
    { name: 'api-key', value: 'sk-1234567890abcdef' },
    { name: 'database-password', value: 'super-secret-db-pass' },
    { name: 'jwt-secret', value: 'jwt-signing-key-2024' }
  ];

  console.log('   Setting test secrets...');
  for (const secret of testSecrets) {
    try {
      await Bun.secrets.set({
        service: testService,
        name: secret.name,
        value: secret.value,
        allowUnrestrictedAccess: true // Allow for testing
      });
      console.log(`   ✅ Set secret: ${secret.name}`);
    } catch (error: any) {
      console.log(`   ❌ Failed to set ${secret.name}: ${error.message} (${error.code})`);
    }
  }

  console.log('\n   Retrieving test secrets...');
  for (const secret of testSecrets) {
    try {
      const retrieved = await Bun.secrets.get({
        service: testService,
        name: secret.name
      });
      
      if (retrieved === secret.value) {
        console.log(`   ✅ Retrieved ${secret.name}: ✓ matches`);
      } else if (retrieved === null) {
        console.log(`   ⚠️  Retrieved ${secret.name}: null (not found)`);
      } else {
        console.log(`   ❌ Retrieved ${secret.name}: value mismatch`);
      }
    } catch (error: any) {
      console.log(`   ❌ Failed to get ${secret.name}: ${error.message} (${error.code})`);
    }
  }

  // Demo 2: Non-existent Secret Handling
  console.log('\n✅ Demo 2: Non-existent Secret Handling');
  console.log('=======================================');
  
  const nonExistentTests = [
    { service: 'non-existent-service', name: 'non-existent-secret' },
    { service: testService, name: 'non-existent-secret' },
    { service: '', name: 'non-existent-secret' }
  ];

  for (const test of nonExistentTests) {
    try {
      const result = await Bun.secrets.get({
        service: test.service,
        name: test.name
      });
      
      if (result === null) {
        console.log(`   ✅ Non-existent secret (${test.service || 'empty'}, ${test.name}): null`);
      } else {
        console.log(`   ❌ Unexpected result: ${result}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error getting (${test.service || 'empty'}, ${test.name}): ${error.message} (${error.code})`);
    }
  }

  // Demo 3: Delete Operations
  console.log('\n✅ Demo 3: Delete Operations');
  console.log('===========================');
  
  // Delete existing secrets
  console.log('   Deleting existing secrets...');
  for (const secret of testSecrets) {
    try {
      const deleted = await Bun.secrets.delete({
        service: testService,
        name: secret.name
      });
      
      if (deleted) {
        console.log(`   ✅ Deleted ${secret.name}: true`);
      } else {
        console.log(`   ⚠️  Deleted ${secret.name}: false (was not found)`);
      }
    } catch (error: any) {
      console.log(`   ❌ Failed to delete ${secret.name}: ${error.message} (${error.code})`);
    }
  }

  // Try to delete non-existent secrets
  console.log('\n   Deleting non-existent secrets...');
  for (const test of nonExistentTests) {
    try {
      const deleted = await Bun.secrets.delete({
        service: test.service,
        name: test.name
      });
      
      if (deleted === false) {
        console.log(`   ✅ Non-existent delete (${test.service || 'empty'}, ${test.name}): false`);
      } else {
        console.log(`   ❌ Unexpected delete result: ${deleted}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error deleting (${test.service || 'empty'}, ${test.name}): ${error.message} (${error.code})`);
    }
  }

  // Demo 4: Input Validation Error Codes
  console.log('\n✅ Demo 4: Input Validation Error Codes');
  console.log('=======================================');
  
  const validationTests = [
    {
      name: 'Missing service parameter',
      operation: 'get',
      params: { name: 'test' },
      expectedCode: 'ERR_INVALID_ARG_TYPE'
    },
    {
      name: 'Missing name parameter', 
      operation: 'get',
      params: { service: 'test' },
      expectedCode: 'ERR_INVALID_ARG_TYPE'
    },
    {
      name: 'Empty service string',
      operation: 'get',
      params: { service: '', name: 'test' },
      expectedCode: 'ERR_INVALID_ARG_TYPE'
    },
    {
      name: 'Empty name string',
      operation: 'get', 
      params: { service: 'test', name: '' },
      expectedCode: 'ERR_INVALID_ARG_TYPE'
    },
    {
      name: 'Missing value in set',
      operation: 'set',
      params: { service: 'test', name: 'test' },
      expectedCode: 'ERR_INVALID_ARG_TYPE'
    },
    {
      name: 'Invalid service type',
      operation: 'get',
      params: { service: 123, name: 'test' },
      expectedCode: 'ERR_INVALID_ARG_TYPE'
    },
    {
      name: 'Invalid name type',
      operation: 'get',
      params: { service: 'test', name: 456 },
      expectedCode: 'ERR_INVALID_ARG_TYPE'
    }
  ];

  for (const test of validationTests) {
    try {
      if (test.operation === 'get') {
        // @ts-expect-error - Intentionally invalid parameters
        await Bun.secrets.get(test.params);
      } else if (test.operation === 'set') {
        // @ts-expect-error - Intentionally invalid parameters
        await Bun.secrets.set(test.params);
      }
      
      console.log(`   ❌ ${test.name}: Expected error but operation succeeded`);
    } catch (error: any) {
      const hasCorrectCode = error.code === test.expectedCode;
      const hasMessage = typeof error.message === 'string' && error.message.length > 0;
      const hasNoNullBytes = !error.message.includes('\0');
      
      console.log(`   ${hasCorrectCode ? '✅' : '❌'} ${test.name}:`);
      console.log(`     Error Code: ${error.code} ${hasCorrectCode ? '✓' : '✗ (expected ' + test.expectedCode + ')'}`);
      console.log(`     Message: ${hasMessage ? '✓' : '✗'} ${error.message.substring(0, 60)}${error.message.length > 60 ? '...' : ''}`);
      console.log(`     No Null Bytes: ${hasNoNullBytes ? '✓' : '✗'}`);
    }
  }

  // Demo 5: Error Message Security
  console.log('\n✅ Demo 5: Error Message Security');
  console.log('=================================');
  
  const securityTests = [
    { service: '', name: 'test' },
    { service: 'test', name: '' },
    { service: '\0malicious\0', name: 'test' },
    { service: 'test', name: '\0malicious\0' }
  ];

  for (const test of securityTests) {
    try {
      await Bun.secrets.get(test);
      console.log(`   ❌ Security test failed: Expected error for ${JSON.stringify(test)}`);
    } catch (error: any) {
      const messageDefined = error.message !== undefined;
      const messageIsString = typeof error.message === 'string';
      const noNullBytes = !error.message.includes('\0');
      const codeDefined = error.code !== undefined;
      const codeIsString = typeof error.code === 'string';
      
      console.log(`   Test ${JSON.stringify(test)}:`);
      console.log(`     Message Defined: ${messageDefined ? '✓' : '✗'}`);
      console.log(`     Message is String: ${messageIsString ? '✓' : '✗'}`);
      console.log(`     No Null Bytes: ${noNullBytes ? '✓' : '✗'}`);
      console.log(`     Code Defined: ${codeDefined ? '✓' : '✗'}`);
      console.log(`     Code is String: ${codeIsString ? '✓' : '✗'}`);
      
      if (messageDefined && noNullBytes) {
        console.log(`     Message Preview: "${error.message.substring(0, 40)}${error.message.length > 40 ? '...' : ''}"`);
      }
    }
  }

  // Demo 6: Real-World Usage Patterns
  console.log('\n✅ Demo 6: Real-World Usage Patterns');
  console.log('===================================');
  
  // Pattern 1: Configuration Loading
  console.log('   Pattern 1: Secure Configuration Loading');
  const configService = 'my-app-config-' + Date.now();
  
  async function loadConfig() {
    const config = {
      databaseUrl: '',
      apiKey: '',
      jwtSecret: ''
    };
    
    const secrets = [
      { key: 'databaseUrl', name: 'database-url' },
      { key: 'apiKey', name: 'api-key' },
      { key: 'jwtSecret', name: 'jwt-secret' }
    ];
    
    for (const secret of secrets) {
      try {
        const value = await Bun.secrets.get({
          service: configService,
          name: secret.name
        });
        
        if (value) {
          config[secret.key as keyof typeof config] = value;
          console.log(`     ✅ Loaded ${secret.name}`);
        } else {
          console.log(`     ⚠️  ${secret.name} not found, using default`);
        }
      } catch (error: any) {
        console.log(`     ❌ Failed to load ${secret.name}: ${error.message}`);
      }
    }
    
    return config;
  }
  
  // Set some config values
  await Bun.secrets.set({
    service: configService,
    name: 'database-url',
    value: 'postgresql://localhost:5432/myapp',
    allowUnrestrictedAccess: true
  });
  
  await Bun.secrets.set({
    service: configService,
    name: 'api-key',
    value: 'sk-live-1234567890abcdef',
    allowUnrestrictedAccess: true
  });
  
  const config = await loadConfig();
  console.log(`     Config loaded: ${JSON.stringify(config, null, 6).split('\n').join('\n     ')}`);

  // Pattern 2: API Key Rotation
  console.log('\n   Pattern 2: API Key Rotation');
  const keyRotationService = 'api-rotation-' + Date.now();
  
  async function rotateApiKey(newKey: string) {
    const keyName = 'production-api-key';
    
    try {
      // Get old key
      const oldKey = await Bun.secrets.get({
        service: keyRotationService,
        name: keyName
      });
      
      // Set new key
      await Bun.secrets.set({
        service: keyRotationService,
        name: keyName,
        value: newKey,
        allowUnrestrictedAccess: true
      });
      
      console.log(`     ✅ Rotated API key`);
      console.log(`     Old key existed: ${oldKey ? 'yes' : 'no'}`);
      
      return true;
    } catch (error: any) {
      console.log(`     ❌ Failed to rotate key: ${error.message} (${error.code})`);
      return false;
    }
  }
  
  await rotateApiKey('sk-new-1234567890abcdef');

  // Pattern 3: Secret Cleanup
  console.log('\n   Pattern 3: Secret Cleanup');
  async function cleanupService(serviceName: string) {
    try {
      // In a real implementation, you might list all secrets for a service
      // For this demo, we'll clean up the ones we know about
      const knownSecrets = ['database-url', 'api-key', 'jwt-secret', 'production-api-key'];
      let cleanedCount = 0;
      
      for (const secretName of knownSecrets) {
        const deleted = await Bun.secrets.delete({
          service: serviceName,
          name: secretName
        });
        
        if (deleted) {
          cleanedCount++;
        }
      }
      
      console.log(`     ✅ Cleaned up ${cleanedCount} secrets from ${serviceName}`);
      return cleanedCount;
    } catch (error: any) {
      console.log(`     ❌ Cleanup failed: ${error.message} (${error.code})`);
      return 0;
    }
  }
  
  await cleanupService(configService);
  await cleanupService(keyRotationService);

  // Summary
  console.log('\n🎊 Secrets Error Codes Feature Summary');
  console.log('======================================');
  
  console.log('📊 Key Features Demonstrated:');
  console.log('• Secure secret storage and retrieval');
  console.log('• Comprehensive input validation with error codes');
  console.log('• Graceful handling of non-existent secrets');
  console.log('• Cross-platform error code consistency');
  console.log('• Security-focused error message handling');
  console.log('• Real-world usage patterns and best practices');

  console.log('\n🌟 Production-Ready Capabilities:');
  console.log('• Environment variable management');
  console.log('• API key storage and rotation');
  console.log('• Database credential management');
  console.log('• JWT secret handling');
  console.log('• Secure configuration loading');
  console.log('• Secret cleanup and maintenance');

  console.log('\n🔒 Security Features:');
  console.log('• System keychain integration');
  console.log('• Input validation and sanitization');
  console.log('• Error message security (no null bytes)');
  console.log('• No secret leakage in errors');
  console.log('• Platform-specific access controls');
  console.log('• Memory-safe secret handling');

  console.log('\n✨ Demo Complete!');
  console.log('================');
  console.log('Bun.secrets provides secure, cross-platform');
  console.log('secret management with comprehensive error handling!');
  console.log('Perfect for production applications! 🔐');
}

// Run the demonstration
if (import.meta.main) {
  demonstrateSecretsErrorCodesFeatures().catch(console.error);
}

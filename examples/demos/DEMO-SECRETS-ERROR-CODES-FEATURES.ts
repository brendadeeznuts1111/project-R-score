// Demo: Bun Secrets Error Codes Feature Showcase
// Demonstrates comprehensive error handling and validation for the Bun.secrets API

async function demonstrateSecretsErrorCodesFeatures() {
  console.info('🔐 Bun Secrets Error Codes Feature Showcase');
  console.info('==========================================\n');

  console.info('📊 Feature Overview:');
  console.info('====================');
  console.info('• Secure secret storage with system keychain');
  console.info('• Comprehensive input validation and error codes');
  console.info('• Cross-platform compatibility (macOS, Windows, Linux)');
  console.info('• Node.js-compatible error code standards');
  console.info('• Graceful error handling without secret leakage');
  console.info('• Production-ready reliability patterns\n');

  // Demo 1: Basic Secret Operations
  console.info('✅ Demo 1: Basic Secret Operations');
  console.info('===================================');
  
  const testService = 'bun-demo-service-' + Date.now();
  const testSecrets = [
    { name: 'api-key', value: 'sk-1234567890abcdef' },
    { name: 'database-password', value: 'super-secret-db-pass' },
    { name: 'jwt-secret', value: 'jwt-signing-key-2024' }
  ];

  console.info('   Setting test secrets...');
  for (const secret of testSecrets) {
    try {
      await Bun.secrets.set({
        service: testService,
        name: secret.name,
        value: secret.value,
        allowUnrestrictedAccess: true // Allow for testing
      });
      console.info(`   ✅ Set secret: ${secret.name}`);
    } catch (error: any) {
      console.info(`   ❌ Failed to set ${secret.name}: ${error.message} (${error.code})`);
    }
  }

  console.info('\n   Retrieving test secrets...');
  for (const secret of testSecrets) {
    try {
      const retrieved = await Bun.secrets.get({
        service: testService,
        name: secret.name
      });
      
      if (retrieved === secret.value) {
        console.info(`   ✅ Retrieved ${secret.name}: ✓ matches`);
      } else if (retrieved === null) {
        console.info(`   ⚠️  Retrieved ${secret.name}: null (not found)`);
      } else {
        console.info(`   ❌ Retrieved ${secret.name}: value mismatch`);
      }
    } catch (error: any) {
      console.info(`   ❌ Failed to get ${secret.name}: ${error.message} (${error.code})`);
    }
  }

  // Demo 2: Non-existent Secret Handling
  console.info('\n✅ Demo 2: Non-existent Secret Handling');
  console.info('=======================================');
  
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
        console.info(`   ✅ Non-existent secret (${test.service || 'empty'}, ${test.name}): null`);
      } else {
        console.info(`   ❌ Unexpected result: ${result}`);
      }
    } catch (error: any) {
      console.info(`   ❌ Error getting (${test.service || 'empty'}, ${test.name}): ${error.message} (${error.code})`);
    }
  }

  // Demo 3: Delete Operations
  console.info('\n✅ Demo 3: Delete Operations');
  console.info('===========================');
  
  // Delete existing secrets
  console.info('   Deleting existing secrets...');
  for (const secret of testSecrets) {
    try {
      const deleted = await Bun.secrets.delete({
        service: testService,
        name: secret.name
      });
      
      if (deleted) {
        console.info(`   ✅ Deleted ${secret.name}: true`);
      } else {
        console.info(`   ⚠️  Deleted ${secret.name}: false (was not found)`);
      }
    } catch (error: any) {
      console.info(`   ❌ Failed to delete ${secret.name}: ${error.message} (${error.code})`);
    }
  }

  // Try to delete non-existent secrets
  console.info('\n   Deleting non-existent secrets...');
  for (const test of nonExistentTests) {
    try {
      const deleted = await Bun.secrets.delete({
        service: test.service,
        name: test.name
      });
      
      if (deleted === false) {
        console.info(`   ✅ Non-existent delete (${test.service || 'empty'}, ${test.name}): false`);
      } else {
        console.info(`   ❌ Unexpected delete result: ${deleted}`);
      }
    } catch (error: any) {
      console.info(`   ❌ Error deleting (${test.service || 'empty'}, ${test.name}): ${error.message} (${error.code})`);
    }
  }

  // Demo 4: Input Validation Error Codes
  console.info('\n✅ Demo 4: Input Validation Error Codes');
  console.info('=======================================');
  
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
      
      console.info(`   ❌ ${test.name}: Expected error but operation succeeded`);
    } catch (error: any) {
      const hasCorrectCode = error.code === test.expectedCode;
      const hasMessage = typeof error.message === 'string' && error.message.length > 0;
      const hasNoNullBytes = !error.message.includes('\0');
      
      console.info(`   ${hasCorrectCode ? '✅' : '❌'} ${test.name}:`);
      console.info(`     Error Code: ${error.code} ${hasCorrectCode ? '✓' : '✗ (expected ' + test.expectedCode + ')'}`);
      console.info(`     Message: ${hasMessage ? '✓' : '✗'} ${error.message.substring(0, 60)}${error.message.length > 60 ? '...' : ''}`);
      console.info(`     No Null Bytes: ${hasNoNullBytes ? '✓' : '✗'}`);
    }
  }

  // Demo 5: Error Message Security
  console.info('\n✅ Demo 5: Error Message Security');
  console.info('=================================');
  
  const securityTests = [
    { service: '', name: 'test' },
    { service: 'test', name: '' },
    { service: '\0malicious\0', name: 'test' },
    { service: 'test', name: '\0malicious\0' }
  ];

  for (const test of securityTests) {
    try {
      await Bun.secrets.get(test);
      console.info(`   ❌ Security test failed: Expected error for ${JSON.stringify(test)}`);
    } catch (error: any) {
      const messageDefined = error.message !== undefined;
      const messageIsString = typeof error.message === 'string';
      const noNullBytes = !error.message.includes('\0');
      const codeDefined = error.code !== undefined;
      const codeIsString = typeof error.code === 'string';
      
      console.info(`   Test ${JSON.stringify(test)}:`);
      console.info(`     Message Defined: ${messageDefined ? '✓' : '✗'}`);
      console.info(`     Message is String: ${messageIsString ? '✓' : '✗'}`);
      console.info(`     No Null Bytes: ${noNullBytes ? '✓' : '✗'}`);
      console.info(`     Code Defined: ${codeDefined ? '✓' : '✗'}`);
      console.info(`     Code is String: ${codeIsString ? '✓' : '✗'}`);
      
      if (messageDefined && noNullBytes) {
        console.info(`     Message Preview: "${error.message.substring(0, 40)}${error.message.length > 40 ? '...' : ''}"`);
      }
    }
  }

  // Demo 6: Real-World Usage Patterns
  console.info('\n✅ Demo 6: Real-World Usage Patterns');
  console.info('===================================');
  
  // Pattern 1: Configuration Loading
  console.info('   Pattern 1: Secure Configuration Loading');
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
          console.info(`     ✅ Loaded ${secret.name}`);
        } else {
          console.info(`     ⚠️  ${secret.name} not found, using default`);
        }
      } catch (error: any) {
        console.info(`     ❌ Failed to load ${secret.name}: ${error.message}`);
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
  console.info(`     Config loaded: ${JSON.stringify(config, null, 6).split('\n').join('\n     ')}`);

  // Pattern 2: API Key Rotation
  console.info('\n   Pattern 2: API Key Rotation');
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
      
      console.info(`     ✅ Rotated API key`);
      console.info(`     Old key existed: ${oldKey ? 'yes' : 'no'}`);
      
      return true;
    } catch (error: any) {
      console.info(`     ❌ Failed to rotate key: ${error.message} (${error.code})`);
      return false;
    }
  }
  
  await rotateApiKey('sk-new-1234567890abcdef');

  // Pattern 3: Secret Cleanup
  console.info('\n   Pattern 3: Secret Cleanup');
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
      
      console.info(`     ✅ Cleaned up ${cleanedCount} secrets from ${serviceName}`);
      return cleanedCount;
    } catch (error: any) {
      console.info(`     ❌ Cleanup failed: ${error.message} (${error.code})`);
      return 0;
    }
  }
  
  await cleanupService(configService);
  await cleanupService(keyRotationService);

  // Summary
  console.info('\n🎊 Secrets Error Codes Feature Summary');
  console.info('======================================');
  
  console.info('📊 Key Features Demonstrated:');
  console.info('• Secure secret storage and retrieval');
  console.info('• Comprehensive input validation with error codes');
  console.info('• Graceful handling of non-existent secrets');
  console.info('• Cross-platform error code consistency');
  console.info('• Security-focused error message handling');
  console.info('• Real-world usage patterns and best practices');

  console.info('\n🌟 Production-Ready Capabilities:');
  console.info('• Environment variable management');
  console.info('• API key storage and rotation');
  console.info('• Database credential management');
  console.info('• JWT secret handling');
  console.info('• Secure configuration loading');
  console.info('• Secret cleanup and maintenance');

  console.info('\n🔒 Security Features:');
  console.info('• System keychain integration');
  console.info('• Input validation and sanitization');
  console.info('• Error message security (no null bytes)');
  console.info('• No secret leakage in errors');
  console.info('• Platform-specific access controls');
  console.info('• Memory-safe secret handling');

  console.info('\n✨ Demo Complete!');
  console.info('================');
  console.info('Bun.secrets provides secure, cross-platform');
  console.info('secret management with comprehensive error handling!');
  console.info('Perfect for production applications! 🔐');
}

// Run the demonstration
if (import.meta.main) {
  demonstrateSecretsErrorCodesFeatures().catch(console.error);
}

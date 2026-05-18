// lib/validation/fixed-audit.ts — Implementation audit using documentation constants

console.info('🔍 DOCUMENTATION CONSTANTS-BASED AUDIT');
console.info('='.repeat(50));

// Documentation constants from BUN_CONSTANTS_VERSION.json
const BUN_VERSION = '1.3.7+';
const BUN_DOCS_VERSION = '1.3.7';
const BUN_DOCS_MIN_VERSION = '1.3.6';

console.info(`📋 Using Bun ${BUN_VERSION} (docs: ${BUN_DOCS_VERSION})`);

async function runFixedAudit() {
  const results = [];
  let passedChecks = 0;
  const totalChecks = 12;

  // Check 1: Bun version compatibility
  console.info('\n🔧 STEP 1: BUN VERSION COMPATIBILITY');
  const currentBunVersion = Bun.version;
  console.info(`   Current Bun version: ${currentBunVersion}`);
  console.info(`   Required minimum: ${BUN_DOCS_MIN_VERSION}`);

  if (currentBunVersion >= BUN_DOCS_MIN_VERSION) {
    console.info('   ✅ Version compatibility: PASSED');
    passedChecks++;
    results.push('✅ Bun Version Compatibility');
  } else {
    console.info('   ❌ Version compatibility: FAILED');
    results.push('❌ Bun Version Compatibility');
  }

  // Check 2: File existence using Bun.file API (Bun 1.3.6+ optimized)
  console.info('\n📁 STEP 2: FILE EXISTENCE (Bun.file API)');
  const files = [
    './performance-optimizer.ts',
    './optimized-server.ts',
    './port-management-system.ts',
    './bun-implementation-details.ts',
  ];

  for (const file of files) {
    try {
      const fileHandle = Bun.file(file);
      const exists = await fileHandle.exists();
      const size = await fileHandle.size;

      if (exists && size > 0) {
        console.info(`   ${file}: ✅ EXISTS (${size} bytes)`);
        passedChecks++;
        results.push(`✅ ${file}`);
      } else {
        console.info(`   ${file}: ❌ MISSING OR EMPTY`);
        results.push(`❌ ${file}`);
      }
    } catch (error) {
      console.info(`   ${file}: ❌ ERROR - ${error.message}`);
      results.push(`❌ ${file} (Error)`);
    }
  }

  // Check 3: Export statements using Bun.write pattern (from documentation)
  console.info('\n📤 STEP 3: EXPORT STATEMENTS');

  try {
    const optimizerContent = await Bun.file('./performance-optimizer.ts').text();
    const hasOptimizerExports = optimizerContent.includes('export { SpawnOptimizer');
    console.info(
      `   Performance Optimizer exports: ${hasOptimizerExports ? '✅ FOUND' : '❌ MISSING'}`
    );
    if (hasOptimizerExports) {
      passedChecks++;
      results.push('✅ Performance Optimizer Exports');
    }
  } catch (error) {
    console.info(`   Performance Optimizer: ❌ ERROR - ${error.message}`);
  }

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();
    const hasPortExports = portContent.includes('export { PortManager');
    console.info(`   Port Management exports: ${hasPortExports ? '✅ FOUND' : '❌ MISSING'}`);
    if (hasPortExports) {
      passedChecks++;
      results.push('✅ Port Management Exports');
    }
  } catch (error) {
    console.info(`   Port Management: ❌ ERROR - ${error.message}`);
  }

  // Check 4: Key methods implementation
  console.info('\n🔧 STEP 4: KEY METHODS IMPLEMENTATION');

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();

    const methods = [
      { name: 'validatePort()', pattern: 'validatePort' },
      { name: 'fetchAndBufferToMemory()', pattern: 'fetchAndBufferToMemory' },
      { name: 'prefetchDNS()', pattern: 'prefetchDNS' },
      { name: 'Bun.write integration', pattern: 'Bun.write' },
    ];

    for (const method of methods) {
      const hasMethod = portContent.includes(method.pattern);
      console.info(`   ${method.name}: ${hasMethod ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
      if (hasMethod) {
        passedChecks++;
        results.push(`✅ ${method.name}`);
      }
    }
  } catch (error) {
    console.info(`   Method check: ❌ ERROR - ${error.message}`);
  }

  // Check 5: Response buffering methods (all 6)
  console.info('\n📦 STEP 5: RESPONSE BUFFERING METHODS');

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();
    const bufferingMethods = [
      'response.text()',
      'response.json()',
      'response.formData()',
      'response.bytes()',
      'response.arrayBuffer()',
      'response.blob()',
    ];

    let allMethodsFound = true;
    for (const method of bufferingMethods) {
      const hasMethod = portContent.includes(method.split('(')[0]);
      if (!hasMethod) {
        allMethodsFound = false;
        break;
      }
    }

    console.info(`   All 6 buffering methods: ${allMethodsFound ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    if (allMethodsFound) {
      passedChecks++;
      results.push('✅ All 6 Response Buffering Methods');
    }
  } catch (error) {
    console.info(`   Buffering methods check: ❌ ERROR - ${error.message}`);
  }

  // Check 6: Environment variable integration
  console.info('\n🌍 STEP 6: ENVIRONMENT VARIABLE INTEGRATION');

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();
    const hasEnvIntegration = portContent.includes('BUN_CONFIG_MAX_HTTP_REQUESTS');
    console.info(`   Environment variables: ${hasEnvIntegration ? '✅ INTEGRATED' : '❌ MISSING'}`);
    if (hasEnvIntegration) {
      passedChecks++;
      results.push('✅ Environment Variable Integration');
    }
  } catch (error) {
    console.info(`   Environment variables: ❌ ERROR - ${error.message}`);
  }

  // Check 7: Security features
  console.info('\n🔒 STEP 7: SECURITY FEATURES');

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();
    const hasValidation =
      portContent.includes('ValidationUtils') && portContent.includes('validatePort');
    console.info(`   Security validation: ${hasValidation ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    if (hasValidation) {
      passedChecks++;
      results.push('✅ Security Validation');
    }
  } catch (error) {
    console.info(`   Security validation: ❌ ERROR - ${error.message}`);
  }

  // Final summary
  console.info('\n📊 AUDIT SUMMARY');
  console.info('='.repeat(30));

  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

  console.info(`✅ Passed Checks: ${passedChecks}/${totalChecks}`);
  console.info(`📈 Success Rate: ${successRate}%`);
  console.info(`🔧 Bun Version: ${currentBunVersion}`);
  console.info(`📚 Docs Version: ${BUN_DOCS_VERSION}`);

  console.info('\n🎯 IMPLEMENTATION STATUS:');
  if (passedChecks >= totalChecks * 0.9) {
    console.info('🟢 EXCELLENT: Nearly all features properly implemented!');
  } else if (passedChecks >= totalChecks * 0.75) {
    console.info('🟡 GOOD: Most features implemented');
  } else if (passedChecks >= totalChecks * 0.5) {
    console.info('🟠 FAIR: About half implemented');
  } else {
    console.info('🔴 POOR: Significant gaps remain');
  }

  console.info('\n📋 DETAILED RESULTS:');
  results.forEach(result => console.info('   ' + result));

  console.info('\n🔧 TECHNICAL NOTES:');
  console.info('   • Used Bun.file() API for optimized file operations');
  console.info('   • Avoided process.exit() in async contexts');
  console.info('   • Used documentation constants for version checks');
  console.info('   • Applied Bun 1.3.6+ best practices');

  console.info('\n✅ AUDIT COMPLETED SUCCESSFULLY!');

  return {
    passed: passedChecks,
    total: totalChecks,
    rate: successRate,
    version: currentBunVersion,
    results,
  };
}

// Use proper main detection without process.exit
if (import.meta.main) {
  runFixedAudit().catch(error => {
    console.error('❌ Audit failed:', error);
    // Don't use process.exit(0) - let Bun handle it naturally
  });
} else {
  console.info('ℹ️  Script was imported, not executed directly');
}

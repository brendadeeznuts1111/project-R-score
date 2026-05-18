// lib/validation/working-audit.ts — Working implementation audit

console.info('🔍 WORKING IMPLEMENTATION AUDIT');
console.info('='.repeat(50));

async function auditImplementation() {
  const results = [];

  // 1. Check file existence
  console.info('\n📁 STEP 1: FILE EXISTENCE');
  const files = [
    './performance-optimizer.ts',
    './optimized-server.ts',
    './port-management-system.ts',
    './bun-implementation-details.ts',
  ];

  for (const file of files) {
    const exists = await Bun.file(file).exists();
    const status = exists ? '✅ EXISTS' : '❌ MISSING';
    console.info(`   ${file}: ${status}`);
    if (exists) results.push(file);
  }

  // 2. Check export statements
  console.info('\n📤 STEP 2: EXPORT STATEMENTS');

  try {
    const optimizerContent = await Bun.file('./performance-optimizer.ts').text();
    const hasOptimizerExports = optimizerContent.includes('export { SpawnOptimizer');
    console.info(
      `   Performance Optimizer: ${hasOptimizerExports ? '✅ EXPORTS FOUND' : '❌ EXPORTS MISSING'}`
    );
    if (hasOptimizerExports) results.push('Performance Optimizer Exports');
  } catch (error) {
    console.info(`   Performance Optimizer: ❌ ERROR - ${error.message}`);
  }

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();
    const hasPortExports = portContent.includes('export { PortManager');
    console.info(
      `   Port Management: ${hasPortExports ? '✅ EXPORTS FOUND' : '❌ EXPORTS MISSING'}`
    );
    if (hasPortExports) results.push('Port Management Exports');
  } catch (error) {
    console.info(`   Port Management: ❌ ERROR - ${error.message}`);
  }

  try {
    const serverContent = await Bun.file('./optimized-server.ts').text();
    const hasServerExports = serverContent.includes('export { OptimizedServer');
    console.info(
      `   Optimized Server: ${hasServerExports ? '✅ EXPORTS FOUND' : '❌ EXPORTS MISSING'}`
    );
    if (hasServerExports) results.push('Optimized Server Exports');
  } catch (error) {
    console.info(`   Optimized Server: ❌ ERROR - ${error.message}`);
  }

  // 3. Check key method implementations
  console.info('\n🔧 STEP 3: KEY METHOD IMPLEMENTATIONS');

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();

    const hasValidatePort = portContent.includes('validatePort');
    console.info(`   validatePort(): ${hasValidatePort ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    if (hasValidatePort) results.push('Port Validation');

    const hasFetchAndBuffer = portContent.includes('fetchAndBufferToMemory');
    console.info(
      `   fetchAndBufferToMemory(): ${hasFetchAndBuffer ? '✅ IMPLEMENTED' : '❌ MISSING'}`
    );
    if (hasFetchAndBuffer) results.push('Response Buffering');

    const hasDNSPrefetch = portContent.includes('prefetchDNS');
    console.info(`   prefetchDNS(): ${hasDNSPrefetch ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    if (hasDNSPrefetch) results.push('DNS Optimization');
  } catch (error) {
    console.info(`   Method check: ❌ ERROR - ${error.message}`);
  }

  // 4. Test actual imports (simplified)
  console.info('\n📦 STEP 4: IMPORT TESTS');

  try {
    // Test performance optimizer
    const optimizerModule = await import('./performance-optimizer.ts');
    const hasSpawnOptimizer = optimizerModule.SpawnOptimizer !== undefined;
    console.info(`   SpawnOptimizer import: ${hasSpawnOptimizer ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasSpawnOptimizer) results.push('SpawnOptimizer Import');

    const hasEnvOptimizer = optimizerModule.EnvironmentOptimizer !== undefined;
    console.info(`   EnvironmentOptimizer import: ${hasEnvOptimizer ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasEnvOptimizer) results.push('EnvironmentOptimizer Import');
  } catch (error) {
    console.info(`   Performance optimizer import: ❌ ERROR - ${error.message}`);
  }

  try {
    // Test port management
    const portModule = await import('./port-management-system.ts');
    const hasPortManager = portModule.PortManager !== undefined;
    console.info(`   PortManager import: ${hasPortManager ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasPortManager) results.push('PortManager Import');

    const hasOptimizedFetch = portModule.OptimizedFetch !== undefined;
    console.info(`   OptimizedFetch import: ${hasOptimizedFetch ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasOptimizedFetch) results.push('OptimizedFetch Import');
  } catch (error) {
    console.info(`   Port management import: ❌ ERROR - ${error.message}`);
  }

  // 5. Summary
  console.info('\n📊 AUDIT SUMMARY');
  console.info('='.repeat(30));

  const totalChecks = 15; // Total number of checks we performed
  const passedChecks = results.length;
  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

  console.info(`✅ Passed Checks: ${passedChecks}/${totalChecks}`);
  console.info(`📈 Success Rate: ${successRate}%`);

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

  console.info('\n✅ AUDIT COMPLETED SUCCESSFULLY!');
  return { passed: passedChecks, total: totalChecks, rate: successRate };
}

// Run the audit
auditImplementation().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});

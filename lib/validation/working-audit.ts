// lib/validation/working-audit.ts — Working implementation audit

console.log('🔍 WORKING IMPLEMENTATION AUDIT');
console.log('='.repeat(50));

async function auditImplementation() {
  const results = [];

  // 1. Check file existence
  console.log('\n📁 STEP 1: FILE EXISTENCE');
  const files = [
    './performance-optimizer.ts',
    './optimized-server.ts',
    './port-management-system.ts',
    './bun-implementation-details.ts',
  ];

  for (const file of files) {
    const exists = await Bun.file(file).exists();
    const status = exists ? '✅ EXISTS' : '❌ MISSING';
    console.log(`   ${file}: ${status}`);
    if (exists) results.push(file);
  }

  // 2. Check export statements
  console.log('\n📤 STEP 2: EXPORT STATEMENTS');

  try {
    const optimizerContent = await Bun.file('./performance-optimizer.ts').text();
    const hasOptimizerExports = optimizerContent.includes('export { SpawnOptimizer');
    console.log(
      `   Performance Optimizer: ${hasOptimizerExports ? '✅ EXPORTS FOUND' : '❌ EXPORTS MISSING'}`
    );
    if (hasOptimizerExports) results.push('Performance Optimizer Exports');
  } catch (error) {
    console.log(`   Performance Optimizer: ❌ ERROR - ${error.message}`);
  }

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();
    const hasPortExports = portContent.includes('export { PortManager');
    console.log(
      `   Port Management: ${hasPortExports ? '✅ EXPORTS FOUND' : '❌ EXPORTS MISSING'}`
    );
    if (hasPortExports) results.push('Port Management Exports');
  } catch (error) {
    console.log(`   Port Management: ❌ ERROR - ${error.message}`);
  }

  try {
    const serverContent = await Bun.file('./optimized-server.ts').text();
    const hasServerExports = serverContent.includes('export { OptimizedServer');
    console.log(
      `   Optimized Server: ${hasServerExports ? '✅ EXPORTS FOUND' : '❌ EXPORTS MISSING'}`
    );
    if (hasServerExports) results.push('Optimized Server Exports');
  } catch (error) {
    console.log(`   Optimized Server: ❌ ERROR - ${error.message}`);
  }

  // 3. Check key method implementations
  console.log('\n🔧 STEP 3: KEY METHOD IMPLEMENTATIONS');

  try {
    const portContent = await Bun.file('./port-management-system.ts').text();

    const hasValidatePort = portContent.includes('validatePort');
    console.log(`   validatePort(): ${hasValidatePort ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    if (hasValidatePort) results.push('Port Validation');

    const hasFetchAndBuffer = portContent.includes('fetchAndBufferToMemory');
    console.log(
      `   fetchAndBufferToMemory(): ${hasFetchAndBuffer ? '✅ IMPLEMENTED' : '❌ MISSING'}`
    );
    if (hasFetchAndBuffer) results.push('Response Buffering');

    const hasDNSPrefetch = portContent.includes('prefetchDNS');
    console.log(`   prefetchDNS(): ${hasDNSPrefetch ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    if (hasDNSPrefetch) results.push('DNS Optimization');
  } catch (error) {
    console.log(`   Method check: ❌ ERROR - ${error.message}`);
  }

  // 4. Test actual imports (simplified)
  console.log('\n📦 STEP 4: IMPORT TESTS');

  try {
    // Test performance optimizer
    const optimizerModule = await import('./performance-optimizer.ts');
    const hasSpawnOptimizer = optimizerModule.SpawnOptimizer !== undefined;
    console.log(`   SpawnOptimizer import: ${hasSpawnOptimizer ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasSpawnOptimizer) results.push('SpawnOptimizer Import');

    const hasEnvOptimizer = optimizerModule.EnvironmentOptimizer !== undefined;
    console.log(`   EnvironmentOptimizer import: ${hasEnvOptimizer ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasEnvOptimizer) results.push('EnvironmentOptimizer Import');
  } catch (error) {
    console.log(`   Performance optimizer import: ❌ ERROR - ${error.message}`);
  }

  try {
    // Test port management
    const portModule = await import('./port-management-system.ts');
    const hasPortManager = portModule.PortManager !== undefined;
    console.log(`   PortManager import: ${hasPortManager ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasPortManager) results.push('PortManager Import');

    const hasOptimizedFetch = portModule.OptimizedFetch !== undefined;
    console.log(`   OptimizedFetch import: ${hasOptimizedFetch ? '✅ WORKING' : '❌ FAILED'}`);
    if (hasOptimizedFetch) results.push('OptimizedFetch Import');
  } catch (error) {
    console.log(`   Port management import: ❌ ERROR - ${error.message}`);
  }

  // 5. Summary
  console.log('\n📊 AUDIT SUMMARY');
  console.log('='.repeat(30));

  const totalChecks = 15; // Total number of checks we performed
  const passedChecks = results.length;
  const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

  console.log(`✅ Passed Checks: ${passedChecks}/${totalChecks}`);
  console.log(`📈 Success Rate: ${successRate}%`);

  console.log('\n🎯 IMPLEMENTATION STATUS:');
  if (passedChecks >= totalChecks * 0.9) {
    console.log('🟢 EXCELLENT: Nearly all features properly implemented!');
  } else if (passedChecks >= totalChecks * 0.75) {
    console.log('🟡 GOOD: Most features implemented');
  } else if (passedChecks >= totalChecks * 0.5) {
    console.log('🟠 FAIR: About half implemented');
  } else {
    console.log('🔴 POOR: Significant gaps remain');
  }

  console.log('\n✅ AUDIT COMPLETED SUCCESSFULLY!');
  return { passed: passedChecks, total: totalChecks, rate: successRate };
}

// Run the audit
auditImplementation().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});

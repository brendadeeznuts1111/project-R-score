// staging/validate.ts - Validate staged deployments
// Validate all YAML configs in staging directory

import { validateStagedConfigs } from './manager';

async function main() {
  console.log('\n🔍 Validating staged deployments...\n');

  const result = await validateStagedConfigs();

  console.log(`📊 Validation Results:`);
  console.log(`   ✅ Valid: ${result.valid}`);
  console.log(`   ❌ Errors: ${result.errors.length}\n`);

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(error => console.log(`   ${error}`));
    console.log();
    process.exit(1);
  } else {
    console.log('🎉 All staged configs are valid!\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});


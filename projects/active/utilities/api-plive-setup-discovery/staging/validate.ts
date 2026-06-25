// staging/validate.ts - Validate staged deployments
// Validate all YAML configs in staging directory

import { validateStagedConfigs } from './manager';

async function main() {
  console.info('\n🔍 Validating staged deployments...\n');

  const result = await validateStagedConfigs();

  console.info(`📊 Validation Results:`);
  console.info(`   ✅ Valid: ${result.valid}`);
  console.info(`   ❌ Errors: ${result.errors.length}\n`);

  if (result.errors.length > 0) {
    console.info('Errors:');
    result.errors.forEach(error => console.info(`   ${error}`));
    console.info();
    process.exit(1);
  } else {
    console.info('🎉 All staged configs are valid!\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});


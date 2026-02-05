// staging/rollback.ts - Rollback utility for staging area
// Rollback specific deployments via CLI

import { rollbackDeploy } from './manager';

const deployId = process.argv.find(arg => arg.startsWith('--id='))?.split('=')[1] ||
                 process.argv.find(arg => arg.startsWith('-i='))?.split('=')[1] ||
                 process.argv[2];

if (!deployId) {
  console.error('❌ Usage: bun run staging/rollback.ts --id=DEPLOY-123');
  process.exit(1);
}

async function main() {
  console.log(`🔄 Rolling back deployment: ${deployId}\n`);

  const result = await rollbackDeploy(deployId);

  if (result.success) {
    console.log(`✅ Successfully rolled back:`);
    console.log(`   From: ${result.rolledBackFrom}`);
    console.log(`   To: ${result.rolledBackTo}`);
    console.log(`   Target: ${result.target}`);
    console.log(`   Previous Version: ${result.previousVersion}`);
    console.log(`   Timestamp: ${result.timestamp}\n`);
  } else {
    console.error(`❌ Rollback failed: ${result.error}\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Rollback error:', error);
  process.exit(1);
});


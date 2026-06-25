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
  console.info(`🔄 Rolling back deployment: ${deployId}\n`);

  const result = await rollbackDeploy(deployId);

  if (result.success) {
    console.info(`✅ Successfully rolled back:`);
    console.info(`   From: ${result.rolledBackFrom}`);
    console.info(`   To: ${result.rolledBackTo}`);
    console.info(`   Target: ${result.target}`);
    console.info(`   Previous Version: ${result.previousVersion}`);
    console.info(`   Timestamp: ${result.timestamp}\n`);
  } else {
    console.error(`❌ Rollback failed: ${result.error}\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Rollback error:', error);
  process.exit(1);
});


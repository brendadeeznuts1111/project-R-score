// staging/status.ts - Check deployment status
// Get status of staged deployments

import { getDeployStatus, listStagedDeploys } from './manager';

const deployId = process.argv.find(arg => arg.startsWith('--id='))?.split('=')[1] ||
                 process.argv.find(arg => arg.startsWith('-i='))?.split('=')[1] ||
                 process.argv[2];

const target = process.argv.find(arg => arg.startsWith('--target='))?.split('=')[1] ||
               process.argv.find(arg => arg.startsWith('-t='))?.split('=')[1];

async function main() {
  if (deployId) {
    // Get specific deploy status
    const deploy = await getDeployStatus(deployId);

    if (!deploy) {
      console.error(`❌ Deploy ${deployId} not found\n`);
      process.exit(1);
    }

    console.log(`\n📊 Deployment Status: ${deployId}`);
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(`Target: ${deploy.target}`);
    console.log(`Version: ${deploy.version}`);
    console.log(`Status: ${deploy.status}`);
    console.log(`Created: ${new Date(deploy.createdAt).toISOString()}`);
    if (deploy.deployedAt) {
      console.log(`Deployed: ${new Date(deploy.deployedAt).toISOString()}`);
    }
    if (deploy.rolledBackAt) {
      console.log(`Rolled Back: ${new Date(deploy.rolledBackAt).toISOString()}`);
    }
    console.log();

  } else {
    // List all deploys (optionally filtered by target)
    const deploys = await listStagedDeploys(target);

    if (deploys.length === 0) {
      console.log(`\n📭 No deployments found${target ? ` for target: ${target}` : ''}\n`);
      process.exit(0);
    }

    console.log(`\n📊 Staged Deployments${target ? ` (target: ${target})` : ''}:`);
    console.log('─────────────────────────────────────────────────────────────────');

    deploys.forEach(deploy => {
      const statusIcon = deploy.status === 'completed' ? '✅' :
                        deploy.status === 'failed' ? '❌' :
                        deploy.status === 'rolled_back' ? '🔄' :
                        deploy.status === 'deploying' ? '🚀' : '⏳';
      
      console.log(`${statusIcon} ${deploy.id}`);
      console.log(`   Target: ${deploy.target} | Version: ${deploy.version} | Status: ${deploy.status}`);
      console.log(`   Created: ${new Date(deploy.createdAt).toISOString()}`);
    });

    console.log();
  }
}

main().catch(error => {
  console.error('❌ Status check error:', error);
  process.exit(1);
});


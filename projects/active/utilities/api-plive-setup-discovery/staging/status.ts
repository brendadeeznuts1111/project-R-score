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

    console.info(`\n📊 Deployment Status: ${deployId}`);
    console.info('─────────────────────────────────────────────────────────────────');
    console.info(`Target: ${deploy.target}`);
    console.info(`Version: ${deploy.version}`);
    console.info(`Status: ${deploy.status}`);
    console.info(`Created: ${new Date(deploy.createdAt).toISOString()}`);
    if (deploy.deployedAt) {
      console.info(`Deployed: ${new Date(deploy.deployedAt).toISOString()}`);
    }
    if (deploy.rolledBackAt) {
      console.info(`Rolled Back: ${new Date(deploy.rolledBackAt).toISOString()}`);
    }
    console.info();

  } else {
    // List all deploys (optionally filtered by target)
    const deploys = await listStagedDeploys(target);

    if (deploys.length === 0) {
      console.info(`\n📭 No deployments found${target ? ` for target: ${target}` : ''}\n`);
      process.exit(0);
    }

    console.info(`\n📊 Staged Deployments${target ? ` (target: ${target})` : ''}:`);
    console.info('─────────────────────────────────────────────────────────────────');

    deploys.forEach(deploy => {
      const statusIcon = deploy.status === 'completed' ? '✅' :
                        deploy.status === 'failed' ? '❌' :
                        deploy.status === 'rolled_back' ? '🔄' :
                        deploy.status === 'deploying' ? '🚀' : '⏳';
      
      console.info(`${statusIcon} ${deploy.id}`);
      console.info(`   Target: ${deploy.target} | Version: ${deploy.version} | Status: ${deploy.status}`);
      console.info(`   Created: ${new Date(deploy.createdAt).toISOString()}`);
    });

    console.info();
  }
}

main().catch(error => {
  console.error('❌ Status check error:', error);
  process.exit(1);
});


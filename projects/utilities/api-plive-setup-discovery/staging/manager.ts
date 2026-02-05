// staging/manager.ts - Deployment staging hub
// Staging Area v3.1: Zero-downtime deployments with rollback support
// Bun-native: use Bun.file().exists() instead of fs

import { file, YAML, glob } from 'bun';

// Load configuration
const config = YAML.parse(await file('bun.yaml').text());
const { staging } = config.command;

// Ensure staging directory exists
if (!(await Bun.file(staging.directory).exists())) {
  await Bun.$`mkdir -p ${staging.directory}`.quiet();
}

// Deploy metadata interface
interface DeployMetadata {
  id: string;
  target: string;
  version: string;
  status: 'queued' | 'validating' | 'deploying' | 'completed' | 'failed' | 'rolled_back';
  createdAt: number;
  deployedAt?: number;
  rolledBackAt?: number;
  config: any;
}

// In-memory staging queue (in production: use Redis/Database)
const stagingQueue = new Map<string, DeployMetadata>();

// Validate deploy schema against bun.yaml config
export function validateDeploy(deployConfig: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schema || !schema.properties) {
    return { valid: true, errors: [] };
  }

  // Validate target
  if (schema.properties.target) {
    if (!deployConfig.target || typeof deployConfig.target !== 'string') {
      errors.push('Missing or invalid target property');
    }
  }

  // Validate version
  if (schema.properties.version) {
    if (!deployConfig.version || typeof deployConfig.version !== 'string') {
      errors.push('Missing or invalid version property');
    } else {
      // Validate version format (semver-like)
      const versionPattern = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/;
      if (!versionPattern.test(deployConfig.version)) {
        errors.push(`Invalid version format: ${deployConfig.version}. Expected semver format.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Stage deployment for CCS dispatch
export async function stageDeploy(deployConfig: any): Promise<any> {
  const startTime = performance.now();

  try {
    // Validate deploy schema
    const validation = validateDeploy(deployConfig, staging.schema.deploy);
    if (!validation.valid) {
      throw new Error(`Invalid deploy config: ${validation.errors.join(', ')}`);
    }

    // Generate deploy ID
    const deployId = `DEPLOY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create deploy metadata
    const metadata: DeployMetadata = {
      id: deployId,
      target: deployConfig.target,
      version: deployConfig.version,
      status: 'queued',
      createdAt: Date.now(),
      config: deployConfig
    };

    // Store staging config
    const stagingPath = `${staging.directory}/${deployId}.yaml`;
    await Bun.write(stagingPath, YAML.stringify({
      id: deployId,
      target: deployConfig.target,
      version: deployConfig.version,
      config: deployConfig,
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'queued'
      }
    }));

    // Add to queue
    stagingQueue.set(deployId, metadata);

    // Update staging index
    await updateStagingIndex(deployId);

    console.log(`🟢 Staged: ${deployId} for ${deployConfig.target} (v${deployConfig.version})`);

    const duration = performance.now() - startTime;

    return {
      success: true,
      deployId: deployId,
      target: deployConfig.target,
      version: deployConfig.version,
      status: 'queued',
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    const duration = performance.now() - startTime;
    console.error(`❌ Staging error:`, error);

    return {
      success: false,
      error: error.message || 'Staging failed',
      duration: `${duration.toFixed(2)}ms`
    };
  }
}

// Update staging index file
async function updateStagingIndex(deployId: string): Promise<void> {
  const indexPath = `${staging.directory}/.staging.index`;
  const indexFile = Bun.file(indexPath);
  const existing = (await indexFile.exists())
    ? await indexFile.text().catch(() => '')
    : '';
  
  const index = existing.split('\n').filter(Boolean);
  if (!index.includes(deployId)) {
    index.push(deployId);
    await Bun.write(indexPath, index.join('\n') + '\n');
  }
}

// Get deploy status
export async function getDeployStatus(deployId: string): Promise<DeployMetadata | null> {
  return stagingQueue.get(deployId) || null;
}

// Rollback deployment
export async function rollbackDeploy(deployId: string): Promise<any> {
  try {
    const deploy = stagingQueue.get(deployId);
    if (!deploy) {
      throw new Error(`Deploy ${deployId} not found`);
    }

    // Find previous deploy for this target
    const previousDeploys = Array.from(stagingQueue.values())
      .filter(d => d.target === deploy.target && d.status === 'completed')
      .sort((a, b) => (b.deployedAt || 0) - (a.deployedAt || 0));

    if (previousDeploys.length === 0) {
      throw new Error(`No previous deploy found for target ${deploy.target}`);
    }

    const previousDeploy = previousDeploys[0];
    
    // Update current deploy status
    deploy.status = 'rolled_back';
    deploy.rolledBackAt = Date.now();

    // Restore previous config
    const previousConfigPath = `${staging.directory}/${previousDeploy.id}.yaml`;
    const previousConfigFile = Bun.file(previousConfigPath);
    if (await previousConfigFile.exists()) {
      const previousConfig = YAML.parse(await previousConfigFile.text());
      
      console.log(`🔄 Rolling back ${deployId} to ${previousDeploy.id} (v${previousConfig.version})`);

      return {
        success: true,
        rolledBackFrom: deployId,
        rolledBackTo: previousDeploy.id,
        target: deploy.target,
        previousVersion: previousConfig.version,
        timestamp: new Date().toISOString()
      };
    }

    throw new Error(`Previous deploy config not found: ${previousDeploy.id}`);

  } catch (error: any) {
    console.error(`❌ Rollback error:`, error);
    return {
      success: false,
      error: error.message || 'Rollback failed'
    };
  }
}

// List staged deployments
export async function listStagedDeploys(target?: string): Promise<DeployMetadata[]> {
  const deploys = Array.from(stagingQueue.values());
  
  if (target) {
    return deploys.filter(d => d.target === target);
  }
  
  return deploys;
}

// Validate all staged configs
export async function validateStagedConfigs(): Promise<{ valid: number; errors: string[] }> {
  const errors: string[] = [];
  let valid = 0;

  try {
    const stagedFiles = await glob('**/*.yaml', {
      cwd: staging.directory,
      absolute: false
    });

    for (const file of stagedFiles) {
      if (file === '.staging.index') continue;

      try {
        const content = await Bun.file(`${staging.directory}/${file}`).text();
        const deploy = YAML.parse(content);

        const validation = validateDeploy(deploy, staging.schema.deploy);
        if (validation.valid) {
          valid++;
        } else {
          errors.push(`${file}: ${validation.errors.join(', ')}`);
        }
      } catch (error: any) {
        errors.push(`${file}: ${error.message}`);
      }
    }

  } catch (error: any) {
    errors.push(`Validation error: ${error.message}`);
  }

  return { valid, errors };
}


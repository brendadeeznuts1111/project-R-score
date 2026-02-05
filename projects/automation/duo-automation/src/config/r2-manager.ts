#!/usr/bin/env bun

/**
 * R2 Configuration Storage Manager
 * Real Cloudflare R2 integration with Bun Secrets API
 */

import { createBunAWSClient } from '../../utils/bun-aws-client';
import { secrets } from 'bun';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
}

interface ConfigFile {
  project: string;
  config: any;
  timestamp: string;
  version: string;
}

class R2ConfigManager {
  private client: S3Client;
  private config: R2Config;

  constructor(r2Config: R2Config) {
    this.config = r2Config;
    this.client = new S3Client({
      endpoint: r2Config.endpoint,
      region: r2Config.region,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    });
  }

  async uploadConfig(projectName: string, config: any): Promise<void> {
    console.log(`📤 Uploading config for ${projectName} to R2...`);

    const configFile: ConfigFile = {
      project: projectName,
      config,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: `configs/${projectName}/config.json`,
      Body: JSON.stringify(configFile, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'project-name': projectName,
        'content-disposition': `config-${projectName}.json`,
        'version': configFile.version,
        'timestamp': configFile.timestamp,
      },
    });

    try {
      await this.client.send(command);
      console.log(`✅ Successfully uploaded ${projectName} config to R2`);
    } catch (error) {
      console.error(`❌ Failed to upload ${projectName} config:`, error);
      throw error;
    }
  }

  async downloadConfig(projectName: string): Promise<ConfigFile | null> {
    console.log(`📥 Downloading config for ${projectName} from R2...`);

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: `configs/${projectName}/config.json`,
    });

    try {
      const response = await this.client.send(command);
      const body = await response.Body?.transformToString();
      
      if (!body) {
        throw new Error('Empty response body');
      }

      const configFile = JSON.parse(body) as ConfigFile;
      console.log(`✅ Successfully downloaded ${projectName} config from R2`);
      return configFile;
    } catch (error) {
      console.error(`❌ Failed to download ${projectName} config:`, error);
      return null;
    }
  }

  async listConfigs(): Promise<string[]> {
    console.log(`📋 Listing all configs in R2...`);

    const command = new ListObjectsV2Command({
      Bucket: this.config.bucket,
      Prefix: 'configs/',
      Delimiter: '/',
    });

    try {
      const response = await this.client.send(command);
      const projects = response.CommonPrefixes?.map(prefix => 
        prefix.Prefix?.replace('configs/', '').replace('/', '') || ''
      ).filter(Boolean) || [];

      console.log(`✅ Found ${projects.length} configs in R2`);
      return projects;
    } catch (error) {
      console.error(`❌ Failed to list configs:`, error);
      return [];
    }
  }

  async syncProject(projectName: string, config: any): Promise<void> {
    console.log(`🔄 Syncing ${projectName} config to R2...`);
    
    try {
      await this.uploadConfig(projectName, config);
      
      // Verify upload by downloading back
      const verification = await this.downloadConfig(projectName);
      if (!verification) {
        throw new Error('Upload verification failed');
      }
      
      console.log(`✅ ${projectName} config synced and verified`);
    } catch (error) {
      console.error(`❌ Failed to sync ${projectName} config:`, error);
      throw error;
    }
  }

  getPublicUrl(projectName: string): string {
    const publicUrl = `${this.config.endpoint.replace(/\/$/, '')}/${this.config.bucket}/configs/${projectName}/config.json`;
    return publicUrl;
  }
}

// R2 Configuration using Bun Secrets API (required - no fallback)
async function getR2Config(): Promise<R2Config> {
  const service = 'empire-pro-config-empire';
  
  // Get credentials from Bun Secrets (required)
  const endpoint = await secrets.get({ service, name: 'R2_ENDPOINT' });
  const accessKeyId = await secrets.get({ service, name: 'R2_ACCESS_KEY_ID' });
  const secretAccessKey = await secrets.get({ service, name: 'R2_SECRET_ACCESS_KEY' });
  const bucket = await secrets.get({ service, name: 'R2_BUCKET' });
  const region = await secrets.get({ service, name: 'R2_REGION' }) || 'auto';

  // All secrets are required - no fallback to environment variables
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    const missing = [];
    if (!endpoint) missing.push('R2_ENDPOINT');
    if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
    if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
    if (!bucket) missing.push('R2_BUCKET');
    
    throw new Error(`❌ REQUIRED SECRETS MISSING: ${missing.join(', ')}

🔐 ALL CONFIGURATION MUST BE IN BUN SECRETS

To configure ALL required secrets:
  bun run secrets-r2-setup

Or manually set ALL secrets:
  await Bun.secrets.set({
    service: "empire-pro-config-empire",
    name: "R2_ENDPOINT",
    value: "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com"
  });
  await Bun.secrets.set({
    service: "empire-pro-config-empire", 
    name: "R2_ACCESS_KEY_ID",
    value: "69765dd738766bca38be63e7d0192cf8"
  });
  await Bun.secrets.set({
    service: "empire-pro-config-empire",
    name: "R2_SECRET_ACCESS_KEY", 
    value: "1d9326ffb0c59ebecb612f401a87f71942574984375fb283fc4359630d7d929a"
  });
  await Bun.secrets.set({
    service: "empire-pro-config-empire",
    name: "R2_BUCKET",
    value: "factory-wager-packages"
  });
  await Bun.secrets.set({
    service: "empire-pro-config-empire",
    name: "R2_REGION",
    value: "auto"
  });

🚫 NO ENVIRONMENT VARIABLES OR CONFIG FILES USED
🔒 ALL CREDENTIALS MUST BE STORED IN BUN SECRETS`);
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    region,
  };
}

// Helper function to set up R2 credentials in Bun Secrets
async function setupR2Credentials(): Promise<void> {
  console.log('🔐 Setting up R2 credentials in Bun Secrets...');
  
  const service = 'empire-pro-config-empire';
  
  // Prompt for credentials (in real implementation, you'd use a proper prompt library)
  process.stdout.write('R2 Endpoint (e.g., https://account.r2.cloudflarestorage.com): ');
  const endpoint = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });
  
  process.stdout.write('R2 Access Key ID: ');
  const accessKeyId = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });
  
  process.stdout.write('R2 Secret Access Key: ');
  const secretAccessKey = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });
  
  process.stdout.write('R2 Bucket Name (factory-wager): ');
  const bucketInput = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => resolve(data.toString().trim()));
  });
  const bucket = bucketInput || 'factory-wager';
  
  // Store in Bun Secrets
  await secrets.set({
    service,
    name: 'R2_ENDPOINT',
    value: endpoint
  });
  await secrets.set({
    service,
    name: 'R2_ACCESS_KEY_ID',
    value: accessKeyId
  });
  await secrets.set({
    service,
    name: 'R2_SECRET_ACCESS_KEY',
    value: secretAccessKey
  });
  await secrets.set({
    service,
    name: 'R2_BUCKET',
    value: bucket
  });
  await secrets.set({
    service,
    name: 'R2_REGION',
    value: 'auto'
  });
  
  console.log('✅ R2 credentials stored securely in Bun Secrets');
  console.log('🔒 Credentials are encrypted by your operating system');
}

// Helper function to export R2 credentials as environment variables
async function exportR2Credentials(): Promise<void> {
  const service = 'empire-pro-config-empire';
  
  const endpoint = await secrets.get({ service, name: 'R2_ENDPOINT' });
  const accessKeyId = await secrets.get({ service, name: 'R2_ACCESS_KEY_ID' });
  const secretAccessKey = await secrets.get({ service, name: 'R2_SECRET_ACCESS_KEY' });
  const bucket = await secrets.get({ service, name: 'R2_BUCKET' });
  const region = await secrets.get({ service, name: 'R2_REGION' });
  
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    console.log('❌ R2 credentials not found in Bun Secrets');
    console.log('💡 Run "bun run secrets-r2-setup" to configure');
    return;
  }
  
  console.log('# R2 Configuration (export to environment)');
  console.log(`export R2_ENDPOINT="${endpoint}"`);
  console.log(`export R2_ACCESS_KEY_ID="${accessKeyId}"`);
  console.log(`export R2_SECRET_ACCESS_KEY="${secretAccessKey}"`);
  console.log(`export R2_BUCKET="${bucket}"`);
  console.log(`export R2_REGION="${region}"`);
}

export { R2ConfigManager, getR2Config, setupR2Credentials, exportR2Credentials };
export type { R2Config, ConfigFile };

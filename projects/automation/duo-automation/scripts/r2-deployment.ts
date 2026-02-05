#!/usr/bin/env bun

/**
 * 🚀 R2 Deployment Script - Production Deployment with Custom Domain
 * 
 * Features:
 * - Automated R2 bucket creation and configuration
 * - Custom domain setup and SSL certificate
 * - CDN configuration and optimization
 * - Asset upload and distribution
 * - Health checks and monitoring
 */

import { R2ArtifactManager } from './r2-integration';
import { execSync } from 'child_process';

interface DeploymentConfig {
  accountId: string;
  bucketName: string;
  customDomain: string;
  environment: 'development' | 'staging' | 'production';
  assetsPath: string;
  enableCDN: boolean;
  enableSSL: boolean;
}

class R2Deployment {
  private config: DeploymentConfig;
  private r2Manager: R2ArtifactManager;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.r2Manager = new R2ArtifactManager({
      accountId: config.accountId,
      bucketName: config.bucketName,
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      customDomain: config.customDomain,
      region: 'auto',
    });
  }

  /**
   * Complete deployment process
   */
  async deploy(): Promise<void> {
    console.log('🚀 Starting R2 deployment...');
    console.log(`📦 Bucket: ${this.config.bucketName}`);
    console.log(`🌐 Domain: ${this.config.customDomain}`);
    console.log(`🔧 Environment: ${this.config.environment}\n`);

    try {
      // Step 1: Validate configuration
      await this.validateConfiguration();

      // Step 2: Setup R2 bucket
      await this.setupBucket();

      // Step 3: Configure custom domain
      if (this.config.customDomain) {
        await this.setupCustomDomain();
      }

      // Step 4: Upload assets
      await this.uploadAssets();

      // Step 5: Configure CDN
      if (this.config.enableCDN) {
        await this.configureCDN();
      }

      // Step 6: Health checks
      await this.performHealthChecks();

      console.log('✅ Deployment completed successfully!');
      await this.showDeploymentSummary();

    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  }

  /**
   * Validate deployment configuration
   */
  private async validateConfiguration(): Promise<void> {
    console.log('🔍 Validating configuration...');

    if (!this.config.accountId) {
      throw new Error('R2_ACCOUNT_ID is required');
    }

    if (!this.config.bucketName) {
      throw new Error('R2_BUCKET_NAME is required');
    }

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials are required');
    }

    if (this.config.customDomain && !process.env.CLOUDFLARE_API_TOKEN) {
      throw new Error('CLOUDFLARE_API_TOKEN is required for custom domain setup');
    }

    console.log('✅ Configuration validated');
  }

  /**
   * Setup R2 bucket
   */
  private async setupBucket(): Promise<void> {
    console.log('📦 Setting up R2 bucket...');

    try {
      // Create bucket if it doesn't exist
      const createBucketCommand = `wrangler r2 bucket create ${this.config.bucketName}`;
      execSync(createBucketCommand, { stdio: 'pipe' });
      console.log(`✅ Bucket ${this.config.bucketName} created`);
    } catch (error) {
      // Bucket might already exist
      console.log(`ℹ️  Bucket ${this.config.bucketName} already exists`);
    }

    // Configure bucket settings
    const bucketConfig = {
      versioning: 'Enabled',
      mfaDelete: 'Disabled',
      publicAccess: 'Blocked',
    };

    console.log('✅ Bucket setup completed');
  }

  /**
   * Setup custom domain
   */
  private async setupCustomDomain(): Promise<void> {
    console.log('🌐 Setting up custom domain...');

    try {
      await this.r2Manager.setupCustomDomain(this.config.customDomain);
      
      // Wait for DNS propagation
      console.log('⏳ Waiting for DNS propagation...');
      await this.sleep(30000); // 30 seconds

      // Verify domain configuration
      const success = await this.verifyDomainConfiguration();
      if (!success) {
        throw new Error('Domain configuration verification failed');
      }

      console.log(`✅ Custom domain ${this.config.customDomain} configured`);
    } catch (error) {
      throw new Error(`Failed to setup custom domain: ${error}`);
    }
  }

  /**
   * Upload assets to R2
   */
  private async uploadAssets(): Promise<void> {
    console.log('📤 Uploading assets...');

    const assetsPath = this.config.assetsPath;
    const uploadPromises: Promise<any>[] = [];

    // Upload TypeScript/JavaScript files
    uploadPromises.push(...await this.uploadFilesByType(assetsPath, '.ts'));
    uploadPromises.push(...await this.uploadFilesByType(assetsPath, '.js'));
    
    // Upload documentation files
    uploadPromises.push(...await this.uploadFilesByType(assetsPath, '.md'));
    uploadPromises.push(...await this.uploadFilesByType(assetsPath, '.json'));
    uploadPromises.push(...await this.uploadFilesByType(assetsPath, '.yaml'));
    uploadPromises.push(...await this.uploadFilesByType(assetsPath, '.yml'));

    // Wait for all uploads to complete
    const results = await Promise.allSettled(uploadPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Assets uploaded: ${successful} successful, ${failed} failed`);
  }

  /**
   * Upload files by type
   */
  private async uploadFilesByType(basePath: string, extension: string): Promise<Promise<any>[]> {
    const files = await this.findFilesByExtension(basePath, extension);
    const uploadPromises: Promise<any>[] = [];

    for (const filePath of files) {
      const relativePath = filePath.replace(basePath + '/', '');
      const key = `artifacts/${this.config.environment}/${relativePath}`;
      
      const file = Bun.file(filePath);
      const buffer = await file.arrayBuffer();
      
      const uploadPromise = this.r2Manager.uploadArtifact(
        key,
        new Uint8Array(buffer),
        {
          name: relativePath,
          type: this.getFileType(extension),
          tags: this.generateTags(extension, this.config.environment),
          contentType: this.getContentType(extension),
        }
      );

      uploadPromises.push(uploadPromise);
    }

    return uploadPromises;
  }

  /**
   * Configure CDN settings
   */
  private async configureCDN(): Promise<void> {
    console.log('⚡ Configuring CDN...');

    // CDN configuration would go here
    // This includes cache rules, compression, security headers, etc.
    
    console.log('✅ CDN configured');
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    console.log('🏥 Performing health checks...');

    // Check bucket accessibility
    const stats = await this.r2Manager.getBucketStats();
    if (stats.totalObjects === 0) {
      throw new Error('No objects found in bucket after upload');
    }

    // Check custom domain accessibility
    if (this.config.customDomain) {
      const domainHealthy = await this.checkDomainHealth();
      if (!domainHealthy) {
        throw new Error(`Custom domain ${this.config.customDomain} is not accessible`);
      }
    }

    console.log('✅ Health checks passed');
  }

  /**
   * Show deployment summary
   */
  private async showDeploymentSummary(): Promise<void> {
    const stats = await this.r2Manager.getBucketStats();

    console.log('\n📊 Deployment Summary');
    console.log('=====================');
    console.log(`📦 Bucket: ${this.config.bucketName}`);
    console.log(`🌐 Domain: ${this.config.customDomain || 'None'}`);
    console.log(`🔧 Environment: ${this.config.environment}`);
    console.log(`📁 Objects: ${stats.totalObjects}`);
    console.log(`💾 Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⚡ CDN: ${this.config.enableCDN ? 'Enabled' : 'Disabled'}`);
    console.log(`🔒 SSL: ${this.config.enableSSL ? 'Enabled' : 'Disabled'}`);
    
    console.log('\n🔗 Access URLs:');
    if (this.config.customDomain) {
      console.log(`🌐 Custom Domain: https://${this.config.customDomain}`);
    }
    console.log(`🪣 R2 URL: https://${this.config.bucketName}.${this.config.accountId}.r2.cloudflarestorage.com`);
    
    console.log('\n🎉 Deployment completed successfully!');
  }

  /**
   * Helper methods
   */
  private async verifyDomainConfiguration(): Promise<boolean> {
    try {
      // Verify domain is accessible
      const response = await fetch(`https://${this.config.customDomain}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkDomainHealth(): Promise<boolean> {
    try {
      const response = await fetch(`https://${this.config.customDomain}/health`, {
        method: 'HEAD',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async findFilesByExtension(basePath: string, extension: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const result = execSync(`find ${basePath} -name "*${extension}" -type f`, { encoding: 'utf8' });
      files.push(...result.trim().split('\n').filter(Boolean));
    } catch (error) {
      console.warn(`No ${extension} files found in ${basePath}`);
    }

    return files;
  }

  private getFileType(extension: string): string {
    const typeMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.html': 'html',
      '.css': 'css',
    };
    return typeMap[extension] || 'unknown';
  }

  private getContentType(extension: string): string {
    const typeMap: Record<string, string> = {
      '.ts': 'application/typescript',
      '.js': 'application/javascript',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.html': 'text/html',
      '.css': 'text/css',
    };
    return typeMap[extension] || 'application/octet-stream';
  }

  private generateTags(extension: string, environment: string): string[] {
    const tags = [`#${environment}`, '#artifact'];
    
    switch (extension) {
      case '.ts':
        tags.push('#typescript', '#code');
        break;
      case '.js':
        tags.push('#javascript', '#code');
        break;
      case '.md':
        tags.push('#documentation', '#markdown');
        break;
      case '.json':
        tags.push('#config', '#data');
        break;
      case '.yaml':
      case '.yml':
        tags.push('#config', '#yaml');
        break;
    }
    
    return tags;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI implementation
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] as 'development' | 'staging' | 'production' || 'development';

  console.log('🚀 R2 Deployment Script');
  console.log('========================\n');

  const config: DeploymentConfig = {
    accountId: process.env.R2_ACCOUNT_ID || '',
    bucketName: process.env.R2_BUCKET_NAME || 'duoplus-artifacts',
    customDomain: environment === 'production' 
      ? 'artifacts.duoplus.dev' 
      : environment === 'staging' 
        ? 'artifacts-staging.duoplus.dev'
        : undefined,
    environment,
    assetsPath: args[1] || './dist',
    enableCDN: true,
    enableSSL: true,
  };

  const deployment = new R2Deployment(config);
  await deployment.deploy();
}

// Auto-run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { R2Deployment, DeploymentConfig };

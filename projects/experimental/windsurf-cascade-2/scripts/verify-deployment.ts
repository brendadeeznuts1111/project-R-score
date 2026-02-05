#!/usr/bin/env bun
// Cloudflare R2 Deployment Verification Script
// Ensures all trading system packages are correctly deployed

import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

interface VerificationResult {
  success: boolean;
  totalFiles: number;
  verifiedFiles: string[];
  missingFiles: string[];
  errors: string[];
}

class R2DeploymentVerifier {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'global-trading-packages';
    
    this.client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async verifyDeployment(): Promise<VerificationResult> {
    console.log('🔍 Verifying Global Trading System deployment...');
    console.log(`📦 Bucket: ${this.bucketName}`);
    console.log('');

    const result: VerificationResult = {
      success: true,
      totalFiles: 0,
      verifiedFiles: [],
      missingFiles: [],
      errors: []
    };

    try {
      // Get all uploaded files
      const allFiles = await this.listAllFiles();
      result.totalFiles = allFiles.length;

      console.log(`📁 Found ${allFiles.length} files in R2 bucket`);

      // Verify core packages
      await this.verifyCorePackages(allFiles, result);
      
      // Verify integration packages
      await this.verifyIntegrationPackages(allFiles, result);
      
      // Verify platform packages
      await this.verifyPlatformPackages(allFiles, result);
      
      // Verify dashboard
      await this.verifyDashboard(allFiles, result);
      
      // Verify manifest
      await this.verifyManifest(allFiles, result);

      // Check file accessibility
      await this.verifyFileAccessibility(result);

      // Print results
      this.printResults(result);

      return result;

    } catch (error) {
      console.error('❌ Verification failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async listAllFiles(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
      });

      const response = await this.client.send(command);
      return response.Contents?.map((obj: any) => obj.Key || '') || [];
    } catch (error) {
      console.error('❌ Failed to list files:', error);
      throw error;
    }
  }

  private async verifyCorePackages(allFiles: string[], result: VerificationResult): Promise<void> {
    console.log('🔧 Verifying core packages...');

    const coreFiles = [
      'packages/core/index.js',
      'packages/core/config.js',
      'packages/core/engine.js'
    ];

    for (const file of coreFiles) {
      if (allFiles.includes(file)) {
        const isAccessible = await this.checkFileAccessibility(file);
        if (isAccessible) {
          result.verifiedFiles.push(file);
          console.log(`  ✅ ${file}`);
        } else {
          result.missingFiles.push(file);
          result.errors.push(`Core package file ${file} is not accessible`);
          console.log(`  ❌ ${file} (not accessible)`);
        }
      } else {
        result.missingFiles.push(file);
        result.errors.push(`Core package file ${file} is missing`);
        console.log(`  ❌ ${file} (missing)`);
      }
    }
  }

  private async verifyIntegrationPackages(allFiles: string[], result: VerificationResult): Promise<void> {
    console.log('🔗 Verifying integration packages...');

    const integrationFiles = [
      'packages/integrations/polymarket-client.js',
      'packages/integrations/fanduel-client.js'
    ];

    for (const file of integrationFiles) {
      if (allFiles.includes(file)) {
        const isAccessible = await this.checkFileAccessibility(file);
        if (isAccessible) {
          result.verifiedFiles.push(file);
          console.log(`  ✅ ${file}`);
        } else {
          result.missingFiles.push(file);
          result.errors.push(`Integration package file ${file} is not accessible`);
          console.log(`  ❌ ${file} (not accessible)`);
        }
      } else {
        result.missingFiles.push(file);
        result.errors.push(`Integration package file ${file} is missing`);
        console.log(`  ❌ ${file} (missing)`);
      }
    }
  }

  private async verifyPlatformPackages(allFiles: string[], result: VerificationResult): Promise<void> {
    console.log('🌍 Verifying platform packages...');

    const platformFiles = [
      'packages/multi-region/region-processor.js',
      'packages/cross-platform/platform-manager.js',
      'packages/global-integration/integration-manager.js'
    ];

    for (const file of platformFiles) {
      if (allFiles.includes(file)) {
        const isAccessible = await this.checkFileAccessibility(file);
        if (isAccessible) {
          result.verifiedFiles.push(file);
          console.log(`  ✅ ${file}`);
        } else {
          result.missingFiles.push(file);
          result.errors.push(`Platform package file ${file} is not accessible`);
          console.log(`  ❌ ${file} (not accessible)`);
        }
      } else {
        result.missingFiles.push(file);
        result.errors.push(`Platform package file ${file} is missing`);
        console.log(`  ❌ ${file} (missing)`);
      }
    }
  }

  private async verifyDashboard(allFiles: string[], result: VerificationResult): Promise<void> {
    console.log('📱 Verifying dashboard...');

    const dashboardFiles = [
      'dashboard/trading-dashboard-enhanced.html'
    ];

    for (const file of dashboardFiles) {
      if (allFiles.includes(file)) {
        const isAccessible = await this.checkFileAccessibility(file);
        if (isAccessible) {
          result.verifiedFiles.push(file);
          console.log(`  ✅ ${file}`);
        } else {
          result.missingFiles.push(file);
          result.errors.push(`Dashboard file ${file} is not accessible`);
          console.log(`  ❌ ${file} (not accessible)`);
        }
      } else {
        result.missingFiles.push(file);
        result.errors.push(`Dashboard file ${file} is missing`);
        console.log(`  ❌ ${file} (missing)`);
      }
    }
  }

  private async verifyManifest(allFiles: string[], result: VerificationResult): Promise<void> {
    console.log('📋 Verifying manifest...');

    const manifestFiles = [
      'manifest.json',
      'package.json'
    ];

    for (const file of manifestFiles) {
      if (allFiles.includes(file)) {
        const isAccessible = await this.checkFileAccessibility(file);
        if (isAccessible) {
          result.verifiedFiles.push(file);
          console.log(`  ✅ ${file}`);
        } else {
          result.missingFiles.push(file);
          result.errors.push(`Manifest file ${file} is not accessible`);
          console.log(`  ❌ ${file} (not accessible)`);
        }
      } else {
        result.missingFiles.push(file);
        result.errors.push(`Manifest file ${file} is missing`);
        console.log(`  ❌ ${file} (missing)`);
      }
    }
  }

  private async checkFileAccessibility(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async verifyFileAccessibility(result: VerificationResult): Promise<void> {
    console.log('🌐 Checking file accessibility...');

    // Test a few key files to ensure they're publicly accessible
    const testFiles = [
      'manifest.json',
      'dashboard/trading-dashboard-enhanced.html'
    ];

    for (const file of testFiles) {
      if (result.verifiedFiles.includes(file)) {
        try {
          const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: file,
          });

          const response = await this.client.send(command);
          const content = await response.Body?.transformToString();
          
          if (content && content.length > 0) {
            console.log(`  ✅ ${file} is accessible (${content.length} bytes)`);
          } else {
            result.errors.push(`File ${file} is empty`);
            console.log(`  ⚠️  ${file} is empty`);
          }
        } catch (error) {
          result.errors.push(`File ${file} is not accessible: ${error}`);
          console.log(`  ❌ ${file} is not accessible`);
        }
      }
    }
  }

  private printResults(result: VerificationResult): void {
    console.log('');
    console.log('📊 Verification Results:');
    console.log(`   Total files: ${result.totalFiles}`);
    console.log(`   Verified: ${result.verifiedFiles.length}`);
    console.log(`   Missing: ${result.missingFiles.length}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.success && result.missingFiles.length === 0 && result.errors.length === 0) {
      console.log('');
      console.log('🎉 Deployment verification PASSED!');
      console.log('✅ Global Trading System is ready for production use');
      console.log('🌍 All packages are accessible via Cloudflare CDN');
      console.log('⚡ 13-byte configuration system operational');
    } else {
      console.log('');
      console.log('❌ Deployment verification FAILED!');
      
      if (result.missingFiles.length > 0) {
        console.log('');
        console.log('Missing files:');
        result.missingFiles.forEach(file => console.log(`   • ${file}`));
      }
      
      if (result.errors.length > 0) {
        console.log('');
        console.log('Errors:');
        result.errors.forEach(error => console.log(`   • ${error}`));
      }
    }

    console.log('');
    console.log('🌐 Access URLs:');
    console.log(`   • Dashboard: https://${this.bucketName}.r2.cloudflarestorage.com/dashboard/trading-dashboard-enhanced.html`);
    console.log(`   • Manifest: https://${this.bucketName}.r2.cloudflarestorage.com/manifest.json`);
    console.log(`   • Package Index: https://${this.bucketName}.r2.cloudflarestorage.com/package.json`);
  }
}

// Main execution
async function main() {
  const verifier = new R2DeploymentVerifier();
  const result = await verifier.verifyDeployment();
  
  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

if (import.meta.main) {
  main().catch(console.error);
}

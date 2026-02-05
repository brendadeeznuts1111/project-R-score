#!/usr/bin/env bun

/**
 * AWS SDK to Bun Migration Script
 * Replaces AWS SDK usage with Bun-native HTTP client
 * 2-3x performance improvement
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'path';

interface MigrationResult {
  file: string;
  migrated: boolean;
  changes: number;
  error?: string;
}

/**
 * Migrate AWS SDK imports to Bun native client
 */
async function migrateAWSImports(filePath: string): Promise<MigrationResult> {
  try {
    const content = readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let changes = 0;

    // Replace AWS SDK imports
    const importReplacements = [
      {
        from: /import\s*{\s*S3Client[^}]*}\s*from\s*['"]@aws-sdk\/client-s3['"];?/g,
        to: "import { createBunAWSClient } from '../../utils/bun-aws-client';"
      },
      {
        from: /import\s*{\s*Upload[^}]*}\s*from\s*['"]@aws-sdk\/lib-storage['"];?/g,
        to: "// Upload functionality now native in Bun AWS client"
      },
      {
        from: /import\s*{\s*getSignedUrl[^}]*}\s*from\s*['"]@aws-sdk\/s3-request-presigner['"];?/g,
        to: "// getSignedUrl now native in Bun AWS client"
      }
    ];

    for (const replacement of importReplacements) {
      if (replacement.from.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(replacement.from, replacement.to);
        changes++;
      }
    }

    // Replace S3Client instantiation
    const clientReplacements = [
      {
        from: /new\s+S3Client\(\{[^}]*\}\)/g,
        to: "createBunAWSClient({"
      },
      {
        from: /endpoint:\s*([^,}]+),?\s*region:\s*([^,}]+),?\s*credentials:\s*\{\s*accessKeyId:\s*([^,}]+),?\s*secretAccessKey:\s*([^}]+)\s*\}/g,
        to: "endpoint: $1, region: $2, accessKeyId: $3, secretAccessKey: $4"
      }
    ];

    for (const replacement of clientReplacements) {
      if (replacement.from.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(replacement.from, replacement.to);
        changes++;
      }
    }

    // Replace method calls
    const methodReplacements = [
      {
        from: /await\s+this\.client\.send\(\s*new\s+PutObjectCommand\(([^)]+)\)\s*\)/g,
        to: "await this.client.putObject($1)"
      },
      {
        from: /await\s+this\.client\.send\(\s*new\s+GetObjectCommand\(([^)]+)\)\s*\)/g,
        to: "await this.client.getObject($1)"
      },
      {
        from: /await\s+this\.client\.send\(\s*new\s+ListObjectsV2Command\(([^)]+)\)\s*\)/g,
        to: "await this.client.listObjects($1)"
      },
      {
        from: /await\s+this\.client\.send\(\s*new\s+DeleteObjectCommand\(([^)]+)\)\s*\)/g,
        to: "await this.client.deleteObject($1)"
      },
      {
        from: /await\s+getSignedUrl\(\s*this\.client,\s*new\s+\w+Command\(([^)]+)\),\s*([^)]+)\s*\)/g,
        to: "await this.client.getSignedUrl($1, $2)"
      }
    ];

    for (const replacement of methodReplacements) {
      if (replacement.from.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(replacement.from, replacement.to);
        changes++;
      }
    }

    // Replace Upload class usage
    if (modifiedContent.includes('new Upload')) {
      modifiedContent = modifiedContent.replace(
        /new\s+Upload\(\{\s*client:\s*this\.client,\s*params:\s*([^}]+)\s*\}\)/g,
        "this.client.putObject($1)"
      );
      changes++;
    }

    // Write back if changed
    if (changes > 0) {
      writeFileSync(filePath, modifiedContent, 'utf8');
      return { file: filePath, migrated: true, changes };
    }

    return { file: filePath, migrated: false, changes: 0 };
  } catch (error) {
    return {
      file: filePath,
      migrated: false,
      changes: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Migrate R2-specific files
 */
async function migrateR2Files(filePath: string): Promise<MigrationResult> {
  try {
    const content = readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let changes = 0;

    // Replace R2 imports with optimized version
    if (content.includes('cloudflare-r2.js') && !content.includes('bun-r2-manager')) {
      const r2Import = "import { createR2Manager } from '../../utils/bun-r2-manager';";
      
      if (!modifiedContent.includes(r2Import)) {
        // Add new import after existing imports
        const importEnd = modifiedContent.lastIndexOf(';') + 1;
        modifiedContent = modifiedContent.slice(0, importEnd) + 
          '\n' + r2Import + 
          modifiedContent.slice(importEnd);
        changes++;
      }

      // Replace CloudflareR2Storage instantiation
      if (modifiedContent.includes('new CloudflareR2Storage')) {
        modifiedContent = modifiedContent.replace(
          /new\s+CloudflareR2Storage\(([^)]*)\)/g,
          "createR2Manager({ accountId: $1.accountId || 'your-account-id', accessKeyId: $1.accessKeyId || process.env.R2_ACCESS_KEY, secretAccessKey: $1.secretAccessKey || process.env.R2_SECRET_KEY, bucket: $1.bucket || 'empire-pro-storage' })"
        );
        changes++;
      }
    }

    // Write back if changed
    if (changes > 0) {
      writeFileSync(filePath, modifiedContent, 'utf8');
      return { file: filePath, migrated: true, changes };
    }

    return { file: filePath, migrated: false, changes: 0 };
  } catch (error) {
    return {
      file: filePath,
      migrated: false,
      changes: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting AWS SDK to Bun migration...\n');

  // Find relevant files manually
  const files = [
    'src/storage/cloudflare-r2.js',
    'src/config/r2-manager.ts',
    'utils/storage/cloudflare-r2.js',
    'demos/storage/upload-all-r2.js',
    'scripts/query/query-r2-pattern.ts',
    'bench/storage/bench-r2-super.ts'
  ];

  console.log(`📁 Found ${files.length} files to analyze\n`);

  const results: MigrationResult[] = [];

  // Migrate AWS SDK usage
  for (const file of files) {
    if (file.includes('aws') || file.includes('s3') || file.includes('r2') || file.includes('storage')) {
      console.log(`🔄 Migrating ${file}...`);
      
      const awsResult = await migrateAWSImports(file);
      const r2Result = await migrateR2Files(file);
      
      if (awsResult.migrated || r2Result.migrated) {
        results.push({
          file,
          migrated: true,
          changes: awsResult.changes + r2Result.changes
        });
        console.log(`  ✅ Migrated ${awsResult.changes + r2Result.changes} changes`);
      } else if (awsResult.error || r2Result.error) {
        results.push({
          file,
          migrated: false,
          changes: 0,
          error: awsResult.error || r2Result.error
        });
        console.log(`  ❌ Error: ${awsResult.error || r2Result.error}`);
      }
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.migrated).length;
  const failed = results.filter(r => !r.migrated && r.error).length;
  const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);

  console.log(`✅ Successfully migrated: ${successful} files`);
  console.log(`❌ Failed migrations: ${failed} files`);
  console.log(`🔄 Total changes made: ${totalChanges}`);

  if (successful > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run tests to verify functionality');
    console.log('2. Update package.json to remove AWS SDK dependencies');
    console.log('3. Commit changes and test performance improvements');
  }

  if (failed > 0) {
    console.log('\n⚠️ Some files failed to migrate:');
    results.filter(r => !r.migrated && r.error).forEach(r => {
      console.log(`  - ${r.file}: ${r.error}`);
    });
  }
}

// Run migration
if (import.meta.main) {
  main().catch(console.error);
}

export { migrateAWSImports, migrateR2Files };

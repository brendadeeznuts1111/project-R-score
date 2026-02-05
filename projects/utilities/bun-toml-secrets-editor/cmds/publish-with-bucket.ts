#!/usr/bin/env bun
/**
 * Publish to npm and upload binaries to storage bucket
 * 
 * Usage:
 *   bun cmds/publish-with-bucket.ts [publish-options]
 * 
 * Environment Variables:
 *   BUCKET_TYPE=s3|gcs|azure
 *   BUCKET_NAME=your-bucket-name
 *   AWS_ACCESS_KEY_ID=... (for S3)
 *   AWS_SECRET_ACCESS_KEY=... (for S3)
 *   GCS_PROJECT_ID=... (for GCS)
 * 
 * Examples:
 *   bun cmds/publish-with-bucket.ts --dry-run
 *   bun cmds/publish-with-bucket.ts --tag beta
 *   BUCKET_TYPE=s3 BUCKET_NAME=my-bucket bun cmds/publish-with-bucket.ts
 */

const args = process.argv.slice(2);

// Check if we should build first
const shouldBuild = !args.includes('--no-build') && !args.includes('--skip-build');

if (shouldBuild) {
  console.log('🔨 Building all platform binaries...');
  const buildProc = Bun.spawn(['bun', 'run', 'build:all'], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  
  await buildProc.exited;
  
  if (buildProc.exitCode !== 0) {
    console.error('❌ Build failed. Aborting publish.');
    process.exit(1);
  }
  
  console.log('✅ All binaries built successfully\n');
}

// Publish to npm
const publishArgs = args.filter(arg => arg !== '--no-build' && arg !== '--skip-build');
const isDryRun = publishArgs.includes('--dry-run');

if (!isDryRun) {
  console.log('📦 Publishing to npm...');
  const publishProc = Bun.spawn(['bun', 'publish', ...publishArgs], {
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });

  await publishProc.exited;

  if (publishProc.exitCode !== 0) {
    console.error('\n❌ Publish failed. Skipping bucket upload.');
    process.exit(publishProc.exitCode || 1);
  }

  console.log('\n✅ Published to npm successfully!\n');
} else {
  console.log('🔍 Dry run mode - skipping npm publish\n');
}

// Upload to bucket
const bucketType = process.env.BUCKET_TYPE;
const bucketName = process.env.BUCKET_NAME || process.env.S3_BUCKET_NAME;

if (!bucketType || !bucketName) {
  console.warn('⚠️  Bucket configuration not found. Skipping bucket upload.');
  console.warn('   Set BUCKET_TYPE and BUCKET_NAME environment variables to enable bucket upload.');
  if (isDryRun) {
    process.exit(0);
  }
  return;
}

console.log(`📤 Uploading binaries to ${bucketType}://${bucketName}...`);
const uploadProc = Bun.spawn(['bun', 'scripts/upload-to-bucket.ts'], {
  stdout: 'inherit',
  stderr: 'inherit',
  env: {
    ...process.env,
    PACKAGE_VERSION: process.env.npm_package_version || '1.0.0',
  },
});

await uploadProc.exited;

if (uploadProc.exitCode !== 0) {
  console.error('\n❌ Bucket upload failed.');
  process.exit(uploadProc.exitCode || 1);
}

console.log('\n✅ All binaries uploaded to bucket successfully!');

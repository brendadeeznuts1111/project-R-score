#!/usr/bin/env bun
/**
 * Upload knowledge base documents to R2 for AI Search indexing
 * Run this before setting up AI Search instance
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DOCS_DIR = join(process.cwd(), 'docs/knowledge-base');
const R2_BUCKET = process.env.R2_KNOWLEDGE_BASE_BUCKET || 'barbershop-knowledge-base';
// IMPORTANT: This prefix must match the path filter pattern in AI Search
// - Upload creates keys like: knowledge-base/services.md
// - AI Search pattern: /knowledge-base/** (matches knowledge-base/* paths)
// - Pattern is case-sensitive: /Knowledge-Base/** would NOT match
const R2_PREFIX = 'knowledge-base';

// Use Bun's native R2 API if available, otherwise use S3-compatible API
async function uploadToR2(key: string, content: string, contentType: string) {
  // Check if Bun.S3 (R2) is available
  if (typeof Bun !== 'undefined' && 'S3' in Bun) {
    const s3 = new (Bun as any).S3({
      accessKeyId: Bun.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY,
      endpoint: Bun.env.R2_ENDPOINT || process.env.R2_ENDPOINT,
      region: 'auto',
    });

    await s3.put({
      Bucket: R2_BUCKET,
      Key: key,
      Body: content,
      ContentType: contentType,
    });
  } else {
    // Fallback to fetch-based S3 API
    const accountId = Bun.env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
    const accessKeyId = Bun.env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = Bun.env.R2_ENDPOINT || process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not found. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }

    const url = `${endpoint}/${R2_BUCKET}/${key}`;
    const authString = `${accessKeyId}:${secretAccessKey}`;
    const authHeader = `Basic ${btoa(authString)}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': contentType,
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
    }
  }
}

async function uploadDocsToR2() {
  console.log('📤 Uploading knowledge base documents to R2...\n');
  console.log(`Bucket: ${R2_BUCKET}`);
  console.log(`Prefix: ${R2_PREFIX}\n`);

  try {
    // Read all markdown files
    const files = await readdir(DOCS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    console.log(`Found ${mdFiles.length} documents to upload\n`);

    if (mdFiles.length === 0) {
      console.log('No documents to upload.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of mdFiles) {
      try {
        const filepath = join(DOCS_DIR, file);
        const content = await readFile(filepath, 'utf-8');
        const key = `${R2_PREFIX}/${file}`;

        console.log(`Uploading ${file}...`);

        // Upload to R2
        await uploadToR2(key, content, 'text/markdown');

        console.log(`  ✅ Uploaded to ${key}`);
        successCount++;
      } catch (error: any) {
        console.error(`  ❌ Failed to upload ${file}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully uploaded: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (successCount > 0) {
      console.log('Next steps:');
      console.log('1. Create AI Search instance pointing to R2 bucket:', R2_BUCKET);
      console.log('2. Configure path filter: Include "/knowledge-base/**"');
      console.log('   (This ensures only knowledge base files are indexed)');
      console.log('3. Wait for indexing to complete');
      console.log('4. Update AI_SEARCH_INSTANCE_ID in .env\n');
      console.log('💡 Tip: Use the setup script for automatic path filtering:');
      console.log('   bun run scripts/vectorize/setup-ai-search.sh\n');
    }
  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run upload
uploadDocsToR2().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

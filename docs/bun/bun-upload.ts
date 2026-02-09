import { readFileSync } from 'fs';
import { createHash } from 'crypto';

// R2 Configuration
const ACCESS_KEY_ID = '6cffadba68fa831bf1489692ea5616a3';
const SECRET_ACCESS_KEY = '228a3d65d3516ea521beadaae9f9d9042666394df3011bacb98622042f222efd';
const BUCKET_NAME = 'factory-wager-wiki';
const ENDPOINT = 'https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com';

// Read wiki file
const wikiContent = readFileSync('/Users/nolarose/Projects/wiki-deploy/index.html');
const contentHash = createHash('sha256').update(wikiContent).digest('hex');

console.log('🚀 Uploading wiki to R2 using Bun...');

// Upload with proper AWS headers
const response = await fetch(`${ENDPOINT}/${BUCKET_NAME}/index.html`, {
  method: 'PUT',
  headers: {
    'Authorization': `Basic ${Buffer.from(`${ACCESS_KEY_ID}:${SECRET_ACCESS_KEY}`).toString('base64')}`,
    'Content-Type': 'text/html',
    'x-amz-content-sha256': contentHash,
    'x-amz-date': new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ''),
  },
  body: wikiContent,
});

if (response.ok) {
  console.log('✅ Wiki deployed successfully to R2!');
  console.log('🌐 Available at: https://wiki.factorywager.com');
} else {
  console.error('❌ Upload failed:', response.status, response.statusText);
  const errorText = await response.text();
  console.error('Error details:', errorText);
}

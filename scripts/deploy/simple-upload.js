const fs = require('fs');

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'factory-wager-wiki';
const WIKI_PATH = process.env.WIKI_DEPLOY_PATH;

if (!API_TOKEN) throw new Error('Required env var CLOUDFLARE_API_TOKEN not set');
if (!ACCOUNT_ID) throw new Error('Required env var R2_ACCOUNT_ID not set');
if (!WIKI_PATH) throw new Error('Required env var WIKI_DEPLOY_PATH not set');

async function uploadToR2() {
  try {
    console.info('🚀 Creating presigned URL for R2 upload...');

    const presignedResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET_NAME}/objects/index.html/upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const presignedData = await presignedResponse.json();

    if (!presignedData.success) {
      console.error('❌ Failed to create presigned URL:', presignedData.errors);
      return;
    }

    const uploadUrl = presignedData.result.uploadURL;
    console.info('📤 Uploading wiki file to R2...');
    const wikiContent = fs.readFileSync(WIKI_PATH);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/html' },
      body: wikiContent
    });

    if (uploadResponse.ok) {
      console.info('✅ Wiki deployed successfully to R2!');
    } else {
      console.error('❌ Upload failed:', uploadResponse.status, uploadResponse.statusText);
      const errorText = await uploadResponse.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
  }
}

uploadToR2();

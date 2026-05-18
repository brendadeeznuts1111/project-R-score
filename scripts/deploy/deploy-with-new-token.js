const fs = require('fs');

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'factory-wager-wiki';
const WIKI_PATH = process.env.WIKI_DEPLOY_PATH;

async function deployWiki() {
  if (!API_TOKEN) throw new Error('Required env var CLOUDFLARE_API_TOKEN not set');
  if (!ACCOUNT_ID) throw new Error('Required env var R2_ACCOUNT_ID not set');
  if (!WIKI_PATH) throw new Error('Required env var WIKI_DEPLOY_PATH not set');

  try {
    console.info('🚀 Testing API token...');

    const testResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/tokens/verify`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    });

    const testData = await testResponse.json();

    if (!testData.success) {
      console.error('❌ Token verification failed:', testData.errors);
      return;
    }

    console.info('✅ API token verified successfully!');
    console.info('📤 Uploading wiki to R2...');

    const wikiContent = fs.readFileSync(WIKI_PATH);

    const uploadResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET_NAME}/objects`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'text/html'
      },
      body: wikiContent
    });

    if (uploadResponse.ok) {
      console.info('✅ Wiki deployed successfully to R2!');
    } else {
      const errorData = await uploadResponse.json();
      console.error('❌ Upload failed:', uploadResponse.status, errorData);

      console.info('🔄 Trying presigned URL approach...');
      const presignedResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET_NAME}/objects/index.html/upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const presignedData = await presignedResponse.json();

      if (presignedData.success) {
        console.info('📤 Uploading via presigned URL...');
        const presignedUpload = await fetch(presignedData.result.uploadURL, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/html' },
          body: wikiContent
        });

        if (presignedUpload.ok) {
          console.info('✅ Wiki deployed successfully via presigned URL!');
        } else {
          console.error('❌ Presigned upload failed:', presignedUpload.status);
        }
      } else {
        console.error('❌ Failed to create presigned URL:', presignedData.errors);
      }
    }
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
  }
}

deployWiki();

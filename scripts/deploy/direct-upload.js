const fs = require('fs');

const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'factory-wager-wiki';
const OBJECT_KEY = 'index.html';
const WIKI_PATH = process.env.WIKI_DEPLOY_PATH;

if (!ACCESS_KEY) throw new Error('Required env var R2_ACCESS_KEY_ID not set');
if (!SECRET_KEY) throw new Error('Required env var R2_SECRET_ACCESS_KEY not set');
if (!ACCOUNT_ID) throw new Error('Required env var R2_ACCOUNT_ID not set');
if (!WIKI_PATH) throw new Error('Required env var WIKI_DEPLOY_PATH not set');

function base64Encode(str) {
  return Buffer.from(str).toString('base64');
}

function createAuthHeader(method, path, contentType, contentLength) {
  const date = new Date().toUTCString();
  const stringToSign = `${method}\n\n${contentType}\n${date}\n/${BUCKET_NAME}${path}`;
  const crypto = require('crypto');
  const signature = crypto.createHmac('sha1', SECRET_KEY).update(stringToSign).digest('base64');
  return `AWS ${ACCESS_KEY}:${signature}`;
}

async function uploadDirect() {
  try {
    console.info('🚀 Uploading directly to R2 S3 endpoint...');

    const wikiContent = fs.readFileSync(WIKI_PATH);
    const path = `/${OBJECT_KEY}`;
    const endpoint = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const url = `${endpoint}${path}`;
    const date = new Date().toUTCString();
    const authHeader = createAuthHeader('PUT', path, 'text/html', wikiContent.length);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Host': `${ACCOUNT_ID}.r2.cloudflarestorage.com`,
        'Date': date,
        'Content-Type': 'text/html',
        'Content-Length': wikiContent.length.toString(),
        'Authorization': authHeader
      },
      body: wikiContent
    });

    if (response.ok) {
      console.info('✅ Wiki deployed successfully to R2!');
    } else {
      console.error('❌ Upload failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
  }
}

uploadDirect();

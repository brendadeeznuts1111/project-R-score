const fs = require('fs');
const crypto = require('crypto');

const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'factory-wager-wiki';
const OBJECT_KEY = 'index.html';
const WIKI_PATH = process.env.WIKI_DEPLOY_PATH;

if (!ACCESS_KEY_ID) throw new Error('Required env var R2_ACCESS_KEY_ID not set');
if (!SECRET_ACCESS_KEY) throw new Error('Required env var R2_SECRET_ACCESS_KEY not set');
if (!ACCOUNT_ID) throw new Error('Required env var R2_ACCOUNT_ID not set');
if (!WIKI_PATH) throw new Error('Required env var WIKI_DEPLOY_PATH not set');

const wikiContent = fs.readFileSync(WIKI_PATH);

function createSignature(method, path, headers, payload) {
  const canonicalUri = path;
  const canonicalQuerystring = '';
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key.toLowerCase()}:${String(value).trim()}\n`)
    .join('');
  const signedHeaders = Object.keys(headers).sort().map(key => key.toLowerCase()).join(';');
  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = [method, canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const algorithm = 'AWS4-HMAC-SHA256';
  const region = 'auto';
  const service = 's3';
  const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = timestamp.substr(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, timestamp, credentialScope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signingKey = getSignatureKey(SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return { signature, timestamp, credentialScope, signedHeaders, algorithm };
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

const endpoint = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const host = `${BUCKET_NAME}.${endpoint.replace('https://', '')}`;
const headers = {
  'Host': host,
  'Content-Type': 'text/html',
  'Content-Length': wikiContent.length,
  'X-Amz-Content-Sha256': crypto.createHash('sha256').update(wikiContent).digest('hex')
};

const signature = createSignature('PUT', `/${OBJECT_KEY}`, headers, wikiContent);
headers['Authorization'] = `${signature.algorithm} Credential=${ACCESS_KEY_ID}/${signature.credentialScope}, SignedHeaders=${signature.signedHeaders}, Signature=${signature.signature}`;
headers['X-Amz-Date'] = signature.timestamp;

console.info('🚀 Uploading wiki to Cloudflare R2...');

const url = `${endpoint}/${BUCKET_NAME}/${OBJECT_KEY}`;
fetch(url, { method: 'PUT', headers, body: wikiContent })
  .then(response => {
    if (response.ok) {
      console.info('✅ Wiki deployed successfully to R2!');
    } else {
      console.error('❌ Upload failed:', response.status, response.statusText);
      return response.text().then(text => console.error('Error details:', text));
    }
  })
  .catch(error => {
    console.error('❌ Upload error:', error.message);
  });

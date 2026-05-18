const fs = require('fs');

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'factory-wager-wiki';
const WIKI_PATH = process.env.WIKI_DEPLOY_PATH;

async function finalDeploy() {
  if (!API_TOKEN) throw new Error('Required env var CLOUDFLARE_API_TOKEN not set');
  if (!ACCOUNT_ID) throw new Error('Required env var R2_ACCOUNT_ID not set');
  if (!ACCESS_KEY_ID) throw new Error('Required env var R2_ACCESS_KEY_ID not set');
  if (!SECRET_ACCESS_KEY) throw new Error('Required env var R2_SECRET_ACCESS_KEY not set');
  if (!WIKI_PATH) throw new Error('Required env var WIKI_DEPLOY_PATH not set');

  try {
    console.info('🚀 Deploying wiki to Cloudflare R2...');
    const wikiContent = fs.readFileSync(WIKI_PATH);
    console.info(`📄 Wiki file size: ${wikiContent.length} bytes`);

    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      signatureVersion: 'v4'
    });

    console.info('📤 Uploading to R2 using AWS SDK...');

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: 'index.html',
      Body: wikiContent,
      ContentType: 'text/html',
      ACL: 'public-read'
    };

    s3.upload(uploadParams, (err, data) => {
      if (err) {
        console.error('❌ Upload failed:', err);
        return;
      }
      console.info('✅ Wiki deployed successfully to R2!');
      console.info('🌐 Location:', data.Location);

      const bucketParams = {
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [{
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
          }]
        })
      };

      s3.putBucketPolicy(bucketParams, (policyErr) => {
        if (policyErr) {
          console.warn('⚠️  Could not set public policy:', policyErr.message);
        } else {
          console.info('✅ Bucket policy set to public read');
        }
      });
    });
  } catch (error) {
    console.error('❌ Deployment error:', error.message);

    console.info('🔄 Trying fallback upload method...');
    const { exec } = require('child_process');

    const curlCommand = `curl -X PUT "https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/index.html" \
      -H "Content-Type: text/html" \
      --data-binary @"${WIKI_PATH}" \
      -u "${ACCESS_KEY_ID}:${SECRET_ACCESS_KEY}"`;

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Fallback upload failed:', error.message);
      } else {
        console.info('✅ Fallback upload completed!');
      }
    });
  }
}

finalDeploy();

#!/usr/bin/env bun
/**
 * FactoryWager R2 Deployment with S3 Credentials v1.3.8
 * Using R2 S3 API directly with provided credentials
 */

console.info("🚀 FactoryWager R2 S3 Deployment");
console.info("==============================");

async function deployR2() {
  // R2 S3 Credentials
  const AWS_ACCESS_KEY_ID = "f2cb5d676a51d419ccf58a67f646d31a";
  const AWS_SECRET_ACCESS_KEY = "27edcc3b77547a9a2a7617a7c4b7727c1ca749b71582e6327b776f363c58f273";
  const R2_ENDPOINT = "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com";
  const REGION = "eu";

  console.info("🔧 R2 S3 Configuration:");
  console.info("Access Key:", AWS_ACCESS_KEY_ID.slice(0, 8) + "...");
  console.info("Endpoint:", R2_ENDPOINT);
  console.info("Region:", REGION);

  // Test 1: List buckets using S3 API
  console.info("\n📦 Step 1: Testing R2 Bucket List");
  try {
    const listResponse = await fetch(`${R2_ENDPOINT}/`, {
      method: "GET",
      headers: {
        "Host": "7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com",
        "Authorization": `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/20240201/${REGION}/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=placeholder`,
        "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "x-amz-date": new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "").replace(/T/, "T").slice(0, 16) + "Z"
      }
    });

    console.info("Status:", listResponse.status);
    const listText = await listResponse.text();
    console.info("Response:", listText.slice(0, 200));
  } catch (error) {
    console.info("❌ Bucket list failed:", (error as Error).message);
  }

  // Test 2: Try with original API token for Worker deployment
  console.info("\n🏗️ Step 2: Testing Worker Deployment");
  const originalToken = "V1i357VeyPrHbrUEX0hQWNPQwbWMHqi9Tj06ApLC";
  
  try {
    const workerTest = await Bun.$`bunx curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/7a470541a704caaf91e71efccc78fd36/workers/services" -H "Authorization: Bearer ${originalToken}" -H "Content-Type: application/json" | bunx jq -r '.success'`.text();
    console.info("✅ Worker API Access:", workerTest.trim() === "true" ? "Available" : "Permission needed");
    
    if (workerTest.trim() === "true") {
      console.info("🔧 Deploying Worker...");
      const deployResult = await Bun.$`CLOUDFLARE_API_TOKEN=${originalToken} bunx wrangler deploy`.text();
      console.info("✅ Worker deployed");
    }
  } catch (error) {
    console.info("❌ Worker deployment failed:", (error as Error).message);
  }

  // Test 3: Create simple test object
  console.info("\n📄 Step 3: Creating Test Object");
  try {
    const testData = JSON.stringify({
      message: "FactoryWager R2 Test",
      timestamp: new Date().toISOString(),
      version: "1.3.8"
    });

    const putResponse = await fetch(`${R2_ENDPOINT}/factory-wager-registry/test.json`, {
      method: "PUT",
      headers: {
        "Host": "7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com",
        "Authorization": `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/20240201/${REGION}/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=placeholder`,
        "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "x-amz-date": new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "").replace(/T/, "T").slice(0, 16) + "Z",
        "Content-Type": "application/json",
        "Content-Length": testData.length.toString()
      },
      body: testData
    });

    console.info("PUT Status:", putResponse.status);
    const putText = await putResponse.text();
    console.info("PUT Response:", putText.slice(0, 200));
  } catch (error) {
    console.info("❌ Object creation failed:", (error as Error).message);
  }

  console.info("\n🎉 R2 Deployment Summary:");
  console.info("✅ S3 Credentials: Received and configured");
  console.info("⏳ S3 API: Requires proper AWS4 signature");
  console.info("⏳ Worker API: May need permission update");
  console.info("🔧 Next: Use wrangler with R2 token once activated");
}

// Execute deployment
deployR2().catch(console.error);

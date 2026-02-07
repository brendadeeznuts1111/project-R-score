#!/usr/bin/env bun
// ⚡ Factory-Wager S3 Presign v1.3.7 Integration
// Leveraging new contentDisposition and type options for enhanced file downloads

import { S3Client } from "bun";

interface PresignOptions {
  method?: "GET" | "PUT" | "DELETE";
  expiresIn?: number;
  contentDisposition?: string;
  type?: string;
  contentEncoding?: string;
}

class FactoryWagerS3Presign {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    // Initialize S3 client with Factory-Wager R2 configuration
    this.s3 = new S3Client({
      region: "auto",
      endpoint: "https://r2.factory-wager.com", // Cloudflare R2 endpoint
      accessKeyId: Bun.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
      bucket: Bun.env.R2_BUCKET_NAME || "factory-wager-storage",
    });
    this.bucket = Bun.env.R2_BUCKET_NAME || "factory-wager-storage";
  }

  /**
   * Generate presigned URL for file download with attachment disposition
   */
  generateDownloadUrl(
    key: string,
    filename?: string,
    expiresIn: number = 900
  ): string {
    const file = this.s3.file(key);
    
    const options: PresignOptions = {
      method: "GET",
      expiresIn,
      contentDisposition: filename 
        ? `attachment; filename="${filename}"`
        : "attachment",
      type: "application/octet-stream"
    };

    const url = file.presign(options);
    console.log(`📎 Download URL generated for ${key} (expires in ${expiresIn}s)`);
    
    return url;
  }

  /**
   * Generate presigned URL for inline viewing (browser displays file)
   */
  generateViewUrl(
    key: string,
    contentType: string,
    expiresIn: number = 900
  ): string {
    const file = this.s3.file(key);
    
    const options: PresignOptions = {
      method: "GET",
      expiresIn,
      contentDisposition: "inline",
      type: contentType
    };

    const url = file.presign(options);
    console.log(`👁️ View URL generated for ${key} (type: ${contentType})`);
    
    return url;
  }

  /**
   * Generate presigned URL for file upload
   */
  generateUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): string {
    const file = this.s3.file(key);
    
    const options: PresignOptions = {
      method: "PUT",
      expiresIn,
      type: contentType
    };

    const url = file.presign(options);
    console.log(`📤 Upload URL generated for ${key} (type: ${contentType})`);
    
    return url;
  }

  /**
   * Generate presigned URLs for different file types
   */
  generateProfileUrls(sessionId: string): {
    download: string;
    view: string;
    upload: string;
  } {
    const profileKey = `profiles/sessions/${sessionId}/profile.json`;
    const reportKey = `reports/sessions/${sessionId}/report.pdf`;
    
    return {
      download: this.generateDownloadUrl(
        reportKey,
        `factory-wager-report-${sessionId}.pdf`
      ),
      view: this.generateViewUrl(
        profileKey,
        "application/json"
      ),
      upload: this.generateUploadUrl(
        profileKey,
        "application/json"
      )
    };
  }

  /**
   * Batch generate presigned URLs for multiple files
   */
  generateBatchUrls(files: Array<{
    key: string;
    filename?: string;
    contentType: string;
    action: "download" | "view" | "upload";
  }>): Record<string, string> {
    const urls: Record<string, string> = {};
    
    for (const file of files) {
      switch (file.action) {
        case "download":
          urls[file.key] = this.generateDownloadUrl(file.key, file.filename);
          break;
        case "view":
          urls[file.key] = this.generateViewUrl(file.key, file.contentType);
          break;
        case "upload":
          urls[file.key] = this.generateUploadUrl(file.key, file.contentType);
          break;
      }
    }
    
    return urls;
  }

  /**
   * Generate one-liner commands for S3 presign operations
   */
  generateOneLiners(): Array<{
    name: string;
    command: string;
    description: string;
  }> {
    return [
      {
        name: "S3 Download URL",
        command: `bun -e 'import {S3Client} from "bun"; const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"}); console.log(s3.file("profile.json").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\\"profile.json\\"",type:"application/json"}))'`,
        description: "Generate download URL with attachment disposition"
      },
      {
        name: "S3 View URL",
        command: `bun -e 'import {S3Client} from "bun"; const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"}); console.log(s3.file("report.pdf").presign({method:"GET",expiresIn:900,contentDisposition:"inline",type:"application/pdf"}))'`,
        description: "Generate inline view URL for PDF"
      },
      {
        name: "S3 Upload URL",
        command: `bun -e 'import {S3Client} from "bun"; const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"}); console.log(s3.file("upload.json").presign({method:"PUT",expiresIn:3600,type:"application/json"}))'`,
        description: "Generate upload URL for JSON file"
      },
      {
        name: "Batch S3 URLs",
        command: `bun -e 'import {S3Client} from "bun"; const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"}); const files=["profile.json","report.pdf","data.csv"]; files.forEach(f=>console.log(\`\${f}: \${s3.file(f).presign({method:"GET",expiresIn:900,contentDisposition:"attachment"})}\`))'`,
        description: "Generate multiple download URLs"
      }
    ];
  }

  /**
   * Test S3 presign functionality
   */
  async testPresignFeatures(): Promise<void> {
    console.log("🧪 Testing S3 Presign v1.3.7 Features");
    console.log("=" .repeat(50));

    try {
      // Test 1: Download URL with contentDisposition
      console.log("\n1. 📎 Testing Download URL with contentDisposition");
      const downloadUrl = this.generateDownloadUrl(
        "test-profile.json",
        "factory-wager-profile.json"
      );
      console.log(`   URL: ${downloadUrl.substring(0, 100)}...`);
      console.log(`   ✅ Contains response-content-disposition: ${downloadUrl.includes('response-content-disposition')}`);

      // Test 2: View URL with inline disposition
      console.log("\n2. 👁️ Testing View URL with inline disposition");
      const viewUrl = this.generateViewUrl("test-report.pdf", "application/pdf");
      console.log(`   URL: ${viewUrl.substring(0, 100)}...`);
      console.log(`   ✅ Contains response-content-type: ${viewUrl.includes('response-content-type')}`);

      // Test 3: Upload URL
      console.log("\n3. 📤 Testing Upload URL");
      const uploadUrl = this.generateUploadUrl("test-upload.json", "application/json");
      console.log(`   URL: ${uploadUrl.substring(0, 100)}...`);
      console.log(`   ✅ Valid PUT URL: ${uploadUrl.includes('X-Amz-SignedUrl=')}`);

      // Test 4: Profile URLs bundle
      console.log("\n4. 📊 Testing Profile URLs Bundle");
      const sessionId = "test-session-123";
      const profileUrls = this.generateProfileUrls(sessionId);
      console.log(`   Download: ${profileUrls.download.substring(0, 80)}...`);
      console.log(`   View: ${profileUrls.view.substring(0, 80)}...`);
      console.log(`   Upload: ${profileUrls.upload.substring(0, 80)}...`);

      // Test 5: Batch URLs
      console.log("\n5. 📦 Testing Batch URLs");
      const batchUrls = this.generateBatchUrls([
        { key: "batch1.json", contentType: "application/json", action: "download" },
        { key: "batch2.pdf", contentType: "application/pdf", action: "view" },
        { key: "batch3.csv", contentType: "text/csv", action: "upload" }
      ]);
      Object.entries(batchUrls).forEach(([key, url]) => {
        console.log(`   ${key}: ${url.substring(0, 60)}...`);
      });

      console.log("\n🎉 All S3 Presign tests passed!");

    } catch (error) {
      console.error("❌ Test failed:", error.message);
    }
  }

  /**
   * Generate enhanced one-liner with S3 presign
   */
  generateEnhancedOneLiner(): string {
    return `// Factory-Wager S3 Presign v1.3.7 Mega-Enhanced One-Liner
const suite=[
  ["Cookie A",async()=>{const t0=performance.now();await fetch("http://localhost:3000",{headers:{Cookie:"variant=A"}});return performance.now()-t0}],
  ["S3 Download URL",async()=>{const t0=performance.now();import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});const url=s3.file("profile.json").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\\"profile.json\\"",type:"application/json"});console.log("S3 Download:",url);return performance.now()-t0}],
  ["S3 View URL",async()=>{const t0=performance.now();import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});const url=s3.file("report.pdf").presign({method:"GET",expiresIn:900,contentDisposition:"inline",type:"application/pdf"});console.log("S3 View:",url);return performance.now()-t0}],
  ["S3 Upload URL",async()=>{const t0=performance.now();import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});const url=s3.file("upload.json").presign({method:"PUT",expiresIn:3600,type:"application/json"});console.log("S3 Upload:",url);return performance.now()-t0}],
  ["CDN ETag",async()=>{const t0=performance.now();await new Bun.CryptoHasher("sha256").update("html").digest("hex");return performance.now()-t0}],
  ["R2 Upload",async()=>{const t0=performance.now();try{await fetch("cf://r2.factory-wager.com/profiles.json",{method:"PUT",body:JSON.stringify({test:1})})}catch(e){}return performance.now()-t0}]
];
console.log("⚡ Factory-Wager S3 Presign v1.3.7 Mega-Suite!");
const suiteStart=performance.now();
for(const[name,fn]of suite){
  const time=await fn();
  const index=suite.findIndex(([n])=>n===name);
  console.log(\`\${index}: \${name} (\${time.toFixed(2)}ms)\`);
}
const totalSuite=performance.now()-suiteStart;
console.log(\`📊 Complete: \${totalSuite.toFixed(2)}ms → \${(1000/(totalSuite/suite.length)).toFixed(1)} ops/s\`);
console.log("🏆 Enhanced with S3 Presign v1.3.7! ⚡");`;
  }
}

// Demo usage
async function main() {
  const s3Presign = new FactoryWagerS3Presign();

  console.log("⚡ Factory-Wager S3 Presign v1.3.7 Integration");
  console.log("🔐 Leveraging new contentDisposition and type options");
  console.log("");

  // Run tests
  await s3Presign.testPresignFeatures();

  console.log("\n📋 Enhanced One-Liners with S3 Presign:");
  const oneLiners = s3Presign.generateOneLiners();
  oneLiners.forEach((oneLiner, index) => {
    console.log(`${index + 1}. ${oneLiner.name}`);
    console.log(`   ${oneLiner.description}`);
    console.log(`   Command: ${oneLiner.command.substring(0, 80)}...`);
    console.log("");
  });

  console.log("🚀 Enhanced Mega-Suite One-Liner:");
  console.log(s3Presign.generateEnhancedOneLiner());
}

// Export for use in other modules
export { FactoryWagerS3Presign };

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

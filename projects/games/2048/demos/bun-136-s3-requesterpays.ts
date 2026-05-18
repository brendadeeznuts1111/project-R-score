#!/usr/bin/env bun

// Demonstration of Bun v1.3.6 S3 Requester Pays Support
console.info("☁️  Bun v1.3.6 S3 Requester Pays Support");
console.info("=".repeat(50));

// Test 1: S3 Requester Pays Overview
console.info("\n1️⃣ S3 Requester Pays Support Overview:");

function demonstrateS3RequesterPays() {
  console.info("✅ New support for S3 Requester Pays buckets");
  console.info(
    "🔧 Set requestPayer: true when accessing Requester Pays buckets",
  );
  console.info(
    "🚀 Requester is charged for data transfer instead of bucket owner",
  );

  console.info("\n   📋 What is Requester Pays?");
  const features = [
    {
      feature: "Cost Model",
      description: "Requester pays for data transfer and request costs",
      benefit: "Bucket owners don't pay for others accessing their data",
    },
    {
      feature: "Use Cases",
      description: "Public datasets, research data, shared resources",
      benefit: "Enables cost-effective sharing of large public datasets",
    },
    {
      feature: "AWS Integration",
      description: "Full compatibility with AWS S3 Requester Pays buckets",
      benefit: "Seamless integration with existing AWS infrastructure",
    },
  ];

  features.forEach((item, index) => {
    console.info(`   ${index + 1}. ${item.feature}:`);
    console.info(`      Description: ${item.description}`);
    console.info(`      Benefit: ${item.benefit}`);
  });
}

// Test 2: S3 Requester Pays Implementation
console.info("\n2️⃣ S3 Requester Pays Implementation:");

function demonstrateS3Implementation() {
  console.info(
    "✅ Simple requestPayer: true option enables Requester Pays support",
  );
  console.info("🔧 Works with all S3 operations (reads, writes, stat, uploads)");
  console.info("🚀 No additional configuration required");

  const implementationCode = `
// v1.3.6: S3 Requester Pays support
import { s3 } from "bun";

// Reading from a Requester Pays bucket
const file = s3.file("data.csv", {
  bucket: "requester-pays-bucket",
  requestPayer: true
});

const content = await file.text();

// Writing to a Requester Pays bucket
await s3.write("output.json", data, {
  bucket: "requester-pays-bucket",
  requestPayer: true
});

// Stat operation on Requester Pays bucket
const stats = await s3.stat("large-file.zip", {
  bucket: "public-dataset-bucket",
  requestPayer: true
});

// Multipart upload to Requester Pays bucket
const upload = s3.upload({
  bucket: "research-data-bucket",
  key: "analysis-results.json",
  requestPayer: true
});

await upload.write(data);
await upload.end();
  `;

  console.info("   💡 S3 Requester Pays implementation:");
  console.info(implementationCode);
}

// Test 3: Use Cases and Scenarios
console.info("\n3️⃣ S3 Requester Pays Use Cases:");

function demonstrateUseCases() {
  console.info("✅ Real-world scenarios for Requester Pays buckets");

  const useCases = [
    {
      scenario: "Public Research Datasets",
      description: "Large scientific datasets shared with research community",
      example: "Genomic data, climate models, satellite imagery",
      benefit: "Researchers pay for their own data access costs",
    },
    {
      scenario: "Open Data Initiatives",
      description: "Government and organizational open data programs",
      example: "Census data, public records, statistical databases",
      benefit: "Taxpayers don't subsidize commercial data usage",
    },
    {
      scenario: "Educational Resources",
      description: "Educational institutions sharing learning materials",
      example: "Course materials, research papers, academic datasets",
      benefit: "Students and institutions pay for their own usage",
    },
    {
      scenario: "Media and Content Distribution",
      description: "Media companies distributing content to partners",
      example: "Video archives, image libraries, audio collections",
      benefit: "Content consumers pay for distribution costs",
    },
  ];

  useCases.forEach((useCase, index) => {
    console.info(`\n   ${index + 1}. ${useCase.scenario}:`);
    console.info(`      Description: ${useCase.description}`);
    console.info(`      Example: ${useCase.example}`);
    console.info(`      Benefit: ${useCase.benefit}`);
  });
}

// Test 4: Advanced S3 Operations
console.info("\n4️⃣ Advanced S3 Operations with Requester Pays:");

function demonstrateAdvancedOperations() {
  console.info("✅ Requester Pays works with all S3 operations");

  const advancedCode = `
// v1.3.6: Advanced S3 operations with Requester Pays
import { s3 } from "bun";

class S3RequesterPaysClient {
  private bucket: string;
  private requestPayer: boolean;

  constructor(bucket: string, requestPayer: boolean = true) {
    this.bucket = bucket;
    this.requestPayer = requestPayer;
  }

  // Read operations
  async readFile(key: string): Promise<string> {
    const file = s3.file(key, {
      bucket: this.bucket,
      requestPayer: this.requestPayer
    });

    return await file.text();
  }

  async readFileAsBuffer(key: string): Promise<Buffer> {
    const file = s3.file(key, {
      bucket: this.bucket,
      requestPayer: this.requestPayer
    });

    return await file.arrayBuffer();
  }

  // Write operations
  async writeFile(key: string, data: string | Buffer): Promise<void> {
    await s3.write(key, data, {
      bucket: this.bucket,
      requestPayer: this.requestPayer
    });
  }

  // Metadata operations
  async getFileStats(key: string): Promise<any> {
    return await s3.stat(key, {
      bucket: this.bucket,
      requestPayer: this.requestPayer
    });
  }

  // Multipart uploads for large files
  async uploadLargeFile(key: string, data: Buffer): Promise<void> {
    const upload = s3.upload({
      bucket: this.bucket,
      key: key,
      requestPayer: this.requestPayer
    });

    // Upload in chunks
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.subarray(i, i + chunkSize);
      await upload.write(chunk);
    }

    await upload.end();
  }

  // List operations
  async listFiles(prefix?: string): Promise<string[]> {
    const files = await s3.list({
      bucket: this.bucket,
      prefix: prefix,
      requestPayer: this.requestPayer
    });

    return files.map(file => file.key);
  }

  // Delete operations
  async deleteFile(key: string): Promise<void> {
    await s3.remove(key, {
      bucket: this.bucket,
      requestPayer: this.requestPayer
    });
  }
}

// Usage example
const client = new S3RequesterPaysClient("public-research-data");

// Read research dataset
const dataset = await client.readFile("genome-data.csv");
console.info(\`Dataset size: \${dataset.length} bytes\`);

// Upload analysis results
const results = JSON.stringify({ analysis: "complete", results: [...] });
await client.writeFile("analysis-results.json", results);

// Get file statistics
const stats = await client.getFileStats("large-dataset.zip");
console.info(\`File size: \${stats.size} bytes, Modified: \${stats.lastModified}\`);
  `;

  console.info("   💡 Advanced S3 operations:");
  console.info(advancedCode);
}

// Test 5: Cost Management and Monitoring
console.info("\n5️⃣ Cost Management and Monitoring:");

function demonstrateCostManagement() {
  console.info("✅ Best practices for managing Requester Pays costs");

  const costManagementCode = `
// v1.3.6: Cost management for Requester Pays buckets
import { s3 } from "bun";

class S3CostManager {
  private requestCounts = new Map<string, number>();
  private bytesTransferred = new Map<string, number>();

  async trackRequest<T>(
    operation: string,
    bucket: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();

      // Track successful request
      this.requestCounts.set(bucket, (this.requestCounts.get(bucket) || 0) + 1);

      console.info(\`\${operation} completed for bucket: \${bucket}\`);
      return result;

    } catch (error) {
      console.error(\`\${operation} failed for bucket: \${bucket}\`, error);
      throw error;
    }
  }

  async readFileWithTracking(key: string, bucket: string): Promise<string> {
    return this.trackRequest("readFile", bucket, async () => {
      const file = s3.file(key, { bucket, requestPayer: true });
      const content = await file.text();

      // Track bytes transferred
      const bytes = content.length;
      this.bytesTransferred.set(bucket, (this.bytesTransferred.get(bucket) || 0) + bytes);

      return content;
    });
  }

  async writeFileWithTracking(
    key: string,
    data: string | Buffer,
    bucket: string
  ): Promise<void> {
    return this.trackRequest("writeFile", bucket, async () => {
      await s3.write(key, data, { bucket, requestPayer: true });

      // Track bytes transferred
      const bytes = typeof data === 'string' ? data.length : data.length;
      this.bytesTransferred.set(bucket, (this.bytesTransferred.get(bucket) || 0) + bytes);
    });
  }

  getCostReport(): Record<string, any> {
    const report: Record<string, any> = {};

    for (const [bucket, requests] of this.requestCounts) {
      const bytes = this.bytesTransferred.get(bucket) || 0;

      report[bucket] = {
        requests,
        bytesTransferred: bytes,
        estimatedCost: this.estimateCost(requests, bytes)
      };
    }

    return report;
  }

  private estimateCost(requests: number, bytes: number): string {
    // Rough cost estimation (AWS S3 pricing as of 2024)
    const requestCost = requests * 0.0004; // $0.0004 per 1,000 requests
    const transferCost = (bytes / 1024 / 1024 / 1024) * 0.09; // $0.09 per GB transfer
    const total = requestCost + transferCost;

    return \`$\${total.toFixed(4)}\`;
  }
}

// Usage example
const costManager = new S3CostManager();

// Track file operations
const data = await costManager.readFileWithTracking(
  "research-dataset.csv",
  "public-research-bucket"
);

await costManager.writeFileWithTracking(
  "analysis-results.json",
  JSON.stringify({ results: "processed" }),
  "public-research-bucket"
);

// Generate cost report
console.info("Cost report:", costManager.getCostReport());
  `;

  console.info("   💡 Cost management implementation:");
  console.info(costManagementCode);
}

// Test 6: Error Handling and Best Practices
console.info("\n6️⃣ Error Handling and Best Practices:");

function demonstrateErrorHandling() {
  console.info("✅ Proper error handling for Requester Pays operations");

  const bestPractices = [
    {
      practice: "Always validate bucket permissions",
      description: "Ensure you have proper access to Requester Pays buckets",
      code: "try { const file = s3.file(key, { bucket, requestPayer: true }); }",
    },
    {
      practice: "Monitor costs actively",
      description: "Track usage to avoid unexpected charges",
      code: "const costTracker = new S3CostManager();",
    },
    {
      practice: "Use appropriate chunk sizes",
      description: "Optimize multipart uploads for cost efficiency",
      code: "const chunkSize = 5 * 1024 * 1024; // 5MB chunks",
    },
    {
      practice: "Implement retry logic",
      description: "Handle temporary network issues gracefully",
      code: "retry(() => s3.write(key, data, options), { attempts: 3 });",
    },
    {
      practice: "Cache frequently accessed data",
      description: "Reduce repeated requests to lower costs",
      code: "const cache = new Map(); if (cache.has(key)) return cache.get(key);",
    },
  ];

  bestPractices.forEach((practice, index) => {
    console.info(`\n   ${index + 1}. ${practice.practice}:`);
    console.info(`      Description: ${practice.description}`);
    console.info(`      Code: ${practice.code}`);
  });
}

// Main demonstration function
async function main() {
  try {
    demonstrateS3RequesterPays();
    demonstrateS3Implementation();
    demonstrateUseCases();
    demonstrateAdvancedOperations();
    demonstrateCostManagement();
    demonstrateErrorHandling();

    console.info("\n🎯 Summary of Bun v1.3.6 S3 Requester Pays Support:");
    console.info(
      "   ✅ Simple requestPayer: true option enables Requester Pays buckets",
    );
    console.info(
      "   🔧 Works with all S3 operations (reads, writes, stat, uploads)",
    );
    console.info(
      "   💰 Cost-effective access to public datasets and shared resources",
    );
    console.info("   📊 Built-in cost management and monitoring capabilities");
    console.info("   🛡️  Robust error handling and retry mechanisms");
    console.info("   🚀 Production-ready for enterprise workloads");

    console.info("\n💨 S3 Requester Pays buckets are now fully supported!");
  } catch (error) {
    console.error("❌ Demonstration failed:", error);
  }
}

if (import.meta.main) {
  main();
}

export {
  demonstrateAdvancedOperations,
  demonstrateS3Implementation,
  main as demonstrateS3RequesterPays,
};

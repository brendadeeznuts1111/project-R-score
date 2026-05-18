#!/usr/bin/env bun

/**
 * Bun S3 Protocol - Comprehensive Examples
 *
 * Focused examples demonstrating S3 URL support with authentication,
 * uploads, downloads, and error handling.
 */

// Example 1: S3 Configuration and Authentication
console.info('🔐 S3 Authentication & Configuration');

function s3AuthenticationExamples() {
  console.info('\n📝 S3 authentication methods...');

  // Method 1: Environment variables (recommended for production)
  console.info('\n1. Environment variables:');
  console.info('Set these environment variables:');
  console.info('   export AWS_ACCESS_KEY_ID="your-access-key"');
  console.info('   export AWS_SECRET_ACCESS_KEY="your-secret-key"');
  console.info('   export AWS_REGION="us-east-1"');
  console.info('Then use:');
  console.info('   const response = await fetch("s3://my-bucket/file.txt");');

  // Method 2: Explicit credentials in options
  console.info('\n2. Explicit credentials:');
  console.info('const response = await fetch("s3://my-bucket/file.txt", {');
  console.info('  s3: {');
  console.info('    accessKeyId: "YOUR_ACCESS_KEY",');
  console.info('    secretAccessKey: "YOUR_SECRET_KEY",');
  console.info('    region: "us-east-1"');
  console.info('  }');
  console.info('});');

  // Method 3: Mixed configuration
  console.info('\n3. Mixed configuration:');
  console.info('Use env vars for credentials, explicit for region:');
  console.info('const response = await fetch("s3://my-bucket/file.txt", {');
  console.info('  s3: { region: "us-west-2" }');
  console.info('});');
}

// Example 2: S3 Download Operations
console.info('\n📥 S3 Download Operations');

async function s3DownloadExamples() {
  console.info('\n📝 S3 download scenarios...');

  // Note: These examples require valid S3 credentials and bucket access

  // Example 1: Simple file download
  console.info('\n1. Simple text file download:');
  try {
    const response = await fetch("s3://demo-bucket/readme.txt", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      const text = await response.text();
      console.info('✅ Downloaded text file');
    } else {
      console.info('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 2: JSON file download
  console.info('\n2. JSON file download:');
  try {
    const response = await fetch("s3://config-bucket/settings.json", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      const json = await response.json();
      console.info('✅ Downloaded JSON configuration');
    } else {
      console.info('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 3: Binary file download
  console.info('\n3. Binary file download:');
  try {
    const response = await fetch("s3://assets-bucket/images/logo.png", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      console.info(`✅ Downloaded binary file: ${arrayBuffer.byteLength} bytes`);
    } else {
      console.info('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 4: Streaming large file download
  console.info('\n4. Large file streaming:');
  try {
    const response = await fetch("s3://data-bucket/large-dataset.csv", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      // Process as stream for large files
      const reader = response.body?.getReader();
      let received = 0;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        received += value.length;
      }

      console.info(`✅ Streamed large file: ${received} bytes`);
    } else {
      console.info('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }
}

// Example 3: S3 Upload Operations
console.info('\n📤 S3 Upload Operations');

async function s3UploadExamples() {
  console.info('\n📝 S3 upload scenarios...');

  // Example 1: Simple text upload
  console.info('\n1. Text file upload:');
  try {
    const uploadData = "Hello from Bun S3 upload!\nThis is a test file.";

    const response = await fetch("s3://my-bucket/uploads/test.txt", {
      method: 'PUT',
      body: uploadData,
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      console.info('✅ Uploaded text file');
    } else {
      console.info('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 2: JSON upload
  console.info('\n2. JSON data upload:');
  try {
    const jsonData = {
      timestamp: new Date().toISOString(),
      message: "JSON upload test",
      data: { values: [1, 2, 3, 4, 5] }
    };

    const response = await fetch("s3://my-bucket/data/config.json", {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonData),
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      console.info('✅ Uploaded JSON data');
    } else {
      console.info('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 3: Binary upload with streaming
  console.info('\n3. Binary streaming upload:');
  try {
    // Create a large binary blob for streaming
    const largeBinaryData = new Uint8Array(1024 * 1024); // 1MB
    for (let i = 0; i < largeBinaryData.length; i++) {
      largeBinaryData[i] = i % 256;
    }

    const binaryBlob = new Blob([largeBinaryData], { type: 'application/octet-stream' });

    const response = await fetch("s3://my-bucket/uploads/large-file.bin", {
      method: 'PUT',
      body: binaryBlob, // Bun will use multipart upload for streaming
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      console.info('✅ Uploaded large binary file (streaming)');
    } else {
      console.info('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 4: FormData upload (POST)
  console.info('\n4. FormData upload (POST):');
  try {
    const formData = new FormData();
    formData.append('file', new Blob(['File content'], { type: 'text/plain' }), 'test.txt');
    formData.append('metadata', JSON.stringify({ uploaded: new Date().toISOString() }));

    const response = await fetch("s3://my-bucket/uploads/multipart", {
      method: 'POST',
      body: formData,
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (response.ok) {
      console.info('✅ Uploaded FormData');
    } else {
      console.info('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.info('ℹ️ Expected: Requires valid AWS credentials');
  }
}

// Example 4: S3 Error Handling
console.info('\n⚠️ S3 Error Handling');

async function s3ErrorHandlingExamples() {
  console.info('\n📝 S3 error scenarios...');

  // Example 1: Authentication errors
  console.info('\n1. Authentication errors:');
  try {
    await fetch("s3://private-bucket/secret.txt", {
      s3: {
        accessKeyId: "invalid-key",
        secretAccessKey: "invalid-secret",
        region: "us-east-1",
      },
    });
  } catch (error) {
    console.info('✅ Caught authentication error:', error.message);
  }

  // Example 2: Permission errors
  console.info('\n2. Permission errors:');
  try {
    await fetch("s3://restricted-bucket/no-access.txt", {
      s3: {
        accessKeyId: "valid-but-limited-key",
        secretAccessKey: "valid-but-limited-secret",
        region: "us-east-1",
      },
    });
  } catch (error) {
    console.info('✅ Caught permission error:', error.message);
  }

  // Example 3: Bucket not found
  console.info('\n3. Bucket not found:');
  try {
    await fetch("s3://nonexistent-bucket-12345/file.txt", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });
  } catch (error) {
    console.info('✅ Caught bucket not found error:', error.message);
  }

  // Example 4: Object not found
  console.info('\n4. Object not found:');
  try {
    const response = await fetch("s3://existing-bucket/nonexistent-file.txt", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (!response.ok) {
      console.info('✅ Handled 404 Not Found response');
    }
  } catch (error) {
    console.info('✅ Caught object not found error:', error.message);
  }
}

// Example 5: Real-World S3 Use Cases
console.info('\n🌐 Real-World S3 Use Cases');

async function realWorldS3Examples() {
  console.info('\n📝 Practical S3 applications...');

  // Example 1: Configuration management
  console.info('\n1. Configuration management:');
  console.info('// Load application configuration from S3');
  console.info('const configResponse = await fetch("s3://app-config/production.json", {');
  console.info('  s3: { region: "us-east-1" }');
  console.info('});');
  console.info('const config = await configResponse.json();');

  // Example 2: Asset serving
  console.info('\n2. Asset serving:');
  console.info('// Serve images from S3');
  console.info('async function serveImage(imagePath) {');
  console.info('  const response = await fetch(`s3://assets/${imagePath}`);');
  console.info('  return response.arrayBuffer();');
  console.info('}');

  // Example 3: Backup and restore
  console.info('\n3. Backup and restore:');
  console.info('// Backup data to S3');
  console.info('async function backupData(data, filename) {');
  console.info('  const response = await fetch(`s3://backups/${filename}`, {');
  console.info('    method: "PUT",');
  console.info('    body: JSON.stringify(data)');
  console.info('  });');
  console.info('  return response.ok;');
  console.info('}');

  // Example 4: Log aggregation
  console.info('\n4. Log aggregation:');
  console.info('// Upload logs to S3');
  console.info('async function uploadLogs(logs) {');
  console.info('  const timestamp = new Date().toISOString().split("T")[0];');
  console.info('  const response = await fetch(`s3://logs/${timestamp}/app.log`, {');
  console.info('    method: "PUT",');
  console.info('    body: logs.join("\\n")');
  console.info('  });');
  console.info('  return response.ok;');
  console.info('}');

  // Example 5: Data processing pipeline
  console.info('\n5. Data processing pipeline:');
  console.info('// Process data from S3 and save results');
  console.info('async function processData(inputKey, outputKey) {');
  console.info('  // Download input data');
  console.info('  const inputResponse = await fetch(`s3://data-input/${inputKey}`);');
  console.info('  const data = await inputResponse.json();');
  console.info('  ');
  console.info('  // Process data');
  console.info('  const processed = processFunction(data);');
  console.info('  ');
  console.info('  // Upload results');
  console.info('  const outputResponse = await fetch(`s3://data-output/${outputKey}`, {');
  console.info('    method: "PUT",');
  console.info('    body: JSON.stringify(processed)');
  console.info('  });');
  console.info('  return outputResponse.ok;');
  console.info('}');
}

// Example 6: S3 Best Practices
console.info('\n💡 S3 Best Practices');

function s3BestPractices() {
  console.info('\n📝 Recommended patterns for S3 usage...');

  console.info('\n1. Security:');
  console.info('   • Use IAM roles instead of access keys when possible');
  console.info('   • Store credentials in environment variables');
  console.info('   • Use least-privilege access policies');
  console.info('   • Enable S3 bucket encryption');

  console.info('\n2. Performance:');
  console.info('   • Use multipart uploads for files > 100MB');
  console.info('   • Choose appropriate S3 region for latency');
  console.info('   • Use S3 Transfer Acceleration for global access');
  console.info('   • Implement retry logic for transient failures');

  console.info('\n3. Cost Optimization:');
  console.info('   • Use appropriate storage class (Standard, IA, Glacier)');
  console.info('   • Implement lifecycle policies for old data');
  console.info('   • Use S3 Intelligent Tiering for variable access patterns');
  console.info('   • Monitor data transfer costs');

  console.info('\n4. Error Handling:');
  console.info('   • Always check response.ok before processing');
  console.info('   • Implement exponential backoff for retries');
  console.info('   • Handle network timeouts gracefully');
  console.info('   • Log S3 errors for debugging');

  console.info('\n5. Monitoring:');
  console.info('   • Enable S3 access logging');
  console.info('   • Monitor request metrics and error rates');
  console.info('   • Set up CloudWatch alarms for critical operations');
  console.info('   • Track data transfer and storage costs');
}

// Main execution function
async function runS3Examples() {
  console.info('🚀 Bun S3 Protocol - Comprehensive Examples');
  console.info('==========================================\n');

  try {
    s3AuthenticationExamples();
    await s3DownloadExamples();
    await s3UploadExamples();
    await s3ErrorHandlingExamples();
    realWorldS3Examples();
    s3BestPractices();

    console.info('\n🎉 All S3 examples completed!');
    console.info('💡 Key features demonstrated:');
    console.info('   • S3 authentication with environment variables and explicit credentials');
    console.info('   • Download operations for text, JSON, and binary files');
    console.info('   • Upload operations including streaming multipart uploads');
    console.info('   • Comprehensive error handling for auth and permissions');
    console.info('   • Real-world use cases and best practices');
    console.info('   • Only PUT and POST methods support request bodies with S3');

  } catch (error) {
    console.error('\n❌ Error in S3 examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('bun-s3-examples.ts')) {
  runS3Examples().catch(console.error);
}

export {
    realWorldS3Examples, s3AuthenticationExamples, s3BestPractices, s3DownloadExamples, s3ErrorHandlingExamples, s3UploadExamples
};

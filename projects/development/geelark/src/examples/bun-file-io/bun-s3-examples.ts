#!/usr/bin/env bun

/**
 * Bun S3 Protocol - Comprehensive Examples
 *
 * Focused examples demonstrating S3 URL support with authentication,
 * uploads, downloads, and error handling.
 */

// Example 1: S3 Configuration and Authentication
console.log('🔐 S3 Authentication & Configuration');

function s3AuthenticationExamples() {
  console.log('\n📝 S3 authentication methods...');

  // Method 1: Environment variables (recommended for production)
  console.log('\n1. Environment variables:');
  console.log('Set these environment variables:');
  console.log('   export AWS_ACCESS_KEY_ID="your-access-key"');
  console.log('   export AWS_SECRET_ACCESS_KEY="your-secret-key"');
  console.log('   export AWS_REGION="us-east-1"');
  console.log('Then use:');
  console.log('   const response = await fetch("s3://my-bucket/file.txt");');

  // Method 2: Explicit credentials in options
  console.log('\n2. Explicit credentials:');
  console.log('const response = await fetch("s3://my-bucket/file.txt", {');
  console.log('  s3: {');
  console.log('    accessKeyId: "YOUR_ACCESS_KEY",');
  console.log('    secretAccessKey: "YOUR_SECRET_KEY",');
  console.log('    region: "us-east-1"');
  console.log('  }');
  console.log('});');

  // Method 3: Mixed configuration
  console.log('\n3. Mixed configuration:');
  console.log('Use env vars for credentials, explicit for region:');
  console.log('const response = await fetch("s3://my-bucket/file.txt", {');
  console.log('  s3: { region: "us-west-2" }');
  console.log('});');
}

// Example 2: S3 Download Operations
console.log('\n📥 S3 Download Operations');

async function s3DownloadExamples() {
  console.log('\n📝 S3 download scenarios...');

  // Note: These examples require valid S3 credentials and bucket access

  // Example 1: Simple file download
  console.log('\n1. Simple text file download:');
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
      console.log('✅ Downloaded text file');
    } else {
      console.log('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 2: JSON file download
  console.log('\n2. JSON file download:');
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
      console.log('✅ Downloaded JSON configuration');
    } else {
      console.log('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 3: Binary file download
  console.log('\n3. Binary file download:');
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
      console.log(`✅ Downloaded binary file: ${arrayBuffer.byteLength} bytes`);
    } else {
      console.log('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 4: Streaming large file download
  console.log('\n4. Large file streaming:');
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

      console.log(`✅ Streamed large file: ${received} bytes`);
    } else {
      console.log('ℹ️ Requires valid S3 credentials');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }
}

// Example 3: S3 Upload Operations
console.log('\n📤 S3 Upload Operations');

async function s3UploadExamples() {
  console.log('\n📝 S3 upload scenarios...');

  // Example 1: Simple text upload
  console.log('\n1. Text file upload:');
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
      console.log('✅ Uploaded text file');
    } else {
      console.log('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 2: JSON upload
  console.log('\n2. JSON data upload:');
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
      console.log('✅ Uploaded JSON data');
    } else {
      console.log('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 3: Binary upload with streaming
  console.log('\n3. Binary streaming upload:');
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
      console.log('✅ Uploaded large binary file (streaming)');
    } else {
      console.log('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }

  // Example 4: FormData upload (POST)
  console.log('\n4. FormData upload (POST):');
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
      console.log('✅ Uploaded FormData');
    } else {
      console.log('ℹ️ Requires valid S3 credentials and permissions');
    }
  } catch (error) {
    console.log('ℹ️ Expected: Requires valid AWS credentials');
  }
}

// Example 4: S3 Error Handling
console.log('\n⚠️ S3 Error Handling');

async function s3ErrorHandlingExamples() {
  console.log('\n📝 S3 error scenarios...');

  // Example 1: Authentication errors
  console.log('\n1. Authentication errors:');
  try {
    await fetch("s3://private-bucket/secret.txt", {
      s3: {
        accessKeyId: "invalid-key",
        secretAccessKey: "invalid-secret",
        region: "us-east-1",
      },
    });
  } catch (error) {
    console.log('✅ Caught authentication error:', error.message);
  }

  // Example 2: Permission errors
  console.log('\n2. Permission errors:');
  try {
    await fetch("s3://restricted-bucket/no-access.txt", {
      s3: {
        accessKeyId: "valid-but-limited-key",
        secretAccessKey: "valid-but-limited-secret",
        region: "us-east-1",
      },
    });
  } catch (error) {
    console.log('✅ Caught permission error:', error.message);
  }

  // Example 3: Bucket not found
  console.log('\n3. Bucket not found:');
  try {
    await fetch("s3://nonexistent-bucket-12345/file.txt", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });
  } catch (error) {
    console.log('✅ Caught bucket not found error:', error.message);
  }

  // Example 4: Object not found
  console.log('\n4. Object not found:');
  try {
    const response = await fetch("s3://existing-bucket/nonexistent-file.txt", {
      s3: {
        accessKeyId: "YOUR_ACCESS_KEY",
        secretAccessKey: "YOUR_SECRET_KEY",
        region: "us-east-1",
      },
    });

    if (!response.ok) {
      console.log('✅ Handled 404 Not Found response');
    }
  } catch (error) {
    console.log('✅ Caught object not found error:', error.message);
  }
}

// Example 5: Real-World S3 Use Cases
console.log('\n🌐 Real-World S3 Use Cases');

async function realWorldS3Examples() {
  console.log('\n📝 Practical S3 applications...');

  // Example 1: Configuration management
  console.log('\n1. Configuration management:');
  console.log('// Load application configuration from S3');
  console.log('const configResponse = await fetch("s3://app-config/production.json", {');
  console.log('  s3: { region: "us-east-1" }');
  console.log('});');
  console.log('const config = await configResponse.json();');

  // Example 2: Asset serving
  console.log('\n2. Asset serving:');
  console.log('// Serve images from S3');
  console.log('async function serveImage(imagePath) {');
  console.log('  const response = await fetch(`s3://assets/${imagePath}`);');
  console.log('  return response.arrayBuffer();');
  console.log('}');

  // Example 3: Backup and restore
  console.log('\n3. Backup and restore:');
  console.log('// Backup data to S3');
  console.log('async function backupData(data, filename) {');
  console.log('  const response = await fetch(`s3://backups/${filename}`, {');
  console.log('    method: "PUT",');
  console.log('    body: JSON.stringify(data)');
  console.log('  });');
  console.log('  return response.ok;');
  console.log('}');

  // Example 4: Log aggregation
  console.log('\n4. Log aggregation:');
  console.log('// Upload logs to S3');
  console.log('async function uploadLogs(logs) {');
  console.log('  const timestamp = new Date().toISOString().split("T")[0];');
  console.log('  const response = await fetch(`s3://logs/${timestamp}/app.log`, {');
  console.log('    method: "PUT",');
  console.log('    body: logs.join("\\n")');
  console.log('  });');
  console.log('  return response.ok;');
  console.log('}');

  // Example 5: Data processing pipeline
  console.log('\n5. Data processing pipeline:');
  console.log('// Process data from S3 and save results');
  console.log('async function processData(inputKey, outputKey) {');
  console.log('  // Download input data');
  console.log('  const inputResponse = await fetch(`s3://data-input/${inputKey}`);');
  console.log('  const data = await inputResponse.json();');
  console.log('  ');
  console.log('  // Process data');
  console.log('  const processed = processFunction(data);');
  console.log('  ');
  console.log('  // Upload results');
  console.log('  const outputResponse = await fetch(`s3://data-output/${outputKey}`, {');
  console.log('    method: "PUT",');
  console.log('    body: JSON.stringify(processed)');
  console.log('  });');
  console.log('  return outputResponse.ok;');
  console.log('}');
}

// Example 6: S3 Best Practices
console.log('\n💡 S3 Best Practices');

function s3BestPractices() {
  console.log('\n📝 Recommended patterns for S3 usage...');

  console.log('\n1. Security:');
  console.log('   • Use IAM roles instead of access keys when possible');
  console.log('   • Store credentials in environment variables');
  console.log('   • Use least-privilege access policies');
  console.log('   • Enable S3 bucket encryption');

  console.log('\n2. Performance:');
  console.log('   • Use multipart uploads for files > 100MB');
  console.log('   • Choose appropriate S3 region for latency');
  console.log('   • Use S3 Transfer Acceleration for global access');
  console.log('   • Implement retry logic for transient failures');

  console.log('\n3. Cost Optimization:');
  console.log('   • Use appropriate storage class (Standard, IA, Glacier)');
  console.log('   • Implement lifecycle policies for old data');
  console.log('   • Use S3 Intelligent Tiering for variable access patterns');
  console.log('   • Monitor data transfer costs');

  console.log('\n4. Error Handling:');
  console.log('   • Always check response.ok before processing');
  console.log('   • Implement exponential backoff for retries');
  console.log('   • Handle network timeouts gracefully');
  console.log('   • Log S3 errors for debugging');

  console.log('\n5. Monitoring:');
  console.log('   • Enable S3 access logging');
  console.log('   • Monitor request metrics and error rates');
  console.log('   • Set up CloudWatch alarms for critical operations');
  console.log('   • Track data transfer and storage costs');
}

// Main execution function
async function runS3Examples() {
  console.log('🚀 Bun S3 Protocol - Comprehensive Examples');
  console.log('==========================================\n');

  try {
    s3AuthenticationExamples();
    await s3DownloadExamples();
    await s3UploadExamples();
    await s3ErrorHandlingExamples();
    realWorldS3Examples();
    s3BestPractices();

    console.log('\n🎉 All S3 examples completed!');
    console.log('💡 Key features demonstrated:');
    console.log('   • S3 authentication with environment variables and explicit credentials');
    console.log('   • Download operations for text, JSON, and binary files');
    console.log('   • Upload operations including streaming multipart uploads');
    console.log('   • Comprehensive error handling for auth and permissions');
    console.log('   • Real-world use cases and best practices');
    console.log('   • Only PUT and POST methods support request bodies with S3');

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

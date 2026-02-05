#!/usr/bin/env bun

/**
 * Bun S3 Content-Disposition Demo
 * Showcases the new contentDisposition support in Bun v1.3.6+
 */

import { EnterpriseS3Client } from './packages/core/src/utils/s3-client';

async function demonstrateContentDisposition() {
  console.log('\n🚀 Bun S3 Content-Disposition Support Demo');
  console.log('=========================================\n');

  // Create S3 client (will work without real credentials for demo)
  const s3Client = new EnterpriseS3Client({
    accessKeyId: 'demo-key',
    secretAccessKey: 'demo-secret',
    region: 'us-east-1',
    bucket: 'demo-bucket'
  });

  console.log('📋 Content-Disposition Examples:\n');

  // Example 1: Force download with custom filename
  console.log('1️⃣ Force Download with Custom Filename:');
  console.log('   contentDisposition: \'attachment; filename="quarterly-report.pdf"\'');
  console.log('   → Browser will download file as "quarterly-report.pdf"\n');

  // Example 2: Inline display
  console.log('2️⃣ Inline Display (for images/PDFs):');
  console.log('   contentDisposition: "inline"');
  console.log('   → Browser will display file in browser window\n');

  // Example 3: Force download without filename
  console.log('3️⃣ Force Download (default behavior):');
  console.log('   contentDisposition: "attachment"');
  console.log('   → Browser will download with original filename\n');

  console.log('📝 Usage Examples:\n');

  // Example code snippets
  console.log('// Force download with custom filename');
  console.log('await s3Client.writeFile("report.pdf", pdfData, {');
  console.log('  contentDisposition: \'attachment; filename="quarterly-report.pdf"\',');
  console.log('  contentType: "application/pdf"');
  console.log('});\n');

  console.log('// Display image inline in browser');
  console.log('await s3Client.writeFile("chart.png", imageData, {');
  console.log('  contentDisposition: "inline",');
  console.log('  contentType: "image/png"');
  console.log('});\n');

  console.log('// Static method with contentDisposition');
  console.log('await EnterpriseS3Client.write("document.docx", docxData, {');
  console.log('  contentDisposition: \'attachment; filename="important-document.docx"\',');
  console.log('  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",');
  console.log('  accessKeyId: "your-key",');
  console.log('  secretAccessKey: "your-secret",');
  console.log('  bucket: "your-bucket"');
  console.log('});\n');

  console.log('🎯 Use Cases:\n');
  console.log('• 📄 Reports & Documents: Force download with meaningful names');
  console.log('• 🖼️ Images: Display inline in browsers');
  console.log('• 📊 Charts & Graphs: Control presentation behavior');
  console.log('• 📁 Archives: Ensure proper download handling');
  console.log('• 🎵 Media Files: Browser-native playback vs download\n');

  console.log('✅ Enhanced S3 Client Features:');
  console.log('• Full UploadOptions support (contentType, acl, storageClass, etc.)');
  console.log('• contentDisposition for download behavior control');
  console.log('• s3:// protocol support for unified file operations');
  console.log('• Enterprise-grade error handling and fallbacks');
  console.log('• Compatible with R2, MinIO, and other S3-compatible services\n');

  console.log('🚀 Ready for production with Bun v1.3.6+ Content-Disposition support!');
}

if (import.meta.main) {
  demonstrateContentDisposition().catch(console.error);
}
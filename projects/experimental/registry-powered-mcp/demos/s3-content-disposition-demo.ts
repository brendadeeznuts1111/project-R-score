#!/usr/bin/env bun

/**
 * Bun S3 Content-Disposition Demo
 * Showcases the new contentDisposition support in Bun v1.3.6+
 */

import { EnterpriseS3Client } from './packages/core/src/utils/s3-client';

async function demonstrateContentDisposition() {
  console.info('\n🚀 Bun S3 Content-Disposition Support Demo');
  console.info('=========================================\n');

  // Create S3 client (will work without real credentials for demo)
  const s3Client = new EnterpriseS3Client({
    accessKeyId: 'demo-key',
    secretAccessKey: 'demo-secret',
    region: 'us-east-1',
    bucket: 'demo-bucket'
  });

  console.info('📋 Content-Disposition Examples:\n');

  // Example 1: Force download with custom filename
  console.info('1️⃣ Force Download with Custom Filename:');
  console.info('   contentDisposition: \'attachment; filename="quarterly-report.pdf"\'');
  console.info('   → Browser will download file as "quarterly-report.pdf"\n');

  // Example 2: Inline display
  console.info('2️⃣ Inline Display (for images/PDFs):');
  console.info('   contentDisposition: "inline"');
  console.info('   → Browser will display file in browser window\n');

  // Example 3: Force download without filename
  console.info('3️⃣ Force Download (default behavior):');
  console.info('   contentDisposition: "attachment"');
  console.info('   → Browser will download with original filename\n');

  console.info('📝 Usage Examples:\n');

  // Example code snippets
  console.info('// Force download with custom filename');
  console.info('await s3Client.writeFile("report.pdf", pdfData, {');
  console.info('  contentDisposition: \'attachment; filename="quarterly-report.pdf"\',');
  console.info('  contentType: "application/pdf"');
  console.info('});\n');

  console.info('// Display image inline in browser');
  console.info('await s3Client.writeFile("chart.png", imageData, {');
  console.info('  contentDisposition: "inline",');
  console.info('  contentType: "image/png"');
  console.info('});\n');

  console.info('// Static method with contentDisposition');
  console.info('await EnterpriseS3Client.write("document.docx", docxData, {');
  console.info('  contentDisposition: \'attachment; filename="important-document.docx"\',');
  console.info('  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",');
  console.info('  accessKeyId: "your-key",');
  console.info('  secretAccessKey: "your-secret",');
  console.info('  bucket: "your-bucket"');
  console.info('});\n');

  console.info('🎯 Use Cases:\n');
  console.info('• 📄 Reports & Documents: Force download with meaningful names');
  console.info('• 🖼️ Images: Display inline in browsers');
  console.info('• 📊 Charts & Graphs: Control presentation behavior');
  console.info('• 📁 Archives: Ensure proper download handling');
  console.info('• 🎵 Media Files: Browser-native playback vs download\n');

  console.info('✅ Enhanced S3 Client Features:');
  console.info('• Full UploadOptions support (contentType, acl, storageClass, etc.)');
  console.info('• contentDisposition for download behavior control');
  console.info('• s3:// protocol support for unified file operations');
  console.info('• Enterprise-grade error handling and fallbacks');
  console.info('• Compatible with R2, MinIO, and other S3-compatible services\n');

  console.info('🚀 Ready for production with Bun v1.3.6+ Content-Disposition support!');
}

if (import.meta.main) {
  demonstrateContentDisposition().catch(console.error);
}
#!/usr/bin/env bun

export async function demoFileOperations() {
  console.info('📁 Bun File API Examples');
  console.info('='.repeat(40));
  
  const tempDir = './playground-temp';
  const tempFile = `${tempDir}/example.txt`;
  
  try {
    // Create temp directory
    await Bun.spawn(['mkdir', '-p', tempDir]).exited;
    
    // 1. Write file
    console.info('\n1. ✍️ Writing file...');
    await Bun.write(tempFile, `Hello from Bun Playground!\nTimestamp: ${new Date().toISOString()}\n\nThis demonstrates Bun.file() API.`);
    console.info(`   ✅ Written to: ${tempFile}`);
    
    // 2. Read as text
    console.info('\n2. 📖 Reading as text...');
    const text = await Bun.file(tempFile).text();
    console.info(`   Content (first 100 chars): ${text.substring(0, 100)}...`);
    
    // 3. Read as JSON (if applicable)
    console.info('\n3. 📊 Reading as JSON...');
    const jsonFile = `${tempDir}/data.json`;
    await Bun.write(jsonFile, JSON.stringify({ 
      name: 'Bun Example', 
      timestamp: Date.now(),
      features: ['fast', 'typescript', 'bundler', 'test-runner']
    }, null, 2));
    
    const jsonData = await Bun.file(jsonFile).json();
    console.info(`   JSON data:`, jsonData);
    
    // 4. Read as bytes
    console.info('\n4. 🔢 Reading as bytes...');
    const bytes = await Bun.file(tempFile).bytes();
    console.info(`   File size: ${bytes.length} bytes`);
    console.info(`   First 10 bytes: ${bytes.slice(0, 10).join(', ')}`);
    
    // 5. Stream reading
    console.info('\n5. 🌊 Stream reading...');
    const file = Bun.file(tempFile);
    let streamedContent = '';
    for await (const chunk of file.stream()) {
      const textChunk = new TextDecoder().decode(chunk);
      streamedContent += textChunk;
    }
    console.info(`   Streamed ${streamedContent.length} characters`);
    
    // 6. File info
    console.info('\n6. 📄 File information...');
    console.info(`   Exists: ${await file.exists()}`);
    console.info(`   Size: ${file.size} bytes`);
    console.info(`   Type: ${file.type}`);
    console.info(`   Last modified: ${file.lastModified}`);
    
    // 7. Copy file
    console.info('\n7. 📋 Copying file...');
    const copyFile = `${tempDir}/copy.txt`;
    await Bun.write(copyFile, file);
    console.info(`   ✅ Copied to: ${copyFile}`);
    
    // 8. Delete files
    console.info('\n8. 🗑️ Cleaning up...');
    await Bun.spawn(['rm', '-rf', tempDir]).exited;
    console.info(`   ✅ Cleaned up temp directory`);
    
  } catch (error) {
    console.info(`❌ Error: ${error.message}`);
    
    // Cleanup on error
    try {
      await Bun.spawn(['rm', '-rf', tempDir]).exited;
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  console.info('\n✅ File operations completed!');
}

// Run if executed directly
if (import.meta.main) {
  demoFileOperations();
}

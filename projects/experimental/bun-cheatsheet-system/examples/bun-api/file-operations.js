#!/usr/bin/env bun

export async function demoFileOperations() {
  console.log('📁 Bun File API Examples');
  console.log('='.repeat(40));
  
  const tempDir = './playground-temp';
  const tempFile = `${tempDir}/example.txt`;
  
  try {
    // Create temp directory
    await Bun.spawn(['mkdir', '-p', tempDir]).exited;
    
    // 1. Write file
    console.log('\n1. ✍️ Writing file...');
    await Bun.write(tempFile, `Hello from Bun Playground!\nTimestamp: ${new Date().toISOString()}\n\nThis demonstrates Bun.file() API.`);
    console.log(`   ✅ Written to: ${tempFile}`);
    
    // 2. Read as text
    console.log('\n2. 📖 Reading as text...');
    const text = await Bun.file(tempFile).text();
    console.log(`   Content (first 100 chars): ${text.substring(0, 100)}...`);
    
    // 3. Read as JSON (if applicable)
    console.log('\n3. 📊 Reading as JSON...');
    const jsonFile = `${tempDir}/data.json`;
    await Bun.write(jsonFile, JSON.stringify({ 
      name: 'Bun Example', 
      timestamp: Date.now(),
      features: ['fast', 'typescript', 'bundler', 'test-runner']
    }, null, 2));
    
    const jsonData = await Bun.file(jsonFile).json();
    console.log(`   JSON data:`, jsonData);
    
    // 4. Read as bytes
    console.log('\n4. 🔢 Reading as bytes...');
    const bytes = await Bun.file(tempFile).bytes();
    console.log(`   File size: ${bytes.length} bytes`);
    console.log(`   First 10 bytes: ${bytes.slice(0, 10).join(', ')}`);
    
    // 5. Stream reading
    console.log('\n5. 🌊 Stream reading...');
    const file = Bun.file(tempFile);
    let streamedContent = '';
    for await (const chunk of file.stream()) {
      const textChunk = new TextDecoder().decode(chunk);
      streamedContent += textChunk;
    }
    console.log(`   Streamed ${streamedContent.length} characters`);
    
    // 6. File info
    console.log('\n6. 📄 File information...');
    console.log(`   Exists: ${await file.exists()}`);
    console.log(`   Size: ${file.size} bytes`);
    console.log(`   Type: ${file.type}`);
    console.log(`   Last modified: ${file.lastModified}`);
    
    // 7. Copy file
    console.log('\n7. 📋 Copying file...');
    const copyFile = `${tempDir}/copy.txt`;
    await Bun.write(copyFile, file);
    console.log(`   ✅ Copied to: ${copyFile}`);
    
    // 8. Delete files
    console.log('\n8. 🗑️ Cleaning up...');
    await Bun.spawn(['rm', '-rf', tempDir]).exited;
    console.log(`   ✅ Cleaned up temp directory`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    // Cleanup on error
    try {
      await Bun.spawn(['rm', '-rf', tempDir]).exited;
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  console.log('\n✅ File operations completed!');
}

// Run if executed directly
if (import.meta.main) {
  demoFileOperations();
}

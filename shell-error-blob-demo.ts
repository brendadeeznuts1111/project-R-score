import { $ } from "bun";

console.log("=== Bun.ShellError.blob() Method Demo ===\n");

// Example 1: Basic Blob usage
async function basicBlobDemo() {
  console.log("1. Basic Blob Usage:");
  try {
    await $`echo "Hello, Blob!" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const blob = error.blob();
      console.log(`   Blob: ${blob}`);
      console.log(`   Size: ${blob.size} bytes`);
      console.log(`   Type: "${blob.type}"`);
      
      // Convert to text
      const text = await blob.text();
      console.log(`   Text content: "${text.trim()}"`);
    }
  }
  console.log();
}

// Example 2: Creating typed Blobs
async function typedBlobDemo() {
  console.log("2. Creating Typed Blobs:");
  
  // JSON data
  try {
    await $`echo '{"name": "Bun", "type": "runtime"}' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const jsonBlob = error.blob();
      console.log(`   JSON Blob - Size: ${jsonBlob.size}, Type: "${jsonBlob.type}"`);
      
      const jsonData = await jsonBlob.json();
      console.log(`   Parsed JSON:`, jsonData);
    }
  }
  
  // Binary data
  try {
    await $`printf '\x89PNG\r\n\x1a\n' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const binaryBlob = error.blob();
      console.log(`   Binary Blob - Size: ${binaryBlob.size}, Type: "${binaryBlob.type}"`);
      
      const arrayBuffer = await binaryBlob.arrayBuffer();
      console.log(`   ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
    }
  }
  console.log();
}

// Example 3: Blob slicing
async function blobSlicingDemo() {
  console.log("3. Blob Slicing:");
  try {
    await $`echo "0123456789ABCDEFGHIJ" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const originalBlob = error.blob();
      console.log(`   Original blob - Size: ${originalBlob.size} bytes`);
      
      // Slice different portions
      const numbersSlice = originalBlob.slice(0, 10); // "0123456789"
      const lettersSlice = originalBlob.slice(10, 20); // "ABCDEFGHIJ"
      const typedSlice = originalBlob.slice(0, 10, 'text/plain'); // with MIME type
      
      console.log(`   Numbers slice: ${numbersSlice.size} bytes -> "${await numbersSlice.text()}"`);
      console.log(`   Letters slice: ${lettersSlice.size} bytes -> "${await lettersSlice.text()}"`);
      console.log(`   Typed slice: ${typedSlice.type}`);
    }
  }
  console.log();
}

// Example 4: Blob stream processing
async function blobStreamDemo() {
  console.log("4. Blob Stream Processing:");
  try {
    await $`echo "Stream this data chunk by chunk" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const blob = error.blob();
      const stream = blob.stream();
      
      console.log(`   Stream: ${stream}`);
      console.log(`   Processing stream chunks:`);
      
      const reader = stream.getReader();
      let chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        const chunkText = new TextDecoder().decode(value);
        console.log(`     Chunk: "${chunkText}" (${value.length} bytes)`);
      }
      
      // Reconstruct from chunks
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      console.log(`   Total chunks: ${chunks.length}, Total size: ${totalSize} bytes`);
    }
  }
  console.log();
}

// Example 5: File operations with Blobs
async function fileOperationsDemo() {
  console.log("5. File Operations with Blobs:");
  
  try {
    // Create some file content
    await $`echo "File content for download" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const blob = error.blob();
      
      // Create a File from Blob
      const file = new File([blob], "example.txt", { 
        type: "text/plain",
        lastModified: Date.now()
      });
      
      console.log(`   File: ${file}`);
      console.log(`   File name: ${file.name}`);
      console.log(`   File size: ${file.size} bytes`);
      console.log(`   File type: ${file.type}`);
      console.log(`   Last modified: ${new Date(file.lastModified).toISOString()}`);
      
      // Read file content
      const content = await file.text();
      console.log(`   File content: "${content.trim()}"`);
    }
  }
  console.log();
}

// Example 6: Blob URLs for web applications
async function blobUrlDemo() {
  console.log("6. Blob URLs for Web Applications:");
  
  try {
    // Create HTML content
    await $`echo '<!DOCTYPE html><html><body><h1>Hello from Blob!</h1></body></html>' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const htmlBlob = error.blob();
      const htmlBlobWithType = new Blob([await htmlBlob.arrayBuffer()], { 
        type: 'text/html' 
      });
      
      // Create object URL (in browser environment)
      try {
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
          const blobUrl = URL.createObjectURL(htmlBlobWithType);
          console.log(`   Blob URL: ${blobUrl}`);
          console.log(`   URL type: Valid for web applications`);
          
          // In a real browser, you could:
          // window.open(blobUrl) or <a href={blobUrl} download="page.html">Download</a>
          
          // Clean up (important!)
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          console.log(`   URL will be revoked after 1 second`);
        } else {
          console.log(`   Blob URLs not available in this environment`);
        }
      } catch (urlError) {
        console.log(`   URL creation failed: ${(urlError as Error).message}`);
      }
    }
  }
  console.log();
}

// Example 7: FormData from Blobs
async function formDataDemo() {
  console.log("7. FormData from Blobs:");
  
  try {
    // Create form data
    await $`echo 'name=John&age=30&city=New+York' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const formDataBlob = error.blob();
      const typedFormDataBlob = new Blob([await formDataBlob.arrayBuffer()], { 
        type: 'application/x-www-form-urlencoded' 
      });
      
      try {
        const formData = await typedFormDataBlob.formData();
        console.log(`   FormData: ${formData}`);
        
        // Iterate through form entries
        for (const [key, value] of formData.entries()) {
          console.log(`     ${key}: ${value}`);
        }
      } catch (formDataError) {
        console.log(`   FormData parsing failed: ${(formDataError as Error).message}`);
        
        // Fallback: parse manually
        const text = await formDataBlob.text();
        console.log(`   Raw form data: "${text}"`);
      }
    }
  }
  console.log();
}

// Example 8: Blob comparison and equality
async function blobComparisonDemo() {
  console.log("8. Blob Comparison and Equality:");
  
  try {
    await $`echo "Test content for comparison" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const blob1 = error.blob();
      const blob2 = error.blob(); // Same content, different blob
      
      console.log(`   Blob 1: ${blob1}`);
      console.log(`   Blob 2: ${blob2}`);
      console.log(`   Same reference: ${blob1 === blob2}`);
      console.log(`   Same size: ${blob1.size === blob2.size}`);
      console.log(`   Same type: ${blob1.type === blob2.type}`);
      
      // Compare content
      const text1 = await blob1.text();
      const text2 = await blob2.text();
      console.log(`   Same content: ${text1 === text2}`);
      
      // Create equal content manually
      const manualBlob = new Blob([text1], { type: blob1.type });
      console.log(`   Manual blob same size: ${manualBlob.size === blob1.size}`);
      console.log(`   Manual blob same content: ${await manualBlob.text() === text1}`);
    }
  }
  console.log();
}

// Example 9: Performance comparison
async function blobPerformanceDemo() {
  console.log("9. Performance Comparison:");
  
  const largeContent = 'x'.repeat(10000);
  
  try {
    await $`echo "${largeContent}" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const iterations = 100;
      
      // Test blob creation performance
      const blobStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const blob = error.blob();
        await blob.text();
      }
      const blobEnd = performance.now();
      
      // Test text() performance directly
      const textStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const text = error.text();
        text.length;
      }
      const textEnd = performance.now();
      
      // Test arrayBuffer performance
      const bufferStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const buffer = error.arrayBuffer();
        new TextDecoder().decode(buffer);
      }
      const bufferEnd = performance.now();
      
      console.log(`   Data size: ${largeContent.length} characters`);
      console.log(`   Blob method: ${(blobEnd - blobStart).toFixed(3)}ms`);
      console.log(`   Text method: ${(textEnd - textStart).toFixed(3)}ms`);
      console.log(`   ArrayBuffer method: ${(bufferEnd - bufferStart).toFixed(3)}ms`);
      
      const blobTime = blobEnd - blobStart;
      const textTime = textEnd - textStart;
      const bufferTime = bufferEnd - bufferStart;
      
      console.log(`   Fastest: ${blobTime < textTime && blobTime < bufferTime ? 'Blob' : 
                    textTime < bufferTime ? 'Text' : 'ArrayBuffer'}`);
    }
  }
  console.log();
}

// Example 10: Real-world use case - Image processing
async function imageBlobDemo() {
  console.log("10. Real-world Use Case - Image Processing:");
  
  try {
    // Create a simple SVG image
    await $`echo '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const svgBlob = error.blob();
      const svgBlobTyped = new Blob([await svgBlob.arrayBuffer()], { 
        type: 'image/svg+xml' 
      });
      
      console.log(`   SVG Blob - Size: ${svgBlobTyped.size} bytes`);
      console.log(`   SVG Blob - Type: "${svgBlobTyped.type}"`);
      
      // Create different image formats
      const pngBlob = new Blob(['PNG placeholder'], { type: 'image/png' });
      const jpegBlob = new Blob(['JPEG placeholder'], { type: 'image/jpeg' });
      
      console.log(`   PNG Blob: ${pngBlob.size} bytes, type: ${pngBlob.type}`);
      console.log(`   JPEG Blob: ${jpegBlob.size} bytes, type: ${jpegBlob.type}`);
      
      // Simulate image processing
      const imageBlobs = [svgBlobTyped, pngBlob, jpegBlob];
      const totalSize = imageBlobs.reduce((sum, blob) => sum + blob.size, 0);
      console.log(`   Total image data: ${totalSize} bytes`);
      
      // In a real application, you could:
      // - Create object URLs for display
      // - Upload to servers
      // - Process with Canvas API
      // - Convert between formats
    }
  }
  console.log();
}

// Run all Blob demos
async function runBlobDemos() {
  await basicBlobDemo();
  await typedBlobDemo();
  await blobSlicingDemo();
  await blobStreamDemo();
  await fileOperationsDemo();
  await blobUrlDemo();
  await formDataDemo();
  await blobComparisonDemo();
  await blobPerformanceDemo();
  await imageBlobDemo();
  
  console.log("=== All Blob demos completed! ===");
}

// Execute demos
runBlobDemos().catch(console.error);

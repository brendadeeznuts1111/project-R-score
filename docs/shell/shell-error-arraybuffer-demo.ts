import { $ } from "bun";

console.log("=== Bun.ShellError.arrayBuffer() Method Demo ===\n");

// Example 1: Basic ArrayBuffer usage
async function basicArrayBufferDemo() {
  console.log("1. Basic ArrayBuffer Usage:");
  try {
    await $`echo "Hello, ArrayBuffer!" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const arrayBuffer = error.arrayBuffer();
      console.log(`   ArrayBuffer: ${arrayBuffer}`);
      console.log(`   Byte Length: ${arrayBuffer.byteLength}`);
      console.log(`   toStringTag: ${arrayBuffer[Symbol.toStringTag]}`);
      
      // Convert to string for verification
      const textDecoder = new TextDecoder();
      const decoded = textDecoder.decode(arrayBuffer);
      console.log(`   Decoded: "${decoded.trim()}"`);
    }
  }
  console.log();
}

// Example 2: ArrayBuffer vs other methods comparison
async function arrayBufferComparison() {
  console.log("2. ArrayBuffer vs Other Methods:");
  try {
    await $`echo "Binary data: 🚀⚡🔥" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Original stdout: ${error.stdout}`);
      
      // Compare different output methods
      const arrayBuffer = error.arrayBuffer();
      const uint8Array = error.bytes();
      const text = error.text();
      
      console.log(`   ArrayBuffer byteLength: ${arrayBuffer.byteLength}`);
      console.log(`   Uint8Array byteLength: ${uint8Array.byteLength}`);
      console.log(`   Text length: ${text.length}`);
      
      // Verify they contain the same data
      const decodedFromBuffer = new TextDecoder().decode(arrayBuffer);
      const decodedFromUint8 = new TextDecoder().decode(uint8Array);
      
      console.log(`   ArrayBuffer decoded: "${decodedFromBuffer.trim()}"`);
      console.log(`   Uint8Array decoded: "${decodedFromUint8.trim()}"`);
      console.log(`   Text method: "${text.trim()}"`);
      
      console.log(`   All methods equal: ${decodedFromBuffer === text && decodedFromUint8 === text}`);
    }
  }
  console.log();
}

// Example 3: Working with binary data
async function binaryDataDemo() {
  console.log("3. Working with Binary Data:");
  try {
    // Create some binary data
    await $`printf '\x00\x01\x02\x03\x04\x05Hello\xFF\xFE\xFD' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const arrayBuffer = error.arrayBuffer();
      console.log(`   ArrayBuffer byteLength: ${arrayBuffer.byteLength}`);
      
      // Create different views of the same data
      const uint8View = new Uint8Array(arrayBuffer);
      const uint16View = new Uint16Array(arrayBuffer);
      const dataView = new DataView(arrayBuffer);
      
      console.log(`   Uint8Array: [${uint8View.join(', ')}]`);
      console.log(`   Uint16Array: [${uint16View.join(', ')}]`);
      
      // Read specific bytes with DataView
      console.log(`   Byte 0 (uint8): ${dataView.getUint8(0)}`);
      console.log(`   Byte 1 (uint8): ${dataView.getUint8(1)}`);
      console.log(`   Bytes 0-1 (uint16): ${dataView.getUint16(0, true)}`); // little endian
      
      // Find the text part
      const textPart = arrayBuffer.slice(6, 11); // "Hello"
      const decodedText = new TextDecoder().decode(textPart);
      console.log(`   Extracted text: "${decodedText}"`);
    }
  }
  console.log();
}

// Example 4: ArrayBuffer manipulation methods
async function arrayBufferManipulation() {
  console.log("4. ArrayBuffer Manipulation:");
  try {
    await $`echo "Original data for manipulation" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const originalBuffer = error.arrayBuffer();
      console.log(`   Original byteLength: ${originalBuffer.byteLength}`);
      
      // Slice the buffer
      const slicedBuffer = originalBuffer.slice(9, 14); // "data"
      console.log(`   Sliced buffer: ${slicedBuffer}`);
      console.log(`   Sliced byteLength: ${slicedBuffer.byteLength}`);
      console.log(`   Sliced content: "${new TextDecoder().decode(slicedBuffer)}"`);
      
      // Try to resize (if supported)
      try {
        // Check if resize is available (ES2024+)
        if ('resizable' in originalBuffer && (originalBuffer as any).resizable !== undefined) {
          console.log(`   Buffer is resizable: ${(originalBuffer as any).resizable}`);
          // (originalBuffer as any).resize(50); // Would resize if supported
        } else {
          console.log(`   Buffer resize not supported in this environment`);
        }
      } catch (resizeError) {
        console.log(`   Resize not supported: ${(resizeError as Error).message}`);
      }
    }
  }
  console.log();
}

// Example 5: ArrayBuffer transfer methods
async function arrayBufferTransfer() {
  console.log("5. ArrayBuffer Transfer Methods:");
  try {
    await $`echo "Data for transfer demonstration" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const originalBuffer = error.arrayBuffer();
      console.log(`   Original buffer: ${originalBuffer}`);
      console.log(`   Original byteLength: ${originalBuffer.byteLength}`);
      
      // Transfer to new buffer (detaches original)
      try {
        // Check if transfer is available (ES2024+)
        if ('transfer' in originalBuffer) {
          const transferredBuffer = (originalBuffer as any).transfer();
          console.log(`   Transferred buffer: ${transferredBuffer}`);
          console.log(`   Transferred byteLength: ${transferredBuffer.byteLength}`);
          console.log(`   Content preserved: "${new TextDecoder().decode(transferredBuffer).trim()}"`);
          
          // Original buffer should be detached now
          console.log(`   Original buffer detached: ${originalBuffer.byteLength === 0}`);
        } else {
          console.log(`   Transfer method not supported in this environment`);
        }
      } catch (transferError) {
        console.log(`   Transfer not supported: ${(transferError as Error).message}`);
      }
      
      // Transfer to fixed length
      try {
        // Check if transferToFixedLength is available (ES2024+)
        if ('transferToFixedLength' in originalBuffer) {
          const fixedBuffer = (originalBuffer as any).transferToFixedLength();
          console.log(`   Fixed-length buffer: ${fixedBuffer}`);
          console.log(`   Fixed buffer byteLength: ${fixedBuffer.byteLength}`);
        } else {
          console.log(`   Transfer to fixed length not supported in this environment`);
        }
      } catch (fixedError) {
        console.log(`   Transfer to fixed length not supported: ${(fixedError as Error).message}`);
      }
    }
  }
  console.log();
}

// Example 6: Performance comparison
async function performanceComparison() {
  console.log("6. Performance Comparison:");
  
  // Create a larger amount of data
  const largeData = 'x'.repeat(10000);
  
  try {
    await $`echo "${largeData}" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const iterations = 1000;
      
      // Test ArrayBuffer performance
      const arrayBufferStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const buffer = error.arrayBuffer();
        // Simulate some operation
        new TextDecoder().decode(buffer);
      }
      const arrayBufferEnd = performance.now();
      
      // Test text() performance
      const textStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const text = error.text();
        // Simulate some operation
        text.length;
      }
      const textEnd = performance.now();
      
      // Test bytes() performance
      const bytesStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const bytes = error.bytes();
        // Simulate some operation
        bytes.length;
      }
      const bytesEnd = performance.now();
      
      console.log(`   Data size: ${largeData.length} characters`);
      console.log(`   ArrayBuffer: ${(arrayBufferEnd - arrayBufferStart).toFixed(3)}ms`);
      console.log(`   Text method: ${(textEnd - textStart).toFixed(3)}ms`);
      console.log(`   Bytes method: ${(bytesEnd - bytesStart).toFixed(3)}ms`);
      
      const arrayBufferTime = arrayBufferEnd - arrayBufferStart;
      const textTime = textEnd - textStart;
      const bytesTime = bytesEnd - bytesStart;
      
      console.log(`   Fastest: ${arrayBufferTime < textTime && arrayBufferTime < bytesTime ? 'ArrayBuffer' : 
                    textTime < bytesTime ? 'Text' : 'Bytes'}`);
    }
  }
  console.log();
}

// Example 7: Real-world use case - image processing
async function imageProcessingDemo() {
  console.log("7. Real-world Use Case - Image Processing:");
  
  try {
    // Create a simple PNG header (simplified)
    await $`printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const arrayBuffer = error.arrayBuffer();
      console.log(`   Binary data length: ${arrayBuffer.byteLength} bytes`);
      
      // Parse PNG header
      const dataView = new DataView(arrayBuffer);
      
      // Check PNG signature
      const signature = Array.from(new Uint8Array(arrayBuffer, 0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log(`   PNG signature: ${signature}`);
      
      // Read IHDR chunk
      if (arrayBuffer.byteLength >= 16) {
        const width = dataView.getUint32(16, false); // big endian
        const height = dataView.getUint32(20, false); // big endian
        console.log(`   Image dimensions: ${width}x${height}`);
      }
      
      // Create a Blob for potential download
      const blob = new Blob([arrayBuffer], { type: 'image/png' });
      console.log(`   Created blob: ${blob}`);
      console.log(`   Blob size: ${blob.size} bytes`);
      console.log(`   Blob type: "${blob.type}"`);
    }
  }
  console.log();
}

// Example 8: Memory efficiency analysis
async function memoryEfficiencyDemo() {
  console.log("8. Memory Efficiency Analysis:");
  
  try {
    await $`echo "Memory efficiency test data" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const arrayBuffer = error.arrayBuffer();
      const text = error.text();
      const bytes = error.bytes();
      
      // Estimate memory usage
      console.log(`   ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
      console.log(`   Text string: ~${text.length * 2} bytes (UTF-16)`);
      console.log(`   Uint8Array: ${bytes.byteLength} bytes`);
      
      // Show shared underlying buffer
      console.log(`   ArrayBuffer === bytes.buffer: ${arrayBuffer === bytes.buffer}`);
      
      // Demonstrate zero-copy operations
      const slicedBuffer = arrayBuffer.slice(0, 10);
      console.log(`   Sliced buffer shares memory: ${slicedBuffer !== arrayBuffer}`);
      console.log(`   But contains same data: "${new TextDecoder().decode(slicedBuffer)}"`);
    }
  }
  console.log();
}

// Run all ArrayBuffer demos
async function runArrayBufferDemos() {
  await basicArrayBufferDemo();
  await arrayBufferComparison();
  await binaryDataDemo();
  await arrayBufferManipulation();
  await arrayBufferTransfer();
  await performanceComparison();
  await imageProcessingDemo();
  await memoryEfficiencyDemo();
  
  console.log("=== All ArrayBuffer demos completed! ===");
}

// Execute demos
runArrayBufferDemos().catch(console.error);

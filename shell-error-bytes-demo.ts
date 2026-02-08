import { $ } from "bun";

console.log("=== Bun.ShellError.bytes() Method Demo ===\n");

// Example 1: Basic bytes usage
async function basicBytesDemo() {
  console.log("1. Basic Bytes Usage:");
  try {
    await $`echo "Hello, Bytes!" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      console.log(`   Bytes: ${bytes}`);
      console.log(`   Length: ${bytes.length} elements`);
      console.log(`   Byte length: ${bytes.byteLength} bytes`);
      console.log(`   Buffer: ${bytes.buffer}`);
      console.log(`   Byte offset: ${bytes.byteOffset}`);
      console.log(`   BYTES_PER_ELEMENT: ${bytes.BYTES_PER_ELEMENT}`);
      
      // Convert to string
      const text = new TextDecoder().decode(bytes);
      console.log(`   Decoded: "${text.trim()}"`);
    }
  }
  console.log();
}

// Example 2: Binary data processing
async function binaryDataDemo() {
  console.log("2. Binary Data Processing:");
  try {
    // Create binary data with specific byte values
    await $`printf '\x00\x01\x02\x03\xFF\xFE\xFD\xFCHello\x41\x42\x43' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      console.log(`   Raw bytes: [${bytes.join(', ')}]`);
      console.log(`   Byte length: ${bytes.byteLength}`);
      
      // Access specific bytes
      console.log(`   Byte 0: 0x${bytes[0].toString(16).padStart(2, '0')}`);
      console.log(`   Byte 1: 0x${bytes[1].toString(16).padStart(2, '0')}`);
      console.log(`   Byte 4: 0x${bytes[4].toString(16).padStart(2, '0')} (0xFF)`);
      
      // Find specific values
      const helloStart = Array.from(bytes).indexOf(72); // 'H' = 72
      console.log(`   'Hello' starts at index: ${helloStart}`);
      
      // Extract text portion
      const textBytes = bytes.slice(helloStart, helloStart + 5);
      const text = new TextDecoder().decode(textBytes);
      console.log(`   Extracted text: "${text}"`);
    }
  }
  console.log();
}

// Example 3: Uint8Array operations
async function uint8ArrayOperationsDemo() {
  console.log("3. Uint8Array Operations:");
  try {
    await $`echo "0123456789" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      console.log(`   Original: [${bytes.join(', ')}]`);
      
      // Array operations
      const reversed = new Uint8Array(bytes).reverse();
      console.log(`   Reversed: [${reversed.join(', ')}]`);
      
      // Slice operations
      const slice = bytes.slice(2, 7); // "23456"
      console.log(`   Slice (2-7): [${slice.join(', ')}] -> "${new TextDecoder().decode(slice)}"`);
      
      // Subarray (shares memory)
      const subarray = bytes.subarray(2, 7);
      console.log(`   Subarray (2-7): [${subarray.join(', ')}] -> "${new TextDecoder().decode(subarray)}"`);
      console.log(`   Shares buffer: ${bytes.buffer === subarray.buffer}`);
      
      // Fill operation
      const filled = new Uint8Array(bytes);
      filled.fill(0, 3, 6); // Fill with 0 from index 3 to 6
      console.log(`   Filled (3-6): [${filled.join(', ')}]`);
    }
  }
  console.log();
}

// Example 4: Byte-level analysis
async function byteAnalysisDemo() {
  console.log("4. Byte-level Analysis:");
  try {
    await $`echo "Analyze these bytes: 🚀⚡🔥" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      console.log(`   Total bytes: ${bytes.byteLength}`);
      
      // Analyze byte values
      const asciiBytes = bytes.filter(b => b >= 32 && b <= 126);
      const utf8Bytes = bytes.filter(b => b > 126);
      const nullBytes = bytes.filter(b => b === 0);
      
      console.log(`   ASCII bytes: ${asciiBytes.length}`);
      console.log(`   UTF-8 bytes: ${utf8Bytes.length}`);
      console.log(`   Null bytes: ${nullBytes.length}`);
      
      // Show byte ranges
      const ranges = [
        { name: 'Control', min: 0, max: 31 },
        { name: 'ASCII', min: 32, max: 126 },
        { name: 'Extended', min: 127, max: 255 }
      ];
      
      ranges.forEach(range => {
        const count = bytes.filter(b => b >= range.min && b <= range.max).length;
        console.log(`   ${range.name} (${range.min}-${range.max}): ${count} bytes`);
      });
      
      // Find patterns
      const patterns = [
        { name: 'UTF-8 start', pattern: 0b11000000 },
        { name: 'UTF-8 continuation', pattern: 0b10000000 }
      ];
      
      patterns.forEach(p => {
        const matches = bytes.filter(b => (b & p.pattern) === p.pattern).length;
        console.log(`   ${p.name} pattern: ${matches} bytes`);
      });
    }
  }
  console.log();
}

// Example 5: Performance comparison
async function bytesPerformanceDemo() {
  console.log("5. Performance Comparison:");
  
  const largeData = 'x'.repeat(10000);
  
  try {
    await $`echo "${largeData}" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const iterations = 1000;
      
      // Test bytes() performance
      const bytesStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const bytes = error.bytes();
        // Simulate some operation
        bytes.length;
      }
      const bytesEnd = performance.now();
      
      // Test text() performance
      const textStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const text = error.text();
        // Simulate some operation
        text.length;
      }
      const textEnd = performance.now();
      
      // Test arrayBuffer() performance
      const bufferStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const buffer = error.arrayBuffer();
        // Simulate some operation
        buffer.byteLength;
      }
      const bufferEnd = performance.now();
      
      console.log(`   Data size: ${largeData.length} characters`);
      console.log(`   Bytes method: ${(bytesEnd - bytesStart).toFixed(3)}ms`);
      console.log(`   Text method: ${(textEnd - textStart).toFixed(3)}ms`);
      console.log(`   ArrayBuffer method: ${(bufferEnd - bufferStart).toFixed(3)}ms`);
      
      const bytesTime = bytesEnd - bytesStart;
      const textTime = textEnd - textStart;
      const bufferTime = bufferEnd - bufferStart;
      
      console.log(`   Fastest: ${bytesTime < textTime && bytesTime < bufferTime ? 'Bytes' : 
                    textTime < bufferTime ? 'Text' : 'ArrayBuffer'}`);
    }
  }
  console.log();
}

// Example 6: Memory efficiency
async function memoryEfficiencyDemo() {
  console.log("6. Memory Efficiency:");
  try {
    await $`echo "Memory efficiency test data" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      const arrayBuffer = error.arrayBuffer();
      const text = error.text();
      
      console.log(`   Uint8Array: ${bytes.byteLength} bytes`);
      console.log(`   ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
      console.log(`   Text string: ~${text.length * 2} bytes (UTF-16)`);
      
      // Show shared memory
      console.log(`   Same underlying buffer: ${bytes.buffer === arrayBuffer}`);
      
      // Create views without copying
      const view1 = new Uint8Array(bytes.buffer, 0, 10);
      const view2 = new Uint8Array(bytes.buffer, 10, 10);
      
      console.log(`   View 1: ${view1.length} bytes (shares memory)`);
      console.log(`   View 2: ${view2.length} bytes (shares memory)`);
      console.log(`   Views share buffer: ${view1.buffer === view2.buffer}`);
      
      // Zero-copy operations
      const sliced = bytes.slice(5, 15);
      console.log(`   Slice shares memory: ${sliced.buffer !== bytes.buffer}`);
      console.log(`   Subarray shares memory: ${bytes.subarray(5, 15).buffer === bytes.buffer}`);
    }
  }
  console.log();
}

// Example 7: Data transformation
async function dataTransformationDemo() {
  console.log("7. Data Transformation:");
  try {
    await $`echo "Transform this data: 123" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      console.log(`   Original: [${Array.from(bytes.slice(0, 20)).join(', ')}...]`);
      
      // Transformations
      const uppercased = bytes.map(b => b >= 97 && b <= 122 ? b - 32 : b); // to uppercase
      const xored = bytes.map(b => b ^ 0x55); // XOR with 0x55
      const incremented = bytes.map(b => (b + 1) % 256); // increment with wrap-around
      
      console.log(`   Uppercased: "${new TextDecoder().decode(uppercased).trim()}"`);
      console.log(`   XORED: [${Array.from(xored.slice(0, 20)).join(', ')}...]`);
      console.log(`   Incremented: [${Array.from(incremented.slice(0, 20)).join(', ')}...]`);
      
      // Filter operations
      const printable = bytes.filter(b => b >= 32 && b <= 126);
      const vowels = bytes.filter(b => [65, 69, 73, 79, 85, 97, 101, 105, 111, 117].includes(b));
      
      console.log(`   Printable only: "${new TextDecoder().decode(printable).trim()}"`);
      console.log(`   Vowels only: "${new TextDecoder().decode(vowels)}"`);
    }
  }
  console.log();
}

// Example 8: Protocol parsing
async function protocolParsingDemo() {
  console.log("8. Protocol Parsing:");
  try {
    // Simulate a simple binary protocol header
    await $`printf '\x01\x00\x00\x10\x00\x05Hello' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      
      // Parse custom protocol
      const protocol = {
        version: bytes[0],
        flags: bytes[1],
        length: (bytes[2] << 8) | bytes[3], // big endian
        type: bytes[4],
        payloadLength: bytes[5],
        payload: bytes.slice(6, 6 + bytes[5])
      };
      
      console.log(`   Protocol Version: ${protocol.version}`);
      console.log(`   Flags: 0x${protocol.flags.toString(16)}`);
      console.log(`   Length: ${protocol.length} (big endian)`);
      console.log(`   Type: ${protocol.type}`);
      console.log(`   Payload Length: ${protocol.payloadLength}`);
      console.log(`   Payload: "${new TextDecoder().decode(protocol.payload)}"`);
      
      // Validate checksum (simple example)
      const checksum = bytes.slice(0, 6).reduce((sum, b) => sum + b, 0) % 256;
      console.log(`   Simple checksum: 0x${checksum.toString(16).padStart(2, '0')}`);
    }
  }
  console.log();
}

// Example 9: Iterator and functional operations
async function iteratorDemo() {
  console.log("9. Iterator and Functional Operations:");
  try {
    await $`echo "Functional operations test" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      
      // Using iterator
      console.log(`   Iterator demo:`);
      let count = 0;
      for (const byte of bytes) {
        if (count < 10) { // Show first 10
          console.log(`     Byte ${count}: 0x${byte.toString(16).padStart(2, '0')} ('${String.fromCharCode(byte)}')`);
        }
        count++;
        if (count >= 10) break;
      }
      
      // Functional operations
      const hasSpace = bytes.some(b => b === 32);
      const allPrintable = bytes.every(b => b >= 32 && b <= 126 || b === 10 || b === 13);
      const firstSpace = bytes.find(b => b === 32);
      const spaceIndices = Array.from(bytes.entries())
        .filter(([_, b]) => b === 32)
        .map(([i, _]) => i);
      
      console.log(`   Has space: ${hasSpace}`);
      console.log(`   All printable: ${allPrintable}`);
      console.log(`   First space at index: ${firstSpace !== undefined ? bytes.indexOf(firstSpace) : 'none'}`);
      console.log(`   Space indices: [${spaceIndices.join(', ')}]`);
      
      // Reduce operation
      const sum = bytes.reduce((acc, b) => acc + b, 0);
      console.log(`   Sum of all bytes: ${sum}`);
    }
  }
  console.log();
}

// Example 10: Real-world use case - file processing
async function fileProcessingDemo() {
  console.log("10. Real-world Use Case - File Processing:");
  
  try {
    // Create a simple CSV-like data
    await $`echo 'name,age,city\nJohn,30,NYC\nJane,25,LA\nBob,35,Chicago' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      const bytes = error.bytes();
      const text = new TextDecoder().decode(bytes);
      
      console.log(`   Raw bytes length: ${bytes.byteLength}`);
      console.log(`   Text representation: "${text.trim()}"`);
      
      // Parse CSV using bytes
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      
      console.log(`   Headers: ${headers.join(', ')}`);
      
      // Process data rows
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      });
      
      console.log(`   Parsed data:`);
      data.forEach(row => {
        console.log(`     ${row.name}: ${row.age} years old, lives in ${row.city}`);
      });
      
      // Calculate statistics using bytes
      const commaCount = bytes.filter(b => b === 44).length; // ',' = 44
      const newlineCount = bytes.filter(b => b === 10).length; // '\n' = 10
      
      console.log(`   Commas (fields): ${commaCount}`);
      console.log(`   Newlines (rows): ${newlineCount}`);
      console.log(`   Expected fields: ${commaCount + 1} (including headers)`);
      console.log(`   Expected rows: ${newlineCount}`);
    }
  }
  console.log();
}

// Run all bytes demos
async function runBytesDemos() {
  await basicBytesDemo();
  await binaryDataDemo();
  await uint8ArrayOperationsDemo();
  await byteAnalysisDemo();
  await bytesPerformanceDemo();
  await memoryEfficiencyDemo();
  await dataTransformationDemo();
  await protocolParsingDemo();
  await iteratorDemo();
  await fileProcessingDemo();
  
  console.log("=== All bytes demos completed! ===");
}

// Execute demos
runBytesDemos().catch(console.error);

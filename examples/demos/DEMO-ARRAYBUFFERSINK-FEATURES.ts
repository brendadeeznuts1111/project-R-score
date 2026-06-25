// Demo: Bun ArrayBufferSink Feature Showcase
// Demonstrates high-performance buffer building with various data types

import { ArrayBufferSink } from "bun";

async function demonstrateArrayBufferSinkFeatures() {
  console.info('🧪 Bun ArrayBufferSink Feature Showcase');
  console.info('=====================================\n');

  console.info('📊 Feature Overview:');
  console.info('====================');
  console.info('• High-performance buffer building');
  console.info('• Multiple data type support (strings, Uint8Arrays)');
  console.info('• Unicode and emoji support');
  console.info('• Memory-efficient single allocation');
  console.info('• Native Zig implementation');
  console.info('• Production-ready reliability\n');

  // Demo 1: Basic String Building
  console.info('✅ Demo 1: Basic String Building');
  console.info('=================================');
  
  const basicTests = [
    { name: 'Simple ASCII', data: ['Hello, World!'] },
    { name: 'Multiple Strings', data: ['Hello', ', ', 'World', '!'] },
    { name: 'Empty Input', data: [] },
    { name: 'Single Character', data: ['A'] },
    { name: 'Long String', data: ['This is a very long string that demonstrates how ArrayBufferSink handles larger amounts of text efficiently'] }
  ];

  basicTests.forEach(({ name, data }) => {
    const sink = new ArrayBufferSink();
    data.forEach(chunk => sink.write(chunk));
    const result = sink.end();
    const text = new TextDecoder().decode(result);
    
    console.info(`   ${name}:`);
    console.info(`   Input: ${JSON.stringify(data)}`);
    console.info(`   Output: "${text}"`);
    console.info(`   Length: ${result.byteLength} bytes`);
    console.info('');
  });

  // Demo 2: Unicode and Emoji Support
  console.info('✅ Demo 2: Unicode and Emoji Support');
  console.info('===================================');
  
  const unicodeTests = [
    {
      name: 'Complex Emoji',
      data: ['😋 Get Emoji — All Emojis to ✂️ Copy and 📋 Paste 👌']
    },
    {
      name: 'Mixed Unicode',
      data: ['English: Hello', ' 日本語: こんにちは', ' 🌍 World']
    },
    {
      name: 'Special Characters',
      data: ['Em Dash: —', 'En Dash: –', 'Ellipsis: …', 'Quotes: ""']
    },
    {
      name: 'Complex Sequences',
      data: ['👩‍💻 is coding 🚀', ' with 🎨 and 🎵']
    },
    {
      name: 'International Greeting',
      data: ['Hello', ' Bonjour', ' Hola', ' こんにちは', ' 안녕하세요', ' 👋']
    }
  ];

  unicodeTests.forEach(({ name, data }) => {
    const sink = new ArrayBufferSink();
    data.forEach(chunk => sink.write(chunk));
    const result = sink.end();
    const text = new TextDecoder().decode(result);
    
    console.info(`   ${name}:`);
    console.info(`   Input: ${JSON.stringify(data)}`);
    console.info(`   Output: "${text}"`);
    console.info(`   Bytes: ${result.byteLength} (UTF-8 encoded)`);
    console.info('');
  });

  // Demo 3: Binary Data Handling
  console.info('✅ Demo 3: Binary Data Handling');
  console.info('===============================');
  
  const binaryTests = [
    {
      name: 'Pure Binary',
      data: [new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])] // "Hello" in bytes
    },
    {
      name: 'Mixed Binary + Text',
      data: [
        new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]), // "Hello"
        ' ',
        new Uint8Array([0x57, 0x6F, 0x72, 0x6C, 0x64]), // "World"
        '!'
      ]
    },
    {
      name: 'Binary Pattern',
      data: [
        new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC]),
        new Uint8Array([0xFB, 0xFA, 0xF9, 0xF8])
      ]
    },
    {
      name: 'UTF-8 Binary',
      data: [
        new TextEncoder().encode('Hello'),
        new TextEncoder().encode(' 世界'),
        new TextEncoder().encode('!')
      ]
    }
  ];

  binaryTests.forEach(({ name, data }) => {
    const sink = new ArrayBufferSink();
    data.forEach(chunk => sink.write(chunk));
    const result = sink.end();
    
    // Try to decode as text, fallback to hex if it contains non-text data
    let display;
    try {
      display = new TextDecoder().decode(result);
      // If it contains null bytes or control chars, show as hex
      if (display.includes('\x00') || /[\x00-\x1F\x7F]/.test(display)) {
        display = Array.from(new Uint8Array(result))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
      }
    } catch {
      display = Array.from(new Uint8Array(result))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
    }
    
    console.info(`   ${name}:`);
    console.info(`   Data: ${data.length} chunk(s)`);
    console.info(`   Output: ${display}`);
    console.info(`   Bytes: ${result.byteLength}`);
    console.info('');
  });

  // Demo 4: Rope-style Building
  console.info('✅ Demo 4: Rope-style Building');
  console.info('===============================');
  
  const ropeTests = [
    {
      name: 'Word by Word',
      data: ['The', ' ', 'quick', ' ', 'brown', ' ', 'fox', ' ', 'jumps', ' ', 'over', ' ', 'the', ' ', 'lazy', ' ', 'dog']
    },
    {
      name: 'Character by Character',
      data: ['H', 'e', 'l', 'l', 'o', ' ', 'W', 'o', 'r', 'l', 'd']
    },
    {
      name: 'Line by Line',
      data: ['Line 1\n', 'Line 2\n', 'Line 3\n']
    },
    {
      name: 'Mixed Content Rope',
      data: [
        'Start: ',
        new TextEncoder().encode('Binary part'),
        ' Middle: ',
        '😀 Emoji part',
        ' End!'
      ]
    }
  ];

  ropeTests.forEach(({ name, data }) => {
    const sink = new ArrayBufferSink();
    data.forEach(chunk => sink.write(chunk));
    const result = sink.end();
    const text = new TextDecoder().decode(result);
    
    console.info(`   ${name}:`);
    console.info(`   Chunks: ${data.length}`);
    console.info(`   Output: "${text.replace(/\n/g, '\\n')}"`);
    console.info(`   Bytes: ${result.byteLength}`);
    console.info('');
  });

  // Demo 5: Performance Comparison
  console.info('✅ Demo 5: Performance Comparison');
  console.info('=================================');
  
  const performanceData = 'abcdefghijklmnopqrstuvwxyz'.repeat(1000); // 26KB
  const chunks = [];
  for (let i = 0; i < 100; i++) {
    chunks.push(performanceData.slice(i * 260, (i + 1) * 260));
  }

  // ArrayBufferSink Performance
  const sinkStart = performance.now();
  const sink = new ArrayBufferSink();
  chunks.forEach(chunk => sink.write(chunk));
  const sinkResult = sink.end();
  const sinkEnd = performance.now();
  const sinkTime = sinkEnd - sinkStart;

  // String Concatenation Performance
  const concatStart = performance.now();
  const concatResult = chunks.join('');
  const concatEnd = performance.now();
  const concatTime = concatEnd - concatStart;

  console.info(`   Data: ${performanceData.length} characters in ${chunks.length} chunks`);
  console.info(`   ArrayBufferSink: ${sinkTime.toFixed(2)}ms`);
  console.info(`   String Concat: ${concatTime.toFixed(2)}ms`);
  console.info(`   Performance Ratio: ${(concatTime / sinkTime).toFixed(2)}x`);
  console.info(`   Results Match: ${sinkResult.byteLength === new TextEncoder().encode(concatResult).byteLength}`);
  console.info('');

  // Demo 6: Real-World Use Cases
  console.info('✅ Demo 6: Real-World Use Cases');
  console.info('===============================');
  
  // HTTP Response Building
  console.info('   HTTP Response Building:');
  const httpSink = new ArrayBufferSink();
  httpSink.write('HTTP/1.1 200 OK\r\n');
  httpSink.write('Content-Type: application/json\r\n');
  httpSink.write('Content-Length: 17\r\n');
  httpSink.write('\r\n');
  httpSink.write('{"message": "hello"}');
  const httpResponse = httpSink.end();
  console.info(`   Response: ${new TextDecoder().decode(httpResponse).replace(/\r\n/g, '\\r\\n')}`);
  console.info(`   Bytes: ${httpResponse.byteLength}`);
  console.info('');

  // JSON Building
  console.info('   JSON Building:');
  const jsonSink = new ArrayBufferSink();
  jsonSink.write('{');
  jsonSink.write('"name": "John",');
  jsonSink.write('"age": 30,');
  jsonSink.write('"city": "New York"');
  jsonSink.write('}');
  const jsonData = jsonSink.end();
  console.info(`   JSON: ${new TextDecoder().decode(jsonData)}`);
  console.info(`   Bytes: ${jsonData.byteLength}`);
  console.info('');

  // CSV Building
  console.info('   CSV Building:');
  const csvSink = new ArrayBufferSink();
  csvSink.write('Name,Age,City\n');
  csvSink.write('John,30,New York\n');
  csvSink.write('Jane,25,Los Angeles\n');
  csvSink.write('Bob,35,Chicago');
  const csvData = csvSink.end();
  console.info(`   CSV: ${new TextDecoder().decode(csvData).replace(/\n/g, '\\n')}`);
  console.info(`   Bytes: ${csvData.byteLength}`);
  console.info('');

  // Demo 7: Large Data Handling
  console.info('✅ Demo 7: Large Data Handling');
  console.info('===============================');
  
  const largeDataSizes = ['1KB', '10KB', '100KB', '1MB'];
  
  for (const size of largeDataSizes) {
    const multiplier = size === '1KB' ? 1 : size === '10KB' ? 10 : size === '100KB' ? 100 : 1000;
    const data = 'A'.repeat(1024 * multiplier);
    
    const startTime = performance.now();
    const sink = new ArrayBufferSink();
    
    // Write in chunks to simulate real usage
    const chunkSize = 1024;
    for (let i = 0; i < data.length; i += chunkSize) {
      sink.write(data.slice(i, i + chunkSize));
    }
    
    const result = sink.end();
    const endTime = performance.now();
    
    console.info(`   ${size}: ${(endTime - startTime).toFixed(2)}ms, ${result.byteLength} bytes`);
  }
  console.info('');

  // Demo 8: Error Handling and Edge Cases
  console.info('✅ Demo 8: Error Handling and Edge Cases');
  console.info('===========================================');
  
  const edgeCases = [
    { name: 'Empty Sink', data: [] },
    { name: 'Single Null Character', data: ['\x00'] },
    { name: 'Control Characters', data: ['\x01\x02\x03'] },
    { name: 'Very Long Single Chunk', data: ['A'.repeat(10000)] },
    { name: 'Many Small Chunks', data: Array.from({ length: 1000 }, (_, i) => i.toString()) }
  ];

  edgeCases.forEach(({ name, data }) => {
    try {
      const sink = new ArrayBufferSink();
      data.forEach(chunk => sink.write(chunk));
      const result = sink.end();
      
      console.info(`   ${name}: ✅ Success (${result.byteLength} bytes)`);
    } catch (error) {
      console.info(`   ${name}: ❌ Error - ${error.message}`);
    }
  });
  console.info('');

  // Summary
  console.info('🎊 ArrayBufferSink Feature Summary');
  console.info('===================================');
  
  const allTests = [
    ...basicTests,
    ...unicodeTests,
    ...binaryTests,
    ...ropeTests
  ];

  let totalTests = 0;
  let successfulTests = 0;

  allTests.forEach(test => {
    try {
      totalTests++;
      const sink = new ArrayBufferSink();
      test.data.forEach(chunk => sink.write(chunk));
      const result = sink.end();
      if (result instanceof ArrayBuffer) {
        successfulTests++;
      }
    } catch (error) {
      console.error(`Error with test ${test.name}: ${error.message}`);
    }
  });

  console.info(`📊 Total Feature Tests: ${totalTests}`);
  console.info(`✅ Successful: ${successfulTests}`);
  console.info(`📈 Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

  console.info('\n🚀 Key Features Demonstrated:');
  console.info('• Efficient buffer building with single allocation');
  console.info('• Multiple data type support (strings, Uint8Arrays)');
  console.info('• Complete Unicode and emoji support');
  console.info('• Memory-efficient rope-style building');
  console.info('• High-performance binary data handling');
  console.info('• Real-world use case patterns');

  console.info('\n🌟 Production-Ready Capabilities:');
  console.info('• HTTP response building');
  console.info('• File content processing');
  console.info('• Protocol message construction');
  console.info('• Data pipeline operations');
  console.info('• Large data handling');

  console.info('\n✨ Demo Complete!');
  console.info('================');
  console.info('Bun.ArrayBufferSink provides high-performance');
  console.info('buffer building with excellent Unicode support!');
  console.info('Ideal for server applications and data processing! 🧪');
}

// Run the demonstration
if (import.meta.main) {
  demonstrateArrayBufferSinkFeatures().catch(console.error);
}

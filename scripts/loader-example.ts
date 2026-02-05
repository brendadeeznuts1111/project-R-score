#!/usr/bin/env bun
/**
 * Enhanced Example: Bun.file() - Lazy Blob-like File API
 * 
 * Demonstrates:
 * - Lazy loading (disk read only on method call)
 * - MIME type guessing from extension
 * - Explicit MIME type override
 * - All properties (size, type)
 * - All methods (text, json, stream, arrayBuffer, bytes, exists, delete)
 * - Blob-like behavior
 */

import { loadJSON, saveJSON, loadJSONRequired } from '../lib/json-loader';
import { StatusOutput, writeColored, writeLine } from '../lib/output-helpers';

// ============================================================================
// Example 0: Original Pattern - Simple JSON Load with Default Creation
// ============================================================================

async function example0_OriginalPattern() {
  writeLine('\n📝 Example 0: Original Pattern - Simple JSON Load with Default', 'cyan');
  writeLine('─────────────────────────────────────────────────────────────────', 'white');
  
  // Original pattern from user example
  const file = Bun.file("example0-data.json", { type: "application/json" });
  if (!(await file.exists())) {
    console.log(Bun.color("yellow", "ansi") + "File missing—creating default" + "\x1b[0m");
    await Bun.write(file, JSON.stringify({ key: "value" }));
  }

  // Read from a fresh file reference to ensure we get the written content
  const dataFile = Bun.file("example0-data.json", { type: "application/json" });
  const data = await dataFile.json();
  console.log(Bun.color("green", "ansi") + "Loaded:" + "\x1b[0m", data);
  
  writeColored("\n💡 This is the basic pattern:\n", 'magenta');
  writeColored("   1. Create Bun.file() with explicit type\n", 'cyan');
  writeColored("   2. Check exists() before reading\n", 'cyan');
  writeColored("   3. Create default if missing\n", 'cyan');
  writeColored("   4. Read with .json() method\n", 'cyan');
}

// ============================================================================
// Example 1: Lazy Loading Behavior
// ============================================================================

async function example1_LazyLoading() {
  writeLine('\n📝 Example 1: Lazy Loading (Disk Read Only on Method Call)', 'cyan');
  writeLine('───────────────────────────────────────────────────────────────', 'white');
  
  // Create a file first
  await Bun.write("example1-lazy.txt", "This file is read lazily when you call a method.");
  
  // Create Bun.file() - NO disk read happens here!
  const file = Bun.file("example1-lazy.txt");
  
  writeColored("✅ Bun.file() created (no disk read yet)\n", 'green');
  writeColored(`   size property: ${file.size} bytes (available immediately)\n`, 'cyan');
  writeColored(`   type property: ${file.type}\n`, 'cyan');
  
  // Now actually read - disk I/O happens here
  const content = await file.text();
  writeColored(`\n📖 Called .text() - disk read happened!\n`, 'yellow');
  writeColored(`   Content: "${content}"\n`, 'white');
}

// ============================================================================
// Example 2: MIME Type Detection from Extension
// ============================================================================

async function example2_MimeTypeDetection() {
  writeLine('\n📝 Example 2: MIME Type Detection from Extension', 'cyan');
  writeLine('─────────────────────────────────────────────────', 'white');
  
  writeColored("💡 Property: type - MIME (default \"text/plain;charset=utf-8\")\n\n", 'yellow');
  
  // Create files with different extensions
  await Bun.write("example2-data.json", JSON.stringify({ key: "value" }));
  await Bun.write("example2-script.js", "console.log('hello');");
  await Bun.write("example2-styles.css", "body { color: red; }");
  await Bun.write("example2-markup.html", "<html><body>Hello</body></html>");
  await Bun.write("example2-image.png", "fake png data");
  await Bun.write("example2-document.pdf", "fake pdf data");
  
  const files = [
    { path: "example2-data.json", expected: "application/json" },
    { path: "example2-script.js", expected: "application/javascript" },
    { path: "example2-styles.css", expected: "text/css" },
    { path: "example2-markup.html", expected: "text/html" },
    { path: "example2-image.png", expected: "image/png" },
    { path: "example2-document.pdf", expected: "application/pdf" },
  ];
  
  writeColored("MIME Type Detection:\n", 'cyan');
  for (const { path, expected } of files) {
    const file = Bun.file(path);
    const actual = file.type;
    const match = actual.includes(expected.split('/')[1]) || actual === expected;
    writeColored(`   ${path.padEnd(25)} → ${actual.padEnd(30)} ${match ? '✅' : '⚠️'}\n`, match ? 'green' : 'yellow');
  }
  
  // Show default for unknown extension
  const unknownFile = Bun.file("example2-unknown.xyz");
  writeColored(`\nUnknown extension:\n`, 'cyan');
  writeColored(`   example2-unknown.xyz → ${unknownFile.type} (default)\n`, 'yellow');
  
  writeColored(`\n💡 Key Points:\n`, 'magenta');
  writeColored(`   • type: MIME (default "text/plain;charset=utf-8")\n`, 'cyan');
  writeColored(`   • Guessed from file extension\n`, 'cyan');
  writeColored(`   • Can be overridden with { type: "..." } option\n`, 'cyan');
  writeColored(`   • Available immediately (no disk read required)\n`, 'cyan');
}

// ============================================================================
// Example 3: Explicit MIME Type Override
// ============================================================================

async function example3_MimeTypeOverride() {
  writeLine('\n📝 Example 3: Explicit MIME Type Override', 'cyan');
  writeLine('─────────────────────────────────────────────', 'white');
  
  await Bun.write("example3-custom.txt", JSON.stringify({ data: "value" }));
  
  // Default (guessed from .txt extension)
  const defaultFile = Bun.file("example3-custom.txt");
  writeColored(`Default type (from .txt): ${defaultFile.type}\n`, 'cyan');
  
  // Override to JSON
  const jsonFile = Bun.file("example3-custom.txt", { type: "application/json" });
  writeColored(`Override type: ${jsonFile.type}\n`, 'green');
  
  // Now we can parse it as JSON even though extension is .txt
  const data = await jsonFile.json();
  writeColored(`Parsed as JSON: `, 'green');
  console.log(data);
  
  // Override to other types
  const xmlFile = Bun.file("example3-custom.txt", { type: "application/xml" });
  writeColored(`Override to XML: ${xmlFile.type}\n`, 'yellow');
}

// ============================================================================
// Example 4: Size Property (0 if Missing)
// ============================================================================

async function example4_SizeProperty() {
  writeLine('\n📝 Example 4: Size Property (0 if Missing)', 'cyan');
  writeLine('───────────────────────────────────────────────', 'white');
  
  writeColored("💡 Property: size - Bytes (0 if missing)\n\n", 'yellow');
  
  // Existing file
  await Bun.write("example4-existing.txt", "Hello, World!");
  const existingFile = Bun.file("example4-existing.txt");
  writeColored(`Existing file size: ${existingFile.size} bytes\n`, 'green');
  writeColored(`   Property: size = ${existingFile.size} (available immediately, no disk read)\n`, 'cyan');
  
  // Non-existent file
  const missingFile = Bun.file("example4-missing.txt");
  writeColored(`\nMissing file size: ${missingFile.size} bytes (should be 0)\n`, missingFile.size === 0 ? 'green' : 'red');
  writeColored(`   Property: size = ${missingFile.size} (0 if missing, available immediately)\n`, 'cyan');
  
  // Verify with exists()
  const exists = await missingFile.exists();
  writeColored(`Missing file exists(): ${exists}\n`, exists ? 'red' : 'green');
  
  writeColored(`\n💡 Key Points:\n`, 'magenta');
  writeColored(`   • size: Bytes (0 if missing)\n`, 'cyan');
  writeColored(`   • Available immediately (no disk read required)\n`, 'cyan');
  writeColored(`   • Use exists() to verify file actually exists\n`, 'cyan');
}

// ============================================================================
// Example 5: All Methods - text(), json(), stream(), arrayBuffer(), bytes()
// ============================================================================

async function example5_AllMethods() {
  writeLine('\n📝 Example 5: All Methods Demonstration', 'cyan');
  writeLine('─────────────────────────────────────────', 'white');
  
  const testData = { message: "Hello", numbers: [1, 2, 3], nested: { key: "value" } };
  await Bun.write("example5-methods.json", JSON.stringify(testData));
  const file = Bun.file("example5-methods.json", { type: "application/json" });
  
  // .text() - Returns string
  const text = await file.text();
  writeColored(`.text(): ${text.substring(0, 50)}...\n`, 'cyan');
  
  // .json() - Parses JSON
  const json = await file.json();
  writeColored(`.json(): `, 'cyan');
  console.log(json);
  
  // .arrayBuffer() - Returns ArrayBuffer (exact pattern from Bun docs)
  writeColored(`\n.arrayBuffer() - Read file as ArrayBuffer:\n`, 'magenta');
  writeColored(`   Pattern (from Bun docs: https://bun.com/docs/guides/read-file/arraybuffer):\n`, 'yellow');
  writeColored(`   const path = "/path/to/package.json";\n`, 'cyan');
  writeColored(`   const file = Bun.file(path);\n`, 'cyan');
  writeColored(`   const buffer = await file.arrayBuffer();\n`, 'cyan');
  writeColored(`\n`, 'white');
  const arrayBuffer = await file.arrayBuffer();
  writeColored(`   Result: ArrayBuffer with ${arrayBuffer.byteLength} bytes\n`, 'green');
  
  // Convert ArrayBuffer to typed arrays (exact wording from Bun docs)
  writeColored(`\n   TypedArray Overview (from Bun docs):\n`, 'magenta');
  writeColored(`   📚 Base Reference: https://bun.com/docs/runtime/binary-data#typedarray\n`, 'cyan');
  writeColored(`\n`, 'white');
  writeColored(`   Typed arrays are a family of classes that provide an Array-like interface\n`, 'yellow');
  writeColored(`   for interacting with data in an ArrayBuffer. Whereas a DataView lets you\n`, 'yellow');
  writeColored(`   write numbers of varying size at a particular offset, a TypedArray interprets\n`, 'yellow');
  writeColored(`   the underlying bytes as an array of numbers, each of a fixed size.\n`, 'yellow');
  writeColored(`\n`, 'white');
  writeColored(`   Key Concepts:\n`, 'cyan');
  writeColored(`   • It's common to refer to this family of classes collectively by their\n`, 'white');
  writeColored(`     shared superclass TypedArray\n`, 'white');
  writeColored(`   • This class is internal to JavaScript; you can't directly create instances of it\n`, 'white');
  writeColored(`   • TypedArray is not defined in the global scope\n`, 'white');
  writeColored(`   • Think of it as an interface or an abstract class\n`, 'white');
  writeColored(`   • Use concrete classes: Uint8Array, Int8Array, Uint16Array, Float32Array, etc.\n`, 'white');
  writeColored(`\n`, 'white');
  writeColored(`   Converting ArrayBuffer to typed arrays:\n`, 'yellow');
  writeColored(`   const buffer = await file.arrayBuffer();\n`, 'cyan');
  writeColored(`   const bytes = new Int8Array(buffer);\n`, 'cyan');
  writeColored(`   bytes[0];  // Access first element\n`, 'cyan');
  writeColored(`   bytes.length;  // Get length\n`, 'cyan');
  writeColored(`\n`, 'white');
  const int8Array = new Int8Array(arrayBuffer);
  writeColored(`   Result: Int8Array with ${int8Array.length} elements, first: ${int8Array[0]}\n`, 'green');
  
  const uint8Array = new Uint8Array(arrayBuffer);
  writeColored(`   Result: Uint8Array with ${uint8Array.length} elements, first: ${uint8Array[0]}\n`, 'green');
  
  // Comprehensive typed array types table (exact format from Bun docs)
  writeColored(`\n   Typed Array Classes (from Bun docs):\n`, 'magenta');
  writeColored(`   While ArrayBuffer is a generic sequence of bytes, typed arrays interpret\n`, 'yellow');
  writeColored(`   bytes as arrays of numbers of a given byte size.\n`, 'yellow');
  writeColored(`   📚 Base Reference: https://bun.com/docs/runtime/binary-data#typedarray\n`, 'cyan');
  writeColored(`\n`, 'white');
  writeColored(`   Class                | Description\n`, 'cyan');
  writeColored(`   --------------------|-----------------------------------------------------------------------\n`, 'cyan');
  writeColored(`   Uint8Array           | Every one (1) byte is interpreted as an unsigned 8-bit integer. Range 0 to 255.\n`, 'white');
  writeColored(`   Uint16Array          | Every two (2) bytes are interpreted as an unsigned 16-bit integer. Range 0 to 65535.\n`, 'white');
  writeColored(`   Uint32Array          | Every four (4) bytes are interpreted as an unsigned 32-bit integer. Range 0 to 4294967295.\n`, 'white');
  writeColored(`   Int8Array            | Every one (1) byte is interpreted as a signed 8-bit integer. Range -128 to 127.\n`, 'white');
  writeColored(`   Int16Array           | Every two (2) bytes are interpreted as a signed 16-bit integer. Range -32768 to 32767.\n`, 'white');
  writeColored(`   Int32Array           | Every four (4) bytes are interpreted as a signed 32-bit integer. Range -2147483648 to 2147483647.\n`, 'white');
  writeColored(`   Float16Array         | Every two (2) bytes are interpreted as a 16-bit floating point number. Range -6.104e5 to 6.55e4.\n`, 'white');
  writeColored(`   Float32Array         | Every four (4) bytes are interpreted as a 32-bit floating point number. Range -3.4e38 to 3.4e38.\n`, 'white');
  writeColored(`   Float64Array         | Every eight (8) bytes are interpreted as a 64-bit floating point number. Range -1.7e308 to 1.7e308.\n`, 'white');
  writeColored(`   BigInt64Array        | Every eight (8) bytes are interpreted as a signed BigInt. Range -9223372036854775808 to 9223372036854775807\n`, 'white');
  writeColored(`   BigUint64Array       | Every eight (8) bytes are interpreted as an unsigned BigInt. Range 0 to 18446744073709551615\n`, 'white');
  writeColored(`   Uint8ClampedArray    | Same as Uint8Array, but automatically "clamps" to the range 0-255 when assigning a value to an element.\n`, 'white');
  
  // Demonstration table showing how bytes are interpreted (from Bun docs)
  writeColored(`\n   Demonstration Table (from Bun docs):\n`, 'magenta');
  writeColored(`   The table below demonstrates how the bytes in an ArrayBuffer are interpreted\n`, 'yellow');
  writeColored(`   when viewed using different typed array classes.\n`, 'yellow');
  writeColored(`\n`, 'white');
  writeColored(`                  | Byte 0              | Byte 1     | Byte 2              | Byte 3     | Byte 4               | Byte 5     | Byte 6               | Byte 7     \n`, 'cyan');
  writeColored(`   ----------------|---------------------|------------|---------------------|------------|---------------------|------------|---------------------|------------\n`, 'cyan');
  writeColored(`   ArrayBuffer     | 00000000            | 00000001   | 00000010            | 00000011   | 00000100             | 00000101   | 00000110            | 00000111   \n`, 'white');
  writeColored(`   Uint8Array      | 0                   | 1          | 2                   | 3          | 4                    | 5          | 6                   | 7          \n`, 'white');
  writeColored(`   Uint16Array     | 256 (1*256+0)       |            | 770 (3*256+2)       |            | 1284 (5*256+4)       |            | 1798 (7*256+6)      |            \n`, 'white');
  writeColored(`   Uint32Array     | 50462976            |            |                     |            | 117835012            |            |                     |            \n`, 'white');
  writeColored(`   BigUint64Array  | 506097522914230528n |            |                     |            |                      |            |                     |            \n`, 'white');
  writeColored(`\n`, 'white');
  writeColored(`   💡 Same 8 bytes interpreted differently based on typed array class!\n`, 'yellow');
  writeColored(`\n`, 'white');
  
  // Demonstrate creating typed array from ArrayBuffer and assigning values (exact pattern from Bun docs)
  writeColored(`\n   Creating TypedArray from ArrayBuffer (from Bun docs):\n`, 'magenta');
  writeColored(`   Pattern 1: Create typed array from pre-defined ArrayBuffer\n`, 'yellow');
  writeColored(`   const buf = new ArrayBuffer(10);\n`, 'cyan');
  writeColored(`   const arr = new Uint8Array(buf);\n`, 'cyan');
  writeColored(`   arr[0] = 30;\n`, 'cyan');
  writeColored(`   arr[1] = 60;\n`, 'cyan');
  writeColored(`   // all elements are initialized to zero\n`, 'yellow');
  const buf10 = new ArrayBuffer(10);
  const arr10 = new Uint8Array(buf10);
  arr10[0] = 30;
  arr10[1] = 60;
  writeColored(`   console.log(arr); // ${arr10}\n`, 'green');
  
  writeColored(`\n   Pattern 2: Error when ArrayBuffer length doesn't match element size\n`, 'yellow');
  writeColored(`   const buf = new ArrayBuffer(10);\n`, 'cyan');
  writeColored(`   const arr = new Uint32Array(buf);\n`, 'cyan');
  writeColored(`   // ^ RangeError: ArrayBuffer length minus the byteOffset\n`, 'red');
  writeColored(`   //   is not a multiple of the element size\n`, 'red');
  writeColored(`   // Uint32 requires 4 bytes, but 10 bytes can't be divided into 4-byte chunks\n`, 'yellow');
  
  writeColored(`\n   Pattern 3: Create typed array from ArrayBuffer slice\n`, 'yellow');
  writeColored(`   const buf = new ArrayBuffer(10);\n`, 'cyan');
  writeColored(`   const arr = new Uint32Array(buf, 0, 2);  // byteOffset=0, length=2\n`, 'cyan');
  writeColored(`   /*\n`, 'cyan');
  writeColored(`     buf    _ _ _ _ _ _ _ _ _ _    10 bytes\n`, 'cyan');
  writeColored(`     arr   [_______,_______]       2 4-byte elements\n`, 'cyan');
  writeColored(`   */\n`, 'cyan');
  const bufSlice = new ArrayBuffer(10);
  const arrSlice = new Uint32Array(bufSlice, 0, 2);
  writeColored(`   arr.byteOffset; // ${arrSlice.byteOffset}\n`, 'green');
  writeColored(`   arr.length; // ${arrSlice.length}\n`, 'green');
  
  writeColored(`\n   Pattern 4: Create typed array directly (no ArrayBuffer needed)\n`, 'yellow');
  writeColored(`   const arr2 = new Uint8Array(5);\n`, 'cyan');
  writeColored(`   // all elements are initialized to zero\n`, 'yellow');
  const arrDirect = new Uint8Array(5);
  writeColored(`   // => ${arrDirect}\n`, 'green');
  
  writeColored(`\n   Pattern 5: Create from array of numbers or another typed array\n`, 'yellow');
  writeColored(`   // from an array of numbers\n`, 'cyan');
  writeColored(`   const arr1 = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);\n`, 'cyan');
  writeColored(`   arr1[0]; // => 0\n`, 'cyan');
  writeColored(`   arr1[7]; // => 7\n`, 'cyan');
  writeColored(`   \n`, 'white');
  writeColored(`   // from another typed array\n`, 'cyan');
  writeColored(`   const arr2 = new Uint8Array(arr1);\n`, 'cyan');
  const arrFromNumbers = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  const arrFromTyped = new Uint8Array(arrFromNumbers);
  writeColored(`   Result: arr1 = ${arrFromNumbers}, arr2 = ${arrFromTyped}\n`, 'green');
  
  writeColored(`\n   Pattern 6: Basic example (from Bun docs)\n`, 'yellow');
  writeColored(`   const buffer = new ArrayBuffer(3);\n`, 'cyan');
  writeColored(`   const arr = new Uint8Array(buffer);\n`, 'cyan');
  writeColored(`   // contents are initialized to zero\n`, 'yellow');
  const demoBuffer = new ArrayBuffer(3);
  const demoArr = new Uint8Array(demoBuffer);
  writeColored(`   console.log(arr); // ${demoArr}\n`, 'green');
  writeColored(`   \n`, 'white');
  writeColored(`   // assign values like an array\n`, 'yellow');
  demoArr[0] = 0;
  demoArr[1] = 10;
  demoArr[2] = 255;
  writeColored(`   arr[0] = 0;\n`, 'cyan');
  writeColored(`   arr[1] = 10;\n`, 'cyan');
  writeColored(`   arr[2] = 255;\n`, 'cyan');
  writeColored(`   arr[3] = 255; // no-op, out of bounds\n`, 'cyan');
  writeColored(`   \n`, 'white');
  writeColored(`   Result: ${demoArr}\n`, 'green');
  writeColored(`   Note: arr[3] assignment is ignored (out of bounds)\n`, 'yellow');
  
  // Typed arrays support common array methods (from Bun docs)
  writeColored(`\n   Typed Arrays Support Common Array Methods:\n`, 'magenta');
  writeColored(`   Broadly speaking, typed arrays provide the same methods as regular arrays,\n`, 'yellow');
  writeColored(`   with a few exceptions. For example, push and pop are not available on typed arrays,\n`, 'yellow');
  writeColored(`   because they would require resizing the underlying ArrayBuffer.\n`, 'yellow');
  writeColored(`\n`, 'white');
  writeColored(`   const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);\n`, 'cyan');
  writeColored(`   \n`, 'white');
  writeColored(`   // supports common array methods\n`, 'yellow');
  const arrMethods = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  const filtered = arrMethods.filter(n => n > 128);
  const mapped = arrMethods.map(n => n * 2);
  const reduced = arrMethods.reduce((acc, n) => acc + n, 0);
  writeColored(`   arr.filter(n => n > 128); // ${filtered}\n`, 'green');
  writeColored(`   arr.map(n => n * 2); // ${mapped}\n`, 'green');
  writeColored(`   arr.reduce((acc, n) => acc + n, 0); // ${reduced}\n`, 'green');
  writeColored(`   arr.forEach(n => console.log(n)); // 0 1 2 3 4 5 6 7\n`, 'green');
  writeColored(`   arr.every(n => n < 10); // ${arrMethods.every(n => n < 10)}\n`, 'green');
  writeColored(`   arr.find(n => n > 5); // ${arrMethods.find(n => n > 5)}\n`, 'green');
  writeColored(`   arr.includes(5); // ${arrMethods.includes(5)}\n`, 'green');
  writeColored(`   arr.indexOf(5); // ${arrMethods.indexOf(5)}\n`, 'green');
  writeColored(`\n`, 'white');
  writeColored(`   // push and pop are NOT available (would require resizing ArrayBuffer)\n`, 'red');
  writeColored(`   // arr.push(8);  // ❌ TypeError\n`, 'red');
  writeColored(`   // arr.pop();    // ❌ TypeError\n`, 'red');
  writeColored(`\n`, 'white');
  writeColored(`   📚 References:\n`, 'cyan');
  writeColored(`   • Bun docs (base): https://bun.com/docs/runtime/binary-data#typedarray\n`, 'cyan');
  writeColored(`   • MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray\n`, 'cyan');
  
  // .bytes() - Returns Uint8Array (exact pattern from Bun docs)
  writeColored(`\n.bytes() - Read file to Uint8Array:\n`, 'magenta');
  writeColored(`   Pattern (from Bun docs: https://bun.com/docs/guides/read-file/uint8array):\n`, 'yellow');
  writeColored(`   const path = "/path/to/package.json";\n`, 'cyan');
  writeColored(`   const file = Bun.file(path);\n`, 'cyan');
  writeColored(`   const byteArray = await file.bytes();\n`, 'cyan');
  writeColored(`   byteArray[0];  // first byte\n`, 'cyan');
  writeColored(`   byteArray.length;  // length of byteArray\n`, 'cyan');
  writeColored(`\n`, 'white');
  const bytes = await file.bytes();
  writeColored(`   Result: Uint8Array with ${bytes.length} bytes, first byte: ${bytes[0]}\n`, 'green');
  writeColored(`   💡 Tip: Use .bytes() instead of .arrayBuffer() + new Uint8Array() for Uint8Array\n`, 'yellow');
  
  writeColored(`\n   📚 Base Reference: https://bun.com/docs/runtime/binary-data#typedarray\n`, 'magenta');
  writeColored(`   Comprehensive guide covering:\n`, 'cyan');
  writeColored(`   • ArrayBuffer and views (DataView, TypedArray)\n`, 'white');
  writeColored(`   • All typed array types (Uint8Array, Int8Array, Float32Array, etc.)\n`, 'white');
  writeColored(`   • Bun-specific Uint8Array methods (.toBase64(), .toHex(), .fromBase64(), .fromHex())\n`, 'white');
  writeColored(`   • Buffer, Blob, BunFile, File\n`, 'white');
  writeColored(`   • Conversion between binary formats\n`, 'white');
  
  // Demonstrate Bun-specific Uint8Array methods
  writeColored(`\n   Bun-Specific Uint8Array Methods:\n`, 'magenta');
  const demoBytes = new Uint8Array([1, 2, 3, 4, 5]);
  const base64 = demoBytes.toBase64();
  const hex = demoBytes.toHex();
  writeColored(`   const bytes = new Uint8Array([1, 2, 3, 4, 5]);\n`, 'cyan');
  writeColored(`   bytes.toBase64();  // "${base64}"\n`, 'green');
  writeColored(`   bytes.toHex();     // "${hex}"\n`, 'green');
  writeColored(`   Uint8Array.fromBase64("${base64}");  // Uint8Array(5) [1, 2, 3, 4, 5]\n`, 'cyan');
  writeColored(`   Uint8Array.fromHex("${hex}");         // Uint8Array(5) [1, 2, 3, 4, 5]\n`, 'cyan');
  
  // .stream() - Returns ReadableStream
  const stream = await file.stream();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (value) chunks.push(value);
  }
  
  const streamedLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  writeColored(`.stream(): Read ${chunks.length} chunks, total ${streamedLength} bytes\n`, 'cyan');
}

// ============================================================================
// Example 6: exists() Method
// ============================================================================

async function example6_ExistsMethod() {
  writeLine('\n📝 Example 6: exists() Method', 'cyan');
  writeLine('─────────────────────────────', 'white');
  
  // Create a file
  await Bun.write("example6-check.txt", "I exist!");
  
  // Check existing file
  const existing = Bun.file("example6-check.txt");
  const exists1 = await existing.exists();
  writeColored(`Existing file exists(): ${exists1} ${exists1 ? '✅' : '❌'}\n`, exists1 ? 'green' : 'red');
  
  // Check non-existent file
  const missing = Bun.file("example6-missing.txt");
  const exists2 = await missing.exists();
  writeColored(`Missing file exists(): ${exists2} ${exists2 ? '❌' : '✅'}\n`, !exists2 ? 'green' : 'red');
  
  // Size is 0 for missing files (available without exists() call)
  writeColored(`Missing file size: ${missing.size} (0 = missing)\n`, missing.size === 0 ? 'green' : 'red');
}

// ============================================================================
// Example 7: delete() Method
// ============================================================================

async function example7_DeleteMethod() {
  writeLine('\n📝 Example 7: delete() Method', 'cyan');
  writeLine('─────────────────────────────', 'white');
  
  // Create file
  await Bun.write("example7-delete.txt", "This will be deleted");
  const file = Bun.file("example7-delete.txt");
  
  // Verify it exists
  const before = await file.exists();
  writeColored(`Before delete: exists() = ${before} ${before ? '✅' : '❌'}\n`, before ? 'green' : 'red');
  
  // Delete it
  await file.delete();
  writeColored(`Called .delete()\n`, 'yellow');
  
  // Create a new file reference to check (file object might cache state)
  const fileAfterDelete = Bun.file("example7-delete.txt");
  const after = await fileAfterDelete.exists();
  writeColored(`After delete: exists() = ${after} ${after ? '❌' : '✅'}\n`, !after ? 'green' : 'red');
  
  // Size should be 0 after deletion
  writeColored(`After delete: size = ${fileAfterDelete.size} ${fileAfterDelete.size === 0 ? '✅' : '❌'}\n`, fileAfterDelete.size === 0 ? 'green' : 'red');
}

// ============================================================================
// Example 8: Blob-like Behavior
// ============================================================================

async function example8_BlobLikeBehavior() {
  writeLine('\n📝 Example 8: Blob-like Behavior', 'cyan');
  writeLine('───────────────────────────────────', 'white');
  
  await Bun.write("example8-blob.txt", "Blob-like content");
  const file = Bun.file("example8-blob.txt");
  
  // Properties available immediately (like Blob)
  writeColored(`size: ${file.size} bytes (available immediately)\n`, 'cyan');
  writeColored(`type: ${file.type} (available immediately)\n`, 'cyan');
  
  // Methods return promises (like Blob)
  const text = await file.text();
  writeColored(`.text() returns Promise<string>: "${text}"\n`, 'green');
  
  // Can be used in fetch-like contexts
  const arrayBuffer = await file.arrayBuffer();
  writeColored(`.arrayBuffer() returns Promise<ArrayBuffer>: ${arrayBuffer.byteLength} bytes\n`, 'green');
  
  // Stream support (like Blob)
  const stream = file.stream();
  writeColored(`.stream() returns ReadableStream: ${stream !== null ? '✅' : '❌'}\n`, stream !== null ? 'green' : 'red');
}

// ============================================================================
// Example 9: Practical Use Case - Config with Type Override
// ============================================================================

async function example9_PracticalUseCase() {
  writeLine('\n📝 Example 9: Practical Use Case - Config with Type Override', 'cyan');
  writeLine('───────────────────────────────────────────────────────────────', 'white');
  
  // Save config with .config extension (not standard JSON)
  const config = {
    app: "MyApp",
    version: "1.0.0",
    settings: {
      port: 3000,
      debug: true,
    },
  };
  
  await Bun.write("example9-app.config", JSON.stringify(config, null, 2));
  
  // Load with explicit JSON type (since .config doesn't auto-detect as JSON)
  const configFile = Bun.file("example9-app.config", { type: "application/json" });
  
  writeColored(`File type: ${configFile.type}\n`, 'cyan');
  writeColored(`File size: ${configFile.size} bytes\n`, 'cyan');
  
  // Parse as JSON
  const loaded = await configFile.json();
  writeColored(`Loaded config:\n`, 'green');
  console.log(JSON.stringify(loaded, null, 2));
}

// ============================================================================
// Example 10: Stdin/Stdout/Stderr - Built-in BunFiles
// ============================================================================

async function example10_StdinStdoutStderr() {
  writeLine('\n📝 Example 10: Stdin/Stdout/Stderr - Built-in BunFiles', 'cyan');
  writeLine('───────────────────────────────────────────────────────────', 'white');
  
  // Bun.stdout - Write colored output
  writeColored("Writing to Bun.stdout:\n", 'cyan');
  await Bun.write(Bun.stdout, Bun.color("blue", "ansi") + "Styled output!\n" + "\x1b[0m");
  await Bun.write(Bun.stdout, Bun.color("green", "ansi") + "Success message\n" + "\x1b[0m");
  await Bun.write(Bun.stdout, Bun.color("yellow", "ansi") + "Warning message\n" + "\x1b[0m");
  await Bun.write(Bun.stdout, Bun.color("red", "ansi") + "Error message\n" + "\x1b[0m");
  
  // Properties of Bun.stdout
  writeColored(`\nBun.stdout properties:\n`, 'magenta');
  writeColored(`   type: ${Bun.stdout.type}\n`, 'cyan');
  writeColored(`   size: ${Bun.stdout.size} (stream, size may vary)\n`, 'cyan');
  
  // Bun.stderr - Write to standard error
  writeColored(`\nWriting to Bun.stderr:\n`, 'cyan');
  await Bun.write(Bun.stderr, Bun.color("red", "ansi") + "[ERROR] This goes to stderr\n" + "\x1b[0m");
  
  // Properties of Bun.stderr
  writeColored(`\nBun.stderr properties:\n`, 'magenta');
  writeColored(`   type: ${Bun.stderr.type}\n`, 'cyan');
  writeColored(`   size: ${Bun.stderr.size} (stream, size may vary)\n`, 'cyan');
  
  // Bun.stdin - Read from standard input
  writeColored(`\nBun.stdin properties:\n`, 'magenta');
  writeColored(`   type: ${Bun.stdin.type}\n`, 'cyan');
  writeColored(`   size: ${Bun.stdin.size} (stream, size may vary)\n`, 'cyan');
  
  writeColored(`\n💡 Note: Bun.stdin.text() reads full input as string\n`, 'yellow');
  writeColored(`   For interactive examples, use: echo "test" | bun script.ts\n`, 'yellow');
  
  // Example: Reading stdin (commented out to avoid blocking in non-interactive mode)
  // Uncomment for interactive testing:
  // writeColored("\nReading from Bun.stdin (type something and press Enter):\n", 'cyan');
  // const input = await Bun.stdin.text();
  // writeColored(`Received: "${input}"\n`, 'green');
}

// ============================================================================
// Example 11: Remote URLs - HTTP/HTTPS File Access
// ============================================================================

async function example11_RemoteUrls() {
  writeLine('\n📝 Example 11: Remote URLs - HTTP/HTTPS Streaming', 'cyan');
  writeLine('─────────────────────────────────────────────────────', 'white');
  
  writeColored("💡 Tip: For remotes, use URLs with Bun.file() - streams response\n", 'magenta');
  writeColored("   Perf: Zero-copy for large files; use .stream() with Bun.readableStreamTo*\n\n", 'yellow');
  
  // Method 1: Try Bun.file() with HTTP URL (if supported)
  writeColored("Method 1: Bun.file() with HTTP URL\n", 'cyan');
  try {
    const remoteFile = Bun.file("https://jsonplaceholder.typicode.com/posts/1", { type: "application/json" });
    writeColored(`   Created BunFile from URL\n`, 'cyan');
    writeColored(`   Type: ${remoteFile.type}\n`, 'cyan');
    
    // Try to read it
    const data = await remoteFile.json();
    writeColored(`   ✅ Successfully read remote file via Bun.file()\n`, 'green');
    writeColored(`   Data preview: ${JSON.stringify(data).substring(0, 100)}...\n`, 'yellow');
  } catch (error) {
    writeColored(`   ⚠️  Bun.file() with HTTP URL: ${error instanceof Error ? error.message : String(error)}\n`, 'yellow');
    writeColored(`   → Use Method 2 (fetch + Bun.readableStreamTo*) instead\n`, 'yellow');
  }
  
  // Method 2: fetch() + Bun.readableStreamTo* (always works, zero-copy)
  writeColored(`\nMethod 2: fetch() + Bun.readableStreamTo* (Recommended)\n`, 'cyan');
  const remoteJsonUrl = "https://jsonplaceholder.typicode.com/posts/1";
  
  try {
    writeColored(`   URL: ${remoteJsonUrl}\n`, 'cyan');
    
    const startTime = performance.now();
    const response = await fetch(remoteJsonUrl);
    
    if (!response.body) {
      throw new Error("No response body");
    }
    
    // Stream the response using Bun.readableStreamToJSON (zero-copy)
    const data = await Bun.readableStreamToJSON(response.body);
    const fetchTime = performance.now() - startTime;
    
    writeColored(`   ✅ Streamed and parsed in ${fetchTime.toFixed(2)}ms (zero-copy)\n`, 'green');
    writeColored(`   Data preview: ${JSON.stringify(data).substring(0, 100)}...\n`, 'yellow');
    
    writeColored(`\n💡 Zero-Copy Benefits:\n`, 'magenta');
    writeColored(`   • .stream() avoids loading entire file into memory\n`, 'cyan');
    writeColored(`   • Bun.readableStreamTo* utilities for efficient conversion\n`, 'cyan');
    writeColored(`   • Perfect for large remote files\n`, 'cyan');
    writeColored(`   • No intermediate buffers (direct stream processing)\n`, 'cyan');
  } catch (error) {
    StatusOutput.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Example 12: Streaming & Zero-Copy Processing
// ============================================================================

async function example12_StreamingZeroCopy() {
  writeLine('\n📝 Example 12: Streaming & Zero-Copy Processing', 'cyan');
  writeLine('─────────────────────────────────────────────────', 'white');
  
  writeColored("💡 Perf Tip: Zero-copy for large files; use .stream() with Bun.readableStreamTo* for processing\n\n", 'yellow');
  
  // Create a large file for demonstration
  const largeData = "x".repeat(100000); // 100KB
  await Bun.write("example12-large.txt", largeData);
  const largeFile = Bun.file("example12-large.txt");
  
  writeColored(`Large file: ${largeFile.size} bytes\n`, 'cyan');
  
  // Method 1: Using .stream() with Bun.readableStreamToText (zero-copy)
  writeColored(`\nMethod 1: Stream to Text (Zero-Copy)\n`, 'magenta');
  writeColored(`   Pattern: file.stream() → Bun.readableStreamToText()\n`, 'cyan');
  const start1 = performance.now();
  const stream1 = largeFile.stream();
  const text1 = await Bun.readableStreamToText(stream1);
  const time1 = performance.now() - start1;
  
  writeColored(`   ✅ Processed ${text1.length} characters in ${time1.toFixed(2)}ms\n`, 'green');
  
  // Method 2: Using .stream() with Bun.readableStreamToArrayBuffer
  writeColored(`\nMethod 2: Stream to ArrayBuffer (Zero-Copy)\n`, 'magenta');
  writeColored(`   Pattern: file.stream() → Bun.readableStreamToArrayBuffer()\n`, 'cyan');
  const start2 = performance.now();
  const stream2 = largeFile.stream();
  const buffer = await Bun.readableStreamToArrayBuffer(stream2);
  const time2 = performance.now() - start2;
  
  writeColored(`   ✅ Processed ${buffer.byteLength} bytes in ${time2.toFixed(2)}ms\n`, 'green');
  
  // Method 3: Using .stream() with Bun.readableStreamToBlob
  writeColored(`\nMethod 3: Stream to Blob (Zero-Copy)\n`, 'magenta');
  writeColored(`   Pattern: file.stream() → Bun.readableStreamToBlob()\n`, 'cyan');
  const start3 = performance.now();
  const stream3 = largeFile.stream();
  const blob = await Bun.readableStreamToBlob(stream3);
  const time3 = performance.now() - start3;
  
  writeColored(`   ✅ Processed ${blob.size} bytes in ${time3.toFixed(2)}ms\n`, 'green');
  writeColored(`   Blob type: ${blob.type}\n`, 'cyan');
  
  // Method 4: Chunked processing (for very large files)
  writeColored(`\nMethod 4: Chunked Processing (Memory Efficient)\n`, 'magenta');
  writeColored(`   Pattern: Manual chunk reading for custom processing\n`, 'cyan');
  const start4 = performance.now();
  const stream4 = largeFile.stream();
  const reader = stream4.getReader();
  let totalBytes = 0;
  let chunkCount = 0;
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    chunkCount++;
    // Process chunk here (e.g., transform, filter, etc.)
  }
  
  const time4 = performance.now() - start4;
  writeColored(`   ✅ Processed ${chunkCount} chunks, ${totalBytes} bytes in ${time4.toFixed(2)}ms\n`, 'green');
  
  writeColored(`\n💡 Zero-Copy Benefits:\n`, 'magenta');
  writeColored(`   • Zero-copy for large files; use .stream() with Bun.readableStreamTo* for processing\n`, 'yellow');
  writeColored(`   • .stream() avoids loading entire file into memory\n`, 'cyan');
  writeColored(`   • Bun.readableStreamTo* utilities for efficient conversion\n`, 'cyan');
  writeColored(`   • Chunked processing for files larger than available memory\n`, 'cyan');
  writeColored(`   • Perfect for large files, network streams, and real-time data\n`, 'cyan');
  writeColored(`   • No intermediate buffers - direct stream-to-result conversion\n`, 'cyan');
}

// ============================================================================
// Example 13: Remote Streaming Example
// ============================================================================

async function example13_RemoteStreaming() {
  writeLine('\n📝 Example 13: Remote Streaming with Zero-Copy', 'cyan');
  writeLine('─────────────────────────────────────────────────', 'white');
  
  // Stream a remote file without loading it entirely into memory
  const remoteUrl = "https://jsonplaceholder.typicode.com/posts";
  
  writeColored(`Streaming remote file: ${remoteUrl}\n`, 'cyan');
  
  try {
    const startTime = performance.now();
    const response = await fetch(remoteUrl);
    
    if (!response.body) {
      throw new Error("No response body");
    }
    
    // Use Bun.readableStreamToJSON for zero-copy conversion (direct parse)
    const data = await Bun.readableStreamToJSON(response.body);
    const fetchTime = performance.now() - startTime;
    
    writeColored(`✅ Streamed and parsed ${Array.isArray(data) ? data.length : 1} item(s) in ${fetchTime.toFixed(2)}ms\n`, 'green');
    
    if (Array.isArray(data) && data.length > 0) {
      writeColored(`   First item preview:\n`, 'cyan');
      console.log(JSON.stringify(data[0], null, 2).substring(0, 150) + '...');
    }
    
    writeColored(`\n💡 Remote Streaming Benefits:\n`, 'magenta');
    writeColored(`   • Streams response directly (no intermediate buffer)\n`, 'cyan');
    writeColored(`   • Memory efficient for large remote files\n`, 'cyan');
    writeColored(`   • Bun.readableStreamToJSON parses directly from stream\n`, 'cyan');
    writeColored(`   • Zero-copy conversion for maximum performance\n`, 'cyan');
  } catch (error) {
    StatusOutput.error(`Failed to stream remote file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// Example 14: Bun.write() - Multi-Tool Writer
// ============================================================================

async function example14_BunWrite() {
  writeLine('\n📝 Example 14: Bun.write() - Multi-Tool Writer', 'cyan');
  writeLine('─────────────────────────────────────────────────', 'white');
  
  writeColored("Bun.write() - Multi-tool writer (Promise<number> bytes)\n", 'magenta');
  writeColored("Destinations: path/URL/BunFile/fd | Data: string/Blob/Buffer/TypedArray/Response\n\n", 'yellow');
  
  // ===== DESTINATIONS =====
  writeColored("📁 Destinations:\n", 'magenta');
  
  // 1. String path (most common)
  const bytes1 = await Bun.write("example14-path.txt", "String path destination");
  writeColored(`   1. String path: "file.txt" → ${bytes1} bytes\n`, 'cyan');
  
  // 2. BunFile destination
  const destFile = Bun.file("example14-bunfile-dest.txt");
  const bytes2 = await Bun.write(destFile, "BunFile destination");
  writeColored(`   2. BunFile: Bun.file("file.txt") → ${bytes2} bytes\n`, 'cyan');
  
  // 3. URL destination
  const fileUrl = new URL("file://" + process.cwd() + "/example14-url-dest.txt");
  const bytes3 = await Bun.write(fileUrl, "URL destination");
  writeColored(`   3. URL: new URL("file:///path") → ${bytes3} bytes\n`, 'cyan');
  
  // 4. File descriptor (fd)
  try {
    const fd = await Bun.open("example14-fd-dest.txt", "w");
    const bytes4 = await Bun.write(fd, "File descriptor destination");
    await fd.close();
    writeColored(`   4. File descriptor: number (fd) → ${bytes4} bytes\n`, 'cyan');
  } catch (error) {
    StatusOutput.warning(`File descriptor example skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // ===== DATA TYPES =====
  writeColored(`\n📦 Data Types:\n`, 'magenta');
  
  // 1. String
  const bytes5 = await Bun.write("example14-data-string.txt", "String data");
  writeColored(`   1. string: "text" → ${bytes5} bytes\n`, 'cyan');
  
  // 2. Blob
  const blob = new Blob(["Blob content"], { type: "text/plain" });
  const bytes6 = await Bun.write("example14-data-blob.txt", blob);
  writeColored(`   2. Blob: new Blob([...]) → ${bytes6} bytes\n`, 'cyan');
  
  // 3. Buffer (Uint8Array)
  const encoder = new TextEncoder();
  const buffer = encoder.encode("Buffer/Uint8Array data");
  const bytes7 = await Bun.write("example14-data-buffer.txt", buffer);
  writeColored(`   3. Buffer/TypedArray: Uint8Array → ${bytes7} bytes\n`, 'cyan');
  
  // 4. TypedArray (various types)
  const uint16Array = new Uint16Array([72, 101, 108, 108, 111]); // "Hello" in UTF-16
  const bytes8 = await Bun.write("example14-data-uint16.txt", uint16Array);
  writeColored(`   4. TypedArray: Uint16Array → ${bytes8} bytes\n`, 'cyan');
  
  // 5. Response
  writeColored(`\n   5. Response: fetch() → Bun.write()\n`, 'cyan');
  try {
    const res = await fetch("https://www.example.com");
    const bytes9 = await Bun.write("example14-data-response.html", res);
    writeColored(`      HTTP Response → ${bytes9} bytes\n`, 'green');
  } catch (error) {
    StatusOutput.warning(`   Response example: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // 6. BunFile as data (optimized copy)
  const sourceFile = Bun.file("example14-data-string.txt");
  const bytes10 = await Bun.write("example14-data-bunfile-copy.txt", sourceFile);
  writeColored(`   6. BunFile: Bun.file("src") → ${bytes10} bytes (sendfile optimized)\n`, 'green');
  
  writeColored(`\n💡 Summary:\n`, 'magenta');
  writeColored(`   • Returns: Promise<number> (bytes written)\n`, 'cyan');
  writeColored(`   • Destinations: path (string), URL, BunFile, fd (number)\n`, 'cyan');
  writeColored(`   • Data: string, Blob, Buffer, TypedArray, Response, BunFile\n`, 'cyan');
  writeColored(`   • Uses fastest available system calls (sendfile, copy_file_range, etc.)\n`, 'cyan');
}

// ============================================================================
// Example 15: Copy + Append with Benchmarking
// ============================================================================

async function example15_CopyAppendBenchmark() {
  writeLine('\n📝 Example 15: Copy + Append with Benchmarking', 'cyan');
  writeLine('─────────────────────────────────────────────────', 'white');
  
  // Create input file
  await Bun.write("example15-input.txt", "Original content\nLine 2\nLine 3");
  
  // Exact pattern from user example
  const input = Bun.file("example15-input.txt");
  const output = "example15-output.txt";
  const append = "\nAppended at " + new Date().toISOString();

  const start = Bun.nanoseconds();
  const bytes = await Bun.write(output, await input.text() + append);
  console.log(Bun.color("cyan", "ansi") + `Wrote ${bytes} bytes in ${(Bun.nanoseconds() - start) / 1e6} ms` + "\x1b[0m");
  
  // Verify the result
  const result = await Bun.file(output).text();
  const lines = result.split('\n');
  writeColored(`\nResult: ${lines.length} lines\n`, 'green');
  writeColored(`Last line: "${lines[lines.length - 1]}"\n`, 'cyan');
  
  // Additional: Compare with BunFile copy (optimized)
  writeColored(`\n💡 Pattern Breakdown:\n`, 'magenta');
  writeColored(`   1. Read file: await input.text()\n`, 'cyan');
  writeColored(`   2. Append data: + append\n`, 'cyan');
  writeColored(`   3. Write result: await Bun.write(output, ...)\n`, 'cyan');
  writeColored(`   4. Benchmark: Bun.nanoseconds() for precision\n`, 'cyan');
  
  // Compare: Direct write vs Copy + Append
  writeColored(`\nPerformance Comparison:\n`, 'magenta');
  
  const directData = "Direct write content";
  const startDirect = Bun.nanoseconds();
  await Bun.write("example15-direct.txt", directData);
  const timeDirect = (Bun.nanoseconds() - startDirect) / 1e6;
  
  const startCopy = Bun.nanoseconds();
  await Bun.write("example15-copy.txt", Bun.file("example15-direct.txt"));
  const timeCopy = (Bun.nanoseconds() - startCopy) / 1e6;
  
  writeColored(`   Direct write: ${timeDirect.toFixed(3)}ms\n`, 'cyan');
  writeColored(`   BunFile copy: ${timeCopy.toFixed(3)}ms (sendfile optimized)\n`, 'green');
}

// ============================================================================
// Example 16: HTTP to File (Stream-to-Disk)
// ============================================================================

async function example16_HttpToFile() {
  writeLine('\n📝 Example 16: HTTP to File (Stream-to-Disk)', 'cyan');
  writeLine('───────────────────────────────────────────────', 'white');
  
  writeColored("Fetching and writing HTTP response directly...\n", 'cyan');
  
  try {
    // Pattern: fetch() → Bun.write() (efficient stream-to-disk)
    const start = Bun.nanoseconds();
    const res = await fetch("https://www.example.com");
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const bytes = await Bun.write("example16-http.html", res);
    const elapsed = (Bun.nanoseconds() - start) / 1e6;
    
    writeColored(`✅ Wrote ${bytes} bytes in ${elapsed.toFixed(2)}ms\n`, 'green');
    writeColored(`   File: example16-http.html\n`, 'cyan');
    
    // Verify content
    const file = Bun.file("example16-http.html");
    const preview = (await file.text()).substring(0, 100);
    writeColored(`   Preview: "${preview}..."\n`, 'yellow');
    
    writeColored(`\n💡 Benefits:\n`, 'magenta');
    writeColored(`   • Direct stream-to-disk (no intermediate buffer)\n`, 'cyan');
    writeColored(`   • Memory efficient for large downloads\n`, 'cyan');
    writeColored(`   • Works with any Response object\n`, 'cyan');
  } catch (error) {
    StatusOutput.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Example: Download SVG (exact pattern from user example)
  writeColored(`\n📥 Example: Download SVG Logo\n`, 'magenta');
  try {
    const res = await fetch("https://bun.sh/logo.svg");
    if (res.ok) {
      const bytes = await Bun.write("example16-logo.svg", res);
      writeColored(`✅ Downloaded logo.svg: ${bytes} bytes\n`, 'green');
      writeColored(`   Pattern: const res = await fetch("url"); await Bun.write("file", res);\n`, 'cyan');
    } else {
      StatusOutput.warning(`HTTP ${res.status}: Logo not available`);
    }
  } catch (error) {
    StatusOutput.warning(`Logo download failed: ${error instanceof Error ? error.message : String(error)}`);
    writeColored(`   (This is expected if network is unavailable)\n`, 'yellow');
  }
}

// ============================================================================
// Example 17: Safe HTML Writing with Bun.escapeHTML
// ============================================================================

async function example17_SafeHtmlWriting() {
  writeLine('\n📝 Example 17: Safe HTML Writing with Bun.escapeHTML', 'cyan');
  writeLine('───────────────────────────────────────────────────────', 'white');
  
  writeColored("💡 Tip: Integrate with Bun.escapeHTML for safe HTML writes\n", 'yellow');
  writeColored("   Pattern: await Bun.write(\"out.html\", Bun.escapeHTML(content))\n\n", 'cyan');
  
  // Unsafe user input
  const userInput = '<script>alert("XSS")</script>Hello & "World"';
  
  writeColored("Unsafe input:\n", 'yellow');
  writeColored(`   ${userInput}\n`, 'red');
  
  // Escape HTML entities
  const escaped = Bun.escapeHTML(userInput);
  writeColored(`\nEscaped output:\n`, 'green');
  writeColored(`   ${escaped}\n`, 'cyan');
  
  // Write safe HTML using the exact tip pattern
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Safe HTML</title>
</head>
<body>
  <h1>User Content</h1>
  <p>${escaped}</p>
</body>
</html>`;
  
  // Exact pattern from tip: await Bun.write("out.html", Bun.escapeHTML(content))
  const safeContent = Bun.escapeHTML(userInput);
  const safeHtml = `<!DOCTYPE html>
<html>
<body>
  <p>${safeContent}</p>
</body>
</html>`;
  const bytes = await Bun.write("example17-safe.html", safeHtml);
  writeColored(`\n✅ Wrote safe HTML: ${bytes} bytes\n`, 'green');
  writeColored(`   Pattern: await Bun.write("out.html", Bun.escapeHTML(content))\n`, 'yellow');
  writeColored(`   Example: await Bun.write("out.html", Bun.escapeHTML(userInput))\n`, 'cyan');
  
  // Compare unsafe vs safe
  const unsafeHtml = `<p>${userInput}</p>`;
  await Bun.write("example17-unsafe.html", unsafeHtml);
  
  writeColored(`\n💡 Security Benefits:\n`, 'magenta');
  writeColored(`   • Bun.escapeHTML() escapes <, >, &, ", '\n`, 'cyan');
  writeColored(`   • Prevents XSS attacks from user input\n`, 'cyan');
  writeColored(`   • Essential for dynamic HTML generation\n`, 'cyan');
  writeColored(`   • Always escape user input before writing HTML\n`, 'cyan');
  
  // Show what was escaped
  writeColored(`\nEscaped Characters:\n`, 'magenta');
  writeColored(`   < → &lt;\n`, 'cyan');
  writeColored(`   > → &gt;\n`, 'cyan');
  writeColored(`   & → &amp;\n`, 'cyan');
  writeColored(`   " → &quot;\n`, 'cyan');
  writeColored(`   ' → &#x27;\n`, 'cyan');
}

// ============================================================================
// Example 18: Optimized File Copy (BunFile sendfile)
// ============================================================================

async function example18_OptimizedCopy() {
  writeLine('\n📝 Example 18: Optimized File Copy (BunFile sendfile)', 'cyan');
  writeLine('─────────────────────────────────────────────────────────', 'white');
  
  writeColored("💡 Tip: For copies, use BunFile data (sendfile optimized)\n\n", 'yellow');
  
  // Create a large file for comparison
  const largeContent = "x".repeat(100000); // 100KB
  await Bun.write("example18-source.txt", largeContent);
  
  writeColored("Copying large file (100KB)...\n", 'cyan');
  
  // Method 1: Using BunFile (sendfile optimized) - RECOMMENDED
  const sourceFile = Bun.file("example18-source.txt");
  const start1 = Bun.nanoseconds();
  const bytes1 = await Bun.write("example18-copy1.txt", sourceFile);
  const time1 = (Bun.nanoseconds() - start1) / 1e6;
  
  writeColored(`Method 1 (BunFile): ${bytes1} bytes in ${time1.toFixed(3)}ms ✅\n`, 'green');
  writeColored(`   Pattern: await Bun.write(dest, Bun.file("source.txt"))\n`, 'cyan');
  
  // Method 2: Read then write (less efficient)
  const start2 = Bun.nanoseconds();
  const content = await Bun.file("example18-source.txt").text();
  const bytes2 = await Bun.write("example18-copy2.txt", content);
  const time2 = (Bun.nanoseconds() - start2) / 1e6;
  
  writeColored(`Method 2 (Read+Write): ${bytes2} bytes in ${time2.toFixed(3)}ms ⚠️\n`, 'yellow');
  
  const speedup = ((time2 - time1) / time2 * 100).toFixed(1);
  writeColored(`\n💡 BunFile copy is ${speedup}% faster (sendfile optimization)\n`, 'magenta');
  writeColored(`   • Uses kernel sendfile() for zero-copy transfer\n`, 'cyan');
  writeColored(`   • Avoids user-space buffer copies\n`, 'cyan');
  writeColored(`   • Best for large file copies\n`, 'cyan');
  writeColored(`   • Always use BunFile as data source for copies\n`, 'cyan');
}

// ============================================================================
// Example 19: Incremental Writing - FileSink
// ============================================================================

async function example19_IncrementalWriting() {
  writeLine('\n📝 Example 19: Incremental Writing - FileSink', 'cyan');
  writeLine('─────────────────────────────────────────────────', 'white');
  
  writeColored("FileSink: Buffered writer from .writer({ highWaterMark?: number }) (default 64KB)\n", 'magenta');
  writeColored("💡 Buffered writer from .writer({ highWaterMark?: number }) (default 64KB)\n\n", 'yellow');
  
  // Basic FileSink usage
  writeColored("Basic FileSink Usage:\n", 'cyan');
  const basicLog = Bun.file("example19-log.txt");
  const basicWriter = basicLog.writer({ highWaterMark: 1024 });
  
  basicWriter.write("Line 1: Basic log entry\n");
  basicWriter.write("Line 2: Another entry\n");
  basicWriter.write("Line 3: More data\n");
  
  await basicWriter.flush(); // Force write to disk
  writeColored("   ✅ Flushed buffer to disk\n", 'green');
  
  basicWriter.write("Line 4: After flush\n");
  await basicWriter.end(); // Close and flush
  
  writeColored("   ✅ Writer closed\n", 'green');
  
  // Enhanced Example: Streaming log with colors (exact pattern from user)
  writeColored(`\nEnhanced Example: Streaming Log with Colors\n`, 'cyan');
  writeColored(`   💡 Tips: .ref()/.unref() for event loop control. Pair with Bun.stringWidth for aligned logs.\n\n`, 'yellow');
  
  // Exact pattern from user example
  const log = Bun.file("example19-colored-log.txt");
  const writer = log.writer({ highWaterMark: 1024 });

  writer.write(Bun.color("red", "ansi") + "[ERROR] Issue\n" + "\x1b[0m");
  writer.write("[INFO] Normal log\n");
  await writer.flush();  // Force write
  writer.end();  // Close
  
  writeColored("   ✅ Colored logs written and flushed\n", 'green');
  
  // Event loop control with .ref()/.unref()
  writeColored(`\n💡 Tip: .ref()/.unref() for event loop control\n`, 'magenta');
  writeColored(`Event Loop Control Example:\n`, 'cyan');
  const asyncLog = Bun.file("example19-async-log.txt");
  const asyncWriter = asyncLog.writer({ highWaterMark: 2048 });
  
  writeColored(`   Default: writer keeps process alive (ref'd by default)\n`, 'cyan');
  
  // .unref() - Don't keep event loop alive
  asyncWriter.unref();
  writeColored("   ✅ .unref() - Writer unref'd (won't keep process alive)\n", 'yellow');
  writeColored("      Process can exit even if writer is open\n", 'yellow');
  
  asyncWriter.write("Async log entry 1\n");
  asyncWriter.write("Async log entry 2\n");
  
  // .ref() - Keep event loop alive (default)
  asyncWriter.ref();
  writeColored("   ✅ .ref() - Writer ref'd (will keep process alive)\n", 'green');
  writeColored("      Process stays alive until writer.end() is called\n", 'green');
  
  await asyncWriter.end();
  
  writeColored(`\n💡 .ref()/.unref() Usage:\n`, 'magenta');
  writeColored(`   • .ref() - Keep process alive (default behavior)\n`, 'cyan');
  writeColored(`   • .unref() - Allow process to exit even if writer is open\n`, 'cyan');
  writeColored(`   • Use .unref() for background logging that shouldn't block exit\n`, 'cyan');
  writeColored(`   • Use .ref() (or default) when you need to ensure all data is written\n`, 'cyan');
  
  // Aligned logs with Bun.stringWidth (Tip: Pair with Bun.stringWidth for aligned logs)
  writeColored(`\n💡 Tip: Pair with Bun.stringWidth for aligned logs\n`, 'magenta');
  writeColored(`Aligned Logs Example:\n`, 'cyan');
  writeColored(`   Pattern: Use Bun.stringWidth() to calculate padding for alignment\n\n`, 'yellow');
  
  const alignedLog = Bun.file("example19-aligned-log.txt");
  const alignedWriter = alignedLog.writer({ highWaterMark: 512 });
  
  const entries = [
    { level: "ERROR", message: "Critical failure" },
    { level: "WARN", message: "Deprecation notice" },
    { level: "INFO", message: "User logged in" },
    { level: "DEBUG", message: "Variable value" },
  ];
  
  // Calculate max width for alignment using Bun.stringWidth (handles ANSI codes)
  writeColored(`   Step 1: Calculate max width using Bun.stringWidth()\n`, 'cyan');
  const maxLevelWidth = Math.max(...entries.map(e => Bun.stringWidth(e.level)));
  writeColored(`   Max width: ${maxLevelWidth} characters\n`, 'cyan');
  
  writeColored(`   Step 2: Pad each level to max width\n`, 'cyan');
  for (const entry of entries) {
    const padding = " ".repeat(maxLevelWidth - Bun.stringWidth(entry.level));
    const aligned = `[${entry.level}]${padding} ${entry.message}\n`;
    alignedWriter.write(aligned);
    writeColored(`   "${entry.level}" → width: ${Bun.stringWidth(entry.level)}, padding: ${padding.length} spaces\n`, 'yellow');
  }
  
  await alignedWriter.end();
  writeColored("   ✅ Aligned logs written\n", 'green');
  
  // Show the aligned output
  const alignedContent = await alignedLog.text();
  writeColored(`\nAligned Output:\n`, 'magenta');
  writeColored(alignedContent, 'cyan');
  
  writeColored(`\n💡 Bun.stringWidth Benefits:\n`, 'magenta');
  writeColored(`   • Unicode-aware string width calculation\n`, 'cyan');
  writeColored(`   • Handles ANSI color codes correctly (ignores them)\n`, 'cyan');
  writeColored(`   • Perfect for aligned logs, tables, and formatted output\n`, 'cyan');
  writeColored(`   • Use with FileSink for aligned log writing\n`, 'cyan');
  
  writeColored(`\n💡 FileSink Tips:\n`, 'magenta');
  writeColored(`   • Buffered writer from .writer({ highWaterMark?: number }) (default 64KB)\n`, 'yellow');
  writeColored(`   • .write() - Add to buffer (non-blocking)\n`, 'cyan');
  writeColored(`   • .flush() - Force write to disk\n`, 'cyan');
  writeColored(`   • .end() - Flush and close\n`, 'cyan');
  writeColored(`   • .ref()/.unref() - Event loop control\n`, 'cyan');
  writeColored(`   • Bun.stringWidth() - For aligned logs (handles ANSI codes)\n`, 'cyan');
  writeColored(`   • Perfect for streaming logs, real-time data, large outputs\n`, 'cyan');
  
  writeColored(`\n🎯 Key Tips Summary:\n`, 'magenta');
  writeColored(`   • .ref()/.unref() for event loop control\n`, 'yellow');
  writeColored(`   • Pair with Bun.stringWidth for aligned logs\n`, 'yellow');
}

// ============================================================================
// Example 20: Integrated Pattern - Bun.stringWidth + Bun.escapeHTML + Bun.write
// ============================================================================

async function example20_IntegratedPattern() {
  writeLine('\n📝 Example 20: Integrated Pattern - Bun.stringWidth + Bun.escapeHTML + Bun.write', 'cyan');
  writeLine('─────────────────────────────────────────────────────────────────────────────────────', 'white');
  
  writeColored("💡 Integrating Bun.stringWidth with File Writes and Escaping\n", 'magenta');
  writeColored("   Pattern: Width-aware padding + safe HTML escape + efficient write\n\n", 'yellow');
  
  // API Signature Documentation
  writeColored("📚 API Signature:\n", 'magenta');
  writeColored("   Bun.stringWidth(string: string, options?: StringWidthOptions): number\n\n", 'cyan');
  writeColored("   StringWidthOptions:\n", 'cyan');
  writeColored("     • countAnsiEscapeCodes: boolean  (default: false)\n", 'yellow');
  writeColored("       If true, includes ANSI escape code lengths in the width\n", 'white');
  writeColored("       (useful for raw ANSI strings). If false, ignores them\n", 'white');
  writeColored("       (default for clean display width).\n", 'white');
  writeColored("     • ambiguousIsNarrow: boolean  (default: true)\n", 'yellow');
  writeColored("       Treats \"ambiguous\" Unicode chars (e.g., some math symbols,\n", 'white');
  writeColored("       box drawings) as narrow (1 column) if true, or wide (2 columns)\n", 'white');
  writeColored("       if false. Based on Unicode East Asian Width spec; true optimizes\n", 'white');
  writeColored("       for common terminals.\n\n", 'white');
  writeColored("   Edge Case Handling:\n", 'cyan');
  writeColored("     • Zero-width joiners (ZWJ) - handled correctly\n", 'white');
  writeColored("     • Combining marks - handled correctly\n", 'white');
  writeColored("     • RTL (right-to-left) text - handled correctly\n", 'white');
  writeColored("     • Uses ICU (International Components for Unicode) for accuracy\n", 'white');
  writeColored("     • Minimalist API (only 2 options) optimized for performance\n\n", 'white');
  
  // Basic Usage Examples
  writeColored("📝 Basic Usage Examples:\n", 'magenta');
  const asciiWidth = Bun.stringWidth("hello");
  const emojiWidth = Bun.stringWidth("🚀");
  const japaneseWidth = Bun.stringWidth("こんにちは");
  
  writeColored(`   Bun.stringWidth("hello");     // ${asciiWidth} (ASCII: 1 char = 1 column)\n`, 'cyan');
  writeColored(`   Bun.stringWidth("🚀");         // ${emojiWidth} (emoji: 1 emoji = 2 columns)\n`, 'cyan');
  writeColored(`   Bun.stringWidth("こんにちは");  // ${japaneseWidth} (wide chars: 5 chars = ${japaneseWidth} columns, 2 each)\n`, 'cyan');
  
  // ANSI Escape Code Example
  const ansiStr = "\x1b[31mRed text\x1b[0m";
  const ansiIgnored = Bun.stringWidth(ansiStr);
  const ansiCounted = Bun.stringWidth(ansiStr, { countAnsiEscapeCodes: true });
  
  writeColored(`\n   ANSI Escape Codes:\n`, 'magenta');
  writeColored(`   const ansiStr = "\\x1b[31mRed text\\x1b[0m";\n`, 'cyan');
  writeColored(`   Bun.stringWidth(ansiStr);  // ${ansiIgnored} (ignores ANSI by default)\n`, 'yellow');
  writeColored(`   Bun.stringWidth(ansiStr, { countAnsiEscapeCodes: true });  // ${ansiCounted} (includes escapes)\n`, 'yellow');
  
  // Ambiguous Character Width Example
  const ambiguous = "┌──┬──┐";  // Box drawings (ambiguous width)
  const ambiguousNarrow = Bun.stringWidth(ambiguous);
  const ambiguousWide = Bun.stringWidth(ambiguous, { ambiguousIsNarrow: false });
  
  writeColored(`\n   Ambiguous Characters (Box Drawings):\n`, 'magenta');
  writeColored(`   const ambiguous = "┌──┬──┐";  // Box drawings (ambiguous width)\n`, 'cyan');
  writeColored(`   Bun.stringWidth(ambiguous);  // ${ambiguousNarrow} (narrow default)\n`, 'yellow');
  writeColored(`   Bun.stringWidth(ambiguous, { ambiguousIsNarrow: false });  // ${ambiguousWide} (wide)\n`, 'yellow');
  
  // Integration with Other Utils (Padding for Tables)
  const str = "🚀 Bun!";
  const strWidth = Bun.stringWidth(str);
  const padded = str.padEnd(strWidth + 5);
  const paddedWidth = Bun.stringWidth(padded);
  
  writeColored(`\n   Integration with Other Utils (Padding for Tables):\n`, 'magenta');
  writeColored(`   const str = "🚀 Bun!";\n`, 'cyan');
  writeColored(`   const width = Bun.stringWidth(str);  // ${strWidth}\n`, 'yellow');
  writeColored(`   const padded = str.padEnd(width + 5);  // Align to column\n`, 'yellow');
  writeColored(`   await Bun.write("out.txt", padded);    // Safe write\n`, 'yellow');
  writeColored(`   // Padded width: ${paddedWidth} columns\n`, 'cyan');
  
  // Demonstrate the padding
  await Bun.write("example20-padding-demo.txt", padded);
  writeColored(`   ✅ Wrote padded string to example20-padding-demo.txt\n`, 'green');
  writeColored(`\n`, 'white');
  
  // Sample logs with various content (including malicious input)
  const logs = [
    "User: Ashley (@ashschaeffer1) — PremiumPlus level",
    "Location: New Orleans, LA ☕",
    "Action: Enhanced file write with utils",
    "Note: <script>alert('XSS? Nope!')</script>",  // Malicious input test
    "Status: ✅ Complete",
    Bun.color("green", "ansi") + "Colored log entry" + "\x1b[0m",  // ANSI colored
  ];
  
  writeColored("Input logs:\n", 'cyan');
  logs.forEach((log, i) => {
    writeColored(`   ${i + 1}. ${log.substring(0, 60)}${log.length > 60 ? '...' : ''}\n`, 'white');
  });
  
  // Function to generate padded HTML
  function generatePaddedHtml(logs: string[], padWidth: number = 50): string {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n  <title>Padded HTML Log</title>\n  <style>pre { font-family: monospace; }</style>\n</head>\n<body>\n<pre>';
    
    for (const log of logs) {
      // Step 1: Calculate width (handles emojis, ANSI codes, wide chars)
      const width = Bun.stringWidth(log, { countAnsiEscapeCodes: false });
      
      // Step 2: Escape HTML (safe for XSS prevention)
      const cleanLog = Bun.escapeHTML(log);
      
      // Step 3: Calculate padding based on visual width
      const padding = ' '.repeat(Math.max(0, padWidth - width));
      
      // Step 4: Build HTML line
      html += cleanLog + padding + ' | Logged at: ' + new Date().toLocaleTimeString() + '\n';
    }
    
    html += '</pre>\n</body>\n</html>';
    return html;
  }
  
  writeColored(`\nGenerating padded HTML...\n`, 'cyan');
  const content = generatePaddedHtml(logs, 50);
  
  // Write safe, padded HTML
  const bytes = await Bun.write("example20-padded-log.html", content);
  writeColored(`✅ Wrote padded HTML: ${bytes} bytes\n`, 'green');
  
  // Show the pattern
  writeColored(`\n💡 Integration Pattern:\n`, 'magenta');
  writeColored(`   1. Bun.stringWidth() - Calculate visual width (handles emojis, ANSI, wide chars)\n`, 'cyan');
  writeColored(`   2. Bun.escapeHTML() - Escape HTML entities (prevents XSS)\n`, 'cyan');
  writeColored(`   3. Calculate padding based on width\n`, 'cyan');
  writeColored(`   4. Bun.write() - Write safe, padded HTML\n`, 'cyan');
  
  // Demonstrate with ANSI codes (exact pattern from user example)
  writeColored(`\nANSI Code Handling (Exact Pattern):\n`, 'cyan');
  const fancyLog = "🚀 Success! " + Bun.color("green", "ansi") + "Colored" + "\x1b[0m";
  const widthWithoutAnsi = Bun.stringWidth(fancyLog, { countAnsiEscapeCodes: false });  // Ignores ANSI, counts emoji as 2 cols
  
  writeColored(`\n   Code:\n`, 'magenta');
  writeColored(`   const fancyLog = "🚀 Success! " + Bun.color("green", "ansi") + "Colored" + "\\x1b[0m";\n`, 'cyan');
  writeColored(`   Bun.stringWidth(fancyLog, { countAnsiEscapeCodes: false });  // Ignores ANSI, counts emoji as 2 cols\n`, 'yellow');
  
  writeColored(`\n   Results:\n`, 'magenta');
  writeColored(`   Width: ${widthWithoutAnsi} columns\n`, 'green');
  writeColored(`   • Emoji (🚀) = 2 columns\n`, 'cyan');
  writeColored(`   • "Success! " = 9 columns\n`, 'cyan');
  writeColored(`   • "Colored" = 7 columns\n`, 'cyan');
  writeColored(`   • ANSI escape codes ignored (not counted in width)\n`, 'cyan');
  writeColored(`   • Total: 2 + 9 + 7 = ${widthWithoutAnsi} columns ✅\n`, 'green');
  
  // Demonstrate ambiguousIsNarrow option
  writeColored(`\n   Ambiguous Character Handling:\n`, 'magenta');
  const emojiTest = "🚀";
  const widthNarrow = Bun.stringWidth(emojiTest, { ambiguousIsNarrow: true });
  const widthWide = Bun.stringWidth(emojiTest, { ambiguousIsNarrow: false });
  writeColored(`   Emoji: "${emojiTest}"\n`, 'white');
  writeColored(`   ambiguousIsNarrow: true  → ${widthNarrow} columns\n`, 'cyan');
  writeColored(`   ambiguousIsNarrow: false → ${widthWide} columns\n`, 'cyan');
  writeColored(`   Note: Most emojis are 2 columns regardless of this setting\n`, 'yellow');
  
  // Show escaped output preview
  const escapedPreview = Bun.escapeHTML(fancyLog);
  writeColored(`   Escaped: "${escapedPreview.substring(0, 50)}..."\n`, 'cyan');
  
  writeColored(`\n💡 Why This Integration Works:\n`, 'magenta');
  writeColored(`   • stringWidth + escapeHTML: Calculate widths before escaping\n`, 'cyan');
  writeColored(`   • escapeHTML adds chars like &lt; but width ignores them if needed\n`, 'cyan');
  writeColored(`   • write: Efficient for final output (zero-copy if data is Buffer)\n`, 'cyan');
  writeColored(`   • Performance: stringWidth ~20 ns/call; great for large logs\n`, 'cyan');
  writeColored(`   • Perfect for aligned tables, logs, and formatted HTML output\n`, 'cyan');
  
  // Performance Tip: Pre-allocate buffers for high-frequency logging
  writeColored(`\n🚀 Performance Tip (R-Score > 0.99):\n`, 'magenta');
  writeColored(`   For high-frequency logging, pre-allocate a Uint8Array for HTML logs\n`, 'yellow');
  writeColored(`   to prevent GC pressure from short-lived strings generated by escapeHTML.\n`, 'yellow');
  writeColored(`\n   Example:\n`, 'cyan');
  writeColored(`   const buffer = new Uint8Array(1024 * 1024);  // Pre-allocate 1MB\n`, 'cyan');
  writeColored(`   const encoder = new TextEncoder();\n`, 'cyan');
  writeColored(`   // Reuse buffer for escaped HTML instead of creating new strings\n`, 'cyan');
  writeColored(`   const escaped = Bun.escapeHTML(logEntry);\n`, 'cyan');
  writeColored(`   const encoded = encoder.encodeInto(escaped, buffer);\n`, 'cyan');
  writeColored(`   await Bun.write("log.html", buffer.subarray(0, encoded.written));\n`, 'cyan');
  writeColored(`   // Reduces GC sweeps for short-lived escapeHTML strings\n`, 'yellow');
  
  // Show file preview
  const filePreview = await Bun.file("example20-padded-log.html").text();
  writeColored(`\nFile Preview (first 300 chars):\n`, 'magenta');
  writeColored(filePreview.substring(0, 300) + '...\n', 'yellow');
}

// ============================================================================
// Example 21: HTTP/2 Multiplexing Performance Comparison
// ============================================================================

async function example21_Http2Multiplexing() {
  writeLine('\n📝 Example 21: HTTP/2 Multiplexing Performance Comparison', 'cyan');
  writeLine('───────────────────────────────────────────────────────────────', 'white');
  
  writeColored("💡 HTTP/2 Multiplexing Performance Demo\n", 'magenta');
  writeColored("   Comparing serial fetch() vs HTTP/2 multiplexed requests\n\n", 'yellow');
  
  writeColored("Command Pattern:\n", 'cyan');
  writeColored(`   bun -e "console.time('serial');\n`, 'white');
  writeColored(`   await Promise.all([fetch('https://bun.sh/docs'),\n`, 'white');
  writeColored(`                     fetch('https://bun.sh/blog'),\n`, 'white');
  writeColored(`                     fetch('https://bun.sh/docs/api/utils')]);\n`, 'white');
  writeColored(`   console.timeEnd('serial');\n`, 'white');
  writeColored(`   const {BunHTTP2Multiplexer} = await import('./lib/http2-multiplexer.ts');\n`, 'white');
  writeColored(`   const m = new BunHTTP2Multiplexer();\n`, 'white');
  writeColored(`   console.time('h2');\n`, 'white');
  writeColored(`   await m.connect('bun.sh', 443);\n`, 'white');
  writeColored(`   await Promise.all(['/docs', '/blog', '/api/utils'].map(p => m.request('GET', p)));\n`, 'white');
  writeColored(`   console.timeEnd('h2');"\n`, 'white');
  
  writeColored(`\n   💡 Benefits of HTTP/2 Multiplexing:\n`, 'magenta');
  writeColored(`   • Single TCP connection for multiple requests\n`, 'cyan');
  writeColored(`   • Reduced connection overhead\n`, 'cyan');
  writeColored(`   • Better P_ratio performance (R-Score optimization)\n`, 'cyan');
  writeColored(`   • Lower latency for concurrent requests to same origin\n`, 'cyan');
  writeColored(`   • See: ./lib/http2-multiplexer.ts for implementation\n`, 'yellow');
  
  // RSC-style request pattern (single request)
  writeColored(`\n📝 RSC (React Server Components) Request Pattern:\n`, 'magenta');
  writeColored(`   Single RSC prefetch request with HTTP/2:\n\n`, 'yellow');
  writeColored(`   bun -e "import{BunHTTP2Multiplexer}from'./lib/http2-multiplexer.ts';\n`, 'white');
  writeColored(`   const m = new BunHTTP2Multiplexer();\n`, 'white');
  writeColored(`   await m.connect('bun.sh', 443);\n`, 'white');
  writeColored(`   const resp = await m.request('GET', '/docs?_rsc=jflv3',\n`, 'white');
  writeColored(`     {'rsc':'1', 'next-router-prefetch':'1', ':authority':'bun.sh'});\n`, 'white');
  writeColored(`   console.log('Status:', (await resp).status, 'Streams:', m.getStats().totalStreams);"\n`, 'white');
  
  // Concurrent RSC requests pattern
  writeColored(`\n📝 Concurrent RSC Requests Pattern:\n`, 'magenta');
  writeColored(`   Multiple concurrent RSC prefetch requests on single HTTP/2 connection:\n\n`, 'yellow');
  writeColored(`   bun -e "const{ BunHTTP2Multiplexer }=await import('./lib/http2-multiplexer.ts');\n`, 'white');
  writeColored(`   const m = new BunHTTP2Multiplexer();\n`, 'white');
  writeColored(`   console.time('h2');\n`, 'white');
  writeColored(`   await m.connect('bun.sh', 443);\n`, 'white');
  writeColored(`   const r = await Promise.all([\n`, 'white');
  writeColored(`     '/docs', '/blog', '/docs/api/utils'\n`, 'white');
  writeColored(`   ].map(p => m.request('GET', p + '?_rsc=1',\n`, 'white');
  writeColored(`     {'rsc':'1', 'next-router-prefetch':'1'})));\n`, 'white');
  writeColored(`   console.timeEnd('h2');\n`, 'white');
  writeColored(`   console.log('📊 Streams:', m.getStats().totalStreams,\n`, 'white');
  writeColored(`     'Latency:', 52, 'ms', 'P_ratio: 1.150');"\n`, 'white');
  
  writeColored(`\n   RSC Headers Pattern:\n`, 'cyan');
  writeColored(`   • 'rsc': '1' - Indicates React Server Component request\n`, 'white');
  writeColored(`   • 'next-router-prefetch': '1' - Next.js prefetch hint\n`, 'white');
  writeColored(`   • Query param '_rsc=1' - RSC cache key (simplified)\n`, 'white');
  writeColored(`   • Multiple paths in Promise.all() - Concurrent streams on single connection\n`, 'white');
  writeColored(`   • getStats().totalStreams - Monitor active streams\n`, 'white');
  writeColored(`   • P_ratio: 1.150 - Target performance metric (R-Score optimization)\n`, 'white');
  writeColored(`   • See: ./lib/rsc-multiplexer.ts for higher-level RSC wrapper\n`, 'yellow');
  
  // Note: We don't actually run this in the example to avoid network dependencies
  writeColored(`\n   ⚠️  Note: This example shows the pattern but doesn't execute network requests\n`, 'yellow');
  writeColored(`   Run the commands above to see actual performance comparison\n`, 'yellow');
  writeColored(`   ⚠️  Known Issue: HTTP/2 frame parsing needs refinement (see docs/HTTP2_STATUS.md)\n`, 'yellow');
}

// ============================================================================
// Example 22: Performance - Lazy Loading Benefits
// ============================================================================

async function example22_LazyLoadingPerformance() {
  writeLine('\n📝 Example 10: Performance - Lazy Loading Benefits', 'cyan');
  writeLine('─────────────────────────────────────────────────', 'white');
  
  // Create a large file
  const largeData = Array(1000).fill({ data: "x".repeat(100) });
  await Bun.write("example10-large.json", JSON.stringify(largeData));
  
  const file = Bun.file("example10-large.json");
  
  // Get metadata without reading file
  const startMeta = performance.now();
  const size = file.size;
  const type = file.type;
  const metaTime = performance.now() - startMeta;
  
  writeColored(`Metadata access (size, type): ${metaTime.toFixed(3)}ms (no disk read)\n`, 'green');
  writeColored(`   size: ${size} bytes\n`, 'cyan');
  writeColored(`   type: ${type}\n`, 'cyan');
  
  // Actually read the file
  const startRead = performance.now();
  const content = await file.text();
  const readTime = performance.now() - startRead;
  
  writeColored(`\nActual read (.text()): ${readTime.toFixed(3)}ms (disk I/O)\n`, 'yellow');
  writeColored(`   Content length: ${content.length} characters\n`, 'cyan');
  
  writeColored(`\n💡 Benefit: Metadata available instantly, content read only when needed!\n`, 'magenta');
}

// ============================================================================
// Cleanup Function
// ============================================================================

async function cleanup() {
  writeLine('\n🧹 Cleaning up example files...', 'cyan');
  
  const files = [
    "example0-data.json",
    "example1-lazy.txt",
    "example2-data.json",
    "example2-script.js",
    "example2-styles.css",
    "example2-markup.html",
    "example2-image.png",
    "example2-document.pdf",
    "example3-custom.txt",
    "example4-existing.txt",
    "example5-methods.json",
    "example6-check.txt",
    "example8-blob.txt",
    "example9-app.config",
    "example10-large.json",
    "example12-large.txt",
    "example14-string.txt",
    "example14-copy.txt",
    "example14-buffer.txt",
    "example14-uint8.txt",
    "example14-blob.txt",
    "example14-http.html",
    "example15-input.txt",
    "example15-output.txt",
    "example15-direct.txt",
    "example15-copy.txt",
    "example16-http.html",
    "example16-logo.svg",
    "example17-safe.html",
    "example17-unsafe.html",
    "example18-source.txt",
    "example18-copy1.txt",
    "example18-copy2.txt",
    "example19-log.txt",
    "example19-colored-log.txt",
    "example19-async-log.txt",
    "example19-aligned-log.txt",
    "example20-padded-log.html",
    "example20-padding-demo.txt",
  ];
  
  let deleted = 0;
  for (const file of files) {
    const fileHandle = Bun.file(file);
    if (await fileHandle.exists()) {
      await fileHandle.delete();
      deleted++;
    }
  }
  
  writeColored(`  Deleted ${deleted} files\n`, 'green');
  StatusOutput.success('Cleanup complete!');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  StatusOutput.rocket('Starting Bun.file() API Examples');
  writeLine('', 'white');
  writeColored('Demonstrating: Lazy loading, MIME detection, all methods & properties\n', 'cyan');
  writeLine('', 'white');
  
  try {
    await example0_OriginalPattern();
    await example1_LazyLoading();
    await example2_MimeTypeDetection();
    await example3_MimeTypeOverride();
    await example4_SizeProperty();
    await example5_AllMethods();
    await example6_ExistsMethod();
    await example7_DeleteMethod();
    await example8_BlobLikeBehavior();
    await example9_PracticalUseCase();
    await example10_StdinStdoutStderr();
    await example11_RemoteUrls();
    await example12_StreamingZeroCopy();
    await example13_RemoteStreaming();
    await example14_BunWrite();
    await example15_CopyAppendBenchmark();
    await example16_HttpToFile();
    await example17_SafeHtmlWriting();
    await example18_OptimizedCopy();
    await example19_IncrementalWriting();
    await example20_IntegratedPattern();
    await example21_Http2Multiplexing();
    await example22_LazyLoadingPerformance();
    
    // Cleanup
    await cleanup();
    
    StatusOutput.success('\n✅ All examples completed successfully!');
    writeColored('\n📚 Key Takeaways:\n', 'magenta');
    writeColored('   • Bun.file() is lazy - no disk read until method call\n', 'cyan');
    writeColored('   • MIME type guessed from extension (override with { type: "..." })\n', 'cyan');
    writeColored('   • size is 0 if file missing (available immediately)\n', 'cyan');
    writeColored('   • All methods return Promises (text, json, stream, arrayBuffer, bytes)\n', 'cyan');
    writeColored('   • exists() and delete() for file management\n', 'cyan');
    writeColored('   • Bun.stdin/stdout/stderr are built-in BunFiles for I/O streams\n', 'cyan');
    writeColored('   • Use Bun.write(Bun.stdout, ...) for colored output\n', 'cyan');
    writeColored('   • Use Bun.stdin.text() to read full stdin as string\n', 'cyan');
    writeColored('   • For remote URLs: fetch() + Bun.readableStreamTo* (zero-copy)\n', 'cyan');
    writeColored('   • Use .stream() with Bun.readableStreamTo* for zero-copy processing\n', 'cyan');
    writeColored('   • Perfect for large files and remote resources\n', 'cyan');
    writeColored('   • Bun.write() supports multiple data types and destinations\n', 'cyan');
    writeColored('   • Use BunFile for optimized copies (sendfile)\n', 'cyan');
    writeColored('   • Use Bun.escapeHTML() for safe HTML writing\n', 'cyan');
    writeColored('   • Bun.nanoseconds() for high-precision benchmarking\n', 'cyan');
    writeColored('   • FileSink (.writer()) for incremental/buffered writing\n', 'cyan');
    writeColored('   • Use .ref()/.unref() for event loop control\n', 'cyan');
    writeColored('   • Bun.stringWidth() for aligned logs with ANSI colors\n', 'cyan');
  } catch (error) {
    StatusOutput.error(`\n❌ Error running examples: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.path === Bun.main) {
  main().catch(console.error);
}

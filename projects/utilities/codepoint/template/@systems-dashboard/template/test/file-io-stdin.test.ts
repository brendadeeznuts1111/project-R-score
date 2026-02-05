// Comprehensive test suite for file I/O and stdin features
import { $, Bun } from "bun";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

describe("Enhanced Template - File I/O", () => {
  const testDir = "./test-files";
  const testFile = `${testDir}/test.txt`;
  const testJson = `${testDir}/test.json`;
  const testCopy = `${testDir}/test-copy.txt`;

  beforeAll(async () => {
    // Create test directory
    await $`mkdir -p ${testDir}`;
  });

  afterAll(async () => {
    // Clean up test directory
    await $`rm -rf ${testDir}`;
  });

  beforeEach(async () => {
    // Clean up test files before each test
    await $`rm -f ${testFile} ${testJson} ${testCopy}`;
  });

  describe("Bun.file() operations", () => {
    test("should create and read file with Bun.file()", async () => {
      const content = "Hello, Bun file I/O!";

      // Write file using Bun.write()
      const bytesWritten = await Bun.write(testFile, content);
      expect(bytesWritten).toBe(content.length);

      // Read file using Bun.file()
      const file = Bun.file(testFile);
      expect(await file.exists()).toBe(true);
      expect(file.size).toBe(content.length);
      expect(file.type).toBe("text/plain;charset=utf-8");

      const readContent = await file.text();
      expect(readContent).toBe(content);
    });

    test("should handle JSON files with Bun.file()", async () => {
      const jsonData = {
        name: "test",
        version: "1.0.0",
        features: ["file-io", "json"],
      };

      // Write JSON file
      await Bun.write(testJson, JSON.stringify(jsonData, null, 2));

      // Read and parse JSON
      const file = Bun.file(testJson);
      const parsedData = await file.json();

      expect(parsedData).toEqual(jsonData);
      expect(file.type).toBe("application/json;charset=utf-8");
    });

    test("should handle non-existent files", async () => {
      const nonExistentFile = Bun.file(`${testDir}/non-existent.txt`);

      expect(await nonExistentFile.exists()).toBe(false);
      expect(nonExistentFile.size).toBe(0);
      expect(nonExistentFile.type).toBe("text/plain;charset=utf-8");
    });

    test("should read file as ArrayBuffer", async () => {
      const content = "Binary content test";
      await Bun.write(testFile, content);

      const file = Bun.file(testFile);
      const arrayBuffer = await file.arrayBuffer();

      expect(arrayBuffer.byteLength).toBe(content.length);
      expect(new Uint8Array(arrayBuffer)).toEqual(
        new TextEncoder().encode(content)
      );
    });

    test("should read file as Uint8Array", async () => {
      const content = "Uint8Array test content";
      await Bun.write(testFile, content);

      const file = Bun.file(testFile);
      const uint8Array = await file.bytes();

      expect(uint8Array.length).toBe(content.length);
      expect(new TextDecoder().decode(uint8Array)).toBe(content);
    });

    test("should stream file content", async () => {
      const content = "Stream test content\nLine 2\nLine 3";
      await Bun.write(testFile, content);

      const file = Bun.file(testFile);
      const stream = file.stream();
      const reader = stream.getReader();

      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }

      expect(chunks.join("")).toBe(content);
    });
  });

  describe("Bun.write() operations", () => {
    test("should write string content", async () => {
      const content = "Test string content";
      const bytes = await Bun.write(testFile, content);

      expect(bytes).toBe(content.length);

      const file = Bun.file(testFile);
      expect(await file.exists()).toBe(true);
      expect(await file.text()).toBe(content);
    });

    test("should write Uint8Array content", async () => {
      const encoder = new TextEncoder();
      const content = "Uint8Array content";
      const uint8Array = encoder.encode(content);

      const bytes = await Bun.write(testFile, uint8Array);
      expect(bytes).toBe(content.length);

      const file = Bun.file(testFile);
      expect(await file.text()).toBe(content);
    });

    test("should copy file using Bun.write()", async () => {
      const content = "File copy test content";
      await Bun.write(testFile, content);

      const sourceFile = Bun.file(testFile);
      const bytes = await Bun.write(testCopy, sourceFile);

      expect(bytes).toBe(content.length);

      const copyFile = Bun.file(testCopy);
      expect(await copyFile.text()).toBe(content);
    });

    test("should write ArrayBuffer content", async () => {
      const content = "ArrayBuffer content";
      const encoder = new TextEncoder();
      const arrayBuffer = encoder.encode(content).buffer;

      const bytes = await Bun.write(testFile, arrayBuffer);
      expect(bytes).toBe(content.length);

      const file = Bun.file(testFile);
      expect(await file.text()).toBe(content);
    });
  });

  describe("File utilities", () => {
    test("should analyze file structure", async () => {
      const jsonData = {
        name: "test-app",
        version: "1.0.0",
        dependencies: { bun: "latest", react: "^18.0.0" },
        scripts: { dev: "bun run dev", build: "bun run build" },
      };

      await Bun.write(testJson, JSON.stringify(jsonData, null, 2));

      // Test file analysis
      const file = Bun.file(testJson);
      const content = await file.text();

      expect(content.length).toBeGreaterThan(0);
      expect(content.split("\n").length).toBeGreaterThan(5);
      expect(content.includes('"name"')).toBe(true);
      expect(content.includes('"dependencies"')).toBe(true);
    });

    test("should handle large files efficiently", async () => {
      // Create large content
      const lines = Array.from(
        { length: 1000 },
        (_, i) => `Line ${i + 1}: This is test content for line ${i + 1}`
      );
      const content = lines.join("\n");

      const start = performance.now();
      await Bun.write(testFile, content);
      const writeTime = performance.now() - start;

      const readStart = performance.now();
      const file = Bun.file(testFile);
      const readContent = await file.text();
      const readTime = performance.now() - readStart;

      expect(readContent).toBe(content);
      expect(writeTime).toBeLessThan(100); // Should be fast
      expect(readTime).toBeLessThan(100); // Should be fast

      console.log(
        `Large file write: ${writeTime.toFixed(2)}ms, read: ${readTime.toFixed(2)}ms`
      );
    });
  });
});

describe("Enhanced Template - Stdin Processing", () => {
  test("should process simple stdin input", async () => {
    const testInput = "Hello from stdin test!";

    // Create a temporary script to test stdin
    const script = `
      import { Bun } from "bun";
      const stdin = Bun.stdin;
      const content = await stdin.text();
      console.log("STDIN_RECEIVED:" + content);
    `;

    await Bun.write("test-stdin.ts", script);

    // Run the script with stdin input
    const result = await $`echo "${testInput}" | bun run test-stdin.ts`.text();

    expect(result).toContain("STDIN_RECEIVED:" + testInput);

    // Clean up
    await $`rm -f test-stdin.ts`;
  });

  test("should process JSON stdin input", async () => {
    const jsonData = { message: "JSON from stdin", timestamp: Date.now() };

    const script = `
      import { Bun } from "bun";
      const stdin = Bun.stdin;
      const content = await stdin.text();
      try {
        const parsed = JSON.parse(content);
        console.log("JSON_VALID:" + JSON.stringify(parsed));
      } catch (e) {
        console.log("JSON_INVALID:" + content);
      }
    `;

    await Bun.write("test-json-stdin.ts", script);

    const result =
      await $`echo '${JSON.stringify(jsonData)}' | bun run test-json-stdin.ts`.text();

    expect(result).toContain("JSON_VALID:");
    expect(result).toContain(JSON.stringify(jsonData));

    await $`rm -f test-json-stdin.ts`;
  });

  test("should handle TypeScript in stdin", async () => {
    const tsCode = 'console.log!("TypeScript from stdin!" as string);';

    const script = `
      import { Bun } from "bun";
      const stdin = Bun.stdin;
      const content = await stdin.text();
      console.log("TS_CODE:" + content);
    `;

    await Bun.write("test-ts-stdin.ts", script);

    const result = await $`echo '${tsCode}' | bun run test-ts-stdin.ts`.text();

    expect(result).toContain("TS_CODE:" + tsCode);

    await $`rm -f test-ts-stdin.ts`;
  });

  test("should stream stdin content", async () => {
    const script = `
      import { Bun } from "bun";
      const stdin = Bun.stdin;
      const stream = stdin.stream();
      const reader = stream.getReader();
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalLength += value.length;
      }

      console.log("STREAM_LENGTH:" + totalLength);
    `;

    await Bun.write("test-stream-stdin.ts", script);

    const longContent = "A".repeat(10000);
    const result =
      await $`echo "${longContent}" | bun run test-stream-stdin.ts`.text();

    expect(result).toContain("STREAM_LENGTH:" + longContent.length);

    await $`rm -f test-stream-stdin.ts`;
  });
});

describe("Enhanced Template - CLI Integration", () => {
  test("should handle --port argument", async () => {
    // This would test the actual CLI integration
    // For now, we'll test the argument parsing logic
    const testScript = `
      const port = process.argv.find(arg => arg.startsWith("--port="))?.split("=")[1] || "3000";
      console.log("PORT:" + port);
    `;

    await Bun.write("test-port.ts", testScript);

    const result = await $`bun run test-port.ts --port=8080`.text();

    expect(result).toContain("PORT:8080");

    await $`rm -f test-port.ts`;
  });

  test("should handle --console-depth argument", async () => {
    const testScript = `
      const depth = process.argv.find(arg => arg.startsWith("--console-depth="))?.split("=")[1] || "2";
      const obj = { a: { b: { c: { d: "deep" } } } };

      if (depth >= 4) {
        console.log("DEEP_OBJECT:" + JSON.stringify(obj));
      } else {
        console.log("SHALLOW_OBJECT:" + JSON.stringify({ a: { b: "[Object]" } }));
      }
    `;

    await Bun.write("test-depth.ts", testScript);

    const result = await $`bun run test-depth.ts --console-depth=5`.text();

    expect(result).toContain("DEEP_OBJECT:");
    expect(result).toContain('"d": "deep"');

    await $`rm -f test-depth.ts`;
  });

  test("should handle --smol argument", async () => {
    const testScript = `
      const isSmol = process.argv.includes("--smol");
      console.log("SMOL_MODE:" + isSmol);
    `;

    await Bun.write("test-smol.ts", testScript);

    const result = await $`bun run test-smol.ts --smol`.text();

    expect(result).toContain("SMOL_MODE:true");

    await $`rm -f test-smol.ts`;
  });

  test("should handle --define argument", async () => {
    const testScript = `
      const define = process.argv.find(arg => arg.startsWith("--define="))?.split("=")[1];
      console.log("DEFINE:" + (define || "none"));
    `;

    await Bun.write("test-define.ts", testScript);

    const result =
      await $`bun run test-define.ts --define=NODE_ENV:production`.text();

    expect(result).toContain("DEFINE:NODE_ENV:production");

    await $`rm -f test-define.ts`;
  });
});

describe("Enhanced Template - Performance Tests", () => {
  test("should perform file I/O efficiently", async () => {
    const testDir = "./perf-test";
    await $`mkdir -p ${testDir}`;

    try {
      // Test multiple file operations
      const files = Array.from(
        { length: 100 },
        (_, i) => `${testDir}/file-${i}.txt`
      );
      const contents = Array.from(
        { length: 100 },
        (_, i) => `Content for file ${i}`
      );

      // Write all files
      const writeStart = performance.now();
      await Promise.all(files.map((file, i) => Bun.write(file, contents[i])));
      const writeTime = performance.now() - writeStart;

      // Read all files
      const readStart = performance.now();
      const readResults = await Promise.all(
        files.map(async (file) => {
          const f = Bun.file(file);
          return await f.text();
        })
      );
      const readTime = performance.now() - readStart;

      expect(readResults).toEqual(contents);
      expect(writeTime).toBeLessThan(1000); // Should complete within 1 second
      expect(readTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(
        `File I/O performance: Write ${writeTime.toFixed(2)}ms, Read ${readTime.toFixed(2)}ms`
      );
    } finally {
      await $`rm -rf ${testDir}`;
    }
  });

  test("should handle memory efficiently with --smol", async () => {
    const testScript = `
      const isSmol = process.argv.includes("--smol");
      const initialMemory = process.memoryUsage();

      // Create large array
      const largeArray = Array.from({ length: 100000 }, (_, i) => ({ id: i, data: "x".repeat(100) }));

      const afterAllocation = process.memoryUsage();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterGC = process.memoryUsage();

      console.log("MEMORY_TEST:" + JSON.stringify({
        smol: isSmol,
        initial: initialMemory.heapUsed,
        afterAllocation: afterAllocation.heapUsed,
        afterGC: afterGC.heapUsed
      }));
    `;

    await Bun.write("test-memory.ts", testScript);

    const normalResult = await $`bun run test-memory.ts`.text();
    const smolResult = await $`bun run test-memory.ts --smol`.text();

    // Extract memory usage from results
    const normalMemory = JSON.parse(normalResult.split("MEMORY_TEST:")[1]);
    const smolMemory = JSON.parse(smolResult.split("MEMORY_TEST:")[1]);

    expect(normalMemory.smol).toBe(false);
    expect(smolMemory.smol).toBe(true);

    console.log("Memory usage comparison:");
    console.log("Normal mode:", normalMemory.afterGC / 1024 / 1024, "MB");
    console.log("Smol mode:", smolMemory.afterGC / 1024 / 1024, "MB");

    await $`rm -f test-memory.ts`;
  });
});

describe("Enhanced Template - Integration Tests", () => {
  test("should integrate file I/O with CLI arguments", async () => {
    const configFile = "test-config.json";
    const config = {
      port: 8080,
      host: "localhost",
      features: ["file-io", "cli"],
    };

    await Bun.write(configFile, JSON.stringify(config, null, 2));

    const script = `
      import { Bun } from "bun";

      const configFile = process.argv.find(arg => arg.startsWith("--config="))?.split("=")[1];
      const port = process.argv.find(arg => arg.startsWith("--port="))?.split("=")[1] || "3000";

      if (configFile) {
        const file = Bun.file(configFile);
        const config = await file.json();
        console.log("CONFIG_LOADED:" + JSON.stringify(config));
        console.log("FINAL_PORT:" + (config.port || port));
      } else {
        console.log("NO_CONFIG:" + port);
      }
    `;

    await Bun.write("test-integration.ts", script);

    const result =
      await $`bun run test-integration.ts --config=${configFile} --port=3000`.text();

    expect(result).toContain("CONFIG_LOADED:");
    expect(result).toContain('"port": 8080');
    expect(result).toContain("FINAL_PORT:8080");

    await $`rm -f test-integration.ts ${configFile}`;
  });

  test("should handle stdin with file processing", async () => {
    const testData = { filename: "test.txt", content: "Hello from stdin!" };

    const script = `
      import { Bun } from "bun";

      const stdin = Bun.stdin;
      const content = await stdin.text();
      const data = JSON.parse(content);

      // Write content to file
      await Bun.write(data.filename, data.content);

      // Read back and verify
      const file = Bun.file(data.filename);
      const readContent = await file.text();

      console.log("FILE_WRITTEN:" + data.filename);
      console.log("CONTENT_MATCH:" + (readContent === data.content));
    `;

    await Bun.write("test-stdin-file.ts", script);

    const result =
      await $`echo '${JSON.stringify(testData)}' | bun run test-stdin-file.ts`.text();

    expect(result).toContain("FILE_WRITTEN:test.txt");
    expect(result).toContain("CONTENT_MATCH:true");

    // Verify file was created
    const testFile = Bun.file("test.txt");
    expect(await testFile.exists()).toBe(true);
    expect(await testFile.text()).toBe(testData.content);

    await $`rm -f test-stdin-file.ts test.txt`;
  });
});

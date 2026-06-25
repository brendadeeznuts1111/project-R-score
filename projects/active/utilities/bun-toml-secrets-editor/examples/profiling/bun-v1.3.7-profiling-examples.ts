#!/usr/bin/env bun
// examples/bun-v1.3.7-profiling-examples.ts - Comprehensive examples of Bun v1.3.7 profiling features
import { existsSync, mkdirSync } from "node:fs";

// Fallback functions for JSON5 and JSONL if not available in Bun
function _parseJSON5Manual(content: string): any {
	// Simple JSON5 parser fallback - removes comments and trailing commas
	const cleaned = content
		.replace(/\/\/.*$/gm, "") // Remove single-line comments
		.replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
		.replace(/,\s*([}\]])/g, "$1"); // Remove trailing commas

	return JSON.parse(cleaned);
}

function parseJSONLManual(content: string): any[] {
	const lines = content.trim().split("\n");
	const results: any[] = [];

	for (const line of lines) {
		if (line.trim()) {
			try {
				results.push(JSON.parse(line));
			} catch (_error) {
				console.warn(`⚠️  Failed to parse line: ${line.substring(0, 50)}...`);
			}
		}
	}

	return results;
}

function parseChunkManual(chunk: string): {
	values: any[];
	read: number;
	done: boolean;
	error: string | null;
} {
	const lines = chunk.split("\n");
	const values: any[] = [];

	// Keep the last potentially incomplete line
	const completeLines = lines.slice(0, -1);
	const lastLine = lines[lines.length - 1];

	for (const line of completeLines) {
		if (line.trim()) {
			try {
				values.push(JSON.parse(line));
			} catch (error) {
				return {
					values: [],
					read: 0,
					done: false,
					error: `Parse error: ${error}`,
				};
			}
		}
	}

	// Calculate how many characters were consumed
	const consumedLength = completeLines.join("\n").length + 1;

	return {
		values,
		read: consumedLength,
		done: lastLine.trim() === "",
		error: null,
	};
}

// Example 1: CPU Profiling with Markdown Output
async function demonstrateCPUProfiling() {
	console.info("🔥 CPU Profiling with Markdown Output");
	console.info("=====================================");

	// Create a sample script to profile
	const sampleScript = `
// Sample computationally intensive script
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function heavyComputation() {
  console.info('Starting heavy computation...');
  const start = performance.now();
  
  // Compute fibonacci numbers
  for (let i = 30; i <= 35; i++) {
    const result = fibonacci(i);
    console.info(\`fibonacci(\${i}) = \${result}\`);
  }
  
  const end = performance.now();
  console.info(\`Computation completed in \${(end - start).toFixed(2)}ms\`);
}

// Simulate some async work
async function asyncWork() {
  await new Promise(resolve => setTimeout(resolve, 100));
  console.info('Async work completed');
}

// Main execution
async function main() {
  heavyComputation();
  await asyncWork();
  
  // Memory allocation patterns
  const arrays = [];
  for (let i = 0; i < 1000; i++) {
    arrays.push(new Array(100).fill(Math.random()));
  }
  
  console.info('Memory allocation completed');
}

main().catch(console.error);
`;

	const scriptPath = "./temp/fibonacci-demo.js";
	mkdirSync("./temp", { recursive: true });
	await Bun.write(scriptPath, sampleScript);

	console.info(`📝 Created sample script: ${scriptPath}`);

	// Run CPU profiling with markdown output
	console.info("\n⚡ Running CPU profiling with markdown output...");

	try {
		const proc = Bun.spawn(
			[
				"bun",
				"--cpu-prof-md",
				"--cpu-prof-name",
				"fibonacci-cpu-profile",
				"--cpu-prof-dir",
				"./profiles",
				scriptPath,
			],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();

		await proc.exited;

		if (proc.exitCode === 0) {
			console.info("✅ CPU profiling completed successfully!");
			console.info("📊 Script output:");
			console.info(output);

			// Check if markdown profile was created
			const profileFile = "./profiles/fibonacci-cpu-profile.md";
			if (existsSync(profileFile)) {
				console.info(`📁 Markdown profile created: ${profileFile}`);

				// Display a preview of the markdown profile
				const profileContent = await Bun.file(profileFile).text();
				const lines = profileContent.split("\n");
				console.info("\n📋 Profile preview (first 20 lines):");
				lines.slice(0, 20).forEach((line, i) => {
					console.info(`${(i + 1).toString().padStart(2)}: ${line}`);
				});
			}
		} else {
			console.error("❌ CPU profiling failed:");
			console.error(error);
		}
	} catch (error) {
		console.error("❌ Error running CPU profiling:", error);
	}
}

// Example 2: Heap Profiling with Markdown Output
async function demonstrateHeapProfiling() {
	console.info("\n💾 Heap Profiling with Markdown Output");
	console.info("======================================");

	// Create a memory-intensive script
	const memoryScript = `
// Memory allocation and leak simulation script
class MemoryLeakSimulator {
  constructor() {
    this.arrays = [];
    this.objects = [];
  }

  createLargeArrays() {
    console.info('Creating large arrays...');
    for (let i = 0; i < 100; i++) {
      const largeArray = new Array(10000).fill().map((_, index) => ({
        id: index,
        data: Math.random().toString(36),
        timestamp: Date.now()
      }));
      this.arrays.push(largeArray);
    }
    console.info(\`Created \${this.arrays.length} large arrays\`);
  }

  createObjects() {
    console.info('Creating objects...');
    for (let i = 0; i < 10000; i++) {
      this.objects.push({
        id: i,
        name: \`object-\${i}\`,
        data: new Array(100).fill(Math.random()),
        nested: {
          level1: { level2: { level3: new Array(50).fill(i) } }
        }
      });
    }
    console.info(\`Created \${this.objects.length} objects\`);
  }

  simulateLeak() {
    console.info('Simulating memory leak...');
    // Create objects that are never cleaned up
    const leakyData = [];
    setInterval(() => {
      leakyData.push(new Array(1000).fill(Math.random()));
    }, 10);
    
    // Return after some time to capture heap state
    setTimeout(() => {
      console.info('Memory leak simulation completed');
      console.info(\`Leaky data size: \${leakyData.length}\`);
    }, 200);
  }

  cleanup() {
    console.info('Cleaning up memory...');
    this.arrays = [];
    this.objects = [];
  }
}

async function main() {
  const simulator = new MemoryLeakSimulator();
  
  simulator.createLargeArrays();
  simulator.createObjects();
  
  // Wait a bit to capture heap state
  await new Promise(resolve => setTimeout(resolve, 500));
  
  simulator.simulateLeak();
  
  // Wait for leak simulation
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.info('Heap profiling script completed');
}

main().catch(console.error);
`;

	const scriptPath = "./temp/memory-demo.js";
	await Bun.write(scriptPath, memoryScript);

	console.info(`📝 Created memory script: ${scriptPath}`);

	// Run heap profiling with markdown output
	console.info("\n⚡ Running heap profiling with markdown output...");

	try {
		const proc = Bun.spawn(
			[
				"bun",
				"--heap-prof-md",
				"--heap-prof-name",
				"memory-heap-profile",
				"--heap-prof-dir",
				"./profiles",
				scriptPath,
			],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();

		await proc.exited;

		if (proc.exitCode === 0) {
			console.info("✅ Heap profiling completed successfully!");
			console.info("📊 Script output:");
			console.info(output);

			// Check if markdown profile was created
			const profileFile = "./profiles/memory-heap-profile.md";
			if (existsSync(profileFile)) {
				console.info(`📁 Markdown heap profile created: ${profileFile}`);

				// Display a preview of the markdown heap profile
				const profileContent = await Bun.file(profileFile).text();
				const lines = profileContent.split("\n");
				console.info("\n📋 Heap Profile preview (first 25 lines):");
				lines.slice(0, 25).forEach((line, i) => {
					console.info(`${(i + 1).toString().padStart(2)}: ${line}`);
				});
			}
		} else {
			console.error("❌ Heap profiling failed:");
			console.error(error);
		}
	} catch (error) {
		console.error("❌ Error running heap profiling:", error);
	}
}

// Example 3: JSON5 Configuration Support
async function demonstrateJSON5Support() {
	console.info("\n📋 JSON5 Configuration Support");
	console.info("===============================");

	// Create a JSON5 configuration file
	const json5Config = {
		// Application configuration
		app: {
			name: "bun-toml-secrets-editor",
			version: "1.0.0",
			// Environment-specific settings
			development: {
				debug: true,
				logLevel: "debug", // trailing comma
			},
			production: {
				debug: false,
				logLevel: "info",
			},
		},

		// Database configuration with comments
		database: {
			host: "localhost",
			port: 5432,
			// Use environment variables in production
			username: process.env.DB_USER || "admin",
			password: process.env.DB_PASSWORD || "password",
			ssl: true,
		},

		// Feature flags
		features: ["INTERACTIVE", "PREMIUM", "SECURITY_SCAN"],

		// Security settings
		security: {
			// JWT configuration
			jwt: {
				secret: process.env.JWT_SECRET || "your-secret-key",
				expiresIn: "5m", // 5 minutes
			},
			// Rate limiting
			rateLimit: {
				windowMs: 900000, // 15 minutes
				max: 100, // limit each IP to 100 requests per windowMs
			},
		},
	};

	const configPath = "./config/app.json5";
	mkdirSync("./config", { recursive: true });

	// Use Bun's built-in JSON5 stringify
	const json5Content =
		(Bun as any).JSON5?.stringify(json5Config, null, 2) ||
		JSON.stringify(json5Config, null, 2);
	await Bun.write(configPath, json5Content);

	console.info(`📝 Created JSON5 config: ${configPath}`);
	console.info("📄 JSON5 content:");
	console.info(json5Content);

	// Parse the JSON5 configuration
	try {
		const parsedConfig =
			(Bun as any).JSON5?.parse(json5Content) || JSON.parse(json5Content);
		console.info("\n✅ JSON5 configuration parsed successfully!");
		console.info(`📊 App name: ${(parsedConfig as any).app.name}`);
		console.info(`📊 Database host: ${(parsedConfig as any).database.host}`);
		console.info(`📊 Features: ${(parsedConfig as any).features.join(", ")}`);
	} catch (error) {
		console.error("❌ Failed to parse JSON5 configuration:", error);
	}
}

// Example 4: JSONL Streaming Parsing
async function demonstrateJSONLStreaming() {
	console.info("\n📡 JSONL Streaming Parsing");
	console.info("===========================");

	// Create sample JSONL data
	const sampleData = [
		{
			id: 1,
			name: "Alice",
			action: "login",
			timestamp: new Date().toISOString(),
		},
		{
			id: 2,
			name: "Bob",
			action: "upload",
			timestamp: new Date().toISOString(),
		},
		{
			id: 3,
			name: "Charlie",
			action: "download",
			timestamp: new Date().toISOString(),
		},
		{
			id: 4,
			name: "Diana",
			action: "delete",
			timestamp: new Date().toISOString(),
		},
		{
			id: 5,
			name: "Eve",
			action: "share",
			timestamp: new Date().toISOString(),
		},
	];

	// Convert to JSONL format
	const jsonlContent = `${sampleData.map((item) => JSON.stringify(item)).join("\n")}\n`;
	const jsonlPath = "./logs/sample-data.jsonl";
	mkdirSync("./logs", { recursive: true });
	await Bun.write(jsonlPath, jsonlContent);

	console.info(`📝 Created JSONL data: ${jsonlPath}`);
	console.info("📄 JSONL content:");
	console.info(jsonlContent);

	// Demonstrate complete JSONL parsing
	console.info("\n🔧 Complete JSONL parsing:");
	const parsedData = (Bun as any).JSONL?.parse
		? (Bun as any).JSONL.parse(jsonlContent)
		: parseJSONLManual(jsonlContent);
	console.info(`📊 Parsed ${parsedData.length} records:`);
	parsedData.forEach((record: any, index: number) => {
		console.info(
			`  ${index + 1}. ${record.name} - ${record.action} (${record.timestamp})`,
		);
	});

	// Demonstrate chunk parsing for streaming
	console.info("\n🌊 Chunk-based streaming parsing:");

	// Split data into chunks to simulate streaming
	const chunks = [
		'{"id": 1, "name": "Alice", "action": "login"}\n{"id": 2, "name": "Bob"',
		'", "action": "upload"}\n{"id": 3, "name": "Charlie", "action": "download"}\n',
		'{"id": 4, "name": "Diana", "action": "delete"}\n{"id": 5, "name": "Eve", "action": "share"}\n',
	];

	let buffer = "";
	let totalRecords = 0;

	for (let i = 0; i < chunks.length; i++) {
		buffer += chunks[i];
		const result = (Bun as any).JSONL?.parseChunk
			? (Bun as any).JSONL.parseChunk(buffer)
			: parseChunkManual(buffer);

		console.info(
			`Chunk ${i + 1}: ${result.values.length} records parsed, ${result.read} chars consumed`,
		);

		result.values.forEach((record: any) => {
			totalRecords++;
			console.info(
				`  Record ${totalRecords}: ${record.name} - ${record.action}`,
			);
		});

		// Keep only the unconsumed portion
		buffer = buffer.slice(result.read);
	}

	// Demonstrate buffer parsing
	console.info("\n💾 Buffer-based parsing:");
	const jsonlBuffer = new TextEncoder().encode(jsonlContent);
	const bufferParsed = (Bun as any).JSONL?.parse
		? (Bun as any).JSONL.parse(jsonlBuffer)
		: parseJSONLManual(jsonlContent);
	console.info(`📊 Buffer parsing: ${bufferParsed.length} records parsed`);

	// Create a streaming example
	console.info("\n🔄 Creating streaming example...");

	const streamingScript = `
// Streaming JSONL processing example
import { Bun } from 'bun';

async function processJSONLStream(filePath) {
  console.info('🌊 Processing JSONL stream...');
  
  const file = Bun.file(filePath);
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let recordCount = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const result = (Bun as any).JSONL?.parseChunk ? (Bun as any).JSONL.parseChunk(buffer) : parseChunkManual(buffer);
      
      for (const record of result.values) {
        recordCount++;
        console.info(\`📝 Processed record \${recordCount}: \${record.name} - \${record.action}\`);
      }
      
      // Keep only the unconsumed portion
      buffer = buffer.slice(result.read);
    }
    
    // Process any remaining data
    if (buffer.trim()) {
      try {
        const finalRecord = JSON.parse(buffer.trim());
        recordCount++;
        console.info(\`📝 Final record \${recordCount}: \${finalRecord.name} - \${finalRecord.action}\`);
      } catch (error) {
        console.warn('⚠️ Failed to parse final data:', error.message);
      }
    }
    
    console.info(\`✅ Stream processing completed. Total records: \${recordCount}\`);
  } finally {
    reader.releaseLock();
  }
}

// Run the streaming processor
processJSONLStream('./logs/sample-data.jsonl').catch(console.error);
`;

	const streamingScriptPath = "./temp/jsonl-streaming-demo.js";
	await Bun.write(streamingScriptPath, streamingScript);

	console.info(`📝 Created streaming demo: ${streamingScriptPath}`);

	// Run the streaming demo
	try {
		const proc = Bun.spawn(["bun", streamingScriptPath], {
			stdout: "pipe",
			stderr: "pipe",
		});

		const output = await new Response(proc.stdout).text();
		const error = await new Response(proc.stderr).text();

		await proc.exited;

		if (proc.exitCode === 0) {
			console.info("✅ Streaming demo completed!");
			console.info("📊 Output:");
			console.info(output);
		} else {
			console.error("❌ Streaming demo failed:");
			console.error(error);
		}
	} catch (error) {
		console.error("❌ Error running streaming demo:", error);
	}
}

// Example 5: Advanced Profiling Features
async function demonstrateAdvancedProfiling() {
	console.info("\n🚀 Advanced Profiling Features");
	console.info("==============================");

	// Create a comprehensive test script
	const advancedScript = `
// Advanced profiling demonstration script
import { performance } from 'perf_hooks';

class PerformanceTest {
  constructor() {
    this.metrics = {
      cpuTime: 0,
      memoryUsage: [],
      functionCalls: 0
    };
  }

  // CPU-intensive function
  cpuIntensiveTask(iterations = 1000000) {
    console.info(\`🔥 Starting CPU-intensive task (\${iterations} iterations)...\`);
    const start = performance.now();
    
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      this.functionCalls++;
    }
    
    const end = performance.now();
    this.metrics.cpuTime = end - start;
    console.info(\`✅ CPU task completed in \${this.metrics.cpuTime.toFixed(2)}ms\`);
    return result;
  }

  // Memory allocation patterns
  memoryAllocationTest() {
    console.info('💾 Starting memory allocation test...');
    
    const allocations = [];
    
    // Different allocation patterns
    for (let i = 0; i < 1000; i++) {
      // Small objects
      allocations.push({
        id: i,
        data: new Array(10).fill(Math.random()),
        timestamp: Date.now()
      });
      
      // Large arrays
      if (i % 100 === 0) {
        const largeArray = new Array(10000).fill().map((_, index) => ({
          index,
          value: Math.random(),
          nested: { data: new Array(50).fill(i) }
        }));
        allocations.push(largeArray);
      }
      
      // Track memory usage
      if (i % 100 === 0) {
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage.push({
          step: i,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        });
      }
    }
    
    console.info(\`✅ Memory allocation completed. Created \${allocations.length} objects\`);
    return allocations;
  }

  // Async operations
  async asyncOperationsTest() {
    console.info('⏳ Starting async operations test...');
    
    const promises = [];
    const startTime = performance.now();
    
    // Create multiple concurrent async operations
    for (let i = 0; i < 50; i++) {
      promises.push(new Promise(resolve => {
        setTimeout(() => {
          // Simulate async work
          const result = new Array(1000).fill(Math.random());
          resolve({ id: i, result, timestamp: Date.now() });
        }, Math.random() * 100);
      }));
    }
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    console.info(\`✅ Async operations completed in \${(endTime - startTime).toFixed(2)}ms\`);
    return results;
  }

  // Error handling and edge cases
  errorHandlingTest() {
    console.info('⚠️ Starting error handling test...');
    
    let errorsCaught = 0;
    
    for (let i = 0; i < 100; i++) {
      try {
        // Intentional errors for profiling error handling paths
        if (i % 10 === 0) {
          throw new Error(\`Test error \${i}\`);
        }
        
        // Normal operations
        const obj = { data: new Array(100).fill(i) };
        JSON.parse(JSON.stringify(obj));
        
      } catch (error) {
        errorsCaught++;
      }
    }
    
    console.info(\`✅ Error handling test completed. Caught \${errorsCaught} errors\`);
    return errorsCaught;
  }

  // Run all performance tests
  async runAllTests() {
    console.info('🚀 Starting comprehensive performance tests...');
    
    const results = {
      cpu: this.cpuIntensiveTask(),
      memory: this.memoryAllocationTest(),
      async: await this.asyncOperationsTest(),
      errors: this.errorHandlingTest()
    };
    
    console.info('📊 Performance Test Results:');
    console.info(\`  CPU Time: \${this.metrics.cpuTime.toFixed(2)}ms\`);
    console.info(\`  Function Calls: \${this.functionCalls}\`);
    console.info(\`  Memory Samples: \${this.metrics.memoryUsage.length}\`);
    console.info(\`  Async Operations: \${results.async.length}\`);
    console.info(\`  Errors Caught: \${results.errors}\`);
    
    return results;
  }
}

// Main execution
async function main() {
  const test = new PerformanceTest();
  await test.runAllTests();
  console.info('🎉 All performance tests completed!');
}

main().catch(console.error);
`;

	const scriptPath = "./temp/advanced-performance-demo.js";
	await Bun.write(scriptPath, advancedScript);

	console.info(`📝 Created advanced performance script: ${scriptPath}`);

	// Run with both CPU and heap profiling
	console.info("\n⚡ Running advanced performance profiling...");

	try {
		// CPU profiling
		console.info("🔥 Running CPU profiling...");
		const cpuProc = Bun.spawn(
			[
				"bun",
				"--cpu-prof-md",
				"--cpu-prof-name",
				"advanced-cpu-profile",
				"--cpu-prof-dir",
				"./profiles",
				scriptPath,
			],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const cpuOutput = await new Response(cpuProc.stdout).text();
		const cpuError = await new Response(cpuProc.stderr).text();

		await cpuProc.exited;

		if (cpuProc.exitCode === 0) {
			console.info("✅ Advanced CPU profiling completed!");
			console.info("📊 CPU Profile Output:");
			console.info(cpuOutput);
		} else {
			console.error("❌ Advanced CPU profiling failed:");
			console.error(cpuError);
		}

		// Heap profiling
		console.info("\n💾 Running heap profiling...");
		const heapProc = Bun.spawn(
			[
				"bun",
				"--heap-prof-md",
				"--heap-prof-name",
				"advanced-heap-profile",
				"--heap-prof-dir",
				"./profiles",
				scriptPath,
			],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const heapOutput = await new Response(heapProc.stdout).text();
		const heapError = await new Response(heapProc.stderr).text();

		await heapProc.exited;

		if (heapProc.exitCode === 0) {
			console.info("✅ Advanced heap profiling completed!");
			console.info("📊 Heap Profile Output:");
			console.info(heapOutput);
		} else {
			console.error("❌ Advanced heap profiling failed:");
			console.error(heapError);
		}
	} catch (error) {
		console.error("❌ Error running advanced profiling:", error);
	}
}

// Main demonstration function
async function runAllDemonstrations() {
	console.info("🎯 Bun v1.3.7 Feature Demonstrations");
	console.info("===================================");
	console.info(
		"This script demonstrates all the new profiling and JSON features in Bun v1.3.7",
	);
	console.info("");

	try {
		await demonstrateCPUProfiling();
		await demonstrateHeapProfiling();
		await demonstrateJSON5Support();
		await demonstrateJSONLStreaming();
		await demonstrateAdvancedProfiling();

		console.info("\n🎉 All demonstrations completed successfully!");
		console.info("\n📁 Generated files:");
		console.info("  • ./profiles/*.md - Markdown profiling reports");
		console.info("  • ./config/app.json5 - JSON5 configuration example");
		console.info("  • ./logs/sample-data.jsonl - JSONL data sample");
		console.info("  • ./temp/*.js - Example scripts");

		console.info("\n🔍 Next steps:");
		console.info("  1. Examine the generated markdown profiles");
		console.info("  2. Try the JSON5 configuration in your own projects");
		console.info("  3. Experiment with JSONL streaming for large datasets");
		console.info("  4. Use the profiling CLI for advanced analysis");
	} catch (error) {
		console.error("❌ Demonstration failed:", error);
		process.exit(1);
	}
}

// Run if called directly
if (import.meta.main) {
	runAllDemonstrations().catch(console.error);
}

export {
	demonstrateCPUProfiling,
	demonstrateHeapProfiling,
	demonstrateJSON5Support,
	demonstrateJSONLStreaming,
	demonstrateAdvancedProfiling,
	runAllDemonstrations,
};

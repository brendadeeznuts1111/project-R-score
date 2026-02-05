/**
 * @fileoverview Bun.Shell Examples: Environment Variables, Redirection, Piping, Command Substitution, Working Directory, and Output Reading
 * @description Comprehensive examples demonstrating Bun.Shell advanced features
 * 
 * This example demonstrates:
 * - Environment variables (inline, .env() method, global, merging with process.env)
 * - Redirection (output to JavaScript objects, input from JavaScript objects)
 * - Piping commands
 * - Command substitution ($(...))
 * - Working directory (.cwd() method, global $.cwd())
 * - Output reading methods (.text(), .json(), .lines(), .blob())
 * 
 * Run with: bun examples/demos/demo-bun-shell-env-redirect-pipe.ts
 */

import { $ } from "bun";

async function runExamples() {
	console.log("📚 Bun.Shell Advanced Features Examples\n");

	// ============================================================================
	// Environment Variables Examples
	// ============================================================================
	console.log("=".repeat(60));
	console.log("ENVIRONMENT VARIABLES");
	console.log("=".repeat(60));

	// Example 7.4.5.1.11: Inline syntax
	console.log("\n1. Inline Environment Variable Syntax:");
	const value = "bar123";
	await $`FOO=${value} bun -e 'console.log(process.env.FOO)'`;

	// Example 7.4.5.1.12: .env() method
	console.log("\n2. .env() Method:");
	const result1 = await $`echo $FOO`.env({ FOO: "bar" });
	console.log(`Output: ${result1.stdout.toString().trim()}`);

	// Merge with process.env
	console.log("\n3. Merge with process.env:");
	const result1b = await $`echo $USER $FOO`.env({ ...process.env, FOO: "bar" });
	console.log(`Output: ${result1b.stdout.toString().trim()}`);

	// Multiple variables
	console.log("\n4. Multiple Environment Variables:");
	const result2 = await $`echo $FOO $BAR $BAZ`.env({ 
		FOO: "bar", 
		BAR: "baz",
		BAZ: "qux"
	});
	console.log(`Output: ${result2.stdout.toString().trim()}`);

	// Example 7.4.5.1.13: Global environment
	console.log("\n5. Global Environment:");
	$.env({ GLOBAL_VAR: "global_value" });
	const result3 = await $`echo $GLOBAL_VAR`;
	console.log(`Output: ${result3.stdout.toString().trim()}`);
	
	// Local override of global
	console.log("\n6. Local Override of Global:");
	const result3b = await $`echo $GLOBAL_VAR`.env({ GLOBAL_VAR: "local_value" });
	console.log(`Output: ${result3b.stdout.toString().trim()}`);
	
	// Reset global environment
	$.env(undefined);
	const result4 = await $`echo $GLOBAL_VAR`.nothrow();
	console.log(`After reset: ${result4.stdout.toString().trim() || "(empty)"}`);

	// Empty reset
	console.log("\n7. Empty Reset (.env(undefined)):");
	const result5a = await $`echo $USER`.env(undefined);
	console.log(`Output: ${result5a.stdout.toString().trim() || "(empty)"}`);

	// ============================================================================
	// Redirection Examples
	// ============================================================================
	console.log("\n" + "=".repeat(60));
	console.log("REDIRECTION");
	console.log("=".repeat(60));

	// Example 7.4.5.1.7: Output to JavaScript Objects
	console.log("\n8. Output Redirection to Buffer:");
	const buffer = Buffer.alloc(100);
	await $`echo "Hello World!" > ${buffer}`;
	console.log(`Buffer content: ${buffer.toString().trim()}`);

	// Example 7.4.5.1.8: Input from JavaScript Objects
	console.log("\n9. Input Redirection from Response:");
	const response = new Response("hello world");
	const result6 = await $`cat < ${response}`.text();
	console.log(`Output: ${result6.trim()}`);

	// File redirection
	console.log("\n10. File Redirection:");
	await $`echo "Test content" > /tmp/bun-shell-test.txt`;
	const fileContent = await $`cat /tmp/bun-shell-test.txt`.text();
	console.log(`File content: ${fileContent.trim()}`);
	await $`rm /tmp/bun-shell-test.txt`.quiet();

	// Stream redirection (stderr to stdout)
	console.log("\n11. Stream Redirection (2>&1):");
	// Redirect stderr to stdout - useful for capturing both streams
	const result7 = await $`ls /nonexistent 2>&1 || echo "Error redirected"`.nothrow().quiet();
	console.log(`Combined output: ${result7.stdout.toString().trim()}`);

	// ============================================================================
	// Piping Examples
	// ============================================================================
	console.log("\n" + "=".repeat(60));
	console.log("PIPING");
	console.log("=".repeat(60));

	// Example 7.4.5.1.9: Basic piping
	console.log("\n12. Basic Piping:");
	const wordCount = await $`echo "Hello World!" | wc -w`.text();
	console.log(`Word count: ${wordCount.trim()}`);

	// Piping with JavaScript objects
	console.log("\n13. Piping with JavaScript Objects:");
	const response2 = new Response("hello world from response");
	const charCount = await $`cat < ${response2} | wc -c`.text();
	console.log(`Character count: ${charCount.trim()}`);

	// Multiple pipes
	console.log("\n14. Multiple Pipes:");
	const result8 = await $`echo "Hello World Test" | tr '[:upper:]' '[:lower:]' | wc -w`.text();
	console.log(`Lowercase word count: ${result8.trim()}`);

	// ============================================================================
	// Command Substitution Examples
	// ============================================================================
	console.log("\n" + "=".repeat(60));
	console.log("COMMAND SUBSTITUTION");
	console.log("=".repeat(60));

	// Example 7.4.5.1.10: Command substitution
	console.log("\n15. Command Substitution ($(...)):");
	const gitHash = await $`echo Hash: $(git rev-parse HEAD)`.text();
	console.log(`Git hash: ${gitHash.trim()}`);

	// Command substitution with environment variables
	console.log("\n16. Command Substitution with Environment Variables:");
	const result9a = await $`echo "Current dir: $(pwd)"`.env({ PWD: "/tmp" });
	console.log(`Output: ${result9a.stdout.toString().trim()}`);

	// ============================================================================
	// Working Directory Examples
	// ============================================================================
	console.log("\n" + "=".repeat(60));
	console.log("WORKING DIRECTORY");
	console.log("=".repeat(60));

	// Example 7.4.5.1.14: .cwd() method
	console.log("\n17. Working Directory - .cwd() Method:");
	const pwd1 = await $`pwd`.cwd("/tmp").text();
	console.log(`PWD: ${pwd1.trim()}`);

	// Example 7.4.5.1.15: Global .cwd()
	console.log("\n18. Global Working Directory:");
	$.cwd("/tmp");
	const pwd2 = await $`pwd`.text();
	console.log(`Global PWD: ${pwd2.trim()}`);

	// Local override
	console.log("\n19. Local Override of Global:");
	const pwd3 = await $`pwd`.cwd("/").text();
	console.log(`Local PWD: ${pwd3.trim()}`);

	// Reset
	$.cwd(undefined);
	const pwd4 = await $`pwd`.text();
	console.log(`After reset: ${pwd4.trim()}`);

	// ============================================================================
	// Output Reading Examples
	// ============================================================================
	console.log("\n" + "=".repeat(60));
	console.log("OUTPUT READING METHODS");
	console.log("=".repeat(60));

	// Example 7.4.5.1.16: .text()
	console.log("\n20. Reading Output - .text():");
	const textResult = await $`echo "Hello World!"`.text();
	console.log(`Text: ${textResult.trim()}`);

	// Example 7.4.5.1.17: .json()
	console.log("\n21. Reading Output - .json():");
	const jsonResult = await $`echo '{"foo": "bar", "baz": 123}'`.json();
	console.log(`JSON: ${JSON.stringify(jsonResult)}`);

	// Example 7.4.5.1.18: .lines()
	console.log("\n22. Reading Output - .lines():");
	console.log("Lines:");
	const linesCmd = $`printf "line1\nline2\nline3\n"`;
	for await (const line of linesCmd.lines()) {
		if (line.trim()) {
			console.log(`  - ${line}`);
		}
	}

	// Example 7.4.5.1.19: .blob()
	console.log("\n23. Reading Output - .blob():");
	const blobResult = await $`echo "Hello World!"`.blob();
	console.log(`Blob: size=${blobResult.size}, type=${blobResult.type}`);

	// ============================================================================
	// Combined Examples
	// ============================================================================
	console.log("\n" + "=".repeat(60));
	console.log("COMBINED FEATURES");
	console.log("=".repeat(60));

	// Environment + Redirection + Piping
	console.log("\n24. Environment + Redirection + Piping:");
	const outputBuffer = Buffer.alloc(200);
	await $`echo $MESSAGE | tr '[:lower:]' '[:upper:]' > ${outputBuffer}`.env({ 
		MESSAGE: "hello from environment" 
	});
	console.log(`Combined result: ${outputBuffer.toString().trim()}`);

	// Environment + Command Substitution
	console.log("\n25. Environment + Command Substitution:");
	const result9b = await $`echo "User: $USER, Hash: $(git rev-parse --short HEAD)"`.env({ 
		USER: "bun-user" 
	});
	console.log(`Output: ${result9b.stdout.toString().trim()}`);

	// Working Directory + Environment
	console.log("\n26. Working Directory + Environment:");
	const result10 = await $`pwd && echo $CUSTOM_VAR`.cwd("/tmp").env({ CUSTOM_VAR: "test" });
	console.log(`Output: ${result10.stdout.toString().trim()}`);

	console.log("\n✅ All examples completed successfully!");
}

// Run examples
runExamples().catch(console.error);

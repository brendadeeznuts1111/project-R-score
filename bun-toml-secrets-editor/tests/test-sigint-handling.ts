#!/usr/bin/env bun

/// <reference path="../node_modules/bun-types/index.d.ts" />

/**
 * Test: SIGINT Signal Handling
 * Simple, reliable SIGINT test using Bun.spawn
 */

async function testSIGINTHandling() {
	console.log("🧪 Testing SIGINT Signal Handling");
	console.log("===================================");

	// Create a test script that handles SIGINT
	const testScript = `
process.on("SIGINT", () => {
  console.log("Ctrl-C was pressed");
  process.exit(0);
});

console.log("Test process started. Send SIGINT to test...");
setInterval(() => {}, 1000);
`;

	console.log("🚀 Spawning test process...");

	// Spawn child process
	const child = Bun.spawn(["bun", "-e", testScript], {
		stdio: ["pipe", "pipe", "pipe"],
	});

	console.log(`📍 Child PID: ${child.pid}`);

	// Read output with timeout
	let output = "";
	const timeout = setTimeout(() => {
		console.log("⏰ Timeout - killing process");
		process.kill(child.pid, "SIGKILL");
		console.log("❌ Test timed out");
		process.exit(1);
	}, 5000);

	// Read stdout
	const readOutput = async () => {
		try {
			const chunk = await new Response(child.stdout).text();
			if (chunk) {
				output += chunk;
				console.log("📡 Output:", chunk.trim());

				if (chunk.includes("Test process started")) {
					console.log("✅ Process started");

					// Send SIGINT after 500ms
					setTimeout(() => {
						console.log("⚡ Sending SIGINT...");
						process.kill(child.pid, "SIGINT");
					}, 500);
				}

				if (chunk.includes("Ctrl-C was pressed")) {
					console.log("✅ SIGINT handler executed");
				}
			}
		} catch (_error) {
			console.log("📡 Stream ended");
		}
	};

	// Read stderr
	const readStderr = async () => {
		try {
			const chunk = await new Response(child.stderr).text();
			if (chunk) {
				console.error("❌ Stderr:", chunk.trim());
			}
		} catch {
			// Ignore
		}
	};

	// Process streams
	await Promise.all([readOutput(), readStderr()]);

	// Wait for exit
	const exitCode = await child.exited;
	clearTimeout(timeout);

	console.log(`🏁 Process exited with code: ${exitCode}`);

	if (output.includes("Ctrl-C was pressed")) {
		console.log("✅ SIGINT test PASSED");
		console.log("   - Process started successfully");
		console.log("   - SIGINT signal was sent");
		console.log("   - Handler was executed");
		console.log("   - Process exited cleanly");
		return true;
	} else {
		console.log("❌ SIGINT test FAILED");
		console.log("   - Output:", output);
		return false;
	}
}

// Run test
testSIGINTHandling()
	.then((success) => {
		console.log(success ? "\n✅ All tests passed!" : "\n❌ Test failed");
		process.exit(success ? 0 : 1);
	})
	.catch((error) => {
		console.error("\n❌ Error:", error.message);
		process.exit(1);
	});

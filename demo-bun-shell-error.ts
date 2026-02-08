import { $ } from "bun";

console.log("=== Bun.ShellError Complete Demo ===\n");

// Demo 1: Basic ShellError handling
async function basicShellErrorDemo() {
  console.log("1. Basic ShellError Handling:");
  try {
    await $`exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Exit Code: ${error.exitCode}`);
      console.log(`   Error Name: ${error.name}`);
      console.log(`   Error Message: ${error.message}`);
      console.log(`   Has Stack: ${!!error.stack}`);
      console.log(`   Has Cause: ${!!error.cause}`);
    }
  }
  console.log();
}

// Demo 2: Stdout and Stderr access
async function outputBuffersDemo() {
  console.log("2. Stdout and Stderr Buffers:");
  try {
    await $`sh -c 'echo "stdout output"; echo "stderr output" >&2; exit 2'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Stdout (Buffer): ${error.stdout}`);
      console.log(`   Stderr (Buffer): ${error.stderr}`);
      console.log(`   Stdout (string): ${error.stdout.toString()}`);
      console.log(`   Stderr (string): ${error.stderr.toString()}`);
    }
  }
  console.log();
}

// Demo 3: Text output methods
async function textOutputDemo() {
  console.log("3. Text Output Methods:");
  try {
    await $`echo "Hello, World!"`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Default (UTF-8): "${error.text()}"`);
      console.log(`   Length: ${error.text().length}`);
      
      // Demo with different encoding
      try {
        await $`echo "SGVsbG8sIFdvcmxkIQ=="`;
        console.log(`   Base64: "${error.text('base64')}"`);
      } catch (e) {
        console.log(`   Base64 demo: Using fallback`);
      }
    }
  }
  console.log();
}

// Demo 4: JSON output parsing
async function jsonOutputDemo() {
  console.log("4. JSON Output Parsing:");
  try {
    await $`echo '{"name": "Bun", "version": "1.3.9", "features": ["fast", "modern"]}'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      try {
        const jsonData = error.json();
        console.log(`   Parsed JSON:`, jsonData);
        console.log(`   Name: ${jsonData.name}`);
        console.log(`   Features: ${jsonData.features.join(", ")}`);
      } catch (jsonError) {
        console.log(`   JSON parsing failed: ${jsonError.message}`);
      }
    }
  }
  console.log();
}

// Demo 5: Binary output methods
async function binaryOutputDemo() {
  console.log("5. Binary Output Methods:");
  try {
    await $`echo "Binary data"`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Bytes: ${error.bytes()}`);
      console.log(`   Bytes Length: ${error.bytes().byteLength}`);
      console.log(`   ArrayBuffer: ${error.arrayBuffer()}`);
      console.log(`   ArrayBuffer Size: ${error.arrayBuffer().byteLength}`);
      console.log(`   Blob: ${error.blob()}`);
      console.log(`   Blob Size: ${error.blob().size}`);
      console.log(`   Blob Type: "${error.blob().type}"`);
    }
  }
  console.log();
}

// Demo 6: Real-world error handling scenarios
async function realWorldScenarios() {
  console.log("6. Real-World Error Scenarios:");
  
  // Scenario 1: File not found
  console.log("   Scenario 1 - File Not Found:");
  try {
    await $`cat nonexistent-file.txt`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`     Exit Code: ${error.exitCode}`);
      console.log(`     Error: ${error.stderr.toString().trim()}`);
    }
  }
  
  // Scenario 2: Permission denied
  console.log("   Scenario 2 - Command Not Found:");
  try {
    await $`nonexistent-command`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`     Exit Code: ${error.exitCode}`);
      console.log(`     Error: ${error.stderr.toString().trim()}`);
    }
  }
  
  // Scenario 3: Syntax error
  console.log("   Scenario 3 - Syntax Error:");
  try {
    await $`node -e "invalid javascript"`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`     Exit Code: ${error.exitCode}`);
      console.log(`     Error: ${error.stderr.toString().trim()}`);
    }
  }
  console.log();
}

// Demo 7: Static methods
async function staticMethodsDemo() {
  console.log("7. Static Methods:");
  
  // isError check
  const testError = new Error("test");
  console.log(`   isError(new Error()): ${$.ShellError.isError(testError)}`);
  console.log(`   isError("string"): ${$.ShellError.isError("string")}`);
  console.log(`   isError(123): ${$.ShellError.isError(123)}`);
  
  // stackTraceLimit
  console.log(`   Default stackTraceLimit: ${$.ShellError.stackTraceLimit}`);
  $.ShellError.stackTraceLimit = 5;
  console.log(`   Updated stackTraceLimit: ${$.ShellError.stackTraceLimit}`);
  $.ShellError.stackTraceLimit = 10; // Reset to default
  console.log();
}

// Demo 8: Advanced error handling with recovery
async function advancedErrorHandling() {
  console.log("8. Advanced Error Handling with Recovery:");
  
  async function runCommandWithRetry(command: string, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await $`${command}`;
        return result.text().trim();
      } catch (error) {
        if (error instanceof $.ShellError) {
          console.log(`     Attempt ${attempt} failed (exit code: ${error.exitCode})`);
          
          if (error.exitCode === 127) {
            // Command not found - don't retry
            throw new Error(`Command not found: ${command}`);
          }
          
          if (attempt === maxRetries) {
            throw new Error(`Command failed after ${maxRetries} attempts: ${error.stderr.toString()}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        } else {
          throw error;
        }
      }
    }
    throw new Error("Unexpected error");
  }
  
  try {
    const result = await runCommandWithRetry('echo "Success after retry"');
    console.log(`   Final result: ${result}`);
  } catch (error) {
    console.log(`   Final error: ${error.message}`);
  }
  console.log();
}

// Demo 9: Processing partial outputs from failed commands
async function partialOutputProcessing() {
  console.log("9. Processing Partial Outputs from Failed Commands:");
  
  try {
    // Command that produces output before failing
    await $`sh -c 'echo "Line 1"; echo "Line 2"; echo "Line 3"; echo "Error occurred" >&2; exit 1'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Command failed, but processing outputs:`);
      
      // Process stdout even though command failed
      const stdoutLines = error.text().trim().split('\n');
      console.log(`   Stdout lines: ${stdoutLines.length}`);
      stdoutLines.forEach((line, index) => {
        console.log(`     ${index + 1}: ${line}`);
      });
      
      // Process stderr for error information
      const stderrText = error.stderr.toString().trim();
      console.log(`   Stderr: ${stderrText}`);
      
      // Try to parse as JSON if it looks like JSON
      if (stdoutLines[0]?.startsWith('{')) {
        try {
          const jsonData = error.json();
          console.log(`   Parsed JSON from failed command:`, jsonData);
        } catch {
          console.log(`   Output was not JSON, processed as text instead`);
        }
      }
    }
  }
  console.log();
}

// Demo 10: Integration with file operations
async function fileOperationsDemo() {
  console.log("10. Integration with File Operations:");
  
  // Create a test file
  await $`echo "Test content for ShellError demo" > test-file.txt`;
  
  try {
    // Try to read a file that doesn't exist
    await $`cat nonexistent-file.txt`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   File read failed: ${error.stderr.toString().trim()}`);
      
      // Recover by reading the existing file
      try {
        const result = await $`cat test-file.txt`;
        console.log(`   Recovery - read existing file: ${result.text().trim()}`);
      } catch (recoveryError) {
        console.log(`   Recovery also failed: ${recoveryError.message}`);
      }
    }
  }
  
  // Cleanup
  await $`rm -f test-file.txt`;
  console.log();
}

// Run all demos
async function runAllDemos() {
  await basicShellErrorDemo();
  await outputBuffersDemo();
  await textOutputDemo();
  await jsonOutputDemo();
  await binaryOutputDemo();
  await realWorldScenarios();
  await staticMethodsDemo();
  await advancedErrorHandling();
  await partialOutputProcessing();
  await fileOperationsDemo();
  
  console.log("=== All ShellError demos completed! ===");
}

// Execute demos
runAllDemos().catch(console.error);

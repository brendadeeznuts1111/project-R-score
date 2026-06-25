import { $ } from "bun";

console.info("=== Bun.ShellError Complete Demo ===\n");

// Demo 1: Basic ShellError handling
async function basicShellErrorDemo() {
  console.info("1. Basic ShellError Handling:");
  try {
    await $`exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   Exit Code: ${error.exitCode}`);
      console.info(`   Error Name: ${error.name}`);
      console.info(`   Error Message: ${error.message}`);
      console.info(`   Has Stack: ${!!error.stack}`);
      console.info(`   Has Cause: ${!!error.cause}`);
    }
  }
  console.info();
}

// Demo 2: Stdout and Stderr access
async function outputBuffersDemo() {
  console.info("2. Stdout and Stderr Buffers:");
  try {
    await $`sh -c 'echo "stdout output"; echo "stderr output" >&2; exit 2'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   Stdout (Buffer): ${error.stdout}`);
      console.info(`   Stderr (Buffer): ${error.stderr}`);
      console.info(`   Stdout (string): ${error.stdout.toString()}`);
      console.info(`   Stderr (string): ${error.stderr.toString()}`);
    }
  }
  console.info();
}

// Demo 3: Text output methods
async function textOutputDemo() {
  console.info("3. Text Output Methods:");
  try {
    await $`echo "Hello, World!"`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   Default (UTF-8): "${error.text()}"`);
      console.info(`   Length: ${error.text().length}`);
      
      // Demo with different encoding
      try {
        await $`echo "SGVsbG8sIFdvcmxkIQ=="`;
        console.info(`   Base64: "${error.text('base64')}"`);
      } catch (e) {
        console.info(`   Base64 demo: Using fallback`);
      }
    }
  }
  console.info();
}

// Demo 4: JSON output parsing
async function jsonOutputDemo() {
  console.info("4. JSON Output Parsing:");
  try {
    await $`echo '{"name": "Bun", "version": "1.3.9", "features": ["fast", "modern"]}'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      try {
        const jsonData = error.json();
        console.info(`   Parsed JSON:`, jsonData);
        console.info(`   Name: ${jsonData.name}`);
        console.info(`   Features: ${jsonData.features.join(", ")}`);
      } catch (jsonError) {
        console.info(`   JSON parsing failed: ${jsonError.message}`);
      }
    }
  }
  console.info();
}

// Demo 5: Binary output methods
async function binaryOutputDemo() {
  console.info("5. Binary Output Methods:");
  try {
    await $`echo "Binary data"`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   Bytes: ${error.bytes()}`);
      console.info(`   Bytes Length: ${error.bytes().byteLength}`);
      console.info(`   ArrayBuffer: ${error.arrayBuffer()}`);
      console.info(`   ArrayBuffer Size: ${error.arrayBuffer().byteLength}`);
      console.info(`   Blob: ${error.blob()}`);
      console.info(`   Blob Size: ${error.blob().size}`);
      console.info(`   Blob Type: "${error.blob().type}"`);
    }
  }
  console.info();
}

// Demo 6: Real-world error handling scenarios
async function realWorldScenarios() {
  console.info("6. Real-World Error Scenarios:");
  
  // Scenario 1: File not found
  console.info("   Scenario 1 - File Not Found:");
  try {
    await $`cat nonexistent-file.txt`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`     Exit Code: ${error.exitCode}`);
      console.info(`     Error: ${error.stderr.toString().trim()}`);
    }
  }
  
  // Scenario 2: Permission denied
  console.info("   Scenario 2 - Command Not Found:");
  try {
    await $`nonexistent-command`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`     Exit Code: ${error.exitCode}`);
      console.info(`     Error: ${error.stderr.toString().trim()}`);
    }
  }
  
  // Scenario 3: Syntax error
  console.info("   Scenario 3 - Syntax Error:");
  try {
    await $`node -e "invalid javascript"`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`     Exit Code: ${error.exitCode}`);
      console.info(`     Error: ${error.stderr.toString().trim()}`);
    }
  }
  console.info();
}

// Demo 7: Static methods
async function staticMethodsDemo() {
  console.info("7. Static Methods:");
  
  // isError check
  const testError = new Error("test");
  console.info(`   isError(new Error()): ${$.ShellError.isError(testError)}`);
  console.info(`   isError("string"): ${$.ShellError.isError("string")}`);
  console.info(`   isError(123): ${$.ShellError.isError(123)}`);
  
  // stackTraceLimit
  console.info(`   Default stackTraceLimit: ${$.ShellError.stackTraceLimit}`);
  $.ShellError.stackTraceLimit = 5;
  console.info(`   Updated stackTraceLimit: ${$.ShellError.stackTraceLimit}`);
  $.ShellError.stackTraceLimit = 10; // Reset to default
  console.info();
}

// Demo 8: Advanced error handling with recovery
async function advancedErrorHandling() {
  console.info("8. Advanced Error Handling with Recovery:");
  
  async function runCommandWithRetry(command: string, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await $`${command}`;
        return result.text().trim();
      } catch (error) {
        if (error instanceof $.ShellError) {
          console.info(`     Attempt ${attempt} failed (exit code: ${error.exitCode})`);
          
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
    console.info(`   Final result: ${result}`);
  } catch (error) {
    console.info(`   Final error: ${error.message}`);
  }
  console.info();
}

// Demo 9: Processing partial outputs from failed commands
async function partialOutputProcessing() {
  console.info("9. Processing Partial Outputs from Failed Commands:");
  
  try {
    // Command that produces output before failing
    await $`sh -c 'echo "Line 1"; echo "Line 2"; echo "Line 3"; echo "Error occurred" >&2; exit 1'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   Command failed, but processing outputs:`);
      
      // Process stdout even though command failed
      const stdoutLines = error.text().trim().split('\n');
      console.info(`   Stdout lines: ${stdoutLines.length}`);
      stdoutLines.forEach((line, index) => {
        console.info(`     ${index + 1}: ${line}`);
      });
      
      // Process stderr for error information
      const stderrText = error.stderr.toString().trim();
      console.info(`   Stderr: ${stderrText}`);
      
      // Try to parse as JSON if it looks like JSON
      if (stdoutLines[0]?.startsWith('{')) {
        try {
          const jsonData = error.json();
          console.info(`   Parsed JSON from failed command:`, jsonData);
        } catch {
          console.info(`   Output was not JSON, processed as text instead`);
        }
      }
    }
  }
  console.info();
}

// Demo 10: Integration with file operations
async function fileOperationsDemo() {
  console.info("10. Integration with File Operations:");
  
  // Create a test file
  await $`echo "Test content for ShellError demo" > test-file.txt`;
  
  try {
    // Try to read a file that doesn't exist
    await $`cat nonexistent-file.txt`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   File read failed: ${error.stderr.toString().trim()}`);
      
      // Recover by reading the existing file
      try {
        const result = await $`cat test-file.txt`;
        console.info(`   Recovery - read existing file: ${result.text().trim()}`);
      } catch (recoveryError) {
        console.info(`   Recovery also failed: ${recoveryError.message}`);
      }
    }
  }
  
  // Cleanup
  await $`rm -f test-file.txt`;
  console.info();
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
  
  console.info("=== All ShellError demos completed! ===");
}

// Execute demos
runAllDemos().catch(console.error);

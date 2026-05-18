import { $ } from "bun";

console.info("=== Practical Bun.ShellError Examples ===\n");

// Example 1: Command not found handling
async function commandNotFound() {
  console.info("1. Command Not Found:");
  try {
    await $`nonexistent-command`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      if (error.exitCode === 127) {
        console.info(`   ❌ Command not found: ${error.stderr.toString().trim()}`);
        console.info(`   💡 Suggestion: Check if the command is installed and in PATH`);
      }
    }
  }
}

// Example 2: File operations with error recovery
async function fileOperations() {
  console.info("\n2. File Operations with Recovery:");
  
  try {
    await $`cat missing-file.txt`;
  } catch (error) {
    if (error instanceof $.ShellError && error.exitCode === 1) {
      console.info(`   ⚠️  File not found, creating default file...`);
      await $`echo "Default content" > default-file.txt`;
      
      const result = await $`cat default-file.txt`;
      console.info(`   ✅ Created and read: ${result.text().trim()}`);
    }
  }
}

// Example 3: JSON API response handling
async function jsonApiHandling() {
  console.info("\n3. JSON API Response Handling:");
  
  try {
    // Simulate API call that fails but returns JSON
    await $`echo '{"error": "Rate limit exceeded", "retry_after": 60}' && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      try {
        const errorData = error.json();
        console.info(`   📊 API Error: ${errorData.error}`);
        console.info(`   ⏰ Retry after: ${errorData.retry_after} seconds`);
      } catch {
        console.info(`   ❌ Invalid JSON in error response`);
      }
    }
  }
}

// Example 4: Processing partial output from failed commands
async function partialOutput() {
  console.info("\n4. Processing Partial Output:");
  
  try {
    // Command that processes some data then fails
    await $`sh -c 'echo "Processed: item1"; echo "Processed: item2"; echo "Error: Disk full" >&2; exit 1'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   💾 Command failed, but extracted processed items:`);
      
      const processedItems = error.text()
        .trim()
        .split('\n')
        .filter(line => line.startsWith('Processed:'))
        .map(line => line.replace('Processed: ', ''));
      
      processedItems.forEach(item => {
        console.info(`      ✓ ${item}`);
      });
      
      console.info(`   🚨 Error: ${error.stderr.toString().trim()}`);
    }
  }
}

// Example 5: Retry logic with exponential backoff
async function retryWithBackoff() {
  console.info("\n5. Retry Logic with Exponential Backoff:");
  
  async function retryCommand(command: string, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await $`${command}`;
        return result.text().trim();
      } catch (error) {
        if (error instanceof $.ShellError) {
          console.info(`   Attempt ${attempt}/${maxRetries} failed (code: ${error.exitCode})`);
          
          if (attempt === maxRetries) {
            throw new Error(`Failed after ${maxRetries} attempts: ${error.stderr.toString()}`);
          }
          
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          console.info(`   ⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error("Should not reach here");
  }
  
  try {
    // This will fail a few times before "succeeding"
    const result = await retryCommand('sh -c \'if [ $RANDOM -gt 25000 ]; then echo "Success!"; else echo "Temporary failure" >&2; exit 1; fi\'');
    console.info(`   ✅ Final result: ${result}`);
  } catch (error) {
    console.info(`   ❌ All retries failed: ${error.message}`);
  }
}

// Example 6: Binary data handling
async function binaryDataHandling() {
  console.info("\n6. Binary Data Handling:");
  
  try {
    await $`echo "Binary content: 🚀" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   📄 Text: ${error.text().trim()}`);
      console.info(`   🔢 Bytes length: ${error.bytes().byteLength}`);
      console.info(`   💾 ArrayBuffer size: ${error.arrayBuffer().byteLength}`);
      console.info(`   🌊 Blob size: ${error.blob().size}`);
    }
  }
}

// Example 7: Validation with proper error types
async function validationWithErrorTypes() {
  console.info("\n7. Validation with Error Types:");
  
  function validateShellError(error: unknown): error is $.ShellError {
    return error instanceof $.ShellError;
  }
  
  try {
    await $`exit 42`;
  } catch (error) {
    if (validateShellError(error)) {
      console.info(`   ✅ Valid ShellError detected`);
      console.info(`   🏷️  Type: ${error.constructor.name}`);
      console.info(`   🔢 Exit Code: ${error.exitCode}`);
      console.info(`   📝 Message: ${error.message}`);
      
      // Handle specific exit codes
      switch (error.exitCode) {
        case 1:
          console.info(`   💡 General error occurred`);
          break;
        case 2:
          console.info(`   💡 Misuse of shell builtins`);
          break;
        case 42:
          console.info(`   💡 Custom application error (42)`);
          break;
        default:
          console.info(`   💡 Unknown exit code: ${error.exitCode}`);
      }
    } else {
      console.info(`   ❌ Not a ShellError: ${error}`);
    }
  }
}

// Example 8: Cleanup on error
async function cleanupOnError() {
  console.info("\n8. Cleanup on Error:");
  
  // Create some temporary files
  await $`touch temp1.txt temp2.txt temp3.txt`;
  console.info(`   📁 Created temporary files`);
  
  try {
    // Simulate a command that fails
    await $`rm nonexistent-file.txt`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.info(`   🧹 Error occurred, cleaning up temporary files...`);
      
      // Cleanup regardless of error
      await $`rm -f temp1.txt temp2.txt temp3.txt`;
      console.info(`   ✅ Cleanup completed`);
      
      console.info(`   ❌ Original error: ${error.stderr.toString().trim()}`);
    }
  }
}

// Example 9: Logging and monitoring
async function loggingAndMonitoring() {
  console.info("\n9. Logging and Monitoring:");
  
  function logShellError(operation: string, error: $.ShellError) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ShellError in ${operation}:`);
    console.error(`  Exit Code: ${error.exitCode}`);
    console.error(`  Stdout: ${error.text().trim()}`);
    console.error(`  Stderr: ${error.stderr.toString().trim()}`);
    
    // In a real app, you might send this to a monitoring service
    // sendToMonitoring('shell_error', { operation, exitCode: error.exitCode, timestamp });
  }
  
  try {
    await $`echo "Log this output" && echo "Error occurred" >&2 && exit 3`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      logShellError('demo-operation', error);
      console.info(`   📊 Error logged for monitoring`);
    }
  }
}

// Example 10: Graceful degradation
async function gracefulDegradation() {
  console.info("\n10. Graceful Degradation:");
  
  async function getDataWithFallback(): Promise<string> {
    try {
      // Try primary method
      return await $`curl -s https://httpbin.org/json 2>/dev/null || echo '{"fallback": true}'`.text();
    } catch (error) {
      if (error instanceof $.ShellError) {
        console.info(`   🔄 Primary method failed, using fallback`);
        return '{"fallback": true, "reason": "network_error"}';
      }
      throw error;
    }
  }
  
  try {
    const data = await getDataWithFallback();
    const parsed = JSON.parse(data);
    console.info(`   📦 Data retrieved: ${JSON.stringify(parsed)}`);
  } catch (error) {
    console.info(`   ❌ Even fallback failed: ${error.message}`);
  }
}

// Run all practical examples
async function runPracticalExamples() {
  await commandNotFound();
  await fileOperations();
  await jsonApiHandling();
  await partialOutput();
  await retryWithBackoff();
  await binaryDataHandling();
  await validationWithErrorTypes();
  await cleanupOnError();
  await loggingAndMonitoring();
  await gracefulDegradation();
  
  console.info("\n=== All practical examples completed! ===");
}

// Execute examples
runPracticalExamples().catch(console.error);

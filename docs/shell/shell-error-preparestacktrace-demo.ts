import { $ } from "bun";

console.log("=== Bun.ShellError.prepareStackTrace() Method Demo ===\n");

// Example 1: Basic prepareStackTrace usage
async function basicPrepareStackTraceDemo() {
  console.log("1. Basic prepareStackTrace Usage:");
  
  // Store original prepareStackTrace
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    // Custom stack trace preparation
    Error.prepareStackTrace = (error, stack) => {
      console.log(`   Custom prepareStackTrace called for: ${error.name}`);
      console.log(`   Error message: ${error.message}`);
      console.log(`   Number of stack frames: ${stack.length}`);
      
      // Return custom formatted stack
      return `Custom ShellError Stack Trace:\n` +
             `Error: ${error.name}: ${error.message}\n` +
             `Frames: ${stack.length} total\n` +
             stack.map((frame, index) => 
               `  ${index + 1}. ${frame.getFunctionName() || 'anonymous'} (${frame.getFileName()}:${frame.getLineNumber()})`
             ).join('\n');
    };
    
    await $`exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Exit code: ${error.exitCode}`);
      console.log(`   Stack trace:`);
      console.log(`   ${error.stack}`);
    }
  } finally {
    // Restore original
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Example 2: Filtering stack frames
async function stackFilteringDemo() {
  console.log("2. Stack Frame Filtering:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    Error.prepareStackTrace = (error, stack) => {
      // Filter out internal frames
      const filteredStack = stack.filter(frame => {
        const filename = frame.getFileName() || '';
        return !filename.includes('node_modules') && 
               !filename.includes('bun:') &&
               !filename.includes('internal/');
      });
      
      return `Filtered Stack Trace (${filteredStack.length} frames):\n` +
             filteredStack.map((frame, index) => {
               const functionName = frame.getFunctionName() || 'anonymous';
               const fileName = frame.getFileName() || 'unknown';
               const lineNumber = frame.getLineNumber();
               const columnNumber = frame.getColumnNumber();
               
               return `  ${index + 1}. ${functionName} (${fileName}:${lineNumber}:${columnNumber})`;
             }).join('\n');
    };
    
    await $`echo "This will fail" && exit 42`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   Exit code: ${error.exitCode}`);
      console.log(`   ${error.stack}`);
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Example 3: Enhanced stack trace with context
async function enhancedStackDemo() {
  console.log("3. Enhanced Stack Trace with Context:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    Error.prepareStackTrace = (error, stack) => {
      const isShellError = error instanceof $.ShellError;
      
      let result = `Enhanced Stack Trace\n`;
      result += `==================\n`;
      result += `Error Type: ${error.constructor.name}\n`;
      result += `Message: ${error.message}\n`;
      
      if (isShellError) {
        result += `Shell Error Details:\n`;
        result += `  Exit Code: ${(error as $.ShellError).exitCode}\n`;
        result += `  Stdout Length: ${(error as $.ShellError).stdout.length} bytes\n`;
        result += `  Stderr Length: ${(error as $.ShellError).stderr.length} bytes\n`;
      }
      
      result += `\nCall Stack (${stack.length} frames):\n`;
      
      stack.forEach((frame, index) => {
        const functionName = frame.getFunctionName() || 'anonymous';
        const fileName = frame.getFileName() || 'unknown';
        const lineNumber = frame.getLineNumber();
        const columnNumber = frame.getColumnNumber();
        const isConstructor = frame.isConstructor();
        const isEval = frame.isEval();
        const isNative = frame.isNative();
        const isToplevel = frame.isToplevel();
        
        result += `  ${index + 1}. ${functionName}`;
        if (isConstructor) result += ' [constructor]';
        if (isEval) result += ' [eval]';
        if (isNative) result += ' [native]';
        if (isToplevel) result += ' [toplevel]';
        result += `\n`;
        result += `     Location: ${fileName}:${lineNumber}:${columnNumber}\n`;
        
        // Add method info if available
        const methodName = frame.getMethodName();
        if (methodName && methodName !== functionName) {
          result += `     Method: ${methodName}\n`;
        }
      });
      
      return result;
    };
    
    await $`sh -c 'echo "Nested shell command"; exit 5'`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(error.stack);
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Example 4: Stack trace analysis
async function stackAnalysisDemo() {
  console.log("4. Stack Trace Analysis:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    let analysisData: any = {};
    
    Error.prepareStackTrace = (error, stack) => {
      // Analyze stack frames
      analysisData = {
        totalFrames: stack.length,
        shellErrorFrames: 0,
        userFrames: 0,
        internalFrames: 0,
        uniqueFiles: new Set(),
        functionNames: [],
        hasConstructor: false,
        hasEval: false,
        hasNative: false
      };
      
      stack.forEach(frame => {
        const filename = frame.getFileName() || '';
        const functionName = frame.getFunctionName();
        
        // Categorize frames
        if (filename.includes('bun:') || filename.includes('internal/')) {
          analysisData.internalFrames++;
        } else if (functionName && functionName.includes('shell')) {
          analysisData.shellErrorFrames++;
        } else {
          analysisData.userFrames++;
        }
        
        // Track unique files
        analysisData.uniqueFiles.add(filename);
        
        // Track function names
        if (functionName) {
          analysisData.functionNames.push(functionName);
        }
        
        // Check for special frame types
        if (frame.isConstructor()) analysisData.hasConstructor = true;
        if (frame.isEval()) analysisData.hasEval = true;
        if (frame.isNative()) analysisData.hasNative = true;
      });
      
      // Return analysis instead of stack
      return `Stack Analysis Results:\n` +
             `=====================\n` +
             `Total frames: ${analysisData.totalFrames}\n` +
             `Shell error frames: ${analysisData.shellErrorFrames}\n` +
             `User frames: ${analysisData.userFrames}\n` +
             `Internal frames: ${analysisData.internalFrames}\n` +
             `Unique files: ${analysisData.uniqueFiles.size}\n` +
             `Has constructor: ${analysisData.hasConstructor}\n` +
             `Has eval: ${analysisData.hasEval}\n` +
             `Has native: ${analysisData.hasNative}\n` +
             `\nFunction names: ${analysisData.functionNames.slice(0, 5).join(', ')}${analysisData.functionNames.length > 5 ? '...' : ''}`;
    };
    
    await $`echo "Analysis test" && exit 3`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(error.stack);
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Example 5: Performance monitoring
async function performanceMonitoringDemo() {
  console.log("5. Performance Monitoring with Stack Trace:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    Error.prepareStackTrace = (error, stack) => {
      const startTime = performance.now();
      
      // Simulate expensive stack processing
      const processedStack = stack.map(frame => ({
        function: frame.getFunctionName(),
        file: frame.getFileName(),
        line: frame.getLineNumber(),
        column: frame.getColumnNumber(),
        isConstructor: frame.isConstructor(),
        isEval: frame.isEval(),
        isNative: frame.isNative()
      }));
      
      const processingTime = performance.now() - startTime;
      
      return `Performance Stack Processing\n` +
             `============================\n` +
             `Processing time: ${processingTime.toFixed(3)}ms\n` +
             `Frames processed: ${processedStack.length}\n` +
             `Time per frame: ${(processingTime / processedStack.length).toFixed(6)}ms\n` +
             `\nProcessed frames:\n` +
             processedStack.slice(0, 3).map((frame, index) => 
               `  ${index + 1}. ${frame.function || 'anonymous'} (${frame.file}:${frame.line})`
             ).join('\n') +
             (processedStack.length > 3 ? `\n  ... and ${processedStack.length - 3} more` : '');
    };
    
    await $`echo "Performance test" && exit 7`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(error.stack);
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Example 6: Stack trace caching
async function stackCachingDemo() {
  console.log("6. Stack Trace Caching:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  const stackCache = new Map<string, string>();
  
  try {
    Error.prepareStackTrace = (error, stack) => {
      // Create cache key from stack signature
      const signature = stack.map(frame => 
        `${frame.getFunctionName()}@${frame.getFileName()}:${frame.getLineNumber()}`
      ).join('|');
      
      // Check cache
      if (stackCache.has(signature)) {
        return `CACHED STACK TRACE:\n${stackCache.get(signature)}`;
      }
      
      // Process and cache
      const processedStack = stack.map((frame, index) => 
        `${index + 1}. ${frame.getFunctionName() || 'anonymous'} (${frame.getFileName() || 'unknown'}:${frame.getLineNumber() || 0})`
      ).join('\n');
      
      const cacheEntry = `ShellError Stack (${new Date().toISOString()}):\n${processedStack}`;
      stackCache.set(signature, cacheEntry);
      
      return cacheEntry;
    };
    
    // First call - should cache
    console.log("   First call (will cache):");
    await $`echo "First call" && exit 1`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   ${error.stack.split('\n')[0]}`);
    }
  }
  
  try {
    // Second call - should use cache
    console.log("\n   Second call (should use cache):");
    await $`echo "Second call" && exit 2`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`   ${error.stack.split('\n')[0]}`);
    }
  }
  
  console.log(`   Cache size: ${stackCache.size} entries`);
  
  Error.prepareStackTrace = originalPrepareStackTrace;
  console.log();
}

// Example 7: Stack trace formatting for different outputs
async function formattingDemo() {
  console.log("7. Stack Trace Formatting for Different Outputs:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    // JSON format
    Error.prepareStackTrace = (error, stack) => {
      const stackData = stack.map(frame => ({
        function: frame.getFunctionName(),
        file: frame.getFileName(),
        line: frame.getLineNumber(),
        column: frame.getColumnNumber()
      }));
      
      return JSON.stringify({
        error: {
          name: error.name,
          message: error.message,
          ...(error instanceof $.ShellError && {
            exitCode: error.exitCode,
            stdoutLength: error.stdout.length,
            stderrLength: error.stderr.length
          })
        },
        stack: stackData
      }, null, 2);
    };
    
    await $`echo "JSON format" && exit 4`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log("   JSON format:");
      const jsonStack = error.stack;
      console.log(`   ${jsonStack.split('\n').slice(0, 8).join('\n')}...`);
    }
  }
  
  try {
    // Compact format
    Error.prepareStackTrace = (error, stack) => {
      return stack.map(frame => 
        `${frame.getFunctionName() || '?'}:${frame.getLineNumber()}`
      ).join(' -> ');
    };
    
    await $`echo "Compact format" && exit 5`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(`\n   Compact format: ${error.stack}`);
    }
  }
  
  Error.prepareStackTrace = originalPrepareStackTrace;
  console.log();
}

// Example 8: Stack trace with source context
async function sourceContextDemo() {
  console.log("8. Stack Trace with Source Context:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    Error.prepareStackTrace = (error, stack) => {
      return `Stack Trace with Source Context:\n` +
             `=================================\n` +
             stack.map((frame, index) => {
               const functionName = frame.getFunctionName() || 'anonymous';
               const fileName = frame.getFileName() || 'unknown';
               const lineNumber = frame.getLineNumber();
               const columnNumber = frame.getColumnNumber();
               
               let result = `\n${index + 1}. ${functionName}\n`;
               result += `   at ${fileName}:${lineNumber}:${columnNumber}\n`;
               
               // Add context for non-native frames
               if (!frame.isNative() && fileName !== 'unknown') {
                 result += `   Context: Shell command execution\n`;
                 if (error instanceof $.ShellError) {
                   result += `   Shell Exit Code: ${error.exitCode}\n`;
                 }
               }
               
               return result;
             }).join('');
    };
    
    await $`echo "Source context demo" && exit 6`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(error.stack);
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Example 9: Stack trace security filtering
async function securityFilteringDemo() {
  console.log("9. Stack Trace Security Filtering:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  try {
    Error.prepareStackTrace = (error, stack) => {
      // Security filtering patterns
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /auth/i
      ];
      
      const filteredStack = stack.map(frame => {
        let functionName = frame.getFunctionName() || 'anonymous';
        let fileName = frame.getFileName() || 'unknown';
        
        // Filter sensitive information
        sensitivePatterns.forEach(pattern => {
          functionName = functionName.replace(pattern, '[REDACTED]');
          fileName = fileName.replace(pattern, '[REDACTED]');
        });
        
        return {
          function: functionName,
          file: fileName,
          line: frame.getLineNumber(),
          column: frame.getColumnNumber()
        };
      });
      
      return `Security-Filtered Stack Trace:\n` +
             `==============================\n` +
             filteredStack.map((frame, index) => 
               `  ${index + 1}. ${frame.function} (${frame.file}:${frame.line}:${frame.column})`
             ).join('\n');
    };
    
    await $`echo "Security test with secret_password" && exit 8`;
  } catch (error) {
    if (error instanceof $.ShellError) {
      console.log(error.stack);
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Example 10: Stack trace with custom error aggregation
async function errorAggregationDemo() {
  console.log("10. Stack Trace with Custom Error Aggregation:");
  
  const originalPrepareStackTrace = Error.prepareStackTrace;
  const errorStats = {
    totalErrors: 0,
    shellErrors: 0,
    exitCodes: new Map<number, number>(),
    commonFrames: new Map<string, number>()
  };
  
  try {
    Error.prepareStackTrace = (error, stack) => {
      // Update statistics
      errorStats.totalErrors++;
      
      if (error instanceof $.ShellError) {
        errorStats.shellErrors++;
        const exitCode = error.exitCode;
        errorStats.exitCodes.set(exitCode, (errorStats.exitCodes.get(exitCode) || 0) + 1);
      }
      
      // Track common frames
      stack.forEach(frame => {
        const frameKey = `${frame.getFunctionName()}@${frame.getFileName()}`;
        errorStats.commonFrames.set(frameKey, (errorStats.commonFrames.get(frameKey) || 0) + 1);
      });
      
      // Generate aggregated report
      let report = `Error Aggregation Report:\n` +
                   `========================\n` +
                   `Total errors: ${errorStats.totalErrors}\n` +
                   `Shell errors: ${errorStats.shellErrors}\n` +
                   `Exit codes: ${Array.from(errorStats.exitCodes.entries())
                     .map(([code, count]) => `${code}(${count})`)
                     .join(', ')}\n` +
                   `Most common frames:\n`;
      
      const sortedFrames = Array.from(errorStats.commonFrames.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      sortedFrames.forEach(([frame, count], index) => {
        report += `  ${index + 1}. ${frame} (${count} times)\n`;
      });
      
      return report;
    };
    
    // Generate multiple errors
    for (let i = 1; i <= 3; i++) {
      try {
        await $`echo "Error ${i}" && exit ${i}`;
      } catch (error) {
        if (error instanceof $.ShellError) {
          if (i === 3) console.log(error.stack); // Show final aggregation
        }
      }
    }
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
  console.log();
}

// Run all prepareStackTrace demos
async function runPrepareStackTraceDemos() {
  await basicPrepareStackTraceDemo();
  await stackFilteringDemo();
  await enhancedStackDemo();
  await stackAnalysisDemo();
  await performanceMonitoringDemo();
  await stackCachingDemo();
  await formattingDemo();
  await sourceContextDemo();
  await securityFilteringDemo();
  await errorAggregationDemo();
  
  console.log("=== All prepareStackTrace demos completed! ===");
}

// Execute demos
runPrepareStackTraceDemos().catch(console.error);

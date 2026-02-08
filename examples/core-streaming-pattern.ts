/**
 * Zero-Copy Streaming Pattern - Core Example
 * Demonstrates the fundamental ReadableStream integration with Bun.spawn
 */

// ReadableStream is built into Bun's global scope - no import needed

// Import Bun types properly to avoid conflicts
type BunSpawn = typeof import('bun').spawn;

interface RipgrepMatch {
  type: 'match' | 'context' | 'summary';
  data: {
    path: { text: string };
    lines: { text: string };
    line_number: number;
    absolute_offset: number;
    submatches?: Array<{
      match: { text: string };
      start: number;
      end: number;
    }>;
  };
}

/**
 * Core zero-copy streaming pattern
 * This is the fundamental pattern for memory-efficient documentation search
 */
async function zeroCopyStreamSearch(query: string, cachePath: string): Promise<void> {
  console.log(`🔍 Searching for: ${query}`);
  console.log(`📂 Cache path: ${cachePath}`);
  
  // Spawn ripgrep with JSON output for streaming
  const subprocess = (Bun as any).spawn(["rg", "--json", query, cachePath], {
    stdout: "pipe"
  });

  // Since Subprocess.stdout is a ReadableStream:
  const decoder = new TextDecoder();
  const stream = subprocess.stdout;

  if (stream instanceof ReadableStream) {
    console.log('✅ ReadableStream detected - starting zero-copy processing');
    
    let matchCount = 0;
    let bytesProcessed = 0;
    
    try {
      // Use proper ReadableStream reader instead of for await
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Process chunk as it arrives - never hold full text in memory
        const chunkText = decoder.decode(value);
        bytesProcessed += value.length;
        
        // Split into lines and process each JSON entry
        const lines = chunkText.split("\n");
        
        for (const line of lines) {
          if (!line) continue;
          
          try {
            const match = JSON.parse(line);
            
            if (match.type === "match") {
              matchCount++;
              // Yield results as they arrive!
              console.log(`✨ Found in: ${match.data.path.text}:${match.data.line_number}`);
              console.log(`   ${match.data.lines.text.trim()}`);
            }
          } catch (parseError) {
            // Skip malformed JSON lines
            console.warn('⚠️  Malformed JSON:', line.slice(0, 50) + '...');
          }
        }
        
        // Show progress every 10 matches
        if (matchCount % 10 === 0) {
          console.log(`📈 Progress: ${matchCount} matches, ${(bytesProcessed / 1024).toFixed(1)}KB processed`);
        }
      }
      
      // Wait for process completion
      const exitCode = await subprocess.exited;
      
      if (exitCode === 0) {
        console.log(`\n✅ Search complete: ${matchCount} matches found`);
        console.log(`💾 Memory efficiency: Only ${bytesProcessed} bytes processed (zero-copy)`);
      } else {
        console.error(`❌ Search failed with exit code: ${exitCode}`);
      }
      
    } catch (error) {
      console.error('❌ Streaming error:', error);
    }
  } else {
    console.error('❌ stdout is not a ReadableStream');
  }
}

/**
 * Enhanced version with backpressure handling
 */
async function enhancedStreamSearch(query: string, cachePath: string): Promise<void> {
  console.log(`\n🚀 Enhanced streaming with backpressure handling`);
  
  const subprocess = (Bun as any).spawn(["rg", "--json", query, cachePath], {
    stdout: "pipe"
  });

  const decoder = new TextDecoder();
  const stream = subprocess.stdout;

  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    let buffer = '';
    let matchCount = 0;
    let bytesProcessed = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Process chunk with streaming decoder
        const chunkText = decoder.decode(value, { stream: true });
        bytesProcessed += value.length;
        
        // Handle partial JSON lines across chunk boundaries
        buffer += chunkText;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const match: RipgrepMatch = JSON.parse(line);
            
            if (match.type === "match") {
              matchCount++;
              console.log(`🎯 Enhanced match ${matchCount}: ${match.data.path.text}:${match.data.line_number}`);
              
              // Show submatches if available
              if (match.data.submatches && match.data.submatches.length > 0) {
                for (const submatch of match.data.submatches) {
                  console.log(`   📍 "${submatch.match.text}" at position ${submatch.start}-${submatch.end}`);
                }
              }
            }
          } catch (parseError) {
            console.warn('⚠️  Parse error:', line.slice(0, 50) + '...');
          }
        }
        
        // Yield control periodically to prevent blocking
        if (matchCount % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      // Process any remaining buffer content
      if (buffer.trim()) {
        try {
          const match: RipgrepMatch = JSON.parse(buffer);
          if (match.type === "match") {
            matchCount++;
            console.log(`🎯 Final match: ${match.data.path.text}:${match.data.line_number}`);
          }
        } catch (parseError) {
          console.warn('⚠️  Final parse error:', buffer.slice(0, 50) + '...');
        }
      }
      
      const exitCode = await subprocess.exited;
      console.log(`\n✅ Enhanced search complete: ${matchCount} matches, ${(bytesProcessed / 1024).toFixed(1)}KB`);
      
    } catch (error) {
      console.error('❌ Enhanced streaming error:', error);
    }
  }
}

/**
 * Demonstration of the core pattern
 */
async function demonstrateCorePattern() {
  console.log('🧘 Zero-Copy Streaming Pattern - Core Demonstration');
  console.log('=' .repeat(60));
  
  // Use the existing cache directory
  const cachePath = '/Users/nolarose/Projects/.cache';
  
  // Basic zero-copy streaming
  await zeroCopyStreamSearch('bun', cachePath);
  
  // Enhanced streaming with backpressure handling
  await enhancedStreamSearch('ReadableStream', cachePath);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateCorePattern().catch(console.error);
}

export { zeroCopyStreamSearch, enhancedStreamSearch };

#!/usr/bin/env bun
/**
 * Interactive Demo: Bun.stdin/stdout/stderr Examples
 * 
 * Demonstrates reading from stdin and writing to stdout/stderr.
 * 
 * Usage:
 *   echo "Hello World" | bun scripts/stdin-stdout-demo.ts
 *   bun scripts/stdin-stdout-demo.ts  # Then type and press Ctrl+D (EOF)
 */

import { StatusOutput, writeColored, writeLine } from '../lib/output-helpers';

async function main() {
  StatusOutput.rocket('Bun.stdin/stdout/stderr Demo');
  writeLine('', 'white');
  
  // Write colored output to stdout
  writeColored("=== Writing to Bun.stdout ===\n", 'cyan');
  await Bun.write(Bun.stdout, Bun.color("blue", "ansi") + "Styled output!\n" + "\x1b[0m");
  await Bun.write(Bun.stdout, Bun.color("green", "ansi") + "Success: Operation completed\n" + "\x1b[0m");
  await Bun.write(Bun.stdout, Bun.color("yellow", "ansi") + "Warning: Check configuration\n" + "\x1b[0m");
  await Bun.write(Bun.stdout, Bun.color("red", "ansi") + "Error: Something went wrong\n" + "\x1b[0m");
  
  // Write to stderr
  writeColored("\n=== Writing to Bun.stderr ===\n", 'cyan');
  await Bun.write(Bun.stderr, Bun.color("red", "ansi") + "[STDERR] This is an error message\n" + "\x1b[0m");
  
  // Properties
  writeColored("\n=== Stream Properties ===\n", 'cyan');
  writeColored(`Bun.stdout.type: ${Bun.stdout.type}\n`, 'white');
  writeColored(`Bun.stderr.type: ${Bun.stderr.type}\n`, 'white');
  writeColored(`Bun.stdin.type: ${Bun.stdin.type}\n`, 'white');
  
  // Read from stdin
  writeColored("\n=== Reading from Bun.stdin ===\n", 'cyan');
  writeColored("Reading full stdin as string...\n", 'yellow');
  writeColored("(Type something and press Enter, or use: echo 'text' | bun script.ts)\n", 'yellow');
  
  try {
    const input = await Bun.stdin.text();
    if (input.trim()) {
      writeColored(`\n✅ Received input (${input.length} characters):\n`, 'green');
      writeColored(`"${input}"\n`, 'white');
      
      // Process input line by line
      const lines = input.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        writeColored(`\n📝 Processed ${lines.length} line(s):\n`, 'cyan');
        lines.forEach((line, i) => {
          writeColored(`   ${i + 1}. "${line}"\n`, 'white');
        });
      }
    } else {
      writeColored("\n⚠️  No input received (empty stdin)\n", 'yellow');
    }
  } catch (error) {
    StatusOutput.error(`Failed to read stdin: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Demonstrate stdin as stream (for large inputs)
  writeColored("\n=== Alternative: Reading stdin as stream ===\n", 'cyan');
  writeColored("(Useful for large inputs or real-time processing)\n", 'yellow');
  
  const stream = Bun.stdin.stream();
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  
  // Set a timeout to avoid blocking forever
  const timeout = setTimeout(() => {
    writeColored("\n⏱️  Timeout: No more input available\n", 'yellow');
    reader.cancel();
  }, 100); // 100ms timeout for demo
  
  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        chunks.push(value);
      }
    }
    clearTimeout(timeout);
    
    if (chunks.length > 0) {
      const streamedText = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      );
      writeColored(`Streamed input: ${chunks.length} chunk(s), ${streamedText.length} characters\n`, 'green');
    }
  } catch (error) {
    clearTimeout(timeout);
    // Expected if stdin is empty or cancelled
  }
  
  StatusOutput.success('\n✅ Demo complete!');
}

if (import.meta.path === Bun.main) {
  main().catch(console.error);
}

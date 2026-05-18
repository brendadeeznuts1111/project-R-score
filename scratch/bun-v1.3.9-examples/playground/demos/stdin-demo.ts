#!/usr/bin/env bun
/**
 * Demo: Reading from stdin
 * 
 * Demonstrates how to read user input from standard input
 */

console.info("📥 Bun Stdin Demo\n");
console.info("=".repeat(70));

// Check if stdin has data (piped input)
const stdin = process.stdin;

console.info("\n1️⃣ Checking stdin status");
console.info("-".repeat(70));
console.info("Is TTY:", stdin.isTTY);
console.info("Has data available:", stdin.readable);

// Read from stdin
console.info("\n2️⃣ Reading from stdin");
console.info("-".repeat(70));
console.info("(Pipe input or press Ctrl+D after typing)");

let input = '';
stdin.setEncoding('utf8');

for await (const chunk of stdin) {
  input += chunk;
}

const trimmed = input.trim();

if (trimmed) {
  console.info("\n✓ You entered:", trimmed);
  console.info("  Length:", trimmed.length, "characters");
  console.info("  Uppercase:", trimmed.toUpperCase());
  console.info("  Reversed:", trimmed.split('').reverse().join(''));
} else {
  console.info("\nNo input received (EOF)");
}

console.info("\n✅ Stdin demo complete!");

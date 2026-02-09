#!/usr/bin/env bun
/**
 * Demo: Reading from stdin
 * 
 * Demonstrates how to read user input from standard input
 */

console.log("📥 Bun Stdin Demo\n");
console.log("=".repeat(70));

// Check if stdin has data (piped input)
const stdin = process.stdin;

console.log("\n1️⃣ Checking stdin status");
console.log("-".repeat(70));
console.log("Is TTY:", stdin.isTTY);
console.log("Has data available:", stdin.readable);

// Read from stdin
console.log("\n2️⃣ Reading from stdin");
console.log("-".repeat(70));
console.log("(Pipe input or press Ctrl+D after typing)");

let input = '';
stdin.setEncoding('utf8');

for await (const chunk of stdin) {
  input += chunk;
}

const trimmed = input.trim();

if (trimmed) {
  console.log("\n✓ You entered:", trimmed);
  console.log("  Length:", trimmed.length, "characters");
  console.log("  Uppercase:", trimmed.toUpperCase());
  console.log("  Reversed:", trimmed.split('').reverse().join(''));
} else {
  console.log("\nNo input received (EOF)");
}

console.log("\n✅ Stdin demo complete!");

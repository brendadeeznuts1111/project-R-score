#!/usr/bin/env bun

// Demo version that simulates stdin input
import { colourKit } from "./quantum-toolkit-patch.ts";

console.log(`Let's add some numbers!`);

// Simulate the stdin input sequence
const inputs = ["5", "5", "5"];
let count = 0;

console.write(`Count: ${count}\n> `);

// Simulate the interactive loop with timing
async function simulateInput() {
  for (const input of inputs) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

    count += Number(input);
    const color = colourKit(Math.min(count / 20, 1));

    console.log(input); // Show what was "typed"
    console.write(`Count: ${color.ansi}${count}\x1b[0m\n> `);
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(
    "\n✅ Demo complete! This simulates the interactive stdin behavior."
  );
}

simulateInput().catch(console.error);

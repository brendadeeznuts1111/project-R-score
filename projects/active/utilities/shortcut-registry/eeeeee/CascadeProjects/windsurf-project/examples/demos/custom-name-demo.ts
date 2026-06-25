#!/usr/bin/env bun

// Exact example from Bun documentation
import { z } from "my-custom-name";

// Test the alias
const schema = z.string();
const result = schema.parse("Hello from custom alias!");

console.info('✅ Package alias working!');
console.info('Result:', result);
console.info('Type:', typeof result);

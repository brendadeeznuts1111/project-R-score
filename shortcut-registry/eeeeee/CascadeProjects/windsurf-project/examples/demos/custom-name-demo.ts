#!/usr/bin/env bun

// Exact example from Bun documentation
import { z } from "my-custom-name";

// Test the alias
const schema = z.string();
const result = schema.parse("Hello from custom alias!");

console.log('✅ Package alias working!');
console.log('Result:', result);
console.log('Type:', typeof result);

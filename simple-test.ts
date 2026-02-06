// simple-test.ts - Basic test of Bun feature flags
import { feature } from "bun:bundle";

console.log('Testing basic feature flags...');

// Test with a simple feature name
if (feature("DEBUG")) {
  console.log('✅ DEBUG is enabled');
} else {
  console.log('❌ DEBUG is disabled');
}

// Test with another simple feature
if (feature("TEST")) {
  console.log('✅ TEST is enabled');
} else {
  console.log('❌ TEST is disabled');
}

console.log('Done!');

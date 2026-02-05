#!/usr/bin/env bun

// Demo of newly installed packages
import { z } from 'zod';
import _ from 'lodash';
import { format } from 'date-fns';

// Zod schema validation
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0)
});

// Lodash utilities
const data = [1, 2, 3, 4, 5];
const doubled = _.map(data, x => x * 2);
const shuffled = _.shuffle(data);

// Date-fns formatting
const now = new Date();
const formatted = format(now, 'yyyy-MM-dd HH:mm:ss');

console.log('🚀 Bun Package Manager Demo');
console.log('============================');

// Test Zod validation
try {
  const user = { name: 'John', email: 'john@example.com', age: 25 };
  const validated = UserSchema.parse(user);
  console.log('✅ Zod validation:', validated);
} catch (error) {
  console.log('❌ Zod validation error:', error instanceof Error ? error.message : String(error));
}

// Test Lodash
console.log('✅ Lodash doubled:', doubled);
console.log('✅ Lodash shuffled:', shuffled);

// Test date-fns
console.log('✅ Date-fns formatted:', formatted);

console.log('🎉 All packages working correctly!');

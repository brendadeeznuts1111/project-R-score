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

console.info('🚀 Bun Package Manager Demo');
console.info('============================');

// Test Zod validation
try {
  const user = { name: 'John', email: 'john@example.com', age: 25 };
  const validated = UserSchema.parse(user);
  console.info('✅ Zod validation:', validated);
} catch (error) {
  console.info('❌ Zod validation error:', error instanceof Error ? error.message : String(error));
}

// Test Lodash
console.info('✅ Lodash doubled:', doubled);
console.info('✅ Lodash shuffled:', shuffled);

// Test date-fns
console.info('✅ Date-fns formatted:', formatted);

console.info('🎉 All packages working correctly!');

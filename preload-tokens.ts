#!/usr/bin/env bun

import { redis } from 'bun';

const key = 'user:@ashschaeffer1:tokens';

await redis.send('HMSET', [
  key,
  'venmo', 'venmo_sandbox_token',
  'paypal', 'paypal_sandbox_token',
  'plaid', 'plaid_public_token'
]);

console.log('✅ Tokens stored!');

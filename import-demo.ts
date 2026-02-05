import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

console.log('Import tracking demo');
console.log('UUID:', randomUUID());
console.log('Current directory:', __dirname);

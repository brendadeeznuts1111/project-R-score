import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

console.info('Import tracking demo');
console.info('UUID:', randomUUID());
console.info('Current directory:', __dirname);

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID, createHash } from 'crypto';
import { performance } from 'perf_hooks';

console.log('Demo app with multiple imports');

const hash = createHash('sha256');
const id = randomUUID();
const start = performance.now();

console.log(`Hash: ${hash}, ID: ${id}, Time: ${start}ms`);

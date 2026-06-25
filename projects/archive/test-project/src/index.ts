import { LevenshteinEngine } from '../../levenshtein-tier1380';
import { readFile } from 'fs/promises';
import { join } from 'path';

console.info('Testing import tracking plugin');

const engine = new LevenshteinEngine();
const data = await readFile(join(__dirname, 'data.txt'), 'utf-8');

console.info('Loaded data:', data.length, 'characters');
console.info('Engine version:', engine);

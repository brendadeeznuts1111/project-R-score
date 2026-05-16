import { LevenshteinEngine } from '../../levenshtein-tier1380';
import { readFile } from 'fs/promises';
import { join } from 'path';

console.log('Testing import tracking plugin');

const engine = new LevenshteinEngine();
const data = await readFile(join(__dirname, 'data.txt'), 'utf-8');

console.log('Loaded data:', data.length, 'characters');
console.log('Engine version:', engine);

#!/usr/bin/env node
/**
 * @see https://bun.com/docs/runtime#bun — `--bun` shebang override
 */
const isBun = typeof process.versions.bun === 'string';
process.stdout.write(isBun ? 'RUNTIME=bun\n' : 'RUNTIME=node\n');

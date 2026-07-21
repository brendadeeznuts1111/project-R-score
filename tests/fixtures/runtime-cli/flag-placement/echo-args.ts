/**
 * @see https://bun.com/docs/runtime#watch — `--watch` placement
 */
console.log(`WATCH=${Bun.argv.includes('--watch') ? 'yes' : 'no'}`);

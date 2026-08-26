#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn

const packageDirectory = new URL('../packages/registry-client/', import.meta.url).pathname;
const proof = `
  import RegistryClient, { uint8TotalBytes } from './dist/index.js';
  if (typeof RegistryClient !== 'function') throw new Error('default export is not a class');
  if (uint8TotalBytes(new Uint8Array([1, 2, 3])) !== 3) throw new Error('named export failed');
  const client = new RegistryClient({ baseUrl: 'https://registry.factory-wager.com' });
  if (client.baseUrl !== 'https://registry.factory-wager.com') throw new Error('client export failed');
`;

const process = Bun.spawn(['bun', '-e', proof], {
  cwd: packageDirectory,
  stdout: 'inherit',
  stderr: 'inherit',
});
const exitCode = await process.exited;
if (exitCode !== 0) throw new Error(`packed entry-point smoke test failed (${exitCode})`);

console.info('registry-client dist entry point: ok');

#!/usr/bin/env bun
// tools/import-meta-url-demo.ts — Demo of import.meta.url and Bun.file self-reference

// Bun.file(new URL(import.meta.url)) — reference to the current file
const self = Bun.file(new URL(import.meta.url));

console.info("import.meta.url:", import.meta.url);
console.info("size:", self.size, "bytes");
console.info("type:", self.type);
console.info("first 80 chars:", (await self.text()).slice(0, 80));

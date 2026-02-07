#!/usr/bin/env bun
// tools/import-meta-url-demo.ts — Demo of import.meta.url and Bun.file self-reference

// Bun.file(new URL(import.meta.url)) — reference to the current file
const self = Bun.file(new URL(import.meta.url));

console.log("import.meta.url:", import.meta.url);
console.log("size:", self.size, "bytes");
console.log("type:", self.type);
console.log("first 80 chars:", (await self.text()).slice(0, 80));

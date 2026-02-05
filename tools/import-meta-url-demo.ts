// Bun.file(new URL(import.meta.url)) — reference to the current file
const self = Bun.file(new URL(import.meta.url));

console.log("import.meta.url:", import.meta.url);
console.log("size:", self.size, "bytes");
console.log("type:", self.type);
console.log("first 80 chars:", (await self.text()).slice(0, 80));

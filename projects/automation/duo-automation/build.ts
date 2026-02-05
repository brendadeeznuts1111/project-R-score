// [DUOPLUS][BUILD][FIX][FEAT][META:{entrypoints:true}] [BUN:6.1-NATIVE]

await Bun.build({
  entrypoints: ["./src/index.ts", "./cli.ts"],
  outdir: "./dist",
  target: "node",
  format: "cjs",
  sourcemap: "external",
  minify: process.env.NODE_ENV === "production",
  external: ["@duoplus/tag-registry"]
});

const indexExists = await Bun.file("./dist/index.js").exists();
const cliExists = await Bun.file("./dist/cli.js").exists();
if (!indexExists || !cliExists) {
  throw new Error("[DUOPLUS][BUILD][ERROR] Missing entry points");
}

const schemaSource = Bun.file("./server/api/schemas");
if (await schemaSource.exists()) {
  await Bun.$`mkdir -p dist/schemas`;
  await Bun.$`cp -r server/api/schemas/* dist/schemas/`;
}

// Tag successful build
console.log("[DUOPLUS][BUILD][SUCCESS][META:{files:['index.js','cli.js']}] [#REF:BUILD-6.1]");

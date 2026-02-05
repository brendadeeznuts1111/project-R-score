// scripts/v1.3.6-validate.ts - Bun 1.3.6 native loader validation + CRC32
const glob = new Bun.Glob("**/*.{toml,jsonc}");

async function validateV136() {
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: "./src", absolute: true })) {
    files.push(file);
  }

  let valid = 0;
  const errors: string[] = [];
  const results: { file: string; type: string; crc: string; time: string }[] = [];

  for (const file of files) {
    const start = performance.now();
    const content = await Bun.file(file).text();
    let data: any;

    try {
      // Native loaders - Bun 1.3.6
      if (file.endsWith(".toml")) {
        // Dynamic import with TOML attribute
        const module = await import(file, { with: { type: "toml" } });
        data = module.default ?? module;
      } else if (file.endsWith(".jsonc")) {
        // Bun.JSONC for JSON with comments
        data = Bun.JSONC.parse(content);
      } else {
        continue;
      }

      // CRC32 checksum (hardware accelerated ~9GB/s)
      const crc = Bun.hash.crc32(new TextEncoder().encode(JSON.stringify(data)));
      const elapsed = (performance.now() - start).toFixed(0);

      results.push({
        file: file.replace(process.cwd() + "/", ""),
        type: file.endsWith(".toml") ? "TOML" : "JSONC",
        crc: crc.toString(16).padStart(8, "0"),
        time: `${elapsed}ms`,
      });

      valid++;
    } catch (err) {
      errors.push(`${file}: ${(err as Error).message}`);
    }
  }

  // Output results table
  console.log("\nBun v1.3.6 Native Loader Validation\n");
  console.log(Bun.inspect.table(results, { colors: true }));

  if (errors.length) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(`  ${e}`));
    process.exit(1);
  }

  console.log(`\n${valid} files validated with native loaders + CRC32`);
}

validateV136();

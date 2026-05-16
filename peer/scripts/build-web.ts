const result = await Bun.build({
  entrypoints: [
    `${process.cwd()}/src/client.ts`,
    `${process.cwd()}/src/portal.ts`,
  ],
  outdir: `${process.cwd()}/public`,
  naming: {
    entry: "[name].js",
  },
  target: "browser",
  format: "esm",
  sourcemap: "inline",
  minify: false,
});

if (!result.success) {
  const logs = await Promise.all(result.logs.map((log) => log.message));
  throw new Error(`Failed to build browser bundle:\n${logs.join("\n")}`);
}

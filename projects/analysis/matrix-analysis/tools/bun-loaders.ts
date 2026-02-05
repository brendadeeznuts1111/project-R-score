// bun run tools/bun-loaders.ts <command> [file] [options]
//
// Commands:
//   jsonc <file>           Parse JSONC (JSON with comments)
//   html <file>            Load HTML as text
//   toml <file>            Parse TOML config
//   wasm-hash <file>       Verify WASM file hash (wyhash)
//   compile <file> [--out] Build standalone executable
//   bundle <file> [--out]  HTML bundler with output hashes

const COMMANDS: Record<string, string> = {
	jsonc: "Parse JSONC file (comments allowed)",
	html: "Load HTML file as text",
	toml: "Parse TOML config file",
	"wasm-hash": "Print wyhash of a WASM file",
	compile: "Build standalone Bun executable",
	bundle: "HTML bundler with output hashes",
};

const cmd = process.argv[2];
const file = process.argv[3];
const outFlag = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];

if (!cmd || cmd === "--help" || !COMMANDS[cmd]) {
	console.log("Usage: bun run tools/bun-loaders.ts <command> [file]");
	console.log("");
	const rows = Object.entries(COMMANDS).map(([k, v]) => ({
		command: k,
		description: v,
	}));
	console.log(Bun.inspect.table(rows, ["command", "description"]));
	process.exit(cmd === "--help" ? 0 : 1);
}

if (!file) {
	console.error(`Error: <file> argument required for "${cmd}"`);
	process.exit(1);
}

const exists = await Bun.file(file).exists();
if (!exists) {
	console.error(`Error: file not found: ${file}`);
	process.exit(1);
}

if (cmd === "jsonc") {
	const mod = await import(file, { with: { type: "jsonc" } });
	console.log(Bun.inspect(mod.default, { depth: 5, colors: true }));
}

if (cmd === "html") {
	const mod = await import(file, { with: { type: "text" } });
	const text = mod.default as string;
	const preview =
		Bun.stringWidth(text) > 89 ? Bun.wrapAnsi(text, 89, { wordWrap: true }) : text;
	console.log(preview);
}

if (cmd === "toml") {
	const mod = await import(file, { with: { type: "toml" } });
	console.log(Bun.inspect(mod.default, { depth: 5, colors: true }));
}

if (cmd === "wasm-hash") {
	const buf = await Bun.file(file).arrayBuffer();
	const hash = Bun.hash.wyhash(Buffer.from(buf));
	console.log(`file:  ${file}`);
	console.log(`size:  ${buf.byteLength} bytes`);
	console.log(`hash:  ${hash.toString(16)}`);
}

if (cmd === "compile") {
	const outfile = outFlag || file.replace(/\.tsx?$/, "");
	const { success, logs } = await Bun.build({
		entrypoints: [file],
		outdir: ".",
		target: "bun",
		minify: true,
	});
	if (!success) {
		for (const log of logs) console.error(log);
		process.exit(1);
	}
	console.log(`Compiled: ${outfile}`);
}

if (cmd === "bundle") {
	const outdir = outFlag || "./dist";
	const result = await Bun.build({
		entrypoints: [file],
		outdir,
	});
	if (!result.success) {
		for (const log of result.logs) console.error(log);
		process.exit(1);
	}
	const rows = result.outputs.map((o) => ({
		kind: o.kind,
		file: o.path.split("/").pop(),
	}));
	console.log(Bun.inspect.table(rows, ["kind", "file"]));
}

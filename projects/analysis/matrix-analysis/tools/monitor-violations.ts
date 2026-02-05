// bun run tools/monitor-violations.ts --tenant=foo --severity=critical
const args = {
	tenant: process.argv.find((a) => a.startsWith("--tenant="))?.split("=")[1] || "*",
	severity:
		process.argv.find((a) => a.startsWith("--severity="))?.split("=")[1] || "warning",
};

function buildUrl(tenant: string): string {
	const url = new URL("http://localhost:1381/mcp/alerts/stream");
	url.searchParams.set("tenant", tenant);
	return url.toString();
}

let source = new EventSource(buildUrl(args.tenant));

console.log(`Monitoring violations for tenant: ${args.tenant}`);
console.log("=".repeat(89));

source.addEventListener("violation", (e) => {
	const v = Bun.JSON5.parse(e.data);
	if (v.severity !== args.severity && args.severity !== "all") {
		return;
	}
	const color = v.severity === "critical" ? "31" : "33";
	const loc = `${v.file}:${String(v.line).padStart(4)}`;
	const col = `${String(v.column).padStart(3)}c`;
	const preview = v.preview.slice(0, 48);
	const line = `${v.tenant.padEnd(12)} | ${loc} | ${col} | ${preview}`;
	const safe =
		Bun.stringWidth(line) <= 89
			? line
			: Bun.wrapAnsi(line, 89, { wordWrap: false }).split("\n")[0];
	console.log(`\x1b[${color}m${safe}\x1b[0m`);
});

source.onerror = () => {
	console.error("Connection lost. Retrying...");
};

setInterval(() => {
	if (source.readyState === EventSource.CLOSED) {
		console.warn("Connection closed - reconnecting...");
		source = new EventSource(buildUrl(args.tenant));
	}
}, 30_000);

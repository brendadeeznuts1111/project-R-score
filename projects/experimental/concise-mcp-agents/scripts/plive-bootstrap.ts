#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getPliveSession, redactSecret, storePliveSession } from "../src/lib/plive-session";

interface ProofReport {
	timestamp: string;
	workspace: string;
	sessionConfigured: boolean;
	cookiePreview: string;
	sessionPreview: string;
	sqlInitOk: boolean;
	authTestOk: boolean;
	authStatus: number | null;
	authPreview: string;
	fetchAttempted: boolean;
	fetchOk: boolean;
	fetchStatus: number | null;
	fetchPreview: string;
	dbPath: string;
}

const cwd = process.cwd();
const proofDir = join(cwd, "data");
const proofJson = join(proofDir, "plive-proof.json");
const proofMd = join(proofDir, "plive-proof.md");

await mkdir(proofDir, { recursive: true });

const envCookie = process.env.PLIVE_COOKIE || process.env.DATAPIPE_COOKIE || "";
const envSessionId = process.env.PLIVE_SESSION_TOKEN || "";

if (envCookie) {
	await storePliveSession({
		cookie: envCookie,
		sessionId: envSessionId,
	});
	console.info("Stored PLIVE session from environment variables.");
}

const proof: ProofReport = {
	timestamp: new Date().toISOString(),
	workspace: cwd,
	sessionConfigured: false,
	cookiePreview: "",
	sessionPreview: "",
	sqlInitOk: false,
	authTestOk: false,
	authStatus: null,
	authPreview: "",
	fetchAttempted: false,
	fetchOk: false,
	fetchStatus: null,
	fetchPreview: "",
	dbPath: join(cwd, "datapipe.db"),
};

try {
	const session = await getPliveSession();
	proof.sessionConfigured = true;
	proof.cookiePreview = redactSecret(session.cookie);
	proof.sessionPreview = session.sessionId ? redactSecret(session.sessionId) : "(not set)";
} catch (error) {
	proof.authPreview =
		error instanceof Error ? error.message : String(error);
}

const sqlInit = Bun.spawnSync({
	cmd: ["bun", "scripts/datapipe.ts", "sql-init"],
	cwd,
	stdout: "pipe",
	stderr: "pipe",
});
proof.sqlInitOk = sqlInit.exitCode === 0;

if (proof.sessionConfigured) {
	const session = await getPliveSession();
	const headers: Record<string, string> = {
		Accept: "application/json, text/javascript, */*; q=0.01",
		"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
		Cookie: session.cookie,
		Origin: "https://plive.sportswidgets.pro",
		Referer: "https://plive.sportswidgets.pro/manager-tools/",
		"User-Agent":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
		"X-Requested-With": "XMLHttpRequest",
	};
	if (session.sessionId) {
		headers["x-gs-session"] = session.sessionId;
	}

	const now = Math.floor(Date.now() / 1000);
	const from = now - 86400;

	const authResponse = await fetch(
		"https://plive.sportswidgets.pro/manager-tools/ajax.php",
		{
			method: "POST",
			headers,
			body: `action=getBetReport&minVolume=0&maxTimeUntilScore=0&from=${from}&to=${now}&toTime=86399&dateFilterBy=calcTime&state=0`,
		},
	);
	const authText = await authResponse.text();
	proof.authStatus = authResponse.status;
	proof.authTestOk = authResponse.ok;
	proof.authPreview = authText.slice(0, 600);

	if (authResponse.ok) {
		proof.fetchAttempted = true;
		const fetchRun = Bun.spawnSync({
			cmd: ["bun", "scripts/datapipe.ts", "fetch", "--sql"],
			cwd,
			stdout: "pipe",
			stderr: "pipe",
			timeout: 60000,
		});
		proof.fetchOk = fetchRun.exitCode === 0;
		proof.fetchStatus = fetchRun.exitCode;
		proof.fetchPreview = `${fetchRun.stdout.toString()}${fetchRun.stderr.toString()}`.slice(0, 1200);
	}
}

await Bun.write(proofJson, JSON.stringify(proof, null, 2));
await Bun.write(
	proofMd,
	`# PLIVE Bootstrap Proof

- Timestamp: ${proof.timestamp}
- Session configured: ${proof.sessionConfigured}
- Cookie: ${proof.cookiePreview || "(missing)"}
- x-gs-session: ${proof.sessionPreview || "(missing)"}
- SQL init ok: ${proof.sqlInitOk}
- Auth test ok: ${proof.authTestOk}
- Auth status: ${proof.authStatus ?? "n/a"}
- Fetch attempted: ${proof.fetchAttempted}
- Fetch ok: ${proof.fetchOk}
- Fetch status: ${proof.fetchStatus ?? "n/a"}

## Auth Preview

\`\`\`
${proof.authPreview}
\`\`\`

## Fetch Preview

\`\`\`
${proof.fetchPreview}
\`\`\`
`,
);

console.info(`Proof written: ${proofJson}`);
console.info(`Proof written: ${proofMd}`);
console.info(
	proof.authTestOk
		? "Bootstrap auth test passed."
		: "Bootstrap auth test did not pass. Load a real session and rerun.",
);

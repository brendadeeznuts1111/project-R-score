#!/usr/bin/env bun

import { getPliveSession, redactSecret, storePliveSession } from "../src/lib/plive-session";

const command = process.argv[2] || "status";

switch (command) {
	case "setup":
		await setupSession();
		break;
	case "status":
		await printStatus();
		break;
	case "test":
		await testSession();
		break;
	default:
		console.info(`Usage:
  bun scripts/plive-session.ts setup
  bun scripts/plive-session.ts status
  bun scripts/plive-session.ts test`);
}

async function setupSession(): Promise<void> {
	const readline = await import("readline");
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	const ask = (question: string) =>
		new Promise<string>((resolve) => {
			rl.question(question, (answer) => resolve(answer));
		});

	console.info("Paste the browser values from your logged-in Fantasy402 / PLIVE session.");
	const cookie = (await ask("Cookie: ")).trim();
	if (!cookie) {
		rl.close();
		throw new Error("Cookie is required");
	}
	const sessionId = (await ask("x-gs-session (optional): ")).trim();
	rl.close();

	await storePliveSession({ cookie, sessionId });
	console.info("✅ PLIVE session stored");
	await printStatus();
}

async function printStatus(): Promise<void> {
	try {
		const { cookie, sessionId } = await getPliveSession();
		console.info("PLIVE session is configured");
		console.info(`cookie=${redactSecret(cookie)}`);
		console.info(`x-gs-session=${sessionId ? redactSecret(sessionId) : "(not set)"}`);
	} catch (error) {
		console.info(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

async function testSession(): Promise<void> {
	const { cookie, sessionId } = await getPliveSession();
	const headers: Record<string, string> = {
		Accept: "application/json, text/javascript, */*; q=0.01",
		"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
		Cookie: cookie,
		Origin: "https://plive.sportswidgets.pro",
		Referer: "https://plive.sportswidgets.pro/manager-tools/",
		"User-Agent":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
		"X-Requested-With": "XMLHttpRequest",
	};
	if (sessionId) {
		headers["x-gs-session"] = sessionId;
	}

	const now = Math.floor(Date.now() / 1000);
	const from = now - 86400;
	const response = await fetch("https://plive.sportswidgets.pro/manager-tools/ajax.php", {
		method: "POST",
		headers,
		body: `action=getBetReport&minVolume=0&maxTimeUntilScore=0&from=${from}&to=${now}&toTime=86399&dateFilterBy=calcTime&state=0`,
	});

	console.info(`${response.status} ${response.statusText}`);
	const text = await response.text();
	console.info(text.slice(0, 800));

	if (!response.ok) {
		process.exit(1);
	}
}

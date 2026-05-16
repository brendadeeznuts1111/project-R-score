#!/usr/bin/env bun

import { storePliveSession, redactSecret } from "../src/lib/plive-session";

const username = process.env.PLIVE_USERNAME || process.env.FANTASY402_USERNAME || "";
const password = process.env.PLIVE_PASSWORD || process.env.FANTASY402_PASSWORD || "";

if (!username || !password) {
	console.error(
		"Missing PLIVE credentials. Set PLIVE_USERNAME and PLIVE_PASSWORD before running this script.",
	);
	process.exit(1);
}

console.log("🔑 Authenticating with plive.sportswidgets.pro...");

const loginResponse = await fetch(
	"https://plive.sportswidgets.pro/api/v3/manager-tools/signin/",
	{
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"User-Agent":
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			Accept: "application/json",
			Referer: "https://plive.sportswidgets.pro/manager-tools/#/login",
		},
		body: JSON.stringify({
			username,
			password,
		}),
	},
);

if (!loginResponse.ok) {
	console.error(
		`❌ Login failed: ${loginResponse.status} ${loginResponse.statusText}`,
	);
	console.error(await loginResponse.text());
	process.exit(1);
}

const authData = await loginResponse
	.json()
	.catch(() => ({} as Record<string, unknown>));
const cookies = loginResponse.headers.get("set-cookie") || "";
const sessionId =
	loginResponse.headers.get("x-gs-session") ||
	String((authData as any)?.sessionId || (authData as any)?.session || "");

if (!cookies) {
	console.error("❌ Login succeeded but no session cookie was returned.");
	process.exit(1);
}

await storePliveSession({
	cookie: cookies,
	sessionId,
});

console.log("✅ Session stored in Bun.secrets");
console.log(`🍪 Cookie: ${redactSecret(cookies)}`);
if (sessionId) {
	console.log(`🪪 x-gs-session: ${redactSecret(sessionId)}`);
}

console.log("🧪 Testing live data endpoint...");
const testHeaders: Record<string, string> = {
	cookie: cookies,
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
	Accept: "application/json",
	Referer: "https://plive.sportswidgets.pro/manager-tools/",
};

if (sessionId) {
	testHeaders["x-gs-session"] = sessionId;
}

const testResponse = await fetch(
	"https://plive.sportswidgets.pro/live/data?countries=true&leagues=true&sports=true",
	{ headers: testHeaders },
);

if (!testResponse.ok) {
	console.error(`❌ Live data access failed: ${testResponse.status}`);
	console.error(await testResponse.text());
	process.exit(1);
}

console.log("✅ Live data endpoint accessible");

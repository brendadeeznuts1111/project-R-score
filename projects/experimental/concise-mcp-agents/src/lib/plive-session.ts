export interface PliveSession {
	cookie: string;
	sessionId: string;
}

export async function getPliveSession(): Promise<PliveSession> {
	const cookie =
		(await Bun.secrets.get({ service: "plive", name: "cookie" })) ||
		(await Bun.secrets.get({ service: "datapipe", name: "COOKIE" })) ||
		process.env.PLIVE_COOKIE ||
		process.env.DATAPIPE_COOKIE ||
		"";

	const sessionId =
		(await Bun.secrets.get({ service: "plive", name: "x-gs-session" })) ||
		process.env.PLIVE_SESSION_TOKEN ||
		"";

	if (!cookie) {
		throw new Error(
			"Missing PLIVE session cookie. Run `bun scripts/plive-session.ts setup` or `bun scripts/auth-plive.ts`.",
		);
	}

	return { cookie, sessionId };
}

export async function storePliveSession(session: PliveSession): Promise<void> {
	const normalizedCookie = session.cookie.trim();
	const normalizedSessionId = session.sessionId.trim();

	if (!normalizedCookie) {
		throw new Error("Cannot store empty PLIVE cookie");
	}

	await Bun.secrets.set({
		service: "plive",
		name: "cookie",
		value: normalizedCookie,
	});
	await Bun.secrets.set({
		service: "datapipe",
		name: "COOKIE",
		value: normalizedCookie,
	});

	if (normalizedSessionId) {
		await Bun.secrets.set({
			service: "plive",
			name: "x-gs-session",
			value: normalizedSessionId,
		});
	}
}

export function redactSecret(value: string): string {
	if (!value) {
		return "";
	}

	if (value.length <= 8) {
		return `${value.slice(0, 2)}***`;
	}

	return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

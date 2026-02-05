// ── cookie-sessions.ts — Cookie-based session management with Bun secrets ─────────────
// Integrates with existing profiles.ts and scan.ts token management system

import {z} from 'zod';
import {getSecret, setSecret} from './profiles';
import type {ProjectInfo} from './scan';

// ── Project token helpers (duplicated to avoid circular dependency) ──────
function slugifyTokenPart(input: string): string {
	return (
		input
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'default'
	);
}

function projectTokenOrg(p: ProjectInfo): string {
	if (p.name.startsWith('@')) {
		const scope = p.name.split('/')[0]?.slice(1) ?? '';
		if (scope) return slugifyTokenPart(scope);
	}
	if (p.repoOwner && p.repoOwner !== '-') return slugifyTokenPart(p.repoOwner);
	return 'default';
}

function projectTokenProject(p: ProjectInfo): string {
	let raw = p.name;
	if (raw.startsWith('@')) raw = raw.split('/')[1] ?? p.folder;
	if (!raw || raw === '-') raw = p.folder;
	return slugifyTokenPart(raw);
}

function projectTokenService(p: ProjectInfo): string {
	const org = projectTokenOrg(p);
	const project = projectTokenProject(p);
	return `com.vercel.cli.${org}.${project}`;
}

// ── Types ────────────────────────────────────────────────────────────────
export interface CookieSession {
	id: string;
	service: string;
	project: string;
	domain: string;
	cookies: Record<string, CookieInfo>;
	createdAt: number;
	accessedAt: number;
	expiresAt?: number;
	secure: boolean;
	httpOnly: boolean;
	sameSite: 'Strict' | 'Lax' | 'None';
}

export interface CookieInfo {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: number;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface SessionConfig {
	ttl?: number; // Time to live in milliseconds (default: 24 hours)
	secure?: boolean; // Force secure cookies
	domain?: string; // Default domain for cookies
	path?: string; // Default path for cookies
	sameSite?: 'Strict' | 'Lax' | 'None'; // Default SameSite policy
}

// ── Schemas ──────────────────────────────────────────────────────────────
export const CookieInfoSchema = z.object({
	name: z.string(),
	value: z.string(),
	domain: z.string().optional(),
	path: z.string().optional(),
	expires: z.number().optional(),
	secure: z.boolean().optional(),
	httpOnly: z.boolean().optional(),
	sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
});

export const CookieSessionSchema = z.object({
	id: z.string(),
	service: z.string(),
	project: z.string(),
	domain: z.string(),
	cookies: z.record(z.string(), CookieInfoSchema),
	createdAt: z.number(),
	accessedAt: z.number(),
	expiresAt: z.number().optional(),
	secure: z.boolean(),
	httpOnly: z.boolean(),
	sameSite: z.enum(['Strict', 'Lax', 'None']),
});

// ── Constants ────────────────────────────────────────────────────────────
export const BUN_COOKIE_SESSION_PREFIX = 'cookie-session';
export const BUN_DEFAULT_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const BUN_COOKIE_SECRET_NAMES = ['session_cookies', 'auth_cookies', 'api_cookies'] as const;
export type CookieSecretName = (typeof BUN_COOKIE_SECRET_NAMES)[number];

// ── Session ID Generation ─────────────────────────────────────────────────
export function generateSessionId(service: string, project: string): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 15);
	const serviceHash = Bun.hash(service).toString(36);
	const projectHash = Bun.hash(project).toString(36);
	return `${BUN_COOKIE_SESSION_PREFIX}_${serviceHash}_${projectHash}_${timestamp}_${random}`;
}

// ── Session Storage Keys ───────────────────────────────────────────────────
export function getSessionKey(service: string, project: string, sessionId: string): string {
	return `${BUN_COOKIE_SESSION_PREFIX}.${service}.${project}.${sessionId}`;
}

export function getSessionListKey(service: string, project: string): string {
	return `${BUN_COOKIE_SESSION_PREFIX}.list.${service}.${project}`;
}

// ── Session Management ────────────────────────────────────────────────────
export async function createCookieSession(
	service: string,
	project: string,
	domain: string,
	config: SessionConfig = {},
): Promise<CookieSession> {
	const now = Date.now();
	const sessionId = generateSessionId(service, project);
	const sessionKey = getSessionKey(service, project, sessionId);
	const listKey = getSessionListKey(service, project);

	const session: CookieSession = {
		id: sessionId,
		service,
		project,
		domain,
		cookies: {},
		createdAt: now,
		accessedAt: now,
		expiresAt: config.ttl ? now + config.ttl : now + BUN_DEFAULT_SESSION_TTL,
		secure: config.secure ?? true,
		httpOnly: true,
		sameSite: config.sameSite ?? 'Lax',
	};

	await setSecret(service, sessionKey, JSON.stringify(session));

	const listValue = await getSecret(service, listKey);
	const list: string[] = listValue ? JSON.parse(listValue) : [];
	if (!list.includes(sessionId)) {
		list.push(sessionId);
		await setSecret(service, listKey, JSON.stringify(list));
	}

	return session;
}

export async function createProjectSession(
	projectInfo: ProjectInfo,
	domain: string,
	config: SessionConfig = {},
): Promise<CookieSession> {
	const service = projectTokenService(projectInfo);
	const project = projectTokenProject(projectInfo);
	return createCookieSession(service, project, domain, config);
}

export async function getSession(service: string, project: string, sessionId: string): Promise<CookieSession | null> {
	const sessionKey = getSessionKey(service, project, sessionId);
	const value = await getSecret(service, sessionKey);
	if (!value) return null;

	const session = CookieSessionSchema.parse(JSON.parse(value));
	if (session.expiresAt && session.expiresAt < Date.now()) return null;

	session.accessedAt = Date.now();
	await setSecret(service, sessionKey, JSON.stringify(session));
	return session;
}

export async function updateSessionCookies(
	service: string,
	project: string,
	sessionId: string,
	cookies: CookieInfo[],
): Promise<void> {
	const session = await getSession(service, project, sessionId);
	if (!session) throw new Error(`Session ${sessionId} not found`);

	for (const cookie of cookies) {
		session.cookies[cookie.name] = cookie;
	}

	const sessionKey = getSessionKey(service, project, sessionId);
	await setSecret(service, sessionKey, JSON.stringify(session));
}

export async function addCookieToSession(
	service: string,
	project: string,
	sessionId: string,
	cookie: CookieInfo,
): Promise<boolean> {
	const session = await getSession(service, project, sessionId);
	if (!session) return false;

	session.cookies[cookie.name] = cookie;
	const sessionKey = getSessionKey(service, project, sessionId);
	await setSecret(service, sessionKey, JSON.stringify(session));
	return true;
}

export async function removeCookieFromSession(
	service: string,
	project: string,
	sessionId: string,
	cookieName: string,
): Promise<boolean> {
	const session = await getSession(service, project, sessionId);
	if (!session) return false;

	delete session.cookies[cookieName];
	const sessionKey = getSessionKey(service, project, sessionId);
	await setSecret(service, sessionKey, JSON.stringify(session));
	return true;
}

export async function deleteSession(service: string, project: string, sessionId: string): Promise<boolean> {
	const sessionKey = getSessionKey(service, project, sessionId);
	const listKey = getSessionListKey(service, project);

	const listValue = await getSecret(service, listKey);
	if (listValue) {
		const list: string[] = JSON.parse(listValue);
		const filtered = list.filter(id => id !== sessionId);
		await setSecret(service, listKey, JSON.stringify(filtered));
	}

	const sessionValue = await getSecret(service, sessionKey);
	if (sessionValue) {
		await setSecret(service, sessionKey, '');
		return true;
	}
	return false;
}

export async function listSessions(service: string, project: string): Promise<CookieSession[]> {
	const listKey = getSessionListKey(service, project);
	const listValue = await getSecret(service, listKey);
	if (!listValue) return [];

	const sessionIds: string[] = JSON.parse(listValue);
	const sessions: CookieSession[] = [];

	for (const sessionId of sessionIds) {
		const session = await getSession(service, project, sessionId);
		if (session) sessions.push(session);
	}

	return sessions;
}

export async function cleanupExpiredSessions(service: string, project: string): Promise<number> {
	const sessions = await listSessions(service, project);
	const now = Date.now();
	let cleaned = 0;

	for (const session of sessions) {
		if (session.expiresAt && session.expiresAt < now) {
			await deleteSession(service, project, session.id);
			cleaned++;
		}
	}

	return cleaned;
}

export async function getProjectSession(projectId: string): Promise<CookieSession | null> {
	const projectInfo: ProjectInfo = {
		folder: projectId,
		name: projectId,
		version: '-',
		deps: 0,
		devDeps: 0,
		totalDeps: 0,
		engine: '-',
		lock: 'none',
		bunfig: false,
		workspace: false,
		keyDeps: [],
		author: '-',
		license: '-',
		description: '-',
		scriptsCount: 0,
		bin: [],
		registry: '-',
		authReady: false,
		hasNpmrc: false,
		hasBinDir: false,
		scopes: [],
		resilient: false,
		hasPkg: false,
		frozenLockfile: false,
		dryRun: false,
		production: false,
		exact: false,
		installOptional: true,
		installDev: true,
		installAuto: '-',
		linker: '-',
		configVersion: -1,
		backend: '-',
		minimumReleaseAge: 0,
		minimumReleaseAgeExcludes: [],
		saveTextLockfile: false,
		cacheDisabled: false,
		cacheDir: '-',
		cacheDisableManifest: false,
		globalDir: '-',
		globalBinDir: '-',
		hasCa: false,
		lockfileSave: true,
		lockfilePrint: '-',
		installSecurityScanner: '-',
		linkWorkspacePackages: false,
		noVerify: false,
		verbose: false,
		silent: false,
		concurrentScripts: 0,
		networkConcurrency: 0,
		targetCpu: '-',
		targetOs: '-',
		overrides: {},
		resolutions: {},
		trustedDeps: [],
		repo: '-',
		repoSource: '-',
		repoOwner: '-',
		repoHost: '-',
		envFiles: [],
		projectTz: 'UTC',
		projectDnsTtl: '-',
		bunfigEnvRefs: [],
		peerDeps: [],
		peerDepsMeta: [],
		installPeer: true,
		runShell: '-',
		runBun: false,
		runSilent: false,
		debugEditor: '-',
		hasTests: false,
		nativeDeps: [],
		workspacesList: [],
		lockHash: '-',
	};
	const service = projectTokenService(projectInfo);
	const project = projectTokenProject(projectInfo);
	const sessions = await listSessions(service, project);
	return sessions[0] ?? null;
}

// ── Cookie Parsing ────────────────────────────────────────────────────────
export function parseCookieString(cookieString: string): Record<string, CookieInfo> {
	const cookies: Record<string, CookieInfo> = {};
	const parts = cookieString.split(';').map(s => s.trim());

	if (parts.length === 0) return cookies;

	const [nameValue, ...attrs] = parts;
	const [name, value] = nameValue.split('=').map(s => s.trim());
	if (!name || !value) return cookies;

	const cookie: CookieInfo = {name, value};

	for (const attr of attrs) {
		const [key, val] = attr.split('=').map(s => s.trim().toLowerCase());
		if (key === 'domain') cookie.domain = val;
		else if (key === 'path') cookie.path = val;
		else if (key === 'secure') cookie.secure = true;
		else if (key === 'httponly') cookie.httpOnly = true;
		else if (key === 'samesite') {
			if (val === 'strict' || val === 'lax' || val === 'none') {
				cookie.sameSite = (val.charAt(0).toUpperCase() + val.slice(1)) as 'Strict' | 'Lax' | 'None';
			}
		} else if (key === 'expires' && val) {
			const expires = new Date(val).getTime();
			if (!isNaN(expires)) cookie.expires = expires;
		}
	}

	cookies[name] = cookie;
	return cookies;
}

export function serializeCookie(cookie: CookieInfo): string {
	let str = `${cookie.name}=${cookie.value}`;
	if (cookie.domain) str += `; Domain=${cookie.domain}`;
	if (cookie.path) str += `; Path=${cookie.path}`;
	if (cookie.expires) str += `; Expires=${new Date(cookie.expires).toUTCString()}`;
	if (cookie.secure) str += '; Secure';
	if (cookie.httpOnly) str += '; HttpOnly';
	if (cookie.sameSite) str += `; SameSite=${cookie.sameSite}`;
	return str;
}

export function serializeSessionCookies(session: CookieSession): string {
	return Object.values(session.cookies).map(serializeCookie).join('; ');
}

// ── Terminal Formatting ───────────────────────────────────────────────────
export async function listSessionsForTerminal(service: string, project: string): Promise<string> {
	const sessions = await listSessions(service, project);
	if (sessions.length === 0) {
		return `No sessions found for ${service}/${project}`;
	}

	const lines = sessions.map(s => {
		const expires = s.expiresAt ? new Date(s.expiresAt).toLocaleString() : 'Never';
		const cookieCount = Object.keys(s.cookies).length;
		return `${s.id} | ${s.domain} | ${cookieCount} cookies | expires: ${expires}`;
	});

	return `Sessions for ${service}/${project}:\n${lines.join('\n')}`;
}

export function formatSessionForTerminal(session: CookieSession): string {
	const expires = session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'Never';
	const cookieCount = Object.keys(session.cookies).length;
	const cookieList = Object.keys(session.cookies).join(', ');

	return `Session: ${session.id}
Service: ${session.service}
Project: ${session.project}
Domain: ${session.domain}
Cookies (${cookieCount}): ${cookieList}
Created: ${new Date(session.createdAt).toLocaleString()}
Accessed: ${new Date(session.accessedAt).toLocaleString()}
Expires: ${expires}
Secure: ${session.secure}
HttpOnly: ${session.httpOnly}
SameSite: ${session.sameSite}`;
}

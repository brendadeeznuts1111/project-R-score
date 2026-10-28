/**
 * Agent Onboarding Portal — Bun backend.
 *
 * Single-file Bun.serve server implementing the frontend contract:
 * CSRF (Bun.CSRF), auth (Bun.password + Bun.CookieMap sessions), tasks /
 * sessions / credentials CRUD (bun:sqlite), live control (WebSocket via
 * server.upgrade), screenshot thumbnails (Bun.Image) and periodic health
 * checks (Bun.cron).
 *
 * Task execution is configurable via AUTOMATION_EXEC:
 *   "worker" (default) — each task runs in a child process via Bun.spawn,
 *                         reporting progress back over IPC
 *   "inline"           — processTask() runs in-process (needed to keep the
 *                         driver alive for real /live control of sessions)
 *
 * @see https://bun.com/docs/runtime/http
 * @see https://bun.com/docs/runtime/csrf
 * @see https://bun.com/docs/runtime/cookies
 * @see https://bun.com/docs/runtime/sqlite
 * @see https://bun.com/docs/runtime/spawn
 * @see https://bun.com/docs/runtime/webview
 * @see https://bun.com/docs/runtime/image
 * @see https://bun.com/docs/runtime/cron
 */
import type { ServerWebSocket } from "bun";
import { randomBytes, randomUUID } from "node:crypto";
import { createDriver } from "./driver/factory.ts";
import type { AutomationDriver } from "./driver/types.ts";
import {
  createDb,
  decrypt,
  encrypt,
  hostnameOf,
  logSession,
  resolveMasterKey,
  selectorsFor,
  type AgentRow,
  type CredentialRow,
  type LogRow,
  type SessionDetailRow,
  type SessionRow,
  type TaskRow,
  DB_PATH,
  DRIVER_MODE,
  MASTER_KEY,
  SCREENSHOT_DIR,
} from "./lib/shared.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT ?? 3000);
const USE_HTTPS = process.env.USE_HTTPS === "true";
const AUTOMATION_EXEC = process.env.AUTOMATION_EXEC === "inline" ? "inline" : "worker";
const WORKER_TIMEOUT_MS = Number(process.env.WORKER_TIMEOUT_MS ?? 120_000);
const HEALTH_SCHEDULE = "*/5 * * * *";

await resolveMasterKey();

const db = createDb(DB_PATH);

// ---------------------------------------------------------------------------
// Sessions + CSRF
// ---------------------------------------------------------------------------
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function sessionFromRequest(req: Request): SessionRow | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = new Bun.CookieMap(cookieHeader);
  const sid = cookies.get("dashboard_session");
  if (!sid) return null;
  const row = db.query<SessionRow, [string]>("SELECT * FROM dashboard_sessions WHERE id = ?").get(sid);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.run("DELETE FROM dashboard_sessions WHERE id = ?", [sid]);
    return null;
  }
  return row;
}

function createSession(): SessionRow {
  const row: SessionRow = {
    id: randomUUID(),
    agent_id: null,
    csrf_secret: randomBytes(32).toString("hex"),
    created_at: Date.now(),
    expires_at: Date.now() + SESSION_TTL_MS,
  };
  db.run(
    "INSERT INTO dashboard_sessions (id, agent_id, csrf_secret, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    [row.id, row.agent_id, row.csrf_secret, row.created_at, row.expires_at],
  );
  return row;
}

function setSessionCookie(resHeaders: Headers, session: SessionRow): void {
  const cookies = new Bun.CookieMap();
  cookies.set("dashboard_session", session.id, {
    httpOnly: true,
    secure: USE_HTTPS,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  for (const header of cookies.toSetCookieHeaders()) resHeaders.append("Set-Cookie", header);
}

function csrfOk(req: Request, session: SessionRow): boolean {
  const token = req.headers.get("X-CSRF-Token");
  if (!token) return false;
  return Bun.CSRF.verify(token, { secret: session.csrf_secret, sessionId: session.id });
}

function requireAgent(session: SessionRow): AgentRow | null {
  if (!session.agent_id) return null;
  return db.query<AgentRow, [string]>("SELECT * FROM agents WHERE id = ?").get(session.agent_id) ?? null;
}

// ---------------------------------------------------------------------------
// Live driver registry (inline mode only: sessionId -> driver kept alive)
// ---------------------------------------------------------------------------
const liveDrivers = new Map<string, AutomationDriver>();

const MOCK_FRAME = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
).toString("base64");

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function corsHeaders(req: Request): Headers {
  const headers = new Headers();
  const origin = req.headers.get("Origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
  return headers;
}

function json(data: unknown, status = 200, headers?: Headers): Response {
  const h = headers ?? new Headers();
  if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { status, headers: h });
}

function taskToJson(t: TaskRow) {
  return {
    id: t.id,
    site: hostnameOf(t.url),
    status: t.status,
    sessionId: t.session_id,
    progress: t.progress,
    progressMessage: t.progress_message,
    createdAt: t.created_at,
  };
}

function sessionToJson(s: SessionDetailRow) {
  return {
    id: s.id,
    taskId: s.task_id,
    site: hostnameOf(s.url),
    status: s.status,
    lastHealthy: s.last_healthy,
    expiresAt: s.expires_at,
    apiBase: s.api_base,
    screenshotPath: s.screenshot_path,
  };
}

// ---------------------------------------------------------------------------
// Task execution: worker (Bun.spawn + IPC) or inline fallback
// ---------------------------------------------------------------------------
interface WorkerIpcMessage {
  type: "progress" | "done" | "error";
  taskId: string;
  progress?: number;
  message?: string;
  sessionId?: string;
  error?: string;
}

function markFailed(taskId: string, message: string): void {
  db.run(
    "UPDATE tasks SET status = 'failed', progress_message = ?, updated_at = ? WHERE id = ?",
    [message, Date.now(), taskId],
  );
}

function spawnWorker(taskId: string): void {
  const worker = Bun.spawn({
    cmd: ["bun", "worker.ts", taskId],
    env: {
      ...process.env,
      // Prevent the child from re-using a stale transpiler cache when code changes.
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    },
    // Bun.spawn defaults stdout to a pipe; inherit so worker console output
    // (e.g. LOG_LEVEL=debug %j traces) lands in the server's log.
    stdout: "inherit",
    timeout: WORKER_TIMEOUT_MS,
    killSignal: "SIGTERM",
    ipc(message) {
      // The worker owns all DB writes (SQLite is the shared source of truth);
      // here we only observe IPC for diagnostics. Crash/timeout handling is
      // done in onExit (exit code != 0 while the task is still pending).
      const msg = message as WorkerIpcMessage;
      if (msg.taskId !== taskId) return;
      if (process.env.LOG_LEVEL === "debug") {
        console.log("[worker:%s] ipc %j", taskId.slice(0, 8), {
          type: msg.type,
          progress: msg.progress,
          error: msg.error,
        });
      }
    },
    onExit(_proc, exitCode) {
      if (exitCode !== 0) {
        // Worker crashed without reporting an error (or was killed by timeout).
        const row = db
          .query<{ status: string }, [string]>("SELECT status FROM tasks WHERE id = ?")
          .get(taskId);
        if (row && row.status === "pending") {
          markFailed(taskId, exitCode === null ? "Worker crashed (killed by signal)" : `Worker crashed (exit ${exitCode})`);
        }
      }
    },
  });
  if (typeof worker.unref === "function") worker.unref();
}

/** In-process execution (AUTOMATION_EXEC=inline). Keeps drivers alive for /live. */
async function processTask(taskId: string): Promise<void> {
  const task = db.query<TaskRow, [string]>("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return;
  const update = (progress: number, message: string) =>
    db.run(
      "UPDATE tasks SET progress = ?, progress_message = ?, updated_at = ? WHERE id = ?",
      [progress, message, Date.now(), taskId],
    );

  const driver = createDriver(DRIVER_MODE);
  const selectors = selectorsFor(task.url);
  try {
    update(10, "Launching browser…");
    await driver.navigate(task.url);

    update(30, "Navigating to login page…");
    await driver.waitForSelector(selectors.username, 15_000);

    update(50, "Filling credentials…");
    await driver.fillLogin(selectors, task.username, decrypt(task.password_encrypted));
    await driver.submit(selectors.submit);

    update(70, "Waiting for login to complete…");
    await driver.waitForSuccess(selectors.success, 30_000);

    update(85, "Capturing session…");
    const snapshot = await driver.capture();
    const png = await driver.screenshot();

    const sessionId = randomUUID();
    const screenshotPath = `${SCREENSHOT_DIR}/${taskId}.png`;
    await Bun.write(screenshotPath, png);

    // Downscale thumbnail via Bun.Image
    try {
      const thumb = await new Bun.Image(new Uint8Array(png))
        .resize(480, 0, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .bytes();
      await Bun.write(`${SCREENSHOT_DIR}/${taskId}-thumb.jpg`, thumb);
    } catch (err) {
      console.warn("[image] thumbnail failed:", (err as Error).message);
    }

    db.run(
      `INSERT INTO sessions (id, task_id, cookies, local_storage, session_storage, api_base, screenshot_path, last_healthy, expires_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        taskId,
        snapshot.cookies,
        snapshot.local_storage,
        snapshot.session_storage,
        new URL(task.url).origin + "/cloud/api",
        screenshotPath,
        Date.now(),
        Date.now() + 3_600_000,
        "active",
        Date.now(),
      ],
    );
    logSession(db, sessionId, "navigate", task.url);
    logSession(db, sessionId, "login", "success");

    db.run(
      "UPDATE tasks SET status = 'done', session_id = ?, progress = 100, progress_message = 'Done', updated_at = ? WHERE id = ?",
      [sessionId, Date.now(), taskId],
    );

    // Keep the driver alive so /live can stream real frames + forward input.
    liveDrivers.set(sessionId, driver);
  } catch (err) {
    await driver.close().catch(() => {});
    const message = (err as Error).message || "Unknown error";
    db.run(
      "UPDATE tasks SET status = 'failed', progress_message = ?, updated_at = ? WHERE id = ?",
      [message, Date.now(), taskId],
    );
    const row = db.query<{ session_id: string | null }, [string]>("SELECT session_id FROM tasks WHERE id = ?").get(taskId);
    if (row?.session_id) logSession(db, row.session_id, "error", message);
  }
}

function enqueueTask(taskId: string): void {
  if (AUTOMATION_EXEC === "worker") {
    spawnWorker(taskId);
  } else {
    void processTask(taskId);
  }
}

// ---------------------------------------------------------------------------
// WebSocket live control
// ---------------------------------------------------------------------------
interface LiveWsData {
  sessionId: string;
  interval: ReturnType<typeof setInterval> | null;
}

async function streamFrame(ws: ServerWebSocket<LiveWsData>): Promise<void> {
  const driver = liveDrivers.get(ws.data.sessionId);
  if (driver && driver.kind === "webview") {
    try {
      const bytes = await driver.screenshot();
      ws.send(JSON.stringify({ type: "frame", format: "jpeg", data: Buffer.from(bytes).toString("base64") }));
      return;
    } catch {
      // fall through to mock frame
    }
  }
  ws.send(JSON.stringify({ type: "frame", format: "png", data: MOCK_FRAME }));
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = Bun.serve<LiveWsData>({
  port: PORT,
  // tls: USE_HTTPS ? { key: Bun.file("key.pem"), cert: Bun.file("cert.pem") } : undefined,
  async fetch(req, srv) {
    const url = new URL(req.url);
    const base = corsHeaders(req);

    // CORS preflight
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: base });

    // Static: frontend + screenshots
    if (req.method === "GET" && url.pathname === "/") {
      const file = Bun.file("index.html");
      const headers = base;
      headers.set("Content-Type", "text/html");
      return new Response(file, { headers });
    }
    if (req.method === "GET" && url.pathname.startsWith("/screenshots/")) {
      const file = Bun.file(`.${url.pathname}`);
      if (await file.exists()) {
        const headers = base;
        headers.set("Content-Type", "image/png");
        return new Response(file, { headers });
      }
      return json({ error: "Not found" }, 404, base);
    }

    // Routing table
    const csrfRoute = new URLPattern({ pathname: "/csrf-token" });
    const loginRoute = new URLPattern({ pathname: "/login" });
    const taskRoute = new URLPattern({ pathname: "/task" });
    const tasksRoute = new URLPattern({ pathname: "/tasks" });
    const sessionsRoute = new URLPattern({ pathname: "/sessions" });
    const sessionRoute = new URLPattern({ pathname: "/session/:id" });
    const sessionRefreshRoute = new URLPattern({ pathname: "/session/:id/refresh" });
    const sessionCloseRoute = new URLPattern({ pathname: "/session/:id/close" });
    const credentialsRoute = new URLPattern({ pathname: "/credentials" });
    const credentialRoute = new URLPattern({ pathname: "/credentials/:site" });
    const credentialLoginRoute = new URLPattern({ pathname: "/credentials/:site/login" });
    const verifyRoute = new URLPattern({ pathname: "/verify" });
    const liveRoute = new URLPattern({ pathname: "/live" });

    // CSRF token (session-creating; CSRF-exempt by definition)
    if (csrfRoute.test(url)) {
      let session = sessionFromRequest(req);
      if (!session) {
        session = createSession();
        setSessionCookie(base, session);
      }
      const token = Bun.CSRF.generate(session.csrf_secret, { sessionId: session.id });
      return json({ token }, 200, base);
    }

    // Login (CSRF-exempt)
    if (loginRoute.test(url) && req.method === "POST") {
      let session = sessionFromRequest(req) ?? createSession();
      setSessionCookie(base, session);
      const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
      const username = body?.username?.trim();
      const password = body?.password;
      if (!username || !password) return json({ error: "Username and password required" }, 400, base);

      let agent = db.query<AgentRow, [string]>("SELECT * FROM agents WHERE username = ?").get(username);
      if (!agent) {
        // Demo auto-provision: first login creates the agent.
        const hash = await Bun.password.hash(password);
        const id = randomUUID();
        db.run("INSERT INTO agents (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)", [
          id,
          username,
          hash,
          Date.now(),
        ]);
        agent = { id, username, password_hash: hash, created_at: Date.now() };
      } else if (!(await Bun.password.verify(password, agent.password_hash))) {
        return json({ error: "Invalid credentials" }, 401, base);
      }
      db.run("UPDATE dashboard_sessions SET agent_id = ? WHERE id = ?", [agent.id, session.id]);
      return json({ success: true, agentName: username }, 200, base);
    }

    // --- Health (public; next cron run via Bun.cron.parse) ---
    if (url.pathname === "/health" && req.method === "GET") {
      return json(
        {
          status: "ok",
          uptime: process.uptime(),
          exec: AUTOMATION_EXEC,
          driver: DRIVER_MODE,
          nextHealthCheck: Bun.cron.parse(HEALTH_SCHEDULE),
        },
        200,
        base,
      );
    }

    // --- Live control WebSocket (auth by unguessable sessionId, not cookie —
    //     browser WS clients do not send the dashboard cookie cross-origin) ---
    if (liveRoute.test(url) && req.headers.get("upgrade") === "websocket") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) return json({ error: "Missing sessionId" }, 400, base);
      const upgraded = srv.upgrade(req, { data: { sessionId, interval: null } satisfies LiveWsData });
      if (!upgraded) return new Response("WebSocket upgrade failed", { status: 500, headers: base });
      return undefined;
    }

    // All routes below require a session + valid CSRF for state-changing methods.
    const session = sessionFromRequest(req);
    if (!session) return json({ error: "Not authenticated" }, 401, base);

    const mutating = req.method === "POST" || req.method === "PUT" || req.method === "DELETE";
    if (mutating && !csrfOk(req, session)) return json({ error: "Invalid CSRF token" }, 403, base);

    const agent = requireAgent(session);
    if (!agent) return json({ error: "Login required" }, 401, base);

    // --- Tasks ---
    if (taskRoute.test(url) && req.method === "POST") {
      const body = (await req.json().catch(() => null)) as
        | { url?: string; username?: string; password?: string; location?: string; proxy?: string }
        | null;
      if (!body?.url || !body.username || !body.password) {
        return json({ error: "url, username and password required" }, 400, base);
      }
      const taskId = randomUUID();
      db.run(
        `INSERT INTO tasks (id, agent_id, url, username, password_encrypted, location, proxy, status, progress, progress_message, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          agent.id,
          body.url,
          body.username,
          encrypt(body.password),
          body.location ?? "auto",
          body.proxy ?? "none",
          "pending",
          0,
          "Queued",
          Date.now(),
          Date.now(),
        ],
      );
      enqueueTask(taskId);
      return json({ id: taskId }, 200, base);
    }

    if (tasksRoute.test(url) && req.method === "GET") {
      const rows = db
        .query<TaskRow, [string]>("SELECT * FROM tasks WHERE agent_id = ? ORDER BY created_at DESC")
        .all(agent.id);
      return json(rows.map(taskToJson), 200, base);
    }

    // --- Sessions ---
    if (sessionsRoute.test(url) && req.method === "GET") {
      const rows = db
        .query<SessionDetailRow, [string]>(
          `SELECT s.*, t.url as url FROM sessions s JOIN tasks t ON s.task_id = t.id WHERE t.agent_id = ? ORDER BY s.created_at DESC`,
        )
        .all(agent.id);
      return json(rows.map(sessionToJson), 200, base);
    }

    // --- Single session + refresh/close ---
    const refreshMatch = sessionRefreshRoute.exec(url);
    if (refreshMatch && req.method === "POST") {
      const id = refreshMatch.pathname.groups.id ?? "";
      const row = db
        .query<SessionDetailRow, [string]>(
          `SELECT s.*, t.url as url FROM sessions s JOIN tasks t ON s.task_id = t.id WHERE s.id = ?`,
        )
        .get(id);
      if (!row) return json({ error: "Session not found" }, 404, base);
      db.run("UPDATE sessions SET status = 'refreshing' WHERE id = ?", [id]);
      enqueueTask(row.task_id);
      return json({ success: true }, 200, base);
    }

    const closeMatch = sessionCloseRoute.exec(url);
    if (closeMatch && req.method === "POST") {
      const id = closeMatch.pathname.groups.id ?? "";
      const row = db
        .query<SessionDetailRow, [string]>(
          `SELECT s.*, t.url as url FROM sessions s JOIN tasks t ON s.task_id = t.id WHERE s.id = ?`,
        )
        .get(id);
      if (!row) return json({ error: "Session not found" }, 404, base);
      db.run("UPDATE sessions SET status = 'closed' WHERE id = ?", [id]);
      liveDrivers.get(id)?.close().catch(() => {});
      liveDrivers.delete(id);
      return json({ success: true }, 200, base);
    }

    const sessionMatch = sessionRoute.exec(url);
    if (sessionMatch && req.method === "GET") {
      const id = sessionMatch.pathname.groups.id ?? "";
      const row = db
        .query<SessionDetailRow, [string]>(
          `SELECT s.*, t.url as url FROM sessions s JOIN tasks t ON s.task_id = t.id WHERE s.id = ?`,
        )
        .get(id);
      if (!row) return json({ error: "Session not found" }, 404, base);
      const logs = db
        .query<LogRow, [string]>(
          "SELECT timestamp, action, details FROM session_logs WHERE session_id = ? ORDER BY timestamp",
        )
        .all(id);
      return json(
        {
          ...sessionToJson(row),
          cookies: row.cookies,
          logs: logs.map((l) => `[${new Date(l.timestamp).toTimeString().slice(0, 8)}] ${l.action} → ${l.details}`),
        },
        200,
        base,
      );
    }

    // --- Credentials ---
    if (credentialsRoute.test(url)) {
      if (req.method === "GET") {
        const rows = db
          .query<CredentialRow, [string]>("SELECT * FROM credentials WHERE agent_id = ? ORDER BY site")
          .all(agent.id);
        return json(rows.map((c) => ({ id: c.id, site: c.site, username: c.username })), 200, base);
      }
      if (req.method === "POST") {
        const body = (await req.json().catch(() => null)) as { site?: string; username?: string; password?: string } | null;
        if (!body?.site || !body.username || !body.password) {
          return json({ error: "site, username and password required" }, 400, base);
        }
        const existing = db
          .query<CredentialRow, [string, string]>("SELECT * FROM credentials WHERE agent_id = ? AND site = ?")
          .get(agent.id, body.site);
        if (existing) {
          db.run(
            "UPDATE credentials SET username = ?, password_encrypted = ? WHERE agent_id = ? AND site = ?",
            [body.username, encrypt(body.password), agent.id, body.site],
          );
        } else {
          db.run(
            "INSERT INTO credentials (id, agent_id, site, username, password_encrypted, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [randomUUID(), agent.id, body.site, body.username, encrypt(body.password), Date.now()],
          );
        }
        return json({ success: true }, 200, base);
      }
    }

    // Single-click login: create a task from stored creds without the client seeing the password.
    const credLoginMatch = credentialLoginRoute.exec(url);
    if (credLoginMatch && req.method === "POST") {
      const site = credLoginMatch.pathname.groups.site ?? "";
      const existing = db
        .query<CredentialRow, [string, string]>("SELECT * FROM credentials WHERE agent_id = ? AND site = ?")
        .get(agent.id, site);
      if (!existing) return json({ error: "Credential not found" }, 404, base);
      const taskId = randomUUID();
      db.run(
        `INSERT INTO tasks (id, agent_id, url, username, password_encrypted, location, proxy, status, progress, progress_message, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          agent.id,
          `https://${site}`,
          existing.username,
          existing.password_encrypted,
          "auto",
          "none",
          "pending",
          0,
          "Queued",
          Date.now(),
          Date.now(),
        ],
      );
      enqueueTask(taskId);
      return json({ id: taskId }, 200, base);
    }

    const credMatch = credentialRoute.exec(url);
    if (credMatch) {
      const site = credMatch.pathname.groups.site ?? "";
      const existing = db
        .query<CredentialRow, [string, string]>("SELECT * FROM credentials WHERE agent_id = ? AND site = ?")
        .get(agent.id, site);
      if (!existing) return json({ error: "Credential not found" }, 404, base);
      if (req.method === "DELETE") {
        db.run("DELETE FROM credentials WHERE agent_id = ? AND site = ?", [agent.id, site]);
        return json({ success: true }, 200, base);
      }
      if (req.method === "PUT") {
        const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
        if (!body?.username && !body?.password) return json({ error: "Nothing to update" }, 400, base);
        if (body.username) {
          db.run("UPDATE credentials SET username = ? WHERE agent_id = ? AND site = ?", [body.username, agent.id, site]);
        }
        if (body.password) {
          db.run(
            "UPDATE credentials SET password_encrypted = ? WHERE agent_id = ? AND site = ?",
            [encrypt(body.password), agent.id, site],
          );
        }
        return json({ success: true }, 200, base);
      }
    }

    // --- Verify ---
    if (verifyRoute.test(url) && req.method === "GET") {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || (srv.requestIP(req)?.address ?? "unknown");
      const ua = req.headers.get("user-agent") ?? "";
      const fingerprint = Bun.hash(ua + ip + MASTER_KEY).toString(16);
      return json({ ip, location: "New York, US", userAgent: ua, fingerprint }, 200, base);
    }

    return json({ error: "Not found" }, 404, base);
  },
  websocket: {
    open(ws) {
      ws.data.interval = setInterval(() => {
        void streamFrame(ws);
      }, 1000);
      ws.send(JSON.stringify({ type: "connected", sessionId: ws.data.sessionId }));
    },
    async message(ws, message) {
      try {
        const msg = JSON.parse(String(message)) as { type: string; [k: string]: unknown };
        const driver = liveDrivers.get(ws.data.sessionId);
        if (msg.type === "click" && typeof msg.x === "number" && typeof msg.y === "number") {
          await driver?.click(msg.x, msg.y);
        } else if (msg.type === "press" && typeof msg.key === "string") {
          await driver?.press(msg.key);
        } else if (msg.type === "evaluate" && typeof msg.script === "string") {
          const result = await driver?.evaluate(msg.script);
          ws.send(JSON.stringify({ type: "result", data: result }));
        }
      } catch {
        // ignore malformed messages
      }
    },
    close(ws) {
      if (ws.data.interval) clearInterval(ws.data.interval);
    },
  },
});

console.log(
  `[server] listening on http://localhost:${PORT} (driver=${DRIVER_MODE}, exec=${AUTOMATION_EXEC}, db=${DB_PATH})`,
);

// ---------------------------------------------------------------------------
// Health checks with Bun.cron (every 5 minutes)
// ---------------------------------------------------------------------------
Bun.cron(
  HEALTH_SCHEDULE,
  () => {
    const stale = db
      .query<{ id: string }, [number]>(
        "SELECT id FROM sessions WHERE status = 'active' AND last_healthy < ?",
      )
      .all(Date.now() - 600_000);
    for (const sess of stale) {
      // In production, probe the session via a lightweight API call; here we refresh last_healthy.
      db.run("UPDATE sessions SET last_healthy = ? WHERE id = ?", [Date.now(), sess.id]);
    }
  },
  { tz: "UTC" },
);

// Keep the process alive and reap the live browser subprocesses on exit.
process.on("SIGINT", () => {
  if (typeof (Bun as unknown as { WebView?: { closeAll?: () => void } }).WebView?.closeAll === "function") {
    (Bun as unknown as { WebView: { closeAll: () => void } }).WebView.closeAll();
  }
  server.stop();
  process.exit(0);
});

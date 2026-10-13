// @see https://bun.com/docs/runtime/webview — Bun.WebView
// @see https://bun.com/docs/runtime/webview#persistent-storage — dataStore
/**
 * One Chrome process, owned by Bun.WebView, with a persistent profile.
 * Fantasy402 stays on the manager tab. 4codds is a second tab in that profile.
 */
import type { F402Score, F402Wager } from "./map.ts";
import type { DeskLogins } from "./secrets.ts";

export type LiveHooks = {
  log: (src: string, detail: string) => void;
  onWagers: (rows: F402Wager[]) => void;
  onScores: (rows: F402Score[]) => void;
  onLinks: (links: { f402: string; fourc: string }, latency: string) => void;
  onFourc: (row: { status: string; title: string }) => void;
};

const TICKER_JS = `new Promise((resolve) => {
  const jq = window.$;
  if (!jq) { resolve({ ok: false, rows: [] }); return; }
  const agentID = String(sessionStorage.getItem("customerID") || "").trim();
  jq.ajax({
    url: "/cloud/api/Manager/getBetTicker",
    type: "POST",
    data: { agentID, wagerNumber: 0, operation: "getBetTicker", RRO: 1 },
    success: (data) => resolve({ ok: true, rows: (data && data.LIST) || [] }),
    error: () => resolve({ ok: false, rows: [] })
  });
})`;

const SCORES_JS = `new Promise((resolve) => {
  const jq = window.$;
  if (!jq) { resolve({ ok: false, rows: [] }); return; }
  jq.ajax({
    url: "/cloud/api/Report/getScoresLiveDynamic",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ operation: "getScoresLiveDynamic" }),
    success: (data) => resolve({ ok: true, rows: (data && data.Scores) || [] }),
    error: () => resolve({ ok: false, rows: [] })
  });
})`;

const LOGIN_READY_JS = `new Promise((resolve) => {
  const deadline = Date.now() + 20000;
  const tick = () => {
    const btn = document.querySelector('[data-action="login"]');
    const jq = window.$;
    const bound = btn && jq && jq._data && jq._data(btn, "events") && jq._data(btn, "events").click;
    if (bound) resolve(true);
    else if (Date.now() > deadline) resolve(false);
    else setTimeout(tick, 200);
  };
  tick();
})`;

function chromeBackend(chromePath: string): Bun.WebView.Backend {
  return {
    type: "chrome",
    path: chromePath,
    argv: ["--no-sandbox", "--disable-dev-shm-usage", "--headless=new"],
  };
}

function openView(profileDir: string, chromePath: string): Bun.WebView {
  return new Bun.WebView({
    width: 1440,
    height: 900,
    headless: true,
    dataStore: { directory: profileDir },
    backend: chromeBackend(chromePath),
  });
}

async function waitForManager(view: Bun.WebView, timeoutMs = 25000): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if ((view.url || "").includes("manager")) return true;
    await Bun.sleep(300);
  }
  return (view.url || "").includes("manager");
}

async function loginFantasy(view: Bun.WebView, user: string, password: string): Promise<boolean> {
  await view.navigate("https://fantasy402.com/");
  const ready = await view.evaluate<boolean>(LOGIN_READY_JS);
  if (!ready) return false;
  await view.click('[data-field="user"]', { timeout: 15000 });
  await view.type(user);
  await view.click('[data-field="pass"]', { timeout: 15000 });
  await view.type(password);
  try {
    await view.click('[data-action="login"]', { timeout: 15000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/navigat|closed|target/i.test(message)) throw error;
  }
  return waitForManager(view);
}

async function ensureFantasySession(view: Bun.WebView, logins: DeskLogins, log: LiveHooks["log"]): Promise<boolean> {
  await view.navigate("https://fantasy402.com/manager.html?bet-ticker=active");
  await Bun.sleep(1500);
  const session = await view.evaluate<{ manager: boolean; token: boolean }>(`({
    manager: location.pathname.includes("manager"),
    token: Boolean(sessionStorage.getItem("token"))
  })`);
  if (session.manager && session.token) {
    log("f402", "session reused");
    return true;
  }
  if (!logins.f402User || !logins.f402Password) {
    log("f402", "missing fantasy402 login in Bun.secrets");
    return false;
  }
  const ok = await loginFantasy(view, logins.f402User, logins.f402Password);
  log("f402", ok ? "session open" : "login did not reach the manager");
  if (ok && !(view.url || "").includes("bet-ticker")) {
    await view.navigate("https://fantasy402.com/manager.html?bet-ticker=active");
    await Bun.sleep(1500);
  }
  return ok;
}

async function readTicker(view: Bun.WebView): Promise<F402Wager[]> {
  const payload = await view.evaluate<{ ok: boolean; rows?: F402Wager[] }>(TICKER_JS);
  return payload.ok && payload.rows ? payload.rows : [];
}

async function readScores(view: Bun.WebView): Promise<F402Score[]> {
  const payload = await view.evaluate<{ ok: boolean; rows?: F402Score[] }>(SCORES_JS);
  return payload.ok && payload.rows ? payload.rows : [];
}

type FourcProbe = { title: string; text: string; href: string; blocked: boolean; hasPass: boolean; hasEmail: boolean };

async function readFourc(view: Bun.WebView): Promise<FourcProbe> {
  return view.evaluate<FourcProbe>(`(() => {
    const title = document.title || "";
    const text = document.body ? document.body.innerText.replace(/\\s+/g, " ").slice(0, 240) : "";
    const email = document.querySelector('input[type="email"], input[name*="mail" i], input[name*="user" i]');
    const pass = document.querySelector('input[type="password"]');
    if (email) email.setAttribute("data-sports-ops", "email");
    if (pass) pass.setAttribute("data-sports-ops", "pass");
    return {
      title,
      text,
      href: location.href,
      blocked: /blocked|attention required|cloudflare/i.test(title + " " + text),
      hasPass: Boolean(pass),
      hasEmail: Boolean(email)
    };
  })()`);
}

async function probeFourc(view: Bun.WebView, logins: DeskLogins, hooks: LiveHooks): Promise<string> {
  try {
    await view.navigate("https://4codds.com/");
    await Bun.sleep(3500);
    let info = await readFourc(view);
    if (info.blocked) {
      hooks.log("4c", "cloudflare blocked this network");
      hooks.onFourc({ status: "blocked", title: info.title || "blocked" });
      return "blocked";
    }
    if (info.hasPass && logins.fourcEmail && logins.fourcPassword) {
      if (info.hasEmail) {
        await view.click('[data-sports-ops="email"]', { timeout: 8000 });
        await view.type(logins.fourcEmail);
      }
      await view.click('[data-sports-ops="pass"]', { timeout: 8000 });
      await view.type(logins.fourcPassword);
      await view.press("Enter");
      await Bun.sleep(3000);
      info = await readFourc(view);
      if (info.blocked) {
        hooks.onFourc({ status: "blocked", title: info.title || "blocked" });
        return "blocked";
      }
      if (info.hasPass) {
        hooks.log("4c", "sign-in form still open");
        hooks.onFourc({ status: "signin", title: info.title || "sign-in" });
        return "signin";
      }
      hooks.log("4c", "session open");
      hooks.onFourc({ status: "live", title: info.title || "4codds" });
      return "live";
    }
    if (info.hasPass) {
      hooks.log("4c", "sign-in form is up and no password is stored");
      hooks.onFourc({ status: "signin", title: info.title || "sign-in" });
      return "signin";
    }
    hooks.log("4c", `page ${info.title || "open"}`);
    hooks.onFourc({ status: "live", title: info.title || "4codds" });
    return "live";
  } catch (error) {
    hooks.log("4c", error instanceof Error ? error.message : "probe failed");
    hooks.onFourc({ status: "blocked", title: "probe failed" });
    return "blocked";
  }
}

export async function runLiveSession(options: {
  profileDir: string;
  chromePath: string;
  logins: DeskLogins;
  hooks: LiveHooks;
}): Promise<void> {
  const { profileDir, chromePath, logins, hooks } = options;
  const fantasy = openView(profileDir, chromePath);
  const opened = await ensureFantasySession(fantasy, logins, hooks.log);
  const fourcView = openView(profileDir, chromePath);
  const fourc = await probeFourc(fourcView, logins, hooks);
  const links = { f402: opened ? "live" : "offline", fourc };
  hooks.onLinks(links, opened ? "webview" : "SEED");
  if (!opened) return;

  const pull = async () => {
    const started = Date.now();
    const scoreRows = await readScores(fantasy);
    const tickerRows = await readTicker(fantasy);
    hooks.onScores(scoreRows);
    if (tickerRows.length) hooks.onWagers(tickerRows);
    const latency = `${Date.now() - started}ms`;
    if (scoreRows.length || tickerRows.length) {
      links.f402 = "live";
      hooks.onLinks({ ...links }, latency);
      hooks.log("f402", `${tickerRows.length} wagers · ${scoreRows.length} games`);
    }
  };
  await pull();
  setInterval(() => {
    void pull().catch((error) => hooks.log("f402", error instanceof Error ? error.message : "poll failed"));
  }, 15000);
}

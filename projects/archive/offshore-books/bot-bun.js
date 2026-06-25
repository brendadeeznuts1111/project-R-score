const DEFAULT_BALANCE_RECENT_HOURS = 168;
const JSON_TTL_MS = 5 * 60 * 1000;

let accountCache = {
  url: "",
  expiresAt: 0,
  data: []
};

const env = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  ACCOUNTS_JSON_URL: process.env.ACCOUNTS_JSON_URL || "",
  MINI_APP_URL: process.env.MINI_APP_URL || "",
  BOT_USERNAME: process.env.BOT_USERNAME || "",
  MINI_APP_DEEP_LINK_BASE: process.env.MINI_APP_DEEP_LINK_BASE || "",
  BALANCE_RECENT_HOURS: process.env.BALANCE_RECENT_HOURS || String(DEFAULT_BALANCE_RECENT_HOURS)
};

const server = Bun.serve({
  port: Number(process.env.PORT || 8788),
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json({ ok: true, service: "offshore-books-bot-bun" });
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      const update = await request.json();
      handleTelegramUpdate(update, env).catch((error) => {
        console.error(error);
      });
      return json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }
});

console.info(`Offshore Books Bun bot listening on http://localhost:${server.port}`);

async function handleTelegramUpdate(update, env) {
  const message = update.message || update.edited_message;
  if (!message?.text || !message.chat?.id) {
    return;
  }

  const parsed = parseCommand(String(message.text).trim());
  if (!parsed) {
    return;
  }

  const accounts = await loadAccounts(env);
  const response = buildCommandResponse(parsed, accounts, env);
  await telegramApi(env, "sendMessage", {
    chat_id: message.chat.id,
    text: response.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: response.reply_markup
  });
}

function parseCommand(input) {
  if (!input.startsWith("/")) {
    return null;
  }
  const trimmed = input.replace(/\s+/g, " ").trim();
  const [first, ...rest] = trimmed.split(" ");
  return { command: first.split("@")[0].slice(1).toLowerCase(), args: rest.join(" ").trim() };
}

function buildCommandResponse(parsed, accounts, env) {
  const quickMap = { parlays: "parlays", nba: "nba", nfl: "nfl", speed: "speed" };

  if (parsed.command === "start" || parsed.command === "help") {
    return {
      text: [
        "<b>Offshore Books Bot</b>",
        "",
        "Commands:",
        "/list",
        "/best nba",
        "/best parlays",
        "/parlays",
        "/nba",
        "/nfl",
        "/speed",
        "/open 1",
        "/balance"
      ].join("\n"),
      reply_markup: { inline_keyboard: [[miniAppButton(env.MINI_APP_URL, "Open Mini App")]] }
    };
  }

  if (parsed.command === "list") {
    return {
      text: formatListMessage("All books", accounts),
      reply_markup: { inline_keyboard: [[miniAppButton(env.MINI_APP_URL, "Open Mini App")]] }
    };
  }

  if (parsed.command === "best") {
    if (!parsed.args) {
      return { text: "Use /best nba or /best parlays.", reply_markup: { inline_keyboard: [] } };
    }
    return formatFilterResponse(parsed.args, filterAccounts(accounts, parsed.args), env);
  }

  if (quickMap[parsed.command]) {
    return formatFilterResponse(quickMap[parsed.command], filterAccounts(accounts, quickMap[parsed.command]), env);
  }

  if (parsed.command === "open") {
    const account = resolveAccount(accounts, parsed.args);
    if (!account) {
      return { text: "Book not found.", reply_markup: { inline_keyboard: [] } };
    }
    return {
      text: formatOpenMessage(account, env),
      reply_markup: {
        inline_keyboard: [[
          urlButton("Open Login", account.loginUrl),
          urlButton("Open Mini App", miniAppDeepLink(env, account))
        ]]
      }
    };
  }

  if (parsed.command === "balance") {
    const results = recentBalanceAccounts(accounts, env);
    return {
      text: results.length ? formatBalanceMessage(results) : "No recent balance snapshots found.",
      reply_markup: { inline_keyboard: [[miniAppButton(env.MINI_APP_URL, "Open Mini App")]] }
    };
  }

  return { text: "Unknown command. Use /help.", reply_markup: { inline_keyboard: [] } };
}

function filterAccounts(accounts, query) {
  const normalized = normalizeQuery(query);
  return accounts.filter((account) => {
    const haystack = [account.name, account.bestFor, account.tips, account.limits, account.tags.join(" "), account.pmHint].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

function resolveAccount(accounts, query) {
  const normalized = normalizeQuery(query);
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) {
    return accounts.find((account) => account.id === numeric) || null;
  }
  return accounts.find((account) => normalizeQuery(account.name).includes(normalized)) || null;
}

function recentBalanceAccounts(accounts, env) {
  const hours = Number(env.BALANCE_RECENT_HOURS || DEFAULT_BALANCE_RECENT_HOURS);
  const minTimestamp = Date.now() - hours * 60 * 60 * 1000;
  return accounts.filter((account) => {
    const updatedAt = Date.parse(account.balanceSnapshot?.updatedAt || "");
    return Number.isFinite(updatedAt) && updatedAt >= minTimestamp;
  });
}

function formatFilterResponse(query, results, env) {
  if (!results.length) {
    return {
      text: `No books matched <b>${escapeHtml(query)}</b>.`,
      reply_markup: { inline_keyboard: [[miniAppButton(withStartParam(env.MINI_APP_URL, query), "Open Mini App")]] }
    };
  }
  return {
    text: formatListMessage(`Best matches for ${query}`, results),
    reply_markup: { inline_keyboard: [[miniAppButton(withStartParam(env.MINI_APP_URL, query), "Open Mini App")]] }
  };
}

function formatListMessage(title, accounts) {
  const lines = [`<b>${escapeHtml(title)}</b>`, ""];
  for (const account of accounts) {
    lines.push(`<b>${account.id}. ${escapeHtml(account.name)}</b>`, escapeHtml(account.bestFor), `Tags: ${escapeHtml(account.tags.join(", "))}`, "");
  }
  return lines.join("\n").trim();
}

function formatOpenMessage(account, env) {
  return [
    `<b>${escapeHtml(account.name)}</b>`,
    escapeHtml(account.bestFor),
    "",
    `Login: ${escapeHtml(account.loginUrl)}`,
    `Mini App: ${escapeHtml(miniAppDeepLink(env, account))}`,
    `pmHint: <code>${escapeHtml(account.pmHint || "n/a")}</code>`
  ].join("\n");
}

function formatBalanceMessage(accounts) {
  const lines = ["<b>Recent balance snapshots</b>", ""];
  for (const account of accounts) {
    const snap = account.balanceSnapshot || {};
    const amount = snap.amount === "" ? "n/a" : `${snap.currency || "USD"} ${Number(snap.amount).toLocaleString()}`;
    lines.push(`<b>${escapeHtml(account.name)}</b>`, `${escapeHtml(amount)} • ${escapeHtml(new Date(snap.updatedAt).toLocaleString())}`, "");
  }
  return lines.join("\n").trim();
}

async function loadAccounts(env) {
  const url = env.ACCOUNTS_JSON_URL;
  if (!url) {
    throw new Error("Missing ACCOUNTS_JSON_URL");
  }
  if (accountCache.url === url && accountCache.expiresAt > Date.now()) {
    return accountCache.data;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load accounts JSON: ${response.status}`);
  }
  const data = validateAccounts(await response.json());
  accountCache = { url, expiresAt: Date.now() + JSON_TTL_MS, data };
  return data;
}

function validateAccounts(payload) {
  if (!Array.isArray(payload)) {
    throw new Error("Accounts JSON must be an array");
  }
  return payload.map((raw, index) => ({
    id: Number(raw.id ?? index + 1),
    name: String(raw.name ?? "Unnamed Book"),
    url: String(raw.url ?? ""),
    loginUrl: String(raw.loginUrl ?? raw.url ?? ""),
    bestFor: String(raw.bestFor ?? "General use"),
    color: String(raw.color ?? "#10b981"),
    limits: String(raw.limits ?? ""),
    tips: String(raw.tips ?? ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    pmHint: String(raw.pmHint ?? ""),
    lastUsed: String(raw.lastUsed ?? ""),
    balanceSnapshot: raw.balanceSnapshot && typeof raw.balanceSnapshot === "object"
      ? {
          amount: raw.balanceSnapshot.amount === "" || raw.balanceSnapshot.amount == null ? "" : Number(raw.balanceSnapshot.amount),
          currency: String(raw.balanceSnapshot.currency ?? "USD"),
          updatedAt: String(raw.balanceSnapshot.updatedAt ?? ""),
          note: String(raw.balanceSnapshot.note ?? "")
        }
      : { amount: "", currency: "USD", updatedAt: "", note: "" }
  }));
}

async function telegramApi(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Telegram API ${method} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function urlButton(text, url) {
  return { text, url };
}

function miniAppButton(url, text) {
  return { text, web_app: { url } };
}

function withStartParam(url, value) {
  const target = new URL(url);
  target.searchParams.set("tgWebAppStartParam", value);
  return target.toString();
}

function miniAppDeepLink(env, account) {
  if (env.MINI_APP_DEEP_LINK_BASE) {
    const target = new URL(env.MINI_APP_DEEP_LINK_BASE);
    target.searchParams.set("startapp", `book-${account.id}`);
    return target.toString();
  }
  if (env.BOT_USERNAME) {
    const target = new URL(`https://t.me/${env.BOT_USERNAME}`);
    target.searchParams.set("startapp", `book-${account.id}`);
    return target.toString();
  }
  return withStartParam(env.MINI_APP_URL, `book-${account.id}`);
}

function normalizeQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init
  });
}

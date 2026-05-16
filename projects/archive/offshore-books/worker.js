const DEFAULT_BALANCE_RECENT_HOURS = 168;
const JSON_TTL_MS = 5 * 60 * 1000;

let accountCache = {
  url: "",
  expiresAt: 0,
  data: []
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json({ ok: true, service: "offshore-books-telegram-worker" });
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      const update = await request.json();
      ctx.waitUntil(handleTelegramUpdate(update, env));
      return json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }
};

async function handleTelegramUpdate(update, env) {
  const message = update.message || update.edited_message;
  if (!message?.text || !message.chat?.id) {
    return;
  }

  const text = String(message.text).trim();
  const parsed = parseCommand(text);
  if (!parsed) {
    return;
  }

  const accounts = await loadAccounts(env);
  const response = buildCommandResponse(parsed, accounts, env);
  await sendMessage(env, {
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
  const command = first.split("@")[0].slice(1).toLowerCase();
  return { command, args: rest.join(" ").trim() };
}

function buildCommandResponse(parsed, accounts, env) {
  const quickMap = {
    parlays: "parlays",
    nba: "nba",
    nfl: "nfl",
    speed: "speed"
  };

  if (parsed.command === "start" || parsed.command === "help") {
    return {
      text: [
        "<b>Offshore Books Bot</b>",
        "",
        "Use this bot to search metadata, launch the Mini App, and open the right login page fast.",
        "",
        "<b>Commands</b>",
        "/list",
        "/best nba",
        "/best parlays",
        "/parlays",
        "/nba",
        "/nfl",
        "/speed",
        "/open 1",
        "/open Rugbyrex",
        "/balance"
      ].join("\n"),
      reply_markup: {
        inline_keyboard: [[miniAppButton(env.MINI_APP_URL, "Open Mini App")]]
      }
    };
  }

  if (parsed.command === "list") {
    return {
      text: formatListMessage("All books", accounts),
      reply_markup: buildAccountKeyboard(accounts, env, { includeMiniAppHome: true })
    };
  }

  if (parsed.command === "best") {
    if (!parsed.args) {
      return {
        text: "Use <code>/best nba</code>, <code>/best parlays</code>, <code>/best sides</code>, or <code>/best high-limits</code>.",
        reply_markup: helpKeyboard(env)
      };
    }
    const results = filterAccounts(accounts, parsed.args);
    return formatFilterResponse(parsed.args, results, env);
  }

  if (quickMap[parsed.command]) {
    const query = quickMap[parsed.command];
    const results = filterAccounts(accounts, query);
    return formatFilterResponse(query, results, env);
  }

  if (parsed.command === "open") {
    if (!parsed.args) {
      return {
        text: "Use <code>/open 1</code> or <code>/open Rugbyrex</code>.",
        reply_markup: helpKeyboard(env)
      };
    }
    const account = resolveAccount(accounts, parsed.args);
    if (!account) {
      return {
        text: `No book matched <b>${escapeHtml(parsed.args)}</b>. Try <code>/list</code> first.`,
        reply_markup: helpKeyboard(env)
      };
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
    if (!results.length) {
      return {
        text: "No recent balance snapshots found. Add them manually from the desktop dashboard first.",
        reply_markup: {
          inline_keyboard: [[miniAppButton(env.MINI_APP_URL, "Open Mini App")]]
        }
      };
    }
    return {
      text: formatBalanceMessage(results, env),
      reply_markup: {
        inline_keyboard: [[miniAppButton(env.MINI_APP_URL, "Open Mini App")]]
      }
    };
  }

  return {
    text: "Unknown command. Use /help.",
    reply_markup: helpKeyboard(env)
  };
}

function filterAccounts(accounts, query) {
  const normalized = normalizeQuery(query);
  return accounts.filter((account) => {
    const haystack = [
      account.name,
      account.bestFor,
      account.tips,
      account.limits,
      account.tags.join(" "),
      account.pmHint
    ].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

function resolveAccount(accounts, query) {
  const normalized = normalizeQuery(query);
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) {
    return accounts.find((account) => account.id === numeric) || null;
  }

  const exact = accounts.find((account) => normalizeQuery(account.name) === normalized);
  if (exact) {
    return exact;
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
      text: `No books matched <b>${escapeHtml(query)}</b>. Try <code>/list</code>, <code>/best nba</code>, or open the Mini App for a broader search.`,
      reply_markup: {
        inline_keyboard: [[miniAppButton(withStartParam(env.MINI_APP_URL, query), "Open Mini App")]]
      }
    };
  }

  return {
    text: formatListMessage(`Best matches for ${query}`, results),
    reply_markup: buildAccountKeyboard(results, env, { query })
  };
}

function formatListMessage(title, accounts) {
  const lines = [`<b>${escapeHtml(title)}</b>`, ""];
  for (const account of accounts) {
    const snippet = firstLine(account.limits);
    lines.push(
      `<b>${account.id}. ${escapeHtml(account.name)}</b>`,
      `${escapeHtml(account.bestFor)}`,
      `pmHint: <code>${escapeHtml(account.pmHint || "n/a")}</code>`,
      `Limits: ${escapeHtml(snippet)}`,
      `Tags: ${escapeHtml(account.tags.join(", "))}`,
      ""
    );
  }
  return lines.join("\n").trim();
}

function formatOpenMessage(account, env) {
  return [
    `<b>${escapeHtml(account.name)}</b>`,
    `${escapeHtml(account.bestFor)}`,
    "",
    `Login: ${escapeHtml(account.loginUrl)}`,
    `Mini App: ${escapeHtml(miniAppDeepLink(env, account))}`,
    `pmHint: <code>${escapeHtml(account.pmHint || "n/a")}</code>`,
    `Limits: ${escapeHtml(firstLine(account.limits))}`,
    "",
    "Open the login page in your dedicated Betting profile, then let 1Password or Proton Pass autofill."
  ].join("\n");
}

function formatBalanceMessage(accounts) {
  const lines = ["<b>Recent balance snapshots</b>", ""];
  for (const account of accounts) {
    const snapshot = account.balanceSnapshot || {};
    const amount = snapshot.amount === "" ? "n/a" : `${snapshot.currency || "USD"} ${Number(snapshot.amount).toLocaleString()}`;
    const note = snapshot.note ? ` • ${snapshot.note}` : "";
    lines.push(
      `<b>${escapeHtml(account.name)}</b>`,
      `${escapeHtml(amount)} • ${escapeHtml(new Date(snapshot.updatedAt).toLocaleString())}${escapeHtml(note)}`,
      ""
    );
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

  const response = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!response.ok) {
    throw new Error(`Could not load accounts JSON: ${response.status}`);
  }

  const payload = await response.json();
  const data = validateAccounts(payload);
  accountCache = {
    url,
    expiresAt: Date.now() + JSON_TTL_MS,
    data
  };
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
      : {
          amount: "",
          currency: "USD",
          updatedAt: "",
          note: ""
        }
  }));
}

async function sendMessage(env, payload) {
  await telegramApi(env, "sendMessage", payload);
}

async function telegramApi(env, method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram API ${method} failed: ${response.status} ${text}`);
  }
  return response.json();
}

function urlButton(text, url) {
  return { text, url };
}

function miniAppButton(url, text) {
  return { text, web_app: { url } };
}

function helpKeyboard(env) {
  return { inline_keyboard: [[miniAppButton(env.MINI_APP_URL, "Open Mini App")]] };
}

function buildAccountKeyboard(accounts, env, options = {}) {
  const rows = [];
  for (const account of accounts.slice(0, 8)) {
    rows.push([
      urlButton(`Open ${trimLabel(account.name)}`, account.loginUrl),
      urlButton("Open Mini App", miniAppDeepLink(env, account))
    ]);
  }
  if (options.query) {
    rows.push([miniAppButton(withStartParam(env.MINI_APP_URL, options.query), "Open Filtered Mini App")]);
  } else if (options.includeMiniAppHome) {
    rows.push([miniAppButton(env.MINI_APP_URL, "Open Mini App")]);
  }
  return { inline_keyboard: rows };
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
  return String(value).trim().toLowerCase();
}

function trimLabel(name) {
  return name.replace(/\.(com|ag)$/i, "");
}

function firstLine(value) {
  return String(value || "").split("\n")[0] || "No limits recorded";
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

#!/usr/bin/env bun
/**
 * Cookie Configuration Reference Tables
 * Run: bun scripts/cookie-reference.ts
 */

const COOKIE_THEME = {
  name: "theme",
  maxAge: 60 * 60 * 24 * 365,
  expires: undefined,
  path: "/",
  domain: undefined,
  secure: "prod" as const,
  httpOnly: false,
  sameSite: "lax" as const,
  partitioned: false,
};

const COOKIE_SESSION = {
  name: "session_id",
  maxAge: 60 * 60 * 24 * 7,
  expires: undefined,
  path: "/",
  domain: undefined,
  secure: "prod" as const,
  httpOnly: true,
  sameSite: "strict" as const,
  partitioned: false,
};

const COOKIE_UI_STATE = {
  name: "ui_state",
  maxAge: 60 * 60 * 24 * 30,
  expires: undefined,
  path: "/",
  domain: undefined,
  secure: "prod" as const,
  httpOnly: false,
  sameSite: "lax" as const,
  partitioned: false,
};

const configs = [COOKIE_THEME, COOKIE_SESSION, COOKIE_UI_STATE];

// Human-readable duration with correct pluralization
const formatDuration = (seconds: number): string => {
  if (seconds >= 86400 * 365) {
    const years = Math.floor(seconds / (86400 * 365));
    return years + (years === 1 ? " year" : " years");
  }
  if (seconds >= 86400 * 30) {
    const months = Math.floor(seconds / (86400 * 30));
    return months + (months === 1 ? " month" : " months");
  }
  if (seconds >= 86400 * 7) {
    const weeks = Math.floor(seconds / (86400 * 7));
    return weeks + (weeks === 1 ? " week" : " weeks");
  }
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return days + (days === 1 ? " day" : " days");
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return hours + (hours === 1 ? " hour" : " hours");
  }
  return seconds + "s";
};

// ANSI color helpers
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[90m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const yes = `${c.green}✓${c.reset}`;
const no = `${c.dim}✗${c.reset}`;
const prod = `${c.yellow}⚡${c.reset}`;

// Header helper
const header = (title: string, color: string) => {
  const width = 63;
  const pad = Math.floor((width - title.length) / 2);
  console.log(`\n${c.bold}${color}╔${"═".repeat(width)}╗${c.reset}`);
  console.log(`${c.bold}${color}║${" ".repeat(pad)}${title}${" ".repeat(width - pad - title.length)}║${c.reset}`);
  console.log(`${c.bold}${color}╚${"═".repeat(width)}╝${c.reset}\n`);
};

// Table 1: Cookie Configurations - All Properties with Types and Defaults
header("COOKIE CONFIGURATIONS (All CookieInit Properties)", c.cyan);

// Build a row per property, columns per cookie
const properties = [
  { prop: "name", type: "string", req: true, desc: "Cookie identifier" },
  { prop: "value", type: "string", req: true, desc: "Cookie payload" },
  { prop: "maxAge", type: "number", req: false, desc: "TTL in seconds" },
  { prop: "expires", type: "Date", req: false, desc: "Absolute expiry date" },
  { prop: "path", type: "string", req: false, desc: "URL path scope" },
  { prop: "domain", type: "string", req: false, desc: "Domain scope" },
  { prop: "secure", type: "boolean", req: false, desc: "HTTPS only" },
  { prop: "httpOnly", type: "boolean", req: false, desc: "Block JS access" },
  { prop: "sameSite", type: "CookieSameSite", req: false, desc: "Cross-site policy" },
  { prop: "partitioned", type: "boolean", req: false, desc: "CHIPS partition" },
];

const defaults: Record<string, string> = {
  name: `${c.red}(required)${c.reset}`,
  value: `${c.red}(required)${c.reset}`,
  maxAge: `${c.dim}0${c.reset} ${c.dim}(session)${c.reset}`,
  expires: `${c.dim}undefined${c.reset}`,
  path: `${c.green}"/"${c.reset}`,
  domain: `${c.dim}(current host)${c.reset}`,
  secure: `${c.dim}false${c.reset}`,
  httpOnly: `${c.dim}false${c.reset}`,
  sameSite: `${c.yellow}"lax"${c.reset}`,
  partitioned: `${c.dim}false${c.reset}`,
};

// Runtime values for value field
const runtimeValues: Record<string, string> = {
  theme: `${c.cyan}"dark"|"light"${c.reset}`,
  session_id: `${c.cyan}"sess_..."${c.reset}`,
  ui_state: `${c.cyan}JSON.stringify()${c.reset}`,
};

const formatValue = (cfg: typeof COOKIE_THEME, prop: string): string => {
  const val = cfg[prop as keyof typeof cfg];

  // Show runtime value for 'value' property
  if (prop === "value") return runtimeValues[cfg.name] || `${c.dim}(runtime)${c.reset}`;

  if (val === undefined) return `${c.dim}(inherit)${c.reset}`;
  if (typeof val === "boolean") return val ? `${c.green}true${c.reset}` : `${c.dim}false${c.reset}`;
  if (typeof val === "number") return val.toLocaleString();
  if (prop === "sameSite" && val === "strict") return `${c.green}${val}${c.reset}`;
  if (prop === "secure" && val === "prod") return `${c.yellow}!dev${c.reset}`;
  return String(val);
};

const table1 = properties.map((p) => ({
  Property: `${c.bold}${p.prop}${c.reset}`,
  Type: `${c.blue}${p.type}${c.reset}`,
  Req: p.req ? yes : no,
  Default: defaults[p.prop],
  Description: `${c.dim}${p.desc}${c.reset}`,
  [COOKIE_THEME.name]: formatValue(COOKIE_THEME, p.prop),
  [COOKIE_SESSION.name]: formatValue(COOKIE_SESSION, p.prop),
  [COOKIE_UI_STATE.name]: formatValue(COOKIE_UI_STATE, p.prop),
}));

console.log(Bun.inspect.table(table1, { colors: true }));
console.log(`\n${c.dim}Legend: ${yes} required  ${no} optional  ${c.yellow}!dev${c.reset}${c.dim} = true in production${c.reset}\n`);

// Table 2: Security & Access Matrix
header("SECURITY & ACCESS MATRIX", c.magenta);

const table2 = configs.map((cfg) => ({
  Cookie: `${c.bold}${cfg.name}${c.reset}`,
  TTL: formatDuration(cfg.maxAge),
  "JS Access": cfg.httpOnly ? `${c.red}✗ blocked${c.reset}` : `${c.green}✓ allowed${c.reset}`,
  "Cross-Site":
    cfg.sameSite === "strict"
      ? `${c.red}✗ never${c.reset}`
      : cfg.sameSite === "lax"
        ? `${c.yellow}⚠ top-nav${c.reset}`
        : `${c.green}✓ always${c.reset}`,
  "CSRF Safe":
    cfg.sameSite === "strict"
      ? `${c.green}████${c.reset}`
      : cfg.sameSite === "lax"
        ? `${c.yellow}███░${c.reset}`
        : `${c.red}░░░░${c.reset}`,
  Purpose:
    cfg.name === "theme"
      ? "UI preference"
      : cfg.name === "session_id"
        ? "Auth/tracking"
        : "State persist",
}));

console.log(Bun.inspect.table(table2, { colors: true }));

// Table 3: CookieInit Type Reference
header("CookieInit TYPE REFERENCE", c.blue);

const typeRef = [
  { Property: "name", Type: "string", Required: yes, Default: `${c.dim}—${c.reset}`, Description: "Cookie identifier" },
  { Property: "value", Type: "string", Required: yes, Default: `${c.dim}—${c.reset}`, Description: "Cookie value" },
  { Property: "maxAge", Type: "number", Required: no, Default: `${c.dim}session${c.reset}`, Description: "TTL in seconds" },
  { Property: "expires", Type: "Date", Required: no, Default: `${c.dim}undefined${c.reset}`, Description: "Absolute expiry (prefer maxAge)" },
  { Property: "path", Type: "string", Required: no, Default: `"/"`, Description: "URL path scope" },
  { Property: "domain", Type: "string", Required: no, Default: `${c.dim}current host${c.reset}`, Description: "Domain scope" },
  { Property: "secure", Type: "boolean", Required: no, Default: `false`, Description: "HTTPS only" },
  { Property: "httpOnly", Type: "boolean", Required: no, Default: `false`, Description: "Block document.cookie access" },
  { Property: "sameSite", Type: "CookieSameSite", Required: no, Default: `"lax"`, Description: "Cross-site policy" },
  { Property: "partitioned", Type: "boolean", Required: no, Default: `false`, Description: "CHIPS partition key" },
];

console.log(Bun.inspect.table(typeRef, { colors: true }));

// Table 4: sameSite Values Explained
header("sameSite VALUES EXPLAINED", c.yellow);

const sameSiteRef = [
  {
    Value: `${c.green}strict${c.reset}`,
    "Sent Cross-Site": `${c.red}Never${c.reset}`,
    "CSRF Protection": `${c.green}████ Full${c.reset}`,
    "Use Case": "Session cookies, auth tokens",
  },
  {
    Value: `${c.yellow}lax${c.reset}`,
    "Sent Cross-Site": `${c.yellow}Top-level nav only${c.reset}`,
    "CSRF Protection": `${c.yellow}███░ Good${c.reset}`,
    "Use Case": "User preferences, UI state",
  },
  {
    Value: `${c.red}none${c.reset}`,
    "Sent Cross-Site": `${c.green}Always${c.reset}`,
    "CSRF Protection": `${c.red}░░░░ None${c.reset}`,
    "Use Case": "3rd party embeds (requires Secure)",
  },
];

console.log(Bun.inspect.table(sameSiteRef, { colors: true }));

// Table 5: Our Cookie Configs Summary
header("NAMED CONFIG CONSTANTS", c.cyan);

const configSummary = configs.map((cfg) => ({
  Constant: `${c.bold}COOKIE_${cfg.name.toUpperCase()}${c.reset}`,
  Cookie: cfg.name,
  "Max Age (s)": cfg.maxAge.toLocaleString(),
  Duration: formatDuration(cfg.maxAge),
  httpOnly: cfg.httpOnly ? yes : no,
  sameSite: cfg.sameSite,
  "Prod Secure": yes,
}));

console.log(Bun.inspect.table(configSummary, { colors: true }));

console.log(`\n${c.dim}Usage: cookieOpts(COOKIE_THEME) extracts options without 'name' field${c.reset}\n`);

// Table 6: Cookie Deletion
header("COOKIE DELETION (CookieMap.delete)", c.red);

const deleteRef = [
  {
    Method: `${c.bold}req.cookies.delete()${c.reset}`,
    Signature: `${c.blue}delete(name: string, options?: { path?, domain? })${c.reset}`,
    Result: `Set-Cookie: name=; Max-Age=0`,
    Description: "Expires cookie immediately",
  },
];

console.log(Bun.inspect.table(deleteRef, { colors: true }));

// Delete options
const deleteOpts = [
  { Option: `${c.bold}path${c.reset}`, Type: `${c.blue}string${c.reset}`, Default: `"/"`, Required: `${c.yellow}recommended${c.reset}`, Description: "Must match path used when setting" },
  { Option: `${c.bold}domain${c.reset}`, Type: `${c.blue}string${c.reset}`, Default: `${c.dim}(current)${c.reset}`, Required: `${c.dim}optional${c.reset}`, Description: "Must match domain used when setting" },
  { Option: `${c.bold}secure${c.reset}`, Type: `${c.blue}boolean${c.reset}`, Default: `${c.dim}false${c.reset}`, Required: `${c.dim}ignored${c.reset}`, Description: "Most browsers ignore for deletion" },
];

console.log(`\n${c.bold}Delete Options:${c.reset}\n`);
console.log(Bun.inspect.table(deleteOpts, { colors: true }));

// Example deletions for our cookies
const deleteExamples = [
  {
    Cookie: `${c.bold}theme${c.reset}`,
    Code: `req.cookies.delete(COOKIE_THEME.name, { path: COOKIE_THEME.path })`,
    Header: `Set-Cookie: theme=; Max-Age=0; Path=/`,
  },
  {
    Cookie: `${c.bold}session_id${c.reset}`,
    Code: `req.cookies.delete(COOKIE_SESSION.name, { path: COOKIE_SESSION.path })`,
    Header: `Set-Cookie: session_id=; Max-Age=0; Path=/`,
  },
  {
    Cookie: `${c.bold}ui_state${c.reset}`,
    Code: `req.cookies.delete(COOKIE_UI_STATE.name, { path: COOKIE_UI_STATE.path })`,
    Header: `Set-Cookie: ui_state=; Max-Age=0; Path=/`,
  },
];

console.log(`\n${c.bold}Our Cookie Deletions:${c.reset}\n`);
console.log(Bun.inspect.table(deleteExamples, { colors: true }));

console.log(`
${c.bold}Notes:${c.reset}
${c.dim}• Max-Age=0 is the modern approach (Bun uses this)${c.reset}
${c.dim}• Legacy: Expires=Thu, 01 Jan 1970 00:00:00 GMT${c.reset}
${c.yellow}⚠ Warning: path/domain must match original cookie or deletion fails silently${c.reset}
`);

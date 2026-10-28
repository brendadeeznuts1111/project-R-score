/**
 * Automation driver contract.
 *
 * Two implementations exist:
 * - `webview` — real headless browser automation via Bun.WebView (experimental, >= 1.3.12)
 * - `mock`   — simulated steps + fake snapshots, so the whole portal runs offline
 *
 * @see https://bun.com/docs/runtime/webview
 */

/** Selectors a site needs for a scripted login. Per-site values are configured in SITE_SELECTORS. */
export interface LoginSelectors {
  /** CSS selector for the username field. */
  username: string;
  /** CSS selector for the password field. */
  password: string;
  /** CSS selector for the submit button / form. */
  submit: string;
  /** CSS selector that is present only after a successful login (dashboard marker). */
  success: string;
}

export interface SiteConfig {
  selectors: LoginSelectors;
}

/** Storage captured from a logged-in page. */
export interface SessionSnapshot {
  cookies: string;
  local_storage: string;
  session_storage: string;
}

export interface AutomationDriver {
  readonly kind: "webview" | "mock";

  /** Navigate to a URL and wait for the main frame load to complete. */
  navigate(url: string): Promise<void>;

  /** Wait until `selector` matches an attached element, or throw after `timeoutMs`. */
  waitForSelector(selector: string, timeoutMs?: number): Promise<void>;

  /** Focus + fill the login form fields. */
  fillLogin(selectors: LoginSelectors, username: string, password: string): Promise<void>;

  /** Click the submit button / submit the login form. */
  submit(selector: string): Promise<void>;

  /** Wait for the post-login marker selector. */
  waitForSuccess(selector: string, timeoutMs?: number): Promise<void>;

  /** Capture cookies + web storage from the current page. */
  capture(): Promise<SessionSnapshot>;

  /** Capture a PNG screenshot of the viewport (raw bytes). */
  screenshot(): Promise<Uint8Array>;

  /** Forward a pointer click at viewport coordinates. */
  click(x: number, y: number): Promise<void>;

  /** Forward a keyboard key press. */
  press(key: string): Promise<void>;

  /** Run an expression in the page and return the serialized result. */
  evaluate<T = unknown>(script: string): Promise<T>;

  /** Release the underlying browser/view. Idempotent. */
  close(): Promise<void>;
}

/** Default login selectors used when a site has no SITE_SELECTORS entry. */
export const DEFAULT_SELECTORS: LoginSelectors = {
  username: "input[name='username'], input[type='text'], input[type='email'], input#username",
  password: "input[name='password'], input[type='password'], input#password",
  submit: "button[type='submit'], input[type='submit'], button:has-text('Login')",
  success: "#dashboard, .dashboard, body.logged-in",
};

/**
 * Parse a SITE_SELECTORS env value of the form:
 *   "site1:input#user,input#pass,button[type=submit],#dash;site2:…"
 * Selector order per site: username,password,submit,success.
 */
export function parseSiteSelectors(raw: string | undefined): Map<string, SiteConfig> {
  const map = new Map<string, SiteConfig>();
  if (!raw) return map;
  for (const entry of raw.split(";")) {
    const [site, ...rest] = entry.split(":");
    if (!site || rest.length === 0) continue;
    const parts = rest.join(":").split(",");
    if (parts.length < 4) continue;
    map.set(site.trim(), {
      selectors: {
        username: parts[0]?.trim() ?? DEFAULT_SELECTORS.username,
        password: parts[1]?.trim() ?? DEFAULT_SELECTORS.password,
        submit: parts[2]?.trim() ?? DEFAULT_SELECTORS.submit,
        success: parts[3]?.trim() ?? DEFAULT_SELECTORS.success,
      },
    });
  }
  return map;
}

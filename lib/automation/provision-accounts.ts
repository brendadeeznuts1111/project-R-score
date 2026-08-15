// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @updated bun:sqlite · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated bun:sqlite · fixed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated bun:sqlite · fixed v0.5.6 · 2023-02-09 · https://bun.com/blog/bun-v0.5.6
// @updated bun:sqlite · changed v0.6.8 · 2023-06-09 · https://bun.com/blog/bun-v0.6.8
// @updated bun:sqlite · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated bun:sqlite · changed v0.7.1 · 2023-07-29 · https://bun.com/blog/bun-v0.7.1
// @updated bun:sqlite · fixed v0.7.3 · 2023-08-06 · https://bun.com/blog/bun-v0.7.3
// @updated bun:sqlite · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated bun:sqlite · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated bun:sqlite · fixed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated bun:sqlite · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated bun:sqlite · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated bun:sqlite · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated bun:sqlite · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated bun:sqlite · changed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated bun:sqlite · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated bun:sqlite · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated bun:sqlite · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated bun:sqlite · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated bun:sqlite · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated bun:sqlite · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated bun:sqlite · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated bun:sqlite · changed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.16 · 2024-06-23 · https://bun.com/blog/bun-v1.1.16
// @updated bun:sqlite · fixed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @updated bun:sqlite · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated bun:sqlite · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated bun:sqlite · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated bun:sqlite · changed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated bun:sqlite · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated bun:sqlite · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated bun:sqlite · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated bun:sqlite · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated bun:sqlite · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated bun:sqlite · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated bun:sqlite · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified bun:sqlite · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @verified Bun.nanoseconds · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @updated Bun.sleep · changed v0.5.6 · 2023-02-09 · https://bun.com/blog/bun-v0.5.6
// @updated Bun.sleep · changed v0.5.8 · 2023-03-18 · https://bun.com/blog/bun-v0.5.8
// @updated Bun.sleep · fixed v1.0.34 · 2024-03-22 · https://bun.com/blog/bun-v1.0.34
// @verified Bun.sleep · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-sleep
// @see https://bun.com/docs/runtime/webview — Bun.WebView
// @see https://bun.com/docs/runtime/webview#navigation — view.navigate
// @see https://bun.com/docs/runtime/webview#evaluating-javascript — view.evaluate
// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Automated account provisioning — WebView automation for creating partner
 * accounts on new platforms. Each partner gets a fresh WebView for isolation.
 *
 * Flow: load platform → for each partner: open WebView → navigate to signup →
 *   fill form fields → submit → verify → store encrypted credentials → close.
 */
import { Database } from 'bun:sqlite';
import { bytesToBase64 } from '../bytes-base64.ts';
import { encryptAesGcm } from '../dod/verifier.ts';
import { DEFAULT_OPS_DB_PATH } from '../operations/db.ts';
import { requireMintableSecret } from '../security/mintable-secret.ts';

// ── Types ──────────────────────────────────────────────────────────

export type CredentialBundle = {
  username: string;
  password: string;
  email: string;
};

export type ProvisionInput = {
  platformId: string; // brand-ok — platforms.id
  partnerIds: string[];
  credentials: CredentialBundle[];
  /** Override PROVISION_ENCRYPTION_KEY for credential encryption. */
  encryptionKey?: string;
  /** Override the DB path (default: data/operations.db). */
  dbPath?: string;
  /** Bun.WebView currently implements headless mode only. @default true */
  headless?: true;
  /** Total timeout in milliseconds per signup attempt. @default 30_000 */
  timeout?: number;
};

export type ProvisionResult = {
  partnerId: string; // brand-ok — tree_nodes.id
  username: string;
  success: boolean;
  error?: string;
  accountId?: string; // brand-ok — UUIDv7 from partner_platform_accounts.id
  durationMs: number;
};

// ── Sandbox gate ───────────────────────────────────────────────────

/** Automated WebView signup only on demo/test/sandbox platforms. */
export function isSandboxPlatform(platform: {
  url?: string | null;
  sub_category?: string | null;
}): boolean {
  if (platform.sub_category?.toLowerCase() === 'sandbox') return true;
  const url = (platform.url ?? '').toLowerCase();
  return /demo|test|sandbox/.test(url);
}

// ── Encryption ─────────────────────────────────────────────────────

function resolveKey(encryptionKey?: string): string | undefined {
  if (encryptionKey?.trim()) return encryptionKey.trim();
  // env → ~/.factorywager/minted-secrets → mint (vault inject still wins via env)
  return requireMintableSecret('PROVISION_ENCRYPTION_KEY');
}

async function encryptCredentials(bundle: CredentialBundle, keyMaterial: string): Promise<string> {
  const plain = JSON.stringify(bundle);
  const enc = await encryptAesGcm(new TextEncoder().encode(plain), keyMaterial);
  return bytesToBase64(enc instanceof Uint8Array ? enc : new Uint8Array(enc));
}

function serializeForPage(value: CredentialBundle): string {
  // JSON is valid JavaScript expression syntax. Escaping `<` and the two line
  // separators keeps the payload inert if this expression is ever embedded in HTML.
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

/** Build the page expression without interpolating credential fields as code. */
export function buildCredentialFillExpression(creds: CredentialBundle): string {
  const payload = serializeForPage(creds);
  return `(() => {
    const values = ${payload};
    const setVal = (el, val) => {
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const find = selector => document.querySelector(selector);
    const findInput = (...patterns) => {
      for (const pattern of patterns) {
        const element = find(pattern);
        if (element) return element;
      }
      for (const element of document.querySelectorAll('input')) {
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        const placeholder = (element.placeholder || '').toLowerCase();
        if (patterns.some(pattern => {
          const needle = pattern.slice(1, -1);
          return id.includes(needle) || name.includes(needle) || placeholder.includes(needle);
        })) return element;
      }
      return null;
    };
    const email = findInput('[name*="email"]', '[id*="email"]', '[type="email"]');
    const user = findInput('[name*="user"]', '[id*="user"]', '[autocomplete="username"]');
    const pass = findInput('[type="password"]', '[name*="pass"]', '[id*="pass"]');
    const confirm = find('[name*="confirm"]') || find('[id*="confirm"]') || pass;
    const terms = find('[type="checkbox"][id*="terms"]') || find('[type="checkbox"][name*="terms"]');
    if (email) setVal(email, values.email);
    if (user) setVal(user, values.username);
    if (pass) setVal(pass, values.password);
    if (confirm && confirm !== pass) setVal(confirm, values.password);
    if (terms) {
      terms.checked = true;
      terms.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const submit = find('button[type="submit"]') || find('input[type="submit"]') || find('[class*="submit"]');
    if (submit) submit.click();
    return Boolean((email || user) && pass);
  })()`;
}

async function beforeDeadline<T>(
  operation: Promise<T>,
  deadline: number,
  label: string
): Promise<T> {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) throw new Error(`WebView ${label} timed out`);
  return Promise.race([
    operation,
    Bun.sleep(remainingMs).then(() => {
      throw new Error(`WebView ${label} timed out after ${remainingMs}ms`);
    }),
  ]);
}

// ── Single Account Provision ───────────────────────────────────────

async function provisionSingle(
  db: Database,
  platform: { id: string; name: string; url: string | null; sub_category?: string | null }, // brand-ok — platforms.id
  partnerId: string, // brand-ok — tree_nodes.id
  creds: CredentialBundle | undefined,
  keyMaterial: string | undefined,
  timeout: number
): Promise<ProvisionResult> {
  const t0 = Bun.nanoseconds();

  try {
    if (!creds) throw new Error('No credentials provided');
    if (!isSandboxPlatform(platform)) {
      throw new Error(
        'Automated provisioning only allowed on sandbox/test/demo platforms (url or sub_category)'
      );
    }

    const baseUrl = platform.url?.replace(/\/+$/, '');
    if (!baseUrl) throw new Error(`Platform ${platform.name} has no URL configured`);
    if (!baseUrl.startsWith('https://')) {
      throw new Error(
        `Platform ${platform.name} URL must use HTTPS (got: ${baseUrl.slice(0, 30)})`
      );
    }
    const signupUrl = `${baseUrl}/signup`;

    if (!Number.isSafeInteger(timeout) || timeout <= 0) {
      throw new Error(`Invalid provisioning timeout: ${timeout}`);
    }
    const deadline = Date.now() + timeout;

    // Open a fresh WebView for this partner
    let view: Bun.WebView;
    try {
      view = new Bun.WebView({ width: 1280, height: 720, headless: true });
    } catch {
      throw new Error('Failed to launch WebView');
    }

    try {
      // Navigate to signup
      await beforeDeadline(view.navigate(signupUrl), deadline, 'navigation');
      await beforeDeadline(Bun.sleep(2000), deadline, 'page settle');

      // Fill form fields via evaluate
      const fillOk = await beforeDeadline(
        view.evaluate(buildCredentialFillExpression(creds)),
        deadline,
        'form submission'
      );

      if (!fillOk) throw new Error('Could not locate form fields on signup page');

      // Wait for submission result
      await beforeDeadline(Bun.sleep(3000), deadline, 'submission settle');

      // Check success indicators
      const result = await beforeDeadline(
        view.evaluate(
          `(() => {
          const ok = document.querySelector('.success-message, .alert-success, [data-testid*="success"], .account-created');
          const err = document.querySelector('.error-message, .alert-error, [data-testid*="error"], .field-error');
          if (ok) return 'ok';
          if (err) return 'error:' + (err.textContent || '').trim();
          return 'unknown:' + window.location.pathname;
        })()`
        ),
        deadline,
        'result check'
      );

      if (typeof result === 'string' && result.startsWith('error:')) {
        throw new Error(`Platform rejected signup: ${result.slice(6)}`);
      }

      // Store account with encrypted credentials
      const accountId = Bun.randomUUIDv7();
      const now = new Date().toISOString();
      let encryptedCreds: string | null = null;
      if (keyMaterial) {
        encryptedCreds = await encryptCredentials(creds, keyMaterial);
      }

      db.run(
        `INSERT INTO partner_platform_accounts
           (id, platform_id, partner_id, account_identifier, credentials_encrypted,
            status, is_test, opened_at, created_at)
         VALUES ($id, $pid, $aid, $user, $enc, 'active', 1, $now, $now)`,
        {
          $id: accountId,
          $pid: platform.id,
          $aid: partnerId,
          $user: creds.username,
          $enc: encryptedCreds,
          $now: now,
        }
      );

      return {
        partnerId,
        username: creds.username,
        success: true,
        accountId,
        durationMs: Math.round(Number(Bun.nanoseconds() - t0) / 1e6),
      };
    } finally {
      try {
        view.close();
      } catch {
        /* WebView may already be disposed after errors */
      }
    }
  } catch (e) {
    return {
      partnerId,
      username: creds?.username ?? '',
      success: false,
      error: (e as Error).message,
      durationMs: Math.round(Number(Bun.nanoseconds() - t0) / 1e6),
    };
  }
}

// ── Main Entry Point ───────────────────────────────────────────────

export async function provisionAccounts(input: ProvisionInput): Promise<ProvisionResult[]> {
  const db = new Database(input.dbPath ?? DEFAULT_OPS_DB_PATH);
  try {
    const keyMaterial = resolveKey(input.encryptionKey);
    const results: ProvisionResult[] = [];

    // Resolve platform
    const platform = db
      .query('SELECT id, name, url, sub_category FROM platforms WHERE id = $id')
      .get({ $id: input.platformId }) as {
      id: string; // brand-ok — platforms.id
      name: string;
      url: string | null;
      sub_category: string | null;
    } | null;

    if (!platform) {
      const err = `Platform not found: ${input.platformId}`;
      for (const pid of input.partnerIds) {
        results.push({ partnerId: pid, username: '', success: false, error: err, durationMs: 0 });
      }
      return results;
    }

    const baseUrl = platform.url?.replace(/\/+$/, '');
    if (!baseUrl) {
      const err = `Platform ${platform.name} has no URL configured`;
      for (const pid of input.partnerIds) {
        results.push({ partnerId: pid, username: '', success: false, error: err, durationMs: 0 });
      }
      return results;
    }

    if (!isSandboxPlatform(platform)) {
      const err =
        'Automated provisioning only allowed on sandbox/test/demo platforms (url or sub_category)';
      for (const pid of input.partnerIds) {
        results.push({ partnerId: pid, username: '', success: false, error: err, durationMs: 0 });
      }
      return results;
    }

    // Ensure is_test column exists for inserts
    const ppaCols = new Set(
      (db.query('PRAGMA table_info(partner_platform_accounts)').all() as { name: string }[]).map(
        c => c.name
      )
    );
    if (!ppaCols.has('is_test')) {
      db.run('ALTER TABLE partner_platform_accounts ADD COLUMN is_test INTEGER DEFAULT 0');
    }

    // Provision each partner independently
    for (let i = 0; i < input.partnerIds.length; i++) {
      const result = await provisionSingle(
        db,
        platform,
        input.partnerIds[i]!,
        input.credentials[i],
        keyMaterial,
        input.timeout ?? 30_000
      );
      results.push(result);
    }

    return results;
  } finally {
    db.close();
  }
}

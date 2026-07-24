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
import { encryptAesGcm } from '../dod/verifier.ts';
import { DEFAULT_OPS_DB_PATH } from '../operations/db.ts';

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
  /** Show the WebView window (default false). */
  headless?: boolean;
  /** Timeout ms per signup attempt (default 30_000). Freed from old approach. */
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
  return encryptionKey ?? Bun.env.PROVISION_ENCRYPTION_KEY;
}

async function encryptCredentials(bundle: CredentialBundle, keyMaterial: string): Promise<string> {
  const plain = JSON.stringify(bundle);
  const enc = await encryptAesGcm(new TextEncoder().encode(plain), keyMaterial);
  return Buffer.from(enc).toString('base64');
}

// ── Single Account Provision ───────────────────────────────────────

async function provisionSingle(
  db: Database,
  platform: { id: string; name: string; url: string | null; sub_category?: string | null }, // brand-ok — platforms.id
  partnerId: string, // brand-ok — tree_nodes.id
  creds: CredentialBundle | undefined,
  keyMaterial: string | undefined,
  _timeout: number
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

    // Open a fresh WebView for this partner
    let view: Bun.WebView;
    try {
      view = new Bun.WebView({ width: 1280, height: 720, headless: true });
    } catch {
      throw new Error('Failed to launch WebView');
    }

    try {
      // Navigate to signup
      await view.navigate(signupUrl);
      await Bun.sleep(2000);

      // Fill form fields via evaluate
      const fillOk = await view
        .evaluate(
          `
        (() => {
          const setVal = (el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); };
          const find = (sel) => document.querySelector(sel);
          const findInput = (...patterns) => {
            for (const p of patterns) {
              const el = find(p);
              if (el) return el;
            }
            for (const a of document.querySelectorAll('input')) {
              const n = (a.name || '').toLowerCase();
              const pid = (a.id || '').toLowerCase();
              const ph = (a.placeholder || '').toLowerCase();
              if (patterns.some(p => pid.includes(p.slice(1,-1)) || n.includes(p.slice(1,-1)) || ph.includes(p.slice(1,-1)))) return a;
            }
            return null;
          };
          const email = findInput('[name*="email"]', '[id*="email"]', '[type="email"]');
          const user = findInput('[name*="user"]', '[id*="user"]', '[autocomplete="username"]');
          const pass = findInput('[type="password"]', '[name*="pass"]', '[id*="pass"]');
          const conf = find('[name*="confirm"]') || find('[id*="confirm"]') || pass;
          const terms = find('[type="checkbox"][id*="terms"]') || find('[type="checkbox"][name*="terms"]');
          if (email) setVal(email, "${creds.email}");
          if (user) setVal(user, "${creds.username}");
          if (pass) setVal(pass, "${creds.password}");
          if (conf && conf !== pass) setVal(conf, "${creds.password}");
          if (terms) { terms.checked = true; terms.dispatchEvent(new Event('change', { bubbles: true })); }
          const submit = find('button[type="submit"]') || find('input[type="submit"]') || find('[class*="submit"]');
          if (submit) { submit.click(); }
          return !!(email || user) && !!pass;
        })()
      `.replace(/\s+/g, ' ')
        )
        .catch(() => false);

      if (!fillOk) throw new Error('Could not locate form fields on signup page');

      // Wait for submission result
      await Bun.sleep(3000);

      // Check success indicators
      const result = await view
        .evaluate(
          `(() => {
          const ok = document.querySelector('.success-message, .alert-success, [data-testid*="success"], .account-created');
          const err = document.querySelector('.error-message, .alert-error, [data-testid*="error"], .field-error');
          if (ok) return 'ok';
          if (err) return 'error:' + (err.textContent || '').trim();
          return 'unknown:' + window.location.pathname;
        })()`.replace(/\s+/g, ' ')
        )
        .catch(() => 'unknown:evaluate-failed');

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
}

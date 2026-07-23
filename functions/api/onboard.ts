/**
 * Onboarding API — init, assign tenant, telegram link nonce.
 */

import { TENANTS, getTenant, isTenantSlug } from '../../config/tenants.ts';
import { AccountR2Store } from '../../lib/accounts/account-r2-store.ts';
import { AccountService } from '../../lib/operations/account-service.ts';
import { asPortalTenantId, asPortalAccountId } from '../../lib/types/branded/portal.ts';
import { sessionFromRequest } from '../../lib/auth/session.ts';
import { R2ChannelStore, publishEvent } from '../../lib/channels/channels.ts';
import { createLinkNonce, saveLinkNonce } from '../../lib/telegram/link-nonce.ts';
import {
  jsonResponse,
  requireBucket,
  requireSessionSecret,
  readJsonBody,
  type PagesContext,
} from './_shared/pages-env.ts';

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let secret: string;
  let bucket: NonNullable<typeof env.REGISTRY_BUCKET>;
  try {
    secret = requireSessionSecret(env);
    bucket = requireBucket(env);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const session = await sessionFromRequest(request, secret);
  if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const step = url.searchParams.get('step') ?? 'init';
  const accounts = new AccountR2Store(bucket);
  const channel = new R2ChannelStore(bucket);

  if (step === 'init') {
    const existing = await accounts.getByOidc(session.sub);
    if (existing) {
      return jsonResponse({
        status: 'existing',
        account: serializeAccount(existing),
      });
    }
    return jsonResponse({
      status: 'new',
      email: session.email,
      availableTenants: TENANTS.map(t => ({
        id: t.id as string,
        name: t.name,
        icon: t.icon,
      })),
    });
  }

  if (step === 'assign') {
    if (request.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
    const body = await readJsonBody<{ tenantId?: string; role?: string }>(request); // brand-ok — wire JSON at Pages boundary
    if (!body.tenantId || !isTenantSlug(body.tenantId)) {
      return jsonResponse({ error: 'Invalid tenantId' }, 400);
    }
    const tenant = getTenant(body.tenantId)!;
    const role = body.role === 'admin' || body.role === 'operator' ? body.role : 'viewer';
    const existing = await accounts.getByOidc(session.sub);
    if (existing) {
      return jsonResponse({ status: 'existing', account: serializeAccount(existing) });
    }
    const account = await accounts.create({
      email: session.email,
      tenantId: asPortalTenantId(body.tenantId),
      role,
      oidcSubject: session.sub,
      preferences: { notifications: true, defaultPage: tenant.portalDefaultPage },
    });
    await publishEvent(channel, 'onboard', {
      event: 'account.created',
      account: serializeAccount(account),
    });
    await publishEvent(channel, 'ops-sync', {
      type: 'account_assigned',
      tenantId: body.tenantId,
      oidcSubject: session.sub,
      email: session.email,
    });
    maybeSyncOpsTree(env, session.sub, session.email, body.tenantId);
    return jsonResponse({ status: 'assigned', account: serializeAccount(account) });
  }

  if (step === 'telegram') {
    if (request.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);
    const body = await readJsonBody<{ accountId?: string; tenantId?: string }>(request); // brand-ok — wire JSON at Pages boundary
    if (!body.accountId || !body.tenantId || !isTenantSlug(body.tenantId)) {
      return jsonResponse({ error: 'Invalid accountId or tenantId' }, 400);
    }
    const account = await accounts.get(asPortalTenantId(body.tenantId), asPortalAccountId(body.accountId));
    if (!account || account.oidcSubject !== session.sub) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }
    const tenant = getTenant(body.tenantId)!;
    const nonce = createLinkNonce();
    await saveLinkNonce(bucket, {
      nonce,
      accountId: account.id,
      tenantId: account.tenantId,
    });
    const username = tenant.telegramBotUsername ?? 'bot';
    return jsonResponse({
      status: 'link_pending',
      deepLink: `https://t.me/${username}?start=link_${nonce}`,
      nonce,
    });
  }

  return jsonResponse({ error: 'Unknown step' }, 400);
}

/** Sync portal identity to ops tree when OPS_TREE_SYNC=1 on a Bun host with OPS_DB_PATH. */
function maybeSyncOpsTree(
  env: PagesContext['env'],
  oidcSubject: string,
  email: string,
  tenantId: string // brand-ok — tenant slug for ops-sync gate
): void {
  const syncFlag = (env as Record<string, string | undefined>).OPS_TREE_SYNC ?? Bun.env.OPS_TREE_SYNC;
  const dbPath = (env as Record<string, string | undefined>).OPS_DB_PATH ?? Bun.env.OPS_DB_PATH;
  if (syncFlag !== '1' || !dbPath || tenantId !== 'factory') return;
  try {
    const accounts = new AccountService(dbPath);
    accounts.syncProspectFromPortal({ oidcSubject, email });
    accounts.close();
  } catch {
    // Edge / read-only filesystem — sync requires Bun runtime with writable OPS_DB_PATH
  }
}

function serializeAccount(account: {
  id: { toString(): string };
  email: string;
  tenantId: { toString(): string };
  role: string;
  telegramId?: { toString(): string };
  createdAt: string;
  lastLogin: string;
  preferences: unknown;
}) {
  return {
    id: account.id as string,
    email: account.email,
    tenantId: account.tenantId as string,
    role: account.role,
    telegramId: account.telegramId as string | undefined,
    createdAt: account.createdAt,
    lastLogin: account.lastLogin,
    preferences: account.preferences,
  };
}

// src/clients/plive.ts

import type { paths } from '../types/plive';

type Op<T, P, M> = paths[T][P][M];

export const plive = {
  async getUsers(p: Op<'/manager-tools/usersList/','get','parameters']['query']) {
    const sp = new URLSearchParams(p as any);
    return fetch('https://plive.sportswidgets.pro/manager-tools/usersList/?'+sp, {
      headers: await buildHeaders(),
    }).then(r => r.json());
  },

  async getSummaryReport(p: { start: number; limit: number }) {
    const body = new URLSearchParams();
    body.append('start', p.start.toString());
    body.append('limit', p.limit.toString());

    return fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php?action=getSummaryReport', {
      method: 'POST',
      headers: await buildHeaders('application/x-www-form-urlencoded'),
      body: body.toString(),
    }).then(r => r.json());
  },

  async getLastBets(p: { start: number; limit: number }) {
    const body = new URLSearchParams();
    body.append('start', p.start.toString());
    body.append('limit', p.limit.toString());

    return fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php?action=getLastBets', {
      method: 'POST',
      headers: await buildHeaders('application/x-www-form-urlencoded'),
      body: body.toString(),
    }).then(r => r.json());
  },

  async getUsersReport(p: { start: number; limit: number }) {
    const body = new URLSearchParams();
    body.append('start', p.start.toString());
    body.append('limit', p.limit.toString());

    return fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php?action=getUsersReport', {
      method: 'POST',
      headers: await buildHeaders('application/x-www-form-urlencoded'),
      body: body.toString(),
    }).then(r => r.json());
  },

  async getEventsReport(p: { start: number; limit: number; sport?: string; league?: string; status?: 'upcoming' | 'live' | 'finished' }) {
    const body = new URLSearchParams();
    body.append('start', p.start.toString());
    body.append('limit', p.limit.toString());
    if (p.sport) body.append('sport', p.sport);
    if (p.league) body.append('league', p.league);
    if (p.status) body.append('status', p.status);

    return fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php?action=getEventsReport', {
      method: 'POST',
      headers: await buildHeaders('application/x-www-form-urlencoded'),
      body: body.toString(),
    }).then(r => r.json());
  }
};

/**
 * Build fresh authentication headers for plive API calls
 * TODO: Integrate with your session management system
 */
async function buildHeaders(contentType: string = 'application/json'): Promise<Record<string, string>> {
  // TODO: Replace with actual session-keeper integration
  const { cookie, sessionId } = await getFreshPliveSession();

  return {
    'accept': 'application/json, gzip, deflate, br',
    'content-type': contentType,
    'x-gs-session': sessionId,
    'cookie': cookie,
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
  };
}

/**
 * Get fresh plive session credentials
 * TODO: Implement actual session management
 */
async function getFreshPliveSession(): Promise<{ cookie: string; sessionId: string }> {
  // TODO: Replace with actual session-keeper integration
  return {
    cookie: process.env.PLIVE_COOKIE || 'your-session-cookie',
    sessionId: process.env.PLIVE_SESSION_TOKEN || 'your-session-token'
  };
}

// routes/api/command-control.ts - CCS REST endpoint handler
// Central Command Station REST API endpoint

import { file, YAML, CookieMap } from 'bun';
import { dispatchCommand } from '../../command/control';

// Load config
const config = YAML.parse(await file('bun.yaml').text());
const { ccs } = config.command;

export const handle = async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(YAML.stringify({
      status: 'ERROR',
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/yaml' }
    });
  }

  // Extract cookies
  const cookies = new CookieMap(req.headers.get('Cookie') || '');
  const gsession = cookies.get('gsession');
  const csrfToken = cookies.get('csrfToken');

  // Verify JWT
  if (!gsession) {
    return new Response(YAML.stringify({
      status: 'ERROR',
      error: 'Missing authentication cookie'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/yaml' }
    });
  }

  // Simple JWT verification
  let user: any;
  try {
    const parts = gsession.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    user = payload;
  } catch (error: any) {
    return new Response(YAML.stringify({
      status: 'ERROR',
      error: 'Invalid or expired token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/yaml' }
    });
  }

  // Verify CSRF
  const body = await req.json().catch(() => ({}));
  const bodyCsrf = body.csrf || csrfToken;

  if (!bodyCsrf || bodyCsrf.length < 32) {
    return new Response(YAML.stringify({
      status: 'ERROR',
      error: 'Invalid CSRF token'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/yaml' }
    });
  }

  // Dispatch command
  return await dispatchCommand(body, user);
};


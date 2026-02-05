// routes/api/stage-deploy.ts - Staging deployment endpoint
// Stage deployment via REST API

import { file, YAML, CookieMap } from 'bun';
import { stageDeploy } from '../../staging/manager';

// Load config
const config = YAML.parse(await file('bun.yaml').text());
const { staging } = config.command;

export const handle = async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Extract cookies for auth
  const cookies = new CookieMap(req.headers.get('Cookie') || '');
  const gsession = cookies.get('gsession');
  const csrfToken = cookies.get('csrfToken');

  // Verify JWT
  if (!gsession) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing authentication'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const parts = gsession.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
  } catch {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid or expired token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify CSRF
  const body = await req.json();
  const bodyCsrf = body.csrf || csrfToken;

  if (!bodyCsrf || bodyCsrf.length < 32) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid CSRF token'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Stage deployment
  const result = await stageDeploy(body);

  if (result.success) {
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify(result), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};


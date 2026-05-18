import { Router } from 'itty-router';
import jwt from 'jsonwebtoken';
import { Fire22CacheInterface } from './types';

// Import dashboard HTML (you may need to adjust this import based on your setup)
const dashboardHtml = `<!DOCTYPE html><html><head><title>Dashboard</title></head><body><h1>Fire22 Dashboard</h1><p>Dashboard loading...</p></body></html>`;

// --- Types for clarity ---
interface CacheEntry<T> {
  data: T;
  expires: number;
}

// Adapted Fire22Cache for Cloudflare D1
class Fire22Cache implements Fire22CacheInterface {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 30_000; // 30 seconds
  private db: any; // D1 database binding
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(d1Database: any) {
    // Constructor takes D1 database binding
    this.db = d1Database;
    // Auto-cleanup for expired cache entries
    setInterval(() => this.cleanup(), 30_000);
  }

  async get<T>(key: string, factory: () => Promise<T>, ttl = this.defaultTTL): Promise<T> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expires > now) {
      this.cacheHits++;
      return hit.data;
    }

    this.cacheMisses++;
    const data = await factory();
    this.cache.set(key, { data, expires: now + ttl });
    return data;
  }

  // Caching method specifically for D1 SQL queries
  async query<T>(sql: string, params?: any[], ttl = this.defaultTTL): Promise<T[]> {
    const cacheKey = sql + JSON.stringify(params || []);
    return this.get(
      cacheKey,
      async () => {
        // Use this.db.prepare for D1
        const { results } = await this.db
          .prepare(sql)
          .bind(...(params || []))
          .all();
        return results as T[]; // D1 returns results in `results` array
      },
      ttl
    );
  }

  // --- NEW METHOD TO EXPOSE CACHE STATS ---
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate:
        this.cacheHits + this.cacheMisses === 0
          ? '0%'
          : `${((this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100).toFixed(1)}%`,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [k, v] of this.cache.entries()) {
      if (v.expires <= now) {
        this.cache.delete(k);
      }
    }
  }
}

// Login page HTML
const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Dashboard - Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .login-container { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1); width: 100%; max-width: 400px; }
        .logo { text-align: center; margin-bottom: 2rem; }
        .logo h1 { color: #333; font-size: 2rem; margin-bottom: 0.5rem; }
        .logo p { color: #666; font-size: 0.9rem; }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500; }
        input[type="text"], input[type="password"] { width: 100%; padding: 0.75rem; border: 2px solid #e1e5e9; border-radius: 5px; font-size: 1rem; transition: border-color 0.3s; }
        input[type="text"]:focus, input[type="password"]:focus { outline: none; border-color: #667eea; }
        .login-btn { width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 5px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        .login-btn:hover { transform: translateY(-2px); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .error { background: #fee; color: #c33; padding: 0.75rem; border-radius: 5px; margin-bottom: 1rem; border-left: 4px solid #c33; }
        .success { background: #efe; color: #3c3; padding: 0.75rem; border-radius: 5px; margin-bottom: 1rem; border-left: 4px solid #3c3; }
        .loading { display: none; text-align: center; margin-top: 1rem; }
        .spinner { border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; margin-right: 0.5rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .demo-credentials { background: #f8f9fa; padding: 1rem; border-radius: 5px; margin-bottom: 1rem; font-size: 0.85rem; color: #666; }
        .demo-credentials strong { color: #333; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <h1>🔥 Fire22</h1>
            <p>Sportsbook Dashboard</p>
        </div>
        
        <div class="demo-credentials">
            <strong>Demo Credentials:</strong><br>
            Username: <code>admin</code><br>
            Password: <code>fire22demo</code>
        </div>

        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="login-btn" id="loginBtn">
                Login to Dashboard
            </button>
        </form>

        <div id="message"></div>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            Authenticating...
        </div>
    </div>

    <script>
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const loading = document.getElementById('loading');
        const message = document.getElementById('message');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            loginBtn.disabled = true;
            loading.style.display = 'block';
            message.innerHTML = '';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    localStorage.setItem('fire22_token', result.token);
                    message.innerHTML = '<div class="success">✅ Login successful! Redirecting...</div>';
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    message.innerHTML = '<div class="error">❌ ' + (result.message || 'Login failed') + '</div>';
                }
            } catch (error) {
                message.innerHTML = '<div class="error">❌ Network error: ' + error.message + '</div>';
            } finally {
                loginBtn.disabled = false;
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>`;

// Create router instance
const router = Router();

// Middleware for CORS
const corsMiddleware = (request: Request) => {
  const origin = request.headers.get('Origin') || '*';
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  return null; // Continue to next handler
};

// Middleware for authentication
const authMiddleware = async (request: Request) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, message: 'No valid authorization header' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, 'fire22-secret-key');
    (request as any).user = decoded;
    return null; // Continue to next handler
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Apply middleware
router.use(corsMiddleware);

// Static routes
router.get('/', () => new Response(loginHtml, { headers: { 'Content-Type': 'text/html' } }));
router.get('/login', () => new Response(loginHtml, { headers: { 'Content-Type': 'text/html' } }));
router.get(
  '/dashboard',
  () => new Response(dashboardHtml, { headers: { 'Content-Type': 'text/html' } })
);

// Health check endpoint
router.get('/api/health/system', async (request: Request, env: any) => {
  try {
    const cache = new Fire22Cache(env.DB);
    const stats = cache.getStats();

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now(),
        cache: stats,
        database: 'connected',
        version: '1.0.0',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Auth routes
router.post('/api/auth/login', async (request: Request, env: any) => {
  try {
    const { username, password } = await request.json();

    // Simple demo authentication
    if (username === 'admin' && password === 'fire22demo') {
      const token = jwt.sign({ username, role: 'admin' }, 'fire22-secret-key', {
        expiresIn: '24h',
      });
      return new Response(
        JSON.stringify({
          success: true,
          token,
          user: { username, role: 'admin' },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Invalid credentials',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Login failed',
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Protected routes (require authentication)
router.use('/api/admin/*', authMiddleware);
router.use('/api/manager/*', authMiddleware);

// Manager routes
router.post('/api/manager/getWeeklyFigureByAgent', async (request: Request, env: any) => {
  try {
    const { agentID = 'BLAKEPPH' } = await request.json();

    // Get weekly data from database
    const weeklyQuery = `
      SELECT
        strftime('%w', created_at) as day_num,
        SUM(amount_wagered) as handle,
        SUM(CASE WHEN settlement_status = 'win' THEN settlement_amount - amount_wagered ELSE -amount_wagered END) as win,
        SUM(to_win_amount) as volume,
        COUNT(*) as bets
      FROM wagers
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY strftime('%w', created_at)
      ORDER BY day_num
    `;

    const weeklyResult = await env.DB.prepare(weeklyQuery).all();

    // Map day numbers to day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = (weeklyResult.results || []).map(row => ({
      day: dayNames[parseInt(row.day_num)],
      handle: row.handle || 0,
      win: row.win || 0,
      volume: row.volume || 0,
      bets: row.bets || 0,
    }));

    // Fill missing days with zeros
    const allDays = dayNames.map(day => {
      const existing = weeklyData.find(d => d.day === day);
      return existing || { day, handle: 0, win: 0, volume: 0, bets: 0 };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentID: agentID,
          weeklyFigures: allDays,
          totalHandle: allDays.reduce((sum, day) => sum + day.handle, 0),
          totalWin: allDays.reduce((sum, day) => sum + day.win, 0),
          totalVolume: allDays.reduce((sum, day) => sum + day.volume, 0),
          totalBets: allDays.reduce((sum, day) => sum + day.bets, 0),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch weekly figures',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// GET version for tests
router.get('/api/manager/getWeeklyFigureByAgent', async (request: Request, env: any) => {
  try {
    const url = new URL(request.url);
    const agentID = url.searchParams.get('agentID') || 'BLAKEPPH';
    const week = url.searchParams.get('week') || '0';

    // Get weekly data from database
    const weeklyQuery = `
      SELECT
        strftime('%w', created_at) as day_num,
        SUM(amount_wagered) as handle,
        SUM(CASE WHEN settlement_status = 'win' THEN settlement_amount - amount_wagered ELSE -amount_wagered END) as win,
        SUM(to_win_amount) as volume,
        COUNT(*) as bets
      FROM wagers
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY strftime('%w', created_at)
      ORDER BY day_num
    `;

    const weeklyResult = await env.DB.prepare(weeklyQuery).all();

    // Map day numbers to day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = (weeklyResult.results || []).map(row => ({
      day: dayNames[parseInt(row.day_num)],
      handle: row.handle || 0,
      win: row.win || 0,
      volume: row.volume || 0,
      bets: row.bets || 0,
    }));

    // Fill missing days with zeros
    const allDays = dayNames.map(day => {
      const existing = weeklyData.find(d => d.day === day);
      return existing || { day, handle: 0, win: 0, volume: 0, bets: 0 };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentID: agentID,
          weeklyFigures: allDays,
          totalHandle: allDays.reduce((sum, day) => sum + day.handle, 0),
          totalWin: allDays.reduce((sum, day) => sum + day.win, 0),
          totalVolume: allDays.reduce((sum, day) => sum + day.volume, 0),
          totalBets: allDays.reduce((sum, day) => sum + day.bets, 0),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch weekly figures',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Debug routes
router.get('/api/debug/cache-stats', async (request: Request, env: any) => {
  try {
    const cache = new Fire22Cache(env.DB);
    const stats = cache.getStats();

    return new Response(
      JSON.stringify({
        success: true,
        cacheStats: stats,
        source: 'public_debug_endpoint',
        adminAccess: false,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch cache stats',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// 404 handler
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export the router handler
export default {
  async fetch(request: Request, env: any, ctx: any) {
    return router.handle(request, env, ctx);
  },
};

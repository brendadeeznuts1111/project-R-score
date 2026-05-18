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

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// STATIC ROUTES
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
router.get('/', () => new Response(loginHtml, { headers: { 'Content-Type': 'text/html' } }));
router.get('/login', () => new Response(loginHtml, { headers: { 'Content-Type': 'text/html' } }));
router.get(
  '/dashboard',
  () => new Response(dashboardHtml, { headers: { 'Content-Type': 'text/html' } })
);

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// HEALTH & SYSTEM ENDPOINTS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
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

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// AUTHENTICATION ROUTES
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
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

router.post('/api/auth/logout', async (request: Request, env: any) => {
  // In a real implementation, you might want to blacklist the token
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Logged out successfully',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
});

router.get('/api/auth/verify', async (request: Request, env: any) => {
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
    return new Response(
      JSON.stringify({
        success: true,
        user: decoded,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// MANAGER ROUTES (require authentication)
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
router.use('/api/manager/*', authMiddleware);

// Weekly figures by agent
router.post('/api/manager/getWeeklyFigureByAgent', async (request: Request, env: any) => {
  try {
    const { agentID = 'BLAKEPPH' } = await request.json();

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

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = (weeklyResult.results || []).map(row => ({
      day: dayNames[parseInt(row.day_num)],
      handle: row.handle || 0,
      win: row.win || 0,
      volume: row.volume || 0,
      bets: row.bets || 0,
    }));

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

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = (weeklyResult.results || []).map(row => ({
      day: dayNames[parseInt(row.day_num)],
      handle: row.handle || 0,
      win: row.win || 0,
      volume: row.volume || 0,
      bets: row.bets || 0,
    }));

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

// Pending wagers
router.post('/api/manager/getPending', async (request: Request, env: any) => {
  try {
    const { agentID = 'BLAKEPPH', date = new Date().toISOString().split('T')[0] } =
      await request.json();

    const pendingQuery = `
      SELECT
        w.*,
        c.username as customer_username,
        c.email as customer_email
      FROM wagers w
      LEFT JOIN customers c ON w.customer_id = c.id
      WHERE w.agent_id = ? AND w.settlement_status = 'pending'
      AND DATE(w.created_at) = ?
      ORDER BY w.created_at DESC
      LIMIT 100
    `;

    const pendingResult = await env.DB.prepare(pendingQuery).bind(agentID, date).all();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentID,
          date,
          pendingWagers: pendingResult.results || [],
          totalCount: (pendingResult.results || []).length,
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
        error: 'Failed to fetch pending wagers',
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
router.get('/api/manager/getPending', async (request: Request, env: any) => {
  try {
    const url = new URL(request.url);
    const agentID = url.searchParams.get('agentID') || 'BLAKEPPH';
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const pendingQuery = `
      SELECT
        w.*,
        c.username as customer_username,
        c.email as customer_email
      FROM wagers w
      LEFT JOIN customers c ON w.customer_id = c.id
      WHERE w.agent_id = ? AND w.settlement_status = 'pending'
      AND DATE(w.created_at) = ?
      ORDER BY w.created_at DESC
      LIMIT 100
    `;

    const pendingResult = await env.DB.prepare(pendingQuery).bind(agentID, date).all();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentID,
          date,
          pendingWagers: pendingResult.results || [],
          totalCount: (pendingResult.results || []).length,
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
        error: 'Failed to fetch pending wagers',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Agent KPI
router.get('/api/manager/getAgentKPI', async (request: Request, env: any) => {
  try {
    const url = new URL(request.url);
    const agentID = url.searchParams.get('agentID') || 'BLAKEPPH';

    const kpiQuery = `
      SELECT
        COUNT(DISTINCT customer_id) as total_customers,
        SUM(amount_wagered) as total_handle,
        SUM(CASE WHEN settlement_status = 'win' THEN settlement_amount - amount_wagered ELSE -amount_wagered END) as total_profit,
        COUNT(*) as total_wagers,
        AVG(amount_wagered) as avg_wager_size
      FROM wagers
      WHERE agent_id = ? AND created_at >= datetime('now', '-30 days')
    `;

    const kpiResult = await env.DB.prepare(kpiQuery).bind(agentID).all();
    const kpi = kpiResult.results?.[0] || {};

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentID,
          kpi: {
            totalCustomers: kpi.total_customers || 0,
            totalHandle: kpi.total_handle || 0,
            totalProfit: kpi.total_profit || 0,
            totalWagers: kpi.total_wagers || 0,
            avgWagerSize: kpi.avg_wager_size || 0,
          },
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
        error: 'Failed to fetch agent KPI',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Customers by agent
router.get('/api/manager/getCustomersByAgent', async (request: Request, env: any) => {
  try {
    const url = new URL(request.url);
    const agentID = url.searchParams.get('agentID') || 'BLAKEPPH';

    const customersQuery = `
      SELECT
        c.*,
        COUNT(w.id) as total_wagers,
        SUM(w.amount_wagered) as total_handle
      FROM customers c
      LEFT JOIN wagers w ON c.id = w.customer_id
      WHERE c.agent_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 100
    `;

    const customersResult = await env.DB.prepare(customersQuery).bind(agentID).all();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentID,
          customers: customersResult.results || [],
          totalCount: (customersResult.results || []).length,
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
        error: 'Failed to fetch customers',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Wagers by agent
router.get('/api/manager/getWagersByAgent', async (request: Request, env: any) => {
  try {
    const url = new URL(request.url);
    const agentID = url.searchParams.get('agentID') || 'BLAKEPPH';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const wagersQuery = `
      SELECT
        w.*,
        c.username as customer_username,
        c.email as customer_email
      FROM wagers w
      LEFT JOIN customers c ON w.customer_id = c.id
      WHERE w.agent_id = ?
      ORDER BY w.created_at DESC
      LIMIT ?
    `;

    const wagersResult = await env.DB.prepare(wagersQuery).bind(agentID, limit).all();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          agentID,
          wagers: wagersResult.results || [],
          totalCount: (wagersResult.results || []).length,
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
        error: 'Failed to fetch wagers',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// ADMIN ROUTES (require authentication)
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
router.use('/api/admin/*', authMiddleware);

// Settle wager
router.post('/api/admin/settle-wager', async (request: Request, env: any) => {
  try {
    const { wagerId, settlementStatus, settlementAmount } = await request.json();

    const updateQuery = `
      UPDATE wagers 
      SET settlement_status = ?, settlement_amount = ?, settled_at = datetime('now')
      WHERE id = ?
    `;

    await env.DB.prepare(updateQuery).bind(settlementStatus, settlementAmount, wagerId).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wager settled successfully',
        data: { wagerId, settlementStatus, settlementAmount },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to settle wager',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Bulk settle
router.post('/api/admin/bulk-settle', async (request: Request, env: any) => {
  try {
    const { wagerIds, settlementStatus, settlementAmount } = await request.json();

    const updateQuery = `
      UPDATE wagers 
      SET settlement_status = ?, settlement_amount = ?, settled_at = datetime('now')
      WHERE id IN (${wagerIds.map(() => '?').join(',')})
    `;

    await env.DB.prepare(updateQuery)
      .bind(settlementStatus, settlementAmount, ...wagerIds)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: `${wagerIds.length} wagers settled successfully`,
        data: { settledCount: wagerIds.length, settlementStatus, settlementAmount },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to bulk settle wagers',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// Pending settlements
router.get('/api/admin/pending-settlements', async (request: Request, env: any) => {
  try {
    const url = new URL(request.url);
    const agentID = url.searchParams.get('agentID') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = `
      SELECT
        w.*,
        c.username as customer_username,
        c.email as customer_email
      FROM wagers w
      LEFT JOIN customers c ON w.customer_id = c.id
      WHERE w.settlement_status = 'pending'
    `;

    const params: any[] = [];
    if (agentID) {
      query += ' AND w.agent_id = ?';
      params.push(agentID);
    }

    query += ' ORDER BY w.created_at DESC LIMIT ?';
    params.push(limit);

    const result = await env.DB.prepare(query)
      .bind(...params)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          pendingSettlements: result.results || [],
          totalCount: (result.results || []).length,
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
        error: 'Failed to fetch pending settlements',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// DEBUG & UTILITY ROUTES
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
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

// 🆕 EXAMPLE: Adding new routes is now super easy!
router.get('/api/example/new-endpoint', async (request: Request, env: any) => {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'This is a new endpoint added with just 3 lines of code!',
      timestamp: new Date().toISOString(),
      router: 'itty-router',
      benefit: 'No more repetitive if statements!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
});

// Admin cache stats (protected)
router.get('/api/admin/debug/cache-stats', authMiddleware, async (request: Request, env: any) => {
  try {
    const cache = new Fire22Cache(env.DB);
    const stats = cache.getStats();

    return new Response(
      JSON.stringify({
        success: true,
        cacheStats: stats,
        source: 'admin_debug_endpoint',
        adminAccess: true,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch admin cache stats',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
// 404 HANDLER
// !==!==!==!==!==!==!==!==!==!==!==!==!==!===
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export the router handler
export default {
  async fetch(request: Request, env: any, ctx: any) {
    return router.handle(request, env, ctx);
  },
};

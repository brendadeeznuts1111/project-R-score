/**
 * Crystal Clear Architecture Integrated Dashboard Worker
 * Connects to backend services for real-time data and VIP management
 */

import {
  getApiClient,
  fetchVIPData,
  fetchEmployeeData,
  fetchSportsData,
  getSystemHealth,
} from './api-integration';

interface EmployeeData {
  id?: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  location?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  tier?: number;
}

interface VIPClient {
  id: string;
  name: string;
  tier: string;
  commissionRate: number;
  totalDeposits: number;
  lastActivity: string;
  riskScore: number;
}

export interface Env {
  EMPLOYEE_DATA: KVNamespace;
  PERSONAL_SITES: KVNamespace;
  CRYSTAL_CLEAR_API_URL?: string;
  CRYSTAL_CLEAR_API_KEY?: string;
  FANTASY402_BASE_URL?: string;
  FANTASY402_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return this.handleApiRequest(request, env, url);
    }

    // Extract subdomain
    const subdomain = hostname
      .replace('fire22.workers.dev', '')
      .replace('sportsfire.co', '')
      .replace('dashboard.', '')
      .replace('test-dashboard.', '');

    // Handle root domain
    if (subdomain === '' || subdomain === 'fire22') {
      return this.handleRootDomain(request, env);
    }

    // Handle employee subdomains
    return this.handleEmployeeSubdomain(request, env, subdomain, url.pathname);
  },

  async handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
    try {
      const apiClient = getApiClient(env);

      switch (url.pathname) {
        case '/api/health':
          const health = await getSystemHealth(env);
          return new Response(JSON.stringify(health), {
            headers: { 'Content-Type': 'application/json' },
          });

        case '/api/vip/clients':
          const vipClients = await fetchVIPData(env);
          return new Response(JSON.stringify(vipClients), {
            headers: { 'Content-Type': 'application/json' },
          });

        case '/api/employees':
          const employees = await fetchEmployeeData(env);
          return new Response(JSON.stringify(employees), {
            headers: { 'Content-Type': 'application/json' },
          });

        case '/api/fantasy402/sports':
          const sportsData = await fetchSportsData(env);
          return new Response(JSON.stringify(sportsData), {
            headers: { 'Content-Type': 'application/json' },
          });

        default:
          return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'API request failed', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  async handleRootDomain(request: Request, env: Env): Promise<Response> {
    try {
      // Fetch real-time data from Crystal Clear Architecture
      const [vipClients, employees, sportsData, healthStatus] = await Promise.allSettled([
        fetchVIPData(env),
        fetchEmployeeData(env),
        fetchSportsData(env),
        getSystemHealth(env),
      ]);

      const vipCount = vipClients.status === 'fulfilled' ? vipClients.value.length : 0;
      const employeeCount = employees.status === 'fulfilled' ? employees.value.length : 0;
      const sportsCount = sportsData.status === 'fulfilled' ? sportsData.value.length : 0;

      // Determine system health based on API availability
      let systemHealth = 'unknown';
      let systemMessage = 'Checking system status...';

      // Check if all major APIs are failing (backend offline)
      const allApisFailed =
        vipClients.status === 'rejected' &&
        employees.status === 'rejected' &&
        sportsData.status === 'rejected';

      if (allApisFailed) {
        systemHealth = 'backend-offline';
        systemMessage = 'Backend services not available - using cached data';
      } else if (healthStatus.status === 'fulfilled') {
        systemHealth = healthStatus.value.status || 'ok';
        systemMessage = healthStatus.value.message || 'System operational';
      } else if (healthStatus.status === 'rejected') {
        systemHealth = 'backend-offline';
        systemMessage = 'Backend services not available - using cached data';
      } else {
        systemHealth = 'partial';
        systemMessage = 'Partial operation - some services unavailable';
      }

      // Check if any critical services are working despite backend issues
      const hasAnyData = vipCount > 0 || employeeCount > 0 || sportsCount > 0;
      if (systemHealth === 'backend-offline' && hasAnyData) {
        systemHealth = 'partial';
        systemMessage = 'Partial operation - some services unavailable';
      }

      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fire22 - Crystal Clear Architecture Dashboard</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
          }
          .header {
            text-align: center;
            padding: 3rem 2rem;
          }
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }
          .metric-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 2rem;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
          }
          .metric-card:hover {
            transform: translateY(-5px);
          }
          .metric-number {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          .metric-label {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 1rem;
          }
          .metric-description {
            font-size: 0.9rem;
            opacity: 0.7;
          }
          .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
          }
          .status-online { background: #4CAF50; }
          .status-offline { background: #F44336; }
          .status-warning { background: #FF9800; }
          .status-partial { background: #FF9800; }
          .status-unknown { background: #9E9E9E; }
          .quick-actions {
            text-align: center;
            padding: 2rem;
            margin-top: 2rem;
          }
          .action-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            justify-content: center;
            margin-top: 1rem;
          }
          .action-button {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }
          .action-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔥 Fire22 Enterprise Dashboard</h1>
          <p>Crystal Clear Architecture Integration • Real-time Data</p>
          <div>
            <span class="status-indicator status-${systemHealth === 'ok' ? 'online' : systemHealth === 'backend-offline' ? 'warning' : systemHealth === 'partial' ? 'partial' : 'unknown'}"></span>
            System Status: ${systemHealth === 'ok' ? 'Fully Operational' : systemHealth === 'backend-offline' ? 'Backend Offline' : systemHealth === 'partial' ? 'Partial Operation' : 'Initializing...'}
            ${systemMessage ? `<br><small style="opacity: 0.8;">${systemMessage}</small>` : ''}
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="metric-card">
            <div class="metric-number">${vipCount}</div>
            <div class="metric-label">VIP Clients</div>
            <div class="metric-description">High-value customer relationships managed</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">${employeeCount}</div>
            <div class="metric-label">Team Members</div>
            <div class="metric-description">Active employees and departments</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">${sportsCount}</div>
            <div class="metric-label">Live Sports</div>
            <div class="metric-description">Sports with active betting markets</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">${systemHealth === 'ok' ? '100%' : systemHealth === 'partial' ? '75%' : '50%'}</div>
            <div class="metric-label">System Health</div>
            <div class="metric-description">${systemHealth === 'ok' ? 'All systems operational' : systemHealth === 'backend-offline' ? 'Backend services offline' : 'Partial system operation'}</div>
          </div>

          <div class="metric-card">
            <div class="metric-number">${hasAnyData ? '✅' : '⚠️'}</div>
            <div class="metric-label">Data Status</div>
            <div class="metric-description">${hasAnyData ? 'Real-time data available' : 'Using fallback data'}</div>
          </div>
        </div>

        ${
          systemHealth !== 'ok'
            ? `
        <div class="system-status-section" style="margin: 2rem auto; max-width: 1000px; background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 2rem;">
          <h3 style="text-align: center; margin-bottom: 1.5rem; color: white;">🔧 System Status Details</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">${vipClients.status === 'fulfilled' ? '✅' : '❌'}</div>
              <div style="font-weight: 600; margin-bottom: 0.25rem;">VIP API</div>
              <div style="font-size: 0.8rem; opacity: 0.8;">${vipClients.status === 'fulfilled' ? 'Connected' : 'Backend unavailable'}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">${employees.status === 'fulfilled' ? '✅' : '❌'}</div>
              <div style="font-weight: 600; margin-bottom: 0.25rem;">Employee API</div>
              <div style="font-size: 0.8rem; opacity: 0.8;">${employees.status === 'fulfilled' ? 'Connected' : 'Backend unavailable'}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">${sportsData.status === 'fulfilled' ? '✅' : '❌'}</div>
              <div style="font-weight: 600; margin-bottom: 0.25rem;">Fantasy402 API</div>
              <div style="font-size: 0.8rem; opacity: 0.8;">${sportsData.status === 'fulfilled' ? 'Connected' : 'Backend unavailable'}</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">${healthStatus.status === 'fulfilled' ? '✅' : '❌'}</div>
              <div style="font-weight: 600; margin-bottom: 0.25rem;">Health Check</div>
              <div style="font-size: 0.8rem; opacity: 0.8;">${healthStatus.status === 'fulfilled' ? 'System healthy' : 'Service unavailable'}</div>
            </div>
          </div>
          ${
            systemHealth === 'backend-offline'
              ? `
          <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(255, 165, 0, 0.2); border-radius: 8px; text-align: center;">
            <strong>💡 Next Steps:</strong> Deploy Crystal Clear Architecture backend services to enable full functionality
          </div>
          `
              : ''
          }
        </div>
        `
            : ''
        }

        <div class="quick-actions">
          <h2>Quick Access</h2>
          <div class="action-buttons">
            <a href="/vip" class="action-button">👑 VIP Management</a>
            <a href="/employees" class="action-button">👥 Employee Portal</a>
            <a href="/sports" class="action-button">⚽ Live Sports</a>
            <a href="/analytics" class="action-button">📊 Analytics</a>
            <a href="/api/docs" class="action-button">🔌 API Documentation</a>
            <a href="/admin" class="action-button">⚙️ System Admin</a>
          </div>
        </div>

        <div style="text-align: center; padding: 2rem; opacity: 0.7;">
          <p>Last Updated: ${new Date().toLocaleString()} • Crystal Clear Architecture v2.0</p>
        </div>
      </body>
      </html>`;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=60', // Shorter cache for real-time data
        },
      });
    } catch (error) {
      // Fallback to basic dashboard if API calls fail
      return this.handleRootDomainFallback();
    }
  },

  handleRootDomainFallback(): Response {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fire22 - Enterprise Dashboard</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          text-align: center;
          color: white;
          padding: 2rem;
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        p {
          font-size: 1.2rem;
          opacity: 0.9;
        }
        .status {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔥 Fire22 Dashboard</h1>
        <p>Enterprise-grade sportsbook management platform</p>
        <div class="status">
          <h3>🔄 System Status: Initializing</h3>
          <p>Connecting to Crystal Clear Architecture...<br>
          Last Updated: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },

  async handleEmployeeSubdomain(
    request: Request,
    env: Env,
    subdomain: string,
    pathname: string
  ): Promise<Response> {
    try {
      let employee: EmployeeData;

      // Try to get employee data from Crystal Clear Architecture API first
      try {
        const employees = await fetchEmployeeData(env);
        const apiEmployee = employees.find(
          emp =>
            emp.name?.toLowerCase().replace(/\s+/g, '') === subdomain ||
            emp.email?.split('@')[0].toLowerCase() === subdomain ||
            emp.id === subdomain
        );

        if (apiEmployee) {
          employee = apiEmployee;
        } else {
          throw new Error('Employee not found in API');
        }
      } catch (apiError) {
        // Fallback to test data or KV storage
        if (subdomain === 'vinny2times') {
          employee = {
            id: 'vinny2times',
            name: 'Vinny Two Times',
            title: 'Head of VIP Management',
            department: 'VIP Services',
            email: 'vinny2times@dashboard.sportsfire.co',
            phone: '+1 (555) 123-4567',
            location: 'Las Vegas, NV',
            bio: 'Expert in VIP client management and high-value customer relations. Leading our high-value customer acquisition and retention strategies.',
            skills: [
              'VIP Management',
              'Customer Relations',
              'Sports Analytics',
              'Risk Assessment',
              'Revenue Optimization',
            ],
            tier: 5,
          };
        } else {
          // Try KV storage as final fallback
          const employeeData = await env.EMPLOYEE_DATA.get(`employee:${subdomain}`);
          if (employeeData) {
            employee = JSON.parse(employeeData);
          } else {
            return this.create404Response(subdomain);
          }
        }
      }

      return this.generateEmployeePage(employee, pathname);
    } catch (error) {
      console.error('Error handling employee subdomain:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },

  generateEmployeePage(employee: EmployeeData, pathname: string): Response {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${employee.name} - ${employee.title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          color: #333;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        .profile-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .contact-item {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }
        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .skill {
          background: #667eea;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${employee.name}</h1>
        <p>${employee.title} • ${employee.department}</p>
      </div>

      <div class="container">
        <div class="profile-card">
          <h2>About</h2>
          <p>${employee.bio || 'Professional at Fire22 specializing in enterprise sportsbook management.'}</p>

          <h3>Contact Information</h3>
          <div class="contact-grid">
            <div class="contact-item">
              <strong>📧 Email</strong><br>
              <a href="mailto:${employee.email}">${employee.email}</a>
            </div>
            <div class="contact-item">
              <strong>📱 Phone</strong><br>
              <a href="tel:${employee.phone}">${employee.phone}</a>
            </div>
            ${
              employee.location
                ? `
            <div class="contact-item">
              <strong>📍 Location</strong><br>
              ${employee.location}
            </div>
            `
                : ''
            }
          </div>

          ${
            employee.skills
              ? `
          <h3>Skills & Expertise</h3>
          <div class="skills">
            ${employee.skills.map(skill => `<span class="skill">${skill}</span>`).join('')}
          </div>
          `
              : ''
          }
        </div>

        <div class="profile-card">
          <h3>Quick Actions</h3>
          <p>
            <a href="/schedule">📅 Schedule Meeting</a> |
            <a href="/tools">🔧 Department Tools</a> |
            <a href="/dashboard">📊 Dashboard</a>
          </p>
        </div>
      </div>
    </body>
    </html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },

  create404Response(subdomain: string): Response {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Employee Not Found</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 4rem 2rem;
          background: #f5f5f5;
        }
        h1 { color: #333; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <h1>👤 Employee Not Found</h1>
      <p>The subdomain <strong>${subdomain}</strong> is not registered.</p>
      <p><a href="https://fire22.workers.dev">← Back to Fire22</a></p>
    </body>
    </html>`;

    return new Response(html, {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  },
};

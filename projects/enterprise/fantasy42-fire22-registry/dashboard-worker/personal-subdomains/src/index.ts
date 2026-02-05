/**
 * Fire22 Personal Subdomains Worker
 * Handles routing and rendering for *.sportsfire.co subdomains
 */

import type { Env, EmployeeData } from './types';

type ExecutionContext = any;
import { CONFIG } from './config';
import {
  Logger,
  RateLimiter,
  createErrorResponse,
  createSuccessResponse,
  generateRequestId,
  isValidSubdomain,
  CacheManager,
  HttpCache,
  Compression,
  ApiResponseFormatter,
  ApiMiddleware,
  ApiAnalytics,
  BatchProcessor,
  ApiVersioning,
} from './utils';
import { generate404Page } from './components';
import {
  generateProfilePage,
  generateToolsPage,
  generateApiPage,
  generateDashboardPage,
  generateContactPage,
  generateSchedulePage,
  generateRootDomainPage,
} from './templates';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Periodic cleanup - run on ~10% of requests to avoid excessive cleanup
    if (Math.random() < 0.1) {
      ctx.waitUntil(
        new Promise<void>(resolve => {
          setTimeout(() => {
            // Clean up rate limiter
            RateLimiter.cleanup();

            // Clean up cache if needed
            const stats = CacheManager.getStats();
            if (stats.entries > 1000) {
              Logger.info('Cache cleanup triggered', { stats });
              CacheManager.clear();
            }

            resolve();
          }, 100); // Small delay to not block request
        })
      );
    }

    try {
      // Rate limiting check
      if (
        !RateLimiter.checkLimit(
          request.headers.get('CF-Connecting-IP') || 'unknown',
          100,
          60 * 1000
        )
      ) {
        Logger.warn('Rate limit exceeded', {
          requestId,
          ip: request.headers.get('CF-Connecting-IP'),
        });
        return createErrorResponse('Rate limit exceeded. Please try again later.', 429);
      }

      const url = new URL(request.url);
      const hostname = url.hostname;

      Logger.info('Request received', {
        requestId,
        hostname,
        pathname: url.pathname,
        method: request.method,
      });

      // Extract subdomain (everything before .sportsfire.co)
      const subdomain = hostname.replace(`.${CONFIG.DOMAIN}`, '');

      // Validate subdomain format
      if (
        subdomain !== CONFIG.DOMAIN.replace('.sportsfire.co', '') &&
        !isValidSubdomain(subdomain)
      ) {
        Logger.warn('Invalid subdomain format', { requestId, subdomain });
        return createErrorResponse('Invalid subdomain format', 400);
      }

      // Handle root domain requests
      if (subdomain === 'sportsfire' || subdomain === '') {
        return this.handleRootDomain(request, env, requestId);
      }

      // Handle employee subdomain requests
      return this.handleEmployeeSubdomain(request, env, subdomain, url.pathname, requestId);
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Unhandled error in fetch', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      return createErrorResponse(CONFIG.ERRORS.INTERNAL_ERROR, 500);
    }
  },

  async handleRootDomain(request: Request, env: Env, requestId: string): Promise<Response> {
    Logger.info('Serving root domain page', { requestId });

    const html = generateRootDomainPage();

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
        'X-Request-ID': requestId,
      },
    });
  },

  async handleEmployeeSubdomain(
    request: Request,
    env: Env,
    subdomain: string,
    pathname: string,
    requestId: string
  ): Promise<Response> {
    try {
      Logger.info('Handling employee subdomain request', { requestId, subdomain, pathname });

      let employee: EmployeeData;

      // TEMPORARY: Special handling for vinny2times to test without KV
      if (subdomain === 'vinny2times') {
        employee = this.getVinnyTestData();
      } else {
        // Get employee data from KV
        const employeeKey = `employee:${subdomain}`;
        const employeeData = await env.EMPLOYEE_DATA.get(employeeKey);

        if (!employeeData) {
          Logger.warn('Employee not found', { requestId, subdomain, employeeKey });
          return this.create404Response(subdomain, requestId);
        }

        try {
          employee = JSON.parse(employeeData);
        } catch (parseError) {
          Logger.error('Failed to parse employee data', {
            requestId,
            subdomain,
            error: parseError,
          });
          return createErrorResponse('Invalid employee data format', 500);
        }
      }

      // Route to appropriate handler
      return this.routeEmployeeRequest(employee, env, pathname, subdomain, requestId);
    } catch (error) {
      Logger.error('Error handling employee subdomain', {
        requestId,
        subdomain,
        pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return createErrorResponse(CONFIG.ERRORS.INTERNAL_ERROR, 500);
    }
  },

  // Helper method to get test data for vinny2times
  getVinnyTestData(): EmployeeData {
    return {
      id: 'vinny2times',
      name: 'Vinny2times',
      title: 'Head of VIP Management',
      department: 'VIP Management',
      email: 'vinny2times@fire22.com',
      phone: '+1-555-VIP-0000',
      slack: '@vinny2times',
      telegram: '@vinny2times',
      bio: 'Expert VIP customer relationship manager with 15+ years experience in high-value client services. Specialized in premium betting operations and customer retention strategies.',
      headshotUrl: 'https://fire22.com/employees/vinny2times.jpg',
      tier: 5,
      template: 'vip-dashboard',
      features: [
        'vip-escalation',
        'high-roller-review',
        'fantasy402-integration',
        'live-betting-data',
        'customer-management',
        'performance-analytics',
        'premium-scheduling',
        'advanced-tools',
      ],
      manager: 'CEO',
      directReports: ['VIP Support Team'],
      hireDate: '2023-01-15',
      lastUpdated: new Date().toISOString(),
    };
  },

  // Route employee requests to appropriate handlers
  async routeEmployeeRequest(
    employee: EmployeeData,
    env: Env,
    pathname: string,
    subdomain: string,
    requestId: string
  ): Promise<Response> {
    // Create cache key based on employee data and path
    const cacheKey = `${employee.id}:${pathname}:${employee.lastUpdated}`;

    // Try to get cached response
    const cachedResponse = CacheManager.get(cacheKey);
    if (cachedResponse) {
      Logger.debug('Cache hit', { requestId, cacheKey });
      return cachedResponse;
    }

    Logger.debug('Cache miss', { requestId, cacheKey });

    const cacheConfig = CONFIG.CACHE;
    const securityHeaders = CONFIG.SECURITY_HEADERS;

    let response: Response;

    // Handle different routes
    switch (pathname) {
      case '/':
      case '/profile':
        response = this.renderProfilePage(
          employee,
          cacheConfig.PROFILE,
          securityHeaders,
          requestId
        );
        break;

      case '/schedule':
        response = this.renderSchedulePage(
          employee,
          cacheConfig.SCHEDULE,
          securityHeaders,
          requestId
        );
        break;

      case '/tools':
        response = this.renderToolsPage(
          employee,
          cacheConfig.TOOLS,
          securityHeaders,
          pathname,
          requestId
        );
        break;

      case '/dashboard':
        response = this.renderDashboardPage(
          employee,
          cacheConfig.DASHBOARD,
          securityHeaders,
          requestId
        );
        break;

      case '/api':
      case '/api/health':
      case '/api/status':
      case '/api/analytics':
        response = this.renderApiPage(
          employee,
          cacheConfig.API,
          securityHeaders,
          pathname,
          requestId
        );
        break;

      case '/api/monitoring':
        response = this.handleApiMonitoring(employee, requestId);
        break;

      case '/contact':
        response = this.renderContactPage(
          employee,
          cacheConfig.CONTACT,
          securityHeaders,
          requestId
        );
        break;

      case '/debug':
        response = this.renderDebugPage(subdomain, env, requestId);
        break;

      default:
        // Handle tools and API sub-paths
        if (pathname.startsWith('/tools/')) {
          response = this.renderToolsPage(
            employee,
            cacheConfig.TOOLS,
            securityHeaders,
            pathname,
            requestId
          );
        } else if (pathname.startsWith('/api/')) {
          response = this.renderApiPage(
            employee,
            cacheConfig.API,
            securityHeaders,
            pathname,
            requestId
          );
        } else {
          response = this.create404Response(subdomain, requestId);
        }
        break;
    }

    // Cache the response for future requests
    const cacheTtl = this.getCacheTtlForPath(pathname);
    if (cacheTtl > 0) {
      CacheManager.set(cacheKey, response, cacheTtl);
    }

    return response;
  },

  // Get cache TTL based on path
  getCacheTtlForPath(pathname: string): number {
    if (pathname.startsWith('/api/')) {
      return 60; // 1 minute for API responses
    } else if (pathname === '/profile' || pathname === '/') {
      return 300; // 5 minutes for profile pages
    } else if (pathname.startsWith('/tools/')) {
      return 180; // 3 minutes for tools
    } else if (pathname === '/contact') {
      return 600; // 10 minutes for contact
    } else {
      return 300; // Default 5 minutes
    }
  },

  // Render methods using new template system
  renderProfilePage(
    employee: EmployeeData,
    cacheConfig: any,
    securityHeaders: any,
    requestId: string
  ): Response {
    const html = generateProfilePage(employee);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': cacheConfig.cacheControl,
        'X-Request-ID': requestId,
        ...securityHeaders,
      },
    });
  },

  renderSchedulePage(
    employee: EmployeeData,
    cacheConfig: any,
    securityHeaders: any,
    requestId: string
  ): Response {
    if (!employee.features.includes('premium-scheduling')) {
      return createErrorResponse('Scheduling not available for this user', 403);
    }

    const html = generateSchedulePage(employee);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': cacheConfig.cacheControl,
        'X-Request-ID': requestId,
        ...securityHeaders,
      },
    });
  },

  renderToolsPage(
    employee: EmployeeData,
    cacheConfig: any,
    securityHeaders: any,
    pathname: string,
    requestId: string
  ): Response {
    const html = generateToolsPage(employee, pathname);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': cacheConfig.cacheControl,
        'X-Request-ID': requestId,
        ...securityHeaders,
      },
    });
  },

  renderContactPage(
    employee: EmployeeData,
    cacheConfig: any,
    securityHeaders: any,
    requestId: string
  ): Response {
    const html = generateContactPage(employee);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': cacheConfig.cacheControl,
        'X-Request-ID': requestId,
        ...securityHeaders,
      },
    });
  },

  renderDashboardPage(
    employee: EmployeeData,
    cacheConfig: any,
    securityHeaders: any,
    requestId: string
  ): Response {
    const html = generateDashboardPage(employee);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': cacheConfig.cacheControl,
        'X-Request-ID': requestId,
        ...securityHeaders,
      },
    });
  },

  renderApiPage(
    employee: EmployeeData,
    cacheConfig: any,
    securityHeaders: any,
    pathname: string,
    requestId: string
  ): Response {
    // For API endpoints, return JSON responses instead of HTML
    if (pathname.startsWith('/api/')) {
      return this.handleApiEndpoint(employee, pathname, requestId);
    }

    // For HTML API documentation pages
    const html = generateApiPage(employee, pathname);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': cacheConfig.cacheControl,
        'X-Request-ID': requestId,
        ...securityHeaders,
      },
    });
  },

  handleApiEndpoint(employee: EmployeeData, pathname: string, requestId: string): Response {
    const startTime = Date.now();

    try {
      let response: Response;

      switch (pathname) {
        case '/api/health':
          response = this.handleApiHealth(employee, requestId);
          break;
        case '/api/status':
          response = this.handleApiStatus(employee, requestId);
          break;
        case '/api/analytics':
          response = this.handleApiAnalytics(employee, requestId);
          break;
        case '/api/monitoring':
          response = this.handleApiMonitoring(employee, requestId);
          break;
        case '/api/profile':
          response = this.handleApiProfile(employee, requestId);
          break;
        case '/api/tools':
          response = this.handleApiTools(employee, requestId);
          break;
        case '/api/contacts':
          response = this.handleApiContacts(employee, requestId);
          break;
        case '/api/schedule':
          response = this.handleApiSchedule(employee, requestId);
          break;
        case '/api/cache/clear':
          response = this.handleApiCacheClear(employee, requestId);
          break;
        case '/api/logs':
          response = this.handleApiLogs(employee, requestId);
          break;
        case '/api/endpoints':
          response = this.handleApiEndpoints(employee, requestId);
          break;
        case '/api/batch':
          response = this.handleApiBatch(employee, requestId);
          break;
        case '/api/versions':
          response = this.handleApiVersions(employee, requestId);
          break;

        // Sportsbook Admin Menu Endpoints
        case '/api/dashboard':
          response = this.handleApiDashboard(employee, requestId);
          break;
        case '/api/messaging':
          response = this.handleApiMessaging(employee, requestId);
          break;
        case '/api/weekly-figures':
          response = this.handleApiWeeklyFigures(employee, requestId);
          break;
        case '/api/pending':
          response = this.handleApiPending(employee, requestId);
          break;
        case '/api/customer-admin':
          response = this.handleApiCustomerAdmin(employee, requestId);
          break;
        case '/api/agent-admin':
          response = this.handleApiAgentAdmin(employee, requestId);
          break;
        case '/api/game-admin':
          response = this.handleApiGameAdmin(employee, requestId);
          break;
        case '/api/cashier':
          response = this.handleApiCashier(employee, requestId);
          break;
        case '/api/reporting':
          response = this.handleApiReporting(employee, requestId);
          break;
        case '/api/admin-tools':
          response = this.handleApiAdminTools(employee, requestId);
          break;
        case '/api/billing':
          response = this.handleApiBilling(employee, requestId);
          break;
        case '/api/rules':
          response = this.handleApiRules(employee, requestId);
          break;
        case '/api/settings':
          response = this.handleApiSettings(employee, requestId);
          break;

        default:
          response = this.handleApiNotFound(pathname, requestId);
          break;
      }

      // Track analytics
      const responseTime = Date.now() - startTime;
      ApiAnalytics.trackRequest(
        pathname,
        'GET', // Could be enhanced to track actual HTTP method
        responseTime,
        response.status,
        undefined, // userAgent could be passed from request
        undefined // ip could be passed from request
      );

      return response;
    } catch (error) {
      // Track failed requests
      const responseTime = Date.now() - startTime;
      ApiAnalytics.trackRequest(pathname, 'GET', responseTime, 500);

      Logger.error('API endpoint error', {
        requestId,
        pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return ApiResponseFormatter.formatError('Internal server error', 500, {
        requestId,
        details: {
          endpoint: pathname,
          timestamp: new Date().toISOString(),
          suggestion: 'Please check the API documentation or contact support',
        },
      });
    }
  },

  handleApiHealth(employee: EmployeeData, requestId: string): Response {
    const healthData = {
      status: 'healthy',
      employee: employee.name,
      subdomain: employee.id,
      checks: {
        database: 'healthy',
        cache: 'healthy',
        templates: 'healthy',
        security: 'healthy',
      },
      uptime: Date.now(), // Simplified uptime
      version: CONFIG.VERSION,
    };

    return ApiResponseFormatter.formatHealthCheck(healthData, { requestId });
  },

  handleApiStatus(employee: EmployeeData, requestId: string): Response {
    const statusData = {
      employee: employee.name,
      subdomain: employee.id,
      tier: employee.tier,
      department: employee.department,
      features: employee.features,
      lastUpdated: employee.lastUpdated,
      cache: CacheManager.getStats(),
      config: {
        version: CONFIG.VERSION,
        domain: CONFIG.DOMAIN,
        brand: CONFIG.BRAND_NAME,
      },
    };

    return ApiResponseFormatter.formatSuccess(statusData, { requestId });
  },

  handleApiAnalytics(employee: EmployeeData, requestId: string): Response {
    const globalStats = ApiAnalytics.getGlobalStats();
    const topEndpoints = ApiAnalytics.getTopEndpoints(5);
    const slowestEndpoints = ApiAnalytics.getSlowestEndpoints(3);
    const failingEndpoints = ApiAnalytics.getFailingEndpoints(3);

    const analyticsData = {
      employee: employee.name,
      tier: employee.tier,
      department: employee.department,
      global: {
        totalRequests: globalStats.totalRequests,
        successfulRequests: globalStats.successfulRequests,
        failedRequests: globalStats.failedRequests,
        averageResponseTime: globalStats.averageResponseTime,
        errorRate: globalStats.errorRate,
        uptime: Math.round(globalStats.uptime / (1000 * 60)), // minutes
        peakHour: globalStats.peakHourFormatted,
        peakRequests: globalStats.peakRequests,
      },
      endpoints: {
        top: topEndpoints,
        slowest: slowestEndpoints,
        failing: failingEndpoints,
      },
      performance: {
        uptime: '99.9%',
        errorRate: `${globalStats.errorRate.toFixed(2)}%`,
        avgResponseTime: `${globalStats.averageResponseTime}ms`,
        totalEndpoints: ApiAnalytics.getAllEndpointStats().length,
      },
      lastUpdated: new Date().toISOString(),
    };

    return ApiResponseFormatter.formatSuccess(analyticsData, { requestId });
  },

  handleApiMonitoring(employee: EmployeeData, requestId: string): Response {
    const monitoringData = {
      status: 'active',
      version: 'v1',
      timestamp: new Date().toISOString(),
      employee: {
        name: employee.name,
        department: employee.department,
        tier: employee.tier,
      },
      summary: {
        totalAgents: 0,
        activeAgents: 0,
        alertsCount: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        systemHealth: 'healthy',
      },
      endpoints: {
        alerts: '/api/monitoring/alerts',
        health: '/api/monitoring/health-check',
        test: '/api/monitoring/test-alert',
        responseTimes: '/api/monitoring/response-times',
      },
      message: 'Fire22 Agent Monitoring API - Personal Subdomain Version',
    };

    return ApiResponseFormatter.formatSuccess(monitoringData, { requestId });
  },

  // New API endpoint handlers
  handleApiProfile(employee: EmployeeData, requestId: string): Response {
    const profileData = {
      id: employee.id,
      name: employee.name,
      title: employee.title,
      department: employee.department,
      email: employee.email,
      phone: employee.phone,
      slack: employee.slack,
      telegram: employee.telegram,
      bio: employee.bio,
      tier: employee.tier,
      features: employee.features,
      manager: employee.manager,
      directReports: employee.directReports,
      hireDate: employee.hireDate,
      lastUpdated: employee.lastUpdated,
      headshotUrl: employee.headshotUrl,
    };

    return ApiResponseFormatter.formatSuccess(profileData, { requestId });
  },

  handleApiTools(employee: EmployeeData, requestId: string): Response {
    const toolsData = {
      employee: employee.name,
      tier: employee.tier,
      availableTools: employee.features,
      tools: [
        {
          name: 'Contact Management',
          path: '/tools/contacts',
          description: 'Manage business contacts and relationships',
          tier: 1,
          status: 'active',
        },
        {
          name: 'Schedule Management',
          path: '/tools/schedule',
          description: 'Calendar and appointment management',
          tier: 3,
          status: employee.features.includes('premium-scheduling') ? 'active' : 'locked',
        },
        {
          name: 'Analytics Dashboard',
          path: '/tools/analytics',
          description: 'Performance metrics and analytics',
          tier: 2,
          status: 'active',
        },
        {
          name: 'VIP Management',
          path: '/tools/vip',
          description: 'High-value client relationship management',
          tier: 5,
          status: employee.features.includes('vip-escalation') ? 'active' : 'locked',
        },
      ],
    };

    return ApiResponseFormatter.formatSuccess(toolsData, { requestId });
  },

  handleApiContacts(employee: EmployeeData, requestId: string): Response {
    const contactsData = {
      employee: employee.name,
      totalContacts: Math.floor(Math.random() * 500) + 100,
      recentContacts: [
        {
          id: 'contact_001',
          name: 'John Smith',
          company: 'Sports Analytics Inc',
          lastContact: '2024-01-28T10:30:00Z',
          type: 'client',
        },
        {
          id: 'contact_002',
          name: 'Sarah Johnson',
          company: 'Betting Solutions Ltd',
          lastContact: '2024-01-27T15:45:00Z',
          type: 'partner',
        },
        {
          id: 'contact_003',
          name: 'Mike Wilson',
          company: 'Fantasy Sports Pro',
          lastContact: '2024-01-26T09:15:00Z',
          type: 'vendor',
        },
      ],
      categories: ['clients', 'partners', 'vendors', 'internal'],
    };

    return ApiResponseFormatter.formatSuccess(contactsData, { requestId });
  },

  handleApiSchedule(employee: EmployeeData, requestId: string): Response {
    if (!employee.features.includes('premium-scheduling')) {
      return ApiResponseFormatter.formatError('Schedule access not available for this tier', 403, {
        requestId,
        code: 'INSUFFICIENT_TIER',
        details: { requiredTier: 3, currentTier: employee.tier },
      });
    }

    const scheduleData = {
      employee: employee.name,
      timezone: 'America/New_York',
      upcomingAppointments: [
        {
          id: 'appt_001',
          title: 'VIP Client Meeting',
          date: '2024-01-30T14:00:00Z',
          duration: 60,
          type: 'meeting',
          attendees: ['Client A', 'Client B'],
        },
        {
          id: 'appt_002',
          title: 'Team Standup',
          date: '2024-01-31T09:00:00Z',
          duration: 30,
          type: 'internal',
          attendees: ['Team'],
        },
      ],
      availability: {
        monday: ['09:00', '17:00'],
        tuesday: ['09:00', '17:00'],
        wednesday: ['09:00', '17:00'],
        thursday: ['09:00', '17:00'],
        friday: ['09:00', '17:00'],
      },
    };

    return ApiResponseFormatter.formatSuccess(scheduleData, { requestId });
  },

  handleApiCacheClear(employee: EmployeeData, requestId: string): Response {
    // Only allow high-tier employees to clear cache
    if (employee.tier < 4) {
      return ApiResponseFormatter.formatError('Cache management not available for this tier', 403, {
        requestId,
        code: 'INSUFFICIENT_PRIVILEGES',
        details: { requiredTier: 4, currentTier: employee.tier },
      });
    }

    const cacheStats = CacheManager.getStats();
    CacheManager.clear();

    const clearData = {
      action: 'cache_cleared',
      previousStats: cacheStats,
      newStats: CacheManager.getStats(),
      timestamp: new Date().toISOString(),
      clearedBy: employee.name,
    };

    Logger.info('Cache cleared via API', { requestId, employee: employee.id, cacheStats });

    return ApiResponseFormatter.formatSuccess(clearData, { requestId });
  },

  handleApiLogs(employee: EmployeeData, requestId: string): Response {
    // Only allow management tier to access logs
    if (employee.tier < 4) {
      return ApiResponseFormatter.formatError('Log access not available for this tier', 403, {
        requestId,
        code: 'INSUFFICIENT_PRIVILEGES',
        details: { requiredTier: 4, currentTier: employee.tier },
      });
    }

    const logsData = {
      employee: employee.name,
      logLevel: 'info',
      recentEntries: [
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'info',
          message: 'API request processed',
          requestId: 'req_12345',
          endpoint: '/api/health',
        },
        {
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'warn',
          message: 'Rate limit approached',
          requestId: 'req_12346',
          endpoint: '/api/analytics',
        },
        {
          timestamp: new Date(Date.now() - 900000).toISOString(),
          level: 'info',
          message: 'Cache hit',
          requestId: 'req_12347',
          endpoint: '/api/profile',
        },
      ],
      retention: '90 days',
      totalEntries: Math.floor(Math.random() * 10000) + 5000,
    };

    return ApiResponseFormatter.formatSuccess(logsData, { requestId });
  },

  handleApiEndpoints(employee: EmployeeData, requestId: string): Response {
    const endpointsData = {
      version: 'v1',
      baseUrl: `https://${employee.id}.${CONFIG.DOMAIN}/api`,
      endpoints: [
        {
          path: '/api/health',
          method: 'GET',
          description: 'System health check',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/status',
          method: 'GET',
          description: 'Employee status and configuration',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/analytics',
          method: 'GET',
          description: 'Usage analytics and metrics',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/monitoring',
          method: 'GET',
          description: 'System monitoring data',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/profile',
          method: 'GET',
          description: 'Employee profile data',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/tools',
          method: 'GET',
          description: 'Available tools and features',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/contacts',
          method: 'GET',
          description: 'Contact management data',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/schedule',
          method: 'GET',
          description: 'Schedule and calendar data',
          authentication: 'none',
          tier: 3,
        },
        {
          path: '/api/cache/clear',
          method: 'POST',
          description: 'Clear system cache',
          authentication: 'required',
          tier: 4,
        },
        {
          path: '/api/logs',
          method: 'GET',
          description: 'System logs and activity',
          authentication: 'required',
          tier: 4,
        },
        {
          path: '/api/endpoints',
          method: 'GET',
          description: 'API endpoint documentation',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/batch',
          method: 'GET',
          description: 'Batch operations information',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/versions',
          method: 'GET',
          description: 'API versioning information',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/dashboard',
          method: 'GET',
          description: 'Sportsbook admin dashboard overview',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/messaging',
          method: 'GET',
          description: 'Internal messaging and communications',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/weekly-figures',
          method: 'GET',
          description: 'Weekly performance and financial figures',
          authentication: 'none',
          tier: 3,
        },
        {
          path: '/api/pending',
          method: 'GET',
          description: 'Pending approvals and reviews',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/customer-admin',
          method: 'GET',
          description: 'Customer management and administration',
          authentication: 'none',
          tier: 2,
        },
        {
          path: '/api/agent-admin',
          method: 'GET',
          description: 'Agent hierarchy and management',
          authentication: 'none',
          tier: 4,
        },
        {
          path: '/api/game-admin',
          method: 'GET',
          description: 'Game and odds management',
          authentication: 'none',
          tier: 2,
        },
        {
          path: '/api/cashier',
          method: 'GET',
          description: 'Transaction and cashier management',
          authentication: 'none',
          tier: 2,
        },
        {
          path: '/api/reporting',
          method: 'GET',
          description: 'Business intelligence and reporting',
          authentication: 'none',
          tier: 2,
        },
        {
          path: '/api/admin-tools',
          method: 'GET',
          description: 'Administrative tools and utilities',
          authentication: 'none',
          tier: 3,
        },
        {
          path: '/api/billing',
          method: 'GET',
          description: 'Agent billing and commission management',
          authentication: 'none',
          tier: 3,
        },
        {
          path: '/api/rules',
          method: 'GET',
          description: 'System rules and compliance',
          authentication: 'none',
          tier: 1,
        },
        {
          path: '/api/settings',
          method: 'GET',
          description: 'System configuration and settings',
          authentication: 'none',
          tier: 4,
        },
      ],
      documentation: `https://${employee.id}.${CONFIG.DOMAIN}/api/docs`,
    };

    return ApiResponseFormatter.formatSuccess(endpointsData, { requestId });
  },

  handleApiNotFound(pathname: string, requestId: string): Response {
    const availableEndpoints = [
      '/api/health',
      '/api/status',
      '/api/analytics',
      '/api/monitoring',
      '/api/profile',
      '/api/tools',
      '/api/contacts',
      '/api/schedule',
      '/api/cache/clear',
      '/api/logs',
      '/api/endpoints',
      '/api/batch',
      '/api/versions',
      '/api/dashboard',
      '/api/messaging',
      '/api/weekly-figures',
      '/api/pending',
      '/api/customer-admin',
      '/api/agent-admin',
      '/api/game-admin',
      '/api/cashier',
      '/api/reporting',
      '/api/admin-tools',
      '/api/billing',
      '/api/rules',
      '/api/settings',
    ];

    return ApiResponseFormatter.formatError('API endpoint not found', 404, {
      requestId,
      code: 'NOT_FOUND',
      details: {
        requestedEndpoint: pathname,
        availableEndpoints: availableEndpoints,
        suggestion: 'Check the /api/endpoints for available API endpoints',
        documentation: 'Visit /api/docs for complete API documentation',
      },
    });
  },

  // Enhanced API endpoint handlers
  async handleApiBatch(employee: EmployeeData, requestId: string): Promise<Response> {
    try {
      const batchData = {
        maxBatchSize: 10,
        supportedOperations: ['GET'],
        endpoints: ['/api/health', '/api/profile', '/api/status', '/api/tools', '/api/contacts'],
        example: {
          requests: [
            {
              id: 'health_check',
              method: 'GET',
              path: '/api/health',
            },
            {
              id: 'profile_data',
              method: 'GET',
              path: '/api/profile',
            },
          ],
        },
      };

      return ApiResponseFormatter.formatSuccess(batchData, { requestId });
    } catch (error) {
      Logger.error('Error in batch endpoint', { requestId, error });
      return ApiResponseFormatter.formatError('Failed to process batch request', 500, {
        requestId,
      });
    }
  },

  handleApiVersions(employee: EmployeeData, requestId: string): Response {
    const versionData = {
      currentVersion: ApiVersioning.getCurrentVersion(),
      supportedVersions: ApiVersioning.getSupportedVersions(),
      versionHistory: ApiVersioning.getVersionHistory(),
      usage: {
        recommended: 'Use current version for new integrations',
        migration: 'Check version history for breaking changes',
        deprecation: 'Deprecated versions will be removed in 6 months',
      },
    };

    return ApiResponseFormatter.formatSuccess(versionData, { requestId });
  },

  // Sportsbook Admin Menu API Handlers
  handleApiDashboard(employee: EmployeeData, requestId: string): Response {
    const dashboardData = {
      employee: employee.name,
      role: employee.title,
      department: employee.department,
      tier: employee.tier,
      overview: {
        totalCustomers: Math.floor(Math.random() * 10000) + 5000,
        activeAgents: Math.floor(Math.random() * 500) + 100,
        pendingItems: Math.floor(Math.random() * 50) + 10,
        todaysRevenue: Math.floor(Math.random() * 50000) + 10000,
        weeklyGrowth: Math.floor(Math.random() * 20) + 5,
        systemHealth: 'excellent',
      },
      recentActivity: [
        {
          id: 'act_001',
          type: 'customer_registration',
          description: 'New customer registered',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: 'completed',
        },
        {
          id: 'act_002',
          type: 'transaction',
          description: 'Large bet placed',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          status: 'pending',
        },
        {
          id: 'act_003',
          type: 'agent_action',
          description: 'Agent commission processed',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          status: 'completed',
        },
      ],
      alerts: [
        {
          id: 'alert_001',
          type: 'warning',
          message: 'High betting volume detected',
          priority: 'medium',
        },
        {
          id: 'alert_002',
          type: 'info',
          message: 'System maintenance scheduled',
          priority: 'low',
        },
      ],
    };

    return ApiResponseFormatter.formatSuccess(dashboardData, { requestId });
  },

  handleApiMessaging(employee: EmployeeData, requestId: string): Response {
    if (!employee.features.includes('messaging')) {
      return ApiResponseFormatter.formatError('Messaging access not available', 403, {
        requestId,
        code: 'FEATURE_NOT_AVAILABLE',
      });
    }

    const messagingData = {
      employee: employee.name,
      unreadCount: Math.floor(Math.random() * 25) + 5,
      totalMessages: Math.floor(Math.random() * 500) + 100,
      conversations: [
        {
          id: 'conv_001',
          with: 'Agent Smith',
          lastMessage: 'Commission report ready for review',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          unread: 3,
          type: 'agent',
        },
        {
          id: 'conv_002',
          with: 'Customer Support',
          lastMessage: 'VIP customer issue resolved',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          unread: 0,
          type: 'support',
        },
        {
          id: 'conv_003',
          with: 'System Admin',
          lastMessage: 'Weekly maintenance completed',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          unread: 1,
          type: 'admin',
        },
      ],
      quickActions: ['New Message', 'Bulk Send', 'Templates', 'Archive Old'],
    };

    return ApiResponseFormatter.formatSuccess(messagingData, { requestId });
  },

  handleApiWeeklyFigures(employee: EmployeeData, requestId: string): Response {
    if (employee.tier < 3) {
      return ApiResponseFormatter.formatError('Weekly figures access requires Tier 3+', 403, {
        requestId,
        code: 'INSUFFICIENT_TIER',
      });
    }

    const weeklyData = {
      employee: employee.name,
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      figures: {
        totalRevenue: Math.floor(Math.random() * 200000) + 50000,
        totalBets: Math.floor(Math.random() * 5000) + 1000,
        winningBets: Math.floor(Math.random() * 2500) + 500,
        losingBets: Math.floor(Math.random() * 2500) + 500,
        averageBetSize: Math.floor(Math.random() * 500) + 100,
        customerRetention: Math.floor(Math.random() * 20) + 75,
        agentPerformance: Math.floor(Math.random() * 30) + 70,
      },
      trends: {
        revenueChange: Math.floor(Math.random() * 40) - 20,
        customerGrowth: Math.floor(Math.random() * 20) + 5,
        betVolumeChange: Math.floor(Math.random() * 30) - 10,
      },
      topPerformers: [
        { name: 'Agent Johnson', revenue: 45000, growth: 15 },
        { name: 'Agent Williams', revenue: 38000, growth: 22 },
        { name: 'Agent Brown', revenue: 32000, growth: 8 },
      ],
    };

    return ApiResponseFormatter.formatSuccess(weeklyData, { requestId });
  },

  handleApiPending(employee: EmployeeData, requestId: string): Response {
    const pendingData = {
      employee: employee.name,
      totalPending: Math.floor(Math.random() * 100) + 25,
      categories: {
        approvals: Math.floor(Math.random() * 30) + 5,
        reviews: Math.floor(Math.random() * 20) + 3,
        escalations: Math.floor(Math.random() * 15) + 2,
        disputes: Math.floor(Math.random() * 10) + 1,
        maintenance: Math.floor(Math.random() * 25) + 5,
      },
      items: [
        {
          id: 'pend_001',
          type: 'approval',
          description: 'Large bet approval required',
          priority: 'high',
          age: '2 hours',
          requester: 'Agent Smith',
          amount: 5000,
        },
        {
          id: 'pend_002',
          type: 'review',
          description: 'Customer account verification',
          priority: 'medium',
          age: '4 hours',
          requester: 'System',
          amount: null,
        },
        {
          id: 'pend_003',
          type: 'escalation',
          description: 'VIP customer complaint',
          priority: 'high',
          age: '1 hour',
          requester: 'Customer Support',
          amount: null,
        },
      ],
      actions: ['Approve All', 'Bulk Review', 'Escalate Critical', 'Export List'],
    };

    return ApiResponseFormatter.formatSuccess(pendingData, { requestId });
  },

  handleApiCustomerAdmin(employee: EmployeeData, requestId: string): Response {
    if (!employee.features.includes('customer-management')) {
      return ApiResponseFormatter.formatError('Customer admin access not available', 403, {
        requestId,
        code: 'FEATURE_NOT_AVAILABLE',
      });
    }

    const customerData = {
      employee: employee.name,
      totalCustomers: Math.floor(Math.random() * 50000) + 10000,
      activeCustomers: Math.floor(Math.random() * 30000) + 5000,
      newThisWeek: Math.floor(Math.random() * 1000) + 200,
      vipCustomers: Math.floor(Math.random() * 500) + 50,
      categories: {
        bronze: Math.floor(Math.random() * 20000) + 5000,
        silver: Math.floor(Math.random() * 15000) + 3000,
        gold: Math.floor(Math.random() * 10000) + 2000,
        platinum: Math.floor(Math.random() * 5000) + 1000,
      },
      recentCustomers: [
        {
          id: 'cust_001',
          name: 'John Doe',
          email: 'john.doe@email.com',
          tier: 'gold',
          joinDate: new Date(Date.now() - 86400000).toISOString(),
          lastBet: new Date(Date.now() - 3600000).toISOString(),
          totalBets: 45,
          totalWagered: 25000,
        },
        {
          id: 'cust_002',
          name: 'Jane Smith',
          email: 'jane.smith@email.com',
          tier: 'platinum',
          joinDate: new Date(Date.now() - 172800000).toISOString(),
          lastBet: new Date(Date.now() - 7200000).toISOString(),
          totalBets: 123,
          totalWagered: 75000,
        },
      ],
      actions: ['Add Customer', 'Bulk Import', 'Export Data', 'Tier Management', 'Risk Assessment'],
    };

    return ApiResponseFormatter.formatSuccess(customerData, { requestId });
  },

  handleApiAgentAdmin(employee: EmployeeData, requestId: string): Response {
    if (employee.tier < 4) {
      return ApiResponseFormatter.formatError('Agent admin access requires Tier 4+', 403, {
        requestId,
        code: 'INSUFFICIENT_PRIVILEGES',
      });
    }

    const agentData = {
      employee: employee.name,
      totalAgents: Math.floor(Math.random() * 1000) + 200,
      activeAgents: Math.floor(Math.random() * 800) + 150,
      hierarchy: {
        level1: Math.floor(Math.random() * 50) + 10,
        level2: Math.floor(Math.random() * 200) + 50,
        level3: Math.floor(Math.random() * 400) + 100,
        level4: Math.floor(Math.random() * 350) + 75,
      },
      performance: {
        topAgent: 'Agent Johnson',
        topRevenue: 125000,
        averageCommission: 8.5,
        totalCommissions: 450000,
      },
      recentActivity: [
        {
          id: 'agent_001',
          name: 'Agent Smith',
          action: 'Commission processed',
          amount: 2500,
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'agent_002',
          name: 'Agent Johnson',
          action: 'New sub-agent added',
          amount: null,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      actions: [
        'Add Agent',
        'Commission Management',
        'Performance Reports',
        'Hierarchy Management',
        'Agent Training',
      ],
    };

    return ApiResponseFormatter.formatSuccess(agentData, { requestId });
  },

  handleApiGameAdmin(employee: EmployeeData, requestId: string): Response {
    if (!employee.features.includes('game-management')) {
      return ApiResponseFormatter.formatError('Game admin access not available', 403, {
        requestId,
        code: 'FEATURE_NOT_AVAILABLE',
      });
    }

    const gameData = {
      employee: employee.name,
      totalGames: Math.floor(Math.random() * 1000) + 500,
      activeGames: Math.floor(Math.random() * 200) + 50,
      categories: {
        football: Math.floor(Math.random() * 200) + 100,
        basketball: Math.floor(Math.random() * 150) + 75,
        baseball: Math.floor(Math.random() * 100) + 50,
        hockey: Math.floor(Math.random() * 80) + 40,
        soccer: Math.floor(Math.random() * 120) + 60,
        tennis: Math.floor(Math.random() * 60) + 30,
        golf: Math.floor(Math.random() * 40) + 20,
        other: Math.floor(Math.random() * 50) + 25,
      },
      popularGames: [
        {
          id: 'game_001',
          sport: 'Football',
          teams: 'Chiefs vs Eagles',
          totalBets: 2500,
          totalWagered: 125000,
          startTime: new Date(Date.now() + 3600000).toISOString(),
        },
        {
          id: 'game_002',
          sport: 'Basketball',
          teams: 'Lakers vs Warriors',
          totalBets: 1800,
          totalWagered: 90000,
          startTime: new Date(Date.now() + 7200000).toISOString(),
        },
      ],
      systemStatus: {
        oddsUpdate: 'real-time',
        lineManagement: 'active',
        autoLock: 'enabled',
        riskManagement: 'active',
      },
      actions: ['Add Game', 'Update Odds', 'Manage Lines', 'Game Settings', 'Risk Controls'],
    };

    return ApiResponseFormatter.formatSuccess(gameData, { requestId });
  },

  handleApiCashier(employee: EmployeeData, requestId: string): Response {
    if (!employee.features.includes('cashier')) {
      return ApiResponseFormatter.formatError('Cashier access not available', 403, {
        requestId,
        code: 'FEATURE_NOT_AVAILABLE',
      });
    }

    const cashierData = {
      employee: employee.name,
      todaysTransactions: Math.floor(Math.random() * 1000) + 200,
      totalVolume: Math.floor(Math.random() * 500000) + 100000,
      pendingTransactions: Math.floor(Math.random() * 50) + 10,
      categories: {
        deposits: {
          count: Math.floor(Math.random() * 300) + 50,
          amount: Math.floor(Math.random() * 150000) + 25000,
        },
        withdrawals: {
          count: Math.floor(Math.random() * 200) + 30,
          amount: Math.floor(Math.random() * 100000) + 15000,
        },
        transfers: {
          count: Math.floor(Math.random() * 150) + 25,
          amount: Math.floor(Math.random() * 75000) + 10000,
        },
        adjustments: {
          count: Math.floor(Math.random() * 50) + 5,
          amount: Math.floor(Math.random() * 25000) + 5000,
        },
      },
      recentTransactions: [
        {
          id: 'txn_001',
          type: 'deposit',
          customer: 'John Doe',
          amount: 1000,
          method: 'credit_card',
          status: 'completed',
          timestamp: new Date(Date.now() - 300000).toISOString(),
        },
        {
          id: 'txn_002',
          type: 'withdrawal',
          customer: 'Jane Smith',
          amount: 500,
          method: 'bank_transfer',
          status: 'pending',
          timestamp: new Date(Date.now() - 600000).toISOString(),
        },
      ],
      actions: [
        'Process Deposit',
        'Process Withdrawal',
        'Transfer Funds',
        'Adjust Balance',
        'Transaction History',
      ],
    };

    return ApiResponseFormatter.formatSuccess(cashierData, { requestId });
  },

  handleApiReporting(employee: EmployeeData, requestId: string): Response {
    if (employee.tier < 2) {
      return ApiResponseFormatter.formatError('Reporting access requires Tier 2+', 403, {
        requestId,
        code: 'INSUFFICIENT_TIER',
      });
    }

    const reportingData = {
      employee: employee.name,
      availableReports: [
        {
          id: 'agent_performance',
          name: 'Agent Performance',
          description: 'Detailed agent commission and performance metrics',
          category: 'agents',
          lastRun: new Date(Date.now() - 86400000).toISOString(),
          frequency: 'daily',
        },
        {
          id: 'analysis',
          name: 'Business Analysis',
          description: 'Comprehensive business intelligence and trends',
          category: 'business',
          lastRun: new Date(Date.now() - 172800000).toISOString(),
          frequency: 'weekly',
        },
        {
          id: 'ip_tracker',
          name: 'IP Tracker',
          description: 'Customer IP address tracking and analysis',
          category: 'security',
          lastRun: new Date(Date.now() - 3600000).toISOString(),
          frequency: 'real-time',
        },
        {
          id: 'transaction_history',
          name: 'Transaction History',
          description: 'Complete transaction history and audit trail',
          category: 'transactions',
          lastRun: new Date(Date.now() - 1800000).toISOString(),
          frequency: 'real-time',
        },
        {
          id: 'settled_figure',
          name: 'Collections',
          description: 'Settled bets and collections management',
          category: 'collections',
          lastRun: new Date(Date.now() - 7200000).toISOString(),
          frequency: 'hourly',
        },
      ],
      quickStats: {
        reportsGenerated: Math.floor(Math.random() * 1000) + 500,
        dataPoints: Math.floor(Math.random() * 1000000) + 500000,
        storageUsed: `${Math.floor(Math.random() * 50) + 10}GB`,
        lastBackup: new Date(Date.now() - 86400000).toISOString(),
      },
      actions: [
        'Generate Report',
        'Schedule Reports',
        'Export Data',
        'Custom Reports',
        'Report Templates',
      ],
    };

    return ApiResponseFormatter.formatSuccess(reportingData, { requestId });
  },

  handleApiAdminTools(employee: EmployeeData, requestId: string): Response {
    if (!employee.features.includes('admin-tools')) {
      return ApiResponseFormatter.formatError('Admin tools access not available', 403, {
        requestId,
        code: 'FEATURE_NOT_AVAILABLE',
      });
    }

    const toolsData = {
      employee: employee.name,
      tools: [
        {
          id: 'bet_ticker',
          name: 'Bet Ticker',
          description: 'Real-time bet monitoring and tracking',
          category: 'monitoring',
          status: 'active',
          usage: Math.floor(Math.random() * 1000) + 500,
        },
        {
          id: 'ticketwriter',
          name: 'Ticketwriter',
          description: 'Advanced ticket creation and management',
          category: 'operations',
          status: 'active',
          usage: Math.floor(Math.random() * 800) + 300,
        },
        {
          id: 'sportsbook_lines',
          name: 'Sportsbook Lines',
          description: 'Live odds and line management',
          category: 'trading',
          status: 'active',
          usage: Math.floor(Math.random() * 1200) + 600,
        },
        {
          id: 'scores',
          name: 'Live Scores',
          description: 'Real-time game scores and updates',
          category: 'monitoring',
          status: 'active',
          usage: Math.floor(Math.random() * 2000) + 1000,
        },
      ],
      systemTools: [
        'Database Maintenance',
        'Cache Management',
        'Log Rotation',
        'Backup Operations',
      ],
      integrations: [
        {
          name: '3rd Party APIs',
          status: 'connected',
          lastSync: new Date(Date.now() - 300000).toISOString(),
        },
        {
          name: 'Payment Processors',
          status: 'active',
          lastSync: new Date(Date.now() - 600000).toISOString(),
        },
        {
          name: 'Data Feeds',
          status: 'connected',
          lastSync: new Date(Date.now() - 120000).toISOString(),
        },
      ],
      actions: [
        'Run Diagnostics',
        'System Maintenance',
        'Integration Testing',
        'Performance Optimization',
      ],
    };

    return ApiResponseFormatter.formatSuccess(toolsData, { requestId });
  },

  handleApiBilling(employee: EmployeeData, requestId: string): Response {
    if (employee.tier < 3) {
      return ApiResponseFormatter.formatError('Billing access requires Tier 3+', 403, {
        requestId,
        code: 'INSUFFICIENT_TIER',
      });
    }

    const billingData = {
      employee: employee.name,
      monthlyRevenue: Math.floor(Math.random() * 2000000) + 500000,
      outstandingInvoices: Math.floor(Math.random() * 50000) + 10000,
      agents: {
        total: Math.floor(Math.random() * 1000) + 200,
        active: Math.floor(Math.random() * 800) + 150,
        commissionsPaid: Math.floor(Math.random() * 150000) + 50000,
      },
      invoices: [
        {
          id: 'inv_001',
          agent: 'Agent Johnson',
          amount: 12500,
          status: 'paid',
          dueDate: new Date(Date.now() - 86400000).toISOString(),
          paidDate: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: 'inv_002',
          agent: 'Agent Smith',
          amount: 8750,
          status: 'pending',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          paidDate: null,
        },
      ],
      revenueBreakdown: {
        sportsBetting: Math.floor(Math.random() * 600000) + 200000,
        casino: Math.floor(Math.random() * 400000) + 150000,
        poker: Math.floor(Math.random() * 200000) + 50000,
        other: Math.floor(Math.random() * 100000) + 25000,
      },
      actions: [
        'Generate Invoice',
        'Process Payment',
        'Revenue Reports',
        'Commission Calculator',
        'Billing History',
      ],
    };

    return ApiResponseFormatter.formatSuccess(billingData, { requestId });
  },

  handleApiRules(employee: EmployeeData, requestId: string): Response {
    const rulesData = {
      employee: employee.name,
      totalRules: Math.floor(Math.random() * 200) + 50,
      categories: {
        betting: Math.floor(Math.random() * 50) + 15,
        customer: Math.floor(Math.random() * 40) + 10,
        agent: Math.floor(Math.random() * 30) + 8,
        operational: Math.floor(Math.random() * 60) + 20,
        compliance: Math.floor(Math.random() * 20) + 5,
      },
      recentRules: [
        {
          id: 'rule_001',
          title: 'VIP Customer Limits',
          category: 'betting',
          status: 'active',
          created: new Date(Date.now() - 86400000).toISOString(),
          author: 'Compliance Officer',
        },
        {
          id: 'rule_002',
          title: 'Agent Commission Structure',
          category: 'agent',
          status: 'draft',
          created: new Date(Date.now() - 172800000).toISOString(),
          author: 'Management',
        },
      ],
      compliance: {
        lastAudit: new Date(Date.now() - 2592000000).toISOString(),
        status: 'compliant',
        nextAudit: new Date(Date.now() + 2592000000).toISOString(),
      },
      actions: ['Create Rule', 'Edit Rules', 'Rule Templates', 'Compliance Audit', 'Rule History'],
    };

    return ApiResponseFormatter.formatSuccess(rulesData, { requestId });
  },

  handleApiSettings(employee: EmployeeData, requestId: string): Response {
    if (employee.tier < 4) {
      return ApiResponseFormatter.formatError('Settings access requires Tier 4+', 403, {
        requestId,
        code: 'INSUFFICIENT_PRIVILEGES',
      });
    }

    const settingsData = {
      employee: employee.name,
      system: {
        timezone: 'America/New_York',
        currency: 'USD',
        language: 'en',
        theme: 'dark',
      },
      features: {
        realTimeUpdates: true,
        emailNotifications: true,
        smsAlerts: false,
        autoBackup: true,
        maintenanceMode: false,
      },
      limits: {
        maxBetAmount: 10000,
        maxDailyBets: 100,
        maxConcurrentSessions: 5,
        rateLimitPerMinute: 60,
      },
      integrations: [
        {
          name: 'Payment Processor',
          status: 'active',
          config: 'configured',
        },
        {
          name: 'Odds Provider',
          status: 'active',
          config: 'configured',
        },
        {
          name: 'SMS Service',
          status: 'inactive',
          config: 'not_configured',
        },
      ],
      security: {
        twoFactorAuth: true,
        sessionTimeout: 30,
        passwordPolicy: 'strong',
        ipWhitelist: false,
      },
      actions: [
        'Save Settings',
        'Reset to Defaults',
        'Export Configuration',
        'System Backup',
        'Maintenance Mode',
      ],
    };

    return ApiResponseFormatter.formatSuccess(settingsData, { requestId });
  },

  renderDebugPage(subdomain: string, env: Env, requestId: string): Response {
    const employeeKey = `employee:${subdomain}`;

    const debugInfo = {
      subdomain: subdomain,
      employeeKey: employeeKey,
      hostname_expected: `${subdomain}.${CONFIG.DOMAIN}`,
      kv_key_expected: `employee:${subdomain}`,
      timestamp: new Date().toISOString(),
      requestId: requestId,
      note: 'This is a debug endpoint to check subdomain processing',
    };

    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Request-ID': requestId,
      },
    });
  },

  create404Response(subdomain: string, requestId: string): Response {
    const html = generate404Page(subdomain);
    return new Response(html, {
      status: 404,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300',
        'X-Request-ID': requestId,
      },
    });
  },
};

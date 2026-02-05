// config/urls-updated.ts - Fixed URL configuration using working endpoints

export const URLS = {
  // 🏭 Factory Wager Registry URLs
  REGISTRY: {
    MAIN: 'https://registry.factory-wager.com',
    WORKER: 'https://registry.factory-wager.workers.dev',
    HEALTH: 'https://registry.factory-wager.workers.dev/health',
    INFO: 'https://registry.factory-wager.workers.dev/',
    SEARCH: 'https://registry.factory-wager.com/-/v1/search',
    
    // Package URLs
    PACKAGE: (packageName: string) => `https://registry.factory-wager.com/@factory-wager/${packageName}`,
    PACKAGE_VERSION: (packageName: string, version: string) => 
      `https://registry.factory-wager.com/@factory-wager/${packageName}/${version}`,
    PACKAGE_DOWNLOAD: (packageName: string, filename: string) => 
      `https://registry.factory-wager.com/@factory-wager/${packageName}/-/${filename}`,
    
    // Alternative domains
    NPM: 'https://npm.factory-wager.com',
    PACKAGES: 'https://packages.factory-wager.com',
    API: 'https://api.factory-wager.com'
  },
  
  // 🔒 Security URLs - Using factory-wager endpoints
  SECURITY: {
    AUTH: 'https://registry.factory-wager.workers.dev/auth',
    TOKEN_VALIDATION: 'https://registry.factory-wager.workers.dev/validate-token',
    SECURITY_AUDIT: 'https://registry.factory-wager.workers.dev/audit',
    VULNERABILITY: 'https://registry.factory-wager.workers.dev/vulnerability',
    DEPENDENCY_CHECK: 'https://registry.factory-wager.workers.dev/dependencies',
    LICENSE_CHECK: 'https://registry.factory-wager.workers.dev/license'
  },
  
  // 📊 Analytics URLs - Using factory-wager endpoints
  ANALYTICS: {
    USAGE: 'https://registry.factory-wager.workers.dev/analytics',
    METRICS: 'https://registry.factory-wager.workers.dev/metrics',
    ERRORS: 'https://registry.factory-wager.workers.dev/errors',
    UPTIME: 'https://registry.factory-wager.workers.dev/uptime',
    HEALTH: 'https://registry.factory-wager.workers.dev/health',
    PERFORMANCE: 'https://registry.factory-wager.workers.dev/performance',
    LOGS: 'https://registry.factory-wager.workers.dev/logs'
  },
  
  // 📊 Monitoring & Dashboard URLs
  MONITORING: {
    DASHBOARD: 'http://localhost:3000/dashboard',
    DEV_DASHBOARD: 'http://localhost:3000/dev-dashboard',
    DISPUTE_DASHBOARD: 'http://localhost:3000/dispute-dashboard',
    PERF_DASHBOARD: 'http://localhost:3000/performance-dashboard',
    
    // Health & Metrics - Using factory-wager endpoints
    HEALTH: 'https://registry.factory-wager.workers.dev/health',
    METRICS: 'https://registry.factory-wager.workers.dev/metrics',
    STATUS: 'https://registry.factory-wager.workers.dev/status',
    PERFORMANCE: 'https://registry.factory-wager.workers.dev/performance'
  },
  
  // 🔧 Development & API URLs
  DEVELOPMENT: {
    LOCAL_SERVER: 'http://localhost:3000',
    API_BASE: 'http://localhost:3000/api',
    API_V1: 'http://localhost:3000/api/v1',
    TEST_SERVER: 'http://localhost:3001',
    
    // API Endpoints
    DISPUTE_API: 'http://localhost:3000/api/disputes',
    DEEPLINK_API: 'http://localhost:3000/api/deeplinks',
    MONITORING_API: 'http://localhost:3000/api/monitoring',
    HEALTH_API: 'http://localhost:3000/api/health'
  },
  
  // ☁️ Cloudflare URLs
  CLOUDFLARE: {
    DASHBOARD: 'https://dash.cloudflare.com',
    ACCOUNT: 'https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36',
    WORKERS: 'https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/workers',
    R2: 'https://dash.cloudflare.com/7a470541a704caaf91e71efccc78fd36/r2',
    TOKENS: 'https://dash.cloudflare.com/profile/api-tokens'
  },
  
  // 🏭 Factory Wager URLs
  FACTORY_WAGER: {
    WEBSITE: 'https://factory-wager.com',
    SUPPORT: 'mailto:registry@factory-wager.com',
    BUSINESS: 'mailto:business@factory-wager.com',
    SECURITY: 'mailto:security@factory-wager.com'
  },
  
  // 📦 Package Registry URLs
  PACKAGES: {
    FACTORY_WAGER: 'https://registry.factory-wager.com',
    NPM: 'https://registry.npmjs.org',
    GITHUB: 'https://npm.pkg.github.com',
    
    // Specific packages
    CORE: 'https://registry.factory-wager.com/@factory-wager/core',
    DISPUTES: 'https://registry.factory-wager.com/@factory-wager/disputes',
    MONITORING: 'https://registry.factory-wager.com/@factory-wager/monitoring'
  },
  
  // 📚 Documentation URLs
  DOCUMENTATION: {
    MAIN: 'https://docs.factory-wager.com',
    API: 'https://docs.factory-wager.com/api',
    REGISTRY: 'https://docs.factory-wager.com/registry',
    DEVELOPMENT: 'https://docs.factory-wager.com/development',
    
    // External docs
    CLOUDFLARE_WORKERS: 'https://developers.cloudflare.com/workers/',
    R2_STORAGE: 'https://developers.cloudflare.com/r2/',
    BUN: 'https://bun.sh/docs',
    TYPESCRIPT: 'https://www.typescriptlang.org/docs/'
  },
  
  // 🚀 Build & Deployment URLs
  DEPLOYMENT: {
    PRODUCTION: 'https://registry.factory-wager.com',
    STAGING: 'https://staging.factory-wager.com',
    DEVELOPMENT: 'https://dev.factory-wager.com',
    WORKER: 'https://registry.factory-wager.workers.dev',
    
    // CI/CD
    BUILD_STATUS: 'https://github.com/factory-wager/enterprise-components/actions',
    COVERAGE: 'https://codecov.io/gh/factory-wager/enterprise-components',
    RELEASES: 'https://github.com/factory-wager/enterprise-components/releases'
  },
  
  // 🌐 Social & Community URLs
  COMMUNITY: {
    GITHUB: 'https://github.com/factory-wager/enterprise-components',
    DISCORD: 'https://discord.gg/factory-wager',
    WIKI: 'https://github.com/factory-wager/enterprise-components/wiki',
    ISSUES: 'https://github.com/factory-wager/enterprise-components/issues'
  },
  
  // 🧪 Testing URLs
  TESTING: {
    TEST_ENV: 'http://localhost:3002',
    E2E: 'http://localhost:3002/test',
    COVERAGE: 'http://localhost:3002/coverage',
    RESULTS: 'http://localhost:3002/results',
    INSPECTION: 'http://localhost:8765',
    INSPECTION_DEBUG: 'http://localhost:8765/debug',
    INSPECTION_METRICS: 'http://localhost:8765/metrics',
    INSPECTION_HEALTH: 'http://localhost:8765/health',
    INSPECTION_JSON: 'http://localhost:8765/scope.json',
    BUNDLE_ANALYZER: 'http://localhost:8777',
    BUNDLE_GRAPH: 'http://localhost:8777/bundle-graph',
    BUNDLE_MATRIX: 'http://localhost:8777/bundle',
    TIMEZONE_DASHBOARD: 'http://localhost:8081',
    TIMEZONE_API: 'http://localhost:8081/api',
    PERF_TESTING: 'http://localhost:3004'
  },
  
  // 💳 Payment & Financial URLs
  PAYMENT: {
    VENMO: 'https://api.venmo.com/v1',
    VENMO_SANDBOX: 'https://sandbox-api.venmo.com/v1',
    VENMO_OAUTH: 'https://api.venmo.com/v1/oauth/authorize',
    VENMO_TOKEN: 'https://api.venmo.com/v1/oauth/access_token',
    VENMO_PAYMENTS: 'https://api.venmo.com/v1/payments',
    VENMO_USERS: 'https://api.venmo.com/v1/users',
    VENMO_STORY: 'https://api.venmo.com/v1/story',
    CASH_APP: 'https://api.cash.app/v1',
    CASH_APP_SANDBOX: 'https://api-sandbox.cash.app',
    CASH_APP_PAYMENTS: 'https://api.cash.app/v1/payments',
    CASH_APP_USERS: 'https://api.cash.app/v1/users',
    CASH_APP_DEPOSITS: 'https://api.cash.app/v1/savings/deposit',
    COINDESK: 'https://api.coindesk.com/v1/bpi/currentprice.json',
    EXCHANGE_RATE: 'https://api.exchangerate-api.com/v4/latest'
  },
  
  // 🔍 External Service URLs
  EXTERNAL_APIS: {
    IP_QUALITY: 'https://www.ipqualityscore.com',
    IP_QUALITY_API: 'https://www.ipqualityscore.com/api/json/phone',
    ANI_CAPTCHA: 'https://api.anti-captcha.com',
    CAPTCHA_CREATE: 'https://api.anti-captcha.com/createTask',
    CAPTCHA_RESULT: 'https://api.anti-captcha.com/getTaskResult',
    QR_SERVER: 'https://api.qrserver.com/v1/create-qr-code',
    PROXY_SCRAPE: 'https://api.proxyscrape.com/v2',
    MAILCHANNELS: 'https://api.mailchannels.net/tx/v1/send',
    PAGERDUTY: 'https://events.pagerduty.com/v2/enqueue',
    HTTPBIN: 'https://httpbin.org',
    HTTPBIN_IP: 'https://httpbin.org/ip',
    HTTPBIN_HEADERS: 'https://httpbin.org/headers',
    HTTPBIN_DELAY: 'https://httpbin.org/delay/1'
  },
  
  // 🔗 Deep Link URLs
  DEEP_LINKS: {
    SCHEME: 'factory-wager://',
    DISPUTE: 'factory-wager://dispute',
    PAYMENT: 'factory-wager://payment',
    FAMILY: 'factory-wager://family',
    WEB_FALLBACK: 'https://factory-wager.com/deeplink/redirect',
    SECURE_DISPUTE: 'https://factory-wager.com/disputes/secure',
    FALLBACK: 'https://factory-wager.com/fallback'
  },
  
  // 🎨 CDN & Asset URLs
  CDN: {
    TAILWIND: 'https://cdn.tailwindcss.com',
    CHART_JS: 'https://cdn.jsdelivr.net/npm/chart.js',
    SOCKET_IO: 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js',
    PLACEHOLDER: 'https://picsum.photos'
  },
  
  // 📊 Storage URLs
  STORAGE: {
    FILES_APPLE: 'https://files.apple.factory-wager.com',
    R2_SIMULATOR: 'https://sim.r2.dev',
    R2_BUCKET: 'https://{bucket}.r2.cloudflarestorage.com',
    DASHBOARDS_EMPIRE: 'https://dashboards.empire-pro.com'
  },
  
  // 🔌 WebSocket URLs
  WEBSOCKET: {
    SDK: 'ws://localhost:3000/sdk',
    DEMO: 'ws://localhost:8080/demo-sdk',
    PERFORMANCE: 'ws://localhost:3004/ws',
    INSPECTION: 'ws://localhost:8766/ws-inspect',
    BUNDLE_ANALYZER: 'ws://localhost:8777',
    REAL_TIME: 'ws://localhost:3002',
    PRODUCTION_SDK: 'wss://api.factory-wager.com/v1/sdk',
    MONITORING: 'wss://monitoring.factory-wager.com/events'
  },
  
  // 🗄️ Database URLs
  DATABASE: {
    POSTGRES_LOCAL: 'postgresql://localhost:5432/duo_automation',
    POSTGRES_USER: 'postgresql://user:pass@localhost:5432/db',
    POSTGRES_PRODUCTION: 'postgresql://username:password@localhost:5432/duo_automation',
    REDIS_LOCAL: 'redis://localhost:6379',
    REDIS_CONFIG: 'redis://localhost:6379',
    REDIS_PRODUCTION: 'redis://redis:6379',
    SUBSCRIPTION_DB: 'postgresql://localhost/subscriptions',
    EMPIRE_CONFIG: 'postgresql://user:pass@localhost:5432/empire_pro'
  },
  
  // ⚙️ Configuration URLs
  CONFIG: {
    ENVIRONMENT_DEV: 'postgresql://localhost:5432/duo_automation',
    ENVIRONMENT_PROD: 'postgresql://username:password@localhost:5432/duo_automation',
    CACHE_DEV: 'redis://localhost:6379',
    CACHE_PROD: 'redis://redis:6379',
    SECRETS_DEV: 'postgresql://user:pass@localhost:5432/db',
    SECRETS_PROD: 'postgresql://admin:password@db.acme.com:5432/production'
  }
} as const;

// Environment-specific URL configuration
export const ENVIRONMENT_URLS = {
  production: {
    REGISTRY: URLS.REGISTRY.MAIN,
    API: `${URLS.REGISTRY.MAIN}/api`,
    DASHBOARD: URLS.REGISTRY.MAIN,
    MONITORING: URLS.ANALYTICS.HEALTH
  },
  staging: {
    REGISTRY: URLS.DEPLOYMENT.STAGING,
    API: `${URLS.DEPLOYMENT.STAGING}/api`,
    DASHBOARD: URLS.DEPLOYMENT.STAGING,
    MONITORING: URLS.ANALYTICS.HEALTH
  },
  development: {
    REGISTRY: URLS.DEVELOPMENT.LOCAL_SERVER,
    API: URLS.DEVELOPMENT.API_BASE,
    DASHBOARD: URLS.MONITORING.DASHBOARD,
    MONITORING: URLS.MONITORING.HEALTH
  }
} as const;

// Default environment
export const ENVIRONMENT = process.env.NODE_ENV || 'development';
export const CURRENT_URLS = ENVIRONMENT_URLS[ENVIRONMENT as keyof typeof ENVIRONMENT_URLS];

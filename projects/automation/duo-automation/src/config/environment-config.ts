// environment-config.ts - Environment-specific URL configuration
// Generated: 2026-01-15T23:18:00.000Z

export interface EnvironmentURLs {
  REGISTRY: {
    main: string;
    npm: string;
    packages: string;
    api: string;
    health: string;
    search: string;
  };
  STORAGE: {
    files: string;
    r2: string;
    apple: string;
  };
  EMAIL: {
    domain: string;
    support: string;
    registry: string;
  };
  WORKER: {
    origins: string[];
    headers: Record<string, string>;
  };
  DASHBOARDS: {
    apple: string;
    dev: string;
    analytics: string;
  };
}

const environments: Record<string, EnvironmentURLs> = {
  production: {
    REGISTRY: {
      main: 'https://factory-wager-registry.utahj4754.workers.dev',
      npm: 'https://factory-wager-registry.utahj4754.workers.dev/npm',
      packages: 'https://factory-wager-registry.utahj4754.workers.dev/packages',
      api: 'https://factory-wager-registry.utahj4754.workers.dev/api',
      health: 'https://factory-wager-registry.utahj4754.workers.dev/health',
      search: 'https://factory-wager-registry.utahj4754.workers.dev/-/v1/search'
    },
    STORAGE: {
      files: 'https://factory-wager-registry.utahj4754.workers.dev/files',
      r2: 'https://api.factory-wager.com/r2',
      apple: 'https://factory-wager-registry.utahj4754.workers.dev/apple'
    },
    EMAIL: {
      domain: 'factory-wager-registry.utahj4754.workers.dev',
      support: 'registry@factory-wager.com',
      registry: 'registry@factory-wager.com'
    },
    WORKER: {
      origins: [
        'https://factory-wager-registry.utahj4754.workers.dev',
        'https://api.factory-wager.com',
        'https://factory-wager.com'
      ],
      headers: {
        'X-Registry-Domain': 'factory-wager-registry.utahj4754.workers.dev',
        'X-Environment': 'production'
      }
    },
    DASHBOARDS: {
      apple: 'https://factory-wager-registry.utahj4754.workers.dev/apple',
      dev: 'https://factory-wager-registry.utahj4754.workers.dev/dev',
      analytics: 'https://factory-wager-registry.utahj4754.workers.dev/analytics'
    }
  },
  
  staging: {
    REGISTRY: {
      main: 'https://staging-registry.factory-wager.com',
      npm: 'https://staging-registry.factory-wager.com',
      packages: 'https://staging-packages.factory-wager.com',
      api: 'https://staging-api.factory-wager.com',
      health: 'https://staging-registry.factory-wager.com/health',
      search: 'https://staging-registry.factory-wager.com/-/v1/search'
    },
    STORAGE: {
      files: 'https://staging-files.factory-wager.com',
      r2: 'https://staging-api.factory-wager.com/r2',
      apple: 'https://staging-apple.factory-wager.com'
    },
    EMAIL: {
      domain: 'staging.factory-wager.com',
      support: 'staging@factory-wager.com',
      registry: 'staging-registry@factory-wager.com'
    },
    WORKER: {
      origins: [
        'https://staging-registry.factory-wager.com',
        'https://staging-api.factory-wager.com'
      ],
      headers: {
        'X-Registry-Domain': 'staging-registry.factory-wager.com',
        'X-Environment': 'staging'
      }
    },
    DASHBOARDS: {
      apple: 'https://staging-apple.factory-wager.com',
      dev: 'https://staging-dev.factory-wager.com',
      analytics: 'https://staging-analytics.factory-wager.com'
    }
  },
  
  development: {
    REGISTRY: {
      main: 'http://localhost:3000',
      npm: 'http://localhost:3000/npm',
      packages: 'http://localhost:3000/packages',
      api: 'http://localhost:3000/api',
      health: 'http://localhost:3000/health',
      search: 'http://localhost:3000/-/v1/search'
    },
    STORAGE: {
      files: 'http://localhost:3000/files',
      r2: 'http://localhost:3000/r2',
      apple: 'http://localhost:3000/apple'
    },
    EMAIL: {
      domain: 'localhost',
      support: 'dev@factory-wager.com',
      registry: 'dev-registry@factory-wager.com'
    },
    WORKER: {
      origins: [
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      headers: {
        'X-Registry-Domain': 'localhost:3000',
        'X-Environment': 'development'
      }
    },
    DASHBOARDS: {
      apple: 'http://localhost:3000/apple',
      dev: 'http://localhost:3000/dev',
      analytics: 'http://localhost:3000/analytics'
    }
  }
};

export function getUrl(category: keyof EnvironmentURLs, environment: string = process.env.NODE_ENV || 'development'): string {
  const env = environments[environment] || environments.development;
  
  switch (category) {
    case 'REGISTRY':
      return env.REGISTRY.main;
    case 'STORAGE':
      return env.STORAGE.files;
    case 'EMAIL':
      return env.EMAIL.domain;
    case 'WORKER':
      return env.WORKER.origins[0];
    case 'DASHBOARDS':
      return env.DASHBOARDS.apple;
    default:
      return env.REGISTRY.main;
  }
}

export function getEnvironmentConfig(environment: string = process.env.NODE_ENV || 'development'): EnvironmentURLs {
  return environments[environment] || environments.development;
}

export const currentConfig = getEnvironmentConfig();
export const environment = process.env.NODE_ENV || 'development';

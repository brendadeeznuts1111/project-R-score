// config/admin-dashboard-deployment.ts
/**
 * 🏭 Factory-Wager Admin Dashboard Deployment Configuration
 * 
 * Deployment settings for serving the admin dashboard from factory-wager.com
 * with SSL, security headers, and production optimizations.
 */

export interface AdminDashboardConfig {
  domain: string;
  subdomain: string;
  port: number;
  ssl: {
    enabled: boolean;
    certificatePath: string;
    privateKeyPath: string;
    caBundlePath?: string;
  };
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    enableRateLimit: boolean;
    maxRequestsPerMinute: number;
    allowedOrigins: string[];
    apiKeys: string[];
  };
  monitoring: {
    enableAnalytics: boolean;
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsEndpoint: string;
  };
  features: {
    enableRealTimeUpdates: boolean;
    enableWebSocketSupport: boolean;
    enableFileUploads: boolean;
    maxFileSize: number;
    enableBackups: boolean;
  };
  performance: {
    enableCompression: boolean;
    enableCaching: boolean;
    cacheTimeout: number;
    enableCDN: boolean;
    cdnUrl: string;
  };
}

export const adminDashboardConfig: AdminDashboardConfig = {
  domain: 'factory-wager.com',
  subdomain: 'admin',
  port: 3000,
  ssl: {
    enabled: true,
    certificatePath: '/etc/ssl/certs/factory-wager.com.crt',
    privateKeyPath: '/etc/ssl/private/factory-wager.com.key',
    caBundlePath: '/etc/ssl/certs/ca-bundle.crt'
  },
  security: {
    enableCSP: true,
    enableHSTS: true,
    enableRateLimit: true,
    maxRequestsPerMinute: 100,
    allowedOrigins: [
      'https://admin.factory-wager.com',
      'https://factory-wager.com',
      'https://registry.factory-wager.com'
    ],
    apiKeys: [
      process.env.ADMIN_API_KEY || 'your-production-api-key-here'
    ]
  },
  monitoring: {
    enableAnalytics: true,
    enableLogging: true,
    logLevel: 'info',
    metricsEndpoint: '/api/metrics'
  },
  features: {
    enableRealTimeUpdates: true,
    enableWebSocketSupport: true,
    enableFileUploads: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    enableBackups: true
  },
  performance: {
    enableCompression: true,
    enableCaching: true,
    cacheTimeout: 300, // 5 minutes
    enableCDN: true,
    cdnUrl: 'https://cdn.factory-wager.com'
  }
};

export interface NginxConfig {
  serverName: string;
  listenPort: number;
  sslConfig: {
    certificate: string;
    privateKey: string;
    protocols: string[];
    ciphers: string;
  };
  securityHeaders: {
    csp: string;
    hsts: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
  };
  proxyConfig: {
    upstream: string;
    proxyPass: string;
    proxySetHeaders: string[];
  };
  rateLimit: {
    zone: string;
    rate: string;
    burst: number;
  };
}

export const nginxConfig: NginxConfig = {
  serverName: 'admin.factory-wager.com',
  listenPort: 443,
  sslConfig: {
    certificate: '/etc/ssl/certs/factory-wager.com.crt',
    privateKey: '/etc/ssl/private/factory-wager.com.key',
    protocols: ['TLSv1.2', 'TLSv1.3'],
    ciphers: 'ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384'
  },
  securityHeaders: {
    csp: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.factory-wager.com; frame-ancestors 'none';",
    hsts: 'max-age=31536000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff'
  },
  proxyConfig: {
    upstream: 'admin_dashboard',
    proxyPass: 'http://localhost:3000',
    proxySetHeaders: [
      'Host $host',
      'X-Real-IP $remote_addr',
      'X-Forwarded-For $proxy_add_x_forwarded_for',
      'X-Forwarded-Proto $scheme'
    ]
  },
  rateLimit: {
    zone: 'admin_limit',
    rate: '10r/s',
    burst: 20
  }
};

export function generateNginxConfig(): string {
  return `
# Admin Dashboard - Factory-Wager
server {
    listen 443 ssl http2;
    server_name ${nginxConfig.serverName};
    
    # SSL Configuration
    ssl_certificate ${nginxConfig.sslConfig.certificate};
    ssl_certificate_key ${nginxConfig.sslConfig.privateKey};
    ssl_protocols ${nginxConfig.sslConfig.protocols.join(' ')};
    ssl_ciphers ${nginxConfig.sslConfig.ciphers};
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Content-Security-Policy "${nginxConfig.securityHeaders.csp}";
    add_header Strict-Transport-Security "${nginxConfig.securityHeaders.hsts}";
    add_header X-Frame-Options "${nginxConfig.securityHeaders.xFrameOptions}";
    add_header X-Content-Type-Options "${nginxConfig.securityHeaders.xContentTypeOptions}";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=${nginxConfig.rateLimit.zone}:${nginxConfig.rateLimit.rate};
    limit_req zone=${nginxConfig.rateLimit.zone} burst=${nginxConfig.rateLimit.burst} nodelay;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static File Caching
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "STATIC";
    }
    
    # API Proxy
    location /api/ {
        proxy_pass ${nginxConfig.proxyConfig.proxyPass};
        ${nginxConfig.proxyConfig.proxySetHeaders.map(header => `proxy_set_header ${header};`).join('\n        ')}
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # API Rate Limiting
        limit_req zone=api_limit burst=50 nodelay;
    }
    
    # WebSocket Support
    location /ws {
        proxy_pass ${nginxConfig.proxyConfig.proxyPass};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        ${nginxConfig.proxyConfig.proxySetHeaders.map(header => `proxy_set_header ${header};`).join('\n        ')}
    }
    
    # Main Application
    location / {
        proxy_pass ${nginxConfig.proxyConfig.proxyPass};
        ${nginxConfig.proxyConfig.proxySetHeaders.map(header => `proxy_set_header ${header};`).join('\n        ')}
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Health Check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 30s;
    }
    
    # Health Check Endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # Security - Block common attacks
    location ~* \\.(aspx|php|jsp|cgi)$ {
        deny all;
    }
    
    # Logging
    access_log /var/log/nginx/admin.factory-wager.com.access.log;
    error_log /var/log/nginx/admin.factory-wager.com.error.log;
}

# HTTP to HTTPS Redirect
server {
    listen 80;
    server_name admin.factory-wager.com;
    return 301 https://$server_name$request_uri;
}

# Wildcard subdomain redirect
server {
    listen 443 ssl http2;
    server_name *.factory-wager.com;
    
    # SSL Configuration (same as above)
    ssl_certificate ${nginxConfig.sslConfig.certificate};
    ssl_certificate_key ${nginxConfig.sslConfig.privateKey};
    
    # Redirect admin subdomain variations
    location / {
        if ($host ~* ^admin\\-.*\\.factory-wager\\.com$) {
            return 301 https://admin.factory-wager.com$request_uri;
        }
        return 404;
    }
}
`;
}

export interface DockerComposeConfig {
  version: string;
  services: {
    adminDashboard: {
      image: string;
      containerName: string;
      ports: number[];
      environment: Record<string, string>;
      volumes: string[];
      restart: string;
      networks: string[];
    };
    nginx: {
      image: string;
      containerName: string;
      ports: number[];
      volumes: string[];
      dependsOn: string[];
      restart: string;
      networks: string[];
    };
  };
  networks: {
    factoryWager: {
      driver: string;
    };
  };
}

export const dockerComposeConfig: DockerComposeConfig = {
  version: '3.8',
  services: {
    adminDashboard: {
      image: 'factory-wager/admin-dashboard:latest',
      containerName: 'factory-wager-admin',
      ports: [3000],
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'your-production-api-key',
        LOG_LEVEL: 'info'
      },
      volumes: [
        './logs:/app/logs',
        './config:/app/config:ro',
        './ssl:/app/ssl:ro'
      ],
      restart: 'unless-stopped',
      networks: ['factoryWager']
    },
    nginx: {
      image: 'nginx:alpine',
      containerName: 'factory-wager-nginx',
      ports: [80, 443],
      volumes: [
        './nginx/nginx.conf:/etc/nginx/nginx.conf:ro',
        './nginx/ssl:/etc/ssl:ro',
        './logs/nginx:/var/log/nginx'
      ],
      dependsOn: ['adminDashboard'],
      restart: 'unless-stopped',
      networks: ['factoryWager']
    }
  },
  networks: {
    factoryWager: {
      driver: 'bridge'
    }
  }
};

export function generateDockerCompose(): string {
  return `
version: '${dockerComposeConfig.version}'

services:
  admin-dashboard:
    image: ${dockerComposeConfig.services.adminDashboard.image}
    container_name: ${dockerComposeConfig.services.adminDashboard.containerName}
    ports:
      - "${dockerComposeConfig.services.adminDashboard.ports[0]}:${dockerComposeConfig.services.adminDashboard.ports[0]}"
    environment:
${Object.entries(dockerComposeConfig.services.adminDashboard.environment).map(([key, value]) => `      ${key}: ${value}`).join('\n')}
    volumes:
${dockerComposeConfig.services.adminDashboard.volumes.map(vol => `      - ${vol}`).join('\n')}
    restart: ${dockerComposeConfig.services.adminDashboard.restart}
    networks:
      - ${dockerComposeConfig.services.adminDashboard.networks[0]}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: ${dockerComposeConfig.services.nginx.image}
    container_name: ${dockerComposeConfig.services.nginx.containerName}
    ports:
      - "${dockerComposeConfig.services.nginx.ports[0]}:80"
      - "${dockerComposeConfig.services.nginx.ports[1]}:443"
    volumes:
${dockerComposeConfig.services.nginx.volumes.map(vol => `      - ${vol}`).join('\n')}
    depends_on:
      - ${dockerComposeConfig.services.nginx.dependsOn[0]}
    restart: ${dockerComposeConfig.services.nginx.restart}
    networks:
      - ${dockerComposeConfig.services.nginx.networks[0]}

networks:
  ${dockerComposeConfig.networks.factoryWager.driver}:
    driver: ${dockerComposeConfig.networks.factoryWager.driver}
`;
}

export interface DeploymentScript {
  name: string;
  description: string;
  commands: string[];
  environment: Record<string, string>;
  rollback: string[];
}

export const deploymentScripts: DeploymentScript[] = [
  {
    name: 'deploy-admin-dashboard',
    description: 'Deploy the admin dashboard to production',
    commands: [
      '#!/bin/bash',
      'set -e',
      '',
      'echo "🏭 Deploying Factory-Wager Admin Dashboard..."',
      '',
      '# Backup current deployment',
      'docker-compose down || true',
      'docker save factory-wager/admin-dashboard:latest > backup-admin-$(date +%Y%m%d-%H%M%S).tar || true',
      '',
      '# Pull latest image',
      'docker pull factory-wager/admin-dashboard:latest',
      '',
      '# Update configuration',
      'cp nginx/nginx.conf.prod nginx/nginx.conf',
      '',
      '# Start services',
      'docker-compose up -d',
      '',
      '# Wait for services to be ready',
      'sleep 30',
      '',
      '# Health check',
      'curl -f https://admin.factory-wager.com/health || exit 1',
      'curl -f https://admin.factory-wager.com/api/system/status || exit 1',
      '',
      'echo "✅ Admin Dashboard deployed successfully!"',
      'echo "🌐 Available at: https://admin.factory-wager.com"'
    ],
    environment: {
      NODE_ENV: 'production',
      DEPLOYMENT_ENV: 'production'
    },
    rollback: [
      '#!/bin/bash',
      'set -e',
      '',
      'echo "🔄 Rolling back Admin Dashboard..."',
      '',
      'docker-compose down',
      'docker load < backup-admin-*.tar',
      'docker-compose up -d',
      '',
      'echo "✅ Rollback completed!"'
    ]
  },
  {
    name: 'update-ssl-certificates',
    description: 'Update SSL certificates for the admin dashboard',
    commands: [
      '#!/bin/bash',
      'set -e',
      '',
      'echo "🔒 Updating SSL certificates..."',
      '',
      '# Backup current certificates',
      'cp -r /etc/ssl/certs/factory-wager.com.crt backup/$(date +%Y%m%d-%H%M%S)-factory-wager.crt',
      'cp -r /etc/ssl/private/factory-wager.com.key backup/$(date +%Y%m%d-%H%M%S)-factory-wager.key',
      '',
      '# Install new certificates',
      'certbot certonly --webroot -w /var/www/html -d admin.factory-wager.com --non-interactive --agree-tos --email admin@factory-wager.com',
      '',
      '# Update nginx configuration',
      'cp /etc/letsencrypt/live/admin.factory-wager.com/fullchain.pem /etc/ssl/certs/factory-wager.com.crt',
      'cp /etc/letsencrypt/live/admin.factory-wager.com/privkey.pem /etc/ssl/private/factory-wager.com.key',
      '',
      '# Reload nginx',
      'docker-compose exec nginx nginx -s reload',
      '',
      'echo "✅ SSL certificates updated!"'
    ],
    environment: {
      CERTBOT_EMAIL: 'admin@factory-wager.com'
    },
    rollback: [
      '#!/bin/bash',
      'set -e',
      '',
      'echo "🔄 Rolling back SSL certificates..."',
      '',
      'cp backup/*factory-wager.crt /etc/ssl/certs/factory-wager.com.crt',
      'cp backup/*factory-wager.key /etc/ssl/private/factory-wager.com.key',
      'docker-compose exec nginx nginx -s reload',
      '',
      'echo "✅ SSL rollback completed!"'
    ]
  }
];

export function generateDeploymentScript(scriptName: string): string {
  const script = deploymentScripts.find(s => s.name === scriptName);
  if (!script) {
    throw new Error(`Deployment script '${scriptName}' not found`);
  }
  
  return script.commands.join('\n');
}

// Export all configurations
export {
  adminDashboardConfig,
  nginxConfig,
  dockerComposeConfig,
  deploymentScripts
};

// Default export
export default {
  config: adminDashboardConfig,
  nginx: nginxConfig,
  docker: dockerComposeConfig,
  scripts: deploymentScripts
};

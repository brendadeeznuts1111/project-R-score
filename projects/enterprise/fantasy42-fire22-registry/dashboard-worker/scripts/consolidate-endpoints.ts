#!/usr/bin/env bun

/**
 * Fire22 Endpoint Consolidation Script
 *
 * Helps consolidate scattered endpoints into organized route files
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface EndpointInfo {
  path: string;
  method: string;
  handler: string;
  permissions?: string[];
  category: 'auth' | 'admin' | 'manager' | 'customer' | 'financial' | 'health' | 'other';
  sourceFile: string;
  lineNumber?: number;
}

class EndpointConsolidator {
  private endpoints: EndpointInfo[] = [];
  private srcPath = join(process.cwd(), 'src');
  private apiPath = join(this.srcPath, 'api');

  async consolidate() {
    console.log('🚀 Fire22 Endpoint Consolidation Tool');
    console.log('!==!==!==!==!==!==!==\n');

    // Step 1: Scan for endpoints
    console.log('📍 Step 1: Scanning for endpoints...');
    await this.scanEndpoints();

    // Step 2: Categorize endpoints
    console.log('📊 Step 2: Categorizing endpoints...');
    this.categorizeEndpoints();

    // Step 3: Create directory structure
    console.log('📁 Step 3: Creating directory structure...');
    this.createDirectoryStructure();

    // Step 4: Generate route files
    console.log('✍️ Step 4: Generating route files...');
    await this.generateRouteFiles();

    // Step 5: Generate main router
    console.log('🔧 Step 5: Creating main router...');
    await this.generateMainRouter();

    // Step 6: Generate migration guide
    console.log('📚 Step 6: Creating migration guide...');
    await this.generateMigrationGuide();

    console.log('\n✅ Consolidation complete!');
    console.log(`📊 Total endpoints found: ${this.endpoints.length}`);
    this.printSummary();
  }

  private async scanEndpoints() {
    // Scan index.ts for Cloudflare endpoints
    const indexContent = readFileSync(join(this.srcPath, 'index.ts'), 'utf-8');
    const indexEndpoints = this.extractEndpointsFromCloudflare(indexContent, 'index.ts');

    // Scan server.js for Express endpoints
    const serverContent = readFileSync(join(process.cwd(), 'server.js'), 'utf-8');
    const serverEndpoints = this.extractEndpointsFromExpress(serverContent, 'server.js');

    this.endpoints = [...indexEndpoints, ...serverEndpoints];

    // Remove duplicates
    const seen = new Set<string>();
    this.endpoints = this.endpoints.filter(ep => {
      const key = `${ep.method}:${ep.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`   Found ${this.endpoints.length} unique endpoints`);
  }

  private extractEndpointsFromCloudflare(content: string, fileName: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Pattern: if (url.pathname === '/api/...' && req.method === '...')
      const match = line.match(
        /if\s*\(url\.pathname\s*===\s*['"]([^'"]+)['"]\s*&&\s*req\.method\s*===\s*['"]([^'"]+)['"]/
      );
      if (match) {
        const [_, path, method] = match;
        endpoints.push({
          path,
          method,
          handler: `handler_line_${index + 1}`,
          category: this.categorizeEndpoint(path),
          sourceFile: fileName,
          lineNumber: index + 1,
        });
      }

      // Pattern without method: if (url.pathname === '/api/...')
      const simpleMatch = line.match(/if\s*\(url\.pathname\s*===\s*['"]([^'"]+)['"]\)/);
      if (simpleMatch && simpleMatch[1].startsWith('/api/')) {
        endpoints.push({
          path: simpleMatch[1],
          method: 'GET', // Default to GET
          handler: `handler_line_${index + 1}`,
          category: this.categorizeEndpoint(simpleMatch[1]),
          sourceFile: fileName,
          lineNumber: index + 1,
        });
      }
    });

    return endpoints;
  }

  private extractEndpointsFromExpress(content: string, fileName: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Pattern: app.method('/api/...',
      const match = line.match(/app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/);
      if (match) {
        const [_, method, path] = match;
        endpoints.push({
          path,
          method: method.toUpperCase(),
          handler: `handler_line_${index + 1}`,
          category: this.categorizeEndpoint(path),
          sourceFile: fileName,
          lineNumber: index + 1,
        });
      }
    });

    return endpoints;
  }

  private categorizeEndpoint(path: string): EndpointInfo['category'] {
    if (path.includes('/auth/')) return 'auth';
    if (path.includes('/admin/')) return 'admin';
    if (path.includes('/manager/')) return 'manager';
    if (path.includes('/customer/')) return 'customer';
    if (path.includes('/withdrawal') || path.includes('/deposit') || path.includes('/queue/'))
      return 'financial';
    if (path.includes('/health') || path.includes('/test')) return 'health';
    return 'other';
  }

  private categorizeEndpoints() {
    // Add permissions based on endpoint path
    this.endpoints = this.endpoints.map(ep => {
      const permissions = this.getPermissionsForEndpoint(ep);
      return { ...ep, permissions };
    });
  }

  private getPermissionsForEndpoint(endpoint: EndpointInfo): string[] {
    const { path, category } = endpoint;

    if (category === 'auth') return []; // Public
    if (category === 'health') return []; // Public

    if (category === 'admin') {
      if (path.includes('settle')) return ['admin.wager.settle'];
      if (path.includes('customer')) return ['admin.customer.manage'];
      if (path.includes('deposit')) return ['admin.financial.deposit'];
      if (path.includes('sync')) return ['admin.system.sync'];
      return ['admin.*'];
    }

    if (category === 'manager') {
      if (path.includes('getLiveWagers')) return ['manager.wager.view_live'];
      if (path.includes('getCustomers')) return ['manager.customer.list'];
      if (path.includes('getAgentPerformance')) return ['manager.agent.performance'];
      if (path.includes('getWeeklyFigure')) return ['manager.reports.weekly'];
      return ['manager.*'];
    }

    if (category === 'customer') {
      return ['customer.*'];
    }

    if (category === 'financial') {
      if (path.includes('withdrawal/request')) return ['customer.withdrawal.request'];
      if (path.includes('withdrawal/approve')) return ['admin.withdrawal.approve'];
      return ['financial.*'];
    }

    return ['authenticated'];
  }

  private createDirectoryStructure() {
    const dirs = [
      this.apiPath,
      join(this.apiPath, 'routes'),
      join(this.apiPath, 'middleware'),
      join(this.apiPath, 'controllers'),
      join(this.apiPath, 'schemas'),
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`   Created: ${dir}`);
      }
    });
  }

  private async generateRouteFiles() {
    const categories = [...new Set(this.endpoints.map(ep => ep.category))];

    for (const category of categories) {
      const categoryEndpoints = this.endpoints.filter(ep => ep.category === category);
      const routeFile = this.generateRouteFile(category, categoryEndpoints);
      const fileName = join(this.apiPath, 'routes', `${category}.routes.ts`);

      writeFileSync(fileName, routeFile);
      console.log(`   Generated: ${fileName} (${categoryEndpoints.length} endpoints)`);
    }
  }

  private generateRouteFile(category: string, endpoints: EndpointInfo[]): string {
    return `/**
 * Fire22 ${category.charAt(0).toUpperCase() + category.slice(1)} Routes
 * Auto-generated by consolidation script
 */

import { Router } from 'itty-router';
import { validate } from '../middleware/validate.middleware';
import { authorize } from '../middleware/authorize.middleware';
import * as controller from '../controllers/${category}.controller';
import * as schemas from '@fire22/validator/schemas';

const router = Router({ base: '/${category}' });

${endpoints.map(ep => this.generateRoute(ep)).join('\n\n')}

export const ${category}Routes = router;
`;
  }

  private generateRoute(endpoint: EndpointInfo): string {
    const routePath = endpoint.path.replace(`/api/${endpoint.category}/`, '');
    const handlerName = this.getHandlerName(routePath);
    const permissions = endpoint.permissions?.length
      ? `\n  authorize(${JSON.stringify(endpoint.permissions)}),`
      : '';

    return `// ${endpoint.path} (from ${endpoint.sourceFile}:${endpoint.lineNumber})
router.${endpoint.method.toLowerCase()}('/${routePath}',${permissions}
  controller.${handlerName}
);`;
  }

  private getHandlerName(path: string): string {
    // Convert path to camelCase handler name
    return path
      .split('/')
      .filter(Boolean)
      .map((part, index) => {
        if (index === 0) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join('')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private async generateMainRouter() {
    const categories = [...new Set(this.endpoints.map(ep => ep.category))];

    const mainRouter = `/**
 * Fire22 API Main Router
 * Auto-generated by consolidation script
 */

import { Router } from 'itty-router';
import { authenticate } from './middleware/auth.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
${categories.map(cat => `import { ${cat}Routes } from './routes/${cat}.routes';`).join('\n')}

const api = Router({ base: '/api' });

// Apply global middleware
api.all('*', rateLimiter());

// Public routes (no authentication)
api.all('/auth/*', authRoutes.handle);
api.all('/health/*', healthRoutes.handle);

// Protected routes (require authentication)
api.all('*', authenticate);

// Role-based routes
${categories
  .filter(cat => !['auth', 'health'].includes(cat))
  .map(cat => `api.all('/${cat}/*', ${cat}Routes.handle);`)
  .join('\n')}

// 404 handler
api.all('*', () => new Response('Not Found', { status: 404 }));

export default api;
`;

    const fileName = join(this.apiPath, 'index.ts');
    writeFileSync(fileName, mainRouter);
    console.log(`   Generated: ${fileName}`);
  }

  private async generateMigrationGuide() {
    const guide = `# Fire22 Endpoint Migration Guide

## Endpoints Consolidated

Total endpoints found: ${this.endpoints.length}

### By Category:
${[...new Set(this.endpoints.map(ep => ep.category))]
  .map(cat => {
    const count = this.endpoints.filter(ep => ep.category === cat).length;
    return `- **${cat}**: ${count} endpoints`;
  })
  .join('\n')}

### By Source:
${[...new Set(this.endpoints.map(ep => ep.sourceFile))]
  .map(file => {
    const count = this.endpoints.filter(ep => ep.sourceFile === file).length;
    return `- **${file}**: ${count} endpoints`;
  })
  .join('\n')}

## Endpoint Details

${this.endpoints
  .map(
    ep => `
### ${ep.method} ${ep.path}
- **Category**: ${ep.category}
- **Source**: ${ep.sourceFile}:${ep.lineNumber}
- **Permissions**: ${ep.permissions?.join(', ') || 'None (Public)'}
`
  )
  .join('\n')}

## Migration Steps

1. Review generated route files in \`/src/api/routes/\`
2. Implement controllers in \`/src/api/controllers/\`
3. Copy business logic from source files to controllers
4. Test each endpoint after migration
5. Update main application to use new router

## Testing

Run tests after migration:
\`\`\`bash
bun test src/api/**/*.test.ts
\`\`\`

Generated: ${new Date().toISOString()}
`;

    const fileName = join(this.apiPath, 'MIGRATION_GUIDE.md');
    writeFileSync(fileName, guide);
    console.log(`   Generated: ${fileName}`);
  }

  private printSummary() {
    const byCategory = new Map<string, number>();
    const byMethod = new Map<string, number>();

    this.endpoints.forEach(ep => {
      byCategory.set(ep.category, (byCategory.get(ep.category) || 0) + 1);
      byMethod.set(ep.method, (byMethod.get(ep.method) || 0) + 1);
    });

    console.log('\n📊 Summary:');
    console.log('\nBy Category:');
    byCategory.forEach((count, cat) => {
      console.log(`   ${cat}: ${count} endpoints`);
    });

    console.log('\nBy Method:');
    byMethod.forEach((count, method) => {
      console.log(`   ${method}: ${count} endpoints`);
    });

    console.log('\n📁 Generated Files:');
    console.log(`   - ${byCategory.size} route files`);
    console.log(`   - 1 main router`);
    console.log(`   - 1 migration guide`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Review generated files in /src/api/');
    console.log('   2. Implement controller logic');
    console.log('   3. Add validation schemas');
    console.log('   4. Test migrated endpoints');
    console.log('   5. Remove old endpoint code');
  }
}

// CLI interface
async function main() {
  const consolidator = new EndpointConsolidator();

  try {
    await consolidator.consolidate();
  } catch (error) {
    console.error('❌ Consolidation failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { EndpointConsolidator };

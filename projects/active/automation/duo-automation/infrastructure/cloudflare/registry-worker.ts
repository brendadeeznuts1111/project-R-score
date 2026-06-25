// infrastructure/cloudflare/registry-worker.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  main: string;
  types: string;
  exports: Record<string, any>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface PackageUpload {
  metadata: PackageMetadata;
  tarball: ArrayBuffer;
}

const app = new Hono<{ Bindings: {
  REGISTRY_BUCKET: R2Bucket;
  PACKAGES_BUCKET: R2Bucket;
  METADATA_BUCKET: R2Bucket;
  REGISTRY_AUTH_TOKEN: string;
} }>();

// Middleware
app.use('*', cors({
  origin: ['https://factory-wager.com', 'https://registry.factory-wager.com', 'https://registry.factory-wager.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger());

// Factory Wager branding headers
app.use('*', async (c, next) => {
  c.header('X-Powered-By', 'Factory Wager Registry');
  c.header('X-Registry-Organization', 'Factory Wager');
  c.header('X-Registry-Version', '1.0.0');
  c.header('X-Registry-Domain', 'registry.factory-wager.com');
  await next();
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Factory Wager Enterprise Registry',
    version: '1.0.0',
    organization: 'Factory Wager',
    website: 'https://factory-wager.com',
    timestamp: new Date().toISOString(),
    uptime: Date.now()
  });
});

// Registry root
app.get('/', (c) => {
  return c.json({
    name: 'Factory Wager Enterprise Registry',
    description: 'Premium npm-compatible registry for DuoPlus components',
    version: '1.0.0',
    organization: 'Factory Wager',
    website: 'https://factory-wager.com',
    support: 'mailto:registry@factory-wager.com',
    registry: 'https://registry.factory-wager.com',
    endpoints: {
      health: '/health',
      packages: '/@duoplus/:package',
      download: '/@duoplus/:package/-/:filename',
      search: '/-/v1/search'
    },
    domains: {
      registry: 'https://registry.factory-wager.com',
      npm: 'https://registry.factory-wager.com',
      packages: 'https://packages.factory-wager.com',
      duoplus: 'https://duoplus.factory-wager.com'
    }
  });
});

// Get package metadata
app.get('/@duoplus/:package', async (c) => {
  const packageName = c.req.param('package');
  
  try {
    // Get latest version metadata
    const latestKey = `@duoplus/${packageName}/latest/package.json`;
    const latestObject = await c.env.METADATA_BUCKET.get(latestKey);
    
    if (!latestObject) {
      return c.json({ error: 'Package not found' }, 404);
    }
    
    const latestMetadata = JSON.parse(await latestObject.text());
    
    // Get all versions
    const versionsKey = `@duoplus/${packageName}/versions.json`;
    const versionsObject = await c.env.METADATA_BUCKET.get(versionsKey);
    
    let versions = {};
    if (versionsObject) {
      versions = JSON.parse(await versionsObject.text());
    }
    
    return c.json({
      name: latestMetadata.name,
      description: latestMetadata.description,
      'dist-tags': {
        latest: latestMetadata.version
      },
      versions
    });
  } catch (error) {
    console.error('Error fetching package metadata:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get specific version metadata
app.get('/@duoplus/:package/:version', async (c) => {
  const packageName = c.req.param('package');
  const version = c.req.param('version');
  
  try {
    const key = `@duoplus/${packageName}/${version}/package.json`;
    const object = await c.env.METADATA_BUCKET.get(key);
    
    if (!object) {
      return c.json({ error: 'Package version not found' }, 404);
    }
    
    const metadata = JSON.parse(await object.text());
    
    // Add dist information
    const tarballName = `${packageName}-${version}.tgz`;
    metadata.dist = {
      tarball: `https://registry.duoplus.com/@duoplus/${packageName}/-/${tarballName}`,
      shasum: await calculateSHA1(tarballName),
      integrity: await calculateIntegrity(tarballName)
    };
    
    return c.json(metadata);
  } catch (error) {
    console.error('Error fetching package version:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Download package tarball
app.get('/@duoplus/:package/-/:filename', async (c) => {
  const packageName = c.req.param('package');
  const filename = c.req.param('filename');
  
  try {
    const key = `@duoplus/${packageName}/${filename}`;
    const object = await c.env.PACKAGES_BUCKET.get(key);
    
    if (!object) {
      return c.json({ error: 'Package file not found' }, 404);
    }
    
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Length', object.size.toString());
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error downloading package:', error);
    return c.json({ error: 'Download failed' }, 500);
  }
});

// Publish package
app.put('/@duoplus/:package', async (c) => {
  const packageName = c.req.param('package');
  const authToken = c.req.header('authorization');
  
  // Validate auth token
  if (!authToken || !validateAuthToken(authToken, c.env.REGISTRY_AUTH_TOKEN)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    const body = await c.req.text();
    const uploadData: PackageUpload = JSON.parse(body);
    
    // Validate package data
    if (!uploadData.metadata || !uploadData.tarball) {
      return c.json({ error: 'Invalid package data' }, 400);
    }
    
    const version = uploadData.metadata.version;
    const tarballName = `${packageName}-${version}.tgz`;
    
    // Store package tarball
    await c.env.PACKAGES_BUCKET.put(
      `@duoplus/${packageName}/${tarballName}`,
      uploadData.tarball
    );
    
    // Store package metadata
    await c.env.METADATA_BUCKET.put(
      `@duoplus/${packageName}/${version}/package.json`,
      JSON.stringify(uploadData.metadata)
    );
    
    // Update latest symlink
    await c.env.METADATA_BUCKET.put(
      `@duoplus/${packageName}/latest/package.json`,
      JSON.stringify(uploadData.metadata)
    );
    
    // Update versions list
    await updateVersionsList(packageName, version, c.env.METADATA_BUCKET);
    
    return c.json({
      success: true,
      package: packageName,
      version: version,
      url: `https://registry.duoplus.com/@duoplus/${packageName}/${version}`
    });
  } catch (error) {
    console.error('Error publishing package:', error);
    return c.json({ error: 'Publish failed' }, 500);
  }
});

// Search packages
app.get('/-/v1/search', async (c) => {
  const text = c.req.query('text') || '';
  const size = parseInt(c.req.query('size') || '20');
  const from = parseInt(c.req.query('from') || '0');
  
  try {
    // Get all packages
    const packages = await getAllPackages(c.env.METADATA_BUCKET);
    
    // Filter by search text
    const filtered = packages.filter(pkg => 
      pkg.name.toLowerCase().includes(text.toLowerCase()) ||
      pkg.description.toLowerCase().includes(text.toLowerCase())
    );
    
    // Paginate results
    const paginated = filtered.slice(from, from + size);
    
    return c.json({
      objects: paginated.map(pkg => ({
        name: pkg.name,
        description: pkg.description,
        version: pkg.version,
        date: pkg.date
      })),
      total: filtered.length,
      from: from,
      size: size
    });
  } catch (error) {
    console.error('Error searching packages:', error);
    return c.json({ error: 'Search failed' }, 500);
  }
});

// Helper functions
function validateAuthToken(token: string, expectedToken: string): boolean {
  return token === `Bearer ${expectedToken}`;
}

async function calculateSHA1(filename: string): Promise<string> {
  // In a real implementation, you would calculate the actual SHA1
  // For now, return a placeholder
  return 'sha1-placeholder';
}

async function calculateIntegrity(filename: string): Promise<string> {
  // In a real implementation, you would calculate the actual integrity hash
  // For now, return a placeholder
  return 'sha512-placeholder';
}

async function updateVersionsList(packageName: string, version: string, bucket: R2Bucket) {
  const versionsKey = `@duoplus/${packageName}/versions.json`;
  
  let versions: Record<string, any> = {};
  
  try {
    const existing = await bucket.get(versionsKey);
    if (existing) {
      versions = JSON.parse(await existing.text());
    }
  } catch (error) {
    // File doesn't exist, start with empty object
  }
  
  // Add new version
  versions[version] = {
    name: packageName,
    version: version,
    date: new Date().toISOString()
  };
  
  // Save updated versions
  await bucket.put(versionsKey, JSON.stringify(versions));
}

async function getAllPackages(bucket: R2Bucket): Promise<Array<{
  name: string;
  description: string;
  version: string;
  date: string;
}>> {
  const packages = [];
  
  try {
    // List all package directories
    const list = await bucket.list({
      prefix: '@duoplus/',
      delimiter: '/'
    });
    
    for (const prefix of list.prefixes) {
      const packageName = prefix.replace('@duoplus/', '').replace('/', '');
      
      try {
        // Get latest metadata
        const latestKey = `@duoplus/${packageName}/latest/package.json`;
        const latestObject = await bucket.get(latestKey);
        
        if (latestObject) {
          const metadata = JSON.parse(await latestObject.text());
          packages.push({
            name: metadata.name,
            description: metadata.description,
            version: metadata.version,
            date: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error reading package ${packageName}:`, error);
      }
    }
  } catch (error) {
    console.error('Error listing packages:', error);
  }
  
  return packages;
}

export default app;

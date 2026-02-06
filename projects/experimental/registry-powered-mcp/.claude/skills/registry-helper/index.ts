/**
 * Registry Helper Skill
 * MCP registry package lookup and version resolution
 *
 * Routes:
 * - GET /mcp/skills/registry/lookup - Look up package information
 * - GET /mcp/skills/registry/resolve/:package - Resolve package version
 */

/**
 * Handle package lookup requests
 */
export async function handleLookup(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const packageName = url.searchParams.get('name');

  if (!packageName) {
    return new Response(JSON.stringify({
      error: 'Missing package name',
      usage: '/mcp/skills/registry/lookup?name=package-name'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Mock response for demonstration
  return new Response(JSON.stringify({
    name: packageName,
    versions: ['1.0.0', '1.1.0', '2.0.0'],
    latest: '2.0.0',
    description: `Package ${packageName} from MCP registry`,
    registry: 'mcp-registry-core'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle package version resolution
 */
export async function handleResolve(
  request: Request,
  params: Record<string, string>
): Promise<Response> {
  const packageName = params.package;

  if (!packageName) {
    return new Response(JSON.stringify({
      error: 'Missing package parameter'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Mock resolution response
  return new Response(JSON.stringify({
    name: packageName,
    resolved: '2.0.0',
    integrity: 'sha256-abc123...',
    dependencies: {
      '@types/node': '^20.0.0'
    },
    peerDependencies: {}
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

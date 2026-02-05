/**
 * 🔥 Fire22 Release Management - Durable Object
 * Manages version control, release history, and deployment tracking
 */

export interface Release {
  version: string;
  timestamp: string;
  author: string;
  changes: Change[];
  build: BuildInfo;
  deployment: DeploymentInfo;
  metrics?: ReleaseMetrics;
}

export interface Change {
  type: 'feature' | 'fix' | 'enhancement' | 'breaking' | 'security';
  category: string;
  description: string;
  issueNumber?: string;
  prNumber?: string;
}

export interface BuildInfo {
  hash: string;
  size: number;
  duration: number;
  artifacts: string[];
  environment: string;
}

export interface DeploymentInfo {
  status: 'pending' | 'in-progress' | 'success' | 'failed' | 'rolled-back';
  startTime?: string;
  endTime?: string;
  regions?: string[];
  errors?: string[];
}

export interface ReleaseMetrics {
  downloads?: number;
  activeInstalls?: number;
  errorRate?: number;
  performanceScore?: number;
}

export class ReleaseManager {
  private state: DurableObjectState;
  private env: any;
  private websockets: Set<WebSocket>;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.websockets = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle WebSocket upgrade for live release notifications
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    try {
      switch (path) {
        case '/api/releases/current':
          return this.getCurrentRelease();

        case '/api/releases/history':
          return this.getReleaseHistory(url);

        case '/api/releases/publish':
          return this.publishRelease(request);

        case '/api/releases/rollback':
          return this.rollbackRelease(request);

        case '/api/releases/metrics':
          return this.getReleaseMetrics(url);

        case '/api/releases/compare':
          return this.compareReleases(url);

        case '/api/releases/changelog':
          return this.generateChangelog(url);

        case '/api/releases/validate':
          return this.validateRelease(request);

        case '/api/releases/schedule':
          return this.scheduleRelease(request);

        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Release manager error:', error);
      return Response.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * Get the current active release
   */
  private async getCurrentRelease(): Promise<Response> {
    const current = await this.state.storage.get<Release>('current-release');

    if (!current) {
      return Response.json({
        version: '0.0.0',
        message: 'No release deployed yet',
      });
    }

    // Add runtime metrics
    const metrics = await this.state.storage.get<ReleaseMetrics>(`metrics-${current.version}`);
    if (metrics) {
      current.metrics = metrics;
    }

    return Response.json(current);
  }

  /**
   * Get release history with pagination
   */
  private async getReleaseHistory(url: URL): Promise<Response> {
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const filter = url.searchParams.get('filter'); // feature, fix, etc.

    const releases = await this.state.storage.list<Release>({
      prefix: 'release-',
      limit,
      start: `release-${offset}`,
    });

    let history = Array.from(releases.entries()).map(([key, value]) => ({
      ...value,
      key: key.replace('release-', ''),
    }));

    // Apply filter if specified
    if (filter) {
      history = history.filter(release => release.changes.some(change => change.type === filter));
    }

    // Sort by version (semantic versioning)
    history.sort((a, b) => this.compareVersions(b.version, a.version));

    return Response.json({
      releases: history,
      total: releases.size,
      limit,
      offset,
    });
  }

  /**
   * Publish a new release
   */
  private async publishRelease(request: Request): Promise<Response> {
    const release: Release = await request.json();

    // Validate release data
    const validation = this.validateReleaseData(release);
    if (!validation.valid) {
      return Response.json(
        { error: 'Invalid release data', issues: validation.issues },
        { status: 400 }
      );
    }

    // Check version doesn't already exist
    const existing = await this.state.storage.get(`release-${release.version}`);
    if (existing) {
      return Response.json({ error: `Release ${release.version} already exists` }, { status: 409 });
    }

    // Add metadata
    release.timestamp = new Date().toISOString();
    release.deployment = {
      status: 'pending',
      startTime: new Date().toISOString(),
    };

    // Store the release
    await this.state.storage.put(`release-${release.version}`, release);

    // Update current if this is the latest
    const current = await this.state.storage.get<Release>('current-release');
    if (!current || this.compareVersions(release.version, current.version) > 0) {
      await this.state.storage.put('current-release', release);
      await this.state.storage.put('previous-release', current);
    }

    // Broadcast to connected clients
    this.broadcast({
      type: 'release-published',
      release,
    });

    // Schedule deployment
    await this.scheduleDeployment(release);

    return Response.json({
      success: true,
      release,
      message: `Release ${release.version} published successfully`,
    });
  }

  /**
   * Rollback to a previous release
   */
  private async rollbackRelease(request: Request): Promise<Response> {
    const { version, reason } = await request.json();

    // Get the target release
    const targetRelease = await this.state.storage.get<Release>(`release-${version}`);
    if (!targetRelease) {
      return Response.json({ error: `Release ${version} not found` }, { status: 404 });
    }

    // Store current as rolled-back
    const current = await this.state.storage.get<Release>('current-release');
    if (current) {
      current.deployment.status = 'rolled-back';
      await this.state.storage.put(`release-${current.version}`, current);
    }

    // Set target as current
    targetRelease.deployment = {
      status: 'success',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
    };
    await this.state.storage.put('current-release', targetRelease);

    // Log rollback
    await this.state.storage.put(`rollback-${Date.now()}`, {
      from: current?.version,
      to: version,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Broadcast rollback
    this.broadcast({
      type: 'release-rolled-back',
      from: current?.version,
      to: version,
      reason,
    });

    return Response.json({
      success: true,
      message: `Rolled back to version ${version}`,
      previousVersion: current?.version,
    });
  }

  /**
   * Get metrics for a specific release
   */
  private async getReleaseMetrics(url: URL): Promise<Response> {
    const version = url.searchParams.get('version');

    if (!version) {
      return Response.json({ error: 'Version parameter required' }, { status: 400 });
    }

    const metrics = await this.state.storage.get<ReleaseMetrics>(`metrics-${version}`);

    if (!metrics) {
      return Response.json({
        version,
        metrics: {
          downloads: 0,
          activeInstalls: 0,
          errorRate: 0,
          performanceScore: 100,
        },
      });
    }

    return Response.json({ version, metrics });
  }

  /**
   * Compare two releases
   */
  private async compareReleases(url: URL): Promise<Response> {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!from || !to) {
      return Response.json({ error: 'Both from and to parameters required' }, { status: 400 });
    }

    const fromRelease = await this.state.storage.get<Release>(`release-${from}`);
    const toRelease = await this.state.storage.get<Release>(`release-${to}`);

    if (!fromRelease || !toRelease) {
      return Response.json({ error: 'One or both releases not found' }, { status: 404 });
    }

    // Calculate differences
    const comparison = {
      from: from,
      to: to,
      changes: {
        added: toRelease.changes.filter(
          change => !fromRelease.changes.some(c => c.description === change.description)
        ),
        removed: fromRelease.changes.filter(
          change => !toRelease.changes.some(c => c.description === change.description)
        ),
      },
      buildSize: {
        from: fromRelease.build.size,
        to: toRelease.build.size,
        diff: toRelease.build.size - fromRelease.build.size,
        percentage: (
          ((toRelease.build.size - fromRelease.build.size) / fromRelease.build.size) *
          100
        ).toFixed(2),
      },
      timeDiff: new Date(toRelease.timestamp).getTime() - new Date(fromRelease.timestamp).getTime(),
    };

    return Response.json(comparison);
  }

  /**
   * Generate changelog between versions
   */
  private async generateChangelog(url: URL): Promise<Response> {
    const format = url.searchParams.get('format') || 'markdown';
    const since = url.searchParams.get('since');
    const until = url.searchParams.get('until');

    const releases = await this.state.storage.list<Release>({
      prefix: 'release-',
    });

    let releaseList = Array.from(releases.entries())
      .map(([key, value]) => value)
      .sort((a, b) => this.compareVersions(b.version, a.version));

    // Filter by date range if specified
    if (since) {
      const sinceDate = new Date(since);
      releaseList = releaseList.filter(r => new Date(r.timestamp) >= sinceDate);
    }
    if (until) {
      const untilDate = new Date(until);
      releaseList = releaseList.filter(r => new Date(r.timestamp) <= untilDate);
    }

    // Generate changelog based on format
    let changelog: string;

    if (format === 'markdown') {
      changelog = this.generateMarkdownChangelog(releaseList);
    } else if (format === 'json') {
      return Response.json(releaseList);
    } else {
      changelog = this.generateTextChangelog(releaseList);
    }

    return new Response(changelog, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  /**
   * Validate a release before publishing
   */
  private async validateRelease(request: Request): Promise<Response> {
    const release: Release = await request.json();
    const validation = this.validateReleaseData(release);

    if (validation.valid) {
      // Additional async validations
      const checks = {
        versionConflict: await this.checkVersionConflict(release.version),
        buildIntegrity: this.validateBuildInfo(release.build),
        changelogComplete: release.changes.length > 0,
        requiredFields: this.checkRequiredFields(release),
      };

      return Response.json({
        valid: Object.values(checks).every(v => v === true),
        checks,
      });
    }

    return Response.json({
      valid: false,
      issues: validation.issues,
    });
  }

  /**
   * Schedule a future release
   */
  private async scheduleRelease(request: Request): Promise<Response> {
    const { release, scheduledFor } = await request.json();

    const scheduledTime = new Date(scheduledFor);
    if (scheduledTime <= new Date()) {
      return Response.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    // Store scheduled release
    await this.state.storage.put(`scheduled-${release.version}`, {
      release,
      scheduledFor,
      status: 'pending',
    });

    // Set alarm for scheduled time
    await this.state.storage.setAlarm(scheduledTime.getTime());

    return Response.json({
      success: true,
      message: `Release ${release.version} scheduled for ${scheduledFor}`,
      release,
    });
  }

  /**
   * Handle scheduled alarm for releases
   */
  async alarm(): Promise<void> {
    // Process scheduled releases
    const scheduled = await this.state.storage.list({
      prefix: 'scheduled-',
    });

    for (const [key, value] of scheduled) {
      const { release, scheduledFor, status } = value as any;

      if (status === 'pending' && new Date(scheduledFor) <= new Date()) {
        // Publish the scheduled release
        await this.state.storage.put(`release-${release.version}`, release);
        await this.state.storage.put('current-release', release);

        // Update scheduled status
        await this.state.storage.put(key, {
          ...value,
          status: 'deployed',
        });

        // Broadcast deployment
        this.broadcast({
          type: 'scheduled-release-deployed',
          release,
        });
      }
    }
  }

  /**
   * WebSocket handler for live updates
   */
  private handleWebSocket(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);
    this.websockets.add(server);

    server.addEventListener('close', () => {
      this.websockets.delete(server);
    });

    server.addEventListener('message', async event => {
      try {
        const message = JSON.parse(event.data as string);

        switch (message.type) {
          case 'subscribe':
            server.send(
              JSON.stringify({
                type: 'subscribed',
                currentVersion: await this.getCurrentReleaseVersion(),
              })
            );
            break;

          case 'ping':
            server.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        server.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          })
        );
      }
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.websockets.forEach(ws => {
      try {
        ws.send(data);
      } catch (error) {
        console.error('Failed to send to WebSocket:', error);
      }
    });
  }

  /**
   * Helper: Compare semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (aParts[i] > bParts[i]) return 1;
      if (aParts[i] < bParts[i]) return -1;
    }

    return 0;
  }

  /**
   * Helper: Validate release data structure
   */
  private validateReleaseData(release: any): { valid: boolean; issues?: string[] } {
    const issues: string[] = [];

    if (!release.version || !/^\d+\.\d+\.\d+/.test(release.version)) {
      issues.push('Invalid version format (expected semver)');
    }

    if (!release.author) {
      issues.push('Author is required');
    }

    if (!Array.isArray(release.changes) || release.changes.length === 0) {
      issues.push('At least one change entry is required');
    }

    if (!release.build || !release.build.hash) {
      issues.push('Build information is required');
    }

    return {
      valid: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  /**
   * Helper: Check for version conflicts
   */
  private async checkVersionConflict(version: string): Promise<boolean> {
    const existing = await this.state.storage.get(`release-${version}`);
    return !existing;
  }

  /**
   * Helper: Validate build information
   */
  private validateBuildInfo(build: BuildInfo): boolean {
    return !!(build && build.hash && build.size > 0);
  }

  /**
   * Helper: Check required fields
   */
  private checkRequiredFields(release: Release): boolean {
    return !!(release.version && release.author && release.changes && release.build);
  }

  /**
   * Helper: Generate markdown changelog
   */
  private generateMarkdownChangelog(releases: Release[]): string {
    let changelog = '# Changelog\n\n';

    for (const release of releases) {
      changelog += `## [${release.version}] - ${release.timestamp}\n\n`;
      changelog += `*Released by ${release.author}*\n\n`;

      const changesByType = release.changes.reduce(
        (acc, change) => {
          if (!acc[change.type]) acc[change.type] = [];
          acc[change.type].push(change);
          return acc;
        },
        {} as Record<string, Change[]>
      );

      const typeHeaders = {
        feature: '### 🚀 Features',
        fix: '### 🐛 Fixes',
        enhancement: '### ✨ Enhancements',
        breaking: '### 💥 Breaking Changes',
        security: '### 🔒 Security',
      };

      for (const [type, changes] of Object.entries(changesByType)) {
        changelog += `${typeHeaders[type] || `### ${type}`}\n\n`;
        for (const change of changes) {
          changelog += `- ${change.description}`;
          if (change.issueNumber) changelog += ` (#${change.issueNumber})`;
          if (change.prNumber) changelog += ` (PR #${change.prNumber})`;
          changelog += '\n';
        }
        changelog += '\n';
      }
    }

    return changelog;
  }

  /**
   * Helper: Generate text changelog
   */
  private generateTextChangelog(releases: Release[]): string {
    let changelog = 'CHANGELOG\n!=====\n\n';

    for (const release of releases) {
      changelog += `Version ${release.version} (${release.timestamp})\n`;
      changelog += '-'.repeat(40) + '\n';

      for (const change of release.changes) {
        changelog += `  [${change.type.toUpperCase()}] ${change.description}\n`;
      }
      changelog += '\n';
    }

    return changelog;
  }

  /**
   * Helper: Get current release version
   */
  private async getCurrentReleaseVersion(): Promise<string> {
    const current = await this.state.storage.get<Release>('current-release');
    return current?.version || '0.0.0';
  }

  /**
   * Helper: Schedule deployment
   */
  private async scheduleDeployment(release: Release): Promise<void> {
    // In a real implementation, this would trigger CI/CD
    setTimeout(async () => {
      release.deployment.status = 'success';
      release.deployment.endTime = new Date().toISOString();
      await this.state.storage.put(`release-${release.version}`, release);

      this.broadcast({
        type: 'deployment-complete',
        release,
      });
    }, 5000); // Simulate deployment time
  }
}

// Export namespace binding
export default {
  ReleaseManager,
};

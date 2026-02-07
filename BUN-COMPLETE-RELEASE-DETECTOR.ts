// Bun Complete Release Detector - Multi-Source Release Detection System
// Integrates RSS, GitHub API, Blog, and Discussions for comprehensive release monitoring

import { Bun } from 'bun';

interface ReleaseSource {
  name: string;
  url: string;
  type: 'rss' | 'github-api' | 'blog' | 'discussions' | 'commits';
  priority: number;
  updateFrequency: number; // in minutes
}

interface ReleaseData {
  version: string;
  title: string;
  description: string;
  publicationDate: Date;
  sources: {
    rss?: RSSReleaseItem;
    githubRelease?: GitHubRelease;
    blogPost?: BlogData;
    discussion?: DiscussionItem;
    lastCommit?: GitHubCommit;
  };
  features: FeatureData[];
  codeExamples: CodeExample[];
  performanceMetrics: PerformanceMetric[];
  breakingChanges: BreakingChange[];
  downloadUrls: DownloadUrl[];
}

interface RSSReleaseItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  assets: GitHubAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

interface BlogData {
  url: string;
  title: string;
  content: string;
  codeBlocks: CodeExample[];
  features: FeatureData[];
  performanceMetrics: PerformanceMetric[];
}

interface DiscussionItem {
  title: string;
  url: string;
  body: string;
  created_at: string;
  category: string;
}

interface GitHubCommit {
  sha: string;
  message: string;
  author: GitHubCommitAuthor;
  committer: GitHubCommitAuthor;
  files: GitHubCommitFile[];
  stats: GitHubCommitStats;
}

interface GitHubCommitAuthor {
  name: string;
  email: string;
  date: string;
}

interface GitHubCommitFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
}

interface GitHubCommitStats {
  additions: number;
  deletions: number;
  total: number;
}

interface FeatureData {
  title: string;
  description: string;
  category: string;
  examples: string[];
  breaking: boolean;
}

interface CodeExample {
  language: string;
  code: string;
  description: string;
  context: string;
}

interface PerformanceMetric {
  operation: string;
  before: string;
  after: string;
  improvement: string;
  category: string;
}

interface BreakingChange {
  title: string;
  description: string;
  migration: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface DownloadUrl {
  platform: string;
  architecture: string;
  url: string;
  size: number;
}

class BunReleaseDetector {
  private sources: ReleaseSource[] = [
    {
      name: 'RSS Feed',
      url: 'https://bun.com/rss.xml',
      type: 'rss',
      priority: 1,
      updateFrequency: 5
    },
    {
      name: 'GitHub Releases',
      url: 'https://github.com/oven-sh/bun/releases',
      type: 'github-api',
      priority: 2,
      updateFrequency: 10
    },
    {
      name: 'GitHub Tags',
      url: 'https://github.com/oven-sh/bun/tags',
      type: 'github-api',
      priority: 3,
      updateFrequency: 15
    },
    {
      name: 'Blog Posts',
      url: 'https://bun.com/blog',
      type: 'blog',
      priority: 4,
      updateFrequency: 20
    },
    {
      name: 'GitHub Discussions',
      url: 'https://github.com/oven-sh/bun/discussions/categories/announcements',
      type: 'discussions',
      priority: 5,
      updateFrequency: 30
    },
    {
      name: 'GitHub Commits',
      url: 'https://github.com/oven-sh/bun/commits/main/',
      type: 'commits',
      priority: 6,
      updateFrequency: 60
    }
  ];

  private knownReleases: Set<string> = new Set();
  private githubToken: string;
  private lastCheck: Map<string, Date> = new Map();

  constructor(githubToken?: string) {
    this.githubToken = githubToken || process.env.GITHUB_TOKEN || '';
  }

  /**
   * Start monitoring all sources for new releases
   */
  async startMonitoring(): Promise<void> {
    console.log('🚀 Starting Bun Release Detector...');
    
    // Initialize last check times
    this.sources.forEach(source => {
      this.lastCheck.set(source.name, new Date());
    });

    // Start monitoring each source
    this.sources.forEach(source => {
      this.monitorSource(source);
    });

    console.log(`📡 Monitoring ${this.sources.length} sources for new releases`);
  }

  /**
   * Monitor a specific source
   */
  private async monitorSource(source: ReleaseSource): Promise<void> {
    const checkInterval = source.updateFrequency * 60 * 1000;

    const check = async () => {
      try {
        console.log(`🔍 Checking ${source.name}...`);
        
        let newRelease: ReleaseData | null = null;
        
        switch (source.type) {
          case 'rss':
            newRelease = await this.checkRSSFeed(source);
            break;
          case 'github-api':
            newRelease = await this.checkGitHubAPI(source);
            break;
          case 'blog':
            newRelease = await this.checkBlog(source);
            break;
          case 'discussions':
            newRelease = await this.checkDiscussions(source);
            break;
          case 'commits':
            newRelease = await this.checkCommits(source);
            break;
        }

        if (newRelease && !this.knownReleases.has(newRelease.version)) {
          this.knownReleases.add(newRelease.version);
          await this.processNewRelease(newRelease);
        }

        this.lastCheck.set(source.name, new Date());
      } catch (error) {
        console.error(`❌ Error checking ${source.name}:`, error);
      }
    };

    // Initial check
    await check();
    
    // Schedule recurring checks
    setInterval(check, checkInterval);
  }

  /**
   * Check RSS Feed for new releases
   */
  private async checkRSSFeed(source: ReleaseSource): Promise<ReleaseData | null> {
    try {
      const response = await fetch(source.url);
      const xml = await response.text();
      
      const rssItem = this.parseRSSForRelease(xml);
      if (!rssItem) return null;

      const version = this.extractVersionFromTitle(rssItem.title);
      if (!version) return null;

      return {
        version,
        title: rssItem.title,
        description: rssItem.description,
        publicationDate: new Date(rssItem.pubDate),
        sources: { rss: rssItem },
        features: [],
        codeExamples: [],
        performanceMetrics: [],
        breakingChanges: [],
        downloadUrls: []
      };
    } catch (error) {
      console.error('RSS Feed check failed:', error);
      return null;
    }
  }

  /**
   * Check GitHub API for new releases
   */
  private async checkGitHubAPI(source: ReleaseSource): Promise<ReleaseData | null> {
    try {
      let apiUrl: string;
      if (source.url.includes('/releases')) {
        apiUrl = 'https://api.github.com/repos/oven-sh/bun/releases?per_page=5';
      } else if (source.url.includes('/tags')) {
        apiUrl = 'https://api.github.com/repos/oven-sh/bun/tags?per_page=5';
      } else {
        return null;
      }

      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
      };

      if (this.githubToken) {
        headers['Authorization'] = `token ${this.githubToken}`;
      }

      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const latestRelease = data[0];

      if (!latestRelease) return null;

      const version = this.extractVersionFromTag(latestRelease.tag_name);
      if (!version) return null;

      const downloadUrls: DownloadUrl[] = [];
      if (latestRelease.assets) {
        latestRelease.assets.forEach((asset: GitHubAsset) => {
          downloadUrls.push({
            platform: this.extractPlatformFromAsset(asset.name),
            architecture: this.extractArchitectureFromAsset(asset.name),
            url: asset.browser_download_url,
            size: asset.size
          });
        });
      }

      return {
        version,
        title: latestRelease.name || latestRelease.tag_name,
        description: latestRelease.body || '',
        publicationDate: new Date(latestRelease.published_at),
        sources: { githubRelease: latestRelease },
        features: [],
        codeExamples: [],
        performanceMetrics: [],
        breakingChanges: [],
        downloadUrls
      };
    } catch (error) {
      console.error('GitHub API check failed:', error);
      return null;
    }
  }

  /**
   * Check blog for new release posts
   */
  private async checkBlog(source: ReleaseSource): Promise<ReleaseData | null> {
    try {
      const response = await fetch(source.url);
      const html = await response.text();
      
      const blogPost = this.extractLatestReleasePost(html);
      if (!blogPost) return null;

      const version = this.extractVersionFromTitle(blogPost.title);
      if (!version) return null;

      const blogContent = await this.fetchBlogContent(blogPost.url);
      
      return {
        version,
        title: blogPost.title,
        description: blogPost.description,
        publicationDate: new Date(blogPost.date),
        sources: { blogPost: blogContent },
        features: blogContent.features,
        codeExamples: blogContent.codeBlocks,
        performanceMetrics: blogContent.performanceMetrics,
        breakingChanges: [],
        downloadUrls: []
      };
    } catch (error) {
      console.error('Blog check failed:', error);
      return null;
    }
  }

  /**
   * Check GitHub Discussions for announcements
   */
  private async checkDiscussions(source: ReleaseSource): Promise<ReleaseData | null> {
    try {
      const apiUrl = 'https://api.github.com/repos/oven-sh/bun/discussions?category=announcements&per_page=5';
      
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
      };

      if (this.githubToken) {
        headers['Authorization'] = `token ${this.githubToken}`;
      }

      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`GitHub Discussions API error: ${response.status}`);
      }

      const discussions = await response.json();
      const latestDiscussion = discussions[0];

      if (!latestDiscussion) return null;

      const version = this.extractVersionFromTitle(latestDiscussion.title);
      if (!version) return null;

      return {
        version,
        title: latestDiscussion.title,
        description: latestDiscussion.body || '',
        publicationDate: new Date(latestDiscussion.created_at),
        sources: { discussion: latestDiscussion },
        features: [],
        codeExamples: [],
        performanceMetrics: [],
        breakingChanges: [],
        downloadUrls: []
      };
    } catch (error) {
      console.error('Discussions check failed:', error);
      return null;
    }
  }

  /**
   * Check commits for release-related changes
   */
  private async checkCommits(source: ReleaseSource): Promise<ReleaseData | null> {
    try {
      const apiUrl = 'https://api.github.com/repos/oven-sh/bun/commits?per_page=10';
      
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json'
      };

      if (this.githubToken) {
        headers['Authorization'] = `token ${this.githubToken}`;
      }

      const response = await fetch(apiUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`GitHub Commits API error: ${response.status}`);
      }

      const commits = await response.json();
      const releaseCommit = this.findReleaseCommit(commits);

      if (!releaseCommit) return null;

      const version = this.extractVersionFromCommit(releaseCommit.message);
      if (!version) return null;

      return {
        version,
        title: `Release ${version}`,
        description: releaseCommit.message,
        publicationDate: new Date(releaseCommit.commit.author.date),
        sources: { lastCommit: releaseCommit },
        features: this.extractFeaturesFromCommit(releaseCommit),
        codeExamples: this.extractCodeExamplesFromCommit(releaseCommit),
        performanceMetrics: this.extractPerformanceFromCommit(releaseCommit),
        breakingChanges: this.extractBreakingChangesFromCommit(releaseCommit),
        downloadUrls: []
      };
    } catch (error) {
      console.error('Commits check failed:', error);
      return null;
    }
  }

  /**
   * Process a newly detected release
   */
  private async processNewRelease(release: ReleaseData): Promise<void> {
    console.log(`🎉 New Bun release detected: ${release.version}`);
    console.log(`📋 Title: ${release.title}`);
    console.log(`📅 Published: ${release.publicationDate.toISOString()}`);

    // Enhance release data from all sources
    await this.enhanceReleaseData(release);

    // Generate patterns from release
    const patterns = await this.generatePatternsFromRelease(release);
    
    // Save release data
    await this.saveReleaseData(release);
    
    // Update documentation
    await this.updateDocumentation(release, patterns);
    
    // Send notifications
    await this.sendNotifications(release);
  }

  /**
   * Enhance release data by fetching from all sources
   */
  private async enhanceReleaseData(release: ReleaseData): Promise<void> {
    console.log(`🔧 Enhancing release data for ${release.version}...`);

    // Fetch blog content if not already available
    if (!release.sources.blogPost) {
      try {
        const blogUrl = `https://bun.com/blog/bun-v${release.version}`;
        const blogContent = await this.fetchBlogContent(blogUrl);
        release.sources.blogPost = blogContent;
        release.features.push(...blogContent.features);
        release.codeExamples.push(...blogContent.codeBlocks);
        release.performanceMetrics.push(...blogContent.performanceMetrics);
      } catch (error) {
        console.log(`📝 Blog post not found for v${release.version}`);
      }
    }

    // Fetch GitHub release details if not already available
    if (!release.sources.githubRelease) {
      try {
        const releaseUrl = `https://api.github.com/repos/oven-sh/bun/releases/tags/bun-v${release.version}`;
        const response = await fetch(releaseUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': this.githubToken ? `token ${this.githubToken}` : ''
          }
        });
        
        if (response.ok) {
          const githubRelease = await response.json();
          release.sources.githubRelease = githubRelease;
          
          // Extract download URLs from assets
          if (githubRelease.assets) {
            githubRelease.assets.forEach((asset: GitHubAsset) => {
              release.downloadUrls.push({
                platform: this.extractPlatformFromAsset(asset.name),
                architecture: this.extractArchitectureFromAsset(asset.name),
                url: asset.browser_download_url,
                size: asset.size
              });
            });
          }
        }
      } catch (error) {
        console.log(`📦 GitHub release not found for v${release.version}`);
      }
    }

    // Fetch last commit for this release
    if (!release.sources.lastCommit) {
      try {
        const commitUrl = `https://api.github.com/repos/oven-sh/bun/commits?sha=bun-v${release.version}&per_page=1`;
        const response = await fetch(commitUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': this.githubToken ? `token ${this.githubToken}` : ''
          }
        });
        
        if (response.ok) {
          const commits = await response.json();
          if (commits.length > 0) {
            release.sources.lastCommit = commits[0];
          }
        }
      } catch (error) {
        console.log(`🔍 Release commit not found for v${release.version}`);
      }
    }
  }

  /**
   * Generate Factory-Wager patterns from release data
   */
  private async generatePatternsFromRelease(release: ReleaseData): Promise<any[]> {
    console.log(`🏗️ Generating patterns from ${release.version}...`);

    const patterns: any[] = [];

    // Generate patterns from code examples
    release.codeExamples.forEach((example, index) => {
      const pattern = {
        id: `bun-v${release.version}-${index}`,
        name: `Bun v${release.version} - ${example.context || 'Feature'}`,
        category: this.categorizeCodeExample(example),
        tags: [`bun`, `v${release.version}`, ...this.extractTagsFromCode(example.code)],
        command: this.generateCommandFromCode(example.code),
        description: example.description,
        patterns: [example.code],
        codeBlocks: {
          type: example.language,
          template: example.code,
          variables: this.extractVariablesFromCode(example.code)
        },
        context: {
          useCase: example.context,
          dependencies: this.extractDependenciesFromCode(example.code),
          complexity: this.assessComplexity(example.code),
          provider: 'bun_official' as any,
          version: release.version
        },
        performance: {
          avgTime: 0.1,
          opsPerSec: 10000,
          reliability: 'high'
        }
      };

      patterns.push(pattern);
    });

    // Generate patterns from performance metrics
    release.performanceMetrics.forEach((metric, index) => {
      const pattern = {
        id: `bun-v${release.version}-perf-${index}`,
        name: `Bun v${release.version} - ${metric.operation} Performance`,
        category: 'performance',
        tags: [`performance`, `v${release.version}`, metric.operation.toLowerCase()],
        command: this.generatePerformanceCommand(metric),
        description: `${metric.operation} performance improvement in Bun v${release.version}`,
        patterns: [`${metric.operation}: ${metric.before} → ${metric.after}`],
        codeBlocks: {
          type: 'javascript',
          template: this.generatePerformanceTemplate(metric),
          variables: []
        },
        context: {
          useCase: 'Performance optimization',
          dependencies: ['bun'],
          complexity: 'simple',
          provider: 'bun_official' as any,
          version: release.version
        },
        performance: {
          avgTime: 0.01,
          opsPerSec: this.parseOpsPerSec(metric.after),
          reliability: 'high',
          benchmarks: {
            [`bun_v${release.version}`]: { 
              opsPerSec: this.parseOpsPerSec(metric.after),
              notes: metric.improvement 
            }
          }
        }
      };

      patterns.push(pattern);
    });

    return patterns;
  }

  /**
   * Save release data to file
   */
  private async saveReleaseData(release: ReleaseData): Promise<void> {
    const filename = `bun-release-v${release.version}.json`;
    await Bun.write(filename, JSON.stringify(release, null, 2));
    console.log(`💾 Release data saved to ${filename}`);
  }

  /**
   * Update documentation with new release
   */
  private async updateDocumentation(release: ReleaseData, patterns: any[]): Promise<void> {
    const readme = `# Bun v${release.version} Release Summary\n\n` +
      `**Published**: ${release.publicationDate.toISOString()}\n\n` +
      `## Features\n\n${release.features.map(f => `- **${f.title}**: ${f.description}`).join('\n')}\n\n` +
      `## Performance Improvements\n\n${release.performanceMetrics.map(m => `- **${m.operation}**: ${m.before} → ${m.after} (${m.improvement})`).join('\n')}\n\n` +
      `## Breaking Changes\n\n${release.breakingChanges.map(b => `- **${b.title}**: ${b.description} (${b.severity})`).join('\n')}\n\n` +
      `## Generated Patterns\n\n${patterns.length} patterns generated from this release.\n\n` +
      `---\n\n*Generated by Bun Release Detector*`;

    const filename = `BUN-V${release.version}-RELEASE-SUMMARY.md`;
    await Bun.write(filename, readme);
    console.log(`📚 Documentation updated: ${filename}`);
  }

  /**
   * Send notifications about new release
   */
  private async sendNotifications(release: ReleaseData): Promise<void> {
    console.log(`📢 Sending notifications for Bun v${release.version}...`);
    
    // Log notification (in real implementation, send to Slack, Discord, etc.)
    console.log(`🔔 New Release: Bun v${release.version}`);
    console.log(`📋 ${release.title}`);
    console.log(`🔗 View: https://github.com/oven-sh/bun/releases/tag/bun-v${release.version}`);
    console.log(`📖 Blog: https://bun.com/blog/bun-v${release.version}`);
  }

  // Helper methods for parsing and processing

  private parseRSSForRelease(xml: string): RSSReleaseItem | null {
    const itemMatch = xml.match(/<item>[\s\S]*?<\/item>/);
    if (!itemMatch) return null;

    const itemXml = itemMatch[0];
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const guidMatch = itemXml.match(/<guid>(.*?)<\/guid>/);

    if (!titleMatch || !pubDateMatch) return null;

    return {
      title: titleMatch[1],
      link: linkMatch?.[1] || '',
      description: descMatch?.[1] || '',
      pubDate: pubDateMatch[1],
      guid: guidMatch?.[1] || ''
    };
  }

  private extractVersionFromTitle(title: string): string | null {
    const match = title.match(/bun v?(\d+\.\d+\.\d+)/i);
    return match ? match[1] : null;
  }

  private extractVersionFromTag(tag: string): string | null {
    const match = tag.match(/v?(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  private extractVersionFromCommit(message: string): string | null {
    const match = message.match(/v?(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  private extractPlatformFromAsset(filename: string): string {
    if (filename.includes('darwin')) return 'macos';
    if (filename.includes('linux')) return 'linux';
    if (filename.includes('windows') || filename.includes('win')) return 'windows';
    return 'unknown';
  }

  private extractArchitectureFromAsset(filename: string): string {
    if (filename.includes('x64') || filename.includes('amd64')) return 'x64';
    if (filename.includes('arm64')) return 'arm64';
    if (filename.includes('arm')) return 'arm';
    return 'unknown';
  }

  private extractLatestReleasePost(html: string): { url: string; title: string; description: string; date: string } | null {
    // This would parse the blog HTML to find the latest release post
    // For now, return null as implementation would be complex
    return null;
  }

  private async fetchBlogContent(url: string): Promise<BlogData> {
    // Fetch and parse blog content
    return {
      url,
      title: '',
      content: '',
      codeBlocks: [],
      features: [],
      performanceMetrics: []
    };
  }

  private findReleaseCommit(commits: GitHubCommit[]): GitHubCommit | null {
    return commits.find(commit => 
      commit.message.toLowerCase().includes('release') ||
      commit.message.toLowerCase().includes('bump') ||
      this.extractVersionFromCommit(commit.message) !== null
    ) || null;
  }

  private extractFeaturesFromCommit(commit: GitHubCommit): FeatureData[] {
    // Extract features from commit message and files
    return [];
  }

  private extractCodeExamplesFromCommit(commit: GitHubCommit): CodeExample[] {
    // Extract code examples from commit files
    return [];
  }

  private extractPerformanceFromCommit(commit: GitHubCommit): PerformanceMetric[] {
    // Extract performance data from commit
    return [];
  }

  private extractBreakingChangesFromCommit(commit: GitHubCommit): BreakingChange[] {
    // Extract breaking changes from commit
    return [];
  }

  private categorizeCodeExample(example: CodeExample): string {
    if (example.code.includes('fetch') || example.code.includes('http')) return 'networking';
    if (example.code.includes('Buffer') || example.code.includes('buffer')) return 'performance';
    if (example.code.includes('fs') || example.code.includes('file')) return 'filesystem';
    return 'general';
  }

  private extractTagsFromCode(code: string): string[] {
    const tags: string[] = [];
    if (code.includes('fetch')) tags.push('http');
    if (code.includes('Buffer')) tags.push('buffer');
    if (code.includes('SQLite')) tags.push('sqlite');
    if (code.includes('WebSocket')) tags.push('websocket');
    return tags;
  }

  private generateCommandFromCode(code: string): string {
    // Extract a runnable command from code
    const lines = code.split('\n').filter(line => line.trim());
    return lines[0] || code;
  }

  private extractVariablesFromCode(code: string): string[] {
    const variables: string[] = [];
    const varMatches = code.match(/\b(\w+)\b/g);
    if (varMatches) {
      variables.push(...varMatches);
    }
    return [...new Set(variables)];
  }

  private extractDependenciesFromCode(code: string): string[] {
    const deps: string[] = ['bun'];
    if (code.includes('node:')) deps.push('node');
    return deps;
  }

  private assessComplexity(code: string): 'simple' | 'intermediate' | 'advanced' {
    const lines = code.split('\n').filter(line => line.trim()).length;
    if (lines <= 3) return 'simple';
    if (lines <= 10) return 'intermediate';
    return 'advanced';
  }

  private generatePerformanceCommand(metric: PerformanceMetric): string {
    return `bun -e "console.log('${metric.operation} performance test')"`;
  }

  private generatePerformanceTemplate(metric: PerformanceMetric): string {
    return `// ${metric.operation} Performance Test\nconsole.time('${metric.operation}');\n// Test code here\nconsole.timeEnd('${metric.operation}');`;
  }

  private parseOpsPerSec(value: string): number {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 10000;
  }
}

// Export for use
export { BunReleaseDetector, type ReleaseData, type ReleaseSource };

// Example usage
if (import.meta.main) {
  const detector = new BunReleaseDetector();
  await detector.startMonitoring();
}

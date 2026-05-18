#!/usr/bin/env bun

export async function demoGitHubExplorer() {
  console.info('🐙 GitHub Explorer Demo');
  console.info('='.repeat(40));
  
  try {
    // 1. Repository information
    console.info('\n1. 📊 Repository Information:');
    const getRepositoryInfo = async (owner, repo) => {
      console.info(`   🔍 Fetching ${owner}/${repo}...`);
      
      // Simulate API call (in real implementation, use actual GitHub API)
      const repoInfo = {
        name: repo,
        full_name: `${owner}/${repo}`,
        description: 'Incredibly fast JavaScript runtime, bundler, transpiler and package manager - all in one.',
        private: false,
        fork: false,
        created_at: '2021-04-08T20:18:33Z',
        updated_at: new Date().toISOString(),
        pushed_at: new Date().toISOString(),
        homepage: 'https://bun.sh',
        size: 156789, // KB
        stargazers_count: 45678,
        watchers_count: 45678,
        language: 'C++',
        has_issues: true,
        has_projects: true,
        has_downloads: true,
        has_wiki: true,
        has_pages: false,
        forks_count: 1234,
        open_issues_count: 89,
        default_branch: 'main',
        topics: ['javascript', 'typescript', 'bundler', 'runtime', 'zig'],
        license: { key: 'mit', name: 'MIT License' }
      };
      
      console.info(`   ✅ Repository: ${repoInfo.full_name}`);
      console.info(`   📝 Description: ${repoInfo.description}`);
      console.info(`   ⭐ Stars: ${repoInfo.stargazers_count.toLocaleString()}`);
      console.info(`   🍴 Forks: ${repoInfo.forks_count.toLocaleString()}`);
      console.info(`   🌐 Language: ${repoInfo.language}`);
      console.info(`   📊 Size: ${(repoInfo.size / 1024).toFixed(1)}MB`);
      console.info(`   🏷️  Topics: ${repoInfo.topics.join(', ')}`);
      
      return repoInfo;
    };
    
    const bunRepo = await getRepositoryInfo('oven-sh', 'bun');
    
    // 2. Contributors analysis
    console.info('\n2. 👥 Contributors Analysis:');
    const getContributors = async (owner, repo) => {
      console.info('   👥 Fetching contributors...');
      
      // Simulate contributors data
      const contributors = [
        { login: 'jarred-sumner', contributions: 2345, type: 'User' },
        { login: 'dylan-conway', contributions: 567, type: 'User' },
        { login: 'paperdave', contributions: 432, type: 'User' },
        { login: 'Electroid', contributions: 321, type: 'User' },
        { login: 'zackradisic', contributions: 298, type: 'User' }
      ];
      
      const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
      
      console.info(`   👥 Total contributors: ${contributors.length}`);
      console.info(`   🔢 Total contributions: ${totalContributions.toLocaleString()}`);
      
      console.info('   🏆 Top contributors:');
      contributors.slice(0, 5).forEach((contributor, index) => {
        const percentage = ((contributor.contributions / totalContributions) * 100).toFixed(1);
        console.info(`      ${index + 1}. ${contributor.login}: ${contributor.contributions} contributions (${percentage}%)`);
      });
      
      return contributors;
    };
    
    const contributors = await getContributors('oven-sh', 'bun');
    
    // 3. Commit history
    console.info('\n3. 📜 Commit History:');
    const getCommitHistory = async (owner, repo, limit = 5) => {
      console.info(`   📜 Fetching last ${limit} commits...`);
      
      // Simulate commit data
      const commits = [
        {
          sha: 'abc123def456',
          message: 'fix: resolve memory leak in file operations',
          author: { name: 'Jarred Sumner', login: 'jarred-sumner' },
          date: new Date(Date.now() - 3600000).toISOString(),
          additions: 23,
          deletions: 5,
          changed_files: 2
        },
        {
          sha: 'def456ghi789',
          message: 'feat: add experimental WebSocket support',
          author: { name: 'Dylan Conway', login: 'dylan-conway' },
          date: new Date(Date.now() - 7200000).toISOString(),
          additions: 156,
          deletions: 12,
          changed_files: 8
        },
        {
          sha: 'ghi789jkl012',
          message: 'docs: update API documentation for v1.3.8',
          author: { name: 'PaperDave', login: 'paperdave' },
          date: new Date(Date.now() - 10800000).toISOString(),
          additions: 89,
          deletions: 34,
          changed_files: 5
        }
      ];
      
      console.info('   📜 Recent commits:');
      commits.forEach((commit, index) => {
        const timeAgo = getTimeAgo(new Date(commit.date));
        console.info(`      ${index + 1}. ${commit.sha.substring(0, 7)} - ${commit.message}`);
        console.info(`         👤 ${commit.author.name} (${timeAgo})`);
        console.info(`         📊 +${commit.additions} -${commit.deletions} (${commit.changed_files} files)`);
      });
      
      return commits;
    };
    
    const commits = await getCommitHistory('oven-sh', 'bun');
    
    // 4. Issues and Pull Requests
    console.info('\n4. 🐛 Issues & Pull Requests:');
    const getIssuesAndPRs = async (owner, repo) => {
      console.info('   🐛 Fetching issues and PRs...');
      
      // Simulate issues and PRs
      const issues = [
        { number: 1234, title: 'Memory leak in large file processing', state: 'open', type: 'issue', created_at: new Date(Date.now() - 86400000).toISOString() },
        { number: 1235, title: 'Add support for ES2023 features', state: 'closed', type: 'issue', created_at: new Date(Date.now() - 172800000).toISOString() },
        { number: 5678, title: 'feat: implement HTTP/2 support', state: 'open', type: 'pr', created_at: new Date(Date.now() - 43200000).toISOString() },
        { number: 5679, title: 'fix: resolve race condition in async operations', state: 'merged', type: 'pr', created_at: new Date(Date.now() - 259200000).toISOString() }
      ];
      
      const openIssues = issues.filter(i => i.type === 'issue' && i.state === 'open').length;
      const closedIssues = issues.filter(i => i.type === 'issue' && i.state === 'closed').length;
      const openPRs = issues.filter(i => i.type === 'pr' && i.state === 'open').length;
      const mergedPRs = issues.filter(i => i.type === 'pr' && i.state === 'merged').length;
      
      console.info(`   🐛 Issues: ${openIssues} open, ${closedIssues} closed`);
      console.info(`   🔀 Pull Requests: ${openPRs} open, ${mergedPRs} merged`);
      
      console.info('   🔥 Recent activity:');
      issues.slice(0, 3).forEach(item => {
        const icon = item.type === 'pr' ? '🔀' : '🐛';
        const status = item.state === 'open' ? '🟢' : item.state === 'merged' ? '🟣' : '🔴';
        const timeAgo = getTimeAgo(new Date(item.created_at));
        console.info(`      ${icon} #${item.number} ${item.title} ${status} (${timeAgo})`);
      });
      
      return issues;
    };
    
    const issues = await getIssuesAndPRs('oven-sh', 'bun');
    
    // 5. Release information
    console.info('\n5. 🚀 Release Information:');
    const getReleases = async (owner, repo) => {
      console.info('   🚀 Fetching releases...');
      
      // Simulate releases
      const releases = [
        {
          tag_name: 'v1.3.8',
          name: 'Bun v1.3.8',
          published_at: new Date(Date.now() - 604800000).toISOString(),
          prerelease: false,
          draft: false,
          assets: [
            { name: 'bun-darwin-x64.zip', size: 23456789, download_count: 12345 },
            { name: 'bun-linux-x64.zip', size: 21345678, download_count: 23456 }
          ],
          body: '## 🚀 Features\\n- World\'s fastest Markdown parser\\n- Enhanced build analyzer\\n\\n## 🐛 Bug Fixes\\n- Fixed memory leak in file operations\\n- Resolved race condition in async code'
        },
        {
          tag_name: 'v1.3.7',
          name: 'Bun v1.3.7',
          published_at: new Date(Date.now() - 1209600000).toISOString(),
          prerelease: false,
          draft: false,
          assets: [
            { name: 'bun-darwin-x64.zip', size: 22987654, download_count: 9876 },
            { name: 'bun-linux-x64.zip', size: 20987654, download_count: 18765 }
          ],
          body: '## 🚀 Features\\n- Performance improvements\\n- New CLI options'
        }
      ];
      
      console.info(`   📦 Latest releases: ${releases.length}`);
      
      releases.forEach((release, index) => {
        const timeAgo = getTimeAgo(new Date(release.published_at));
        const totalDownloads = release.assets.reduce((sum, asset) => sum + asset.download_count, 0);
        const type = release.prerelease ? '🟡 Pre-release' : release.draft ? '📝 Draft' : '✅ Stable';
        
        console.info(`      ${index + 1}. ${release.tag_name} - ${release.name} ${type}`);
        console.info(`         📅 Published: ${timeAgo}`);
        console.info(`         📥 Downloads: ${totalDownloads.toLocaleString()}`);
        console.info(`         📦 Assets: ${release.assets.length} files`);
      });
      
      return releases;
    };
    
    const releases = await getReleases('oven-sh', 'bun');
    
    // 6. Language statistics
    console.info('\n6. 📊 Language Statistics:');
    const getLanguageStats = async (owner, repo) => {
      console.info('   📊 Analyzing language usage...');
      
      // Simulate language data
      const languages = {
        'C++': { bytes: 12345678, percentage: 65.2, color: '#f34b7d' },
        'Zig': { bytes: 3456789, percentage: 18.3, color: '#ec915c' },
        'JavaScript': { bytes: 1234567, percentage: 6.5, color: '#f1e05a' },
        'TypeScript': { bytes: 987654, percentage: 5.2, color: '#2b7489' },
        'Shell': { bytes: 456789, percentage: 2.4, color: '#89e051' },
        'Other': { bytes: 345678, percentage: 2.4, color: '#cccccc' }
      };
      
      const totalBytes = Object.values(languages).reduce((sum, lang) => sum + lang.bytes, 0);
      
      console.info('   📊 Language breakdown:');
      Object.entries(languages).forEach(([language, stats]) => {
        const bar = '█'.repeat(Math.round(stats.percentage / 2));
        console.info(`      ${language.padEnd(12)} ${bar} ${stats.percentage.toFixed(1)}%`);
      });
      
      console.info(`   📊 Total code: ${(totalBytes / 1024 / 1024).toFixed(1)}MB`);
      
      return languages;
    };
    
    const languages = await getLanguageStats('oven-sh', 'bun');
    
    // 7. Activity timeline
    console.info('\n7. 📈 Activity Timeline:');
    const getActivityTimeline = async (owner, repo) => {
      console.info('   📈 Generating activity timeline...');
      
      // Simulate activity data for the last 30 days
      const timeline = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Simulate random activity
        const commits = Math.floor(Math.random() * 10);
        const issues = Math.floor(Math.random() * 3);
        const prs = Math.floor(Math.random() * 2);
        
        timeline.push({
          date: date.toISOString().split('T')[0],
          commits,
          issues,
          prs,
          total: commits + issues + prs
        });
      }
      
      // Find most active day
      const mostActiveDay = timeline.reduce((max, day) => 
        day.total > max.total ? day : max
      );
      
      const totalActivity = timeline.reduce((sum, day) => sum + day.total, 0);
      const avgActivity = totalActivity / timeline.length;
      
      console.info(`   📈 Last 30 days activity:`);
      console.info(`      📊 Total events: ${totalActivity}`);
      console.info(`      📊 Daily average: ${avgActivity.toFixed(1)}`);
      console.info(`      🔥 Most active: ${mostActiveDay.date} (${mostActiveDay.total} events)`);
      
      // Show last 7 days
      console.info('   📅 Last 7 days:');
      timeline.slice(-7).forEach(day => {
        const bar = '█'.repeat(Math.min(day.total, 20));
        console.info(`      ${day.date}: ${bar.padEnd(20)} ${day.total} events`);
      });
      
      return timeline;
    };
    
    const timeline = await getActivityTimeline('oven-sh', 'bun');
    
    // 8. Repository health score
    console.info('\n8. 🏥 Repository Health Score:');
    const calculateHealthScore = (repo, contributors, issues, releases) => {
      const factors = {
        stars: Math.min(repo.stargazers_count / 1000, 10) * 0.2, // 20% weight
        forks: Math.min(repo.forks_count / 100, 10) * 0.1,     // 10% weight
        contributors: Math.min(contributors.length / 10, 10) * 0.15, // 15% weight
        issues: Math.max(10 - issues.filter(i => i.type === 'issue' && i.state === 'open').length, 0) * 0.1, // 10% weight
        releases: Math.min(releases.length * 2, 10) * 0.15,     // 15% weight
        recentCommits: commits.length >= 3 ? 10 : commits.length * 3.33 * 0.2, // 20% weight
        documentation: repo.has_wiki ? 10 : 5 * 0.1           // 10% weight
      };
      
      const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
      
      console.info('   🏥 Health Factors:');
      console.info(`      ⭐ Stars: ${factors.stars.toFixed(1)}/10`);
      console.info(`      🍴 Forks: ${factors.forks.toFixed(1)}/10`);
      console.info(`      👥 Contributors: ${factors.contributors.toFixed(1)}/10`);
      console.info(`      🐛 Issues: ${factors.issues.toFixed(1)}/10`);
      console.info(`      🚀 Releases: ${factors.releases.toFixed(1)}/10`);
      console.info(`      📜 Recent Commits: ${factors.recentCommits.toFixed(1)}/10`);
      console.info(`      📚 Documentation: ${factors.documentation.toFixed(1)}/10`);
      
      const grade = totalScore >= 8 ? 'A' : totalScore >= 6 ? 'B' : totalScore >= 4 ? 'C' : 'D';
      const gradeColor = grade === 'A' ? '🟢' : grade === 'B' ? '🟡' : grade === 'C' ? '🟠' : '🔴';
      
      console.info(`   🎯 Overall Score: ${totalScore.toFixed(1)}/10 ${gradeColor} Grade: ${grade}`);
      
      return { score: totalScore, grade, factors };
    };
    
    const healthScore = calculateHealthScore(bunRepo, contributors, issues, releases);
    
    // Helper function
    function getTimeAgo(date) {
      const seconds = Math.floor((new Date() - date) / 1000);
      
      if (seconds < 60) return `${seconds}s ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    }
    
    console.info('\n✅ GitHub Explorer demo completed!');
    console.info('\n💡 GitHub Explorer features demonstrated:');
    console.info('   • Repository information and statistics');
    console.info('   • Contributor analysis and rankings');
    console.info('   • Commit history and activity tracking');
    console.info('   • Issues and pull requests management');
    console.info('   • Release tracking and download statistics');
    console.info('   • Language usage analysis');
    console.info('   • Activity timeline visualization');
    console.info('   • Repository health scoring');
    
    console.info('\n🔧 To implement real GitHub integration:');
    console.info('   • Get GitHub API token: https://github.com/settings/tokens');
    console.info('   • Install GitHub client: bun add @octokit/rest');
    console.info('   • Handle rate limits and pagination');
    console.info('   • Add authentication for private repositories');
    console.info('   • Implement caching for better performance');
    
  } catch (error) {
    console.info(`❌ GitHub Explorer error: ${error.message}`);
  }
}

if (import.meta.main) {
  demoGitHubExplorer();
}

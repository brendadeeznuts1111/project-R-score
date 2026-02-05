#!/usr/bin/env bun
/**
 * Documentation Enhancement Script
 * Injects GitHub labels visual reference into API documentation
 */

import { join } from "path";

interface LabelDefinition {
  name: string;
  description: string;
  color: string;
  component: 'api' | 'core' | 'shared' | 'entry-point' | 'infra' | 'utils';
  priority: 'high' | 'medium' | 'low';
  changeType: 'feature' | 'bugfix' | 'hotfix' | 'chore' | 'refactor' | 'breaking-change';
}

const GITHUB_LABELS: LabelDefinition[] = [
  // Component labels
  { name: 'api', description: 'API endpoints and request handlers', color: '#0E8A16', component: 'api', priority: 'medium', changeType: 'feature' },
  { name: 'core', description: 'Core business logic and domain models', color: '#5319E7', component: 'core', priority: 'high', changeType: 'feature' },
  { name: 'shared', description: 'Shared utilities, types, and macros', color: '#006B75', component: 'shared', priority: 'medium', changeType: 'feature' },
  { name: 'entry-point', description: 'Application entry points (CLI, HTTP servers)', color: '#D93F0B', component: 'entry-point', priority: 'high', changeType: 'feature' },
  { name: 'infra', description: 'Infrastructure concerns (rate limiting, databases)', color: '#FBCA04', component: 'infra', priority: 'medium', changeType: 'feature' },
  { name: 'utils', description: 'Project-specific utilities', color: '#C5DEF5', component: 'utils', priority: 'low', changeType: 'feature' },

  // Priority labels
  { name: 'priority:high', description: 'High priority features and fixes', color: '#B60205', component: 'api', priority: 'high', changeType: 'feature' },
  { name: 'priority:medium', description: 'Medium priority features', color: '#FBCA04', component: 'api', priority: 'medium', changeType: 'feature' },
  { name: 'priority:low', description: 'Low priority features', color: '#0E8A16', component: 'api', priority: 'low', changeType: 'feature' },

  // Change type labels
  { name: 'feature', description: 'New features and enhancements', color: '#0E8A16', component: 'api', priority: 'medium', changeType: 'feature' },
  { name: 'bugfix', description: 'Bug fixes and patches', color: '#B60205', component: 'api', priority: 'high', changeType: 'bugfix' },
  { name: 'hotfix', description: 'Critical hotfixes', color: '#B60205', component: 'api', priority: 'high', changeType: 'bugfix' },
  { name: 'chore', description: 'Maintenance and chores', color: '#006B75', component: 'api', priority: 'low', changeType: 'chore' },
  { name: 'refactor', description: 'Code refactoring and cleanup', color: '#5319E7', component: 'api', priority: 'medium', changeType: 'refactor' },
  { name: 'breaking-change', description: 'Breaking changes and migrations', color: '#D93F0B', component: 'api', priority: 'high', changeType: 'breaking-change' },

  // OpenAPI-specific labels
  { name: 'security', description: 'Security scanning and vulnerability assessment', color: '#B60205', component: 'api', priority: 'high', changeType: 'feature' },
  { name: 'performance', description: 'Performance monitoring and benchmarking', color: '#FBCA04', component: 'api', priority: 'medium', changeType: 'feature' },
  { name: 'cli', description: 'Command-line interface operations', color: '#5319E7', component: 'entry-point', priority: 'medium', changeType: 'feature' },
  { name: 'deployment', description: 'Build, deployment, and distribution', color: '#006B75', component: 'entry-point', priority: 'high', changeType: 'feature' },
  { name: 'monitoring', description: 'System monitoring and telemetry', color: '#D93F0B', component: 'core', priority: 'medium', changeType: 'feature' },
  { name: 'bun-runtime', description: 'Bun runtime-specific features', color: '#FBCA04', component: 'shared', priority: 'medium', changeType: 'feature' },
  { name: 'testing', description: 'Test execution and validation', color: '#C5DEF5', component: 'utils', priority: 'medium', changeType: 'feature' },
  { name: 'dependencies', description: 'Package management and dependencies', color: '#006B75', component: 'infra', priority: 'medium', changeType: 'feature' }
];

class DocsEnhancer {
  private labelsHtml = '';

  constructor() {
    this.generateLabelsHtml();
  }

  private generateLabelsHtml(): void {
    const componentLabels = GITHUB_LABELS.filter(l => ['api', 'core', 'shared', 'entry-point', 'infra', 'utils'].includes(l.name));
    const priorityLabels = GITHUB_LABELS.filter(l => l.name.startsWith('priority:'));
    const changeTypeLabels = GITHUB_LABELS.filter(l => ['feature', 'bugfix', 'hotfix', 'chore', 'refactor', 'breaking-change'].includes(l.name));
    const openapiLabels = GITHUB_LABELS.filter(l => ['security', 'performance', 'cli', 'deployment', 'monitoring', 'bun-runtime', 'testing', 'dependencies'].includes(l.name));

    this.labelsHtml = `
      <div class="github-labels-reference" style="
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        margin: 2rem 0;
        padding: 1.5rem;
      ">
        <h3 style="color: #00d4ff; margin-top: 0; margin-bottom: 1rem;">🏷️ GitHub Labels Reference</h3>

        <div class="labels-matrix" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">

          <div class="label-category">
            <h4 style="color: #00ff88; margin-bottom: 0.5rem;">🏗️ Component Labels</h4>
            <div class="labels-grid" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${componentLabels.map(label => this.createLabelHtml(label)).join('')}
            </div>
          </div>

          <div class="label-category">
            <h4 style="color: #00ff88; margin-bottom: 0.5rem;">🎯 Priority Labels</h4>
            <div class="labels-grid" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${priorityLabels.map(label => this.createLabelHtml(label)).join('')}
            </div>
          </div>

          <div class="label-category">
            <h4 style="color: #00ff88; margin-bottom: 0.5rem;">🔄 Change Type Labels</h4>
            <div class="labels-grid" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${changeTypeLabels.map(label => this.createLabelHtml(label)).join('')}
            </div>
          </div>

          <div class="label-category">
            <h4 style="color: #00ff88; margin-bottom: 0.5rem;">📋 OpenAPI Tags</h4>
            <div class="labels-grid" style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${openapiLabels.map(label => this.createLabelHtml(label)).join('')}
            </div>
          </div>

        </div>

        <div class="usage-guide" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #333;">
          <h4 style="color: #00d4ff; margin-bottom: 0.5rem;">📖 Usage Guide</h4>
          <ul style="color: #e5e5e5; margin: 0; padding-left: 1.5rem; line-height: 1.6;">
            <li><strong>Component labels</strong> indicate which part of the codebase is affected</li>
            <li><strong>Priority labels</strong> determine the urgency and importance of changes</li>
            <li><strong>Change type labels</strong> categorize the nature of modifications</li>
            <li><strong>OpenAPI tags</strong> are used for API documentation and endpoint grouping</li>
            <li>Labels follow the format: <code style="background: #2a2a2a; padding: 2px 4px; border-radius: 3px;">[SCOPE:TPE][DDD:TAG]</code></li>
          </ul>
        </div>
      </div>
    `;
  }

  private createLabelHtml(label: LabelDefinition): string {
    return `
      <div class="github-label" style="
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: #2a2a2a;
        border-radius: 6px;
        border: 1px solid #444;
      ">
        <span class="label-badge" style="
          background-color: ${label.color};
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
          min-width: 60px;
          text-align: center;
        ">${label.name}</span>
        <span class="label-description" style="flex: 1; font-size: 0.9rem;">${label.description}</span>
        <span class="label-meta" style="font-size: 0.8rem; opacity: 0.7;">
          ${label.priority} • ${label.changeType}
        </span>
      </div>
    `;
  }

  async enhanceApiDocs(): Promise<void> {
    const apiDocsPath = join(process.cwd(), 'docs', 'api', 'index.html');

    try {
      let content = await Bun.file(apiDocsPath).text();

      // Remove any existing labels reference to avoid duplication
      content = content.replace(/<div class="github-labels-reference"[\s\S]*?<\/div>\s*<div class="github-labels-reference"[\s\S]*?<\/div>/g, '');
      content = content.replace(/<div class="github-labels-reference"[\s\S]*?<\/div>/g, '');

      // Find the header section and inject labels reference after it
      const headerEndPattern = /<\/div>\s*<div class="stats">/;
      const replacement = `</div>

      ${this.labelsHtml}

      <div class="stats">`;

      if (content.includes('<div class="stats">')) {
        content = content.replace(headerEndPattern, replacement);
      } else {
        // Fallback: insert after header
        const headerPattern = /<\/div>\s*<div class="tag-filters">/;
        content = content.replace(headerPattern, `</div>

      ${this.labelsHtml}

      <div class="tag-filters">`);
      }

      await Bun.write(apiDocsPath, content);
      console.log('✅ GitHub labels reference injected into API docs');

    } catch (error) {
      console.error('❌ Failed to enhance API docs:', error.message);
      throw error;
    }
  }

  getLabels(): LabelDefinition[] {
    return GITHUB_LABELS;
  }

  getLabelsHtml(): string {
    return this.labelsHtml;
  }
}

// CLI execution
async function main() {
  console.log("🎨 Enhancing API Documentation");
  console.log("==============================");

  const enhancer = new DocsEnhancer();

  try {
    await enhancer.enhanceApiDocs();

    const labels = enhancer.getLabels();
    console.log(`✅ Generated GitHub labels reference with ${labels.length} labels`);
    console.log("🏷️  Labels categorized by:");
    console.log("  • 6 component labels");
    console.log("  • 3 priority labels");
    console.log("  • 6 change type labels");
    console.log("  • 8 OpenAPI-specific labels");

    console.log("\n🎉 Documentation enhancement complete!");
    console.log("Visit /docs/api to see the enhanced documentation");

  } catch (error) {
    console.error("❌ Documentation enhancement failed:", error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { DocsEnhancer, GITHUB_LABELS };

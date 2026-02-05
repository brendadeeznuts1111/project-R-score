#!/usr/bin/env bun
/**
 * Prompt-to-Workflow Converter - Generate YAML workflows from natural language
 * WORKFLOW.PROMPT.CONVERT - AI-powered workflow generation
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";

interface WorkflowTemplate {
  name: string;
  description: string;
  triggers: string[];
  steps: WorkflowStepTemplate[];
  variables: Record<string, any>;
}

interface WorkflowStepTemplate {
  name: string;
  type: string;
  condition?: string;
  parameters: Record<string, any>;
  humanApproval?: boolean;
  timeout?: string;
  retry?: {
    attempts: number;
    backoff: string;
  };
}

class PromptToWorkflowConverter {
  private templates: Map<string, WorkflowTemplate> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    // Define workflow templates for common patterns
    this.templates.set('ci-cd', {
      name: 'CI/CD Pipeline',
      description: 'Continuous integration and deployment pipeline',
      triggers: ['push', 'pull_request'],
      steps: [
        {
          name: 'lint',
          type: 'command',
          parameters: { command: 'bun run lint' },
          timeout: '5m'
        },
        {
          name: 'test',
          type: 'command',
          parameters: { command: 'bun test' },
          timeout: '10m'
        },
        {
          name: 'build',
          type: 'command',
          parameters: { command: 'bun build' },
          timeout: '15m'
        },
        {
          name: 'deploy-staging',
          type: 'command',
          condition: 'branch == main',
          parameters: { command: 'bun run deploy:staging' },
          humanApproval: true,
          timeout: '30m'
        },
        {
          name: 'deploy-prod',
          type: 'command',
          condition: 'branch == main && tests_passed',
          parameters: { command: 'bun run deploy:prod' },
          humanApproval: true,
          timeout: '30m'
        }
      ],
      variables: {
        environment: 'production',
        region: 'us-east-1'
      }
    });

    this.templates.set('code-review', {
      name: 'Code Review Pipeline',
      description: 'Automated code review and quality checks',
      triggers: ['pull_request'],
      steps: [
        {
          name: 'security-scan',
          type: 'agent',
          parameters: { agent: 'security-scanner', target: '.' },
          timeout: '10m'
        },
        {
          name: 'code-quality',
          type: 'agent',
          parameters: { agent: 'code-formatter', action: 'check' },
          timeout: '5m'
        },
        {
          name: 'performance-test',
          type: 'command',
          parameters: { command: 'bun run perf:test' },
          timeout: '15m'
        },
        {
          name: 'human-review',
          type: 'human_approval',
          parameters: {
            reviewers: ['tech-lead', 'security-reviewer'],
            criteria: ['security', 'performance', 'maintainability']
          },
          humanApproval: true,
          timeout: '24h'
        }
      ],
      variables: {}
    });

    this.templates.set('release', {
      name: 'Release Automation',
      description: 'Automated release process with quality gates',
      triggers: ['tag'],
      steps: [
        {
          name: 'validate-version',
          type: 'command',
          parameters: { command: 'node scripts/validate-version.js $TAG' },
          timeout: '2m'
        },
        {
          name: 'integration-tests',
          type: 'command',
          parameters: { command: 'bun run test:integration' },
          timeout: '20m'
        },
        {
          name: 'build-artifacts',
          type: 'parallel',
          parameters: {
            steps: [
              { name: 'build-linux', command: 'bun build --target linux' },
              { name: 'build-macos', command: 'bun build --target macos' },
              { name: 'build-windows', command: 'bun build --target windows' }
            ]
          },
          timeout: '30m'
        },
        {
          name: 'security-audit',
          type: 'command',
          parameters: { command: 'bun audit --severity high' },
          timeout: '5m'
        },
        {
          name: 'publish',
          type: 'command',
          condition: 'security_audit_passed',
          parameters: { command: 'bun run publish $TAG' },
          humanApproval: true,
          timeout: '10m'
        }
      ],
      variables: {
        tag: '${GITHUB_REF#refs/tags/}',
        registry: 'npm'
      }
    });
  }

  // Convert natural language prompt to workflow
  async convertPrompt(prompt: string): Promise<string> {
    const normalizedPrompt = prompt.toLowerCase().trim();

    // Pattern matching for common workflow types
    if (this.matchesPattern(normalizedPrompt, ['ci', 'cd', 'continuous', 'integration', 'deployment', 'pipeline'])) {
      return this.generateWorkflowFromTemplate('ci-cd', prompt);
    }

    if (this.matchesPattern(normalizedPrompt, ['code review', 'review', 'quality', 'check'])) {
      return this.generateWorkflowFromTemplate('code-review', prompt);
    }

    if (this.matchesPattern(normalizedPrompt, ['release', 'publish', 'deploy', 'production'])) {
      return this.generateWorkflowFromTemplate('release', prompt);
    }

    // Custom workflow generation
    return this.generateCustomWorkflow(prompt);
  }

  private matchesPattern(prompt: string, keywords: string[]): boolean {
    return keywords.some(keyword => prompt.includes(keyword));
  }

  private generateWorkflowFromTemplate(templateName: string, originalPrompt: string): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Customize template based on prompt
    const customizedTemplate = this.customizeTemplate(template, originalPrompt);

    return this.templateToYAML(customizedTemplate);
  }

  private customizeTemplate(template: WorkflowTemplate, prompt: string): WorkflowTemplate {
    const customized = { ...template };

    // Extract specific requirements from prompt
    if (prompt.includes('github')) {
      customized.triggers = ['push', 'pull_request'];
    }

    if (prompt.includes('manual') || prompt.includes('approval')) {
      customized.steps.forEach(step => {
        if (step.type === 'command') {
          step.humanApproval = true;
        }
      });
    }

    if (prompt.includes('parallel')) {
      // Convert sequential steps to parallel where possible
      const parallelSteps = customized.steps.filter(step =>
        !step.condition && step.type === 'command'
      );
      if (parallelSteps.length > 1) {
        customized.steps = [
          {
            name: 'parallel-execution',
            type: 'parallel',
            parameters: { steps: parallelSteps },
            timeout: '30m'
          },
          ...customized.steps.filter(step => step.condition || step.type !== 'command')
        ];
      }
    }

    return customized;
  }

  private generateCustomWorkflow(prompt: string): string {
    // Extract workflow components from natural language
    const workflow = {
      name: this.extractWorkflowName(prompt),
      description: prompt,
      version: '1.0.0',
      triggers: this.extractTriggers(prompt),
      steps: this.extractSteps(prompt),
      variables: this.extractVariables(prompt)
    };

    return this.workflowToYAML(workflow);
  }

  private extractWorkflowName(prompt: string): string {
    // Extract a reasonable name from the prompt
    const words = prompt.split(' ').slice(0, 3);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Workflow';
  }

  private extractTriggers(prompt: string): string[] {
    const triggers: string[] = [];

    if (prompt.includes('push') || prompt.includes('commit')) {
      triggers.push('push');
    }
    if (prompt.includes('pull request') || prompt.includes('pr')) {
      triggers.push('pull_request');
    }
    if (prompt.includes('schedule') || prompt.includes('cron')) {
      triggers.push('schedule');
    }
    if (prompt.includes('manual') || prompt.includes('workflow_dispatch')) {
      triggers.push('workflow_dispatch');
    }

    return triggers.length > 0 ? triggers : ['push'];
  }

  private extractSteps(prompt: string): WorkflowStepTemplate[] {
    const steps: WorkflowStepTemplate[] = [];

    // Look for common actions
    if (prompt.includes('test')) {
      steps.push({
        name: 'run-tests',
        type: 'command',
        parameters: { command: 'bun test' },
        timeout: '10m'
      });
    }

    if (prompt.includes('lint')) {
      steps.push({
        name: 'lint-code',
        type: 'command',
        parameters: { command: 'bun run lint' },
        timeout: '5m'
      });
    }

    if (prompt.includes('build')) {
      steps.push({
        name: 'build-project',
        type: 'command',
        parameters: { command: 'bun run build' },
        timeout: '15m'
      });
    }

    if (prompt.includes('deploy')) {
      steps.push({
        name: 'deploy-application',
        type: 'command',
        parameters: { command: 'bun run deploy' },
        humanApproval: prompt.includes('approval'),
        timeout: '30m'
      });
    }

    if (prompt.includes('review') || prompt.includes('human')) {
      steps.push({
        name: 'human-review',
        type: 'human_approval',
        parameters: { reviewers: ['team-lead'] },
        humanApproval: true,
        timeout: '24h'
      });
    }

    return steps.length > 0 ? steps : [{
      name: 'placeholder-step',
      type: 'command',
      parameters: { command: 'echo "Generated workflow step"' },
      timeout: '5m'
    }];
  }

  private extractVariables(prompt: string): Record<string, any> {
    const variables: Record<string, any> = {};

    // Extract environment mentions
    if (prompt.includes('production')) {
      variables.environment = 'production';
    } else if (prompt.includes('staging')) {
      variables.environment = 'staging';
    }

    // Extract version patterns
    const versionMatch = prompt.match(/v?\d+\.\d+\.\d+/);
    if (versionMatch) {
      variables.version = versionMatch[0];
    }

    return variables;
  }

  private templateToYAML(template: WorkflowTemplate): string {
    let yaml = `# ${template.name}\n`;
    yaml += `# ${template.description}\n\n`;

    yaml += `name: ${template.name}\n`;
    yaml += `description: ${template.description}\n`;
    yaml += `version: 1.0.0\n\n`;

    if (template.triggers.length > 0) {
      yaml += `triggers:\n`;
      template.triggers.forEach(trigger => {
        yaml += `  - ${trigger}\n`;
      });
      yaml += '\n';
    }

    yaml += `steps:\n`;
    template.steps.forEach(step => {
      yaml += `  - name: ${step.name}\n`;
      yaml += `    type: ${step.type}\n`;

      if (step.condition) {
        yaml += `    condition: ${step.condition}\n`;
      }

      yaml += `    parameters:\n`;
      Object.entries(step.parameters).forEach(([key, value]) => {
        yaml += `      ${key}: ${JSON.stringify(value)}\n`;
      });

      if (step.humanApproval) {
        yaml += `    humanApproval: true\n`;
      }

      if (step.timeout) {
        yaml += `    timeout: ${step.timeout}\n`;
      }

      if (step.retry) {
        yaml += `    retry:\n`;
        yaml += `      attempts: ${step.retry.attempts}\n`;
        yaml += `      backoff: ${step.retry.backoff}\n`;
      }

      yaml += '\n';
    });

    if (Object.keys(template.variables).length > 0) {
      yaml += `variables:\n`;
      Object.entries(template.variables).forEach(([key, value]) => {
        yaml += `  ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    return yaml;
  }

  private workflowToYAML(workflow: any): string {
    return this.templateToYAML(workflow as WorkflowTemplate);
  }

  // Save generated workflow to file
  async saveWorkflow(name: string, yaml: string): Promise<string> {
    const workflowsPath = join(process.cwd(), '.cursor', 'workflows');
    const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    const filepath = join(workflowsPath, filename);

    writeFileSync(filepath, yaml, 'utf-8');
    return filepath;
  }

  // List available templates
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  // Get template details
  getTemplate(name: string): WorkflowTemplate | undefined {
    return this.templates.get(name);
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
Prompt-to-Workflow Converter v1.0.0 - WORKFLOW.PROMPT.CONVERT

Usage:
  bun run scripts/prompt-to-workflow.ts <command> [options]

Commands:
  convert <prompt>                      Convert natural language to workflow
  template <name>                       Show workflow template
  list                                  List available templates
  save <name> <prompt>                  Convert and save workflow

Examples:
  bun run scripts/prompt-to-workflow.ts convert "deploy to production after tests pass"
  bun run scripts/prompt-to-workflow.ts template ci-cd
  bun run scripts/prompt-to-workflow.ts save my-workflow "CI pipeline with manual approval"
`);
    return;
  }

  const converter = new PromptToWorkflowConverter();

  try {
    switch (command) {
      case 'convert':
        const prompt = args.join(' ');
        if (!prompt) {
          throw new Error('Usage: convert <prompt>');
        }
        const yaml = await converter.convertPrompt(prompt);
        console.log(yaml);
        break;

      case 'template':
        const templateName = args[0];
        if (!templateName) {
          throw new Error('Usage: template <name>');
        }
        const template = converter.getTemplate(templateName);
        if (!template) {
          console.log(`Template not found: ${templateName}`);
          console.log('Available templates:', converter.listTemplates().join(', '));
        } else {
          console.log(converter.templateToYAML(template));
        }
        break;

      case 'list':
        console.log('Available templates:');
        converter.listTemplates().forEach(name => {
          const template = converter.getTemplate(name);
          console.log(`  ${name}: ${template?.description}`);
        });
        break;

      case 'save':
        const [saveName, ...savePromptParts] = args;
        const savePrompt = savePromptParts.join(' ');
        if (!saveName || !savePrompt) {
          throw new Error('Usage: save <name> <prompt>');
        }
        const workflowYaml = await converter.convertPrompt(savePrompt);
        const filepath = await converter.saveWorkflow(saveName, workflowYaml);
        console.log(`✅ Workflow saved: ${filepath}`);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Prompt-to-workflow error:', error.message);
    process.exit(1);
  }
}

export { PromptToWorkflowConverter };
export type { WorkflowTemplate, WorkflowStepTemplate };

// Run CLI if called directly
if (import.meta.main) {
  main();
}

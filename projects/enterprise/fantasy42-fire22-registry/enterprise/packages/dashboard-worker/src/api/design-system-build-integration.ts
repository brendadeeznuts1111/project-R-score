/**
 * Fire22 Dashboard Design System Build Integration
 * Coordinates the build system with the design team's design system
 * Ensures proper integration of design tokens, components, and themes
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DesignTeamIntegrationService } from './design-team-integration';
import { TaskEnhancedService } from './tasks-enhanced';
import { getDatabase } from '../database/connection';

export interface DesignSystemConfig {
  version: string;
  themeSystem: string;
  components: string[];
  designTokens: Record<string, any>;
  buildIntegration: {
    enabled: boolean;
    autoUpdate: boolean;
    validateTokens: boolean;
  };
}

export class DesignSystemBuildIntegration {
  private designService: DesignTeamIntegrationService;
  private taskService: TaskEnhancedService;
  private srcDir: string;
  private designSystemDir: string;

  constructor() {
    this.srcDir = join(process.cwd(), 'src');
    this.designSystemDir = join(process.cwd(), 'packages', 'shared-styles');
  }

  async initialize() {
    const db = await getDatabase(process.env);
    this.designService = new DesignTeamIntegrationService(db);
    this.taskService = new TaskEnhancedService(db);

    // Initialize design team integration
    await this.designService.initializeDesignIntegration();
  }

  /**
   * Create coordination tasks with the design team
   */
  async createDesignSystemCoordinationTasks() {
    console.log('🎨 Creating design system coordination tasks...');

    try {
      // Task 1: Design System Audit
      const auditTask = await this.taskService.createTask({
        title: 'Audit current design system integration in build process',
        description: `Review how the Fire22 Dashboard Pages Build System currently handles design assets and identify gaps in design system integration.

Current Issues Identified:
- Build system uses hardcoded inline styles instead of design tokens
- No integration with packages/shared-styles/ design system
- Missing OKLCH color system integration
- No component library usage in generated pages

Design System Assets Available:
- packages/shared-styles/theme-system.css (OKLCH color system)
- packages/shared-styles/highlight.css (component styles)
- src/styles/components/ (component library)
- packages/shared-styles/tools/color-utils.ts (design tokens)

Deliverables:
- Gap analysis document
- Integration plan
- Updated build system architecture`,
        priority: 'high',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
        assigneeId: 'isabella-martinez',
        reporterId: 'system',
        estimatedHours: 8,
        tags: ['design-system', 'build-integration', 'audit'],
      });

      // Task 2: Design Token Integration
      const tokenTask = await this.taskService.createTask({
        title: 'Integrate design tokens into build system',
        description: `Update the Fire22 Dashboard Pages Build System to use design tokens instead of hardcoded values.

Technical Requirements:
- Replace hardcoded colors in generateRootIndex() with CSS custom properties
- Import theme-system.css into generated pages
- Use OKLCH color system for department colors
- Integrate with color-utils.ts for dynamic color generation

Files to Update:
- scripts/build-pages.ts (main build system)
- src/styles/index.css (CSS entry point)
- Generated HTML templates

Expected Outcome:
- Consistent design language across all generated pages
- Automatic theme support (light/dark mode)
- Maintainable color system`,
        priority: 'high',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
        assigneeId: 'ethan-cooper',
        reporterId: 'isabella-martinez',
        estimatedHours: 12,
        tags: ['design-tokens', 'css-integration', 'build-system'],
      });

      // Task 3: Component Library Integration
      const componentTask = await this.taskService.createTask({
        title: 'Integrate component library into page generation',
        description: `Update the build system to use the existing component library instead of generating basic HTML.

Component Integration Plan:
- Use src/styles/components/ for consistent styling
- Replace inline styles with component classes
- Implement proper navigation components
- Add responsive design patterns

Components to Integrate:
- Dashboard cards (src/styles/components/cards.css)
- Navigation (src/styles/components/dashboard.css)
- Buttons (src/styles/components/buttons.css)
- Forms (src/styles/components/forms.css)

Technical Implementation:
- Update generateRootIndex() to use component classes
- Create reusable HTML templates
- Implement proper CSS bundling`,
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'technology',
        assigneeId: 'john-doe',
        reporterId: 'ethan-cooper',
        estimatedHours: 16,
        tags: ['components', 'html-generation', 'css-architecture'],
      });

      // Task 4: Visual Configurator Integration
      const configuratorTask = await this.taskService.createTask({
        title: 'Integrate visual configurator for theme customization',
        description: `Integrate the existing visual configurator tool into the build process for dynamic theme generation.

Integration Points:
- packages/shared-styles/tools/visual-configurator.html
- packages/shared-styles/tools/color-utils.ts
- Dynamic CSS generation based on department preferences

Features to Implement:
- Department-specific theme generation
- Real-time preview of design changes
- Export/import of theme configurations
- Integration with build-time CSS generation

Technical Requirements:
- Bun-based color utilities integration
- CSS custom property generation
- Theme validation and testing`,
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
        assigneeId: 'isabella-martinez',
        reporterId: 'system',
        estimatedHours: 10,
        tags: ['visual-configurator', 'theme-generation', 'tooling'],
      });

      // Task 5: Design System Documentation
      const docsTask = await this.taskService.createTask({
        title: 'Create design system integration documentation',
        description: `Document the integrated design system for developers and maintainers.

Documentation Scope:
- Design token usage guide
- Component integration patterns
- Build system design workflows
- Theme customization procedures
- Maintenance and update processes

Deliverables:
- Developer guide for design system usage
- Build system design integration manual
- Component library reference
- Theme customization tutorial
- Troubleshooting guide`,
        priority: 'medium',
        status: 'planning',
        progress: 0,
        departmentId: 'design',
        assigneeId: 'ethan-cooper',
        reporterId: 'isabella-martinez',
        estimatedHours: 6,
        tags: ['documentation', 'developer-experience', 'design-system'],
      });

      if (
        auditTask.success &&
        tokenTask.success &&
        componentTask.success &&
        configuratorTask.success &&
        docsTask.success
      ) {
        console.log('✅ Design system coordination tasks created successfully');

        // Create cross-references between tasks
        await this.createTaskDependencies([
          auditTask.data!.uuid,
          tokenTask.data!.uuid,
          componentTask.data!.uuid,
          configuratorTask.data!.uuid,
          docsTask.data!.uuid,
        ]);

        return {
          success: true,
          data: {
            tasks: [
              auditTask.data!,
              tokenTask.data!,
              componentTask.data!,
              configuratorTask.data!,
              docsTask.data!,
            ],
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'TASK_CREATION_FAILED',
          message: 'Failed to create one or more coordination tasks',
        },
      };
    } catch (error) {
      console.error('❌ Error creating design system coordination tasks:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };
    }
  }

  /**
   * Analyze current design system integration status
   */
  async analyzeDesignSystemIntegration() {
    console.log('🔍 Analyzing current design system integration...');

    const analysis = {
      buildSystemStatus: this.analyzeBuildSystem(),
      designSystemAssets: this.analyzeDesignSystemAssets(),
      integrationGaps: [] as string[],
      recommendations: [] as string[],
    };

    // Identify integration gaps
    if (!analysis.buildSystemStatus.usesDesignTokens) {
      analysis.integrationGaps.push('Build system uses hardcoded styles instead of design tokens');
      analysis.recommendations.push('Integrate CSS custom properties from theme-system.css');
    }

    if (!analysis.buildSystemStatus.usesComponentLibrary) {
      analysis.integrationGaps.push("Generated HTML doesn't use component library");
      analysis.recommendations.push(
        'Replace inline styles with component classes from src/styles/components/'
      );
    }

    if (!analysis.buildSystemStatus.supportsThemes) {
      analysis.integrationGaps.push('No theme system integration');
      analysis.recommendations.push('Integrate OKLCH color system and dark/light mode support');
    }

    if (!analysis.designSystemAssets.hasColorUtils) {
      analysis.integrationGaps.push('Color utilities not integrated into build process');
      analysis.recommendations.push('Use color-utils.ts for dynamic color generation');
    }

    return {
      success: true,
      data: analysis,
    };
  }

  /**
   * Request design review for build system integration
   */
  async requestBuildSystemDesignReview() {
    console.log('🎨 Requesting design review for build system integration...');

    const reviewRequest = await this.designService.requestDesignReview({
      taskUuid: 'build-system-integration',
      reviewType: 'design_system',
      priority: 'high',
      description: `Design review needed for Fire22 Dashboard Pages Build System integration with the design system.

Current State:
- Build system generates pages with hardcoded inline styles
- No integration with packages/shared-styles/ design system
- Missing OKLCH color system usage
- No component library integration

Review Scope:
- Evaluate current build system architecture
- Recommend design system integration approach
- Review generated page designs for consistency
- Validate accessibility and responsive design
- Ensure brand compliance

Assets for Review:
- scripts/build-pages.ts (main build system)
- Generated pages in dist/pages/
- Design system in packages/shared-styles/
- Component library in src/styles/components/`,
      assets: [
        'scripts/build-pages.ts',
        'packages/shared-styles/theme-system.css',
        'packages/shared-styles/tools/visual-configurator.html',
      ],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
      requesterId: 'system',
      specificReviewer: 'isabella-martinez',
    });

    return reviewRequest;
  }

  // Private helper methods
  private analyzeBuildSystem() {
    const buildSystemPath = join(process.cwd(), 'scripts', 'build-pages.ts');

    if (!existsSync(buildSystemPath)) {
      return {
        exists: false,
        usesDesignTokens: false,
        usesComponentLibrary: false,
        supportsThemes: false,
      };
    }

    const buildSystemContent = readFileSync(buildSystemPath, 'utf-8');

    return {
      exists: true,
      usesDesignTokens:
        buildSystemContent.includes('var(--') || buildSystemContent.includes('CSS.supports'),
      usesComponentLibrary:
        buildSystemContent.includes('component') && buildSystemContent.includes('class='),
      supportsThemes:
        buildSystemContent.includes('theme') || buildSystemContent.includes('dark-mode'),
      hasInlineStyles: buildSystemContent.includes('style="'),
      usesHardcodedColors: /color:\s*#[0-9a-fA-F]{6}/.test(buildSystemContent),
    };
  }

  private analyzeDesignSystemAssets() {
    return {
      hasThemeSystem: existsSync(join(this.designSystemDir, 'theme-system.css')),
      hasColorUtils: existsSync(join(this.designSystemDir, 'tools', 'color-utils.ts')),
      hasVisualConfigurator: existsSync(
        join(this.designSystemDir, 'tools', 'visual-configurator.html')
      ),
      hasComponentStyles: existsSync(join(this.srcDir, 'styles', 'components')),
      hasDesignTokens: existsSync(join(this.srcDir, 'styles', 'base', 'variables.css')),
    };
  }

  private async createTaskDependencies(taskUuids: string[]) {
    // Create dependency comments linking the tasks
    for (let i = 0; i < taskUuids.length - 1; i++) {
      await this.taskService.addComment(taskUuids[i + 1], {
        content: `📋 Depends on: ${taskUuids[i]}`,
        type: 'dependency',
        userId: 'system',
      });
    }

    // Create project overview comment
    const projectComment = `🎨 Design System Integration Project

Related Tasks:
${taskUuids.map((uuid, index) => `${index + 1}. ${uuid}`).join('\n')}

This is part of a coordinated effort to integrate the Fire22 design system with the dashboard pages build automation.`;

    for (const uuid of taskUuids) {
      await this.taskService.addComment(uuid, {
        content: projectComment,
        type: 'project_overview',
        userId: 'system',
      });
    }
  }
}

export default DesignSystemBuildIntegration;

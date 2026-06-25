#!/usr/bin/env bun

/**
 * 🔍 Comprehensive Dry-Run Validation - Complete System Verification
 * 
 * Validates all components of the artifact system including:
 * - R2 integration scripts and configuration
 * - Tag system functionality
 * - Dashboard integration
 * - Repository structure and documentation
 * - Dependencies and environment setup
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  component: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: string;
}

class SystemValidator {
  private results: ValidationResult[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Run comprehensive validation
   */
  async validate(): Promise<void> {
    console.info('🔍 Comprehensive Dry-Run Validation');
    console.info('=====================================\n');

    console.info('📋 Validating System Components...\n');

    // 1. Core Scripts Validation
    await this.validateCoreScripts();

    // 2. R2 Integration Validation
    await this.validateR2Integration();

    // 3. Tag System Validation
    await this.validateTagSystem();

    // 4. Dashboard Integration Validation
    await this.validateDashboardIntegration();

    // 5. Repository Structure Validation
    await this.validateRepositoryStructure();

    // 6. Dependencies Validation
    await this.validateDependencies();

    // 7. Configuration Validation
    await this.validateConfiguration();

    // 8. Documentation Validation
    await this.validateDocumentation();

    // 9. Environment Setup Validation
    await this.validateEnvironmentSetup();

    // 10. Production Readiness Validation
    await this.validateProductionReadiness();

    // Generate comprehensive report
    this.generateReport();
  }

  /**
   * Validate core scripts
   */
  private async validateCoreScripts(): Promise<void> {
    console.info('🔧 Validating Core Scripts...');

    const coreScripts = [
      'scripts/dashboard.ts',
      'scripts/tag-system.ts',
      'scripts/find-artifact.ts',
      'scripts/audit-tags.ts',
      'scripts/r2-integration.ts',
      'scripts/r2-deployment.ts'
    ];

    for (const script of coreScripts) {
      const scriptPath = join(this.projectRoot, script);
      if (existsSync(scriptPath)) {
        const content = readFileSync(scriptPath, 'utf8');
        const hasShebang = content.startsWith('#!/usr/bin/env bun');
        const isExecutable = hasShebang;
        
        this.results.push({
          component: `Script: ${script}`,
          status: isExecutable ? '✅' : '⚠️',
          message: isExecutable ? 'Executable with proper shebang' : 'Missing shebang',
          details: `Size: ${content.length} bytes`
        });
      } else {
        this.results.push({
          component: `Script: ${script}`,
          status: '❌',
          message: 'Script not found',
          details: `Expected at: ${scriptPath}`
        });
      }
    }
  }

  /**
   * Validate R2 integration
   */
  private async validateR2Integration(): Promise<void> {
    console.info('🚀 Validating R2 Integration...');

    const r2Components = [
      { file: 'scripts/r2-integration.ts', description: 'R2 Integration CLI' },
      { file: 'scripts/r2-deployment.ts', description: 'R2 Deployment Script' },
      { file: 'demo-r2-integration.ts', description: 'R2 Integration Demo' },
      { file: '.env.r2.template', description: 'R2 Environment Template' }
    ];

    for (const component of r2Components) {
      const componentPath = join(this.projectRoot, component.file);
      if (existsSync(componentPath)) {
        const content = readFileSync(componentPath, 'utf8');
        
        // Check for required functions and exports
        const hasRequiredExports = this.checkR2Exports(content);
        
        this.results.push({
          component: `R2: ${component.description}`,
          status: hasRequiredExports ? '✅' : '⚠️',
          message: hasRequiredExports ? 'Complete implementation' : 'Missing exports',
          details: `Size: ${content.length} bytes`
        });
      } else {
        this.results.push({
          component: `R2: ${component.description}`,
          status: '❌',
          message: 'Component not found',
          details: `Expected at: ${componentPath}`
        });
      }
    }
  }

  /**
   * Validate tag system
   */
  private async validateTagSystem(): Promise<void> {
    console.info('🏷️  Validating Tag System...');

    const tagSystemPath = join(this.projectRoot, 'scripts/tag-system.ts');
    if (existsSync(tagSystemPath)) {
      const content = readFileSync(tagSystemPath, 'utf8');
      
      const requiredClasses = ['AdvancedTagSystem'];
      const requiredMethods = ['parseTag', 'validateTag', 'generateTag', 'searchByTags', 'getTagAnalytics'];
      
      const hasRequiredClasses = requiredClasses.every(cls => content.includes(cls));
      const hasRequiredMethods = requiredMethods.every(method => content.includes(method));
      
      this.results.push({
        component: 'Tag System',
        status: hasRequiredClasses && hasRequiredMethods ? '✅' : '⚠️',
        message: 'Advanced tag system implementation',
        details: `Classes: ${requiredClasses.length}, Methods: ${requiredMethods.length}`
      });
    } else {
      this.results.push({
        component: 'Tag System',
        status: '❌',
        message: 'Tag system not found'
      });
    }
  }

  /**
   * Validate dashboard integration
   */
  private async validateDashboardIntegration(): Promise<void> {
    console.info('📊 Validating Dashboard Integration...');

    const dashboardPath = join(this.projectRoot, 'scripts/dashboard.ts');
    if (existsSync(dashboardPath)) {
      const content = readFileSync(dashboardPath, 'utf8');
      
      const hasInteractiveFeatures = content.includes('InteractiveProjectDashboard');
      const hasR2Integration = content.includes('r2') || content.includes('R2');
      const hasTagIntegration = content.includes('tag') || content.includes('Tag');
      
      this.results.push({
        component: 'Dashboard Integration',
        status: hasInteractiveFeatures ? '✅' : '⚠️',
        message: 'Interactive dashboard with integrations',
        details: `R2: ${hasR2Integration ? 'Yes' : 'No'}, Tags: ${hasTagIntegration ? 'Yes' : 'No'}`
      });
    } else {
      this.results.push({
        component: 'Dashboard Integration',
        status: '❌',
        message: 'Dashboard not found'
      });
    }
  }

  /**
   * Validate repository structure
   */
  private async validateRepositoryStructure(): Promise<void> {
    console.info('📁 Validating Repository Structure...');

    const requiredStructure = [
      'src/',
      'scripts/',
      'docs/',
      'tests/',
      '.github/',
      '.github/ISSUE_TEMPLATE/',
      '.github/workflows/'
    ];

    for (const dir of requiredStructure) {
      const dirPath = join(this.projectRoot, dir);
      if (existsSync(dirPath)) {
        this.results.push({
          component: `Directory: ${dir}`,
          status: '✅',
          message: 'Directory exists'
        });
      } else {
        this.results.push({
          component: `Directory: ${dir}`,
          status: '❌',
          message: 'Directory not found'
        });
      }
    }
  }

  /**
   * Validate dependencies
   */
  private async validateDependencies(): Promise<void> {
    console.info('📦 Validating Dependencies...');

    const packageJsonPath = join(this.projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      const requiredDeps = ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'];
      const requiredDevDeps = ['@eslint/js', '@typescript-eslint/eslint-plugin', 'prettier'];
      const requiredScripts = ['r2:upload', 'r2:deploy', 'dashboard', 'tag-system'];
      
      const hasRequiredDeps = requiredDeps.every(dep => packageJson.dependencies?.[dep]);
      const hasRequiredDevDeps = requiredDevDeps.every(dep => packageJson.devDependencies?.[dep]);
      const hasRequiredScripts = requiredScripts.every(script => packageJson.scripts?.[script]);
      
      this.results.push({
        component: 'Dependencies',
        status: hasRequiredDeps && hasRequiredDevDeps && hasRequiredScripts ? '✅' : '⚠️',
        message: 'Package configuration',
        details: `Deps: ${hasRequiredDeps ? 'OK' : 'Missing'}, DevDeps: ${hasRequiredDevDeps ? 'OK' : 'Missing'}, Scripts: ${hasRequiredScripts ? 'OK' : 'Missing'}`
      });
    } else {
      this.results.push({
        component: 'Dependencies',
        status: '❌',
        message: 'package.json not found'
      });
    }
  }

  /**
   * Validate configuration
   */
  private async validateConfiguration(): Promise<void> {
    console.info('⚙️  Validating Configuration...');

    const configFiles = [
      'eslint.config.js',
      '.prettierrc',
      '.gitignore',
      'bunfig.toml'
    ];

    for (const configFile of configFiles) {
      const configPath = join(this.projectRoot, configFile);
      if (existsSync(configPath)) {
        this.results.push({
          component: `Config: ${configFile}`,
          status: '✅',
          message: 'Configuration file exists'
        });
      } else {
        this.results.push({
          component: `Config: ${configFile}`,
          status: '⚠️',
          message: 'Configuration file missing'
        });
      }
    }
  }

  /**
   * Validate documentation
   */
  private async validateDocumentation(): Promise<void> {
    console.info('📚 Validating Documentation...');

    const docs = [
      'README.md',
      'CONTRIBUTING.md',
      'SECURITY.md',
      'LICENSE',
      'CODE_OF_CONDUCT.md',
      'CHANGELOG.md'
    ];

    for (const doc of docs) {
      const docPath = join(this.projectRoot, doc);
      if (existsSync(docPath)) {
        const content = readFileSync(docPath, 'utf8');
        this.results.push({
          component: `Documentation: ${doc}`,
          status: content.length > 100 ? '✅' : '⚠️',
          message: 'Documentation exists',
          details: `Size: ${content.length} bytes`
        });
      } else {
        this.results.push({
          component: `Documentation: ${doc}`,
          status: '❌',
          message: 'Documentation missing'
        });
      }
    }
  }

  /**
   * Validate environment setup
   */
  private async validateEnvironmentSetup(): Promise<void> {
    console.info('🌍 Validating Environment Setup...');

    const envFiles = [
      '.env.r2.template',
      '.env.sample'
    ];

    for (const envFile of envFiles) {
      const envPath = join(this.projectRoot, envFile);
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf8');
        const hasRequiredVars = content.includes('R2_') && content.includes('CLOUDFLARE_');
        
        this.results.push({
          component: `Environment: ${envFile}`,
          status: hasRequiredVars ? '✅' : '⚠️',
          message: 'Environment template',
          details: `Variables: ${hasRequiredVars ? 'Complete' : 'Missing'}`
        });
      } else {
        this.results.push({
          component: `Environment: ${envFile}`,
          status: '⚠️',
          message: 'Environment template missing'
        });
      }
    }
  }

  /**
   * Validate production readiness
   */
  private async validateProductionReadiness(): Promise<void> {
    console.info('🚀 Validating Production Readiness...');

    // Check for GitHub workflows
    const workflowsPath = join(this.projectRoot, '.github/workflows');
    const hasWorkflows = existsSync(workflowsPath);
    
    // Check for issue templates
    const templatesPath = join(this.projectRoot, '.github/ISSUE_TEMPLATE');
    const hasTemplates = existsSync(templatesPath);
    
    // Check for PR template
    const prTemplatePath = join(this.projectRoot, '.github/pull_request_template.md');
    const hasPRTemplate = existsSync(prTemplatePath);
    
    this.results.push({
      component: 'Production Readiness',
      status: hasWorkflows && hasTemplates && hasPRTemplate ? '✅' : '⚠️',
      message: 'GitHub integration',
      details: `Workflows: ${hasWorkflows ? 'Yes' : 'No'}, Templates: ${hasTemplates ? 'Yes' : 'No'}, PR: ${hasPRTemplate ? 'Yes' : 'No'}`
    });
  }

  /**
   * Check R2 exports
   */
  private checkR2Exports(content: string): boolean {
    const requiredExports = ['R2ArtifactManager', 'R2Deployment', 'CloudflareAPI'];
    return requiredExports.some(export_ => content.includes(export_));
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(): void {
    console.info('\n📊 VALIDATION REPORT');
    console.info('====================\n');

    const total = this.results.length;
    const passed = this.results.filter(r => r.status === '✅').length;
    const failed = this.results.filter(r => r.status === '❌').length;
    const warnings = this.results.filter(r => r.status === '⚠️').length;

    // Summary
    console.info(`📈 Summary: ${passed}/${total} passed, ${warnings} warnings, ${failed} failed\n`);

    // Detailed results
    console.info('📋 Detailed Results:');
    console.info('===================');
    
    this.results.forEach(result => {
      console.info(`${result.status} ${result.component}: ${result.message}`);
      if (result.details) {
        console.info(`   ${result.details}`);
      }
    });

    // Status breakdown
    console.info('\n🎯 Status Breakdown:');
    console.info('====================');
    
    const categories = {
      '✅ Passed': this.results.filter(r => r.status === '✅'),
      '⚠️  Warnings': this.results.filter(r => r.status === '⚠️'),
      '❌ Failed': this.results.filter(r => r.status === '❌')
    };

    Object.entries(categories).forEach(([status, items]) => {
      if (items.length > 0) {
        console.info(`\n${status} (${items.length}):`);
        items.forEach(item => {
          console.info(`   • ${item.component}`);
        });
      }
    });

    // Production readiness assessment
    console.info('\n🚀 Production Readiness Assessment:');
    console.info('===================================');
    
    const criticalComponents = [
      'Script: scripts/r2-integration.ts',
      'Script: scripts/r2-deployment.ts',
      'R2: R2 Integration CLI',
      'R2: R2 Deployment Script',
      'Tag System',
      'Dashboard Integration',
      'Dependencies',
      'Documentation: README.md',
      'Documentation: CONTRIBUTING.md',
      'Production Readiness'
    ];

    const criticalResults = this.results.filter(r => 
      criticalComponents.some(comp => r.component.includes(comp.split(':')[1]?.trim() || ''))
    );

    const criticalPassed = criticalResults.filter(r => r.status === '✅').length;
    const criticalTotal = criticalResults.length;

    const readinessScore = Math.round((criticalPassed / criticalTotal) * 100);

    console.info(`📊 Critical Components: ${criticalPassed}/${criticalTotal} (${readinessScore}%)`);
    
    if (readinessScore >= 90) {
      console.info('🎉 EXCELLENT: System is production-ready!');
    } else if (readinessScore >= 75) {
      console.info('✅ GOOD: System is mostly ready with minor issues');
    } else if (readinessScore >= 50) {
      console.info('⚠️  FAIR: System needs attention before production');
    } else {
      console.info('❌ POOR: System requires significant work');
    }

    // Next steps
    console.info('\n📋 Next Steps:');
    console.info('==============');
    
    if (failed > 0) {
      console.info('🔧 Fix failed components before deployment');
    }
    
    if (warnings > 0) {
      console.info('⚠️  Review warnings for optimization opportunities');
    }
    
    if (readinessScore >= 90) {
      console.info('🚀 Ready for production deployment!');
      console.info('📝 Configure environment variables');
      console.info('🔑 Set up Cloudflare R2 credentials');
      console.info('🌐 Configure custom domain');
      console.info('🚀 Deploy with: bun run r2:deploy production ./dist');
    }

    console.info('\n✅ Dry-run validation completed!');
  }
}

// Auto-run if executed directly
if (import.meta.main) {
  const validator = new SystemValidator();
  validator.validate().catch(console.error);
}

export { SystemValidator, ValidationResult };

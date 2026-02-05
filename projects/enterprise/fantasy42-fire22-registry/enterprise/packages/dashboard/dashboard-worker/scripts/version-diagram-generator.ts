#!/usr/bin/env bun

/**
 * 📊 Fire22 Version Management Diagram Generator
 *
 * Generates stunning ANSI-colored ASCII diagrams for:
 * - Version Management System
 * - Build Automation Flow
 * - Package Architecture
 * - Deployment Pipeline
 */

import { Fire22DiagramTooling, DiagramConfig, AnsiArtConfig } from './diagram-tooling';

class VersionDiagramGenerator {
  private tooling: Fire22DiagramTooling;

  constructor() {
    this.tooling = new Fire22DiagramTooling(
      this.getDefaultConfig(),
      this.getDefaultAnsiConfig(),
      'chalk'
    );
  }

  /**
   * 🔄 Generate Version Management Flow
   */
  async generateVersionFlow(): Promise<void> {
    const config: DiagramConfig = {
      type: 'flowchart',
      title: 'Fire22 Version Management Flow',
      description: 'Complete version control and build automation workflow',
      mermaidCode: `
        graph TD
          A[📦 Package.json] --> B[🔧 Version Manager]
          B --> C{Version Type?}
          
          C -->|Patch| D[📈 Patch Version]
          C -->|Minor| E[🚀 Minor Version]
          C -->|Major| F[💥 Major Version]
          C -->|Prerelease| G[🧪 Prerelease Version]
          
          D --> H[3.0.6 → 3.0.7]
          E --> I[3.0.6 → 3.1.0]
          F --> J[3.0.6 → 4.0.0]
          G --> K[3.0.6 → 3.0.7-beta.0]
          
          H --> L[🏗️ Build Process]
          I --> L
          J --> L
          K --> L
          
          L --> M[📦 Package Build]
          L --> N[📚 Documentation]
          L --> O[🧪 Testing Suite]
          L --> P[📊 Metadata Update]
          
          M --> Q[🚀 Deploy]
          N --> Q
          O --> Q
          P --> Q
          
          Q --> R[✅ Production Ready]
          Q --> S[📋 Release Notes]
          Q --> T[🏷️ Git Tag]
      `,
      outputFormat: 'ansi',
      colorScheme: 'fire22',
      width: 100,
      height: 30,
    };

    this.tooling = new Fire22DiagramTooling(config, this.getDefaultAnsiConfig(), 'chalk');
    await this.tooling.run();
  }

  /**
   * 🏗️ Generate Build System Architecture
   */
  async generateBuildArchitecture(): Promise<void> {
    const config: DiagramConfig = {
      type: 'flowchart',
      title: 'Fire22 Build System Architecture',
      description: 'Modular build system with multiple profiles and quality gates',
      mermaidCode: `
        graph TD
          A[🏗️ Build Manager] --> B{Build Profile?}
          
          B -->|Quick| C[⚡ Quick Build]
          B -->|Standard| D[📋 Standard Build]
          B -->|Production| E[🚀 Production Build]
          B -->|Full| F[🔧 Full Build]
          
          C --> G[📦 Packages Only]
          D --> H[📚 + Documentation]
          E --> I[🔒 + Security Checks]
          F --> J[🧪 + Full Testing]
          
          G --> K[📦 @fire22/middleware]
          G --> L[🧪 @fire22/testing-framework]
          G --> M[💰 @fire22/wager-system]
          G --> N[🌍 @fire22/env-manager]
          
          H --> O[📖 HTML Docs]
          H --> P[📝 Markdown]
          H --> Q[🔧 API Docs]
          
          I --> R[🔍 Security Audit]
          I --> S[📊 Performance Check]
          I --> T[🔐 Dependency Scan]
          
          J --> U[🧪 Unit Tests]
          J --> V[🔗 Integration Tests]
          J --> W[📱 E2E Tests]
          
          K --> X[✅ Build Complete]
          L --> X
          M --> X
          N --> X
          O --> X
          P --> X
          Q --> X
          R --> X
          S --> X
          T --> X
          U --> X
          V --> X
          W --> X
      `,
      outputFormat: 'ansi',
      colorScheme: 'fire22',
      width: 120,
      height: 35,
    };

    this.tooling = new Fire22DiagramTooling(config, this.getDefaultAnsiConfig(), 'chalk');
    await this.tooling.run();
  }

  /**
   * 📦 Generate Package Architecture
   */
  async generatePackageArchitecture(): Promise<void> {
    const config: DiagramConfig = {
      type: 'flowchart',
      title: 'Fire22 Modular Package Architecture',
      description: 'Four independent packages with versioning and build tracking',
      mermaidCode: `
        graph TD
          A[🔥 Fire22 Dashboard Worker] --> B[📦 Package Manager]
          
          B --> C[🔧 @fire22/middleware]
          B --> D[🧪 @fire22/testing-framework]
          B --> E[💰 @fire22/wager-system]
          B --> F[🌍 @fire22/env-manager]
          
          C --> G[Version: 1.0.0]
          D --> H[Version: 1.0.0]
          E --> I[Version: 1.0.0]
          F --> J[Version: 1.0.0]
          
          G --> K[Status: Not Built]
          H --> L[Status: Not Built]
          I --> M[Status: Not Built]
          J --> N[Status: Not Built]
          
          K --> O[🏗️ Build Package]
          L --> P[🏗️ Build Package]
          M --> Q[🏗️ Build Package]
          N --> R[🏗️ Build Package]
          
          O --> S[📊 Build Status]
          P --> T[📊 Build Status]
          Q --> U[📊 Build Status]
          R --> V[📊 Build Status]
          
          S --> W[📦 Package Size]
          T --> X[📦 Package Size]
          U --> Y[📦 Package Size]
          V --> Z[📦 Package Size]
          
          W --> AA[🚀 Deploy Ready]
          X --> AA
          Y --> AA
          Z --> AA
      `,
      outputFormat: 'ansi',
      colorScheme: 'fire22',
      width: 100,
      height: 30,
    };

    this.tooling = new Fire22DiagramTooling(config, this.getDefaultAnsiConfig(), 'chalk');
    await this.tooling.run();
  }

  /**
   * 🚀 Generate Deployment Pipeline
   */
  async generateDeploymentPipeline(): Promise<void> {
    const config: DiagramConfig = {
      type: 'flowchart',
      title: 'Fire22 Deployment Pipeline',
      description: 'Complete CI/CD pipeline from development to production',
      mermaidCode: `
        graph TD
          A[💻 Development] --> B[📝 Git Commit]
          B --> C[🔄 CI/CD Trigger]
          
          C --> D[🧪 Automated Testing]
          C --> E[🔍 Code Quality Check]
          C --> F[📊 Security Scan]
          
          D --> G{All Tests Pass?}
          E --> H{Code Quality OK?}
          F --> I{Security Clear?}
          
          G -->|Yes| J[✅ Testing Passed]
          G -->|No| K[❌ Testing Failed]
          
          H -->|Yes| L[✅ Quality OK]
          H -->|No| M[❌ Quality Issues]
          
          I -->|Yes| N[✅ Security Clear]
          I -->|No| O[❌ Security Issues]
          
          J --> P[🚀 Build Package]
          L --> P
          N --> P
          
          P --> Q[📦 Package Ready]
          Q --> R{Environment?}
          
          R -->|Staging| S[🌍 Deploy to Staging]
          R -->|Production| T[🚀 Deploy to Production]
          
          S --> U[🧪 Staging Tests]
          T --> V[🔒 Production Checks]
          
          U --> W{Staging OK?}
          V --> X{Production OK?}
          
          W -->|Yes| Y[✅ Staging Ready]
          W -->|No| Z[❌ Staging Issues]
          
          X -->|Yes| AA[🎉 Production Live]
          X -->|No| BB[❌ Production Issues]
          
          Y --> CC[🚀 Promote to Production]
          Z --> DD[🔧 Fix Issues]
          BB --> DD
      `,
      outputFormat: 'ansi',
      colorScheme: 'fire22',
      width: 120,
      height: 35,
    };

    this.tooling = new Fire22DiagramTooling(config, this.getDefaultAnsiConfig(), 'chalk');
    await this.tooling.run();
  }

  /**
   * 🎯 Generate Command Matrix
   */
  async generateCommandMatrix(): Promise<void> {
    const config: DiagramConfig = {
      type: 'flowchart',
      title: 'Fire22 Command Matrix',
      description: 'Complete command structure for version management and build system',
      mermaidCode: `
        graph TD
          A[🔥 Fire22 Commands] --> B[📦 Version Management]
          A --> C[🏗️ Build System]
          A --> D[🧪 Testing Suite]
          A --> E[🚀 Deployment]
          
          B --> F[version:patch]
          B --> G[version:minor]
          B --> H[version:major]
          B --> I[version:prerelease]
          B --> J[version:status]
          B --> K[version:manager]
          
          C --> L[build:quick]
          C --> M[build:standard]
          C --> N[build:production]
          C --> O[build:packages]
          C --> P[build:version]
          
          D --> Q[test:quick]
          D --> R[test:checklist]
          D --> S[test:coverage]
          D --> T[test:integration]
          
          E --> U[deploy:staging]
          E --> V[deploy:production]
          E --> W[deploy:validate]
          
          F --> X[3.0.6 → 3.0.7]
          G --> Y[3.0.6 → 3.1.0]
          H --> Z[3.0.6 → 4.0.0]
          I --> AA[3.0.6 → 3.0.7-beta.0]
          
          L --> BB[📦 Packages Only]
          M --> CC[📚 + Documentation]
          N --> DD[🔒 + Security]
          O --> EE[🏗️ Build Packages]
          
          Q --> FF[Daily Health Check]
          R --> GG[Full Validation]
          S --> HH[Coverage Report]
          T --> II[Integration Tests]
          
          U --> JJ[🌍 Staging Environment]
          V --> KK[🚀 Production Environment]
          W --> LL[✅ Validate Deployment]
      `,
      outputFormat: 'ansi',
      colorScheme: 'fire22',
      width: 120,
      height: 35,
    };

    this.tooling = new Fire22DiagramTooling(config, this.getDefaultAnsiConfig(), 'chalk');
    await this.tooling.run();
  }

  /**
   * 🎨 Generate All Diagrams
   */
  async generateAllDiagrams(): Promise<void> {
    console.log('🎨 Generating all Fire22 diagrams...\n');

    await this.generateVersionFlow();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.generateBuildArchitecture();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.generatePackageArchitecture();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.generateDeploymentPipeline();
    await new Promise(resolve => setTimeout(resolve, 3000));

    await this.generateCommandMatrix();

    console.log('🎉 All diagrams generated successfully!');
  }

  private getDefaultConfig(): DiagramConfig {
    return {
      type: 'flowchart',
      title: 'Fire22 System Overview',
      description: 'Default configuration',
      mermaidCode: 'graph TD\n  A[Start] --> B[End]',
      outputFormat: 'ansi',
      colorScheme: 'fire22',
      width: 80,
      height: 24,
    };
  }

  private getDefaultAnsiConfig(): AnsiArtConfig {
    return {
      useUnicode: true,
      colorPalette: 'fire22',
      animation: false,
      interactive: false,
    };
  }
}

// CLI Interface
if (import.meta.main) {
  const generator = new VersionDiagramGenerator();

  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  switch (command) {
    case 'version':
      await generator.generateVersionFlow();
      break;
    case 'build':
      await generator.generateBuildArchitecture();
      break;
    case 'package':
      await generator.generatePackageArchitecture();
      break;
    case 'deploy':
      await generator.generateDeploymentPipeline();
      break;
    case 'commands':
      await generator.generateCommandMatrix();
      break;
    case 'all':
    default:
      await generator.generateAllDiagrams();
      break;
  }
}

export { VersionDiagramGenerator };

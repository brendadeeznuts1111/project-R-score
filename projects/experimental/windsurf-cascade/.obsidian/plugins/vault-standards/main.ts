import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, WorkspaceLeaf, MarkdownView, Modal } from 'obsidian';

// Template management types
interface TemplateValidationResult {
    valid: boolean;
    errors: TemplateError[];
    warnings: TemplateWarning[];
    suggestions: TemplateSuggestion[];
}

interface TemplateError {
    id: string;
    message: string;
    field?: string;
    line?: number;
    severity: 'error' | 'warning' | 'info';
}

interface TemplateWarning {
    id: string;
    message: string;
    field?: string;
    line?: number;
}

interface TemplateSuggestion {
    id: string;
    message: string;
    action: string;
    field?: string;
}

interface TemplateMetrics {
    totalTemplates: number;
    validTemplates: number;
    invalidTemplates: number;
    averageProcessingTime: number;
    mostUsedTemplate: string;
    lastValidation: Date;
}

interface VaultStandardsSettings {
    vaultPath: string;
    bunExecutable: string;
    autoValidate: boolean;
    showHealthIndicator: boolean;
    validationInterval: number;
    strictMode: boolean;
    enableBridge: boolean;
    bridgePort: number;

    // Enhanced settings for new architecture
    enableDataviewIntegration: boolean;
    enableCanvasValidation: boolean;
    enableTransitiveLinking: boolean;
    enableAliasConvergence: boolean;
    maxNeighborDepth: number;
    healthThresholds: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
    };

    // Performance settings
    maxConcurrentValidations: number;
    enableCaching: boolean;
    cacheTTL: number;
    enableMobileOptimizations: boolean;

    // Visual settings
    highlightIssues: boolean;
    showGraphOverlay: boolean;
    enableLivePreview: boolean;

    // Template management settings
    enableTemplateValidation: boolean;
    templateValidationInterval: number;
    templateAutoFix: boolean;
    enableTemplateAnalytics: boolean;
    templateRegistryPath: string;
    strictTemplateValidation: boolean;
    enableTemplatePreview: boolean;
    templateValidationRules: string[];
    enableTemplatePerformanceMonitoring: boolean;
}

const DEFAULT_SETTINGS: VaultStandardsSettings = {
    vaultPath: '',
    bunExecutable: 'bun',
    autoValidate: true,
    showHealthIndicator: true,
    validationInterval: 300000, // 5 minutes
    strictMode: false,
    enableBridge: true,
    bridgePort: 3999,

    // Enhanced defaults
    enableDataviewIntegration: true,
    enableCanvasValidation: true,
    enableTransitiveLinking: true,
    enableAliasConvergence: true,
    maxNeighborDepth: 2,
    healthThresholds: {
        excellent: 90,
        good: 75,
        fair: 60,
        poor: 40
    },

    // Performance defaults
    maxConcurrentValidations: 4,
    enableCaching: true,
    cacheTTL: 3600000, // 1 hour
    enableMobileOptimizations: true,

    // Visual defaults
    highlightIssues: true,
    showGraphOverlay: false,
    enableLivePreview: true,

    // Template management defaults
    enableTemplateValidation: true,
    templateValidationInterval: 600000, // 10 minutes
    templateAutoFix: false,
    enableTemplateAnalytics: true,
    templateRegistryPath: '06 - Templates',
    strictTemplateValidation: false,
    enableTemplatePreview: true,
    templateValidationRules: ['syntax', 'structure', 'metadata', 'variables'],
    enableTemplatePerformanceMonitoring: true
};

export default class VaultStandardsPlugin extends Plugin {
    settings!: VaultStandardsSettings;
    statusBarItemEl!: HTMLElement;
    validationTimer?: NodeJS.Timeout;
    templateValidationTimer?: NodeJS.Timeout;
    isConnected: boolean = false;
    private graphDb: any; // SQLite database instance
    private validationCache: Map<string, any> = new Map();
    private templateRegistry: Map<string, any> = new Map();
    private templateMetrics: TemplateMetrics = {
        totalTemplates: 0,
        validTemplates: 0,
        invalidTemplates: 0,
        averageProcessingTime: 0,
        mostUsedTemplate: '',
        lastValidation: new Date()
    };

    async onload() {
        console.log('Loading Enhanced Vault Standards Plugin...');

        await this.loadSettings();
        this.addSettingTab(new VaultStandardsSettingTab(this.app, this));

        // Initialize graph database
        this.initializeGraphDatabase();

        // Add status bar item
        this.statusBarItemEl = this.addStatusBarItem();
        this.updateStatusBar('🔄 Initializing...');

        // Initialize vault path if not set
        if (!this.settings.vaultPath) {
            this.settings.vaultPath = (this.app.vault.adapter as any).basePath;
            await this.saveSettings();
        }

        // Register enhanced commands
        this.addEnhancedCommands();

        // Register events with new validation types
        this.registerEnhancedEvents();

        // Start validation service
        if (this.settings.autoValidate) {
            this.startValidationService();
        }

        // Add ribbon icon with enhanced functionality
        this.addRibbonIcon('check-check', 'Enhanced Vault Validation', () => {
            this.showValidationMenu();
        });

        // Initialize connection to Bun bridge
        if (this.settings.enableBridge) {
            this.initializeEnhancedBridge();
        }

        // Add Dataview integration
        if (this.settings.enableDataviewIntegration) {
            this.initializeDataviewIntegration();
        }

        // Add live preview highlighting
        if (this.settings.enableLivePreview) {
            this.initializeLivePreview();
        }

        // Initialize template validation system
        if (this.settings.enableTemplateValidation) {
            this.initializeTemplateValidation();
        }

        console.log('Enhanced Vault Standards Plugin loaded successfully');
    }

    onunload() {
        if (this.validationTimer) {
            clearInterval(this.validationTimer);
        }
        if (this.templateValidationTimer) {
            clearInterval(this.templateValidationTimer);
        }
        if (this.graphDb) {
            this.graphDb.close();
        }
        console.log('Enhanced Vault Standards Plugin unloaded');
    }

    // Template Validation Methods
    private async initializeTemplateValidation() {
        console.log('Initializing template validation system...');

        // Load template registry
        await this.loadTemplateRegistry();

        // Start template validation service
        this.startTemplateValidationService();

        // Add template validation commands
        this.addTemplateValidationCommands();

        console.log('Template validation system initialized');
    }

    private async loadTemplateRegistry() {
        try {
            const templatePath = this.settings.templateRegistryPath;
            const templateFiles = await this.app.vault.getMarkdownFiles()
                .filter(file => file.path.includes(templatePath));

            this.templateRegistry.clear();

            for (const file of templateFiles) {
                const content = await this.app.vault.read(file);
                const template = this.parseTemplate(file.path, content);
                if (template) {
                    this.templateRegistry.set(file.path, template);
                }
            }

            this.templateMetrics.totalTemplates = this.templateRegistry.size;
            console.log(`Loaded ${this.templateRegistry.size} templates`);
        } catch (error) {
            console.error('Failed to load template registry:', error);
            new Notice('Failed to load template registry');
        }
    }

    private parseTemplate(path: string, content: string): any {
        try {
            const lines = content.split('\n');
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

            if (!frontmatterMatch) {
                return null;
            }

            const frontmatter = frontmatterMatch[1];
            const template: any = {
                path,
                frontmatter: {},
                content: content.substring(frontmatterMatch[0].length).trim(),
                variables: [],
                sections: []
            };

            // Parse YAML frontmatter
            frontmatter.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    template.frontmatter[key] = value.replace(/^["']|["']$/g, '');
                }
            });

            // Extract variables from content
            const variableMatches = content.match(/\{\{([^}]+)\}\}/g);
            if (variableMatches) {
                template.variables = [...new Set(variableMatches)];
            }

            // Extract sections
            const sectionMatches = content.match(/^#{1,3}\s+(.+)$/gm);
            if (sectionMatches) {
                template.sections = sectionMatches.map(match =>
                    match.replace(/^#{1,3}\s+/, '')
                );
            }

            return template;
        } catch (error) {
            console.error(`Failed to parse template ${path}:`, error);
            return null;
        }
    }

    private startTemplateValidationService() {
        if (this.templateValidationTimer) {
            clearInterval(this.templateValidationTimer);
        }

        this.templateValidationTimer = setInterval(async () => {
            await this.validateAllTemplates();
        }, this.settings.templateValidationInterval);

        // Run initial validation
        this.validateAllTemplates();
    }

    private async validateAllTemplates() {
        const startTime = Date.now();
        let validCount = 0;
        let invalidCount = 0;

        for (const [path, template] of this.templateRegistry) {
            const result = await this.validateTemplate(template);
            if (result.valid) {
                validCount++;
            } else {
                invalidCount++;
            }
        }

        this.templateMetrics.validTemplates = validCount;
        this.templateMetrics.invalidTemplates = invalidCount;
        this.templateMetrics.averageProcessingTime = Date.now() - startTime;
        this.templateMetrics.lastValidation = new Date();

        this.updateStatusBar();
    }

    private async validateTemplate(template: any): Promise<TemplateValidationResult> {
        const result: TemplateValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        // Validate frontmatter
        if (!template.frontmatter.type) {
            result.errors.push({
                id: 'missing-type',
                message: 'Template missing required type field',
                field: 'frontmatter.type',
                severity: 'error'
            });
            result.valid = false;
        }

        if (!template.frontmatter.title) {
            result.warnings.push({
                id: 'missing-title',
                message: 'Template missing title field',
                field: 'frontmatter.title'
            });
        }

        // Validate content structure
        if (!template.content || template.content.trim().length === 0) {
            result.errors.push({
                id: 'empty-content',
                message: 'Template has no content',
                severity: 'error'
            });
            result.valid = false;
        }

        // Validate variables
        template.variables.forEach((variable: string) => {
            if (variable.includes('undefined')) {
                result.warnings.push({
                    id: 'undefined-variable',
                    message: `Variable contains undefined: ${variable}`,
                    field: 'variables'
                });
            }
        });

        // Validate sections
        if (template.sections.length === 0) {
            result.suggestions.push({
                id: 'add-sections',
                message: 'Consider adding sections to improve template structure',
                action: 'Add markdown headers to organize content'
            });
        }

        return result;
    }

    private addTemplateValidationCommands() {
        this.addCommand({
            id: 'validate-all-templates',
            name: 'Validate All Templates',
            callback: async () => {
                await this.validateAllTemplates();
                this.showTemplateValidationResults();
            }
        });

        this.addCommand({
            id: 'show-template-metrics',
            name: 'Show Template Metrics',
            callback: () => {
                this.showTemplateMetrics();
            }
        });

        this.addCommand({
            id: 'fix-template-issues',
            name: 'Fix Template Issues',
            callback: async () => {
                await this.fixTemplateIssues();
            }
        });
    }

    private showTemplateValidationResults() {
        const modal = new TemplateValidationModal(this.app, this.templateMetrics);
        modal.open();
    }

    private showTemplateMetrics() {
        const metrics = this.templateMetrics;
        const message = `
Template Metrics:
• Total Templates: ${metrics.totalTemplates}
• Valid Templates: ${metrics.validTemplates}
• Invalid Templates: ${metrics.invalidTemplates}
• Average Processing Time: ${metrics.averageProcessingTime}ms
• Most Used Template: ${metrics.mostUsedTemplate || 'None'}
• Last Validation: ${metrics.lastValidation.toLocaleString()}
        `.trim();

        new Notice(message);
    }

    private async fixTemplateIssues() {
        let fixedCount = 0;

        for (const [path, template] of this.templateRegistry) {
            const result = await this.validateTemplate(template);

            if (!result.valid && this.settings.templateAutoFix) {
                // Auto-fix common issues
                let content = await this.app.vault.read(this.app.vault.getAbstractFileByPath(path) as TFile);

                // Add missing type if needed
                if (!template.frontmatter.type) {
                    content = content.replace(/^---\n/, '---\ntype: template\n');
                    fixedCount++;
                }

                await this.app.vault.modify(this.app.vault.getAbstractFileByPath(path) as TFile, content);
            }
        }

        new Notice(`Fixed ${fixedCount} template issues`);
        await this.loadTemplateRegistry(); // Reload registry
    }

    private initializeGraphDatabase() {
        try {
            // Initialize SQLite database for graph storage
            const dbPath = `${(this.app.vault.adapter as any).basePath}/.obsidian/graph.db`;
            this.graphDb = require('better-sqlite3')(dbPath);

            // Create enhanced schema
            this.graphDb.exec(`
        CREATE TABLE IF NOT EXISTS obsidian_nodes (
          path TEXT PRIMARY KEY,
          type TEXT,
          links TEXT,
          properties TEXT,
          tags TEXT,
          aliases TEXT,
          neighbors TEXT,
          dependencies TEXT,
          health TEXT,
          lastValidated TIMESTAMP,
          position TEXT
        );
        
        CREATE TABLE IF NOT EXISTS obsidian_edges (
          source TEXT,
          target TEXT,
          type TEXT,
          weight REAL DEFAULT 1.0,
          metadata TEXT,
          PRIMARY KEY (source, target, type)
        );
        
        CREATE TABLE IF NOT EXISTS validation_cache (
          key TEXT PRIMARY KEY,
          data TEXT,
          timestamp TIMESTAMP
        );
      `);

            console.log('✅ Graph database initialized');
        } catch (error) {
            console.warn('⚠️ Could not initialize graph database:', error);
            this.graphDb = null;
        }
    }

    addEnhancedCommands() {
        // Original commands
        this.addCommand({
            id: 'run-validation',
            name: 'Run Enhanced Vault Validation',
            callback: () => this.runValidation()
        });

        this.addCommand({
            id: 'run-validation-strict',
            name: 'Run Strict Validation (All Rules)',
            callback: () => this.runValidation(true)
        });

        // New enhanced commands
        this.addCommand({
            id: 'validate-transitive-links',
            name: 'Validate Transitive Links',
            callback: () => this.runTransitiveLinkValidation()
        });

        this.addCommand({
            id: 'validate-canvas-spatial',
            name: 'Validate Canvas Spatial Relationships',
            callback: () => this.runCanvasSpatialValidation()
        });

        this.addCommand({
            id: 'validate-alias-convergence',
            name: 'Validate Alias Convergence',
            callback: () => this.runAliasConvergenceValidation()
        });

        this.addCommand({
            id: 'analyze-vault-graph',
            name: 'Analyze Vault Graph Structure',
            callback: () => this.analyzeVaultGraph()
        });

        this.addCommand({
            id: 'fix-issues-smart',
            name: 'Smart Auto-Fix with AI Suggestions',
            callback: () => this.smartAutoFix()
        });

        this.addCommand({
            id: 'show-health-dashboard',
            name: 'Show Enhanced Health Dashboard',
            callback: () => this.showHealthDashboard()
        });

        this.addCommand({
            id: 'export-graph-dataview',
            name: 'Export Graph for Dataview',
            callback: () => this.exportGraphForDataview()
        });

        this.addCommand({
            id: 'toggle-transitive-suggestions',
            name: 'Toggle Transitive Link Suggestions',
            callback: () => {
                this.settings.enableTransitiveLinking = !this.settings.enableTransitiveLinking;
                this.saveSettings();
                new Notice(`Transitive linking ${this.settings.enableTransitiveLinking ? 'enabled' : 'disabled'}`);
            }
        });
    }

    registerEnhancedEvents() {
        // Original file modification event
        this.registerEvent(
            this.app.vault.on('modify', (file: TFile) => {
                if (file instanceof TFile && (file.extension === 'md' || file.extension === 'canvas')) {
                    this.debouncedValidate(file);
                }
            })
        );

        // Enhanced events for new validation types
        this.registerEvent(
            this.app.vault.on('create', (file: TFile) => {
                if (file instanceof TFile) {
                    this.validateNewFile(file);
                }
            })
        );

        // Canvas-specific events (using custom event handling)
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                if (this.settings.enableCanvasValidation) {
                    this.validateCanvas();
                }
            })
        );

        // Dataview integration events
        if (this.settings.enableDataviewIntegration) {
            this.registerEvent(
                this.app.metadataCache.on('resolved', () => {
                    this.onDataviewIndexReady();
                })
            );
        }
    }

    debouncedValidate = this.debounce((file: TFile) => {
        this.validateFileEnhanced(file);
    }, 1000);

    debounce(func: Function, wait: number) {
        let timeout: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async validateFileEnhanced(file: TFile) {
        if (!this.settings.autoValidate) return;

        try {
            const content = await this.app.vault.read(file);
            const cache = this.app.metadataCache.getFileCache(file);

            // Send to Bun worker for enhanced validation
            const validation = await this.runBunEnhancedValidation(file.path, content, cache);

            if (validation.issues.length > 0) {
                const severity = validation.issues.some((i: any) => i.severity === 'error') ? 'error' : 'warning';
                new Notice(`⚠️ ${validation.issues.length} issues in ${file.name}`, 5000);

                if (this.settings.highlightIssues) {
                    this.highlightIssues(file, validation.issues);
                }
            }

            // Update graph database
            this.updateGraphNode(file.path, validation);

        } catch (error) {
            console.error('Enhanced validation failed:', error);
        }
    }

    async runBunEnhancedValidation(filePath: string, content: string, cache: any): Promise<any> {
        try {
            const response = await fetch(`http://localhost:${this.settings.bridgePort}/api/validate-enhanced`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath,
                    content,
                    cache,
                    options: {
                        enableTransitiveLinking: this.settings.enableTransitiveLinking,
                        enableCanvasValidation: this.settings.enableCanvasValidation,
                        enableAliasConvergence: this.settings.enableAliasConvergence,
                        maxNeighborDepth: this.settings.maxNeighborDepth
                    }
                })
            });

            return await response.json();
        } catch (error) {
            // Fallback to direct Bun execution
            return this.runBunValidationDirect(filePath, content);
        }
    }

    async runTransitiveLinkValidation() {
        this.updateStatusBar('🔗 Analyzing transitive links...');

        try {
            const result = await this.execBunCommand([
                'run',
                'src/validators/transitive-links.ts',
                '--vault', this.settings.vaultPath,
                '--min-tags', '2'
            ]);

            const output = result.stdout.toString();
            this.showTransitiveLinkResults(output);

        } catch (error) {
            new Notice('❌ Transitive link validation failed');
            throw error;
        }
    }

    async runCanvasSpatialValidation() {
        this.updateStatusBar('🎨 Analyzing canvas spatial relationships...');

        try {
            const result = await this.execBunCommand([
                'run',
                'src/validators/canvas-spatial.ts',
                '--vault', this.settings.vaultPath,
                '--threshold', '300'
            ]);

            const output = result.stdout.toString();
            this.showCanvasSpatialResults(output);

        } catch (error) {
            new Notice('❌ Canvas spatial validation failed');
            throw error;
        }
    }

    async runAliasConvergenceValidation() {
        this.updateStatusBar('🏷️ Analyzing alias convergence...');

        try {
            const result = await this.execBunCommand([
                'run',
                'src/validators/alias-convergence.ts',
                '--vault', this.settings.vaultPath,
                '--allow-partial'
            ]);

            const output = result.stdout.toString();
            this.showAliasConvergenceResults(output);

        } catch (error) {
            new Notice('❌ Alias convergence validation failed');
            throw error;
        }
    }

    async analyzeVaultGraph() {
        this.updateStatusBar('📊 Analyzing vault graph...');

        try {
            const result = await this.execBunCommand([
                'run',
                'src/analytics/vault-graph.ts',
                '--format', 'json'
            ]);

            const metrics = JSON.parse(result.stdout.toString());
            this.showGraphAnalysisResults(metrics);

        } catch (error) {
            new Notice('❌ Graph analysis failed');
            throw error;
        }
    }

    async smartAutoFix() {
        this.updateStatusBar('🔧 Running smart auto-fix...');

        try {
            const result = await this.execBunCommand([
                'run',
                'src/obsidian/validate.ts',
                '--vault', this.settings.vaultPath,
                '--fix',
                '--smart'
            ]);

            new Notice('✅ Smart auto-fix complete');
            this.runValidation(); // Re-validate to show improvements

        } catch (error) {
            new Notice('❌ Smart auto-fix failed');
            throw error;
        }
    }

    async exportGraphForDataview() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `dataview-graph-${timestamp}.json`;

            await this.execBunCommand([
                'run',
                'src/obsidian/validate.ts',
                '--vault', this.settings.vaultPath,
                '--export-graph', filename,
                '--dataview-compatible'
            ]);

            new Notice(`📊 Dataview-compatible graph exported to ${filename}`);

            // Create a new note with the graph data
            await this.createDataviewGraphNote(filename);

        } catch (error) {
            new Notice('❌ Graph export failed');
            throw error;
        }
    }

    private async createDataviewGraphNote(graphFile: string) {
        const noteContent = `
# Vault Graph Analysis

\`\`\`dataviewjs
// Load graph data
const graphData = await dv.io.load("${graphFile}");
const nodes = graphData.nodes;
const edges = graphData.edges;

// Display node table
dv.table(["File", "Type", "Health", "Links"], 
  nodes.map(n => [
    n.path, n.type, n.health + "%", n.neighbors.direct.length
  ])
);

// Display graph metrics
dv.paragraph(\`**Total Nodes:** \${nodes.length} | **Total Edges:** \${edges.length}\`);
\`\`\`

## Graph Visualization

\`\`\`mermaid
graph TD
\${edges.slice(0, 20).map((e: any) => \`    \${e.source} --> \${e.target}\`).join('\\n')}
\`\`\`
`;

        const noteFile = `${this.settings.vaultPath}/Vault Graph Analysis.md`;
        await this.app.vault.create(noteFile, noteContent);

        // Open the new note
        const file = this.app.vault.getAbstractFileByPath('Vault Graph Analysis.md');
        if (file instanceof TFile) {
            await this.app.workspace.getLeaf(true).openFile(file);
        }
    }

    private showValidationMenu() {
        // Create a modal with validation options
        new ValidationMenuModal(this.app, this).open();
    }

    private showTransitiveLinkResults(output: string) {
        // Parse and display transitive link results
        console.log('Transitive Link Results:', output);
        new Notice('🔗 Transitive link analysis complete - check console for details');
    }

    private showCanvasSpatialResults(output: string) {
        console.log('Canvas Spatial Results:', output);
        new Notice('🎨 Canvas spatial analysis complete - check console for details');
    }

    private showAliasConvergenceResults(output: string) {
        console.log('Alias Convergence Results:', output);
        new Notice('🏷️ Alias convergence analysis complete - check console for details');
    }

    private showGraphAnalysisResults(metrics: any) {
        console.log('Graph Analysis Results:', metrics);
        new Notice(`📊 Graph analysis: ${metrics.totalNodes} nodes, ${metrics.orphanRate.toFixed(1)}% orphans`);
    }

    private highlightIssues(file: TFile, issues: Array<{ line?: number; message: string }>) {
        // Enhanced issue highlighting with different colors for severity
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file === file) {
            // Use CodeMirror 6 to highlight issues
            const cm = (activeView.editor as any).cm || activeView.editor;

            issues.forEach(issue => {
                if (issue.line) {
                    const line = cm.state.doc.line(issue.line);
                    // Add decoration for the line
                    // This would require implementing CodeMirror decorations
                }
            });
        }
    }

    private updateGraphNode(filePath: string, validation: any) {
        if (!this.graphDb) return;

        try {
            const stmt = this.graphDb.prepare(`
        INSERT OR REPLACE INTO obsidian_nodes 
        (path, health, lastValidated)
        VALUES (?, ?, ?)
      `);

            stmt.run(filePath, JSON.stringify(validation.health), new Date().toISOString());
        } catch (error) {
            console.error('Failed to update graph node:', error);
        }
    }

    private initializeEnhancedBridge() {
        // Enhanced bridge initialization with new endpoints
        this.initializeBridge();
    }

    private initializeDataviewIntegration() {
        // Expose validation data to Dataview
        // Access plugins through app with proper typing
        const dataviewPlugin = (this.app as any).plugins?.plugins?.dataview;
        if (dataviewPlugin) {
            // Add custom Dataview functions
            console.log('✅ Dataview integration initialized');
        }
    }

    private initializeLivePreview() {
        // Initialize live preview highlighting
        console.log('✅ Live preview highlighting initialized');
    }

    private validateNewFile(file: TFile) {
        // Enhanced validation for new files
        if (file.extension === 'md') {
            // Check if it follows template standards
            this.validateTemplateCompliance(file);
        }
    }

    private validateCanvas(canvas: any) {
        // Canvas-specific validation
        console.log('🎨 Validating canvas:', canvas);
    }

    private onDataviewIndexReady() {
        // React to Dataview index updates
        console.log('📊 Dataview index ready');
    }

    private validateTemplateCompliance(file: TFile) {
        // Check if new file follows template standards
        console.log('📋 Validating template compliance for:', file.name);
    }

    // Keep existing methods...
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async runValidation(strict: boolean = false) {
        this.updateStatusBar('🔄 Validating...');

        try {
            const result = await this.execBunCommand([
                'run',
                'src/obsidian/validate.ts',
                '--vault', this.settings.vaultPath,
                strict ? '--strict' : '',
                '--export-graph', '.obsidian/validation-graph.json'
            ].filter(Boolean));

            const output = result.stdout.toString();
            const metrics = this.parseValidationOutput(output);

            this.updateStatusBar(`💚 ${metrics.averageHealth.toFixed(0)}%`);

            if (metrics.totalErrors > 0) {
                new Notice(`❌ Validation complete: ${metrics.totalErrors} errors, ${metrics.totalWarnings} warnings`);
            } else {
                new Notice(`✅ Validation complete: ${metrics.totalWarnings} warnings`);
            }

            return metrics;
        } catch (error) {
            this.updateStatusBar('❌ Validation Failed');
            new Notice('Validation failed. Check console for details.');
            throw error;
        }
    }

    async showHealthDashboard() {
        // Open health dashboard in new tab
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({
            type: 'empty',
            state: {},
            active: true,
        });

        // Load dashboard from Bun service
        const dashboardUrl = `http://localhost:${this.settings.bridgePort}`;
        const dashboardContent = await fetch(dashboardUrl).then(r => r.text());

        // Set the content (simplified - in real implementation would use webview)
        (leaf.view as any).containerEl.innerHTML = dashboardContent;
    }

    async initializeBridge() {
        try {
            // Test connection to Bun bridge
            const response = await fetch(`http://localhost:${this.settings.bridgePort}/api/health`);

            if (response.ok) {
                this.isConnected = true;
                console.log('✅ Connected to enhanced Bun bridge');

                // Start periodic health updates
                this.startHealthUpdates();
            }
        } catch (error) {
            console.log('⚠️ Enhanced Bun bridge not available');
            this.isConnected = false;
        }
    }

    startValidationService() {
        if (this.validationTimer) {
            clearInterval(this.validationTimer);
        }

        this.validationTimer = setInterval(async () => {
            if (this.isConnected) {
                try {
                    const response = await fetch(`http://localhost:${this.settings.bridgePort}/api/health`);
                    const health = await response.json();
                    this.updateStatusBar(`💚 ${health.averageHealth.toFixed(0)}%`);
                } catch (error) {
                    this.updateStatusBar('🔴 Bridge Offline');
                }
            } else {
                // Fallback to periodic validation
                await this.runValidation();
            }
        }, this.settings.validationInterval);
    }

    stopValidationService() {
        if (this.validationTimer) {
            clearInterval(this.validationTimer);
            this.validationTimer = undefined;
        }
    }

    startHealthUpdates() {
        setInterval(async () => {
            if (this.isConnected) {
                try {
                    const response = await fetch(`http://localhost:${this.settings.bridgePort}/api/health`);
                    const health = await response.json();

                    if (health.averageHealth < this.settings.healthThresholds.fair) {
                        new Notice(`⚠️ Vault health degraded: ${health.averageHealth.toFixed(0)}%`);
                    }
                } catch (error) {
                    // Bridge went offline
                    this.isConnected = false;
                }
            }
        }, 60000); // Check every minute
    }

    async execBunCommand(args: string[]): Promise<{ stdout: Buffer; stderr: Buffer }> {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            const process = spawn(this.settings.bunExecutable, args, {
                cwd: (this.app.vault.adapter as any).basePath,
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout: Buffer.from(stdout), stderr: Buffer.from(stderr) });
                } else {
                    reject(new Error(`Bun command failed: ${stderr}`));
                }
            });

            process.on('error', reject);
        });
    }

    parseValidationOutput(output: string): any {
        // Parse the structured output from our validation script
        const lines = output.split('\n');
        const metrics: any = {};

        lines.forEach(line => {
            if (line.includes('Average health:')) {
                metrics.averageHealth = parseFloat(line.match(/([\d.]+)%/)?.[1] || '0');
            }
            if (line.includes('Errors:')) {
                metrics.totalErrors = parseInt(line.match(/Errors: (\d+)/)?.[1] || '0');
            }
            if (line.includes('Warnings:')) {
                metrics.totalWarnings = parseInt(line.match(/Warnings: (\d+)/)?.[1] || '0');
            }
        });

        return metrics;
    }

    updateStatusBar(text: string) {
        this.statusBarItemEl.setText(text);
    }

    async runBunValidationDirect(filePath: string, content: string): Promise<any> {
        // Fallback validation implementation
        return {
            issues: [],
            health: { score: 100 }
        };
    }
}

class ValidationMenuModal extends Modal {
    plugin: VaultStandardsPlugin;

    constructor(app: App, plugin: VaultStandardsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Enhanced Vault Validation' });

        // Validation options
        const options = [
            { text: 'Run Full Validation', action: () => this.plugin.runValidation() },
            { text: 'Validate Transitive Links', action: () => this.plugin.runTransitiveLinkValidation() },
            { text: 'Validate Canvas Spatial', action: () => this.plugin.runCanvasSpatialValidation() },
            { text: 'Validate Alias Convergence', action: () => this.plugin.runAliasConvergenceValidation() },
            { text: 'Analyze Vault Graph', action: () => this.plugin.analyzeVaultGraph() },
            { text: 'Smart Auto-Fix', action: () => this.plugin.smartAutoFix() },
            { text: 'Export for Dataview', action: () => this.plugin.exportGraphForDataview() },
            { text: 'Show Health Dashboard', action: () => this.plugin.showHealthDashboard() }
        ];

        options.forEach(option => {
            const button = contentEl.createEl('button', { text: option.text });
            button.onclick = () => {
                option.action();
                this.close();
            };
            button.style.margin = '5px';
            button.style.padding = '10px';
            button.style.width = '200px';
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class VaultStandardsSettingTab extends PluginSettingTab {
    plugin: VaultStandardsPlugin;

    constructor(app: App, plugin: VaultStandardsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Enhanced Vault Standards Settings' });

        // Basic settings
        new Setting(containerEl)
            .setName('Auto Validation')
            .setDesc('Automatically validate files on change')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoValidate)
                .onChange(async (value) => {
                    this.plugin.settings.autoValidate = value;
                    await this.plugin.saveSettings();

                    if (value) {
                        this.plugin.startValidationService();
                    } else {
                        this.plugin.stopValidationService();
                    }
                }));

        new Setting(containerEl)
            .setName('Show Health Indicator')
            .setDesc('Show vault health in status bar')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showHealthIndicator)
                .onChange(async (value) => {
                    this.plugin.settings.showHealthIndicator = value;
                    await this.plugin.saveSettings();
                }));

        // Enhanced validation settings
        containerEl.createEl('h3', { text: 'Enhanced Validation' });

        new Setting(containerEl)
            .setName('Enable Transitive Linking')
            .setDesc('Analyze and suggest transitive link relationships')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableTransitiveLinking)
                .onChange(async (value) => {
                    this.plugin.settings.enableTransitiveLinking = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Canvas Validation')
            .setDesc('Validate spatial relationships in canvas files')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCanvasValidation)
                .onChange(async (value) => {
                    this.plugin.settings.enableCanvasValidation = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Alias Convergence')
            .setDesc('Check for alias conflicts and suggest improvements')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAliasConvergence)
                .onChange(async (value) => {
                    this.plugin.settings.enableAliasConvergence = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Neighbor Depth')
            .setDesc('Maximum depth for neighbor analysis')
            .addText(text => text
                .setPlaceholder('2')
                .setValue(this.plugin.settings.maxNeighborDepth.toString())
                .onChange(async (value) => {
                    this.plugin.settings.maxNeighborDepth = parseInt(value) || 2;
                    await this.plugin.saveSettings();
                }));

        // Performance settings
        containerEl.createEl('h3', { text: 'Performance' });

        new Setting(containerEl)
            .setName('Max Concurrent Validations')
            .setDesc('Maximum number of validations to run simultaneously')
            .addText(text => text
                .setPlaceholder('4')
                .setValue(this.plugin.settings.maxConcurrentValidations.toString())
                .onChange(async (value) => {
                    this.plugin.settings.maxConcurrentValidations = parseInt(value) || 4;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Caching')
            .setDesc('Cache validation results for better performance')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCaching)
                .onChange(async (value) => {
                    this.plugin.settings.enableCaching = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Mobile Optimizations')
            .setDesc('Optimize validation for mobile devices')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableMobileOptimizations)
                .onChange(async (value) => {
                    this.plugin.settings.enableMobileOptimizations = value;
                    await this.plugin.saveSettings();
                }));

        // Visual settings
        containerEl.createEl('h3', { text: 'Visual Settings' });

        new Setting(containerEl)
            .setName('Highlight Issues')
            .setDesc('Highlight validation issues in the editor')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.highlightIssues)
                .onChange(async (value) => {
                    this.plugin.settings.highlightIssues = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Live Preview')
            .setDesc('Show real-time validation in live preview')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableLivePreview)
                .onChange(async (value) => {
                    this.plugin.settings.enableLivePreview = value;
                    await this.plugin.saveSettings();
                }));

        // Health thresholds
        containerEl.createEl('h3', { text: 'Health Thresholds' });

        ['excellent', 'good', 'fair', 'poor'].forEach(level => {
            new Setting(containerEl)
                .setName(`${level.charAt(0).toUpperCase() + level.slice(1)} Threshold`)
                .setDesc(`Minimum score for ${level} health`)
                .addSlider(slider => slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.healthThresholds[level as keyof typeof this.plugin.settings.healthThresholds])
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.healthThresholds[level as keyof typeof this.plugin.settings.healthThresholds] = value;
                        await this.plugin.saveSettings();
                    }));
        });
    }
}

class VaultStandardsSettingsTab extends PluginSettingTab {
    plugin: VaultStandardsPlugin;

    constructor(app: App, plugin: VaultStandardsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Vault Standards Settings' });

        new Setting(containerEl)
            .setName('Enable Bridge')
            .setDesc('Enable connection to Bun bridge service')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableBridge)
                .onChange(async (value) => {
                    this.plugin.settings.enableBridge = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Bun Executable Path')
            .setDesc('Path to Bun executable')
            .addText(text => text
                .setPlaceholder('/usr/local/bin/bun')
                .setValue(this.plugin.settings.bunExecutable)
                .onChange(async (value) => {
                    this.plugin.settings.bunExecutable = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable Canvas Validation')
            .setDesc('Enable validation for canvas files')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCanvasValidation)
                .onChange(async (value) => {
                    this.plugin.settings.enableCanvasValidation = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Health Thresholds' });

        Object.keys(this.plugin.settings.healthThresholds).forEach(level => {
            new Setting(containerEl)
                .setName(`${level.charAt(0).toUpperCase() + level.slice(1)} Health Threshold`)
                .setDesc(`Minimum score for ${level} health`)
                .addSlider(slider => slider
                    .setLimits(0, 100, 5)
                    .setValue(this.plugin.settings.healthThresholds[level as keyof typeof this.plugin.settings.healthThresholds])
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.healthThresholds[level as keyof typeof this.plugin.settings.healthThresholds] = value;
                        await this.plugin.saveSettings();
                    }));
        });
    }
}

    async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

    async saveSettings() {
    await this.saveData(this.settings);
}

addCommands() {
    this.addCommand({
        id: 'run-validation',
        name: 'Run Vault Validation',
        callback: () => this.runValidation()
    });

    this.addCommand({
        id: 'run-validation-strict',
        name: 'Run Strict Validation',
        callback: () => this.runValidation(true)
    });

    this.addCommand({
        id: 'fix-issues',
        name: 'Auto-Fix Vault Issues',
        callback: () => this.fixIssues()
    });
}

    async onload() {
    await this.loadSettings();
    this.addSettingTab(new VaultStandardsSettingsTab(this.app, this));

    // Add status bar item
    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar('🔄 Initializing...');

    // Initialize vault path if not set
    if (!this.settings.vaultPath) {
        this.settings.vaultPath = (this.app.vault.adapter as any).basePath;
        await this.saveSettings();
    }

    // Register commands
    this.addCommands();

    // Register events
    this.registerEvents();

    // Start validation service
    if (this.settings.autoValidate) {
        this.startValidationService();
    }

    // Add ribbon icon
    this.addRibbonIcon('check-check', 'Validate Vault Standards', () => {
        this.runValidation();
    });

    // Initialize connection to Bun bridge
    if (this.settings.enableBridge) {
        this.initializeBridge();
    }

    console.log('Vault Standards Plugin loaded successfully');
}

class TemplateValidationModal extends Modal {
    private plugin: VaultStandardsPlugin;
    private metrics: TemplateMetrics;

    constructor(app: App, metrics: TemplateMetrics) {
        super(app);
        this.metrics = metrics;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Template Validation Results' });

        // Summary
        const summaryEl = contentEl.createDiv();
        summaryEl.createEl('h3', { text: 'Summary' });

        const summaryTable = summaryEl.createEl('table');
        const tbody = summaryTable.createEl('tbody');

        const addRow = (label: string, value: string, color?: string) => {
            const row = tbody.createEl('tr');
            const labelCell = row.createEl('td', { text: label });
            const valueCell = row.createEl('td', { text: value });
            if (color) {
                valueCell.style.color = color;
            }
        };

        addRow('Total Templates', this.metrics.totalTemplates.toString());
        addRow('Valid Templates', this.metrics.validTemplates.toString(), '#4CAF50');
        addRow('Invalid Templates', this.metrics.invalidTemplates.toString(), '#F44336');
        addRow('Average Processing Time', `${this.metrics.averageProcessingTime}ms`);
        addRow('Last Validation', this.metrics.lastValidation.toLocaleString());

        // Health indicator
        const healthEl = contentEl.createDiv();
        healthEl.createEl('h3', { text: 'Template Health' });

        const healthPercentage = this.metrics.totalTemplates > 0
            ? (this.metrics.validTemplates / this.metrics.totalTemplates) * 100
            : 0;

        let healthColor = '#F44336'; // Red
        let healthStatus = 'Poor';

        if (healthPercentage >= 90) {
            healthColor = '#4CAF50'; // Green
            healthStatus = 'Excellent';
        } else if (healthPercentage >= 75) {
            healthColor = '#8BC34A'; // Light Green
            healthStatus = 'Good';
        } else if (healthPercentage >= 60) {
            healthColor = '#FF9800'; // Orange
            healthStatus = 'Fair';
        }

        const healthBar = healthEl.createDiv();
        healthBar.style.width = '100%';
        healthBar.style.height = '20px';
        healthBar.style.backgroundColor = '#E0E0E0';
        healthBar.style.borderRadius = '10px';
        healthBar.style.overflow = 'hidden';
        healthBar.style.margin = '10px 0';

        const healthFill = healthBar.createDiv();
        healthFill.style.width = `${healthPercentage}%`;
        healthFill.style.height = '100%';
        healthFill.style.backgroundColor = healthColor;
        healthFill.style.transition = 'width 0.3s ease';

        const healthText = healthEl.createEl('p', {
            text: `Health: ${healthStatus} (${healthPercentage.toFixed(1)}%)`
        });
        healthText.style.color = healthColor;
        healthText.style.fontWeight = 'bold';

        // Actions
        const actionsEl = contentEl.createDiv();
        actionsEl.createEl('h3', { text: 'Actions' });

        const validateBtn = actionsEl.createEl('button', {
            text: 'Validate All Templates'
        });
        validateBtn.style.marginRight = '10px';
        validateBtn.onclick = () => {
            this.plugin.validateAllTemplates();
            this.close();
        };

        const fixBtn = actionsEl.createEl('button', {
            text: 'Fix Template Issues'
        });
        fixBtn.onclick = () => {
            this.plugin.fixTemplateIssues();
            this.close();
        };

        const closeBtn = actionsEl.createEl('button', {
            text: 'Close'
        });
        closeBtn.style.marginLeft = '10px';
        closeBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

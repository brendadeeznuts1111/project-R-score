// examples/wiki-template-playground.tsx - Interactive playground for wiki template system

import React, { useState, useEffect, useCallback } from 'react';
import { MCPWikiGenerator, WikiTemplate, WikiGenerationRequest, DocumentationProvider } from '../lib/mcp/wiki-generator-mcp';
import { MultiThreadedWikiGenerator } from '../lib/mcp/multi-threaded-wiki-generator';
import { AdvancedCacheManager } from '../lib/utils/advanced-cache-manager';
import { R2WikiStorage } from '../lib/mcp/r2-wiki-storage';

interface PlaygroundState {
  templates: WikiTemplate[];
  selectedTemplate: string | null;
  generationRequest: WikiGenerationRequest;
  generationResult: any;
  isLoading: boolean;
  scores: any;
  analytics: any;
  cacheStats: any;
  generatorStats: any;
  activeTab: 'templates' | 'generate' | 'scores' | 'analytics' | 'cache' | 'playground';
}

const WikiTemplatePlayground: React.FC = () => {
  const [state, setState] = useState<PlaygroundState>({
    templates: [],
    selectedTemplate: null,
    generationRequest: {
      format: 'markdown',
      includeExamples: true,
      context: ''
    },
    generationResult: null,
    isLoading: false,
    scores: null,
    analytics: null,
    cacheStats: null,
    generatorStats: null,
    activeTab: 'templates'
  });

  const [multiThreadedGenerator, setMultiThreadedGenerator] = useState<MultiThreadedWikiGenerator | null>(null);
  const [cacheManager, setCacheManager] = useState<AdvancedCacheManager | null>(null);

  // Initialize components
  useEffect(() => {
    const initComponents = async () => {
      try {
        // Initialize multi-threaded generator
        const generator = new MultiThreadedWikiGenerator({
          minWorkers: 2,
          maxWorkers: 4,
          workerScript: new URL('../lib/mcp/wiki-worker.ts', import.meta.url).href,
          taskTimeout: 30000,
          maxRetries: 3
        });
        setMultiThreadedGenerator(generator);

        // Initialize cache manager
        const cache = new AdvancedCacheManager({
          maxSize: 100,
          defaultTTL: 300000,
          enableCompression: true,
          compressionThreshold: 1024
        });
        setCacheManager(cache);

        // Load existing templates
        await loadTemplates();
      } catch (error) {
        console.error('Failed to initialize components:', error);
      }
    };

    initComponents();

    return () => {
      if (multiThreadedGenerator) {
        multiThreadedGenerator.shutdown();
      }
    };
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const templates = MCPWikiGenerator.getWikiTemplates();
      const analytics = MCPWikiGenerator.getTemplateAnalytics();
      
      setState(prev => ({
        ...prev,
        templates,
        analytics
      }));
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  const registerTemplate = useCallback(async (templateData: Partial<WikiTemplate>) => {
    try {
      const template: WikiTemplate = {
        name: templateData.name || '',
        description: templateData.description || '',
        provider: templateData.provider || DocumentationProvider.CONFLUENCE,
        workspace: templateData.workspace || '',
        format: templateData.format || 'markdown',
        includeExamples: templateData.includeExamples ?? true,
        customSections: templateData.customSections,
        tags: templateData.tags,
        category: templateData.category,
        priority: templateData.priority,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to register template:', error);
      throw error;
    }
  }, [loadTemplates]);

  const generateWikiContent = useCallback(async () => {
    if (!state.selectedTemplate) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await MCPWikiGenerator.generateWikiContent(
        state.selectedTemplate,
        state.generationRequest
      );

      // Cache the result
      if (cacheManager) {
        await cacheManager.set(
          `generation-${state.selectedTemplate}-${Date.now()}`,
          result
        );
        const stats = cacheManager.getStats();
        setState(prev => ({ ...prev, cacheStats: stats }));
      }

      setState(prev => ({
        ...prev,
        generationResult: result,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to generate content:', error);
      setState(prev => ({
        ...prev,
        generationResult: { success: false, error: (error as Error).message },
        isLoading: false
      }));
    }
  }, [state.selectedTemplate, state.generationRequest, cacheManager]);

  const calculateScores = useCallback(async () => {
    if (!state.selectedTemplate) return;

    try {
      const scores = await MCPWikiGenerator.scoreCrossReferences(state.selectedTemplate);
      setState(prev => ({ ...prev, scores }));
    } catch (error) {
      console.error('Failed to calculate scores:', error);
    }
  }, [state.selectedTemplate]);

  const generateWithMultiThreading = useCallback(async () => {
    if (!multiThreadedGenerator || !state.selectedTemplate) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const template = MCPWikiGenerator.getTemplateByName(state.selectedTemplate);
      if (!template) throw new Error('Template not found');

      const result = await multiThreadedGenerator.generateWikiContent(
        template,
        state.generationRequest
      );

      const stats = multiThreadedGenerator.getStats();
      
      setState(prev => ({
        ...prev,
        generationResult: result,
        generatorStats: stats,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to generate with multi-threading:', error);
      setState(prev => ({
        ...prev,
        generationResult: { success: false, error: (error as Error).message },
        isLoading: false
      }));
    }
  }, [multiThreadedGenerator, state.selectedTemplate, state.generationRequest]);

  const TemplateForm = () => (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Register New Template</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Template name"
            id="template-name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Provider</label>
          <select className="w-full p-2 border rounded" id="template-provider">
            <option value={DocumentationProvider.CONFLUENCE}>Confluence</option>
            <option value={DocumentationProvider.GITBOOK}>GitBook</option>
            <option value={DocumentationProvider.NOTION}>Notion</option>
            <option value={DocumentationProvider.SLACK}>Slack</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Workspace</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="workspace/path"
            id="template-workspace"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Format</label>
          <select className="w-full p-2 border rounded" id="template-format">
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
            <option value="all">All Formats</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select className="w-full p-2 border rounded" id="template-category">
            <option value="api">API</option>
            <option value="documentation">Documentation</option>
            <option value="tutorial">Tutorial</option>
            <option value="reference">Reference</option>
            <option value="guide">Guide</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select className="w-full p-2 border rounded" id="template-priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full p-2 border rounded"
          rows={3}
          placeholder="Template description"
          id="template-description"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="tag1, tag2, tag3"
          id="template-tags"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Custom Sections (one per line)</label>
        <textarea
          className="w-full p-2 border rounded"
          rows={3}
          placeholder="## Custom Section 1&#10;## Custom Section 2"
          id="template-sections"
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" defaultChecked />
          Include Examples
        </label>
      </div>
      
      <button
        onClick={() => {
          const template = {
            name: (document.getElementById('template-name') as HTMLInputElement)?.value,
            description: (document.getElementById('template-description') as HTMLTextAreaElement)?.value,
            provider: (document.getElementById('template-provider') as HTMLSelectElement)?.value as DocumentationProvider,
            workspace: (document.getElementById('template-workspace') as HTMLInputElement)?.value,
            format: (document.getElementById('template-format') as HTMLSelectElement)?.value as any,
            category: (document.getElementById('template-category') as HTMLSelectElement)?.value as any,
            priority: (document.getElementById('template-priority') as HTMLSelectElement)?.value as any,
            tags: (document.getElementById('template-tags') as HTMLInputElement)?.value.split(',').map(t => t.trim()).filter(Boolean),
            customSections: (document.getElementById('template-sections') as HTMLTextAreaElement)?.value.split('\n').filter(Boolean),
            includeExamples: (document.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked
          };
          
          registerTemplate(template).catch(console.error);
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Register Template
      </button>
    </div>
  );

  const TemplateList = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Registered Templates</h3>
      {state.templates.length === 0 ? (
        <p className="text-gray-500">No templates registered yet.</p>
      ) : (
        <div className="grid gap-4">
          {state.templates.map(template => (
            <div
              key={template.name}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                state.selectedTemplate === template.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setState(prev => ({ ...prev, selectedTemplate: template.name }))}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-gray-600">{template.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {template.provider}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      {template.format}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                      {template.category}
                    </span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                      {template.priority}
                    </span>
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Usage: {template.performanceMetrics?.usageCount || 0}</div>
                  <div>Success: {Math.round((template.performanceMetrics?.successRate || 0) * 100)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const GenerationPanel = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Generate Wiki Content</h3>
      
      {!state.selectedTemplate ? (
        <p className="text-gray-500">Please select a template first.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select
                className="w-full p-2 border rounded"
                value={state.generationRequest.format}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  generationRequest: { ...prev.generationRequest, format: e.target.value as any }
                }))}
              >
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
                <option value="json">JSON</option>
                <option value="all">All Formats</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Workspace</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={state.generationRequest.workspace || ''}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  generationRequest: { ...prev.generationRequest, workspace: e.target.value }
                }))}
                placeholder="workspace/path"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Context</label>
            <textarea
              className="w-full p-2 border rounded"
              rows={3}
              value={state.generationRequest.context || ''}
              onChange={(e) => setState(prev => ({
                ...prev,
                generationRequest: { ...prev.generationRequest, context: e.target.value }
              }))}
              placeholder="Additional context for generation..."
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={generateWikiContent}
              disabled={state.isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {state.isLoading ? 'Generating...' : 'Generate Content'}
            </button>
            
            <button
              onClick={generateWithMultiThreading}
              disabled={state.isLoading || !multiThreadedGenerator}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {state.isLoading ? 'Generating...' : 'Generate (Multi-threaded)'}
            </button>
            
            <button
              onClick={calculateScores}
              disabled={!state.selectedTemplate}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Calculate Scores
            </button>
          </div>
          
          {state.generationResult && (
            <div className="mt-4 p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Generation Result</h4>
              <pre className="text-sm bg-gray-50 p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(state.generationResult, null, 2)}
              </pre>
            </div>
          )}
          
          {state.generatorStats && (
            <div className="mt-4 p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Multi-threaded Generator Stats</h4>
              <pre className="text-sm bg-gray-50 p-2 rounded">
                {JSON.stringify(state.generatorStats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const ScoresPanel = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Template Scores & Analytics</h3>
      
      {!state.scores ? (
        <p className="text-gray-500">Select a template and click "Calculate Scores" to see analytics.</p>
      ) : (
        <div className="space-y-6">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-3">Overall Score</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Relevance Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((state.scores.overallScore?.relevanceScore || 0) * 100)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Content Quality</div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((state.scores.overallScore?.contentQualityScore || 0) * 100)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Performance Score</div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((state.scores.overallScore?.performanceScore || 0) * 100)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Combined Score</div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((state.scores.overallScore?.combinedScore || 0) * 100)}%
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-3">RSS Feed Items ({state.scores.rssFeedItems?.length || 0})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {state.scores.rssFeedItems?.map((item: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-gray-600">{item.pubDate}</div>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">
                      {Math.round(item.relevanceScore * 100)}%
                    </div>
                  </div>
                  {item.benchmarkMatches && item.benchmarkMatches.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.benchmarkMatches.map((match: any, idx: number) => (
                        <div key={idx} className="text-xs bg-white p-1 rounded border">
                          <span className="font-medium">{match.type}:</span> {match.description}
                          <span className="ml-2 text-gray-600">({Math.round(match.score * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-3">Related Templates ({state.scores.relatedTemplates?.length || 0})</h4>
            <div className="space-y-2">
              {state.scores.relatedTemplates?.map((template: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{template.templateName}</div>
                      <div className="text-xs text-gray-600">
                        Similarity: {Math.round(template.similarityScore * 100)}%
                      </div>
                    </div>
                    <div className="text-right">
                      {template.sharedFeatures.length > 0 && (
                        <div className="text-xs text-blue-600">
                          Features: {template.sharedFeatures.join(', ')}
                        </div>
                      )}
                      {template.sharedTags.length > 0 && (
                        <div className="text-xs text-green-600">
                          Tags: {template.sharedTags.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const AnalyticsPanel = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">System Analytics</h3>
      
      {state.analytics ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Template Overview</h4>
            <div className="space-y-1 text-sm">
              <div>Total Templates: {state.analytics.totalTemplates}</div>
              <div>Custom Templates: {state.analytics.customTemplates}</div>
              <div>Default Templates: {state.analytics.defaultTemplates}</div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Categories</h4>
            <div className="space-y-1 text-sm">
              {Object.entries(state.analytics.categories).map(([category, count]) => (
                <div key={category}>{category}: {count}</div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Providers</h4>
            <div className="space-y-1 text-sm">
              {Object.entries(state.analytics.providers).map(([provider, count]) => (
                <div key={provider}>{provider}: {count}</div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Formats</h4>
            <div className="space-y-1 text-sm">
              {Object.entries(state.analytics.formats).map(([format, count]) => (
                <div key={format}>{format}: {count}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">No analytics data available.</p>
      )}
      
      {state.cacheStats && (
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Cache Statistics</h4>
          <pre className="text-sm bg-gray-50 p-2 rounded">
            {JSON.stringify(state.cacheStats, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  const PlaygroundPanel = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Interactive Playground</h3>
      
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              // Create sample template
              const sampleTemplate = {
                name: `Sample Template ${Date.now()}`,
                description: 'A sample template for testing',
                provider: DocumentationProvider.CONFLUENCE,
                workspace: 'playground/sample',
                format: 'markdown',
                includeExamples: true,
                tags: ['sample', 'test', 'playground'],
                category: 'api' as const,
                priority: 'medium' as const
              };
              registerTemplate(sampleTemplate);
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Create Sample Template
          </button>
          
          <button
            onClick={loadTemplates}
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          >
            Refresh Templates
          </button>
          
          <button
            onClick={() => MCPWikiGenerator.clearCache()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All Caches
          </button>
          
          <button
            onClick={() => {
              if (cacheManager) {
                const stats = cacheManager.getStats();
                setState(prev => ({ ...prev, cacheStats: stats }));
              }
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Update Cache Stats
          </button>
        </div>
      </div>
      
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-2">System Status</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Multi-threaded Generator:</span>
            <span className={`ml-2 ${multiThreadedGenerator ? 'text-green-600' : 'text-red-600'}`}>
              {multiThreadedGenerator ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="font-medium">Cache Manager:</span>
            <span className={`ml-2 ${cacheManager ? 'text-green-600' : 'text-red-600'}`}>
              {cacheManager ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="font-medium">Total Templates:</span>
            <span className="ml-2">{state.templates.length}</span>
          </div>
          <div>
            <span className="font-medium">Selected Template:</span>
            <span className="ml-2">{state.selectedTemplate || 'None'}</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold mb-2">Performance Test</h4>
        <button
          onClick={async () => {
            if (!state.selectedTemplate) return;
            
            const startTime = Date.now();
            await generateWikiContent();
            const endTime = Date.now();
            
            alert(`Generation took ${endTime - startTime}ms`);
          }}
          disabled={!state.selectedTemplate || state.isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Benchmark Generation
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Wiki Template System Playground</h1>
        
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'templates', label: 'Templates' },
                { id: 'generate', label: 'Generate' },
                { id: 'scores', label: 'Scores' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'playground', label: 'Playground' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    state.activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {state.activeTab === 'templates' && (
              <div className="space-y-6">
                <TemplateForm />
                <TemplateList />
              </div>
            )}
            
            {state.activeTab === 'generate' && <GenerationPanel />}
            {state.activeTab === 'scores' && <ScoresPanel />}
            {state.activeTab === 'analytics' && <AnalyticsPanel />}
            {state.activeTab === 'playground' && <PlaygroundPanel />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WikiTemplatePlayground;

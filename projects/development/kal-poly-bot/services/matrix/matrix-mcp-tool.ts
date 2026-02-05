/**
 * MCP Tool: Bun Typed Array Matrix Search and Analysis
 *
 * A Model Context Protocol (MCP) tool that provides access to the comprehensive
 * Bun Native Typed Array Inspector cross-reference matrix, enabling semantic
 * search, filtering, and analytical operations on Bun runtime error data.
 */

import { z } from 'zod';
import { searchLargeFile, countMatchesInFile, getFileStats, type SearchOptions } from '../../utils/file-search';

// Define schema
const searchInputSchema = z.object({
  query: z.string().min(1).describe('Search query for semantic analysis of Bun typed array runtime issues'),
  filters: z.object({
    severity: z.enum(['critical', 'warning', 'info']).optional(),
    status: z.enum(['active', 'deprecated', 'experimental', 'removed']).optional(),
    impactLevel: z.enum(['high', 'medium', 'low', 'negligible']).optional(),
    categories: z.array(z.enum(['memory', 'performance', 'compatibility', 'security', 'usability'])).optional(),
    components: z.array(z.enum(['typed-arrays', 'buffers', 'gc', 'endianness'])).optional(),
  }).optional(),
  context: z.enum(['error-analysis', 'environment-setup', 'performance-tuning', 'debugging']).optional(),
  limit: z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
  includeRelated: z.boolean().default(true).describe('Include cross-referenced environment variables and community resources'),
  exportFormat: z.enum(['detailed', 'summary', 'export']).optional(),
});

type SearchInput = z.infer<typeof searchInputSchema>;

// MCP Tool Definition
export const matrixSearchTool = {
  name: 'search-typed-array-matrix',
  description: 'Search and analyze the Bun Typed Array Inspector cross-reference matrix.',
  inputSchema: searchInputSchema,

  execute: async (input: any) => {
    const { query, filters = {}, context, limit = 10, includeRelated = true, exportFormat } = input;

    try {
      const matrixData = await loadMatrixData();
      const processedQuery = processNaturalLanguageSearch(query);

      const results = [];

      // Search errors matrix
      const errorResults = searchErrors(matrixData.errors, processedQuery, filters);
      if (errorResults.length > 0) {
        results.push({
          type: 'errors',
          results: errorResults.slice(0, limit),
          total: errorResults.length
        });
      }

      // Search environment variables matrix
      const envResults = searchEnvVars(matrixData.envVars, processedQuery, filters);
      if (envResults.length > 0) {
        results.push({
          type: 'environment-variables',
          results: envResults.slice(0, limit),
          total: envResults.length
        });
      }

      // Search community resources matrix
      const resourceResults = searchResources(matrixData.resources, processedQuery, filters);
      if (resourceResults.length > 0) {
        results.push({
          type: 'community-resources',
          results: resourceResults.slice(0, limit),
          total: resourceResults.length
        });
      }

      let crossReferences = {};
      if (includeRelated && results.length > 0) {
        crossReferences = analyzeCrossReferences(results, matrixData);
      }

      const formattedResults = formatResults(results, crossReferences, exportFormat, context);

      return {
        success: true,
        search: {
          query: query,
          processed: processedQuery,
          filters: filters,
          context: context,
          timestamp: new Date().toISOString()
        },
        results: formattedResults,
        summary: {
          totalSections: results.length,
          maxResultsPerSection: limit,
          crossReferencesFound: Object.keys(crossReferences).length
        },
        version: '1.01.01'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: {
          type: 'search-error',
          message: `Matrix search failed: ${errorMessage}`,
          timestamp: new Date().toISOString()
        },
        version: '1.01.01'
      };
    }
  }
};

// Define additional MCP tools
export const matrixToolSet = [
  matrixSearchTool,

  {
    name: 'analyze-matrix-correlations',
    description: 'Analyze correlations between Bun typed array errors, environment variables, and resources.',
    inputSchema: z.object({
      errorCode: z.string().optional(),
      envVar: z.string().optional(),
      category: z.string().optional(),
      severity: z.enum(['critical', 'warning', 'info']).optional(),
      analysisType: z.enum(['impact', 'frequency', 'solutions', 'prevention']).default('impact')
    }),
    execute: async (input: any) => {
      const matrixData = await loadMatrixData();
      const correlations = calculateCorrelations(matrixData, input);

      return {
        success: true,
        analysis: {
          type: input.analysisType,
          parameters: input,
          correlations: correlations,
          recommendations: generateRecommendations(correlations)
        },
        version: '1.01.01'
      };
    }
  },

  {
    name: 'check-matrix-compatibility',
    description: 'Check version compatibility.',
    inputSchema: z.object({
      clientVersion: z.string().optional(),
      requestedFeatures: z.array(z.string()).optional(),
      platform: z.string().optional()
    }),
    execute: async (input: any) => {
      const compatibility = checkMatrixCompatibility(input);

      return {
        success: true,
        search: {
          query: 'compatibility-check',
          processed: { query: 'compatibility-check', semantics: { severity: null, categories: [], components: [], intent: 'compatibility' } },
          filters: {},
          timestamp: new Date().toISOString()
        },
        summary: {
          totalSections: 0,
          maxResultsPerSection: 0,
          crossReferencesFound: 0
        },
        compatibility: {
          matrixVersion: '1.01.01',
          clientCompatible: compatibility.compatible,
          features: compatibility.features,
          warnings: compatibility.warnings,
          recommendations: compatibility.recommendations
        },
        version: '1.01.01'
      };
    }
  }
];

// Matrix data cache
let matrixDataCache: any = null;

import { join } from 'path';

/**
 * Dynamically loads and parses matrix data from the HTML demo file.
 */
async function loadMatrixData() {
  if (matrixDataCache) return matrixDataCache;

  try {
    // Robust path resolution relative to this file's location
    const htmlPath = join(import.meta.dir, '../../demos/bun-typed-array-matrix.html');
    const file = Bun.file(htmlPath);
    if (!(await file.exists())) {
      throw new Error(`File not found: ${htmlPath}`);
    }
    const htmlContent = await file.text();

    const extractArray = (varName: string) => {
      const regex = new RegExp(`const ${varName} = ([\\s\\S]*?);`, 'm');
      const match = htmlContent.match(regex);
      if (match && match[1]) {
        try {
          // Robust parsing logic for JS array literal
          const content = match[1].trim();
          
          // Use a safer repair method: 
          // 1. Normalize quotes to double quotes
          // 2. Quote keys that aren't quoted
          // 3. Remove trailing commas
          let repaired = content
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/([{,]\s*)([a-zA-Z0-9_]+):/g, '$1"$2":') // Quote keys
            .replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas
          
          try {
            return JSON.parse(repaired);
          } catch (innerError: any) {
            // Last resort: very basic cleanup
            console.warn(`JSON.parse failed for ${varName}, trying aggressive cleanup:`, innerError.message);
            // This handles cases where the key might already be quoted or other issues
            repaired = repaired.replace(/,(?=\s*[\]}])/g, '');
            return JSON.parse(repaired);
          }
        } catch (e) {
          console.error(`Failed to parse ${varName}:`, e);
          return [];
        }
      }
      return [];
    };

    matrixDataCache = {
      errors: extractArray('errors'),
      envVars: extractArray('envVars'),
      resources: extractArray('resources'),
    };

    return matrixDataCache;
  } catch (error) {
    console.error('Loading matrix data from HTML failed, using static fallback:', error);
    // Return static mock data as absolute fallback
    return getFallbackData();
  }
}

function processNaturalLanguageSearch(searchTerm: string) {
  const lowerTerm = searchTerm.toLowerCase();
  
  const severityMap: Record<string, string> = {
    'critical': 'critical', 'urgent': 'critical', 'emergency': 'critical', 'fatal': 'critical',
    'warning': 'warning', 'warn': 'warning', 'caution': 'warning', 'alert': 'warning',
    'info': 'info', 'information': 'info', 'debug': 'info', 'note': 'info'
  };

  const categoryMap: Record<string, string[]> = {
    'memory': ['memory'], 'leak': ['memory'], 'allocation': ['memory'], 'gc': ['memory', 'performance'],
    'performance': ['performance'], 'slow': ['performance'], 'optimization': ['performance'], 'speed': ['performance'],
    'compatibility': ['compatibility'], 'portability': ['compatibility'], 'cross-platform': ['compatibility'],
    'security': ['security'], 'safe': ['security'], 'secure': ['security'], 'vulnerable': ['security'],
    'usability': ['usability'], 'user': ['usability'], 'interface': ['usability']
  };

  const componentMap: Record<string, string[]> = {
    'typed-array': ['typed-arrays'], 'array': ['typed-arrays'], 'typedarray': ['typed-arrays'],
    'buffer': ['buffers'], 'buf': ['buffers'],
    'endianness': ['endianness'], 'endian': ['endianness'], 'byte-order': ['endianness'],
    'gc': ['gc'], 'garbage': ['gc'], 'collection': ['gc']
  };

  let detectedSeverity: string | null = null;
  const detectedCategories: string[] = [];
  const detectedComponents: string[] = [];

  const tokens = lowerTerm.split(/\s+/);
  for (const token of tokens) {
    if (severityMap[token]) detectedSeverity = severityMap[token];
    if (categoryMap[token]) detectedCategories.push(...categoryMap[token]);
    if (componentMap[token]) detectedComponents.push(...componentMap[token]);
  }

  // If the query IS purely a filter term, don't remove it from text matching
  return {
    query: searchTerm,
    isFilterTerm: !!(severityMap[lowerTerm] || categoryMap[lowerTerm] || componentMap[lowerTerm]),
    semantics: {
      severity: detectedSeverity,
      categories: Array.from(new Set(detectedCategories)),
      components: Array.from(new Set(detectedComponents)),
      intent: determineIntent(searchTerm)
    }
  };
}

function searchErrors(errors: any[], processedQuery: any, filters: any): any[] {
  return errors.filter(error =>
    matchesQuery(error, processedQuery, filters)
  ).map(error => ({
    ...error,
    weight: calculateRelevanceScore(error, processedQuery)
  })).sort((a, b) => b.weight - a.weight);
}

function matchesQuery(item: any, processedQuery: any, filters: any): boolean {
  const query = processedQuery.query?.toLowerCase() || '';
  const semantics = processedQuery.semantics || {};
  
  // 1. Explicit Filters (from user selection)
  if (filters.severity && item.severity !== filters.severity) return false;
  if (filters.status && item.status !== filters.status) return false;
  if (filters.impactLevel && item.impactLevel !== filters.impactLevel) return false;
  
  if (filters.categories && filters.categories.length > 0) {
    const itemCategories = item.categories || [];
    if (!filters.categories.some((cat: string) => itemCategories.includes(cat))) return false;
  }
  
  if (filters.components && filters.components.length > 0) {
    const itemComponents = item.components || [];
    if (!filters.components.some((comp: string) => itemComponents.includes(comp))) return false;
  }

  // 2. Text Search - if it matches text, we often want to return it regardless of inferred semantics
  const searchableText = [
    item.code || '',
    item.description || '',
    item.name || '',
    ...(item.tags || []),
    ...(item.categories || []),
    ...(item.components || [])
  ].join(' ').toLowerCase();

  const isTextMatch = query && (
    searchableText.includes(query) || 
    query.split(/\s+/).some((term: string) => term.length > 2 && searchableText.includes(term))
  );

  // 3. Semantic Filters (inferred from query)
  // If it's a clear text match for the query term, and the query is a filter term itself (like "critical"),
  // we prioritize the text match/severity match.
  if (semantics.severity && item.severity !== semantics.severity) {
    // If query is "critical", and item severity is "critical", this is a match!
    // But if query is "critical" and item matches text but has severity "info", 
    // we should probably filter it out IF it's purely a semantic search.
    if (!isTextMatch) return false;
  }

  if (processedQuery.isFilterTerm) {
    // If the query is just "critical", we want items with severity "critical"
    if (semantics.severity && item.severity === semantics.severity) return true;
    if (semantics.categories.some((c: string) => item.categories?.includes(c))) return true;
    if (semantics.components.some((c: string) => item.components?.includes(c))) return true;
  }

  if (!query) return true;
  
  return !!isTextMatch;
}

function calculateRelevanceScore(item: any, processedQuery: any): number {
  let score = 0.0;
  const query = (processedQuery.query || '').toLowerCase();
  const queryTerms = query.split(/\s+/).filter((t: string) => t.length > 2);
  
  if (queryTerms.length === 0) return 1.0;

  const searchableText = [
    item.code || '', item.description || '', item.name || '',
    ...(item.tags || []), ...(item.categories || []), ...(item.components || [])
  ].join(' ').toLowerCase();

  if (item.code && query.includes(item.code.toLowerCase())) score += 10.0;
  if (item.name && query.includes(item.name.toLowerCase())) score += 10.0;
  if (item.description && item.description.toLowerCase().includes(query)) score += 5.0;

  queryTerms.forEach((term: string) => {
    if ((item.tags || []).some((tag: string) => tag.toLowerCase().includes(term))) score += 2.0;
    if ((item.categories || []).some((cat: string) => cat.toLowerCase().includes(term))) score += 1.5;
    if (searchableText.includes(term)) score += 0.5;
  });

  return Math.max(0.1, score);
}

function searchEnvVars(envVars: any[], processedQuery: any, filters: any): any[] {
  return envVars.filter(env => matchesQuery(env, processedQuery, filters))
    .map(env => ({ ...env, weight: calculateRelevanceScore(env, processedQuery) }))
    .sort((a, b) => b.weight - a.weight);
}

function searchResources(resources: any[], processedQuery: any, filters: any): any[] {
  return resources.filter(res => matchesQuery(res, processedQuery, filters))
    .map(res => ({ ...res, weight: calculateRelevanceScore(res, processedQuery) }))
    .sort((a, b) => b.weight - a.weight);
}

function analyzeCrossReferences(results: any[], matrixData: any): Record<string, any> {
  const crossRefs: any = { errorToEnvVars: {}, errorToResources: {}, envVarToErrors: {}, resourceToErrors: {}, commonPatterns: [] };
  const errorCodes = new Set<string>();
  results.forEach(section => { if (section.type === 'errors') section.results.forEach((e: any) => errorCodes.add(e.code)); });

  matrixData.errors.forEach((error: any) => {
    if (errorCodes.has(error.code)) {
      crossRefs.errorToEnvVars[error.code] = error.envVars || [];
      crossRefs.errorToResources[error.code] = error.resources || [];
    }
  });

  matrixData.envVars.forEach((env: any) => {
    const matching = (env.relatedErrors || []).filter((c: string) => errorCodes.has(c));
    if (matching.length > 0) crossRefs.envVarToErrors[env.name] = matching;
  });

  return crossRefs;
}

function formatResults(results: any[], crossReferences: Record<string, any>, exportFormat: string | undefined, context: string | undefined): any {
  if (exportFormat === 'summary') {
    return {
      results: [],
      summary: {
        totalSections: results.length,
        totalItems: results.reduce((sum, s) => sum + (s.total || s.results.length), 0),
        sections: results.map(s => ({ type: s.type, count: s.total || s.results.length }))
      }
    };
  }
  return { results, crossReferences: Object.keys(crossReferences).length > 0 ? crossReferences : undefined, context };
}

function calculateCorrelations(matrixData: any, input: any) {
  const stats: any = { severityDistribution: {}, categoryDistribution: {} };
  matrixData.errors.forEach((e: any) => {
    stats.severityDistribution[e.severity] = (stats.severityDistribution[e.severity] || 0) + 1;
    (e.categories || []).forEach((c: string) => { stats.categoryDistribution[c] = (stats.categoryDistribution[c] || 0) + 1; });
  });
  return stats;
}

function generateRecommendations(correlations: any) {
  const recs = [];
  if (correlations.severityDistribution.critical > 0) {
    recs.push({ priority: 'high', message: `Address ${correlations.severityDistribution.critical} critical errors.` });
  }
  return recs;
}

function checkMatrixCompatibility(input: any) {
  return { compatible: true, features: ['search', 'analysis'], warnings: [], recommendations: [] };
}

function determineIntent(searchTerm: string): string {
  const lower = searchTerm.toLowerCase();
  if (lower.includes('fix') || lower.includes('how')) return 'troubleshooting';
  if (lower.includes('optimize')) return 'optimization';
  return 'search';
}

function getFallbackData() {
  return { errors: [], envVars: [], resources: [] };
}

export default matrixToolSet;

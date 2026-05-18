#!/usr/bin/env bun

/**
 * 🎯 FactoryWager Wiki Matrix - Console Depth Demo
 * 
 * Demonstrates Bun's --console-depth feature with nested wiki template objects
 */

import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';

interface NestedWikiData {
  templates: {
    metadata: {
      name: string;
      description: string;
      config: {
        baseUrl: string;
        workspace: string;
        format: string;
        options: {
          includeExamples: boolean;
          includeValidation: boolean;
          customSections: {
            name: string;
            content: string;
            metadata: {
              author: string;
              version: string;
              tags: string[];
            };
          }[];
        };
      };
      features: {
        security: {
          encryption: boolean;
          authentication: {
            type: string;
            tokens: string[];
            policies: {
              name: string;
              rules: {
                action: string;
                resource: string;
                conditions: {
                  field: string;
                  operator: string;
                  value: string;
                }[];
              }[];
            }[];
          };
        };
        performance: {
          caching: boolean;
          optimization: {
            minification: boolean;
            compression: boolean;
            lazyLoading: boolean;
          };
          metrics: {
            responseTime: number;
            throughput: number;
            errorRate: number;
            details: {
              average: number;
              median: number;
              p95: number;
              p99: number;
            };
          };
        };
        integration: {
          apis: {
            rest: {
              endpoints: string[];
              authentication: string;
              rateLimit: {
                requests: number;
                window: number;
                strategy: string;
              };
            };
            graphql: {
              schema: string;
              queries: string[];
              mutations: string[];
            };
            websocket: {
              url: string;
              events: string[];
              authentication: string;
            };
          };
          databases: {
            primary: {
              type: string;
              connection: {
                host: string;
                port: number;
                database: string;
                credentials: {
                  username: string;
                  password: string;
                  ssl: boolean;
                };
              };
            };
            cache: {
              type: string;
              ttl: number;
              maxSize: number;
            };
          };
        };
      };
    }[];
    statistics: {
      total: number;
      formats: {
        [key: string]: {
          count: number;
          percentage: number;
          templates: {
            name: string;
            complexity: string;
            useCase: string;
            features: string[];
          }[];
        };
      };
      complexity: {
        [key: string]: {
          count: number;
          characteristics: {
            setupTime: string;
            maintenance: string;
            customization: string;
            learningCurve: string;
          };
          recommendations: {
            for: string[];
            avoid: string[];
            considerations: string[];
          };
        };
      };
    };
    processing: {
      pipeline: {
        stages: {
          name: string;
          description: string;
          configuration: {
            enabled: boolean;
            priority: number;
            timeout: number;
            retries: {
              max: number;
              delay: number;
              backoff: string;
            };
          };
          dependencies: string[];
        }[];
        execution: {
          parallel: boolean;
          maxConcurrency: number;
          errorHandling: {
            strategy: string;
            fallback: {
              enabled: boolean;
              alternative: string;
            };
          };
        };
      };
      optimization: {
        algorithms: {
          name: string;
          description: string;
          parameters: {
            [key: string]: {
              type: string;
              default: any;
              range: {
                min: number;
                max: number;
              };
              description: string;
            };
          };
        }[];
        tuning: {
          autoAdjust: boolean;
          metrics: string[];
          thresholds: {
            [key: string]: {
              warning: number;
              critical: number;
              action: string;
            };
          };
        };
      };
    };
  };
}

class ConsoleDepthDemo {
  private createNestedWikiData(): NestedWikiData {
    const templates = MCPWikiGenerator.getWikiTemplates();
    
    return {
      templates: {
        metadata: templates.map(template => ({
          name: template.name,
          description: template.description,
          config: {
            baseUrl: template.baseUrl,
            workspace: template.workspace,
            format: template.format,
            options: {
              includeExamples: template.includeExamples,
              includeValidation: true,
              customSections: (template.customSections || []).map(section => ({
                name: section,
                content: `Content for ${section}`,
                metadata: {
                  author: 'FactoryWager Team',
                  version: '1.0.0',
                  tags: [section.toLowerCase(), 'wiki', 'template']
                }
              }))
            }
          },
          features: {
            security: {
              encryption: true,
              authentication: {
                type: 'OAuth2',
                tokens: ['read', 'write', 'admin'],
                policies: [
                  {
                    name: 'wiki-access',
                    rules: [
                      {
                        action: 'read',
                        resource: 'wiki/*',
                        conditions: [
                          { field: 'user.role', operator: 'in', value: ['editor', 'admin'] },
                          { field: 'wiki.status', operator: 'equals', value: 'published' }
                        ]
                      }
                    ]
                  }
                ]
              },
              performance: {
                caching: true,
                optimization: {
                  minification: true,
                  compression: true,
                  lazyLoading: true
                },
                metrics: {
                  responseTime: 150,
                  throughput: 1000,
                  errorRate: 0.01,
                  details: {
                    average: 145,
                    median: 140,
                    p95: 180,
                    p99: 220
                  }
                }
              },
              integration: {
                apis: {
                  rest: {
                    endpoints: ['/api/wiki', '/api/templates', '/api/content'],
                    authentication: 'Bearer',
                    rateLimit: {
                      requests: 1000,
                      window: 3600,
                      strategy: 'sliding-window'
                    }
                  },
                  graphql: {
                    schema: 'wiki.graphql',
                    queries: ['getWiki', 'searchTemplates', 'getStatistics'],
                    mutations: ['createTemplate', 'updateContent']
                  },
                  websocket: {
                    url: 'wss://wiki.factorywager.com/ws',
                    events: ['template-updated', 'content-changed', 'user-connected'],
                    authentication: 'JWT'
                  }
                },
                databases: {
                  primary: {
                    type: 'PostgreSQL',
                    connection: {
                      host: 'db.factorywager.com',
                      port: 5432,
                      database: 'wiki_prod',
                      credentials: {
                        username: 'wiki_user',
                        password: '***hidden***',
                        ssl: true
                      }
                    }
                  },
                  cache: {
                    type: 'Redis',
                    ttl: 3600,
                    maxSize: 1000
                  }
                }
              }
            }
          }
        })),
        statistics: {
          total: templates.length,
          formats: {
            markdown: {
              count: templates.filter(t => t.format === 'markdown').length,
              percentage: (templates.filter(t => t.format === 'markdown').length / templates.length) * 100,
              templates: templates
                .filter(t => t.format === 'markdown')
                .map(t => ({
                  name: t.name,
                  complexity: t.name.includes('Simple') ? 'Simple' : 'Medium',
                  useCase: t.name.includes('Confluence') ? 'Enterprise' : 'General',
                  features: ['fast-import', 'version-control', 'collaboration']
                }))
            },
            html: {
              count: templates.filter(t => t.format === 'html').length,
              percentage: (templates.filter(t => t.format === 'html').length / templates.length) * 100,
              templates: templates
                .filter(t => t.format === 'html')
                .map(t => ({
                  name: t.name,
                  complexity: 'Medium',
                  useCase: 'Internal Portal',
                  features: ['embedded-viewing', 'responsive-design', 'interactive']
                }))
            },
            json: {
              count: templates.filter(t => t.format === 'json').length,
              percentage: (templates.filter(t => t.format === 'json').length / templates.length) * 100,
              templates: templates
                .filter(t => t.format === 'json')
                .map(t => ({
                  name: t.name,
                  complexity: 'Advanced',
                  useCase: 'API Integration',
                  features: ['api-first', 'structured-data', 'automation']
                }))
            }
          },
          complexity: {
            Simple: {
              count: templates.filter(t => !t.name.includes('API')).length,
              characteristics: {
                setupTime: '< 5 minutes',
                maintenance: 'Low',
                customization: 'Basic',
                learningCurve: 'Gentle'
              },
              recommendations: {
                for: ['Quick start', 'Small teams', 'Simple documentation'],
                avoid: ['Complex workflows', 'Advanced customization'],
                considerations: ['Limited features', 'Basic styling']
              }
            },
            Medium: {
              count: templates.filter(t => t.name.includes('Portal')).length,
              characteristics: {
                setupTime: '15-30 minutes',
                maintenance: 'Medium',
                customization: 'Moderate',
                learningCurve: 'Moderate'
              },
              recommendations: {
                for: ['Growing teams', 'Custom workflows'],
                avoid: ['Simple needs', 'High customization'],
                considerations: ['Requires setup', 'Learning investment']
              }
            },
            Advanced: {
              count: templates.filter(t => t.name.includes('API')).length,
              characteristics: {
                setupTime: '30+ minutes',
                maintenance: 'High',
                customization: 'Extensive',
                learningCurve: 'Steep'
              },
              recommendations: {
                for: ['Enterprise', 'API integration', 'Automation'],
                avoid: ['Simple documentation', 'Quick setup'],
                considerations: ['Technical expertise', 'Infrastructure']
              }
            }
          }
        },
        processing: {
          pipeline: {
            stages: [
              {
                name: 'validation',
                description: 'Validate template configuration',
                configuration: {
                  enabled: true,
                  priority: 1,
                  timeout: 5000,
                  retries: {
                    max: 3,
                    delay: 1000,
                    backoff: 'exponential'
                  }
                },
                dependencies: []
              },
              {
                name: 'generation',
                description: 'Generate wiki content',
                configuration: {
                  enabled: true,
                  priority: 2,
                  timeout: 30000,
                  retries: {
                    max: 2,
                    delay: 2000,
                    backoff: 'linear'
                  }
                },
                dependencies: ['validation']
              },
              {
                name: 'optimization',
                description: 'Optimize generated content',
                configuration: {
                  enabled: true,
                  priority: 3,
                  timeout: 10000,
                  retries: {
                    max: 1,
                    delay: 500,
                    backoff: 'none'
                  }
                },
                dependencies: ['generation']
              }
            ],
            execution: {
              parallel: false,
              maxConcurrency: 1,
              errorHandling: {
                strategy: 'fail-fast',
                fallback: {
                  enabled: true,
                  alternative: 'basic-template'
                }
              }
            }
          },
          optimization: {
            algorithms: [
              {
                name: 'content-compression',
                description: 'Compress wiki content for faster loading',
                parameters: {
                  level: {
                    type: 'number',
                    default: 6,
                    range: { min: 1, max: 9 },
                    description: 'Compression level (1-9)'
                  },
                  algorithm: {
                    type: 'string',
                    default: 'gzip',
                    range: { min: 0, max: 0 },
                    description: 'Compression algorithm'
                  }
                }
              }
            ],
            tuning: {
              autoAdjust: true,
              metrics: ['response-time', 'memory-usage', 'cpu-usage'],
              thresholds: {
                'response-time': {
                  warning: 500,
                  critical: 1000,
                  action: 'scale-up'
                },
                'memory-usage': {
                  warning: 80,
                  critical: 95,
                  action: 'cleanup-cache'
                }
              }
            }
          }
        }
      }
    };
  }

  demonstrateConsoleDepth(): void {
    console.info('🎯 Console Depth Demonstration');
    console.info('=================================');
    console.info('');
    console.info('This demo shows how --console-depth affects nested object display:');
    console.info('');

    const nestedData = this.createNestedWikiData();

    console.info('📊 Nested Wiki Template Data (full object):');
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info(nestedData);
    console.info('');

    console.info('💡 Try running with different console depths:');
    console.info('   bun --console-depth 1 run examples/console-depth-demo.tsx');
    console.info('   bun --console-depth 3 run examples/console-depth-demo.tsx');
    console.info('   bun --console-depth 5 run examples/console-depth-demo.tsx');
    console.info('   bun --console-depth 10 run examples/console-depth-demo.tsx');
    console.info('');

    // Demonstrate specific deep objects
    console.info('🔍 Deep dive into specific nested structures:');
    console.info('');

    console.info('📋 Template Configuration (deeply nested):');
    console.info(nestedData.templates.metadata[0].config);
    console.info('');

    console.info('🔐 Security Configuration (very deep):');
    console.info(nestedData.templates.metadata[0].features.security);
    console.info('');

    console.info('📈 Performance Metrics (nested objects):');
    console.info(nestedData.templates.metadata[0].features.performance.metrics);
    console.info('');

    console.info('🔌 Integration APIs (complex nested structure):');
    console.info(nestedData.templates.metadata[0].features.integration.apis);
    console.info('');

    console.info('📊 Statistics by Format (nested with arrays):');
    console.info(nestedData.templates.statistics.formats);
    console.info('');

    console.info('⚙️ Processing Pipeline (complex configuration):');
    console.info(nestedData.templates.processing.pipeline);
  }

  demonstrateDepthComparison(): void {
    console.info('');
    console.info('🔬 Depth Comparison Examples');
    console.info('===========================');
    console.info('');

    const simpleObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                data: 'Deep nested data',
                metadata: {
                  created: new Date().toISOString(),
                  version: '1.0.0',
                  tags: ['deep', 'nested', 'example']
                }
              }
            }
          }
        }
      }
    };

    console.info('📝 Simple nested object:');
    console.info(simpleObject);
    console.info('');

    const complexArray = [
      {
        id: 1,
        name: 'Template 1',
        config: {
          settings: {
            display: {
              colors: {
                primary: '#3b82f6',
                secondary: '#22c55e',
                accent: '#f59e0b'
              },
              fonts: {
                heading: 'Inter',
                body: 'System UI',
                monospace: 'JetBrains Mono'
              }
            }
          }
        }
      },
      {
        id: 2,
        name: 'Template 2',
        config: {
          settings: {
            display: {
              colors: {
                primary: '#ef4444',
                secondary: '#8b5cf6',
                accent: '#06b6d4'
              },
              fonts: {
                heading: 'Roboto',
                body: 'Open Sans',
                monospace: 'Fira Code'
              }
            }
          }
        }
      }
    ];

    console.info('📋 Complex array with nested objects:');
    console.info(complexArray);
    console.info('');

    console.info('🎯 Experiment with different depths to see the difference!');
  }
}

// CLI execution
if (import.meta.main) {
  const demo = new ConsoleDepthDemo();
  
  const command = Bun.argv[2];
  
  switch (command) {
    case 'comparison':
      demo.demonstrateDepthComparison();
      break;
    case 'help':
    default:
      demo.demonstrateConsoleDepth();
      if (command === 'help') {
        console.info('');
        console.info('📖 Usage Examples:');
        console.info('  # Default depth (2)');
        console.info('  bun run examples/console-depth-demo.tsx');
        console.info('');
        console.info('  # Depth 1 - minimal nesting');
        console.info('  bun --console-depth 1 run examples/console-depth-demo.tsx');
        console.info('');
        console.info('  # Depth 3 - moderate nesting');
        console.info('  bun --console-depth 3 run examples/console-depth-demo.tsx');
        console.info('');
        console.info('  # Depth 5 - deep nesting');
        console.info('  bun --console-depth 5 run examples/console-depth-demo.tsx');
        console.info('');
        console.info('  # Depth 10 - very deep nesting');
        console.info('  bun --console-depth 10 run examples/console-depth-demo.tsx');
        console.info('');
        console.info('  # Show comparison examples');
        console.info('  bun run examples/console-depth-demo.tsx comparison');
      }
      break;
  }
}

// src/dashboard/global-enterprise-dashboard.ts
// [DOMAIN:ENTERPRISE-DASHBOARD][SCOPE:PANEL][TYPE:MONITORING][META:{realtime:true,analytics:true}][CLASS:GlobalEnterpriseDashboard][#REF:DASHBOARD-PANEL-002]

// Add type declaration for Node.js events module
declare module 'events' {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
  }
}

import { EventEmitter } from 'events';

export interface IGlobalEnterpriseMetrics {
  scans24h: number;
  successfulPairs: number;
  successRate: string;
  productionReady: number;
  avgOnboardingTime: number;
  configurationIssues: number;
  autoFixed: number;
  merchantCoverage: string;
  revenueImpact: {
    mrrIncrease: number;
    currentMRR: number;
    previousMRR: number;
    estimatedMonthly: number;
  };
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
    kiosk: number;
    iot: number;
    wearable: number;
  };
}

export interface IGlobalPairedDevice {
  deviceId: string;
  deviceCategory: string;
  merchantIdentifier: string;
  onboardingTimestamp: Date;
  productionReadyStatus: boolean;
  healthScore: number;
  geographicLocation: {
    country: string;
    region: string;
    timezone: string;
  };
  performanceMetrics: {
    uptime: number;
    transactionVolume: number;
    errorRate: number;
    responseTime: number;
  };
  complianceStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  lastActivity: Date;
}

export interface IGlobalROIAnalytics {
  period: string;
  baselineMetrics: {
    monthlyRevenue: number;
    deviceEngagement: number;
    setupTime: number;
    supportTickets: number;
    churnRate: number;
  };
  currentMetrics: {
    monthlyRevenue: number;
    deviceEngagement: number;
    setupTime: number;
    supportTickets: number;
    churnRate: number;
  };
  improvements: {
    revenueGrowth: number;
    engagementIncrease: number;
    timeReduction: number;
    supportReduction: number;
    churnImprovement: number;
  };
  financialImpact: {
    additionalMRR: number;
    annualizedImpact: number;
    roiPercentage: number;
    paybackPeriod: string;
    confidenceLevel: number;
  };
  globalBreakdown: {
    northAmerica: { revenue: number; devices: number };
    europe: { revenue: number; devices: number };
    asiaPacific: { revenue: number; devices: number };
    latinAmerica: { revenue: number; devices: number };
  };
}

export interface IRealTimeDeviceUpdate {
  deviceId: string;
  updateType: 'ONBOARDING_STARTED' | 'ONBOARDING_COMPLETED' | 'PRODUCTION_READY' | 'CONFIGURATION_UPDATED' | 'ERROR_OCCURRED';
  timestamp: Date;
  details: string;
  geographicLocation: {
    country: string;
    region: string;
    timezone: string;
  };
  performanceImpact: {
    immediate: number;
    projected: number;
  };
}

export interface IGlobalDashboardData {
  panelIdentifier: string;
  merchantIdentifier: string;
  timestamp: Date;
  metrics: IGlobalEnterpriseMetrics;
  pairedDevices: IGlobalPairedDevice[];
  roiAnalytics: IGlobalROIAnalytics;
  realTimeUpdates: IRealTimeDeviceUpdate[];
  systemStatus: {
    globalUptime: number;
    activeRegions: string[];
    complianceStatus: string;
    securityLevel: string;
  };
  themeConfiguration: IGlobalThemeConfiguration;
}

export interface IGlobalThemeConfiguration {
  colorPalette: {
    primary: string;      // Deep Blue (Enterprise)
    secondary: string;    // Sky Blue (Professional)
    success: string;      // Emerald Green (Success)
    warning: string;      // Amber (Warning)
    error: string;        // Red (Error)
    critical: string;     // Purple (Critical)
    background: string;   // Slate Dark (Background)
    surface: string;      // Slate Surface (Cards)
    text: string;         // Slate Light (Text)
    accent: string;       // Cyan (Accent)
  };
  typography: {
    primaryFont: string;
    secondaryFont: string;
    monospaceFont: string;
    fontSizes: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

export class GlobalEnterpriseDashboard extends EventEmitter implements IGlobalDashboardService {
  private readonly enterpriseColorPalette: IGlobalThemeConfiguration['colorPalette'] = {
    primary: '#2563eb',      // Deep Blue (Enterprise)
    secondary: '#0ea5e9',    // Sky Blue (Professional)
    success: '#16a34a',      // Emerald Green (Success)
    warning: '#d97706',      // Amber (Warning)
    error: '#dc2626',        // Red (Error)
    critical: '#7c3aed',     // Purple (Critical)
    background: '#0f172a',   // Slate Dark (Background)
    surface: '#1e293b',      // Slate Surface (Cards)
    text: '#f1f5f9',         // Slate Light (Text)
    accent: '#0891b2'        // Cyan (Accent)
  };

  private readonly globalThemeConfiguration: IGlobalThemeConfiguration = {
    colorPalette: this.enterpriseColorPalette,
    typography: {
      primaryFont: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      secondaryFont: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      monospaceFont: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
      fontSizes: {
        xs: '0.75rem',
        sm: '0.875rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      }
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem'
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem'
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms'
      },
      easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
  };

  private webSocketServer: any;
  private activeConnections: Map<string, any> = new Map();
  private realTimeMetrics!: IGlobalEnterpriseMetrics;

  constructor() {
    super();
    this.initializeRealTimeMetrics();
    this.initializeWebSocketServer();
    this.startRealTimeDataCollection();
  }

  async renderGlobalDashboard(merchantIdentifier: string): Promise<IGlobalDashboardData> {
    console.log(`🌍 Rendering global enterprise dashboard for: ${merchantIdentifier}`);

    const currentMetrics = await this.collectGlobalMetrics(merchantIdentifier);
    const pairedDevices = await this.retrieveGlobalPairedDevices(merchantIdentifier);
    const roiAnalytics = await this.calculateGlobalROIAnalytics(merchantIdentifier);
    const realTimeUpdates = await this.getRealTimeDeviceUpdates(merchantIdentifier);

    return {
      panelIdentifier: `global-dashboard-${merchantIdentifier}`,
      merchantIdentifier,
      timestamp: new Date(),
      metrics: currentMetrics,
      pairedDevices,
      roiAnalytics,
      realTimeUpdates,
      systemStatus: {
        globalUptime: 99.97,
        activeRegions: ['NORTH_AMERICA', 'EUROPE', 'ASIA_PACIFIC', 'LATIN_AMERICA'],
        complianceStatus: 'ISO27001_SOC2_TYPE2_GDPR_COMPLIANT',
        securityLevel: 'MAXIMUM_ENTERPRISE'
      },
      themeConfiguration: this.globalThemeConfiguration
    };
  }

  async updateLiveGlobalMetrics(merchantIdentifier: string): Promise<IGlobalEnterpriseMetrics> {
    console.log(`📊 Updating live global metrics for: ${merchantIdentifier}`);

    // Simulate real-time metric updates with global data
    const updatedMetrics = {
      ...this.realTimeMetrics,
      scans24h: this.realTimeMetrics.scans24h + Math.floor(Math.random() * 3),
      successfulPairs: this.realTimeMetrics.successfulPairs + (Math.random() > 0.7 ? 1 : 0),
      productionReady: this.realTimeMetrics.productionReady + (Math.random() > 0.8 ? 1 : 0),
      successRate: this.calculateGlobalSuccessRate(),
      avgOnboardingTime: Math.max(25, this.realTimeMetrics.avgOnboardingTime + (Math.random() - 0.5) * 2),
      revenueImpact: {
        ...this.realTimeMetrics.revenueImpact,
        currentMRR: this.realTimeMetrics.revenueImpact.currentMRR + Math.floor(Math.random() * 100),
        estimatedMonthly: this.realTimeMetrics.revenueImpact.estimatedMonthly + Math.floor(Math.random() * 50)
      }
    };

    this.realTimeMetrics = updatedMetrics;

    // Broadcast update to all connected clients
    this.broadcastRealTimeUpdate(merchantIdentifier, {
      type: 'METRICS_UPDATE',
      data: updatedMetrics,
      timestamp: new Date()
    });

    return updatedMetrics;
  }

  async retrieveGlobalPairedDevices(merchantIdentifier: string): Promise<IGlobalPairedDevice[]> {
    console.log(`📱 Retrieving global paired devices for: ${merchantIdentifier}`);

    // Mock global device data with geographic distribution
    return [
      {
        deviceId: 'global-device-001',
        deviceCategory: 'MOBILE',
        merchantIdentifier,
        onboardingTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        productionReadyStatus: true,
        healthScore: 96,
        geographicLocation: {
          country: 'United States',
          region: 'NORTH_AMERICA',
          timezone: 'America/New_York'
        },
        performanceMetrics: {
          uptime: 99.8,
          transactionVolume: 1247,
          errorRate: 0.2,
          responseTime: 145
        },
        complianceStatus: 'COMPLIANT' as const,
        lastActivity: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      },
      {
        deviceId: 'global-device-002',
        deviceCategory: 'TABLET',
        merchantIdentifier,
        onboardingTimestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        productionReadyStatus: true,
        healthScore: 92,
        geographicLocation: {
          country: 'Germany',
          region: 'EUROPE',
          timezone: 'Europe/Berlin'
        },
        performanceMetrics: {
          uptime: 99.5,
          transactionVolume: 892,
          errorRate: 0.3,
          responseTime: 167
        },
        complianceStatus: 'COMPLIANT' as const,
        lastActivity: new Date(Date.now() - 12 * 60 * 1000) // 12 minutes ago
      },
      {
        deviceId: 'global-device-003',
        deviceCategory: 'DESKTOP',
        merchantIdentifier,
        onboardingTimestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        productionReadyStatus: false,
        healthScore: 78,
        geographicLocation: {
          country: 'Japan',
          region: 'ASIA_PACIFIC',
          timezone: 'Asia/Tokyo'
        },
        performanceMetrics: {
          uptime: 97.2,
          transactionVolume: 445,
          errorRate: 1.1,
          responseTime: 234
        },
        complianceStatus: 'PARTIAL' as const,
        lastActivity: new Date(Date.now() - 25 * 60 * 1000) // 25 minutes ago
      },
      {
        deviceId: 'global-device-004',
        deviceCategory: 'KIOSK',
        merchantIdentifier,
        onboardingTimestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        productionReadyStatus: true,
        healthScore: 89,
        geographicLocation: {
          country: 'Brazil',
          region: 'LATIN_AMERICA',
          timezone: 'America/Sao_Paulo'
        },
        performanceMetrics: {
          uptime: 98.7,
          transactionVolume: 1567,
          errorRate: 0.4,
          responseTime: 189
        },
        complianceStatus: 'COMPLIANT' as const,
        lastActivity: new Date(Date.now() - 8 * 60 * 1000) // 8 minutes ago
      },
      {
        deviceId: 'global-device-005',
        deviceCategory: 'IOT',
        merchantIdentifier,
        onboardingTimestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        productionReadyStatus: true,
        healthScore: 94,
        geographicLocation: {
          country: 'Singapore',
          region: 'ASIA_PACIFIC',
          timezone: 'Asia/Singapore'
        },
        performanceMetrics: {
          uptime: 99.9,
          transactionVolume: 2341,
          errorRate: 0.1,
          responseTime: 98
        },
        complianceStatus: 'COMPLIANT' as const,
        lastActivity: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      }
    ];
  }

  async calculateGlobalROIAnalytics(merchantIdentifier: string): Promise<IGlobalROIAnalytics> {
    console.log(`💰 Calculating global ROI analytics for: ${merchantIdentifier}`);

    const baselineMetrics = {
      monthlyRevenue: 7300,
      deviceEngagement: 45.8,
      setupTime: 15.2,
      supportTickets: 47,
      churnRate: 8.7
    };

    const currentMetrics = {
      monthlyRevenue: 12100,
      deviceEngagement: 89.4,
      setupTime: 0.47,
      supportTickets: 12,
      churnRate: 3.1
    };

    const improvements = {
      revenueGrowth: Math.round(((currentMetrics.monthlyRevenue - baselineMetrics.monthlyRevenue) / baselineMetrics.monthlyRevenue) * 100),
      engagementIncrease: Math.round(((currentMetrics.deviceEngagement - baselineMetrics.deviceEngagement) / baselineMetrics.deviceEngagement) * 100),
      timeReduction: Math.round(((baselineMetrics.setupTime - currentMetrics.setupTime) / baselineMetrics.setupTime) * 100),
      supportReduction: Math.round(((baselineMetrics.supportTickets - currentMetrics.supportTickets) / baselineMetrics.supportTickets) * 100),
      churnImprovement: Math.round(((baselineMetrics.churnRate - currentMetrics.churnRate) / baselineMetrics.churnRate) * 100)
    };

    const additionalMRR = currentMetrics.monthlyRevenue - baselineMetrics.monthlyRevenue;
    const annualizedImpact = additionalMRR * 12;
    const roiPercentage = Math.round((annualizedImpact / 15000) * 100); // Assuming $15k investment

    return {
      period: '30 days',
      baselineMetrics,
      currentMetrics,
      improvements,
      financialImpact: {
        additionalMRR,
        annualizedImpact,
        roiPercentage,
        paybackPeriod: '2.3 months',
        confidenceLevel: 94
      },
      globalBreakdown: {
        northAmerica: { revenue: 4800, devices: 28 },
        europe: { revenue: 3200, devices: 12 },
        asiaPacific: { revenue: 2900, devices: 15 },
        latinAmerica: { revenue: 1200, devices: 8 }
      }
    };
  }

  async getRealTimeDeviceUpdates(merchantIdentifier: string): Promise<IRealTimeDeviceUpdate[]> {
    console.log(`🔄 Getting real-time device updates for: ${merchantIdentifier}`);

    return [
      {
        deviceId: 'global-device-001',
        updateType: 'PRODUCTION_READY',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        details: 'Device successfully onboarded and ready for global transactions',
        geographicLocation: {
          country: 'United States',
          region: 'NORTH_AMERICA',
          timezone: 'America/New_York'
        },
        performanceImpact: {
          immediate: 1250,
          projected: 15000
        }
      },
      {
        deviceId: 'global-device-003',
        updateType: 'CONFIGURATION_UPDATED',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        details: 'Security configuration updated for compliance requirements',
        geographicLocation: {
          country: 'Japan',
          region: 'ASIA_PACIFIC',
          timezone: 'Asia/Tokyo'
        },
        performanceImpact: {
          immediate: 450,
          projected: 5400
        }
      },
      {
        deviceId: 'global-device-005',
        updateType: 'ONBOARDING_COMPLETED',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        details: 'IoT device onboarding completed with full sensor integration',
        geographicLocation: {
          country: 'Singapore',
          region: 'ASIA_PACIFIC',
          timezone: 'Asia/Singapore'
        },
        performanceImpact: {
          immediate: 890,
          projected: 10680
        }
      }
    ];
  }

  private async collectGlobalMetrics(merchantIdentifier: string): Promise<IGlobalEnterpriseMetrics> {
    // Simulate collecting metrics from global data sources
    return {
      scans24h: 47,
      successfulPairs: 42,
      successRate: '89.4%',
      productionReady: 38,
      avgOnboardingTime: 28,
      configurationIssues: 3,
      autoFixed: 2,
      merchantCoverage: 'WORLDWIDE',
      revenueImpact: {
        mrrIncrease: 65,
        currentMRR: 12100,
        previousMRR: 7300,
        estimatedMonthly: 4800
      },
      deviceBreakdown: {
        mobile: 28,
        tablet: 12,
        desktop: 2,
        kiosk: 3,
        iot: 2,
        wearable: 0
      }
    };
  }

  private calculateGlobalSuccessRate(): string {
    const rate = (this.realTimeMetrics.successfulPairs / this.realTimeMetrics.scans24h) * 100;
    return `${rate.toFixed(1)}%`;
  }

  private initializeRealTimeMetrics(): void {
    this.realTimeMetrics = {
      scans24h: 45,
      successfulPairs: 40,
      successRate: '88.9%',
      productionReady: 36,
      avgOnboardingTime: 29,
      configurationIssues: 4,
      autoFixed: 2,
      merchantCoverage: 'WORLDWIDE',
      revenueImpact: {
        mrrIncrease: 64,
        currentMRR: 11900,
        previousMRR: 7250,
        estimatedMonthly: 4650
      },
      deviceBreakdown: {
        mobile: 26,
        tablet: 11,
        desktop: 2,
        kiosk: 3,
        iot: 3,
        wearable: 0
      }
    };
  }

  private initializeWebSocketServer(): void {
    // Mock WebSocket server for real-time updates
    this.webSocketServer = {
      clients: new Set(),
      broadcast: (message: any) => {
        this.webSocketServer.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(message));
          }
        });
      }
    };

    console.log('🌐 Global WebSocket server initialized for real-time dashboard updates');
  }

  private startRealTimeDataCollection(): void {
    // Start collecting real-time data every 30 seconds
    setInterval(() => {
      this.emit('realTimeUpdate', {
        metrics: this.realTimeMetrics,
        timestamp: new Date(),
        type: 'GLOBAL_METRICS_REFRESH'
      });
    }, 30000);

    // Simulate real-time device updates
    setInterval(() => {
      const updateTypes = ['ONBOARDING_STARTED', 'ONBOARDING_COMPLETED', 'PRODUCTION_READY'];
      const randomUpdate = updateTypes[Math.floor(Math.random() * updateTypes.length)];
      
      this.emit('deviceUpdate', {
        deviceId: `global-device-${Math.floor(Math.random() * 1000)}`,
        updateType: randomUpdate,
        timestamp: new Date(),
        geographicLocation: {
          country: 'Global',
          region: 'WORLDWIDE',
          timezone: 'UTC'
        }
      });
    }, 45000);
  }

  private broadcastRealTimeUpdate(merchantIdentifier: string, update: any): void {
    const message = {
      merchantIdentifier,
      ...update,
      timestamp: new Date()
    };

    this.webSocketServer.broadcast(message);
    this.emit('broadcastUpdate', message);
  }

  // Public methods for external integration

  async addDeviceToGlobalDashboard(device: IGlobalPairedDevice): Promise<void> {
    console.log(`➕ Adding device to global dashboard: ${device.deviceId}`);
    
    this.emit('deviceAdded', {
      device,
      timestamp: new Date(),
      type: 'GLOBAL_DEVICE_ADDED'
    });

    // Broadcast to all connected clients
    this.broadcastRealTimeUpdate(device.merchantIdentifier, {
      type: 'DEVICE_ADDED',
      data: device
    });
  }

  async updateDeviceComplianceStatus(deviceId: string, status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT'): Promise<void> {
    console.log(`🛡️ Updating device compliance status: ${deviceId} -> ${status}`);
    
    this.emit('complianceUpdate', {
      deviceId,
      status,
      timestamp: new Date(),
      type: 'GLOBAL_COMPLIANCE_UPDATE'
    });
  }

  async generateGlobalPerformanceReport(merchantIdentifier: string, timeframe: '24h' | '7d' | '30d' | '90d'): Promise<any> {
    console.log(`📊 Generating global performance report for: ${merchantIdentifier} (${timeframe})`);

    const multiplier = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;

    return {
      period: timeframe,
      generatedAt: new Date(),
      merchantIdentifier,
      globalMetrics: {
        totalScans: 47 * multiplier,
        successfulPairs: 42 * multiplier,
        productionReady: 38 * multiplier,
        avgOnboardingTime: 28,
        globalUptime: 99.97,
        activeRegions: ['NORTH_AMERICA', 'EUROPE', 'ASIA_PACIFIC', 'LATIN_AMERICA']
      },
      geographicBreakdown: {
        northAmerica: {
          scans: Math.floor(47 * multiplier * 0.6),
          successRate: 91.2,
          revenue: 4800 * (multiplier / 30)
        },
        europe: {
          scans: Math.floor(47 * multiplier * 0.25),
          successRate: 87.8,
          revenue: 3200 * (multiplier / 30)
        },
        asiaPacific: {
          scans: Math.floor(47 * multiplier * 0.12),
          successRate: 89.4,
          revenue: 2900 * (multiplier / 30)
        },
        latinAmerica: {
          scans: Math.floor(47 * multiplier * 0.03),
          successRate: 85.1,
          revenue: 1200 * (multiplier / 30)
        }
      },
      complianceMetrics: {
        overallCompliance: 94.2,
        criticalIssues: 0,
        warnings: 3,
        auditsPassed: 12,
        nextAuditDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      financialImpact: {
        totalRevenue: 12100 * (multiplier / 30),
        mrrGrowth: 65,
        roiPercentage: 320,
        costSavings: 2300 * (multiplier / 30),
        efficiencyGain: 87.3
      },
      recommendations: [
        'Expand global deployment to emerging markets',
        'Optimize network routing for Asia-Pacific region',
        'Implement advanced threat detection for enterprise clients',
        'Enhance mobile device support for Latin American markets'
      ]
    };
  }

  getGlobalThemeConfiguration(): IGlobalThemeConfiguration {
    return this.globalThemeConfiguration;
  }

  getEnterpriseColorPalette(): IGlobalThemeConfiguration['colorPalette'] {
    return this.enterpriseColorPalette;
  }
}

interface IGlobalDashboardService {
  renderGlobalDashboard(merchantIdentifier: string): Promise<IGlobalDashboardData>;
  updateLiveGlobalMetrics(merchantIdentifier: string): Promise<IGlobalEnterpriseMetrics>;
  retrieveGlobalPairedDevices(merchantIdentifier: string): Promise<IGlobalPairedDevice[]>;
  calculateGlobalROIAnalytics(merchantIdentifier: string): Promise<IGlobalROIAnalytics>;
  getRealTimeDeviceUpdates(merchantIdentifier: string): Promise<IRealTimeDeviceUpdate[]>;
}

export default GlobalEnterpriseDashboard;

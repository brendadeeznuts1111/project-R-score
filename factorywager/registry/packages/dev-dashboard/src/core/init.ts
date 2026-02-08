/**
 * Dashboard System Initialization
 *
 * Centralizes initialization of all dashboard subsystems:
 * - Config loading
 * - DuoPlus integration
 * - Social feed
 * - Payment systems
 * - Alert systems
 * - Database setup
 */

import { join } from 'path';
import type { AlertConfig, QuickWin } from '../types.ts';
import { initHistoryDatabase, pruneHistory } from '../db/history.ts';
import { wsManager, broadcastUpdate } from '../websocket/manager.ts';
import { preconnectWebhook, tuneDNSStrategy } from '../alerts/webhook.ts';
import { DuoPlusFragmentLoader } from '../duoplus/fragment-loader.ts';
import { DeviceMonitor } from '../duoplus/device-monitor.ts';
import { DeviceComparisonEngine } from '../duoplus/comparison.ts';
import { DeviceReportExporter } from '../duoplus/reports.ts';
import { DeviceAlertSystem } from '../duoplus/alerts.ts';
import { ABTestingFramework, getOrSetAgentId } from '../ab-testing.ts';
import { SocialFeed } from '../social.ts';
import { AgentInteractionVisualizer } from '../agent-viz.ts';
import { GoldenProfileSystem } from '../golden-profile.ts';
import { PaymentGatewaySystem } from '../payment-gateway.ts';
import { FraudDetectionSystem } from '../fraud-detection.ts';
import { AppleIDIntegration } from '../apple-id.ts';
import { AgentBehaviorScorer } from '../agent-behavior-scoring.ts';
import { logger } from '../../../user-profile/src/index.ts';

export interface DashboardConfigs {
  dashboard: any;
  quickWins: any;
  benchmarks: any;
}

export interface DashboardSystems {
  duoplusLoader: DuoPlusFragmentLoader | null;
  deviceMonitor: DeviceMonitor | null;
  comparisonEngine: DeviceComparisonEngine | null;
  reportExporter: DeviceReportExporter | null;
  deviceAlerts: DeviceAlertSystem | null;
  abTesting: ABTestingFramework;
  socialFeed: SocialFeed;
  agentViz: AgentInteractionVisualizer;
  goldenProfile: GoldenProfileSystem;
  paymentGateway: PaymentGatewaySystem;
  fraudDetection: FraudDetectionSystem;
  appleID: AppleIDIntegration;
  agentBehaviorScorer: AgentBehaviorScorer;
  fraudEngine: any;
  alertConfig: AlertConfig;
  historyDb: any;
}

/**
 * Load TOML configs using Bun's native TOML.parse API
 */
export async function loadConfigs(baseUrl: string): Promise<DashboardConfigs> {
  const configFile = Bun.file(new URL('../config.toml', baseUrl));
  const quickWinsFile = Bun.file(new URL('../quick-wins.toml', baseUrl));
  const benchmarksFile = Bun.file(new URL('../benchmarks.toml', baseUrl));

  const [dashboard, quickWins, benchmarks] = await Promise.all([
    Bun.TOML.parse(await configFile.text()),
    Bun.TOML.parse(await quickWinsFile.text()),
    Bun.TOML.parse(await benchmarksFile.text()),
  ]);

  return { dashboard, quickWins, benchmarks };
}

/**
 * Initialize all dashboard systems
 */
export async function initializeSystems(
  configs: DashboardConfigs,
  dataDir: string
): Promise<DashboardSystems> {
  const { dashboard: dashboardConfig } = configs;

  // DuoPlus Cloud Phone (optional)
  const duoplusConfig = (dashboardConfig as any).duoplus;
  const duoplusBaseUrl = process.env.DUOPLUS_API_URL || duoplusConfig?.api_base_url || '';
  const duoplusApiKey = process.env.DUOPLUS_API_KEY || duoplusConfig?.api_key;
  const duoplusEnabled = Boolean(duoplusBaseUrl) && (duoplusConfig?.enabled !== false);
  const duoplusRealtime = duoplusEnabled && (duoplusConfig?.realtime_enabled !== false);
  const duoplusPollingSec = Math.max(
    5,
    parseInt(String(duoplusConfig?.polling_interval_sec ?? 10), 10) || 10
  );

  const duoplusLoader = duoplusEnabled
    ? new DuoPlusFragmentLoader({ apiBaseUrl: duoplusBaseUrl, apiKey: duoplusApiKey })
    : null;

  // Social feed
  const socialFeed = new SocialFeed();
  socialFeed.setSendToAgent((agentId, type, data) => {
    const ws = wsManager.getClientByAgentId(agentId);
    if (ws) wsManager.sendToClient(ws, type, data);
  });

  // Device alerts
  const deviceAlerts = duoplusRealtime && duoplusLoader
    ? new DeviceAlertSystem(broadcastUpdate, undefined, (alert) => {
        socialFeed.pushDeviceAlert(alert.deviceId, alert.id, alert.message);
      })
    : null;

  // Device monitor
  const deviceMonitor = duoplusRealtime && duoplusLoader
    ? new DeviceMonitor(duoplusLoader, broadcastUpdate, {
        pollingIntervalMs: duoplusPollingSec * 1000,
        enabled: true,
        onStateChange: (deviceId, prev, cur) => deviceAlerts?.checkAlerts(deviceId, prev, cur),
      })
    : null;

  // Comparison and reporting
  const comparisonEngine = duoplusLoader ? new DeviceComparisonEngine(duoplusLoader) : null;
  const reportExporter = duoplusLoader ? new DeviceReportExporter(duoplusLoader) : null;

  // A/B Testing
  const abTesting = new ABTestingFramework();

  // Agent visualization
  const agentViz = new AgentInteractionVisualizer(abTesting, socialFeed);

  // Golden profile
  const goldenProfile = new GoldenProfileSystem();
  goldenProfile.setDuoPlusLoader(duoplusLoader);
  goldenProfile.setAgentIdResolver((cookieHeader) => getOrSetAgentId(cookieHeader).agentId);

  // Fraud detection
  const fraudDetection = new FraudDetectionSystem();

  // Payment gateway
  const paymentGateway = new PaymentGatewaySystem();
  paymentGateway.setGoldenProfile(goldenProfile);
  paymentGateway.setFraudDetection(fraudDetection);

  // Wire up fraud detection transaction sources
  fraudDetection.setTransactionSource(
    (agentId, gateway, windowMs) => paymentGateway.getRecentTransactionCount(agentId, gateway, windowMs),
    (agentId) => paymentGateway.getAgentAverageAmount(agentId)
  );

  // Apple ID
  const appleID = new AppleIDIntegration();
  appleID.setGoldenProfile(goldenProfile);

  // Agent behavior scoring
  const agentBehaviorScorer = new AgentBehaviorScorer();
  agentBehaviorScorer.setGoldenProfile(goldenProfile);
  agentBehaviorScorer.setDataSources(
    (agentId) => abTesting.getInteractionsForAgent(agentId),
    (agentId) => {
      const interactions = socialFeed.getInteractions(500);
      return interactions
        .filter((i) => i.fromAgent === agentId || i.toAgent === agentId)
        .map((i) => ({ type: i.type, fromAgent: i.fromAgent, toAgent: i.toAgent }));
    }
  );

  // History retention
  const retentionDays = Math.max(1, parseInt(String(dashboardConfig.history?.retention_days || 30), 10) || 30);

  // Alert configuration
  const alertConfig: AlertConfig = {
    enabled: dashboardConfig.alerts?.enabled !== false,
    thresholds: {
      performanceScore: dashboardConfig.alerts?.performance_threshold || 50,
      failingTests: dashboardConfig.alerts?.failing_tests_threshold || 0,
      slowBenchmarks: dashboardConfig.alerts?.slow_benchmarks_threshold || 3,
    },
    webhookUrl: dashboardConfig.alerts?.webhook_url || undefined,
  };

  // Preconnect to webhook URL if configured
  if (alertConfig.webhookUrl) {
    preconnectWebhook(alertConfig.webhookUrl);
    setInterval(() => {
      tuneDNSStrategy(alertConfig.webhookUrl!);
    }, 30000);
  }

  // Initialize SQLite database for historical data tracking
  try {
    await Bun.write(join(dataDir, '.gitkeep'), '');
  } catch {
    // Directory might already exist
  }
  const historyDb = initHistoryDatabase(dataDir, retentionDays);
  pruneHistory();

  // Optional: fraud prevention engine
  let fraudEngine: any = null;
  try {
    const fp = await import('../../../fraud-prevention/src/index.ts');
    fraudEngine = new fp.FraudPreventionEngine(join(dataDir, 'fraud-prevention.db'));
  } catch {
    // Dashboard runs without fraud-prevention if package unavailable
  }

  return {
    duoplusLoader,
    deviceMonitor,
    comparisonEngine,
    reportExporter,
    deviceAlerts,
    abTesting,
    socialFeed,
    agentViz,
    goldenProfile,
    paymentGateway,
    fraudDetection,
    appleID,
    agentBehaviorScorer,
    fraudEngine,
    alertConfig,
    historyDb,
  };
}

/**
 * Get quick wins from config
 */
export function getQuickWins(quickWinsConfig: any): QuickWin[] {
  const quickWins = (quickWinsConfig as any).quickwins || [];
  return quickWins.map((win: any) => ({
    id: win.id,
    title: win.title,
    status: win.status,
    impact: win.impact,
    files: win.files || [],
    category: win.category,
  }));
}

/**
 * Check and send alerts
 */
export async function checkAndAlert(
  data: any,
  alertConfig: AlertConfig
): Promise<void> {
  if (!alertConfig.enabled) return;

  const { sendWebhookAlert } = await import('../alerts/webhook.ts');
  const alerts: string[] = [];

  if (data.stats.performanceScore < alertConfig.thresholds.performanceScore) {
    alerts.push(`Performance score dropped to ${data.stats.performanceScore}%`);
  }

  const failingTests = data.tests.filter((t: any) => t.status === 'fail');
  if (failingTests.length > alertConfig.thresholds.failingTests) {
    alerts.push(`${failingTests.length} test(s) failing: ${failingTests.map((t: any) => t.name).join(', ')}`);
  }

  const slowBenchmarks = data.benchmarks.filter((b: any) => b.status === 'fail');
  if (slowBenchmarks.length > alertConfig.thresholds.slowBenchmarks) {
    alerts.push(`${slowBenchmarks.length} benchmark(s) exceeding targets`);
  }

  if (alerts.length > 0) {
    alerts.forEach((alert) => logger.warn(alert));

    if (alertConfig.webhookUrl) {
      sendWebhookAlert(
        alertConfig.webhookUrl,
        {
          alerts,
          timestamp: Date.now(),
          stats: data.stats,
          source: 'factorywager-dashboard',
        },
        {
          timeout: 5000,
          retries: 3,
        }
      ).catch((error) => {
        logger.debug(`Webhook alert delivery completed with errors: ${error}`);
      });
    }

    broadcastUpdate('alerts', { alerts, timestamp: Date.now() });
  }
}

/**
 * Get page HTML with fragment injection
 */
export async function createPageHtmlLoader(baseUrl: string, refreshInterval: number) {
  let cachedPageHtml: string | null = null;

  return async function getPageHtml(): Promise<string> {
    if (cachedPageHtml !== null) return cachedPageHtml;

    const dashboardTemplate = await Bun.file(new URL('./ui/dashboard.html', baseUrl)).text();
    const fraudFragment = await Bun.file(new URL('./ui/fraud.html', baseUrl)).text();

    cachedPageHtml = dashboardTemplate
      .replace('{{FRAUD_TAB}}', fraudFragment)
      .replace('${refreshInterval}', String(refreshInterval));

    return cachedPageHtml;
  };
}

/**
 * Clear HTML cache (for HMR)
 */
export function clearHtmlCache(getPageHtml: () => Promise<string>) {
  // This is a workaround - the actual cache clearing happens via closure
  // In the main file, we'll recreate the loader on HMR
}

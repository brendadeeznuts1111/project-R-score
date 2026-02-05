#!/usr/bin/env bun

/**
 * Enhanced Bun Arbitrage Bot Controller
 *
 * Provides comprehensive bot management with:
 * - Process lifecycle control (start/stop/restart)
 * - Real-time log monitoring with Telegram notifications
 * - Performance metrics tracking
 * - REST API for remote management
 * - Web dashboard for visual monitoring
 */

import { existsSync } from "fs";

// =============================================================================
// CONSTANTS & CONFIG
// =============================================================================

const CONFIG = {
  BOT_BINARY_PATH: "./target/release/arb-bot",
  POSITIONS_FILE_PATH: "positions.json",
  CONTROL_PANEL_PORT: 3000,
  TELEGRAM_MESSAGE_LIMIT: 4096,
  METRICS_UPDATE_INTERVAL_MS: 300000, // 5 minutes
  TELEGRAM_API_BASE_URL: "https://api.telegram.org/bot",
} as const;

// =============================================================================
// INTERFACES
// =============================================================================

interface ArbitrageMetrics {
  totalOpenPositions: number;
  dailyPnlInCents: number;
  allTimePnlInCents: number;
  lastUpdated: string;
}

interface BotProcessStatus {
  isRunning: boolean;
  processId?: number;
  uptimeSeconds?: number;
  memoryUsageMb?: number;
}

interface TelegramCredentials {
  botToken: string;
  chatId: string;
  topicMapping: Record<string, number>;
}

interface LogEntry {
  content: string;
  timestamp: Date;
  category?: LogCategory;
}

type LogCategory = 'general' | 'heartbeats' | 'arbs' | 'errors' | 'metrics' | 'execution' | 'circuit_breaker';
type LeagueType = 'EPL' | 'NBA' | 'SerieA' | 'Bundesliga' | 'LaLiga' | 'EFL' | 'MLB' | 'NFL' | 'NHL' | 'MLS';

// =============================================================================
// ENVIRONMENT MANAGEMENT
// =============================================================================

class EnvironmentManager {
  private static fs = require('fs');

  static loadEnvironmentFile(): void {
    const envFilePath = '.env';

    if (!existsSync(envFilePath)) {
      console.log('ℹ️  No .env file found, using system environment variables');
      return;
    }

    try {
      const fileContent = this.fs.readFileSync(envFilePath, 'utf8');
      const lines = fileContent.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }

        const equalsIndex = trimmedLine.indexOf('=');
        if (equalsIndex <= 0) {
          continue; // Malformed line
        }

        const key = trimmedLine.substring(0, equalsIndex).trim();
        let value = trimmedLine.substring(equalsIndex + 1).trim();

        // Remove surrounding quotes if present
        value = value.replace(/^["']|["']$/g, '');

        process.env[key] = value;
      }

      console.log('✅ Environment variables loaded from .env file');
    } catch (error) {
      console.error('❌ Failed to load .env file:', error);
    }
  }
}

// =============================================================================
// TELEGRAM NOTIFICATION SERVICE
// =============================================================================

class TelegramNotificationService {
  private readonly credentials: TelegramCredentials;

  constructor() {
    this.credentials = this.loadCredentials();
  }

  private loadCredentials(): TelegramCredentials {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const topicsJson = process.env.TELEGRAM_TOPICS || '{}';

    if (!botToken || !chatId) {
      console.log('⚠️  Telegram notifications disabled - missing credentials in .env');
    }

    let topicMapping: Record<string, number> = {};
    try {
      topicMapping = JSON.parse(topicsJson);
    } catch (error) {
      console.warn('⚠️  Invalid TELEGRAM_TOPICS format, using default mapping');
    }

    return {
      botToken: botToken || '',
      chatId: chatId || '',
      topicMapping
    };
  }

  async sendMessage(content: string, category: LogCategory = 'general'): Promise<void> {
    if (!this.credentials.botToken || !this.credentials.chatId) {
      console.log('📱 Telegram: Service disabled');
      return;
    }

    const messageThreadId = this.credentials.topicMapping[category] || 0;
    const apiEndpoint = `${CONFIG.TELEGRAM_API_BASE_URL}${this.credentials.botToken}/sendMessage`;

    const requestParams = new URLSearchParams({
      chat_id: this.credentials.chatId,
      text: content.substring(0, CONFIG.TELEGRAM_MESSAGE_LIMIT),
      parse_mode: 'Markdown',
      message_thread_id: messageThreadId.toString(),
      disable_web_page_preview: 'true',
    });

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestParams,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('📱 Telegram API error:', errorText);
      } else {
        console.log(`📱 Telegram notification sent to '${category}' (thread ${messageThreadId})`);
      }
    } catch (error: any) {
      console.error('📱 Telegram network error:', error.message);
    }
  }

  isConfigured(): boolean {
    return !!(this.credentials.botToken && this.credentials.chatId);
  }
}

// =============================================================================
// METRICS TRACKING SERVICE
// =============================================================================

class ArbitrageMetricsService {
  private readonly fs = require('fs');

  getCurrentMetrics(): ArbitrageMetrics {
    if (!existsSync(CONFIG.POSITIONS_FILE_PATH)) {
      return this.createEmptyMetrics();
    }

    try {
      const fileContent = this.fs.readFileSync(CONFIG.POSITIONS_FILE_PATH, 'utf8');
      const data = JSON.parse(fileContent);

      const positions = Object.values(data.positions || {});
      const openPositionsCount = positions.filter((pos: any) => pos.status === 'open').length;

      const dailyPnl = Math.round((data.daily_realized_pnl || 0) * 100);
      const allTimePnl = Math.round((data.all_time_pnl || 0) * 100);

      return {
        totalOpenPositions: openPositionsCount,
        dailyPnlInCents: dailyPnl,
        allTimePnlInCents: allTimePnl,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error reading metrics file:', error);
      return this.createEmptyMetrics();
    }
  }

  private createEmptyMetrics(): ArbitrageMetrics {
    return {
      totalOpenPositions: 0,
      dailyPnlInCents: 0,
      allTimePnlInCents: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

// =============================================================================
// LEAGUE CLASSIFICATION SERVICE
// =============================================================================

class LeagueClassificationService {
  static classifyLeagueFromLog(logLine: string): LeagueType | null {
    const normalizedLine = logLine.toLowerCase();

    // Sport-specific patterns
    const leaguePatterns: Record<LeagueType, string[]> = {
      'EPL': ['epl', 'kxepl'],
      'NBA': ['nba', 'kxnbatotal'],
      'SerieA': ['seriea', 'kxseriea'],
      'Bundesliga': ['bundesliga', 'kxbundesliga'],
      'LaLiga': ['laliga', 'kxlaliga'],
      'EFL': ['eflc', 'kxefl'],
      'MLB': ['mlb', 'kxmlb'],
      'NFL': ['nfl', 'kxnfl'],
      'NHL': ['nhl', 'kxnhl'],
      'MLS': ['mls', 'kxmls']
    };

    for (const [league, patterns] of Object.entries(leaguePatterns)) {
      if (patterns.some(pattern => normalizedLine.includes(pattern))) {
        return league as LeagueType;
      }
    }

    return null;
  }
}

// =============================================================================
// LOG PROCESSING SERVICE
// =============================================================================

interface LogEventClassification {
  category: LogCategory;
  shouldNotify: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

class LogProcessingService {
  private readonly telegramService: TelegramNotificationService;
  private processedLines = 0;
  private readonly maxLineLength = 200; // Truncate very long lines

  // Event patterns with their classifications
  private readonly eventPatterns: Array<{
    pattern: RegExp | string;
    category: LogCategory;
    shouldNotify: boolean;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    extractMetadata?: (line: string) => Record<string, any>;
  }> = [
    // Critical errors - highest priority
    {
      pattern: /(?:ERROR|FATAL) (?:arb_bot|\w+)/i,
      category: 'errors',
      shouldNotify: true,
      priority: 'critical',
      extractMetadata: (line) => ({ type: 'error' })
    },

    // Circuit breaker events
    {
      pattern: /\[CB\].*(?:tripped|halted|activated)/i,
      category: 'errors',
      shouldNotify: true,
      priority: 'high',
      extractMetadata: (line) => ({ type: 'circuit_breaker' })
    },

    // Profitable arbitrage opportunities
    {
      pattern: /📊 Best:.*gap=([+-]\d+)¢/,
      category: 'arbs',
      shouldNotify: true,
      priority: 'high',
      extractMetadata: (line) => {
        const gapMatch = line.match(/gap=([+-]\d+)¢/);
        const gapCents = gapMatch ? parseInt(gapMatch[1]) : 0;
        return { gapCents, type: 'arbitrage', profitable: gapCents > 0 };
      }
    },

    // Trade execution
    {
      pattern: /(?:\[EXEC\]|Executing|Position.*(?:opened|closed))/i,
      category: 'execution',
      shouldNotify: true,
      priority: 'medium',
      extractMetadata: (line) => ({ type: 'trade_execution' })
    },

    // Heartbeat monitoring
    {
      pattern: /💓 Heartbeat/i,
      category: 'heartbeats',
      shouldNotify: true,
      priority: 'low',
      extractMetadata: (line) => ({ type: 'heartbeat' })
    },

    // Status updates
    {
      pattern: /(?:Discovery complete|State: Tracking|Market.*ready|Connected to.*exchange)/i,
      category: 'general',
      shouldNotify: true,
      priority: 'low',
      extractMetadata: (line) => ({ type: 'status_update' })
    },

    // Warning conditions
    {
      pattern: /(?:WARN|WARNING).*(?:rate|limit|throttle|retry)/i,
      category: 'errors',
      shouldNotify: true,
      priority: 'medium',
      extractMetadata: (line) => ({ type: 'warning' })
    }
  ];

  constructor(telegramService: TelegramNotificationService) {
    this.telegramService = telegramService;
  }

  async processBotLogLine(logLine: string): Promise<LogEntry> {
    this.processedLines++;

    // Skip processing if line is empty after trimming
    const trimmedLine = logLine.trim();
    if (!trimmedLine) {
      return {
        content: logLine,
        timestamp: new Date(),
        category: undefined
      };
    }

    // Analyze log line for specific events
    const event = this.classifyLogEvent(trimmedLine);
    if (!event) {
      return {
        content: trimmedLine,
        timestamp: new Date(),
        category: undefined
      };
    }

    // Always output to console (truncated if too long)
    const displayLine = trimmedLine.length > this.maxLineLength
      ? trimmedLine.substring(0, this.maxLineLength) + '...'
      : trimmedLine;

    console.log(displayLine);

    // Send notification for significant events
    await this.sendNotificationForEvent(event, trimmedLine);

    // Return structured log entry
    return {
      content: trimmedLine,
      timestamp: new Date(),
      category: event.category
    };
  }

  private classifyLogEvent(logLine: string): LogEventClassification | null {
    // Check each pattern for matches
    for (const pattern of this.eventPatterns) {
      let matches = false;

      if (typeof pattern.pattern === 'string') {
        matches = logLine.includes(pattern.pattern);
      } else {
        matches = pattern.pattern.test(logLine);
      }

      if (matches) {
        return {
          category: pattern.category,
          shouldNotify: pattern.shouldNotify,
          priority: pattern.priority,
          metadata: pattern.extractMetadata?.(logLine)
        };
      }
    }

    return null; // No special handling needed
  }

  private async sendNotificationForEvent(event: LogEventClassification, logLine: string): Promise<void> {
    if (!event.shouldNotify) return;

    // Format message based on event type and priority
    const formattedMessage = await this.formatMessageForEvent(event, logLine);

    try {
      await this.telegramService.sendMessage(formattedMessage, event.category);

      // Log successful notification with priority
      if (event.priority === 'high' || event.priority === 'critical') {
        console.log(`🔥 High-priority notification sent: ${event.category}`);
      }
    } catch (error) {
      console.error(`Failed to send ${event.category} notification:`, error);
    }
  }

  private async formatMessageForEvent(event: LogEventClassification, logLine: string): Promise<string> {
    const { category, priority, metadata } = event;

    // Special handling for arbitrage opportunities
    if (category === 'arbs' && metadata?.profitable) {
      const leagueType = LeagueClassificationService.classifyLeagueFromLog(logLine);
      const gapDisplay = metadata.gapCents ? `${metadata.gapCents > 0 ? '+' : ''}${metadata.gapCents}¢` : '';

      if (leagueType) {
        const formattedArbitrage = this.formatArbitrageMessage(logLine, metadata);

        // Send to general arbitrage channel and league-specific channel
        await this.telegramService.sendMessage(
          `*🚀 Profitable Arb (${gapDisplay}):* \`${formattedArbitrage}\``,
          'arbs'
        );

        // Return message for league-specific channel with gap details
        return `*${leagueType} Arb (${gapDisplay}):* \`${formattedArbitrage}\``;
      }

      return `*🚀 Profitable Arb (${gapDisplay}):* \`${logLine}\``;
    }

    // Generic message formatting with priority indicators
    const priorityEmojis: Record<string, string> = {
      critical: '🚨',
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };

    const priorityEmoji = priority ? priorityEmojis[priority] : '📝';

    const categoryPrefixes: Record<LogCategory, string> = {
      general: '📈 Summary:',
      heartbeats: '💓 Heartbeat:',
      arbs: '🚀 Arb:',
      errors: '❌ ERROR:',
      metrics: '📊 Metrics:',
      execution: '⚡ Trade:',
      circuit_breaker: '🛑 Circuit Breaker:'
    };

    const prefix = categoryPrefixes[category] || '📝 Log:';
    const messageTemplate = `${priorityEmoji} ${prefix} \`${logLine}\``;

    // Add metadata context if available
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataStr = Object.entries(metadata)
        .filter(([key, value]) => value !== undefined && key !== 'type')
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');

      if (metadataStr) {
        return `${messageTemplate}\n*Context:* ${metadataStr}`;
      }
    }

    return messageTemplate;
  }

  private formatArbitrageMessage(logLine: string, metadata: any): string {
    // Extract additional context from arbitrage message
    const timeMatch = logLine.match(/\((\d{1,2}:\d{2}(?:\.\d{3})?)\)/);
    const opportunityMatch = logLine.match(/(\d+-\d+) .*gap=([+-]\d+)¢/);

    let context = logLine;

    if (timeMatch && opportunityMatch) {
      const [, timeStr] = timeMatch;
      const [, period, gap] = opportunityMatch;
      context = `${period} @${timeStr} - ${gap}¢ gap`;
    }

    return context;
  }

  getProcessedLinesCount(): number {
    return this.processedLines;
  }

  // Method to add custom patterns dynamically
  addCustomPattern(pattern: typeof this.eventPatterns[0]): void {
    this.eventPatterns.unshift(pattern); // Add to front for higher priority
  }
}

// =============================================================================
// BOT PROCESS CONTROLLER
// =============================================================================

class ArbitrageBotProcessController {
  private botProcess: any = null;
  private startTimestamp: number = 0;
  private readonly telegramService: TelegramNotificationService;
  private readonly logProcessor: LogProcessingService;

  constructor(telegramService: TelegramNotificationService) {
    this.telegramService = telegramService;
    this.logProcessor = new LogProcessingService(telegramService);
  }

  async startProcess(): Promise<void> {
    if (this.botProcess) {
      console.log("❌ Arbitrage bot already running (PID: %d)", this.botProcess.pid);
      return;
    }

    if (!existsSync(CONFIG.BOT_BINARY_PATH)) {
      console.error("❌ Bot binary not found: %s", CONFIG.BOT_BINARY_PATH);
      console.log("   Run: cargo build --release --bin arb-bot");
      process.exit(1);
    }

    this.startTimestamp = Date.now();
    this.botProcess = Bun.spawn([CONFIG.BOT_BINARY_PATH]);

    console.log("✅ Arbitrage bot started successfully (PID: %d)", this.botProcess.pid);
    console.log("📊 Monitoring output with real-time notifications...\n");

    // Stream stdout and process logs
    this.processOutputStreams();

    await this.telegramService.sendMessage("*✅ Bot Started:* Bot has been launched and monitoring is active", 'general');
  }

  async stopProcess(): Promise<void> {
    if (!this.botProcess) {
      console.log("❌ Bot process not currently running");
      return;
    }

    this.botProcess.kill();
    this.botProcess = null;
    console.log("✅ Bot process stopped");

    await this.telegramService.sendMessage("*🛑 Bot Stopped:* Process has been terminated", 'general');
  }

  async restartProcess(): Promise<void> {
    console.log("🔄 Restarting arbitrage bot...");
    await this.stopProcess();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startProcess();
  }

  getProcessStatus(): BotProcessStatus {
    if (!this.botProcess) {
      return { isRunning: false };
    }

    return {
      isRunning: true,
      processId: this.botProcess.pid,
      uptimeSeconds: Math.floor((Date.now() - this.startTimestamp) / 1000),
      memoryUsageMb: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }

  private async processOutputStreams(): Promise<void> {
    // Process stdout
    try {
      for await (const chunk of this.botProcess.stdout) {
        const logLine = chunk.toString().trim();
        if (!logLine) continue;

        await this.logProcessor.processBotLogLine(logLine);
      }
    } catch (error) {
      console.error("Error processing stdout:", error);
    }

    // Process stderr
    try {
      for await (const chunk of this.botProcess.stderr) {
        const errorLine = chunk.toString().trim();
        if (errorLine) {
          console.error("stderr:", errorLine);
          await this.telegramService.sendMessage(`*⚠️ Bot stderr:* \`${errorLine}\``, 'errors');
        }
      }
    } catch (error) {
      console.error("Error processing stderr:", error);
    }

    // Reset process reference when it exits
    this.botProcess = null;
  }
}

// =============================================================================
// RISK MANAGEMENT SERVICE
// =============================================================================

interface RiskLimits {
  enabled: boolean;
  maxDailyLoss: number;        // in cents
  maxPositionPerMarket: number;
  maxTotalPosition: number;
  maxConcurrentTrades: number;
  maxConsecutiveErrors: number;
  cooldownSeconds: number;
  minArbitrageGap: number;     // minimum profitable gap in cents
  maxSlippagePercentage: number;
}

class RiskManagementService {
  private static readonly CONFIG_FILE = 'risk-config.json';
  private riskLimits: RiskLimits = {
    enabled: true,
    maxDailyLoss: 5000,        // $50
    maxPositionPerMarket: 100,
    maxTotalPosition: 500,
    maxConcurrentTrades: 10,
    maxConsecutiveErrors: 5,
    cooldownSeconds: 60,
    minArbitrageGap: 10,       // $0.10 minimum
    maxSlippagePercentage: 5.0
  };

  async loadRiskLimits(): Promise<RiskLimits> {
    try {
      if (existsSync(RiskManagementService.CONFIG_FILE)) {
        const fileContent = await Bun.file(RiskManagementService.CONFIG_FILE).text();
        const stored = JSON.parse(fileContent);
        this.riskLimits = { ...this.riskLimits, ...stored };
      }
    } catch (error) {
      console.warn('Failed to load risk config, using defaults:', error);
    }
    return this.riskLimits;
  }

  async saveRiskLimits(limits: Partial<RiskLimits>): Promise<void> {
    try {
      this.riskLimits = { ...this.riskLimits, ...limits };
      await Bun.write(RiskManagementService.CONFIG_FILE, JSON.stringify(this.riskLimits, null, 2));
      console.log('✅ Risk limits saved to', RiskManagementService.CONFIG_FILE);
    } catch (error) {
      console.error('❌ Failed to save risk limits:', error);
      throw error;
    }
  }

  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  validateRiskLimits(limits: Partial<RiskLimits>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (limits.maxDailyLoss !== undefined && limits.maxDailyLoss < 0) {
      errors.push('Max daily loss must be non-negative');
    }
    if (limits.maxPositionPerMarket !== undefined && limits.maxPositionPerMarket < 0) {
      errors.push('Max position per market must be non-negative');
    }
    if (limits.maxTotalPosition !== undefined && limits.maxTotalPosition < 0) {
      errors.push('Max total position must be non-negative');
    }
    if (limits.maxConcurrentTrades !== undefined && limits.maxConcurrentTrades < 0) {
      errors.push('Max concurrent trades must be non-negative');
    }
    if (limits.maxConsecutiveErrors !== undefined && limits.maxConsecutiveErrors < 0) {
      errors.push('Max consecutive errors must be non-negative');
    }
    if (limits.cooldownSeconds !== undefined && limits.cooldownSeconds < 0) {
      errors.push('Cooldown seconds must be non-negative');
    }
    if (limits.minArbitrageGap !== undefined && limits.minArbitrageGap < 0) {
      errors.push('Minimum arbitrage gap must be non-negative');
    }
    if (limits.maxSlippagePercentage !== undefined &&
        (limits.maxSlippagePercentage < 0 || limits.maxSlippagePercentage > 100)) {
      errors.push('Max slippage percentage must be between 0 and 100');
    }

    return { valid: errors.length === 0, errors };
  }

  resetToDefaults(): void {
    this.riskLimits = {
      enabled: true,
      maxDailyLoss: 5000,
      maxPositionPerMarket: 100,
      maxTotalPosition: 500,
      maxConcurrentTrades: 10,
      maxConsecutiveErrors: 5,
      cooldownSeconds: 60,
      minArbitrageGap: 10,
      maxSlippagePercentage: 5.0
    };
  }
}

// =============================================================================
// WEB API SERVER
// =============================================================================

class ArbitrageBotWebApiServer {
  private readonly botController: ArbitrageBotProcessController;
  private readonly metricsService: ArbitrageMetricsService;
  private readonly telegramService: TelegramNotificationService;
  private readonly riskService: RiskManagementService;

  constructor(
    botController: ArbitrageBotProcessController,
    metricsService: ArbitrageMetricsService,
    telegramService: TelegramNotificationService
  ) {
    this.botController = botController;
    this.metricsService = metricsService;
    this.telegramService = telegramService;
    this.riskService = new RiskManagementService();
  }

  start(): void {
    console.log(`🌐 Starting Arbitrage Bot Web API Server on port ${CONFIG.CONTROL_PANEL_PORT}...`);

    Bun.serve({
      port: CONFIG.CONTROL_PANEL_PORT,
      fetch: async (request: Request): Promise<Response> => {
        return await this.handleApiRequest(request);
      }
    });

    console.log(`✅ Web API Server started successfully`);
    console.log(`🌐 Control Panel: http://localhost:${CONFIG.CONTROL_PANEL_PORT}`);
    console.log(`📡 API Endpoints:`);
    console.log(`   POST /api/start          - Start bot process`);
    console.log(`   POST /api/stop           - Stop bot process`);
    console.log(`   POST /api/restart        - Restart bot process`);
    console.log(`   GET  /api/status         - Get bot status`);
    console.log(`   GET  /api/metrics        - Get trading metrics`);
    console.log(`   POST /api/test-telegram  - Send test Telegram message`);

    // Start periodic metrics reporting
    this.startPeriodicMetricsReporting();
  }

  private async handleApiRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      // POST /api/start
      if (url.pathname === '/api/start' && method === 'POST') {
        await this.botController.startProcess();
        return this.jsonResponse({ status: 'started', message: 'Bot process started successfully' });
      }

      // POST /api/stop
      if (url.pathname === '/api/stop' && method === 'POST') {
        await this.botController.stopProcess();
        return this.jsonResponse({ status: 'stopped', message: 'Bot process stopped successfully' });
      }

      // POST /api/restart
      if (url.pathname === '/api/restart' && method === 'POST') {
        await this.botController.restartProcess();
        return this.jsonResponse({ status: 'restarted', message: 'Bot process restarted successfully' });
      }

      // GET /api/status
      if (url.pathname === '/api/status' && method === 'GET') {
        const status = this.botController.getProcessStatus();
        return this.jsonResponse(status);
      }

      // GET /api/metrics
      if (url.pathname === '/api/metrics' && method === 'GET') {
        const metrics = this.metricsService.getCurrentMetrics();
        return this.jsonResponse(metrics);
      }

      // POST /api/test-telegram
      if (url.pathname === '/api/test-telegram' && method === 'POST') {
        await this.telegramService.sendMessage(
          '🧪 *Test Message from Arbitrage Bot Controller*\nBot system is operational and Telegram integration is active!',
          'general'
        );
        return this.jsonResponse({ status: 'test-sent', message: 'Test Telegram message sent successfully' });
      }

      // GET /api/risk-limits
      if (url.pathname === '/api/risk-limits' && method === 'GET') {
        const riskLimits = await this.riskService.loadRiskLimits();
        return this.jsonResponse({ riskLimits, status: 'success' });
      }

      // POST /api/risk-limits
      if (url.pathname === '/api/risk-limits' && method === 'POST') {
        try {
          const body = await request.json();
          const validation = this.riskService.validateRiskLimits(body);

          if (!validation.valid) {
            return this.jsonResponse(
              { error: 'Validation failed', errors: validation.errors },
              { status: 400 }
            );
          }

          await this.riskService.saveRiskLimits(body);
          return this.jsonResponse({
            status: 'saved',
            message: 'Risk limits updated successfully',
            riskLimits: await this.riskService.loadRiskLimits()
          });
        } catch (error: any) {
          return this.jsonResponse(
            { error: 'Failed to update risk limits', message: error.message },
            { status: 500 }
          );
        }
      }

      // POST /api/risk-limits/reset
      if (url.pathname === '/api/risk-limits/reset' && method === 'POST') {
        try {
          this.riskService.resetToDefaults();
          await this.riskService.saveRiskLimits({});
          return this.jsonResponse({
            status: 'reset',
            message: 'Risk limits reset to defaults',
            riskLimits: await this.riskService.loadRiskLimits()
          });
        } catch (error: any) {
          return this.jsonResponse(
            { error: 'Failed to reset risk limits', message: error.message },
            { status: 500 }
          );
        }
      }

      // GET / (Web Dashboard)
      if (url.pathname === '/' && method === 'GET') {
        return this.renderDashboardPage();
      }

      // 404 Not Found
      return new Response('Endpoint Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });

    } catch (error: any) {
      console.error('API Error:', error);
      return this.jsonResponse(
        { error: 'Internal Server Error', message: error.message },
        { status: 500 }
      );
    }
  }

  private renderDashboardPage(): Response {
    const status = this.botController.getProcessStatus();
    const metrics = this.metricsService.getCurrentMetrics();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Arbitrage Bot Control Panel</title>
        <style>
          :root {
            --bg-color: #0f0f23;
            --card-bg: #1a1a2e;
            --text-color: #ffffff;
            --success-color: #00ff41;
            --error-color: #ff073a;
            --warning-color: #ffaa00;
            --info-color: #00aaff;
            --border-color: #333;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            background: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
          }

          .container { max-width: 1200px; margin: 0 auto; }
          h1 { text-align: center; margin-bottom: 30px; color: var(--success-color); }

          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          }

          .card h2 {
            margin-bottom: 15px;
            font-size: 1.2em;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
          }

          .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
          }

          .status.running { background: var(--success-color); }
          .status.stopped { background: var(--error-color); }
          .status.loading { background: var(--warning-color); }

          .button {
            background: var(--info-color);
            color: black;
            border: none;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
            transition: all 0.3s ease;
          }

          .button:hover { opacity: 0.8; transform: translateY(-1px); }

          .button.danger { background: var(--error-color); color: white; }
          .button.success { background: var(--success-color); color: black; }
          .button:disabled { opacity: 0.5; cursor: not-allowed; }

          .control-panel { text-align: center; }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
          }

          .metric {
            background: rgba(255, 255, 255, 0.05);
            padding: 15px;
            border-radius: 6px;
            text-align: center;
          }

          .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
          }

          .metric-label { opacity: 0.8; font-size: 0.9em; }

          .positive { color: var(--success-color); }
          .negative { color: var(--error-color); }
          .neutral { color: var(--info-color); }

          .footer {
            text-align: center;
            margin-top: 30px;
            opacity: 0.6;
          }

          #logs {
            background: rgba(0, 0, 0, 0.5);
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            max-height: 300px;
            overflow-y: auto;
            font-size: 12px;
            line-height: 1.4;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Arbitrage Bot Control Panel</h1>

          <div class="grid">
            <!-- Status Card -->
            <div class="card">
              <h2>
                <span class="status-indicator status ${status.isRunning ? 'running' : 'stopped'}"></span>
                Bot Status
              </h2>
              <div id="status-content">
                <p><strong>State:</strong> ${status.isRunning ? 'RUNNING' : 'STOPPED'}</p>
                ${status.isRunning ? `
                  <p><strong>PID:</strong> ${status.processId || 'Unknown'}</p>
                  <p><strong>Uptime:</strong> ${this.formatUptime(status.uptimeSeconds || 0)}</p>
                  <p><strong>Memory:</strong> ${status.memoryUsageMb?.toFixed(2) || 'N/A'} MB</p>
                ` : ''}
                <p><strong>Last Updated:</strong> ${new Date().toLocaleTimeString()}</p>
              </div>
            </div>

            <!-- Metrics Card -->
            <div class="card">
              <h2>📊 Trading Metrics</h2>
              <div class="metrics-grid" id="metrics-grid">
                <div class="metric">
                  <div class="metric-value">${metrics.totalOpenPositions}</div>
                  <div class="metric-label">Open Positions</div>
                </div>
                <div class="metric">
                  <div class="metric-value positive">$${(metrics.dailyPnlInCents / 100).toFixed(2)}</div>
                  <div class="metric-label">Daily P&L</div>
                </div>
                <div class="metric">
                  <div class="metric-value positive">$${(metrics.allTimePnlInCents / 100).toFixed(2)}</div>
                  <div class="metric-label">All-Time P&L</div>
                </div>
              </div>
              <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
                Updated: ${new Date(metrics.lastUpdated).toLocaleString()}
              </p>
            </div>
          </div>

          <!-- Control Panel -->
          <div class="card control-panel">
            <h2>🎮 Bot Controls</h2>
            <div id="control-buttons">
              <button class="button success" onclick="controlBot('start')" ${status.isRunning ? 'disabled' : ''}>Start Bot</button>
              <button class="button danger" onclick="controlBot('stop')" ${!status.isRunning ? 'disabled' : ''}>Stop Bot</button>
              <button class="button" onclick="controlBot('restart')">Restart Bot</button>
              <button class="button" onclick="sendTestMessage()">Test Telegram</button>
              <button class="button" onclick="refreshMetrics()">Refresh Metrics</button>
            </div>
          </div>

          <!-- Risk Management -->
          <div class="card">
            <h2>🛡️ Risk Management</h2>
            <div id="risk-limits-content">
              <p>Loading risk limits...</p>
            </div>
          </div>

          <div class="card">
            <h2>⚙️ Risk Configuration</h2>
            <form id="risk-form">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Max Daily Loss ($)</label>
                  <input type="number" id="max-daily-loss" step="0.01" min="0" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Max Position/Market</label>
                  <input type="number" id="max-position-per-market" min="0" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Max Total Position</label>
                  <input type="number" id="max-total-position" min="0" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Max Concurrent Trades</label>
                  <input type="number" id="max-concurrent-trades" min="0" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Max Consecutive Errors</label>
                  <input type="number" id="max-consecutive-errors" min="0" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Cooldown (seconds)</label>
                  <input type="number" id="cooldown-seconds" min="0" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Min Arbitrage Gap ($)</label>
                  <input type="number" id="min-arbitrage-gap" step="0.01" min="0" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 5px; font-size: 12px;">Max Slippage (%)</label>
                  <input type="number" id="max-slippage-percentage" step="0.1" min="0" max="100" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #333; border-radius: 4px; color: white;">
                </div>
              </div>
              <label style="display: flex; align-items: center; margin-bottom: 15px;">
                <input type="checkbox" id="risk-enabled" style="margin-right: 8px;">
                <span style="font-size: 14px;">Enable Risk Management</span>
              </label>
              <div style="display: flex; gap: 10px; justify-content: center;">
                <button type="button" class="button success" onclick="saveRiskLimits()">Save Settings</button>
                <button type="button" class="button" onclick="resetRiskLimits()">Reset to Defaults</button>
                <button type="button" class="button" onclick="loadRiskLimitsDisplay()">Refresh</button>
              </div>
            </form>
          </div>

          <!-- Recent Activity Placeholder -->
          <div class="card">
            <h2>📋 Recent Activity</h2>
            <div id="logs">
              Activity log will appear here when bot is running...
            </div>
          </div>

          <div class="footer">
            <p>Arbitrage Bot Control Panel | Enhanced with LSP Router & WebSocket Support</p>
          </div>
        </div>

        <script>
          function controlBot(action) {
            const button = event.target;
            const originalText = button.innerText;
            button.disabled = true;
            button.innerText = 'Processing...';

            fetch(\`/api/\${action}\`, { method: 'POST' })
              .then(response => response.json())
              .then(data => {
                button.innerText = \u0027Success!\u0027;
                setTimeout(() => {
                  button.disabled = false;
                  button.innerText = originalText;
                  refreshStatus();
                  refreshMetrics();
                }, 2000);
              })
              .catch(error => {
                console.error(\u0027Error:\u0027, error);
                button.innerText = \u0027Error!\u0027;
                button.style.background = \u0027#ff073a\u0027;
                setTimeout(() => {
                  button.disabled = false;
                  button.innerText = originalText;
                  button.style.background = \u0027\u0027;
                }, 3000);
              });
          }

          function sendTestMessage() {
            fetch(\u0027/api/test-telegram\u0027, { method: \u0027POST\u0027 })
              .then(response => response.json())
              .then(data => {
                alert(\u0027Test Telegram message sent! Check your configured chat.\u0027);
              })
              .catch(error => {
                console.error(\u0027Error:\u0027, error);
                alert(\u0027Failed to send test message. Check console for details.\u0027);
              });
          }

          function refreshMetrics() {
            fetch(\u0027/api/metrics\u0027)
              .then(response => response.json())
              .then(metrics => {
                document.querySelectorAll(\u0027.metric-value\u0027)[0].innerText = metrics.totalOpenPositions;
                document.querySelectorAll(\u0027.metric-value\u0027)[1].innerText = \u0027$\u0027 + (metrics.dailyPnlInCents / 100).toFixed(2);
                document.querySelectorAll(\u0027.metric-value\u0027)[2].innerText = \u0027$\u0027 + (metrics.allTimePnlInCents / 100).toFixed(2);

                // Update last updated time
                const timeElement = document.querySelector(\u0027#metrics-grid\u0027).nextElementSibling;
                timeElement.innerText = \u0027Updated: \u0027 + new Date(metrics.lastUpdated).toLocaleString();
              })
              .catch(error => {
                console.error(\u0027Error refreshing metrics:\u0027, error);
              });
          }

          function refreshStatus() {
            fetch(\u0027/api/status\u0027)
              .then(response => response.json())
              .then(status => {
                const statusDiv = document.getElementById(\u0027status-content\u0027);
                const indicator = document.querySelector(\u0027.status-indicator\u0027);

                indicator.className = \u0027status-indicator status \u0027 + (status.isRunning ? \u0027running\u0027 : \u0027stopped\u0027);

                let html = \u0027<p><strong>State:</strong> \u0027 + (status.isRunning ? \u0027RUNNING\u0027 : \u0027STOPPED\u0027) + \u0027</p>\u0027;

                if (status.isRunning) {
                  html += \u0027<p><strong>PID:</strong> \u0027 + (status.processId || \u0027Unknown\u0027) + \u0027</p>\u0027;
                  html += \u0027<p><strong>Uptime:</strong> \u0027 + formatUptime(status.uptimeSeconds || 0) + \u0027</p>\u0027;
                  html += \u0027<p><strong>Memory:</strong> \u0027 + (status.memoryUsageMb ? status.memoryUsageMb.toFixed(2) + \u0027 MB\u0027 : \u0027N/A\u0027) + \u0027</p>\u0027;
                }

                html += \u0027<p><strong>Last Updated:</strong> \u0027 + new Date().toLocaleTimeString() + \u0027</p>\u0027;
                statusDiv.innerHTML = html;

                // Update control buttons
                document.querySelectorAll(\u0027.button:not([onclick*="sendTest"])\u0027)[0].disabled = status.isRunning;
                document.querySelectorAll(\u0027.button:not([onclick*="sendTest"])\u0027)[1].disabled = !status.isRunning;
              })
              .catch(error => {
                console.error(\u0027Error refreshing status:\u0027, error);
              });
          }

          function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return hours.toString().padStart(2, \u00270\u0027) + \u0027:\u0027 + minutes.toString().padStart(2, \u00270\u0027) + \u0027:\u0027 + secs.toString().padStart(2, \u00270\u0027);
          }

          // Risk management functions
          async function loadRiskLimitsDisplay() {
            try {
              const response = await fetch('/api/risk-limits');
              const data = await response.json();

              if (data.riskLimits) {
                const limits = data.riskLimits;
                const contentDiv = document.getElementById('risk-limits-content');

                contentDiv.innerHTML = \`
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; font-size: 12px;">
                    <div style="text-align: center;">
                      <div style="font-weight: bold; color: \${limits.enabled ? 'var(--success-color)' : 'var(--error-color)'};">\${limits.enabled ? 'ENABLED' : 'DISABLED'}</div>
                      <div>Status</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-weight: bold;">$\${(limits.maxDailyLoss / 100).toFixed(2)}</div>
                      <div>Max Daily Loss</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-weight: bold;">\${limits.maxPositionPerMarket}</div>
                      <div>Max/Market</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-weight: bold;">\${limits.maxTotalPosition}</div>
                      <div>Max Total</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-weight: bold;">\${limits.maxConcurrentTrades}</div>
                      <div>Concurrent</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-weight: bold;">\${limits.minArbitrageGap}¢</div>
                      <div>Min Gap</div>
                    </div>
                  </div>
                \`;
              }
            } catch (error) {
              console.error('Error loading risk limits:', error);
              document.getElementById('risk-limits-content').innerHTML = '<p style="color: var(--error-color);">Error loading risk limits</p>';
            }
          }

          async function saveRiskLimits() {
            const formData = {
              enabled: document.getElementById('risk-enabled').checked,
              maxDailyLoss: parseFloat(document.getElementById('max-daily-loss').value) * 100, // Convert to cents
              maxPositionPerMarket: parseInt(document.getElementById('max-position-per-market').value),
              maxTotalPosition: parseInt(document.getElementById('max-total-position').value),
              maxConcurrentTrades: parseInt(document.getElementById('max-concurrent-trades').value),
              maxConsecutiveErrors: parseInt(document.getElementById('max-consecutive-errors').value),
              cooldownSeconds: parseInt(document.getElementById('cooldown-seconds').value),
              minArbitrageGap: parseFloat(document.getElementById('min-arbitrage-gap').value) * 100, // Convert to cents
              maxSlippagePercentage: parseFloat(document.getElementById('max-slippage-percentage').value)
            };

            try {
              const response = await fetch('/api/risk-limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
              });

              const result = await response.json();

              if (response.ok) {
                alert('Risk limits saved successfully!');
                loadRiskLimitsDisplay();
              } else {
                alert('Error saving risk limits: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              console.error('Error saving risk limits:', error);
              alert('Error saving risk limits: ' + error.message);
            }
          }

          async function resetRiskLimits() {
            if (!confirm('Are you sure you want to reset all risk limits to default values?')) {
              return;
            }

            try {
              const response = await fetch('/api/risk-limits/reset', { method: 'POST' });
              const result = await response.json();

              if (response.ok && result.riskLimits) {
                // Update form with default values
                const limits = result.riskLimits;
                document.getElementById('risk-enabled').checked = limits.enabled;
                document.getElementById('max-daily-loss').value = (limits.maxDailyLoss / 100).toFixed(2);
                document.getElementById('max-position-per-market').value = limits.maxPositionPerMarket;
                document.getElementById('max-total-position').value = limits.maxTotalPosition;
                document.getElementById('max-concurrent-trades').value = limits.maxConcurrentTrades;
                document.getElementById('max-consecutive-errors').value = limits.maxConsecutiveErrors;
                document.getElementById('cooldown-seconds').value = limits.cooldownSeconds;
                document.getElementById('min-arbitrage-gap').value = (limits.minArbitrageGap / 100).toFixed(2);
                document.getElementById('max-slippage-percentage').value = limits.maxSlippagePercentage;

                alert('Risk limits reset to defaults!');
                loadRiskLimitsDisplay();
              } else {
                alert('Error resetting risk limits: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              console.error('Error resetting risk limits:', error);
              alert('Error resetting risk limits: ' + error.message);
            }
          }

          // Initialize risk management on page load
          loadRiskLimitsDisplay();

          // Populate form with current values
          async function initializeRiskForm() {
            try {
              const response = await fetch('/api/risk-limits');
              const data = await response.json();

              if (data.riskLimits) {
                const limits = data.riskLimits;
                document.getElementById('risk-enabled').checked = limits.enabled;
                document.getElementById('max-daily-loss').value = (limits.maxDailyLoss / 100).toFixed(2);
                document.getElementById('max-position-per-market').value = limits.maxPositionPerMarket;
                document.getElementById('max-total-position').value = limits.maxTotalPosition;
                document.getElementById('max-concurrent-trades').value = limits.maxConcurrentTrades;
                document.getElementById('max-consecutive-errors').value = limits.maxConsecutiveErrors;
                document.getElementById('cooldown-seconds').value = limits.cooldownSeconds;
                document.getElementById('min-arbitrage-gap').value = (limits.minArbitrageGap / 100).toFixed(2);
                document.getElementById('max-slippage-percentage').value = limits.maxSlippagePercentage;
              }
            } catch (error) {
              console.error('Error initializing risk form:', error);
            }
          }

          initializeRiskForm();

          // Auto-refresh functions
          setInterval(refreshStatus, 5000);  // Every 5 seconds
          setInterval(refreshMetrics, 30000); // Every 30 seconds
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  private jsonResponse(data: any, options: { status?: number } = {}): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status: options.status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private startPeriodicMetricsReporting(): void {
    // Send metrics summary to Telegram every 5 minutes
    setInterval(async () => {
      try {
        const metrics = this.metricsService.getCurrentMetrics();
        const dailyPnl = (metrics.dailyPnlInCents / 100).toFixed(2);
        const allTimePnl = (metrics.allTimePnlInCents / 100).toFixed(2);

        const message = `*${new Date().toLocaleTimeString()}*\n📊 *Metrics Summary*\n🔸 Open Positions: *${metrics.totalOpenPositions}*\n🔸 Daily P&L: $${dailyPnl}\n🔸 All-Time P&L: $${allTimePnl}`;

        await this.telegramService.sendMessage(message, 'metrics');
      } catch (error) {
        console.error('Error sending periodic metrics:', error);
      }
    }, CONFIG.METRICS_UPDATE_INTERVAL_MS);
  }
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main(): Promise<void> {
  console.log('🚀 Starting Enhanced Arbitrage Bot Controller...\n');

  try {
    // Load environment configuration
    EnvironmentManager.loadEnvironmentFile();

    // Initialize services
    const telegramService = new TelegramNotificationService();
    const metricsService = new ArbitrageMetricsService();
    const botController = new ArbitrageBotProcessController(telegramService);

    // Report configuration status
    console.log('✅ Configuration loaded');
    console.log(`📱 Telegram: ${telegramService.isConfigured() ? 'Enabled' : 'Disabled'}`);
    console.log('');

    // Start web API server
    const webServer = new ArbitrageBotWebApiServer(
      botController,
      metricsService,
      telegramService
    );
    webServer.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');

      try {
        await botController.stopProcess();
        console.log('✅ Bot processes stopped');
      } catch (error) {
        console.error('Error stopping bot:', error);
      }

      console.log('👋 Shutdown complete');
      process.exit(0);
    });

    console.log('\n🎯 Enhanced Arbitrage Bot Controller is ready!');
    console.log('💡 Use the web interface or REST API to control your bot\n');

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (import.meta.main) {
  await main();
}

// Export classes for testing
export {
  EnvironmentManager,
  TelegramNotificationService,
  ArbitrageMetricsService,
  LeagueClassificationService,
  LogProcessingService,
  ArbitrageBotProcessController,
  ArbitrageBotWebApiServer
};

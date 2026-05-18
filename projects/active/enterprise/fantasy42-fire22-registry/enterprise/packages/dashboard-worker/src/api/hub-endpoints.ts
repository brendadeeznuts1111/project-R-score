/**
 * Hub API Endpoints
 *
 * API routes for interacting with D1, R2, SQLite, and Language systems through hub
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { hubConnection } from '../config/hub-connection';
import { databaseLinks } from '../config/database-links';
import { fire22Language } from '../i18n/language-manager';
import { telegramBot } from '../telegram/multilingual-telegram-bot';
import { TelegramEnvironment } from '../telegram/telegram-env';
import { telegramIntegrationConfig } from '../config/telegram-integration-config';

const app = new Hono();

// Enable CORS for hub communication
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

// Hub health check
app.get('/api/hub/health', async c => {
  try {
    const healthCheck = await hubConnection.healthCheck();

    return c.json({
      status: healthCheck.hub ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      hub: {
        connected: healthCheck.hub,
        servicesConnected: healthCheck.totalConnected,
        totalServices: healthCheck.totalServices,
        services: healthCheck.services,
      },
      links: databaseLinks.getLinkStatus(),
    });
  } catch (error) {
    return c.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// D1 Database Endpoints
app.post('/api/hub/d1/:database/query', async c => {
  try {
    const database = c.req.param('database');
    const { query, params } = await c.req.json();

    const result = await hubConnection.executeD1Query(database, query, params);

    return c.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.get('/api/hub/d1/:database/tables', async c => {
  try {
    const database = c.req.param('database');

    const result = await hubConnection.executeD1Query(
      database,
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    );

    return c.json({
      success: true,
      tables: result.results?.map((row: any) => row.name) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tables',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.get('/api/hub/d1/:database/schema/:table', async c => {
  try {
    const database = c.req.param('database');
    const table = c.req.param('table');

    const result = await hubConnection.executeD1Query(database, `PRAGMA table_info(${table});`);

    return c.json({
      success: true,
      schema: result.results || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get schema',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// R2 Storage Endpoints
app.post('/api/hub/r2/:bucket/upload', async c => {
  try {
    const bucket = c.req.param('bucket');
    const formData = await c.req.formData();
    const key = formData.get('key') as string;
    const file = formData.get('file') as File;

    if (!key || !file) {
      throw new Error('Key and file are required');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const success = await hubConnection.uploadToR2(bucket, key, buffer);

    return c.json({
      success,
      key,
      size: buffer.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.get('/api/hub/r2/:bucket/download/:key', async c => {
  try {
    const bucket = c.req.param('bucket');
    const key = c.req.param('key');

    const data = await hubConnection.downloadFromR2(bucket, key);

    if (!data) {
      return c.json(
        {
          success: false,
          error: 'File not found',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    return new Response(data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${key}"`,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.delete('/api/hub/r2/:bucket/:key', async c => {
  try {
    const bucket = c.req.param('bucket');
    const key = c.req.param('key');

    const success = await hubConnection.deleteFromR2(bucket, key);

    return c.json({
      success: true,
      bucket,
      key,
      message: 'File deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// SQLite Endpoints
app.post('/api/hub/sqlite/sync', async c => {
  try {
    const { operation, tableName } = await c.req.json();

    if (!['push', 'pull'].includes(operation)) {
      throw new Error('Operation must be "push" or "pull"');
    }

    const success = await hubConnection.syncSQLite(operation, tableName);

    return c.json({
      success,
      operation,
      tableName: tableName || 'all',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'SQLite sync failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// Language System Endpoints
app.get('/api/hub/language/codes', async c => {
  try {
    const codes = fire22Language.getAllCodes();
    const statistics = fire22Language.getStatistics();

    return c.json({
      success: true,
      codes,
      statistics,
      currentLanguage: fire22Language.getCurrentLanguage(),
      supportedLanguages: fire22Language.getSupportedLanguages(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get language codes',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.get('/api/hub/language/text/:code', async c => {
  try {
    const code = c.req.param('code');
    const language = c.req.query('lang');

    const text = fire22Language.getText(code, language);
    const codeInfo = fire22Language.getCodeInfo(code);

    return c.json({
      success: true,
      code,
      text,
      codeInfo,
      language: language || fire22Language.getCurrentLanguage(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get text',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.post('/api/hub/language/sync', async c => {
  try {
    const { operation } = await c.req.json();

    if (!['push', 'pull'].includes(operation)) {
      throw new Error('Operation must be "push" or "pull"');
    }

    const success = await hubConnection.syncLanguageData(operation);

    return c.json({
      success,
      operation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Language sync failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.post('/api/hub/language/set', async c => {
  try {
    const { language } = await c.req.json();

    const success = fire22Language.setLanguage(language);

    return c.json({
      success,
      language,
      previousLanguage: fire22Language.getCurrentLanguage(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set language',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// Database Links Management
app.get('/api/hub/links', async c => {
  try {
    const links = databaseLinks.getLinkStatus();
    const testResults = await databaseLinks.testAllLinks();

    return c.json({
      success: true,
      links: links.map(link => ({
        ...link,
        connectionTest: testResults[link.name] || { status: 'unknown', responseTime: 0 },
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get links status',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.post('/api/hub/links/:name/sync', async c => {
  try {
    const name = c.req.param('name');
    const { direction } = await c.req.json();

    if (!['push', 'pull'].includes(direction)) {
      throw new Error('Direction must be "push" or "pull"');
    }

    const success = await databaseLinks.syncLink(name, direction);

    return c.json({
      success,
      link: name,
      direction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Link sync failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.post('/api/hub/links/sync-all', async c => {
  try {
    const { direction } = await c.req.json();

    if (!['push', 'pull'].includes(direction)) {
      throw new Error('Direction must be "push" or "pull"');
    }

    const results = await databaseLinks.syncAll(direction);

    return c.json({
      success: results.failed.length === 0,
      results,
      direction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync all failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.put('/api/hub/links/:name/enabled', async c => {
  try {
    const name = c.req.param('name');
    const { enabled } = await c.req.json();

    databaseLinks.setLinkEnabled(name, !!enabled);

    return c.json({
      success: true,
      link: name,
      enabled: !!enabled,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update link status',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// Hub connection test
app.get('/api/hub/test', async c => {
  try {
    const connectionResult = await hubConnection.connectToHub();
    const linkTests = await databaseLinks.testAllLinks();

    return c.json({
      success: connectionResult.success,
      hub: {
        connected: connectionResult.success,
        services: connectionResult.connections,
      },
      links: linkTests,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Hub test failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Enhanced monitoring endpoints
app.get('/api/hub/metrics', async c => {
  try {
    const healthCheck = await hubConnection.healthCheck();
    const linkStatus = databaseLinks.getLinkStatus();
    const languageStats = fire22Language.getStatistics();

    return c.json({
      success: true,
      metrics: {
        hub: {
          connected: healthCheck.hub,
          servicesConnected: healthCheck.totalConnected,
          totalServices: healthCheck.totalServices,
          uptime: healthCheck.uptime || 0,
        },
        links: {
          total: linkStatus.length,
          enabled: linkStatus.filter(link => link.enabled).length,
          healthy: linkStatus.filter(link => link.status === 'connected').length,
        },
        language: {
          totalCodes: languageStats.totalCodes,
          supportedLanguages: languageStats.supportedLanguages,
          completionRates: languageStats.completionRates,
          missingTranslations: languageStats.missingTranslations,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Metrics collection failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Batch operations endpoint
app.post('/api/hub/batch', async c => {
  try {
    const { operations } = await c.req.json();

    if (!Array.isArray(operations)) {
      throw new Error('Operations must be an array');
    }

    const results = [];

    for (const op of operations) {
      try {
        let result;

        switch (op.type) {
          case 'd1_query':
            result = await hubConnection.executeD1Query(op.database, op.query, op.params);
            break;
          case 'language_set':
            result = { success: fire22Language.setLanguage(op.language) };
            break;
          case 'link_sync':
            result = { success: await databaseLinks.syncLink(op.link, op.direction) };
            break;
          default:
            result = { success: false, error: `Unknown operation type: ${op.type}` };
        }

        results.push({ operation: op, result, success: true });
      } catch (error) {
        results.push({
          operation: op,
          result: { error: error instanceof Error ? error.message : 'Unknown error' },
          success: false,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return c.json({
      success: successCount === results.length,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Batch operation failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// R2 bucket listing endpoint
app.get('/api/hub/r2/:bucket/list', async c => {
  try {
    const bucket = c.req.param('bucket');
    const prefix = c.req.query('prefix') || '';
    const limit = parseInt(c.req.query('limit') || '100');

    const objects = await hubConnection.listR2Objects(bucket, { prefix, limit });

    return c.json({
      success: true,
      bucket,
      objects,
      count: objects.length,
      prefix,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list objects',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// Language validation endpoint
app.post('/api/hub/language/validate', async c => {
  try {
    const { codes } = await c.req.json();

    if (!Array.isArray(codes)) {
      throw new Error('Codes must be an array');
    }

    const validationResults = codes.map(code => {
      const codeInfo = fire22Language.getCodeInfo(code);
      const isValid = !!codeInfo;

      return {
        code,
        valid: isValid,
        info: codeInfo,
        translations: isValid
          ? {
              en: codeInfo.en,
              es: codeInfo.es || null,
              pt: codeInfo.pt || null,
              fr: codeInfo.fr || null,
            }
          : null,
      };
    });

    const validCount = validationResults.filter(r => r.valid).length;

    return c.json({
      success: true,
      results: validationResults,
      summary: {
        total: codes.length,
        valid: validCount,
        invalid: codes.length - validCount,
        validationRate: (validCount / codes.length) * 100,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// Telegram Bot Integration Endpoints
app.get('/api/hub/telegram/status', async c => {
  try {
    const telegramEnv = TelegramEnvironment.getInstance();
    const configSummary = telegramEnv.getConfigSummary();

    return c.json({
      success: true,
      status: 'active',
      config: configSummary,
      features: {
        multilingual: configSummary.features.multilingual,
        notifications: configSummary.features.notifications,
        p2pMatching: configSummary.features.p2pMatching,
        departmentWorkflows: configSummary.features.departmentWorkflows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Telegram status',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

app.post('/api/hub/telegram/notify', async c => {
  try {
    const { userId, message, type, priority, data } = await c.req.json();

    if (!userId || !message) {
      throw new Error('User ID and message are required');
    }

    // Get user's Telegram ID from database
    const user = await hubConnection.executeD1Query(
      'fire22-dashboard',
      'SELECT telegram_id FROM users WHERE id = ?',
      [userId]
    );

    if (!user?.results?.[0]?.telegram_id) {
      return c.json(
        {
          success: false,
          error: 'User not found or no Telegram ID linked',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    const telegramId = user.results[0].telegram_id;

    // Send notification via Telegram bot
    const notificationResult = await telegramBot.sendNotification(telegramId, {
      text: message,
      type: type || 'info',
      priority: priority || 'normal',
      data: data || {},
    });

    return c.json({
      success: true,
      telegramId,
      message: 'Notification sent successfully',
      result: notificationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.post('/api/hub/telegram/support-ticket', async c => {
  try {
    const { userId, subject, message, priority, serviceLevel } = await c.req.json();

    if (!userId || !subject || !message) {
      throw new Error('User ID, subject, and message are required');
    }

    // Create support ticket in database
    const ticketResult = await hubConnection.executeD1Query(
      'fire22-dashboard',
      `INSERT INTO support_tickets (user_id, subject, message, priority, service_level, status)
       VALUES (?, ?, ?, ?, ?, 'open')
       RETURNING id`,
      [userId, subject, message, priority || 'normal', serviceLevel || 'basic']
    );

    const ticketId = ticketResult.results?.[0]?.id;
    if (!ticketId) {
      throw new Error('Failed to create support ticket');
    }

    // Get user's Telegram ID
    const user = await hubConnection.executeD1Query(
      'fire22-dashboard',
      'SELECT telegram_id, name FROM users WHERE id = ?',
      [userId]
    );

    if (user?.results?.[0]?.telegram_id) {
      const telegramId = user.results[0].telegram_id;
      const userName = user.results[0].name;

      // Send confirmation to user via Telegram
      await telegramBot.sendSupportTicketConfirmation(telegramId, {
        ticketId,
        subject,
        priority: priority || 'normal',
        serviceLevel: serviceLevel || 'basic',
        userName,
      });
    }

    // Notify support team
    await telegramBot.notifySupportTeam({
      ticketId,
      subject,
      priority: priority || 'normal',
      serviceLevel: serviceLevel || 'basic',
      userId,
      userName: user?.results?.[0]?.name || 'Unknown User',
    });

    return c.json({
      success: true,
      ticketId,
      message: 'Support ticket created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create support ticket',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.get('/api/hub/telegram/users/:userId', async c => {
  try {
    const userId = c.req.param('userId');

    const user = await hubConnection.executeD1Query(
      'fire22-dashboard',
      `SELECT id, name, email, telegram_id, telegram_username, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user?.results?.[0]) {
      return c.json(
        {
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    const userData = user.results[0];

    return c.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        telegramId: userData.telegram_id,
        telegramUsername: userData.telegram_username,
        createdAt: userData.created_at,
        hasTelegram: !!userData.telegram_id,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user data',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.post('/api/hub/telegram/users/:userId/link', async c => {
  try {
    const userId = c.req.param('userId');
    const { telegramId, telegramUsername } = await c.req.json();

    if (!telegramId) {
      throw new Error('Telegram ID is required');
    }

    // Link Telegram account to user
    const result = await hubConnection.executeD1Query(
      'fire22-dashboard',
      `UPDATE users 
       SET telegram_id = ?, telegram_username = ?, telegram_linked_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [telegramId, telegramUsername || null, userId]
    );

    if (result.changes === 0) {
      return c.json(
        {
          success: false,
          error: 'User not found or update failed',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Send welcome message via Telegram
    await telegramBot.sendWelcomeMessage(telegramId, {
      userId: parseInt(userId),
      isNewLink: true,
    });

    return c.json({
      success: true,
      message: 'Telegram account linked successfully',
      telegramId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link Telegram account',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.post('/api/hub/telegram/broadcast', async c => {
  try {
    const { message, filters, priority } = await c.req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    // Build user filter query
    let query = 'SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL';
    const params: any[] = [];

    if (filters?.serviceLevel) {
      query += ' AND service_level = ?';
      params.push(filters.serviceLevel);
    }

    if (filters?.userType) {
      query += ' AND user_type = ?';
      params.push(filters.userType);
    }

    const users = await hubConnection.executeD1Query('fire22-dashboard', query, params);

    const telegramIds = users.results?.map((u: any) => u.telegram_id).filter(Boolean) || [];

    if (telegramIds.length === 0) {
      return c.json(
        {
          success: false,
          error: 'No users found matching criteria',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Send broadcast message
    const results = await Promise.allSettled(
      telegramIds.map(telegramId =>
        telegramBot.sendNotification(telegramId, {
          text: message,
          type: 'broadcast',
          priority: priority || 'normal',
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return c.json({
      success: true,
      message: 'Broadcast completed',
      summary: {
        total: telegramIds.length,
        successful,
        failed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send broadcast',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

app.get('/api/hub/telegram/metrics', async c => {
  try {
    const telegramEnv = TelegramEnvironment.getInstance();

    // Get user statistics
    const userStats = await hubConnection.executeD1Query(
      'fire22-dashboard',
      `SELECT 
         COUNT(*) as total_users,
         COUNT(telegram_id) as telegram_users,
         COUNT(CASE WHEN telegram_linked_at >= datetime('now', '-24 hours') THEN 1 END) as new_links_24h,
         COUNT(CASE WHEN telegram_linked_at >= datetime('now', '-7 days') THEN 1 END) as new_links_7d
       FROM users`
    );

    // Get support ticket statistics
    const ticketStats = await hubConnection.executeD1Query(
      'fire22-dashboard',
      `SELECT 
         COUNT(*) as total_tickets,
         COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
         COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
         COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as new_tickets_24h
       FROM support_tickets`
    );

    const stats = {
      users: userStats.results?.[0] || {},
      tickets: ticketStats.results?.[0] || {},
      config: telegramEnv.getConfigSummary(),
      features: telegramEnv.featureFlags,
    };

    return c.json({
      success: true,
      metrics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Enhanced Telegram Configuration Endpoints
app.get('/api/hub/telegram/config', async c => {
  try {
    const config = telegramIntegrationConfig.getConfig();
    const summary = telegramIntegrationConfig.getDashboardSummary();
    const validation = telegramIntegrationConfig.validateConfig();

    return c.json({
      success: true,
      config,
      summary,
      validation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Telegram config',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

app.get('/api/hub/telegram/health', async c => {
  try {
    const healthStatus = await telegramIntegrationConfig.getHealthStatus();

    return c.json({
      success: true,
      health: healthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get health status',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

app.post('/api/hub/telegram/test', async c => {
  try {
    const connectivity = await telegramIntegrationConfig.testConnectivity();

    return c.json({
      success: true,
      connectivity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test connectivity',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

app.put('/api/hub/telegram/config', async c => {
  try {
    const updates = await c.req.json();

    // Validate updates
    const allowedUpdates = [
      'enableMultilingual',
      'enableNotifications',
      'enableP2PMatching',
      'enableDepartmentWorkflows',
      'enableMetrics',
      'rateLimitCommands',
      'rateLimitMessages',
    ];

    const validUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        validUpdates[key] = value;
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return c.json(
        {
          success: false,
          error: 'No valid configuration updates provided',
          allowedUpdates,
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const success = telegramIntegrationConfig.updateConfig(validUpdates);

    if (success) {
      const updatedConfig = telegramIntegrationConfig.getConfig();
      const summary = telegramIntegrationConfig.getDashboardSummary();

      return c.json({
        success: true,
        message: 'Configuration updated successfully',
        updates: validUpdates,
        config: updatedConfig,
        summary,
        timestamp: new Date().toISOString(),
      });
    } else {
      return c.json(
        {
          success: false,
          error: 'Failed to update configuration',
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

export default app;

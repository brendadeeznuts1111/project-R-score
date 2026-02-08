#!/usr/bin/env bun
/**
 * 🚀 FactoryWager PROFILE CLI v10.0
 * 
 * Command-line interface for profile management
 * Usage: bun profile:create --user @ashschaeffer1 --dry-run=true
 */

import { ProfilePrefs, profileEngine, onboardUser, updatePreferences, logger, handleError } from '@factorywager/user-profile';
import { PreferenceManager } from '@factorywager/pref-propagation';
import { RedisProfileClient } from '@factorywager/redis-profile';
import { XGBoostPersonalizationModel } from '@factorywager/xgboost-pers';

const engine = profileEngine;
const prefManager = new PreferenceManager();
const redisClient = new RedisProfileClient();
const xgboostModel = new XGBoostPersonalizationModel();

interface CLIOptions {
  user?: string;
  'dry-run'?: string;
  gateway?: string;
  location?: string;
  loc?: string; // Alias for location
  'sub-level'?: string;
  sub?: string; // Alias for sub-level
  'display-name'?: string;
  query?: string;
  update?: string;
  field?: string;
  value?: string;
  open?: boolean; // Open dashboard after creation
  _?: string[];
}

async function handleCreate(options: CLIOptions) {
  const userId = options.user || options._?.[0];
  if (!userId) {
    logger.error('❌ User ID required (--user @username)');
    process.exit(1);
  }

  // Use v10.1 onboarding flow
  logger.info(`🚀 Onboarding user ${userId}...`);
  const result = await onboardUser({
    userId,
    displayName: options['display-name'],
    timezone: 'America/Chicago',
    subscription: (options['sub-level'] || options.sub || 'PremiumPlus') as ProfilePrefs['subLevel'],
  });

  if (result.status === 'profile_exists') {
    logger.info(`⚠️  ${result.message}`);
  } else {
    logger.info(`✅ ${result.message}`);
    logger.info(`   Profile hash: ${result.hash}`);
  }

  // Apply additional preferences if provided (even if profile exists)
  const location = options.location || options.loc;
  if (options['dry-run'] || options.gateway || location) {
    const updates: Partial<ProfilePrefs> = {};
    if (options['dry-run']) {
      updates.dryRun = options['dry-run'] === 'true' || options['dry-run'] === '1';
    }
    if (options.gateway) {
      updates.preferredGateway = options.gateway as ProfilePrefs['preferredGateway'];
    }
    if (location) {
      updates.location = location;
    }

    if (Object.keys(updates).length > 0) {
      await updatePreferences(userId, updates);
      logger.info(`✅ Applied additional preferences`);
    }
  }

  // Track in Redis HLL
  await redisClient.trackPreferenceUpdate(userId, 'dryRun', true);
  logger.info(`✅ Tracked in Redis HLL`);

  // Open dashboard if requested
  if (options.open) {
    const dashboardType = (options as CLIOptions & { avatar?: boolean }).avatar ? 'avatar' : 'dashboard';
    const port = (options as CLIOptions & { port?: number }).port || 3006;
    const dashboardUrl = dashboardType === 'avatar' 
      ? `http://localhost:${port}/avatar`
      : `http://localhost:${port}/dashboard`;
    
    // Check if dashboard is running, if not, start it
    try {
      const response = await fetch(dashboardUrl, { signal: AbortSignal.timeout(1000) });
      if (!response.ok) {
        throw new Error('Dashboard not responding');
      }
    } catch (error: unknown) {
      logger.info(`⚠️  Dashboard not running on port ${port}. Starting dashboard server...`);
      // Start dashboard in background
      const script = dashboardType === 'avatar'
        ? 'packages/dashboard-profile/src/avatar-3d.ts'
        : 'packages/dashboard-profile/src/app.ts';
      Bun.spawn(['bun', 'run', script, '--port', port.toString()], {
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'ignore'
      });
      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const openCmd = (() => {
      const platform = process.platform;
      if (platform === 'darwin') return 'open';
      if (platform === 'win32') return 'start';
      return 'xdg-open';
    })();
    
    try {
      Bun.spawn([openCmd, dashboardUrl], {
        stdout: 'ignore',
        stderr: 'ignore',
        stdin: 'ignore'
      });
      logger.info(`🌐 Opening ${dashboardType} dashboard: ${dashboardUrl}`);
    } catch (error: unknown) {
      logger.warn(`⚠️  Could not open browser automatically. Please visit: ${dashboardUrl}`);
      logger.debug(`Browser open error: ${handleError(error, 'handleCreate.openBrowser', { log: false })}`);
    }
  }
}

async function handleQuery(options: CLIOptions) {
  const userId = options.query || options._?.[0];
  if (!userId) {
    logger.error('❌ User ID required');
    process.exit(1);
  }

  logger.info(`🔍 Querying profile for ${userId}...`);
  const profile = await engine.getProfile(userId);

  if (!profile) {
    logger.error(`❌ Profile not found: ${userId}`);
    process.exit(1);
  }

  logger.info('\n📋 Profile:');
  logger.info(`   User ID: ${profile.userId}`);
  logger.info(`   Dry Run: ${profile.dryRun}`);
  logger.info(`   Gateways: ${profile.gateways.join(', ')}`);
  logger.info(`   Location: ${profile.location}`);
  logger.info(`   Subscription: ${profile.subLevel}`);
  logger.info(`   Progress: ${Object.keys(profile.progress).length} entries`);

  // Get personalization score
  const features = xgboostModel.extractFeatures({
    userId,
    prefs: profile,
    progress: profile.progress,
    geoIP: profile.location,
    subLevel: profile.subLevel,
  });
  const prediction = await xgboostModel.predict(features);
  logger.info(`   Personalization Score: ${prediction.score.toFixed(4)} (${(prediction.score * 100).toFixed(2)}%)`);

  // Get Redis stats
  const stats = await redisClient.getPreferenceStats(userId);
  logger.info('\n📊 Redis HLL Stats:');
  for (const [field, count] of Object.entries(stats)) {
    logger.info(`   ${field}: ${count} unique updates`);
  }
}

async function handleUpdate(options: CLIOptions) {
  const userId = options.update || options._?.[0];
  const field = options.field;
  const value = options.value;

  if (!userId || !field || value === undefined) {
    logger.error('❌ Usage: profile:update --update @user --field dryRun --value true');
    process.exit(1);
  }

  logger.info(`🔄 Updating ${field} for ${userId}...`);

  // Parse value
  type ParsedValue = string | number | boolean | object;
  let parsedValue: ParsedValue = value;
  if (value === 'true' || value === 'false') {
    parsedValue = value === 'true';
  } else if (!isNaN(Number(value))) {
    parsedValue = Number(value);
  } else if (value.startsWith('[') || value.startsWith('{')) {
    try {
      parsedValue = JSON.parse(value);
    } catch (error: unknown) {
      logger.error(`❌ Invalid JSON value: ${handleError(error, 'handleUpdate.parse', { log: false })}`);
      process.exit(1);
    }
  }

  const result = await prefManager.updatePreference(userId, field as keyof ProfilePrefs, parsedValue);
  logger.info(`✅ Updated: ${result.propagated ? 'Propagated' : 'Failed'}`);
  logger.info(`   Personalization Score: ${result.personalizationScore.toFixed(4)}`);
  if (result.anomalies.length > 0) {
    logger.warn(`   ⚠️  Anomalies: ${result.anomalies.join(', ')}`);
  }

  // Update in engine
  await engine.updateProfile(userId, { [field]: parsedValue } as Partial<ProfilePrefs>);
  logger.info(`✅ Profile saved`);
}

async function handleBenchmark() {
  logger.info('⚡ Running profile benchmarks...\n');

  // Benchmark: Create 50k profiles
  const profiles: ProfilePrefs[] = [];
  for (let i = 0; i < 50000; i++) {
    profiles.push({
      userId: `@user${i}`,
      dryRun: i % 2 === 0,
      gateways: ['venmo'],
      location: 'New Orleans, LA',
      subLevel: 'PremiumPlus',
      progress: {},
    });
  }

  const startCreate = Bun.nanoseconds();
  await engine.batchCreateProfiles(profiles);
  const createTime = (Bun.nanoseconds() - startCreate) / 1_000_000;
  logger.info(`✅ Created 50k profiles: ${createTime.toFixed(3)}ms (target: 1ms)`);

  // Benchmark: Query p99
  const startQuery = Bun.nanoseconds();
  for (let i = 0; i < 100; i++) {
    await engine.getProfile(`@user${i}`);
  }
  const queryTime = (Bun.nanoseconds() - startQuery) / 1_000_000;
  logger.info(`✅ Queried 100 profiles: ${queryTime.toFixed(3)}ms (target: 0.8ms p99)`);

  // Benchmark: Personalization prediction
  const features = xgboostModel.extractFeatures({
    userId: '@ashschaeffer1',
    prefs: profiles[0],
    progress: {},
    geoIP: 'New Orleans, LA',
    subLevel: 'PremiumPlus',
  });
  const startPred = Bun.nanoseconds();
  await xgboostModel.predict(features);
  const predTime = (Bun.nanoseconds() - startPred) / 1_000_000;
  logger.info(`✅ Personalization prediction: ${predTime.toFixed(6)}ms (target: 0.001ms)`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';
const options: CLIOptions & { _?: string[] } = { _: [] };

for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2).replace(/-/g, '-');
    // Handle boolean flags (--open, --dry-run=true)
    if (key === 'open' || key === 'dry-run') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--') && (nextArg === 'true' || nextArg === 'false')) {
        (options as CLIOptions)[key] = (nextArg === 'true') as boolean & string;
        i++; // Skip the value
      } else if (key === 'open') {
        (options as CLIOptions).open = true;
      } else {
        const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
        (options as CLIOptions)[key] = value as string;
      }
    } else {
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      (options as CLIOptions)[key] = value as string;
    }
  } else {
    options._!.push(arg);
  }
}

// Execute command
(async () => {
  try {
    switch (command) {
      case 'create':
        await handleCreate(options);
        break;
      case 'query':
        await handleQuery(options);
        break;
      case 'update':
        await handleUpdate(options);
        break;
      case 'bench':
        await handleBenchmark();
        break;
      case 'help':
      default:
        logger.info(`
🚀 FactoryWager Profile CLI v10.0

Commands:
  create    Create a new profile
            --user @username --dry-run=true --gateway venmo --location "New Orleans, LA" --sub-level PremiumPlus
  
  query     Query a profile
            --query @username
  
  update    Update a profile preference
            --update @user --field dryRun --value true
  
  bench     Run performance benchmarks

Examples:
  bun profile:create --user @ashschaeffer1 --dry-run=true
  bun profile:query @ashschaeffer1
  bun profile:update --update @ashschaeffer1 --field dryRun --value false
  bun profile:bench
        `);
    }
  } catch (error: unknown) {
    logger.error(`❌ Error: ${handleError(error, 'CLI', { log: false })}`);
    process.exit(1);
  } finally {
    engine.close();
    redisClient.close();
  }
})();

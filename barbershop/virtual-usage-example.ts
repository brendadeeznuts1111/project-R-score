/**
 * 📋 Example: Using Virtual Files in Barbershop Application
 * 
 * This shows how the virtual files generated during build can be imported
 * and used throughout the application, even though they don't exist on disk.
 */

// These imports work because the files are provided virtually during build
import { BUILD_ID, BUILD_TIME, BUILD_CONFIG } from './src/build-meta.ts';
import { VERSION, getVersionString, getBuildInfo } from './src/version.ts';
import { APP_CONSTANTS } from './src/constants.ts';

// Example usage in barbershop-dashboard.ts
export function addBuildInfoToResponse(responseData: any) {
  return {
    ...responseData,
    buildMeta: {
      id: BUILD_ID,
      timestamp: BUILD_TIME,
      version: getVersionString(),
      bunVersion: VERSION.bun,
      config: BUILD_CONFIG
    }
  };
}

// Example usage in server endpoints
export function createBuildInfoEndpoint() {
  return {
    build: {
      id: BUILD_ID,
      time: BUILD_TIME,
      timestamp: new Date(BUILD_TIME).toISOString(),
      version: VERSION.full,
      bun: VERSION.bun,
      config: BUILD_CONFIG,
      constants: APP_CONSTANTS
    },
    features: APP_CONSTANTS.FEATURES,
    performance: APP_CONSTANTS.PERFORMANCE
  };
}

// Example usage in logging
export function getBuildContext() {
  return {
    buildId: BUILD_ID,
    buildTime: BUILD_TIME,
    version: VERSION.full,
    features: APP_CONSTANTS.FEATURES
  };
}

// Example usage in error reporting
export function enhanceErrorWithBuildInfo(error: Error) {
  return {
    message: error.message,
    stack: error.stack,
    build: {
      id: BUILD_ID,
      time: BUILD_TIME,
      version: VERSION.full,
      bun: VERSION.bun
    },
    timestamp: Date.now()
  };
}

// Example usage in health checks
export function createHealthCheck() {
  const uptime = Date.now() - BUILD_TIME;
  
  return {
    status: 'healthy',
    uptime,
    uptimeHuman: `${Math.floor(uptime / 1000)}s`,
    build: {
      id: BUILD_ID,
      time: BUILD_TIME,
      version: VERSION.full,
      bun: VERSION.bun
    },
    features: APP_CONSTANTS.FEATURES,
    performance: APP_CONSTANTS.PERFORMANCE,
    timestamp: new Date().toISOString()
  };
}

// Example usage in configuration
export function getAppConfig() {
  return {
    name: APP_CONSTANTS.APP_NAME,
    version: VERSION.full,
    description: APP_CONSTANTS.APP_DESCRIPTION,
    build: getBuildInfo(),
    features: APP_CONSTANTS.FEATURES,
    performance: APP_CONSTANTS.PERFORMANCE,
    buildConfig: BUILD_CONFIG
  };
}

// Example usage in telemetry
export function createTelemetryEvent(eventName: string, data: any) {
  return {
    event: eventName,
    timestamp: Date.now(),
    build: {
      id: BUILD_ID,
      version: VERSION.full,
      uptime: Date.now() - BUILD_TIME
    },
    data
  };
}

// Example integration with existing logger
export function logWithContext(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const context = getBuildContext();
  
  console.log(`[${level.toUpperCase()}] ${message}`, {
    ...data,
    build: context,
    timestamp: new Date().toISOString()
  });
}

// Usage examples:
console.log('🏗️ Virtual File Usage Examples:');
console.log('');

// 1. Build info in API responses
const apiResponse = addBuildInfoToResponse({ status: 'ok' });
console.log('📡 API Response with build info:', apiResponse);

// 2. Health check endpoint
const healthCheck = createHealthCheck();
console.log('🏥 Health Check:', healthCheck);

// 3. Error enhancement
const enhancedError = enhanceErrorWithBuildInfo(new Error('Test error'));
console.log('❌ Enhanced Error:', enhancedError);

// 4. App configuration
const appConfig = getAppConfig();
console.log('⚙️ App Config:', appConfig);

// 5. Telemetry event
const telemetryEvent = createTelemetryEvent('user_action', { action: 'login' });
console.log('📊 Telemetry Event:', telemetryEvent);

export {
  addBuildInfoToResponse,
  createBuildInfoEndpoint,
  getBuildContext,
  enhanceErrorWithBuildInfo,
  createHealthCheck,
  getAppConfig,
  createTelemetryEvent,
  logWithContext
};

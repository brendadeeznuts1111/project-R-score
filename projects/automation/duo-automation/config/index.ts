// config/index.ts - Main configuration with organized URLs

import { URLS, ENVIRONMENT_URLS, CURRENT_URLS } from './urls';

export interface Config {
  urls: typeof URLS;
  environment: string;
  currentUrls: typeof CURRENT_URLS;
  environmentUrls: typeof ENVIRONMENT_URLS;
}

export const config: Config = {
  urls: URLS,
  environment: process.env.NODE_ENV || 'development',
  currentUrls: CURRENT_URLS,
  environmentUrls: ENVIRONMENT_URLS
};

// Export URL configuration
export { URLS, ENVIRONMENT_URLS, CURRENT_URLS } from './urls';

// Export configuration
export default config;

// Enhanced Template System Exports
// Comprehensive template system for IPFoxy + DuoPlus integration

// Types and Interfaces
export type {
  EnhancedUnifiedProfile,
  CloudPhoneConfig,
  EmailAccountConfig,
  SocialMediaAccount,
  EcommerceAccount,
  ProfileCreationOptions
} from "../../types/enhanced-templates";

// Template Definitions and Helpers
export {
  ENHANCED_PROFILE_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplateByName,
  getTemplatesByCategory,
  getAllTemplates,
  validateTemplateRequirements
} from "../../types/enhanced-templates";

// Enhanced Profile Manager
import { enhancedProfileManager } from "./unified-manager";

export {
  EnhancedUnifiedProfileManager,
  enhancedProfileManager,
  type ProfileCreationOptions as CreationOptions
} from "./unified-manager";

// React Components
export { EnhancedTemplateSelection } from "../../components/enhanced/TemplateSelection";

// Quick Setup Functions
export function createQuickGamingProfile(proxyId: string, phoneId: string, phoneNumber?: string) {
  return enhancedProfileManager.createProfileFromTemplate({
    templateName: "GAMING_MOBILE",
    proxyId,
    phoneId,
    phoneNumber,
    customName: "Mobile Gaming Profile"
  });
}

export function createQuickSocialMediaProfile(
  proxyId: string,
  phoneId: string,
  emailAddress: string,
  emailPassword: string,
  platform: "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok" = "facebook"
) {
  return enhancedProfileManager.createProfileFromTemplate({
    templateName: "SOCIAL_MEDIA_MANAGER",
    proxyId,
    phoneId,
    emailAddress,
    emailPassword,
    socialPlatform: platform,
    customName: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Manager`
  });
}

export function createQuickEcommerceProfile(
  proxyId: string,
  phoneId: string,
  businessEmail: string,
  platform: "amazon" | "ebay" | "shopify" | "etsy" = "shopify"
) {
  return enhancedProfileManager.createProfileFromTemplate({
    templateName: "DROPSHIPPING_PRO",
    proxyId,
    phoneId,
    businessEmail,
    ecommercePlatform: platform,
    customName: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Store`
  });
}

export function createQuickScrapingProfile(proxyId: string, phoneId: string) {
  return enhancedProfileManager.createProfileFromTemplate({
    templateName: "SCRAPING_STEALTH",
    proxyId,
    phoneId,
    customName: "Stealth Scraping Profile"
  });
}

export function createQuickDevelopmentProfile(proxyId: string, phoneId: string) {
  return enhancedProfileManager.createProfileFromTemplate({
    templateName: "DEVELOPMENT_CLOUD",
    proxyId,
    phoneId,
    customName: "Cloud Development Profile"
  });
}

export function createQuickStreamingProfile(proxyId: string, phoneId: string) {
  return enhancedProfileManager.createProfileFromTemplate({
    templateName: "STREAMING_GLOBAL",
    proxyId,
    phoneId,
    customName: "Global Streaming Profile"
  });
}

export function createQuickAccountCreationProfile(
  proxyId: string,
  phoneId: string,
  emailAddress: string,
  emailPassword: string,
  businessEmail?: string
) {
  return enhancedProfileManager.createProfileFromTemplate({
    templateName: "ACCOUNT_CREATION_PRO",
    proxyId,
    phoneId,
    emailAddress,
    emailPassword,
    businessEmail: businessEmail || emailAddress,
    customName: "Professional Account Creator"
  });
}

// Template Categories Summary
export const TEMPLATE_SUMMARY = {
  GAMING: {
    count: 1,
    description: "Mobile gaming with phone verification",
    features: ["Low latency", "Phone verification", "Gaming optimization"]
  },
  SOCIAL_MEDIA: {
    count: 1,
    description: "Multi-platform social media management",
    features: ["Multi-platform", "Phone verified", "Email integration"]
  },
  ECOMMERCE: {
    count: 2,
    description: "E-commerce and business operations",
    features: ["Payment processing", "Business email", "Multiple platforms"]
  },
  SCRAPING: {
    count: 1,
    description: "Advanced web scraping and automation",
    features: ["Stealth mode", "Rotating proxies", "Anti-detection"]
  },
  DEVELOPMENT: {
    count: 1,
    description: "Cloud development and API access",
    features: ["API access", "Secure connections", "Development tools"]
  },
  STREAMING: {
    count: 1,
    description: "Global streaming content access",
    features: ["Geo-unblocking", "HD streaming", "Multiple services"]
  }
} as const;

// Usage Examples
export const USAGE_EXAMPLES = {
  GAMING: `
// Create a gaming profile with phone verification
const gamingProfile = createQuickGamingProfile(
  'proxy-us-1',
  'phone-us-1',
  '+1-555-0123'
);

// Link real proxy data
enhancedProfileManager.linkProxyToProfile(gamingProfile.id, realProxy);
enhancedProfileManager.linkPhoneToProfile(gamingProfile.id, realPhone);
`,

  SOCIAL_MEDIA: `
// Create a Facebook management profile
const fbProfile = createQuickSocialMediaProfile(
  'proxy-us-2',
  'phone-us-2',
  'manager@business.com',
  'securepassword123',
  'facebook'
);
`,

  ECOMMERCE: `
// Create a Shopify store profile
const shopifyProfile = createQuickEcommerceProfile(
  'proxy-us-3',
  'phone-us-3',
  'store@business.com',
  'shopify'
);
`,

  SCRAPING: `
// Create a stealth scraping profile
const scrapingProfile = createQuickScrapingProfile(
  'proxy-de-1',
  'phone-de-1'
);
`
} as const;

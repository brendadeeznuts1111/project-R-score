// DuoPlus Pre-Configuration Mapping - Usage Examples
// Demonstrates how to integrate DuoPlus device templates with enhanced templates

import {
  EnhancedUnifiedProfileManager,
  type ProfileCreationOptions
} from "../src/utils/enhanced/unified-manager";
import {
  // DuoPlus Device Templates
  PLATFORM_DUOPLUS_CONFIG,

  // Mapping Functions
  getPlatformDuoPlusConfig,
  createDuoPlusDeviceRequest,
  createDuoPlusBatchRequest,
  validateDuoPlusConfig,
  getDuoPlusTemplate,
  estimateDeviceCreationTime,
  formatDeviceCreationResponse,

  // Types
  type DuoPlusDeviceCreationResponse,
  type DuoPlusBatchCreationRequest,
  type EnhancedUnifiedProfile,
  ENHANCED_PROFILE_TEMPLATES
} from "../src/types/enhanced-templates";

// Initialize the enhanced profile manager
const profileManager = new EnhancedUnifiedProfileManager();

// Example 1: Create a PayPal-optimized profile with DuoPlus configuration
function createPayPalProfile(): EnhancedUnifiedProfile {
  const options: ProfileCreationOptions = {
    templateName: "SOCIAL_MEDIA_MANAGER",
    proxyId: "proxy-us-residential-1",
    phoneId: "phone-us-1",
    customName: "PayPal Business Account",

    // DuoPlus Platform Configuration
    duoPlusPlatform: "PAYPAL",
    duoPlusTemplate: "duoplus-social-pro",
    duoPlusFingerprintProfile: "high_trust",
    duoPlusPhoneType: "long_term",
    duoPlusAutoVerify: true,

    // Email Configuration
    emailProvider: "gmail",
    emailAddress: "business@company.com",
    emailPassword: "securePassword123"
  };

  createDuoPlusDeviceRequest("SOCIAL_MEDIA_MANAGER", options);
  return profileManager.createProfileFromTemplate(options);
}

// Example 2: Create a bulk Twitter account creation profile
function createTwitterBulkProfile(count: number = 10): DuoPlusBatchCreationRequest {
  const options: ProfileCreationOptions = {
    templateName: "ACCOUNT_CREATION_PRO",
    proxyId: "proxy-residential-pool",
    phoneId: "phone-bulk-1",
    customName: "Twitter Bulk Creation",

    // DuoPlus Platform Configuration
    duoPlusPlatform: "TWITTER",
    duoPlusTemplate: "duoplus-mass-create",
    duoPlusFingerprintProfile: "aggressive",
    duoPlusPhoneType: "short_term",
    duoPlusAutoVerify: true
  };

  // Create batch request for multiple devices
  const proxyPool = [
    "proxy-residential-1",
    "proxy-residential-2",
    "proxy-residential-3",
    "proxy-residential-4",
    "proxy-residential-5"
  ];

  const phoneCountries = ["US", "UK", "CA", "AU"];

  return createDuoPlusBatchRequest(
    "ACCOUNT_CREATION_PRO",
    count,
    options,
    proxyPool,
    phoneCountries
  );
}

// Example 3: Create a gaming profile with optimized DuoPlus template
function createGamingProfile(): EnhancedUnifiedProfile {
  const options: ProfileCreationOptions = {
    templateName: "GAMING_MOBILE",
    proxyId: "proxy-datacenter-gaming-1",
    phoneId: "phone-gaming-1",
    customName: "Mobile Gaming Setup",

    // DuoPlus Platform Configuration
    duoPlusPlatform: "GAMING",
    duoPlusTemplate: "duoplus-gaming-v2",
    duoPlusFingerprintProfile: "balanced",
    duoPlusPhoneType: "disposable",
    duoPlusAutoVerify: false,

    // Custom DNS for gaming
    customDns: ["1.1.1.1", "8.8.8.8"],
    customWhitelist: ["pubgmobile.com", "fortnite.com", "callofduty.com", "garena.com"]
  };

  return profileManager.createProfileFromTemplate(options);
}

// Example 4: Validate DuoPlus configuration
function validateDuoPlusSetup(profile: EnhancedUnifiedProfile): boolean {
  if (!profile.duoPlusConfig) {
    console.log("No DuoPlus configuration found");
    return false;
  }

  const validation = validateDuoPlusConfig(
    profile.metadata.category.toUpperCase() as keyof typeof ENHANCED_PROFILE_TEMPLATES,
    profile.duoPlusConfig.deviceCreationRequest || {
      template_id: profile.duoPlusConfig.templateId,
      fingerprint_profile: profile.duoPlusConfig.fingerprintProfile
    }
  );

  if (!validation.isValid) {
    console.log("DuoPlus configuration errors:", validation.errors);
    return false;
  }

  console.log("DuoPlus configuration is valid");
  return true;
}

// Example 5: Get DuoPlus template information
function displayDuoPlusTemplateInfo(templateId: string): void {
  const template = getDuoPlusTemplate(templateId);

  if (!template) {
    console.log(`Template ${templateId} not found`);
    return;
  }

  console.log(`=== ${template.name} ===`);
  console.log(`Description: ${template.description}`);
  console.log(`GPU Acceleration: ${template.features.gpuAcceleration ? "Yes" : "No"}`);
  console.log(`Resolution: ${template.features.resolution}`);
  console.log(`Performance Profile: ${template.features.performanceProfile}`);
  console.log(`Fingerprint Profile: ${template.features.fingerprintProfile}`);
  console.log(`Supported Apps: ${template.supportedApps.join(", ")}`);
  console.log(`Use Cases: ${template.useCases.join(", ")}`);
}

// Example 6: Estimate device creation time
function estimateCreationTime(
  templateId: string,
  phoneType: "long_term" | "short_term" | "disposable"
): void {
  const estimatedMinutes = estimateDeviceCreationTime(templateId, { type: phoneType });
  console.log(
    `Estimated creation time for ${templateId} with ${phoneType} phone: ${estimatedMinutes} minutes`
  );
}

// Example 7: Handle device creation response
function handleDeviceCreationResponse(response: DuoPlusDeviceCreationResponse): void {
  const formatted = formatDeviceCreationResponse(response);

  console.log("=== Device Creation Status ===");
  console.log(`Status: ${formatted.status.toUpperCase()}`);
  console.log(`Message: ${formatted.message}`);
  console.log(`Time: ${formatted.estimatedTime}`);
  console.log("Recommended Actions:");
  formatted.actions.forEach((action) => console.log(`  - ${action}`));
}

// Example 8: Get platform-specific DuoPlus configuration
function displayPlatformConfiguration(platform: keyof typeof PLATFORM_DUOPLUS_CONFIG): void {
  const config = getPlatformDuoPlusConfig(platform);

  console.log(`=== ${platform} Configuration ===`);
  console.log(`Template: ${config.template}`);
  console.log(`Fingerprint Profile: ${config.fingerprintProfile}`);
  console.log(`Phone Country: ${config.phoneConfig.phoneCountry}`);
  console.log(`Phone Type: ${config.phoneConfig.phoneType}`);
  console.log(`Auto Verify: ${config.phoneConfig.autoVerify}`);
  console.log(`Proxy Type: ${config.proxy.type}`);
  console.log(`Proxy Rotation: ${config.proxy.rotation}`);
  console.log(`Authentication: ${config.proxy.authentication}`);
}

// Example 9: Profile management with DuoPlus features
function demonstrateDuoPlusProfileManagement(): void {
  // Create profiles
  const paypalProfile = createPayPalProfile();
  const gamingProfile = createGamingProfile();

  // Add to manager
  profileManager.createProfileFromTemplate(paypalProfile as unknown as ProfileCreationOptions);
  profileManager.createProfileFromTemplate(gamingProfile as unknown as ProfileCreationOptions);

  // Get DuoPlus statistics
  const stats = profileManager.getProfileStatistics();

  console.log("=== Profile Statistics ===");
  console.log(`Total Profiles: ${stats.total}`);
  console.log(`DuoPlus Enabled: ${stats.withDuoPlus}`);
  console.log("By DuoPlus Template:");
  Object.entries(stats.byDuoPlusTemplate).forEach(([template, count]) => {
    console.log(`  ${template}: ${count}`);
  });
  console.log("By Fingerprint Profile:");
  Object.entries(stats.byFingerprintProfile).forEach(([profile, count]) => {
    console.log(`  ${profile}: ${count}`);
  });

  // Get profiles pending device creation
  const pendingProfiles = profileManager.getProfilesPendingDeviceCreation();
  console.log(`Profiles pending device creation: ${pendingProfiles.length}`);

  // Simulate device creation response
  const mockResponse: DuoPlusDeviceCreationResponse = {
    device_id: "device-12345",
    phone_number: "+1-555-0123",
    fingerprint: {
      profile: "high_trust",
      randomization_applied: ["user_agent", "screen_resolution", "timezone"],
      trust_score: "high"
    },
    status: "ready",
    estimated_ready_time: "2024-01-01T12:00:00Z"
  };

  // Update profile with device creation response
  if (paypalProfile.id) {
    profileManager.updateDuoPlusDeviceResponse(paypalProfile.id, mockResponse);
    console.log("Updated PayPal profile with device creation response");
  }
}

// Usage Examples
console.log("=== DuoPlus Pre-Configuration Mapping Examples ===\n");

// Display template information
displayDuoPlusTemplateInfo("duoplus-social-pro");
console.log();

// Display platform configuration
displayPlatformConfiguration("PAYPAL");
console.log();

// Estimate creation times
estimateCreationTime("duoplus-social-pro", "long_term");
estimateCreationTime("duoplus-gaming-v2", "disposable");
console.log();

// Create and validate profiles
const paypalProfile = createPayPalProfile();
validateDuoPlusSetup(paypalProfile);
console.log();

// Handle device creation response
const mockResponse: DuoPlusDeviceCreationResponse = {
  device_id: "device-67890",
  phone_number: "+1-555-0456",
  fingerprint: {
    profile: "high_trust",
    randomization_applied: ["user_agent", "screen_resolution"],
    trust_score: "high"
  },
  status: "ready",
  estimated_ready_time: "2024-01-01T12:30:00Z"
};

handleDeviceCreationResponse(mockResponse);
console.log();

// Create batch request
const batchRequest = createTwitterBulkProfile(5);
console.log("=== Batch Creation Request ===");
console.log(`Create ${batchRequest.count} devices`);
console.log(`Platform: ${batchRequest.config.platform}`);
console.log(`Template: ${batchRequest.config.template_id}`);
console.log(`Proxy Pool: ${batchRequest.config.proxy_pool?.join(", ")}`);
console.log(`Phone Countries: ${batchRequest.config.phone_countries?.join(", ")}`);
console.log();

// Demonstrate profile management
demonstrateDuoPlusProfileManagement();
// Handle device creation response

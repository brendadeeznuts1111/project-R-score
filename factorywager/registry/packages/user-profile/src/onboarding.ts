#!/usr/bin/env bun
/**
 * 🚀 FactoryWager USER ONBOARDING FLOW v10.1
 * 
 * Full user onboarding → profile creation → preference tuning → progress persistence
 * Zero-downtime, Bun.secrets enterprise scoping, SHA-256 parity locks
 */

import { UserProfileEngine, ProfilePrefs } from './core';

export interface OnboardingSession {
  userId: string;           // '@ashschaeffer1'
  displayName?: string;     // 'Ashley'
  ip?: string;              // New Orleans IP
  timezone?: string;        // 'America/Chicago'
  subscription?: 'Free' | 'Premium' | 'PremiumPlus' | 'Enterprise';
}

export interface OnboardingResult {
  status: 'profile_created' | 'profile_exists' | 'error';
  userId: string;
  hash?: string;
  message: string;
}

const engine = new UserProfileEngine();

/**
 * Onboard a new user - creates minimal viable profile on first login
 */
export async function onboardUser(session: OnboardingSession): Promise<OnboardingResult> {
  // Check if profile already exists
  const existing = await engine.getProfile(session.userId);
  if (existing) {
    return {
      status: 'profile_exists',
      userId: session.userId,
      message: `Profile for ${session.userId} already exists. Welcome back!`,
    };
  }

  // Step 1 — Minimal viable profile (auto-created on first login)
  const avatarSeed = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const initialPrefs: ProfilePrefs = {
    userId: session.userId,
    displayName: session.displayName || session.userId.replace('@', ''),
    dryRun: true,                    // v10.1: default safety on
    gateways: ['venmo', 'cashapp', 'paypal'] as any,
    preferredGateway: 'venmo',
    location: 'New Orleans, LA',
    timezone: session.timezone || 'America/Chicago',
    subLevel: session.subscription || 'PremiumPlus',
    avatarSeed,
    safeScores: {
      venmo: 0.8842,           // Ashley's legendary clearance
      cashapp: 0.8842,
      paypal: 0.8842,
    },
    createdAt,
    progress: {},
  };

  const profileHash = await engine.createProfile(initialPrefs);

  // Step 2 — Auto-save first progress milestone
  await engine.saveProgress(session.userId, {
    milestone: 'first_login',
    metadata: {
      ip: session.ip,
      subscription: session.subscription || 'PremiumPlus',
      displayName: session.displayName,
    },
    score: 1.0,
  });

  // Step 3 — Persist sensitive prefs via Bun.secrets (enterprise scope)
  try {
    await Bun.secrets.set(
      { service: 'factorywager', name: `profile:${session.userId}:sensitive` },
      JSON.stringify({
        preferredPaymentMethods: ['venmo'],
        lastSafeScore: 0.8842,           // Ashley's legendary clearance
        ip: session.ip,
      })
    );
  } catch (error) {
    // Non-fatal - profile is still saved to SQLite
    console.warn(`Failed to save sensitive prefs to Bun.secrets: ${error}`);
  }

  return {
    status: 'profile_created',
    userId: session.userId,
    hash: profileHash,
    message: `Welcome ${session.displayName || session.userId} — your FactoryWager profile is now immortal.`,
  };
}

/**
 * Quick onboarding for CLI usage
 */
export async function quickOnboard(userId: string, options?: {
  displayName?: string;
  dryRun?: boolean;
  gateway?: string;
  location?: string;
  subLevel?: ProfilePrefs['subLevel'];
}): Promise<OnboardingResult> {
  return onboardUser({
    userId,
    displayName: options?.displayName,
    timezone: 'America/Chicago',
    subscription: options?.subLevel || 'PremiumPlus',
  });
}

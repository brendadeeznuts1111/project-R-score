#!/usr/bin/env bun
/**
 * 🚀 FactoryWager USER-PROFILE Package Entry Point (v10.1)
 */

export { UserProfileEngine, ProfilePrefsSchema, profileEngine } from './core';
export type { ProfilePrefs } from './core';
export { onboardUser, quickOnboard } from './onboarding';
export type { OnboardingSession, OnboardingResult } from './onboarding';
export { updatePreferences, saveProgress, getProgressHistory, pubsub } from './preferences';
export type { ProgressEntry, UpdatePreferencesResult, PubSubData } from './preferences';
export { logger } from './logger';
export { handleError, getErrorMessage } from './error-handler';
export { serializeBigInt, toJsonString, createSerializableCopy } from './serialization';
export { validateUserId, requireValidUserId, sanitizeString } from './validation';

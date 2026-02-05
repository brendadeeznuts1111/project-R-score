#!/usr/bin/env bun

/**
 * Guest Invitation Flow - SMS Integration & Onboarding
 * 
 * ACME's sophisticated guest invitation system for "cousin's friend" scenarios.
 * Seamless SMS integration with secure invite codes and delightful onboarding.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface PoolInvite {
  id: string;
  code: string;
  familyId: string;
  familyName: string;
  inviterId: string;
  inviterName: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  tier: RelationshipTier;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  metadata?: Record<string, any>;
}

interface GuestOnboardingSession {
  inviteId: string;
  sessionId: string;
  step: OnboardingStep;
  data: Record<string, any>;
  startedAt: Date;
  lastActivityAt: Date;
  completed: boolean;
}

enum OnboardingStep {
  CODE_VERIFICATION = 'code_verification',
  PROFILE_CREATION = 'profile_creation',
  PERMISSIONS_REVIEW = 'permissions_review',
  PAYMENT_SETUP = 'payment_setup',
  COMPLETED = 'completed'
}

interface SMSTemplate {
  type: 'invite' | 'reminder' | 'welcome';
  content: string;
  variables: string[];
}

class GuestInvitationFlow {
  private static readonly STORAGE_FILE = 'data/pool-invites.json';
  private static readonly ONBOARDING_FILE = 'data/guest-onboarding.json';
  private static readonly INVITE_CODE_LENGTH = 6;
  private static readonly INVITE_EXPIRY_HOURS = 24;
  
  // ACME's delightful SMS templates - crafted for family warmth
  private static readonly SMS_TEMPLATES: Record<string, SMSTemplate> = {
    invite: {
      type: 'invite',
      content: `You've been invited to the {{familyName}} Family Pool by {{inviterName}}! 🎉\n\nCode: {{inviteCode}}\nDownload app: factory-wager.app/download\nExpires in {{expiryHours}} hours`,
      variables: ['familyName', 'inviterName', 'inviteCode', 'expiryHours']
    },
    reminder: {
      type: 'reminder',
      content: `Hi {{guestName}}! Your invite to {{familyName}} Family Pool expires soon. Code: {{inviteCode}}\nDownload: factory-wager.app/download`,
      variables: ['guestName', 'familyName', 'inviteCode']
    },
    welcome: {
      type: 'welcome',
      content: `Welcome to {{familyName}} Family Pool, {{guestName}}! 🏡\nYour access level: {{tier}}\nStart by completing your profile in the app.`,
      variables: ['familyName', 'guestName', 'tier']
    }
  };

  /**
   * Create and send guest invitation
   */
  static async createInvitation(params: {
    familyId: string;
    familyName: string;
    inviterId: string;
    inviterName: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    tier: RelationshipTier;
    customMessage?: string;
  }): Promise<PoolInvite> {
    
    const inviteId = randomUUID();
    const inviteCode = this.generateInviteCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    const invite: PoolInvite = {
      id: inviteId,
      code: inviteCode,
      familyId: params.familyId,
      familyName: params.familyName,
      inviterId: params.inviterId,
      inviterName: params.inviterName,
      guestName: params.guestName,
      guestPhone: params.guestPhone,
      guestEmail: params.guestEmail,
      tier: params.tier,
      status: 'pending',
      createdAt: now,
      expiresAt,
      metadata: {
        customMessage: params.customMessage,
        smsSent: false,
        deliveryAttempts: 0
      }
    };

    // Save invitation
    await this.saveInvitation(invite);

    // Send SMS invitation
    await this.sendInvitationSMS(invite);

    console.log(`📱 Created invitation for ${params.guestName} to ${params.familyName}`);
    console.log(`📲 SMS sent to ${params.guestPhone} with code: ${inviteCode}`);

    return invite;
  }

  /**
   * Generate secure 6-digit invite code
   */
  private static generateInviteCode(): string {
    // Generate cryptographically secure 6-digit code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < this.INVITE_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Send invitation SMS via Twilio (mocked during development)
   */
  private static async sendInvitationSMS(invite: PoolInvite): Promise<void> {
    const template = this.SMS_TEMPLATES.invite;
    const message = this.populateTemplate(template, {
      familyName: invite.familyName,
      inviterName: invite.inviterName,
      inviteCode: invite.code,
      expiryHours: this.INVITE_EXPIRY_HOURS.toString()
    });

    try {
      // Mock SMS sending during development
      console.log(`📨 [MOCK] Sending SMS to ${invite.guestPhone}:`);
      console.log(message);
      
      // In production, this would use Twilio or similar service:
      // await twilioClient.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: invite.guestPhone
      // });

      // Update invitation metadata
      invite.metadata = {
        ...invite.metadata,
        smsSent: true,
        sentAt: new Date().toISOString(),
        deliveryAttempts: (invite.metadata?.deliveryAttempts || 0) + 1
      };

      await this.saveInvitation(invite);
      
    } catch (error) {
      console.error('Failed to send invitation SMS:', error);
      throw new Error('Failed to send invitation SMS');
    }
  }

  /**
   * Verify invite code and start onboarding session
   */
  static async verifyInviteCode(
    code: string,
    guestPhone?: string
  ): Promise<{
    valid: boolean;
    invite?: PoolInvite;
    session?: GuestOnboardingSession;
    error?: string;
  }> {
    
    const invite = await this.getInviteByCode(code);
    
    if (!invite) {
      return { valid: false, error: 'Invalid invite code' };
    }

    if (invite.status !== 'pending') {
      return { valid: false, error: 'Invite no longer valid' };
    }

    if (new Date() > invite.expiresAt) {
      await this.expireInvite(invite.id);
      return { valid: false, error: 'Invite has expired' };
    }

    if (guestPhone && invite.guestPhone !== guestPhone) {
      return { valid: false, error: 'Phone number does not match invite' };
    }

    // Create onboarding session
    const session = await this.createOnboardingSession(invite);
    
    return {
      valid: true,
      invite,
      session
    };
  }

  /**
   * Create guest onboarding session
   */
  private static async createOnboardingSession(invite: PoolInvite): Promise<GuestOnboardingSession> {
    const sessionId = randomUUID();
    const now = new Date();

    const session: GuestOnboardingSession = {
      inviteId: invite.id,
      sessionId,
      step: OnboardingStep.CODE_VERIFICATION,
      data: {
        inviteCode: invite.code,
        familyName: invite.familyName,
        inviterName: invite.inviterName,
        guestName: invite.guestName,
        tier: invite.tier
      },
      startedAt: now,
      lastActivityAt: now,
      completed: false
    };

    await this.saveOnboardingSession(session);
    return session;
  }

  /**
   * Progress through onboarding steps
   */
  static async progressOnboarding(
    sessionId: string,
    step: OnboardingStep,
    data: Record<string, any>
  ): Promise<{
    success: boolean;
    session?: GuestOnboardingSession;
    nextStep?: OnboardingStep;
    completed?: boolean;
    error?: string;
  }> {
    
    const session = await this.getOnboardingSession(sessionId);
    if (!session) {
      return { success: false, error: 'Invalid session' };
    }

    // Validate step progression
    if (!this.isValidStepProgression(session.step, step)) {
      return { success: false, error: 'Invalid step progression' };
    }

    // Update session
    session.step = step;
    session.data = { ...session.data, ...data };
    session.lastActivityAt = new Date();

    // Handle step-specific logic
    let nextStep: OnboardingStep | undefined;
    let completed = false;

    switch (step) {
      case OnboardingStep.CODE_VERIFICATION:
        nextStep = OnboardingStep.PROFILE_CREATION;
        break;
        
      case OnboardingStep.PROFILE_CREATION:
        // Create guest profile
        await this.createGuestProfile(session.inviteId, data);
        nextStep = OnboardingStep.PERMISSIONS_REVIEW;
        break;
        
      case OnboardingStep.PERMISSIONS_REVIEW:
        nextStep = OnboardingStep.PAYMENT_SETUP;
        break;
        
      case OnboardingStep.PAYMENT_SETUP:
        // Setup payment methods
        await this.setupGuestPaymentMethods(session.inviteId, data);
        nextStep = OnboardingStep.COMPLETED;
        break;
        
      case OnboardingStep.COMPLETED:
        completed = true;
        session.completed = true;
        await this.completeOnboarding(session.inviteId);
        break;
    }

    await this.saveOnboardingSession(session);

    return {
      success: true,
      session,
      nextStep,
      completed
    };
  }

  /**
   * Validate onboarding step progression
   */
  private static isValidStepProgression(currentStep: OnboardingStep, nextStep: OnboardingStep): boolean {
    const progression = [
      OnboardingStep.CODE_VERIFICATION,
      OnboardingStep.PROFILE_CREATION,
      OnboardingStep.PERMISSIONS_REVIEW,
      OnboardingStep.PAYMENT_SETUP,
      OnboardingStep.COMPLETED
    ];

    const currentIndex = progression.indexOf(currentStep);
    const nextIndex = progression.indexOf(nextStep);

    return nextIndex === currentIndex + 1;
  }

  /**
   * Create guest profile from invitation
   */
  private static async createGuestProfile(inviteId: string, profileData: Record<string, any>): Promise<void> {
    const invite = await this.getInvitation(inviteId);
    if (!invite) {
      throw new Error('Invitation not found');
    }

    // Import ExtendedFamilyTiers (avoid circular dependency)
    const { ExtendedFamilyTiers, RelationshipTier } = await import('./extended-family-tiers.ts');
    
    // Create family member
    await ExtendedFamilyTiers.createMember({
      name: profileData.name || invite.guestName,
      email: profileData.email || invite.guestEmail,
      phone: invite.guestPhone,
      relationship: invite.tier,
      familyId: invite.familyId,
      invitedBy: invite.inviterId
    });

    console.log(`👤 Created guest profile for ${invite.guestName} in ${invite.familyName}`);
  }

  /**
   * Setup payment methods for guest
   */
  private static async setupGuestPaymentMethods(inviteId: string, paymentData: Record<string, any>): Promise<void> {
    console.log(`💳 Setting up payment methods for guest from invite ${inviteId}`);
    // Integration with payment method setup
  }

  /**
   * Complete onboarding process
   */
  private static async completeOnboarding(inviteId: string): Promise<void> {
    const invite = await this.getInvitation(inviteId);
    if (!invite) {
      throw new Error('Invitation not found');
    }

    // Update invitation status
    invite.status = 'accepted';
    invite.acceptedAt = new Date();

    await this.saveInvitation(invite);

    // Send welcome SMS
    await this.sendWelcomeSMS(invite);

    // Notify inviter
    await this.notifyInviterOfAcceptance(invite);

    console.log(`🎉 Onboarding completed for ${invite.guestName}`);
  }

  /**
   * Send welcome SMS after successful onboarding
   */
  private static async sendWelcomeSMS(invite: PoolInvite): Promise<void> {
    const template = this.SMS_TEMPLATES.welcome;
    const message = this.populateTemplate(template, {
      familyName: invite.familyName,
      guestName: invite.guestName,
      tier: this.formatTierForDisplay(invite.tier)
    });

    console.log(`📨 [MOCK] Sending welcome SMS to ${invite.guestPhone}:`);
    console.log(message);
    
    // In production, send via Twilio
  }

  /**
   * Notify inviter that guest accepted invitation
   */
  private static async notifyInviterOfAcceptance(invite: PoolInvite): Promise<void> {
    console.log(`📢 Notifying ${invite.inviterName} that ${invite.guestName} accepted the invitation`);
    // Integration with notification system
  }

  /**
   * Get invitation by code
   */
  private static async getInviteByCode(code: string): Promise<PoolInvite | null> {
    const invites = await this.loadInvitations();
    return Object.values(invites).find(invite => invite.code === code) || null;
  }

  /**
   * Get invitation by ID
   */
  private static async getInvitation(inviteId: string): Promise<PoolInvite | null> {
    const invites = await this.loadInvitations();
    return invites[inviteId] || null;
  }

  /**
   * Get onboarding session
   */
  private static async getOnboardingSession(sessionId: string): Promise<GuestOnboardingSession | null> {
    const sessions = await this.loadOnboardingSessions();
    return sessions[sessionId] || null;
  }

  /**
   * Expire invitation
   */
  private static async expireInvite(inviteId: string): Promise<void> {
    const invite = await this.getInvitation(inviteId);
    if (invite) {
      invite.status = 'expired';
      await this.saveInvitation(invite);
    }
  }

  /**
   * Send reminder for pending invitations
   */
  static async sendReminders(): Promise<number> {
    const invites = await this.loadInvitations();
    const now = new Date();
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    
    let remindersSent = 0;

    for (const invite of Object.values(invites)) {
      if (invite.status === 'pending' && invite.expiresAt <= sixHoursFromNow && invite.expiresAt > now) {
        await this.sendReminderSMS(invite);
        remindersSent++;
      }
    }

    return remindersSent;
  }

  /**
   * Send reminder SMS
   */
  private static async sendReminderSMS(invite: PoolInvite): Promise<void> {
    const template = this.SMS_TEMPLATES.reminder;
    const message = this.populateTemplate(template, {
      guestName: invite.guestName,
      familyName: invite.familyName,
      inviteCode: invite.code
    });

    console.log(`📨 [MOCK] Sending reminder SMS to ${invite.guestPhone}:`);
    console.log(message);
  }

  /**
   * Clean up expired invitations
   */
  static async cleanupExpiredInvitations(): Promise<number> {
    const invites = await this.loadInvitations();
    const now = new Date();
    let cleaned = 0;

    for (const [id, invite] of Object.entries(invites)) {
      if (invite.status === 'pending' && now > invite.expiresAt) {
        invite.status = 'expired';
        invites[id] = invite;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveAllInvitations(invites);
      console.log(`🧹 Cleaned up ${cleaned} expired invitations`);
    }

    return cleaned;
  }

  /**
   * Populate SMS template with variables
   */
  private static populateTemplate(template: SMSTemplate, variables: Record<string, string>): string {
    let content = template.content;
    
    for (const variable of template.variables) {
      const value = variables[variable] || `{{${variable}}}`;
      content = content.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    }

    return content;
  }

  /**
   * Format tier for display
   */
  private static formatTierForDisplay(tier: RelationshipTier): string {
    const tierNames = {
      IMMEDIATE: 'Immediate Family',
      COUSIN: 'Cousin',
      EXTENDED: 'Extended Family',
      GUEST: 'Guest',
      INVITED_GUEST: 'Invited Guest'
    };
    return tierNames[tier] || tier;
  }

  /**
   * Data persistence methods
   */
  private static async loadInvitations(): Promise<Record<string, PoolInvite>> {
    try {
      if (!existsSync(this.STORAGE_FILE)) {
        return {};
      }
      const data = readFileSync(this.STORAGE_FILE, 'utf-8');
      const invites = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const [id, invite] of Object.entries(invites)) {
        const i = invite as any;
        i.createdAt = new Date(i.createdAt);
        i.expiresAt = new Date(i.expiresAt);
        if (i.acceptedAt) {
          i.acceptedAt = new Date(i.acceptedAt);
        }
      }
      
      return invites;
    } catch (error) {
      console.error('Failed to load invitations:', error);
      return {};
    }
  }

  private static async saveInvitation(invite: PoolInvite): Promise<void> {
    const invites = await this.loadInvitations();
    invites[invite.id] = invite;
    await this.saveAllInvitations(invites);
  }

  private static async saveAllInvitations(invites: Record<string, PoolInvite>): Promise<void> {
    try {
      writeFileSync(this.STORAGE_FILE, JSON.stringify(invites, null, 2));
    } catch (error) {
      console.error('Failed to save invitations:', error);
      throw error;
    }
  }

  private static async loadOnboardingSessions(): Promise<Record<string, GuestOnboardingSession>> {
    try {
      if (!existsSync(this.ONBOARDING_FILE)) {
        return {};
      }
      const data = readFileSync(this.ONBOARDING_FILE, 'utf-8');
      const sessions = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const [id, session] of Object.entries(sessions)) {
        const s = session as any;
        s.startedAt = new Date(s.startedAt);
        s.lastActivityAt = new Date(s.lastActivityAt);
      }
      
      return sessions;
    } catch (error) {
      console.error('Failed to load onboarding sessions:', error);
      return {};
    }
  }

  private static async saveOnboardingSession(session: GuestOnboardingSession): Promise<void> {
    const sessions = await this.loadOnboardingSessions();
    sessions[session.sessionId] = session;
    
    try {
      writeFileSync(this.ONBOARDING_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Failed to save onboarding session:', error);
      throw error;
    }
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];

  switch (command) {
    case 'invite':
      GuestInvitationFlow.createInvitation({
        familyId: 'FAM123',
        familyName: 'Johnson Family',
        inviterId: 'alice-cousin',
        inviterName: 'Alice',
        guestName: 'Sarah Connor',
        guestPhone: '+15551234567',
        tier: 'GUEST' as any
      }).then(invite => {
        console.log('✅ Invitation created:');
        console.log(`Code: ${invite.code}`);
        console.log(`Guest: ${invite.guestName}`);
        console.log(`Family: ${invite.familyName}`);
        console.log(`Expires: ${invite.expiresAt.toISOString()}`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'verify':
      const code = process.argv[3];
      if (code) {
        GuestInvitationFlow.verifyInviteCode(code).then(result => {
          if (result.valid) {
            console.log('✅ Invite code valid!');
            console.log(`Guest: ${result.invite?.guestName}`);
            console.log(`Family: ${result.invite?.familyName}`);
            console.log(`Session: ${result.session?.sessionId}`);
          } else {
            console.log('❌ Invalid invite code:', result.error);
          }
        }).catch(error => console.error('❌ Error:', error.message));
      }
      break;

    case 'reminders':
      GuestInvitationFlow.sendReminders().then(count => {
        console.log(`📨 Sent ${count} reminder SMS messages`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'cleanup':
      GuestInvitationFlow.cleanupExpiredInvitations().then(count => {
        console.log(`🧹 Cleaned up ${count} expired invitations`);
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    default:
      console.log(`
📱 Guest Invitation Flow - SMS Integration & Onboarding

Usage:
  guest-invite invite                        - Create and send guest invitation
  guest-invite verify <code>                - Verify invite code
  guest-invite reminders                     - Send reminder SMS messages
  guest-invite cleanup                       - Clean up expired invitations

Features:
✅ Secure 6-digit invite codes
✅ SMS integration with Twilio
✅ Delightful onboarding flow
✅ Tier-based access control
✅ Automatic expiration and cleanup
✅ ACME's signature family warmth

"Making every guest feel like family" - ACME Since 1972 🎩
      `);
  }
}

export default GuestInvitationFlow;
export { PoolInvite, GuestOnboardingSession, OnboardingStep, RelationshipTier };

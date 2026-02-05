#!/usr/bin/env bun

/**
 * ACME Family Quest System - Gamification for Family Payments
 * 
 * Since 1972, ACME has understood that the finest systems blend utility with delight.
 * Turn bill-splitting into family bonding achievements with quests, rewards, and progress.
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface Quest {
  id: string;
  name: string;
  description: string;
  reward: QuestReward;
  target: number;
  icon: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  prerequisites?: string[];
  bonus?: string;
  hidden?: boolean;
}

interface QuestReward {
  type: 'trust_score' | 'pool_credits' | 'custom' | 'badge' | 'emoji';
  value: number | string;
  description: string;
}

enum QuestCategory {
  TRUST = 'trust',
  SOCIAL = 'social',
  REUNION = 'reunion',
  INVITATION = 'invitation',
  MILESTONE = 'milestone'
}

enum QuestDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  LEGENDARY = 'legendary'
}

interface UserQuestProgress {
  userId: string;
  questId: string;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  rewardsClaimed: boolean;
  startedAt: Date;
  lastUpdated: Date;
}

interface QuestCompletion {
  userId: string;
  questId: string;
  completedAt: Date;
  reward: QuestReward;
  progressSnapshot: number;
  celebrationData?: {
    confetti: boolean;
    animation: string;
    sound: string;
  };
}

interface QuestEvent {
  type: 'payment_completed' | 'user_invited' | 'family_reunion' | 'trust_earned' | 'milestone_reached';
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
  familyId?: string;
}

class ACMEQuestSystem {
  private static readonly STORAGE_FILE = 'data/quest-progress.json';
  private static readonly QUEST_COMPLETIONS_FILE = 'data/quest-completions.json';
  
  // ACME's curated quest library - delightfully crafted since 1972
  private static readonly QUEST_LIBRARY: Quest[] = [
    // Trust Building Quests
    {
      id: 'first_front',
      name: 'Trust Builder',
      description: 'Front a payment for a cash-strapped cousin',
      reward: { type: 'trust_score', value: 10, description: '+10 trust score' },
      target: 1,
      icon: '🤝',
      category: QuestCategory.TRUST,
      difficulty: QuestDifficulty.EASY,
      bonus: 'Unlock ability to front up to $100'
    },
    {
      id: 'reliable_payer',
      name: 'Reliable Cousin',
      description: 'Complete 5 payments on time',
      reward: { type: 'trust_score', value: 15, description: '+15 trust score' },
      target: 5,
      icon: '⏰',
      category: QuestCategory.TRUST,
      difficulty: QuestDifficulty.EASY
    },
    {
      id: 'super_trusted',
      name: 'Family Rockstar',
      description: 'Achieve 100 trust score through reliable payments',
      reward: { type: 'badge', value: '🏆', description: 'Family Rockstar Badge' },
      target: 100,
      icon: '⭐',
      category: QuestCategory.TRUST,
      difficulty: QuestDifficulty.HARD,
      bonus: 'Unlock extended family invitation privileges'
    },

    // Social Quests
    {
      id: 'first_invitation',
      name: 'Ambassador',
      description: 'Invite a friend who completes 3 payments',
      reward: { type: 'custom', value: 'custom_emoji', description: 'Custom family emoji' },
      target: 3,
      icon: '🌟',
      category: QuestCategory.INVITATION,
      difficulty: QuestDifficulty.MEDIUM,
      bonus: 'Your friend gets +5 starting trust'
    },
    {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Invite 5 friends to the family pool',
      reward: { type: 'pool_credits', value: 10, description: '$10 pool credit' },
      target: 5,
      icon: '🦋',
      category: QuestCategory.INVITATION,
      difficulty: QuestDifficulty.MEDIUM
    },

    // Reunion Quests
    {
      id: 'family_reunion',
      name: 'Reunion Hero',
      description: 'Settle 10+ transactions at a family gathering',
      reward: { type: 'pool_credits', value: 5, description: '$5 pool credit' },
      target: 10,
      icon: '🏡',
      category: QuestCategory.REUNION,
      difficulty: QuestDifficulty.MEDIUM,
      bonus: 'Unlock reunion host privileges'
    },
    {
      id: 'reunion_legend',
      name: 'Reunion Legend',
      description: 'Host a reunion with 20+ settled transactions',
      reward: { type: 'badge', value: '🎉', description: 'Party Host Badge' },
      target: 20,
      icon: '🎊',
      category: QuestCategory.REUNION,
      difficulty: QuestDifficulty.HARD,
      bonus: 'Free pool credits for next reunion'
    },

    // Milestone Quests
    {
      id: 'first_payment',
      name: 'Newcomer',
      description: 'Complete your first payment',
      reward: { type: 'trust_score', value: 5, description: '+5 trust score' },
      target: 1,
      icon: '🎯',
      category: QuestCategory.MILESTONE,
      difficulty: QuestDifficulty.EASY
    },
    {
      id: 'century_club',
      name: 'Century Club',
      description: 'Complete 100 payments',
      reward: { type: 'emoji', value: '💯', description: '100 emoji' },
      target: 100,
      icon: '💯',
      category: QuestCategory.MILESTONE,
      difficulty: QuestDifficulty.LEGENDARY,
      bonus: 'Permanent +5% fee discount'
    },

    // Hidden ACME Legend Quest
    {
      id: 'acme_legend',
      name: 'ACME Legend Since \'72',
      description: 'Complete 50 quests - achieve true mastery',
      reward: { type: 'badge', value: '🏅', description: 'ACME Legend Badge' },
      target: 50,
      icon: '🎩',
      category: QuestCategory.MILESTONE,
      difficulty: QuestDifficulty.LEGENDARY,
      hidden: true,
      bonus: 'Unlock retro ACME theme and exclusive features'
    }
  ];

  /**
   * Initialize quest system for user
   */
  static async initializeUserQuests(userId: string): Promise<void> {
    const progress = await this.loadUserProgress();
    
    if (!progress[userId]) {
      progress[userId] = {};
      
      // Start with beginner quests
      const beginnerQuests = this.QUEST_LIBRARY.filter(quest => 
        quest.difficulty === QuestDifficulty.EASY && !quest.hidden
      );
      
      for (const quest of beginnerQuests) {
        progress[userId][quest.id] = {
          userId,
          questId: quest.id,
          progress: 0,
          completed: false,
          rewardsClaimed: false,
          startedAt: new Date(),
          lastUpdated: new Date()
        };
      }
      
      await this.saveUserProgress(progress);
      console.log(`🎮 Initialized quests for user: ${userId}`);
    }
  }

  /**
   * Process quest event and update progress
   */
  static async processQuestEvent(event: QuestEvent): Promise<QuestCompletion[]> {
    const completions: QuestCompletion[] = [];
    const progress = await this.loadUserProgress();
    
    // Initialize user quests if needed
    await this.initializeUserQuests(event.userId);
    
    // Get relevant quests for this event type
    const relevantQuests = this.getQuestsForEvent(event);
    
    for (const quest of relevantQuests) {
      const userProgress = progress[event.userId][quest.id];
      
      if (!userProgress || userProgress.completed) {
        continue;
      }
      
      // Update progress based on event
      const progressIncrement = await this.calculateProgress(quest, event);
      userProgress.progress += progressIncrement;
      userProgress.lastUpdated = new Date();
      
      // Check for completion
      if (userProgress.progress >= quest.target && !userProgress.completed) {
        userProgress.completed = true;
        userProgress.completedAt = new Date();
        
        // Award completion
        const completion = await this.awardQuestCompletion(event.userId, quest, userProgress.progress);
        completions.push(completion);
        
        // Unlock new quests based on completion
        await this.unlockNewQuests(event.userId, quest);
        
        console.log(`🎉 Quest completed: ${quest.name} by ${event.userId}`);
      }
    }
    
    await this.saveUserProgress(progress);
    return completions;
  }

  /**
   * Get quests relevant to specific event
   */
  private static getQuestsForEvent(event: QuestEvent): Quest[] {
    return this.QUEST_LIBRARY.filter(quest => {
      switch (event.type) {
        case 'payment_completed':
          return quest.category === QuestCategory.TRUST || 
                 quest.category === QuestCategory.MILESTONE;
        case 'user_invited':
          return quest.category === QuestCategory.INVITATION;
        case 'family_reunion':
          return quest.category === QuestCategory.REUNION;
        case 'trust_earned':
          return quest.category === QuestCategory.TRUST;
        case 'milestone_reached':
          return quest.category === QuestCategory.MILESTONE;
        default:
          return false;
      }
    });
  }

  /**
   * Calculate progress increment for quest
   */
  private static async calculateProgress(quest: Quest, event: QuestEvent): Promise<number> {
    switch (quest.id) {
      case 'first_front':
        return event.data.frontedPayment ? 1 : 0;
      case 'reliable_payer':
      case 'century_club':
        return 1;
      case 'first_payment':
        return 1;
      case 'first_invitation':
        return event.data.invitedPaymentCompleted ? 1 : 0;
      case 'social_butterfly':
        return 1;
      case 'family_reunion':
      case 'reunion_legend':
        return event.data.transactionCount || 1;
      case 'super_trusted':
        return event.data.trustScoreGained || 0;
      case 'acme_legend':
        return 1; // Awarded when completing 50 other quests
      default:
        return 0;
    }
  }

  /**
   * Award quest completion with rewards
   */
  private static async awardQuestCompletion(
    userId: string, 
    quest: Quest, 
    finalProgress: number
  ): Promise<QuestCompletion> {
    
    const completion: QuestCompletion = {
      userId,
      questId: quest.id,
      completedAt: new Date(),
      reward: quest.reward,
      progressSnapshot: finalProgress,
      celebrationData: {
        confetti: true,
        animation: this.getCelebrationAnimation(quest),
        sound: this.getCelebrationSound(quest)
      }
    };
    
    // Save completion
    const completions = await this.loadQuestCompletions();
    if (!completions[userId]) {
      completions[userId] = [];
    }
    completions[userId].push(completion);
    await this.saveQuestCompletions(completions);
    
    // Apply rewards
    await this.applyQuestReward(userId, quest.reward);
    
    // Trigger celebration
    await this.triggerCelebration(userId, completion);
    
    return completion;
  }

  /**
   * Apply quest reward to user
   */
  private static async applyQuestReward(userId: string, reward: QuestReward): Promise<void> {
    console.log(`🎁 Applying reward to ${userId}: ${reward.description}`);
    
    switch (reward.type) {
      case 'trust_score':
        await this.addTrustScore(userId, reward.value as number);
        break;
      case 'pool_credits':
        await this.addPoolCredits(userId, reward.value as number);
        break;
      case 'badge':
        await this.awardBadge(userId, reward.value as string);
        break;
      case 'emoji':
        await this.unlockEmoji(userId, reward.value as string);
        break;
      case 'custom':
        await this.applyCustomReward(userId, reward.value as string);
        break;
    }
  }

  /**
   * Unlock new quests based on completed quest
   */
  private static async unlockNewQuests(userId: string, completedQuest: Quest): Promise<void> {
    const progress = await this.loadUserProgress();
    const userProgress = progress[userId];
    
    // Find quests that become available
    const newlyAvailable = this.QUEST_LIBRARY.filter(quest => {
      // Skip if already started
      if (userProgress[quest.id]) return false;
      
      // Check if this quest unlocks it
      return quest.prerequisites?.includes(completedQuest.id);
    });
    
    for (const quest of newlyAvailable) {
      userProgress[quest.id] = {
        userId,
        questId: quest.id,
        progress: 0,
        completed: false,
        rewardsClaimed: false,
        startedAt: new Date(),
        lastUpdated: new Date()
      };
      
      console.log(`🔓 Unlocked new quest: ${quest.name} for ${userId}`);
    }
    
    await this.saveUserProgress(progress);
  }

  /**
   * Get user's current quest progress
   */
  static async getUserQuestProgress(userId: string): Promise<{
    active: Array<Quest & UserQuestProgress>;
    completed: Array<Quest & UserQuestProgress>;
    available: Quest[];
    statistics: {
      totalCompleted: number;
      totalProgress: number;
      currentStreak: number;
      nextMilestone: string;
    };
  }> {
    const progress = await this.loadUserProgress();
    const userProgress = progress[userId] || {};
    
    const active: Array<Quest & UserQuestProgress> = [];
    const completed: Array<Quest & UserQuestProgress> = [];
    
    for (const [questId, userQuest] of Object.entries(userProgress)) {
      const quest = this.QUEST_LIBRARY.find(q => q.id === questId);
      if (!quest) continue;
      
      const questWithProgress = { ...quest, ...userQuest };
      
      if (userQuest.completed) {
        completed.push(questWithProgress);
      } else {
        active.push(questWithProgress);
      }
    }
    
    // Calculate statistics
    const totalCompleted = completed.length;
    const totalProgress = active.reduce((sum, q) => sum + (q.progress / q.target), 0) + totalCompleted;
    const currentStreak = await this.calculateCurrentStreak(userId);
    const nextMilestone = this.getNextMilestone(totalCompleted);
    
    return {
      active: active.sort((a, b) => b.progress / b.target - a.progress / a.target),
      completed: completed.sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)),
      available: this.getAvailableQuests(userId),
      statistics: {
        totalCompleted,
        totalProgress: Math.round(totalProgress * 100) / 100,
        currentStreak,
        nextMilestone
      }
    };
  }

  /**
   * Get available quests for user
   */
  private static getAvailableQuests(userId: string): Quest[] {
    // In a real implementation, this would check prerequisites and user level
    return this.QUEST_LIBRARY.filter(quest => !quest.hidden);
  }

  /**
   * Calculate current quest completion streak
   */
  private static async calculateCurrentStreak(userId: string): Promise<number> {
    const completions = await this.loadQuestCompletions();
    const userCompletions = completions[userId] || [];
    
    if (userCompletions.length === 0) return 0;
    
    // Sort by completion date
    userCompletions.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    
    let streak = 1;
    const lastCompletion = userCompletions[0].completedAt;
    const oneDayAgo = new Date(lastCompletion.getTime() - 24 * 60 * 60 * 1000);
    
    for (let i = 1; i < userCompletions.length; i++) {
      const completion = userCompletions[i];
      if (completion.completedAt >= oneDayAgo) {
        streak++;
        oneDayAgo.setTime(completion.completedAt.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * Get next milestone
   */
  private static getNextMilestone(completedCount: number): string {
    const milestones = [1, 5, 10, 25, 50, 100];
    const nextMilestone = milestones.find(m => m > completedCount);
    return nextMilestone ? `${nextMilestone} quests` : 'Master Quester';
  }

  /**
   * Get celebration animation for quest
   */
  private static getCelebrationAnimation(quest: Quest): string {
    switch (quest.difficulty) {
      case QuestDifficulty.EASY:
        return 'confetti-burst';
      case QuestDifficulty.MEDIUM:
        return 'fireworks';
      case QuestDifficulty.HARD:
        return 'rainbow-explosion';
      case QuestDifficulty.LEGENDARY:
        return 'acme-spectacular';
      default:
        return 'sparkle';
    }
  }

  /**
   * Get celebration sound for quest
   */
  private static getCelebrationSound(quest: Quest): string {
    switch (quest.category) {
      case QuestCategory.TRUST:
        return 'achievement-chime';
      case QuestCategory.SOCIAL:
        return 'social-bell';
      case QuestCategory.REUNION:
        return 'family-celebration';
      case QuestCategory.MILESTONE:
        return 'milestone-fanfare';
      default:
        return 'quest-complete';
    }
  }

  /**
   * Trigger celebration effects
   */
  private static async triggerCelebration(userId: string, completion: QuestCompletion): Promise<void> {
    console.log(`🎊 Triggering celebration for ${userId}: ${completion.celebrationData?.animation}`);
    // In production, this would trigger animations, sounds, notifications
  }

  /**
   * Reward application methods (placeholders for integration)
   */
  private static async addTrustScore(userId: string, amount: number): Promise<void> {
    console.log(`📈 Adding ${amount} trust score to ${userId}`);
    // Integration with user trust system
  }

  private static async addPoolCredits(userId: string, amount: number): Promise<void> {
    console.log(`💰 Adding $${amount} pool credits to ${userId}`);
    // Integration with pool credit system
  }

  private static async awardBadge(userId: string, badge: string): Promise<void> {
    console.log(`🏆 Awarding badge ${badge} to ${userId}`);
    // Integration with badge system
  }

  private static async unlockEmoji(userId: string, emoji: string): Promise<void> {
    console.log(`😀 Unlocking emoji ${emoji} for ${userId}`);
    // Integration with emoji system
  }

  private static async applyCustomReward(userId: string, reward: string): Promise<void> {
    console.log(`🎁 Applying custom reward ${reward} to ${userId}`);
    // Integration with custom reward system
  }

  /**
   * Data persistence methods
   */
  private static async loadUserProgress(): Promise<Record<string, Record<string, UserQuestProgress>>> {
    try {
      if (!existsSync(this.STORAGE_FILE)) {
        return {};
      }
      const data = readFileSync(this.STORAGE_FILE, 'utf-8');
      const progress = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const [userId, userProgress] of Object.entries(progress)) {
        for (const [questId, questProgress] of Object.entries(userProgress as any)) {
          const qp = questProgress as UserQuestProgress;
          qp.startedAt = new Date(qp.startedAt);
          qp.lastUpdated = new Date(qp.lastUpdated);
          if (qp.completedAt) {
            qp.completedAt = new Date(qp.completedAt);
          }
        }
      }
      
      return progress;
    } catch (error) {
      console.error('Failed to load quest progress:', error);
      return {};
    }
  }

  private static async saveUserProgress(progress: Record<string, Record<string, UserQuestProgress>>): Promise<void> {
    try {
      if (!existsSync('data')) {
        await require('fs').promises.mkdir('data', { recursive: true });
      }
      writeFileSync(this.STORAGE_FILE, JSON.stringify(progress, null, 2));
    } catch (error) {
      console.error('Failed to save quest progress:', error);
      throw error;
    }
  }

  private static async loadQuestCompletions(): Promise<Record<string, QuestCompletion[]>> {
    try {
      if (!existsSync(this.QUEST_COMPLETIONS_FILE)) {
        return {};
      }
      const data = readFileSync(this.QUEST_COMPLETIONS_FILE, 'utf-8');
      const completions = JSON.parse(data);
      
      // Convert date strings back to Date objects
      for (const [userId, userCompletions] of Object.entries(completions)) {
        for (const completion of userCompletions as any) {
          completion.completedAt = new Date(completion.completedAt);
        }
      }
      
      return completions;
    } catch (error) {
      console.error('Failed to load quest completions:', error);
      return {};
    }
  }

  private static async saveQuestCompletions(completions: Record<string, QuestCompletion[]>): Promise<void> {
    try {
      writeFileSync(this.QUEST_COMPLETIONS_FILE, JSON.stringify(completions, null, 2));
    } catch (error) {
      console.error('Failed to save quest completions:', error);
      throw error;
    }
  }

  /**
   * Get quest library
   */
  static getQuestLibrary(): Quest[] {
    return [...this.QUEST_LIBRARY];
  }

  /**
   * Get quest by ID
   */
  static getQuestById(questId: string): Quest | null {
    return this.QUEST_LIBRARY.find(q => q.id === questId) || null;
  }
}

// CLI interface for testing
if (import.meta.main) {
  const command = process.argv[2];
  const userId = process.argv[3] || 'user-123';

  switch (command) {
    case 'init':
      ACMEQuestSystem.initializeUserQuests(userId).then(() => {
        console.log('🎮 Quest system initialized');
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'progress':
      ACMEQuestSystem.getUserQuestProgress(userId).then(progress => {
        console.log('📊 Quest Progress:');
        console.log(`Active: ${progress.active.length} quests`);
        console.log(`Completed: ${progress.completed.length} quests`);
        console.log(`Statistics:`, progress.statistics);
        
        if (progress.active.length > 0) {
          console.log('\n🎯 Active Quests:');
          progress.active.forEach(quest => {
            const progressPercent = Math.round((quest.progress / quest.target) * 100);
            console.log(`  ${quest.icon} ${quest.name}: ${quest.progress}/${quest.target} (${progressPercent}%)`);
          });
        }
      }).catch(error => console.error('❌ Error:', error.message));
      break;

    case 'event':
      const eventType = process.argv[4] as QuestEvent['type'];
      if (eventType) {
        const event: QuestEvent = {
          type: eventType,
          userId,
          data: { test: true },
          timestamp: new Date()
        };

        ACMEQuestSystem.processQuestEvent(event).then(completions => {
          console.log(`🎉 Processed ${eventType} event`);
          console.log(`Completions: ${completions.length}`);
          
          completions.forEach(completion => {
            console.log(`  ✅ ${completion.questId}: ${completion.reward.description}`);
          });
        }).catch(error => console.error('❌ Error:', error.message));
      }
      break;

    case 'library':
      const library = ACMEQuestSystem.getQuestLibrary();
      console.log('📚 ACME Quest Library:');
      library.forEach(quest => {
        const status = quest.hidden ? '(Hidden)' : '';
        console.log(`  ${quest.icon} ${quest.name}: ${quest.description} ${status}`);
        console.log(`    Reward: ${quest.reward.description} | Target: ${quest.target}`);
      });
      break;

    default:
      console.log(`
🎮 ACME Quest System - Gamifying Family Payments Since 1972

Usage:
  quest-system init <userId>           - Initialize quests for user
  quest-system progress <userId>       - Show user's quest progress
  quest-system event <userId> <type>   - Process quest event
  quest-system library                 - Show quest library

Event Types: payment_completed, user_invited, family_reunion, trust_earned, milestone_reached

Features:
✅ Dynamic quest progression with rewards
✅ Trust building and social engagement
✅ Family reunion and milestone celebrations
✅ Hidden legendary quests for power users
✅ ACME's signature delight and utility

"Turn bill-splitting into family bonding achievements!" 🎩
      `);
  }
}

export default ACMEQuestSystem;
export { Quest, QuestReward, QuestCategory, QuestDifficulty, UserQuestProgress, QuestEvent };

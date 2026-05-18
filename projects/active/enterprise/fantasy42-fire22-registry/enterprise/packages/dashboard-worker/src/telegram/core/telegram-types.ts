/**
 * Telegram Bot Shared Types
 * Consolidated interfaces and types for Telegram bot modules
 */

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot: boolean;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  invite_link?: string;
  permissions?: ChatPermissions;
}

export interface ChatPermissions {
  can_send_messages?: boolean;
  can_send_media_messages?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  entities?: MessageEntity[];
  reply_to_message?: TelegramMessage;
  edit_date?: number;
  author_signature?: string;
}

export interface MessageEntity {
  type:
    | 'mention'
    | 'hashtag'
    | 'cashtag'
    | 'bot_command'
    | 'url'
    | 'email'
    | 'phone_number'
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'spoiler'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'text_mention';
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
}

export interface TelegramBotConfig {
  token: string;
  webhookUrl?: string;
  pollingInterval?: number;
  allowedUsers?: string[];
  adminUsers?: string[];
  maxRetries?: number;
  timeout?: number;
  notificationSettings: {
    wagerUpdates: boolean;
    balanceChanges: boolean;
    systemAlerts: boolean;
    weeklyReports: boolean;
    vipNotifications: boolean;
    errorAlerts: boolean;
  };
  rateLimits: {
    messagesPerSecond: number;
    commandsPerMinute: number;
    broadcastsPerHour: number;
  };
}

export interface TelegramCommand {
  name: string;
  description: string;
  aliases?: string[];
  adminOnly?: boolean;
  requiresAuth?: boolean;
  cooldown?: number; // seconds
  usage?: string;
  examples?: string[];
}

export interface CommandContext {
  message: TelegramMessage;
  args: string[];
  user: TelegramUser;
  chat: TelegramChat;
  isAdmin: boolean;
  isAuthenticated: boolean;
  userProfile?: UserProfile;
}

export interface CommandResult {
  success: boolean;
  response?: string;
  error?: string;
  actions?: CommandAction[];
  metadata?: Record<string, any>;
}

export interface CommandAction {
  type:
    | 'reply'
    | 'edit'
    | 'delete'
    | 'forward'
    | 'send_photo'
    | 'send_document'
    | 'ban_user'
    | 'kick_user'
    | 'restrict_user';
  content?: string;
  targetChatId?: number;
  targetMessageId?: number;
  duration?: number; // for restrictions
  permissions?: ChatPermissions;
  fileUrl?: string;
  caption?: string;
}

export interface UserProfile {
  telegramId: number;
  username: string;
  customerId?: string;
  isVIP: boolean;
  vipTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  balance: number;
  totalWagers: number;
  winRate: number;
  lastActivity: Date;
  preferences: UserPreferences;
  permissions: UserPermissions;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  currency: string;
  notifications: {
    wagers: boolean;
    balance: boolean;
    promotions: boolean;
    results: boolean;
  };
  privacy: {
    showBalance: boolean;
    showStats: boolean;
    allowMentions: boolean;
  };
}

export interface UserPermissions {
  canAccessAdmin: boolean;
  canBroadcast: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageCasino: boolean;
  canManageSports: boolean;
  maxBetAmount: number;
  maxDailyBets: number;
}

export interface TelegramSession {
  userId: number;
  chatId: number;
  startedAt: Date;
  lastActivity: Date;
  messageCount: number;
  commandCount: number;
  errors: number;
  isActive: boolean;
}

export interface TelegramAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalCommands: number;
  popularCommands: Array<{ command: string; count: number }>;
  errorRate: number;
  averageResponseTime: number;
  uptime: number;
}

export interface NotificationPayload {
  type: 'wager_update' | 'balance_change' | 'system_alert' | 'promotion' | 'result';
  userId: number;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, any>;
  expiresAt?: Date;
}

export interface BroadcastMessage {
  id: string;
  content: string;
  targetUsers?: number[];
  targetGroups?: number[];
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sentCount: number;
  failedCount: number;
  createdBy: number;
  metadata?: Record<string, any>;
}

export interface CasinoGame {
  id: string;
  name: string;
  type: 'slots' | 'blackjack' | 'roulette' | 'baccarat' | 'poker' | 'dice' | 'other';
  minBet: number;
  maxBet: number;
  houseEdge: number;
  isActive: boolean;
  description: string;
  rules: string;
  imageUrl?: string;
}

export interface CasinoSession {
  id: string;
  userId: number;
  gameId: string;
  startTime: Date;
  endTime?: Date;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  netResult: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface CasinoStats {
  totalGames: number;
  totalPlayers: number;
  totalBets: number;
  totalWins: number;
  houseProfit: number;
  popularGames: Array<{ gameId: string; gameName: string; playerCount: number }>;
  topPlayers: Array<{ userId: number; username: string; totalBet: number }>;
}

export type TelegramBotEvent =
  | 'message'
  | 'callback_query'
  | 'inline_query'
  | 'chosen_inline_result'
  | 'shipping_query'
  | 'pre_checkout_query'
  | 'poll'
  | 'poll_answer'
  | 'my_chat_member'
  | 'chat_member'
  | 'chat_join_request';

export interface TelegramBotEventHandler {
  event: TelegramBotEvent;
  handler: (data: any) => Promise<void>;
  priority?: number;
}

export interface TelegramRateLimit {
  userId: number;
  action: string;
  count: number;
  resetTime: Date;
  window: number; // seconds
}

export interface TelegramError {
  code: string;
  message: string;
  userId?: number;
  chatId?: number;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
}

// Export types for TypeScript
export type TelegramCommandHandler = (context: CommandContext) => Promise<CommandResult>;
export type TelegramEventHandler = (data: any) => Promise<void>;
export type TelegramNotificationHandler = (payload: NotificationPayload) => Promise<void>;
export type TelegramBroadcastHandler = (broadcast: BroadcastMessage) => Promise<void>;

#!/usr/bin/env bun

export type Fantasy402RouteKey =
  | 'urgent-alerts'
  | 'troublesome-accounts'
  | 'daily-pattern-reports'
  | 'agent-heatmap'
  | 'player-tracking'
  | 'general-updates';

export interface Fantasy402SendOptions {
  chatId?: string;
  route?: Fantasy402RouteKey;
  threadId?: number;
}

const TOPIC_ENV_MAP: Record<Fantasy402RouteKey, string> = {
  'urgent-alerts': 'FANTASY402_TOPIC_URGENT_ALERTS',
  'troublesome-accounts': 'FANTASY402_TOPIC_TROUBLESOME_ACCOUNTS',
  'daily-pattern-reports': 'FANTASY402_TOPIC_DAILY_PATTERN_REPORTS',
  'agent-heatmap': 'FANTASY402_TOPIC_AGENT_HEATMAP',
  'player-tracking': 'FANTASY402_TOPIC_PLAYER_TRACKING',
  'general-updates': 'FANTASY402_TOPIC_GENERAL_UPDATES'
};

export function getFantasy402ChatId(): string {
  return process.env.FANTASY402_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID || '';
}

export function resolveFantasy402ThreadId(route?: Fantasy402RouteKey): number | undefined {
  if (!route) {
    return undefined;
  }

  const raw = process.env[TOPIC_ENV_MAP[route]];
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getFantasy402TopicEnvMap(): Record<Fantasy402RouteKey, string> {
  return { ...TOPIC_ENV_MAP };
}

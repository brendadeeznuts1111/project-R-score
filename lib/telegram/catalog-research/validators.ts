/**
 * Validation helpers for catalog enhancement proposals.
 */
import { FORUM_TOPIC_ICON_COLOR_MAX, type ForumTopicIconSuggestion } from './types.ts';

export function isValidForumTopicIconColor(color: number): boolean {
  return Number.isInteger(color) && color >= 0 && color <= FORUM_TOPIC_ICON_COLOR_MAX;
}

export function validateForumTopicIconSuggestion(icon: ForumTopicIconSuggestion): {
  ok: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  if (!isValidForumTopicIconColor(icon.iconColor)) {
    notes.push(`iconColor must be 0–${FORUM_TOPIC_ICON_COLOR_MAX}, got ${icon.iconColor}`);
  }
  if (!icon.emoji.trim()) notes.push('emoji must be non-empty for operator display');
  return { ok: notes.length === 0, notes };
}

/** Stable proposal id from parts (no crypto — deterministic). */
export function proposalId(parts: string[]): string {
  return parts
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9:/_-]+/g, '-')
    .slice(0, 120);
}

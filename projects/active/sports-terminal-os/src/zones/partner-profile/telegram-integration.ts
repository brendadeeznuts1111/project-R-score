/**
 * Partner Profile OS — Telegram Integration
 *
 * - Auto-create forum topics for partners
 * - dispatchBySignalType(signal, result) → route to appropriate topic
 * - getTopicMapping(partnerId, signalType) → topic config
 */

import { type SignalContext, type GateResult } from "./partner-profile-schema";
import { partnerProfileService } from "./partner-profile-service";

export interface TopicConfig {
  type: string;
  name: string;
  chatId?: string;
  status: "pending" | "created" | "error";
  error?: string;
}

/**
 * Auto-create Telegram groups/topics for a partner.
 *
 * Respects the partner's template telegram.groups configuration,
 * creating only groups with auto_create=true.
 */
export async function autoCreateTelegramGroups(
  partnerId: string
): Promise<TopicConfig[]> {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) throw new Error(`Partner '${partnerId}' not found`);

  const { groups, admin_bot_token_env } = gateway.profile.telegram;
  const botToken = process.env[admin_bot_token_env];
  if (!botToken) {
    console.warn(`[TELEGRAM] Bot token not configured (env: ${admin_bot_token_env})`);
  }

  const results: TopicConfig[] = [];

  for (const group of groups) {
    if (!group.auto_create) continue;

    const groupName = group.name.replace(/{partner_id}/g, partnerId);
    try {
      let chatId: string | undefined;

      if (botToken) {
        chatId = await createTelegramForumTopic(botToken, groupName);
      }

      results.push({
        type: group.type,
        name: groupName,
        chatId,
        status: chatId ? "created" : "pending",
      });

      // Persist mapping (best effort)
      persistTopicMapping(partnerId, group.type, chatId, groupName);
    } catch (error: any) {
      results.push({
        type: group.type,
        name: groupName,
        status: "error",
        error: error.message,
      });
      persistTopicError(partnerId, group.type, error.message);
    }
  }

  return results;
}

/**
 * Dispatch an alert to the appropriate Telegram topic(s) based on signal type.
 */
export async function dispatchBySignalType(
  partnerId: string,
  signal: SignalContext,
  result: GateResult
): Promise<void> {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return;

  const { groups, admin_bot_token_env } = gateway.profile.telegram;
  const botToken = process.env[admin_bot_token_env];
  if (!botToken) return;

  // Determine alert type from signal
  const alertType = result.action === "block" ? "compliance" : signal.type;

  // Check if we should alert
  if (!gateway.shouldAlert(alertType, result.adjustedStake ?? signal.suggestedStake)) {
    return;
  }

  // Get target groups
  const targetGroups = gateway.getAlertGroups(signal.type);
  if (targetGroups.length === 0) return;

  // Format payload
  const payload = formatAlertPayload(partnerId, signal, result);

  // Dispatch to each group
  for (const group of targetGroups) {
    try {
      await sendTelegramMessage(botToken, group.name, payload);
    } catch (err: any) {
      console.error(`[TELEGRAM] Dispatch failed to ${group.name}: ${err.message}`);
    }
  }
}

/**
 * Get the topic mapping for a partner and signal type.
 */
export function getTopicMapping(
  partnerId: string,
  signalType: string
): TopicConfig | undefined {
  const gateway = partnerProfileService.getGateway(partnerId);
  if (!gateway) return undefined;

  const group = gateway.profile.telegram.groups.find((g) => g.type === signalType);
  if (!group) return undefined;

  return {
    type: group.type,
    name: group.name.replace(/{partner_id}/g, partnerId),
    status: "pending",
  };
}

// ── Private ──

async function createTelegramForumTopic(
  botToken: string,
  name: string
): Promise<string | undefined> {
  // Placeholder for actual Telegram Bot API call
  // In production: POST https://api.telegram.org/bot{token}/createForumTopic
  console.log(`[TELEGRAM] Creating forum topic: ${name}`);
  return undefined; // Return chat_id/topic_id when created
}

async function sendTelegramMessage(
  botToken: string,
  chatIdOrName: string,
  payload: AlertPayload
): Promise<void> {
  // Placeholder for actual Telegram Bot API call
  console.log(`[TELEGRAM] Sending to ${chatIdOrName}: ${payload.message}`);
}

interface AlertPayload {
  type: string;
  partnerId: string;
  signalId: string;
  message: string;
  timestamp: number;
}

function formatAlertPayload(
  partnerId: string,
  signal: SignalContext,
  result: GateResult
): AlertPayload {
  const action = result.action.toUpperCase();
  const message =
    `[${action}] ${signal.type.toUpperCase()} on ${signal.bookId} | ` +
    `Stake: ${result.adjustedStake ?? signal.suggestedStake} | ` +
    `Sport: ${signal.sport} | Market: ${signal.market}` +
    (result.reason ? ` | Reason: ${result.reason}` : "");

  return {
    type: signal.type,
    partnerId,
    signalId: signal.signalId,
    message,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

function persistTopicMapping(
  partnerId: string,
  topicType: string,
  chatId: string | undefined,
  chatName: string
): void {
  // In production: INSERT INTO partner_telegram_topics
  console.log(
    `[TELEGRAM] Topic mapping: ${partnerId}/${topicType} → ${chatName} (${chatId ?? "pending"})`
  );
}

function persistTopicError(partnerId: string, topicType: string, error: string): void {
  console.error(`[TELEGRAM] Topic error: ${partnerId}/${topicType} → ${error}`);
}

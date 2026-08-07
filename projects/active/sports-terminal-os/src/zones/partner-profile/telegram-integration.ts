/**
 * Partner Profile OS — Telegram integration.
 *
 * The profile declares desired partner topics. This module owns the boundary
 * between that declaration and Telegram's Bot API:
 *   - configuration is parsed once from environment ingress;
 *   - topic provisioning and message delivery use an injectable transport;
 *   - topic mappings use an injectable store so production persistence can be
 *     supplied without coupling the partner kernel to SQLite;
 *   - every delivery returns a structured outcome.
 */

import {
  parseExternalPartnerId,
  parseTelegramChatId,
  type ExternalPartnerId,
  type TelegramChatId,
} from "../../../../../../lib/types/branded.ts";
import { h2Fetch } from "../../utils/h2-fetch";
import { SendMessageClient, escapeHtml } from "../../telegram/SendMessageClient";
import { type SignalContext, type GateResult, type ProfileTelegram } from "./partner-profile-schema";
import { partnerProfileService } from "./partner-profile-service";

export type TopicStatus = "pending" | "created" | "error";

export interface TopicConfig {
  partnerId: ExternalPartnerId;
  type: string;
  name: string;
  chatId?: TelegramChatId;
  threadId?: number; // brand-ok — Telegram Bot API numeric forum-topic identifier
  status: TopicStatus;
  error?: string;
}

export interface TelegramDispatchResult {
  partnerId: ExternalPartnerId;
  topicType: string;
  topicName: string;
  status: "sent" | "skipped" | "error";
  error?: string;
}

export interface PartnerTelegramGateway {
  profile: { telegram: ProfileTelegram };
  shouldAlert(type: string, stake: number): boolean;
  getAlertGroups(signalType: string): Array<{ type: string; name: string }>;
}

export interface PartnerTelegramTransport {
  createForumTopic(input: {
    botToken: string;
    chatId: TelegramChatId;
    name: string;
  }): Promise<{ threadId: number }>; // brand-ok — Telegram Bot API numeric forum-topic identifier
  sendMessage(input: {
    botToken: string;
    chatId: TelegramChatId;
    threadId: number; // brand-ok — Telegram Bot API numeric forum-topic identifier
    text: string;
  }): Promise<void>;
}

export interface PartnerTopicMappingStore {
  get(partnerId: ExternalPartnerId, topicType: string): TopicConfig | undefined;
  set(mapping: TopicConfig): void;
}

export interface PartnerTelegramIntegrationDependencies {
  getGateway(partnerId: ExternalPartnerId): PartnerTelegramGateway | undefined;
  readEnv(name: string): string | undefined;
  transport: PartnerTelegramTransport;
  mappings?: PartnerTopicMappingStore;
}

export interface PartnerTelegramIntegration {
  autoCreateTelegramGroups(partnerId: unknown): Promise<TopicConfig[]>;
  dispatchBySignalType(
    partnerId: unknown,
    signal: SignalContext,
    result: GateResult
  ): Promise<TelegramDispatchResult[]>;
  getTopicMapping(partnerId: unknown, signalType: string): TopicConfig | undefined;
}

function mappingKey(partnerId: ExternalPartnerId, topicType: string): string {
  return `${partnerId}\u0000${topicType}`;
}

export function createMemoryPartnerTopicMappingStore(): PartnerTopicMappingStore {
  const mappings = new Map<string, TopicConfig>();
  return {
    get(partnerId, topicType) {
      const mapping = mappings.get(mappingKey(partnerId, topicType));
      return mapping ? structuredClone(mapping) : undefined;
    },
    set(mapping) {
      mappings.set(mappingKey(mapping.partnerId, mapping.type), structuredClone(mapping));
    },
  };
}

function configuredValue(
  readEnv: PartnerTelegramIntegrationDependencies["readEnv"],
  name: string
): string | undefined {
  const value = readEnv(name)?.trim();
  return value ? value : undefined;
}

function configuredChatId(
  readEnv: PartnerTelegramIntegrationDependencies["readEnv"],
  name: string
): TelegramChatId | undefined {
  const value = configuredValue(readEnv, name);
  if (!value) return undefined;
  const chatId = parseTelegramChatId(value);
  const numeric = Number(chatId);
  if (!Number.isSafeInteger(numeric) || numeric === 0) {
    throw new TypeError(`${name} must contain a non-zero safe-integer Telegram chat ID`);
  }
  return chatId;
}

function configurationError(tokenEnv: string, chatEnv: string, token?: string, chatId?: TelegramChatId) {
  const missing = [!token ? tokenEnv : undefined, !chatId ? chatEnv : undefined].filter(Boolean);
  return missing.length > 0 ? `Missing Telegram configuration: ${missing.join(", ")}` : undefined;
}

function formatAlertPayload(
  partnerId: ExternalPartnerId,
  signal: SignalContext,
  result: GateResult
): string {
  const action = result.action.toUpperCase();
  return (
    `[${action}] ${signal.type.toUpperCase()} on ${signal.bookId} | ` +
    `Partner: ${partnerId} | ` +
    `Stake: ${result.adjustedStake ?? signal.suggestedStake} | ` +
    `Sport: ${signal.sport} | Market: ${signal.market}` +
    (result.reason ? ` | Reason: ${result.reason}` : "")
  );
}

export function createPartnerTelegramIntegration(
  dependencies: PartnerTelegramIntegrationDependencies
): PartnerTelegramIntegration {
  const mappings = dependencies.mappings ?? createMemoryPartnerTopicMappingStore();

  return {
    async autoCreateTelegramGroups(partnerIdInput) {
      const partnerId = parseExternalPartnerId(partnerIdInput);
      const gateway = dependencies.getGateway(partnerId);
      if (!gateway) throw new Error(`Partner '${partnerId}' not found`);

      const telegram = gateway.profile.telegram;
      if (!telegram.auto_create_groups) return [];

      const tokenEnv = telegram.admin_bot_token_env;
      const chatEnv = telegram.admin_chat_id_env;
      const botToken = configuredValue(dependencies.readEnv, tokenEnv);
      const chatId = configuredChatId(dependencies.readEnv, chatEnv);
      const configError = configurationError(tokenEnv, chatEnv, botToken, chatId);
      const results: TopicConfig[] = [];

      for (const group of telegram.groups) {
        if (!group.auto_create) continue;
        const name = group.name.replace(/{partner_id}/g, partnerId);
        const existing = mappings.get(partnerId, group.type);
        if (
          existing?.status === "created" &&
          existing.name === name &&
          existing.chatId === chatId &&
          existing.threadId
        ) {
          results.push(existing);
          continue;
        }
        if (configError || !botToken || !chatId) {
          const mapping: TopicConfig = {
            partnerId,
            type: group.type,
            name,
            status: "pending",
            error: configError,
          };
          mappings.set(mapping);
          results.push(mapping);
          continue;
        }

        try {
          const { threadId } = await dependencies.transport.createForumTopic({
            botToken,
            chatId,
            name,
          });
          const mapping: TopicConfig = {
            partnerId,
            type: group.type,
            name,
            chatId,
            threadId,
            status: "created",
          };
          mappings.set(mapping);
          results.push(mapping);
        } catch (error) {
          const mapping: TopicConfig = {
            partnerId,
            type: group.type,
            name,
            chatId,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          };
          mappings.set(mapping);
          results.push(mapping);
        }
      }
      return results;
    },

    async dispatchBySignalType(partnerIdInput, signal, result) {
      const partnerId = parseExternalPartnerId(partnerIdInput);
      const gateway = dependencies.getGateway(partnerId);
      if (!gateway) return [];

      const telegram = gateway.profile.telegram;
      const alertType = result.action === "block" ? "compliance" : signal.type;
      if (!gateway.shouldAlert(alertType, result.adjustedStake ?? signal.suggestedStake)) return [];

      const groups = gateway.getAlertGroups(alertType);
      if (groups.length === 0) return [];

      const botToken = configuredValue(dependencies.readEnv, telegram.admin_bot_token_env);
      const text = formatAlertPayload(partnerId, signal, result);
      const outcomes: TelegramDispatchResult[] = [];

      for (const group of groups) {
        const mapping = mappings.get(partnerId, group.type);
        if (!botToken || mapping?.status !== "created" || !mapping.chatId || !mapping.threadId) {
          outcomes.push({
            partnerId,
            topicType: group.type,
            topicName: group.name,
            status: "skipped",
            error: !botToken
              ? `Missing Telegram configuration: ${telegram.admin_bot_token_env}`
              : `Telegram topic mapping is not ready for ${group.type}`,
          });
          continue;
        }

        try {
          await dependencies.transport.sendMessage({
            botToken,
            chatId: mapping.chatId,
            threadId: mapping.threadId,
            text,
          });
          outcomes.push({
            partnerId,
            topicType: group.type,
            topicName: mapping.name,
            status: "sent",
          });
        } catch (error) {
          outcomes.push({
            partnerId,
            topicType: group.type,
            topicName: mapping.name,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return outcomes;
    },

    getTopicMapping(partnerIdInput, signalType) {
      const partnerId = parseExternalPartnerId(partnerIdInput);
      const existing = mappings.get(partnerId, signalType);
      if (existing) return existing;

      const gateway = dependencies.getGateway(partnerId);
      const group = gateway?.profile.telegram.groups.find(candidate => candidate.type === signalType);
      if (!group) return undefined;
      return {
        partnerId,
        type: group.type,
        name: group.name.replace(/{partner_id}/g, partnerId),
        status: "pending",
      };
    },
  };
}

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
  result?: { message_thread_id?: number };
};

const sendClients = new Map<string, SendMessageClient>();

function sendClient(botToken: string): SendMessageClient {
  let client = sendClients.get(botToken);
  if (!client) {
    client = new SendMessageClient(botToken);
    sendClients.set(botToken, client);
  }
  return client;
}

export const telegramBotApiTransport: PartnerTelegramTransport = {
  async createForumTopic({ botToken, chatId, name }) {
    const response = await h2Fetch(`https://api.telegram.org/bot${botToken}/createForumTopic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, name }),
    });
    const body = (await response.json()) as TelegramApiResponse;
    const threadId = body.result?.message_thread_id;
    if (!response.ok || body.ok !== true || !Number.isSafeInteger(threadId) || Number(threadId) <= 0) {
      throw new Error(body.description || `Telegram createForumTopic failed with HTTP ${response.status}`);
    }
    return { threadId: Number(threadId) };
  },

  async sendMessage({ botToken, chatId, threadId, text }) {
    const numericChatId = Number(chatId);
    const result = await sendClient(botToken).sendToTopic(
      numericChatId,
      threadId,
      escapeHtml(text),
      { parse_mode: "HTML" }
    );
    if (!result.success) throw new Error(result.error || "Telegram sendMessage failed");
  },
};

const defaultIntegration = createPartnerTelegramIntegration({
  getGateway: partnerId => partnerProfileService.getGateway(partnerId),
  readEnv: name => process.env[name],
  transport: telegramBotApiTransport,
});

/** Compatibility name: provisions configured partner forum topics in one supergroup. */
export const autoCreateTelegramGroups = defaultIntegration.autoCreateTelegramGroups;
export const dispatchBySignalType = defaultIntegration.dispatchBySignalType;
export const getTopicMapping = defaultIntegration.getTopicMapping;

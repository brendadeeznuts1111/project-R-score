/**
 * TopicManager — Telegram Hub
 *
 * Manages forum topic resolution, creation, and caching for bot workers.
 *
 * Provides:
 *   - getAgentTopic(agentLogin, purpose): Resolve topic with 60s TTL cache
 *   - getFallbackTopic(chatId): General topic or main chat (threadId=0)
 *   - ensureAllTopics(botId, purposes): Create missing forum topics
 *   - createTopic(): Call Telegram createForumTopic API, persist thread_id
 *   - Color-coded topic icons by purpose
 *   - Cache invalidation on mutations
 *
 * Thread ID 0 = main chat (not a topic).
 */

import { Database } from "bun:sqlite";
import { createLogger } from "@utils/logger";
import { h2Fetch } from "@utils/h2-fetch";

const logger = createLogger("TopicManager");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopicResolution {
  chatId: number;
  threadId: number;
  topicName: string;
  supergroupId: number;
}

// ---------------------------------------------------------------------------
// TTL Cache implementation
// ---------------------------------------------------------------------------

class TTLCache<V> {
  private store = new Map<string, { value: V; expires: number }>();

  constructor(private ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Topic color mapping by purpose
// ---------------------------------------------------------------------------

const TOPIC_COLORS: Record<string, number> = {
  general: 16766590, // Yellow
  approvals: 16749490, // Orange
  riskAlerts: 16711718, // Red
  betAlerts: 9367192, // Green
  deposits: 7322096, // Blue
  withdrawals: 16478047, // Purple
  settlement: 13338331, // Pink
  reports: 16766590, // Yellow
  admin: 16711718, // Red
};

const ALL_PURPOSES = Object.keys(TOPIC_COLORS);

// ---------------------------------------------------------------------------
// TopicManager class
// ---------------------------------------------------------------------------

export class TopicManager {
  private cache: TTLCache<TopicResolution>;

  constructor(
    private db: Database,
    cacheTtlMs: number = 60000 // 60s default
  ) {
    this.cache = new TTLCache<TopicResolution>(cacheTtlMs);
  }

  /**
   * Resolve an agent's topic for a given purpose.
   * 3-tier fallback:
   *   1. Agent-specific purpose topic (from agent_supergroup_topics)
   *   2. Agent's general topic (purpose='general')
   *   3. Returns null (caller falls back to main chat)
   *
   * Checks cache first, then database.
   */
  getAgentTopic(agentLogin: string, purpose: string): TopicResolution | null {
    const cacheKey = `${agentLogin}:${purpose}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Tier 1: Exact match for agent + purpose
    let row = this.db
      .query(
        `
        SELECT
          s.telegram_chat_id AS chatId,
          t.topic_thread_id AS threadId,
          t.topic_name AS topicName,
          s.id AS supergroupId
        FROM agent_supergroup_topics t
        JOIN agent_supergroups s ON t.supergroup_id = s.id
        WHERE s.owner_agent_login = ?
          AND t.purpose = ?
          AND s.is_active = 1
        LIMIT 1
      `
      )
      .get(agentLogin, purpose) as {
      chatId: number;
      threadId: number;
      topicName: string;
      supergroupId: number;
    } | null;

    // Tier 2: Fallback to general topic for this agent
    if (!row && purpose !== "general") {
      row = this.db
        .query(
          `
          SELECT
            s.telegram_chat_id AS chatId,
            t.topic_thread_id AS threadId,
            t.topic_name AS topicName,
            s.id AS supergroupId
          FROM agent_supergroup_topics t
          JOIN agent_supergroups s ON t.supergroup_id = s.id
          WHERE s.owner_agent_login = ?
            AND t.purpose = 'general'
            AND s.is_active = 1
          LIMIT 1
        `
        )
        .get(agentLogin) as {
        chatId: number;
        threadId: number;
        topicName: string;
        supergroupId: number;
      } | null;
    }

    if (row) {
      this.cache.set(cacheKey, row);
      return row;
    }

    return null;
  }

  /**
   * Fallback: get the general topic for a supergroup, or main chat (threadId=0).
   * Uses cache for performance.
   */
  getFallbackTopic(chatId: number): TopicResolution | null {
    const cacheKey = `fallback:${chatId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Try to find a 'general' topic for this supergroup
    const row = this.db
      .query(
        `
        SELECT
          s.telegram_chat_id AS chatId,
          t.topic_thread_id AS threadId,
          t.topic_name AS topicName,
          s.id AS supergroupId
        FROM agent_supergroup_topics t
        JOIN agent_supergroups s ON t.supergroup_id = s.id
        WHERE s.telegram_chat_id = ?
          AND t.purpose = 'general'
          AND s.is_active = 1
        LIMIT 1
      `
      )
      .get(chatId) as {
      chatId: number;
      threadId: number;
      topicName: string;
      supergroupId: number;
    } | null;

    // Thread ID 0 = main chat (not a topic)
    const result = row
      ? row
      : { chatId, threadId: 0, topicName: "main", supergroupId: 0 };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Ensure all expected topics exist for all supergroups assigned to a bot.
   * Creates missing topics via Telegram API.
   * Clears cache after mutations.
   */
  async ensureAllTopics(
    botId: string,
    purposes: string[] = ALL_PURPOSES
  ): Promise<void> {
    // Get all active supergroups for this bot
    const supergroups = this.db
      .query(
        `
        SELECT id, telegram_chat_id, owner_agent_login
        FROM agent_supergroups
        WHERE bot_id = ? AND is_active = 1
      `
      )
      .all(botId) as Array<{
      id: number;
      telegram_chat_id: number;
      owner_agent_login: string;
    }>;

    logger.info(
      `Ensuring topics for ${supergroups.length} supergroups (bot: ${botId})`
    );

    for (const sg of supergroups) {
      for (const purpose of purposes) {
        const exists = this.db
          .query(
            `
            SELECT 1 FROM agent_supergroup_topics
            WHERE supergroup_id = ? AND purpose = ?
          `
          )
          .get(sg.id, purpose);

        if (!exists) {
          await this.createTopic(
            sg.telegram_chat_id,
            sg.owner_agent_login,
            purpose,
            sg.id
          );
        }
      }
    }

    // Invalidate cache after creation pass
    this.cache.clear();
  }

  /**
   * Create a Telegram forum topic via API and persist to DB.
   * Uses the bot token from environment.
   */
  private async createTopic(
    chatId: number,
    agentLogin: string,
    purpose: string,
    supergroupId: number
  ): Promise<void> {
    const topicName =
      purpose === "general" ? agentLogin : `${agentLogin} - ${purpose}`;

    try {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        logger.error("BOT_TOKEN not set, cannot create topic");
        return;
      }

      const apiUrl = `https://api.telegram.org/bot${botToken}`;
      const response = await h2Fetch(`${apiUrl}/createForumTopic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          name: topicName,
          icon_color: this.getTopicColor(purpose),
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        logger.error(
          `Failed to create topic "${topicName}": ${data.description}`
        );
        return;
      }

      const threadId = data.result.message_thread_id;

      // Persist to DB
      this.db
        .query(
          `
          INSERT INTO agent_supergroup_topics
            (supergroup_id, topic_thread_id, topic_name, purpose, created_by)
          VALUES (?, ?, ?, ?, ?)
        `
        )
        .run(supergroupId, threadId, topicName, purpose, "bot_worker");

      logger.info(
        `Created topic "${topicName}" (thread ${threadId}) for ${agentLogin}`
      );
    } catch (err: any) {
      logger.error(
        `Error creating topic "${topicName}": ${err.message}`
      );
    }
  }

  /**
   * Get the color-coded icon color for a topic purpose.
   */
  private getTopicColor(purpose: string): number {
    return TOPIC_COLORS[purpose] || TOPIC_COLORS.general;
  }

  /**
   * Invalidate cache entries for an agent (call after topic mutations via API).
   */
  invalidateAgent(agentLogin: string): void {
    for (const purpose of ALL_PURPOSES) {
      this.cache.delete(`${agentLogin}:${purpose}`);
    }
    this.cache.delete(`fallback:${agentLogin}`);
    logger.debug(`Cache invalidated for agent: ${agentLogin}`);
  }

  /**
   * Invalidate all cache entries.
   */
  invalidateAll(): void {
    this.cache.clear();
    logger.debug("All topic cache invalidated");
  }
}

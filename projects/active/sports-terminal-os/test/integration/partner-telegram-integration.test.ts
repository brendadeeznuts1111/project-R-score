import { describe, expect, test } from "bun:test";
import {
  ProfileTelegramSchema,
  type GateResult,
  type SignalContext,
} from "../../src/zones/partner-profile/partner-profile-schema";
import {
  createMemoryPartnerTopicMappingStore,
  createPartnerTelegramIntegration,
  type PartnerTelegramGateway,
  type PartnerTelegramTransport,
} from "../../src/zones/partner-profile/telegram-integration";

const PARTNER = "partner-42";

function telegramProfile(overrides: Record<string, unknown> = {}) {
  return ProfileTelegramSchema.parse({
    auto_create_groups: true,
    groups: [
      { type: "steam", name: "{partner_id}-steam", auto_create: true },
      { type: "signals", name: "{partner_id}-signals", auto_create: true },
    ],
    alert_stake_minimum: 100,
    alert_types: ["steam", "compliance"],
    admin_bot_token_env: "PARTNER_TELEGRAM_TOKEN",
    admin_chat_id_env: "PARTNER_TELEGRAM_CHAT_ID",
    ...overrides,
  });
}

function gateway(
  telegram = telegramProfile(),
  observedAlertTypes: string[] = []
): PartnerTelegramGateway {
  return {
    profile: { telegram },
    shouldAlert(type, stake) {
      observedAlertTypes.push(type);
      return telegram.alert_types.includes(type) && stake >= telegram.alert_stake_minimum;
    },
    getAlertGroups(type) {
      const exact = telegram.groups.find(group => group.type === type);
      const signals = telegram.groups.find(group => group.type === "signals");
      return [exact, signals]
        .filter((group): group is NonNullable<typeof group> => Boolean(group))
        .filter((group, index, groups) => groups.findIndex(value => value.type === group.type) === index)
        .map(group => ({
          type: group.type,
          name: group.name.replace(/{partner_id}/g, PARTNER),
        }));
    },
  };
}

function signal(): SignalContext {
  return {
    signalId: "signal-1",
    partnerId: PARTNER,
    bookId: "book-1",
    tier: "T1",
    type: "steam",
    suggestedStake: 250,
    eventId: "event-1",
    market: "moneyline",
    sport: "basketball",
    confidence: 0.9,
    urgencyMs: 5_000,
  };
}

function gateResult(action: GateResult["action"] = "allow"): GateResult {
  return {
    allowed: action !== "block",
    action,
    ...(action === "block" ? { reason: "Compliance gate" } : {}),
    metadata: {
      originalStake: 250,
      maxExposure: 1_000,
      maxDaily: 5_000,
      remainingDaily: 4_750,
      tier: "T1",
      template: "test",
      bookAllowed: true,
      typeAllowed: true,
      kycPass: true,
      balancePass: true,
      opsecPass: action !== "block",
    },
  };
}

function transport(options: { failTopic?: string; failSendTopic?: number } = {}) {
  const created: Array<{ name: string; chat: string }> = [];
  const sent: Array<{ thread: number; text: string }> = [];
  let nextThread = 100;
  const port: PartnerTelegramTransport = {
    async createForumTopic(input) {
      if (input.name === options.failTopic) throw new Error("topic rejected");
      created.push({ name: input.name, chat: input.chatId });
      nextThread += 1;
      return { threadId: nextThread };
    },
    async sendMessage(input) {
      if (input.threadId === options.failSendTopic) throw new Error("delivery rejected");
      sent.push({ thread: input.threadId, text: input.text });
    },
  };
  return { port, created, sent };
}

describe("partner Telegram integration", () => {
  test("honors the profile-level provisioning switch", async () => {
    const telegram = telegramProfile({ auto_create_groups: false });
    const fakeTransport = transport();
    const integration = createPartnerTelegramIntegration({
      getGateway: () => gateway(telegram),
      readEnv: () => undefined,
      transport: fakeTransport.port,
    });

    expect(await integration.autoCreateTelegramGroups(PARTNER)).toEqual([]);
    expect(fakeTransport.created).toEqual([]);
  });

  test("reports missing configuration without attempting Telegram I/O", async () => {
    const fakeTransport = transport();
    const integration = createPartnerTelegramIntegration({
      getGateway: () => gateway(),
      readEnv: () => undefined,
      transport: fakeTransport.port,
    });

    const outcomes = await integration.autoCreateTelegramGroups(PARTNER);
    expect(outcomes).toHaveLength(2);
    expect(outcomes.every(outcome => outcome.status === "pending")).toBe(true);
    expect(outcomes[0]?.error).toContain("PARTNER_TELEGRAM_TOKEN");
    expect(outcomes[0]?.error).toContain("PARTNER_TELEGRAM_CHAT_ID");
    expect(fakeTransport.created).toEqual([]);
  });

  test("provisions topics, stores their mappings, and dispatches to each target", async () => {
    const fakeTransport = transport();
    const mappings = createMemoryPartnerTopicMappingStore();
    const observedAlertTypes: string[] = [];
    const integration = createPartnerTelegramIntegration({
      getGateway: () => gateway(telegramProfile(), observedAlertTypes),
      readEnv: name =>
        name === "PARTNER_TELEGRAM_TOKEN" ? "secret-token" : "-1001234567890",
      transport: fakeTransport.port,
      mappings,
    });

    const provisioned = await integration.autoCreateTelegramGroups(PARTNER);
    expect(provisioned.map(topic => [topic.type, topic.status, topic.threadId])).toEqual([
      ["steam", "created", 101],
      ["signals", "created", 102],
    ]);
    expect(fakeTransport.created).toEqual([
      { name: "partner-42-steam", chat: "-1001234567890" },
      { name: "partner-42-signals", chat: "-1001234567890" },
    ]);
    expect(integration.getTopicMapping(PARTNER, "steam")?.threadId).toBe(101);

    const reprovisioned = await integration.autoCreateTelegramGroups(PARTNER);
    expect(reprovisioned.map(topic => topic.threadId)).toEqual([101, 102]);
    expect(fakeTransport.created).toHaveLength(2);

    const delivered = await integration.dispatchBySignalType(PARTNER, signal(), gateResult());
    expect(observedAlertTypes).toEqual(["steam"]);
    expect(delivered.map(outcome => outcome.status)).toEqual(["sent", "sent"]);
    expect(fakeTransport.sent.map(message => message.thread)).toEqual([101, 102]);
    expect(fakeTransport.sent[0]?.text).toContain("Partner: partner-42");
  });

  test("routes blocked signals as compliance and preserves partial delivery failure", async () => {
    const fakeTransport = transport({ failSendTopic: 102 });
    const observedAlertTypes: string[] = [];
    const integration = createPartnerTelegramIntegration({
      getGateway: () => gateway(telegramProfile(), observedAlertTypes),
      readEnv: name =>
        name === "PARTNER_TELEGRAM_TOKEN" ? "secret-token" : "-1001234567890",
      transport: fakeTransport.port,
    });

    await integration.autoCreateTelegramGroups(PARTNER);
    const outcomes = await integration.dispatchBySignalType(PARTNER, signal(), gateResult("block"));

    expect(observedAlertTypes).toEqual(["compliance"]);
    expect(outcomes).toEqual([
      {
        partnerId: PARTNER,
        topicType: "signals",
        topicName: "partner-42-signals",
        status: "error",
        error: "delivery rejected",
      },
    ]);
  });
});

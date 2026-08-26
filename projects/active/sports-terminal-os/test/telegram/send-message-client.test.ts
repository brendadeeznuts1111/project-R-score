import { describe, expect, test } from "bun:test";
import { SendMessageClient } from "../../src/telegram/SendMessageClient";

function telegramResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SendMessageClient delivery contract", () => {
  test("does not replay an unsafe POST after an ambiguous network failure", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const client = new SendMessageClient("test-token", {
      maxRetries: 2,
      fetch: async () => {
        calls += 1;
        throw new Error("ambiguous network failure");
      },
      sleep: async milliseconds => {
        sleeps.push(milliseconds);
      },
    });

    expect(await client.sendMessage(-100123, "hello")).toEqual({
      success: false,
      error: "Network error without replay: ambiguous network failure",
    });
    expect(calls).toBe(1);
    expect(sleeps).toEqual([]);
  });

  test("retries only an explicit Telegram rate-limit rejection and then deduplicates", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const client = new SendMessageClient("test-token", {
      maxRetries: 2,
      fetch: async () => {
        calls += 1;
        return calls === 1
          ? telegramResponse({ ok: false, error_code: 429, parameters: { retry_after: 1 } }, 429)
          : telegramResponse({ ok: true, result: { message_id: 41 } });
      },
      sleep: async milliseconds => {
        sleeps.push(milliseconds);
      },
    });

    expect(await client.sendMessage(-100123, "confirmed message")).toEqual({
      success: true,
      messageId: 41,
    });
    expect(calls).toBe(2);
    expect(sleeps).toEqual([1000]);
    expect(await client.sendMessage(-100123, "confirmed message")).toEqual({ success: true });
    expect(calls).toBe(2);
  });

  test("does not poison deduplication after a rejected Telegram request", async () => {
    let calls = 0;
    const client = new SendMessageClient("test-token", {
      maxRetries: 1,
      fetch: async () => {
        calls += 1;
        return calls === 1
          ? telegramResponse({ ok: false, error_code: 400, description: "chat not found" })
          : telegramResponse({ ok: true, result: { message_id: 42 } });
      },
      sleep: async () => {},
    });

    expect(await client.sendMessage(-100456, "retryable message")).toEqual({
      success: false,
      error: "chat not found",
    });
    expect(await client.sendMessage(-100456, "retryable message")).toEqual({
      success: true,
      messageId: 42,
    });
    expect(calls).toBe(2);
  });
});

#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// Prometheus AlertManager webhook receiver → Telegram
// Listens on :9094 and forwards alerts to Telegram ops chat
import { serve } from 'bun';

const telegramToken = Bun.env.TELEGRAM_BOT_TOKEN;
const opsChatId = Bun.env.TELEGRAM_OPS_CHAT_ID;
const telegramApiBaseUrl = Bun.env.TELEGRAM_API_BASE_URL ?? 'https://api.telegram.org';
const port = Number(Bun.env.ALERT_WEBHOOK_PORT ?? 9094);

if (!telegramToken) throw new Error('TELEGRAM_BOT_TOKEN is required');
if (!opsChatId) throw new Error('TELEGRAM_OPS_CHAT_ID is required');
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('ALERT_WEBHOOK_PORT must be a valid TCP port');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

async function sendTelegram(message: string) {
  const response = await fetch(`${telegramApiBaseUrl}/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: opsChatId,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with HTTP ${response.status}`);
  }
}

serve({
  port,
  async fetch(req) {
    if (req.method !== 'POST') return new Response('OK');
    try {
      const body = (await req.json()) as unknown;
      const alerts = isRecord(body) && Array.isArray(body.alerts) ? body.alerts : [];
      for (const alertValue of alerts) {
        if (!isRecord(alertValue)) continue;
        const labels = isRecord(alertValue.labels) ? alertValue.labels : {};
        const annotations = isRecord(alertValue.annotations) ? alertValue.annotations : {};
        const status = alertValue.status === 'firing' ? '🚨' : '✅';
        const name = readText(labels, 'alertname', 'Unknown');
        const severity = readText(labels, 'severity', 'info');
        const summary = readText(annotations, 'summary');
        const instance = readText(labels, 'instance');
        await sendTelegram(`${status} *${name}* [${severity}]\n${summary}\nInstance: ${instance}`);
      }
    } catch (e) {
      console.error('Alert handler error:', e);
    }
    return new Response('OK');
  },
});

console.error(`[alert-webhook] Listening on :${port} — forwarding alerts to Telegram`);

#!/usr/bin/env bun
// Prometheus AlertManager webhook receiver → Telegram
// Listens on :9094 and forwards alerts to Telegram ops chat
import { serve } from "bun";

const TELEGRAM_TOKEN = "8972341795:AAGTTI7cdgDVfqlM81Eddw_jmhP996uiA70";
const OPS_CHAT_ID = "-1003937534779";

async function sendTelegram(message: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: OPS_CHAT_ID, text: message, parse_mode: "Markdown", disable_web_page_preview: true }),
  });
}

serve({
  port: 9094,
  async fetch(req) {
    if (req.method !== "POST") return new Response("OK");
    try {
      const body = await req.json() as any;
      for (const alert of body.alerts || []) {
        const status = alert.status === "firing" ? "🚨" : "✅";
        const name = alert.labels?.alertname || "Unknown";
        const severity = alert.labels?.severity || "info";
        const summary = alert.annotations?.summary || "";
        const instance = alert.labels?.instance || "";
        await sendTelegram(`${status} *${name}* [${severity}]\n${summary}\nInstance: ${instance}`);
      }
    } catch (e) {
      console.error("Alert handler error:", e);
    }
    return new Response("OK");
  },
});

console.error("[alert-webhook] Listening on :9094 — forwarding alerts to Telegram");

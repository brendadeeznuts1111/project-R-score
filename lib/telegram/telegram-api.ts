// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Telegram Bot API helpers for factory ops webhook.
 */

export async function telegramApiCall(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; result?: unknown }> {
  const res = await fetch(`https://api.telegram.org/bot${token}/` + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; result?: unknown };
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string, // brand-ok
  text: string
): Promise<void> {
  await telegramApiCall(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export type BotCommandDef = { command: string; description: string };

export const FACTORY_BOT_COMMANDS: BotCommandDef[] = [
  { command: 'start', description: 'Welcome / link portal account' },
  { command: 'link', description: 'How to link Telegram to portal' },
  { command: 'help', description: 'List commands' },
  { command: 'status', description: 'Ops status or registry health' },
  { command: 'accounts', description: 'Sportsbook accounts' },
  { command: 'plays', description: 'Pending plays' },
  { command: 'tree', description: 'Downstream network' },
  { command: 'register', description: 'Register as sub-agent' },
  { command: 'registry', description: 'Factory registry package count' },
  { command: 'deploy', description: 'Trigger deploy (admin)' },
];

export async function setBotCommands(token: string, commands: BotCommandDef[]): Promise<boolean> {
  const r = await telegramApiCall(token, 'setMyCommands', {
    commands: commands.map(c => ({ command: c.command, description: c.description })),
  });
  return r.ok;
}

export async function getBotMe(token: string): Promise<{ username?: string } | null> {
  const r = await telegramApiCall(token, 'getMe', {});
  if (!r.ok || !r.result || typeof r.result !== 'object') return null;
  const u = r.result as { username?: string };
  return { username: u.username };
}

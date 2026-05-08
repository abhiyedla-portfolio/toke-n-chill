/**
 * alerts.ts
 * Send notifications to Telegram and/or Discord.
 *
 * Set env vars:
 *   TELEGRAM_BOT_TOKEN  — from @BotFather
 *   TELEGRAM_CHAT_ID    — your personal or group chat ID
 *   DISCORD_WEBHOOK_URL — webhook URL from a Discord channel's settings
 *
 * If both are set, both channels receive the alert.
 * If neither is set, alerts are only logged to D1.
 */

export type AlertChannel = 'telegram' | 'discord' | 'both' | 'none';

export interface AlertResult {
  channel: AlertChannel;
  ok: boolean;
}

// ── Telegram ─────────────────────────────────────────────────

async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Alerts] Telegram error ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Alerts] Telegram fetch failed', err);
    return false;
  }
}

// ── Discord ───────────────────────────────────────────────────

async function sendDiscord(message: string): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  // Convert Telegram HTML to plain text for Discord
  const plain = message
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(/<[^>]+>/g, '');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: plain }),
    });

    if (!res.ok) {
      console.error(`[Alerts] Discord error ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Alerts] Discord fetch failed', err);
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Send an alert to all configured channels.
 * Returns which channel was used and whether it succeeded.
 */
export async function sendAlert(message: string): Promise<AlertResult> {
  const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const hasDiscord = !!process.env.DISCORD_WEBHOOK_URL;

  if (!hasTelegram && !hasDiscord) {
    console.log(`[Alerts] No channels configured. Message:\n${message}`);
    return { channel: 'none', ok: false };
  }

  const results = await Promise.all([
    hasTelegram ? sendTelegram(message) : Promise.resolve(null),
    hasDiscord ? sendDiscord(message) : Promise.resolve(null),
  ]);

  const tOk = results[0];
  const dOk = results[1];

  const channel: AlertChannel =
    tOk !== null && dOk !== null ? 'both' :
    tOk !== null ? 'telegram' :
    'discord';

  const ok = (tOk === true) || (dOk === true);

  return { channel, ok };
}

// ── Message formatters ────────────────────────────────────────

const STORE_LABELS: Record<string, string> = {
  toke: 'Toke-N-Chill',
  dizzy: 'Dizzy Dose',
};

function storeLabel(storeId: string): string {
  return STORE_LABELS[storeId] ?? storeId.toUpperCase();
}

function nowCst(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}

export function fmtLateOpen(storeId: string, expectedTime: string, minutesLate: number): string {
  return (
    `🔴 <b>Store not open yet</b>\n` +
    `🏪 <b>Store:</b> ${storeLabel(storeId)}\n` +
    `⏰ <b>Should have opened at:</b> ${expectedTime}\n` +
    `⌛ <b>${minutesLate} min late</b> — no orders detected yet\n` +
    `📅 ${nowCst()}`
  );
}

export function fmtNotClosed(storeId: string, expectedTime: string, minutesOverdue: number): string {
  return (
    `🟡 <b>Store may not be closed</b>\n` +
    `🏪 <b>Store:</b> ${storeLabel(storeId)}\n` +
    `⏰ <b>Should have closed at:</b> ${expectedTime}\n` +
    `⌛ <b>${minutesOverdue} min overdue</b> — last order was recently\n` +
    `📅 ${nowCst()}`
  );
}

export function fmtEmployeeLate(
  storeId: string,
  employeeName: string,
  minutesLate: number,
): string {
  return (
    `🟠 <b>Employee late to clock in</b>\n` +
    `🏪 <b>Store:</b> ${storeLabel(storeId)}\n` +
    `👤 <b>Employee:</b> ${employeeName}\n` +
    `⌛ <b>${minutesLate} min late</b>\n` +
    `📅 ${nowCst()}`
  );
}

export function fmtRefundAlert(
  storeId: string,
  amount: number,
  employeeName: string | null,
  orderId: string,
): string {
  const amtStr = `$${(amount / 100).toFixed(2)}`;
  const emp = employeeName ? `👤 <b>Employee:</b> ${employeeName}\n` : '';
  return (
    `🚨 <b>Large refund / void detected</b>\n` +
    `🏪 <b>Store:</b> ${storeLabel(storeId)}\n` +
    `💸 <b>Amount:</b> ${amtStr}\n` +
    emp +
    `🔑 <b>Order:</b> <code>${orderId}</code>\n` +
    `📅 ${nowCst()}`
  );
}

export function fmtStoreOpened(storeId: string, minutesLate: number): string {
  if (minutesLate <= 0) {
    return (
      `✅ <b>Store opened on time</b>\n` +
      `🏪 ${storeLabel(storeId)}\n` +
      `📅 ${nowCst()}`
    );
  }
  return (
    `⚠️ <b>Store opened late</b>\n` +
    `🏪 <b>Store:</b> ${storeLabel(storeId)}\n` +
    `⌛ <b>${minutesLate} min late</b>\n` +
    `📅 ${nowCst()}`
  );
}

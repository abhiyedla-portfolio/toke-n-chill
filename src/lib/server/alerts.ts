/**
 * alerts.ts
 * Send notifications via WhatsApp (Twilio), Telegram, or Discord.
 *
 * ── Primary: WhatsApp via Twilio ─────────────────────────────
 * Required env vars:
 *   TWILIO_ACCOUNT_SID      — from console.twilio.com
 *   TWILIO_AUTH_TOKEN       — from console.twilio.com
 *   TWILIO_WHATSAPP_FROM    — your Twilio WhatsApp sender
 *                             Sandbox:    whatsapp:+14155238886
 *                             Production: whatsapp:+1XXXXXXXXXX (your approved number)
 *   TWILIO_WHATSAPP_TO      — your WhatsApp number (e.g. whatsapp:+12105551234)
 *                             Can be comma-separated for multiple recipients:
 *                             whatsapp:+12105551234,whatsapp:+15125559876
 *
 * ── Optional fallbacks ────────────────────────────────────────
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 *   DISCORD_WEBHOOK_URL
 *
 * Any combination of channels can be active at once.
 * All configured channels receive every alert simultaneously.
 */

export type AlertChannel = 'whatsapp' | 'telegram' | 'discord' | 'multi' | 'none';

export interface AlertResult {
  channel: AlertChannel;
  ok: boolean;
}

// ── Shared: strip HTML tags for plain-text channels ───────────

function toPlainText(html: string): string {
  return html
    .replace(/<b>([\s\S]*?)<\/b>/g, '$1')
    .replace(/<i>([\s\S]*?)<\/i>/g, '$1')
    .replace(/<code>([\s\S]*?)<\/code>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// ── WhatsApp via Baileys service ──────────────────────────────
// The Baileys service is a separate Node.js process that maintains a
// persistent WhatsApp session and forwards messages to a group.
// Set WHATSAPP_SERVICE_URL + WHATSAPP_SERVICE_SECRET in your env.

async function sendWhatsApp(message: string): Promise<boolean> {
  const serviceUrl    = process.env.WHATSAPP_SERVICE_URL;
  const serviceSecret = process.env.WHATSAPP_SERVICE_SECRET;

  if (!serviceUrl || !serviceSecret) return false;

  try {
    const res = await fetch(`${serviceUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: serviceSecret, message: toPlainText(message) }),
    });

    if (res.ok) {
      console.log('[Alerts] WhatsApp group message sent via Baileys');
      return true;
    }

    const err = await res.text();
    console.error(`[Alerts] Baileys service error ${res.status}: ${err}`);
    return false;
  } catch (err) {
    console.error('[Alerts] Baileys service unreachable:', err);
    return false;
  }
}

// ── Telegram ─────────────────────────────────────────────────

async function sendTelegram(message: string): Promise<boolean> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
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
      console.error(`[Alerts] Telegram error ${res.status}: ${await res.text()}`);
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

  const plain = toPlainText(message)
    .replace(/\*\*(.*?)\*\*/g, '**$1**'); // keep bold for Discord markdown

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
 * Send an alert to all configured channels simultaneously.
 * WhatsApp is primary; Telegram and Discord are optional additions.
 */
export async function sendAlert(message: string): Promise<AlertResult> {
  const hasWhatsApp = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM &&
    process.env.TWILIO_WHATSAPP_TO
  );
  const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const hasDiscord  = !!process.env.DISCORD_WEBHOOK_URL;

  const channelCount = [hasWhatsApp, hasTelegram, hasDiscord].filter(Boolean).length;

  if (channelCount === 0) {
    console.log(`[Alerts] No channels configured. Message:\n${toPlainText(message)}`);
    return { channel: 'none', ok: false };
  }

  const [waOk, tOk, dOk] = await Promise.all([
    hasWhatsApp ? sendWhatsApp(message) : Promise.resolve(null),
    hasTelegram ? sendTelegram(message) : Promise.resolve(null),
    hasDiscord  ? sendDiscord(message)  : Promise.resolve(null),
  ]);

  const ok = (waOk === true) || (tOk === true) || (dOk === true);

  // Determine reported channel name
  const activeChannels = [
    waOk === true ? 'whatsapp' : null,
    tOk  === true ? 'telegram' : null,
    dOk  === true ? 'discord'  : null,
  ].filter(Boolean);

  const channel: AlertChannel =
    activeChannels.length > 1 ? 'multi' :
    activeChannels[0] === 'whatsapp' ? 'whatsapp' :
    activeChannels[0] === 'telegram' ? 'telegram' :
    activeChannels[0] === 'discord'  ? 'discord'  :
    'none';

  return { channel, ok };
}

// ── Message formatters ────────────────────────────────────────
// All messages use plain text + emoji (works on WhatsApp, Telegram, Discord).
// HTML tags (<b>, <code>) are stripped for WhatsApp/Discord by toPlainText().

const STORE_LABELS: Record<string, string> = {
  toke:  'Toke-N-Chill',
  dizzy: 'Dizzy Dose',
};

function storeLabel(storeId: string): string {
  return STORE_LABELS[storeId] ?? storeId.toUpperCase();
}

function nowCst(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    hour12:  true,
  }).format(new Date());
}

// ── Store open/close (clock-in based) ────────────────────────

/** Converts 'HH:MM' 24h schedule time to '10:00 AM' display format. */
function formatTime12h(timeCst: string): string {
  const [hStr, mStr] = timeCst.split(':');
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${mStr} ${period}`;
}

/**
 * Escalating "store not open" alert.
 * alertNum 1 = first alert, 2+ = follow-up escalations.
 */
export function fmtStoreNotOpen(
  storeId: string,
  openTimeCst: string,
  minutesSinceOpen: number,
  alertNum: number,
): string {
  const headline = alertNum === 1 ? '🔴 Store not open' : '🔴 Store still not open';
  return [
    headline,
    `🏪 ${storeLabel(storeId)}`,
    `⏰ Should have opened at: ${formatTime12h(openTimeCst)} CST`,
    `⌛ ${minutesSinceOpen} min since open time — nobody clocked in`,
    `📅 ${nowCst()}`,
  ].join('\n');
}

/**
 * Fires when the last employee clocked out more than 15 min before scheduled close.
 */
export function fmtEarlyClose(
  storeId: string,
  closeTimeCst: string,
  minutesEarly: number,
): string {
  return [
    `🟡 Store may be closing early`,
    `🏪 ${storeLabel(storeId)}`,
    `⏰ Scheduled close: ${formatTime12h(closeTimeCst)} CST`,
    `⌛ Nobody clocked in — ${minutesEarly} min before close`,
    `📅 ${nowCst()}`,
  ].join('\n');
}

/**
 * Fires when at least one employee is still clocked in 15 min after scheduled close.
 */
export function fmtStillOpen(
  storeId: string,
  closeTimeCst: string,
  minutesLate: number,
): string {
  return [
    `🌙 Employee still at store`,
    `🏪 ${storeLabel(storeId)}`,
    `⏰ Should have closed at: ${formatTime12h(closeTimeCst)} CST`,
    `⌛ ${minutesLate} min past close — someone is still clocked in`,
    `📅 ${nowCst()}`,
  ].join('\n');
}

// ── Fraud / transaction anomalies ─────────────────────────────

export function fmtRefundAlert(
  storeId: string,
  amount: number,
  employeeName: string | null,
  orderId: string,
): string {
  const amtStr = `$${(amount / 100).toFixed(2)}`;
  const lines = [
    `🚨 Large refund / void detected`,
    `🏪 ${storeLabel(storeId)}`,
    `💸 Amount: ${amtStr}`,
  ];
  if (employeeName) lines.push(`👤 Employee: ${employeeName}`);
  lines.push(`🔑 Order: ${orderId}`, `📅 ${nowCst()}`);
  return lines.join('\n');
}

export function fmtAfterHoursTransaction(
  storeId: string,
  amount: number,
  minutesAfterClose: number,
  orderId: string,
): string {
  const amtStr = `$${(amount / 100).toFixed(2)}`;
  return [
    `🌙 After-hours transaction`,
    `🏪 ${storeLabel(storeId)}`,
    `💸 Amount: ${amtStr}`,
    `⏰ ${minutesAfterClose} min after closing`,
    `🔑 Order: ${orderId}`,
    `📅 ${nowCst()}`,
  ].join('\n');
}

export function fmtMultipleRefunds(
  storeId: string,
  count: number,
  totalAmount: number,
  employeeName: string | null,
): string {
  const amtStr = `$${(totalAmount / 100).toFixed(2)}`;
  const lines = [
    `🚨 Multiple refunds in short window`,
    `🏪 ${storeLabel(storeId)}`,
    `💸 ${count} refunds totalling ${amtStr} in the last hour`,
  ];
  if (employeeName) lines.push(`👤 Employee: ${employeeName}`);
  lines.push(`📅 ${nowCst()}`);
  return lines.join('\n');
}

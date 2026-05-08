/**
 * POST /api/webhooks/clover
 *
 * Receives real-time events from Clover (order updates, payment updates).
 * Used for instant fraud/refund detection.
 *
 * Setup in Clover Developer Dashboard:
 *   1. Create an app (or use your existing one)
 *   2. Set webhook URL to: https://yourdomain.com/api/webhooks/clover
 *   3. Subscribe to: PAYMENT (for refunds) and ORDER (for voids)
 *
 * Clover webhook payload shape:
 *   { appId, merchantId, type: 'UPDATE'|'CREATE'|'DELETE',
 *     eventData: { objectId, timestamp } }
 *
 * Verification:
 *   Clover signs the request body with HMAC-SHA256 using your app secret.
 *   Header: X-Clover-Auth (base64-encoded HMAC)
 *   Set CLOVER_WEBHOOK_SECRET in your env to enable signature verification.
 */

import 'server-only';
import { getCatalogDb } from '@/lib/server/catalog-db';
import { logAlert } from '@/lib/server/ops-db';
import { sendAlert, fmtRefundAlert } from '@/lib/server/alerts';

// Clover sends a compact webhook — we then call back to get full details
interface CloverWebhookPayload {
  appId?: string;
  merchantId?: string;
  type?: 'CREATE' | 'UPDATE' | 'DELETE';
  eventData?: {
    objectId: string;   // order ID or payment ID
    timestamp?: number;
  };
}

// ── HMAC verification ─────────────────────────────────────────

async function verifyCloverSignature(
  body: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = process.env.CLOVER_WEBHOOK_SECRET;
  if (!secret) return true; // Verification disabled — set secret to enable

  if (!signatureHeader) return false;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(atob(signatureHeader), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(body),
    );
    return ok;
  } catch {
    return false;
  }
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  // Verify signature if secret is configured
  const sig = request.headers.get('X-Clover-Auth');
  if (!(await verifyCloverSignature(rawBody, sig))) {
    console.warn('[CloverWebhook] Invalid signature');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: CloverWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CloverWebhookPayload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const merchantId = payload.merchantId;
  const objectId = payload.eventData?.objectId;

  if (!merchantId || !objectId) {
    return Response.json({ ok: true }); // Ack but ignore incomplete payloads
  }

  // Determine which store this is for
  const storeId = merchantId === process.env.CLOVER_MERCHANT_ID_DIZZY ? 'dizzy' : 'toke';

  // Only process PAYMENT and ORDER events
  // We look up the full object from Clover to check if it's a refund/void
  const apiToken =
    storeId === 'dizzy'
      ? process.env.CLOVER_API_TOKEN_DIZZY
      : process.env.CLOVER_API_TOKEN_TOKE;
  const baseUrl = process.env.CLOVER_API_BASE_URL ?? 'https://api.clover.com/v3';

  if (!apiToken) return Response.json({ ok: true });

  // Fetch the order to check if it's voided or has refunds
  try {
    const orderUrl = `${baseUrl}/merchants/${merchantId}/orders/${objectId}?expand=lineItems,payments`;
    const orderRes = await fetch(orderUrl, {
      headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
    });

    if (!orderRes.ok) return Response.json({ ok: true });

    const order = await orderRes.json() as {
      id: string;
      state?: string;
      total?: number;
      employee?: { id: string; name?: string };
      payments?: { elements?: Array<{ amount: number; result?: string; refunds?: { elements?: Array<{ amount: number }> } }> };
    };

    const db = await getCatalogDb();
    if (!db) return Response.json({ ok: true });

    const threshold = parseInt(process.env.FRAUD_REFUND_THRESHOLD_CENTS ?? '2000', 10);
    const employeeName = order.employee?.name ?? null;

    // ── Check for voided order ──
    if (order.state === 'VOIDED' && (order.total ?? 0) >= threshold) {
      const message = fmtRefundAlert(storeId, order.total ?? 0, employeeName, order.id);
      const dedupKey = `void:${order.id}`;

      const inserted = await logAlert(db, {
        storeId,
        alertType: 'void',
        message,
        channel: 'pending',
        dedupKey,
      });

      if (inserted) {
        const { channel } = await sendAlert(message);
        await db
          .prepare(`UPDATE ops_alerts SET channel = ? WHERE dedup_key = ?`)
          .bind(channel, dedupKey)
          .run();
      }
    }

    // ── Check for refunds ──
    const payments = order.payments?.elements ?? [];
    for (const payment of payments) {
      const refunds = payment.refunds?.elements ?? [];
      for (const refund of refunds) {
        if (refund.amount >= threshold) {
          const message = fmtRefundAlert(storeId, refund.amount, employeeName, order.id);
          const dedupKey = `refund:${order.id}:${refund.amount}`;

          const inserted = await logAlert(db, {
            storeId,
            alertType: 'refund',
            message,
            channel: 'pending',
            dedupKey,
          });

          if (inserted) {
            const { channel } = await sendAlert(message);
            await db
              .prepare(`UPDATE ops_alerts SET channel = ? WHERE dedup_key = ?`)
              .bind(channel, dedupKey)
              .run();
          }
        }
      }
    }
  } catch (err) {
    console.error('[CloverWebhook] Error processing event:', err);
  }

  // Always return 200 — Clover retries on non-200
  return Response.json({ ok: true });
}

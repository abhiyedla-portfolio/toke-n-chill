import {
  fetchWeeklySales,
  getCloverOrderCredentials,
} from '../clover-orders';
import type { D1DatabaseLike } from './catalog-db';

// ── D1 row types ──────────────────────────────────────────────────────────────

interface ProductRow {
  clover_id: string | null;
  name: string | null;
  brand: string | null;
  category: string | null;
  stock_quantity: number | null;
}

// ── Enriched row (after joining with sales data) ──────────────────────────────

interface EnrichedRow extends ProductRow {
  unitsSold: number;
  status: 'critical' | 'at-risk' | 'ok';
}

// ── Public result type ────────────────────────────────────────────────────────

export interface ReportResult {
  totalItems: number;
  criticalLowStock: number;
  soldAndLow: number;
  weekStart: string;
  weekEnd: string;
  emailSent: boolean;
}

// ── D1 query — all active items with brand ────────────────────────────────────

async function queryAllActiveItems(db: D1DatabaseLike): Promise<ProductRow[]> {
  const result = await db
    .prepare(
      `SELECT clover_id, name, brand, category, stock_quantity
       FROM product_metadata
       WHERE is_active = 1
         AND clover_id IS NOT NULL
       ORDER BY
         LOWER(COALESCE(category, 'zzz')) ASC,
         LOWER(COALESCE(brand, 'zzz')) ASC,
         LOWER(COALESCE(name, '')) ASC`,
    )
    .all<ProductRow>();
  return result.results ?? [];
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function capitalize(s: string | null | undefined): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── HTML email builder ────────────────────────────────────────────────────────

function pill(text: string, bg: string, fg = '#fff'): string {
  return `<span style="display:inline-block;background:${bg};color:${fg};font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;letter-spacing:.3px;vertical-align:middle;">${text}</span>`;
}

function buildEmailHtml(
  weekStart: string,
  weekEnd: string,
  rows: EnrichedRow[],
  criticalCount: number,
  soldAndLowCount: number,
  generatedAt: string,
): string {

  // ── Group: category → brand → items ──
  const categoryMap = new Map<string, Map<string, EnrichedRow[]>>();
  rows.forEach((row) => {
    const cat = capitalize(row.category);
    const brand = capitalize(row.brand);
    if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());
    const brandMap = categoryMap.get(cat)!;
    if (!brandMap.has(brand)) brandMap.set(brand, []);
    brandMap.get(brand)!.push(row);
  });

  // ── Urgent callout: only critical + at-risk items ──
  const urgentItems = rows.filter((r) => r.status === 'critical' || r.status === 'at-risk');
  const urgentRows = urgentItems.map((item) => {
    const qty = item.stock_quantity ?? 0;
    const qtyLabel = qty <= 0 ? 'OUT' : String(qty);
    const qtyColor = item.status === 'critical' ? '#dc2626' : '#f97316';
    const statusLabel = item.status === 'critical' ? 'LOW' : 'WATCH';
    const statusBg = item.status === 'critical' ? '#dc2626' : '#f97316';
    return `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;font-size:13px;color:#1e1e2e;font-weight:600;">${item.name ?? '—'}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;font-size:12px;color:#64748b;">${capitalize(item.category)}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;text-align:center;">
          <span style="display:inline-block;background:${qtyColor};color:#fff;font-size:12px;font-weight:800;padding:2px 10px;border-radius:20px;min-width:28px;">${qtyLabel}</span>
        </td>
        <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;text-align:center;font-size:13px;color:#6d28d9;font-weight:700;">${item.unitsSold > 0 ? item.unitsSold : '—'}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #fce7e7;text-align:center;">${pill(statusLabel, statusBg)}</td>
      </tr>`;
  }).join('');

  // ── Full inventory table rows ──
  let tableBody = '';
  let rowIndex = 0;
  Array.from(categoryMap.entries()).forEach(([category, brandMap]) => {
    tableBody += `
      <tr>
        <td colspan="3" style="padding:12px 16px 10px;background:#1e1b4b;border-left:4px solid #7c3aed;">
          <span style="font-size:10px;font-weight:800;color:#a78bfa;text-transform:uppercase;letter-spacing:1.2px;">${category}</span>
        </td>
      </tr>`;

    Array.from(brandMap.entries()).forEach(([brand, items]) => {
      tableBody += `
        <tr>
          <td colspan="3" style="padding:7px 16px 7px 24px;background:#f0edff;border-bottom:1px solid #e0d9ff;">
            <span style="font-size:12px;font-weight:700;color:#4c1d95;">— ${brand}</span>
          </td>
        </tr>`;

      items.forEach((item) => {
        const qty = item.stock_quantity ?? 0;
        rowIndex++;
        const rowBg = item.status === 'critical'
          ? '#fff5f5'
          : item.status === 'at-risk'
            ? '#fff8f0'
            : rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff';

        const leftBorder = item.status === 'critical'
          ? 'border-left:3px solid #dc2626;'
          : item.status === 'at-risk'
            ? 'border-left:3px solid #f97316;'
            : 'border-left:3px solid transparent;';

        const qtyHtml = qty <= 0
          ? pill('OUT', '#dc2626')
          : item.status === 'critical'
            ? pill(String(qty), '#dc2626')
            : item.status === 'at-risk'
              ? pill(String(qty), '#f97316')
              : `<span style="color:#374151;font-weight:600;">${qty}</span>`;

        const soldHtml = item.unitsSold > 0
          ? `<span style="color:#7c3aed;font-weight:700;">${item.unitsSold}</span>`
          : `<span style="color:#d1d5db;">—</span>`;

        const statusHtml = item.status === 'critical'
          ? pill('LOW', '#fef2f2', '#dc2626') + '&hairsp;'
          : item.status === 'at-risk'
            ? pill('WATCH', '#fff7ed', '#f97316') + '&hairsp;'
            : '';

        tableBody += `
        <tr style="background:${rowBg};${leftBorder}">
          <td style="padding:9px 16px 9px 22px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:${item.status !== 'ok' ? '600' : '400'};">
            ${statusHtml}${item.name ?? '—'}
          </td>
          <td style="padding:9px 16px;border-bottom:1px solid #f1f5f9;text-align:center;">${qtyHtml}</td>
          <td style="padding:9px 16px;border-bottom:1px solid #f1f5f9;text-align:center;">${soldHtml}</td>
        </tr>`;
      });
    });
  });

  const hasUrgent = urgentItems.length > 0;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Weekly Inventory Report — Toke-N-Chill</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;padding:32px 16px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">

  <!-- ══ HEADER ══ -->
  <tr>
    <td style="background:linear-gradient(160deg,#2e1065 0%,#4c1d95 50%,#6d28d9 100%);border-radius:16px 16px 0 0;padding:36px 36px 0;">
      <!-- Logo row -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">🛒 Toke-N-Chill</span><br/>
            <span style="font-size:11px;font-weight:600;color:#c4b5fd;letter-spacing:2px;text-transform:uppercase;">Weekly Inventory Report</span>
          </td>
          <td align="right" valign="top">
            <span style="display:inline-block;background:rgba(255,255,255,.15);border-radius:8px;padding:6px 14px;font-size:11px;color:#ddd6fe;font-weight:600;">Auto-generated</span>
          </td>
        </tr>
      </table>
      <!-- Week band -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
        <tr>
          <td style="background:rgba(0,0,0,.25);border-radius:10px 10px 0 0;padding:14px 20px;">
            <span style="font-size:12px;color:#a78bfa;font-weight:600;text-transform:uppercase;letter-spacing:.8px;">Report Period</span><br/>
            <span style="font-size:14px;color:#ffffff;font-weight:700;">${weekStart}</span>
            <span style="color:#7c3aed;font-size:14px;"> &rarr; </span>
            <span style="font-size:14px;color:#ffffff;font-weight:700;">${weekEnd}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ STAT CARDS ══ -->
  <tr>
    <td style="background:#1e1b4b;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="33%" align="center" style="padding:20px 0;border-right:1px solid rgba(255,255,255,.08);">
            <div style="font-size:32px;font-weight:900;color:#e2e8f0;line-height:1;">${rows.length}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Total Items</div>
          </td>
          <td width="33%" align="center" style="padding:20px 0;border-right:1px solid rgba(255,255,255,.08);">
            <div style="font-size:32px;font-weight:900;color:#f87171;line-height:1;">${criticalCount}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">&#x1F534; Critical Low</div>
          </td>
          <td width="33%" align="center" style="padding:20px 0;">
            <div style="font-size:32px;font-weight:900;color:#fb923c;line-height:1;">${soldAndLowCount}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">&#x1F7E0; Sold &amp; Low</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ URGENT CALLOUT (only when items need attention) ══ -->
  ${hasUrgent ? `
  <tr>
    <td style="background:#fff;padding:0 0 4px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:#fff1f2;border-left:4px solid #dc2626;padding:16px 24px;">
            <span style="font-size:15px;font-weight:800;color:#9f1239;">&#x26A0;&#xFE0F; Needs Immediate Attention</span>
            <span style="font-size:12px;color:#be123c;margin-left:8px;">${urgentItems.length} item${urgentItems.length !== 1 ? 's' : ''} require restocking</span>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-radius:8px;overflow:hidden;border:1px solid #fecdd3;">
              <thead>
                <tr style="background:#fff1f2;">
                  <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:800;color:#9f1239;text-transform:uppercase;letter-spacing:.6px;">Item</th>
                  <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:800;color:#9f1239;text-transform:uppercase;letter-spacing:.6px;">Category</th>
                  <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:800;color:#9f1239;text-transform:uppercase;letter-spacing:.6px;">Stock</th>
                  <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:800;color:#9f1239;text-transform:uppercase;letter-spacing:.6px;">Sold 7d</th>
                  <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:800;color:#9f1239;text-transform:uppercase;letter-spacing:.6px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${urgentRows}
              </tbody>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  ` : ''}

  <!-- ══ LEGEND ══ -->
  <tr>
    <td style="background:#fff;padding:0 24px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <tr>
          <td style="padding:12px 16px;">
            <span style="font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.6px;">How we flag items &nbsp;</span>
            <span style="font-size:12px;color:#6b7280;">&nbsp;${pill('LOW', '#dc2626')}&nbsp; Under 3 units in stock &nbsp;&nbsp; ${pill('WATCH', '#f97316')}&nbsp; Had sales this week + 3 or fewer left</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ FULL INVENTORY TABLE ══ -->
  <tr>
    <td style="background:#fff;padding:0 24px 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e5e7eb;width:70px;">Stock</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #e5e7eb;width:70px;">Sold 7d</th>
          </tr>
        </thead>
        <tbody>
          ${tableBody}
        </tbody>
      </table>
    </td>
  </tr>

  <!-- ══ FOOTER ══ -->
  <tr>
    <td style="background:#1e1b4b;border-radius:0 0 16px 16px;padding:20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <span style="font-size:13px;font-weight:700;color:#c4b5fd;">🛒 Toke-N-Chill</span><br/>
            <span style="font-size:11px;color:#6d5fa0;">Inventory report · ${generatedAt}</span>
          </td>
          <td align="right">
            <span style="font-size:11px;color:#4c3a8a;">Powered by Clover + Cloudflare</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

// ── Resend sender ─────────────────────────────────────────────────────────────

async function sendEmail(
  resendApiKey: string,
  from: string,
  to: string[],
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[InventoryReport] Resend error ${res.status}: ${body}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[InventoryReport] Email send failed:', err);
    return false;
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Generate the weekly inventory report and send it via Resend.
 *
 * Reads from env:
 *   resend_tncrr            — Resend API key (Worker secret, required)
 *   REPORT_TO_EMAIL         — recipient (defaults to store email)
 * Sends from: onboarding@resend.dev (Resend shared domain, no DNS setup needed)
 */
export async function generateAndSendReport(db: D1DatabaseLike): Promise<ReportResult> {
  const resendApiKey = process.env.resend_tncrr;
  const fromEmail = 'onboarding@resend.dev';
  const toEmail = process.env.REPORT_TO_EMAIL ?? 'tokeandchillronaldreagan@gmail.com';

  if (!resendApiKey) throw new Error('[InventoryReport] resend_tncrr secret is not set.');

  const nowMs = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const startMs = nowMs - weekMs;
  const weekStart = formatDate(startMs);
  const weekEnd = formatDate(nowMs);
  const generatedAt = formatDate(nowMs);

  // 1. Pull all active items + active exclusions from D1 in parallel
  const [allItems, exclusionsResult] = await Promise.all([
    queryAllActiveItems(db),
    db.prepare(
      `SELECT clover_id FROM report_exclusions
       WHERE exclusion_type = 'permanent'
          OR (exclusion_type = 'temporary' AND excluded_until > ?)`,
    ).bind(new Date(nowMs).toISOString()).all<{ clover_id: string }>(),
  ]);

  const excludedIds = new Set((exclusionsResult.results ?? []).map((r) => r.clover_id));

  // 2. Fetch this week's sales from Clover Orders API
  const creds = getCloverOrderCredentials();
  let salesMap = new Map<string, { itemId: string; name: string; unitsSold: number }>();

  if (creds) {
    salesMap = await fetchWeeklySales(creds, startMs, nowMs);
  } else {
    console.warn('[InventoryReport] Clover credentials missing — sales column will show 0.');
  }

  // 3. Enrich each item with sales data + compute status (skip excluded items)
  let criticalCount = 0;
  let soldAndLowCount = 0;

  const enriched: EnrichedRow[] = allItems
    .filter((item) => !item.clover_id || !excludedIds.has(item.clover_id))
    .map((item) => {
    const sales = item.clover_id ? salesMap.get(item.clover_id) : undefined;
    const unitsSold = sales?.unitsSold ?? 0;
    const qty = item.stock_quantity ?? 0;

    let status: EnrichedRow['status'] = 'ok';
    if (qty < 3) {
      status = 'critical';
      criticalCount++;
    } else if (unitsSold > 0 && qty <= 3) {
      status = 'at-risk';
      soldAndLowCount++;
    }

    return { ...item, unitsSold, status };
  }); // end .filter().map()

  // 4. Build HTML + send
  const html = buildEmailHtml(weekStart, weekEnd, enriched, criticalCount, soldAndLowCount, generatedAt);
  const dateLabel = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const subject = `🛒 Inventory Report — ${dateLabel}`;

  const emailSent = await sendEmail(resendApiKey, fromEmail, [toEmail], subject, html);

  console.log(
    `[InventoryReport] Done — total=${enriched.length}, critical=${criticalCount}, soldAndLow=${soldAndLowCount}, emailSent=${emailSent}`,
  );

  return {
    totalItems: enriched.length,
    criticalLowStock: criticalCount,
    soldAndLow: soldAndLowCount,
    weekStart,
    weekEnd,
    emailSent,
  };
}

// Admin layout — completely isolated from the site chrome (no navbar/footer/age gate).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Admin — Toke-N-Chill</title>
        <meta name="robots" content="noindex, nofollow" />
        <style>{`
          .admin-topbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: #080f1e; border-bottom: 1px solid #1e293b;
            display: flex; align-items: center; gap: 2px;
            padding: 0 16px; height: 34px;
          }
          .admin-topbar a {
            color: #64748b; text-decoration: none; font-size: 11px;
            font-weight: 600; padding: 4px 10px; border-radius: 5px;
            letter-spacing: 0.3px; transition: all 0.1s;
          }
          .admin-topbar a:hover { color: #f8fafc; background: #1e293b; }
          .admin-page-wrap { padding-top: 34px; }

          /* Mobile: hide non-essential inventory columns so the Notes column stays
             visible without horizontal scroll. Order matches the inventory table:
             1 Item · 2 Category · 3 Brand · 4 Stock · 5 Sold · 6 Note · 7 Found · 8 Actions
             We keep Item, Stock, Note, Actions; hide Category, Brand, Sold, Found. */
          @media (max-width: 768px) {
            .inv-tbl th:nth-child(2), .inv-tbl td:nth-child(2),
            .inv-tbl th:nth-child(3), .inv-tbl td:nth-child(3),
            .inv-tbl th:nth-child(5), .inv-tbl td:nth-child(5),
            .inv-tbl th:nth-child(7), .inv-tbl td:nth-child(7) {
              display: none;
            }
            /* Tighter padding + a bit more breathing room for the Note textarea on mobile */
            .inv-tbl th, .inv-tbl td { padding: 8px 8px !important; font-size: 12.5px; }
            .inv-tbl textarea { min-width: 0 !important; }
            /* Summary cards: 5 across is unreadable on phones — switch to 2-up. */
            .admin-summary-cards { grid-template-columns: repeat(2, 1fr) !important; }
            /* Filter bar selects/inputs: full-width row each so labels are readable. */
            .admin-filter-bar > input,
            .admin-filter-bar > select { flex: 1 1 100%; }
            /* Stat cards keep their double row, but body padding is tighter. */
            .admin-page-wrap > div { padding: 16px 12px !important; }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0f172a', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <nav className="admin-topbar">
          <a href="/admin">🛒 Inventory</a>
          <a href="/admin/ops">🏪 Operations</a>
        </nav>
        <div className="admin-page-wrap">
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — Toke-N-Chill',
  robots: {
    index: false,
    follow: false,
  },
};

// Admin layout — site chrome is skipped by SiteShell in the root layout.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
          html, body {
            margin: 0;
            padding: 0;
            background: #0f172a;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
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

          /* Mobile: hide non-essential inventory columns so buying actions remain usable.
             Order: 1 Item · 2 Need · 3 Category · 4 Brand · 5 Price · 6 Stock ·
             7 Sold 7d · 8 Sold 14d · 9 Sold 30d · 10 Matches · 11 Source ·
             12 Note · 13 Found · 14 Actions. */
          @media (max-width: 768px) {
            .inv-tbl th:nth-child(3), .inv-tbl td:nth-child(3),
            .inv-tbl th:nth-child(4), .inv-tbl td:nth-child(4),
            .inv-tbl th:nth-child(5), .inv-tbl td:nth-child(5),
            .inv-tbl th:nth-child(10), .inv-tbl td:nth-child(10),
            .inv-tbl th:nth-child(13), .inv-tbl td:nth-child(13) {
              display: none;
            }
            /* Tighter padding + a bit more breathing room for the Note textarea on mobile */
            .inv-tbl th, .inv-tbl td { padding: 8px 8px !important; font-size: 12.5px; }
            .inv-tbl textarea { min-width: 0 !important; }
            /* Summary cards are dense on phones, switch to 2-up. */
            .admin-summary-cards { grid-template-columns: repeat(2, 1fr) !important; }
            /* Filter bar selects/inputs: full-width row each so labels are readable. */
            .admin-filter-bar > input,
            .admin-filter-bar > select { flex: 1 1 100%; }
            /* Stat cards keep their double row, but body padding is tighter. */
            .admin-page-wrap > div { padding: 16px 12px !important; }
            .admin-week-workspace {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      <nav className="admin-topbar">
        <a href="/admin">Inventory</a>
        <a href="/admin/ops">Operations</a>
      </nav>
      <div className="admin-page-wrap">
        {children}
      </div>
    </>
  );
}

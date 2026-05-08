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

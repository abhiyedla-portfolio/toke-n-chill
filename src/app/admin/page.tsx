'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Item {
  cloverId: string;
  name: string;
  brand: string;
  category: string;
  stockQuantity: number;
  unitsSold: number;
  status: 'critical' | 'at-risk' | 'ok';
  excluded: boolean;
  note: string | null;
  foundInStore: boolean;
  foundAt: string | null;
}

interface Exclusion {
  clover_id: string;
  item_name: string;
  exclusion_type: 'permanent' | 'temporary';
  excluded_until: string | null;
  excluded_at: string;
}

interface LiveData {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  items: Item[];
  exclusions: Exclusion[];
}

type SortKey = 'name' | 'stock' | 'sold' | 'category' | 'brand';
type SortDir = 'asc' | 'desc';
type TabId = 'lowstock' | 'all' | 'excluded';
type GroupKey = 'none' | 'category' | 'brand' | 'letter' | 'name';

const GROUP_LABELS: Record<GroupKey, string> = {
  none: 'No grouping',
  category: 'Category',
  brand: 'Brand',
  name: 'Name (full)',
  letter: 'First letter',
};

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

function badge(bg: string, text: string, fg = '#fff'): React.ReactNode {
  return (
    <span style={{ background: bg, color: fg, padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' as const }}>
      {text}
    </span>
  );
}

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

// ── Note cell — inline editable with auto-save ────────────────────────────────

function NoteCell({ item, onSaved }: { item: Item; onSaved: (cloverId: string, note: string) => void }) {
  const [value, setValue] = useState(item.note ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounced = useDebounce(value, 800);
  const initial = useRef(item.note ?? '');

  useEffect(() => {
    if (debounced === initial.current) return;
    setSaving(true);
    fetch('/api/admin/report/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cloverId: item.cloverId, itemName: item.name, note: debounced }),
    }).then(() => {
      initial.current = debounced;
      onSaved(item.cloverId, debounced);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }).finally(() => setSaving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a note…"
        rows={1}
        style={{
          width: '100%',
          background: value ? '#1e2d3d' : '#0f172a',
          border: `1px solid ${value ? '#3b82f6' : '#1e293b'}`,
          borderRadius: '6px',
          color: '#e2e8f0',
          fontSize: '12px',
          padding: '5px 8px',
          resize: 'vertical',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          minWidth: '140px',
        }}
      />
      {saving && <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '10px', color: '#64748b' }}>saving…</span>}
      {saved && <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '10px', color: '#34d399' }}>✓ saved</span>}
    </div>
  );
}

// ── Pagination controls ───────────────────────────────────────────────────────

function Pagination({
  total,
  pageSize,
  currentPage,
  onPage,
}: {
  total: number;
  pageSize: number;
  currentPage: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  // Build page number list with ellipsis
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    border: '1px solid #334155', borderRadius: '6px', fontSize: '12px',
    fontWeight: 600, padding: '5px 10px', cursor: 'pointer', minWidth: '34px',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', padding: '14px 0 4px' }}>
      <button
        onClick={() => onPage(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ ...btnBase, background: '#1e293b', color: currentPage === 1 ? '#334155' : '#94a3b8', cursor: currentPage === 1 ? 'default' : 'pointer' }}
      >← Prev</button>

      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ color: '#475569', fontSize: '12px', padding: '0 4px' }}>…</span>
          : <button
              key={p}
              onClick={() => onPage(p)}
              style={{ ...btnBase, background: p === currentPage ? '#6d28d9' : '#1e293b', color: p === currentPage ? '#fff' : '#94a3b8', borderColor: p === currentPage ? '#6d28d9' : '#334155' }}
            >{p}</button>
      )}

      <button
        onClick={() => onPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ ...btnBase, background: '#1e293b', color: currentPage === totalPages ? '#334155' : '#94a3b8', cursor: currentPage === totalPages ? 'default' : 'pointer' }}
      >Next →</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();

  // ── Data state ──
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [actionMsg, setActionMsg] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  // ── UI state ──
  const [activeTab, setTab] = useState<TabId>('lowstock');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFound, setFilterFound] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('stock');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupBy, setGroupBy] = useState<GroupKey>('none');
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Load data ──

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/report/live');
      if (res.status === 401) { router.push('/admin/login'); return; }
      setData(await res.json() as LiveData);
    } catch { setActionMsg('Failed to load data.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever filters/sort/tab/pageSize change
  useEffect(() => { setCurrentPage(1); }, [search, filterCategory, filterBrand, filterStatus, filterFound, sortKey, sortDir, activeTab, pageSize, groupBy]);

  // ── Actions ──

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  function setBusy(id: string, busy: boolean) {
    setBusyIds((s) => { const n = new Set(s); if (busy) { n.add(id); } else { n.delete(id); } return n; });
  }

  async function exclude(item: Item, type: 'permanent' | 'temporary') {
    setBusy(item.cloverId, true);
    const res = await fetch('/api/admin/report/exclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cloverId: item.cloverId, itemName: item.name, type }),
    });
    if (res.ok) {
      setActionMsg(type === 'permanent'
        ? `"${item.name}" permanently removed from reports.`
        : `"${item.name}" skipped for 8 days.`);
      await load();
    }
    setBusy(item.cloverId, false);
  }

  async function restore(cloverId: string, itemName: string) {
    setBusy(cloverId, true);
    const res = await fetch(`/api/admin/report/exclusions/${encodeURIComponent(cloverId)}`, { method: 'DELETE' });
    if (res.ok) { setActionMsg(`"${itemName}" restored.`); await load(); }
    setBusy(cloverId, false);
  }

  async function toggleFound(item: Item) {
    setBusy(item.cloverId, true);
    const next = !item.foundInStore;
    await fetch('/api/admin/report/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cloverId: item.cloverId, itemName: item.name, foundInStore: next }),
    });
    setData((d) => d ? {
      ...d,
      items: d.items.map((i) => i.cloverId === item.cloverId
        ? { ...i, foundInStore: next, foundAt: next ? new Date().toISOString() : null }
        : i),
    } : d);
    setBusy(item.cloverId, false);
  }

  function handleNoteSaved(cloverId: string, note: string) {
    setData((d) => d ? {
      ...d,
      items: d.items.map((i) => i.cloverId === cloverId ? { ...i, note } : i),
    } : d);
  }

  async function sendReport() {
    setSendingReport(true);
    const secret = prompt('Enter INVENTORY_REPORT_SECRET:');
    if (!secret) { setSendingReport(false); return; }
    try {
      const res = await fetch('/api/admin/inventory-report', {
        method: 'POST', headers: { Authorization: `Bearer ${secret}` },
      });
      const json = await res.json() as { emailSent?: boolean; criticalLowStock?: number };
      setActionMsg(json.emailSent ? `✓ Report sent! ${json.criticalLowStock} critical items.` : 'Report generated but email may not have sent.');
    } catch { setActionMsg('Failed to send report.'); }
    setSendingReport(false);
  }

  // ── Sort helper ──

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'sold' ? 'desc' : 'asc'); }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return <span style={{ color: '#334155' }}> ↕</span>;
    return <span style={{ color: '#a78bfa' }}> {sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  // ── Derived / filtered / sorted / paginated data ──

  const allItems = useMemo(() => data?.items ?? [], [data]);

  const categories = useMemo(() =>
    Array.from(new Set(allItems.map((i) => i.category).filter(Boolean))).sort(),
  [allItems]);

  const brands = useMemo(() =>
    Array.from(new Set(
      allItems
        .filter((i) => !filterCategory || i.category === filterCategory)
        .map((i) => i.brand)
        .filter(Boolean),
    )).sort(),
  [allItems, filterCategory]);

  const baseItems = useMemo(() => {
    let list = allItems;
    if (activeTab === 'lowstock') list = list.filter((i) => !i.excluded && (i.status === 'critical' || i.status === 'at-risk'));
    else if (activeTab === 'all') list = list.filter((i) => !i.excluded);
    return list;
  }, [allItems, activeTab]);

  const filtered = useMemo(() => {
    let list = baseItems;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.name?.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.note?.toLowerCase().includes(q),
      );
    }
    if (filterCategory) list = list.filter((i) => i.category === filterCategory);
    if (filterBrand) list = list.filter((i) => i.brand === filterBrand);
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    if (filterFound === 'found') list = list.filter((i) => i.foundInStore);
    if (filterFound === 'notfound') list = list.filter((i) => !i.foundInStore);
    return list;
  }, [baseItems, search, filterCategory, filterBrand, filterStatus, filterFound]);

  const sorted = useMemo(() => {
    const statusOrder = { critical: 0, 'at-risk': 1, ok: 2 };
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
      else if (sortKey === 'stock') cmp = a.stockQuantity - b.stockQuantity;
      else if (sortKey === 'sold') cmp = b.unitsSold - a.unitsSold;
      else if (sortKey === 'category') cmp = (a.category ?? '').localeCompare(b.category ?? '');
      else if (sortKey === 'brand') cmp = (a.brand ?? '').localeCompare(b.brand ?? '');
      if (cmp === 0 && sortKey !== 'stock') cmp = a.stockQuantity - b.stockQuantity;
      if (cmp === 0) cmp = statusOrder[a.status] - statusOrder[b.status];
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Pagination slice — only used when grouping is off
  const totalPages = Math.ceil(sorted.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, sorted.length);

  // Group items by the selected key (preserves the existing sort order within each group)
  const groups = useMemo<Array<[string, Item[]]>>(() => {
    if (groupBy === 'none') return [['', sorted]];
    const map = new Map<string, Item[]>();
    for (const item of sorted) {
      let key = '';
      if (groupBy === 'category') key = item.category || '— Uncategorized —';
      else if (groupBy === 'brand') key = item.brand || '— No brand —';
      else if (groupBy === 'name') key = item.name || '—';
      else if (groupBy === 'letter') key = (item.name?.[0] ?? '#').toUpperCase();
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sorted, groupBy]);

  const exclusions = data?.exclusions ?? [];
  const nowIso = new Date().toISOString();
  const activeExclusions = exclusions.filter((e) =>
    e.exclusion_type === 'permanent' || (e.excluded_until && e.excluded_until > nowIso),
  );
  const criticalCount = allItems.filter((i) => !i.excluded && i.status === 'critical').length;
  const atRiskCount = allItems.filter((i) => !i.excluded && i.status === 'at-risk').length;

  // ── Styles ──

  const S = {
    page: { minHeight: '100vh', background: '#0f172a', color: '#f8fafc' } as React.CSSProperties,
    header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '58px', position: 'sticky' as const, top: 0, zIndex: 10 },
    btn: (bg: string, pad = '7px 14px'): React.CSSProperties => ({ background: bg, border: 'none', borderRadius: '7px', color: '#fff', fontWeight: 600, fontSize: '12px', padding: pad, cursor: 'pointer', whiteSpace: 'nowrap' as const }),
    ghostBtn: (): React.CSSProperties => ({ background: 'transparent', border: '1px solid #334155', borderRadius: '7px', color: '#94a3b8', fontWeight: 600, fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }),
    select: (): React.CSSProperties => ({ background: '#1e293b', border: '1px solid #334155', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', padding: '6px 10px', outline: 'none', cursor: 'pointer' }),
    input: (): React.CSSProperties => ({ background: '#1e293b', border: '1px solid #334155', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', padding: '6px 10px', outline: 'none', width: '200px' }),
    th: (clickable = false): React.CSSProperties => ({ padding: '9px 12px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#64748b', borderBottom: '2px solid #334155', cursor: clickable ? 'pointer' : 'default', userSelect: 'none' as const, whiteSpace: 'nowrap' as const }),
    td: (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '10px 12px', borderBottom: '1px solid #1e293b', verticalAlign: 'top' as const, ...extra }),
  };

  // ── Loading state ──

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#64748b' }}>Loading inventory…</span>
      </div>
    );
  }

  // ── Render ──

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🛒 <span>Toke-N-Chill Admin</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => load(true)} disabled={refreshing} style={S.ghostBtn()}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button onClick={sendReport} disabled={sendingReport} style={S.btn('#16a34a')}>
            {sendingReport ? 'Sending…' : '📧 Send Report'}
          </button>
          <button onClick={handleLogout} style={S.ghostBtn()}>Sign Out</button>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Week range ── */}
        {data && (
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
            📅 <strong style={{ color: '#94a3b8' }}>{fmtDate(data.weekStart)}</strong>
            {' → '}
            <strong style={{ color: '#94a3b8' }}>{fmtDate(data.weekEnd)}</strong>
            {' · '}Generated {fmtDate(data.generatedAt)}
          </div>
        )}

        {/* ── Summary cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Items', value: allItems.length, color: '#f8fafc', border: '#334155' },
            { label: '⚠ Critical Low', value: criticalCount, color: '#fbbf24', border: '#92400e' },
            { label: '◎ Sold & Low', value: atRiskCount, color: '#818cf8', border: '#3730a3' },
            { label: '⛔ Excluded', value: activeExclusions.length, color: '#60a5fa', border: '#1e3a5f' },
          ].map(({ label, value, color, border }) => (
            <div key={label} style={{ background: '#1e293b', borderRadius: '10px', border: `1px solid ${border}`, padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Action message ── */}
        {actionMsg && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#0f4a1f', border: '1px solid #166534', borderRadius: '8px', color: '#86efac', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg('')} style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer', fontSize: '16px' }}>×</button>
          </div>
        )}

        {/* ── Low stock legend ── */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>📌 How we identify low stock:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {badge('#92400e', 'LOW', '#fcd34d')}
            <span style={{ color: '#94a3b8' }}>Stock &lt; 3 units — reorder now</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {badge('#3730a3', 'WATCH', '#a5b4fc')}
            <span style={{ color: '#94a3b8' }}>Had sales this week + stock ≤ 3 — at risk before next report</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {badge('#16a34a', '✓ Found')}
            <span style={{ color: '#94a3b8' }}>Physically verified in store</span>
          </span>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#1e293b', borderRadius: '9px', padding: '4px', border: '1px solid #334155', width: 'fit-content' }}>
          {([
            ['lowstock', `⚠ Low Stock (${allItems.filter((i) => !i.excluded && (i.status === 'critical' || i.status === 'at-risk')).length})`],
            ['all', `📦 All Items (${allItems.filter((i) => !i.excluded).length})`],
            ['excluded', `⛔ Excluded (${activeExclusions.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSearch(''); setFilterCategory(''); setFilterBrand(''); setFilterStatus(''); setFilterFound(''); }}
              style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '12px', cursor: 'pointer', background: activeTab === id ? '#6d28d9' : 'transparent', color: activeTab === id ? '#fff' : '#64748b', transition: 'all 0.15s' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Excluded tab ── */}
        {activeTab === 'excluded' ? (
          <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
            {activeExclusions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No items currently excluded.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Item', 'Type', 'Excluded Until', 'Excluded At', ''].map((h) => (
                      <th key={h} style={S.th()}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeExclusions.map((ex) => (
                    <tr key={ex.clover_id} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={S.td({ color: '#f8fafc', fontWeight: 500 })}>{ex.item_name}</td>
                      <td style={S.td()}>
                        {ex.exclusion_type === 'permanent'
                          ? badge('#374151', 'PERMANENT', '#d1d5db')
                          : badge('#1e3a5f', 'TEMPORARY', '#93c5fd')}
                      </td>
                      <td style={S.td({ color: '#64748b', fontSize: '12px' })}>{ex.excluded_until ? fmtDate(ex.excluded_until) : '—'}</td>
                      <td style={S.td({ color: '#64748b', fontSize: '12px' })}>{fmtDate(ex.excluded_at)}</td>
                      <td style={S.td()}>
                        <button disabled={busyIds.has(ex.clover_id)} onClick={() => restore(ex.clover_id, ex.item_name)} style={S.btn('#0f766e', '5px 10px')}>
                          {busyIds.has(ex.clover_id) ? '…' : '↩ Restore'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <>
            {/* ── Filter + Sort bar ── */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: '16px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px 14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginRight: '4px' }}>Filter</span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search name, brand, note…"
                style={S.input()}
              />

              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterBrand(''); }} style={S.select()}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={S.select()}>
                <option value="">All Brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>

              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={S.select()}>
                <option value="">All Statuses</option>
                <option value="critical">⚠ Critical</option>
                <option value="at-risk">◎ Watch</option>
                <option value="ok">✅ OK</option>
              </select>

              <select value={filterFound} onChange={(e) => setFilterFound(e.target.value)} style={S.select()}>
                <option value="">All Found Status</option>
                <option value="found">✓ Found in Store</option>
                <option value="notfound">Not Verified</option>
              </select>

              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)} style={S.select()} title="Group rows by">
                {(Object.keys(GROUP_LABELS) as GroupKey[]).map((k) => (
                  <option key={k} value={k}>{k === 'none' ? GROUP_LABELS[k] : `Group: ${GROUP_LABELS[k]}`}</option>
                ))}
              </select>

              {(search || filterCategory || filterBrand || filterStatus || filterFound || groupBy !== 'none') && (
                <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterBrand(''); setFilterStatus(''); setFilterFound(''); setGroupBy('none'); }} style={S.ghostBtn()}>
                  ✕ Clear
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  {sorted.length === 0
                    ? '0 items'
                    : groupBy !== 'none'
                      ? `${sorted.length} items · ${groups.length} group${groups.length === 1 ? '' : 's'}`
                      : `${pageStart}–${pageEnd} of ${sorted.length}`}
                </span>
                {groupBy === 'none' && (
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                    style={{ ...S.select(), fontSize: '11px' }}
                    title="Items per page"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* ── Table ── */}
            {sorted.length === 0 ? (
              <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', padding: '50px', textAlign: 'center', color: '#64748b' }}>
                {activeTab === 'lowstock' ? '✅ No low stock items — looking good!' : 'No items match the current filters.'}
              </div>
            ) : (
              <div style={{ background: '#0f172a', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      <th onClick={() => toggleSort('name')} style={S.th(true)}>Item {sortArrow('name')}</th>
                      <th onClick={() => toggleSort('category')} style={S.th(true)}>Category {sortArrow('category')}</th>
                      <th onClick={() => toggleSort('brand')} style={S.th(true)}>Brand {sortArrow('brand')}</th>
                      <th onClick={() => toggleSort('stock')} style={{ ...S.th(true), textAlign: 'center' }}>Stock {sortArrow('stock')}</th>
                      <th onClick={() => toggleSort('sold')} style={{ ...S.th(true), textAlign: 'center' }}>Sold 7d {sortArrow('sold')}</th>
                      <th style={S.th()}>Note</th>
                      <th style={{ ...S.th(), textAlign: 'center' }}>Found</th>
                      <th style={{ ...S.th(), textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const renderRow = (item: Item) => {
                        const busy = busyIds.has(item.cloverId);
                        const rowBg = item.foundInStore
                          ? '#071a0d'
                          : item.status === 'critical'
                            ? '#1c1400'
                            : item.status === 'at-risk'
                              ? '#0e0d1f'
                              : 'transparent';

                        return (
                          <tr key={item.cloverId} style={{ background: rowBg, borderBottom: '1px solid #1e293b' }}>
                            <td style={S.td()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
                                <span style={{ color: '#e2e8f0', fontWeight: item.status !== 'ok' ? 600 : 400 }}>
                                  {item.name}
                                </span>
                                {item.status === 'critical' && badge('#92400e', 'LOW', '#fcd34d')}
                                {item.status === 'at-risk' && badge('#312e81', 'WATCH', '#a5b4fc')}
                              </div>
                            </td>
                            <td style={S.td({ color: '#64748b', fontSize: '12px' })}>{item.category ?? '—'}</td>
                            <td style={S.td({ color: '#64748b', fontSize: '12px' })}>{item.brand ?? '—'}</td>
                            <td style={S.td({ textAlign: 'center' })}>
                              {item.stockQuantity <= 0
                                ? badge('#374151', 'OUT', '#d1d5db')
                                : item.status === 'critical'
                                  ? badge('#92400e', String(item.stockQuantity), '#fcd34d')
                                  : item.status === 'at-risk'
                                    ? badge('#312e81', String(item.stockQuantity), '#a5b4fc')
                                    : <span style={{ color: '#94a3b8' }}>{item.stockQuantity}</span>}
                            </td>
                            <td style={S.td({ textAlign: 'center', color: item.unitsSold > 0 ? '#a78bfa' : '#334155', fontWeight: item.unitsSold > 0 ? 700 : 400 })}>
                              {item.unitsSold > 0 ? item.unitsSold : '—'}
                            </td>
                            <td style={S.td({ minWidth: '160px' })}>
                              <NoteCell item={item} onSaved={handleNoteSaved} />
                            </td>
                            <td style={S.td({ textAlign: 'center' })}>
                              <button
                                disabled={busy}
                                onClick={() => toggleFound(item)}
                                title={item.foundInStore ? `Found ${item.foundAt ? fmtDate(item.foundAt) : ''}` : 'Mark as found in store'}
                                style={{
                                  background: item.foundInStore ? '#14532d' : '#1e293b',
                                  border: `1px solid ${item.foundInStore ? '#16a34a' : '#334155'}`,
                                  borderRadius: '7px',
                                  color: item.foundInStore ? '#86efac' : '#64748b',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  padding: '4px 10px',
                                  cursor: 'pointer',
                                  opacity: busy ? 0.5 : 1,
                                }}
                              >
                                {item.foundInStore ? '✓ Found' : '○ Check'}
                              </button>
                            </td>
                            <td style={S.td({ textAlign: 'right' })}>
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                <button disabled={busy} onClick={() => exclude(item, 'temporary')} style={{ ...S.btn('#1e3a5f', '5px 9px'), fontSize: '11px', opacity: busy ? 0.5 : 1 }}>
                                  {busy ? '…' : '⏭ Skip'}
                                </button>
                                <button disabled={busy} onClick={() => exclude(item, 'permanent')} style={{ ...S.btn('#374151', '5px 9px'), fontSize: '11px', opacity: busy ? 0.5 : 1 }}>
                                  {busy ? '…' : '⛔ Remove'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      };

                      if (groupBy === 'none') return paginatedItems.map(renderRow);

                      return groups.flatMap(([groupKey, items]) => [
                        <tr key={`__group_${groupKey}`} style={{ background: '#0c1426' }}>
                          <td colSpan={8} style={{ padding: '10px 14px', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                              {groupKey}
                            </span>
                            <span style={{ marginLeft: '10px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              {items.length} item{items.length === 1 ? '' : 's'}
                            </span>
                          </td>
                        </tr>,
                        ...items.map(renderRow),
                      ]);
                    })()}
                  </tbody>
                </table>

                {/* ── Pagination (hidden when grouping is active — all groups render fully) ── */}
                {groupBy === 'none' && (
                  <div style={{ borderTop: '1px solid #1e293b', padding: '4px 16px 12px' }}>
                    <Pagination
                      total={sorted.length}
                      pageSize={pageSize}
                      currentPage={safePage}
                      onPage={setCurrentPage}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

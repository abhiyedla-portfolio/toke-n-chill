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
  priceCents: number | null;
  unitsSold: number;
  unitsSold7d: number;
  unitsSoldPrev7d: number;
  unitsSold14d: number;
  unitsSold30d: number;
  status: 'critical' | 'at-risk' | 'ok';
  salesTrend: 'up' | 'down' | 'flat' | 'new';
  suggestedOrderQty: number;
  productLine: string;
  flavorProfile: string;
  sameFlavorOtherLines: RelatedItem[];
  similarProducts: RelatedItem[];
  priceVariants: PriceVariant[];
  excluded: boolean;
  note: string | null;
  foundInStore: boolean;
  foundAt: string | null;
  weekStatus: 'active' | 'skipped' | 'removed' | 'ordered';
  orderSource: 'unknown' | 'warehouse' | 'online';
  weekNote: string | null;
  skippedUntil: string | null;
}

interface RelatedItem {
  cloverId: string;
  name: string;
  line: string;
  flavor: string;
  stockQuantity: number;
  priceCents: number | null;
  unitsSold7d: number;
  reason: string;
  score: number;
}

interface PriceVariant {
  cloverId: string;
  name: string;
  stockQuantity: number;
  priceCents: number | null;
}

interface Exclusion {
  clover_id: string;
  item_name: string;
  exclusion_type: 'permanent' | 'temporary';
  excluded_until: string | null;
  excluded_at: string;
}

interface WeekRun {
  week_id: string;
  week_start: string;
  week_end: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface LiveData {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  currentWeekId: string;
  selectedWeekId: string;
  isCurrentWeek: boolean;
  week: WeekRun | null;
  weeks: WeekRun[];
  salesDataAvailable: boolean;
  salesDataMessage: string | null;
  items: Item[];
  exclusions: Exclusion[];
}

type SortKey = 'name' | 'stock' | 'sold' | 'sold14' | 'sold30' | 'category' | 'brand' | 'price';
type SortDir = 'asc' | 'desc';
type TabId = 'lowstock' | 'all' | 'skipped' | 'ordered' | 'excluded';
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

function fmtWeek(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtMoney(cents: number | null) {
  if (cents === null || Number.isNaN(cents)) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function badge(bg: string, text: string, fg = '#fff'): React.ReactNode {
  return (
    <span style={{ background: bg, color: fg, padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' as const }}>
      {text}
    </span>
  );
}

function sourceLabel(source: Item['orderSource']) {
  if (source === 'warehouse') return 'Warehouse';
  if (source === 'online') return 'Online';
  return 'Unset';
}

function trendLabel(trend: Item['salesTrend']) {
  if (trend === 'up') return 'Up';
  if (trend === 'down') return 'Down';
  if (trend === 'new') return 'New';
  return 'Flat';
}

const CATEGORY_COLORS = [
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#2dd4bf',
  '#f97316',
  '#818cf8',
  '#84cc16',
];

function categoryColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
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

function NoteCell({ item, onSaved }: { item: Item; onSaved: (item: Item, note: string) => Promise<void> }) {
  const initialValue = item.weekNote ?? '';
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounced = useDebounce(value, 800);
  const initial = useRef(initialValue);

  useEffect(() => {
    const next = item.weekNote ?? '';
    initial.current = next;
    setValue(next);
  }, [item.cloverId, item.weekNote]);

  useEffect(() => {
    if (debounced === initial.current) return;
    setSaving(true);
    onSaved(item, debounced).then(() => {
      initial.current = debounced;
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
  const [weekNoteDraft, setWeekNoteDraft] = useState('');
  const [weekNoteDirty, setWeekNoteDirty] = useState(false);
  const initialWeekNote = useRef('');

  // ── UI state ──
  const [activeTab, setTab] = useState<TabId>('lowstock');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFound, setFilterFound] = useState('');
  const [filterNote, setFilterNote] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupBy, setGroupBy] = useState<GroupKey>('category');
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Load data ──

  const load = useCallback(async (showRefresh = false, weekId?: string) => {
    if (showRefresh) setRefreshing(true);
    try {
      const url = weekId
        ? `/api/admin/report/live?weekId=${encodeURIComponent(weekId)}`
        : '/api/admin/report/live';
      const res = await fetch(url);
      if (res.status === 401) { router.push('/admin/login'); return; }
      setData(await res.json() as LiveData);
    } catch { setActionMsg('Failed to load data.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever filters/sort/tab/pageSize change
  useEffect(() => { setCurrentPage(1); }, [search, filterCategory, filterBrand, filterStatus, filterFound, filterNote, filterSource, sortKey, sortDir, activeTab, pageSize, groupBy]);

  useEffect(() => {
    const note = data?.week?.note ?? '';
    initialWeekNote.current = note;
    setWeekNoteDraft(note);
    setWeekNoteDirty(false);
  }, [data?.selectedWeekId, data?.week?.note]);

  const debouncedWeekNote = useDebounce(weekNoteDraft, 900);

  useEffect(() => {
    if (!data?.selectedWeekId || !weekNoteDirty || debouncedWeekNote === initialWeekNote.current) return;

    fetch('/api/admin/report/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: data.selectedWeekId, note: debouncedWeekNote }),
    }).then((res) => {
      if (!res.ok) return;
      initialWeekNote.current = debouncedWeekNote;
      setWeekNoteDirty(false);
      setData((current) => current ? {
        ...current,
        week: current.week ? { ...current.week, note: debouncedWeekNote } : current.week,
        weeks: current.weeks.map((week) => week.week_id === current.selectedWeekId ? { ...week, note: debouncedWeekNote } : week),
      } : current);
    }).catch(() => setActionMsg('Failed to save week note.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedWeekNote, data?.selectedWeekId, weekNoteDirty]);

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

  async function updateWeekItem(item: Item, patch: Partial<Pick<Item, 'weekStatus' | 'orderSource' | 'weekNote'>>) {
    if (!data?.selectedWeekId) return;
    setBusy(item.cloverId, true);
    const nextStatus = patch.weekStatus ?? item.weekStatus;
    const nextSource = patch.orderSource ?? item.orderSource;
    const nextNote = patch.weekNote !== undefined ? patch.weekNote : item.weekNote;

    const res = await fetch('/api/admin/report/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekId: data.selectedWeekId,
        cloverId: item.cloverId,
        itemName: item.name,
        itemStatus: nextStatus,
        orderSource: nextSource,
        note: nextNote ?? '',
      }),
    });

    if (res.ok) {
      const json = await res.json() as { skippedUntil?: string | null };
      setData((current) => current ? {
        ...current,
        items: current.items.map((candidate) => candidate.cloverId === item.cloverId
          ? {
              ...candidate,
              weekStatus: nextStatus,
              orderSource: nextSource,
              weekNote: nextNote ?? null,
              skippedUntil: json.skippedUntil ?? null,
            }
          : candidate),
      } : current);
      if (patch.weekStatus === 'skipped') setActionMsg(`"${item.name}" moved to next week.`);
      if (patch.weekStatus === 'removed') setActionMsg(`"${item.name}" removed from this week.`);
      if (patch.weekStatus === 'ordered') setActionMsg(`"${item.name}" marked ordered.`);
    } else {
      setActionMsg('Failed to update weekly item.');
    }
    setBusy(item.cloverId, false);
  }

  async function handleWeekItemNoteSaved(item: Item, note: string) {
    await updateWeekItem(item, { weekNote: note });
  }

  async function clearWeekNotes() {
    if (!data?.selectedWeekId) return;
    const ok = window.confirm('Clear the week note and every item note for this selected week?');
    if (!ok) return;

    const res = await fetch('/api/admin/report/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekId: data.selectedWeekId, clearItemNotes: true }),
    });

    if (!res.ok) {
      setActionMsg('Failed to clear notes for this week.');
      return;
    }

    initialWeekNote.current = '';
    setWeekNoteDraft('');
    setWeekNoteDirty(false);
    setData((current) => current ? {
      ...current,
      week: current.week ? { ...current.week, note: null } : current.week,
      weeks: current.weeks.map((week) => week.week_id === current.selectedWeekId ? { ...week, note: null } : week),
      items: current.items.map((item) => ({ ...item, weekNote: '' })),
    } : current);
    setActionMsg('Cleared notes for this week.');
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
    else {
      setSortKey(key);
      setSortDir(['sold', 'sold14', 'sold30'].includes(key) ? 'desc' : 'asc');
    }
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
    if (activeTab === 'lowstock') {
      list = list.filter((i) =>
        !i.excluded &&
        i.weekStatus === 'active' &&
        (i.status === 'critical' || i.status === 'at-risk' || i.suggestedOrderQty > 0),
      );
    } else if (activeTab === 'all') {
      list = list.filter((i) => !i.excluded && i.weekStatus !== 'removed');
    } else if (activeTab === 'skipped') {
      list = list.filter((i) => !i.excluded && i.weekStatus === 'skipped');
    } else if (activeTab === 'ordered') {
      list = list.filter((i) => !i.excluded && i.weekStatus === 'ordered');
    }
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
        i.productLine?.toLowerCase().includes(q) ||
        i.flavorProfile?.toLowerCase().includes(q) ||
        i.weekNote?.toLowerCase().includes(q),
      );
    }
    if (filterCategory) list = list.filter((i) => i.category === filterCategory);
    if (filterBrand) list = list.filter((i) => i.brand === filterBrand);
    if (filterStatus) list = list.filter((i) => i.status === filterStatus);
    if (filterFound === 'found') list = list.filter((i) => i.foundInStore);
    if (filterFound === 'notfound') list = list.filter((i) => !i.foundInStore);
    if (filterSource) list = list.filter((i) => i.orderSource === filterSource);
    if (filterNote === 'has') list = list.filter((i) => (i.weekNote ?? '').trim().length > 0);
    if (filterNote === 'none') list = list.filter((i) => !(i.weekNote ?? '').trim());
    return list;
  }, [baseItems, search, filterCategory, filterBrand, filterStatus, filterFound, filterSource, filterNote]);

  const sorted = useMemo(() => {
    const statusOrder = { critical: 0, 'at-risk': 1, ok: 2 };
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
      else if (sortKey === 'stock') cmp = a.stockQuantity - b.stockQuantity;
      else if (sortKey === 'sold') cmp = a.unitsSold7d - b.unitsSold7d;
      else if (sortKey === 'sold14') cmp = a.unitsSold14d - b.unitsSold14d;
      else if (sortKey === 'sold30') cmp = a.unitsSold30d - b.unitsSold30d;
      else if (sortKey === 'price') cmp = (a.priceCents ?? -1) - (b.priceCents ?? -1);
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
  const orderListCount = allItems.filter((i) => !i.excluded && i.weekStatus === 'active' && (i.status !== 'ok' || i.suggestedOrderQty > 0)).length;
  const criticalCount = allItems.filter((i) => !i.excluded && i.weekStatus === 'active' && i.status === 'critical').length;
  const atRiskCount = allItems.filter((i) => !i.excluded && i.weekStatus === 'active' && i.status === 'at-risk').length;
  const skippedCount = allItems.filter((i) => !i.excluded && i.weekStatus === 'skipped').length;
  const orderedCount = allItems.filter((i) => !i.excluded && i.weekStatus === 'ordered').length;
  const priceSplitCount = allItems.filter((i) => !i.excluded && i.priceVariants.length > 0).length;
  const relatedCount = allItems.filter((i) => !i.excluded && (i.sameFlavorOtherLines.length > 0 || i.similarProducts.length > 0)).length;
  const withNotesCount = allItems.filter((i) => !i.excluded && (i.weekNote ?? '').trim().length > 0).length;
  const activeFilterCount =
    (search ? 1 : 0) +
    (filterCategory ? 1 : 0) +
    (filterBrand ? 1 : 0) +
    (filterStatus ? 1 : 0) +
    (filterFound ? 1 : 0) +
    (filterSource ? 1 : 0) +
    (filterNote ? 1 : 0) +
    (groupBy !== 'category' ? 1 : 0);

  // ── Styles ──

  const S = {
    page: { minHeight: '100vh', background: '#0f172a', color: '#f8fafc' } as React.CSSProperties,
    header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '58px', position: 'sticky' as const, top: 34, zIndex: 90 },
    btn: (bg: string, pad = '7px 14px'): React.CSSProperties => ({ background: bg, border: 'none', borderRadius: '7px', color: '#fff', fontWeight: 600, fontSize: '12px', padding: pad, cursor: 'pointer', whiteSpace: 'nowrap' as const }),
    ghostBtn: (): React.CSSProperties => ({ background: 'transparent', border: '1px solid #334155', borderRadius: '7px', color: '#94a3b8', fontWeight: 600, fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }),
    select: (active = false): React.CSSProperties => ({
      background: active ? '#312e81' : '#1e293b',
      border: `1px solid ${active ? '#7c3aed' : '#334155'}`,
      borderRadius: '7px',
      color: active ? '#ddd6fe' : '#e2e8f0',
      fontSize: '12px',
      padding: '6px 10px',
      outline: 'none',
      cursor: 'pointer',
      fontWeight: active ? 600 : 400,
    }),
    input: (active = false): React.CSSProperties => ({
      background: active ? '#312e81' : '#1e293b',
      border: `1px solid ${active ? '#7c3aed' : '#334155'}`,
      borderRadius: '7px',
      color: active ? '#ddd6fe' : '#e2e8f0',
      fontSize: '12px',
      padding: '6px 10px',
      outline: 'none',
      width: '220px',
    }),
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
          <button onClick={() => load(true, data?.selectedWeekId)} disabled={refreshing} style={S.ghostBtn()}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button onClick={sendReport} disabled={sendingReport} style={S.btn('#16a34a')}>
            {sendingReport ? 'Sending…' : '📧 Send Report'}
          </button>
          <button onClick={handleLogout} style={S.ghostBtn()}>Sign Out</button>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Week workspace ── */}
        {data && (
          <div className="admin-week-workspace" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'minmax(240px, 360px) 1fr', gap: '14px', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Buying Week
              </div>
              <select
                value={data.selectedWeekId}
                onChange={(event) => load(true, event.target.value)}
                style={{ ...S.select(true), width: '100%', marginBottom: '8px' }}
              >
                {data.weeks.map((week) => (
                  <option key={week.week_id} value={week.week_id}>
                    {week.week_id === data.currentWeekId ? 'Current: ' : ''}{fmtWeek(week.week_start)} - {fmtWeek(week.week_end)}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                <strong style={{ color: '#94a3b8' }}>{fmtDate(data.weekStart)}</strong>
                {' → '}
                <strong style={{ color: '#94a3b8' }}>{fmtDate(data.weekEnd)}</strong>
                <br />
                {data.isCurrentWeek ? 'Live Clover data' : 'Saved weekly snapshot'} · Generated {fmtDate(data.generatedAt)}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Week Note
                </div>
                <button
                  type="button"
                  onClick={clearWeekNotes}
                  style={{ ...S.ghostBtn(), padding: '4px 9px', fontSize: '11px' }}
                >
                  Clear Week Notes
                </button>
              </div>
              <textarea
                value={weekNoteDraft}
                onChange={(event) => { setWeekNoteDraft(event.target.value); setWeekNoteDirty(true); }}
                placeholder="Notes for this week's buying trip, warehouse run, online order, or vendor follow-up…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', padding: '9px 10px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        )}

        {/* ── Summary cards ── */}
        <div className="admin-summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'To Order', value: orderListCount, color: '#f8fafc', border: '#334155', onClick: () => { setTab('lowstock'); setSearch(''); setFilterCategory(''); setFilterBrand(''); setFilterStatus(''); setFilterFound(''); setFilterSource(''); setFilterNote(''); } },
            { label: '⚠ Critical Low', value: criticalCount, color: '#fbbf24', border: '#92400e', onClick: () => { setTab('all'); setFilterStatus('critical'); } },
            { label: '◎ Sold & Low', value: atRiskCount, color: '#818cf8', border: '#3730a3', onClick: () => { setTab('all'); setFilterStatus('at-risk'); } },
            { label: 'Price Splits', value: priceSplitCount, color: '#f472b6', border: '#831843', onClick: () => { setTab('all'); setSearch(''); setSortKey('price'); setSortDir('asc'); } },
            { label: 'Similar Found', value: relatedCount, color: '#38bdf8', border: '#075985', onClick: () => { setTab('all'); } },
            { label: 'Skipped', value: skippedCount, color: '#60a5fa', border: '#1e3a5f', onClick: () => setTab('skipped') },
            { label: 'Ordered', value: orderedCount, color: '#a78bfa', border: '#5b21b6', onClick: () => setTab('ordered') },
            { label: 'With Notes', value: withNotesCount, color: '#c084fc', border: '#581c87', onClick: () => { setTab('all'); setFilterNote('has'); } },
            { label: 'Excluded', value: activeExclusions.length, color: '#94a3b8', border: '#334155', onClick: () => setTab('excluded') },
          ].map(({ label, value, color, border, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              title={`Click to view: ${label}`}
              style={{ background: '#1e293b', borderRadius: '10px', border: `1px solid ${border}`, padding: '16px 20px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.1s, border-color 0.1s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
            >
              <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>{label}</div>
            </button>
          ))}
        </div>

        {/* ── Action message ── */}
        {actionMsg && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#0f4a1f', border: '1px solid #166534', borderRadius: '8px', color: '#86efac', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg('')} style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer', fontSize: '16px' }}>×</button>
          </div>
        )}

        {data && !data.salesDataAvailable && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#3b2606', border: '1px solid #92400e', borderRadius: '8px', color: '#fcd34d', fontSize: '13px', lineHeight: 1.45 }}>
            Sales counts are unavailable in this local preview. Add <code>CLOVER_MERCHANT_ID_TOKE</code> and <code>CLOVER_API_TOKEN_TOKE</code> to <code>.dev.vars</code>, then restart <code>npm run preview</code>.
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {badge('#831843', 'PRICE', '#fbcfe8')}
            <span style={{ color: '#94a3b8' }}>Same product appears with more than one Clover price</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {badge('#075985', 'MATCH', '#bae6fd')}
            <span style={{ color: '#94a3b8' }}>Similar flavors or same flavor in another product line</span>
          </span>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#1e293b', borderRadius: '9px', padding: '4px', border: '1px solid #334155', width: 'fit-content' }}>
          {([
            ['lowstock', `⚠ To Order (${orderListCount})`],
            ['all', `📦 All Items (${allItems.filter((i) => !i.excluded && i.weekStatus !== 'removed').length})`],
            ['skipped', `⏭ Skipped (${skippedCount})`],
            ['ordered', `✓ Ordered (${orderedCount})`],
            ['excluded', `⛔ Excluded (${activeExclusions.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSearch(''); setFilterCategory(''); setFilterBrand(''); setFilterStatus(''); setFilterFound(''); setFilterSource(''); }}
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
            <div className="admin-filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: '16px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px 14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginRight: '4px' }}>Filter</span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search name, brand, flavor, note…"
                style={S.input(!!search)}
              />

              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterBrand(''); }} style={S.select(!!filterCategory)}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={S.select(!!filterBrand)}>
                <option value="">All Brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>

              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={S.select(!!filterStatus)}>
                <option value="">All Statuses</option>
                <option value="critical">⚠ Critical</option>
                <option value="at-risk">◎ Watch</option>
                <option value="ok">✅ OK</option>
              </select>

              <select value={filterFound} onChange={(e) => setFilterFound(e.target.value)} style={S.select(!!filterFound)}>
                <option value="">All Found Status</option>
                <option value="found">✓ Found in Store</option>
                <option value="notfound">Not Verified</option>
              </select>

              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={S.select(!!filterSource)}>
                <option value="">All Sources</option>
                <option value="warehouse">Warehouse</option>
                <option value="online">Online</option>
                <option value="unknown">Unset source</option>
              </select>

              <select value={filterNote} onChange={(e) => setFilterNote(e.target.value)} style={S.select(!!filterNote)} title="Filter by notes">
                <option value="">All Notes</option>
                <option value="has">📝 Has note</option>
                <option value="none">No note</option>
              </select>

              {/* Visual divider — content filters above, view modifiers below */}
              <span aria-hidden style={{ width: '1px', height: '20px', background: '#334155', margin: '0 4px' }} />

              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupKey)} style={S.select(groupBy !== 'category')} title="Group rows by">
                {(Object.keys(GROUP_LABELS) as GroupKey[]).map((k) => (
                  <option key={k} value={k}>{k === 'none' ? GROUP_LABELS[k] : `Group: ${GROUP_LABELS[k]}`}</option>
                ))}
              </select>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSearch(''); setFilterCategory(''); setFilterBrand(''); setFilterStatus(''); setFilterFound(''); setFilterSource(''); setFilterNote(''); setGroupBy('category'); }}
                  style={{ ...S.btn('#7c2d12', '6px 12px'), border: '1px solid #9a3412' }}
                  title={`Reset ${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}`}
                >
                  ✕ Clear ({activeFilterCount})
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
              <div style={{ background: '#0f172a', borderRadius: '10px', border: '1px solid #334155', overflow: 'auto' }}>
                <table className="inv-tbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      <th onClick={() => toggleSort('name')} style={S.th(true)}>Item {sortArrow('name')}</th>
                      <th onClick={() => toggleSort('category')} style={S.th(true)}>Category {sortArrow('category')}</th>
                      <th onClick={() => toggleSort('brand')} style={S.th(true)}>Brand {sortArrow('brand')}</th>
                      <th onClick={() => toggleSort('price')} style={{ ...S.th(true), textAlign: 'center' }}>Price {sortArrow('price')}</th>
                      <th onClick={() => toggleSort('stock')} style={{ ...S.th(true), textAlign: 'center' }}>Stock {sortArrow('stock')}</th>
                      <th onClick={() => toggleSort('sold')} style={{ ...S.th(true), textAlign: 'center' }}>Sold 7d {sortArrow('sold')}</th>
                      <th onClick={() => toggleSort('sold14')} style={{ ...S.th(true), textAlign: 'center' }}>Sold 14d {sortArrow('sold14')}</th>
                      <th onClick={() => toggleSort('sold30')} style={{ ...S.th(true), textAlign: 'center' }}>Sold 30d {sortArrow('sold30')}</th>
                      <th style={S.th()}>Matches</th>
                      <th style={S.th()}>Source</th>
                      <th style={S.th()}>Note</th>
                      <th style={{ ...S.th(), textAlign: 'center' }}>Found</th>
                      <th style={{ ...S.th(), textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const renderRow = (item: Item) => {
                        const busy = busyIds.has(item.cloverId);
                        const hasMatches = item.sameFlavorOtherLines.length > 0 || item.similarProducts.length > 0 || item.priceVariants.length > 0;
                        const rowBg = item.weekStatus === 'ordered'
                          ? '#071a0d'
                          : item.weekStatus === 'skipped'
                            ? '#111827'
                            : item.foundInStore
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
                                {item.weekStatus === 'ordered' && badge('#14532d', 'ORDERED', '#bbf7d0')}
                                {item.weekStatus === 'skipped' && badge('#1e3a5f', 'NEXT WEEK', '#bfdbfe')}
                              </div>
                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                              {item.productLine} · {item.flavorProfile}
                            </div>
                          </td>
                            <td style={S.td({ color: '#64748b', fontSize: '12px' })}>{item.category ?? '—'}</td>
                            <td style={S.td({ color: '#64748b', fontSize: '12px' })}>{item.brand ?? '—'}</td>
                            <td style={S.td({ textAlign: 'center', color: item.priceVariants.length > 0 ? '#f9a8d4' : '#94a3b8', fontWeight: item.priceVariants.length > 0 ? 700 : 400 })}>
                              {fmtMoney(item.priceCents)}
                              {item.priceVariants.length > 0 && (
                                <div style={{ marginTop: '3px' }}>{badge('#831843', 'PRICE', '#fbcfe8')}</div>
                              )}
                            </td>
                            <td style={S.td({ textAlign: 'center' })}>
                              {item.stockQuantity <= 0
                                ? badge('#374151', 'OUT', '#d1d5db')
                                : item.status === 'critical'
                                  ? badge('#92400e', String(item.stockQuantity), '#fcd34d')
                                  : item.status === 'at-risk'
                                    ? badge('#312e81', String(item.stockQuantity), '#a5b4fc')
                                    : <span style={{ color: '#94a3b8' }}>{item.stockQuantity}</span>}
                            </td>
                            <td style={S.td({ textAlign: 'center', color: item.unitsSold7d > 0 ? '#a78bfa' : '#334155', fontWeight: item.unitsSold7d > 0 ? 700 : 400 })}>
                              <div>{item.unitsSold7d > 0 ? item.unitsSold7d : '—'}</div>
                              {item.unitsSold7d > 0 && <div style={{ fontSize: '10px', color: item.salesTrend === 'up' || item.salesTrend === 'new' ? '#34d399' : '#64748b', marginTop: '2px' }}>{trendLabel(item.salesTrend)}</div>}
                            </td>
                            <td style={S.td({ textAlign: 'center', color: item.unitsSold14d > 0 ? '#94a3b8' : '#334155', fontWeight: item.unitsSold14d > 0 ? 600 : 400 })}>
                              {item.unitsSold14d > 0 ? item.unitsSold14d : '—'}
                            </td>
                            <td style={S.td({ textAlign: 'center', color: item.unitsSold30d > 0 ? '#c4b5fd' : '#334155', fontWeight: item.unitsSold30d > 0 ? 700 : 400 })}>
                              {item.unitsSold30d > 0 ? item.unitsSold30d : '—'}
                            </td>
                            <td style={S.td({ minWidth: '220px' })}>
                              {!hasMatches ? (
                                <span style={{ color: '#334155' }}>—</span>
                              ) : (
                                <details>
                                  <summary style={{ cursor: 'pointer', color: '#bae6fd', fontSize: '12px', fontWeight: 700 }}>
                                    {item.priceVariants.length > 0 && <span style={{ marginRight: '5px' }}>{badge('#831843', `${item.priceVariants.length} price`, '#fbcfe8')}</span>}
                                    {item.sameFlavorOtherLines.length > 0 && <span style={{ marginRight: '5px' }}>{badge('#075985', `${item.sameFlavorOtherLines.length} line`, '#bae6fd')}</span>}
                                    {item.similarProducts.length > 0 && badge('#312e81', `${item.similarProducts.length} similar`, '#c4b5fd')}
                                  </summary>
                                  <div style={{ marginTop: '8px', display: 'grid', gap: '7px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.35 }}>
                                    {item.priceVariants.map((variant) => (
                                      <div key={`p-${variant.cloverId}`}>
                                        <strong style={{ color: '#f9a8d4' }}>{fmtMoney(variant.priceCents)}</strong> · {variant.name} · stock {variant.stockQuantity}
                                      </div>
                                    ))}
                                    {item.sameFlavorOtherLines.map((match) => (
                                      <div key={`l-${match.cloverId}`}>
                                        <strong style={{ color: '#bae6fd' }}>{match.name}</strong> · {match.reason} · stock {match.stockQuantity}
                                      </div>
                                    ))}
                                    {item.similarProducts.slice(0, 3).map((match) => (
                                      <div key={`s-${match.cloverId}`}>
                                        <strong style={{ color: '#c4b5fd' }}>{match.name}</strong> · {match.reason} · sold 7d {match.unitsSold7d || '—'}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </td>
                            <td style={S.td({ minWidth: '120px' })}>
                              <select
                                value={item.orderSource}
                                disabled={busy}
                                onChange={(e) => updateWeekItem(item, { orderSource: e.target.value as Item['orderSource'] })}
                                title={`Order source: ${sourceLabel(item.orderSource)}`}
                                style={{ ...S.select(item.orderSource !== 'unknown'), width: '100%', opacity: busy ? 0.5 : 1 }}
                              >
                                <option value="unknown">Unset</option>
                                <option value="warehouse">Warehouse</option>
                                <option value="online">Online</option>
                              </select>
                            </td>
                            <td style={S.td({ minWidth: '160px' })}>
                              <NoteCell item={item} onSaved={handleWeekItemNoteSaved} />
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
                              <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', flexWrap: 'wrap' as const, minWidth: '230px' }}>
                                <button disabled={busy} onClick={() => updateWeekItem(item, { weekStatus: item.weekStatus === 'active' ? 'ordered' : 'active' })} style={{ ...S.btn(item.weekStatus === 'active' ? '#14532d' : '#334155', '5px 9px'), fontSize: '11px', opacity: busy ? 0.5 : 1 }}>
                                  {busy ? '…' : item.weekStatus === 'active' ? 'Ordered' : 'Active'}
                                </button>
                                <button disabled={busy} onClick={() => updateWeekItem(item, { weekStatus: 'skipped' })} style={{ ...S.btn('#1e3a5f', '5px 9px'), fontSize: '11px', opacity: busy ? 0.5 : 1 }}>
                                  {busy ? '…' : 'Next week'}
                                </button>
                                <button disabled={busy} onClick={() => updateWeekItem(item, { weekStatus: 'removed' })} style={{ ...S.btn('#7c2d12', '5px 9px'), fontSize: '11px', opacity: busy ? 0.5 : 1 }}>
                                  {busy ? '…' : 'Remove wk'}
                                </button>
                                <button disabled={busy} onClick={() => exclude(item, 'temporary')} style={{ ...S.btn('#334155', '5px 9px'), fontSize: '11px', opacity: busy ? 0.5 : 1 }}>
                                  {busy ? '…' : 'Hide 8d'}
                                </button>
                                <button disabled={busy} onClick={() => exclude(item, 'permanent')} style={{ ...S.btn('#374151', '5px 9px'), fontSize: '11px', opacity: busy ? 0.5 : 1 }}>
                                  {busy ? '…' : 'Exclude'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      };

                      if (groupBy === 'none') return paginatedItems.map(renderRow);

                      return groups.flatMap(([groupKey, items]) => {
                        const accent = groupBy === 'category' ? categoryColor(groupKey) : '#a78bfa';
                        return [
                          <tr key={`__group_${groupKey}`} style={{ background: '#0a1222' }}>
                            <td colSpan={13} style={{ padding: 0, borderTop: `2px solid ${accent}`, borderBottom: '1px solid #1e293b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px', borderLeft: `6px solid ${accent}` }}>
                                <span aria-hidden style={{ width: '12px', height: '12px', borderRadius: '999px', background: accent, boxShadow: `0 0 16px ${accent}66`, flex: '0 0 auto' }} />
                                <span style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                  {groupKey}
                                </span>
                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
                                  {items.length} item{items.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </td>
                          </tr>,
                          ...items.map(renderRow),
                        ];
                      });
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

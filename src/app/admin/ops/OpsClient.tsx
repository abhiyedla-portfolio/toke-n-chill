'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────

interface StoreSchedule {
  store_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: number;
}

interface StoreDailyStatus {
  store_id: string;
  date: string;
  first_order_at: string | null;
  last_order_at: string | null;
  opened_on_time: number | null;
  closed_on_time: number | null;
  open_alert_sent: number;
  close_alert_sent: number;
  updated_at: string;
}

interface EmployeeShift {
  shift_id: string;
  store_id: string;
  employee_id: string;
  employee_name: string;
  shift_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  late_alert_sent: number;
}

interface OpsAlert {
  id: number;
  store_id: string | null;
  alert_type: string;
  message: string;
  channel: string;
  sent_at: string;
}

interface StoreStatus {
  storeId: string;
  todayDate: string;
  schedule: StoreSchedule | null;
  dailyStatus: StoreDailyStatus | null;
  todayShifts: EmployeeShift[];
  recentStatuses: StoreDailyStatus[];
}

interface OpsStatusResponse {
  stores: StoreStatus[];
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STORE_LABELS: Record<string, string> = {
  toke: 'Toke-N-Chill',
  dizzy: 'Dizzy Dose',
};

const ALERT_TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  late_open:     { emoji: '🔴', label: 'Late Open',     color: '#ef4444' },
  no_close:      { emoji: '🟡', label: 'Not Closed',    color: '#f59e0b' },
  store_opened:  { emoji: '✅', label: 'Opened',        color: '#22c55e' },
  employee_late: { emoji: '🟠', label: 'Employee Late', color: '#f97316' },
  no_show:       { emoji: '⛔', label: 'No Show',       color: '#dc2626' },
  refund:        { emoji: '💸', label: 'Refund Alert',  color: '#a855f7' },
  void:          { emoji: '🚨', label: 'Void Alert',    color: '#ec4899' },
};

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function minutesSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
}

// ── Styles ────────────────────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#f8fafc' } as React.CSSProperties,
  header: {
    background: '#1e293b', borderBottom: '1px solid #334155',
    padding: '0 28px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', height: '58px',
    position: 'sticky' as const, top: 0, zIndex: 10,
  },
  nav: { display: 'flex', gap: '4px' },
  navBtn: (active: boolean): React.CSSProperties => ({
    background: active ? '#6d28d9' : 'transparent',
    border: `1px solid ${active ? '#6d28d9' : '#334155'}`,
    borderRadius: '7px', color: active ? '#fff' : '#94a3b8',
    fontWeight: 600, fontSize: '12px', padding: '6px 14px', cursor: 'pointer',
  }),
  btn: (bg: string): React.CSSProperties => ({
    background: bg, border: 'none', borderRadius: '7px', color: '#fff',
    fontWeight: 600, fontSize: '12px', padding: '7px 14px', cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }),
  ghostBtn: (): React.CSSProperties => ({
    background: 'transparent', border: '1px solid #334155',
    borderRadius: '7px', color: '#94a3b8', fontWeight: 600,
    fontSize: '12px', padding: '6px 12px', cursor: 'pointer',
  }),
  card: (border = '#334155'): React.CSSProperties => ({
    background: '#1e293b', borderRadius: '12px',
    border: `1px solid ${border}`, padding: '18px 20px',
  }),
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#64748b' } as React.CSSProperties,
  val: { fontSize: '22px', fontWeight: 800 } as React.CSSProperties,
  select: (): React.CSSProperties => ({
    background: '#1e293b', border: '1px solid #334155', borderRadius: '7px',
    color: '#e2e8f0', fontSize: '12px', padding: '6px 10px', outline: 'none',
  }),
  input: (w = '80px'): React.CSSProperties => ({
    background: '#1e293b', border: '1px solid #334155', borderRadius: '6px',
    color: '#e2e8f0', fontSize: '12px', padding: '5px 8px', width: w, outline: 'none',
  }),
};

// ── Main component ────────────────────────────────────────────

type Tab = 'overview' | 'attendance' | 'alerts' | 'schedule';

export default function OpsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<OpsStatusResponse | null>(null);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [schedule, setSchedule] = useState<StoreSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Local editable schedule state
  const [editSchedule, setEditSchedule] = useState<StoreSchedule[]>([]);

  const loadAll = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const [statusRes, alertsRes, schedRes] = await Promise.all([
        fetch('/api/ops/status'),
        fetch('/api/ops/alerts?limit=50'),
        fetch('/api/ops/schedule?storeId=toke'),
      ]);

      if (statusRes.status === 401) { router.push('/admin/login'); return; }

      const [statusData, alertsData, schedData] = await Promise.all([
        statusRes.json() as Promise<OpsStatusResponse>,
        alertsRes.json() as Promise<{ alerts: OpsAlert[] }>,
        schedRes.json() as Promise<{ schedule: StoreSchedule[] }>,
      ]);

      setStatus(statusData);
      setAlerts(alertsData.alerts ?? []);
      setSchedule(schedData.schedule ?? []);
      setEditSchedule(
        (schedData.schedule ?? []).map((s) => ({ ...s })),
      );
    } catch {
      setMsg('Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function saveSchedule() {
    setScheduleSaving(true);
    try {
      const res = await fetch('/api/ops/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'toke',
          days: editSchedule.map((s) => ({
            dayOfWeek: s.day_of_week,
            openTime: s.open_time,
            closeTime: s.close_time,
            isClosed: s.is_closed === 1,
          })),
        }),
      });
      if (res.ok) {
        setMsg('✓ Schedule saved!');
        await loadAll();
      } else {
        setMsg('Failed to save schedule.');
      }
    } finally {
      setScheduleSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  }

  function updateScheduleDay(
    dow: number,
    field: 'open_time' | 'close_time' | 'is_closed',
    value: string | number,
  ) {
    setEditSchedule((prev) =>
      prev.map((s) => s.day_of_week === dow ? { ...s, [field]: value } : s),
    );
  }

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#64748b' }}>Loading operations data…</span>
      </div>
    );
  }

  const storeData = status?.stores[0] ?? null;

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>
            🏪 Store Operations
          </div>
          <nav style={S.nav}>
            {(['overview', 'attendance', 'alerts', 'schedule'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} style={S.navBtn(activeTab === t)}>
                {{ overview: '📊 Overview', attendance: '👥 Attendance', alerts: '🔔 Alerts', schedule: '📅 Schedule' }[t]}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => loadAll(true)} disabled={refreshing} style={S.ghostBtn()}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <a href="/admin" style={{ ...S.ghostBtn(), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            ← Inventory
          </a>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Status message ── */}
        {msg && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#0f4a1f', border: '1px solid #166534', borderRadius: '8px', color: '#86efac', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{msg}</span>
            <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer', fontSize: '16px' }}>×</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'overview' && storeData && (
          <OverviewTab store={storeData} alerts={alerts.slice(0, 5)} />
        )}

        {activeTab === 'attendance' && storeData && (
          <AttendanceTab store={storeData} />
        )}

        {activeTab === 'alerts' && (
          <AlertsTab alerts={alerts} onRefresh={() => loadAll(true)} />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            editSchedule={editSchedule}
            onUpdate={updateScheduleDay}
            onSave={saveSchedule}
            saving={scheduleSaving}
          />
        )}

      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────

function OverviewTab({ store, alerts }: { store: StoreStatus; alerts: OpsAlert[] }) {
  const ds = store.dailyStatus;
  const sch = store.schedule;

  // Derive current status
  const isOpen = !!ds?.first_order_at && !ds.closed_on_time;
  const openedOnTime = ds?.opened_on_time === 1;
  const hasOrders = !!ds?.first_order_at;

  const storeColor = isOpen ? '#22c55e' : hasOrders ? '#f59e0b' : '#64748b';
  const storeLabel = isOpen ? 'OPEN' : hasOrders ? 'CLOSED' : 'NO DATA';

  const todayAttendance = store.todayShifts;
  const clockedIn = todayAttendance.filter((s) => s.clock_in_at && !s.clock_out_at).length;
  const clockedOut = todayAttendance.filter((s) => s.clock_out_at).length;
  const lateCount = todayAttendance.filter((s) => s.late_alert_sent).length;

  const todayAlertCount = alerts.filter((a) => a.sent_at.startsWith(store.todayDate)).length;

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
        {STORE_LABELS[store.storeId] ?? store.storeId} · {fmtDateTime(new Date().toISOString())}
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <KpiCard
          label="Store Status"
          value={storeLabel}
          color={storeColor}
          sub={hasOrders ? `First order: ${fmtTime(ds?.first_order_at ?? null)}` : (sch ? `Expected open: ${sch.open_time}` : '')}
        />
        <KpiCard
          label="Staff Clocked In"
          value={String(clockedIn)}
          color={clockedIn > 0 ? '#22c55e' : '#ef4444'}
          sub={`${clockedOut} clocked out · ${lateCount} late`}
        />
        <KpiCard
          label="Today's Alerts"
          value={String(todayAlertCount)}
          color={todayAlertCount > 0 ? '#f59e0b' : '#22c55e'}
          sub={todayAlertCount > 0 ? 'See Alerts tab' : 'All clear'}
        />
        <KpiCard
          label="Last Order"
          value={fmtTime(ds?.last_order_at ?? null)}
          color="#94a3b8"
          sub={ds?.last_order_at ? `${minutesSince(ds.last_order_at)} min ago` : '—'}
        />
      </div>

      {/* ── 7-day history ── */}
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        7-Day Open/Close History
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '28px' }}>
        {store.recentStatuses.slice(0, 7).map((rs) => {
          const dot = rs.opened_on_time === 1 ? '#22c55e' : rs.opened_on_time === 0 ? '#ef4444' : '#334155';
          return (
            <div key={rs.date} style={{ ...S.card(), textAlign: 'center', padding: '12px 8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                {new Date(rs.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: dot, margin: '0 auto 4px' }} />
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {rs.first_order_at ? fmtTime(rs.first_order_at) : 'No data'}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recent alerts ── */}
      {alerts.length > 0 && (
        <>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recent Alerts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map((a) => <AlertRow key={a.id} alert={a} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ── Attendance Tab ────────────────────────────────────────────

function AttendanceTab({ store }: { store: StoreStatus }) {
  const shifts = store.todayShifts;

  if (shifts.length === 0) {
    return (
      <div style={{ ...S.card(), textAlign: 'center', padding: '60px', color: '#64748b' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
        <div style={{ fontWeight: 600 }}>No shifts recorded yet today</div>
        <div style={{ fontSize: '12px', marginTop: '6px' }}>
          Clover shifts sync every 15 minutes via the automation cron.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
        {shifts.length} shift{shifts.length !== 1 ? 's' : ''} recorded for {store.todayDate}
      </div>

      <div style={{ ...S.card(), overflow: 'hidden', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Employee', 'Clock In', 'Clock Out', 'Duration', 'Status'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', borderBottom: '1px solid #334155' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => {
              const clockInMs = shift.clock_in_at ? new Date(shift.clock_in_at).getTime() : null;
              const clockOutMs = shift.clock_out_at ? new Date(shift.clock_out_at).getTime() : null;
              const durationMs = clockInMs ? (clockOutMs ?? Date.now()) - clockInMs : null;
              const durationHrs = durationMs ? (durationMs / 3_600_000).toFixed(1) : null;

              const isWorking = !!clockInMs && !clockOutMs;
              const isLate = !!shift.late_alert_sent;

              const statusColor = isLate ? '#f97316' : isWorking ? '#22c55e' : clockOutMs ? '#64748b' : '#ef4444';
              const statusLabel = isLate ? 'Late' : isWorking ? 'Working' : clockOutMs ? 'Done' : 'Not in';

              return (
                <tr key={shift.shift_id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '12px 14px', color: '#f8fafc', fontWeight: 600 }}>
                    {shift.employee_name}
                  </td>
                  <td style={{ padding: '12px 14px', color: clockInMs ? '#86efac' : '#64748b' }}>
                    {fmtTime(shift.clock_in_at)}
                  </td>
                  <td style={{ padding: '12px 14px', color: clockOutMs ? '#94a3b8' : '#64748b' }}>
                    {fmtTime(shift.clock_out_at)}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                    {durationHrs ? `${durationHrs}h` : '—'}
                    {isWorking && <span style={{ fontSize: '10px', color: '#22c55e', marginLeft: '4px' }}>live</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: statusColor + '22', color: statusColor, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Alerts Tab ────────────────────────────────────────────────

function AlertsTab({ alerts, onRefresh }: { alerts: OpsAlert[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? alerts.filter((a) => a.alert_type === filter)
    : alerts;

  const alertTypes = Array.from(new Set(alerts.map((a) => a.alert_type)));

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={S.select()}>
          <option value="">All Types ({alerts.length})</option>
          {alertTypes.map((t) => (
            <option key={t} value={t}>
              {ALERT_TYPE_META[t]?.emoji} {ALERT_TYPE_META[t]?.label ?? t} ({alerts.filter((a) => a.alert_type === t).length})
            </option>
          ))}
        </select>
        <button onClick={onRefresh} style={S.ghostBtn()}>↻ Refresh</button>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
          {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...S.card(), textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
          <div>No alerts yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((a) => <AlertRow key={a.id} alert={a} expanded />)}
        </div>
      )}
    </div>
  );
}

// ── Schedule Tab ──────────────────────────────────────────────

function ScheduleTab({
  editSchedule,
  onUpdate,
  onSave,
  saving,
}: {
  editSchedule: StoreSchedule[];
  onUpdate: (dow: number, field: 'open_time' | 'close_time' | 'is_closed', value: string | number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  // Ensure all 7 days exist — fill missing with defaults
  const rows = Array.from({ length: 7 }, (_, dow) => {
    const existing = editSchedule.find((s) => s.day_of_week === dow);
    return existing ?? { store_id: 'toke', day_of_week: dow, open_time: '10:00', close_time: '21:00', is_closed: dow === 0 ? 1 : 0, updated_at: '' };
  });

  return (
    <div style={{ maxWidth: '600px' }}>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
        Set expected open/close times for each day. The automation engine uses these to detect late openings and send alerts.
        Grace periods: <strong style={{ color: '#f8fafc' }}>30 min</strong> for open/close, <strong style={{ color: '#f8fafc' }}>20 min</strong> for employee clock-in.
      </p>

      <div style={{ ...S.card(), padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Day', 'Open Time', 'Close Time', 'Closed'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', borderBottom: '1px solid #334155' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.day_of_week} style={{ borderBottom: '1px solid #1e293b', opacity: row.is_closed ? 0.4 : 1 }}>
                <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 600 }}>
                  {DAY_FULL[row.day_of_week]}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <input
                    type="time"
                    value={row.open_time}
                    disabled={row.is_closed === 1}
                    onChange={(e) => onUpdate(row.day_of_week, 'open_time', e.target.value)}
                    style={S.input('100px')}
                  />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <input
                    type="time"
                    value={row.close_time}
                    disabled={row.is_closed === 1}
                    onChange={(e) => onUpdate(row.day_of_week, 'close_time', e.target.value)}
                    style={S.input('100px')}
                  />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <input
                    type="checkbox"
                    checked={row.is_closed === 1}
                    onChange={(e) => onUpdate(row.day_of_week, 'is_closed', e.target.checked ? 1 : 0)}
                    style={{ width: '16px', height: '16px', accentColor: '#6d28d9', cursor: 'pointer' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onSave} disabled={saving} style={S.btn('#6d28d9')}>
          {saving ? 'Saving…' : '💾 Save Schedule'}
        </button>
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ ...S.card(), textAlign: 'center' }}>
      <div style={S.label}>{label}</div>
      <div style={{ ...S.val, color, marginTop: '6px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function AlertRow({ alert, expanded = false }: { alert: OpsAlert; expanded?: boolean }) {
  const meta = ALERT_TYPE_META[alert.alert_type] ?? { emoji: '📢', label: alert.alert_type, color: '#94a3b8' };
  const [showFull, setShowFull] = useState(false);

  // Strip HTML tags for display
  const plain = alert.message.replace(/<b>(.*?)<\/b>/g, '$1').replace(/<[^>]+>/g, '');
  const preview = plain.split('\n').slice(0, 2).join(' · ');

  return (
    <div
      style={{ ...S.card(meta.color + '44'), cursor: 'pointer' }}
      onClick={() => setShowFull((v) => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{meta.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: meta.color }}>
              {meta.label}
            </span>
            {alert.store_id && (
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {STORE_LABELS[alert.store_id] ?? alert.store_id}
              </span>
            )}
            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto', flexShrink: 0 }}>
              {fmtDateTime(alert.sent_at)}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}
          </div>
        </div>
        <span style={{ fontSize: '10px', color: '#475569', flexShrink: 0 }}>{showFull ? '▲' : '▼'}</span>
      </div>

      {showFull && (
        <pre style={{ marginTop: '12px', padding: '12px', background: '#0f172a', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
          {plain}
        </pre>
      )}
    </div>
  );
}

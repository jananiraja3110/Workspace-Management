import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Play, Square, Timer, Trash2,
  LayoutGrid, List, Plus,
} from 'lucide-react';
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO,
} from 'date-fns';

// ── helpers ──────────────────────────────────────────────────────────────────

const DAY_TARGET  = 480;   // 8h in minutes
const WEEK_TARGET = 2400;  // 40h in minutes

function fmtMins(total) {
  const m = Math.max(0, Math.round(total));
  if (!m) return '0h';
  return `${(m / 60).toFixed(1)}h`;
}

function fmtTimer(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function elapsedSecs(startedAt) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function mondayOf(date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function weekKey(monday) {
  return format(monday, 'yyyy-MM-dd');
}

function rangeLabel(monday) {
  return `${format(monday, 'MMM d')} – ${format(addDays(monday, 6), 'MMM d, yyyy')}`;
}

function dayLabel(d) {
  return { weekday: format(d, 'EEE'), day: format(d, 'MMM d') };
}

const STATUS_DOT = {
  pending:       'bg-slate-400',
  todo:          'bg-purple-500',
  'in-progress': 'bg-amber-500',
  completed:     'bg-emerald-500',
  overdue:       'bg-red-500',
};

// ── Progress bar ──────────────────────────────────────────────────────────────

function Bar({ value, target, className = '' }) {
  const pct = Math.min(value / target, 1) * 100;
  const over = value > target;
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600 ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-indigo-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Editable cell ────────────────────────────────────────────────────────────

function TimeCell({ minutes, isToday, disabled, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const current = minutes > 0 ? fmtMins(minutes) : '';

  function begin() {
    if (disabled) return;
    setDraft(current);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const raw = draft.trim();
    if (raw === current) return;
    onCommit(raw);
  }

  if (editing) {
    return (
      <td className={`p-0 ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
            if (e.key === 'Escape') { setDraft(current); setEditing(false); }
          }}
          onFocus={e => e.target.select()}
          placeholder="0h"
          className="h-12 w-full bg-white dark:bg-slate-700 px-2 text-center text-sm tabular-nums outline-none ring-2 ring-inset ring-indigo-500"
        />
      </td>
    );
  }

  return (
    <td
      onClick={begin}
      className={[
        'h-12 cursor-pointer px-2 text-center align-middle tabular-nums text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
        minutes === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100',
        isToday ? (minutes > 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'bg-indigo-50/50 dark:bg-indigo-900/10') : '',
      ].join(' ')}
    >
      {minutes > 0 ? fmtMins(minutes) : '—'}
    </td>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TimesheetPage() {
  const { user } = useAuth();

  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [running, setRunning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [view, setView] = useState('grid');
  const [extraTaskIds, setExtraTaskIds] = useState([]);
  const [addSel, setAddSel] = useState('');
  const [startTaskId, setStartTaskId] = useState('');

  // live timer tick
  const [timerSecs, setTimerSecs] = useState(0);
  const timerInterval = useRef(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = mondayOf(new Date());
  const isThisWeek = weekKey(monday) === weekKey(today);

  // ── fetch data ─────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, runningRes, tasksRes] = await Promise.all([
        API.get(`/timeentries?week=${weekKey(monday)}`),
        API.get('/timeentries/running'),
        API.get('/timeentries/tasks'),
      ]);
      setEntries(entriesRes.data.entries || []);
      const r = runningRes.data.running;
      setRunning(r || null);
      if (r) setTimerSecs(elapsedSecs(r.startedAt));
      setTasks(tasksRes.data.tasks || []);
    } catch {
      toast.error('Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  }, [monday]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── timer tick ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (running) {
      timerInterval.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    } else {
      clearInterval(timerInterval.current);
    }
    return () => clearInterval(timerInterval.current);
  }, [running?._id]);

  // ── week nav ───────────────────────────────────────────────────────────────

  function goWeek(fn) { setMonday(fn); setExtraTaskIds([]); }

  // ── timer actions ──────────────────────────────────────────────────────────

  async function handleStart() {
    setPending(true);
    try {
      await API.post('/timeentries/start', { taskId: startTaskId || null });
      toast.success('Timer started');
      setStartTaskId('');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start timer');
    } finally { setPending(false); }
  }

  async function handleStop() {
    setPending(true);
    try {
      await API.post('/timeentries/stop');
      toast.success('Timer stopped');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to stop timer');
    } finally { setPending(false); }
  }

  // ── cell commit ────────────────────────────────────────────────────────────

  async function commitCell(taskId, date, raw) {
    setPending(true);
    try {
      await API.put('/timeentries/cell', { taskId: taskId || null, date, value: raw });
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid duration');
    } finally { setPending(false); }
  }

  // ── delete entry ──────────────────────────────────────────────────────────

  async function handleDelete(id) {
    setPending(true);
    try {
      await API.delete(`/timeentries/${id}`);
      toast.success('Entry deleted');
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setPending(false); }
  }

  // ── grid aggregation ──────────────────────────────────────────────────────

  const committedByKey = {};
  const dayTotals = {};
  let grandTotal = 0;
  for (const d of days) dayTotals[format(d, 'yyyy-MM-dd')] = 0;

  for (const e of entries) {
    if (e.startedAt && !e.endedAt) continue; // skip running
    const key = e.task?._id || '__none__';
    const dateStr = format(parseISO(e.date), 'yyyy-MM-dd');
    if (!committedByKey[key]) {
      committedByKey[key] = {
        taskId: e.task?._id || null,
        title: e.task?.title || 'No task',
        status: e.task?.status || null,
        perDay: Object.fromEntries(days.map(d => [format(d, 'yyyy-MM-dd'), 0])),
        total: 0,
      };
    }
    if (dateStr in committedByKey[key].perDay) {
      committedByKey[key].perDay[dateStr] += e.minutes;
      committedByKey[key].total += e.minutes;
      dayTotals[dateStr] = (dayTotals[dateStr] || 0) + e.minutes;
      grandTotal += e.minutes;
    }
  }

  const taskMeta = Object.fromEntries(tasks.map(t => [t._id, t]));

  // rows = committed + extra added by user
  const allKeys = new Set([...Object.keys(committedByKey), ...extraTaskIds]);
  const rows = Array.from(allKeys).map(key => {
    const committed = committedByKey[key];
    const taskId = key === '__none__' ? null : key;
    const meta = taskId ? taskMeta[taskId] : null;
    return {
      key,
      taskId,
      title: committed?.title ?? meta?.title ?? (taskId ? 'Task' : 'No task'),
      status: committed?.status ?? meta?.status ?? null,
      perDay: committed?.perDay ?? Object.fromEntries(days.map(d => [format(d, 'yyyy-MM-dd'), 0])),
      total: committed?.total ?? 0,
    };
  }).sort((a, b) => {
    if (!a.taskId) return 1;
    if (!b.taskId) return -1;
    return a.title.localeCompare(b.title);
  });

  const presentKeys = new Set(rows.map(r => r.key));
  const addableTasks = tasks.filter(t => !presentKeys.has(t._id));
  const canAddNoTask = !presentKeys.has('__none__');

  function addRow(val) {
    if (!val) return;
    setExtraTaskIds(prev => [...new Set([...prev, val])]);
    setAddSel('');
  }

  const weekPct = Math.min(100, Math.round((grandTotal / WEEK_TARGET) * 100));

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goWeek(m => subWeeks(m, 1))}
            disabled={pending}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => goWeek(m => addWeeks(m, 1))}
            disabled={pending}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 px-1">
            {rangeLabel(monday)}
          </h2>
          <button
            onClick={() => goWeek(() => mondayOf(new Date()))}
            disabled={pending}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
              isThisWeek
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            This week
          </button>
        </div>

        {/* View toggle */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-sm">
          {[['grid', 'Timesheet', LayoutGrid], ['list', 'Time entries', List]].map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                view === v
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly progress */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-2">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Weekly progress</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {fmtMins(grandTotal)} / 40h &nbsp;·&nbsp; {weekPct}%
          </span>
        </div>
        <Bar value={grandTotal} target={WEEK_TARGET} />
      </div>

      {/* Timer */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Timer className="w-4 h-4 text-indigo-500" />
          Timer
        </div>

        {running ? (
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {running.task?.title || 'No task'}
            </span>
            <span className="font-mono text-xl font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
              {fmtTimer(timerSecs)}
            </span>
            <button
              onClick={handleStop}
              disabled={pending}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <select
              value={startTaskId}
              onChange={e => setStartTaskId(e.target.value)}
              disabled={pending}
              className="flex-1 min-w-0 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">No task</option>
              {tasks.map(t => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
            <button
              onClick={handleStart}
              disabled={pending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'grid' ? (

        /* ── GRID ── */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                  <th className="px-4 py-3 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Task
                  </th>
                  {days.map((d, i) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const { weekday, day } = dayLabel(d);
                    const total = dayTotals[dateStr] || 0;
                    const isToday = isSameDay(d, new Date());
                    return (
                      <th key={i} className={`w-24 px-2 py-3 text-center align-bottom ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{weekday}</div>
                        <div className={`text-[11px] ${isToday ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          {day}
                        </div>
                        <div className={`mt-1.5 text-sm font-semibold tabular-nums ${total > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                          {total > 0 ? fmtMins(total) : '0h'}
                        </div>
                        <Bar value={total} target={DAY_TARGET} className="mt-1.5" />
                      </th>
                    );
                  })}
                  <th className="w-28 px-3 py-3 text-center align-bottom">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</div>
                    <div className="mt-1.5 text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {fmtMins(grandTotal)}
                    </div>
                    <Bar value={grandTotal} target={WEEK_TARGET} className="mt-1.5" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                      No time logged this week. Add a task below or start the timer.
                    </td>
                  </tr>
                ) : rows.map(row => (
                  <tr key={row.key} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                    <td className="max-w-[18rem] px-4 py-2.5">
                      <div className={`truncate font-medium ${!row.taskId ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.title}
                      </div>
                      {row.status && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[row.status] || 'bg-slate-400'}`} />
                          <span>{row.status}</span>
                        </div>
                      )}
                    </td>
                    {days.map((d, i) => {
                      const dateStr = format(d, 'yyyy-MM-dd');
                      return (
                        <TimeCell
                          key={i}
                          minutes={row.perDay[dateStr] || 0}
                          isToday={isSameDay(d, new Date())}
                          disabled={pending}
                          onCommit={raw => commitCell(row.taskId, dateStr, raw)}
                        />
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {row.total > 0 ? fmtMins(row.total) : <span className="text-slate-300 dark:text-slate-600">0h</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add task row */}
          <div className="border-t border-slate-100 dark:border-slate-700 p-2.5">
            <select
              value={addSel}
              onChange={e => addRow(e.target.value)}
              disabled={pending || (addableTasks.length === 0 && !canAddNoTask)}
              className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-transparent focus:outline-none focus:border-indigo-400 disabled:opacity-40 cursor-pointer"
            >
              <option value="">+ Add task</option>
              {canAddNoTask && <option value="__none__">No task</option>}
              {addableTasks.map(t => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>

      ) : (

        /* ── LIST VIEW ── */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
              <Timer className="w-5 h-5" />
              No time entries this week.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {[...entries].sort((a, b) => a.date.localeCompare(b.date)).map(e => {
                const isRunning = e.startedAt && !e.endedAt;
                const { day } = dayLabel(parseISO(e.date));
                return (
                  <div key={e._id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">{day}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {e.task?.title || <span className="text-slate-400">No task</span>}
                        {isRunning && (
                          <span className="ml-2 text-xs font-normal text-indigo-500">running…</span>
                        )}
                      </p>
                      {e.note && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{e.note}</p>}
                    </div>
                    <span className="w-20 shrink-0 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {isRunning ? '—' : fmtMins(e.minutes)}
                    </span>
                    <button
                      onClick={() => handleDelete(e._id)}
                      disabled={pending || isRunning}
                      className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 disabled:opacity-30 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, List,
  Play, Square, Pencil, Trash2, Clock, Timer,
} from 'lucide-react';
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO,
} from 'date-fns';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtMins = (m) => {
  if (!m || m === 0) return '—';
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  if (h) return `${h}h`;
  return `${min}m`;
};

const parseDuration = (str) => {
  if (!str || !str.trim()) return 0;
  const s = str.trim();
  const hm = s.match(/^(\d+)h\s*(\d+)m$/i);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  const h = s.match(/^(\d+)h$/i);
  if (h) return parseInt(h[1], 10) * 60;
  const m = s.match(/^(\d+)m$/i);
  if (m) return parseInt(m[1], 10);
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
};

const weekKey = (mondayDate) => format(mondayDate, 'yyyy-MM-dd');

const loadEntries = (monday) => {
  try {
    const raw = localStorage.getItem(`timesheet_${weekKey(monday)}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveEntries = (monday, entries) => {
  localStorage.setItem(`timesheet_${weekKey(monday)}`, JSON.stringify(entries));
};

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const cellColor = (mins) => {
  if (!mins) return 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500';
  if (mins < 60) return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
  if (mins < 240) return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
  return 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300';
};

const progressColor = (pct) => {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-400';
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── component ───────────────────────────────────────────────────────────────

export default function TimesheetPage() {
  const { user } = useAuth();

  const getMonday = (ref) => startOfWeek(ref, { weekStartsOn: 1 });

  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [entries, setEntries] = useState(() => loadEntries(getMonday(new Date())));
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [view, setView] = useState('grid');

  // cell edit state: { taskId, dayIdx }
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const editRef = useRef(null);

  // timer state
  const [timerTaskId, setTimerTaskId] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  // ── load entries when week changes ──
  useEffect(() => {
    const e = loadEntries(monday);
    setEntries(e);
  }, [monday]);

  // persist on change
  useEffect(() => {
    saveEntries(monday, entries);
  }, [entries, monday]);

  // ── fetch tasks ──
  useEffect(() => {
    setLoadingTasks(true);
    API.get('/tasks')
      .then((res) => {
        const all = res.data?.tasks || [];
        // filter to user's tasks that are pending or in-progress
        const userId = user?._id || user?.id;
        const filtered = all.filter((t) => {
          const assigned = t.assignedTo;
          const matchUser = assigned === userId ||
            (typeof assigned === 'object' && (assigned?._id === userId || assigned?.id === userId));
          return matchUser && (t.status === 'pending' || t.status === 'in-progress');
        });
        setTasks(filtered);
        if (!timerTaskId && filtered.length) setTimerTaskId(filtered[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, [user]);

  // ── timer tick ──
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // ── focus edit input ──
  useEffect(() => {
    if (editing && editRef.current) editRef.current.focus();
  }, [editing]);

  // ── week nav ──
  const goToday = () => setMonday(getMonday(new Date()));
  const goPrev = () => setMonday((m) => subWeeks(m, 1));
  const goNext = () => setMonday((m) => addWeeks(m, 1));

  const weekRange = `${format(monday, 'MMM d')} – ${format(addDays(monday, 6), 'MMM d, yyyy')}`;

  // ── entry helpers ──
  const entriesForCell = useCallback((taskId, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return entries.filter((e) => e.taskId === taskId && e.date === dateStr);
  }, [entries]);

  const minutesForCell = useCallback((taskId, day) => {
    return entriesForCell(taskId, day).reduce((s, e) => s + e.minutes, 0);
  }, [entriesForCell]);

  const minutesForDay = useCallback((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return entries.filter((e) => e.date === dateStr).reduce((s, e) => s + e.minutes, 0);
  }, [entries]);

  const totalWeekMinutes = entries.reduce((s, e) => s + e.minutes, 0);

  // unique tasks that have entries this week
  const tasksWithEntries = (() => {
    const ids = [...new Set(entries.map((e) => e.taskId))];
    const result = [];
    ids.forEach((id) => {
      const found = tasks.find((t) => t._id === id);
      if (found) {
        result.push(found);
      } else {
        const anyEntry = entries.find((e) => e.taskId === id);
        if (anyEntry) result.push({ _id: id, title: anyEntry.taskTitle });
      }
    });
    // also include tasks that haven't logged yet but are assigned
    tasks.forEach((t) => {
      if (!result.find((r) => r._id === t._id)) result.push(t);
    });
    return result;
  })();

  // ── cell editing ──
  const startEdit = (taskId, dayIdx) => {
    const mins = minutesForCell(taskId, days[dayIdx]);
    setEditing({ taskId, dayIdx });
    setEditVal(mins ? fmtMins(mins) === '—' ? '' : fmtMins(mins) : '');
  };

  const commitEdit = async (taskId, dayIdx) => {
    const mins = parseDuration(editVal);
    const day = days[dayIdx];
    const dateStr = format(day, 'yyyy-MM-dd');
    const task = tasksWithEntries.find((t) => t._id === taskId);
    const taskTitle = task?.title || taskId;

    // remove existing entries for this cell, add new one
    setEntries((prev) => {
      const without = prev.filter((e) => !(e.taskId === taskId && e.date === dateStr));
      if (mins > 0) {
        return [...without, { id: genId(), taskId, taskTitle, date: dateStr, minutes: mins }];
      }
      return without;
    });

    // patch backend
    if (mins > 0) {
      try {
        await API.patch(`/tasks/${taskId}/time`, { minutes: mins });
      } catch {
        // silently ignore — local data is source of truth
      }
    }

    setEditing(null);
    setEditVal('');
  };

  const cancelEdit = () => { setEditing(null); setEditVal(''); };

  // ── timer ──
  const fmtTimer = (s) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const startTimer = () => {
    if (!timerTaskId) return;
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const stopTimer = async () => {
    setTimerRunning(false);
    const mins = Math.round(timerSeconds / 60);
    if (mins > 0 && timerTaskId) {
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const task = tasks.find((t) => t._id === timerTaskId);
      const taskTitle = task?.title || timerTaskId;
      setEntries((prev) => [
        ...prev,
        { id: genId(), taskId: timerTaskId, taskTitle, date: dateStr, minutes: mins },
      ]);
      try {
        await API.patch(`/tasks/${timerTaskId}/time`, { minutes: mins });
      } catch {
        // ignore
      }
    }
    setTimerSeconds(0);
  };

  // ── delete entry ──
  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // ── render ───────────────────────────────────────────────────────────────

  const weekPct = Math.min(100, Math.round((totalWeekMinutes / 2400) * 100));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-500" />
              Timesheet
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{weekRange}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* week nav */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={goPrev}
                className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Previous week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 border-x border-slate-200 dark:border-slate-700 transition-colors"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Next week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* total badge */}
            <span className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-semibold border border-indigo-200 dark:border-indigo-700">
              {fmtMins(totalWeekMinutes) === '—' ? '0h' : fmtMins(totalWeekMinutes)} / 40h
            </span>

            {/* view toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === 'grid' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 transition-colors ${view === 'list' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* ── WEEKLY PROGRESS ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Weekly progress</span>
            <span>{weekPct}% of 40h target</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor(weekPct)}`}
              style={{ width: `${weekPct}%` }}
            />
          </div>
        </div>

        {/* ── TIMER ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center gap-4">
          <Timer className="w-5 h-5 text-indigo-400 shrink-0" />
          <select
            value={timerTaskId}
            onChange={(e) => setTimerTaskId(e.target.value)}
            disabled={timerRunning}
            className="flex-1 min-w-[180px] text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loadingTasks && <option>Loading…</option>}
            {!loadingTasks && tasks.length === 0 && <option value="">No tasks assigned</option>}
            {tasks.map((t) => (
              <option key={t._id} value={t._id}>{t.title}</option>
            ))}
          </select>
          <span className="font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 min-w-[88px] text-center">
            {fmtTimer(timerSeconds)}
          </span>
          {!timerRunning ? (
            <button
              onClick={startTimer}
              disabled={!timerTaskId}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium disabled:opacity-40 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Timer
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop &amp; Save
            </button>
          )}
        </div>

        {/* ── GRID VIEW ── */}
        {view === 'grid' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-48 min-w-[180px]">
                      Task
                    </th>
                    {days.map((day, i) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <th
                          key={i}
                          className={`px-2 py-3 text-center font-semibold min-w-[90px] ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                          <div>{DAY_LABELS[i]}</div>
                          <div className={`text-xs font-normal mt-0.5 ${isToday ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {format(day, 'MMM d')}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-3 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 min-w-[80px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasksWithEntries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                        No tasks yet. Use the timer or click a cell to log time.
                      </td>
                    </tr>
                  )}
                  {tasksWithEntries.map((task) => {
                    const rowTotal = days.reduce((s, d) => s + minutesForCell(task._id, d), 0);
                    return (
                      <tr key={task._id} className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="px-4 py-2">
                          <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 text-sm leading-tight">
                            {task.title}
                          </span>
                        </td>
                        {days.map((day, di) => {
                          const mins = minutesForCell(task._id, day);
                          const isEditing = editing?.taskId === task._id && editing?.dayIdx === di;
                          return (
                            <td key={di} className="px-1 py-1 text-center">
                              {isEditing ? (
                                <input
                                  ref={editRef}
                                  value={editVal}
                                  onChange={(e) => setEditVal(e.target.value)}
                                  onBlur={() => commitEdit(task._id, di)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitEdit(task._id, di);
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  placeholder="e.g. 2h"
                                  className="w-full text-center text-xs px-1 py-1 rounded border border-indigo-400 bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <button
                                  onClick={() => startEdit(task._id, di)}
                                  className={`group relative w-full text-xs font-medium rounded px-2 py-1.5 transition-all ${cellColor(mins)} hover:ring-2 hover:ring-indigo-400`}
                                >
                                  <span>{fmtMins(mins)}</span>
                                  <Pencil className="w-2.5 h-2.5 absolute top-1 right-1 opacity-0 group-hover:opacity-70 transition-opacity" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-sm text-slate-700 dark:text-slate-300">
                          {fmtMins(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ── daily totals row ── */}
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80">
                    <td className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Daily Total
                    </td>
                    {days.map((day, i) => {
                      const dayMins = minutesForDay(day);
                      const dayPct = Math.min(100, Math.round((dayMins / 480) * 100));
                      const isToday = isSameDay(day, new Date());
                      return (
                        <td key={i} className="px-1 py-2 text-center">
                          <div className={`text-xs font-bold mb-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {fmtMins(dayMins)}
                          </div>
                          <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden mx-1">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressColor(dayPct)}`}
                              style={{ width: `${dayPct}%` }}
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {fmtMins(totalWeekMinutes)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {entries.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                No time entries this week.
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Task</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Duration</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...entries]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {entry.taskTitle}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {format(parseISO(entry.date), 'EEE, MMM d')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cellColor(entry.minutes)}`}>
                            {fmtMins(entry.minutes)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80">
                    <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Week Total
                    </td>
                    <td className="px-4 py-2 font-bold text-slate-900 dark:text-slate-100">
                      {fmtMins(totalWeekMinutes)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

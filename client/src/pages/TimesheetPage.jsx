import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Users, LayoutGrid, List, Download, Send, RotateCcw, Check, X, Clock } from 'lucide-react';

// ── UTC-based date helpers (no local-timezone dependency) ─────────────────────

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const WEEK_TARGET = 2400; // 40 h in minutes
const DAY_TARGET  = 480;  //  8 h in minutes

function todayIST() {
  const ist = new Date(Date.now() + IST_OFFSET);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

function mondayOf(d) {
  const diff = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
}

function addDays(d, n) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

function weekKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function isTodayIST(d) {
  const t = todayIST();
  return d.getUTCFullYear()===t.getUTCFullYear() && d.getUTCMonth()===t.getUTCMonth() && d.getUTCDate()===t.getUTCDate();
}

const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DN_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtUTC(d, pat) {
  const wd=d.getUTCDay(), mo=d.getUTCMonth(), dt=d.getUTCDate(), yr=d.getUTCFullYear();
  if (pat==='MMM d')       return `${MN[mo]} ${dt}`;
  if (pat==='EEE, MMM d')  return `${DN[wd]}, ${MN[mo]} ${dt}`;
  if (pat==='EEEE, MMM d') return `${DN_LONG[wd]}, ${MN[mo]} ${dt}`;
  if (pat==='HH:mm') {
    return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
  }
  return weekKey(d);
}

function fmtTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  // show in local time for timer display
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function parseEntryDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') return new Date(dateVal);
  return dateVal;
}

function entryDateKey(e) {
  const d = parseEntryDate(e.date);
  if (!d) return '';
  return weekKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
}

function rangeLabel(monday) {
  return `${fmtUTC(monday,'MMM d')} - ${fmtUTC(addDays(monday,6),'MMM d')}`;
}

function fmtMins(total) {
  const m = Math.max(0, Math.round(total));
  if (!m) return '0h';
  const h = Math.floor(m/60), min = m%60;
  return min ? `${h}h ${min}m` : `${h}h`;
}

const STATUS_CFG = {
  todo:          { dot: 'bg-purple-500',  label: 'To Do' },
  'in-progress': { dot: 'bg-amber-500',   label: 'In Progress' },
  pending:       { dot: 'bg-slate-400',   label: 'Backlog' },
  completed:     { dot: 'bg-emerald-500', label: 'Done' },
  overdue:       { dot: 'bg-red-500',     label: 'Overdue' },
};

// ── Small components ──────────────────────────────────────────────────────────

const SERVER = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';

function Avatar({ name, image, size = 8 }) {
  const initials = (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const colors = ['bg-red-500','bg-pink-500','bg-purple-500','bg-indigo-500','bg-blue-500','bg-emerald-500','bg-amber-500'];
  const color = colors[(name||'').charCodeAt(0)%colors.length];
  const [imgErr, setImgErr] = useState(false);
  const src = !imgErr && image ? (image.startsWith('http') ? image : `${SERVER}${image}`) : null;
  if (src) return (
    <img src={src} alt={name} onError={()=>setImgErr(true)}
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}/>
  );
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function Bar({ value, target }) {
  const pct = Math.min(value/Math.max(target,1),1)*100;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600 mt-1">
      <div className={`h-full rounded-full ${value>target?'bg-red-400':'bg-blue-400'}`} style={{width:`${pct}%`}}/>
    </div>
  );
}

// ── Editable time cell ────────────────────────────────────────────────────────

function TimeCell({ minutes, isToday, disabled, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const display = minutes>0 ? fmtMins(minutes) : '';

  function begin() { if (disabled) return; setDraft(display); setEditing(true); }
  function commit() {
    setEditing(false);
    const raw = draft.trim();
    if (raw===display) return;
    onCommit(raw);
  }

  if (editing) return (
    <td className={`border-r border-slate-100 dark:border-slate-700 p-0 ${isToday?'bg-blue-50 dark:bg-blue-900/20':''}`}>
      <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();}if(e.key==='Escape'){setDraft(display);setEditing(false);}}}
        onFocus={e=>e.target.select()} placeholder="e.g. 2h"
        className="h-11 w-full bg-white dark:bg-slate-700 px-1 text-center text-sm outline-none ring-2 ring-inset ring-blue-500"/>
    </td>
  );

  return (
    <td onClick={begin}
      className={['h-11 border-r border-slate-100 dark:border-slate-700 cursor-pointer text-center align-middle text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10',
        minutes>0?'text-slate-800 dark:text-slate-100 font-medium':'text-slate-300 dark:text-slate-600',
        isToday?'bg-blue-50/50 dark:bg-blue-900/10':'',
      ].join(' ')}>
      {minutes>0 ? fmtMins(minutes) : '—'}
    </td>
  );
}

// ── Add Task dropdown ─────────────────────────────────────────────────────────

function AddTaskDropdown({ tasks, disabled, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-40 transition-colors">
        + Add task
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-700 rounded-md outline-none border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center text-slate-400">No tasks available</p>
            ) : filtered.map(t => (
              <button key={t._id} type="button"
                onClick={() => { onSelect(t._id); setOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors truncate">
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Timesheet grid ─────────────────────────────────────────────────────────

function MyTimesheetGrid({ monday, entries, tasks, pending, onCommit, extraTaskIds, setExtraTaskIds, onTaskClick, locked }) {
  const days = Array.from({length:7}, (_,i) => addDays(monday,i));

  const byTask = {};
  const dayTotals = Object.fromEntries(days.map(d=>[weekKey(d),0]));
  let grandTotal = 0;

  for (const e of entries) {
    if (e.startedAt && !e.endedAt) continue;
    const key = e.task?._id || '__none__';
    const ds  = entryDateKey(e);
    if (!byTask[key]) byTask[key] = {
      taskId:  e.task?._id || null,
      title:   e.task?.title || 'No task',
      status:  e.task?.status || null,
      space:   e.task?.space?.name || null,
      spaceId: e.task?.space?._id  || null,
      perDay:  Object.fromEntries(days.map(d=>[weekKey(d),0])),
      total:   0,
    };
    if (ds in byTask[key].perDay) {
      byTask[key].perDay[ds] += e.minutes;
      byTask[key].total      += e.minutes;
      dayTotals[ds]           = (dayTotals[ds]||0)+e.minutes;
      grandTotal             += e.minutes;
    }
  }

  const taskMeta = Object.fromEntries(tasks.map(t=>[t._id,t]));
  const allKeys  = new Set([...Object.keys(byTask),...extraTaskIds]);
  const rows = Array.from(allKeys).map(key => {
    const c  = byTask[key];
    const tm = key!=='__none__' ? taskMeta[key] : null;
    return {
      key,
      taskId:  key==='__none__' ? null : key,
      title:   c?.title   ?? tm?.title        ?? 'Task',
      status:  c?.status  ?? tm?.status        ?? null,
      space:   c?.space   ?? tm?.space?.name   ?? null,
      spaceId: c?.spaceId ?? tm?.space?._id    ?? null,
      perDay:  c?.perDay  ?? Object.fromEntries(days.map(d=>[weekKey(d),0])),
      total:   c?.total   ?? 0,
    };
  }).sort((a,b)=>{ if(!a.taskId) return 1; if(!b.taskId) return -1; return a.title.localeCompare(b.title); });

  const presentKeys  = new Set(rows.map(r=>r.key));
  const addableTasks = tasks.filter(t=>!presentKeys.has(t._id));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide min-w-[220px]">
                Task / Location
              </th>
              {days.map((d,i) => {
                const ds      = weekKey(d);
                const total   = dayTotals[ds]||0;
                const isToday = isTodayIST(d);
                return (
                  <th key={i} className={`w-24 px-2 py-3 text-center border-r border-slate-100 dark:border-slate-700 ${isToday?'bg-blue-50 dark:bg-blue-900/10':''}`}>
                    <div className={`text-xs font-medium ${isToday?'text-blue-600 dark:text-blue-400':'text-slate-500'}`}>
                      {fmtUTC(d,'EEE, MMM d')}
                    </div>
                    <div className={`text-sm font-bold mt-0.5 ${total>0?(isToday?'text-blue-600':'text-slate-700 dark:text-slate-200'):'text-slate-400'}`}>
                      {fmtMins(total)}
                    </div>
                    <Bar value={total} target={DAY_TARGET}/>
                  </th>
                );
              })}
              <th className="w-24 px-3 py-3 text-center">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</div>
                <div className="text-sm font-bold mt-0.5 text-indigo-600 dark:text-indigo-400">{fmtMins(grandTotal)}</div>
                <Bar value={grandTotal} target={WEEK_TARGET}/>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {rows.length===0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">No time logged this week.</td></tr>
            ) : rows.map(row => (
              <tr key={row.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                <td className="px-4 py-2.5 max-w-[220px]">
                  <div
                    onClick={()=>row.taskId && onTaskClick(row.taskId, row.spaceId)}
                    className={`truncate font-medium text-slate-800 dark:text-slate-100 ${row.taskId?'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400':''}`}>
                    {row.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {row.status && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[row.status]?.dot||'bg-slate-400'}`}/>
                        {STATUS_CFG[row.status]?.label}
                      </span>
                    )}
                    {row.space && <span className="text-xs text-slate-400">· {row.space}</span>}
                  </div>
                </td>
                {days.map((d,i) => {
                  const ds = weekKey(d);
                  return (
                    <TimeCell key={i} minutes={row.perDay[ds]||0} isToday={isTodayIST(d)}
                      disabled={pending || locked} onCommit={raw=>onCommit(row.taskId, ds, raw)}/>
                  );
                })}
                <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {row.total>0 ? fmtMins(row.total) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-700 p-3">
        <AddTaskDropdown
          tasks={addableTasks}
          disabled={pending}
          onSelect={id => setExtraTaskIds(prev => [...new Set([...prev, id])])}
        />
      </div>
    </div>
  );
}

// ── Time Entries list ─────────────────────────────────────────────────────────

function MyEntriesList({ entries, pending, onDelete }) {
  const grouped = {};
  [...entries].sort((a,b)=>entryDateKey(b).localeCompare(entryDateKey(a))).forEach(e => {
    const key = entryDateKey(e);
    if (!grouped[key]) grouped[key]=[];
    grouped[key].push(e);
  });

  if (entries.length===0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 px-4 py-16 text-center text-slate-400">
      <p className="text-sm">No time entries this week.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([ds, dayEntries]) => {
        const dayDate = new Date(`${ds}T00:00:00Z`);
        return (
          <div key={ds} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmtUTC(dayDate,'EEEE, MMM d')}</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {fmtMins(dayEntries.filter(e=>!(e.startedAt&&!e.endedAt)).reduce((s,e)=>s+e.minutes,0))}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {dayEntries.map(e => {
                const isRunning = e.startedAt && !e.endedAt;
                const sc = STATUS_CFG[e.task?.status];
                return (
                  <div key={e._id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {sc && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`}/>}
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                          {e.task?.title || <span className="text-slate-400">No task</span>}
                        </p>
                        {isRunning && <span className="text-xs text-indigo-500 font-medium animate-pulse">● running</span>}
                      </div>
                      {e.startedAt && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {fmtTime(e.startedAt)} – {e.endedAt ? fmtTime(e.endedAt) : 'now'}
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${isRunning?'text-indigo-500':'text-slate-700 dark:text-slate-300'}`}>
                      {isRunning ? '—' : fmtMins(e.minutes)}
                    </span>
                    <button onClick={()=>onDelete(e._id)} disabled={pending||isRunning}
                      className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 disabled:opacity-30 transition-colors p-1">
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── User timesheet grid (reusable for both Individual + All views) ─────────────

function UserTimesheetCard({ user, entries, days }) {
  const navigate = useNavigate();
  const byTask = new Map();
  const dayTotals = Object.fromEntries(days.map(d=>[weekKey(d),0]));
  let userTotal = 0;

  const dayKeys = days.map(d => weekKey(d));
  entries.forEach(e => {
    const key = e.task?._id || '__none__';
    const ds  = entryDateKey(e);
    if (!byTask.has(key)) byTask.set(key, {
      taskId: e.task?._id||null, title: e.task?.title||'No task',
      status: e.task?.status||null,
      perDay: Object.fromEntries(days.map(d=>[weekKey(d),0])), total: 0,
    });
    if (dayKeys.includes(ds)) {
      byTask.get(key).perDay[ds] += e.minutes;
      byTask.get(key).total      += e.minutes;
      dayTotals[ds]               = (dayTotals[ds]||0)+e.minutes;
      userTotal                  += e.minutes;
    }
  });

  const taskRows = [...byTask.values()].sort((a,b)=>a.title.localeCompare(b.title));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Avatar name={user?.name} image={user?.avatar}/>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name||'Unknown'}</p>
          <p className="text-xs text-slate-400">{user?.designation || user?.role} {user?.department ? `· ${user.department}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmtMins(userTotal)}</p>
          <p className="text-xs text-slate-400">{Math.min(100,Math.round((userTotal/WEEK_TARGET)*100))}% of 40h</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60">
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Task / Location</th>
              {days.map((d,i) => (
                <th key={i} className={`w-20 px-2 py-2 text-center text-xs font-medium ${isTodayIST(d)?'text-blue-500':'text-slate-400'}`}>
                  {fmtUTC(d,'EEE, MMM d')}
                </th>
              ))}
              <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
            {taskRows.length===0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-xs text-slate-400">No time logged this week.</td></tr>
            )}
            {taskRows.map(row => (
              <tr key={row.taskId||'__none__'} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                <td className="px-4 py-2.5 max-w-[200px]">
                  <div className="flex items-center gap-2">
                    {row.status && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CFG[row.status]?.dot||'bg-slate-400'}`}/>}
                    <span onClick={()=>row.taskId && (row.spaceId ? navigate(`/spaces/${row.spaceId}?task=${row.taskId}`) : navigate(`/tasks?taskId=${row.taskId}`))}
                      className={`truncate text-sm font-medium text-slate-800 dark:text-slate-100 ${row.taskId?'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400':''}`}>
                      {row.title}
                    </span>
                  </div>
                  {row.status && <p className="text-xs text-slate-400 mt-0.5 pl-4">{STATUS_CFG[row.status]?.label}</p>}
                </td>
                {days.map((d,i) => {
                  const mins = row.perDay[weekKey(d)]||0;
                  return (
                    <td key={i} className={`px-2 py-2.5 text-center text-sm tabular-nums ${mins>0?'text-slate-800 dark:text-slate-100 font-medium':'text-slate-300 dark:text-slate-600'}`}>
                      {mins>0 ? fmtMins(mins) : '—'}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {row.total>0 ? fmtMins(row.total) : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold border-t border-slate-200 dark:border-slate-700">
              <td className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wide">Day total</td>
              {days.map((d,i) => {
                const tot = dayTotals[weekKey(d)]||0;
                return <td key={i} className="px-2 py-2 text-center text-sm tabular-nums text-slate-700 dark:text-slate-300">{tot>0?fmtMins(tot):'—'}</td>;
              })}
              <td className="px-3 py-2 text-center text-sm tabular-nums text-indigo-600 dark:text-indigo-400">{fmtMins(userTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Individual Timesheet ──────────────────────────────────────────────────────

function IndividualTimesheet({ monday, allEntries, allUsers }) {
  const days = Array.from({length:7}, (_,i) => addDays(monday,i));
  const [selectedUid, setSelectedUid] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const sortedUsers = [...allUsers].sort((a,b)=>a.name.localeCompare(b.name));
  const filtered = sortedUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  const selectedUser = allUsers.find(u => String(u._id) === selectedUid);

  const userEntries = selectedUid
    ? allEntries.filter(e => String(e.user?._id) === selectedUid && !(e.startedAt && !e.endedAt))
    : [];

  return (
    <div className="space-y-4">
      {/* User picker */}
      <div ref={ref} className="relative inline-block">
        <button onClick={() => { setOpen(o=>!o); setSearch(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-colors shadow-sm">
          {selectedUser
            ? <><Avatar name={selectedUser.name} image={selectedUser.avatar} size={6}/> {selectedUser.name}</>
            : <><Users className="w-4 h-4 text-slate-400"/> Select person</>
          }
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90 ml-1"/>
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search..." className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-700 rounded-md outline-none border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100"/>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length===0
                ? <p className="px-3 py-4 text-xs text-center text-slate-400">No users found</p>
                : filtered.map(u => (
                  <button key={u._id} onClick={() => { setSelectedUid(String(u._id)); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${selectedUid===String(u._id)?'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300':'text-slate-700 dark:text-slate-200'}`}>
                    <Avatar name={u.name} image={u.avatar} size={6}/>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.designation || u.role}</p>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        )}
      </div>

      {!selectedUser ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 px-4 py-16 text-center text-slate-400">
          <Users className="w-8 h-8"/>
          <p className="text-sm">Select a person to view their timesheet.</p>
        </div>
      ) : (
        <UserTimesheetCard user={selectedUser} entries={userEntries} days={days}/>
      )}
    </div>
  );
}

// ── All Timesheets ────────────────────────────────────────────────────────────

function AllTimesheets({ monday, allEntries, allUsers }) {
  const navigate = useNavigate();
  const days = Array.from({length:7}, (_,i) => addDays(monday,i));
  const dayKeys = days.map(d => weekKey(d));

  // Build rows: one row per (user, task) pair
  const rowMap = new Map(); // key: uid+taskId
  const dayTotals = Object.fromEntries(dayKeys.map(k=>[k,0]));
  let grandTotal = 0;

  const userById = new Map();
  allUsers.forEach(u => userById.set(String(u._id), u));

  allEntries.forEach(e => {
    if (e.startedAt && !e.endedAt) return;
    const uid  = e.user?._id ? String(e.user._id) : 'unknown';
    const tid  = e.task?._id || '__none__';
    const key  = `${uid}__${tid}`;
    const ds   = entryDateKey(e);
    const user = userById.get(uid) || e.user;
    if (!rowMap.has(key)) rowMap.set(key, {
      uid, user,
      taskId:  e.task?._id || null,
      spaceId: e.task?.space?._id || null,
      title:   e.task?.title || 'No task',
      status:  e.task?.status || null,
      perDay:  Object.fromEntries(dayKeys.map(k=>[k,0])),
      total:   0,
    });
    if (dayKeys.includes(ds)) {
      rowMap.get(key).perDay[ds] += e.minutes;
      rowMap.get(key).total      += e.minutes;
      dayTotals[ds]               = (dayTotals[ds]||0) + e.minutes;
      grandTotal                 += e.minutes;
    }
  });

  const rows = [...rowMap.values()].sort((a,b) =>
    (a.user?.name||'').localeCompare(b.user?.name||'') || a.title.localeCompare(b.title)
  );

  if (allUsers.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 px-4 py-16 text-center text-slate-400">
      <Users className="w-8 h-8"/>
      <p className="text-sm">No users found.</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[140px]">Person</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[180px]">Task</th>
              {days.map((d,i) => (
                <th key={i} className={`w-20 px-2 py-3 text-center text-xs font-medium border-l border-slate-100 dark:border-slate-700 ${isTodayIST(d)?'text-blue-500':'text-slate-400'}`}>
                  {fmtUTC(d,'EEE, MMM d')}
                </th>
              ))}
              <th className="w-20 px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase border-l border-slate-200 dark:border-slate-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">No time logged this week.</td></tr>
            ) : rows.map((row, i) => {
              const prevRow = rows[i-1];
              const showUser = !prevRow || prevRow.uid !== row.uid;
              return (
                <tr key={`${row.uid}__${row.taskId||'none'}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                  <td className="px-4 py-2.5">
                    {showUser ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={row.user?.name} image={row.user?.avatar} size={6}/>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{row.user?.name||'Unknown'}</p>
                          <p className="text-xs text-slate-400 truncate">{row.user?.designation||row.user?.role||''}</p>
                        </div>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 max-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      {row.status && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CFG[row.status]?.dot||'bg-slate-400'}`}/>}
                      <span onClick={()=>row.taskId && (row.spaceId ? navigate(`/spaces/${row.spaceId}?task=${row.taskId}`) : navigate(`/tasks?taskId=${row.taskId}`))}
                        className={`truncate text-sm font-medium text-slate-700 dark:text-slate-200 ${row.taskId?'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400':''}`}>
                        {row.title}
                      </span>
                    </div>
                    {row.status && <p className="text-xs text-slate-400 mt-0.5 pl-3">{STATUS_CFG[row.status]?.label}</p>}
                  </td>
                  {days.map((d,j) => {
                    const mins = row.perDay[weekKey(d)]||0;
                    return (
                      <td key={j} className={`px-2 py-2.5 text-center text-sm tabular-nums border-l border-slate-100 dark:border-slate-700/50 ${mins>0?'text-slate-800 dark:text-slate-100 font-medium':'text-slate-300 dark:text-slate-600'}`}>
                        {mins>0 ? fmtMins(mins) : '—'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-indigo-600 dark:text-indigo-400 border-l border-slate-200 dark:border-slate-700">
                    {row.total>0 ? fmtMins(row.total) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
              <td className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wide" colSpan={2}>Total</td>
              {days.map((d,i) => {
                const tot = dayTotals[weekKey(d)]||0;
                return <td key={i} className="px-2 py-2 text-center text-sm tabular-nums text-slate-700 dark:text-slate-300 border-l border-slate-100 dark:border-slate-700">{tot>0?fmtMins(tot):'—'}</td>;
              })}
              <td className="px-3 py-2 text-center text-sm tabular-nums text-indigo-600 dark:text-indigo-400 border-l border-slate-200 dark:border-slate-700">{fmtMins(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CSV export helpers ────────────────────────────────────────────────────────

function csvRow(cells) {
  return cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

function downloadCSV(filename, rows) {
  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportMyTimesheet(monday, entries, tasks) {
  const days = Array.from({length:7}, (_,i) => addDays(monday,i));
  const dayHeaders = days.map(d => fmtUTC(d,'EEE, MMM d'));
  const header = csvRow(['Task', 'Space', 'Status', ...dayHeaders, 'Total']);

  const byTask = {};
  for (const e of entries) {
    if (e.startedAt && !e.endedAt) continue;
    const key = e.task?._id || '__none__';
    const ds  = entryDateKey(e);
    if (!byTask[key]) byTask[key] = {
      title: e.task?.title || 'No task', space: e.task?.space?.name || '',
      status: e.task?.status || '', perDay: Object.fromEntries(days.map(d=>[weekKey(d),0])), total: 0,
    };
    if (ds in byTask[key].perDay) { byTask[key].perDay[ds] += e.minutes; byTask[key].total += e.minutes; }
  }

  const dataRows = Object.values(byTask).sort((a,b)=>a.title.localeCompare(b.title)).map(r =>
    csvRow([r.title, r.space, r.status, ...days.map(d => r.perDay[weekKey(d)] ? fmtMins(r.perDay[weekKey(d)]) : ''), fmtMins(r.total)])
  );

  const week = weekKey(monday);
  downloadCSV(`my-timesheet-${week}.csv`, [header, ...dataRows]);
}

function exportAllTimesheets(monday, allEntries, allUsers) {
  const days = Array.from({length:7}, (_,i) => addDays(monday,i));
  const dayHeaders = days.map(d => fmtUTC(d,'EEE, MMM d'));
  const header = csvRow(['Name', 'Email', 'Role', 'Task', 'Status', ...dayHeaders, 'Total']);

  const userMap = new Map();
  allUsers.forEach(u => userMap.set(String(u._id), { user: u, entries: [] }));
  allEntries.forEach(e => {
    if (e.startedAt && !e.endedAt) return;
    const uid = e.user?._id ? String(e.user._id) : 'unknown';
    if (!userMap.has(uid)) userMap.set(uid, { user: e.user, entries: [] });
    userMap.get(uid).entries.push(e);
  });

  const dataRows = [];
  [...userMap.values()].sort((a,b)=>(a.user?.name||'').localeCompare(b.user?.name||'')).forEach(({ user: u, entries }) => {
    const byTask = new Map();
    entries.forEach(e => {
      const key = e.task?._id || '__none__';
      const ds  = entryDateKey(e);
      if (!byTask.has(key)) byTask.set(key, { title: e.task?.title||'No task', status: e.task?.status||'', perDay: Object.fromEntries(days.map(d=>[weekKey(d),0])), total: 0 });
      const row = byTask.get(key);
      if (ds in row.perDay) { row.perDay[ds] += e.minutes; row.total += e.minutes; }
    });
    if (byTask.size === 0) {
      dataRows.push(csvRow([u?.name||'Unknown', u?.email||'', u?.role||'', 'No time logged', '', ...days.map(()=>''), '0h']));
    } else {
      [...byTask.values()].sort((a,b)=>a.title.localeCompare(b.title)).forEach(row => {
        dataRows.push(csvRow([u?.name||'Unknown', u?.email||'', u?.role||'', row.title, row.status, ...days.map(d => row.perDay[weekKey(d)] ? fmtMins(row.perDay[weekKey(d)]) : ''), fmtMins(row.total)]));
      });
    }
  });

  const week = weekKey(monday);
  downloadCSV(`all-timesheets-${week}.csv`, [header, ...dataRows]);
}

// ── Approvals Panel ───────────────────────────────────────────────────────────

const STATUS_BADGE = {
  draft:    { label: 'Draft',    cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function ApprovalsPanel() {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null); // { weekId }
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/timesheetweeks/all?status=${filter}`);
      setWeeks(data.weeks || []);
    } catch { toast.error('Failed to load approvals'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function approve(id) {
    setBusy(true);
    try {
      await API.post(`/timesheetweeks/${id}/approve`);
      toast.success('Approved');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  }

  async function reject() {
    if (!rejectNote.trim()) { toast.error('Note required'); return; }
    setBusy(true);
    try {
      await API.post(`/timesheetweeks/${rejectModal}/reject`, { note: rejectNote });
      toast.success('Rejected');
      setRejectModal(null);
      setRejectNote('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter===s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : weeks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2 px-4 py-16 text-center text-slate-400">
          <Clock className="w-8 h-8"/>
          <p className="text-sm">No {filter} timesheets.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Person</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Week</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Note</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {weeks.map(w => {
                const badge = STATUS_BADGE[w.status] || STATUS_BADGE.draft;
                const weekMon = new Date(w.weekStart);
                const weekSun = new Date(weekMon); weekSun.setUTCDate(weekSun.getUTCDate()+6);
                return (
                  <tr key={w._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={w.user?.name} image={w.user?.avatar} size={7}/>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{w.user?.name}</p>
                          <p className="text-xs text-slate-400">{w.user?.designation || w.user?.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {fmtUTC(weekMon,'MMM d')} – {fmtUTC(weekSun,'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {fmtMins(w.totalMinutes || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {w.submittedAt ? new Date(w.submittedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{w.reviewNote || '—'}</td>
                    <td className="px-4 py-3">
                      {w.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => approve(w._id)} disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                            <Check className="w-3.5 h-3.5"/> Approve
                          </button>
                          <button onClick={() => { setRejectModal(w._id); setRejectNote(''); }} disabled={busy}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                            <X className="w-3.5 h-3.5"/> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRejectModal(null)}/>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Reject timesheet</h3>
            <textarea rows={3} value={rejectNote} onChange={e=>setRejectNote(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"/>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={reject} disabled={busy} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TimesheetPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isAdminOrHR = user?.role==='admin' || user?.role==='hr';

  const [tab,          setTab]          = useState('my');
  const [subView,      setSubView]      = useState('grid');
  const [monday,       setMonday]       = useState(() => mondayOf(todayIST()));
  const [entries,      setEntries]      = useState([]);
  const [allEntries,   setAllEntries]   = useState([]);
  const [allUsers,     setAllUsers]     = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [pending,      setPending]      = useState(false);
  const [extraTaskIds, setExtraTaskIds] = useState([]);
  const [weekStatus,   setWeekStatus]   = useState(null); // TimesheetWeek doc for current user+week

  const isThisWeek = weekKey(monday) === weekKey(mondayOf(todayIST()));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, tasksRes] = await Promise.all([
        API.get(`/timeentries?week=${weekKey(monday)}`),
        API.get('/timeentries/tasks'),
      ]);
      setEntries(entriesRes.data.entries || []);
      setTasks(tasksRes.data.tasks || []);
    } catch {
      toast.error('Failed to load timesheet');
      setLoading(false);
      return;
    }
    const [weekRes, allRes, usersRes] = await Promise.allSettled([
      API.get(`/timesheetweeks/my?week=${weekKey(monday)}`),
      isAdminOrHR ? API.get(`/timeentries/all?week=${weekKey(monday)}`) : Promise.resolve({ data: { entries: [] } }),
      isAdminOrHR ? API.get('/users?isActive=true') : Promise.resolve({ data: { users: [] } }),
    ]);
    if (allRes.status === 'rejected') toast.error('Failed to load all timesheets');
    if (usersRes.status === 'rejected') toast.error('Failed to load users');
    setWeekStatus(weekRes.status === 'fulfilled' ? weekRes.value.data.week : null);
    const ae = allRes.status === 'fulfilled' ? (allRes.value.data.entries || []) : [];
    const au = usersRes.status === 'fulfilled' ? (usersRes.value.data.users || []) : [];
    setAllEntries(ae);
    setAllUsers(au);
    setLoading(false);
  }, [monday, isAdminOrHR]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function commitCell(taskId, date, raw) {
    setPending(true);
    try {
      await API.put('/timeentries/cell', { taskId: taskId||null, date, value: raw });
      await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid duration'); }
    finally { setPending(false); }
  }

  function handleTaskClick(taskId, spaceId) {
    if (spaceId) navigate(`/spaces/${spaceId}?task=${taskId}`);
    else navigate(`/tasks?taskId=${taskId}`);
  }

  async function handleDelete(id) {
    setPending(true);
    try {
      await API.delete(`/timeentries/${id}`);
      toast.success('Entry deleted');
      await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPending(false); }
  }

  async function handleSubmit() {
    setPending(true);
    try {
      await API.post('/timesheetweeks/submit', { week: weekKey(monday) });
      toast.success('Timesheet submitted for approval');
      await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPending(false); }
  }

  async function handleRecall() {
    setPending(true);
    try {
      await API.post('/timesheetweeks/recall', { week: weekKey(monday) });
      toast.success('Submission recalled');
      await fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPending(false); }
  }

  const TABS = isAdminOrHR
    ? [
        { id: 'my',         label: 'My timesheet' },
        { id: 'individual', label: 'Individual' },
        { id: 'all',        label: 'All timesheets' },
        { id: 'approvals',  label: 'Approvals' },
      ]
    : [
        { id: 'my', label: 'My timesheet' },
      ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

      {/* Top tab bar */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>{ setTab(t.id); setExtraTaskIds([]); }}
            className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
              tab===t.id ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}>
            {t.label}
            {tab===t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t"/>}
          </button>
        ))}
      </div>

      {/* Week nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {tab==='my' && <><Avatar name={user?.name} image={user?.avatar} size={10}/>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{user?.name}</p></>}
          <div className="flex items-center gap-1">
            <button onClick={()=>{setMonday(m=>addDays(m,-7));setExtraTaskIds([]);}} disabled={pending}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500"/>
            </button>
            <button onClick={()=>{setMonday(m=>addDays(m,7));setExtraTaskIds([]);}} disabled={pending}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500"/>
            </button>
            <span className="text-base font-bold text-slate-800 dark:text-slate-100 px-1">{rangeLabel(monday)}</span>
            <button onClick={()=>{setMonday(mondayOf(todayIST()));setExtraTaskIds([]);}} disabled={pending}
              className={`ml-1 px-3 py-1 text-sm rounded-lg border transition-colors disabled:opacity-50 ${
                isThisWeek
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}>
              This week
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tab==='my' && (
            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800">
              <button onClick={()=>setSubView('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subView==='grid'?'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100':'text-slate-500 hover:text-slate-700'}`}>
                <LayoutGrid className="w-3.5 h-3.5"/> Timesheet
              </button>
              <button onClick={()=>setSubView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${subView==='list'?'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100':'text-slate-500 hover:text-slate-700'}`}>
                <List className="w-3.5 h-3.5"/> Time entries
              </button>
            </div>
          )}
          {(tab==='my' || tab==='all') && (
            <button
              onClick={() => tab==='all' ? exportAllTimesheets(monday, allEntries, allUsers) : exportMyTimesheet(monday, entries, tasks)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Download className="w-3.5 h-3.5"/> Export CSV
            </button>
          )}
          {tab==='my' && weekStatus?.status === 'pending' && (
            <button onClick={handleRecall} disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 disabled:opacity-50 transition-colors">
              <RotateCcw className="w-3.5 h-3.5"/> Recall
            </button>
          )}
          {tab==='my' && weekStatus?.status === 'approved' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3.5 h-3.5"/> Approved
            </span>
          )}
          {tab==='my' && weekStatus?.status === 'rejected' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800" title={weekStatus.reviewNote}>
              <X className="w-3.5 h-3.5"/> Rejected
            </span>
          )}
          {tab==='my' && (!weekStatus || weekStatus.status === 'draft' || weekStatus.status === 'rejected') && (
            <button onClick={handleSubmit} disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors">
              <Send className="w-3.5 h-3.5"/> Submit
            </button>
          )}
        </div>
      </div>

      {tab==='my' && <p className="text-xs text-slate-400">{user?.name}'s timezone: IST</p>}
      {tab==='my' && weekStatus?.status === 'pending' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
          <Clock className="w-4 h-4 flex-shrink-0"/>
          <span>Timesheet submitted — awaiting approval. Editing locked.</span>
        </div>
      )}
      {tab==='my' && weekStatus?.status === 'approved' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0"/>
          <span>Timesheet approved. Editing locked.</span>
        </div>
      )}
      {tab==='my' && weekStatus?.status === 'rejected' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          <X className="w-4 h-4 flex-shrink-0"/>
          <span>Rejected: {weekStatus.reviewNote} — update and resubmit.</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tab==='all' && isAdminOrHR ? (
        <AllTimesheets monday={monday} allEntries={allEntries} allUsers={allUsers}/>
      ) : tab==='individual' && isAdminOrHR ? (
        <IndividualTimesheet monday={monday} allEntries={allEntries} allUsers={allUsers}/>
      ) : tab==='approvals' ? (
        <ApprovalsPanel/>
      ) : subView==='grid' ? (
        <MyTimesheetGrid
          monday={monday} entries={entries} tasks={tasks}
          pending={pending} onCommit={commitCell}
          extraTaskIds={extraTaskIds} setExtraTaskIds={setExtraTaskIds}
          onTaskClick={handleTaskClick}
          locked={weekStatus?.status === 'approved' || weekStatus?.status === 'pending'}
        />
      ) : (
        <MyEntriesList entries={entries} pending={pending} onDelete={handleDelete}/>
      )}
    </div>
  );
}

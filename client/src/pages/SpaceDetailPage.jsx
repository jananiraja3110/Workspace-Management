import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, pointerWithin, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Plus, LayoutList, LayoutGrid, X, Trash2,
  MessageSquare, Paperclip, Timer, Eye, EyeOff, Send,
  AlignLeft, Check, GripVertical, Search,
  Clock, CheckCircle2, AlertCircle, Circle, ChevronRight,
  Bold, Italic, Minus, Download, File, Flag, User, Calendar,
  CheckSquare, Square,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

// ── constants ─────────────────────────────────────────────────────────────────

const STATUSES = [
  { id: 'pending',     label: 'Backlog',     dot: 'bg-slate-400',   hex: '#94a3b8' },
  { id: 'todo',        label: 'To Do',       dot: 'bg-blue-500',    hex: '#3b82f6' },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-amber-500',   hex: '#f59e0b' },
  { id: 'completed',   label: 'Done',        dot: 'bg-emerald-500', hex: '#10b981' },
  { id: 'overdue',     label: 'Overdue',     dot: 'bg-red-500',     hex: '#ef4444' },
];

const PRIORITIES = [
  { id: 'urgent', label: 'Urgent', hex: '#ef4444', text: 'text-red-600'    },
  { id: 'high',   label: 'High',   hex: '#f97316', text: 'text-orange-600' },
  { id: 'medium', label: 'Medium', hex: '#f59e0b', text: 'text-amber-600'  },
  { id: 'low',    label: 'Low',    hex: '#0ea5e9', text: 'text-sky-600'    },
];

const stCfg  = (s) => STATUSES.find(x => x.id === s)   || STATUSES[0];
const priCfg = (p) => PRIORITIES.find(x => x.id === p) || PRIORITIES[2];
const fmtMins = (m) => { if (!m) return '0h'; const h = (m / 60).toFixed(1); return `${h}h`; };

// ── New Task Modal ─────────────────────────────────────────────────────────────
function NewTaskModal({ users, spaceId, onSave, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assignedTo: [], dueDate: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title required');
    setSaving(true);
    try {
      const payload = { ...form, assignedTo: form.assignedTo, space: spaceId };
      if (!payload.dueDate) delete payload.dueDate;
      const { data } = await API.post('/tasks', payload);
      onSave(data.task);
      toast.success('Task created');
      onClose();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 lg:pl-[260px]" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">New Task</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-4 h-4"/></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title <span className="text-red-500">*</span></label>
            <input autoFocus value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task name…"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Add description…"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500">
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500">
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assignees</label>
              <select multiple value={form.assignedTo} onChange={e => set('assignedTo', Array.from(e.target.selectedOptions, o => o.value))}
                size={Math.min(users.length, 4)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500">
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"/>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-60 flex items-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 6 }) {
  const px = size * 4;
  return (
    <div className="rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: px, height: px, fontSize: size <= 5 ? 9 : 11 }} title={name}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// ── Custom dropdown (colored options) ────────────────────────────────────────

function Dropdown({ trigger, children, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex" onClick={e => e.stopPropagation()}>
      <button type="button" disabled={disabled} onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="focus:outline-none">
        {trigger}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[130px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1"
          onClick={e => e.stopPropagation()}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function StatusSelect({ value, onChange, disabled }) {
  const sc = stCfg(value);
  return (
    <Dropdown disabled={disabled} trigger={
      <span className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`}/>
        {sc.label}
      </span>
    }>
      {(close) => STATUSES.map(s => {
        const cfg = stCfg(s.id);
        return (
          <button key={s.id} onClick={() => { onChange(s.id); close(); }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${s.id === value ? 'font-semibold' : ''}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}/>
            <span className="text-slate-700 dark:text-slate-200">{s.label}</span>
          </button>
        );
      })}
    </Dropdown>
  );
}

function PrioritySelect({ value, onChange, disabled }) {
  const pc = priCfg(value);
  return (
    <Dropdown disabled={disabled} trigger={
      <span className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        style={{ color: pc.hex }}>
        <Flag className="w-3 h-3 flex-shrink-0" style={{ fill: pc.hex, color: pc.hex }}/>
        {pc.label}
      </span>
    }>
      {(close) => PRIORITIES.map(p => (
        <button key={p.id} onClick={() => { onChange(p.id); close(); }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${p.id === value ? 'font-semibold' : ''}`}>
          <Flag className="w-3 h-3 flex-shrink-0" style={{ fill: p.hex, color: p.hex }}/>
          <span style={{ color: p.hex }}>{p.label}</span>
        </button>
      ))}
    </Dropdown>
  );
}

function AssigneeSelect({ value, users, onChange, disabled }) {
  const curId = value && typeof value === 'object' ? (value._id || '') : (value || '');
  const cur = users.find(u => u._id === curId);
  return (
    <Dropdown disabled={disabled} trigger={
      <span className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
        <User className="w-3 h-3 flex-shrink-0 text-slate-400"/>
        {cur ? cur.name : 'Assign'}
      </span>
    }>
      {(close) => (
        <>
          <button onClick={() => { onChange(null); close(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <User className="w-3 h-3"/> Unassigned
          </button>
          {users.map(u => (
            <button key={u._id} onClick={() => { onChange(u._id); close(); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${u._id === curId ? 'font-semibold' : ''}`}>
              <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0" style={{ fontSize: 8 }}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-slate-700 dark:text-slate-200 truncate">{u.name}</span>
            </button>
          ))}
        </>
      )}
    </Dropdown>
  );
}

function MultiAssigneeSelect({ assignees, users, onChange, disabled }) {
  const ids = assignees.map(a => a?._id || a).filter(Boolean);
  const assigned = ids.map(id => users.find(u => u._id === id)).filter(Boolean);
  const unassigned = users.filter(u => !ids.includes(u._id));

  function remove(uid) {
    onChange(ids.filter(id => id !== uid));
  }
  function add(uid) {
    if (!ids.includes(uid)) onChange([...ids, uid]);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assigned.map(u => (
        <span key={u._id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
          <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0" style={{ fontSize: 7 }}>
            {u.name.charAt(0).toUpperCase()}
          </div>
          {u.name}
          {!disabled && (
            <button onClick={() => remove(u._id)} className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors leading-none">
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <Dropdown trigger={
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors">
            <User className="w-3 h-3"/> Add
          </span>
        }>
          {(close) => (
            unassigned.length === 0
              ? <p className="px-3 py-2 text-xs text-slate-400">All users assigned</p>
              : unassigned.map(u => (
                <button key={u._id} onClick={() => { add(u._id); close(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0" style={{ fontSize: 8 }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-700 dark:text-slate-200 truncate">{u.name}</span>
                </button>
              ))
          )}
        </Dropdown>
      )}
      {assigned.length === 0 && disabled && (
        <span className="text-xs text-slate-400">Unassigned</span>
      )}
    </div>
  );
}

// ── TaskPanel ─────────────────────────────────────────────────────────────────

function TaskPanel({ task, users, isAdminOrHR, user, onUpdate, onDelete, onClose }) {
  const [editDesc, setEditDesc]     = useState(false);
  const [descDraft, setDescDraft]   = useState('');
  const [comment, setComment]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeInput, setTimeInput]   = useState('');
  const [showTime, setShowTime]     = useState(false);
  const [panelTab, setPanelTab]     = useState('Details');
  const subtaskRef = useRef(null);

  const t = task;
  const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
  const isWatching = t.watchers?.some(w => (w?._id || w) === user?._id);
  const subtasksDone  = t.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = t.subtasks?.length || 0;

  async function saveDesc() {
    if (descDraft === (t.description || '')) { setEditDesc(false); return; }
    await onUpdate(t._id, { description: descDraft }); setEditDesc(false);
  }
  async function addComment() {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await API.post(`/tasks/${t._id}/comments`, { text: comment });
      onUpdate(t._id, null, data.task); setComment('');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    setSubmitting(false);
  }
  async function addSubtask(e) {
    e.preventDefault();
    const v = subtaskRef.current?.value?.trim();
    if (!v) return;
    try {
      const { data } = await API.post(`/tasks/${t._id}/subtasks`, { title: v });
      onUpdate(t._id, null, data.task);
      if (subtaskRef.current) subtaskRef.current.value = '';
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  }
  async function toggleSubtask(subId) {
    try { const { data } = await API.patch(`/tasks/${t._id}/subtasks/${subId}`); onUpdate(t._id, null, data.task); }
    catch { toast.error('Failed'); }
  }
  async function deleteSubtask(subId) {
    try { const { data } = await API.delete(`/tasks/${t._id}/subtasks/${subId}`); onUpdate(t._id, null, data.task); }
    catch { toast.error('Failed'); }
  }
  async function toggleWatch() {
    try { const { data } = await API.patch(`/tasks/${t._id}/watch`); onUpdate(t._id, null, data.task); }
    catch { toast.error('Failed'); }
  }
  async function logTime() {
    if (!timeInput) return;
    const hours = parseFloat(timeInput);
    if (isNaN(hours) || hours <= 0) return;
    const minutes = Math.round(hours * 60);
    try {
      const { data } = await API.patch(`/tasks/${t._id}/time`, { minutes });
      onUpdate(t._id, null, data.task); setTimeInput(''); setShowTime(false); toast.success('Time logged');
    } catch { toast.error('Failed'); }
  }

  // Property row helper
  const PropRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex lg:pl-[260px]" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-xs">{t.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleWatch}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isWatching ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/40'}`}>
              {isWatching ? <Eye className="h-3.5 w-3.5"/> : <EyeOff className="h-3.5 w-3.5"/>}
              {isWatching ? 'Watching' : 'Watch'}
            </button>
            {isAdminOrHR && (
              <button onClick={() => { if (confirm('Delete this task?')) { onDelete(t._id); onClose(); } }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4"/>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors">
              <X className="h-4 w-4"/>
            </button>
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT: Title + Properties + Description + Subtasks + Files */}
          <div className="flex-1 overflow-y-auto border-r border-slate-200 dark:border-slate-700">

            {/* Title */}
            <div className="px-6 pt-5 pb-3">
              <input
                defaultValue={t.title}
                disabled={!isAdminOrHR}
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.title) onUpdate(t._id, { title: v }); else e.target.value = t.title; }}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.target.value = t.title; e.target.blur(); } }}
                className="w-full bg-transparent text-2xl font-bold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 disabled:cursor-default leading-tight"
              />
            </div>

            {/* Properties */}
            <div className="px-6 pb-2">
              {/* Status */}
              <PropRow icon={Check} label="Status">
                <StatusSelect value={t.status} onChange={v => onUpdate(t._id, { status: v })} />
              </PropRow>

              {/* Assignees */}
              <PropRow icon={User} label="Assignees">
                <MultiAssigneeSelect assignees={assignees} users={users}
                  onChange={ids => onUpdate(t._id, { assignedTo: ids })} disabled={!isAdminOrHR}/>
              </PropRow>

              {/* Dates — start + due */}
              <PropRow icon={Calendar} label="Dates">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Start</span>
                    <input type="date"
                      defaultValue={t.startDate ? format(new Date(t.startDate), 'yyyy-MM-dd') : ''}
                      disabled={!isAdminOrHR}
                      onChange={e => onUpdate(t._id, { startDate: e.target.value || null })}
                      className="text-sm text-slate-700 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400 disabled:opacity-50"/>
                  </div>
                  <span className="text-slate-300 dark:text-slate-600 mt-4">→</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Due</span>
                    <input type="date"
                      defaultValue={t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : ''}
                      disabled={!isAdminOrHR}
                      onChange={e => onUpdate(t._id, { dueDate: e.target.value || null })}
                      className="text-sm text-slate-700 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400 disabled:opacity-50"/>
                  </div>
                </div>
              </PropRow>

              {/* Priority */}
              <PropRow icon={Flag} label="Priority">
                <PrioritySelect value={t.priority} onChange={v => onUpdate(t._id, { priority: v })} disabled={!isAdminOrHR}/>
              </PropRow>

              {/* Time Estimate */}
              <PropRow icon={Timer} label="Time estimate">
                <span className="text-sm text-slate-600 dark:text-slate-400">{fmtMins(t.timeEstimate) || 'Empty'}</span>
              </PropRow>

              {/* Track Time */}
              <PropRow icon={Timer} label="Track time">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{fmtMins(t.timeSpent)}</span>
                  <button onClick={() => setShowTime(v => !v)} className="text-xs text-indigo-500 hover:underline">{showTime ? 'Cancel' : '+ Add time'}</button>
                </div>
              </PropRow>
              {showTime && (
                <div className="flex items-center gap-2 py-2 pl-[136px]">
                  <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus-within:border-indigo-400 overflow-hidden">
                    <input type="number" min="0.1" step="0.25" value={timeInput} onChange={e => setTimeInput(e.target.value)} placeholder="e.g. 1.5"
                      className="w-24 text-sm px-3 py-1.5 bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none"/>
                    <span className="text-xs text-slate-400 pr-3 select-none">hrs</span>
                  </div>
                  <button onClick={logTime} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Log</button>
                </div>
              )}

            </div>

            {/* Tabs: Details | Subtasks | Action Items */}
            <div className="border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                {['Details', 'Subtasks', 'Action Items'].map(tab => (
                  <button key={tab} onClick={() => setPanelTab(tab)}
                    className={`relative py-2.5 px-1 mr-6 text-sm font-medium transition-colors ${
                      panelTab === tab
                        ? 'text-slate-800 dark:text-slate-100'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}>
                    {tab}
                    {panelTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t"/>
                    )}
                  </button>
                ))}
              </div>

              {panelTab === 'Details' && (
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      <AlignLeft className="w-3.5 h-3.5"/> Description
                    </div>
                    {editDesc ? (
                      <div>
                        <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-300 dark:border-slate-600">
                            {[['**','**',Bold],['_','_',Italic],['- ','',Minus]].map(([b,a,Icon],i) => (
                              <button key={i} type="button"
                                onClick={() => { const el=document.activeElement; const s=el?.selectionStart??descDraft.length; const e2=el?.selectionEnd??s; setDescDraft(v=>v.slice(0,s)+b+v.slice(s,e2)+a+v.slice(e2)); }}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500"><Icon className="h-3 w-3"/></button>
                            ))}
                          </div>
                          <textarea rows={5} placeholder="Add description…" value={descDraft} onChange={e => setDescDraft(e.target.value)}
                            className="w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none resize-none"/>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={saveDesc} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Save</button>
                          <button onClick={() => setEditDesc(false)} className="px-3 py-1.5 text-slate-500 text-xs hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => { if (isAdminOrHR) { setDescDraft(t.description || ''); setEditDesc(true); } }}
                        className={`text-sm text-slate-600 dark:text-slate-400 min-h-[48px] rounded-lg px-1 py-1 ${isAdminOrHR ? 'cursor-text hover:bg-slate-50 dark:hover:bg-slate-800' : ''} ${!t.description ? 'italic text-slate-400 dark:text-slate-600' : ''}`}>
                        {t.description || (isAdminOrHR ? 'Add description…' : 'No description')}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      <Paperclip className="w-3.5 h-3.5"/> Attachments
                    </div>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors mb-2">
                      <Paperclip className="w-3.5 h-3.5 flex-shrink-0"/> Drop your files here or <span className="text-indigo-500 underline">upload</span>
                      <input type="file" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const fd = new FormData(); fd.append('file', file);
                        try {
                          const { data } = await API.post(`/tasks/${t._id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                          onUpdate(t._id, null, data.task); toast.success('File attached');
                        } catch (err) { toast.error(err?.response?.data?.message || 'Upload failed'); }
                        e.target.value = '';
                      }}/>
                    </label>
                    {t.attachments?.map(a => (
                      <div key={a._id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 mb-1">
                        <File className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                        <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{a.name}</span>
                        <span className="text-xs text-slate-400">{a.size ? (a.size/1024).toFixed(0)+' KB' : ''}</span>
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-500"><Download className="w-3.5 h-3.5"/></a>
                        {isAdminOrHR && (
                          <button onClick={async () => {
                            if (!confirm('Delete this attachment?')) return;
                            try {
                              const { data } = await API.delete(`/tasks/${t._id}/attachments/${a._id}`);
                              onUpdate(t._id, null, data.task);
                              toast.success('Attachment deleted');
                            } catch { toast.error('Delete failed'); }
                          }} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5"/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {panelTab === 'Subtasks' && (
                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    <Check className="w-3.5 h-3.5"/> Subtasks {subtasksTotal > 0 && <span className="normal-case font-normal">({subtasksDone}/{subtasksTotal})</span>}
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {t.subtasks?.length === 0 && !isAdminOrHR && <p className="px-3 py-2 text-sm text-slate-400 italic">No subtasks</p>}
                    {t.subtasks?.map(s => (
                      <div key={s._id} className="group flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-700/50 px-3 py-2 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <button onClick={() => toggleSubtask(s._id)} className={`flex w-4 h-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${s.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
                          {s.completed && <Check className="w-2.5 h-2.5" strokeWidth={3}/>}
                        </button>
                        <span className={`flex-1 text-sm ${s.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{s.title}</span>
                        {isAdminOrHR && (
                          <button onClick={() => deleteSubtask(s._id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        )}
                      </div>
                    ))}
                    {isAdminOrHR && (
                      <form onSubmit={addSubtask} className="flex items-center gap-2.5 px-3 py-2 border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 focus-within:bg-slate-50 dark:focus-within:bg-slate-800/40 transition-colors">
                        <Plus className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                        <input ref={subtaskRef} placeholder="Add subtask…" className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"/>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {panelTab === 'Action Items' && (
                <div className="px-6 py-4">
                  <p className="text-sm text-slate-400 italic">No action items yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Activity feed + Comment box (always visible, like ClickUp) */}
          <div className="w-80 flex-shrink-0 flex flex-col bg-slate-50 dark:bg-slate-800/20">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Activity</span>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {t.comments?.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center pt-6">No activity yet</p>
              )}
              {t.comments?.map(c => (
                <div key={c._id} className="flex gap-2.5">
                  <Avatar name={c.user?.name || '?'} size={6}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.user?.name}</span>
                      <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment box pinned at bottom */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex-shrink-0">
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Write a comment… (Ctrl+Enter)"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(); } }}
                rows={3}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-400 resize-none"/>
              <div className="flex justify-end mt-2">
                <button onClick={addComment} disabled={submitting || !comment.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  <Send className="h-3 w-3"/> Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TaskRow (list view) ───────────────────────────────────────────────────────

function TaskRow({ task, users, onUpdate, onDelete, onOpen, isSelected, onToggleSelect }) {
  const sc = stCfg(task.status);
  const pc = priCfg(task.priority);
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
  const assigneeId = assignees[0] && typeof assignees[0] === 'object' ? assignees[0]._id : (assignees[0] || '');
  const _istN = new Date(Date.now() + 5.5*60*60*1000);
  const _todM = new Date(Date.UTC(_istN.getUTCFullYear(), _istN.getUTCMonth(), _istN.getUTCDate()));
  const dueDiff = task.dueDate ? Math.ceil((new Date(task.dueDate) - _todM) / 86400000) : null;
  const dueColor = dueDiff === null ? 'text-slate-400' : dueDiff < 0 ? 'text-red-500' : dueDiff === 0 ? 'text-orange-500' : dueDiff <= 2 ? 'text-yellow-500' : 'text-slate-400';

  return (
    <div onClick={() => onOpen(task)}
      className={`group flex items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-slate-700/40 first:border-t-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/5' : ''}`}>

      <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(task._id)}
        onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded accent-indigo-500 flex-shrink-0"/>

      <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 flex-shrink-0"/>

      {/* Status */}
      <div onClick={e => e.stopPropagation()}>
        <StatusSelect value={task.status} onChange={v => onUpdate(task._id, { status: v })}/>
      </div>

      {/* Title */}
      <span
        onClick={() => onOpen(task)}
        className={`flex-1 min-w-0 text-sm cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 truncate transition-colors ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}
      >{task.title}</span>

      {/* Hover controls */}
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {task.comments?.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-slate-400"><MessageSquare className="w-3 h-3"/>{task.comments.length}</span>
        )}
        {task.attachments?.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-slate-400"><Paperclip className="w-3 h-3"/>{task.attachments.length}</span>
        )}
      </div>

      {/* Priority */}
      <div onClick={e => e.stopPropagation()}>
        <PrioritySelect value={task.priority} onChange={v => onUpdate(task._id, { priority: v })}/>
      </div>

      {/* Assignee */}
      <div onClick={e => e.stopPropagation()}>
        <AssigneeSelect
          value={assigneeId}
          users={users}
          onChange={v => onUpdate(task._id, { assignedTo: v ? [v] : [] })}
        />
      </div>

      {/* Due date */}
      <div onClick={e => e.stopPropagation()} className={`flex items-center gap-1 text-xs flex-shrink-0 ${dueColor}`}>
        <Calendar className="w-3 h-3"/>
        {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </div>

      {/* Delete */}
      <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) onDelete(task._id); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5"/>
      </button>
    </div>
  );
}

// ── StatusGroup (list view) ───────────────────────────────────────────────────

function StatusGroup({ status, tasks, spaceId, users, isAdminOrHR, onUpdate, onDelete, onOpen, selectedIds, onToggleSelect }) {
  const sc = stCfg(status);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const addRef = useRef(null);

  async function addTask(e) {
    e?.preventDefault();
    const title = addRef.current?.value?.trim();
    if (!title) { setAdding(false); return; }
    try {
      const { data } = await API.post('/tasks', { title, status, priority: 'medium', space: spaceId });
      onUpdate(data.task._id, null, data.task, true);
      if (addRef.current) addRef.current.value = '';
      setAdding(false);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  }

  return (
    <section className="mb-1">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/10 rounded-lg transition-colors select-none"
        onClick={() => setOpen(o => !o)}>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}/>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sc.label}</span>
        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700/50 rounded-full px-2 py-0.5">{tasks.length}</span>
        {isAdminOrHR && open && (
          <button onClick={e => { e.stopPropagation(); setAdding(true); }}
            className="ml-auto p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors">
            <Plus className="w-3.5 h-3.5"/>
          </button>
        )}
      </div>

      {open && (
        <div className="ml-3 border border-slate-200 dark:border-slate-700/40 rounded-xl bg-white dark:bg-slate-900/40">
          {/* Header row */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <div className="w-3.5 flex-shrink-0"/>
            <div className="w-3 flex-shrink-0"/>
            <div className="w-20 flex-shrink-0"/>
            <div className="flex-1">Task</div>
            <div className="w-20 text-center flex-shrink-0">Priority</div>
            <div className="w-24 text-center flex-shrink-0">Assignee</div>
            <div className="w-16 text-center flex-shrink-0">Due</div>
            <div className="w-6 flex-shrink-0"/>
          </div>

          {tasks.length === 0 && !adding && (
            <p className="px-4 py-3 text-xs text-slate-400 italic">No tasks</p>
          )}

          {tasks.map(task => (
            <TaskRow key={task._id} task={task} users={users}
              isSelected={selectedIds.has(task._id)} onToggleSelect={onToggleSelect}
              onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}/>
          ))}

          {adding && (
            <form onSubmit={addTask}
              className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/20 text-slate-400 focus-within:text-slate-700 dark:focus-within:text-slate-200 transition-colors">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`}/>
              <input autoFocus ref={addRef} placeholder="Task name…"
                onKeyDown={e => { if (e.key === 'Escape') setAdding(false); }}
                onBlur={() => setTimeout(() => setAdding(false), 150)}
                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"/>
              <button type="submit" className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Add</button>
              <button type="button" onClick={() => setAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-3.5 h-3.5"/>
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

// ── Board card ────────────────────────────────────────────────────────────────

function BoardCard({ task, users, onUpdate, onDelete, onOpen, overlay }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task._id, data: { type: 'task' } });

  const sc = stCfg(task.status);
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
  const assigneeId = assignees[0] && typeof assignees[0] === 'object' ? assignees[0]._id : (assignees[0] || '');
  const downPos = useRef(null);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? { backgroundColor: sc.hex + '0d', borderColor: sc.hex + '33', borderLeftColor: sc.hex }
        : { transform: CSS.Translate.toString(transform), transition, backgroundColor: sc.hex + '0d', borderColor: sc.hex + '33', borderLeftColor: sc.hex }}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onPointerDownCapture={e => { downPos.current = { x: e.clientX, y: e.clientY }; }}
      onClick={e => {
        const d = downPos.current;
        if (d && (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4)) return;
        onOpen(task);
      }}
      className={`group touch-none rounded-lg border border-l-[3px] p-3 shadow-sm transition-shadow select-none ${
        !overlay ? 'cursor-grab hover:shadow-md active:cursor-grabbing' : 'cursor-grabbing rotate-1 shadow-lg'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className={`text-sm font-medium leading-snug mb-2 ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
        {task.title}
      </p>

      <div className="flex flex-wrap items-center gap-1.5"
        onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <PrioritySelect value={task.priority} onChange={v => onUpdate(task._id, { priority: v })}/>
        <AssigneeSelect
          value={assigneeId}
          users={users}
          onChange={v => onUpdate(task._id, { assignedTo: v ? [v] : [] })}
        />
        {task.dueDate && (
          <span className="text-xs text-slate-400 flex items-center gap-0.5">
            <Calendar className="w-3 h-3"/>{format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) onDelete(task._id); }}
          className="ml-auto opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5">
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  );
}

// ── Board column ──────────────────────────────────────────────────────────────

function BoardColumn({ status, tasks, users, isAdminOrHR, spaceId, onUpdate, onDelete, onOpen, setTasks }) {
  const sc = stCfg(status);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  async function addCard() {
    try {
      const { data } = await API.post('/tasks', { title: 'New Task', status, priority: 'medium', space: spaceId });
      setTasks(prev => [data.task, ...prev]);
      onOpen(data.task);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  }

  return (
    <section className="flex w-72 flex-shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
        style={{ backgroundColor: sc.hex + '14', borderColor: sc.hex + '33' }}>
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.hex }}/>
        <h2 className="text-sm font-semibold" style={{ color: sc.hex }}>{sc.label}</h2>
        <span className="ml-auto rounded-full px-1.5 text-xs font-medium tabular-nums"
          style={{ backgroundColor: sc.hex + '1f', color: sc.hex }}>{tasks.length}</span>
        {isAdminOrHR && (
          <button onClick={addCard} className="p-0.5 rounded text-slate-400 hover:text-indigo-500 transition-colors">
            <Plus className="w-4 h-4"/>
          </button>
        )}
      </div>

      {/* Drop zone */}
      <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef}
          className={`flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-lg p-1 transition-colors ${isOver ? 'bg-slate-100 dark:bg-slate-700/30' : ''}`}>
          {tasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10 text-xs text-slate-400">
              Drop tasks here
            </div>
          ) : tasks.map(task => (
            <BoardCard key={task._id} task={task} users={users}
              onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}/>
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

// ── BoardDnd ──────────────────────────────────────────────────────────────────

function BoardDnd({ statuses, tasks, users, isAdminOrHR, spaceId, onUpdate, onDelete, onOpen, setTasks }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

  function columnForId(id) {
    const direct = statuses.find(s => s.id === id);
    if (direct) return direct;
    return statuses.find(s => tasks.filter(t => t.status === s.id).some(t => t._id === id)) || null;
  }

  function handleDragStart({ active }) {
    setActiveId(String(active.id));
  }

  async function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;
    const taskId = String(active.id);
    const moved = tasks.find(t => t._id === taskId);
    if (!moved) return;

    const targetCol = columnForId(String(over.id));
    if (!targetCol) return;
    const targetStatus = targetCol.id;
    if (targetStatus === moved.status && String(over.id) === taskId) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: targetStatus } : t));
    try {
      const { data } = await API.put(`/tasks/${taskId}`, { status: targetStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to move');
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: moved.status } : t));
    }
  }

  return (
    <DndContext
      id="space-board"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {statuses.map(st => (
          <BoardColumn
            key={st.id}
            status={st.id}
            tasks={tasks.filter(t => t.status === st.id)}
            users={users}
            isAdminOrHR={isAdminOrHR}
            spaceId={spaceId}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onOpen={onOpen}
            setTasks={setTasks}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <BoardCard task={activeTask} users={users}
            onUpdate={() => {}} onDelete={() => {}} onOpen={() => {}} overlay/>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── GroupBy Dropdown ──────────────────────────────────────────────────────────

const GROUP_OPTIONS = [
  { id: 'status',   label: 'Status',   icon: '◎' },
  { id: 'assignee', label: 'Assignee', icon: '◉' },
  { id: 'priority', label: 'Priority', icon: '⚑' },
  { id: 'dueDate',  label: 'Due date', icon: '📅' },
];

function GroupByDropdown({ groupBy, setGroupBy }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const active = GROUP_OPTIONS.find(o => o.id === groupBy) || GROUP_OPTIONS[0];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-500/30">
        <span>⚌</span> Group: {active.label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5">
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Group by</p>
          {GROUP_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => { setGroupBy(opt.id); setOpen(false); }}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${groupBy === opt.id ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
              <span className="flex items-center gap-2"><span className="text-base">{opt.icon}</span>{opt.label}</span>
              {groupBy === opt.id && <span className="text-indigo-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Generic Group (Priority / Due Date grouping) ──────────────────────────────

function GenericGroup({ label, dot, tasks, users, isAdminOrHR, selectedIds, onToggleSelect, onUpdate, onDelete, onOpen }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-1">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/10 rounded-lg select-none"
        onClick={() => setOpen(o => !o)}>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}/>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`}/>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700/50 rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      {open && (
        <div className="ml-3 border border-slate-200 dark:border-slate-700/40 rounded-xl bg-white dark:bg-slate-900/40">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <div className="flex-1">Task</div>
            <div className="w-20 text-center">Priority</div>
            <div className="w-24 text-center">Assignee</div>
            <div className="w-16 text-center">Due</div>
            <div className="w-6"/>
          </div>
          {tasks.map(t => (
            <TaskRow key={t._id} task={t} users={users} isAdminOrHR={isAdminOrHR}
              isSelected={selectedIds.has(t._id)} onToggleSelect={onToggleSelect}
              onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}/>
          ))}
          {tasks.length === 0 && <p className="px-3 py-3 text-xs text-slate-400 italic">No tasks</p>}
        </div>
      )}
    </section>
  );
}

// ── Assignee Group ────────────────────────────────────────────────────────────

function AssigneeGroup({ assignee, tasks, users, isAdminOrHR, selectedIds, onToggleSelect, onUpdate, onDelete, onOpen }) {
  const [open, setOpen] = useState(true);
  const name     = assignee?.name || 'Unassigned';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);

  return (
    <section className="mb-2">
      <div className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/10 rounded-lg transition-colors select-none"
        onClick={() => setOpen(o => !o)}>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}/>
        {assignee ? (
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{initials}</div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"/>
          </div>
        )}
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{name}</span>
        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700/50 rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      {open && (
        <div className="ml-3 border border-slate-200 dark:border-slate-700/40 rounded-xl bg-white dark:bg-slate-900/40">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <div className="w-3.5 flex-shrink-0"/><div className="w-3 flex-shrink-0"/><div className="w-20 flex-shrink-0"/>
            <div className="flex-1">Task</div>
            <div className="w-20 text-center flex-shrink-0">Priority</div>
            <div className="w-24 text-center flex-shrink-0">Assignee</div>
            <div className="w-16 text-center flex-shrink-0">Due</div>
            <div className="w-6 flex-shrink-0"/>
          </div>
          {tasks.length === 0 && <p className="px-4 py-3 text-xs text-slate-400 italic">No tasks</p>}
          {tasks.map(task => (
            <TaskRow key={task._id} task={task} users={users}
              isSelected={selectedIds.has(task._id)} onToggleSelect={onToggleSelect}
              onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}/>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SpaceDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [space, setSpace]         = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [view, setView]           = useState('list');
  const [groupBy, setGroupBy]     = useState('status');
  const [loading, setLoading]     = useState(true);
  const [selectedTask, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch]       = useState('');
  const [priFilter, setPriFilter] = useState('');
  const [myTasksOnly, setMyTasks] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, tr, ur] = await Promise.all([
        API.get(`/spaces/${id}`),
        API.get(`/tasks?space=${id}`),
        API.get('/users?isActive=true'),
      ]);
      setSpace(sr.data.space);
      setTasks(tr.data.tasks || []);
      setUsers(ur.data.users || ur.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchAll(); setSelected(null); setSelectedIds(new Set()); }, [fetchAll]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId || !tasks.length) return;
    const found = tasks.find(t => t._id === taskId);
    if (found) setSelected(found);
  }, [tasks, searchParams]);

  async function handleUpdate(taskId, patch, fullTask, isNew) {
    if (fullTask) {
      if (isNew) {
        setTasks(prev => [fullTask, ...prev.filter(t => t._id !== fullTask._id)]);
      } else {
        setTasks(prev => prev.map(t => t._id === taskId ? fullTask : t));
      }
      if (selectedTask?._id === taskId) setSelected(fullTask);
      return;
    }
    try {
      const { data } = await API.put(`/tasks/${taskId}`, patch);
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
      if (selectedTask?._id === taskId) setSelected(data.task);
    } catch (err) { toast.error(err?.response?.data?.message || 'Update failed'); }
  }

  async function handleDelete(taskId) {
    try {
      await API.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      if (selectedTask?._id === taskId) setSelected(null);
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  }

  function toggleSelect(taskId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  const filtered = tasks.filter(t => {
    if (myTasksOnly) {
      const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      if (!a.some(x => (x?._id || x) === user?._id)) return false;
    }
    if (priFilter && t.priority !== priFilter) return false;
    if (search && !(t.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  // Build dynamic groups based on groupBy
  const dynamicGroups = (() => {
    if (groupBy === 'assignee') {
      const map = new Map();
      filtered.forEach(t => {
        const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
        if (assignees.length === 0) {
          if (!map.has('unassigned')) map.set('unassigned', { key: 'unassigned', label: 'Unassigned', assignee: null, tasks: [], dot: 'bg-slate-400' });
          map.get('unassigned').tasks.push(t);
        } else {
          assignees.forEach(a => {
            const uid = a?._id || a;
            const userObj = users.find(u => u._id === uid) || (typeof a === 'object' ? a : null);
            if (!map.has(uid)) map.set(uid, { key: uid, label: userObj?.name || 'Unknown', assignee: userObj, tasks: [], dot: 'bg-indigo-500' });
            map.get(uid).tasks.push(t);
          });
        }
      });
      return [...map.values()].sort((a, b) => (a.label || 'zzz').localeCompare(b.label || 'zzz'));
    }
    if (groupBy === 'priority') {
      const ORDER = ['urgent', 'high', 'medium', 'low', 'none'];
      const DOTS  = { urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-blue-400', none: 'bg-slate-400' };
      const LABELS = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'No Priority' };
      const map = new Map(ORDER.map(p => [p, { key: p, label: LABELS[p], tasks: [], dot: DOTS[p] }]));
      filtered.forEach(t => { const p = t.priority || 'none'; if (map.has(p)) map.get(p).tasks.push(t); });
      return [...map.values()].filter(g => g.tasks.length > 0);
    }
    if (groupBy === 'dueDate') {
      const groups = [
        { key: 'overdue',  label: 'Overdue',    tasks: [], dot: 'bg-red-500' },
        { key: 'today',    label: 'Today',       tasks: [], dot: 'bg-orange-500' },
        { key: 'week',     label: 'This Week',   tasks: [], dot: 'bg-yellow-500' },
        { key: 'later',    label: 'Later',       tasks: [], dot: 'bg-blue-400' },
        { key: 'none',     label: 'No Due Date', tasks: [], dot: 'bg-slate-400' },
      ];
      const _istS = new Date(Date.now() + 5.5*60*60*1000);
      const now = new Date(Date.UTC(_istS.getUTCFullYear(), _istS.getUTCMonth(), _istS.getUTCDate()));
      const weekEnd = new Date(now.getTime() + 7*86400000);
      filtered.forEach(t => {
        if (!t.dueDate) { groups[4].tasks.push(t); return; }
        const d = new Date(t.dueDate); const dMid = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        if (dMid < now) groups[0].tasks.push(t);
        else if (dMid.getTime() === now.getTime()) groups[1].tasks.push(t);
        else if (dMid <= weekEnd) groups[2].tasks.push(t);
        else groups[3].tasks.push(t);
      });
      return groups.filter(g => g.tasks.length > 0);
    }
    // default: status (unchanged)
    return [];
  })();

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">

      {/* Space name + view tab bar */}
      <div className="flex items-center gap-0 px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 overflow-x-auto">
        {/* Space icon + name */}
        <div className="flex items-center gap-2 pr-4 mr-2 border-r border-slate-200 dark:border-slate-700">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: space?.color || '#6366F1' }}>
            {space?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{space?.name || 'Space'}</h1>
        </div>

        {/* View tabs */}
        {[['board', LayoutGrid, 'Board'], ['list', LayoutList, 'List']].map(([v, Icon, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              view === v ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            <Icon className="w-3.5 h-3.5"/>{label}
          </button>
        ))}
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1 px-3 py-3 text-xs text-slate-400 hover:text-indigo-500 border-b-2 border-transparent whitespace-nowrap ml-1">
          <Plus className="w-3.5 h-3.5"/> View
        </button>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none w-36"/>
          </div>
          <select value={priFilter} onChange={e => setPriFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:border-indigo-400">
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button onClick={() => setMyTasks(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${myTasksOnly ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
            <User className="w-3.5 h-3.5"/> {myTasksOnly ? 'My tasks ✕' : 'My tasks'}
          </button>
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5"/> Add Task
          </button>
        </div>
      </div>

      {/* Group-by chip bar */}
      {view === 'list' && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
          <GroupByDropdown groupBy={groupBy} setGroupBy={setGroupBy} />
          {groupBy !== 'status' && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800">
              Expanded
            </span>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-200 dark:border-indigo-500/20 flex-shrink-0 text-xs">
          <span className="font-medium text-indigo-700 dark:text-indigo-300">{selectedIds.size} selected</span>
          {STATUSES.map(s => (
            <button key={s.id} onClick={async () => {
              const ids = [...selectedIds];
              try {
                await Promise.all(ids.map(tid => API.put(`/tasks/${tid}`, { status: s.id })));
                setTasks(prev => prev.map(t => ids.includes(t._id) ? { ...t, status: s.id } : t));
                setSelectedIds(new Set());
              } catch (err) { toast.error(err?.response?.data?.message || 'Bulk update failed'); }
            }} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition-colors">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>{s.label}
            </button>
          ))}
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {view === 'list' ? (
            <div className="space-y-1">
              {groupBy === 'status' ? (
                STATUSES.map(st => (
                  <StatusGroup key={st.id} status={st.id}
                    tasks={filtered.filter(t => t.status === st.id)}
                    spaceId={id} users={users} isAdminOrHR={isAdminOrHR}
                    selectedIds={selectedIds} onToggleSelect={toggleSelect}
                    onUpdate={handleUpdate} onDelete={handleDelete}
                    onOpen={task => setSelected(task)}/>
                ))
              ) : groupBy === 'assignee' ? (
                dynamicGroups.map((g, i) => (
                  <AssigneeGroup key={g.key + i}
                    assignee={g.assignee} tasks={g.tasks}
                    users={users} isAdminOrHR={isAdminOrHR}
                    selectedIds={selectedIds} onToggleSelect={toggleSelect}
                    onUpdate={handleUpdate} onDelete={handleDelete}
                    onOpen={task => setSelected(task)}/>
                ))
              ) : (
                dynamicGroups.map((g, i) => (
                  <GenericGroup key={g.key + i}
                    label={g.label} dot={g.dot} tasks={g.tasks}
                    users={users} isAdminOrHR={isAdminOrHR}
                    selectedIds={selectedIds} onToggleSelect={toggleSelect}
                    onUpdate={handleUpdate} onDelete={handleDelete}
                    onOpen={task => setSelected(task)}/>
                ))
              )}
            </div>
          ) : (
            <BoardDnd
              statuses={STATUSES}
              tasks={filtered}
              users={users}
              isAdminOrHR={isAdminOrHR}
              spaceId={id}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onOpen={t => setSelected(t)}
              setTasks={setTasks}
            />
          )}
        </div>

      </div>

      {selectedTask && (
        <TaskPanel
          key={selectedTask._id}
          task={selectedTask}
          users={users}
          isAdminOrHR={isAdminOrHR}
          user={user}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setSelected(null)}
        />
      )}

      {showNewModal && (
        <NewTaskModal
          users={users}
          spaceId={id}
          onSave={task => setTasks(prev => [task, ...prev])}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}

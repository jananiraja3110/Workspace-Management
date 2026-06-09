import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, pointerWithin,
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
  AlignLeft, Check, Search,
  Calendar, ChevronRight,
  Bold, Italic, Minus, Download, File, Flag, User,
  GripVertical,
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
const fmtMins = (m) => { if (!m) return '0m'; const h = Math.floor(m/60), min=m%60; return h?`${h}h ${min}m`:`${min}m`; };

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 6 }) {
  const px = size * 4;
  return (
    <div className="rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: px, height: px, fontSize: size <= 5 ? 9 : 11 }} title={name}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// ── StatusSelect / PrioritySelect / AssigneeSelect ────────────────────────────

function StatusSelect({ value, onChange, disabled }) {
  const sc = stCfg(value);
  return (
    <div className="relative inline-flex items-center">
      <span className={`absolute left-2.5 w-2 h-2 rounded-full pointer-events-none ${sc.dot}`}/>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        onClick={e => e.stopPropagation()}
        className="pl-6 pr-2 py-1 text-xs font-medium rounded-full border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none">
        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

function PrioritySelect({ value, onChange, disabled }) {
  const pc = priCfg(value);
  return (
    <div className="relative inline-flex items-center">
      <Flag className="absolute left-2 w-3 h-3 pointer-events-none" style={{ fill: pc.hex, color: pc.hex }}/>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        onClick={e => e.stopPropagation()}
        className={`pl-6 pr-2 py-1 text-xs font-medium rounded-full border border-transparent bg-slate-100 dark:bg-slate-700/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none ${pc.text}`}>
        {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
    </div>
  );
}

function AssigneeSelect({ value, users, onChange, disabled }) {
  const curId = typeof value === 'object' ? value?._id || '' : value || '';
  return (
    <div className="relative inline-flex items-center">
      <User className="absolute left-2 w-3 h-3 pointer-events-none text-slate-400"/>
      <select value={curId} onChange={e => onChange(e.target.value || null)} disabled={disabled}
        onClick={e => e.stopPropagation()}
        className="pl-6 pr-2 py-1 text-xs font-medium rounded-full border border-transparent bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none">
        <option value="">Unassigned</option>
        {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
      </select>
    </div>
  );
}

// ── TaskPanel ─────────────────────────────────────────────────────────────────

function TaskPanel({ task, users, isAdminOrHR, user, onUpdate, onDelete, onClose }) {
  const [activeTab, setActiveTab]   = useState('details');
  const [editDesc, setEditDesc]     = useState(false);
  const [descDraft, setDescDraft]   = useState('');
  const [comment, setComment]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeInput, setTimeInput]   = useState('');
  const [showTime, setShowTime]     = useState(false);
  const subtaskRef = useRef(null);

  const t = task;
  const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
  const isWatching = t.watchers?.some(w => (w?._id || w) === user?._id);
  const subtasksDone  = t.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = t.subtasks?.length || 0;

  const TABS = [
    { id: 'details',     label: 'Details' },
    { id: 'subtasks',    label: `Subtasks${subtasksTotal ? ` (${subtasksDone}/${subtasksTotal})` : ''}` },
    { id: 'comments',    label: `Activity${t.comments?.length ? ` (${t.comments.length})` : ''}` },
    { id: 'attachments', label: `Files${t.attachments?.length ? ` (${t.attachments.length})` : ''}` },
  ];

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
    try {
      const { data } = await API.patch(`/tasks/${t._id}/time`, { minutes: Number(timeInput) });
      onUpdate(t._id, null, data.task); setTimeInput(''); setShowTime(false); toast.success('Time logged');
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="w-[440px] flex-shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <StatusSelect value={t.status} onChange={v => onUpdate(t._id, { status: v })} />
        <div className="flex items-center gap-1">
          <button onClick={toggleWatch}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${isWatching ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/40'}`}>
            {isWatching ? <Eye className="h-3.5 w-3.5"/> : <EyeOff className="h-3.5 w-3.5"/>}
            {isWatching ? 'Watching' : 'Watch'}
          </button>
          {isAdminOrHR && (
            <button onClick={() => { if (confirm('Delete this task?')) onDelete(t._id); }}
              className="p-1.5 rounded text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5"/>
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors">
            <X className="h-4 w-4"/>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <input
          defaultValue={t.title}
          disabled={!isAdminOrHR}
          onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.title) onUpdate(t._id, { title: v }); else e.target.value = t.title; }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.target.value = t.title; e.target.blur(); } }}
          className="w-full bg-transparent text-base font-semibold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 border-b border-transparent focus:border-indigo-300 pb-0.5 disabled:cursor-default"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0 px-2">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Properties</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Priority</span>
                <PrioritySelect value={t.priority} onChange={v => onUpdate(t._id, { priority: v })} disabled={!isAdminOrHR}/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Assignees</span>
                <AssigneeSelect value={assignees[0]?._id || assignees[0] || ''} users={users}
                  onChange={v => onUpdate(t._id, { assignedTo: v ? [v] : [] })} disabled={!isAdminOrHR}/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Due date</span>
                <input type="date"
                  defaultValue={t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : ''}
                  disabled={!isAdminOrHR}
                  onChange={e => onUpdate(t._id, { dueDate: e.target.value || null })}
                  className="text-xs text-slate-700 dark:text-slate-300 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400 disabled:opacity-50"/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Time estimate</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{fmtMins(t.timeEstimate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Time spent</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400">{fmtMins(t.timeSpent)}</span>
                  <button onClick={() => setShowTime(v => !v)} className="p-0.5 rounded text-slate-400 hover:text-indigo-500 transition-colors">
                    <Timer className="h-3 w-3"/>
                  </button>
                </div>
              </div>
              {showTime && (
                <div className="flex items-center gap-2">
                  <input type="number" value={timeInput} onChange={e => setTimeInput(e.target.value)} placeholder="minutes"
                    className="flex-1 text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-400"/>
                  <button onClick={logTime} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Log</button>
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1"><AlignLeft className="h-3 w-3"/> Description</p>
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
                    <button onClick={saveDesc} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Save</button>
                    <button onClick={() => setEditDesc(false)} className="px-3 py-1 text-slate-500 text-xs hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => { if (isAdminOrHR) { setDescDraft(t.description || ''); setEditDesc(true); } }}
                  className={`text-sm text-slate-600 dark:text-slate-400 min-h-[40px] rounded-lg p-2 ${isAdminOrHR ? 'cursor-text hover:bg-slate-100 dark:hover:bg-slate-700/40' : ''} ${!t.description ? 'italic text-slate-400 dark:text-slate-600' : ''}`}>
                  {t.description || (isAdminOrHR ? 'Add description…' : 'No description')}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subtasks' && (
          <div className="space-y-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 overflow-hidden">
              {t.subtasks?.length === 0 && <p className="px-3 py-3 text-xs text-slate-400 italic">No subtasks yet</p>}
              {t.subtasks?.map(s => (
                <div key={s._id} className="group flex items-center gap-2.5 border-t border-slate-100 dark:border-slate-700/50 px-3 py-2 first:border-t-0 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <button onClick={() => toggleSubtask(s._id)} className={`flex w-4 h-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${s.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}>
                    {s.completed && <Check className="w-2.5 h-2.5" strokeWidth={3}/>}
                  </button>
                  <span className={`flex-1 text-sm truncate ${s.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{s.title}</span>
                  {isAdminOrHR && (
                    <button onClick={() => deleteSubtask(s._id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              ))}
              {isAdminOrHR && (
                <form onSubmit={addSubtask} className="flex items-center gap-2.5 border-t border-slate-100 dark:border-slate-700/50 px-3 py-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/20 focus-within:text-slate-700 dark:focus-within:text-slate-200 transition-colors">
                  <Plus className="w-4 h-4 flex-shrink-0"/>
                  <input ref={subtaskRef} placeholder="Add subtask…" className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"/>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-3">
            {t.comments?.length === 0 && <p className="text-xs text-slate-400 italic px-1">No comments yet</p>}
            {t.comments?.map(c => (
              <div key={c._id} className="flex gap-2.5">
                <Avatar name={c.user?.name || '?'} size={6}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{c.user?.name}</span>
                    <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Avatar name={user?.name || '?'} size={6}/>
              <div className="flex-1 relative">
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment…"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(); } }}
                  rows={2}
                  className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-400 resize-none"/>
                <button onClick={addComment} disabled={submitting || !comment.trim()}
                  className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors float-right">
                  <Send className="h-3 w-3"/> Comment
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-2">
            {t.attachments?.length === 0 && <p className="text-xs text-slate-400 italic px-1">No files attached</p>}
            {t.attachments?.map(a => (
              <div key={a._id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                <File className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{a.name}</span>
                <a href={a.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-500 transition-colors">
                  <Download className="w-3.5 h-3.5"/>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TaskRow ────────────────────────────────────────────────────────────────────

function TaskRow({ task, users, onUpdate, onDelete, onOpen, isSelected, onToggleSelect }) {
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
  const dueDiff = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null;
  const dueColor = dueDiff === null ? 'text-slate-400' : dueDiff < 0 ? 'text-red-500' : dueDiff === 0 ? 'text-orange-500' : dueDiff <= 2 ? 'text-yellow-500' : 'text-slate-400';

  return (
    <div onClick={() => onOpen(task)}
      className={`group flex items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-slate-700/40 first:border-t-0 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/5' : ''}`}>

      <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(task._id)}
        onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded accent-indigo-500 flex-shrink-0"/>
      <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 flex-shrink-0"/>

      <div onClick={e => e.stopPropagation()}>
        <StatusSelect value={task.status} onChange={v => onUpdate(task._id, { status: v })}/>
      </div>

      <input
        defaultValue={task.title}
        onClick={e => e.stopPropagation()}
        onBlur={e => { const v = e.target.value.trim(); if (v && v !== task.title) onUpdate(task._id, { title: v }); else e.target.value = task.title; }}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.target.value = task.title; e.target.blur(); } }}
        className={`flex-1 min-w-0 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-200 ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}
        aria-label="Task title"
      />

      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {task.comments?.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400"><MessageSquare className="w-3 h-3"/>{task.comments.length}</span>
        )}
        {task.attachments?.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400"><Paperclip className="w-3 h-3"/>{task.attachments.length}</span>
        )}
      </div>

      <div onClick={e => e.stopPropagation()}>
        <PrioritySelect value={task.priority} onChange={v => onUpdate(task._id, { priority: v })}/>
      </div>

      <div onClick={e => e.stopPropagation()}>
        <AssigneeSelect value={assignees[0]?._id || assignees[0] || ''} users={users}
          onChange={v => onUpdate(task._id, { assignedTo: v ? [v] : [] })}/>
      </div>

      <div onClick={e => e.stopPropagation()} className={`flex items-center gap-1 text-[11px] flex-shrink-0 ${dueColor}`}>
        <Calendar className="w-3 h-3"/>
        {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </div>

      <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) onDelete(task._id); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5"/>
      </button>
    </div>
  );
}

// ── StatusGroup ────────────────────────────────────────────────────────────────

function StatusGroup({ status, tasks, users, isAdminOrHR, onUpdate, onDelete, onOpen, selectedIds, onToggleSelect }) {
  const sc = stCfg(status);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const addRef = useRef(null);

  async function addTask(e) {
    e?.preventDefault();
    const title = addRef.current?.value?.trim();
    if (!title) { setAdding(false); return; }
    try {
      const { data } = await API.post('/tasks', { title, status, priority: 'medium' });
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
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/30 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <div className="w-3.5 flex-shrink-0"/>
            <div className="w-3 flex-shrink-0"/>
            <div className="w-20 flex-shrink-0"/>
            <div className="flex-1">Task</div>
            <div className="w-20 text-center flex-shrink-0">Priority</div>
            <div className="w-24 text-center flex-shrink-0">Assignee</div>
            <div className="w-16 text-center flex-shrink-0">Due</div>
            <div className="w-6 flex-shrink-0"/>
          </div>

          {tasks.length === 0 && !adding && <p className="px-4 py-3 text-xs text-slate-400 italic">No tasks</p>}

          {tasks.map(task => (
            <TaskRow key={task._id} task={task} users={users}
              isSelected={selectedIds.has(task._id)} onToggleSelect={onToggleSelect}
              onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}/>
          ))}

          {adding && (
            <form onSubmit={addTask}
              className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/20">
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

// ── Board card ─────────────────────────────────────────────────────────────────

function BoardCard({ task, users, onUpdate, onDelete, onOpen, overlay }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task._id, data: { type: 'task' } });

  const sc = stCfg(task.status);
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
  const downPos = useRef(null);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay
        ? { backgroundColor: sc.hex + '0d', borderColor: sc.hex + '33', borderLeftColor: sc.hex }
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
        <AssigneeSelect value={assignees[0]?._id || assignees[0] || ''} users={users}
          onChange={v => onUpdate(task._id, { assignedTo: v ? [v] : [] })}/>
        {task.dueDate && (
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
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

// ── Board column ───────────────────────────────────────────────────────────────

function BoardColumn({ status, tasks, users, isAdminOrHR, onUpdate, onDelete, onOpen, setTasks }) {
  const sc = stCfg(status);
  const { setNodeRef, isOver } = useSortable({ id: status, data: { type: 'column' } });

  async function addCard() {
    try {
      const { data } = await API.post('/tasks', { title: 'New Task', status, priority: 'medium' });
      setTasks(prev => [data.task, ...prev]);
      onOpen(data.task);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  }

  return (
    <section className="flex w-72 flex-shrink-0 flex-col">
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

// ── BoardDnd ───────────────────────────────────────────────────────────────────

function BoardDnd({ tasks, users, isAdminOrHR, onUpdate, onDelete, onOpen, setTasks }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

  function columnForId(id) {
    const direct = STATUSES.find(s => s.id === id);
    if (direct) return direct;
    return STATUSES.find(s => tasks.filter(t => t.status === s.id).some(t => t._id === id)) || null;
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
      id="tasks-board"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {STATUSES.map(st => (
          <BoardColumn
            key={st.id}
            status={st.id}
            tasks={tasks.filter(t => t.status === st.id)}
            users={users}
            isAdminOrHR={isAdminOrHR}
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [view, setView]             = useState('list');
  const [loading, setLoading]       = useState(true);
  const [selectedTask, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch]         = useState('');
  const [priFilter, setPriFilter]   = useState('');
  const [myTasksOnly, setMyTasks]   = useState(false);

  const isAdminOrHR = true;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, ur] = await Promise.all([
        API.get('/tasks'),
        API.get('/users'),
      ]);
      setTasks(tr.data.tasks || []);
      setUsers(ur.data.users || ur.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); setSelected(null); setSelectedIds(new Set()); }, [fetchAll]);

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

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-wrap flex-shrink-0 bg-white dark:bg-slate-900">
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">All Tasks</h1>

        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {[['list', LayoutList, 'List'], ['board', LayoutGrid, 'Board']].map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === v ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>
              <Icon className="w-3.5 h-3.5"/>{label}
            </button>
          ))}
        </div>

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
          <User className="w-3.5 h-3.5"/> My tasks
        </button>

        <button onClick={async () => {
          try {
            const { data } = await API.post('/tasks', { title: 'New Task', status: 'todo', priority: 'medium' });
            setTasks(prev => [data.task, ...prev]);
            setSelected(data.task);
            toast.success('Task created');
          } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
        }} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5"/> New Task
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-200 dark:border-indigo-500/20 flex-shrink-0 text-xs">
          <span className="font-medium text-indigo-700 dark:text-indigo-300">{selectedIds.size} selected</span>
          {STATUSES.map(s => (
            <button key={s.id} onClick={async () => {
              const ids = [...selectedIds];
              await Promise.all(ids.map(tid => API.put(`/tasks/${tid}`, { status: s.id })));
              setTasks(prev => prev.map(t => ids.includes(t._id) ? { ...t, status: s.id } : t));
              setSelectedIds(new Set());
            }} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400 transition-colors">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>{s.label}
            </button>
          ))}
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {view === 'list' ? (
            <div className="space-y-1">
              {STATUSES.map(st => (
                <StatusGroup key={st.id} status={st.id}
                  tasks={filtered.filter(t => t.status === st.id)}
                  users={users} isAdminOrHR={isAdminOrHR}
                  selectedIds={selectedIds} onToggleSelect={toggleSelect}
                  onUpdate={handleUpdate} onDelete={handleDelete}
                  onOpen={task => setSelected(task)}/>
              ))}
            </div>
          ) : (
            <BoardDnd
              tasks={filtered}
              users={users}
              isAdminOrHR={isAdminOrHR}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onOpen={t => setSelected(t)}
              setTasks={setTasks}
            />
          )}
        </div>

        {selectedTask && (
          <TaskPanel
            task={selectedTask}
            users={users}
            isAdminOrHR={isAdminOrHR}
            user={user}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

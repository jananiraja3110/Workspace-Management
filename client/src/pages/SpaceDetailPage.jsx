import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SortableTaskList, SortableItem } from '../components/tasks/SortableTaskGroup';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Plus, LayoutList, LayoutGrid, ChevronRight,
  Calendar, Flag, User, X, Check, Trash2, Edit2,
  MessageSquare, Paperclip, Timer, Eye, EyeOff, Send,
  AlignLeft, CheckSquare, Square, GripVertical, Search,
  Circle, Clock, CheckCircle2, AlertCircle,
  Bold, Italic, Minus, Download, File,
  ChevronDown,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

// ── constants ─────────────────────────────────────────────────────────────────

const STATUSES = [
  { id: 'pending',     label: 'Backlog',     dot: 'bg-slate-400',   color: '#6B7280', Icon: Circle       },
  { id: 'todo',        label: 'To Do',       dot: 'bg-purple-400',  color: '#A78BFA', Icon: Circle       },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-blue-500',    color: '#3B82F6', Icon: Clock        },
  { id: 'completed',   label: 'Done',        dot: 'bg-emerald-500', color: '#10B981', Icon: CheckCircle2 },
  { id: 'overdue',     label: 'Overdue',     dot: 'bg-red-500',     color: '#EF4444', Icon: AlertCircle  },
];

const PRIORITIES = [
  { id: 'urgent', label: 'Urgent', color: '#F97316', bg: 'bg-orange-500/15', text: 'text-orange-500' },
  { id: 'high',   label: 'High',   color: '#EF4444', bg: 'bg-red-500/15',    text: 'text-red-500'    },
  { id: 'medium', label: 'Medium', color: '#EAB308', bg: 'bg-yellow-500/15', text: 'text-yellow-500' },
  { id: 'low',    label: 'Low',    color: '#22C55E', bg: 'bg-green-500/15',  text: 'text-green-600'  },
];

const priCfg = (p) => PRIORITIES.find(x => x.id === p) || PRIORITIES[2];
const stCfg  = (s) => STATUSES.find(x => x.id === s)   || STATUSES[0];

const fmtMins = (m) => {
  if (!m) return '0m';
  const h = Math.floor(m / 60), min = m % 60;
  return h ? `${h}h ${min}m` : `${min}m`;
};

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

// ── Dropdown ──────────────────────────────────────────────────────────────────

function Dropdown({ trigger, children, align = 'left', width = 'w-40' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>{trigger}</div>
      {open && (
        <div
          className={`absolute z-[60] top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 ${width} ${align === 'right' ? 'right-0' : 'left-0'}`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const DropItem = ({ onClick, children, active, danger }) => (
  <button
    onClick={e => { e.stopPropagation(); onClick(); }}
    className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors ${
      danger  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' :
      active  ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10' :
                'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
    }`}
  >
    {children}
  </button>
);

// ── Task detail panel ─────────────────────────────────────────────────────────

function TaskPanel({ task, users, isAdminOrHR, user, onUpdate, onDelete, onClose }) {
  const [activeTab, setActiveTab]     = useState('details');
  const [editTitle, setEditTitle]     = useState(false);
  const [titleDraft, setTitleDraft]   = useState('');
  const [editDesc, setEditDesc]       = useState(false);
  const [descDraft, setDescDraft]     = useState('');
  const [comment, setComment]         = useState('');
  const [submittingComment, setSubC]  = useState(false);
  const [newSubtask, setNewSubtask]   = useState('');
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [timeInput, setTimeInput]     = useState('');
  const [showAssignee, setShowAssignee] = useState(false);
  const assigneeRef = useRef(null);

  const t = task;
  const sc = stCfg(t.status);
  const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
  const currentAssigneeIds = assignees.filter(Boolean).map(a => a?._id || a);
  const isWatching = t.watchers?.some(w => (w?._id || w) === user?._id);
  const subtasksDone  = t.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = t.subtasks?.length || 0;

  useEffect(() => {
    const h = e => { if (assigneeRef.current && !assigneeRef.current.contains(e.target)) setShowAssignee(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const TABS = [
    { id: 'details',     label: 'Details'  },
    { id: 'subtasks',    label: `Subtasks${subtasksTotal ? ` (${subtasksDone}/${subtasksTotal})` : ''}` },
    { id: 'comments',    label: `Activity${t.comments?.length ? ` (${t.comments.length})` : ''}` },
    { id: 'attachments', label: `Files${t.attachments?.length ? ` (${t.attachments.length})` : ''}` },
  ];

  async function saveTitle() {
    if (!titleDraft.trim() || titleDraft === t.title) { setEditTitle(false); return; }
    await onUpdate(t._id, { title: titleDraft }); setEditTitle(false);
  }
  async function saveDesc() {
    if (descDraft === t.description) { setEditDesc(false); return; }
    await onUpdate(t._id, { description: descDraft }); setEditDesc(false);
  }
  async function addComment() {
    if (!comment.trim()) return;
    setSubC(true);
    try {
      const { data } = await API.post(`/tasks/${t._id}/comments`, { text: comment });
      onUpdate(t._id, null, data.task); setComment('');
    } catch { toast.error('Comment failed'); }
    setSubC(false);
  }
  async function addSubtask() {
    if (!newSubtask.trim()) return;
    try {
      const { data } = await API.post(`/tasks/${t._id}/subtasks`, { title: newSubtask });
      onUpdate(t._id, null, data.task); setNewSubtask('');
    } catch { toast.error('Failed'); }
  }
  async function toggleSubtask(subId) {
    try {
      const { data } = await API.patch(`/tasks/${t._id}/subtasks/${subId}`);
      onUpdate(t._id, null, data.task);
    } catch { toast.error('Failed'); }
  }
  async function deleteSubtask(subId) {
    try {
      const { data } = await API.delete(`/tasks/${t._id}/subtasks/${subId}`);
      onUpdate(t._id, null, data.task);
    } catch { toast.error('Failed'); }
  }
  async function toggleWatch() {
    try {
      const { data } = await API.patch(`/tasks/${t._id}/watch`);
      onUpdate(t._id, null, data.task);
    } catch { toast.error('Failed'); }
  }
  async function logTime() {
    if (!timeInput) return;
    try {
      const { data } = await API.patch(`/tasks/${t._id}/time`, { minutes: Number(timeInput) });
      onUpdate(t._id, null, data.task); setTimeInput(''); setShowTimeLog(false);
      toast.success('Time logged');
    } catch { toast.error('Failed'); }
  }

  return (
    <div className="w-[440px] flex-shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Dropdown
            trigger={
              <button className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border ${
                t.status === 'completed'  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' :
                t.status === 'in-progress'? 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' :
                t.status === 'overdue'    ? 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' :
                                            'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/> {sc.label}
              </button>
            }
          >
            {STATUSES.map(s => (
              <DropItem key={s.id} onClick={() => onUpdate(t._id, { status: s.id })} active={t.status === s.id}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`}/>{s.label}
              </DropItem>
            ))}
          </Dropdown>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={toggleWatch}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isWatching ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                         : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/40'
            }`}>
            {isWatching ? <Eye className="h-3.5 w-3.5"/> : <EyeOff className="h-3.5 w-3.5"/>}
            {isWatching ? 'Watching' : 'Watch'}
          </button>
          {isAdminOrHR && (
            <>
              <button onClick={() => { setTitleDraft(t.title); setEditTitle(true); }}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 hover:text-indigo-500 transition-colors">
                <Edit2 className="h-3.5 w-3.5"/>
              </button>
              <button onClick={() => onDelete(t._id)}
                className="p-1.5 rounded text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors">
                <Trash2 className="h-3.5 w-3.5"/>
              </button>
            </>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors ml-1">
            <X className="h-4 w-4"/>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-2">
          {/* Title */}
          {editTitle ? (
            <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditTitle(false); }}
              className="w-full text-lg font-semibold bg-transparent border-b-2 border-indigo-500 text-slate-900 dark:text-slate-100 focus:outline-none pb-0.5 mb-3"/>
          ) : (
            <h2 onClick={() => { if (isAdminOrHR) { setTitleDraft(t.title); setEditTitle(true); } }}
              className={`text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 leading-snug ${
                isAdminOrHR ? 'cursor-text hover:bg-slate-100 dark:hover:bg-slate-700/40 rounded px-1 -mx-1 py-0.5' : ''
              } transition-colors`}>
              {t.title}
            </h2>
          )}

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Dropdown trigger={
              <button className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-current/20 transition-colors ${priCfg(t.priority).bg} ${priCfg(t.priority).text}`}>
                <Flag className="h-3 w-3" style={{ fill: priCfg(t.priority).color, color: priCfg(t.priority).color }}/> {priCfg(t.priority).label}
              </button>
            }>
              {PRIORITIES.map(p => (
                <DropItem key={p.id} onClick={() => onUpdate(t._id, { priority: p.id })} active={t.priority === p.id}>
                  <Flag className="h-3 w-3" style={{ fill: p.color, color: p.color }}/>{p.label}
                </DropItem>
              ))}
            </Dropdown>

            <div className="relative">
              <input type="date" defaultValue={t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : ''}
                onChange={e => onUpdate(t._id, { dueDate: e.target.value || null })}
                className="opacity-0 absolute inset-0 w-full cursor-pointer z-10"/>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30">
                <Calendar className="h-3 w-3"/>
                {t.dueDate ? format(new Date(t.dueDate), 'MMM d, yyyy') : 'Set due date'}
              </span>
            </div>
          </div>

          {/* Assignees */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Assignees</p>
            <div className="flex flex-wrap items-center gap-1.5" ref={assigneeRef}>
              {assignees.filter(Boolean).map((a, i) => {
                const name = typeof a === 'object' ? (a.name || '?') : (users.find(u => u._id === a)?.name || '?');
                const uid  = a?._id || a;
                return (
                  <div key={i} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/40 rounded-full pl-1 pr-2 py-0.5">
                    <Avatar name={name} size={5}/>
                    <span className="text-xs text-slate-700 dark:text-slate-300">{name}</span>
                    {isAdminOrHR && (
                      <button onClick={() => onUpdate(t._id, { assignedTo: currentAssigneeIds.filter(id => id !== uid) })}
                        className="ml-0.5 text-slate-400 hover:text-red-500 transition-colors"><X className="h-2.5 w-2.5"/></button>
                    )}
                  </div>
                );
              })}
              {isAdminOrHR && (
                <div className="relative">
                  <button onClick={() => setShowAssignee(p => !p)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-400 dark:border-slate-600 text-xs text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors">
                    <Plus className="h-3 w-3"/> Assign
                  </button>
                  {showAssignee && (
                    <div className="absolute left-0 top-8 z-50 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 max-h-48 overflow-y-auto">
                      {users.map(u => {
                        const assigned = currentAssigneeIds.includes(u._id);
                        return (
                          <button key={u._id}
                            onClick={() => { onUpdate(t._id, { assignedTo: assigned ? currentAssigneeIds.filter(id => id !== u._id) : [...currentAssigneeIds, u._id] }); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 transition-colors">
                            <Avatar name={u.name} size={5}/>
                            <span className="flex-1 text-left">{u.name}</span>
                            {assigned && <Check className="h-3 w-3 text-indigo-500"/>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Time tracking */}
          {(t.timeEstimate > 0 || t.timeSpent > 0) && (
            <div className="mb-4 bg-slate-100 dark:bg-slate-700/30 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Timer className="h-3 w-3"/> Time
                </span>
                <span className="text-xs text-slate-500">{fmtMins(t.timeSpent)} / {fmtMins(t.timeEstimate)}</span>
              </div>
              {t.timeEstimate > 0 && (
                <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${Math.round((t.timeSpent / t.timeEstimate) * 100) >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, Math.round((t.timeSpent / t.timeEstimate) * 100))}%` }}/>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          {/* DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                  <AlignLeft className="h-3 w-3"/> Description
                </p>
                {editDesc ? (
                  <div>
                    <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-300 dark:border-slate-600">
                        {[['**','**',Bold],['_','_',Italic],['- ','',Minus]].map(([b,a,Icon],i) => (
                          <button key={i} type="button"
                            onClick={() => {
                              const el = document.activeElement;
                              if (!el) return;
                              const s = el.selectionStart, e = el.selectionEnd;
                              const v = descDraft.slice(0,s) + b + descDraft.slice(s,e) + a + descDraft.slice(e);
                              setDescDraft(v);
                            }}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400">
                            <Icon className="h-3 w-3"/>
                          </button>
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
                    className={`bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 min-h-[60px] text-sm text-slate-700 dark:text-slate-300 ${
                      isAdminOrHR ? 'cursor-text hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''
                    } transition-colors`}>
                    {t.description || <span className="text-slate-400 italic">No description</span>}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <Timer className="h-3 w-3"/> Time: {fmtMins(t.timeSpent)}
                  </p>
                  <button onClick={() => setShowTimeLog(p => !p)} className="text-xs text-indigo-500 hover:text-indigo-600">+ Log</button>
                </div>
                {showTimeLog && (
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" placeholder="Minutes" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                      className="w-24 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                    <button onClick={logTime} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Log</button>
                    <button onClick={() => setShowTimeLog(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTASKS */}
          {activeTab === 'subtasks' && (
            <div>
              {subtasksTotal > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{subtasksDone}/{subtasksTotal} done</span>
                    <span>{Math.round(subtasksTotal ? (subtasksDone / subtasksTotal) * 100 : 0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${subtasksTotal ? (subtasksDone / subtasksTotal) * 100 : 0}%` }}/>
                  </div>
                </div>
              )}
              <div className="space-y-0.5 mb-3">
                {t.subtasks?.map(sub => (
                  <div key={sub._id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/30">
                    <button onClick={() => toggleSubtask(sub._id)} className="flex-shrink-0">
                      {sub.completed
                        ? <CheckSquare className="h-4 w-4 text-emerald-500"/>
                        : <Square className="h-4 w-4 text-slate-400"/>}
                    </button>
                    <span className={`flex-1 text-sm ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {sub.title}
                    </span>
                    {isAdminOrHR && (
                      <button onClick={() => deleteSubtask(sub._id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all">
                        <X className="h-3.5 w-3.5"/>
                      </button>
                    )}
                  </div>
                ))}
                {!subtasksTotal && <p className="text-xs text-slate-400 italic text-center py-3">No subtasks</p>}
              </div>
              {isAdminOrHR && (
                <div className="flex items-center gap-2 px-2">
                  <Plus className="h-3.5 w-3.5 text-slate-400"/>
                  <input type="text" placeholder="Add subtask…" value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    className="flex-1 text-sm bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 py-0.5"/>
                  {newSubtask && (
                    <button onClick={addSubtask} className="p-0.5 text-indigo-500 hover:text-indigo-600">
                      <Check className="h-4 w-4"/>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* COMMENTS */}
          {activeTab === 'comments' && (
            <div>
              <div className="space-y-3 mb-4">
                {!t.comments?.length
                  ? <p className="text-xs text-slate-400 italic text-center py-4">No activity yet</p>
                  : t.comments.map((c, i) => (
                    <div key={c._id || i} className="flex gap-2.5">
                      <Avatar name={c.user?.name || 'U'} size={6}/>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{c.user?.name || 'User'}</span>
                          <span className="text-[10px] text-slate-400">
                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/40 rounded-lg px-2.5 py-1.5">
                          {c.text}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="flex gap-2 items-end">
                <Avatar name={user?.name || 'U'} size={6}/>
                <div className="flex-1 flex gap-2">
                  <textarea rows={2} placeholder="Write a comment…" value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"/>
                  <button onClick={addComment} disabled={submittingComment || !comment.trim()}
                    className="self-end p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    <Send className="h-3.5 w-3.5"/>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div>
              {t.attachments?.length > 0 ? (
                <div className="space-y-1.5">
                  {t.attachments.map(att => (
                    <div key={att._id} className="flex items-center gap-2 group px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/30 hover:bg-slate-200 dark:hover:bg-slate-700/50">
                      <File className="h-4 w-4 text-indigo-500"/>
                      <a href={att.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-500 truncate">{att.name}</a>
                      <span className="text-[10px] text-slate-400">{att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}</span>
                      <a href={att.url} download={att.name}
                        className="p-0.5 text-slate-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition">
                        <Download className="h-3.5 w-3.5"/>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">No attachments</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline add-task row ───────────────────────────────────────────────────────

function AddRow({ spaceId, status, users, onAdd, onCancel }) {
  const [title, setTitle]    = useState('');
  const [assigneeId, setAss] = useState('');
  const [priority, setPri]   = useState('medium');
  const [dueDate, setDue]    = useState('');
  const [saving, setSaving]  = useState(false);

  async function save() {
    const t = title.trim();
    if (!t) { onCancel(); return; }
    setSaving(true);
    try {
      const { data } = await API.post('/tasks', {
        title: t, status, priority, space: spaceId,
        assignedTo: assigneeId ? [assigneeId] : [],
        dueDate: dueDate || undefined,
      });
      onAdd(data.task);
    } catch { toast.error('Failed'); }
    setSaving(false);
    setTitle(''); setAss(''); setPri('medium'); setDue('');
  }

  const inputCls = "text-[11px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-1 focus:outline-none focus:border-indigo-500";

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700/30 bg-slate-50 dark:bg-slate-800/20" onClick={e => e.stopPropagation()}>
      <div className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"/>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
        placeholder="Task name…"
        className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none border-b border-indigo-500/50 pb-0.5"/>
      <select value={priority} onChange={e => setPri(e.target.value)} className={inputCls}>
        {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <select value={assigneeId} onChange={e => setAss(e.target.value)} className={inputCls}>
        <option value="">Assign</option>
        {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
      </select>
      <input type="date" value={dueDate} onChange={e => setDue(e.target.value)} className={inputCls}/>
      <button onClick={save} disabled={saving}
        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors">
        {saving ? '…' : 'Add'}
      </button>
      <button onClick={onCancel} className="p-0.5 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5"/></button>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, users, isAdminOrHR, onUpdate, onDelete, onOpen, isSelected, onToggleSelect }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]     = useState('');
  const pc = priCfg(task.priority);
  const sc = stCfg(task.status);
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
  const dueDiff = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null;
  const dueColor = dueDiff === null ? 'text-slate-400' : dueDiff < 0 ? 'text-red-500' : dueDiff === 0 ? 'text-orange-500' : dueDiff <= 2 ? 'text-yellow-500' : 'text-slate-400';

  async function saveTitle() {
    if (!titleDraft.trim() || titleDraft === task.title) { setEditingTitle(false); return; }
    await onUpdate(task._id, { title: titleDraft });
    setEditingTitle(false);
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/25 transition-colors group border-b border-slate-200 dark:border-slate-700/20 last:border-0 cursor-pointer ${
        isSelected ? 'bg-indigo-50 dark:bg-indigo-500/5' : ''
      }`}
      onClick={() => !editingTitle && onOpen(task)}
    >
      <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(task._id)}
        onClick={e => e.stopPropagation()}
        className="w-3.5 h-3.5 rounded accent-indigo-500 flex-shrink-0"/>

      <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab"/>

      {/* Status dot */}
      <Dropdown
        trigger={
          <button onClick={e => e.stopPropagation()}
            className={`w-3 h-3 rounded-full flex-shrink-0 ${sc.dot} hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1 hover:ring-offset-white dark:hover:ring-offset-slate-900 transition-all`}/>
        }
      >
        {STATUSES.map(s => (
          <DropItem key={s.id} onClick={() => onUpdate(task._id, { status: s.id })} active={task.status === s.id}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}/>{s.label}
          </DropItem>
        ))}
      </Dropdown>

      {/* Title */}
      {editingTitle ? (
        <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 border-b border-indigo-500 outline-none"/>
      ) : (
        <span
          onDoubleClick={e => { e.stopPropagation(); if (isAdminOrHR) { setTitleDraft(task.title); setEditingTitle(true); } }}
          className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate select-none">
          {task.title}
        </span>
      )}

      {/* Meta badges (hover) */}
      <div className="hidden group-hover:flex items-center gap-2 text-[10px] text-slate-400 flex-shrink-0">
        {task.comments?.length > 0 && (
          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3"/>{task.comments.length}</span>
        )}
        {task.attachments?.length > 0 && (
          <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3"/>{task.attachments.length}</span>
        )}
      </div>

      {/* Priority */}
      <Dropdown
        trigger={
          <button onClick={e => e.stopPropagation()}
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg ${pc.bg} ${pc.text} flex-shrink-0`}>
            <Flag className="w-2.5 h-2.5" style={{ fill: pc.color, color: pc.color }}/>{pc.label}
            <ChevronDown className="w-2.5 h-2.5 opacity-40"/>
          </button>
        }
      >
        {PRIORITIES.map(p => (
          <DropItem key={p.id} onClick={() => onUpdate(task._id, { priority: p.id })} active={task.priority === p.id}>
            <Flag className="w-3 h-3" style={{ fill: p.color, color: p.color }}/>{p.label}
          </DropItem>
        ))}
      </Dropdown>

      {/* Assignee */}
      <Dropdown
        trigger={
          <button onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex-shrink-0">
            {assignees.length > 0 ? (
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map((a, i) => (
                  <Avatar key={i} name={typeof a === 'object' ? a.name : (users.find(u => u._id === a)?.name || '?')} size={5}/>
                ))}
              </div>
            ) : (
              <><User className="w-3.5 h-3.5"/> Assign</>
            )}
            <ChevronDown className="w-2.5 h-2.5 opacity-40"/>
          </button>
        }
      >
        {users.map(u => {
          const ids = assignees.map(a => a?._id || a);
          const on  = ids.includes(u._id);
          return (
            <DropItem key={u._id}
              onClick={() => onUpdate(task._id, { assignedTo: on ? ids.filter(i => i !== u._id) : [...ids, u._id] })}
              active={on}>
              <Avatar name={u.name} size={4}/>{u.name}
              {on && <Check className="w-3 h-3 text-indigo-500 ml-auto"/>}
            </DropItem>
          );
        })}
      </Dropdown>

      {/* Due date */}
      <div className="relative flex items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
        <input type="date" defaultValue={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
          onChange={e => onUpdate(task._id, { dueDate: e.target.value || null })}
          className="opacity-0 absolute inset-0 w-full cursor-pointer z-10"/>
        <span className={`flex items-center gap-1 text-[11px] font-medium ${dueColor}`}>
          <Calendar className="w-3 h-3"/>
          {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'Due'}
        </span>
      </div>

      {/* Delete */}
      {isAdminOrHR && (
        <button onClick={e => { e.stopPropagation(); onDelete(task._id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all flex-shrink-0">
          <X className="w-3.5 h-3.5"/>
        </button>
      )}
    </div>
  );
}

// ── Status group ──────────────────────────────────────────────────────────────

function StatusGroup({ status, tasks, spaceId, users, isAdminOrHR, selectedIds, onToggleSelect, onUpdate, onDelete, onOpen }) {
  const sc = stCfg(status);
  const [open, setOpen]             = useState(true);
  const [adding, setAdding]         = useState(false);
  const [localExtra, setLocalExtra] = useState([]);
  const [sortedTasks, setSortedTasks] = useState([]);

  useEffect(() => {
    const seen = new Set(tasks.map(t => t._id));
    const deduped = localExtra.filter(t => !seen.has(t._id));
    setSortedTasks([...tasks, ...deduped]);
  }, [tasks, localExtra]);

  function handleReorder(reordered) { setSortedTasks(reordered); }

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/10 rounded-lg transition-colors select-none"
        onClick={() => setOpen(o => !o)}>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}/>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sc.label}</span>
        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700/50 rounded-full px-2 py-0.5 font-medium">{sortedTasks.length}</span>
      </div>

      {open && (
        <div className="ml-3 border border-slate-200 dark:border-slate-700/40 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
          <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-200 dark:border-slate-700/30 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-transparent">
            <div className="w-3.5 flex-shrink-0"/>
            <div className="w-3 flex-shrink-0"/>
            <div className="w-3 flex-shrink-0"/>
            <div className="flex-1">Task</div>
            <div className="w-20 text-center flex-shrink-0">Priority</div>
            <div className="w-20 text-center flex-shrink-0">Assignee</div>
            <div className="w-16 text-center flex-shrink-0">Due</div>
            <div className="w-4 flex-shrink-0"/>
          </div>

          {sortedTasks.length === 0 && !adding && (
            <div className="px-4 py-3 text-xs text-slate-400 italic">No tasks</div>
          )}
          <SortableTaskList tasks={sortedTasks} onReorder={handleReorder}>
            {sortedTasks.map(task => (
              <SortableItem key={task._id} id={task._id}>
                <TaskRow
                  task={task} users={users} isAdminOrHR={isAdminOrHR}
                  isSelected={selectedIds.has(task._id)} onToggleSelect={onToggleSelect}
                  onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}
                />
              </SortableItem>
            ))}
          </SortableTaskList>

          {adding && (
            <AddRow
              spaceId={spaceId} status={status} users={users}
              onAdd={task => { setLocalExtra(p => [...p, task]); setAdding(false); }}
              onCancel={() => setAdding(false)}
            />
          )}

          {!adding && isAdminOrHR && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 w-full px-4 py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/20 transition-colors">
              <Plus className="w-3.5 h-3.5"/> Add task…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Board card ────────────────────────────────────────────────────────────────

function BoardCard({ task, users, isAdminOrHR, onUpdate, onDelete, onOpen }) {
  const pc = priCfg(task.priority);
  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
  const dueDiff = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null;
  const dueColor = dueDiff === null ? 'text-slate-400' : dueDiff < 0 ? 'text-red-500' : dueDiff === 0 ? 'text-orange-500' : 'text-slate-500';

  return (
    <div onClick={() => onOpen(task)}
      className="bg-white dark:bg-slate-800 border-l-[3px] rounded-xl border border-slate-200 dark:border-slate-700/60 p-3.5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/30 cursor-pointer transition-all group"
      style={{ borderLeftColor: pc.color }}>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug flex-1">{task.title}</span>
        {isAdminOrHR && (
          <button onClick={e => { e.stopPropagation(); onDelete(task._id); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all flex-shrink-0">
            <X className="w-3.5 h-3.5"/>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${pc.bg} ${pc.text}`}>
            <Flag className="w-2 h-2" style={{ fill: pc.color, color: pc.color }}/>{pc.label}
          </span>
          {task.dueDate && (
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${dueColor}`}>
              <Calendar className="w-2.5 h-2.5"/>{format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <MessageSquare className="w-2.5 h-2.5"/>{task.comments.length}
            </span>
          )}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((a, i) => (
              <Avatar key={i} name={typeof a === 'object' ? a.name : (users.find(u => u._id === a)?.name || '?')} size={5}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board drag-and-drop (cross-column) ───────────────────────────────────────

function DraggableBoardCard({ task, users, isAdminOrHR, onUpdate, onDelete, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardCard task={task} users={users} isAdminOrHR={isAdminOrHR}
        onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}/>
    </div>
  );
}

function BoardDnd({ statuses, filtered, users, isAdminOrHR, spaceId, onUpdate, onDelete, onOpen, setTasks }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeTask, setActiveTask] = useState(null);
  const [overId, setOverId]         = useState(null);

  function findStatus(taskId) {
    return filtered.find(t => t._id === taskId)?.status;
  }

  function handleDragStart({ active }) {
    setActiveTask(filtered.find(t => t._id === active.id) || null);
  }

  function handleDragOver({ over }) {
    setOverId(over?.id || null);
  }

  async function handleDragEnd({ active, over }) {
    setActiveTask(null); setOverId(null);
    if (!over) return;

    const draggedTask = filtered.find(t => t._id === active.id);
    if (!draggedTask) return;

    // over.id is either a status column id or another task id
    const targetStatus = statuses.find(s => s.id === over.id)?.id
      || filtered.find(t => t._id === over.id)?.status;

    if (!targetStatus || targetStatus === draggedTask.status) return;

    // Optimistically update local state
    setTasks(prev => prev.map(t => t._id === draggedTask._id ? { ...t, status: targetStatus } : t));

    try {
      await onUpdate(draggedTask._id, { status: targetStatus });
    } catch {
      // revert on fail
      setTasks(prev => prev.map(t => t._id === draggedTask._id ? { ...t, status: draggedTask.status } : t));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}
      onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map(st => {
          const colTasks = filtered.filter(t => t.status === st.id);
          const isOver = activeTask && overId === st.id;
          return (
            <SortableContext key={st.id} id={st.id} items={colTasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
              <div className="flex-shrink-0 w-[260px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`}/>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{st.label}</span>
                    <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">{colTasks.length}</span>
                  </div>
                  {isAdminOrHR && (
                    <button onClick={async () => {
                      try {
                        const { data } = await API.post('/tasks', { title: 'New Task', status: st.id, priority: 'medium', space: spaceId });
                        setTasks(prev => [data.task, ...prev]);
                        onOpen(data.task);
                      } catch { toast.error('Failed'); }
                    }} className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors">
                      <Plus className="w-4 h-4"/>
                    </button>
                  )}
                </div>
                {/* Drop zone column */}
                <div
                  className={`space-y-2 min-h-[120px] rounded-xl p-2 border transition-colors ${
                    isOver
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                  }`}
                  // Allow dropping on empty column area
                  onDragOver={e => e.preventDefault()}
                >
                  {colTasks.length === 0 && (
                    <div className={`flex items-center justify-center h-12 text-xs italic transition-colors ${isOver ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {isOver ? 'Drop here' : 'Empty'}
                    </div>
                  )}
                  {colTasks.map(task => (
                    <DraggableBoardCard key={task._id} task={task} users={users}
                      isAdminOrHR={isAdminOrHR} onUpdate={onUpdate} onDelete={onDelete} onOpen={onOpen}/>
                  ))}
                </div>
              </div>
            </SortableContext>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 scale-105 shadow-2xl opacity-90">
            <BoardCard task={activeTask} users={users} isAdminOrHR={false}
              onUpdate={() => {}} onDelete={() => {}} onOpen={() => {}}/>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SpaceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const [space, setSpace]           = useState(null);
  const [tasks, setTasks]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('list');
  const [myTasksOnly, setMyOnly]    = useState(false);
  const [search, setSearch]         = useState('');
  const [priFilter, setPriFilter]   = useState('');
  const [selectedTask, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, tr, ur] = await Promise.all([
        API.get('/spaces'),
        API.get(`/spaces/${id}/tasks`),
        API.get('/users'),
      ]);
      const found = (sr.data.spaces || []).find(s => s._id === id);
      setSpace(found || { name: 'Space', color: '#6366F1' });
      setTasks(tr.data.tasks || []);
      setUsers(ur.data.users || ur.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchAll(); setSelected(null); setSelectedIds(new Set()); }, [fetchAll]);

  async function handleUpdate(taskId, patch, fullTask) {
    if (fullTask) {
      setTasks(prev => prev.map(t => t._id === taskId ? fullTask : t));
      if (selectedTask?._id === taskId) setSelected(fullTask);
      return;
    }
    try {
      const { data } = await API.put(`/tasks/${taskId}`, patch);
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
      if (selectedTask?._id === taskId) setSelected(data.task);
    } catch { toast.error('Update failed'); }
  }

  async function handleDelete(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
      await API.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      if (selectedTask?._id === taskId) setSelected(null);
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  }

  function toggleSelect(tid) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(tid) ? n.delete(tid) : n.add(tid);
      return n;
    });
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} tasks?`)) return;
    for (const tid of selectedIds) {
      try { await API.delete(`/tasks/${tid}`); } catch {}
    }
    setTasks(prev => prev.filter(t => !selectedIds.has(t._id)));
    setSelectedIds(new Set());
    toast.success('Deleted');
  }

  async function handleBulkComplete() {
    for (const tid of selectedIds) {
      try {
        const { data } = await API.put(`/tasks/${tid}`, { status: 'completed' });
        setTasks(prev => prev.map(t => t._id === tid ? data.task : t));
      } catch {}
    }
    setSelectedIds(new Set());
    toast.success('Marked complete');
  }

  const filtered = tasks.filter(t => {
    if (myTasksOnly) {
      const a = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
      if (!a.some(x => (x?._id || x) === user?._id)) return false;
    }
    if (priFilter && t.priority !== priFilter) return false;
    if (search && !(t.title?.toLowerCase() ?? '').includes(search.toLowerCase())) return false;
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
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700 flex-wrap flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: space?.color || '#6366F1' }}>
          {space?.name?.charAt(0).toUpperCase() || 'S'}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {[['list', LayoutList, 'List'], ['board', LayoutGrid, 'Board']].map(([v, Icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === v
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>
              <Icon className="w-3.5 h-3.5"/>{label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none w-36"/>
        </div>

        {/* Priority filter */}
        <select value={priFilter} onChange={e => setPriFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none">
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        {/* My tasks */}
        <button onClick={() => setMyOnly(p => !p)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            myTasksOnly
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300'
              : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400'
          }`}>
          My tasks
        </button>

        {/* Bulk bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{selectedIds.size} selected</span>
            <button onClick={handleBulkComplete} className="px-2 py-0.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">Complete</button>
            <button onClick={handleBulkDelete} className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Delete</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5"/></button>
          </div>
        )}

        {/* Add task */}
        {isAdminOrHR && (
          <button onClick={async () => {
            try {
              const { data } = await API.post('/tasks', { title: 'New Task', status: 'pending', priority: 'medium', space: id });
              setTasks(prev => [data.task, ...prev]);
              setSelected(data.task);
              toast.success('Task created');
            } catch { toast.error('Failed'); }
          }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5"/> Add to {space?.name}
          </button>
        )}
      </div>

      {/* Main + side panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto pt-3">
          {view === 'list' ? (
            <div className="space-y-1">
              {STATUSES.map(st => (
                <StatusGroup
                  key={st.id}
                  status={st.id}
                  tasks={filtered.filter(t => t.status === st.id)}
                  spaceId={id}
                  users={users}
                  isAdminOrHR={isAdminOrHR}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onOpen={task => setSelected(task)}
                />
              ))}
            </div>
          ) : (
            <BoardDnd
              statuses={STATUSES}
              filtered={filtered}
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

        {/* Side panel */}
        {selectedTask && (
          <TaskPanel
            task={selectedTask}
            users={users}
            isAdminOrHR={isAdminOrHR}
            user={user}
            onUpdate={handleUpdate}
            onDelete={taskId => { handleDelete(taskId); }}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

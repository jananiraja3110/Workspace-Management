import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Plus, Search, X, Send, Edit2, Trash2, User, Calendar,
  MessageSquare, Flag, GripVertical, LayoutGrid, List,
  AlignLeft, Clock, CheckCircle2, Circle, AlertCircle,
  MoreHorizontal, Eye, EyeOff, CheckSquare, Square,
  Timer, ChevronDown, ChevronRight, Bold, Italic,
  Link as LinkIcon, Minus, Check, Paperclip, Download, File, FileDown,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

const COLUMNS = [
  { id: 'pending',     label: 'To Do',       color: '#6B7280', bg: 'bg-gray-100 dark:bg-gray-800/60',          dot: 'bg-gray-400',  icon: Circle },
  { id: 'in-progress', label: 'In Progress',  color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-900/20',           dot: 'bg-blue-500',  icon: Clock },
  { id: 'completed',   label: 'Done',         color: '#10B981', bg: 'bg-green-50 dark:bg-green-900/20',         dot: 'bg-green-500', icon: CheckCircle2 },
  { id: 'overdue',     label: 'Overdue',      color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/20',             dot: 'bg-red-500',   icon: AlertCircle },
];

const PRIORITY_CFG = {
  low:    { label: 'Low',    flag: '#22C55E', bg: 'bg-green-50 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  medium: { label: 'Medium', flag: '#EAB308', bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  high:   { label: 'High',   flag: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-400' },
  urgent: { label: 'Urgent', flag: '#F97316', bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
};

const fmtMins = (m) => {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h ? `${h}h ${min}m` : `${min}m`;
};

const getUserName = (u, users = []) => {
  if (!u) return 'Unassigned';
  if (typeof u === 'object') return u.name || u.firstName || 'Unknown';
  const found = users.find(x => x._id === u);
  return found?.name || found?.firstName || 'Unknown';
};

const initials = (name) => (name || '?').charAt(0).toUpperCase();

const Avatar = ({ name, size = 'sm', color = 'bg-indigo-500' }) => {
  const sz = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'md' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`} title={name}>
      {initials(name)}
    </div>
  );
};

const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.medium;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
      <Flag className="h-2.5 w-2.5" style={{ fill: cfg.flag, color: cfg.flag }} />
      {cfg.label}
    </span>
  );
};

// Simple rich text toolbar (bold, italic, link — applies markdown-style)
const RichTextarea = ({ value, onChange, placeholder, rows = 4 }) => {
  const ref = useRef(null);

  const wrap = (before, after) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange({ target: { value: newVal } });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
        <button type="button" onClick={() => wrap('**', '**')} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => wrap('_', '_')} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => wrap('- ', '')} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="List item">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500">Markdown supported</span>
      </div>
      <textarea
        ref={ref}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none resize-none"
      />
    </div>
  );
};

// Render markdown-lite description
const RichText = ({ text }) => {
  if (!text) return <span className="text-slate-400 italic">No description</span>;
  const lines = text.split('\n');
  return (
    <div className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('- ')) {
          return <div key={i} className="flex items-start gap-1.5"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 flex-shrink-0" /><span>{renderInline(line.slice(2))}</span></div>;
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
};

const renderInline = (text) => {
  const parts = text.split(/(\*\*.*?\*\*|_.*?_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('_') && part.endsWith('_')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
};

const EMPTY_FORM = { title: '', description: '', assignedTo: [], priority: 'medium', status: 'pending', dueDate: '', timeEstimate: '' };

// ─── Main Component ────────────────────────────────────────────────
const TasksPage = () => {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const [tasks, setTasks]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [viewMode, setViewMode] = useState('board');

  const [showModal, setShowModal]       = useState(false);
  const [editingTask, setEditingTask]   = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [openMenuId, setOpenMenuId]     = useState(null);

  // Detail panel state
  const [comment, setComment]               = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [newSubtask, setNewSubtask]         = useState('');
  const [showTimeLog, setShowTimeLog]       = useState(false);
  const [timeInput, setTimeInput]           = useState('');
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  const [uploadingFile, setUploadingFile]   = useState(false);
  const fileInputRef = useRef(null);

  // Drag
  const dragTask  = useRef(null);
  const dragIndex = useRef(null);
  const [dragOverCol, setDragOverCol]     = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/tasks');
      setTasks(data.tasks || data);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    API.get('/users').then(({ data }) => setUsers(data.users || data)).catch(() => {});
  }, [fetchTasks]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const filtered = tasks.filter(t => {
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    const matchSearch   = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const assignees     = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
    const matchAssignee = !assigneeFilter || assignees.some(a => (a?._id || a) === assigneeFilter);
    return matchPriority && matchSearch && matchAssignee;
  });

  const getColTasks = (colId) => filtered.filter(t => t.status === colId);

  const handleExportCSV = () => {
    const rows = [
      ['Title', 'Status', 'Priority', 'Assignees', 'Due Date', 'Time Spent', 'Subtasks Done', 'Subtasks Total', 'Comments', 'Created'],
      ...filtered.map(t => [
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.status || '',
        t.priority || '',
        `"${getAssigneeNames(t).join(', ')}"`,
        t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
        fmtMins(t.timeSpent || 0),
        t.subtasks?.filter(s => s.completed).length || 0,
        t.subtasks?.length || 0,
        t.comments?.length || 0,
        t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd') : '',
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} tasks`);
  };

  const openCreate = (status = 'pending') => {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, status });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    const assignees = Array.isArray(task.assignedTo)
      ? task.assignedTo.map(a => a?._id || a)
      : task.assignedTo ? [task.assignedTo?._id || task.assignedTo] : [];
    setForm({
      title:        task.title || '',
      description:  task.description || '',
      assignedTo:   assignees,
      priority:     task.priority || 'medium',
      status:       task.status || 'pending',
      dueDate:      task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      timeEstimate: task.timeEstimate || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, timeEstimate: form.timeEstimate ? Number(form.timeEstimate) : 0 };
      if (editingTask) {
        const { data } = await API.put(`/tasks/${editingTask._id}`, payload);
        toast.success('Task updated');
        if (selectedTask?._id === editingTask._id) setSelectedTask(data.task);
        setTasks(prev => prev.map(t => t._id === editingTask._id ? data.task : t));
      } else {
        await API.post('/tasks', payload);
        toast.success('Task created');
        fetchTasks();
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/tasks/${deleteTarget._id}`);
      toast.success('Task deleted');
      setTasks(prev => prev.filter(t => t._id !== deleteTarget._id));
      if (selectedTask?._id === deleteTarget._id) setSelectedTask(null);
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { data } = await API.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
      if (selectedTask?._id === taskId) setSelectedTask(data.task);
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedTask) return;
    setCommentSubmitting(true);
    try {
      const { data } = await API.post(`/tasks/${selectedTask._id}/comments`, { text: comment });
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
      setComment('');
    } catch (err) {
      toast.error('Comment failed');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleToggleWatch = async () => {
    if (!selectedTask) return;
    try {
      const { data } = await API.patch(`/tasks/${selectedTask._id}/watch`);
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
      toast.success(data.watching ? 'Watching task' : 'Unwatched');
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !selectedTask) return;
    try {
      const { data } = await API.post(`/tasks/${selectedTask._id}/subtasks`, { title: newSubtask });
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
      setNewSubtask('');
    } catch (err) {
      toast.error('Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const { data } = await API.patch(`/tasks/${selectedTask._id}/subtasks/${subtaskId}`);
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const { data } = await API.delete(`/tasks/${selectedTask._id}/subtasks/${subtaskId}`);
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleLogTime = async () => {
    if (!timeInput || !selectedTask) return;
    try {
      const { data } = await API.patch(`/tasks/${selectedTask._id}/time`, { minutes: Number(timeInput) });
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
      setTimeInput('');
      setShowTimeLog(false);
      toast.success('Time logged');
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingFile(true);
    try {
      const { data } = await API.post(`/tasks/${selectedTask._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
      toast.success('File attached');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!selectedTask) return;
    try {
      const { data } = await API.delete(`/tasks/${selectedTask._id}/attachments/${attachmentId}`);
      setSelectedTask(data.task);
      setTasks(prev => prev.map(t => t._id === selectedTask._id ? data.task : t));
      toast.success('Attachment removed');
    } catch (err) {
      toast.error('Failed');
    }
  };

  // Drag handlers
  const onDragStart = (task, idx) => { dragTask.current = task; dragIndex.current = idx; };
  const onDragOver  = (e, colId, idx) => { e.preventDefault(); setDragOverCol(colId); setDragOverIndex(idx ?? null); };
  const onDragLeave = () => { setDragOverCol(null); setDragOverIndex(null); };
  const onDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    setDragOverIndex(null);
    if (!dragTask.current) return;
    const t = dragTask.current;
    dragTask.current = null;

    const colTasks = getColTasks(colId).filter(x => x._id !== t._id);
    const insertAt  = dragOverIndex ?? colTasks.length;
    colTasks.splice(insertAt, 0, { ...t, status: colId });

    // Optimistic update
    const updates = colTasks.map((task, i) => ({ id: task._id, status: colId, order: i }));
    setTasks(prev => {
      const others = prev.filter(x => x.status !== colId || x._id === t._id);
      const updated = colTasks.map((task, i) => ({ ...task, status: colId, order: i }));
      return [...prev.filter(x => x.status !== colId && x._id !== t._id), ...updated];
    });

    try {
      await API.patch('/tasks/reorder', { updates });
    } catch {
      fetchTasks();
    }
  };

  const getAssigneeNames = (task) => {
    const arr = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    return arr.filter(Boolean).map(a => typeof a === 'object' ? (a.name || '?') : getUserName(a, users));
  };

  const isWatching = selectedTask?.watchers?.some(w => (w?._id || w) === user?._id);

  if (loading) return <LoadingSpinner size="lg" />;

  // ── Detail Panel ──────────────────────────────────────────────────
  if (selectedTask) {
    const t = selectedTask;
    const col = COLUMNS.find(c => c.id === t.status) || COLUMNS[0];
    const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
    const subtasksDone = t.subtasks?.filter(s => s.completed).length || 0;
    const subtasksTotal = t.subtasks?.length || 0;
    const timeProgress = t.timeEstimate ? Math.min(100, Math.round((t.timeSpent / t.timeEstimate) * 100)) : 0;

    return (
      <div className="flex gap-0 h-[calc(100vh-120px)]">
        {/* Back button */}
        <div className="flex-1 overflow-y-auto">
          <button onClick={() => setSelectedTask(null)} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors">
            <X className="h-4 w-4" /> Close
          </button>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-7 pt-6 pb-0">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-3">
                <span>Tasks</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-slate-600 dark:text-slate-300">{t.title}</span>
              </div>

              {/* Title */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex-1 leading-snug">{t.title}</h2>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={handleToggleWatch} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isWatching ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    {isWatching ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {isWatching ? 'Watching' : 'Watch'}
                  </button>
                  {isAdminOrHR && (
                    <>
                      <button onClick={() => openEdit(t)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 transition-colors"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(t)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>

              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {/* Status */}
                <select value={t.status} onChange={e => handleStatusChange(t._id, e.target.value)}
                  className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>

                <PriorityBadge priority={t.priority} />

                {/* Assignees */}
                <div className="flex items-center gap-1">
                  {assignees.filter(Boolean).map((a, i) => {
                    const name = typeof a === 'object' ? (a.name || '?') : getUserName(a, users);
                    return <Avatar key={i} name={name} size="sm" />;
                  })}
                  {assignees.length === 0 && <span className="text-xs text-slate-400">Unassigned</span>}
                </div>

                {t.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(t.dueDate), 'MMM dd, yyyy')}
                  </span>
                )}

                {/* Watchers */}
                {t.watchers?.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                    <Eye className="h-3 w-3" /> {t.watchers.length}
                  </span>
                )}
              </div>

              {/* Time tracking bar */}
              {(t.timeEstimate > 0 || t.timeSpent > 0) && (
                <div className="mb-5 bg-slate-50 dark:bg-slate-700/40 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> Time Tracking</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{fmtMins(t.timeSpent)} / {fmtMins(t.timeEstimate)}</span>
                  </div>
                  {t.timeEstimate > 0 && (
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${timeProgress >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${timeProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tabs body */}
            <div className="px-7 pb-6">
              {/* Description */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <AlignLeft className="h-3.5 w-3.5" /> Description
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-4 min-h-[80px]">
                  <RichText text={t.description} />
                </div>
              </div>

              {/* Subtasks */}
              <div className="mb-6">
                <button onClick={() => setSubtasksExpanded(p => !p)} className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-full">
                  {subtasksExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Subtasks ({subtasksDone}/{subtasksTotal})
                  {subtasksTotal > 0 && (
                    <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden ml-2">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${subtasksTotal ? (subtasksDone / subtasksTotal) * 100 : 0}%` }} />
                    </div>
                  )}
                </button>

                {subtasksExpanded && (
                  <div className="space-y-1 mb-2">
                    {t.subtasks?.map(sub => (
                      <div key={sub._id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <button onClick={() => handleToggleSubtask(sub._id)} className="flex-shrink-0">
                          {sub.completed
                            ? <CheckSquare className="h-4 w-4 text-green-500" />
                            : <Square className="h-4 w-4 text-slate-400" />}
                        </button>
                        <span className={`flex-1 text-sm ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {sub.title}
                        </span>
                        {isAdminOrHR && (
                          <button onClick={() => handleDeleteSubtask(sub._id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isAdminOrHR && (
                      <div className="flex items-center gap-2 px-2 mt-1">
                        <Plus className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Add subtask..."
                          value={newSubtask}
                          onChange={e => setNewSubtask(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                          className="flex-1 text-sm bg-transparent border-0 border-b border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-0 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 py-0.5"
                        />
                        {newSubtask && (
                          <button onClick={handleAddSubtask} className="p-0.5 text-indigo-500 hover:text-indigo-700">
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Time log */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Timer className="h-3.5 w-3.5" /> Time Spent: {fmtMins(t.timeSpent)}
                  </div>
                  <button onClick={() => setShowTimeLog(p => !p)} className="text-xs text-indigo-500 hover:text-indigo-700">+ Log time</button>
                </div>
                {showTimeLog && (
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" placeholder="Minutes" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                      className="w-28 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    <button onClick={handleLogTime} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors">Log</button>
                    <button onClick={() => setShowTimeLog(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" /> Attachments ({t.attachments?.length || 0})
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1">
                    {uploadingFile ? 'Uploading...' : '+ Attach file'}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadAttachment} />
                </div>
                {t.attachments?.length > 0 ? (
                  <div className="space-y-1.5">
                    {t.attachments.map(att => (
                      <div key={att._id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <File className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 text-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate transition-colors">
                          {att.name}
                        </a>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}
                        </span>
                        <a href={att.url} download={att.name} className="p-0.5 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {isAdminOrHR && (
                          <button onClick={() => handleDeleteAttachment(att._id)} className="p-0.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No attachments</p>
                )}
              </div>

              {/* Comments */}
              <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2 mb-4">
                  <MessageSquare className="h-3.5 w-3.5" /> Activity ({t.comments?.length || 0})
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-1">
                  {!t.comments?.length ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4 italic">No comments yet</p>
                  ) : t.comments.map((c, i) => (
                    <div key={c._id || i} className="flex gap-3">
                      <Avatar name={c.user?.name || 'U'} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.user?.name || 'User'}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                          {c.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 items-end">
                  <Avatar name={user?.name || 'U'} size="md" color="bg-indigo-600" />
                  <div className="flex-1 flex gap-2">
                    <textarea rows={2} placeholder="Write a comment... (Enter to send)"
                      value={comment} onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                      className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none transition" />
                    <button onClick={handleAddComment} disabled={commentSubmitting || !comment.trim()}
                      className="self-end p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────
  const ListView = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            {['Task', 'Assignees', 'Priority', 'Status', 'Due Date', 'Time', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {filtered.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">No tasks found</td></tr>
          ) : filtered.map(task => {
            const col = COLUMNS.find(c => c.id === task.status) || COLUMNS[0];
            const ColIcon = col.icon;
            const names = getAssigneeNames(task);
            return (
              <tr key={task._id} onClick={() => setSelectedTask(task)}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{task.title}</div>
                  {task.subtasks?.length > 0 && (
                    <div className="text-xs text-slate-400 mt-0.5">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {names.slice(0, 3).map((n, i) => <Avatar key={i} name={n} size="sm" />)}
                    {names.length > 3 && <span className="text-xs text-slate-400">+{names.length - 3}</span>}
                    {names.length === 0 && <span className="text-xs text-slate-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: col.color }}>
                    <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />{col.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {task.timeSpent > 0 ? fmtMins(task.timeSpent) : '—'}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  {isAdminOrHR && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(task)} className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTarget(task)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Board View ────────────────────────────────────────────────────
  const BoardView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
      {COLUMNS.map(col => {
        const colTasks = getColTasks(col.id);
        const ColIcon = col.icon;
        const isDragOver = dragOverCol === col.id;
        return (
          <div key={col.id} className="flex-shrink-0 w-[272px]"
            onDragOver={e => onDragOver(e, col.id)}
            onDragLeave={onDragLeave}
            onDrop={e => onDrop(e, col.id)}>
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <ColIcon className="h-4 w-4" style={{ color: col.color }} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{col.label}</span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">{colTasks.length}</span>
              </div>
              {isAdminOrHR && (
                <button onClick={() => openCreate(col.id)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Column body */}
            <div className={`rounded-xl min-h-[200px] p-2 space-y-2 transition-colors ${col.bg} ${isDragOver ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}>
              {colTasks.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-slate-400 dark:text-slate-500 italic">Drop here</div>
              )}
              {colTasks.map((task, idx) => (
                <TaskCard key={task._id} task={task} col={col} idx={idx}
                  isAdminOrHR={isAdminOrHR}
                  getAssigneeNames={getAssigneeNames}
                  onDragStart={onDragStart}
                  onDragOver={(e) => onDragOver(e, col.id, idx)}
                  onSelect={() => setSelectedTask(task)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setDeleteTarget(task)}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                />
              ))}
              {isAdminOrHR && (
                <button onClick={() => openCreate(col.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/40 rounded-lg transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add task
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{tasks.length} tasks total</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <Button variant="outline" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4" /> Export CSV
            </Button>
          )}
          {isAdminOrHR && (
            <Button onClick={() => openCreate()}><Plus className="h-4 w-4" /> New Task</Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none w-44 transition" />
          </div>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            <option value="">All Assignees</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-0.5">
          {[['board', LayoutGrid, 'Board'], ['list', List, 'List']].map(([mode, Icon, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === mode ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'board' ? <BoardView /> : <ListView />}

      {showModal && (
        <TaskModal isOpen={showModal} onClose={() => setShowModal(false)}
          editingTask={editingTask} form={form} setForm={setForm}
          onSubmit={handleSubmit} submitting={submitting} users={users} />
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} title="Delete Task"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`} confirmText="Delete" />
    </div>
  );
};

// ── Task Card ─────────────────────────────────────────────────────
const TaskCard = ({ task, col, idx, isAdminOrHR, getAssigneeNames, onDragStart, onDragOver, onSelect, onEdit, onDelete, openMenuId, setOpenMenuId }) => {
  const isMenuOpen = openMenuId === task._id;
  const pcfg = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium;
  const names = getAssigneeNames(task);
  const subtasksDone  = task.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  const dueDateColor = () => {
    if (!task.dueDate) return 'text-slate-400 dark:text-slate-500';
    const diff = differenceInDays(new Date(task.dueDate), new Date());
    if (diff < 0) return 'text-red-500 dark:text-red-400';
    if (diff === 0) return 'text-orange-500 dark:text-orange-400';
    if (diff <= 2) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-slate-400 dark:text-slate-500';
  };

  return (
    <div draggable onDragStart={() => onDragStart(task, idx)} onDragOver={onDragOver}
      onClick={onSelect}
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer transition-all group">

      {/* Top row: drag + title + menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">{task.title}</h4>
        </div>
        {isAdminOrHR && (
          <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : task._id); }}
              className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-6 z-50 w-36 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl py-1">
                <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); onEdit(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); onDelete(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description snippet */}
      {task.description && (
        <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 mb-2.5 leading-relaxed">
          {task.description.replace(/\*\*|__|_|\#/g, '')}
        </p>
      )}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Subtask progress */}
      {subtasksTotal > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] text-slate-400">{subtasksDone}/{subtasksTotal} subtasks</span>
            </div>
            <span className="text-[10px] text-slate-400">{Math.round((subtasksDone/subtasksTotal)*100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(subtasksDone / subtasksTotal) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-700/60 mt-2.5 pt-2.5">
        {/* Priority + meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority badge */}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${pcfg.bg} ${pcfg.text}`}>
              <Flag className="h-2.5 w-2.5" style={{ fill: pcfg.flag, color: pcfg.flag }} />
              {pcfg.label}
            </span>
            {/* Comment count */}
            {task.comments?.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                <MessageSquare className="h-3 w-3" />{task.comments.length}
              </span>
            )}
            {/* Attachments */}
            {task.attachments?.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                <Paperclip className="h-3 w-3" />{task.attachments.length}
              </span>
            )}
            {/* Time spent */}
            {task.timeSpent > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                <Timer className="h-3 w-3" />{fmtMins(task.timeSpent)}
              </span>
            )}
          </div>

          {/* Due date + avatars */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {task.dueDate && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${dueDateColor()}`}>
                <Calendar className="h-3 w-3" />{format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}
            {names.length > 0 && (
              <div className="flex -space-x-1.5">
                {names.slice(0, 3).map((n, i) => <Avatar key={i} name={n} size="sm" />)}
                {names.length > 3 && (
                  <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 ring-1 ring-white dark:ring-slate-800">
                    +{names.length - 3}
                  </div>
                )}
              </div>
            )}
            {names.length === 0 && (
              <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center" title="Unassigned">
                <User className="h-2.5 w-2.5 text-slate-300 dark:text-slate-600" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Task Modal ────────────────────────────────────────────────────
const TaskModal = ({ isOpen, onClose, editingTask, form, setForm, onSubmit, submitting, users }) => {
  useEffect(() => {
    const handleEsc = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = 'unset'; };
  }, [onClose]);

  const toggleAssignee = (uid) => {
    setForm(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(uid)
        ? prev.assignedTo.filter(id => id !== uid)
        : [...prev.assignedTo, uid],
    }));
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 modal-content-enter">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editingTask ? 'Edit Task' : 'Create Task'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Title */}
            <input autoFocus type="text" placeholder="Task name" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} required
              className="w-full text-lg font-semibold bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-0 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 pb-2 transition-colors" />

            {/* Description */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                <AlignLeft className="h-3.5 w-3.5" /> Description
              </label>
              <RichTextarea rows={4} placeholder="Add description... (Markdown: **bold**, _italic_, - list)"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Assignees (multi-select chips) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Assignees</label>
              <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 min-h-[42px]">
                {users.map(u => {
                  const selected = form.assignedTo.includes(u._id);
                  return (
                    <button key={u._id} type="button" onClick={() => toggleAssignee(u._id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500'}`}>
                      <Avatar name={u.name} size="sm" color={selected ? 'bg-indigo-400' : 'bg-slate-400'} />
                      {u.name}
                      {selected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due date + Time estimate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Time Estimate (mins)</label>
                <input type="number" min="0" placeholder="e.g. 120" value={form.timeEstimate}
                  onChange={e => setForm({ ...form, timeEstimate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingTask ? 'Save Changes' : 'Create Task'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TasksPage;

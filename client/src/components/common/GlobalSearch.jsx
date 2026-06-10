import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  Clock,
  CalendarDays,
  MessageSquare,
  FileText,
  Gift,
  FolderOpen,
  Users,
  HelpCircle,
  BarChart3,
  Activity,
  Timer,
  Settings,
  User,
  Loader2,
  Umbrella,
} from 'lucide-react';
import API from '../../api/axios';

const NAV_ITEMS = [
  { label: 'Dashboard',    path: '/dashboard',    icon: LayoutDashboard },
  { label: 'Tasks',        path: '/tasks',        icon: CheckSquare },
  { label: 'Attendance',   path: '/attendance',   icon: Clock },
  { label: 'Leave',        path: '/leave',        icon: Umbrella },
  { label: 'Calendar',     path: '/calendar',     icon: CalendarDays },
  { label: 'Messages',     path: '/messages',     icon: MessageSquare },
  { label: 'Timesheet',    path: '/timesheet',    icon: Timer },
  { label: 'Celebrations', path: '/celebrations', icon: Gift },
  { label: 'Documents',    path: '/documents',    icon: FolderOpen },
  { label: 'Directory',    path: '/directory',    icon: Users },
  { label: 'Help Desk',    path: '/tickets',      icon: HelpCircle },
  { label: 'Reports',      path: '/reports',      icon: BarChart3 },
  { label: 'Activity Log', path: '/activity-log', icon: Activity },
  { label: 'Settings',     path: '/settings',     icon: Settings },
];

function buildSections(query, tasks, people) {
  const sections = [];

  if (!query || query.length < 2) {
    sections.push({
      title: 'Go to',
      items: NAV_ITEMS.map((n) => ({
        type: 'nav',
        id: n.path,
        label: n.label,
        path: n.path,
        icon: n.icon,
        hint: 'Go to',
      })),
    });
    return sections;
  }

  const q = query.toLowerCase();

  const matchedNav = NAV_ITEMS.filter((n) =>
    n.label.toLowerCase().includes(q)
  ).map((n) => ({
    type: 'nav',
    id: n.path,
    label: n.label,
    path: n.path,
    icon: n.icon,
    hint: 'Go to',
  }));
  if (matchedNav.length) sections.push({ title: 'Go to', items: matchedNav });

  if (tasks.length) {
    sections.push({
      title: 'Tasks',
      items: tasks.map((t) => ({
        type: 'task',
        id: t._id || t.id,
        label: t.title,
        path: `/tasks?taskId=${t._id || t.id}`,
        icon: CheckSquare,
        hint: t.status || 'Task',
      })),
    });
  }

  if (people.length) {
    sections.push({
      title: 'People',
      items: people.map((u) => ({
        type: 'person',
        id: u._id || u.id,
        label: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        path: `/directory`,
        icon: User,
        hint: u.role || u.designation || 'Employee',
      })),
    });
  }

  return sections;
}

function flattenSections(sections) {
  return sections.flatMap((s) => s.items);
}

function StatusPill({ text, type }) {
  const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
  if (type === 'nav') {
    return (
      <span className={`${base} bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400`}>
        {text}
      </span>
    );
  }
  if (type === 'task') {
    return (
      <span className={`${base} bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300`}>
        {text}
      </span>
    );
  }
  return (
    <span className={`${base} bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300`}>
      {text}
    </span>
  );
}

function GlobalSearch({ forceOpen, onForceClose } = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const isOpen = forceOpen !== undefined ? forceOpen : open;

  const openSearch = useCallback(() => {
    setOpen(true);
    setQuery('');
    setTasks([]);
    setPeople([]);
    setSelectedIndex(0);
  }, []);

  const closeSearch = useCallback(() => {
    if (onForceClose) onForceClose();
    setOpen(false);
    setQuery('');
    setTasks([]);
    setPeople([]);
    setSelectedIndex(0);
  }, [onForceClose]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) closeSearch();
        else openSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, openSearch, closeSearch]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setTasks([]);
      setPeople([]);
      setLoading(false);
      setSelectedIndex(0);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [tasksRes, usersRes] = await Promise.allSettled([
          API.get('/tasks', { params: { search: query } }),
          API.get('/users', { params: { search: query } }),
        ]);

        const rawTasks = tasksRes.status === 'fulfilled'
          ? (tasksRes.value.data?.tasks || tasksRes.value.data || [])
          : [];
        const rawUsers = usersRes.status === 'fulfilled'
          ? (usersRes.value.data?.users || usersRes.value.data || [])
          : [];

        const q = query.toLowerCase();
        setTasks(
          rawTasks.filter((t) => t.title?.toLowerCase().includes(q)).slice(0, 5)
        );
        setPeople(
          rawUsers.filter((u) => {
            const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`;
            return name.toLowerCase().includes(q);
          }).slice(0, 5)
        );
      } catch {
        /* silently ignore */
      } finally {
        setLoading(false);
        setSelectedIndex(0);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const sections = buildSections(query, tasks, people);
  const flat = flattenSections(sections);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(flat.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + Math.max(flat.length, 1)) % Math.max(flat.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flat[selectedIndex];
      if (item) { navigate(item.path); closeSearch(); }
    }
  };

  const handleSelect = (item) => {
    navigate(item.path);
    closeSearch();
  };

  if (!isOpen) return null;

  const noResults = query.length >= 2 && !loading && flat.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeSearch(); }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
        onKeyDown={handleKeyDown}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything..."
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-base"
          />
          {loading && (
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="overflow-y-auto max-h-[60vh]"
        >
          {noResults ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            sections.map((section) => {
              let globalOffset = 0;
              sections.forEach((s, si) => {
                if (s.title === section.title) return;
                const idx = sections.findIndex((x) => x.title === section.title);
                if (si < idx) globalOffset += s.items.length;
              });
              return (
                <SectionGroup
                  key={section.title}
                  section={section}
                  selectedIndex={selectedIndex}
                  flat={flat}
                  onSelect={handleSelect}
                />
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          <span>↑↓ navigate</span>
          <span>·</span>
          <span>Enter select</span>
          <span>·</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}

function SectionGroup({ section, selectedIndex, flat, onSelect }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {section.title}
      </div>
      {section.items.map((item) => {
        const flatIdx = flat.findIndex((f) => f.id === item.id && f.type === item.type);
        const isSelected = flatIdx === selectedIndex;
        const Icon = item.icon;
        return (
          <button
            key={`${item.type}-${item.id}`}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => onSelect(item)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
              ${isSelected
                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
            />
            <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
            <StatusPill text={item.hint} type={item.type} />
          </button>
        );
      })}
    </div>
  );
}

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 text-sm transition-colors border border-slate-200 dark:border-slate-600"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>
      <GlobalSearch forceOpen={open} onForceClose={() => setOpen(false)} />
    </>
  );
}

export default GlobalSearch;

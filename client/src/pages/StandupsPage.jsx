import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  ClipboardList, Edit2, Send, Loader2, Calendar, Users, ChevronLeft, ChevronRight, AlertCircle, Clock
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

const STATUS_CONFIG = {
  'In Progress': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'Completed':   { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  'Blocked':     { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

const calcHours = (start, end) => {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

const defaultForm = () => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  status: 'In Progress',
  startTime: '',
  endTime: '',
  yesterday: '',
  today: '',
  blockers: '',
  tasksWorked: '',
});

const StandupsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayEntry, setTodayEntry] = useState(null);
  const [myEntries, setMyEntries] = useState([]);
  const [teamEntries, setTeamEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [editing, setEditing] = useState(false);
  const [teamDate, setTeamDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [form, setForm] = useState(defaultForm());

  useEffect(() => {
    fetchMyEntries();
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === 'team') fetchTeamEntries();
  }, [activeTab, teamDate]);

  const fetchMyEntries = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/standups/my');
      const entries = data.standups || [];
      setMyEntries(entries);
      const today = format(new Date(), 'yyyy-MM-dd');
      const entry = entries.find(s =>
        format(new Date(s.date || s.createdAt), 'yyyy-MM-dd') === today
      );
      if (entry) {
        setTodayEntry(entry);
        setForm({
          date: entry.date ? format(new Date(entry.date), 'yyyy-MM-dd') : today,
          status: entry.status || 'In Progress',
          startTime: entry.startTime || '',
          endTime: entry.endTime || '',
          yesterday: entry.yesterday || '',
          today: entry.today || '',
          blockers: entry.blockers || '',
          tasksWorked: entry.tasksWorked || '',
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamEntries = async () => {
    try {
      const { data } = await API.get(`/standups/team?date=${teamDate}`);
      setTeamEntries(data.standups || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team progress');
    }
  };

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.today.trim()) {
      toast.error('Please describe what you will do today');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        date: form.date,
        status: form.status,
        startTime: form.startTime,
        endTime: form.endTime,
        yesterday: form.yesterday,
        today: form.today,
        blockers: form.blockers,
        tasksWorked: form.tasksWorked,
      };
      if (todayEntry && editing) {
        await API.put(`/standups/${todayEntry._id}`, payload);
        toast.success('Progress updated');
      } else {
        await API.post('/standups', payload);
        toast.success('Progress submitted');
      }
      setEditing(false);
      fetchMyEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const ProgressCard = ({ entry, showUser = false }) => {
    const hours = calcHours(entry.startTime, entry.endTime);
    const timeRange = entry.startTime && entry.endTime
      ? `${entry.startTime} – ${entry.endTime}${hours ? ` · ${hours}` : ''}`
      : null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {showUser && (
              <span className="font-semibold text-slate-800 dark:text-slate-100">{entry.user?.name || 'Unknown'}</span>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {entry.date ? format(new Date(entry.date), 'MMM dd, yyyy') : format(new Date(entry.createdAt), 'MMM dd, yyyy')}
            </span>
            {timeRange && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3" /> {timeRange}
              </span>
            )}
          </div>
          {entry.status && <StatusBadge status={entry.status} />}
        </div>

        <div className="space-y-3">
          {entry.yesterday && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Yesterday</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{entry.yesterday}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">Today</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{entry.today}</p>
          </div>
          {entry.tasksWorked && (
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Tasks Worked On</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{entry.tasksWorked}</p>
            </div>
          )}
          {entry.blockers && (
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Blockers
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{entry.blockers}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const inputCls = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500";
  const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-indigo-600" /> Daily Progress
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Track and share your daily work progress</p>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'my' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}>
            My Progress
          </button>
          <button onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition inline-flex items-center gap-2 ${
              activeTab === 'team' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}>
            <Users className="w-4 h-4" /> Team Progress
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : activeTab === 'my' ? (
        <div className="space-y-6">
          {todayEntry && !editing ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" /> Today's Progress
                </h3>
                <button onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              </div>
              <ProgressCard entry={todayEntry} />
            </div>
          ) : (
            <form onSubmit={handleSubmit}
              className="bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {todayEntry ? "Edit Today's Progress" : "Submit Today's Progress"}
              </h3>

              {/* 1. Date */}
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                  className={inputCls} />
              </div>

              {/* 2. Status */}
              <div>
                <label className={labelCls}>Status</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(STATUS_CONFIG).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const active = form.status === s;
                    return (
                      <button key={s} type="button" onClick={() => setField('status', s)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition ${
                          active
                            ? `${cfg.bg} ${cfg.text} border-current`
                            : 'bg-transparent border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${active ? cfg.dot : 'bg-slate-300 dark:bg-slate-500'}`} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Start / End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setField('startTime', e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setField('endTime', e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              {form.startTime && form.endTime && calcHours(form.startTime, form.endTime) && (
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {form.startTime} – {form.endTime} · <span className="font-semibold text-indigo-600 dark:text-indigo-400">{calcHours(form.startTime, form.endTime)}</span> worked
                </p>
              )}

              {/* 4. Yesterday */}
              <div>
                <label className={`${labelCls} text-slate-600 dark:text-slate-400`}>What did you do yesterday?</label>
                <textarea rows={3} value={form.yesterday} onChange={e => setField('yesterday', e.target.value)}
                  placeholder="Summarise yesterday's work..."
                  className={inputCls} />
              </div>

              {/* 5. Today */}
              <div>
                <label className={`${labelCls} text-blue-700 dark:text-blue-400`}>What will you do today? <span className="text-red-500">*</span></label>
                <textarea rows={3} required value={form.today} onChange={e => setField('today', e.target.value)}
                  placeholder="Describe tasks planned or in progress..."
                  className={inputCls} />
              </div>

              {/* 6. Blockers */}
              <div>
                <label className={`${labelCls} text-red-700 dark:text-red-400`}>Any blockers or challenges?</label>
                <textarea rows={2} value={form.blockers} onChange={e => setField('blockers', e.target.value)}
                  placeholder="Leave empty if none"
                  className={inputCls} />
              </div>

              {/* 7. Tasks Worked On */}
              <div>
                <label className={`${labelCls} text-indigo-700 dark:text-indigo-400`}>Tasks Worked On</label>
                <textarea rows={4} value={form.tasksWorked} onChange={e => setField('tasksWorked', e.target.value)}
                  placeholder="Detailed notes on tasks, ticket numbers, PRs, meetings, decisions..."
                  className={inputCls} />
              </div>

              <div className="flex justify-end gap-3">
                {editing && (
                  <button type="button" onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {todayEntry ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          )}

          {/* History */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">History</h3>
            {myEntries.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">No progress history yet</p>
            ) : (
              <div className="space-y-3">
                {myEntries.filter(s => {
                  const today = format(new Date(), 'yyyy-MM-dd');
                  const sDate = format(new Date(s.date || s.createdAt), 'yyyy-MM-dd');
                  return sDate !== today;
                }).map(s => <ProgressCard key={s._id} entry={s} />)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setTeamDate(format(subDays(new Date(teamDate), 1), 'yyyy-MM-dd'))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <input type="date" value={teamDate} onChange={e => setTeamDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <button onClick={() => setTeamDate(format(addDays(new Date(teamDate), 1), 'yyyy-MM-dd'))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          {teamEntries.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No progress updates for this date</p>
          ) : (
            <div className="space-y-3">
              {teamEntries.map(s => <ProgressCard key={s._id} entry={s} showUser />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StandupsPage;

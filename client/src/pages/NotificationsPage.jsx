import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';
import {
  Bell, CheckSquare, CalendarOff, MessageSquare, Megaphone,
  Receipt, Cake, CreditCard, Inbox, CheckCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  task:         { Icon: CheckSquare,   bg: 'bg-indigo-100 dark:bg-indigo-900/40',  icon: 'text-indigo-600 dark:text-indigo-400' },
  leave:        { Icon: CalendarOff,   bg: 'bg-yellow-100 dark:bg-yellow-900/40',  icon: 'text-yellow-600 dark:text-yellow-400' },
  message:      { Icon: MessageSquare, bg: 'bg-blue-100 dark:bg-blue-900/40',      icon: 'text-blue-600 dark:text-blue-400' },
  announcement: { Icon: Megaphone,     bg: 'bg-purple-100 dark:bg-purple-900/40',  icon: 'text-purple-600 dark:text-purple-400' },
  payslip:      { Icon: Receipt,       bg: 'bg-green-100 dark:bg-green-900/40',    icon: 'text-green-600 dark:text-green-400' },
  birthday:     { Icon: Cake,          bg: 'bg-pink-100 dark:bg-pink-900/40',      icon: 'text-pink-600 dark:text-pink-400' },
  expense:      { Icon: CreditCard,    bg: 'bg-orange-100 dark:bg-orange-900/40',  icon: 'text-orange-600 dark:text-orange-400' },
  general:      { Icon: Bell,          bg: 'bg-slate-100 dark:bg-slate-700',       icon: 'text-slate-500 dark:text-slate-400' },
};

function getConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.general;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function RelativeTime({ date }) {
  if (!date) return null;
  try {
    return (
      <span>{formatDistanceToNow(new Date(date), { addSuffix: true })}</span>
    );
  } catch {
    return null;
  }
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
      </div>
    </div>
  );
}

function EmptyState({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
      <p className="text-base font-medium text-slate-500 dark:text-slate-400">All caught up!</p>
      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
        {tab === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
      </p>
    </div>
  );
}

function NotificationRow({ notif, onMarkRead, navigate }) {
  const { Icon, bg, icon } = getConfig(notif.type);
  const actorName = notif.user?.name || notif.actorName || '';

  function handleClick() {
    if (!notif.read) onMarkRead(notif._id);
    if (notif.link) navigate(notif.link);
  }

  return (
    <div
      onClick={handleClick}
      className={[
        'flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors',
        notif.read
          ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
          : 'bg-indigo-50/30 dark:bg-indigo-900/10 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20',
      ].join(' ')}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
        {actorName ? (
          <span className={`text-xs font-bold ${icon}`}>{getInitials(actorName)}</span>
        ) : (
          <Icon className={`w-5 h-5 ${icon}`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 dark:text-slate-100 leading-snug">
          {actorName && (
            <span className="font-semibold">{actorName} </span>
          )}
          {notif.message || notif.title || 'Notification'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          <RelativeTime date={notif.createdAt} />
        </p>
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
      )}
    </div>
  );
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('unread');

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const { data } = await API.get('/notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  }

  async function markAllAsRead() {
    try {
      try {
        await API.patch('/notifications/read-all');
      } catch (err) {
        if (err.response?.status !== 404) throw err;
        // graceful fallback: loop through unread
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => API.patch(`/notifications/${n._id}/read`)));
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = tab === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Inbox</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('unread')}
            className={[
              'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === 'unread'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
            ].join(' ')}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                tab === 'unread'
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('all')}
            className={[
              'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === 'all'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
            ].join(' ')}
          >
            All
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {displayed.map(notif => (
              <NotificationRow
                key={notif._id}
                notif={notif}
                onMarkRead={markAsRead}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

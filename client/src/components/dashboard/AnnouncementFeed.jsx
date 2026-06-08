import { Link } from 'react-router-dom';
import { Megaphone, Pin, ArrowRight } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { truncate } from '../../utils/helpers';
import LoadingSpinner from '../common/LoadingSpinner';

const timeAgo = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
};

const categoryColors = {
  general: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  hr: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  event: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  policy: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
};

const AnnouncementFeed = () => {
  const { data, loading } = useFetch('/announcements?limit=5&sort=-isPinned,-createdAt');

  if (loading) return <LoadingSpinner size="sm" />;

  const announcements = data?.announcements || data || [];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Announcements</h3>
        </div>
        <Link
          to="/announcements"
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          No announcements yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {announcements.map((item) => (
            <div
              key={item._id || item.id}
              className={`px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                item.category === 'urgent' ? 'border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                {item.isPinned && (
                  <Pin className="h-3 w-3 text-amber-500" />
                )}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    categoryColors[item.category] || categoryColors.general
                  }`}
                >
                  {item.category || 'general'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {timeAgo(item.createdAt)}
                </span>
              </div>
              <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {item.title}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {truncate(item.content, 100)}
              </p>
              {item.createdBy && (
                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  By {item.createdBy.name || item.createdBy}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementFeed;

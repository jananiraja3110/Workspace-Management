import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { Gift, Star, Loader2, PartyPopper, Calendar } from 'lucide-react';
import {
  parseISO,
  differenceInDays,
  format,
  setYear,
  isAfter,
  startOfDay,
  differenceInYears,
} from 'date-fns';

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-pink-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
];

function getInitials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function daysUntilNextOccurrence(dateStr) {
  if (!dateStr) return null;
  const today = startOfDay(new Date());
  let next = setYear(parseISO(dateStr), today.getFullYear());
  next = startOfDay(next);
  if (!isAfter(next, today) && differenceInDays(next, today) !== 0) {
    next = setYear(next, today.getFullYear() + 1);
  }
  const diff = differenceInDays(next, today);
  return diff;
}

function DaysBadge({ days, theme }) {
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold';
  if (days === 0) {
    return (
      <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300`}>
        Today! 🎉
      </span>
    );
  }
  if (days === 1) {
    return (
      <span
        className={`${base} ${
          theme === 'pink'
            ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
        }`}
      >
        Tomorrow
      </span>
    );
  }
  return (
    <span
      className={`${base} ${
        theme === 'pink'
          ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
      }`}
    >
      In {days}d
    </span>
  );
}

function CelebrationCard({ person, dateStr, days, theme, index, extra }) {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const borderColor = theme === 'pink' ? 'border-l-pink-400' : 'border-l-indigo-400';

  let displayDate = '—';
  try {
    displayDate = format(parseISO(dateStr), 'MMM d');
  } catch {}

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 ${borderColor} p-4 flex flex-col gap-3`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`${avatarColor} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
        >
          {getInitials(person.name)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
            {person.name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {person.designation || person.role || '—'}
            {person.department ? ` · ${person.department}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
          <Calendar size={12} />
          {displayDate}
        </span>
        <div className="flex items-center gap-2">
          {extra && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {extra}
            </span>
          )}
          <DaysBadge days={days} theme={theme} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, label, theme }) {
  const iconColor = theme === 'pink' ? 'text-pink-300 dark:text-pink-700' : 'text-indigo-300 dark:text-indigo-700';
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 gap-3 text-center">
      <Icon size={40} className={iconColor} />
      <p className="text-slate-500 dark:text-slate-400 text-sm">
        No {label} in the next 31 days
      </p>
    </div>
  );
}

const CelebrationsPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/users');
        setUsers(data.users || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load celebrations');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const today = startOfDay(new Date());

  const birthdays = users
    .map((u, i) => {
      const days = daysUntilNextOccurrence(u.dateOfBirth);
      return { user: u, days, index: i };
    })
    .filter((x) => x.days !== null && x.days <= 31)
    .sort((a, b) => a.days - b.days);

  const anniversaries = users
    .map((u, i) => {
      const days = daysUntilNextOccurrence(u.joiningDate);
      let years = null;
      if (u.joiningDate) {
        try {
          years = differenceInYears(
            setYear(parseISO(u.joiningDate), today.getFullYear() + (days === 0 ? 0 : 1)),
            parseISO(u.joiningDate)
          );
        } catch {}
      }
      return { user: u, days, index: i, years };
    })
    .filter((x) => x.days !== null && x.days <= 31 && x.years > 0)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <PartyPopper size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Celebrations
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upcoming birthdays and work anniversaries in the next 31 days
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {/* Birthdays */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Gift size={18} className="text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  Upcoming Birthdays
                </h2>
                {birthdays.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs font-semibold">
                    {birthdays.length}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {birthdays.length === 0 ? (
                  <EmptyState icon={Gift} label="birthdays" theme="pink" />
                ) : (
                  birthdays.map(({ user, days, index }) => (
                    <CelebrationCard
                      key={user._id || user.id || user.name + user.dateOfBirth}
                      person={user}
                      dateStr={user.dateOfBirth}
                      days={days}
                      theme="pink"
                      index={index}
                      extra={null}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Work Anniversaries */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Star size={18} className="text-indigo-500" />
                <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  Work Anniversaries
                </h2>
                {anniversaries.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                    {anniversaries.length}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {anniversaries.length === 0 ? (
                  <EmptyState icon={Star} label="work anniversaries" theme="indigo" />
                ) : (
                  anniversaries.map(({ user, days, index, years }) => (
                    <CelebrationCard
                      key={user._id || user.id || user.name + user.joiningDate}
                      person={user}
                      dateStr={user.joiningDate}
                      days={days}
                      theme="indigo"
                      index={index}
                      extra={years ? `${years} ${years === 1 ? 'year' : 'years'}` : null}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default CelebrationsPage;

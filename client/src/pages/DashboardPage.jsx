import {
  Users, UserCheck, Clock, CalendarOff, CheckSquare,
  AlertCircle, Activity, Timer, Gift, TrendingUp,
  Receipt, FileCheck, ChevronRight, Cake,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { getGreeting, formatDate } from '../utils/helpers';
import { ROLES } from '../utils/constants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatsCard from '../components/dashboard/StatsCard';
import QuickActions from '../components/dashboard/QuickActions';
import CelebrationBanner from '../components/dashboard/CelebrationBanner';
import AnnouncementFeed from '../components/dashboard/AnnouncementFeed';
import StatusBadge from '../components/common/StatusBadge';
import { useEffect, useState } from 'react';
import API from '../api/axios';
import { format, isToday, differenceInDays } from 'date-fns';

// ── Task Donut ─────────────────────────────────────────────────────
const TaskDonut = ({ pending = 0, inProgress = 0, completed = 0 }) => {
  const displayTotal = pending + inProgress + completed;
  const total = Math.max(1, displayTotal);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const slices = [
    { val: completed, color: '#10B981' },
    { val: inProgress, color: '#3B82F6' },
    { val: pending, color: '#EAB308' },
  ];
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-700" />
        {slices.map((s, i) => {
          const dash = (s.val / total) * circ;
          const gap  = circ - dash;
          const el = (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12"
              strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
              transform="rotate(-90 50 50)" />
          );
          offset += dash;
          return el;
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-slate-700 dark:fill-slate-200" fontSize="14" fontWeight="bold">{displayTotal}</text>
      </svg>
      <div className="space-y-2 text-sm">
        {[['Done', completed, '#10B981'], ['Active', inProgress, '#3B82F6'], ['Pending', pending, '#EAB308']].map(([label, val, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-slate-600 dark:text-slate-300">{label}</span>
            <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100 pl-4">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Who's In Today widget ──────────────────────────────────────────
const WhosInWidget = ({ attendance = [] }) => {
  const present = attendance.filter(a => a.checkIn);
  const absent  = attendance.filter(a => !a.checkIn);
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {present.map((a, i) => {
        const name = a.user?.name || a.name || 'Unknown';
        return (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{name}</span>
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {a.checkIn ? format(new Date(a.checkIn), 'hh:mm a') : 'In'}
            </span>
          </div>
        );
      })}
      {absent.map((a, i) => {
        const name = a.user?.name || a.name || 'Unknown';
        return (
          <div key={i} className="flex items-center gap-2.5 opacity-50">
            <div className="h-7 w-7 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-bold flex-shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 flex-1 truncate">{name}</span>
            <span className="text-xs text-slate-400">Absent</span>
          </div>
        );
      })}
      {!attendance.length && <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">No data</p>}
    </div>
  );
};

// ── Upcoming Birthdays ─────────────────────────────────────────────
const BirthdayWidget = ({ birthdays = [] }) => {
  if (!birthdays.length) return <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-4">No upcoming birthdays</p>;
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
      {birthdays.map((b, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
            <Cake className="h-3.5 w-3.5 text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{b.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{b.designation || b.role}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.isToday ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
            {b.isToday ? '🎉 Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil}d`}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Admin Dashboard ────────────────────────────────────────────────
const AdminDashboard = ({ stats }) => {
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    // Fetch today's team attendance snapshot
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = `${istNow.getUTCFullYear()}-${String(istNow.getUTCMonth()+1).padStart(2,'0')}-${String(istNow.getUTCDate()).padStart(2,'0')}`;
    API.get('/attendance/team', { params: { startDate: todayIST, endDate: todayIST } })
      .then(({ data }) => setTodayAttendance(data.attendance || data))
      .catch(() => {});
    // Fetch upcoming birthdays from users
    API.get('/users?limit=100')
      .then(({ data }) => {
        const users = data.users || data;
        const istNow2 = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
        const todayUTC = new Date(Date.UTC(istNow2.getUTCFullYear(), istNow2.getUTCMonth(), istNow2.getUTCDate()));
        const upcoming = users
          .filter(u => u.dateOfBirth)
          .map(u => {
            const dob = new Date(u.dateOfBirth);
            let thisYear = new Date(Date.UTC(todayUTC.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
            if (thisYear < todayUTC) thisYear = new Date(Date.UTC(todayUTC.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate()));
            const days = Math.round((thisYear - todayUTC) / (1000 * 60 * 60 * 24));
            return { name: u.name, designation: u.designation, role: u.role, daysUntil: days, isToday: days === 0 };
          })
          .filter(b => b.daysUntil <= 30)
          .sort((a, b) => a.daysUntil - b.daysUntil)
          .slice(0, 6);
        setBirthdays(upcoming);
      })
      .catch(() => {});
  }, []);

  const recentActivity = stats?.recentActivity || [];
  const presentCount   = todayAttendance.filter(a => a.checkIn).length;

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatsCard title="Total Employees" value={stats?.totalEmployees ?? 0} icon={Users} color="indigo" trend={stats?.employeeTrend} trendValue={stats?.employeeTrendValue} />
        <StatsCard title="HR Staff" value={stats?.totalManagers ?? 0} icon={UserCheck} color="blue" />
        <StatsCard title="Present Today" value={`${stats?.todayAttendancePercent ?? stats?.attendancePercentage ?? 0}%`} icon={Clock} color="green" />
        <StatsCard title="Pending Leaves" value={stats?.pendingLeaves ?? 0} icon={CalendarOff} color="yellow" />
        <StatsCard title="Overdue Tasks" value={stats?.overdueTasks ?? 0} icon={AlertCircle} color="red" />
      </div>

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left col — Activity + Who's In */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 px-5 py-4">
              <Activity className="h-5 w-5 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
            </div>
            {recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No recent activity.</div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {recentActivity.slice(0, 8).map((item, idx) => (
                  <div key={item._id || idx} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-0.5 h-7 w-7 flex-shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Activity className="h-3.5 w-3.5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{item.details || item.message || item.action}</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {item.user?.name || 'System'} · {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Who's In Today */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Who's In Today</h3>
              </div>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{presentCount} present</span>
            </div>
            <div className="px-5 py-4">
              <WhosInWidget attendance={todayAttendance} />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Task summary donut */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-500" /> Task Overview
            </h3>
            <TaskDonut pending={stats?.tasksPending ?? 0} inProgress={stats?.tasksInProgress ?? 0} completed={stats?.tasksCompleted ?? 0} />
          </div>

          {/* Birthdays */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-500" /> Upcoming Birthdays
            </h3>
            <BirthdayWidget birthdays={birthdays} />
          </div>

          <AnnouncementFeed />
        </div>
      </div>
    </>
  );
};

// ── HR Dashboard ───────────────────────────────────────────────────
const HRDashboard = ({ stats }) => {
  const ts = stats?.taskStats || {};
  const pending    = ts.pending    ?? stats?.tasksPending    ?? 0;
  const inProgress = ts['in-progress'] ?? stats?.tasksInProgress ?? 0;
  const completed  = ts.completed  ?? stats?.tasksCompleted  ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Team Size" value={stats?.teamSize ?? 0} icon={Users} color="indigo" />
        <StatsCard title="Team Attendance" value={`${stats?.teamAttendancePercentage ?? stats?.teamAttendanceToday ?? 0}%`} icon={Clock} color="green" />
        <StatsCard title="Pending Leaves" value={stats?.pendingLeaveRequests ?? stats?.pendingLeaves ?? 0} icon={CalendarOff} color="yellow" />
        <StatsCard title="Tasks Total" value={(pending + inProgress + completed)} icon={CheckSquare} color="blue" trendValue={pending > 0 ? `${pending} pending` : undefined} trend={pending > 0 ? 'neutral' : undefined} />
      </div>

      <div className="mt-6">
        <QuickActions isClockedIn={stats?.isClockedIn} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Task breakdown */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-500" /> Task Breakdown
            </h3>
            <div className="flex items-center gap-6">
              <TaskDonut pending={pending} inProgress={inProgress} completed={completed} />
              <div className="flex-1 grid grid-cols-1 gap-3">
                {[['To Do', pending, 'bg-yellow-50 dark:bg-yellow-900/20', 'text-yellow-700 dark:text-yellow-400'], ['In Progress', inProgress, 'bg-blue-50 dark:bg-blue-900/20', 'text-blue-700 dark:text-blue-400'], ['Done', completed, 'bg-green-50 dark:bg-green-900/20', 'text-green-700 dark:text-green-400']].map(([label, val, bg, text]) => (
                  <div key={label} className={`${bg} rounded-lg p-3 flex items-center justify-between`}>
                    <span className={`text-xs font-medium ${text}`}>{label}</span>
                    <span className={`text-xl font-bold ${text}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AnnouncementFeed />
        </div>
      </div>
    </>
  );
};

// ── Developer Dashboard ────────────────────────────────────────────
const DeveloperDashboard = ({ stats }) => {
  const deadlines = stats?.upcomingDeadlines || [];
  const lb = stats?.leaveBalance || {};
  const totalLeave = (lb.casual || 0) + (lb.sick || 0) + (lb.earned || 0);
  const isClockedIn = stats?.todayAttendance?.checkIn && !stats?.todayAttendance?.checkOut;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Attendance" value={isClockedIn ? 'Checked In' : 'Not Yet'} icon={Clock} color={isClockedIn ? 'green' : 'yellow'} />
        <StatsCard title="Pending Tasks" value={stats?.pendingTasks ?? 0} icon={CheckSquare} color="indigo" />
        <StatsCard title="Leave Balance" value={totalLeave} icon={CalendarOff} color="blue" trendValue={`${lb.casual || 0}C · ${lb.sick || 0}S · ${lb.earned || 0}E`} trend="neutral" />
        <StatsCard title="Upcoming Deadlines" value={stats?.upcomingDeadlineCount ?? deadlines.length} icon={Timer} color="red" />
      </div>

      <div className="mt-6">
        <QuickActions isClockedIn={isClockedIn} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 px-5 py-4">
              <Timer className="h-5 w-5 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upcoming Deadlines</h3>
            </div>
            {deadlines.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckSquare className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">All caught up! No deadlines this week.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {deadlines.map((item, idx) => {
                  const _ist = new Date(Date.now() + 5.5*60*60*1000);
                  const _todayMidnight = new Date(Date.UTC(_ist.getUTCFullYear(), _ist.getUTCMonth(), _ist.getUTCDate()));
                  const daysLeft = item.dueDate ? Math.ceil((new Date(item.dueDate) - _todayMidnight) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <div key={item._id || idx} className="flex items-center justify-between px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{item.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.project?.name || ''}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        {daysLeft !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${daysLeft <= 1 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : daysLeft <= 3 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                            {daysLeft <= 0 ? 'Overdue' : daysLeft === 1 ? '1d left' : `${daysLeft}d left`}
                          </span>
                        )}
                        <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">{formatDate(item.dueDate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <AnnouncementFeed />
        </div>
      </div>
    </>
  );
};

// ── Main ───────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const { data, loading } = useFetch('/dashboard/stats');

  const stats = data?.stats || data || {};
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const greeting = getGreeting();

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {greeting}, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{today}</p>
      </div>

      <CelebrationBanner />

      {user?.role === ROLES.ADMIN     && <AdminDashboard     stats={stats} />}
      {user?.role === ROLES.HR        && <HRDashboard        stats={stats} />}
      {user?.role === ROLES.DEVELOPER && <DeveloperDashboard stats={stats} />}
    </div>
  );
};

export default DashboardPage;

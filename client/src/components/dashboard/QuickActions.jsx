import { Link } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  CalendarOff,
  Mic,
  MessageSquare,
  LifeBuoy,
} from 'lucide-react';

const QuickActions = ({ isClockedIn = false }) => {
  const actions = [
    {
      label: isClockedIn ? 'Check Out' : 'Check In',
      icon: isClockedIn ? LogOut : LogIn,
      to: '/attendance',
      color: isClockedIn
        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30',
    },
    {
      label: 'Apply Leave',
      icon: CalendarOff,
      to: '/leave',
      color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
    },
    {
      label: 'Submit Standup',
      icon: Mic,
      to: '/standups',
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30',
    },
    {
      label: 'New Message',
      icon: MessageSquare,
      to: '/messages',
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30',
    },
    {
      label: 'Raise Ticket',
      icon: LifeBuoy,
      to: '/tickets',
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center transition-colors ${action.color}`}
          >
            <action.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;

export const ROLES = { ADMIN: 'admin', HR: 'hr', DEVELOPER: 'developer' };

export const TASK_STATUS = { PENDING: 'pending', TODO: 'todo', IN_PROGRESS: 'in-progress', COMPLETED: 'completed', OVERDUE: 'overdue' };

export const LEAVE_TYPES = { CASUAL: 'casual', SICK: 'sick', EARNED: 'earned' };

export const PRIORITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };

export const PRIORITY_COLORS = {
  low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  high: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  urgent: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
};

export const STATUS_COLORS = {
  pending: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300',
  todo: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'in-progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  overdue: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  resolved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  closed: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
  reimbursed: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  'on-hold': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
};

export const SIDEBAR_LINKS = [
  { section: 'Main', items: [
    { name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: ['admin', 'hr', 'developer'] },
    { name: 'Announcements', path: '/announcements', icon: 'Megaphone', roles: ['admin', 'hr', 'developer'] },
  ]},
  { section: 'Work', items: [
    { name: 'Tasks', path: '/tasks', icon: 'CheckSquare', roles: ['admin', 'hr', 'developer'] },
    { name: 'Timesheet', path: '/timesheet', icon: 'Timer', roles: ['admin', 'hr', 'developer'] },
    { name: 'Messages', path: '/messages', icon: 'MessageSquare', roles: ['admin', 'hr', 'developer'] },
    { name: 'Daily Progress', path: '/standups', icon: 'ClipboardList', roles: ['admin', 'hr', 'developer'] },
    { name: 'Attendance', path: '/attendance', icon: 'Clock', roles: ['admin', 'hr', 'developer'] },
    { name: 'Leave', path: '/leave', icon: 'CalendarOff', roles: ['admin', 'hr', 'developer'] },
    { name: 'Calendar', path: '/calendar', icon: 'Calendar', roles: ['admin', 'hr', 'developer'] },
  ]},
  { section: 'Tools', items: [
    { name: 'Celebrations', path: '/celebrations', icon: 'PartyPopper', roles: ['admin', 'hr', 'developer'] },
    { name: 'Documents', path: '/documents', icon: 'FileText', roles: ['admin', 'hr', 'developer'] },
    { name: 'Conference Room', path: '/room-booking', icon: 'DoorOpen', roles: ['admin', 'hr', 'developer'], comingSoon: true },
    { name: 'Help Desk', path: '/tickets', icon: 'LifeBuoy', roles: ['admin', 'hr', 'developer'], comingSoon: true },
    { name: 'Personal Vault', path: '/vault', icon: 'Lock', roles: ['admin', 'hr', 'developer'], comingSoon: true },
    { name: 'Directory', path: '/directory', icon: 'Users', roles: ['admin', 'hr', 'developer'] },
  ]},
  { section: 'Admin', items: [
    { name: 'Users', path: '/users', icon: 'UserCog', roles: ['admin', 'hr'] },
    { name: 'Reports', path: '/reports', icon: 'BarChart3', roles: ['admin', 'hr'] },
    { name: 'Activity Log', path: '/activity-log', icon: 'ScrollText', roles: ['admin', 'hr'] },
    { name: 'Settings', path: '/settings', icon: 'Settings', roles: ['admin', 'hr'] },
  ]},
];

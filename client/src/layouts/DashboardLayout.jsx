import { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axios';
import {
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Globe,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  Megaphone,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  ClipboardList,
  Clock,
  CalendarOff,
  Calendar,
  Receipt,
  Wallet,
  Star,
  FileText,
  DoorOpen,
  LifeBuoy,
  Lock,
  Users,
  UserCog,
  BarChart3,
  ScrollText,
  Timer,
  PartyPopper,
  Layers,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeContext } from '../context/ThemeContext';
import { SIDEBAR_LINKS } from '../utils/constants';
import { getInitials } from '../utils/helpers';
import { SearchTrigger } from '../components/common/GlobalSearch';
import { useSocket } from '../hooks/useSocket';

const iconMap = {
  LayoutDashboard,
  Megaphone,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  ClipboardList,
  Clock,
  CalendarOff,
  Calendar,
  Receipt,
  Wallet,
  Star,
  FileText,
  DoorOpen,
  LifeBuoy,
  Lock,
  Users,
  UserCog,
  BarChart3,
  ScrollText,
  Settings,
  Timer,
  PartyPopper,
  Layers,
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [londonTime, setLondonTime] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [comingSoonItem, setComingSoonItem] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Live London time
  useEffect(() => {
    const updateLondonTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setLondonTime(time);
    };
    updateLondonTime();
    const interval = setInterval(updateLondonTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch unread notification count
  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await API.get('/notifications/unread-count');
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchUnread, location.pathname]);

  // Real-time notifications via socket
  useSocket(user?._id, () => {
    setUnreadCount(prev => prev + 1);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userRole = user?.role || 'developer';
  const roleLabel = (r) => r === 'hr' ? 'HR' : r ? r.charAt(0).toUpperCase() + r.slice(1) : '';
  const initials = getInitials(user?.name || 'U');

  const filteredLinks = SIDEBAR_LINKS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(userRole)),
  })).filter((section) => section.items.length > 0);

  // Get current page title
  const getCurrentPageTitle = () => {
    for (const section of SIDEBAR_LINKS) {
      for (const item of section.items) {
        if (item.path === location.pathname) return item.name;
      }
    }
    if (location.pathname === '/profile') return 'Profile';
    if (location.pathname === '/notifications') return 'Notifications';
    return 'Dashboard';
  };

  // Sidebar content
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0 border-b border-indigo-800/50">
        <img
          src="/logo.png"
          alt="AD Workspace"
          className="w-9 h-9 rounded-xl object-contain flex-shrink-0"
        />
        {!collapsed && (
          <span className="text-white font-bold text-lg whitespace-nowrap tracking-tight">
            AD Workspace
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {filteredLinks.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold text-indigo-400/80 uppercase tracking-widest">
                {section.section}
              </p>
            )}
            {collapsed && <div className="h-px bg-indigo-800/50 mx-2 mb-2" />}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                if (item.comingSoon) {
                  return (
                    <button
                      key={item.path}
                      onClick={() => setComingSoonItem(item.name)}
                      className={`sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group text-indigo-200/60 hover:bg-white/8 hover:text-white w-full ${collapsed ? 'justify-center px-2' : ''}`}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      {!collapsed && (
                        <span className="flex-1 text-left">{item.name}</span>
                      )}
                      {!collapsed && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-semibold tracking-wide">SOON</span>
                      )}
                    </button>
                  );
                }
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                        isActive
                          ? 'active bg-indigo-500/20 text-white shadow-sm shadow-indigo-500/10'
                          : 'text-indigo-200/80 hover:bg-white/8 hover:text-white'
                      } ${collapsed ? 'justify-center px-2' : ''}`
                    }
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + Collapse toggle */}
      <div className="flex-shrink-0 border-t border-indigo-800/50">
        {!collapsed && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-indigo-300/70 truncate">{roleLabel(user?.role)}</p>
            </div>
          </div>
        )}
        <div className="hidden lg:flex px-3 py-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-indigo-300/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
          >
            {collapsed ? (
              <PanelLeft className="w-5 h-5 mx-auto" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#1E1B4B] transform transition-transform duration-300 ease-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-indigo-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 bg-[#1E1B4B] hidden lg:block transition-all duration-300 ease-out ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div
        className={`min-h-screen transition-all duration-300 ease-out ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-700/50">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Left: hamburger + page title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate hidden sm:block">
                {getCurrentPageTitle()}
              </h1>
              <div className="hidden md:block ml-4">
                <SearchTrigger />
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* London Time */}
              {londonTime && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300" title="London Time (Founder)">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium whitespace-nowrap">
                    <span className="text-slate-400">LDN</span> {londonTime}
                  </span>
                </div>
              )}

              {/* Notifications */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-[10px] font-bold text-white notif-pulse badge-pop">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Divider */}
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="avatar-ring">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-800 shadow-sm overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm" alt={user.name} />
                      ) : (
                        <span className="text-white text-xs font-semibold">{initials}</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:block text-left min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[100px]">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-[11px] text-slate-400">{roleLabel(user?.role)}</p>
                  </div>
                  <ChevronDown className={`hidden sm:block w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                      {user?.employeeId && (
                        <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                          {user.employeeId}
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" /> My Profile
                      </Link>
                      {(userRole === 'admin' || userRole === 'hr') && (
                        <Link
                          to="/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-slate-400" /> Settings
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-700 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {/* Coming Soon Modal */}
      {comingSoonItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setComingSoonItem(null)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{comingSoonItem}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">This feature is coming soon!</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mb-6">We're working hard to bring you this feature. Stay tuned for updates.</p>
            <button
              onClick={() => setComingSoonItem(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;

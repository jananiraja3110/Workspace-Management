import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  CalendarOff,
  MessageSquare,
  Lock,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Shield,
  Zap,
  Users,
  Globe,
  FolderKanban,
  Megaphone,
  FileText,
  Star,
} from 'lucide-react';

const features = [
  { icon: CheckSquare, title: 'Task Management', desc: 'Create, assign, and track tasks with priorities, deadlines, and real-time status updates.', color: 'from-indigo-500 to-indigo-600' },
  { icon: Clock, title: 'Attendance Tracking', desc: 'One-click check-in/out with automated late detection and comprehensive reports.', color: 'from-emerald-500 to-emerald-600' },
  { icon: CalendarOff, title: 'Leave Management', desc: 'Apply, approve, and track leaves with auto balance calculation.', color: 'from-amber-500 to-amber-600' },
  { icon: MessageSquare, title: 'Team Messaging', desc: 'Real-time internal messaging to stay connected with your team.', color: 'from-sky-500 to-sky-600' },
  { icon: Lock, title: 'Personal Vault', desc: 'AES-256 encrypted credential storage for your sensitive data.', color: 'from-rose-500 to-rose-600' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Data-driven insights with exportable reports and visual charts.', color: 'from-violet-500 to-violet-600' },
  { icon: FolderKanban, title: 'Project Tracking', desc: 'Manage projects with team assignments and progress visualization.', color: 'from-cyan-500 to-cyan-600' },
  { icon: Megaphone, title: 'Announcements', desc: 'Post company-wide announcements with priority pinning.', color: 'from-orange-500 to-orange-600' },
  { icon: FileText, title: 'Document Hub', desc: 'Share company docs and store personal files securely.', color: 'from-teal-500 to-teal-600' },
];

const steps = [
  { num: '01', title: 'Admin Sets Up', desc: 'Create accounts and configure your workspace settings' },
  { num: '02', title: 'Team Collaborates', desc: 'Manage tasks, track attendance, and communicate seamlessly' },
  { num: '03', title: 'Grow Together', desc: 'Analyze reports, review performance, and optimize workflows' },
];

const stats = [
  { icon: Zap, value: '30+', label: 'Features' },
  { icon: Globe, value: '99.9%', label: 'Uptime' },
  { icon: Shield, value: 'AES-256', label: 'Encryption' },
  { icon: Star, value: '24/7', label: 'Support' },
];

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-800">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl shadow-sm border-b border-slate-100 dark:border-slate-700'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
                <span className="text-white font-bold text-sm">AD</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">AD Workspace</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/50"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-indigo-50 via-violet-50/50 to-transparent dark:from-indigo-950/50 dark:via-violet-950/30 -z-10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-100/40 dark:bg-indigo-900/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-100/30 dark:bg-violet-900/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700 rounded-full text-sm text-indigo-700 dark:text-indigo-400 font-medium mb-6">
                <Zap className="w-3.5 h-3.5" />
                All-in-one office management
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-slate-900 dark:text-slate-100 leading-[1.1] tracking-tight">
                Manage Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">
                  Workspace
                </span>{' '}
                Smarter
              </h1>
              <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                The complete platform for task management, attendance tracking, leave management,
                team collaboration, and more. Built for modern teams.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 hover:-translate-y-0.5"
                >
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:-translate-y-0.5"
                >
                  Explore Features <ChevronRight className="w-4 h-4" />
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'].map((bg, i) => (
                    <div key={i} className={`w-8 h-8 ${bg} rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center`}>
                      <Users className="w-3.5 h-3.5 text-white" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Trusted by teams</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Managing 20+ employees daily</p>
                </div>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/80 via-violet-50 to-sky-100/80 dark:from-indigo-900/40 dark:via-violet-900/20 dark:to-sky-900/40 rounded-3xl shadow-2xl shadow-indigo-100/50 dark:shadow-indigo-900/30" />
                <div className="absolute inset-5 grid grid-cols-3 grid-rows-3 gap-3">
                  <div className="col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex flex-col justify-between border border-slate-100 dark:border-slate-700">
                    <div className="w-20 h-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full" />
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-indigo-500 rounded-full" />
                      <div className="w-3/4 h-2 bg-indigo-300 dark:bg-indigo-600 rounded-full" />
                      <div className="w-1/2 h-2 bg-indigo-200 dark:bg-indigo-700 rounded-full" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-lg p-4 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold text-white">85%</div>
                    <div className="w-12 h-1.5 bg-indigo-400/50 rounded-full mt-2" />
                    <p className="text-[10px] text-indigo-200 mt-1">Attendance</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-3 flex flex-col justify-center items-center gap-2 border border-slate-100 dark:border-slate-700">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-3 flex flex-col justify-center items-center gap-2 border border-slate-100 dark:border-slate-700">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                      <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-3 flex flex-col justify-center items-center gap-2 border border-slate-100 dark:border-slate-700">
                    <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full" />
                  </div>
                  <div className="col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex items-center gap-3 border border-slate-100 dark:border-slate-700">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 bg-indigo-400 rounded-full border-2 border-white dark:border-slate-800" />
                      <div className="w-8 h-8 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-800" />
                      <div className="w-8 h-8 bg-amber-400 rounded-full border-2 border-white dark:border-slate-800" />
                      <div className="w-8 h-8 bg-rose-400 rounded-full border-2 border-white dark:border-slate-800" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full" />
                      <div className="w-2/3 h-2 bg-slate-50 dark:bg-slate-700/50 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/80 dark:bg-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Everything Your Team Needs
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              A comprehensive suite of 30+ tools to manage your entire workspace from one platform
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-600 hover:-translate-y-1 transition-all duration-300 cursor-default group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-sm`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Get Started in 3 Steps
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200 dark:from-indigo-700 dark:via-indigo-600 dark:to-indigo-700" />
            {steps.map((s) => (
              <div key={s.num} className="text-center relative">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/50 relative z-10">
                  {s.num}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">{s.title}</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/10">
                  <s.icon className="w-6 h-6 text-indigo-300" />
                </div>
                <div className="text-3xl font-extrabold text-white">{s.value}</div>
                <div className="mt-1 text-indigo-300/80 font-medium text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-violet-50 dark:from-indigo-950/50 dark:via-slate-800 dark:to-violet-950/50 -z-10" />
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Ready to Transform Your Workspace?
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Join teams that trust AD Workspace to streamline their daily operations.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 hover:-translate-y-0.5"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-10 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xs">AD</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight">AD Workspace</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
            <Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Sign In</Link>
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} AD Workspace. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

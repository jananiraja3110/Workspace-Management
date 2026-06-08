import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';
import {
  Clock, LogIn, LogOut, Calendar, Timer, Users, Download,
} from 'lucide-react';
import { format, differenceInMinutes, startOfMonth, endOfMonth } from 'date-fns';

const AttendancePage = () => {
  const { user } = useAuth();
  const isAdmin   = user?.role === 'admin';
  const isHR      = user?.role === 'hr';
  const isAdminOrHR = isAdmin || isHR;

  // Admin goes straight to team view — no personal attendance
  const [activeTab, setActiveTab] = useState(isAdmin ? 'team' : 'my');
  const [todayStatus, setTodayStatus]   = useState(null);
  const [loadingToday, setLoadingToday] = useState(!isAdmin);
  const [myAttendance, setMyAttendance]     = useState([]);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [loadingMy,   setLoadingMy]   = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [checking, setChecking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate,   setEndDate]   = useState(format(endOfMonth(now),   'yyyy-MM-dd'));

  // Live clock (non-admin only)
  useEffect(() => {
    if (isAdmin) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  const fetchToday = async () => {
    try {
      setLoadingToday(true);
      const { data } = await API.get('/attendance/today');
      setTodayStatus(data.attendance || data);
    } catch {
      setTodayStatus(null);
    } finally {
      setLoadingToday(false);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      setLoadingMy(true);
      const { data } = await API.get('/attendance/my', { params: { startDate, endDate } });
      setMyAttendance(data.attendance || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoadingMy(false);
    }
  };

  const fetchTeamAttendance = async () => {
    try {
      setLoadingTeam(true);
      const { data } = await API.get('/attendance/team', { params: { startDate, endDate } });
      setTeamAttendance(data.attendance || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team attendance');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      fetchToday();
      fetchMyAttendance();
    } else {
      fetchTeamAttendance();
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) fetchMyAttendance();
    if (isAdminOrHR && activeTab === 'team') fetchTeamAttendance();
  }, [startDate, endDate]);

  useEffect(() => {
    if (isAdminOrHR && activeTab === 'team') fetchTeamAttendance();
    if (!isAdmin && activeTab === 'my') fetchMyAttendance();
  }, [activeTab]);

  const handleCheckIn = async () => {
    setChecking(true);
    try {
      const { data } = await API.post('/attendance/check-in');
      setTodayStatus(data.attendance || data);
      toast.success('Checked in successfully');
      fetchMyAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true);
    try {
      const { data } = await API.post('/attendance/check-out');
      setTodayStatus(data.attendance || data);
      toast.success('Checked out successfully');
      fetchMyAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setChecking(false);
    }
  };

  const getElapsedHours = () => {
    if (!todayStatus?.checkIn) return '0h 0m';
    const mins = differenceInMinutes(new Date(), new Date(todayStatus.checkIn));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const formatDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-';
    const mins = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const handleExportCSV = () => {
    const rows = (activeTab === 'team' ? teamAttendance : myAttendance);
    if (!rows.length) { toast.error('No data to export'); return; }
    const headers = activeTab === 'team'
      ? ['Employee', 'Date', 'Check In', 'Check Out', 'Status']
      : ['Date', 'Check In', 'Check Out', 'Total Hours', 'Status'];
    const csvRows = rows.map(r => {
      if (activeTab === 'team') {
        const name = r.user?.name || r.employee?.name || 'Unknown';
        return [name, r.date ? format(new Date(r.date), 'MMM dd yyyy') : '', r.checkIn ? format(new Date(r.checkIn), 'hh:mm a') : '', r.checkOut ? format(new Date(r.checkOut), 'hh:mm a') : '', r.status || ''].join(',');
      }
      return [r.date ? format(new Date(r.date), 'MMM dd yyyy') : '', r.checkIn ? format(new Date(r.checkIn), 'hh:mm a') : '', r.checkOut ? format(new Date(r.checkOut), 'hh:mm a') : '', r.totalHours || formatDuration(r.checkIn, r.checkOut), r.status || ''].join(',');
    });
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `attendance-${startDate}-${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const isCheckedIn  = todayStatus?.checkIn && !todayStatus?.checkOut;
  const isCheckedOut = todayStatus?.checkIn && todayStatus?.checkOut;

  const myColumns = [
    { key: 'date', label: 'Date', render: (val) => val ? format(new Date(val), 'MMM dd, yyyy') : '-' },
    { key: 'checkIn',  label: 'Check In',  render: (val) => val ? format(new Date(val), 'hh:mm a') : '-' },
    { key: 'checkOut', label: 'Check Out', render: (val) => val ? format(new Date(val), 'hh:mm a') : '-' },
    { key: 'totalHours', label: 'Total Hours', render: (val, row) => val || formatDuration(row.checkIn, row.checkOut) },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val || 'present'} /> },
  ];

  const teamColumns = [
    { key: 'employee', label: 'Employee', render: (_, row) => { const e = row.user || row.employee; return e?.name || 'Unknown'; } },
    { key: 'date',     label: 'Date',     render: (val) => val ? format(new Date(val), 'MMM dd, yyyy') : '-' },
    { key: 'checkIn',  label: 'Check In', render: (val) => val ? format(new Date(val), 'hh:mm a') : '-' },
    { key: 'checkOut', label: 'Check Out', render: (val) => val ? format(new Date(val), 'hh:mm a') : '-' },
    { key: 'status',  label: 'Status',   render: (val) => <StatusBadge status={val || 'present'} /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Attendance</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {isAdmin ? 'View and download all employee attendance records' : 'Track your daily attendance'}
        </p>
      </div>

      {/* Today's Status Card — hidden for admin */}
      {!isAdmin && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Clock className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium tracking-wide">Today's Status</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {format(currentTime, 'hh:mm:ss a')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {format(currentTime, 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {loadingToday ? <LoadingSpinner size="sm" /> : (
                <>
                  {todayStatus?.checkIn && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check In</p>
                      <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                        <LogIn className="h-3.5 w-3.5" />{format(new Date(todayStatus.checkIn), 'hh:mm a')}
                      </p>
                    </div>
                  )}
                  {todayStatus?.checkOut && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check Out</p>
                      <p className="text-sm font-semibold text-red-600 flex items-center gap-1">
                        <LogOut className="h-3.5 w-3.5" />{format(new Date(todayStatus.checkOut), 'hh:mm a')}
                      </p>
                    </div>
                  )}
                  {isCheckedIn && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Elapsed</p>
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" />{getElapsedHours()}
                      </p>
                    </div>
                  )}
                </>
              )}
              {!isCheckedOut && (
                <Button onClick={isCheckedIn ? handleCheckOut : handleCheckIn} loading={checking}
                  variant={isCheckedIn ? 'danger' : 'primary'} size="lg" className="min-w-[140px]">
                  {isCheckedIn ? <><LogOut className="h-5 w-5" /> Check Out</> : <><LogIn className="h-5 w-5" /> Check In</>}
                </Button>
              )}
              {isCheckedOut && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Day completed — {formatDuration(todayStatus.checkIn, todayStatus.checkOut)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs — HR only (admin has no "My Attendance" tab) */}
      {isHR && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab('my')}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${activeTab === 'my' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}>
            My Attendance
          </button>
          <button onClick={() => setActiveTab('team')}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'team' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}>
            <Users className="h-3.5 w-3.5" /> Team Attendance
          </button>
        </div>
      )}

      {/* Date range + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
          <span className="text-slate-400 text-sm">to</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      {/* Content */}
      {(activeTab === 'my' && !isAdmin) ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">My Attendance History</h2>
          </div>
          <div className="p-4">
            <Table columns={myColumns} data={myAttendance} loading={loadingMy} emptyMessage="No attendance records found for this period" />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {isAdmin ? 'All Employee Attendance' : 'Team Attendance'}
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">{teamAttendance.length} records</span>
          </div>
          <div className="p-4">
            <Table columns={teamColumns} data={teamAttendance} loading={loadingTeam} emptyMessage="No attendance records found" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;

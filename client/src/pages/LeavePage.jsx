import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Table from '../components/common/Table';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  Plus,
  CalendarOff,
  Thermometer,
  Briefcase,
  Palmtree,
  Check,
  X,
  Users,
} from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';

const LeavePage = () => {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'hr';

  const [activeTab, setActiveTab] = useState('my');
  const [myLeaves, setMyLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const emptyForm = {
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  };
  const [form, setForm] = useState(emptyForm);

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const days = differenceInCalendarDays(
      new Date(form.endDate),
      new Date(form.startDate)
    ) + 1;
    return days > 0 ? days : 0;
  };

  const fetchBalances = async () => {
    try {
      setLoadingBalances(true);
      const { data } = await API.get('/leaves/balance');
      setBalances(data.balance || data);
    } catch {
      setBalances(null);
    } finally {
      setLoadingBalances(false);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      setLoadingMy(true);
      const { data } = await API.get('/leaves/my');
      setMyLeaves(data.leaves || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load leaves');
    } finally {
      setLoadingMy(false);
    }
  };

  const fetchPendingLeaves = async () => {
    try {
      setLoadingPending(true);
      const { data } = await API.get('/leaves/pending');
      setPendingLeaves(data.leaves || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    fetchMyLeaves();
  }, []);

  useEffect(() => {
    if (isAdminOrManager && activeTab === 'pending') {
      fetchPendingLeaves();
    }
  }, [activeTab]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    if (calcDays() <= 0) {
      toast.error('End date must be after start date');
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/leaves', {
        ...form,
        days: calcDays(),
      });
      toast.success('Leave request submitted');
      setShowModal(false);
      setForm(emptyForm);
      fetchMyLeaves();
      fetchBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (leaveId, action) => {
    setProcessingId(leaveId);
    try {
      await API.put(`/leave/${leaveId}/review`, {
        status: action,
        note: reviewNote,
      });
      toast.success(`Leave ${action}`);
      setReviewNote('');
      fetchPendingLeaves();
      fetchBalances();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    } finally {
      setProcessingId(null);
    }
  };

  const balanceCards = [
    {
      type: 'Casual Leave',
      icon: Palmtree,
      color: 'indigo',
      used: balances?.casual?.used ?? 0,
      total: balances?.casual?.total ?? 12,
    },
    {
      type: 'Sick Leave',
      icon: Thermometer,
      color: 'red',
      used: balances?.sick?.used ?? 0,
      total: balances?.sick?.total ?? 10,
    },
    {
      type: 'Earned Leave',
      icon: Briefcase,
      color: 'emerald',
      used: balances?.earned?.used ?? 0,
      total: balances?.earned?.total ?? 15,
    },
  ];

  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'bg-indigo-100 text-indigo-600',
      bar: 'bg-indigo-500',
      text: 'text-indigo-600',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      bar: 'bg-red-500',
      text: 'text-red-600',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-600',
      bar: 'bg-emerald-500',
      text: 'text-emerald-600',
    },
  };

  const myColumns = [
    {
      key: 'leaveType',
      label: 'Type',
      render: (val) => (
        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
          {val || 'N/A'}
        </span>
      ),
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (val) => (val ? format(new Date(val), 'MMM dd, yyyy') : '-'),
    },
    {
      key: 'endDate',
      label: 'End Date',
      render: (val) => (val ? format(new Date(val), 'MMM dd, yyyy') : '-'),
    },
    {
      key: 'days',
      label: 'Days',
      render: (val, row) => {
        if (val) return val;
        if (row.startDate && row.endDate) {
          return differenceInCalendarDays(new Date(row.endDate), new Date(row.startDate)) + 1;
        }
        return '-';
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'reviewedBy',
      label: 'Reviewed By',
      render: (val) => {
        if (!val) return <span className="text-slate-400">-</span>;
        return val.name || val.firstName || 'Admin';
      },
    },
  ];

  const pendingColumns = [
    {
      key: 'user',
      label: 'Employee',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
            {(val?.name || val?.firstName || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {val?.name || val?.firstName || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'leaveType',
      label: 'Type',
      render: (val) => (
        <span className="capitalize">{val}</span>
      ),
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (val) => (val ? format(new Date(val), 'MMM dd, yyyy') : '-'),
    },
    {
      key: 'endDate',
      label: 'End Date',
      render: (val) => (val ? format(new Date(val), 'MMM dd, yyyy') : '-'),
    },
    {
      key: 'days',
      label: 'Days',
      render: (val, row) => {
        if (val) return val;
        if (row.startDate && row.endDate) {
          return differenceInCalendarDays(new Date(row.endDate), new Date(row.startDate)) + 1;
        }
        return '-';
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (val) => (
        <span className="text-slate-600 dark:text-slate-400 line-clamp-1" title={val}>
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReview(row._id, 'approved')}
            disabled={processingId === row._id}
            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            onClick={() => handleReview(row._id, 'rejected')}
            disabled={processingId === row._id}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Leave</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your leaves and time off
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowModal(true); }}>
          <Plus className="h-4 w-4" /> Apply Leave
        </Button>
      </div>

      {/* Balance cards */}
      {loadingBalances ? (
        <LoadingSpinner size="sm" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {balanceCards.map((card) => {
            const c = colorMap[card.color];
            const remaining = card.total - card.used;
            const pct = card.total > 0 ? (card.used / card.total) * 100 : 0;
            return (
              <div
                key={card.type}
                className={`${c.bg} rounded-xl border border-slate-200 dark:border-slate-700 p-5`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`h-10 w-10 rounded-lg ${c.icon} flex items-center justify-center`}
                  >
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {card.type}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {remaining} remaining of {card.total}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    Used: {card.used}
                  </span>
                  <span className={`font-medium ${c.text}`}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-2">
                  <div
                    className={`${c.bar} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      {isAdminOrManager && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 w-fit mb-4">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              activeTab === 'my'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            My Leaves
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Pending Requests
            {pendingLeaves.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                {pendingLeaves.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Review note for pending tab */}
      {activeTab === 'pending' && isAdminOrManager && (
        <div className="mb-4">
          <Input
            label="Review Note (optional)"
            placeholder="Add a note for the employee..."
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {activeTab === 'my' ? 'My Leave History' : 'Pending Leave Requests'}
          </h2>
        </div>
        <div className="p-4">
          {activeTab === 'my' ? (
            <Table
              columns={myColumns}
              data={myLeaves}
              loading={loadingMy}
              emptyMessage="No leave records found"
            />
          ) : (
            <Table
              columns={pendingColumns}
              data={pendingLeaves}
              loading={loadingPending}
              emptyMessage="No pending leave requests"
            />
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Apply for Leave"
        size="md"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Leave Type
            </label>
            <select
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100"
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>
          {calcDays() > 0 && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2.5">
              <p className="text-sm font-medium text-indigo-700">
                <CalendarOff className="h-4 w-4 inline mr-1.5" />
                Total days: {calcDays()}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason
            </label>
            <textarea
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
              rows={3}
              placeholder="Why do you need leave?"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeavePage;

import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Receipt, Plus, X, Loader2, DollarSign, Check, XCircle, FileText,
  TrendingUp, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const expenseCategories = ['Travel', 'Food', 'Office Supplies', 'Software', 'Equipment', 'Training', 'Other'];

const statusColors = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ExpensesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';
  const [expenses, setExpenses] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [form, setForm] = useState({
    title: '', amount: '', category: 'Travel', date: format(new Date(), 'yyyy-MM-dd'), description: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [activeTab]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      if (activeTab === 'pending' && isAdmin) {
        const { data } = await API.get('/expenses/pending');
        setPendingExpenses(data.expenses || []);
      } else {
        const { data } = await API.get('/expenses/my');
        setExpenses(data.expenses || []);
        const exps = data.expenses || [];
        setSummary({
          total: exps.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
          pending: exps.filter(e => e.status === 'pending').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
          approved: exps.filter(e => e.status === 'approved').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
          rejected: exps.filter(e => e.status === 'rejected').length,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (receiptFile) formData.append('receipt', receiptFile);
      await API.post('/expenses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Expense submitted');
      setShowModal(false);
      setForm({ title: '', amount: '', category: 'Travel', date: format(new Date(), 'yyyy-MM-dd'), description: '' });
      setReceiptFile(null);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await API.put(`/expenses/${id}/review`, { status: 'approved' });
      toast.success('Expense approved');
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await API.put(`/expenses/${id}/review`, { status: 'rejected', reviewNote: rejectNote });
      toast.success('Expense rejected');
      setRejectingId(null);
      setRejectNote('');
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  const summaryCards = [
    { label: 'Total Expenses', value: `$${summary.total.toLocaleString()}`, icon: DollarSign, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
    { label: 'Pending', value: `$${summary.pending.toLocaleString()}`, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
    { label: 'Approved', value: `$${summary.approved.toLocaleString()}`, icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
    { label: 'Rejected', value: summary.rejected, icon: AlertCircle, color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
  ];

  const renderTable = (data) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
              {activeTab === 'pending' && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Employee</th>}
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {data.map(exp => (
              <tr key={exp._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">{exp.title}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">${parseFloat(exp.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">{exp.category}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden md:table-cell">
                  {exp.date ? format(new Date(exp.date), 'MMM dd, yyyy') : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[exp.status] || statusColors.pending}`}>
                    {exp.status || 'pending'}
                  </span>
                </td>
                {activeTab === 'pending' && (
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden md:table-cell">
                    {exp.user?.name || '-'}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {exp.receipt && (
                      <a href={exp.receipt} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-300">
                        <FileText className="w-4 h-4" />
                      </a>
                    )}
                    {activeTab === 'pending' && isAdmin && exp.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(exp._id)}
                          className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition text-green-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRejectingId(exp._id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-red-600">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" /> Expenses
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track and manage your expenses</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Submit Expense
        </button>
      </div>

      {activeTab === 'my' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map(card => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'my' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>My Expenses</button>
          <button onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'pending' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>Pending Approvals</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (activeTab === 'pending' ? pendingExpenses : expenses).length === 0 ? (
        <div className="text-center py-20">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No expenses found</p>
        </div>
      ) : (
        renderTable(activeTab === 'pending' ? pendingExpenses : expenses)
      )}

      {/* Reject note modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Reject Expense</h3>
            <textarea placeholder="Reason for rejection..." value={rejectNote}
              onChange={e => setRejectNote(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectingId(null); setRejectNote(''); }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
              <button onClick={() => handleReject(rejectingId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Submit Expense</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount *</label>
                  <input type="number" step="0.01" required value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Receipt</label>
                <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-600 hover:file:bg-indigo-100" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;

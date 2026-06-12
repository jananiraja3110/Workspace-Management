import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Ticket, Plus, X, Loader2, ArrowLeft, Send, MessageSquare, User
} from 'lucide-react';
import { format } from 'date-fns';

const ticketCategories = ['IT Support', 'HR', 'Finance', 'Facilities', 'Other'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

const priorityColors = {
  Low: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  High: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors = {
  Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Closed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

const TicketsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';
  const [tickets, setTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    subject: '', description: '', category: 'IT Support', priority: 'Medium'
  });

  useEffect(() => {
    fetchTickets();
    if (isAdmin) fetchEmployees();
  }, [activeTab]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      if (activeTab === 'all' && isAdmin) {
        const { data } = await API.get('/tickets?all=true');
        setAllTickets(data.tickets || []);
      } else {
        const { data } = await API.get('/tickets');
        setTickets(data.tickets || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await API.get('/users?status=active');
      setEmployees(data.users || []);
    } catch { /* silent */ }
  };

  const fetchTicketDetail = async (id) => {
    try {
      const { data } = await API.get(`/tickets/${id}`);
      setSelectedTicket(data.ticket);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load ticket');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await API.post('/tickets', form);
      toast.success('Ticket raised');
      setShowModal(false);
      setForm({ subject: '', description: '', category: 'IT Support', priority: 'Medium' });
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await API.post(`/tickets/${selectedTicket._id}/comments`, { text: comment });
      toast.success('Comment added');
      setComment('');
      fetchTicketDetail(selectedTicket._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleAssign = async (ticketId, assignee) => {
    try {
      await API.put(`/tickets/${ticketId}`, { assignedTo: assignee });
      toast.success('Ticket assigned');
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    }
  };

  const handleStatusUpdate = async (ticketId, status) => {
    try {
      await API.put(`/tickets/${ticketId}`, { status });
      toast.success('Status updated');
      if (selectedTicket) fetchTicketDetail(ticketId);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedTicket(null)}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">#{selectedTicket.ticketId || selectedTicket._id?.slice(-6)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[selectedTicket.priority] || priorityColors.Medium}`}>
                  {selectedTicket.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[selectedTicket.status] || statusColors.Open}`}>
                  {selectedTicket.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedTicket.subject}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                By {selectedTicket.user?.name || '-'} | {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : ''}
              </p>
            </div>
            {isAdmin && (
              <select value={selectedTicket.status || 'Open'}
                onChange={e => handleStatusUpdate(selectedTicket._id, e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{selectedTicket.description}</p>
        </div>

        {/* Comments */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" /> Comments
          </h3>
          <div className="space-y-4 mb-6">
            {(selectedTicket.comments || []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No comments yet</p>
            ) : (
              selectedTicket.comments.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.user?.name || 'User'}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleComment} className="flex gap-2">
            <input type="text" value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentTickets = activeTab === 'all' ? allTickets : tickets;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Ticket className="w-7 h-7 text-indigo-600" /> Help Desk
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Raise and track support tickets</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Raise Ticket
        </button>
      </div>

      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'my' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>My Tickets</button>
          <button onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>All Tickets</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : currentTickets.length === 0 ? (
        <div className="text-center py-20">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No tickets found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Date</th>
                  {activeTab === 'all' && isAdmin && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden lg:table-cell">Assign</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {currentTickets.map(ticket => (
                  <tr key={ticket._id}
                    onClick={() => fetchTicketDetail(ticket._id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
                    <td className="px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-400">
                      #{ticket.ticketId || ticket._id?.slice(-6)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{ticket.subject}</span>
                      {activeTab === 'all' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">By {ticket.user?.name || '-'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">{ticket.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[ticket.priority] || priorityColors.Medium}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ticket.status] || statusColors.Open}`}>
                        {ticket.status || 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden md:table-cell">
                      {ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM dd, yyyy') : '-'}
                    </td>
                    {activeTab === 'all' && isAdmin && (
                      <td className="px-4 py-3 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                        <select value={ticket.assignedTo?._id || ticket.assignedTo || ''}
                          onChange={e => handleAssign(ticket._id, e.target.value)}
                          className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                          <option value="">Unassigned</option>
                          {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Raise Ticket</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
                <input type="text" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    {ticketCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
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

export default TicketsPage;
